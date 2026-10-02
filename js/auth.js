// AUTHENTIFIZIERUNG & NUTZERPROFIL
let currentUser = null;
let currentProfile = null;

async function initAuth(){
  if(!db) return;
  const { data: { session } } = await db.auth.getSession();
  if(session?.user){
    currentUser = session.user;
    await ensureProfileRecord(currentUser);
    await fetchProfile();
  }
  updateNavAuth();

  db.auth.onAuthStateChange(async (event, session)=>{
    currentUser = session?.user || null;
    if(currentUser){
      await ensureProfileRecord(currentUser);
      await fetchProfile();
    } else {
      currentProfile = null;
    }
    updateNavAuth();
    if(document.getElementById("profile") && document.getElementById("profile").classList.contains("active")){
      renderProfilePage();
    }
  });
}

async function ensureProfileRecord(user, overrideUsername = null, overrideCanton = null){
  if(!user || !db) return;
  const uname = overrideUsername || user.user_metadata?.username || user.email?.split("@")[0] || "User";
  const ucanton = overrideCanton || user.user_metadata?.canton || "CH";
  const initials = uname.substring(0,2).toUpperCase();
  
  try {
    await db.from("profiles").upsert({
      id: user.id,
      username: sanitizeText(uname, 30),
      canton: sanitizeText(ucanton, 10),
      avatar_initials: sanitizeText(initials, 4)
    }, { onConflict: 'id' });
  } catch(e) {
    console.warn("Profile sync:", e);
  }
}

async function fetchProfile(){
  if(!currentUser || !db) return;
  const { data } = await db.from("profiles").select("*").eq("id", currentUser.id).single();
  if(data){
    currentProfile = {
      username: sanitizeText(data.username, 30),
      canton: sanitizeText(data.canton, 10),
      avatar_initials: sanitizeText(data.avatar_initials, 4)
    };
  } else {
    const rawUsername = currentUser.user_metadata?.username || currentUser.email.split("@")[0];
    currentProfile = {
      username: sanitizeText(rawUsername, 30),
      canton: sanitizeText(currentUser.user_metadata?.canton || "CH", 10),
      avatar_initials: sanitizeText(rawUsername.substring(0,2).toUpperCase(), 2)
    };
    await ensureProfileRecord(currentUser);
  }
}

function updateNavAuth(){
  const navAuth = document.getElementById("navAuth");
  if(!navAuth) return;

  if(currentUser && currentProfile){
    const safeUser = escapeHTML(currentProfile.username);
    const safeCanton = escapeHTML(currentProfile.canton || 'CH');
    navAuth.innerHTML = `
      <button class="searchBtn" onclick="showPage('search')" aria-label="Suche">Suche</button>
      <span onclick="showPage('profile')" style="color:var(--ink);font-weight:900">${safeUser} (${safeCanton})</span>
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
  const email = sanitizeText(document.getElementById("loginEmail").value, 100);
  const password = document.getElementById("loginPassword").value;
  const errDiv = document.getElementById("loginError");
  errDiv.textContent = "";

  if(!checkRateLimit("auth_login", 2000)) return;

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
    await ensureProfileRecord(currentUser);
    await fetchProfile();
    updateNavAuth();
    showToast("Willkommen zurück, " + (currentProfile?.username || ""));
    showPage("home");
  }
}

async function handleRegister(){
  const username = sanitizeText(document.getElementById("regUsername").value, 30);
  const canton = sanitizeText(document.getElementById("regCanton").value, 10);
  const email = sanitizeText(document.getElementById("regEmail").value, 100);
  const password = document.getElementById("regPassword").value;
  const errDiv = document.getElementById("regError");
  errDiv.innerHTML = "";

  if(!checkRateLimit("auth_register", 3000)) return;

  if(!username || !email || !password){
    errDiv.textContent = "Bitte alle Pflichtfelder ausfüllen.";
    return;
  }
  if(username.length < 3 || username.length > 25){
    errDiv.textContent = "Der Benutzername muss zwischen 3 und 25 Zeichen lang sein.";
    return;
  }
  if(!/^[a-zA-Z0-9_\-\. öäüÖÄÜéèà]+$/.test(username)){
    errDiv.textContent = "Ungültige Sonderzeichen im Benutzernamen.";
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
    if(error.message.includes("User already registered") || error.message.includes("already registered")){
      errDiv.innerHTML = `Diese E-Mail ist bereits registriert. <a href="#" onclick="showPage('login');return false;" style="color:var(--red);font-weight:900">Hier anmelden</a>`;
    } else {
      errDiv.textContent = "Registrierung fehlgeschlagen: " + error.message;
    }
  } else {
    currentUser = data.user;
    if(currentUser){
      await ensureProfileRecord(currentUser, username, canton);
    }
    await fetchProfile();
    updateNavAuth();
    showToast("Konto erfolgreich erstellt! Du bist jetzt eingeloggt.");
    showPage("home");
  }
}

async function handleLogout(){
  if(db) await db.auth.signOut();
  currentUser = null;
  currentProfile = null;
  updateNavAuth();
  showToast("Erfolgreich abgemeldet.");
  showPage("home");
}

async function renderProfilePage(){
  const profAvatar = document.getElementById("profAvatar");
  const profUsername = document.getElementById("profUsername");
  const profMeta = document.getElementById("profMeta");
  const profPollsCount = document.getElementById("profPollsCount");
  const profPostsCount = document.getElementById("profPostsCount");
  const profCommentsCount = document.getElementById("profCommentsCount");
  const profActivity = document.getElementById("profileActivity");

  if(currentUser && currentProfile){
    profAvatar.textContent = currentProfile.avatar_initials || currentProfile.username.substring(0,2).toUpperCase();
    profUsername.textContent = currentProfile.username;
    profMeta.textContent = `${currentProfile.canton || 'Schweiz'} · Mitglied`;

    const { data: userPolls } = await db.from("polls").select("id, title, category, created_at").eq("user_id", currentUser.id);
    const { data: userPosts } = await db.from("posts").select("id, title, category, created_at").eq("user_id", currentUser.id);
    const { data: userComments } = await db.from("comments").select("id, content, created_at").eq("user_id", currentUser.id);

    profPollsCount.textContent = userPolls ? userPolls.length : 0;
    profPostsCount.textContent = userPosts ? userPosts.length : 0;
    profCommentsCount.textContent = userComments ? userComments.length : 0;

    let activityHTML = "";
    if(userPosts && userPosts.length > 0){
      activityHTML += userPosts.map(p => `
        <div class="feedItem" onclick="openPost('${escapeHTML(p.id)}')">
          <div class="meta">${escapeHTML(formatTimeAgo(p.created_at))} · Beitrag</div>
          <h2>${escapeHTML(p.title)}</h2>
        </div>
      `).join("");
    }
    if(userPolls && userPolls.length > 0){
      activityHTML += userPolls.map(p => `
        <div class="feedItem" onclick="openPollDetail('${escapeHTML(p.id)}')">
          <div class="meta">${escapeHTML(formatTimeAgo(p.created_at))} · Abstimmung</div>
          <h2>${escapeHTML(p.title)}</h2>
        </div>
      `).join("");
    }
    if(!activityHTML){
      activityHTML = '<p style="color:#777;padding:20px 0">Noch keine Aktivitäten. Erstelle deinen ersten Beitrag oder stimme ab!</p>';
    }
    profActivity.innerHTML = activityHTML;
  } else {
    profAvatar.textContent = "?";
    profUsername.textContent = "Gast";
    profMeta.textContent = "Nicht angemeldet";
    profPollsCount.textContent = "0";
    profPostsCount.textContent = "0";
    profCommentsCount.textContent = "0";
    profActivity.innerHTML = `
      <p style="color:#777;padding:20px 0">Du bist als Gast unterwegs. <span class="category" onclick="showPage('login')" style="cursor:pointer;font-weight:900">Jetzt anmelden</span> oder <span class="category" onclick="showPage('register')" style="cursor:pointer;font-weight:900">Registrieren</span> um ein Profil zu erstellen.</p>
    `;
  }
}
