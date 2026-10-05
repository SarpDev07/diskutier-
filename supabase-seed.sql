-- ==============================================================================
-- VOLLSTÄNDIGER SEED FÜR DISKUTIER.CH (SUPABASE SQL EDITOR)
-- Führt alle Abstimmungen, Forumsbeiträge und Kommentare direkt in Supabase ein
-- options = JSONB, body = text[]
-- ==============================================================================

-- 1. ABSTIMMUNGEN (POLLS)
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


-- 2. FORUMS-BEITRÄGE (POSTS)
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


-- 3. KOMMENTARE (COMMENTS) FÜR DIE FORUMS-BEITRÄGE
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
  'Ich arbeite im Spital. Ohne Kolleginnen und Kollegen aus dem Ausland könnten wir nächste Woche die halbe Bettenstation dichtmachen. Man kann nicht gleichzeitig Zuwanderungsstopp fordern und sich dann beschweren, wenn man 8 Stunden auf der Notfallstation wartet.',
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
