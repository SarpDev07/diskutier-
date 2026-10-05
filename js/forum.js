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
  { username: "Rheinknie", canton: "BS", time: "vor 2 Tagen", content: "Ich würde zuerst ganz normal das Gespräch suchen. Viele merken gar nicht, dass es andere stört. Wenn danach nichts passiert, kannst du immer noch der Verwaltung schreiben.", upvotes: 12 },
  { username: "sina90", canton: "AG", time: "vor 3 Tagen", content: "Direkt ansprechen, freundlich und ohne Vorwurf. Schriftlich über die Verwaltung eskaliert so etwas meiner Erfahrung nach nur unnötig schnell.", upvotes: 8 },
  { username: "JuraNord", canton: "SO", time: "vor 3 Tagen", content: "Kommt vor allem auch darauf an, ob der Fluchtweg betroffen ist. Wenn es wirklich eng wird bei einem Notfall, würde ich nicht ewig warten.", upvotes: 5 }
];

async function loadForum(){
  if(!db) return;
  const { data: posts, error } = await db.from("posts").select("*, profiles(username, canton), comments(id)").order("created_at", { ascending: false });
  if(error || !posts) return;

  currentPosts = posts.map(p => {
    const base = POST_BASELINES[p.title] || { comments: 0, views: 1 };
    const dbCommentsCount = p.comments ? p.comments.length : 0;
    return {
      id: p.id,
      cat: p.category || "Alltag",
      time: formatTimeAgo(p.created_at),
      title: p.title || "",
      excerpt: p.excerpt || (Array.isArray(p.body) ? p.body[0] : p.body) || "",
      body: Array.isArray(p.body) ? p.body : [p.body],
      user: p.profiles?.username || "Community",
      canton: p.profiles?.canton || "CH",
      comments: base.comments + dbCommentsCount,
      views: Math.max(base.views, p.views || 1),
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
        <div class="postMeta"><b>${escapeHTML(p.cat)}</b> · ${escapeHTML(p.user)} (${escapeHTML(p.canton)}) · ${escapeHTML(p.time)} · ${p.views.toLocaleString('de-CH')} Aufrufe</div>
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
  document.getElementById("postTime").textContent = `${currentPost.time} · ${currentPost.user} (${currentPost.canton})`;
  document.getElementById("postTitle").textContent = currentPost.title;
  document.getElementById("postBody").innerHTML = currentPost.body.map(x => `<p>${escapeHTML(x)}</p>`).join("");
  document.getElementById("postCommentCount").textContent = currentPost.comments;

  await loadForumComments(currentPost.id);
  showPage("postdetail");
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
    ...SEED_FORUM_REPLIES.map(r => ({ ...r, isSeed: true })),
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
