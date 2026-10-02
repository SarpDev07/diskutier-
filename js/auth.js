// AUTHENTIFIZIERUNG & NUTZERPROFIL
let currentUser = null;
let currentProfile = null;

async function initAuth(){
  if(!db) return;
  const { data: { session } } = await db.auth.getSession();
  if(session?.user){
    currentUser = session.user;
    await fetchProfile();
  }
  updateNavAuth();

  db.auth.onAuthStateChange(async (event, session)=>{
    currentUser = session?.user || null;
    if(currentUser){
      await fetchProfile();
    } else {
      currentProfile = null;
    }
    updateNavAuth();
    if(document.getElementById("profile").classList.contains("active")){
      renderProfilePage();
    }
  });
}

async function fetchProfile(){
  if(!currentUser || !db) return;
  const { data } = await db.from("profiles").select("*").eq("id", currentUser.id).single();
  if(data){
    currentProfile = data;
  } else {
    currentProfile = {
      username: currentUser.user_metadata?.username || currentUser.email.split("@")[0],
      canton: currentUser.user_metadata?.canton || "CH",
      avatar_initials: (currentUser.user_metadata?.username || currentUser.email).substring(0,2).toUpperCase()
    };
  }
}

function updateNavAuth(){
  const navAuth = document.getElementById("navAuth");
  if(currentUser && currentProfile){
    navAuth.innerHTML = `
      <button class="searchBtn" onclick="showPage('search')" aria-label="Suche">Suche</button>
      <span onclick="showPage('profile')" style="color:var(--ink);font-weight:900">${currentProfile.username} (${currentProfile.canton||'CH'})</span>
      <span onclick="handleLogout()" style="color:var(--muted)">Abmelden</span>
    `;
  } else {
    navAuth.innerHTML = `
      <button class="searchBtn" onclick="showPage('search')" aria-label="Suche">Suche</button>
      <span onclick="showPage('login')">Anmelden</span>
      <span onclick="showPage('register')">Registrieren</span>
    `;
  }
}

async function handleLogin(){
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const errDiv = document.getElementById("loginError");
  errDiv.textContent = "";
  if(!email || !password){
    errDiv.textContent = "Bitte E-Mail und Passwort eingeben.";
    return;
  }
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if(error){
    if(error.message.includes("Invalid login credentials")){
      errDiv.textContent = "E-Mail oder Passwort ist nicht korrekt.";
    } else if(error.message.includes("Email not confirmed")){
      errDiv.textContent = "Bitte bestätige zuerst deine E-Mail-Adresse (oder deaktiviere E-Mail-Bestätigung in Supabase).";
    } else {
      errDiv.textContent = "Anmeldung fehlgeschlagen: " + error.message;
    }
  } else {
    currentUser = data.user;
    await fetchProfile();
    updateNavAuth();
    showToast("Willkommen zurück, " + (currentProfile?.username || ""));
    showPage("home");
  }
}

async function handleRegister(){
  const username = document.getElementById("regUsername").value.trim();
  const canton = document.getElementById("regCanton").value;
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const errDiv = document.getElementById("regError");
  errDiv.textContent = "";
  if(!username || !email || !password){
    errDiv.textContent = "Bitte alle Pflichtfelder ausfüllen.";
    return;
  }
  if(password.length < 6){
    errDiv.textContent = "Das Passwort muss mindestens 6 Zeichen lang sein.";
    return;
  }
  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: {
      data: { username, canton }
    }
  });
  if(error){
    errDiv.textContent = "Registrierung fehlgeschlagen: " + error.message;
  } else {
    if(data.session){
      currentUser = data.user;
      await fetchProfile();
      updateNavAuth();
      showToast("Konto erfolgreich erstellt! Du bist jetzt eingeloggt.");
      showPage("home");
    } else {
      currentUser = data.user;
      await fetchProfile();
      updateNavAuth();
      showToast("Konto erstellt! Du bist jetzt eingeloggt.");
      showPage("home");
    }
  }
}

async function handleLogout(){
  if(db) await db.auth.signOut();
  currentUser = null;
  currentProfile = null;
  updateNavAuth();
  showPage("home");
}

async function renderProfilePage(){
  if(currentUser && currentProfile){
    document.getElementById("profAvatar").textContent = currentProfile.avatar_initials || currentProfile.username.substring(0,2).toUpperCase();
    document.getElementById("profUsername").textContent = currentProfile.username;
    document.getElementById("profMeta").textContent = `${currentProfile.canton || 'Schweiz'} · Mitglied`;

    const { data: userPolls } = await db.from("polls").select("id, title, category, created_at").eq("user_id", currentUser.id);
    const { data: userPosts } = await db.from("posts").select("id, title, category, created_at").eq("user_id", currentUser.id);
    const { data: userComments } = await db.from("comments").select("id, content, created_at").eq("user_id", currentUser.id);

    document.getElementById("profPollsCount").textContent = userPolls ? userPolls.length : 0;
    document.getElementById("profPostsCount").textContent = userPosts ? userPosts.length : 0;
    document.getElementById("profCommentsCount").textContent = userComments ? userComments.length : 0;

    let activityHTML = "";
    if(userPosts && userPosts.length > 0){
      activityHTML += userPosts.map(p => `
        <div class="feedItem" onclick="openPost('${p.id}')">
          <div class="meta">${formatTimeAgo(p.created_at)} · Beitrag</div>
          <h2>${p.title}</h2>
        </div>
      `).join("");
    }
    if(userPolls && userPolls.length > 0){
      activityHTML += userPolls.map(p => `
        <div class="feedItem" onclick="openPollDetail('${p.id}')">
          <div class="meta">${formatTimeAgo(p.created_at)} · Abstimmung</div>
          <h2>${p.title}</h2>
        </div>
      `).join("");
    }
    if(!activityHTML){
      activityHTML = '<p style="color:#777;padding:20px 0">Noch keine Aktivitäten. Erstelle deinen ersten Beitrag oder stimme ab!</p>';
    }
    document.getElementById("profileActivity").innerHTML = activityHTML;
  } else {
    document.getElementById("profAvatar").textContent = "?";
    document.getElementById("profUsername").textContent = "Gast";
    document.getElementById("profMeta").textContent = "Nicht angemeldet";
    document.getElementById("profPollsCount").textContent = "0";
    document.getElementById("profPostsCount").textContent = "0";
    document.getElementById("profCommentsCount").textContent = "0";
    document.getElementById("profileActivity").innerHTML = `
      <p style="color:#777;padding:20px 0">Du bist als Gast unterwegs. <span class="category" onclick="showPage('login')" style="cursor:pointer;font-weight:900">Jetzt anmelden</span> oder <span class="category" onclick="showPage('register')" style="cursor:pointer;font-weight:900">Registrieren</span> um ein Profil zu erstellen.</p>
    `;
  }
}
