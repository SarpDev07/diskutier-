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

// GAST-SESSION FÜR ANONYMES ABSTIMMEN (KRYPTOGRAFISCH SICHERES TOKEN)
function getGuestSession(){
  let s = localStorage.getItem("diskutier_guest_session");
  if(!s || s.length < 24){
    try {
      const array = new Uint8Array(24);
      if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(array);
        s = "gst_" + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      } else {
        s = "gst_" + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + Date.now().toString(36);
      }
    } catch(e) {
      s = "gst_" + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
    localStorage.setItem("diskutier_guest_session", s);
  }
  return s;
}

// ZEIT-FORMATIERUNG (Schweizerisch / Deutsch)
function formatTimeAgo(isoString){
  if(!isoString) return "vor 2 Tagen";
  const date = new Date(isoString);
  if(isNaN(date.getTime())) return "vor 2 Tagen";
  
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  
  if(diffSec < 45) return "gerade eben";
  if(diffSec < 3600) {
    const min = Math.max(1, Math.floor(diffSec / 60));
    return `vor ${min} Min.`;
  }
  if(diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return hours === 1 ? "vor 1 Std." : `vor ${hours} Std.`;
  }
  const days = Math.floor(diffSec / 86400);
  if(days === 1) return "gestern";
  if(days < 7) return `vor ${days} Tagen`;
  const weeks = Math.floor(days / 7);
  if(weeks === 1) return "vor 1 Woche";
  if(weeks < 4) return `vor ${weeks} Wochen`;
  const months = Math.floor(days / 30);
  if(months === 1) return "vor 1 Monat";
  return `vor ${months} Monaten`;
}
