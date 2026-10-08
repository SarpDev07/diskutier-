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
    await mergeAnonymousVotes(currentUser.id);
  }
  updateNavAuth();

  // Prüfe auf Passwort-Reset Token im URL Hash
  checkPasswordResetHash();

  db.auth.onAuthStateChange(async (event, session)=>{
    const previousUser = currentUser;
    currentUser = session?.user || null;
    if(event === "PASSWORD_RECOVERY"){
      if(window.Router && typeof window.Router.navigate === "function"){
        window.Router.navigate("/passwort-zuruecksetzen");
      }
    }
    if(currentUser){
      await ensureProfileRecord(currentUser);
      await fetchProfile();
      if(!previousUser || previousUser.id !== currentUser.id){
        await mergeAnonymousVotes(currentUser.id);
      }
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
    if(typeof loadPolls === 'function'){
      loadPolls();
    }
  });
}

// ZUSAMMENFÜHRUNG ANONYMER GAST-STIMMEN IN DAS BENUTZERKONTO
async function mergeAnonymousVotes(userId){
  if(!userId || !db) return;
  const guestSession = getGuestSession();
  let localVotes = {};
  try {
    localVotes = JSON.parse(localStorage.getItem("diskutier_poll_votes") || "{}");
  } catch(e){}

  const pollKeys = Object.keys(localVotes);

  try {
    // 1. Hole alle Stimmen, die unter dieser Gast-Session in Supabase liegen
    const { data: guestDbVotes } = await db.from("poll_votes").select("*").eq("session_token", guestSession);
    
    // 2. Hole bestehende Stimmen des Nutzers
    const { data: existingUserVotes } = await db.from("poll_votes").select("poll_id").eq("user_id", userId);
    const existingPollIds = new Set((existingUserVotes || []).map(v => v.poll_id));

    let mergedCount = 0;

    // A. Übernehme DB-Gaststimmen
    if(guestDbVotes && guestDbVotes.length > 0){
      for(const gv of guestDbVotes){
        if(!existingPollIds.has(gv.poll_id)){
          await db.from("poll_votes").update({ user_id: userId, session_token: null }).eq("id", gv.id);
          existingPollIds.add(gv.poll_id);
          mergedCount++;
        } else {
          // Bereits vorhanden -> Duplikat-Gaststimme bereinigen
          await db.from("poll_votes").delete().eq("id", gv.id);
        }
      }
    }

    // B. Übernehme lokale Stimmen, die evtl. noch nicht in der DB waren
    for(const pollIdOrTitle of pollKeys){
      const optionIndex = localVotes[pollIdOrTitle];
      if(optionIndex !== undefined && pollIdOrTitle.length === 36 && !existingPollIds.has(pollIdOrTitle)){
        await db.from("poll_votes").upsert({
          poll_id: pollIdOrTitle,
          option_index: optionIndex,
          user_id: userId,
          session_token: null
        }, { onConflict: 'poll_id,user_id' });
        existingPollIds.add(pollIdOrTitle);
        mergedCount++;
      }
    }

    if(mergedCount > 0){
      console.info(`[Auth] ${mergedCount} anonyme Stimmen erfolgreich zusammengeführt.`);
      if(window.GA && typeof window.GA.trackAnonymousVotesMerged === 'function'){
        window.GA.trackAnonymousVotesMerged({ voteCount: mergedCount });
      }
      showToast(`🇨🇭 ${mergedCount} vorherige Abstimmungen in dein Profil übernommen!`);
    }
  } catch(e){
    console.warn("Vote merge error:", e);
  }
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
    
    // GA4 Login Event (keine PII)
    if(window.GA && typeof window.GA.trackLogin === 'function'){
      window.GA.trackLogin({ method: 'email' });
    }

    const redirectPath = sessionStorage.getItem("diskutier_auth_redirect");
    if(redirectPath){
      sessionStorage.removeItem("diskutier_auth_redirect");
      if(window.Router && typeof window.Router.navigate === "function"){
        window.Router.navigate(redirectPath);
      } else {
        showPage(redirectPath.replace("/", "") || "home");
      }
      if(typeof restoreCreateDraft === 'function'){
        restoreCreateDraft();
      }
    } else if(window.Router && typeof window.Router.navigate === "function"){
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
    
    // GA4 Key Event: sign_up (keine PII)
    if(window.GA && typeof window.GA.trackSignUp === 'function'){
      window.GA.trackSignUp({ method: 'email', sourcePage: sessionStorage.getItem("diskutier_auth_redirect") || '/' });
    }

    const redirectPath = sessionStorage.getItem("diskutier_auth_redirect");
    if(redirectPath){
      sessionStorage.removeItem("diskutier_auth_redirect");
      if(window.Router && typeof window.Router.navigate === "function"){
        window.Router.navigate(redirectPath);
      } else {
        showPage(redirectPath.replace("/", "") || "home");
      }
      if(typeof restoreCreateDraft === 'function'){
        restoreCreateDraft();
      }
    } else if(window.Router && typeof window.Router.navigate === "function"){
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

// GOOGLE & APPLE OAUTH AUTHENTIFIZIERUNG
async function signInWithGoogle(){
  if(!db) return;
  if(window.GA && typeof window.GA.trackAuthStart === 'function'){
    window.GA.trackAuthStart({ method: 'google', trigger: 'oauth_button' });
  }
  const redirectUrl = window.location.origin + '/schweiz-match';
  try {
    const { error } = await db.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });
    if(error){
      showToast("Google-Anmeldung: " + error.message);
    }
  } catch(e){
    console.warn("Google OAuth error:", e);
    showToast("Google-Anmeldung momentan nicht erreichbar.");
  }
}

async function signInWithApple(){
  if(!db) return;
  if(window.GA && typeof window.GA.trackAuthStart === 'function'){
    window.GA.trackAuthStart({ method: 'apple', trigger: 'oauth_button' });
  }
  const redirectUrl = window.location.origin + '/schweiz-match';
  try {
    const { error } = await db.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: redirectUrl
      }
    });
    if(error){
      if(error.message && (error.message.includes("provider is not enabled") || error.message.includes("unsupported"))){
        showToast("Apple-Login wird derzeit für dieses Projekt eingerichtet. Bitte nutze Google oder E-Mail.");
      } else {
        showToast("Apple-Anmeldung: " + error.message);
      }
    }
  } catch(e){
    console.warn("Apple OAuth error:", e);
    showToast("Apple-Anmeldung momentan nicht erreichbar.");
  }
}

// MODAL FÜR KONTO-PFLICHT (SCHWEIZ-MATCH SICHERN, POSTEN & KOMMENTIEREN)
function openAuthRequiredModal(customMessage, options = {}){
  let modal = document.getElementById("authRequiredModal");
  if(!modal){
    createAuthModalDOM();
    modal = document.getElementById("authRequiredModal");
  }

  const msgEl = document.getElementById("authRequiredMsg");
  if(msgEl && customMessage){
    msgEl.textContent = customMessage;
  }

  modal.classList.add("open");
  document.body.style.overflow = "hidden";

  // GA4 login_prompt_view Tracking
  if(window.GA && typeof window.GA.trackLoginPromptView === 'function'){
    const trigger = (options && options.trigger) ? options.trigger : "swiss_match_save";
    const pollId = (options && options.pollId) ? options.pollId : (window.currentPoll ? window.currentPoll.id : "");
    window.GA.trackLoginPromptView({
      trigger: trigger,
      pollId: pollId,
      pagePath: window.location.pathname
    });
  }
}

function closeAuthRequiredModal(){
  const modal = document.getElementById("authRequiredModal");
  if(modal) modal.classList.remove("open");
  document.body.style.overflow = "";
}

function createAuthModalDOM(){
  if(document.getElementById("authRequiredModal")) return;
  const modal = document.createElement("div");
  modal.id = "authRequiredModal";
  modal.className = "authModalOverlay";
  modal.innerHTML = `
    <div class="authModalCard">
      <div class="authModalHeader">
        <div>
          <div class="eyebrow" style="color:var(--red);margin-bottom:4px">Dein Schweiz-Match 🇨🇭</div>
          <h2 style="font-size:20px;margin:0;font-weight:800">Meinungsprofil speichern</h2>
        </div>
        <button class="authCloseBtn" onclick="closeAuthRequiredModal()" aria-label="Schliessen">&times;</button>
      </div>
      <div class="authModalBody">
        <p id="authRequiredMsg" style="font-size:14px;color:#444;margin:0 0 16px;line-height:1.55">
          Speichere deine bisherigen Antworten dauerhaft, um deinen persönlichen Schweiz-Match zu behalten und mit neuen Fragen weiterzuentwickeln.
        </p>

        <!-- 1-Click Social Logins -->
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:18px">
          <button class="oauthBtn googleBtn" onclick="signInWithGoogle()">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
            Mit Google fortfahren
          </button>
          <button class="oauthBtn appleBtn" onclick="signInWithApple()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.65-.79 1.09-1.9 0.97-3.01-.94.04-2.08.63-2.75 1.42-.59.68-1.11 1.79-.97 2.86 1.05.08 2.13-.53 2.75-1.27z"/></svg>
            Mit Apple fortfahren
          </button>
        </div>

        <div style="display:flex;align-items:center;margin:12px 0 16px;color:#888;font-size:12px;text-align:center">
          <div style="flex:1;height:1px;background:#e0dfdb"></div>
          <span style="padding:0 10px;text-transform:uppercase;font-weight:700">oder mit E-Mail</span>
          <div style="flex:1;height:1px;background:#e0dfdb"></div>
        </div>

        <div style="background:#fafafa;border:1px solid #e0dfdb;padding:12px 14px;border-radius:var(--radius);margin-bottom:16px">
          <div style="font-size:12px;font-weight:800;color:var(--ink);margin-bottom:4px">Deine Vorteile:</div>
          <ul style="margin:0;padding-left:16px;font-size:12px;color:#555;line-height:1.55">
            <li>Alle deine anonymen Stimmen werden automatisch übernommen</li>
            <li>Dauerhafter Schweiz-Match & Vergleich mit der Community</li>
            <li>Eigene Abstimmungen & Foren-Themen erstellen</li>
          </ul>
        </div>
      </div>
      <div class="authModalFooter">
        <button class="smallbtn" style="color:#666;font-weight:800;padding:11px 14px" onclick="closeAuthRequiredModal()">Abbrechen</button>
        <button class="smallbtn" style="border:1px solid #bbb;font-weight:900;padding:11px 16px;border-radius:var(--radius);color:var(--ink)" onclick="closeAuthRequiredModal(); if(window.Router && window.Router.navigate) window.Router.navigate('/anmelden'); else window.location.href='/anmelden';">E-Mail Login</button>
        <button class="publish" style="margin-top:0;padding:11px 18px" onclick="closeAuthRequiredModal(); if(window.Router && window.Router.navigate) window.Router.navigate('/registrieren'); else window.location.href='/registrieren';">Konto erstellen &rarr;</button>
      </div>
    </div>
  `;

  modal.addEventListener("click", (e) => {
    if(e.target === modal) closeAuthRequiredModal();
  });

  document.body.appendChild(modal);
}

// Global verfügbar
window.openAuthRequiredModal = openAuthRequiredModal;
window.closeAuthRequiredModal = closeAuthRequiredModal;
window.signInWithGoogle = signInWithGoogle;
window.signInWithApple = signInWithApple;
window.mergeAnonymousVotes = mergeAnonymousVotes;


