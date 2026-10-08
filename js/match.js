// DISKUTIER.CH — SCHWEIZ-MATCH ENGINE & GAMIFICATION (V2.0)
// Vollständiges, mathematisch exaktes und transparentes Auswertungssystem

const SwissMatch = {
  // Archetypen basierend auf Übereinstimmungsprozentsatz
  getArchetype(matchPercent, totalAnswered) {
    if (totalAnswered < 3) {
      return {
        title: "Match im Aufbau",
        subtitle: "Beantworte noch mindestens 3 Fragen für dein Profil",
        badge: "Entdecker",
        color: "#666"
      };
    }
    if (matchPercent >= 75) {
      return {
        title: "Mehrheits-Pragmatiker",
        subtitle: "Deine Meinungen stimmen sehr oft mit dem Konsens der Schweizer Community überein.",
        badge: "Konsensstark",
        color: "#2e7d32"
      };
    }
    if (matchPercent >= 55) {
      return {
        title: "Ausgewogener Schweizer",
        subtitle: "Du teilst viele Mehrheitsmeinungen, setzt aber bei zentralen Themen klare eigene Akzente.",
        badge: "Ausgewogen",
        color: "#e63946"
      };
    }
    if (matchPercent >= 35) {
      return {
        title: "Kritischer Individualist",
        subtitle: "Du hinterfragst den Mainstream gerne und gehst bei vielen Schweizer Debatten eigene Wege.",
        badge: "Individualist",
        color: "#d97706"
      };
    }
    return {
      title: "Unbeugsamer Freigeist",
      subtitle: "Du vertrittst in fast allen Fragen eine ausgeprägte Minderheitenposition. Ein echter Querdenker.",
      badge: "Nonkonformist",
      color: "#7c3aed"
    };
  },

  // Holt alle bisherigen Stimmen des Nutzers (aus LocalStorage & aktiven Polls)
  getUserVotesMap() {
    let votes = {};
    try {
      votes = JSON.parse(localStorage.getItem("diskutier_poll_votes") || "{}");
    } catch(e){}
    return votes;
  },

  // Berechnet die detaillierte Schweiz-Match Statistik
  calculateStats(pollsList = []) {
    const userVotes = this.getUserVotesMap();
    const polls = pollsList && pollsList.length ? pollsList : (window.currentPolls || []);
    
    let totalAnswered = 0;
    let agreementCount = 0;
    let minorityCount = 0;
    let detailedComparisons = [];
    let categoryStats = {};
    let rarestOpinion = null;
    let minOptionPercent = 101;

    polls.forEach(poll => {
      if (!poll) return;

      // Ermittle, ob der Nutzer hier abgestimmt hat
      let votedIndex = null;
      if (poll.userVotedIndex !== null && poll.userVotedIndex !== undefined) {
        votedIndex = poll.userVotedIndex;
      } else if (userVotes[poll.id] !== undefined) {
        votedIndex = userVotes[poll.id];
      } else if (poll.title && userVotes[poll.title] !== undefined) {
        votedIndex = userVotes[poll.title];
      }

      if (votedIndex === null || votedIndex === undefined) return;

      totalAnswered++;
      const totalVotes = poll.totalVotes || 1;
      const options = poll.options || ["JA", "NEIN"];
      const counts = poll.optionCounts || options.map(() => 0);

      // Finde Mehrheitsoption
      let maxCount = -1;
      let majorityIndex = 0;
      counts.forEach((c, idx) => {
        if (c > maxCount) {
          maxCount = c;
          majorityIndex = idx;
        }
      });

      const userOptionCount = counts[votedIndex] || 0;
      const userOptionPercent = Math.round((userOptionCount / totalVotes) * 100);
      const majorityPercent = Math.round((maxCount / totalVotes) * 100);
      const isMajority = (votedIndex === majorityIndex);

      if (isMajority) {
        agreementCount++;
      } else {
        minorityCount++;
      }

      // Seltenste eigene Meinung suchen
      if (userOptionPercent < minOptionPercent) {
        minOptionPercent = userOptionPercent;
        rarestOpinion = {
          pollTitle: poll.title,
          category: poll.category || "Allgemein",
          userChoice: options[votedIndex] || "Deine Wahl",
          percent: userOptionPercent
        };
      }

      // Kategorie-Statistiken erfassen
      const cat = poll.category || "Allgemein";
      if (!categoryStats[cat]) {
        categoryStats[cat] = { answered: 0, agreement: 0, total: 0 };
      }
      categoryStats[cat].answered++;
      if (isMajority) categoryStats[cat].agreement++;

      detailedComparisons.push({
        pollId: poll.id,
        pollTitle: poll.title,
        category: cat,
        userChoice: options[votedIndex] || "Deine Wahl",
        userOptionPercent: userOptionPercent,
        majorityChoice: options[majorityIndex] || "Mehrheit",
        majorityPercent: majorityPercent,
        isMajority: isMajority,
        totalVotes: totalVotes,
        time: poll.time || "kürzlich"
      });
    });

    // Gesamtzahl pro Kategorie in der DB zählen
    polls.forEach(p => {
      const cat = p.category || "Allgemein";
      if (categoryStats[cat]) {
        categoryStats[cat].total = (categoryStats[cat].total || 0) + 1;
      }
    });

    const matchPercent = totalAnswered > 0 ? Math.round((agreementCount / totalAnswered) * 100) : 0;
    const archetype = this.getArchetype(matchPercent, totalAnswered);

    // Milestones prüfen
    const milestones = [
      { id: "first_vote", title: "1. Stimme abgegeben", target: 1, achieved: totalAnswered >= 1, desc: "Erste Meinung in der Schweiz festgehalten" },
      { id: "match_unlocked", title: "Match freigeschaltet", target: 3, achieved: totalAnswered >= 3, desc: "Basis für dein statistisches Profil gelegt" },
      { id: "half_way", title: "Debatten-Kenner", target: 5, achieved: totalAnswered >= 5, desc: "5 Fragen beantwortet" },
      { id: "top_debater", title: "Vollblut-Schweizer", target: 10, achieved: totalAnswered >= 10, desc: "10 Abstimmungen ausgewertet" },
      { id: "champion", title: "Abstimmungs-Champion", target: Math.max(polls.length, 10), achieved: totalAnswered >= polls.length && polls.length > 0, desc: "Alle aktuellen Abstimmungen beantwortet" }
    ];

    return {
      totalAnswered,
      totalAvailable: polls.length,
      agreementCount,
      minorityCount,
      matchPercent,
      archetype,
      categoryStats,
      detailedComparisons,
      rarestOpinion,
      milestones
    };
  },

  // Rendert die komplette Seite /schweiz-match
  renderMatchPage() {
    const container = document.getElementById("swissMatchContainer");
    if (!container) return;

    const stats = this.calculateStats(window.currentPolls || []);
    const polls = window.currentPolls || [];
    const isCalibrating = stats.totalAnswered < 3;

    // GA4 Tracking für Match-View
    if (window.GA && typeof window.GA.trackSwissMatchView === "function") {
      window.GA.trackSwissMatchView({
        matchPercent: stats.matchPercent,
        answeredCount: stats.totalAnswered,
        isRegistered: !!window.currentUser
      });
    }

    // Header & Hero Banner
    let heroHTML = "";
    if (isCalibrating) {
      const remainingNeeded = Math.max(1, 3 - stats.totalAnswered);
      heroHTML = `
        <div class="matchHeroCard calibrationMode">
          <div class="matchBadgeTag" style="background:#f1f5f9;color:#475569">Kalibrierung läuft</div>
          <h1 class="matchHeroTitle">Dein persönlicher Schweiz-Match</h1>
          <p class="matchHeroSubtitle">
            Beantworte noch <strong>${remainingNeeded} weitere Frage${remainingNeeded === 1 ? '' : 'n'}</strong>, damit wir dein statistisches Meinungsprofil im Vergleich zur Schweizer Community berechnen können.
          </p>
          <div class="matchProgressWrapper">
            <div class="matchProgressBar" style="width:${Math.round((stats.totalAnswered / 3) * 100)}%"></div>
          </div>
          <div class="matchProgressLabel">${stats.totalAnswered} von 3 Fragen für dein Basis-Profil</div>
        </div>
      `;
    } else {
      heroHTML = `
        <div class="matchHeroCard activeMatch">
          <div class="matchHeroTop">
            <div>
              <div class="matchBadgeTag" style="background:${stats.archetype.color}15;color:${stats.archetype.color}">
                Typ: ${escapeHTML(stats.archetype.badge)}
              </div>
              <h1 class="matchHeroTitle">${escapeHTML(stats.archetype.title)}</h1>
              <p class="matchHeroSubtitle">${escapeHTML(stats.archetype.subtitle)}</p>
            </div>
            <div class="matchGaugeBox">
              <div class="matchPercentVal">${stats.matchPercent}<span style="font-size:24px">%</span></div>
              <div class="matchPercentText">Schweiz-Match</div>
            </div>
          </div>
          <div class="matchStatsRow">
            <div class="matchStatItem">
              <span class="matchStatNumber">${stats.totalAnswered}</span>
              <span class="matchStatDesc">Beantwortet</span>
            </div>
            <div class="matchStatItem">
              <span class="matchStatNumber" style="color:#2e7d32">${stats.agreementCount}</span>
              <span class="matchStatDesc">Mit der Mehrheit</span>
            </div>
            <div class="matchStatItem">
              <span class="matchStatNumber" style="color:#e63946">${stats.minorityCount}</span>
              <span class="matchStatDesc">Gegen den Strom</span>
            </div>
          </div>
          <div class="matchDisclaimerNote">
            Hinweis: Der Schweiz-Match basiert auf den echten Stimmen der diskutier.ch-Teilnehmer (keine Hochrechnung der gesamten Wohnbevölkerung).
          </div>
        </div>
      `;
    }

    // Authentifizierungs-Hinweis für Gäste
    let authBannerHTML = "";
    if (!window.currentUser && stats.totalAnswered > 0) {
      authBannerHTML = `
        <div class="matchSaveBanner">
          <div class="matchSaveIcon">🇨🇭</div>
          <div style="flex:1">
            <h3 style="font-size:16px;margin:0 0 4px;font-weight:800;color:var(--ink)">Möchtest du dein Meinungsprofil dauerhaft speichern?</h3>
            <p style="font-size:13px;color:#555;margin:0 0 10px;line-height:1.5">
              Du hast bisher ${stats.totalAnswered} Fragen als Gast beantwortet. Erstelle kurz ein kostenloses Konto, um deine Antworten auf allen Geräten zu behalten und über neue Debatten benachrichtigt zu werden.
            </p>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="publish" style="margin:0;padding:9px 18px;font-size:13px" onclick="openAuthRequiredModal('Speichere deinen Schweiz-Match und deine bisherigen ${stats.totalAnswered} Antworten dauerhaft.', { trigger: 'swiss_match_save' })">Profil kostenlos sichern &rarr;</button>
            </div>
          </div>
        </div>
      `;
    }

    // Seltenste Meinung Highlight
    let rarestOpinionHTML = "";
    if (stats.rarestOpinion && stats.totalAnswered >= 2) {
      rarestOpinionHTML = `
        <div class="matchHighlightBox">
          <div class="eyebrow" style="color:var(--red);margin-bottom:6px">Deine ausgeprägteste Minderheitenmeinung</div>
          <h3 style="font-size:17px;margin:0 0 8px;font-weight:800;line-height:1.35">${escapeHTML(stats.rarestOpinion.pollTitle)}</h3>
          <p style="font-size:14px;color:#444;margin:0 0 8px">
            Du hast für <strong>«${escapeHTML(stats.rarestOpinion.userChoice)}»</strong> gestimmt. Nur <strong>${stats.rarestOpinion.percent} %</strong> der Teilnehmer sehen das genauso wie du.
          </p>
        </div>
      `;
    }

    // Themen-Aufschlüsselung (Kategorien)
    const categoryKeys = Object.keys(stats.categoryStats);
    let categoriesHTML = "";
    if (categoryKeys.length > 0) {
      categoriesHTML = `
        <div class="matchSection">
          <div class="matchSectionHeader">
            <h2>Übereinstimmung nach Themengebieten</h2>
            <small>Wie denkst du in den einzelnen Lebensbereichen?</small>
          </div>
          <div class="matchCategoryGrid">
            ${categoryKeys.map(catName => {
              const cat = stats.categoryStats[catName];
              const catPct = cat.answered > 0 ? Math.round((cat.agreement / cat.answered) * 100) : 0;
              return `
                <div class="matchCategoryCard">
                  <div class="matchCategoryTop">
                    <strong>${escapeHTML(catName)}</strong>
                    <span>${catPct} % Match</span>
                  </div>
                  <div class="track" style="height:8px;background:var(--soft);border-radius:3px;overflow:hidden;margin:8px 0 6px">
                    <div class="bar" style="width:${catPct}%;background:var(--red)"></div>
                  </div>
                  <div style="font-size:11px;color:#777">
                    ${cat.answered} Frage${cat.answered === 1 ? '' : 'n'} beantwortet (${cat.agreement} mit der Mehrheit)
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
    }

    // Detail-Vergleich (Filterbar: Alle / Mehrheit / Minderheit)
    let detailsHTML = "";
    if (stats.detailedComparisons.length > 0) {
      detailsHTML = `
        <div class="matchSection">
          <div class="matchSectionHeader">
            <h2>Alle deine Antworten im Detail</h2>
            <div class="matchFilterTabs">
              <button class="matchFilterBtn active" onclick="SwissMatch.filterDetails('all', this)">Alle (${stats.detailedComparisons.length})</button>
              <button class="matchFilterBtn" onclick="SwissMatch.filterDetails('majority', this)">Mit der Mehrheit (${stats.agreementCount})</button>
              <button class="matchFilterBtn" onclick="SwissMatch.filterDetails('minority', this)">Abweichend (${stats.minorityCount})</button>
            </div>
          </div>
          <div class="matchComparisonList" id="matchComparisonList">
            ${stats.detailedComparisons.map(item => `
              <div class="matchComparisonItem ${item.isMajority ? 'item-majority' : 'item-minority'}">
                <div class="matchItemMeta">
                  <span class="category" style="color:var(--red)">${escapeHTML(item.category)}</span>
                  <span>·</span>
                  <span>${escapeHTML(item.time)}</span>
                  ${item.isMajority ? '<span class="matchTag majorityTag">Mehrheit</span>' : '<span class="matchTag minorityTag">Minderheit</span>'}
                </div>
                <h3 class="matchItemTitle"><a href="/frage/${slugify(item.pollTitle)}" style="color:inherit;text-decoration:none">${escapeHTML(item.pollTitle)}</a></h3>
                <div class="matchItemChoices">
                  <div class="matchChoiceBlock userBlock">
                    <div class="choiceLabel">Deine Wahl:</div>
                    <div class="choiceVal"><strong>«${escapeHTML(item.userChoice)}»</strong> (${item.userOptionPercent} % der Stimmen)</div>
                  </div>
                  <div class="matchChoiceBlock majorityBlock">
                    <div class="choiceLabel">Mehrheitswahl:</div>
                    <div class="choiceVal">«${escapeHTML(item.majorityChoice)}» (${item.majorityPercent} % der Stimmen)</div>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }

    // Unbeantwortete Fragen Vorschlag (Stream)
    const userVotes = this.getUserVotesMap();
    const unansweredPolls = polls.filter(p => userVotes[p.id] === undefined && (!p.title || userVotes[p.title] === undefined) && p.userVotedIndex === null);
    let unansweredHTML = "";
    if (unansweredPolls.length > 0) {
      unansweredHTML = `
        <div class="matchSection" style="margin-top:30px">
          <div class="matchSectionHeader">
            <h2>Nächste Fragen für deinen Schweiz-Match</h2>
            <small>Stimme jetzt direkt ab, um dein Profil zu verfeinern</small>
          </div>
          <div class="matchUnansweredGrid">
            ${unansweredPolls.slice(0, 4).map(p => `
              <div class="matchUnansweredCard" id="match-card-${escapeHTML(p.id)}">
                <div class="category" style="color:var(--red);font-size:11px;font-weight:900;text-transform:uppercase;margin-bottom:6px">${escapeHTML(p.category)}</div>
                <h3 style="font-size:15px;margin:0 0 12px;line-height:1.35;font-weight:800">${escapeHTML(p.title)}</h3>
                <div class="quickVotes">
                  ${(p.options || ["JA", "NEIN"]).map((opt, idx) => `
                    <button class="qv" onclick="SwissMatch.voteFromMatch('${escapeHTML(p.id)}', ${idx})">${escapeHTML(opt)}</button>
                  `).join("")}
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }

    // Meilensteine & Badges
    const milestonesHTML = `
      <div class="matchSection">
        <div class="matchSectionHeader">
          <h2>Deine Meilensteine</h2>
          <small>Fortschritt durch deine Meinungsbeiträge</small>
        </div>
        <div class="matchMilestonesGrid">
          ${stats.milestones.map(m => `
            <div class="matchMilestoneCard ${m.achieved ? 'achieved' : 'locked'}">
              <div class="milestoneIcon">${m.achieved ? '✓' : '🔒'}</div>
              <div>
                <strong style="font-size:14px;display:block;margin-bottom:2px">${escapeHTML(m.title)}</strong>
                <small style="font-size:12px;color:#666">${escapeHTML(m.desc)}</small>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    // Share Modal & Button Action
    const shareActionHTML = `
      <div class="matchShareBar">
        <button class="publish" style="margin:0;padding:12px 24px" onclick="SwissMatch.openShareModal()">
          🇨🇭 Schweiz-Match teilen / speichern
        </button>
      </div>
    `;

    container.innerHTML = `
      <div class="swissMatchLayout">
        ${heroHTML}
        ${authBannerHTML}
        ${rarestOpinionHTML}
        ${shareActionHTML}
        ${categoriesHTML}
        ${detailsHTML}
        ${unansweredHTML}
        ${milestonesHTML}
      </div>
    `;

    // Update Floating Mini-Banner
    this.updateGlobalMatchBadge(stats);
  },

  // Direktes Abstimmen innerhalb der Schweiz-Match Seite
  async voteFromMatch(pollId, optionIndex) {
    if (typeof submitPollVote === "function") {
      await submitPollVote(pollId, optionIndex, false);
      setTimeout(() => {
        this.renderMatchPage();
      }, 300);
    }
  },

  // Filterung der Vergleichsliste (Alle / Mehrheit / Minderheit)
  filterDetails(type, btnEl) {
    const btns = document.querySelectorAll(".matchFilterBtn");
    btns.forEach(b => b.classList.remove("active"));
    if (btnEl) btnEl.classList.add("active");

    const items = document.querySelectorAll(".matchComparisonItem");
    items.forEach(item => {
      if (type === "all") {
        item.style.display = "block";
      } else if (type === "majority") {
        item.style.display = item.classList.contains("item-majority") ? "block" : "none";
      } else if (type === "minority") {
        item.style.display = item.classList.contains("item-minority") ? "block" : "none";
      }
    });
  },

  // Globales Schweiz-Match Badge in der Navigation / Header aktualisieren
  updateGlobalMatchBadge(statsObj) {
    const stats = statsObj || this.calculateStats();
    const badgeEl = document.getElementById("navMatchBadge");
    if (!badgeEl) return;

    if (stats.totalAnswered > 0) {
      badgeEl.style.display = "inline-flex";
      badgeEl.innerHTML = `🇨🇭 <strong>${stats.matchPercent}% Match</strong> <span style="font-size:11px;opacity:0.85">(${stats.totalAnswered} beantwortet)</span>`;
    } else {
      badgeEl.style.display = "none";
    }
  },

  // Share Modal öffnen
  openShareModal() {
    const stats = this.calculateStats();
    const modal = document.getElementById("shareMatchModal");
    if (!modal) return;

    document.getElementById("shareMatchPercent").textContent = `${stats.matchPercent}%`;
    document.getElementById("shareMatchArchetype").textContent = stats.archetype.title;
    document.getElementById("shareMatchCount").textContent = `${stats.totalAnswered} Abstimmungen`;

    modal.classList.add("open");
  },

  closeShareModal() {
    const modal = document.getElementById("shareMatchModal");
    if (modal) modal.classList.remove("open");
  },

  // Native Web Share API oder Link kopieren
  async shareMatchNative() {
    const stats = this.calculateStats();
    const shareData = {
      title: "Mein Schweiz-Match auf diskutier.ch",
      text: `Ich habe einen Schweiz-Match von ${stats.matchPercent} % (${stats.archetype.title}) auf diskutier.ch! Wie denkst du im Vergleich zur Schweizer Community?`,
      url: window.location.origin + "/schweiz-match"
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        if (window.GA && typeof window.GA.trackShare === "function") {
          window.GA.trackShare({ contentType: "swiss_match", itemId: "match_card", method: "web_share" });
        }
        this.closeShareModal();
        return;
      } catch(e){}
    }

    // Fallback: In Zwischenablage kopieren
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      showToast("Link & Text in die Zwischenablage kopiert!");
      if (window.GA && typeof window.GA.trackShare === "function") {
        window.GA.trackShare({ contentType: "swiss_match", itemId: "match_card", method: "clipboard" });
      }
      this.closeShareModal();
    }
  }
};

window.SwissMatch = SwissMatch;
