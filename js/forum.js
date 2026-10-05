// FORUMS-BEITRÄGE & DISKUSSIONEN
let currentPosts = [];
let currentPost = null;

const POST_BASELINES = {
  "10-Millionen-Schweiz: Rettung vor dem Kollaps oder wirtschaftlicher Selbstmord?": { comments: 24, views: 642 },
  "Nachbar stellt ständig Sachen ins Treppenhaus – was würdet ihr machen?": { comments: 14, views: 342 },
  "Chef erwartet, dass ich nach Feierabend auf WhatsApp antworte": { comments: 23, views: 618 },
  "Freundeskreis verändert sich komplett seit alle in Beziehungen sind": { comments: 18, views: 429 },
  "Wie viel zahlt ihr aktuell für eine 2.5-Zimmer-Wohnung?": { comments: 29, views: 694 },
  "Lohnt sich ein Handywechsel überhaupt noch alle zwei Jahre?": { comments: 16, views: 395 },
  "Studium abbrechen nach drei Semestern – Erfahrungen?": { comments: 21, views: 512 }
};

const SEED_FORUM_REPLIES = [
  { username: "Marc_ZH", canton: "ZH", created_at: "2026-10-04T10:14:00.000Z", content: "Das Problem ist nicht nur Zuwanderung, sondern dass überall Einsprachen den Wohnungsbau blockieren. Wenn wir dichter und höher bauen würden, hätten wir genug Platz.", upvotes: 21 },
  { username: "Walliser92", canton: "VS", created_at: "2026-10-04T11:45:00.000Z", content: "Man sieht es ja bei der Zersiedelung der Landschaft und den vollen Zügen. Irgendwann verliert die Schweiz genau das, was sie so lebenswert macht.", upvotes: 17 },
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

  // 10-Millionen Debatte an oberster Stelle sicherstellen
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
      created_at: "2026-10-04T08:15:00.000Z",
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

function renderForum(){
  const container = document.getElementById("forumList");
  if(!container) return;
  
  container.innerHTML = currentPosts.map(p => `
    <article class="postRow" onclick="openPost('${escapeHTML(p.id)}')">
      <div class="replyCount"><b>${p.comments}</b>Antworten</div>
      <div>
        <div class="postTitle">${escapeHTML(p.title)}</div>
        <div class="postExcerpt">${escapeHTML(p.excerpt)}</div>
        <div class="postMeta"><b>${escapeHTML(p.cat)}</b> · Von <strong>${escapeHTML(p.user)}</strong> (${escapeHTML(p.canton)}) · ${escapeHTML(p.time)} · ${p.views.toLocaleString('de-CH')} Aufrufe</div>
      </div>
    </article>
  `).join("");
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

  if(editForm) editForm.style.display = "none";
  if(postBody) postBody.style.display = "block";
  
  if(authorAvatar) authorAvatar.textContent = (currentPost.user || "U").substring(0, 2).toUpperCase();
  if(authorName) authorName.textContent = currentPost.user;
  if(authorCanton) authorCanton.textContent = currentPost.canton || 'CH';
  if(authorSub) authorSub.textContent = currentPost.user_id ? 'Registriertes Mitglied' : 'Community-Beitrag';

  // Ist es der eigene Beitrag des angemeldeten Nutzers?
  const isOwner = currentUser && currentPost.user_id && currentPost.user_id === currentUser.id;
  if(isOwner){
    if(ownerControls) ownerControls.style.display = "block";
    if(authorRole) {
      authorRole.textContent = "Dein Beitrag";
      authorRole.style.color = "var(--red)";
      authorRole.style.fontWeight = "900";
    }
  } else {
    if(ownerControls) ownerControls.style.display = "none";
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

async function deleteCurrentPost(){
  if(!currentPost || !db) return;
  const confirmDelete = confirm(`Möchtest du deinen Beitrag "${currentPost.title}" wirklich unwiderruflich löschen?`);
  if(!confirmDelete) return;

  try {
    await db.from("comments").delete().eq("post_id", currentPost.id);
    await db.from("posts").delete().eq("id", currentPost.id);
    showToast("Dein Beitrag wurde gelöscht.");
    currentPosts = currentPosts.filter(p => p.id !== currentPost.id);
    currentPost = null;
    await loadForum();
    showPage("forum");
  } catch(e) {
    showToast("Fehler beim Löschen: " + (e.message || "Unbekannter Fehler"));
  }
}

async function loadForumComments(postId){
  const container = document.getElementById("forumComments");
  if(!container) return;

  let dbReplies = [];
  if(db){
    const { data } = await db.from("comments").select("*, profiles(username, canton)").eq("post_id", postId).order("created_at", { ascending: true });
    if(data) dbReplies = data;
  }
  
  const allReplies = [
    ...SEED_FORUM_REPLIES.map(r => ({
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
