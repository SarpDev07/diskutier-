<?php
// Standalone Registrierungs-Seite fuer diskutier.ch
?>
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-Content-Type-Options" content="nosniff">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <title>Registrieren — diskutier.ch</title>
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
      <span onclick="location.href='login.php'">Anmelden</span>
    </div>
  </div>
</header>

<div class="shell" style="grid-template-columns:1fr;max-width:480px;padding-top:40px">
  <main>
    <div class="authbox">
      <div class="eyebrow">Community</div>
      <h1>Mitdiskutieren.</h1>
      
      <label style="font-size:12px;font-weight:900;text-transform:uppercase;margin:12px 0 4px;display:block">Benutzername</label>
      <input id="regUsername" maxlength="25" placeholder="z. B. AlpenFuchs" autofocus>
      
      <label style="font-size:12px;font-weight:900;text-transform:uppercase;margin:12px 0 4px;display:block">Dein Kanton</label>
      <select id="regCanton" style="width:100%;padding:13px;margin:6px 0;border:1px solid #aaa;background:white">
        <option value="ZH">Zürich (ZH)</option>
        <option value="BE">Bern (BE)</option>
        <option value="LU">Luzern (LU)</option>
        <option value="UR">Uri (UR)</option>
        <option value="SZ">Schwyz (SZ)</option>
        <option value="OW">Obwalden (OW)</option>
        <option value="NW">Nidwalden (NW)</option>
        <option value="GL">Glarus (GL)</option>
        <option value="ZG">Zug (ZG)</option>
        <option value="FR">Freiburg (FR)</option>
        <option value="SO">Solothurn (SO)</option>
        <option value="BS">Basel-Stadt (BS)</option>
        <option value="BL">Basel-Landschaft (BL)</option>
        <option value="SH">Schaffhausen (SH)</option>
        <option value="AR">Appenzell A.Rh. (AR)</option>
        <option value="AI">Appenzell I.Rh. (AI)</option>
        <option value="SG">St. Gallen (SG)</option>
        <option value="GR">Graubünden (GR)</option>
        <option value="AG">Aargau (AG)</option>
        <option value="TG">Thurgau (TG)</option>
        <option value="TI">Tessin (TI)</option>
        <option value="VD">Waadt (VD)</option>
        <option value="VS">Wallis (VS)</option>
        <option value="NE">Neuenburg (NE)</option>
        <option value="GE">Genf (GE)</option>
        <option value="JU">Jura (JU)</option>
        <option value="CH" selected>Ganze Schweiz (CH)</option>
      </select>
      
      <label style="font-size:12px;font-weight:900;text-transform:uppercase;margin:12px 0 4px;display:block">E-Mail</label>
      <input id="regEmail" type="email" maxlength="100" placeholder="deine.email@beispiel.ch">
      
      <label style="font-size:12px;font-weight:900;text-transform:uppercase;margin:12px 0 4px;display:block">Passwort (mind. 6 Zeichen)</label>
      <input id="regPassword" type="password" maxlength="100" placeholder="••••••••">
      
      <div id="regError" class="authMsg"></div>
      <button onclick="handleStandaloneRegister()">Konto erstellen</button>
      
      <p class="meta" style="margin-top:20px">
        Bereits registriert? <a href="login.php" class="category" style="cursor:pointer;font-weight:900;text-decoration:none">Hier anmelden</a>
      </p>
    </div>
  </main>
</div>

<nav class="mobileNav">
  <button onclick="location.href='index.html#home'">Abstimmen</button>
  <button onclick="location.href='index.html#forum'">Beiträge</button>
  <button onclick="location.href='index.html#create'">Erstellen</button>
  <button onclick="location.href='index.html#search'">Suche</button>
  <button class="active" onclick="location.href='register.php'">Registrieren</button>
</nav>

<script src="js/supabase-config.js"></script>
<script src="js/auth.js"></script>
<script>
async function handleStandaloneRegister(){
  const username = sanitizeText(document.getElementById("regUsername").value, 25);
  const canton = sanitizeText(document.getElementById("regCanton").value, 10);
  const email = sanitizeText(document.getElementById("regEmail").value, 100);
  const password = document.getElementById("regPassword").value;
  const errDiv = document.getElementById("regError");
  errDiv.textContent = "";

  if(!checkRateLimit("standalone_register", 3000)) return;

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
    errDiv.textContent = "Registrierung fehlgeschlagen: " + error.message;
  } else {
    location.href = "index.html";
  }
}
</script>
</body>
</html>
