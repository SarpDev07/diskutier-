-- ==============================================================================
-- DATABASE ROLLBACK 2.0 (SAFE & PRIVACY-PRESERVING ROLLBACK SCRIPT)
-- ==============================================================================
-- Ziel: 
-- Stellt im Notfall die vorherigen Funktionssignaturen wieder her,
-- OHNE Stimmen zu löschen und OHNE poll_votes öffentlich lesbar zu machen.
-- ==============================================================================

-- 1. Aggregations-View für Abwärtskompatibilität erhalten
CREATE OR REPLACE VIEW public.poll_aggregates AS
SELECT 
  poll_id,
  option_index,
  COUNT(*)::INTEGER AS vote_count
FROM public.poll_votes
GROUP BY poll_id, option_index;

GRANT SELECT ON public.poll_aggregates TO anon, authenticated, service_role;

-- 2. Einfache Fallback-RPCs
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
BEGIN
  INSERT INTO public.poll_votes (poll_id, session_token, option_index, user_id)
  VALUES (p_poll_id, p_session_secret, p_option_index, NULL)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_guest_vote(UUID, INTEGER, TEXT) TO anon, authenticated, service_role;

-- 3. RLS bleibt strikt auf Eigenschutz geschaltet (kein Datenleck bei Rollback!)
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Nutzer sehen nur eigene Stimmen" ON public.poll_votes;
CREATE POLICY "Nutzer sehen nur eigene Stimmen"
ON public.poll_votes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
