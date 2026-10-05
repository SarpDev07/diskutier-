// INHALTS-MELDESYSTEM & MODERATION FÜR DISKUTIER.CH

const REPORT_REASONS = [
  "Beleidigung oder Belästigung",
  "Hassrede oder Diskriminierung",
  "Spam oder unerwünschte Werbung",
  "Persönliche Daten (Doxxing)",
  "Gewaltandrohung oder Gefährdung",
  "Sexuelle oder pornografische Inhalte",
  "Betrug, Täuschung oder Fehlinformation",
  "Urheberrechtsverletzung",
  "Sonstiger Verstoss gegen die Richtlinien"
];

let activeReportContext = null;

function openReportModal(context) {
  // context: { type: 'poll'|'post'|'comment'|'profile', id: string, title: string, url?: string }
  activeReportContext = context || {
    type: "general",
    id: null,
    title: document.title,
    url: window.location.href
  };

  let modal = document.getElementById("reportModal");
  if (!modal) {
    createReportModalDOM();
    modal = document.getElementById("reportModal");
  }

  // Reset Form
  document.getElementById("reportTargetLabel").textContent = `${formatReportType(activeReportContext.type)}: "${sanitizeText(activeReportContext.title || 'Inhalt', 80)}"`;
  document.getElementById("reportReasonSelect").selectedIndex = 0;
  document.getElementById("reportDetails").value = "";
  document.getElementById("reportCharCount").textContent = "1000 Zeichen übrig";
  document.getElementById("reportError").textContent = "";

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeReportModal() {
  const modal = document.getElementById("reportModal");
  if (modal) modal.classList.remove("open");
  document.body.style.overflow = "";
  activeReportContext = null;
}

function formatReportType(type) {
  switch (type) {
    case "poll": return "Abstimmung melden";
    case "post": return "Beitrag melden";
    case "comment": return "Kommentar melden";
    case "profile": return "Profil melden";
    default: return "Inhalt melden";
  }
}

function updateReportCharCount() {
  const textarea = document.getElementById("reportDetails");
  const countSpan = document.getElementById("reportCharCount");
  const remaining = 1000 - (textarea.value.length || 0);
  countSpan.textContent = `${Math.max(0, remaining)} Zeichen übrig`;
}

async function submitReport() {
  const reason = document.getElementById("reportReasonSelect").value;
  const details = sanitizeText(document.getElementById("reportDetails").value, 1000);
  const errEl = document.getElementById("reportError");
  errEl.textContent = "";

  if (!checkRateLimit("submit_report", 8000)) {
    errEl.textContent = "Bitte warte einen Moment, bevor du eine weitere Meldung einreichst.";
    return;
  }

  if (!reason) {
    errEl.textContent = "Bitte wähle einen Meldegrund aus.";
    return;
  }

  const reportPayload = {
    content_type: activeReportContext ? activeReportContext.type : "general",
    content_id: activeReportContext ? activeReportContext.id : null,
    content_title: activeReportContext ? activeReportContext.title : null,
    content_url: activeReportContext?.url || window.location.href,
    reason: reason,
    details: details || null,
    reporter_user_id: currentUser ? currentUser.id : null,
    reporter_session: currentUser ? null : getGuestSession(),
    status: "Neu",
    created_at: new Date().toISOString()
  };

  try {
    if (db) {
      await db.from("reports").insert([reportPayload]);
    }
  } catch (e) {
    console.warn("Report storage notification:", e);
  }

  closeReportModal();
  showToast("Vielen Dank für deinen Hinweis. Unser Moderationsteam prüft den Inhalt zeitnah.");
}

function createReportModalDOM() {
  const modal = document.createElement("div");
  modal.id = "reportModal";
  modal.className = "reportModalOverlay";
  modal.innerHTML = `
    <div class="reportModalCard">
      <div class="reportModalHeader">
        <div>
          <div class="eyebrow" style="color:var(--red);margin-bottom:4px">Inhalt melden</div>
          <h2 id="reportTargetLabel" style="font-size:18px;margin:0">Inhalt melden</h2>
        </div>
        <button class="reportCloseBtn" onclick="closeReportModal()" aria-label="Schliessen">&times;</button>
      </div>

      <div class="reportModalBody">
        <p style="font-size:13px;color:#555;margin:0 0 16px;line-height:1.5">
          Hilf mit, diskutier.ch sachlich und respektvoll zu halten. Wähle den zutreffenden Grund für die Meldung:
        </p>

        <label style="font-size:12px;font-weight:900;text-transform:uppercase;margin:0 0 6px;display:block">Grund der Meldung</label>
        <select id="reportReasonSelect" style="width:100%;padding:12px;border:1px solid #aaa;background:#fff;margin-bottom:14px">
          ${REPORT_REASONS.map(r => `<option value="${escapeHTML(r)}">${escapeHTML(r)}</option>`).join("")}
        </select>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <label style="font-size:12px;font-weight:900;text-transform:uppercase;margin:0">Zusätzliche Angaben (optional)</label>
          <span id="reportCharCount" style="font-size:11px;color:#888">1000 Zeichen übrig</span>
        </div>
        <textarea id="reportDetails" maxlength="1000" oninput="updateReportCharCount()" placeholder="Beschreibe kurz das Problem oder relevante Kontext-Informationen…" style="width:100%;min-height:90px;padding:12px;border:1px solid #aaa;background:#fff;resize:vertical"></textarea>
        
        <div id="reportError" class="authMsg"></div>
      </div>

      <div class="reportModalFooter">
        <button class="smallbtn" style="color:#555;font-weight:800;padding:10px 14px" onclick="closeReportModal()">Abbrechen</button>
        <button class="publish" style="margin-top:0;padding:11px 20px" onclick="submitReport()">Meldung absenden</button>
      </div>
    </div>
  `;

  // Close on backdrop click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeReportModal();
  });

  document.body.appendChild(modal);
}

// Global verfügbar
window.openReportModal = openReportModal;
window.closeReportModal = closeReportModal;
window.submitReport = submitReport;
window.updateReportCharCount = updateReportCharCount;
