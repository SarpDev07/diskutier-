// FORUMS-BEITRÄGE & DISKUSSIONEN
let currentPosts = [];
let currentPost = null;

const POST_BASELINES = {
  "Nachbar stellt ständig Sachen ins Treppenhaus – was würdet ihr machen?": { comments: 14, views: 342 },
  "Chef erwartet, dass ich nach Feierabend auf WhatsApp antworte": { comments: 23, views: 618 },
  "Freundeskreis verändert sich komplett seit alle in Beziehungen sind": { comments: 18, views: 429 },
  "Wie viel zahlt ihr aktuell für eine 2.5-Zimmer-Wohnung?": { comments: 29, views: 694 },
  "Lohnt sich ein Handywechsel überhaupt noch alle zwei Jahre?": { comments: 16, views: 395 },
  "Studium abbrechen nach drei Semestern – Erfahrungen?": { comments: 21, views: 512 }
};

const SEED_FORUM_REPLIES = [
  { username: "Rheinknie", canton: "BS", created_at: "2026-10-03T10:14:00.000Z", content: "Ich würde zuerst ganz normal das Gespräch suchen. Viele merken gar nicht, dass es andere stört. Wenn danach nichts passiert, kannst du immer noch der Verwaltung schreiben.", upvotes: 12 },
  { username: "sina90", canton: "AG", created_at: "2026-10-02T16:22:00.000Z", content: "Direkt ansprechen, freundlich und ohne Vorwurf. Schriftlich über die Verwaltung eskaliert so etwas meiner Erfahrung nach nur unnötig schnell.", upvotes: 8 },
  { username: "JuraNord", canton: "SO", created_at: "2026-10-02T11:05:00.000Z", content: "Kommt vor allem auch darauf an, ob der Fluchtweg betroffen ist. Wenn es wirklich eng wird bei einem Notfall, würde ich nicht ewig warten.", upvotes: 5 }
];

async function loadForum(){
  let posts = [];
  if(db){
    const { data, error } = await db.from("posts").select("*, profiles(username, canton), comments(id)").order("created_at", { ascending: false });
    if(!error && data) posts = data;
  }

  // 10-Millionen Debatte (GANZ NEU & FRISCH GESTARTET)
  const has10MPost = posts.some(p => p.title.includes("10-Millionen"));
  if(!has10MPost){
    posts.unshift({
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
    });
  }

  currentPosts = posts.map(p => {
    const hasBaseline = POST_BASELINES[p.title];
    const base = hasBaseline || { comments: 0, views: 0 };
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
      comments: hasBaseline ? (base.comments + dbCommentsCount) : dbCommentsCount,
      views: hasBaseline ? Math.max(base.views, p.views || 1) : Math.max(1, p.views || 1),
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
    return `
      <article class="postRow" onclick="openPost('${escapeHTML(p.id)}')">
        <div class="replyCount"><b>${p.comments}</b>Antworten</div>
        <div>
          <div class="postTitle">${escapeHTML(p.title)}</div>
          <div class="postExcerpt">${escapeHTML(p.excerpt)}</div>
          <div class="postMeta">
            <b>${escapeHTML(p.cat)}</b> · Von <strong>${escapeHTML(p.user)}</strong> (${escapeHTML(p.canton)}) · ${escapeHTML(p.time)} · ${p.views.toLocaleString('de-CH')} Aufrufe
            ${isOwner ? `<span style="color:var(--red);font-weight:900;margin-left:8px">· Eigener Beitrag</span>` : ''}
          </div>
          ${isOwner ? `
            <div style="margin-top:6px">
              <button class="smallbtn" style="color:var(--red);font-weight:900;font-size:11px;padding:2px 0" onclick="event.stopPropagation(); deletePostById('${escapeHTML(p.id)}')">Löschen</button>
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

async function openPost(postId){
  currentPost = currentPosts.find(p => p.id === postId);
  if(!currentPost) return;

  if(db){
    db.from("posts").update({ views: (currentPost.views || 0) + 1 }).eq("id", postId).then();
  }
  if(typeof trackEvent === 'function'){
    trackEvent('post_view', { post_id: postId, title: currentPost.title, category: currentPost.cat });
  }

  document.getElementById("postCategory").textContent = currentPost.cat;
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
  if(authorName) authorName.textContent = currentPost.user;
  if(authorCanton) authorCanton.textContent = currentPost.canton || 'CH';
  if(authorSub) authorSub.textContent = currentPost.user_id ? 'Registriertes Mitglied' : 'Community-Beitrag';

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

  await loadForumComments(currentPost.id);
  showPage("postdetail");
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
  document.getElementById("postCategory").textContent = cat;
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
    showPage("forum");
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
  
  const attachSeed = postId === "705d0c28-1a0d-4c92-8a0a-9dfa58e14f56";
  const allReplies = [
    ...(attachSeed ? SEED_FORUM_REPLIES.map(r => ({
      username: r.username,
      canton: r.canton,
      time: formatTimeAgo(r.created_at),
      content: r.content,
      upvotes: r.upvotes,
      id: r.id
    })) : []),
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
      <div class="forumCommentHead">${escapeHTML(r.username)} · ${escapeHTML(r.canton)} <span>· ${escapeHTML(r.time)}</span></div>
      <p>${escapeHTML(r.content)}</p>
      <div class="forumCommentActions">
        <span onclick="voteComment('${escapeHTML(r.id||'')}', 1, this)" style="cursor:pointer">Hilfreich (+${r.upvotes})</span>
      </div>
    </div>
  `).join("");
}

async function addForumComment(){
  const t = document.getElementById("newComment");
  const content = sanitizeText(t.value, 2000);
  if(!content || !currentPost) return;

  // Rate-limiting check
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

  // Benachrichtigung erstellen
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
  if(!db || !commentId) {
    if(el) el.textContent = "Danke!";
    return;
  }
  if(!checkRateLimit(`vote_comment_${commentId}`, 2000)) return;

  if(diff > 0 && db.rpc){
    await db.rpc('increment_upvote', { comment_id: commentId });
  }
  el.textContent = "Danke!";
}
