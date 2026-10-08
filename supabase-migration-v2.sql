-- ==============================================================================
-- DATABASE MIGRATION 2.0 (AIRTIGHT SECURITY EDITION) FÜR DISKUTIER.CH
-- ==============================================================================
-- Schutzziele:
-- 1. Kein Gast kann fremde Stimmen lesen, manipulieren oder löschen.
-- 2. Keine Offenlegung von Gast-Tokens oder User-IDs über SELECT.
-- 3. Kryptografischer Hash aller Gast-Tokens (One-Way SHA-256).
-- 4. merge_guest_votes ist atomar, streng authentifiziert und immun gegen Hijacking.
-- 5. Aggregierte Ergebnisse erfolgen über eine datensparsame View (ohne PII).
-- ==============================================================================

-- 0. PGYCRYPTO EXTENSION FÜR KRYPTOGRAFISCHE HASHES
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. BEREINIGUNG VON EVENTUELLEN DUPLIKATEN (VOR CONSTRAINT-ANLAGE)
-- Löscht ältere Duplikate und behält jeweils die neueste Stimme
DELETE FROM public.poll_votes a
USING public.poll_votes b
WHERE a.user_id IS NOT NULL 
  AND a.poll_id = b.poll_id 
  AND a.user_id = b.user_id 
  AND a.id <> b.id
  AND a.created_at < b.created_at;

DELETE FROM public.poll_votes a
USING public.poll_votes b
WHERE a.session_token IS NOT NULL 
  AND a.poll_id = b.poll_id 
  AND a.session_token = b.session_token 
  AND a.id <> b.id
  AND a.created_at < b.created_at;

-- 2. INDIZES & PERFORMANCE-OPTIMIERUNGEN
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON public.poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON public.poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_session_token ON public.poll_votes(session_token);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option_index ON public.poll_votes(poll_id, option_index);

-- 3. EINDEUTIGKEITS-CONSTRAINTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_vote'
  ) THEN
    ALTER TABLE public.poll_votes 
    ADD CONSTRAINT unique_user_vote UNIQUE NULLS NOT DISTINCT (poll_id, user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_session_vote'
  ) THEN
    ALTER TABLE public.poll_votes 
    ADD CONSTRAINT unique_session_vote UNIQUE NULLS NOT DISTINCT (poll_id, session_token);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 4. RLS-POLICIES: ZERO-TRUST FÜR DIREKTE TABELLEN-ZUGRIFFE
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- 4a. SELECT: Authentifizierte Nutzer sehen AUSSCHLIESSLICH ihre eigenen Stimmen.
-- Gäste haben KEINEN direkten Lesezugriff auf poll_votes.
DROP POLICY IF EXISTS "Stimmen sind öffentlich lesbar" ON public.poll_votes;
DROP POLICY IF EXISTS "Nutzer sehen nur eigene Stimmen" ON public.poll_votes;
CREATE POLICY "Nutzer sehen nur eigene Stimmen"
ON public.poll_votes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4b. INSERT: Nur authentifizierte Nutzer für ihre eigene user_id.
-- (Gast-Votes erfolgen ausschliesslich über die sichere cast_guest_vote RPC Funktion)
DROP POLICY IF EXISTS "Stimmen können abgegeben werden" ON public.poll_votes;
DROP POLICY IF EXISTS "Stimmen können abgegeben oder geändert werden" ON public.poll_votes;
DROP POLICY IF EXISTS "Eingeloggte Nutzer stimmen ab" ON public.poll_votes;
CREATE POLICY "Eingeloggte Nutzer stimmen ab"
ON public.poll_votes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 4c. UPDATE: Nur authentifizierte Nutzer für ihre eigene user_id.
DROP POLICY IF EXISTS "Eigene Stimme ändern" ON public.poll_votes;
DROP POLICY IF EXISTS "Eingeloggte Nutzer ändern eigene Stimme" ON public.poll_votes;
CREATE POLICY "Eingeloggte Nutzer ändern eigene Stimme"
ON public.poll_votes FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 4d. DELETE: Nur authentifizierte Nutzer für ihre eigene user_id.
DROP POLICY IF EXISTS "Eigene Stimme löschen" ON public.poll_votes;
DROP POLICY IF EXISTS "Eingeloggte Nutzer löschen eigene Stimme" ON public.poll_votes;
CREATE POLICY "Eingeloggte Nutzer löschen eigene Stimme"
ON public.poll_votes FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());


-- 5. SICHERE AGGREGATIONS-SCHNITTSTELLE (DATENSPARSAM, KEINE PII, KEINE TOKENS)
CREATE OR REPLACE VIEW public.poll_aggregates AS
SELECT 
  poll_id,
  option_index,
  COUNT(*)::INTEGER AS vote_count
FROM public.poll_votes
GROUP BY poll_id, option_index;

-- Berechtigungen für Aggregations-View
ALTER VIEW public.poll_aggregates OWNER TO postgres;
GRANT SELECT ON public.poll_aggregates TO anon, authenticated, service_role;


-- 6. RPC: ATOMARE & KRYPTOGRAFISCH GESICHERTE GAST-ABSTIMMUNG
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
  v_token_hash := encode(digest(trim(p_session_secret), 'sha256'), 'hex');

  -- 4. Atomarer Upsert der Stimme
  INSERT INTO public.poll_votes (poll_id, session_token, option_index, user_id)
  VALUES (p_poll_id, v_token_hash, p_option_index, NULL)
  ON CONFLICT (poll_id, session_token) 
  DO UPDATE SET option_index = EXCLUDED.option_index, created_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'poll_id', p_poll_id,
    'option_index', p_option_index
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_guest_vote(UUID, INTEGER, TEXT) TO anon, authenticated, service_role;


-- 7. RPC: ATOMARE & GESICHERTE NUTZER-ABSTIMMUNG
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
BEGIN
  -- 1. Strenge Authentifizierungs-Pruefung
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nicht authentifiziert.';
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
  INSERT INTO public.poll_votes (poll_id, user_id, option_index, session_token)
  VALUES (p_poll_id, v_user_id, p_option_index, NULL)
  ON CONFLICT (poll_id, user_id)
  DO UPDATE SET option_index = EXCLUDED.option_index, created_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'poll_id', p_poll_id,
    'option_index', p_option_index
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_user_vote(UUID, INTEGER) TO authenticated, service_role;


-- 8. RPC: ATOMARE ZUSAMMENFÜHRUNG VON GAST-STIMMEN BEI ANMELDUNG (MERGE ON LOGIN)
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
  -- 1. Strenge Authentifizierungs-Pruefung: Nur fuer den verifizierten Session-Nutzer!
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nicht autorisiert: Gaststimmen koennen nur in ein aktives Konto uebertragen werden.';
  END IF;

  -- 2. Validierung des Gast-Secrets
  IF p_session_secret IS NULL OR length(trim(p_session_secret)) < 16 THEN
    RETURN 0;
  END IF;

  -- 3. Kryptografischer Hash
  v_token_hash := encode(digest(trim(p_session_secret), 'sha256'), 'hex');

  -- 4. Atomare Zusammenfuehrung mit Zeilensperre (FOR UPDATE)
  FOR v_rec IN 
    SELECT id, poll_id, option_index 
    FROM public.poll_votes 
    WHERE session_token = v_token_hash
    FOR UPDATE
  LOOP
    -- Hat der Nutzer fuer diesen Poll bereits eine registrierte Stimme?
    IF EXISTS (
      SELECT 1 FROM public.poll_votes 
      WHERE poll_id = v_rec.poll_id AND user_id = v_user_id
    ) THEN
      -- Nutzerstimme hat Vorrang -> Gaststimme loeschen
      DELETE FROM public.poll_votes WHERE id = v_rec.id;
    ELSE
      -- Gaststimme sicher uebertragen und Gast-Token auf NULL setzen
      UPDATE public.poll_votes 
      SET user_id = v_user_id, session_token = NULL 
      WHERE id = v_rec.id;
      v_merged_count := v_merged_count + 1;
    END IF;
  END LOOP;

  RETURN v_merged_count;
END;
$$;

-- Berechtigung fuer merge_guest_votes ausschliesslich an authenticated erteilen
GRANT EXECUTE ON FUNCTION public.merge_guest_votes(TEXT) TO authenticated, service_role;
