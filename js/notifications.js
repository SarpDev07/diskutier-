// BENACHRICHTIGUNGS-SYSTEM (ECHTZEIT & ECHTE NUTZER-BENACHRICHTIGUNGEN)

let currentNotifications = [];

// Initialisierung beim Laden
async function initNotifications() {
  loadNotificationsFromStorage();
  if (currentUser && db) {
    await fetchServerNotifications();
  }
  updateNotificationBadge();
  renderNotificationsList();

  // Klick ausserhalb schliesst das Dropdown
  document.addEventListener("click", (e) => {
    const dropdown = document.getElementById("notifDropdown");
    const bellBtn = document.getElementById("notifBellBtn");
    if (dropdown && bellBtn && !dropdown.contains(e.target) && !bellBtn.contains(e.target)) {
      dropdown.classList.remove("open");
      dropdown.style.display = "none";
    }
  });
}

// Lokale Benachrichtigungen laden (Nur echte Benachrichtigungen)
function loadNotificationsFromStorage() {
  const raw = localStorage.getItem("diskutier_notifications");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      // Entferne veraltete Dummy/Test-Einträge
      currentNotifications = Array.isArray(parsed) 
        ? parsed.filter(n => n.id && !n.id.includes("seed") && !n.id.includes("welcome") && !n.id.includes("reply_1"))
        : [];
    } catch(e) {
      currentNotifications = [];
    }
  } else {
    currentNotifications = [];
  }
  saveNotificationsToStorage();
}

function saveNotificationsToStorage() {
  localStorage.setItem("diskutier_notifications", JSON.stringify(currentNotifications));
}

// Supabase Benachrichtigungen abrufen (Echte Einträge aus DB)
async function fetchServerNotifications() {
  if (!currentUser || !db) return;
  try {
    const { data, error } = await db.from("notifications")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (!error && data && data.length > 0) {
      const existingIds = new Set(currentNotifications.map(n => n.id));
      data.forEach(n => {
        if (!existingIds.has(n.id)) {
          currentNotifications.unshift({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type || "comment",
            link_page: n.link_page || "forum",
            link_id: n.link_id || null,
            read: n.is_read || false,
            created_at: n.created_at
          });
        }
      });
      saveNotificationsToStorage();
      updateNotificationBadge();
      renderNotificationsList();
    }
  } catch(e) {
    console.warn("Server notifications sync:", e);
  }
}

// Echte Benachrichtigung erstellen (wenn jemand kommentiert / antwortet)
async function createNotification({ userId, title, message, linkPage = "forum", linkId = null }) {
  const newNotif = {
    id: "notif_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    title: sanitizeText(title, 120),
    message: sanitizeText(message, 300),
    type: "comment",
    link_page: linkPage,
    link_id: linkId,
    read: false,
    created_at: new Date().toISOString()
  };

  currentNotifications.unshift(newNotif);
  saveNotificationsToStorage();
  updateNotificationBadge();
  renderNotificationsList();

  // In Supabase speichern (falls DB-Tabelle notifications existiert)
  if (db && userId) {
    try {
      await db.from("notifications").insert([{
        user_id: userId,
        title: newNotif.title,
        message: newNotif.message,
        type: newNotif.type,
        link_page: newNotif.link_page,
        link_id: newNotif.link_id,
        is_read: false
      }]);
    } catch(e) {}
  }
}

// Badge aktualisieren
function updateNotificationBadge() {
  const badge = document.getElementById("notifBadge");
  if (!badge) return;

  const unreadCount = currentNotifications.filter(n => !n.read).length;
  if (unreadCount > 0) {
    badge.textContent = unreadCount > 9 ? "9+" : unreadCount;
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }
}

// Dropdown öffnen / schliessen
function toggleNotifications() {
  const dropdown = document.getElementById("notifDropdown");
  if (!dropdown) return;
  const isHidden = dropdown.style.display === "none" || !dropdown.classList.contains("open");
  if (isHidden) {
    dropdown.style.display = "flex";
    dropdown.classList.add("open");
    renderNotificationsList();
  } else {
    dropdown.style.display = "none";
    dropdown.classList.remove("open");
  }
}

// Benachrichtigungen im Dropdown anzeigen
function renderNotificationsList() {
  const listContainer = document.getElementById("notifList");
  if (!listContainer) return;

  if (!currentNotifications.length) {
    listContainer.innerHTML = `
      <div style="padding:28px 18px;text-align:center;color:#777;font-size:13px">
        <div style="font-weight:900;color:#222;margin-bottom:6px;font-size:14px">Keine Benachrichtigungen</div>
        Sobald jemand auf deine Beiträge oder Kommentare antwortet, erscheint der Hinweis hier.
      </div>
    `;
    return;
  }

  listContainer.innerHTML = currentNotifications.map(n => `
    <div class="notifItem ${n.read ? '' : 'unread'}" onclick="handleNotificationClick('${escapeHTML(n.id)}')">
      <div class="notifItemHead">
        <span class="notifTitle">${escapeHTML(n.title)}</span>
        <span class="notifTime">${escapeHTML(formatTimeAgo(n.created_at))}</span>
      </div>
      <div class="notifBody">${escapeHTML(n.message)}</div>
    </div>
  `).join("");
}

// Klick auf eine Benachrichtigung
function handleNotificationClick(notifId) {
  const notif = currentNotifications.find(n => n.id === notifId);
  if (notif) {
    notif.read = true;
    saveNotificationsToStorage();
    updateNotificationBadge();
    renderNotificationsList();

    const dropdown = document.getElementById("notifDropdown");
    if (dropdown) {
      dropdown.classList.remove("open");
      dropdown.style.display = "none";
    }

    if (notif.link_id && notif.link_page === "post" && typeof openPost === "function") {
      openPost(notif.link_id);
    } else if (notif.link_id && notif.link_page === "poll" && typeof openPollDetail === "function") {
      openPollDetail(notif.link_id);
    } else if (notif.link_page && typeof showPage === "function") {
      showPage(notif.link_page);
    }
  }
}

// Alle als gelesen markieren
async function markAllNotificationsRead() {
  currentNotifications.forEach(n => { n.read = true; });
  saveNotificationsToStorage();
  updateNotificationBadge();
  renderNotificationsList();

  if (currentUser && db) {
    try {
      await db.from("notifications").update({ is_read: true }).eq("user_id", currentUser.id);
    } catch(e) {}
  }
  showToast("Alle Benachrichtigungen als gelesen markiert.");
}

// Auto-Start
document.addEventListener("DOMContentLoaded", initNotifications);
