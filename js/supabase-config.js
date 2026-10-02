// SUPABASE KONFIGURATION & INITIALISIERUNG
const SUPABASE_URL = "https://rmkvhzxrbzotxohvngjj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJta3ZoenhyYnpvdHhvaHZuZ2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4OTUyOTAsImV4cCI6MjEwNjQ3MTI5MH0.fz6XJnEpK9sUk_0xYG_IL-QUYoRb4NiTq7pe4RTwrvM";
const db = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// SICHERHEIT: XSS-SCHUTZ & ESCAPING
function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// SICHERHEIT: TEXT-SANITIZATION & LÄNGENBEGRENZUNG
function sanitizeText(str, maxLength = 2000) {
  if (!str) return "";
  return String(str).trim().substring(0, maxLength);
}

// SICHERHEIT: RATE-LIMITING / ANTI-SPAM (Client-Side Cooldown)
const _rateLimitTimestamps = {};
function checkRateLimit(actionKey, cooldownMs = 2500) {
  const now = Date.now();
  const lastTime = _rateLimitTimestamps[actionKey] || 0;
  if (now - lastTime < cooldownMs) {
    const waitSec = Math.ceil((cooldownMs - (now - lastTime)) / 1000);
    if (typeof showToast === "function") {
      showToast(`Bitte warte noch ${waitSec} Sekunde(n) vor der nächsten Aktion.`);
    }
    return false;
  }
  _rateLimitTimestamps[actionKey] = now;
  return true;
}

// GAST-SESSION FÜR ANONYMES ABSTIMMEN
function getGuestSession(){
  let s = localStorage.getItem("diskutier_guest_session");
  if(!s){
    s = "guest_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now();
    localStorage.setItem("diskutier_guest_session", s);
  }
  return s;
}

// ZEIT-FORMATIERUNG (Schweizerisch / Deutsch)
function formatTimeAgo(isoString){
  if(!isoString) return "vor kurzem";
  const diff = Math.floor((new Date() - new Date(isoString))/1000);
  if(diff < 60) return "gerade eben";
  if(diff < 3600) return `vor ${Math.floor(diff/60)} Min.`;
  if(diff < 86400) return `vor ${Math.floor(diff/3600)} Std.`;
  return `vor ${Math.floor(diff/86400)} Tagen`;
}
