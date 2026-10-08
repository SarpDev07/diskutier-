-- ==============================================================================
-- DATABASE SCHEMA FÜR DISKUTIER.CH (SUPABASE POSTGRESQL & RLS)
-- ==============================================================================

-- 1. PROFILES TABELLE (Nutzerprofile mit Kanton und Initialen)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  canton TEXT DEFAULT 'CH',
  avatar_initials TEXT DEFAULT 'U',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS für Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Öffentliche Profile sind für jeden lesbar"
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Nutzer können ihr eigenes Profil erstellen/bearbeiten"
ON public.profiles FOR ALL USING (auth.uid() = id);


-- 2. ABSTIMMUNGEN (POLLS)
CREATE TABLE IF NOT EXISTS public.polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Schweiz & Politik',
  options JSONB NOT NULL DEFAULT '["JA", "NEIN"]'::jsonb,
  is_featured BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Abstimmungen sind öffentlich lesbar"
ON public.polls FOR SELECT USING (true);

CREATE POLICY "Jeder authentifizierte oder anonyme Nutzer kann Abstimmungen erstellen"
ON public.polls FOR INSERT WITH CHECK (true);


-- 3. ABSTIMMUNGS-STIMMEN (POLL_VOTES)
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
  option_index INTEGER NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_vote UNIQUE NULLS NOT DISTINCT (poll_id, user_id),
  CONSTRAINT unique_session_vote UNIQUE NULLS NOT DISTINCT (poll_id, session_token)
);

-- Indizes für schnelle Abfragen & Schweiz-Match Aggregationen
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON public.poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON public.poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_session_token ON public.poll_votes(session_token);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option_index ON public.poll_votes(poll_id, option_index);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutzer sehen nur eigene Stimmen"
ON public.poll_votes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Eingeloggte Nutzer stimmen ab"
ON public.poll_votes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Eingeloggte Nutzer ändern eigene Stimme"
ON public.poll_votes FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Eingeloggte Nutzer löschen eigene Stimme"
ON public.poll_votes FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Datensparsame Aggregations-View
CREATE OR REPLACE VIEW public.poll_aggregates AS
SELECT 
  poll_id,
  option_index,
  COUNT(*)::INTEGER AS vote_count
FROM public.poll_votes
GROUP BY poll_id, option_index;

-- Funktion zur sicheren Gast-Abstimmung mit Token-Hash
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
  IF p_session_secret IS NULL OR length(trim(p_session_secret)) < 16 THEN
    RAISE EXCEPTION 'Ungueltiges Gast-Token.';
  END IF;

  SELECT options INTO v_poll_options FROM public.polls WHERE id = p_poll_id;
  IF v_poll_options IS NULL THEN
    RAISE EXCEPTION 'Abstimmung existiert nicht.';
  END IF;

  v_max_option := jsonb_array_length(v_poll_options) - 1;
  IF p_option_index < 0 OR p_option_index > v_max_option THEN
    RAISE EXCEPTION 'Ungueltige Antwort-Option.';
  END IF;

  v_token_hash := encode(digest(trim(p_session_secret)::bytea, 'sha256'), 'hex');

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

  RETURN jsonb_build_object('success', true, 'poll_id', p_poll_id, 'option_index', p_option_index);
END;
$$;

-- Funktion zur sicheren Nutzer-Abstimmung (cast_user_vote)
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
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nicht authentifiziert: Bitte einloggen.';
  END IF;

  SELECT options INTO v_poll_options FROM public.polls WHERE id = p_poll_id;
  IF v_poll_options IS NULL THEN
    RAISE EXCEPTION 'Abstimmung existiert nicht.';
  END IF;

  v_max_option := jsonb_array_length(v_poll_options) - 1;
  IF p_option_index < 0 OR p_option_index > v_max_option THEN
    RAISE EXCEPTION 'Ungueltige Antwort-Option.';
  END IF;

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

  RETURN jsonb_build_object('success', true, 'poll_id', p_poll_id, 'option_index', p_option_index);
END;
$$;

-- Funktion zur sicheren Zusammenführung von Gaststimmen
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
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nicht autorisiert: Gaststimmen koennen nur in ein aktives Konto uebertragen werden.';
  END IF;

  IF p_session_secret IS NULL OR length(trim(p_session_secret)) < 16 THEN
    RETURN 0;
  END IF;

  v_token_hash := encode(digest(trim(p_session_secret), 'sha256'), 'hex');

  FOR v_rec IN 
    SELECT id, poll_id, option_index 
    FROM public.poll_votes 
    WHERE session_token = v_token_hash
    FOR UPDATE
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.poll_votes 
      WHERE poll_id = v_rec.poll_id AND user_id = v_user_id
    ) THEN
      DELETE FROM public.poll_votes WHERE id = v_rec.id;
    ELSE
      UPDATE public.poll_votes 
      SET user_id = v_user_id, session_token = NULL 
      WHERE id = v_rec.id;
      v_merged_count := v_merged_count + 1;
    END IF;
  END LOOP;

  RETURN v_merged_count;
END;
$$;


-- 4. FORUMS-BEITRÄGE (POSTS)
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Schweiz & Politik',
  excerpt TEXT,
  body JSONB NOT NULL DEFAULT '[]'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  views INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Beiträge sind öffentlich lesbar"
ON public.posts FOR SELECT USING (true);

CREATE POLICY "Beiträge können von jedem erstellt werden"
ON public.posts FOR INSERT WITH CHECK (true);

CREATE POLICY "Autoren können eigene Beiträge bearbeiten"
ON public.posts FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Autoren können eigene Beiträge löschen"
ON public.posts FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);


-- 5. KOMMENTARE (COMMENTS)
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kommentare sind öffentlich lesbar"
ON public.comments FOR SELECT USING (true);

CREATE POLICY "Kommentare können erstellt werden"
ON public.comments FOR INSERT WITH CHECK (true);


-- 6. MELDESYSTEM & MODERATION (REPORTS)
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL, -- 'poll', 'post', 'comment', 'profile', 'general'
  content_id TEXT,
  content_title TEXT,
  content_url TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  reporter_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_session TEXT,
  status TEXT DEFAULT 'Neu', -- 'Neu', 'In Prüfung', 'Erledigt', 'Abgelehnt'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Nur Inserts vom Client erlauben, Lesen nur für Administratoren
CREATE POLICY "Jeder kann eine Meldung einreichen"
ON public.reports FOR INSERT WITH CHECK (true);

CREATE POLICY "Reports nur für Administratoren lesbar"
ON public.reports FOR SELECT USING (auth.role() = 'service_role');


-- 7. ANALYTICS EVENTS
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  platform TEXT,
  source TEXT,
  path TEXT,
  payload JSONB,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Analytics Events können geschrieben werden"
ON public.analytics_events FOR INSERT WITH CHECK (true);

CREATE POLICY "Analytics Events sind lesbar"
ON public.analytics_events FOR SELECT USING (true);


-- ==============================================================================
-- 8. INITIAL-DATEN & SEED (ABSTIMMUNGEN, FORUM & REPLIES)
-- ==============================================================================

-- 8.1 ABSTIMMUNGEN (POLLS)
INSERT INTO public.polls (id, title, description, category, options, is_featured, created_at)
VALUES 
(
  '10000000-0000-0000-0000-000000000001'::uuid,
  '10-Millionen-Schweiz: Rettung vor Wohnungsnot oder wirtschaftlicher Selbstmord?',
  'Volle Züge, steigende Mieten und dichtere Agglos vs. akuter Fachkräftemangel in Spitälern und Betrieben. Braucht die Schweiz bis 2050 eine gesetzliche Obergrenze von 10 Millionen Einwohnern?',
  'Schweiz & Politik',
  '["JA (Limit nötig)", "NEIN (Schadet Wirtschaft)", "KOMMT DARAUF AN"]'::jsonb,
  true,
  NOW() - INTERVAL '15 minutes'
),
(
  '10000000-0000-0000-0000-000000000002'::uuid,
  'Flächendeckend Tempo 30 in Städten und immer weniger Parkplätze: Sinnvoller Umweltschutz oder reiner Krieg gegen Autofahrer?',
  'Immer mehr Schweizer Städte bauen Parkplätze ab und senken das Tempolimit auch auf Hauptverkehrsachsen auf 30 km/h. Schützt das die Quartiere oder schadet es Pendlern und Gewerbe?',
  'Auto & Mobilität',
  '["Sinnvoll (Mehr Ruhe & Sicherheit)", "Krieg gegen Autofahrer (Schikane)", "Kommt auf die Strasse an"]'::jsonb,
  false,
  NOW() - INTERVAL '30 minutes'
),
(
  '10000000-0000-0000-0000-000000000003'::uuid,
  'Über 330 Franken im Jahr für die SRG, ob man will oder nicht: Zeit für die Halbierungs-Initiative oder ruinieren wir damit den Schweizer Journalismus?',
  'Sollen die Serafe-Gebühren auf 200 Franken gesenkt werden oder gefährdet ein gekürzter Service public die Information und den Zusammenhalt unserer Sprachregionen?',
  'Schweiz & Politik',
  '["JA (Gebühren auf CHF 200 halbieren)", "NEIN (Gefahr für Journalismus)", "SRG reformieren, nicht halbieren"]'::jsonb,
  false,
  NOW() - INTERVAL '45 minutes'
),
(
  '10000000-0000-0000-0000-000000000004'::uuid,
  'Wohnungsnot in Zürich und Genf: Sind die steigenden Mieten das Resultat von Gier-Investoren oder von zu strengen Baugesetzen und Einsprachen?',
  'Massenbesichtigungen und explodierende Mietpreise in den grossen Schweizer Städten: Liegt die Hauptschuld bei renditeorientierten Investoren oder an jahrelangen Bau-Einsprachen und Regulierungen?',
  'Wohnen',
  '["Renditedruck & Investoren", "Zu strenge Gesetze & Einsprachen", "Beides gleichermassen schuld"]'::jsonb,
  false,
  NOW() - INTERVAL '60 minutes'
),
(
  '10000000-0000-0000-0000-000000000005'::uuid,
  'Milizsystem am Anschlag: Sollten wir die allgemeine Wehrpflicht endlich abschaffen und auf eine Profi-Armee umstellen?',
  'Zivildienst-Boom, Fachkräfte-Ausfall in der Wirtschaft und veränderte Sicherheitslagen in Europa: Braucht die Schweiz weiterhin die allgemeine Wehrpflicht für Männer oder eine freiwillige Profi-Armee?',
  'Schweiz & Politik',
  '["Wehrpflicht beibehalten (Tradition)", "Auf Profi-/Berufsarmee umstellen", "Dienstpflicht für alle (auch Frauen)"]'::jsonb,
  false,
  NOW() - INTERVAL '90 minutes'
),
(
  '10000000-0000-0000-0000-000000000006'::uuid,
  'Sind CHF 6''000 Monatslohn heute noch ein guter Lohn in der Schweiz?',
  'Reichen 6''000 Franken Monatslohn heute noch für ein gutes Leben in der Schweiz oder fressen Mieten und Krankenkassen alles auf?',
  'Geld & Beruf',
  '["Ja, reicht gut", "Nein, zu wenig", "Kommt auf den Wohnort an"]'::jsonb,
  false,
  NOW() - INTERVAL '2 days'
),
(
  '10000000-0000-0000-0000-000000000007'::uuid,
  'Ist es komisch, mit 25 noch bei den Eltern zu wohnen?',
  'Hotel Mama oder finanzielle Vernunft: Was denkt ihr über das Wohnen bei den Eltern mit 25 in der Schweiz?',
  'Beziehungen',
  '["Völlig normal & schlau", "Zeit auszuziehen", "Kommt auf die Situation an"]'::jsonb,
  false,
  NOW() - INTERVAL '3 days'
),
(
  '10000000-0000-0000-0000-000000000008'::uuid,
  'Coop oder Migros?',
  'Die ewige Schweizer Glaubensfrage: Wo kauft ihr lieber für den täglichen Bedarf ein?',
  'Alltag',
  '["Coop", "Migros", "Beides gleich gerne"]'::jsonb,
  false,
  NOW() - INTERVAL '4 days'
),
(
  '10000000-0000-0000-0000-000000000009'::uuid,
  'Würdest du für CHF 1''000 mehr Lohn täglich eine Stunde länger pendeln?',
  'Mehr Geld auf dem Konto gegen verlorene Lebenszeit im Zug oder Stau: Würdest du den Deal eingehen?',
  'Geld & Beruf',
  '["Ja, lohnt sich", "Nein, Freizeit ist wichtiger"]'::jsonb,
  false,
  NOW() - INTERVAL '5 days'
),
(
  '10000000-0000-0000-0000-000000000010'::uuid,
  'Sind 30 Franken für eine Pizza in der Schweiz zu viel?',
  'Restaurantpreise in Schweizer Städten steigen stetig. Ab wann ist für euch die Schmerzgrenze bei Pizza & Pasta erreicht?',
  'Alltag',
  '["Ja, masslos überteuert", "Nein, normale Schweizer Preise", "Kommt auf Qualität & Restaurant an"]'::jsonb,
  false,
  NOW() - INTERVAL '6 days'
)
ON CONFLICT (id) DO UPDATE SET 
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  options = EXCLUDED.options,
  is_featured = EXCLUDED.is_featured;


-- 8.2 FORUMS-BEITRÄGE (POSTS)
INSERT INTO public.posts (id, title, category, excerpt, body, views, created_at)
VALUES
(
  '20000000-0000-0000-0000-000000000001'::uuid,
  '10-Millionen-Schweiz: Rettung vor dem Kollaps oder wirtschaftlicher Selbstmord?',
  'Schweiz & Politik',
  'Wohnungsnot und überfüllte Pendlerzüge vs. akuter Fachkräftemangel in Spitälern und Betrieben. Wo steht ihr bei der 10-Millionen-Debatte?',
  ARRAY[
    'Die Debatte um eine 10-Millionen-Schweiz bis 2050 sorgt im ganzen Land für hitzige Diskussionen. Auf der einen Seite spüren viele im Alltag den Druck: kaum bezahlbare Wohnungen, steigende Mieten und überfüllte Pendlerzüge zu den Stosszeiten.',
    'Auf der anderen Seite warnen Spitäler, Gewerbe und Wirtschaftsverbände: Ohne Zuwanderung fehlen uns schon heute Pflegekräfte, Handwerker und IT-Spezialisten. Ein harter Deckel könnte Wohlstand und Altersvorsorge gefährden.',
    'Wie seht ihr das: Braucht es eine klare gesetzliche Grenze beim Bevölkerungswachstum oder schaden wir uns damit am Ende nur selbst? Schreibt eure Erfahrungen und Meinungen aus eurem Kanton!'
  ]::text[],
  184,
  NOW() - INTERVAL '20 minutes'
),
(
  '20000000-0000-0000-0000-000000000002'::uuid,
  'Flächendeckend Tempo 30 in Städten und immer weniger Parkplätze: Sinnvoller Umweltschutz oder reiner Krieg gegen Autofahrer?',
  'Auto & Mobilität',
  'Immer mehr Städte reduzieren Parkplätze und führen flächendeckend Tempo 30 ein. Mehr Lebensqualität oder reine Schikane für Pendler und Gewerbe?',
  ARRAY[
    'In Schweizer Städten wie Zürich, Basel, Bern oder Lausanne werden seit Monaten massiv Parkplätze aufgehoben und selbst auf vierspurigen Hauptachsen Tempo 30 eingeführt.',
    'Befürworter betonen: Weniger Lärm, deutlich mehr Sicherheit für Fussgänger und Velofahrende sowie bessere Luft. Autofahrer, Handwerker und Pendler aus den Agglos klagen dagegen: Künstlich erzeugter Stau, verlängerte Fahrzeiten und unbezahlbare Parkgebühren machen das Arbeiten in der Stadt fast unmöglich.',
    'Wie nehmt ihr die Situation in eurem Wohnort oder beim täglichen Pendeln wahr: Ist die autofreie Stadt die Zukunft oder übertreiben es die Stadtregierungen?'
  ]::text[],
  142,
  NOW() - INTERVAL '40 minutes'
),
(
  '20000000-0000-0000-0000-000000000003'::uuid,
  'Über 330 Franken im Jahr für die SRG, ob man will oder nicht: Zeit für die Halbierungs-Initiative oder ruinieren wir damit den Schweizer Journalismus?',
  'Schweiz & Politik',
  'Über 330 Franken Serafe-Gebühren pro Jahr spalten die Schweiz. Sollte die Gebühr halbiert werden oder gefährdet das den Service public?',
  ARRAY[
    'Die Debatte um die Halbierungsinitiative («200 Franken sind genug») kocht wieder hoch. Jeder Schweizer Haushalt zahlt heute über 330 Franken pro Jahr für Radio und Fernsehen – unabhängig davon, ob man die Programme überhaupt konsumiert.',
    'Die Initianten fordern eine Deckelung auf 200 Franken und die Befreiung von Unternehmen. Auf der Gegenseite warnen SRG, Kulturschaffende und Politiker: Eine Halbierung würde Hunderte Stellen kosten, das Informationsangebot drastisch schwächen und vor allem den sprachlichen Zusammenhalt der Romandie, des Tessins und der Deutschschweiz gefährden.',
    'Zahlt ihr die Gebühren gerne für einen starken Schweizer Service public oder findet ihr das System im Streaming-Zeitalter veraltet?'
  ]::text[],
  98,
  NOW() - INTERVAL '55 minutes'
),
(
  '20000000-0000-0000-0000-000000000004'::uuid,
  'Wohnungsnot in Zürich und Genf: Sind die steigenden Mieten das Resultat von Gier-Investoren oder von zu strengen Baugesetzen und Einsprachen?',
  'Wohnen',
  'Wohnungsnot und explodierende Mieten in Schweizer Grossstädten: Wo liegen die wahren Ursachen der Krise?',
  ARRAY[
    'Wer aktuell in Zürich, Genf, Lausanne oder Basel eine bezahlbare Wohnung sucht, erlebt puren Frust: Hunderte Bewerber für eine einzige Besichtigung und Mietzinse, die locker einen Drittel des Einkommens verschlingen.',
    'Auf der einen Seite stehen Vorwürfe gegen renditegetriebene Immobilienfonds, Pensionskassen und Luxussanierungen, die alteingesessene Mieter verdrängen. Auf der anderen Seite betonen Bauherren und Experten: Es wird schlicht zu wenig gebaut, weil jedes Neubauprojekt durch Einsprachen, Lärmschutzauflagen und bürokratische Hürden um Jahre blockiert wird.',
    'Wo seht ihr die Hauptursache für die Wohnungsnot und was wäre eurer Meinung nach die wirksamste Lösung?'
  ]::text[],
  115,
  NOW() - INTERVAL '70 minutes'
),
(
  '20000000-0000-0000-0000-000000000005'::uuid,
  'Milizsystem am Anschlag: Sollten wir die allgemeine Wehrpflicht endlich abschaffen und auf eine Profi-Armee umstellen?',
  'Schweiz & Politik',
  'Zivildienst-Boom und Debatten um Chancengleichheit: Braucht die Schweiz weiterhin die allgemeine Wehrpflicht oder eine moderne Berufsarmee?',
  ARRAY[
    'Das Milizsystem und die allgemeine Wehrpflicht für Schweizer Männer gehören zu den traditionsreichsten Institutionen unseres Landes. Doch die Kritik wächst stetig.',
    'Immer mehr Rekruten entscheiden sich für den Zivildienst, Arbeitgeber klagen über die monatelangen Absenzen von Schlüsselkräften und die ungleiche Belastung – da Frauen vom Dienst befreit sind – sorgt für permanente Diskussionen. Einige fordern eine allgemeine Dienstpflicht für alle Schweizerinnen und Schweizer, andere plädieren für den Übergang zu einer schlagkräftigen, freiwilligen Profi-Armee nach europäischem Vorbild.',
    'Sollte die Schweiz am traditionellen Milizprinzip festhalten oder ist es Zeit für eine grundlegende Armeereform?'
  ]::text[],
  64,
  NOW() - INTERVAL '100 minutes'
),
(
  '20000000-0000-0000-0000-000000000006'::uuid,
  'Nachbar stellt ständig Sachen ins Treppenhaus – was würdet ihr machen?',
  'Wohnen',
  'Schuhe, Kisten und alte Möbel im Treppenhaus: Erst reden oder direkt an die Verwaltung melden?',
  ARRAY[
    'Unser Nachbar im 2. Stock nutzt den Hausgang gefühlt als erweiterten Keller. Schuhe, Pakete und Kinderwagen versperren regelmässig den Durchgang.',
    'Bisher haben wir nichts gesagt, aber bei einem Brand wäre das ein echtes Sicherheitsrisiko. Wie regelt ihr solche Situationen in eurer Liegenschaft?'
  ]::text[],
  342,
  NOW() - INTERVAL '1 day'
),
(
  '20000000-0000-0000-0000-000000000007'::uuid,
  'Chef erwartet, dass ich nach Feierabend auf WhatsApp antworte',
  'Geld & Beruf',
  'Ständige Erreichbarkeit im Job: Wo zieht ihr die Grenze zwischen Loyalität und Freizeit?',
  ARRAY[
    'Mein Chef schreibt mir regelmässig um 20:30 Uhr oder am Wochenende auf WhatsApp wegen dringenden Kleinigkeiten.',
    'Im Arbeitsvertrag steht davon kein Wort. Wenn ich nicht antworte, ist am Montagmorgen die Stimmung im Team eisig. Was ratet ihr mir?'
  ]::text[],
  618,
  NOW() - INTERVAL '2 days'
),
(
  '20000000-0000-0000-0000-000000000008'::uuid,
  'Wie viel zahlt ihr aktuell für eine 2.5-Zimmer-Wohnung?',
  'Wohnen',
  'Mietpreis-Vergleich Schweiz: Was zahlt ihr monatlich warm in eurem Kanton?',
  ARRAY[
    'Die Mietzinse driften regional extrem auseinander. Zahlt ihr noch unter 1''500 Franken oder seid ihr längst bei über 2''200 Franken?',
    'Schreibt bitte euren Kanton, Ort und die ungefähre Quadratmeterzahl dazu!'
  ]::text[],
  694,
  NOW() - INTERVAL '3 days'
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  excerpt = EXCLUDED.excerpt,
  body = EXCLUDED.body;


-- 8.3 KOMMENTARE (COMMENTS)
INSERT INTO public.comments (id, post_id, content, upvotes, created_at)
VALUES
-- Kommentare für 10-Millionen
(
  '30000000-0000-0000-0000-000000000001'::uuid,
  '20000000-0000-0000-0000-000000000001'::uuid,
  'Einfach Olten zur Megacity ausbauen und 2 Millionen dort einquartieren, Problem gelöst. Dort will eh niemand durchfahren.',
  21,
  NOW() - INTERVAL '18 minutes'
),
(
  '30000000-0000-0000-0000-000000000002'::uuid,
  '20000000-0000-0000-0000-000000000001'::uuid,
  'Ich arbeite im Spital. Ohne Kolleginnen und Kollegen aus dem Ausland könnten wir nächste Woche die half Bettenstation dichtmachen. Man kann nicht gleichzeitig Zuwanderungsstopp fordern und sich dann beschweren, wenn man 8 Stunden auf der Notfallstation wartet.',
  16,
  NOW() - INTERVAL '42 minutes'
),
(
  '30000000-0000-0000-0000-000000000003'::uuid,
  '20000000-0000-0000-0000-000000000001'::uuid,
  'Es geht doch nicht nur um Jobs. Schaut euch die Mieten und Züge an. Irgendwann ist das Land flächenmässig einfach voll betoniert.',
  8,
  NOW() - INTERVAL '85 minutes'
),

-- Kommentare für Tempo 30
(
  '30000000-0000-0000-0000-000000000004'::uuid,
  '20000000-0000-0000-0000-000000000002'::uuid,
  'Endlich kann ich mit meinem E-Bike die SUVs auf der Hardbrücke links überholen. Bitte gleich Tempo 20 einführen, damit ich noch gemütlich meinen Flat White austrinken kann.',
  9,
  NOW() - INTERVAL '12 minutes'
),
(
  '30000000-0000-0000-0000-000000000005'::uuid,
  '20000000-0000-0000-0000-000000000002'::uuid,
  'Für alle die im Büro hocken ist das ja super. Aber fahrt mal als Sanitär mit 80kg Werkzeug im Bus durch die Stadt, wenn du 45 Minuten für 3km brauchst und nirgends parkieren darfst. Die Mehrkosten verrechnen wir am Ende halt den Kunden.',
  14,
  NOW() - INTERVAL '30 minutes'
),
(
  '30000000-0000-0000-0000-000000000006'::uuid,
  '20000000-0000-0000-0000-000000000002'::uuid,
  'In Wohnquartieren absolut sinnvoll wegen Lärm und Kindern. Auf Hauptverkehrsachsen wie der Nauenstrasse aber kompletter Unsinn.',
  6,
  NOW() - INTERVAL '55 minutes'
),

-- Kommentare für SRG Gebühren
(
  '30000000-0000-0000-0000-000000000007'::uuid,
  '20000000-0000-0000-0000-000000000003'::uuid,
  'Ich zahle 330 Stutz im Jahr eigentlich nur, um am Sonntagabend Tatort zu schauen und mich danach 2 Stunden im Internet darüber aufzuregen wie schlecht er war. Beste Schweizer Tradition.',
  15,
  NOW() - INTERVAL '25 minutes'
),
(
  '30000000-0000-0000-0000-000000000008'::uuid,
  '20000000-0000-0000-0000-000000000003'::uuid,
  'Vergesst bitte die Sprachminderheiten nicht. RTS und RSI produzieren super Sendungen, die sich privat niemals finanzieren würden. Die Schweiz besteht nicht nur aus Zürich.',
  11,
  NOW() - INTERVAL '65 minutes'
),

-- Kommentare für Wohnungsnot
(
  '30000000-0000-0000-0000-000000000009'::uuid,
  '20000000-0000-0000-0000-000000000004'::uuid,
  'War gestern an einer Besichtigung für eine 1.5-Zimmer im Kreis 4. Musste mich mit 140 Leuten im Treppenhaus anstellen und dem Vormieter noch seine abgeranzte IKEA-Couch für 2''500 CHF abkaufen. Ein Traum.',
  27,
  NOW() - INTERVAL '35 minutes'
),
(
  '30000000-0000-0000-0000-000000000010'::uuid,
  '20000000-0000-0000-0000-000000000004'::uuid,
  'Wir planen aktuell ein Mehrfamilienhaus. 3 Jahre Verfahren wegen einer einzigen Einsprache wegen Schattenwurf auf einen Geräteschuppen. So baut man halt keine Wohnungen.',
  19,
  NOW() - INTERVAL '70 minutes'
),

-- Kommentare für Treppenhaus
(
  '30000000-0000-0000-0000-000000000011'::uuid,
  '20000000-0000-0000-0000-000000000006'::uuid,
  'Ich würde zuerst ganz normal das Gespräch suchen. Viele merken gar nicht, dass es andere stört. Wenn danach nichts passiert, kannst du immer noch der Verwaltung schreiben.',
  12,
  NOW() - INTERVAL '1 day'
),
(
  '30000000-0000-0000-0000-000000000012'::uuid,
  '20000000-0000-0000-0000-000000000006'::uuid,
  'Direkt ansprechen, freundlich und ohne Vorwurf. Schriftlich über die Verwaltung eskaliert so etwas meiner Erfahrung nach nur unnötig schnell.',
  8,
  NOW() - INTERVAL '2 days'
)
ON CONFLICT (id) DO UPDATE SET
  content = EXCLUDED.content,
  upvotes = EXCLUDED.upvotes;

