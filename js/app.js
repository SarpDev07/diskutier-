// HAUPT-APPLIKATION, ROUTING & HELPER
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
  const title = document.getElementById("createTitle").value.trim() || "Deine Frage erscheint hier.";
  document.getElementById("previewText").textContent = title;
  if(activeCreateType === "poll"){
    const opts = document.getElementById("createOptions").value.split(",").map(s => s.trim()).filter(Boolean);
    document.getElementById("previewVotes").innerHTML = opts.map(o => `<button class="qv">${o}</button>`).join("");
  }
}

async function submitCreate(){
  const title = document.getElementById("createTitle").value.trim();
  const body = document.getElementById("createBody").value.trim();
  const category = document.getElementById("createCategory").value;
  const errDiv = document.getElementById("createError");
  errDiv.textContent = "";

  if(!title){
    errDiv.textContent = "Bitte einen Titel / Frage angeben.";
    return;
  }

  if(activeCreateType === "post"){
    const paragraphs = body ? body.split("\n\n").filter(Boolean) : [title];
    const { error } = await db.from("posts").insert([{
      title,
      category,
      excerpt: paragraphs[0],
      body: paragraphs,
      user_id: currentUser ? currentUser.id : null
    }]);
    if(error){
      errDiv.textContent = "Fehler beim Erstellen: " + error.message;
      return;
    }
    showToast("Beitrag erfolgreich veröffentlicht!");
    document.getElementById("createTitle").value = "";
    document.getElementById("createBody").value = "";
    await loadForum();
    showPage("forum");
  } else {
    const opts = document.getElementById("createOptions").value.split(",").map(s => s.trim()).filter(Boolean);
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
    showPage("home");
  }
}

// SUCHE
function doSearch(){
  const s = document.getElementById("searchInput").value.toLowerCase().trim();
  if(!s){
    document.getElementById("searchResults").innerHTML = "";
    return;
  }
  const pollMatches = currentPolls.filter(q => q.title.toLowerCase().includes(s) || q.category.toLowerCase().includes(s));
  const postMatches = currentPosts.filter(p => p.title.toLowerCase().includes(s) || p.cat.toLowerCase().includes(s));

  let html = "";
  if(pollMatches.length > 0){
    html += `<div class="eyebrow" style="margin-top:20px">Abstimmungen</div>` + pollMatches.slice(0, 5).map(q => `
      <div class="searchResult" onclick="openPollDetail('${q.id}')">
        <div class="meta"><span class="category">${q.category}</span> · ${q.totalVotes.toLocaleString('de-CH')} Stimmen</div>
        <b>${q.title}</b>
      </div>
    `).join("");
  }
  if(postMatches.length > 0){
    html += `<div class="eyebrow" style="margin-top:20px">Beiträge</div>` + postMatches.slice(0, 5).map(p => `
      <div class="searchResult" onclick="openPost('${p.id}')">
        <div class="meta"><span class="category">${p.cat}</span> · ${p.comments} Antworten</div>
        <b>${p.title}</b>
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
  ["Beziehungen", 384], ["Geld & Beruf", 517], ["Gaming", 219],
  ["Technologie", 441], ["Auto & Mobilität", 186], ["Essen", 302],
  ["Sport", 277], ["Schule & Ausbildung", 164], ["Wohnen", 238],
  ["Schweiz", 623], ["Gesellschaft", 355], ["Alltag", 491]
];

const catGridEl = document.getElementById("categoryGrid");
if(catGridEl){
  catGridEl.innerHTML = categoriesList.map(c => `
    <div class="catrow" onclick="filterByCat('${c[0]}')">
      <h3>${c[0]}</h3>
      <p>${c[1]} aktive Themen · Fragen & Beiträge ansehen</p>
    </div>
  `).join("");
}

function filterByCat(catName){
  showPage('forum');
  const filtered = currentPosts.filter(p => p.cat.toLowerCase() === catName.toLowerCase());
  if(filtered.length > 0){
    document.getElementById("forumList").innerHTML = filtered.map(p => `
      <article class="postRow" onclick="openPost('${p.id}')">
        <div class="replyCount"><b>${p.comments}</b>Antworten</div>
        <div>
          <div class="postTitle">${p.title}</div>
          <div class="postExcerpt">${p.excerpt}</div>
          <div class="postMeta"><b>${p.cat}</b> · ${p.user} (${p.canton}) · ${p.time} · ${p.views.toLocaleString('de-CH')} Aufrufe</div>
        </div>
      </article>
    `).join("");
  } else {
    document.getElementById("forumList").innerHTML = `<p style="color:#777;padding:20px 0">Keine Beiträge in "${catName}" gefunden. <a href="#" onclick="showPage('create');return false;" style="color:var(--red);font-weight:900">Erstelle den ersten Beitrag!</a></p>`;
  }
}

// ROUTING & NAVIGATION
function showPage(id){
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const target = document.getElementById(id);
  if(target) target.classList.add("active");
  if(id === "profile") renderProfilePage();
  
  // Mobile Nav Active State
  document.querySelectorAll(".mobileNav button").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === id);
  });
  
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function scrollFeed(){
  document.getElementById("feedStart").scrollIntoView({ behavior: "smooth" });
}

function shareCurrent(){
  if(navigator.share){
    navigator.share({ title: document.title, url: window.location.href }).catch(()=>{});
  } else {
    navigator.clipboard.writeText(window.location.href);
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
  el.textContent = msg;
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
})();
