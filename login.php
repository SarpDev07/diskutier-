<?php
// Standalone Login Seite fuer diskutier.ch
?>
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-Content-Type-Options" content="nosniff">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <title>Anmelden — diskutier.ch</title>
  <link rel="stylesheet" href="css/style.css">
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>

<header>
  <div class="nav">
    <div class="logo" onclick="location.href='index.html'">diskutier<b>.ch</b></div>
    <nav class="navlinks">
      <span onclick="location.href='index.html#home'">Abstimmungen</span>
      <span onclick="location.href='index.html#forum'">Beiträge</span>
      <span onclick="location.href='index.html#categories'">Kategorien</span>
    </nav>
    <button class="ask" onclick="location.href='index.html#create'">Beitrag erstellen</button>
    <div class="auth">
      <span onclick="location.href='register.php'">Registrieren</span>
    </div>
  </div>
</header>

<div class="shell" style="grid-template-columns:1fr;max-width:480px;padding-top:40px">
  <main>
    <div class="authbox">
      <div class="eyebrow">Konto</div>
      <h1>Anmelden</h1>
      <label style="font-size:12px;font-weight:900;text-transform:uppercase;margin:12px 0 4px;display:block">E-Mail</label>
      <input id="loginEmail" type="email" maxlength="100" placeholder="deine.email@beispiel.ch" autofocus>
      
      <label style="font-size:12px;font-weight:900;text-transform:uppercase;margin:12px 0 4px;display:block">Passwort</label>
      <input id="loginPassword" type="password" maxlength="100" placeholder="••••••••">
      
      <div id="loginError" class="authMsg"></div>
      <button onclick="handleStandaloneLogin()">Anmelden</button>
      
      <p class="meta" style="margin-top:20px">
        Noch kein Konto? <a href="register.php" class="category" style="cursor:pointer;font-weight:900;text-decoration:none">Jetzt registrieren</a>
      </p>
    </div>
  </main>
</div>

<nav class="mobileNav">
  <button onclick="location.href='index.html#home'">Abstimmen</button>
  <button onclick="location.href='index.html#forum'">Beiträge</button>
  <button onclick="location.href='index.html#create'">Erstellen</button>
  <button onclick="location.href='index.html#search'">Suche</button>
  <button class="active" onclick="location.href='login.php'">Anmelden</button>
</nav>

<script src="js/supabase-config.js"></script>
<script src="js/auth.js"></script>
<script>
async function handleStandaloneLogin(){
  const email = sanitizeText(document.getElementById("loginEmail").value, 100);
  const password = document.getElementById("loginPassword").value;
  const errDiv = document.getElementById("loginError");
  errDiv.textContent = "";

  if(!checkRateLimit("standalone_login", 2000)) return;

  if(!email || !password){
    errDiv.textContent = "Bitte E-Mail und Passwort eingeben.";
    return;
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
    location.href = "index.html";
  }
}
</script>
</body>
</html>
