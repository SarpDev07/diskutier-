// DISKUTIER.CH — ZENTRALES GA4 & ANALYTICS FRAMEWORK
// Vollständige Google Analytics 4 Implementierung mit Consent Mode v2, SPA Funnel & Event-Tracking

const GA_MEASUREMENT_ID = window.GA_MEASUREMENT_ID || "G-N5YKTEDFZE";

const GA = {
  measurementId: GA_MEASUREMENT_ID,
  isInitialized: false,
  isExcluded: false,
  activeContentType: null,
  activeContentId: null,
  lastTrackedPagePath: null,
  viewedPollsInSession: new Set(),
  secondPollTracked: false,
  thirdPollTracked: false,
  scrollMilestonesTracked: {},

  // 1. INITIALISIERUNG & AUSSCHLUSS-PRÜFUNG
  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Prüfe Admin / Dev / Localhost Ausschluss
    this.isExcluded = this.checkIfExcluded();

    // Initialisiere Gtag & Consent
    this.setupGtag();

    // Initialisiere Session Milestones
    this.initSessionMilestones();

    // Initialisiere Scroll-Tracking
    this.initScrollDepthTracking();
  },

  setMeasurementId(id) {
    if (!id || id === this.measurementId) return;
    this.measurementId = id;
    window.GA_MEASUREMENT_ID = id;
    if (!this.isExcluded) {
      this.setupGtag(true);
    }
  },

  checkIfExcluded() {
    // 1. Localhost / Preview / Development
    const host = (window.location.hostname || "").toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local") || window.location.protocol === "file:") {
      console.info("[GA4] Tracking deaktiviert: Localhost/Development-Umgebung.");
      return true;
    }

    // 2. URL-Parameter zum dauerhaften Deaktivieren/Aktivieren für eigene Geräte (?admin_analytics=off)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("admin_analytics") === "off" || urlParams.get("exclude_analytics") === "true") {
      localStorage.setItem("diskutier_exclude_analytics", "true");
      console.info("[GA4] Internes Gerät dauerhaft vom Analytics-Tracking ausgeschlossen.");
      return true;
    }
    if (urlParams.get("admin_analytics") === "on" || urlParams.get("exclude_analytics") === "false") {
      localStorage.removeItem("diskutier_exclude_analytics");
      console.info("[GA4] Analytics-Tracking für dieses Gerät aktiviert.");
      return false;
    }

    // 3. LocalStorage Flag (Persistenter Ausschluss für Admin)
    if (localStorage.getItem("diskutier_exclude_analytics") === "true") {
      console.info("[GA4] Tracking deaktiviert: Internes Admin-Gerät.");
      return true;
    }

    // 4. Globales Window Flag
    if (window.__DISKUTIER_EXCLUDE_ANALYTICS__ === true) {
      return true;
    }

    return false;
  },

  setupGtag(forceReload = false) {
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== "function") {
      window.gtag = function() {
        window.dataLayer.push(arguments);
      };
    }

    // Google Consent Mode v2 Default
    const hasConsented = localStorage.getItem("diskutier_cookies_accepted") === "true";
    window.gtag('consent', 'default', {
      'analytics_storage': hasConsented ? 'granted' : 'denied',
      'ad_storage': hasConsented ? 'granted' : 'denied',
      'ad_user_data': hasConsented ? 'granted' : 'denied',
      'ad_personalization': hasConsented ? 'granted' : 'denied'
    });

    if (this.isExcluded || this.measurementId === "G-XXXXXXXXXX") {
      return;
    }

    // Skript einbinden, falls noch nicht vorhanden
    let script = document.getElementById("ga-gtag-script");
    if (!script || forceReload) {
      if (script && forceReload) script.remove();
      script = document.createElement("script");
      script.id = "ga-gtag-script";
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(this.measurementId)}`;
      document.head.appendChild(script);

      window.gtag('js', new Date());
      window.gtag('config', this.measurementId, {
        send_page_view: false, // SPA steuert Pageviews sauber manuell
        cookie_flags: 'SameSite=None;Secure'
      });
    }
  },

  updateConsent(granted) {
    if (typeof window.gtag === "function") {
      window.gtag('consent', 'update', {
        'analytics_storage': granted ? 'granted' : 'denied',
        'ad_storage': granted ? 'granted' : 'denied',
        'ad_user_data': granted ? 'granted' : 'denied',
        'ad_personalization': granted ? 'granted' : 'denied'
      });
    }
  },

  // 2. KERN-EVENT-DISPATCHER (MIT DATENSCHUTZ- & FEHLERSCHUTZ)
  trackEvent(eventName, params = {}) {
    if (this.isExcluded) {
      if (window.location.search.includes("debug_ga")) {
        console.log(`[GA4 Debug - Excluded] Event: ${eventName}`, params);
      }
      return;
    }

    // Bereinige Parameter (keine undefined, PII entfernen)
    const cleanParams = this.sanitizeParams(params);

    if (typeof window.gtag === "function" && this.measurementId !== "G-XXXXXXXXXX") {
      window.gtag("event", eventName, cleanParams);
    }

    if (window.location.search.includes("debug_ga")) {
      console.log(`[GA4 Event] ${eventName}`, cleanParams);
    }
  },

  sanitizeParams(params) {
    const clean = {};
    for (const [key, val] of Object.entries(params)) {
      if (val === undefined || val === null) continue;
      if (typeof val === "string") {
        clean[key] = this.stripPII(val).substring(0, 100);
      } else if (typeof val === "boolean" || typeof val === "number") {
        clean[key] = val;
      }
    }
    return clean;
  },

  stripPII(str) {
    if (!str) return "";
    let s = str.replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, "[EMAIL]");
    s = s.replace(/(\+41|0041|0)[0-9\s-]{7,15}/g, "[PHONE]");
    return s.trim();
  },

  // 3. SPA PAGE VIEW TRACKING
  trackPageView(path, title, location = window.location.href, referrer = document.referrer) {
    const cleanPath = path || window.location.pathname;
    const cleanTitle = title || document.title || "diskutier.ch";

    // Verhindere doppelte aufeinanderfolgende Hits für denselben Pfad
    if (this.lastTrackedPagePath === cleanPath) return;
    this.lastTrackedPagePath = cleanPath;

    // Reset Scroll-Tracking Meilensteine für die neue Seite
    this.scrollMilestonesTracked = {};

    this.trackEvent("page_view", {
      page_location: location,
      page_path: cleanPath,
      page_title: cleanTitle,
      page_referrer: referrer || "direct"
    });
  },

  // 4. SESSION & POLL ENGAGEMENT (second_poll_reached, third_poll_reached)
  initSessionMilestones() {
    try {
      const stored = sessionStorage.getItem("diskutier_viewed_polls");
      if (stored) {
        this.viewedPollsInSession = new Set(JSON.parse(stored));
      }
      this.secondPollTracked = sessionStorage.getItem("diskutier_second_poll_reached") === "true";
      this.thirdPollTracked = sessionStorage.getItem("diskutier_third_poll_reached") === "true";
    } catch(e){}
  },

  recordPollViewInSession(pollId) {
    if (!pollId) return;
    this.viewedPollsInSession.add(pollId);
    try {
      sessionStorage.setItem("diskutier_viewed_polls", JSON.stringify(Array.from(this.viewedPollsInSession)));
    } catch(e){}

    const count = this.viewedPollsInSession.size;
    if (count >= 2 && !this.secondPollTracked) {
      this.secondPollTracked = true;
      try { sessionStorage.setItem("diskutier_second_poll_reached", "true"); } catch(e){}
      this.trackEvent("second_poll_reached", {
        distinct_polls_viewed: count
      });
    }

    if (count >= 3 && !this.thirdPollTracked) {
      this.thirdPollTracked = true;
      try { sessionStorage.setItem("diskutier_third_poll_reached", "true"); } catch(e){}
      this.trackEvent("third_poll_reached", {
        distinct_polls_viewed: count
      });
    }
  },

  // 5. SPEZIFISCHE EVENT HELPER
  // 3. Abstimmungen
  trackVote({ pollId, pollSlug, pollTitle, category, voteOption, sourcePage, loggedIn }) {
    this.trackEvent("vote", {
      poll_id: pollId,
      poll_slug: pollSlug || "",
      poll_title: pollTitle || "",
      category: category || "Allgemein",
      vote_option: voteOption || "",
      source_page: sourcePage || window.location.pathname,
      logged_in: !!loggedIn
    });
  },

  trackPollView({ pollId, pollSlug, category }) {
    this.activeContentType = "poll";
    this.activeContentId = pollId;
    this.recordPollViewInSession(pollId);
    this.trackEvent("poll_view", {
      poll_id: pollId,
      poll_slug: pollSlug || "",
      category: category || "Allgemein"
    });
  },

  trackResultView({ pollId, pollSlug }) {
    this.trackEvent("result_view", {
      poll_id: pollId,
      poll_slug: pollSlug || ""
    });
  },

  trackNextQuestionClick({ fromPollId, toPollId }) {
    this.trackEvent("next_question_click", {
      from_poll_id: fromPollId || "",
      to_poll_id: toPollId || ""
    });
  },

  // 5. Beiträge
  trackPostView({ postId, postSlug, category, authorType }) {
    this.activeContentType = "post";
    this.activeContentId = postId;
    this.trackEvent("post_view", {
      post_id: postId,
      post_slug: postSlug || "",
      category: category || "Alltag",
      author_type: authorType || "community"
    });
  },

  trackPostCreated({ postId, category, loggedIn }) {
    this.trackEvent("post_created", {
      post_id: postId,
      category: category || "Alltag",
      logged_in: !!loggedIn
    });
  },

  // 6. Kommentare
  trackCommentCreated({ contentType, contentId, loggedIn }) {
    this.trackEvent("comment_created", {
      content_type: contentType || "poll",
      content_id: contentId || "",
      logged_in: !!loggedIn
    });
  },

  trackReplyCreated({ contentType, contentId, loggedIn }) {
    this.trackEvent("reply_created", {
      content_type: contentType || "post",
      content_id: contentId || "",
      logged_in: !!loggedIn
    });
  },

  // 7. Upvotes / Reaktionen
  trackUpvote({ contentType, contentId, loggedIn }) {
    this.trackEvent("upvote", {
      content_type: contentType || "comment",
      content_id: contentId || "",
      logged_in: !!loggedIn
    });
  },

  trackUpvoteRemoved({ contentType, contentId }) {
    this.trackEvent("upvote_removed", {
      content_type: contentType || "comment",
      content_id: contentId || ""
    });
  },

  // 8. Registrierung
  trackSignUpStart({ sourcePage } = {}) {
    this.trackEvent("sign_up_start", {
      source_page: sourcePage || window.location.pathname
    });
  },

  trackSignUp({ method = "email", sourcePage } = {}) {
    this.trackEvent("sign_up", {
      method: method,
      source_page: sourcePage || window.location.pathname
    });
  },

  // 9. Login
  trackLogin({ method = "email" } = {}) {
    this.trackEvent("login", {
      method: method
    });
  },

  // 10. Suche
  trackSearch({ searchTerm }) {
    const cleanSearch = this.stripPII(searchTerm || "");
    if (!cleanSearch || cleanSearch.length < 2) return;
    this.trackEvent("search", {
      search_term: cleanSearch
    });
  },

  // 11. Teilen
  trackShare({ contentType, contentId, method }) {
    this.trackEvent("share", {
      content_type: contentType || "poll",
      content_id: contentId || "",
      method: method || "native"
    });
  },

  // 12. Speichern
  trackSaveContent({ contentType, contentId }) {
    this.trackEvent("save_content", {
      content_type: contentType || "post",
      content_id: contentId || ""
    });
  },

  trackUnsaveContent({ contentType, contentId }) {
    this.trackEvent("unsave_content", {
      content_type: contentType || "post",
      content_id: contentId || ""
    });
  },

  // 13. Scrolltiefe Tracking (25%, 50%, 75%, 90%)
  initScrollDepthTracking() {
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          this.checkScrollMilestones();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  },

  checkScrollMilestones() {
    const docEl = document.documentElement;
    const body = document.body;
    const scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop || 0;
    const scrollHeight = Math.max(docEl.scrollHeight, body.scrollHeight) - window.innerHeight;
    
    if (scrollHeight <= 0) return;
    const pct = Math.round((scrollTop / scrollHeight) * 100);

    const milestones = [25, 50, 75, 90];
    milestones.forEach(m => {
      if (pct >= m && !this.scrollMilestonesTracked[m]) {
        this.scrollMilestonesTracked[m] = true;
        this.trackEvent("scroll_depth", {
          percent: m,
          content_type: this.activeContentType || "page",
          content_id: this.activeContentId || window.location.pathname
        });
      }
    });
  }
};

// Globaler Ausschluss-Helfer für Admins
window.setAnalyticsExcluded = function(exclude = true) {
  if (exclude) {
    localStorage.setItem("diskutier_exclude_analytics", "true");
    GA.isExcluded = true;
    console.info("Analytics wurde für dieses Gerät deaktiviert.");
  } else {
    localStorage.removeItem("diskutier_exclude_analytics");
    GA.isExcluded = false;
    console.info("Analytics wurde für dieses Gerät aktiviert.");
  }
};

window.GA = GA;

// Auto-Start GA4
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => GA.init());
} else {
  GA.init();
}
