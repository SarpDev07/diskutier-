// ROUTER, SLUG ENGINE & DYNAMISCHES SEO MANAGEMENT FÜR DISKUTIER.CH

const SITE_URL = "https://diskutier.ch";
const SITE_NAME = "diskutier.ch";
const DEFAULT_TITLE = "diskutier.ch — Die Schweiz stimmt ab | Meinungen & Abstimmungen";
const DEFAULT_DESC = "Die unabhängige Schweizer Meinungs- und Abstimmungs-Community. Diskutiere täglich über Politik, Alltag, Finanzen, Wohnen und Beziehungen in der Schweiz.";

// 1. SCHWEIZER SLUG GENERATOR
function slugify(text) {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    // Umlaute und Schweizer Zeichen ersetzen
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/é|è|ê|ë/g, "e")
    .replace(/à|â/g, "a")
    .replace(/ô/g, "o")
    .replace(/ç/g, "c")
    .replace(/chf\s*/g, "chf-")
    .replace(/['’`´]/g, "") // Apostrophe entfernen
    .replace(/[^a-z0-9\s-]/g, "") // Nur Buchstaben, Zahlen, Leerzeichen und Bindestriche
    .replace(/\s+/g, "-") // Leerzeichen durch Bindestrich
    .replace(/-+/g, "-") // Mehrfache Bindestriche bereinigen
    .replace(/^-+|-+$/g, ""); // Führende und nachlaufende Bindestriche entfernen
}

// 2. DYNAMISCHES SEO METADATEN MANAGEMENT
function updateMetaTags({ title, description, canonicalUrl, ogType = "website", noindex = false, ogImage = null }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const fullDesc = description || DEFAULT_DESC;
  const canonical = canonicalUrl ? (canonicalUrl.startsWith("http") ? canonicalUrl : `${SITE_URL}${canonicalUrl}`) : `${SITE_URL}${window.location.pathname}`;

  // Title Tag
  document.title = fullTitle;

  // Standard Meta Tags
  setMetaTag("description", fullDesc);
  setMetaTag("robots", noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large");

  // Canonical Link
  let canonicalEl = document.querySelector("link[rel='canonical']");
  if (!canonicalEl) {
    canonicalEl = document.createElement("link");
    canonicalEl.setAttribute("rel", "canonical");
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute("href", canonical);

  // Open Graph
  setMetaTag("og:title", fullTitle, "property");
  setMetaTag("og:description", fullDesc, "property");
  setMetaTag("og:url", canonical, "property");
  setMetaTag("og:type", ogType, "property");
  setMetaTag("og:site_name", SITE_NAME, "property");
  setMetaTag("og:locale", "de_CH", "property");
  if (ogImage) {
    setMetaTag("og:image", ogImage, "property");
  }

  // Twitter Card
  setMetaTag("twitter:card", "summary_large_image");
  setMetaTag("twitter:title", fullTitle);
  setMetaTag("twitter:description", fullDesc);
}

function setMetaTag(name, content, attr = "name") {
  let el = document.querySelector(`meta[${attr}='${name}']`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

// 3. KATEGORIEN MAPPING
const CATEGORY_SLUG_MAP = {
  "schweiz-politik": "Schweiz & Politik",
  "schweiz": "Schweiz",
  "geld-beruf": "Geld & Beruf",
  "wohnen": "Wohnen",
  "beziehungen": "Beziehungen",
  "technologie": "Technologie",
  "gaming": "Gaming",
  "alltag": "Alltag",
  "essen": "Essen",
  "gesellschaft": "Gesellschaft",
  "auto-mobilitaet": "Auto & Mobilität",
  "sport": "Sport",
  "schule-ausbildung": "Schule & Ausbildung"
};

function getCategorySlug(catName) {
  if (!catName) return "alltag";
  return slugify(catName.replace(/&/g, "").replace(/\+/g, ""));
}

function getCategoryNameFromSlug(slug) {
  if (!slug) return "Alltag";
  const clean = slug.toLowerCase().trim();
  if (CATEGORY_SLUG_MAP[clean]) return CATEGORY_SLUG_MAP[clean];
  // Fallback suche
  for (const [key, val] of Object.entries(CATEGORY_SLUG_MAP)) {
    if (slugify(key) === clean || slugify(val) === clean) return val;
  }
  return slug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

// 4. CLIENT ROUTER MIT HISTORY API
const Router = {
  routes: {},
  isNavigating: false,

  init() {
    // Interzeptiere Klicks auf interne <a> Links
    document.addEventListener("click", (e) => {
      const link = e.target.closest("a[href]");
      if (!link) return;
      const href = link.getAttribute("href");
      
      // Ignoriere externe Links, mailto, tel oder Anker innerhalb der Seite
      if (!href || href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
        if (href && href.startsWith(SITE_URL)) {
          // Erlaube selbe Domain
        } else {
          return;
        }
      }

      // Prüfe ob modifizierte Tasten gedrückt wurden (Strg/Cmd für neuen Tab)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || link.target === "_blank") {
        return;
      }

      e.preventDefault();
      const targetPath = href.startsWith(SITE_URL) ? href.replace(SITE_URL, "") : href;
      Router.navigate(targetPath);
    });

    // Popstate Listener (Browser Zurück / Vor)
    window.addEventListener("popstate", (e) => {
      Router.resolveRoute(window.location.pathname + window.location.search + window.location.hash, false);
    });

    // Initialer Aufruf
    // Prüfe ob SPA-Redirect-Parameter vorhanden sind (z.B. von 404.html)
    const urlParams = new URLSearchParams(window.location.search);
    const redirectPath = urlParams.get("p");
    if (redirectPath) {
      window.history.replaceState(null, "", redirectPath);
      Router.resolveRoute(redirectPath, false);
    } else {
      Router.resolveRoute(window.location.pathname + window.location.search + window.location.hash, false);
    }
  },

  navigate(path, push = true) {
    if (!path) path = "/";
    if (push) {
      window.history.pushState(null, "", path);
    }
    Router.resolveRoute(path, push);
  },

  async resolveRoute(rawPath, wasPushed = false) {
    let path = rawPath.split("?")[0].split("#")[0] || "/";
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);

    // Routen-Erkennung
    // 1. Startseite / Home
    if (path === "" || path === "/" || path === "/index.html" || path === "/home") {
      showPageElement("home");
      updateMetaTags({
        title: "diskutier.ch — Die Schweiz stimmt ab",
        description: "Täglich neue Schweizer Abstimmungen und Foren-Diskussionen. Stimme anonym ab und sieh die Ergebnisse in Echtzeit.",
        canonicalUrl: "/"
      });
      return;
    }

    // 2. Abstimmung / Frage: /frage/:slug
    if (path.startsWith("/frage/")) {
      const slug = path.replace("/frage/", "");
      await Router.handlePollRoute(slug);
      return;
    }

    // 3. Forumsbeitrag: /beitrag/:slug
    if (path.startsWith("/beitrag/")) {
      const slug = path.replace("/beitrag/", "");
      await Router.handlePostRoute(slug);
      return;
    }

    // 4. Kategorie: /kategorie/:slug
    if (path.startsWith("/kategorie/")) {
      const slug = path.replace("/kategorie/", "");
      Router.handleCategoryRoute(slug);
      return;
    }

    // 5. Profil: /profil/:username
    if (path.startsWith("/profil/")) {
      const username = decodeURIComponent(path.replace("/profil/", ""));
      Router.handleProfileRoute(username);
      return;
    }

    // 6. Forums-Übersicht: /beitraege oder /forum
    if (path === "/beitraege" || path === "/forum") {
      showPageElement("forum");
      updateMetaTags({
        title: "Beiträge & Diskussionen — Community-Forum",
        description: "Alle Fragen, Erfahrungen und Diskussionen aus der Schweizer Community auf diskutier.ch.",
        canonicalUrl: "/beitraege"
      });
      return;
    }

    // 7. Kategorien-Übersicht: /kategorien
    if (path === "/kategorien" || path === "/categories") {
      showPageElement("categories");
      updateMetaTags({
        title: "Alle Themen & Kategorien",
        description: "Entdecke Schweizer Diskussionen nach Themen: Alltag, Geld & Beruf, Wohnen, Politik und Beziehungen.",
        canonicalUrl: "/kategorien"
      });
      return;
    }

    // 8. Beitrag erstellen: /erstellen
    if (path === "/erstellen" || path === "/create") {
      showPageElement("create");
      if (typeof restoreCreateDraft === "function") {
        restoreCreateDraft();
      }
      updateMetaTags({
        title: "Beitrag oder Abstimmung erstellen",
        description: "Starte eine neue Diskussion oder erstelle eine Abstimmung für die Schweizer Community.",
        canonicalUrl: "/erstellen",
        noindex: true
      });
      return;
    }

    // 9. Suche: /suche
    if (path === "/suche" || path === "/search") {
      showPageElement("search");
      updateMetaTags({
        title: "Suche",
        description: "Finde spannende Abstimmungen und Beiträge auf diskutier.ch.",
        canonicalUrl: "/suche",
        noindex: true
      });
      return;
    }

    // 10. Login / Anmelden: /anmelden oder /login
    if (path === "/anmelden" || path === "/login") {
      showPageElement("login");
      updateMetaTags({
        title: "Anmelden",
        description: "Melde dich bei diskutier.ch an, um Beiträge zu verfassen und zu kommentieren.",
        canonicalUrl: "/anmelden",
        noindex: true
      });
      return;
    }

    // 11. Registrieren: /registrieren oder /register
    if (path === "/registrieren" || path === "/register") {
      showPageElement("register");
      updateMetaTags({
        title: "Registrieren",
        description: "Werde Teil der Schweizer Diskussions-Community auf diskutier.ch.",
        canonicalUrl: "/registrieren",
        noindex: true
      });
      return;
    }

    // 12. Passwort vergessen: /passwort-vergessen
    if (path === "/passwort-vergessen") {
      showPageElement("forgot-password");
      updateMetaTags({
        title: "Passwort zurücksetzen",
        description: "Passwort für dein diskutier.ch Konto zurücksetzen.",
        canonicalUrl: "/passwort-vergessen",
        noindex: true
      });
      return;
    }

    // 13. Passwort zurücksetzen mit Token: /passwort-zuruecksetzen/:token oder /passwort-zuruecksetzen
    if (path.startsWith("/passwort-zuruecksetzen")) {
      showPageElement("reset-password");
      updateMetaTags({
        title: "Neues Passwort festlegen",
        description: "Lege ein neues Passwort für dein diskutier.ch Konto fest.",
        canonicalUrl: "/passwort-zuruecksetzen",
        noindex: true
      });
      return;
    }

    // 14. Benutzer-Einstellungen: /einstellungen
    if (path === "/einstellungen" || path === "/settings") {
      showPageElement("settings");
      updateMetaTags({
        title: "Konto-Einstellungen",
        description: "Verwalte dein Profil und deine Privatsphäre-Einstellungen.",
        canonicalUrl: "/einstellungen",
        noindex: true
      });
      return;
    }

    // 15. Statische Infoseiten
    if (path === "/ueber-uns" || path === "/about") {
      showPageElement("about");
      updateMetaTags({
        title: "Über diskutier.ch — Die Schweizer Community",
        description: "Erfahre mehr über die unabhängige Schweizer Abstimmungs- und Diskussionsplattform.",
        canonicalUrl: "/ueber-uns"
      });
      return;
    }
    if (path === "/kontakt" || path === "/contact") {
      showPageElement("contact");
      updateMetaTags({
        title: "Kontakt",
        description: "Kontaktiere das Team von diskutier.ch bei Fragen, Anregungen oder Feedback.",
        canonicalUrl: "/kontakt"
      });
      return;
    }
    if (path === "/datenschutz" || path === "/privacy") {
      showPageElement("privacy");
      updateMetaTags({
        title: "Datenschutzerklärung",
        description: "Informationen zum Datenschutz und zur Verarbeitung personenbezogener Daten auf diskutier.ch.",
        canonicalUrl: "/datenschutz"
      });
      return;
    }
    if (path === "/impressum" || path === "/imprint") {
      showPageElement("imprint");
      updateMetaTags({
        title: "Impressum",
        description: "Rechtliche Angaben und Betreiberinformationen von diskutier.ch.",
        canonicalUrl: "/impressum"
      });
      return;
    }
    if (path === "/richtlinien" || path === "/terms") {
      showPageElement("terms");
      updateMetaTags({
        title: "Nutzungsbedingungen & Community-Regeln",
        description: "Regeln für einen sachlichen und respektvollen Meinungsaustausch auf diskutier.ch.",
        canonicalUrl: "/richtlinien"
      });
      return;
    }

    // 16. Analytics Dashboard: /analytics
    if (path === "/analytics") {
      showPageElement("analytics");
      if (typeof renderAnalyticsDashboard === "function") renderAnalyticsDashboard();
      updateMetaTags({
        title: "Live-Statistiken & Dashboard",
        description: "Echtzeit-Statistiken und Traffic-Übersicht von diskutier.ch.",
        canonicalUrl: "/analytics",
        noindex: true
      });
      return;
    }

    // 17. 404 Seite
    Router.showNotFound("Diese Seite existiert nicht oder wurde verschoben.");
  },

  async handlePollRoute(slug) {
    if (!currentPolls || currentPolls.length === 0) {
      if (typeof loadPolls === "function") await loadPolls();
    }

    // Finde Frage nach Slug oder ID
    const poll = currentPolls.find(p => slugify(p.title) === slug || p.id === slug || slugify(p.title).includes(slug));
    if (poll) {
      if (typeof openPollDetail === "function") {
        await openPollDetail(poll.id, false);
      }
      const canonicalSlug = slugify(poll.title);
      updateMetaTags({
        title: `${poll.title}`,
        description: `${poll.totalVotes.toLocaleString('de-CH')} Personen haben bereits abgestimmt. Was ist deine Meinung? Stimme jetzt anonym ab auf diskutier.ch.`,
        canonicalUrl: `/frage/${canonicalSlug}`,
        ogType: "article"
      });
    } else {
      Router.showNotFound("Die gewünschte Abstimmung wurde nicht gefunden oder gelöscht.", "poll");
    }
  },

  async handlePostRoute(slug) {
    if (!currentPosts || currentPosts.length === 0) {
      if (typeof loadForum === "function") await loadForum();
    }

    // Finde Beitrag nach Slug oder ID
    const post = currentPosts.find(p => slugify(p.title) === slug || p.id === slug || slugify(p.title).includes(slug));
    if (post) {
      if (typeof openPost === "function") {
        await openPost(post.id, false);
      }
      const canonicalSlug = slugify(post.title);
      updateMetaTags({
        title: `${post.title}`,
        description: `${post.excerpt ? post.excerpt.substring(0, 160) : post.title}. Diskutiere mit der Schweizer Community auf diskutier.ch.`,
        canonicalUrl: `/beitrag/${canonicalSlug}`,
        ogType: "article"
      });
    } else {
      Router.showNotFound("Dieser Forenbeitrag wurde nicht gefunden, gelöscht oder wird moderiert.", "post");
    }
  },

  handleCategoryRoute(slug) {
    const categoryName = getCategoryNameFromSlug(slug);
    if (typeof filterByCat === "function") {
      filterByCat(categoryName, false);
    }
    updateMetaTags({
      title: `Thema: ${categoryName} — Schweizer Diskussionen`,
      description: `Alle Abstimmungen und Beiträge zum Thema ${categoryName} auf diskutier.ch. Jetzt mitreden!`,
      canonicalUrl: `/kategorie/${slugify(slug)}`
    });
  },

  handleProfileRoute(username) {
    showPageElement("profile");
    if (typeof renderPublicProfile === "function") {
      renderPublicProfile(username);
    } else if (typeof renderProfilePage === "function") {
      renderProfilePage();
    }
    updateMetaTags({
      title: `Profil von ${username}`,
      description: `Beiträge und Meinungen von ${username} auf diskutier.ch.`,
      canonicalUrl: `/profil/${encodeURIComponent(username)}`,
      noindex: true
    });
  },

  showNotFound(message = "Die gewünschte Seite existiert nicht.", context = "general") {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    let notFoundEl = document.getElementById("notFoundPage");
    if (!notFoundEl) {
      notFoundEl = document.createElement("section");
      notFoundEl.id = "notFoundPage";
      notFoundEl.className = "page active legalContent";
      const mainEl = document.querySelector("main");
      if (mainEl) mainEl.appendChild(notFoundEl);
    }
    
    notFoundEl.classList.add("active");
    notFoundEl.innerHTML = `
      <div class="eyebrow" style="color:var(--red)">404 — Fehler</div>
      <h1>Seite nicht gefunden</h1>
      <p style="font-size:16px;margin:16px 0">${escapeHTML(message)}</p>
      <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap">
        <a href="/" class="smallbtn" style="background:var(--ink);color:#fff;padding:10px 16px;text-decoration:none;font-weight:900">Zur Startseite</a>
        <a href="/beitraege" class="smallbtn" style="border:1px solid #aaa;padding:10px 16px;text-decoration:none;font-weight:900">Alle Beiträge</a>
        <a href="/kategorien" class="smallbtn" style="border:1px solid #aaa;padding:10px 16px;text-decoration:none;font-weight:900">Themen entdecken</a>
      </div>
    `;

    updateMetaTags({
      title: "Seite nicht gefunden (404)",
      description: "Die aufgerufene Seite ist nicht verfügbar.",
      noindex: true
    });
  }
};

// Hilfsfunktion zum Umschalten der DOM-Seiten
function showPageElement(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add("active");
  }

  // Mobile Nav Active State
  document.querySelectorAll(".mobileNav button").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === pageId);
  });

  // Track event
  if (typeof trackEvent === "function") {
    trackEvent("pageview", { page: pageId, path: window.location.pathname });
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Global verfügbar machen
window.Router = Router;
window.slugify = slugify;
window.updateMetaTags = updateMetaTags;
window.getCategorySlug = getCategorySlug;
window.getCategoryNameFromSlug = getCategoryNameFromSlug;
