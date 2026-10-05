// AUTHENTIFIZIERUNG, PASSWORT-RESET, EINSTELLUNGEN & NUTZERPROFIL
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

  // Prüfe auf Passwort-Reset Token im URL Hash
  checkPasswordResetHash();

  db.auth.onAuthStateChange(async (event, session)=>{
    currentUser = session?.user || null;
    if(event === "PASSWORD_RECOVERY"){
      if(window.Router && typeof window.Router.navigate === "function"){
        window.Router.navigate("/passwort-zuruecksetzen");
      }
    }
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
    if(document.getElementById("settings") && document.getElementById("settings").classList.contains("active")){
      renderSettingsPage();
    }
  });
}

function checkPasswordResetHash(){
  const hash = window.location.hash;
  if(hash && hash.includes("type=recovery")){
    if(window.Router && typeof window.Router.navigate === "function"){
      window.Router.navigate("/passwort-zuruecksetzen");
    }
  }
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
      <a href="/suche" class="searchBtn" style="text-decoration:none;color:inherit" aria-label="Suche">Suche</a>
      <a href="/profil/${encodeURIComponent(currentProfile.username)}" style="color:var(--ink);font-weight:900;text-decoration:none">${safeUser} (${safeCanton})</a>
      <a href="/einstellungen" style="color:var(--muted);text-decoration:none;font-size:13px">Einstellungen</a>
      <span onclick="handleLogout()" style="color:var(--muted);cursor:pointer">Abmelden</span>
    `;
  } else {
    navAuth.innerHTML = `
      <a href="/suche" class="searchBtn" style="text-decoration:none;color:inherit" aria-label="Suche">Suche</a>
      <a href="/anmelden" style="text-decoration:none;color:inherit">Anmelden</a>
      <a href="/registrieren" style="text-decoration:none;color:var(--red);font-weight:900">Registrieren</a>
    `;
  }
}

async function handleLogin(){
  const emailOrUser = sanitizeText(document.getElementById("loginEmail").value, 100);
  const password = document.getElementById("loginPassword").value;
  const errDiv = document.getElementById("loginError");
  errDiv.textContent = "";

  if(!checkRateLimit("auth_login", 2000)) return;

  if(!emailOrUser || !password){
    errDiv.textContent = "Bitte E-Mail / Benutzername und Passwort eingeben.";
    return;
  }

  let email = emailOrUser;
  // Falls kein @ enthalten ist, suche E-Mail anhand des Benutzernamens
  if(!email.includes("@") && db){
    const { data: prof } = await db.from("profiles").select("id").eq("username", emailOrUser).single();
    if(!prof){
      errDiv.textContent = "E-Mail oder Passwort ist nicht korrekt.";
      return;
    }
  }

  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if(error){
    if(error.message.includes("Invalid login credentials")){
      errDiv.textContent = "E-Mail oder Passwort ist nicht korrekt.";
    } else if(error.message.includes("Email not confirmed")){
      errDiv.textContent = "Bitte bestätige zuerst deine E-Mail-Adresse.";
    } else {
      errDiv.textContent = "Anmeldung fehlgeschlagen: " + error.message;
    }
  } else {
    currentUser = data.user;
    await ensureProfileRecord(currentUser);
    await fetchProfile();
    updateNavAuth();
    showToast("Willkommen zurück, " + (currentProfile?.username || ""));
    if(window.Router && typeof window.Router.navigate === "function"){
      window.Router.navigate("/");
    } else {
      showPage("home");
    }
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
      errDiv.innerHTML = `Diese E-Mail ist bereits registriert. <a href="/anmelden" style="color:var(--red);font-weight:900">Hier anmelden</a>`;
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
    if(window.Router && typeof window.Router.navigate === "function"){
      window.Router.navigate("/");
    } else {
      showPage("home");
    }
  }
}

// 1. PASSWORT VERGESSEN REQUEST (NEUTRAL CONFIRMATION)
async function handleForgotPassword(){
  const email = sanitizeText(document.getElementById("forgotEmail").value, 100);
  const infoDiv = document.getElementById("forgotInfo");
  const errDiv = document.getElementById("forgotError");
  if(infoDiv) infoDiv.textContent = "";
  if(errDiv) errDiv.textContent = "";

  if(!checkRateLimit("forgot_password", 4000)) return;

  if(!email || !email.includes("@")){
    if(errDiv) errDiv.textContent = "Bitte gib eine gültige E-Mail-Adresse ein.";
    return;
  }

  try {
    if(db){
      await db.auth.resetPasswordForEmail(email, {
        redirectTo: `${SITE_URL}/passwort-zuruecksetzen`
      });
    }
  } catch(e){
    console.warn("Reset error:", e);
  }

  // Immer neutrale Bestätigung anzeigen zum Schutz der Privatsphäre
  if(infoDiv){
    infoDiv.innerHTML = `
      <div style="background:#f4f9f4;border:1px solid #c8e6c9;border-left:3px solid #2e7d32;padding:14px;margin-top:14px;color:#1b5e20;font-size:13px;line-height:1.5">
        Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde eine Nachricht mit einem sicheren Link zum Zurücksetzen des Passworts gesendet. Bitte prüfe auch deinen Spam-Ordner.
      </div>
    `;
  }
  document.getElementById("forgotEmail").value = "";
}

// 2. PASSWORT NEU SETZEN
async function handleResetPassword(){
  const p1 = document.getElementById("newResetPassword").value;
  const p2 = document.getElementById("newResetPasswordRepeat").value;
  const errDiv = document.getElementById("resetError");
  errDiv.textContent = "";

  if(!checkRateLimit("reset_password", 3000)) return;

  if(!p1 || p1.length < 6){
    errDiv.textContent = "Das Passwort muss mindestens 6 Zeichen lang sein.";
    return;
  }
  if(p1 !== p2){
    errDiv.textContent = "Die Passwörter stimmen nicht überein.";
    return;
  }

  if(!db){
    errDiv.textContent = "Datenbankverbindung nicht verfügbar.";
    return;
  }

  const { error } = await db.auth.updateUser({ password: p1 });
  if(error){
    errDiv.textContent = "Fehler beim Zurücksetzen: " + error.message;
  } else {
    showToast("Passwort erfolgreich geändert! Du bist nun eingeloggt.");
    if(window.Router && typeof window.Router.navigate === "function"){
      window.Router.navigate("/");
    } else {
      showPage("home");
    }
  }
}

async function handleLogout(){
  if(db) await db.auth.signOut();
  currentUser = null;
  currentProfile = null;
  updateNavAuth();
  showToast("Erfolgreich abgemeldet.");
  if(window.Router && typeof window.Router.navigate === "function"){
    window.Router.navigate("/");
  } else {
    showPage("home");
  }
}

// EINSTELLUNGEN SEITE
async function renderSettingsPage(){
  const unameInput = document.getElementById("settingsUsername");
  const cantonSelect = document.getElementById("settingsCanton");
  const emailInput = document.getElementById("settingsEmail");

  if(currentUser && currentProfile){
    if(unameInput) unameInput.value = currentProfile.username || "";
    if(cantonSelect) cantonSelect.value = currentProfile.canton || "CH";
    if(emailInput) emailInput.value = currentUser.email || "";
  } else {
    if(window.Router && typeof window.Router.navigate === "function"){
      window.Router.navigate("/anmelden");
    }
  }
}

async function saveProfileSettings(){
  if(!currentUser || !db) return;
  const newUsername = sanitizeText(document.getElementById("settingsUsername").value, 30);
  const newCanton = sanitizeText(document.getElementById("settingsCanton").value, 10);
  const errDiv = document.getElementById("settingsError");
  if(errDiv) errDiv.textContent = "";

  if(!newUsername || newUsername.length < 3){
    if(errDiv) errDiv.textContent = "Der Benutzername muss mindestens 3 Zeichen lang sein.";
    return;
  }

  try {
    await db.from("profiles").update({
      username: newUsername,
      canton: newCanton,
      avatar_initials: newUsername.substring(0, 2).toUpperCase()
    }).eq("id", currentUser.id);

    await db.auth.updateUser({
      data: { username: newUsername, canton: newCanton }
    });

    currentProfile.username = newUsername;
    currentProfile.canton = newCanton;
    currentProfile.avatar_initials = newUsername.substring(0, 2).toUpperCase();

    updateNavAuth();
    showToast("Profil-Einstellungen erfolgreich gespeichert!");
  } catch(e){
    if(errDiv) errDiv.textContent = "Fehler beim Speichern: " + e.message;
  }
}

async function changeAccountPassword(){
  if(!currentUser || !db) return;
  const newPass = document.getElementById("settingsNewPassword").value;
  const newPassRepeat = document.getElementById("settingsNewPasswordRepeat").value;
  const errDiv = document.getElementById("settingsPassError");
  if(errDiv) errDiv.textContent = "";

  if(!newPass || newPass.length < 6){
    if(errDiv) errDiv.textContent = "Das neue Passwort muss mindestens 6 Zeichen lang sein.";
    return;
  }
  if(newPass !== newPassRepeat){
    if(errDiv) errDiv.textContent = "Die Passwörter stimmen nicht überein.";
    return;
  }

  const { error } = await db.auth.updateUser({ password: newPass });
  if(error){
    if(errDiv) errDiv.textContent = "Fehler beim Ändern des Passworts: " + error.message;
  } else {
    document.getElementById("settingsNewPassword").value = "";
    document.getElementById("settingsNewPasswordRepeat").value = "";
    showToast("Passwort erfolgreich aktualisiert!");
  }
}

// KONTO LÖSCHEN (MODAL & CONFIRMATION)
function openDeleteAccountModal(){
  const modal = document.getElementById("deleteAccountModal");
  if(modal) modal.classList.add("open");
}

function closeDeleteAccountModal(){
  const modal = document.getElementById("deleteAccountModal");
  if(modal) modal.classList.remove("open");
}

async function confirmDeleteAccount(){
  if(!currentUser || !db) return;
  const confirmText = sanitizeText(document.getElementById("deleteConfirmInput").value, 50);
  const errDiv = document.getElementById("deleteAccountError");
  if(errDiv) errDiv.textContent = "";

  if(confirmText !== "KONTO LOESCHEN" && confirmText !== "KONTO LÖSCHEN"){
    if(errDiv) errDiv.textContent = "Bitte tippe genau 'KONTO LÖSCHEN' ein.";
    return;
  }

  try {
    // 1. Profil anonymisieren oder löschen
    await db.from("profiles").update({ username: "Gelöschtes Mitglied", canton: "CH" }).eq("id", currentUser.id);
    // 2. Auth signOut
    await db.auth.signOut();
    currentUser = null;
    currentProfile = null;
    closeDeleteAccountModal();
    updateNavAuth();
    showToast("Dein Konto wurde erfolgreich gelöscht.");
    if(window.Router && typeof window.Router.navigate === "function"){
      window.Router.navigate("/");
    } else {
      showPage("home");
    }
  } catch(e){
    if(errDiv) errDiv.textContent = "Fehler beim Löschen: " + e.message;
  }
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

    let userPolls = [];
    let userPosts = [];
    let userComments = [];

    if(db){
      const { data: pData } = await db.from("polls").select("id, title, category, created_at").eq("user_id", currentUser.id);
      if(pData) userPolls = pData;
      const { data: poData } = await db.from("posts").select("id, title, category, created_at").eq("user_id", currentUser.id);
      if(poData) userPosts = poData;
      const { data: cData } = await db.from("comments").select("id, content, created_at").eq("user_id", currentUser.id);
      if(cData) userComments = cData;
    }

    profPollsCount.textContent = userPolls.length;
    profPostsCount.textContent = userPosts.length;
    profCommentsCount.textContent = userComments.length;

    let activityHTML = "";
    if(userPosts.length > 0){
      activityHTML += userPosts.map(p => `
        <article class="feedItem">
          <div class="meta">${escapeHTML(formatTimeAgo(p.created_at))} · Beitrag</div>
          <h2><a href="/beitrag/${slugify(p.title)}" style="color:inherit;text-decoration:none">${escapeHTML(p.title)}</a></h2>
        </article>
      `).join("");
    }
    if(userPolls.length > 0){
      activityHTML += userPolls.map(p => `
        <article class="feedItem">
          <div class="meta">${escapeHTML(formatTimeAgo(p.created_at))} · Abstimmung</div>
          <h2><a href="/frage/${slugify(p.title)}" style="color:inherit;text-decoration:none">${escapeHTML(p.title)}</a></h2>
        </article>
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
      <p style="color:#777;padding:20px 0">Du bist als Gast unterwegs. <a href="/anmelden" class="category" style="font-weight:900">Jetzt anmelden</a> oder <a href="/registrieren" class="category" style="font-weight:900">Registrieren</a> um ein Profil zu erstellen.</p>
    `;
  }
}

async function renderPublicProfile(username){
  const profAvatar = document.getElementById("profAvatar");
  const profUsername = document.getElementById("profUsername");
  const profMeta = document.getElementById("profMeta");
  const profPollsCount = document.getElementById("profPollsCount");
  const profPostsCount = document.getElementById("profPostsCount");
  const profCommentsCount = document.getElementById("profCommentsCount");
  const profActivity = document.getElementById("profileActivity");

  const cleanUser = sanitizeText(username, 30);
  profAvatar.textContent = cleanUser.substring(0, 2).toUpperCase();
  profUsername.textContent = cleanUser;
  profMeta.textContent = "Schweiz · Community-Mitglied";

  let posts = [];
  if(db){
    const { data } = await db.from("posts").select("id, title, category, created_at, profiles(username)").limit(20);
    if(data) posts = data.filter(p => p.profiles?.username?.toLowerCase() === cleanUser.toLowerCase());
  }

  profPostsCount.textContent = posts.length;
  profPollsCount.textContent = "0";
  profCommentsCount.textContent = "0";

  if(posts.length > 0){
    profActivity.innerHTML = posts.map(p => `
      <article class="feedItem">
        <div class="meta">${escapeHTML(formatTimeAgo(p.created_at))} · Beitrag</div>
        <h2><a href="/beitrag/${slugify(p.title)}" style="color:inherit;text-decoration:none">${escapeHTML(p.title)}</a></h2>
      </article>
    `).join("");
  } else {
    profActivity.innerHTML = `<p style="color:#777;padding:20px 0">Keine öffentlichen Beiträge von ${escapeHTML(cleanUser)} gefunden.</p>`;
  }
}
