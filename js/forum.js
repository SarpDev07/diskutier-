// FORUMS-BEITRÄGE & DISKUSSIONEN
let currentPosts = [];
let currentPost = null;

const POST_BASELINES = {
  "Nachbar stellt ständig Sachen ins Treppenhaus – was würdet ihr machen?": { comments: 37, views: 1284 },
  "Chef erwartet, dass ich nach Feierabend auf WhatsApp antworte": { comments: 64, views: 2931 },
  "Freundeskreis verändert sich komplett seit alle in Beziehungen sind": { comments: 51, views: 2106 },
  "Wie viel zahlt ihr aktuell für eine 2.5-Zimmer-Wohnung?": { comments: 128, views: 5447 },
  "Lohnt sich ein Handywechsel überhaupt noch alle zwei Jahre?": { comments: 42, views: 1765 },
  "Studium abbrechen nach drei Semestern – Erfahrungen?": { comments: 73, views: 3082 }
};

const SEED_FORUM_REPLIES = [
  { username: "Rheinknie", canton: "BS", time: "vor 5 Min.", content: "Ich würde zuerst ganz normal das Gespräch suchen. Viele merken gar nicht, dass es andere stört. Wenn danach nichts passiert, kannst du immer noch der Verwaltung schreiben.", upvotes: 42 },
  { username: "sina90", canton: "AG", time: "vor 3 Min.", content: "Direkt ansprechen, freundlich und ohne Vorwurf. Schriftlich über die Verwaltung eskaliert so etwas meiner Erfahrung nach nur unnötig schnell.", upvotes: 29 },
  { username: "JuraNord", canton: "SO", time: "vor 1 Min.", content: "Kommt vor allem auch darauf an, ob der Fluchtweg betroffen ist. Wenn es wirklich eng wird bei einem Notfall, würde ich nicht ewig warten.", upvotes: 18 }
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
      cat: p.category,
      time: formatTimeAgo(p.created_at),
      title: p.title,
      excerpt: p.excerpt || (Array.isArray(p.body) ? p.body[0] : p.body) || "",
      body: Array.isArray(p.body) ? p.body : [p.body],
      user: p.profiles?.username || "Community",
      canton: p.profiles?.canton || "CH",
      comments: base.comments + dbCommentsCount,
      views: Math.max(base.views, p.views || 1)
    };
  });

  renderForum();
}

function renderForum(){
  document.getElementById("forumList").innerHTML = currentPosts.map(p => `
    <article class="postRow" onclick="openPost('${p.id}')">
      <div class="replyCount"><b>${p.comments}</b>Antworten</div>
      <div>
        <div class="postTitle">${p.title}</div>
        <div class="postExcerpt">${p.excerpt}</div>
        <div class="postMeta"><b>${p.cat}</b> · ${p.user} (${p.canton}) · ${p.time} · ${p.views.toLocaleString('de-CH')} Aufrufe</div>
      </div>
    </article>
  `).join("");
}

function filterForum(type){
  document.querySelectorAll(".forumTabs span").forEach(s => s.classList.remove("activeTab"));
  event.target.classList.add("activeTab");
  if(type === 'top'){
    currentPosts.sort((a,b) => b.comments - a.comments);
  } else if(type === 'none'){
    currentPosts.sort((a,b) => a.comments - b.comments);
  } else {
    currentPosts.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  }
  renderForum();
}

async function openPost(postId){
  currentPost = currentPosts.find(p => p.id === postId);
  if(!currentPost) return;

  if(db){
    db.from("posts").update({ views: (currentPost.views || 0) + 1 }).eq("id", postId).then();
  }

  document.getElementById("postCategory").textContent = currentPost.cat;
  document.getElementById("postTime").textContent = `${currentPost.time} · ${currentPost.user} (${currentPost.canton})`;
  document.getElementById("postTitle").textContent = currentPost.title;
  document.getElementById("postBody").innerHTML = currentPost.body.map(x => `<p>${x}</p>`).join("");
  document.getElementById("postCommentCount").textContent = currentPost.comments;

  await loadForumComments(currentPost.id);
  showPage("postdetail");
}

async function loadForumComments(postId){
  const container = document.getElementById("forumComments");
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
      <div class="forumCommentHead">${r.username} · ${r.canton} <span>· ${r.time}</span></div>
      <p>${r.content}</p>
      <div class="forumCommentActions">
        <span onclick="voteComment('${r.id||''}', 1, this)" style="cursor:pointer">Hilfreich (+${r.upvotes})</span>
      </div>
    </div>
  `).join("");
}

async function addForumComment(){
  const t = document.getElementById("newComment");
  const content = t.value.trim();
  if(!content || !currentPost) return;

  const payload = {
    post_id: currentPost.id,
    content: content,
    user_id: currentUser ? currentUser.id : null
  };
  await db.from("comments").insert([payload]);
  t.value = "";
  currentPost.comments++;
  document.getElementById("postCommentCount").textContent = currentPost.comments;
  await loadForumComments(currentPost.id);
  await loadForum();
}

async function voteComment(commentId, diff, el){
  if(!db) return;
  if(diff > 0){
    await db.rpc ? db.rpc('increment_upvote', { comment_id: commentId }) : null;
  }
  el.textContent = "Danke!";
}
