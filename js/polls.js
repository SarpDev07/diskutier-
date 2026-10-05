// ABSTIMMUNGEN (POLLS) & LIVE-VOTING
let currentPolls = [];
let currentPoll = null;

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
  "Würdest du für die Liebe in einen anderen Kanton ziehen?": { baseVotes: 279, optionCounts: [187, 39, 53] }
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

  // 10-Millionen Haupt-Abstimmung (GANZ NEU & FRISCH GESTARTET)
  const has10MPoll = polls.some(p => p.title.includes("10-Millionen"));
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
    const base = POLL_BASELINES[p.title] || { baseVotes: 0, optionCounts: (p.options || []).map(()=>0) };
    
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

function renderPollsUI(){
  if(!currentPolls.length) return;
  const featured = currentPolls.find(p => p.is_featured) || currentPolls[0];
  const feed = currentPolls.filter(p => p.id !== featured.id);

  // Featured Render (Sicher mit textContent & escaped HTML)
  document.getElementById("featCat").textContent = featured.category;
  document.getElementById("featTime").textContent = featured.time;
  document.getElementById("featTitle").textContent = featured.title;
  
  const featCountText = featured.totalVotes > 0 ? `${featured.totalVotes.toLocaleString('de-CH')} Personen haben abgestimmt` : "Noch keine Stimmen – sei der Erste!";
  document.getElementById("featCount").textContent = featCountText;

  const featVotesContainer = document.getElementById("featuredVotes");
  const featResultsContainer = document.getElementById("featuredResults");

  if(featured.userVotedIndex !== null){
    featVotesContainer.style.display = "none";
    featResultsContainer.style.display = "block";
    renderResultsHTML(featResultsContainer, featured);
  } else {
    featVotesContainer.style.display = "grid";
    featResultsContainer.style.display = "none";
    featVotesContainer.innerHTML = featured.options.map((opt, idx) => {
      const safeOpt = escapeHTML(opt);
      const safeId = escapeHTML(featured.id);
      return `<button class="vote" onclick="submitPollVote('${safeId}', ${idx}, true)">${safeOpt}</button>`;
    }).join("");
  }

  // Feed Render mit XSS-Schutz
  document.getElementById("feed").innerHTML = feed.map((q, i) => {
    const safeCat = escapeHTML(q.category);
    const safeTime = escapeHTML(q.time);
    const safeTitle = escapeHTML(q.title);
    const safeId = escapeHTML(q.id);
    const safeCount = q.totalVotes.toLocaleString('de-CH');

    return `
      <article class="feedItem">
        <div class="meta"><span class="category">${safeCat}</span><span>·</span><span>${safeTime}</span></div>
        <h2 onclick="openPollDetail('${safeId}')">${safeTitle}</h2>
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

  // Trending Sidebar
  document.getElementById("trending").innerHTML = currentPolls.slice(0, 5).map(q => `
    <div class="trend" onclick="openPollDetail('${escapeHTML(q.id)}')">
      <strong>${escapeHTML(q.title)}</strong>
      <small>${q.totalVotes.toLocaleString('de-CH')} Stimmen · ${escapeHTML(q.category)}</small>
    </div>
  `).join("");
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

async function submitPollVote(pollId, optionIndex, isFeatured){
  if(!db) return;
  // Anti-Spam Rate Limit
  if(!checkRateLimit(`vote_${pollId}`, 1000)) return;

  const guestSession = getGuestSession();
  const payload = {
    poll_id: pollId,
    option_index: optionIndex,
    user_id: currentUser ? currentUser.id : null,
    session_token: currentUser ? null : guestSession
  };

  const { error } = await db.from("poll_votes").upsert(payload, { onConflict: currentUser ? 'poll_id,user_id' : 'poll_id,session_token' });
  if(error){
    console.error("Vote error:", error);
  } else {
    if(typeof trackEvent === 'function'){
      const targetPoll = currentPolls.find(p => p.id === pollId) || currentPoll;
      trackEvent('poll_vote', { poll_id: pollId, option: optionIndex, title: targetPoll ? targetPoll.title : pollId });
    }
  }
  await loadPolls();
  if(currentPoll && currentPoll.id === pollId){
    openPollDetail(pollId);
  }
}

function openFeaturedDetail(){
  const featured = currentPolls.find(p => p.is_featured) || currentPolls[0];
  if(featured) openPollDetail(featured.id);
}

async function openPollDetail(pollId){
  currentPoll = currentPolls.find(p => p.id === pollId) || currentPolls[0];
  if(!currentPoll) return;

  document.getElementById("detailCat").textContent = currentPoll.category;
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

  const otherPoll = currentPolls.find(p => p.id !== currentPoll.id);
  if(otherPoll){
    document.getElementById("detailNextTitle").textContent = otherPoll.title;
  }

  await loadPollComments(currentPoll.id);
  showPage("detail");
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

  countSpan.textContent = allComments.length;
  container.innerHTML = allComments.map(c => `
    <div class="comment">
      <div class="user">${escapeHTML(c.username)} · ${escapeHTML(c.canton)} · <span style="font-weight:400;color:#777">${escapeHTML(c.time)}</span></div>
      <p>${escapeHTML(c.content)}</p>
      <div class="score">
        <span onclick="voteComment('${escapeHTML(c.id||'')}', 1, this)" style="cursor:pointer">+ ${c.upvotes}</span>&nbsp;&nbsp;&nbsp;
        <span onclick="voteComment('${escapeHTML(c.id||'')}', -1, this)" style="cursor:pointer">− ${c.downvotes}</span>
      </div>
    </div>
  `).join("");
}

async function addPollComment(){
  const textarea = document.getElementById("newPollComment");
  const content = sanitizeText(textarea.value, 1500);
  if(!content || !currentPoll) return;

  // Rate Limiting anti-spam
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
