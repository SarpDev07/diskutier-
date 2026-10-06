// HAUPT-APPLIKATION, INITIALISIERUNG & HELPER
let activeCreateType = "post";

// BEITRAG ODER ABSTIMMUNG ERSTELLEN
function setCreateType(type){
  activeCreateType = type;
  document.getElementById("btnTypePost").classList.toggle("on", type === "post");
  document.getElementById("btnTypePoll").classList.toggle("on", type === "poll");
  document.getElementById("pollFields").style.display = type === "poll" ? "block" : "none";
  document.getElementById("previewVotes").style.display = type === "poll" ? "flex" : "none";
  updateCreatePreview();
}

function updateCreatePreview(){
  const title = sanitizeText(document.getElementById("createTitle").value, 150) || "Deine Frage erscheint hier.";
  document.getElementById("previewText").textContent = title;
  if(activeCreateType === "poll"){
    const rawOpts = document.getElementById("createOptions").value;
    const opts = rawOpts.split(",").map(s => sanitizeText(s, 50)).filter(Boolean);
    document.getElementById("previewVotes").innerHTML = (opts.length ? opts : ["JA", "NEIN"]).map(o => `<button class="qv">${escapeHTML(o)}</button>`).join("");
  }
}

async function submitCreate(){
  if(!currentUser){
    openAuthRequiredModal("Um einen Beitrag oder eine Abstimmung zu veröffentlichen, erstelle kurz ein kostenloses Konto oder melde dich an.");
    return;
  }

  const title = sanitizeText(document.getElementById("createTitle").value, 150);
  const body = sanitizeText(document.getElementById("createBody").value, 4000);
  const category = sanitizeText(document.getElementById("createCategory").value, 40);
  const errDiv = document.getElementById("createError");
  errDiv.textContent = "";

  if(!checkRateLimit("submit_create", 4000)) return;

  if(!title){
    errDiv.textContent = "Bitte einen Titel / Frage angeben.";
    return;
  }

  if(title.length < 5){
    errDiv.textContent = "Der Titel muss mindestens 5 Zeichen lang sein.";
    return;
  }

  if(activeCreateType === "post"){
    const paragraphs = body ? body.split("\n\n").map(p => sanitizeText(p, 2000)).filter(Boolean) : [title];
    const { data, error } = await db.from("posts").insert([{
      title,
      category,
      excerpt: paragraphs[0] ? paragraphs[0].substring(0, 180) : title,
      body: paragraphs,
      user_id: currentUser ? currentUser.id : null
    }]).select();
    if(error){
      errDiv.textContent = "Fehler beim Erstellen: " + error.message;
      return;
    }
    if(data && data[0] && data[0].id && typeof saveMyPostId === 'function'){
      saveMyPostId(data[0].id);
    }
    showToast("Beitrag erfolgreich veröffentlicht!");
    document.getElementById("createTitle").value = "";
    document.getElementById("createBody").value = "";
    await loadForum();
    if(window.Router && typeof window.Router.navigate === "function"){
      window.Router.navigate(`/beitrag/${slugify(title)}`);
    } else {
      showPage("forum");
    }
  } else {
    const rawOpts = document.getElementById("createOptions").value;
    const opts = rawOpts.split(",").map(s => sanitizeText(s, 50)).filter(Boolean);
    const options = opts.length > 1 ? opts : ["JA", "NEIN"];
    const { error } = await db.from("polls").insert([{
      title,
      description: body || null,
      category,
      options: options,
      user_id: currentUser ? currentUser.id : null,
      is_featured: false
    }]);
    if(error){
      errDiv.textContent = "Fehler beim Erstellen: " + error.message;
      return;
    }
    showToast("Abstimmung erfolgreich veröffentlicht!");
    document.getElementById("createTitle").value = "";
    document.getElementById("createBody").value = "";
    await loadPolls();
    if(window.Router && typeof window.Router.navigate === "function"){
      window.Router.navigate(`/frage/${slugify(title)}`);
    } else {
      showPage("home");
    }
  }
}

// SUCHE
function doSearch(){
  const s = sanitizeText(document.getElementById("searchInput").value, 100).toLowerCase();
  if(!s){
    document.getElementById("searchResults").innerHTML = "";
    return;
  }
  const pollMatches = currentPolls.filter(q => (q.title && q.title.toLowerCase().includes(s)) || (q.category && q.category.toLowerCase().includes(s)));
  const postMatches = currentPosts.filter(p => (p.title && p.title.toLowerCase().includes(s)) || (p.cat && p.cat.toLowerCase().includes(s)));

  let html = "";
  if(pollMatches.length > 0){
    html += `<div class="eyebrow" style="margin-top:20px">Abstimmungen</div>` + pollMatches.slice(0, 6).map(q => `
      <div class="searchResult">
        <a href="/frage/${slugify(q.title)}" style="color:inherit;text-decoration:none;display:block">
          <div class="meta"><span class="category">${escapeHTML(q.category)}</span> · ${q.totalVotes.toLocaleString('de-CH')} Stimmen</div>
          <b>${escapeHTML(q.title)}</b>
        </a>
      </div>
    `).join("");
  }
  if(postMatches.length > 0){
    html += `<div class="eyebrow" style="margin-top:20px">Beiträge</div>` + postMatches.slice(0, 6).map(p => `
      <div class="searchResult">
        <a href="/beitrag/${slugify(p.title)}" style="color:inherit;text-decoration:none;display:block">
          <div class="meta"><span class="category">${escapeHTML(p.cat)}</span> · ${p.comments} Antworten</div>
          <b>${escapeHTML(p.title)}</b>
        </a>
      </div>
    `).join("");
  }
  if(!html){
    html = `<p style="color:#777;padding:20px 0">Keine passenden Fragen oder Beiträge gefunden.</p>`;
  }
  document.getElementById("searchResults").innerHTML = html;
}

// KATEGORIEN SEITE
const categoriesList = [
  ["Beziehungen", 48], ["Geld & Beruf", 64], ["Gaming", 29],
  ["Technologie", 52], ["Auto & Mobilität", 23], ["Essen", 41],
  ["Sport", 35], ["Schule & Ausbildung", 21], ["Wohnen", 32],
  ["Schweiz & Politik", 76], ["Gesellschaft", 45], ["Alltag", 58]
];

const catGridEl = document.getElementById("categoryGrid");
if(catGridEl){
  catGridEl.innerHTML = categoriesList.map(c => `
    <div class="catrow">
      <a href="/kategorie/${getCategorySlug(c[0])}" style="color:inherit;text-decoration:none;display:block">
        <h3>${escapeHTML(c[0])}</h3>
        <p>${c[1]} aktive Themen · Fragen & Beiträge ansehen</p>
      </a>
    </div>
  `).join("");
}

function filterByCat(catName, updateUrl = true){
  const safeCatName = sanitizeText(catName, 50);
  const catSlug = getCategorySlug(safeCatName);
  
  if(updateUrl && window.Router && typeof window.Router.navigate === "function"){
    window.Router.navigate(`/kategorie/${catSlug}`);
    return;
  }

  showPageElement('forum');
  const filtered = currentPosts.filter(p => p.cat && p.cat.toLowerCase() === safeCatName.toLowerCase());
  const forumListEl = document.getElementById("forumList");
  if(!forumListEl) return;

  if(filtered.length > 0){
    forumListEl.innerHTML = filtered.map(p => `
      <article class="postRow">
        <div class="replyCount"><b>${p.comments}</b>Antworten</div>
        <div>
          <div class="postTitle"><a href="/beitrag/${slugify(p.title)}" style="color:inherit;text-decoration:none">${escapeHTML(p.title)}</a></div>
          <div class="postExcerpt">${escapeHTML(p.excerpt)}</div>
          <div class="postMeta"><b>${escapeHTML(p.cat)}</b> · <a href="/profil/${encodeURIComponent(p.user)}" style="color:inherit;text-decoration:none">${escapeHTML(p.user)}</a> (${escapeHTML(p.canton)}) · ${escapeHTML(p.time)} · ${p.views.toLocaleString('de-CH')} Aufrufe</div>
        </div>
      </article>
    `).join("");
  } else {
    forumListEl.innerHTML = `<p style="color:#777;padding:20px 0">Keine Beiträge in "${escapeHTML(safeCatName)}" gefunden. <a href="/erstellen" style="color:var(--red);font-weight:900">Erstelle den ersten Beitrag!</a></p>`;
  }
}

// ROUTING & NAVIGATION HELPER (KOMPATIBILITÄT)
function showPage(id){
  const pathToPage = {
    home: "/",
    forum: "/beitraege",
    categories: "/kategorien",
    create: "/erstellen",
    search: "/suche",
    profile: currentUser && currentProfile ? `/profil/${encodeURIComponent(currentProfile.username)}` : "/anmelden",
    login: "/anmelden",
    register: "/registrieren",
    about: "/ueber-uns",
    contact: "/kontakt",
    privacy: "/datenschutz",
    imprint: "/impressum",
    terms: "/richtlinien",
    analytics: "/analytics"
  };

  const targetPath = pathToPage[id] || `/${id}`;
  if(window.Router && typeof window.Router.navigate === "function"){
    window.Router.navigate(targetPath);
  } else {
    showPageElement(id);
  }
}

function scrollFeed(){
  const el = document.getElementById("feedStart");
  if(el) el.scrollIntoView({ behavior: "smooth" });
}

function shareCurrent(){
  const url = window.location.href;
  const title = document.title;
  if(navigator.share){
    navigator.share({ title: title, url: url }).catch(()=>{});
  } else {
    navigator.clipboard.writeText(url);
    showToast("Link in die Zwischenablage kopiert!");
  }
}

// TOAST BENACHRICHTIGUNGEN
function showToast(msg, dur = 3200){
  let container = document.getElementById("toastContainer");
  if(!container){
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-box";
    document.body.appendChild(container);
  }
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = sanitizeText(msg, 200);
  container.appendChild(el);
  setTimeout(() => el.classList.add("show"), 20);
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 260);
  }, dur);
}

// INITIALER START
(async function init(){
  await initAuth();
  await loadPolls();
  await loadForum();
  if(window.Router && typeof window.Router.init === "function"){
    window.Router.init();
  }
})();
