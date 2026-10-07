// FORUMS-BEITRÄGE & DISKUSSIONEN
let currentPosts = [];
let currentPost = null;

const POST_BASELINES = {
  "Nachbar stellt ständig Sachen ins Treppenhaus – was würdet ihr machen?": { comments: 14, views: 342 },
  "Chef erwartet, dass ich nach Feierabend auf WhatsApp antworte": { comments: 23, views: 618 },
  "Freundeskreis verändert sich komplett seit alle in Beziehungen sind": { comments: 18, views: 429 },
  "Wie viel zahlt ihr aktuell für eine 2.5-Zimmer-Wohnung?": { comments: 29, views: 694 },
  "Lohnt sich ein Handywechsel überhaupt noch alle zwei Jahre?": { comments: 16, views: 395 },
  "Studium abbrechen nach drei Semestern – Erfahrungen?": { comments: 21, views: 512 },
  "10-Millionen-Schweiz: Rettung vor dem Kollaps oder wirtschaftlicher Selbstmord?": { comments: 3, views: 184 },
  "Flächendeckend Tempo 30 in Städten und immer weniger Parkplätze: Sinnvoller Umweltschutz oder reiner Krieg gegen Autofahrer?": { comments: 3, views: 142 },
  "Über 330 Franken im Jahr für die SRG, ob man will oder nicht: Zeit für die Halbierungs-Initiative oder ruinieren wir damit den Schweizer Journalismus?": { comments: 2, views: 98 },
  "Wohnungsnot in Zürich und Genf: Sind die steigenden Mieten das Resultat von Gier-Investoren oder von zu strengen Baugesetzen und Einsprachen?": { comments: 2, views: 115 }
};

const SEED_POST_REPLIES = {
  "post_10m_schweiz": [
    { id: "c_10m_1", username: "AareFuchs", canton: "BE", created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(), content: "Einfach Olten zur Megacity ausbauen und 2 Millionen dort einquartieren, Problem gelöst. Dort will eh niemand durchfahren.", upvotes: 21 },
    { id: "c_10m_2", username: "CareWorker_88", canton: "LU", created_at: new Date(Date.now() - 1000 * 60 * 42).toISOString(), content: "Ich arbeite im Spital. Ohne Kolleginnen und Kollegen aus dem Ausland könnten wir nächste Woche die halbe Bettenstation dichtmachen. Man kann nicht gleichzeitig Zuwanderungsstopp fordern und sich dann beschweren, wenn man 8 Stunden auf der Notfallstation wartet.", upvotes: 16 },
    { id: "c_10m_3", username: "SchwyzerBueb", canton: "SZ", created_at: new Date(Date.now() - 1000 * 60 * 85).toISOString(), content: "Es geht doch nicht nur um Jobs. Schaut euch die Mieten und Züge an. Irgendwann ist das Land flächenmässig einfach voll betoniert.", upvotes: 8 }
  ],
  "post_tempo30": [
    { id: "c_t30_1", username: "Velogang_ZH", canton: "ZH", created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(), content: "Endlich kann ich mit meinem E-Bike die SUVs auf der Hardbrücke links überholen. Bitte gleich Tempo 20 einführen, damit ich noch gemütlich meinen Flat White austrinken kann.", upvotes: 9 },
    { id: "c_t30_2", username: "HandwerkerMarco", canton: "AG", created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), content: "Für alle die im Büro hocken ist das ja super. Aber fahrt mal als Sanitär mit 80kg Werkzeug im Bus durch die Stadt, wenn du 45 Minuten für 3km brauchst und nirgends parkieren darfst. Die Mehrkosten verrechnen wir am Ende halt den Kunden.", upvotes: 14 },
    { id: "c_t30_3", username: "basler_bebbbi", canton: "BS", created_at: new Date(Date.now() - 1000 * 60 * 55).toISOString(), content: "In Wohnquartieren absolut sinnvoll wegen Lärm und Kindern. Auf Hauptverkehrsachsen wie der Nauenstrasse aber kompletter Unsinn.", upvotes: 6 }
  ],
  "post_srg_gebuehren": [
    { id: "c_srg_1", username: "Bünzli_Prime", canton: "SO", created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(), content: "Ich zahle 330 Stutz im Jahr eigentlich nur, um am Sonntagabend Tatort zu schauen und mich danach 2 Stunden im Internet darüber aufzuregen wie schlecht er war. Beste Schweizer Tradition.", upvotes: 15 },
    { id: "c_srg_2", username: "Tessin_Fan", canton: "TI", created_at: new Date(Date.now() - 1000 * 60 * 65).toISOString(), content: "Vergesst bitte die Sprachminderheiten nicht. RTS und RSI produzieren super Sendungen, die sich privat niemals finanzieren würden. Die Schweiz besteht nicht nur aus Zürich.", upvotes: 11 }
  ],
  "post_wohnungsnot_mieten": [
    { id: "c_woh_1", username: "Zügelmeister", canton: "ZH", created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(), content: "War gestern an einer Besichtigung für eine 1.5-Zimmer im Kreis 4. Musste mich mit 140 Leuten im Treppenhaus anstellen und dem Vormieter noch seine abgeranzte IKEA-Couch für 2'500 CHF abkaufen. Ein Traum.", upvotes: 27 },
    { id: "c_woh_2", username: "Architect_CH", canton: "BS", created_at: new Date(Date.now() - 1000 * 60 * 70).toISOString(), content: "Wir planen aktuell ein Mehrfamilienhaus. 3 Jahre Verfahren wegen einer einzigen Einsprache wegen Schattenwurf auf einen Geräteschuppen. So baut man halt keine Wohnungen.", upvotes: 19 }
  ]
};

const SEED_FORUM_REPLIES = [
  { username: "Rheinknie", canton: "BS", created_at: "2026-10-03T10:14:00.000Z", content: "Ich würde zuerst ganz normal das Gespräch suchen. Viele merken gar nicht, dass es andere stört. Wenn danach nichts passiert, kannst du immer noch der Verwaltung schreiben.", upvotes: 12 },
  { username: "sina90", canton: "AG", created_at: "2026-10-02T16:22:00.000Z", content: "Direkt ansprechen, freundlich und ohne Vorwurf. Schriftlich über die Verwaltung eskaliert so etwas meiner Erfahrung nach nur unnötig schnell.", upvotes: 8 },
  { username: "JuraNord", canton: "SO", created_at: "2026-10-02T11:05:00.000Z", content: "Kommt vor allem auch darauf an, ob der Fluchtweg betroffen ist. Wenn es wirklich eng wird bei einem Notfall, würde ich nicht ewig warten.", upvotes: 5 }
];

function getBaselineForPost(p){
  if(!p) return { comments: 0, views: 0 };
  if(p.id && POST_BASELINES[p.id]) return POST_BASELINES[p.id];
  if(p.title && POST_BASELINES[p.title]) return POST_BASELINES[p.title];
  const title = (p.title || "").toLowerCase();
  if(title.includes("10-millionen") || title.includes("10 millionen") || title.includes("10 mio")){
    return POST_BASELINES["10-Millionen-Schweiz: Rettung vor dem Kollaps oder wirtschaftlicher Selbstmord?"] || { comments: 3, views: 184 };
  }
  if(title.includes("tempo 30") || title.includes("tempo-30")){
    return POST_BASELINES["Flächendeckend Tempo 30 in Städten und immer weniger Parkplätze: Sinnvoller Umweltschutz oder reiner Krieg gegen Autofahrer?"] || { comments: 3, views: 142 };
  }
  if(title.includes("srg") || title.includes("serafe") || title.includes("halbierungs")){
    return POST_BASELINES["Über 330 Franken im Jahr für die SRG, ob man will oder nicht: Zeit für die Halbierungs-Initiative oder ruinieren wir damit den Schweizer Journalismus?"] || { comments: 2, views: 98 };
  }
  if(title.includes("wohnungsnot") || title.includes("gier-investoren")){
    return POST_BASELINES["Wohnungsnot in Zürich und Genf: Sind die steigenden Mieten das Resultat von Gier-Investoren oder von zu strengen Baugesetzen und Einsprachen?"] || { comments: 2, views: 115 };
  }
  return { comments: 0, views: 0 };
}

async function loadForum(){
  let posts = [];
  if(db){
    const { data, error } = await db.from("posts").select("*, profiles(username, canton), comments(id)").order("created_at", { ascending: false });
    if(!error && data) posts = data;
  }

  // 4 NEUE SCHWEIZER DEBATTEN-BEITRÄGE (FRISCH & OHNE INITIAL-KOMMENTARE)
  const newPostsToAdd = [
    {
      id: "post_tempo30",
      category: "Auto & Mobilität",
      title: "Flächendeckend Tempo 30 in Städten und immer weniger Parkplätze: Sinnvoller Umweltschutz oder reiner Krieg gegen Autofahrer?",
      excerpt: "Immer mehr Städte reduzieren Parkplätze und führen flächendeckend Tempo 30 ein. Mehr Lebensqualität oder reine Schikane für Pendler und Gewerbe?",
      body: [
        "In Schweizer Städten wie Zürich, Basel, Bern oder Lausanne werden seit Monaten massiv Parkplätze aufgehoben und selbst auf vierspurigen Hauptachsen Tempo 30 eingeführt.",
        "Befürworter betonen: Weniger Lärm, deutlich mehr Sicherheit für Fussgänger und Velofahrende sowie bessere Luft. Autofahrer, Handwerker und Pendler aus den Agglos klagen dagegen: Künstlich erzeugter Stau, verlängerte Fahrzeiten und unbezahlbare Parkgebühren machen das Arbeiten in der Stadt fast unmöglich.",
        "Wie nehmt ihr die Situation in eurem Wohnort oder beim täglichen Pendeln wahr: Ist die autofreie Stadt die Zukunft oder übertreiben es die Stadtregierungen?"
      ],
      user_id: null,
      profiles: { username: "ZuriDrive", canton: "ZH" },
      created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      views: 1,
      comments: []
    },
    {
      id: "post_srg_gebuehren",
      category: "Schweiz & Politik",
      title: "Über 330 Franken im Jahr für die SRG, ob man will oder nicht: Zeit für die Halbierungs-Initiative oder ruinieren wir damit den Schweizer Journalismus?",
      excerpt: "Über 330 Franken Serafe-Gebühren pro Jahr spalten die Schweiz. Sollte die Gebühr halbiert werden oder gefährdet das den Service public?",
      body: [
        "Die Debatte um die Halbierungsinitiative («200 Franken sind genug») kocht wieder hoch. Jeder Schweizer Haushalt zahlt heute über 330 Franken pro Jahr für Radio und Fernsehen – unabhängig davon, ob man die Programme überhaupt konsumiert.",
        "Die Initianten fordern eine Deckelung auf 200 Franken und die Befreiung von Unternehmen. Auf der Gegenseite warnen SRG, Kulturschaffende und Politiker: Eine Halbierung würde Hunderte Stellen kosten, das Informationsangebot drastisch schwächen und vor allem den sprachlichen Zusammenhalt der Romandie, des Tessins und der Deutschschweiz gefährden.",
        "Zahlt ihr die Gebühren gerne für einen starken Schweizer Service public oder findet ihr das System im Streaming-Zeitalter veraltet?"
      ],
      user_id: null,
      profiles: { username: "Lukas_SG", canton: "SG" },
      created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      views: 1,
      comments: []
    },
    {
      id: "post_wohnungsnot_mieten",
      category: "Wohnen",
      title: "Wohnungsnot in Zürich und Genf: Sind die steigenden Mieten das Resultat von Gier-Investoren oder von zu strengen Baugesetzen und Einsprachen?",
      excerpt: "Wohnungsnot und explodierende Mieten in Schweizer Grossstädten: Wo liegen die wahren Ursachen der Krise?",
      body: [
        "Wer aktuell in Zürich, Genf, Lausanne oder Basel eine bezahlbare Wohnung sucht, erlebt puren Frust: Hunderte Bewerber für eine einzige Besichtigung und Mietzinse, die locker einen Drittel des Einkommens verschlingen.",
        "Auf der einen Seite stehen Vorwürfe gegen renditegetriebene Immobilienfonds, Pensionskassen und Luxussanierungen, die alteingesessene Mieter verdrängen. Auf der anderen Seite betonen Bauherren und Experten: Es wird schlicht zu wenig gebaut, weil jedes Neubauprojekt durch Einsprachen, Lärmschutzauflagen und bürokratische Hürden um Jahre blockiert wird.",
        "Wo seht ihr die Hauptursache für die Wohnungsnot und was wäre eurer Meinung nach die wirksamste Lösung?"
      ],
      user_id: null,
      profiles: { username: "Nathalie_VD", canton: "VD" },
      created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      views: 1,
      comments: []
    },
    {
      id: "post_wehrpflicht_miliz",
      category: "Schweiz & Politik",
      title: "Milizsystem am Anschlag: Sollten wir die allgemeine Wehrpflicht endlich abschaffen und auf eine Profi-Armee umstellen?",
      excerpt: "Zivildienst-Boom und Debatten um Chancengleichheit: Braucht die Schweiz weiterhin die allgemeine Wehrpflicht oder eine moderne Berufsarmee?",
      body: [
        "Das Milizsystem und die allgemeine Wehrpflicht für Schweizer Männer gehören zu den traditionsreichsten Institutionen unseres Landes. Doch die Kritik wächst stetig.",
        "Immer mehr Rekruten entscheiden sich für den Zivildienst, Arbeitgeber klagen über die monatelangen Absenzen von Schlüsselkräften und die ungleiche Belastung – da Frauen vom Dienst befreit sind – sorgt für permanente Diskussionen. Einige fordern eine allgemeine Dienstpflicht für alle Schweizerinnen und Schweizer, andere plädieren für den Übergang zu einer schlagkräftigen, freiwilligen Profi-Armee nach europäischem Vorbild.",
        "Sollte die Schweiz am traditionellen Milizprinzip festhalten oder ist es Zeit für eine grundlegende Armeereform?"
      ],
      user_id: null,
      profiles: { username: "Marc_LU", canton: "LU" },
      created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      views: 1,
      comments: []
    }
  ];

  newPostsToAdd.forEach(np => {
    if(!posts.some(p => p.id === np.id || (p.title && p.title.includes(np.title.substring(0, 30))))){
      posts.unshift(np);
    }
  });

  // 10-Millionen Debatte (GANZ NEU & FRISCH GESTARTET)
  const has10MPost = posts.some(p => p.title && p.title.includes("10-Millionen"));
  if(!has10MPost){
    const initial10MPost = {
      id: "post_10m_schweiz",
      category: "Schweiz & Politik",
      title: "10-Millionen-Schweiz: Rettung vor dem Kollaps oder wirtschaftlicher Selbstmord?",
      excerpt: "Wohnungsnot und überfüllte Pendlerzüge vs. akuter Fachkräftemangel in Spitälern und Betrieben. Wo steht ihr bei der 10-Millionen-Debatte?",
      body: [
        "Die Debatte um eine 10-Millionen-Schweiz bis 2050 sorgt im ganzen Land für hitzige Diskussionen. Auf der einen Seite spüren viele im Alltag den Druck: kaum bezahlbare Wohnungen, steigende Mieten und überfüllte Pendlerzüge zu den Stosszeiten.",
        "Auf der anderen Seite warnen Spitäler, Gewerbe und Wirtschaftsverbände: Ohne Zuwanderung fehlen uns schon heute Pflegekräfte, Handwerker und IT-Spezialisten. Ein harter Deckel könnte Wohlstand und Altersvorsorge gefährden.",
        "Wie seht ihr das: Braucht es eine klare gesetzliche Grenze beim Bevölkerungswachstum oder schaden wir uns damit am Ende nur selbst? Schreibt eure Erfahrungen und Meinungen aus eurem Kanton!"
      ],
      user_id: null,
      profiles: { username: "Urs_Bern", canton: "BE" },
      created_at: new Date().toISOString(),
      views: 1,
      comments: []
    };
    posts.unshift(initial10MPost);

    if(db){
      try {
        db.from("posts").insert([{
          title: initial10MPost.title,
          category: initial10MPost.category,
          excerpt: initial10MPost.excerpt,
          body: initial10MPost.body
        }]).then();
      } catch(e){}
    }
  }

  currentPosts = posts.map(p => {
    const base = getBaselineForPost(p);
    const dbCommentsCount = p.comments ? p.comments.length : 0;
    return {
      id: p.id,
      cat: p.category || "Schweiz & Politik",
      time: formatTimeAgo(p.created_at),
      title: p.title || "",
      excerpt: p.excerpt || (Array.isArray(p.body) ? p.body[0] : p.body) || "",
      body: Array.isArray(p.body) ? p.body : [p.body],
      user: p.profiles?.username || (p.user_id ? "Mitglied" : "Community"),
      canton: p.profiles?.canton || "CH",
      user_id: p.user_id,
      comments: base.comments + dbCommentsCount,
      views: Math.max(base.views, p.views || 1),
      created_at: p.created_at
    };
  });

  renderForum();
}

// POST-EIGENTÜMERSCHAFT (Erkennung & Speicherung)
function saveMyPostId(id){
  if(!id) return;
  try {
    const myPosts = JSON.parse(localStorage.getItem("diskutier_my_posts") || "[]");
    if(!myPosts.includes(id)) myPosts.push(id);
    localStorage.setItem("diskutier_my_posts", JSON.stringify(myPosts));
  } catch(e){}
}

function isMyPost(post){
  if(!post) return false;
  if(currentUser && post.user_id && post.user_id === currentUser.id) return true;
  if(currentProfile && currentProfile.username && post.user && currentProfile.username.trim().toLowerCase() === post.user.trim().toLowerCase()) return true;
  if(currentUser && post.user && (currentUser.email || "").toLowerCase().startsWith(post.user.toLowerCase())) return true;
  try {
    const myPosts = JSON.parse(localStorage.getItem("diskutier_my_posts") || "[]");
    if(myPosts.includes(post.id)) return true;
  } catch(e){}
  return false;
}

function renderForum(){
  const container = document.getElementById("forumList");
  if(!container) return;
  
  container.innerHTML = currentPosts.map(p => {
    const isOwner = isMyPost(p);
    const postSlug = slugify(p.title);
    const catSlug = getCategorySlug(p.cat);
    return `
      <article class="postRow">
        <div class="replyCount"><b>${p.comments}</b><span>${p.comments === 1 ? 'Antwort' : 'Antworten'}</span></div>
        <div>
          <div class="postTitle"><a href="/beitrag/${postSlug}" style="color:inherit;text-decoration:none">${escapeHTML(p.title)}</a></div>
          <div class="postExcerpt">${escapeHTML(p.excerpt)}</div>
          <div class="postMeta">
            <b><a href="/kategorie/${catSlug}" style="color:inherit;text-decoration:none">${escapeHTML(p.cat)}</a></b> · Von <strong><a href="/profil/${encodeURIComponent(p.user)}" style="color:inherit;text-decoration:none">${escapeHTML(p.user)}</a></strong> (${escapeHTML(p.canton)}) · ${escapeHTML(p.time)} · ${p.views.toLocaleString('de-CH')} Aufrufe
            ${isOwner ? `<span style="color:var(--red);font-weight:900;margin-left:8px">· Eigener Beitrag</span>` : ''}
          </div>
          ${isOwner ? `
            <div style="margin-top:6px">
              <button class="smallbtn" style="color:var(--red);font-weight:900;font-size:11px;padding:2px 0" onclick="deletePostById('${escapeHTML(p.id)}')">Löschen</button>
            </div>
          ` : ''}
        </div>
      </article>
    `;
  }).join("");
}

function filterForum(type){
  document.querySelectorAll(".forumTabs span").forEach(s => s.classList.remove("activeTab"));
  if(event && event.target) event.target.classList.add("activeTab");
  if(type === 'top'){
    currentPosts.sort((a,b) => b.comments - a.comments);
  } else if(type === 'none'){
    currentPosts.sort((a,b) => a.comments - b.comments);
  } else {
    currentPosts.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }
  renderForum();
}

async function openPost(postId, updateUrl = true){
  currentPost = currentPosts.find(p => p.id === postId);
  if(!currentPost) return;

  if(updateUrl && window.Router && typeof window.Router.navigate === "function"){
    window.Router.navigate(`/beitrag/${slugify(currentPost.title)}`);
    return;
  }

  if(db){
    db.from("posts").update({ views: (currentPost.views || 0) + 1 }).eq("id", postId).then();
  }
  if(typeof trackEvent === 'function'){
    trackEvent('post_view', { post_id: postId, title: currentPost.title, category: currentPost.cat });
  }

  const postCatEl = document.getElementById("postCategory");
  if(postCatEl){
    const catSlug = getCategorySlug(currentPost.cat);
    postCatEl.innerHTML = `<a href="/kategorie/${catSlug}" style="color:var(--red);text-decoration:none">${escapeHTML(currentPost.cat)}</a>`;
  }
  document.getElementById("postTime").textContent = currentPost.time;
  const viewsEl = document.getElementById("postViews");
  if(viewsEl) viewsEl.textContent = `${currentPost.views.toLocaleString('de-CH')} Aufrufe`;
  document.getElementById("postTitle").textContent = currentPost.title;
  document.getElementById("postBody").innerHTML = currentPost.body.map(x => `<p>${escapeHTML(x)}</p>`).join("");
  document.getElementById("postCommentCount").textContent = currentPost.comments;

  const authorAvatar = document.getElementById("postAuthorAvatar");
  const authorName = document.getElementById("postAuthorName");
  const authorCanton = document.getElementById("postAuthorCanton");
  const authorSub = document.getElementById("postAuthorSub");
  const authorRole = document.getElementById("postAuthorRole");
  const ownerControls = document.getElementById("postOwnerControls");
  const editForm = document.getElementById("postEditForm");
  const postBody = document.getElementById("postBody");
  const btnOwnerDeleteDirect = document.getElementById("btnOwnerDeleteDirect");
  const btnOwnerEditDirect = document.getElementById("btnOwnerEditDirect");
  const postReportBtn = document.getElementById("postReportBtn");

  if(editForm) editForm.style.display = "none";
  if(postBody) postBody.style.display = "block";
  
  if(authorAvatar) authorAvatar.textContent = (currentPost.user || "U").substring(0, 2).toUpperCase();
  if(authorName){
    authorName.innerHTML = `<a href="/profil/${encodeURIComponent(currentPost.user)}" style="color:inherit;text-decoration:none">${escapeHTML(currentPost.user)}</a>`;
  }
  if(authorCanton) authorCanton.textContent = currentPost.canton || 'CH';
  if(authorSub) authorSub.textContent = currentPost.user_id ? 'Registriertes Mitglied' : 'Community-Beitrag';

  // Melde-Button konfigurieren
  if(postReportBtn){
    postReportBtn.onclick = () => openReportModal({
      type: "post",
      id: currentPost.id,
      title: currentPost.title,
      url: `${SITE_URL}/beitrag/${slugify(currentPost.title)}`
    });
  }

  // Ist es der eigene Beitrag des Nutzers?
  const isOwner = isMyPost(currentPost);
  if(isOwner){
    if(ownerControls) ownerControls.style.display = "block";
    if(btnOwnerDeleteDirect) btnOwnerDeleteDirect.style.display = "inline-block";
    if(btnOwnerEditDirect) btnOwnerEditDirect.style.display = "inline-block";
    if(postReportBtn) postReportBtn.style.display = "none";
    if(authorRole) {
      authorRole.textContent = "Dein Beitrag";
      authorRole.style.color = "var(--red)";
      authorRole.style.fontWeight = "900";
    }
  } else {
    if(ownerControls) ownerControls.style.display = "none";
    if(btnOwnerDeleteDirect) btnOwnerDeleteDirect.style.display = "none";
    if(btnOwnerEditDirect) btnOwnerEditDirect.style.display = "none";
    if(postReportBtn) postReportBtn.style.display = "inline-block";
    if(authorRole) {
      authorRole.textContent = "Verfasser";
      authorRole.style.color = "#888";
      authorRole.style.fontWeight = "700";
    }
  }

  if (window.GA && typeof window.GA.trackPostView === 'function') {
    window.GA.trackPostView({
      postId: currentPost.id,
      postSlug: slugify(currentPost.title),
      category: currentPost.cat,
      authorType: currentPost.user_id ? "registered" : "community"
    });
  }

  await loadForumComments(currentPost.id);
  showPageElement("postdetail");
}

function startEditPost(){
  if(!currentPost) return;
  const editForm = document.getElementById("postEditForm");
  const postBody = document.getElementById("postBody");
  const ownerControls = document.getElementById("postOwnerControls");
  
  document.getElementById("editPostTitle").value = currentPost.title || "";
  document.getElementById("editPostCategory").value = currentPost.cat || "Alltag";
  document.getElementById("editPostBody").value = Array.isArray(currentPost.body) ? currentPost.body.join("\n\n") : (currentPost.body || "");

  if(editForm) editForm.style.display = "block";
  if(postBody) postBody.style.display = "none";
  if(ownerControls) ownerControls.style.display = "none";
}

function cancelEditPost(){
  const editForm = document.getElementById("postEditForm");
  const postBody = document.getElementById("postBody");
  const ownerControls = document.getElementById("postOwnerControls");

  if(editForm) editForm.style.display = "none";
  if(postBody) postBody.style.display = "block";
  if(ownerControls) ownerControls.style.display = "block";
}

async function savePostEdit(){
  if(!currentPost || !db) return;
  const title = sanitizeText(document.getElementById("editPostTitle").value, 150);
  const cat = sanitizeText(document.getElementById("editPostCategory").value, 40);
  const bodyText = sanitizeText(document.getElementById("editPostBody").value, 4000);

  if(!title || title.length < 5){
    showToast("Titel muss mindestens 5 Zeichen lang sein.");
    return;
  }

  const paragraphs = bodyText ? bodyText.split("\n\n").map(p => sanitizeText(p, 2000)).filter(Boolean) : [title];
  const excerpt = paragraphs[0] ? paragraphs[0].substring(0, 180) : title;

  const { error } = await db.from("posts").update({
    title: title,
    category: cat,
    body: paragraphs,
    excerpt: excerpt
  }).eq("id", currentPost.id);

  if(error){
    showToast("Fehler beim Speichern: " + error.message);
    return;
  }

  currentPost.title = title;
  currentPost.cat = cat;
  currentPost.body = paragraphs;
  currentPost.excerpt = excerpt;

  document.getElementById("postTitle").textContent = title;
  const catSlug = getCategorySlug(cat);
  document.getElementById("postCategory").innerHTML = `<a href="/kategorie/${catSlug}" style="color:var(--red);text-decoration:none">${escapeHTML(cat)}</a>`;
  document.getElementById("postBody").innerHTML = paragraphs.map(x => `<p>${escapeHTML(x)}</p>`).join("");

  cancelEditPost();
  showToast("Beitrag erfolgreich geändert!");
  await loadForum();
}

async function deletePostById(postId){
  const target = currentPosts.find(p => p.id === postId) || currentPost;
  const title = target ? target.title : "diesen Beitrag";
  const confirmDelete = confirm(`Möchtest du "${title}" wirklich löschen?`);
  if(!confirmDelete) return;

  if(db && postId){
    try {
      await db.from("comments").delete().eq("post_id", postId);
      await db.from("posts").delete().eq("id", postId);
    } catch(e) {
      console.warn("Delete error:", e);
    }
  }

  currentPosts = currentPosts.filter(p => p.id !== postId);
  try {
    const myPosts = JSON.parse(localStorage.getItem("diskutier_my_posts") || "[]");
    localStorage.setItem("diskutier_my_posts", JSON.stringify(myPosts.filter(id => id !== postId)));
  } catch(e){}

  if(currentPost && currentPost.id === postId){
    currentPost = null;
    if(window.Router && typeof window.Router.navigate === "function"){
      window.Router.navigate("/beitraege");
    } else {
      showPage("forum");
    }
  }
  showToast("Beitrag wurde gelöscht.");
  await loadForum();
}

async function deleteCurrentPost(){
  if(!currentPost) return;
  await deletePostById(currentPost.id);
}

async function loadForumComments(postId){
  const container = document.getElementById("forumComments");
  if(!container) return;

  let dbReplies = [];
  if(db){
    const { data } = await db.from("comments").select("*, profiles(username, canton)").eq("post_id", postId).order("created_at", { ascending: true });
    if(data) dbReplies = data;
  }
  
  const targetPost = currentPost || currentPosts.find(p => p.id === postId);
  const seedList = SEED_POST_REPLIES[postId] 
    || (targetPost && SEED_POST_REPLIES[targetPost.title]) 
    || (postId === "705d0c28-1a0d-4c92-8a0a-9dfa58e14f56" ? SEED_FORUM_REPLIES : []);

  const allReplies = [
    ...seedList.map(r => ({
      username: r.username,
      canton: r.canton,
      time: formatTimeAgo(r.created_at),
      content: r.content,
      upvotes: r.upvotes,
      id: r.id
    })),
    ...dbReplies.map(r => ({
      username: r.profiles?.username || 'Anonym',
      canton: r.profiles?.canton || 'CH',
      time: formatTimeAgo(r.created_at),
      content: r.content,
      upvotes: r.upvotes || 0,
      id: r.id
    }))
  ];

  container.innerHTML = allReplies.map(r => `
    <div class="forumComment">
      <div class="forumCommentHead">
        <a href="/profil/${encodeURIComponent(r.username)}" style="color:inherit;text-decoration:none">${escapeHTML(r.username)}</a> · ${escapeHTML(r.canton)} <span>· ${escapeHTML(r.time)}</span>
        <button class="smallbtn" style="float:right;font-size:11px;color:#888;padding:0" onclick="openReportModal({ type: 'comment', id: '${escapeHTML(r.id||'')}', title: '${escapeHTML(r.content.substring(0,60))}' })">Melden</button>
      </div>
      <p>${escapeHTML(r.content)}</p>
      <div class="forumCommentActions">
        <span onclick="voteComment('${escapeHTML(r.id||'')}', 1, this)" style="cursor:pointer">Hilfreich (+${r.upvotes})</span>
      </div>
    </div>
  `).join("");
}

async function addForumComment(){
  if(!currentUser){
    openAuthRequiredModal("Um auf diesen Beitrag zu antworten und mitzudiskutieren, erstelle kurz ein kostenloses Konto oder melde dich an.");
    return;
  }

  const t = document.getElementById("newComment");
  const content = sanitizeText(t.value, 2000);
  if(!content || !currentPost) return;

  if(!checkRateLimit("add_forum_comment", 3000)) return;

  const payload = {
    post_id: currentPost.id,
    content: content,
    user_id: currentUser ? currentUser.id : null
  };
  await db.from("comments").insert([payload]);
  t.value = "";
  currentPost.comments++;
  document.getElementById("postCommentCount").textContent = currentPost.comments;
  showToast("Antwort erfolgreich veröffentlicht!");

  if (window.GA && typeof window.GA.trackCommentSubmit === 'function') {
    window.GA.trackCommentSubmit({
      contentType: "discussion",
      contentId: currentPost.id,
      category: currentPost.cat || "Alltag",
      pagePath: window.location.pathname
    });
  }

  if (typeof createNotification === 'function') {
    const authorName = (currentProfile && currentProfile.username) ? currentProfile.username : 'Ein Nutzer';
    const authorCanton = (currentProfile && currentProfile.canton) ? currentProfile.canton : 'CH';
    createNotification({
      userId: currentPost.user_id || null,
      title: "Neue Antwort auf deinen Beitrag",
      message: `${authorName} (${authorCanton}) hat auf "${currentPost.title}" geantwortet.`,
      linkPage: "post",
      linkId: currentPost.id
    });
  }

  await loadForumComments(currentPost.id);
  await loadForum();
}

async function voteComment(commentId, diff, el){
  if(!currentUser){
    openAuthRequiredModal("Um Kommentare und Antworten zu bewerten, erstelle kurz ein kostenloses Konto oder melde dich an.");
    return;
  }

  if(!db || !commentId) {
    if(el) el.textContent = "Danke!";
    return;
  }
  if(!checkRateLimit(`vote_comment_${commentId}`, 2000)) return;

  if (window.GA && typeof window.GA.trackUpvote === 'function') {
    if (diff > 0) {
      window.GA.trackUpvote({
        contentType: "comment",
        contentId: commentId,
        loggedIn: !!currentUser
      });
    } else {
      window.GA.trackUpvoteRemoved({
        contentType: "comment",
        contentId: commentId
      });
    }
  }

  if(diff > 0 && db.rpc){
    await db.rpc('increment_upvote', { comment_id: commentId });
  }
  el.textContent = "Danke!";
}
