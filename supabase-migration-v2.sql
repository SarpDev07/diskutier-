-- ==============================================================================
-- DATABASE MIGRATION 2.0 FÜR DISKUTIER.CH (SCHWEIZ-MATCH & ANONYMES ABSTIMMEN)
-- ==============================================================================

-- 1. INDIZES & PERFORMANCE-OPTIMIERUNGEN FÜR POLL_VOTES
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON public.poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON public.poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_session_token ON public.poll_votes(session_token);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option_index ON public.poll_votes(poll_id, option_index);

-- 2. EINDEUTIGKEITS-CONSTRAINTS FÜR ANONYME & REGISTRIERTE STIMMEN
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

-- 3. RLS-POLICIES FÜR POLL_VOTES (STRENG GETRENNT: AUTH & ANONYME GÄSTE)
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- 3a. Öffentlich lesbar (für Aggregation und Auswertung)
DROP POLICY IF EXISTS "Stimmen sind öffentlich lesbar" ON public.poll_votes;
CREATE POLICY "Stimmen sind öffentlich lesbar"
ON public.poll_votes FOR SELECT
TO public, anon, authenticated
USING (true);

-- 3b. Abstimmen (INSERT): Entweder verifizierter Nutzer oder anonymer Gast mit session_token
DROP POLICY IF EXISTS "Stimmen können abgegeben werden" ON public.poll_votes;
DROP POLICY IF EXISTS "Stimmen können abgegeben oder geändert werden" ON public.poll_votes;
CREATE POLICY "Stimmen können abgegeben werden"
ON public.poll_votes FOR INSERT
TO public, anon, authenticated
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  (auth.uid() IS NULL AND user_id IS NULL AND session_token IS NOT NULL)
);

-- 3c. Ändern der eigenen Stimme (UPDATE)
DROP POLICY IF EXISTS "Eigene Stimme ändern" ON public.poll_votes;
CREATE POLICY "Eigene Stimme ändern"
ON public.poll_votes FOR UPDATE
TO public, anon, authenticated
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  (user_id IS NULL AND session_token IS NOT NULL)
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  (user_id IS NULL AND session_token IS NOT NULL)
);

-- 3d. Löschen der eigenen Stimme (DELETE)
DROP POLICY IF EXISTS "Eigene Stimme löschen" ON public.poll_votes;
CREATE POLICY "Eigene Stimme löschen"
ON public.poll_votes FOR DELETE
TO public, anon, authenticated
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  (user_id IS NULL AND session_token IS NOT NULL)
);

-- 4. SERVER-FUNKTION: ATOMARE ZUSAMMENFÜHRUNG VON GAST-STIMMEN (MERGE ON LOGIN)
CREATE OR REPLACE FUNCTION public.merge_guest_votes(
  p_user_id UUID,
  p_session_token TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_merged_count INTEGER := 0;
  v_rec RECORD;
BEGIN
  IF p_user_id IS NULL OR p_session_token IS NULL OR trim(p_session_token) = '' THEN
    RETURN 0;
  END IF;

  FOR v_rec IN 
    SELECT id, poll_id, option_index 
    FROM public.poll_votes 
    WHERE session_token = p_session_token
  LOOP
    -- Prüfe, ob der Nutzer für diesen Poll bereits eine registrierte Stimme hat
    IF EXISTS (
      SELECT 1 FROM public.poll_votes 
      WHERE poll_id = v_rec.poll_id AND user_id = p_user_id
    ) THEN
      -- Gaststimme löschen (Nutzerstimme hat Vorrang)
      DELETE FROM public.poll_votes WHERE id = v_rec.id;
    ELSE
      -- Gaststimme auf Nutzer übertragen
      UPDATE public.poll_votes 
      SET user_id = p_user_id, session_token = NULL 
      WHERE id = v_rec.id;
      v_merged_count := v_merged_count + 1;
    END IF;
  END LOOP;

  RETURN v_merged_count;
END;
$$;

-- Berechtigung für merge_guest_votes erteilen
GRANT EXECUTE ON FUNCTION public.merge_guest_votes(UUID, TEXT) TO authenticated, anon, service_role;
