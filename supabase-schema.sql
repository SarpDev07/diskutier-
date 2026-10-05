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

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stimmen sind öffentlich lesbar"
ON public.poll_votes FOR SELECT USING (true);

CREATE POLICY "Stimmen können abgegeben oder geändert werden"
ON public.poll_votes FOR ALL USING (true) WITH CHECK (true);


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
