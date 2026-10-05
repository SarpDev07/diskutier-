// ABSTIMMUNGEN (POLLS) & LIVE-VOTING
let currentPolls = [];
let currentPoll = null;
let activeFeaturedIndex = 0;

// REALISTISCHE SCHWEIZER BASIS-DATEN FÜR ALTE TEST-FRAGEN
const POLL_BASELINES = {
  "Sind CHF 6'000 Monatslohn heute noch ein guter Lohn in der Schweiz?": { baseVotes: 642, optionCounts: [198, 348, 96] },
  "Ist es komisch, mit 25 noch bei den Eltern zu wohnen?": { baseVotes: 489, optionCounts: [136, 231, 122] },
  "Würdest du für CHF 1'000 mehr Lohn täglich eine Stunde länger pendeln?": { baseVotes: 318, optionCounts: [95, 223] },
  "Coop oder Migros?": { baseVotes: 742, optionCounts: [341, 319, 82] },
  "Sollte man seinem Partner das Handy-Passwort geben?": { baseVotes: 521, optionCounts: [130, 297, 94] },
  "Sind 30 Franken für eine Pizza in der Schweiz zu viel?": { baseVotes: 382, optionCounts: [267, 46, 69] },
  "iPhone oder Samsung?": { baseVotes: 612, optionCounts: [336, 227, 49] },
  "Homeoffice oder Büro?": { baseVotes: 467, optionCounts: [280, 65, 122] },
  "Würdest du für die Liebe in einen anderen Kanton ziehen?": { baseVotes: 279, optionCounts: [187, 39, 53] },
  "10-Millionen-Schweiz: Rettung vor Wohnungsnot oder wirtschaftlicher Selbstmord?": { baseVotes: 1420, optionCounts: [738, 682, 0] },
  "poll_10m_schweiz": { baseVotes: 1420, optionCounts: [738, 682, 0] }
};

// INITIALE SCHWEIZER COMMUNITY-KOMMENTARE FÜR BESTEHENDE FRAGEN
const SEED_COMMENTS = [
  { username: "AlpenFuchs", canton: "BE", created_at: "2026-10-03T11:20:00.000Z", content: "Mit den heutigen Mieten sind 6'000 Franken definitiv nicht mehr dasselbe wie vor zehn Jahren. Allein die Krankenkasse frisst schon einen riesigen Teil.", upvotes: 24, downvotes: 3 },
  { username: "NinaZH", canton: "ZH", created_at: "2026-10-03T15:45:00.000Z", content: "Kommt extrem darauf an, ob man allein wohnt, Kinder hat und wo in der Schweiz man lebt. In Zürich Stadt ist es knapp, auf dem Land völlig okay.", upvotes: 18, downvotes: 2 },
  { username: "romand92", canton: "VD", created_at: "2026-10-02T09:10:00.000Z", content: "Ausserhalb der grossen Städte kann man damit meiner Meinung nach immer noch gut leben, wenn man etwas aufs Budget achtet.", upvotes: 11, downvotes: 4 }
];

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
    polls.unshift({
      id: "poll_10m_schweiz",
      category: "Schweiz & Politik",
      title: "10-Millionen-Schweiz: Rettung vor Wohnungsnot oder wirtschaftlicher Selbstmord?",
      description: "Volle Züge, steigende Mieten und dichtere Agglos vs. akuter Fachkräftemangel in Spitälern und Betrieben. Braucht die Schweiz bis 2050 eine gesetzliche Obergrenze von 10 Millionen Einwohnern?",
      options: ["JA (Limit nötig)", "NEIN (Schadet Wirtschaft)", "KOMMT DARAUF AN"],
      is_featured: true,
      created_at: new Date().toISOString(),
      poll_votes: []
    });
  }

  currentPolls = polls.map((p, pIdx) => {
    const votes = p.poll_votes || [];
    const base = POLL_BASELINES[p.title] || (p.id && POLL_BASELINES[p.id]) || { baseVotes: 0, optionCounts: (p.options || []).map(()=>0) };
    
    // Kombiniere Basis-Stimmen mit echten DB-Stimmen
    const optionCounts = (p.options || []).map((_, idx) => {
      const baseCount = base.optionCounts && base.optionCounts[idx] !== undefined ? base.optionCounts[idx] : 0;
      const dbCount = votes.filter(v => v.option_index === idx).length;
      return baseCount + dbCount;
    });

    const totalVotes = optionCounts.reduce((a, b) => a + b, 0) || votes.length;
    const userVote = votes.find(v => (currentUser && v.user_id === currentUser.id) || v.session_token === getGuestSession());
    
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
      userVotedIndex: userVote !== undefined ? userVote.option_index : null
    };
  });

  renderPollsUI();
}

// NÄCHSTE FRAGE DIREKT AUF DER FLÄCHE WECHSELN
function nextFeaturedPoll(){
  if(activeFeaturedIndex < currentPolls.length - 1){
    activeFeaturedIndex++;
  } else {
    activeFeaturedIndex = currentPolls.length; // Abschluss-Karte anzeigen
  }
  renderPollsUI();
}

function restartFeaturedPolls(){
  activeFeaturedIndex = 0;
  renderPollsUI();
}

function createMyOwnPoll(){
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
          Du hast alle aktuellen Abstimmungen durchgeklickt. Welche Frage brennt dir auf dem Herzen? Starte jetzt deine eigene Abstimmung für die Schweizer Community.
        </p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
          <button class="publish" style="margin-top:0;padding:12px 18px" onclick="createMyOwnPoll()">Eigene Abstimmung erstellen</button>
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

      return `
        <article class="feedItem">
          <div class="meta">
            <span class="category"><a href="/kategorie/${catSlug}" style="color:var(--red);text-decoration:none">${safeCat}</a></span>
            <span>·</span>
            <span>${safeTime}</span>
          </div>
          <h2><a href="/frage/${pollSlug}" style="color:inherit;text-decoration:none">${safeTitle}</a></h2>
          <div class="feedStats">${safeCount} Stimmen</div>
          <div class="quickVotes" id="qv-${safeId}">
            ${q.options.map((opt, idx) => `
              <button class="qv ${q.userVotedIndex === idx ? 'active' : ''}" onclick="submitPollVote('${safeId}', ${idx}, false)">${escapeHTML(opt)}</button>
            `).join("")}
          </div>
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
        <div class="resulttop"><span>${escapeHTML(opt)}</span><span>${pct} %</span></div>
        <div class="track"><div class="bar" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join("");

  let youText = "";
  if(poll.userVotedIndex !== null){
    const userPct = Math.round(((poll.optionCounts[poll.userVotedIndex] || 0) / total) * 100);
    youText = `<div class="you">Du hast wie ${userPct} % abgestimmt.</div>`;
  }
  container.innerHTML = html + youText;
}

const pendingVotes = {}; // pollId -> { timeoutId, intervalId, optionIndex, isFeatured }

function submitPollVote(pollId, optionIndex, isFeatured){
  const poll = currentPolls.find(p => p.id === pollId) || currentPoll;
  if(!poll) return;

  // Bestehenden Timer für dieselbe Frage abbrechen
  if(pendingVotes[pollId]){
    clearInterval(pendingVotes[pollId].intervalId);
    clearTimeout(pendingVotes[pollId].timeoutId);
    delete pendingVotes[pollId];
  }

  // Ziel-Container finden
  let container = null;
  if(isFeatured){
    container = document.getElementById("featuredVotes");
  } else if(currentPoll && currentPoll.id === pollId && document.getElementById("detail") && document.getElementById("detail").classList.contains("active")){
    container = document.getElementById("detailVotes");
  } else {
    container = document.getElementById(`qv-${pollId}`);
  }

  const selectedOpt = poll.options[optionIndex] || "Deine Wahl";
  let secondsLeft = 5;

  if(container){
    container.innerHTML = `
      <div class="voteConfirmationBox" id="voteConfirmBox-${escapeHTML(pollId)}" style="grid-column: 1 / -1; width: 100%;">
        <div class="voteConfirmTop">
          <div class="voteConfirmCheck">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="color:var(--red)"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <strong>Stimme für «${escapeHTML(selectedOpt)}» gewählt</strong>
          </div>
          <span class="undoTimerBadge" id="undoTimerBadge-${escapeHTML(pollId)}">${secondsLeft}s</span>
        </div>
        <div class="undoProgressTrack">
          <div class="undoProgressBar" id="undoProgressBar-${escapeHTML(pollId)}" style="width: 100%;"></div>
        </div>
        <div class="voteConfirmActions">
          <button class="undoVoteBtn" onclick="cancelPendingVote('${escapeHTML(pollId)}', ${isFeatured})">Rückgängig machen</button>
          <button class="confirmVoteBtn" onclick="finalizeVoteEarly('${escapeHTML(pollId)}', ${optionIndex}, ${isFeatured})">Ergebnis anzeigen &rarr;</button>
        </div>
      </div>
    `;

    setTimeout(() => {
      const bar = document.getElementById(`undoProgressBar-${pollId}`);
      if(bar) {
        bar.style.transition = "width 5s linear";
        bar.style.width = "0%";
      }
    }, 40);
  }

  const intervalId = setInterval(() => {
    secondsLeft--;
    const badge = document.getElementById(`undoTimerBadge-${pollId}`);
    if(badge && secondsLeft >= 0) {
      badge.textContent = `${secondsLeft}s`;
    }
    if(secondsLeft <= 0){
      clearInterval(intervalId);
    }
  }, 1000);

  const timeoutId = setTimeout(() => {
    finalizeVote(pollId, optionIndex, isFeatured);
  }, 5000);

  pendingVotes[pollId] = {
    timeoutId,
    intervalId,
    optionIndex,
    isFeatured
  };
}

function cancelPendingVote(pollId, isFeatured){
  if(pendingVotes[pollId]){
    clearInterval(pendingVotes[pollId].intervalId);
    clearTimeout(pendingVotes[pollId].timeoutId);
    delete pendingVotes[pollId];
  }

  const poll = currentPolls.find(p => p.id === pollId) || currentPoll;
  if(poll){
    poll.userVotedIndex = null;
  }

  showToast("Stimme rückgängig gemacht.");

  if(isFeatured){
    renderPollsUI();
  } else if(currentPoll && currentPoll.id === pollId && document.getElementById("detail") && document.getElementById("detail").classList.contains("active")){
    openPollDetail(pollId, false);
  } else {
    renderPollsUI();
  }
}

function finalizeVoteEarly(pollId, optionIndex, isFeatured){
  if(pendingVotes[pollId]){
    clearInterval(pendingVotes[pollId].intervalId);
    clearTimeout(pendingVotes[pollId].timeoutId);
    delete pendingVotes[pollId];
  }
  finalizeVote(pollId, optionIndex, isFeatured);
}

async function finalizeVote(pollId, optionIndex, isFeatured){
  if(pendingVotes[pollId]){
    clearInterval(pendingVotes[pollId].intervalId);
    clearTimeout(pendingVotes[pollId].timeoutId);
    delete pendingVotes[pollId];
  }

  const poll = currentPolls.find(p => p.id === pollId) || currentPoll;
  if(!poll) return;

  // Lokalen Zähler erhöhen
  poll.userVotedIndex = optionIndex;
  if(!poll.optionCounts) poll.optionCounts = poll.options.map(() => 0);
  poll.optionCounts[optionIndex] = (poll.optionCounts[optionIndex] || 0) + 1;
  poll.totalVotes = (poll.totalVotes || 0) + 1;

  // Supabase Sync im Hintergrund
  if(db){
    const guestSession = getGuestSession();
    const payload = {
      poll_id: pollId,
      option_index: optionIndex,
      user_id: currentUser ? currentUser.id : null,
      session_token: currentUser ? null : guestSession
    };
    db.from("poll_votes").upsert(payload, { onConflict: currentUser ? 'poll_id,user_id' : 'poll_id,session_token' }).then();
  }

  if(typeof trackEvent === 'function'){
    trackEvent('poll_vote', { poll_id: pollId, option: optionIndex, title: poll.title });
  }

  showToast("Stimme erfolgreich gezählt!");

  if(isFeatured){
    renderPollsUI();
  } else if(currentPoll && currentPoll.id === pollId && document.getElementById("detail") && document.getElementById("detail").classList.contains("active")){
    openPollDetail(pollId, false);
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
  
  const attachSeed = pollId === "f64a69b1-4fc9-4d99-a812-a7dedfc01407";
  const allComments = [
    ...dbComments.map(c => ({
      username: c.profiles?.username || 'Anonym',
      canton: c.profiles?.canton || 'CH',
      time: formatTimeAgo(c.created_at),
      content: c.content,
      upvotes: c.upvotes || 0,
      downvotes: c.downvotes || 0,
      id: c.id
    })),
    ...(attachSeed ? SEED_COMMENTS.map(c => ({
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

