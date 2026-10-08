-- ==============================================================================
-- DATABASE MIGRATION 2.0 (AIRTIGHT SECURITY & NON-DESTRUCTIVE EDITION)
-- ==============================================================================
-- Grundsätze:
-- 1. KEINE automatischen Löschungen bestehender Stimmen.
-- 2. Strikte Duplikats-Prüfung: Migration stoppt mit Fehler, falls Duplikate existieren.
-- 3. Abwärtskompatibilität: Bestehende 34 Gast-Stimmen werden via SHA-256 gehasht.
-- 4. Zero-Trust RLS: Kein direkter Tabellenzugriff für unauthentifizierte Clients.
-- 5. Atomare, abgesicherte RPC-Funktionen mit Validierung und Zeilensperren.
-- 6. Datensparsame Aggregations-View ohne PII.
-- ==============================================================================

-- 0. PGCYPTO EXTENSION FÜR KRYPTOGRAFISCHE HASHES
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. NICHT-DESTRUKTIVE DUPLIKATS-PRÜFUNG (STOPPT DIE MIGRATION BEI KONFLIKTEN)
DO $$
DECLARE
  v_dup_user_count INTEGER := 0;
  v_dup_session_count INTEGER := 0;
BEGIN
  -- A. Prüfe registrierte Stimmen
  SELECT COUNT(*) INTO v_dup_user_count
  FROM (
    SELECT poll_id, user_id
    FROM public.poll_votes
    WHERE user_id IS NOT NULL
    GROUP BY poll_id, user_id
    HAVING COUNT(*) > 1
  ) dups;

  IF v_dup_user_count > 0 THEN
    RAISE EXCEPTION 'MIGRATION ABGEBROCHEN: Es wurden % doppelte Stimmen für registrierte Nutzer gefunden. Keine automatische Löschung ohne manuelle Bereinigung.', v_dup_user_count;
  END IF;

  -- B. Prüfe Gast-Stimmen
  SELECT COUNT(*) INTO v_dup_session_count
  FROM (
    SELECT poll_id, session_token
    FROM public.poll_votes
    WHERE session_token IS NOT NULL
    GROUP BY poll_id, session_token
    HAVING COUNT(*) > 1
  ) dups;

  IF v_dup_session_count > 0 THEN
    RAISE EXCEPTION 'MIGRATION ABGEBROCHEN: Es wurden % doppelte Stimmen für Gast-Sessions gefunden. Keine automatische Löschung ohne manuelle Bereinigung.', v_dup_session_count;
  END IF;
END $$;

-- 2. ABWÄRTSKOMPATIBLE UMSTELLUNG BESTEHENDER GAST-STIMMEN AUF SHA-256 HASH
-- Wandelt alte Tokens (z.B. 'guest_...') verlustfrei in deren SHA-256 Hash um.
-- Dadurch können wiederkehrende Browser ihre bestehenden Stimmen nahtlos erkennen & mergen.
UPDATE public.poll_votes
SET session_token = encode(digest(session_token::bytea, 'sha256'), 'hex')
WHERE user_id IS NULL 
  AND session_token IS NOT NULL 
  AND length(session_token) != 64;

-- 3. INDIZES FÜR SCHNELLE PERFORMANCE & AGGREGATIONEN
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON public.poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON public.poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_session_token ON public.poll_votes(session_token);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option_index ON public.poll_votes(poll_id, option_index);

-- 4. PARTIELLE EINDEUTIGE INDIZES (VERHINDERN DUPLIKATE PRO POLL & NUTZER/SESSION)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_vote 
ON public.poll_votes (poll_id, user_id) 
WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_session_vote 
ON public.poll_votes (poll_id, session_token) 
WHERE session_token IS NOT NULL;

-- 5. ZERO-TRUST RLS POLICIES FÜR POLL_VOTES
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- 5a. SELECT: Authentifizierte Nutzer sehen ausschliesslich ihre eigenen Stimmen.
-- Unauthentifizierte Gäste haben KEINEN direkten Lesezugriff auf poll_votes.
DROP POLICY IF EXISTS "Stimmen sind öffentlich lesbar" ON public.poll_votes;
DROP POLICY IF EXISTS "Nutzer sehen nur eigene Stimmen" ON public.poll_votes;
CREATE POLICY "Nutzer sehen nur eigene Stimmen"
ON public.poll_votes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 5b. INSERT / UPDATE / DELETE für registrierte Nutzer
DROP POLICY IF EXISTS "Stimmen können abgegeben werden" ON public.poll_votes;
DROP POLICY IF EXISTS "Stimmen können abgegeben oder geändert werden" ON public.poll_votes;
DROP POLICY IF EXISTS "Eingeloggte Nutzer stimmen ab" ON public.poll_votes;
CREATE POLICY "Eingeloggte Nutzer stimmen ab"
ON public.poll_votes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "Eigene Stimme ändern" ON public.poll_votes;
DROP POLICY IF EXISTS "Eingeloggte Nutzer ändern eigene Stimme" ON public.poll_votes;
CREATE POLICY "Eingeloggte Nutzer ändern eigene Stimme"
ON public.poll_votes FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "Eigene Stimme löschen" ON public.poll_votes;
DROP POLICY IF EXISTS "Eingeloggte Nutzer löschen eigene Stimme" ON public.poll_votes;
CREATE POLICY "Eingeloggte Nutzer löschen eigene Stimme"
ON public.poll_votes FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());


-- 6. DATENSPARSAME AGGREGATIONS-VIEW (ÖFFENTLICHE STIMMENZÄHLUNG OHNE PII)
CREATE OR REPLACE VIEW public.poll_aggregates AS
SELECT 
  poll_id,
  option_index,
  COUNT(*)::INTEGER AS vote_count
FROM public.poll_votes
GROUP BY poll_id, option_index;

ALTER VIEW public.poll_aggregates OWNER TO postgres;
GRANT SELECT ON public.poll_aggregates TO anon, authenticated, service_role;


-- 7. RPC: ATOMARE GAST-ABSTIMMUNG (cast_guest_vote)
CREATE OR REPLACE FUNCTION public.cast_guest_vote(
  p_poll_id UUID,
  p_option_index INTEGER,
  p_session_secret TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_token_hash TEXT;
  v_poll_options JSONB;
  v_max_option INTEGER;
  v_existing_id UUID;
BEGIN
  -- 1. Validierung des Session-Secrets (mindestens 16 Zeichen)
  IF p_session_secret IS NULL OR length(trim(p_session_secret)) < 16 THEN
    RAISE EXCEPTION 'Ungueltiges Gast-Token (mindestens 16 Zeichen erforderlich).';
  END IF;

  -- 2. Validierung des Polls & der Option
  SELECT options INTO v_poll_options FROM public.polls WHERE id = p_poll_id;
  IF v_poll_options IS NULL THEN
    RAISE EXCEPTION 'Abstimmung existiert nicht.';
  END IF;

  v_max_option := jsonb_array_length(v_poll_options) - 1;
  IF p_option_index < 0 OR p_option_index > v_max_option THEN
    RAISE EXCEPTION 'Ungueltige Antwort-Option.';
  END IF;

  -- 3. Kryptografischer Hash (One-Way SHA-256)
  v_token_hash := encode(digest(trim(p_session_secret)::bytea, 'sha256'), 'hex');

  -- 4. Atomarer Upsert mit Zeilensperre
  SELECT id INTO v_existing_id
  FROM public.poll_votes
  WHERE poll_id = p_poll_id AND session_token = v_token_hash
  FOR UPDATE;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.poll_votes
    SET option_index = p_option_index, created_at = NOW()
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.poll_votes (poll_id, session_token, option_index, user_id)
    VALUES (p_poll_id, v_token_hash, p_option_index, NULL);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'poll_id', p_poll_id,
    'option_index', p_option_index
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_guest_vote(UUID, INTEGER, TEXT) TO anon, authenticated, service_role;


-- 8. RPC: ATOMARE NUTZER-ABSTIMMUNG (cast_user_vote)
CREATE OR REPLACE FUNCTION public.cast_user_vote(
  p_poll_id UUID,
  p_option_index INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_poll_options JSONB;
  v_max_option INTEGER;
  v_existing_id UUID;
BEGIN
  -- 1. Strikte Authentifizierungsprüfung
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nicht authentifiziert: Bitte einloggen.';
  END IF;

  -- 2. Validierung des Polls & der Option
  SELECT options INTO v_poll_options FROM public.polls WHERE id = p_poll_id;
  IF v_poll_options IS NULL THEN
    RAISE EXCEPTION 'Abstimmung existiert nicht.';
  END IF;

  v_max_option := jsonb_array_length(v_poll_options) - 1;
  IF p_option_index < 0 OR p_option_index > v_max_option THEN
    RAISE EXCEPTION 'Ungueltige Antwort-Option.';
  END IF;

  -- 3. Atomarer Upsert
  SELECT id INTO v_existing_id
  FROM public.poll_votes
  WHERE poll_id = p_poll_id AND user_id = v_user_id
  FOR UPDATE;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.poll_votes
    SET option_index = p_option_index, created_at = NOW()
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.poll_votes (poll_id, user_id, option_index, session_token)
    VALUES (p_poll_id, v_user_id, p_option_index, NULL);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'poll_id', p_poll_id,
    'option_index', p_option_index
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_user_vote(UUID, INTEGER) TO authenticated, service_role;


-- 9. RPC: ATOMARE ZUSAMMENFÜHRUNG VON GAST-STIMMEN (merge_guest_votes)
CREATE OR REPLACE FUNCTION public.merge_guest_votes(
  p_session_secret TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_token_hash TEXT;
  v_merged_count INTEGER := 0;
  v_rec RECORD;
BEGIN
  -- 1. Strenge Authentifizierungs-Prüfung
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nicht autorisiert: Gaststimmen koennen nur in ein aktives Konto uebertragen werden.';
  END IF;

  -- 2. Validierung des Gast-Secrets
  IF p_session_secret IS NULL OR length(trim(p_session_secret)) < 16 THEN
    RETURN 0;
  END IF;

  -- 3. Kryptografischer Hash
  v_token_hash := encode(digest(trim(p_session_secret)::bytea, 'sha256'), 'hex');

  -- 4. Atomare Zusammenführung mit Zeilensperre (FOR UPDATE)
  FOR v_rec IN 
    SELECT id, poll_id, option_index 
    FROM public.poll_votes 
    WHERE session_token = v_token_hash
    FOR UPDATE
  LOOP
    -- Prüfe, ob der Nutzer für diese Frage bereits abgestimmt hat
    IF EXISTS (
      SELECT 1 FROM public.poll_votes 
      WHERE poll_id = v_rec.poll_id AND user_id = v_user_id
    ) THEN
      -- Nutzerstimme hat Vorrang -> Gaststimme bereinigen
      DELETE FROM public.poll_votes WHERE id = v_rec.id;
    ELSE
      -- Gaststimme sicher auf Nutzerkonto übertragen und Gast-Token leeren
      UPDATE public.poll_votes 
      SET user_id = v_user_id, session_token = NULL 
      WHERE id = v_rec.id;
      v_merged_count := v_merged_count + 1;
    END IF;
  END LOOP;

  RETURN v_merged_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.merge_guest_votes(TEXT) TO authenticated, service_role;
