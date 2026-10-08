// ABSTIMMUNGEN (POLLS) & LIVE-VOTING
let currentPolls = [];
let currentPoll = null;
let activeFeaturedIndex = 0;

// REALISTISCHE SCHWEIZER BASIS-DATEN FÜR ALTE TEST-FRAGEN
// REALISTISCHE SCHWEIZER BASIS-DATEN FÜR ALLE ABSTIMMUNGEN (ALLE UNTER 500 STIMMEN)
const POLL_BASELINES = {
  "10-Millionen-Schweiz: Rettung vor Wohnungsnot oder wirtschaftlicher Selbstmord?": { baseVotes: 380, optionCounts: [198, 167, 15] },
  "poll_10m_schweiz": { baseVotes: 380, optionCounts: [198, 167, 15] },
  "10000000-0000-0000-0000-000000000001": { baseVotes: 380, optionCounts: [198, 167, 15] },

  "Flächendeckend Tempo 30 in Städten und immer weniger Parkplätze: Sinnvoller Umweltschutz oder reiner Krieg gegen Autofahrer?": { baseVotes: 340, optionCounts: [122, 148, 70] },
  "poll_tempo30": { baseVotes: 340, optionCounts: [122, 148, 70] },
  "10000000-0000-0000-0000-000000000002": { baseVotes: 340, optionCounts: [122, 148, 70] },

  "Über 330 Franken im Jahr für die SRG, ob man will oder nicht: Zeit für die Halbierungs-Initiative oder ruinieren wir damit den Schweizer Journalismus?": { baseVotes: 310, optionCounts: [146, 118, 46] },
  "poll_srg_gebuehren": { baseVotes: 310, optionCounts: [146, 118, 46] },
  "10000000-0000-0000-0000-000000000003": { baseVotes: 310, optionCounts: [146, 118, 46] },

  "Wohnungsnot in Zürich und Genf: Sind die steigenden Mieten das Resultat von Gier-Investoren oder von zu strengen Baugesetzen und Einsprachen?": { baseVotes: 290, optionCounts: [128, 90, 72] },
  "poll_wohnungsnot_mieten": { baseVotes: 290, optionCounts: [128, 90, 72] },
  "10000000-0000-0000-0000-000000000004": { baseVotes: 290, optionCounts: [128, 90, 72] },

  "Milizsystem am Anschlag: Sollten wir die allgemeine Wehrpflicht endlich abschaffen und auf eine Profi-Armee umstellen?": { baseVotes: 320, optionCounts: [109, 58, 153] },
  "poll_wehrpflicht_miliz": { baseVotes: 320, optionCounts: [109, 58, 153] },
  "10000000-0000-0000-0000-000000000005": { baseVotes: 320, optionCounts: [109, 58, 153] },

  "Sind CHF 6'000 Monatslohn heute noch ein guter Lohn in der Schweiz?": { baseVotes: 280, optionCounts: [87, 151, 42] },
  "10000000-0000-0000-0000-000000000006": { baseVotes: 280, optionCounts: [87, 151, 42] },

  "Ist es komisch, mit 25 noch bei den Eltern zu wohnen?": { baseVotes: 240, optionCounts: [67, 113, 60] },
  "10000000-0000-0000-0000-000000000007": { baseVotes: 240, optionCounts: [67, 113, 60] },

  "Coop oder Migros?": { baseVotes: 360, optionCounts: [166, 155, 39] },
  "10000000-0000-0000-0000-000000000008": { baseVotes: 360, optionCounts: [166, 155, 39] },

  "Würdest du für CHF 1'000 mehr Lohn täglich eine Stunde länger pendeln?": { baseVotes: 210, optionCounts: [63, 147] },
  "10000000-0000-0000-0000-000000000009": { baseVotes: 210, optionCounts: [63, 147] },

  "Sind 30 Franken für eine Pizza in der Schweiz zu viel?": { baseVotes: 190, optionCounts: [133, 23, 34] },
  "10000000-0000-0000-0000-000000000010": { baseVotes: 190, optionCounts: [133, 23, 34] },

  "Sollte man seinem Partner das Handy-Passwort geben?": { baseVotes: 260, optionCounts: [65, 148, 47] },
  "iPhone oder Samsung?": { baseVotes: 300, optionCounts: [165, 111, 24] },
  "Homeoffice oder Büro?": { baseVotes: 230, optionCounts: [137, 32, 61] },
  "Würdest du für die Liebe in einen anderen Kanton ziehen?": { baseVotes: 180, optionCounts: [120, 25, 35] }
};

// AUTHENTISCHE SCHWEIZER COMMUNITY-AUTOREN
const SWISS_AUTHORS = [
  { username: "Sandro_ZH", canton: "ZH" },
  { username: "AlpenBueb", canton: "BE" },
  { username: "Elena_BS", canton: "BS" },
  { username: "Marco_LU", canton: "LU" },
  { username: "Sina_AG", canton: "AG" },
  { username: "Pascal_SG", canton: "SG" },
  { username: "Nico_SO", canton: "SO" },
  { username: "Tessin_Fan", canton: "TI" },
  { username: "Walliser_94", canton: "VS" },
  { username: "Thurgauer_90", canton: "TG" },
  { username: "Schwyzer_Bueb", canton: "SZ" },
  { username: "Graubünden_Pur", canton: "GR" }
];

function getSwissCommunityAuthor(idOrContent) {
  let hash = 0;
  const str = String(idOrContent || "swiss");
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % SWISS_AUTHORS.length;
  return SWISS_AUTHORS[idx];
}

// INITIALE SCHWEIZER COMMUNITY-KOMMENTARE FÜR ALLE FRAGEN
const SEED_POLL_COMMENTS = {
  "6000": [
    { username: "AlpenFuchs", canton: "BE", created_at: new Date(Date.now() - 1000 * 60 * 50).toISOString(), content: "Als Single reicht es zum Leben, aber wenn du in Zürich oder Zug eine Wohnung suchst und noch Steuern und Krankenkasse zahlst bleibt Ende Monat fast nichts mehr übrig.", upvotes: 24, downvotes: 3 },
    { username: "NinaZH", canton: "ZH", created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(), content: "Kommt extrem auf den Wohnort an. Auf dem Land im Thurgau lebst du mit 6000 wie ein König, in der Stadt Zürich bist du damit unterer Durchschnitt.", upvotes: 18, downvotes: 2 }
  ],
  "eltern": [
    { username: "ZüriSpargel", canton: "ZH", created_at: new Date(Date.now() - 1000 * 60 * 40).toISOString(), content: "Bei den aktuellen Mietpreisen ist das die schlauste Entscheidung überhaupt. Lieber 2 Jahre richtig Geld sparen statt einem Vermieter 2000 Stutz im Monat in den Rachen zu werfen.", upvotes: 28, downvotes: 1 },
    { username: "Lukas_SG", canton: "SG", created_at: new Date(Date.now() - 1000 * 60 * 95).toISOString(), content: "Kommt drauf an ob man sich daheim beteiligt. Wenn Mama mit 25 noch deine Wäsche macht ist es peinlich, wenn man Miete zahlt und hilft völlig in Ordnung.", upvotes: 21, downvotes: 2 }
  ],
  "pendeln": [
    { username: "Beni_AG", canton: "AG", created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(), content: "Habe das 2 Jahre lang gemacht und war am Abend nur noch kaputt. Die 1000 Franken mehr sind die verlorene Lebenszeit einfach nicht wert.", upvotes: 32, downvotes: 3 },
    { username: "Pendler_BE", canton: "BE", created_at: new Date(Date.now() - 1000 * 60 * 80).toISOString(), content: "Wenn man im Zug mit dem GA gemütlich sitzen und arbeiten oder Podcasts hören kann geht es eigentlich voll klar.", upvotes: 11, downvotes: 4 }
  ],
  "migros": [
    { username: "MigrosKind", canton: "ZH", created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(), content: "Ganz klar Migros wegen dem Kultstatus vom Ice Tea Zitrone. Da kommt Coop einfach nicht ran.", upvotes: 45, downvotes: 5 },
    { username: "CoopFan_BS", canton: "BS", created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), content: "Für Früchte und Gemüse Migros, aber wenn man am Feierabend noch ein Bier braucht geht man zum Coop.", upvotes: 36, downvotes: 2 }
  ],
  "handy": [
    { username: "Fabian_LU", canton: "LU", created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), content: "Wer nichts zu verheimlichen hat braucht auch kein Drama daraus zu machen. Aber heimlich rumschnüffeln geht gar nicht.", upvotes: 25, downvotes: 3 },
    { username: "Sarah_ZH", canton: "ZH", created_at: new Date(Date.now() - 1000 * 60 * 110).toISOString(), content: "Privatsphäre muss auch in einer Beziehung sein. Man liest ja auch nicht die Tagebücher vom Partner.", upvotes: 18, downvotes: 4 }
  ],
  "pizza": [
    { username: "Gino_TI", canton: "TI", created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), content: "Für 30 Franken muss die Pizza aber direkt aus Neapel eingeflogen werden. Mehr als 22 bis 24 Franken für eine normale Margherita ist reine Abzocke.", upvotes: 41, downvotes: 2 },
    { username: "ZürichGourmet", canton: "ZH", created_at: new Date(Date.now() - 1000 * 60 * 75).toISOString(), content: "In Zürich leider schon fast Standard. Wenn die Qualität stimmt zahle ich es ab und zu, aber oft koche ich lieber daheim.", upvotes: 15, downvotes: 3 }
  ],
  "iphone": [
    { username: "TechNerd_ZH", canton: "ZH", created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(), content: "Einmal im Apple Universum mit MacBook und AirPods drin und man kommt nie wieder weg. Funktioniert einfach jahrelang ohne Probleme.", upvotes: 29, downvotes: 4 },
    { username: "AndroidUser_SO", canton: "SO", created_at: new Date(Date.now() - 1000 * 60 * 85).toISOString(), content: "Samsung hat die viel besseren Kameras und Akkus. Verstehe den Apple Hype bis heute nicht ganz.", upvotes: 22, downvotes: 6 }
  ],
  "homeoffice": [
    { username: "Pascal_BS", canton: "BS", created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), content: "Die Mischung machts. 2 Tage Büro für den Austausch mit den Kollegen und 3 Tage Homeoffice wo man in Ruhe arbeiten kann.", upvotes: 37, downvotes: 1 },
    { username: "RemoteCH", canton: "BE", created_at: new Date(Date.now() - 1000 * 60 * 65).toISOString(), content: "Nie wieder 5 Tage die Woche ins Büro. Die gewonnene Zeit ohne Pendelstress gebe ich nicht mehr her.", upvotes: 26, downvotes: 2 }
  ],
  "kanton": [
    { username: "RomandieLover", canton: "VD", created_at: new Date(Date.now() - 1000 * 60 * 40).toISOString(), content: "Solange ich nicht nach Olten muss sofort. Für die richtige Person zieht man überall hin.", upvotes: 33, downvotes: 2 },
    { username: "Walliser_94", canton: "VS", created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(), content: "Vom Wallis nach Zürich wäre schon ein harter Kulturschock, aber wenn es die grosse Liebe ist warum nicht.", upvotes: 17, downvotes: 1 }
  ],
  "10m": [
    { username: "AareFuchs", canton: "BE", created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), content: "Die Züge sind jetzt schon voll und bezahlbare Wohnungen gibt es kaum mehr. Wir müssen beim Wachstum endlich mal eine Pause einlegen.", upvotes: 31, downvotes: 4 },
    { username: "SpitalArzt_ZH", canton: "ZH", created_at: new Date(Date.now() - 1000 * 60 * 70).toISOString(), content: "Unsere Wirtschaft und die Spitäler brauchen Arbeitskräfte. Ohne Zuwanderung bricht unser Rentensystem komplett zusammen.", upvotes: 24, downvotes: 5 }
  ],
  "tempo30": [
    { username: "VeloFan_BS", canton: "BS", created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(), content: "In Wohnquartieren super wegen Sicherheit und Lärm. Auf Hauptstrassen wo Busse und Trams fahren macht es nur Stau.", upvotes: 29, downvotes: 3 },
    { username: "Marco_AG", canton: "AG", created_at: new Date(Date.now() - 1000 * 60 * 55).toISOString(), content: "Fahre jeden Tag mit dem Auto zur Arbeit und seit Tempo 30 steht man nur noch im Stop and Go.", upvotes: 16, downvotes: 2 }
  ],
  "srg": [
    { username: "Bünzli_Prime", canton: "SO", created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(), content: "330 Franken im Jahr ist zu viel für Leute die nur Netflix und YouTube schauen. 200 Franken wären völlig fair.", upvotes: 35, downvotes: 4 },
    { username: "Tessin_Fan", canton: "TI", created_at: new Date(Date.now() - 1000 * 60 * 80).toISOString(), content: "Wer soll denn sonst über unsere Politik und Regionen neutral berichten. Private Medien sterben doch jetzt schon aus.", upvotes: 27, downvotes: 3 }
  ],
  "wohnung": [
    { username: "Zügelmeister", canton: "ZH", created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(), content: "Es wird einfach viel zu langsam gebaut weil jede kleine Einsprache ein Projekt um Jahre blockiert.", upvotes: 38, downvotes: 2 },
    { username: "Mieterverband_BS", canton: "BS", created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), content: "Pensionskassen reissen alte günstige Wohnungen ab und bauen Luxuswohnungen für 3500 Franken. Das ist das wahre Problem.", upvotes: 42, downvotes: 3 }
  ],
  "wehrpflicht": [
    { username: "MilizSoldat", canton: "LU", created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), content: "Entweder Dienstpflicht für alle oder auf eine moderne Profi-Armee umstellen. Das heutige System ist nicht mehr zeitgemäss.", upvotes: 30, downvotes: 4 },
    { username: "Schwyzer_Bueb", canton: "SZ", created_at: new Date(Date.now() - 1000 * 60 * 100).toISOString(), content: "Das Milizsystem bringt Leute aus allen Schichten und Kantonen zusammen. Das hält die Schweiz zusammen.", upvotes: 23, downvotes: 2 }
  ]
};

// ERMITTLUNG DER BASIS-DATEN (MIT ROBUSTEM FUZZY-MATCHING FÜR DATENBANK-FRAGEN)
function getBaselineForPoll(p){
  if(!p) return { baseVotes: 0, optionCounts: [] };
  if(p.id && POLL_BASELINES[p.id]) return POLL_BASELINES[p.id];
  if(p.title && POLL_BASELINES[p.title]) return POLL_BASELINES[p.title];
  
  const title = (p.title || "").toLowerCase();
  if(title.includes("10-millionen") || title.includes("10 millionen") || title.includes("10 mio")){
    return { baseVotes: 380, optionCounts: [198, 167, 15] };
  }
  if(title.includes("tempo 30") || title.includes("tempo-30")){
    return { baseVotes: 340, optionCounts: [122, 148, 70] };
  }
  if(title.includes("srg") || title.includes("serafe") || title.includes("halbierungs")){
    return { baseVotes: 310, optionCounts: [146, 118, 46] };
  }
  if(title.includes("wohnungsnot") || title.includes("gier-investoren")){
    return { baseVotes: 290, optionCounts: [128, 90, 72] };
  }
  if(title.includes("wehrpflicht") || title.includes("milizsystem")){
    return { baseVotes: 320, optionCounts: [109, 58, 153] };
  }
  if(title.includes("6'000") || title.includes("6000")){
    return { baseVotes: 280, optionCounts: [87, 151, 42] };
  }
  if(title.includes("25 noch bei den eltern") || title.includes("eltern zu wohnen")){
    return { baseVotes: 240, optionCounts: [67, 113, 60] };
  }
  if(title.includes("coop oder migros")){
    return { baseVotes: 360, optionCounts: [166, 155, 39] };
  }
  if(title.includes("pendeln")){
    return { baseVotes: 210, optionCounts: [63, 147] };
  }
  if(title.includes("pizza")){
    return { baseVotes: 190, optionCounts: [133, 23, 34] };
  }
  return { baseVotes: 0, optionCounts: (p.options || []).map(() => 0) };
}

// LOKALE SPEICHERUNG DER ABSTIMMUNGEN (BLEIBT NACH REFRESH / NEUSTART ERHALTEN)
function getLocalVotes(){
  try {
    return JSON.parse(localStorage.getItem("diskutier_poll_votes") || "{}");
  } catch(e){
    return {};
  }
}

function saveLocalVote(pollId, optionIndex, pollTitle){
  try {
    const votes = getLocalVotes();
    if(pollId) votes[pollId] = optionIndex;
    if(pollTitle) votes[pollTitle] = optionIndex;
    localStorage.setItem("diskutier_poll_votes", JSON.stringify(votes));
  } catch(e){}
}

function removeLocalVote(pollId, pollTitle){
  try {
    const votes = getLocalVotes();
    if(pollId) delete votes[pollId];
    if(pollTitle) delete votes[pollTitle];
    localStorage.setItem("diskutier_poll_votes", JSON.stringify(votes));
  } catch(e){}
}

async function loadPolls(){
  let polls = [];
  if(db){
    const { data, error } = await db.from("polls").select("*, poll_votes(id, option_index, user_id, session_token)").order("created_at", { ascending: false });
    if(!error && data) polls = data;
  }

  // 4 NEUE SCHWEIZER DEBATTEN-THEMEN (FRISCH & OHNE INITIAL-STIMMEN)
  const newPollsToAdd = [
    {
      id: "poll_tempo30",
      category: "Auto & Mobilität",
      title: "Flächendeckend Tempo 30 in Städten und immer weniger Parkplätze: Sinnvoller Umweltschutz oder reiner Krieg gegen Autofahrer?",
      description: "Immer mehr Schweizer Städte bauen Parkplätze ab und senken das Tempolimit auch auf Hauptverkehrsachsen auf 30 km/h. Schützt das die Quartiere oder schadet es Pendlern und Gewerbe?",
      options: ["Sinnvoll (Mehr Ruhe & Sicherheit)", "Krieg gegen Autofahrer (Schikane)", "Kommt auf die Strasse an"],
      is_featured: false,
      created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      poll_votes: []
    },
    {
      id: "poll_srg_gebuehren",
      category: "Schweiz & Politik",
      title: "Über 330 Franken im Jahr für die SRG, ob man will oder nicht: Zeit für die Halbierungs-Initiative oder ruinieren wir damit den Schweizer Journalismus?",
      description: "Sollen die Serafe-Gebühren auf 200 Franken gesenkt werden oder gefährdet ein gekürzter Service public die Information und den Zusammenhalt unserer Sprachregionen?",
      options: ["JA (Gebühren auf CHF 200 halbieren)", "NEIN (Gefahr für Journalismus)", "SRG reformieren, nicht halbieren"],
      is_featured: false,
      created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      poll_votes: []
    },
    {
      id: "poll_wohnungsnot_mieten",
      category: "Wohnen",
      title: "Wohnungsnot in Zürich und Genf: Sind die steigenden Mieten das Resultat von Gier-Investoren oder von zu strengen Baugesetzen und Einsprachen?",
      description: "Massenbesichtigungen und explodierende Mietpreise in den grossen Schweizer Städten: Liegt die Hauptschuld bei renditeorientierten Investoren oder an jahrelangen Bau-Einsprachen und Regulierungen?",
      options: ["Renditedruck & Investoren", "Zu strenge Gesetze & Einsprachen", "Beides gleichermassen schuld"],
      is_featured: false,
      created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      poll_votes: []
    },
    {
      id: "poll_wehrpflicht_miliz",
      category: "Schweiz & Politik",
      title: "Milizsystem am Anschlag: Sollten wir die allgemeine Wehrpflicht endlich abschaffen und auf eine Profi-Armee umstellen?",
      description: "Zivildienst-Boom, Fachkräfte-Ausfall in der Wirtschaft und veränderte Sicherheitslagen in Europa: Braucht die Schweiz weiterhin die allgemeine Wehrpflicht für Männer oder eine freiwillige Profi-Armee?",
      options: ["Wehrpflicht beibehalten (Tradition)", "Auf Profi-/Berufsarmee umstellen", "Dienstpflicht für alle (auch Frauen)"],
      is_featured: false,
      created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      poll_votes: []
    }
  ];

  newPollsToAdd.forEach(np => {
    if(!polls.some(p => p.id === np.id || (p.title && p.title.includes(np.title.substring(0, 30))))){
      polls.unshift(np);
    }
  });

  // 10-Millionen Haupt-Abstimmung (GANZ NEU & FRISCH GESTARTET)
  const has10MPoll = polls.some(p => p.title && p.title.includes("10-Millionen"));
  if(!has10MPoll){
    const initial10M = {
      id: "poll_10m_schweiz",
      category: "Schweiz & Politik",
      title: "10-Millionen-Schweiz: Rettung vor Wohnungsnot oder wirtschaftlicher Selbstmord?",
      description: "Volle Züge, steigende Mieten und dichtere Agglos vs. akuter Fachkräftemangel in Spitälern und Betrieben. Braucht die Schweiz bis 2050 eine gesetzliche Obergrenze von 10 Millionen Einwohnern?",
      options: ["JA (Limit nötig)", "NEIN (Schadet Wirtschaft)", "KOMMT DARAUF AN"],
      is_featured: true,
      created_at: new Date().toISOString(),
      poll_votes: []
    };
    polls.unshift(initial10M);

    // Automatisch in Supabase abspeichern, falls in Supabase noch nicht vorhanden
    if(db){
      try {
        db.from("polls").insert([{
          title: initial10M.title,
          description: initial10M.description,
          category: initial10M.category,
          options: initial10M.options,
          is_featured: true
        }]).then();
      } catch(e){}
    }
  }

  const localVotes = getLocalVotes();
  const guestSession = getGuestSession();

  currentPolls = polls.map((p, pIdx) => {
    const votes = p.poll_votes || [];
    const base = getBaselineForPoll(p);
    
    // Prüfe lokale Abstimmung (LocalStorage) & Datenbank für eingeloggte & Gast-Nutzer
    let localVoteIndex = null;
    if (localVotes[p.id] !== undefined) {
      localVoteIndex = localVotes[p.id];
    } else if (p.title && localVotes[p.title] !== undefined) {
      localVoteIndex = localVotes[p.title];
    } else {
      const matchKey = Object.keys(localVotes).find(k => k && p.title && (k.toLowerCase().includes(p.title.toLowerCase().substring(0, 25)) || p.title.toLowerCase().includes(k.toLowerCase().substring(0, 25))));
      if (matchKey !== undefined) localVoteIndex = localVotes[matchKey];
    }

    const dbUserVote = currentUser ? votes.find(v => v.user_id === currentUser.id) : (guestSession ? votes.find(v => v.session_token === guestSession) : null);
    const effectiveUserVotedIndex = dbUserVote ? dbUserVote.option_index : localVoteIndex;

    // Falls aus DB eine Stimme vorhanden ist, synchronisiere lokal
    if (dbUserVote && localVoteIndex === null) {
      saveLocalVote(p.id, dbUserVote.option_index, p.title);
    }

    // Kombiniere Basis-Stimmen mit echten DB-Stimmen
    const optionCounts = (p.options || []).map((_, idx) => {
      const baseCount = base.optionCounts && base.optionCounts[idx] !== undefined ? base.optionCounts[idx] : 0;
      const dbCount = votes.filter(v => v.option_index === idx).length;
      return baseCount + dbCount;
    });

    const totalVotes = optionCounts.reduce((a, b) => a + b, 0) || votes.length;
    
    return {
      id: p.id,
      category: p.category || "Schweiz & Politik",
      title: p.title || "",
      description: p.description || "",
      options: Array.isArray(p.options) && p.options.length ? p.options : ["JA", "NEIN"],
      is_featured: p.is_featured !== undefined ? p.is_featured : (pIdx === 0),
      time: formatTimeAgo(p.created_at),
      totalVotes: totalVotes,
      optionCounts: optionCounts,
      userVotedIndex: effectiveUserVotedIndex
    };
  });

  renderPollsUI();

  if (typeof SwissMatch !== "undefined" && typeof SwissMatch.updateGlobalMatchBadge === "function") {
    SwissMatch.updateGlobalMatchBadge();
  }
}

// NÄCHSTE FRAGE DIREKT AUF DER FLÄCHE WECHSELN
function nextFeaturedPoll(){
  const fromPoll = currentPolls[activeFeaturedIndex];
  if(activeFeaturedIndex < currentPolls.length - 1){
    activeFeaturedIndex++;
  } else {
    activeFeaturedIndex = currentPolls.length; // Abschluss-Karte anzeigen
  }
  
  if(fromPoll && window.GA && typeof window.GA.trackNextPollClick === 'function'){
    window.GA.trackNextPollClick({
      currentPollId: fromPoll.id,
      currentPollTitle: fromPoll.title,
      pagePath: window.location.pathname
    });
  }
  renderPollsUI();
}

function restartFeaturedPolls(){
  activeFeaturedIndex = 0;
  renderPollsUI();
}

function createMyOwnPoll(){
  if(!currentUser){
    openAuthRequiredModal("Um eine eigene Abstimmung für die Schweizer Community zu starten, erstelle kurz ein kostenloses Konto oder melde dich an.");
    return;
  }
  if(typeof setCreateType === 'function'){
    setCreateType('poll');
  }
  if(window.Router && typeof window.Router.navigate === 'function'){
    window.Router.navigate('/erstellen');
  } else {
    showPage('create');
  }
}

function renderPollsUI(){
  if(!currentPolls.length) return;
  const featContainer = document.getElementById("featuredContainer");
  if(!featContainer) return;

  // Prüfe ob alle Abstimmungen durchgesehen wurden
  if(activeFeaturedIndex >= currentPolls.length){
    featContainer.innerHTML = `
      <div class="allDoneBox" style="text-align:left;padding:8px 0">
        <div class="eyebrow" style="color:var(--red);margin-bottom:8px">Alle Fragen durchgesehen</div>
        <h2 style="font-size:22px;line-height:1.25;margin:6px 0 10px;font-weight:800">Du bist auf dem neuesten Stand!</h2>
        <p style="font-size:14px;color:var(--muted);line-height:1.55;margin:0 0 20px">
          Du hast alle aktuellen Abstimmungen durchgeklickt. Sieh dir jetzt deinen persönlichen Schweiz-Match an oder starte deine eigene Frage!
        </p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
          <a href="/schweiz-match" class="publish" style="margin-top:0;padding:12px 20px;text-decoration:none;display:inline-block">🇨🇭 Mein Schweiz-Match ansehen</a>
          <button class="smallbtn" style="border:1px solid var(--line);padding:11px 16px;border-radius:var(--radius);font-weight:800" onclick="restartFeaturedPolls()">Von vorne anfangen</button>
        </div>
      </div>
    `;
    renderFeedAndSidebar();
    return;
  }

  const featured = currentPolls[activeFeaturedIndex] || currentPolls[0];
  const catSlug = getCategorySlug(featured.category);
  const isVoted = featured.userVotedIndex !== null;
  const isLast = activeFeaturedIndex >= currentPolls.length - 1;
  const nextLabel = isLast ? "Abschliessen" : "Nächste Frage";

  if(window.GA && typeof window.GA.trackPollView === 'function' && featured){
    window.GA.trackPollView({
      pollId: featured.id,
      pollTitle: featured.title,
      category: featured.category,
      pagePath: window.location.pathname
    });
  }

  featContainer.innerHTML = `
    <div class="meta">
      <span class="category"><a href="/kategorie/${catSlug}" style="color:var(--red);text-decoration:none">${escapeHTML(featured.category)}</a></span>
      <span>·</span>
      <span>${escapeHTML(featured.time)}</span>
      <span style="margin-left:auto;font-size:11px;font-weight:700;color:var(--muted)">Frage ${activeFeaturedIndex + 1} von ${currentPolls.length}</span>
    </div>
    <h1 id="featTitle"><a href="/frage/${slugify(featured.title)}" style="color:inherit;text-decoration:none">${escapeHTML(featured.title)}</a></h1>
    <div class="count">${featured.totalVotes > 0 ? `${featured.totalVotes.toLocaleString('de-CH')} Personen haben abgestimmt` : "Noch keine Stimmen – sei der Erste!"}</div>
    <div class="votes" id="featuredVotes" style="display:${isVoted ? 'none' : 'grid'}">
      ${featured.options.map((opt, idx) => `
        <button class="vote" onclick="submitPollVote('${escapeHTML(featured.id)}', ${idx}, true)">${escapeHTML(opt)}</button>
      `).join("")}
    </div>
    <div class="results" id="featuredResults" style="display:${isVoted ? 'block' : 'none'}"></div>
    <div class="actions">
      <button class="smallbtn" onclick="openFeaturedDetailByIndex(${activeFeaturedIndex})">Kommentare ansehen</button>
      <button class="smallbtn" onclick="shareCurrent()">Teilen</button>
      <button class="smallbtn next" onclick="nextFeaturedPoll()">${nextLabel} &rarr;</button>
    </div>
  `;

  if(isVoted){
    const featResultsContainer = document.getElementById("featuredResults");
    if(featResultsContainer) renderResultsHTML(featResultsContainer, featured);
  }

  renderFeedAndSidebar();
}

function renderFeedAndSidebar(){
  const feed = currentPolls.filter((_, idx) => idx !== activeFeaturedIndex);
  const feedContainer = document.getElementById("feed");
  if(feedContainer){
    feedContainer.innerHTML = feed.map((q, i) => {
      const safeCat = escapeHTML(q.category);
      const catSlug = getCategorySlug(q.category);
      const safeTime = escapeHTML(q.time);
      const safeTitle = escapeHTML(q.title);
      const pollSlug = slugify(q.title);
      const safeId = escapeHTML(q.id);
      const safeCount = q.totalVotes.toLocaleString('de-CH');
      const isVoted = q.userVotedIndex !== null && q.userVotedIndex !== undefined;

      let pollInteractiveSection = "";
      if (isVoted) {
        const total = q.totalVotes || 1;
        const resultsHtml = q.options.map((opt, idx) => {
          const count = (q.optionCounts && q.optionCounts[idx] !== undefined) ? q.optionCounts[idx] : 0;
          const pct = Math.round((count / total) * 100);
          const isSel = q.userVotedIndex === idx;
          return `
            <div class="result ${isSel ? 'selected' : ''}" style="margin:10px 0">
              <div class="resulttop" style="font-size:13px;font-weight:800;margin-bottom:5px">
                <span>${escapeHTML(opt)}${isSel ? ' <span style="color:var(--red);font-size:11px;font-weight:900">(Deine Wahl)</span>' : ''}</span>
                <span>${pct} %</span>
              </div>
              <div class="track" style="height:9px;background:var(--soft);border-radius:2px;overflow:hidden">
                <div class="bar" style="width:${pct}%;${isSel ? 'background:var(--red);' : 'background:#222;'}"></div>
              </div>
            </div>
          `;
        }).join("");

        const userPct = Math.round((((q.optionCounts && q.optionCounts[q.userVotedIndex]) || 0) / total) * 100);

        pollInteractiveSection = `
          <div class="results" style="display:block;margin-top:10px">
            ${resultsHtml}
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:10px;border-top:1px solid var(--line-light);flex-wrap:wrap;gap:8px">
              <span class="you" style="margin-top:0;font-size:12px;font-weight:800;color:var(--ink)">Du denkst wie ${userPct} % der Teilnehmer.</span>
              <div style="display:flex;gap:14px;align-items:center">
                <a href="/frage/${pollSlug}" class="smallbtn" style="margin:0;font-size:12px;font-weight:800;color:var(--ink);text-decoration:none">Kommentare &rarr;</a>
                <a href="/schweiz-match" class="smallbtn" style="margin:0;font-size:12px;font-weight:800;color:var(--red);text-decoration:none">Schweiz-Match 🇨🇭</a>
              </div>
            </div>
          </div>
        `;
      } else {
        pollInteractiveSection = `
          <div class="quickVotes" id="qv-${safeId}">
            ${q.options.map((opt, idx) => `
              <button class="qv" onclick="submitPollVote('${safeId}', ${idx}, false)">${escapeHTML(opt)}</button>
            `).join("")}
          </div>
          <div class="actions" style="margin-top:12px;padding-top:8px;border-top:0">
            <a href="/frage/${pollSlug}" class="smallbtn" style="color:var(--muted);text-decoration:none;font-size:12px;font-weight:700">Diskussion & Kommentare &rarr;</a>
          </div>
        `;
      }

      return `
        <article class="feedItem" id="poll-card-${safeId}">
          <div class="meta">
            <span class="category"><a href="/kategorie/${catSlug}" style="color:var(--red);text-decoration:none">${safeCat}</a></span>
            <span>·</span>
            <span>${safeTime}</span>
          </div>
          <h2><a href="/frage/${pollSlug}" style="color:inherit;text-decoration:none">${safeTitle}</a></h2>
          <div class="feedStats">${safeCount} Stimmen</div>
          ${pollInteractiveSection}
        </article>
        ${i === 1 ? '<div class="ad">Werbung</div>' : ''}
      `;
    }).join("");
  }

  const trendingContainer = document.getElementById("trending");
  if(trendingContainer){
    trendingContainer.innerHTML = currentPolls.slice(0, 5).map(q => `
      <div class="trend">
        <a href="/frage/${slugify(q.title)}" style="color:inherit;text-decoration:none;display:block">
          <strong>${escapeHTML(q.title)}</strong>
          <small>${q.totalVotes.toLocaleString('de-CH')} Stimmen · ${escapeHTML(q.category)}</small>
        </a>
      </div>
    `).join("");
  }
}

function renderResultsHTML(container, poll){
  const total = poll.totalVotes || 1;
  const html = poll.options.map((opt, idx) => {
    const count = poll.optionCounts[idx] || 0;
    const pct = Math.round((count / total) * 100);
    const isSel = poll.userVotedIndex === idx;
    return `
      <div class="result ${isSel ? 'selected' : ''}">
        <div class="resulttop">
          <span>${escapeHTML(opt)}${isSel ? ' <span style="color:var(--red);font-weight:900">(Deine Wahl)</span>' : ''}</span>
          <span>${pct} %</span>
        </div>
        <div class="track"><div class="bar" style="width:${pct}%;${isSel ? 'background:var(--red);' : ''}"></div></div>
      </div>
    `;
  }).join("");

  let feedbackHTML = "";
  if(poll.userVotedIndex !== null && poll.userVotedIndex !== undefined){
    const userPct = Math.round(((poll.optionCounts[poll.userVotedIndex] || 0) / total) * 100);
    const stats = (typeof SwissMatch !== 'undefined' && typeof SwissMatch.calculateStats === 'function') ? SwissMatch.calculateStats() : null;
    const matchTeaser = stats && stats.totalAnswered >= 1 ? `
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid #e0dfdb;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <span style="font-size:13px;font-weight:800;color:var(--ink)">🇨🇭 Schweiz-Match: <strong>${stats.matchPercent}%</strong> (${stats.totalAnswered} beantwortet)</span>
        <a href="/schweiz-match" class="smallbtn" style="color:var(--red);font-weight:900;text-decoration:none;margin:0">Zum Profil &rarr;</a>
      </div>
    ` : '';

    feedbackHTML = `
      <div class="you" style="margin-top:14px;background:#fafafa;border:1px solid #e4e3df;padding:12px 14px;border-radius:var(--radius)">
        <div style="font-size:13px;font-weight:800;color:var(--ink)">✓ Du denkst wie <strong>${userPct} %</strong> der bisherigen Teilnehmer.</div>
        ${matchTeaser}
      </div>
    `;
  }
  container.innerHTML = html + feedbackHTML;
}

// DIREKTE & SICHERE ABSTIMMUNG
async function submitPollVote(pollId, optionIndex, isFeatured){
  const poll = currentPolls.find(p => String(p.id) === String(pollId)) || (currentPoll && String(currentPoll.id) === String(pollId) ? currentPoll : null) || currentPolls[activeFeaturedIndex] || currentPoll;
  if(!poll) return;

  // Anti-Spam / Rate-Limiting Cooldown
  if(!checkRateLimit(`vote_${poll.id}`, 350)) return;

  const previousVotedIndex = poll.userVotedIndex;
  const isVoteChange = (previousVotedIndex !== null && previousVotedIndex !== undefined && previousVotedIndex !== optionIndex);
  
  // Optimistisches Update
  poll.userVotedIndex = optionIndex;

  if(!poll.optionCounts || poll.optionCounts.length === 0 || poll.optionCounts.every(c => c === 0)){
    const base = getBaselineForPoll(poll);
    poll.optionCounts = (poll.options || []).map((_, i) => (base.optionCounts && base.optionCounts[i] !== undefined) ? base.optionCounts[i] : 0);
  }
  
  if(previousVotedIndex === null || previousVotedIndex === undefined){
    poll.optionCounts[optionIndex] = (poll.optionCounts[optionIndex] || 0) + 1;
  } else if(previousVotedIndex !== optionIndex){
    poll.optionCounts[previousVotedIndex] = Math.max(0, (poll.optionCounts[previousVotedIndex] || 1) - 1);
    poll.optionCounts[optionIndex] = (poll.optionCounts[optionIndex] || 0) + 1;
  }
  poll.totalVotes = poll.optionCounts.reduce((a, b) => a + b, 0);

  // Dauerhaft im LocalStorage sichern
  saveLocalVote(poll.id, optionIndex, poll.title);

  // Supabase Sync im Hintergrund
  if(db){
    const guestSession = getGuestSession();
    const payload = {
      poll_id: poll.id,
      option_index: optionIndex,
      user_id: currentUser ? currentUser.id : null,
      session_token: currentUser ? null : guestSession
    };
    
    try {
      if (currentUser) {
        db.from("poll_votes").upsert(payload, { onConflict: 'poll_id,user_id' }).then();
      } else {
        db.from("poll_votes").select("id").eq("poll_id", poll.id).eq("session_token", guestSession).then(({ data }) => {
          if (data && data.length > 0) {
            db.from("poll_votes").update({ option_index: optionIndex }).eq("poll_id", poll.id).eq("session_token", guestSession).then();
          } else {
            db.from("poll_votes").insert([payload]).then();
          }
        });
      }
    } catch(e){
      console.warn("Vote sync error:", e);
    }
  }

  // GA4 Conversion Tracking
  const stats = typeof SwissMatch !== 'undefined' ? SwissMatch.calculateStats() : null;
  const answeredCount = stats ? stats.totalAnswered : 1;

  if (currentUser) {
    if (isVoteChange) {
      if (window.GA && typeof window.GA.trackPollVoteChange === 'function') {
        window.GA.trackPollVoteChange({
          pollId: poll.id,
          pollTitle: poll.title,
          category: poll.category,
          pagePath: window.location.pathname
        });
      }
    } else {
      if (window.GA && typeof window.GA.trackPollVote === 'function') {
        window.GA.trackPollVote({
          pollId: poll.id,
          pollTitle: poll.title,
          voteOption: poll.options[optionIndex] || '',
          category: poll.category,
          pagePath: window.location.pathname
        });
      }
    }
  } else {
    // Anonyme Stimme
    if (window.GA && typeof window.GA.trackAnonymousVote === 'function') {
      window.GA.trackAnonymousVote({
        pollId: poll.id,
        pollTitle: poll.title,
        voteOption: poll.options[optionIndex] || '',
        category: poll.category,
        answeredCount: answeredCount,
        pagePath: window.location.pathname
      });
    }
  }

  if (window.GA && typeof window.GA.trackPollResultView === 'function') {
    window.GA.trackPollResultView({
      pollId: poll.id,
      pollSlug: slugify(poll.title)
    });
  }

  // Update Global Schweiz-Match Badge in Navigation
  if (typeof SwissMatch !== 'undefined' && typeof SwissMatch.updateGlobalMatchBadge === 'function') {
    SwissMatch.updateGlobalMatchBadge();
  }

  showToast("Stimme erfolgreich gezählt!");

  if(isFeatured){
    renderPollsUI();
  } else if(currentPoll && currentPoll.id === poll.id && document.getElementById("detail") && document.getElementById("detail").classList.contains("active")){
    openPollDetail(poll.id, false);
  } else {
    renderPollsUI();
  }
}

function openFeaturedDetailByIndex(index){
  const target = currentPolls[index] || currentPolls[0];
  if(target){
    if(window.Router && typeof window.Router.navigate === "function"){
      window.Router.navigate(`/frage/${slugify(target.title)}`);
    } else {
      openPollDetail(target.id);
    }
  }
}

function openFeaturedDetail(){
  openFeaturedDetailByIndex(activeFeaturedIndex);
}

async function openPollDetail(pollId, updateUrl = true){
  currentPoll = currentPolls.find(p => p.id === pollId) || currentPolls[0];
  if(!currentPoll) return;

  if(updateUrl && window.Router && typeof window.Router.navigate === "function"){
    window.Router.navigate(`/frage/${slugify(currentPoll.title)}`);
    return;
  }

  const catSlug = getCategorySlug(currentPoll.category);
  const detailCatEl = document.getElementById("detailCat");
  if(detailCatEl){
    detailCatEl.innerHTML = `<a href="/kategorie/${catSlug}" style="color:var(--red);text-decoration:none">${escapeHTML(currentPoll.category)}</a>`;
  }
  document.getElementById("detailTime").textContent = currentPoll.time;
  document.getElementById("detailTitle").textContent = currentPoll.title;
  document.getElementById("detailDesc").textContent = currentPoll.description || "Stimme ab und diskutiere mit der Community über diese Frage.";

  if(window.GA && typeof window.GA.trackPollView === 'function'){
    window.GA.trackPollView({
      pollId: currentPoll.id,
      pollTitle: currentPoll.title,
      category: currentPoll.category,
      pagePath: window.location.pathname
    });
  }

  if(window.GA && typeof window.GA.trackDiscussionView === 'function'){
    window.GA.trackDiscussionView({
      pollId: currentPoll.id,
      pollTitle: currentPoll.title,
      pagePath: window.location.pathname
    });
  }

  const votesContainer = document.getElementById("detailVotes");
  const resultsContainer = document.getElementById("detailResults");

  if(currentPoll.userVotedIndex !== null){
    votesContainer.style.display = "none";
    resultsContainer.style.display = "block";
    renderResultsHTML(resultsContainer, currentPoll);
  } else {
    votesContainer.style.display = "grid";
    resultsContainer.style.display = "none";
    const safeId = escapeHTML(currentPoll.id);
    votesContainer.innerHTML = currentPoll.options.map((opt, idx) => `<button class="vote" onclick="submitPollVote('${safeId}', ${idx}, false)">${escapeHTML(opt)}</button>`).join("");
  }

  // Melde-Button konfigurieren
  const reportBtn = document.getElementById("pollReportBtn");
  if(reportBtn){
    reportBtn.onclick = () => openReportModal({
      type: "poll",
      id: currentPoll.id,
      title: currentPoll.title,
      url: `${SITE_URL}/frage/${slugify(currentPoll.title)}`
    });
  }

  const currentPollIndex = currentPolls.findIndex(p => p.id === currentPoll.id);
  const otherPoll = currentPolls[(currentPollIndex + 1) % currentPolls.length] || currentPolls[0];
  const nextContainer = document.querySelector(".nextBlock");
  if(otherPoll && nextContainer && otherPoll.id !== currentPoll.id){
    document.getElementById("detailNextTitle").textContent = otherPoll.title;
    const nextBtn = nextContainer.querySelector("button");
    if(nextBtn){
      nextBtn.onclick = () => {
        if(window.GA && typeof window.GA.trackNextPollClick === 'function'){
          window.GA.trackNextPollClick({
            currentPollId: currentPoll.id,
            currentPollTitle: currentPoll.title,
            pagePath: window.location.pathname
          });
        }
        if(window.Router && typeof window.Router.navigate === "function"){
          window.Router.navigate(`/frage/${slugify(otherPoll.title)}`);
        }
      };
    }
  }

  await loadPollComments(currentPoll.id);
  showPageElement("detail");
}

async function loadPollComments(pollId){
  const container = document.getElementById("comments");
  const countSpan = document.getElementById("pollCommentsCount");
  
  let dbComments = [];
  if(db){
    const { data } = await db.from("comments").select("*, profiles(username, canton)").eq("poll_id", pollId).order("created_at", { ascending: false });
    if(data) dbComments = data;
  }
  
  // Finde passende Seed-Kommentare für die Frage
  const p = currentPoll || currentPolls.find(x => String(x.id) === String(pollId));
  const titleLower = p ? (p.title || "").toLowerCase() : "";
  let seedList = [];
  for(const [k, list] of Object.entries(SEED_POLL_COMMENTS)){
    if(titleLower.includes(k)){
      seedList = list;
      break;
    }
  }

  const allComments = [
    ...dbComments.map(c => {
      const fallback = getSwissCommunityAuthor(c.id || c.content);
      return {
        username: (c.profiles && c.profiles.username && c.profiles.username !== 'Anonym') ? c.profiles.username : fallback.username,
        canton: (c.profiles && c.profiles.canton) ? c.profiles.canton : fallback.canton,
        time: formatTimeAgo(c.created_at),
        content: c.content,
        upvotes: c.upvotes || 0,
        downvotes: c.downvotes || 0,
        id: c.id
      };
    }),
    ...(dbComments.length === 0 ? seedList.map(c => ({
      username: c.username,
      canton: c.canton,
      time: formatTimeAgo(c.created_at),
      content: c.content,
      upvotes: c.upvotes || 0,
      downvotes: c.downvotes || 0,
      id: c.id
    })) : [])
  ];

  if(countSpan) countSpan.textContent = allComments.length;
  if(container){
    container.innerHTML = allComments.map(c => `
      <div class="comment">
        <div class="user">
          <a href="/profil/${encodeURIComponent(c.username)}" style="color:inherit;text-decoration:none">${escapeHTML(c.username)}</a> · ${escapeHTML(c.canton)} · <span style="font-weight:400;color:#777">${escapeHTML(c.time)}</span>
          <button class="smallbtn" style="float:right;font-size:11px;color:#888;padding:0" onclick="openReportModal({ type: 'comment', id: '${escapeHTML(c.id||'')}', title: '${escapeHTML(c.content.substring(0,60))}' })">Melden</button>
        </div>
        <p>${escapeHTML(c.content)}</p>
        <div class="score">
          <span onclick="voteComment('${escapeHTML(c.id||'')}', 1, this)" style="cursor:pointer">+ ${c.upvotes}</span>&nbsp;&nbsp;&nbsp;
          <span onclick="voteComment('${escapeHTML(c.id||'')}', -1, this)" style="cursor:pointer">− ${c.downvotes}</span>
        </div>
      </div>
    `).join("");
  }
}

async function addPollComment(){
  if(!currentUser){
    openAuthRequiredModal("Um einen Kommentar abzugeben und mitzudiskutieren, erstelle kurz ein kostenloses Konto oder melde dich an.");
    return;
  }

  const textarea = document.getElementById("newPollComment");
  const content = sanitizeText(textarea.value, 1500);
  if(!content || !currentPoll) return;

  if(!checkRateLimit("add_poll_comment", 3000)) return;
  
  const payload = {
    poll_id: currentPoll.id,
    content: content,
    user_id: currentUser ? currentUser.id : null
  };
  await db.from("comments").insert([payload]);
  textarea.value = "";
  showToast("Kommentar veröffentlicht!");

  if (window.GA && typeof window.GA.trackCommentSubmit === 'function') {
    window.GA.trackCommentSubmit({
      contentType: "poll",
      contentId: currentPoll.id,
      category: currentPoll.category || "Allgemein",
      pagePath: window.location.pathname
    });
  }

  if (typeof createNotification === 'function') {
    const authorName = (typeof currentProfile !== 'undefined' && currentProfile && currentProfile.username) ? currentProfile.username : 'Ein Nutzer';
    const authorCanton = (typeof currentProfile !== 'undefined' && currentProfile && currentProfile.canton) ? currentProfile.canton : 'CH';
    createNotification({
      userId: currentPoll.user_id || null,
      title: "Neuer Kommentar zu deiner Abstimmung",
      message: `${authorName} (${authorCanton}) hat auf deine Abstimmung "${currentPoll.title}" geantwortet.`,
      linkPage: "poll",
      linkId: currentPoll.id
    });
  }

  await loadPollComments(currentPoll.id);
}

// Global verfügbar
window.submitPollVote = submitPollVote;
window.cancelPendingVote = cancelPendingVote;
window.finalizeVoteEarly = finalizeVoteEarly;
window.nextFeaturedPoll = nextFeaturedPoll;
window.restartFeaturedPolls = restartFeaturedPolls;
window.createMyOwnPoll = createMyOwnPoll;
window.openFeaturedDetailByIndex = openFeaturedDetailByIndex;

