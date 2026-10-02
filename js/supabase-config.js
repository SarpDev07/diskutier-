// SUPABASE KONFIGURATION & INITIALISIERUNG
const SUPABASE_URL = "https://rmkvhzxrbzotxohvngjj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJta3ZoenhyYnpvdHhvaHZuZ2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4OTUyOTAsImV4cCI6MjEwNjQ3MTI5MH0.fz6XJnEpK9sUk_0xYG_IL-QUYoRb4NiTq7pe4RTwrvM";
const db = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

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
