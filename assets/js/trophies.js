/* ==========================================================================
   Steel Surge — Trophies (PlayStation-style)
   Visitors earn bronze, silver, gold, and platinum trophies for exploring
   the site and playing the arcade. Progress is saved in this browser only.

   API (available on every page):
     SS.trophy("id")          award a trophy (no-op if already earned)
     SS.track("event", data)  record progress; awards trophies when goals are met
   ========================================================================== */
(() => {
  "use strict";
  const KEY = "ss-trophies", STATS = "ss-tstats";
  const get = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  const TIERS = {
    bronze: { label: "Bronze", points: 15, color: "#d08a4e" },
    silver: { label: "Silver", points: 30, color: "#c3ccd6" },
    gold: { label: "Gold", points: 90, color: "#f2c443" },
    platinum: { label: "Platinum", points: 300, color: "#9fd6ff" },
  };
  const GROUPS = {
    site: "Exploring the site", overclock: "Overclock", gridlock: "Gridlock", echo: "Echo", pitcrew: "Pit Crew",
    autonomous: "Autonomous", signal: "Signal Lost", flywheel: "Flywheel", mecanum: "Mecanum Rush", wireup: "Wire Up",
    stackup: "Stack Up", balance: "Balance", odometry: "Odometry", kilovolt: "Kilovolt", all: "Steel Surge",
  };
  const MAIN_PAGES = ["home", "team", "ftc", "calculator", "media", "arcade", "sponsors", "contact", "trophies"];
  const GAME_IDS = ["overclock", "gridlock", "echo", "pitcrew", "autonomous", "signal", "flywheel", "mecanum", "wireup", "stackup", "balance", "odometry", "kilovolt"];

  const LIST = [
    // Exploring the site
    ["first-contact", "site", "bronze", "First Contact", "Visit the Steel Surge website."],
    ["meet-crew", "site", "bronze", "Meet the Crew", "Visit the team page."],
    ["scouting", "site", "bronze", "Number Cruncher", "Open the FTC score calculator."],
    ["rookie", "site", "bronze", "Rookie Briefing", "Read the FTC page all the way to the end."],
    ["pit-pass", "site", "bronze", "Pit Pass", "Visit the sponsors page."],
    ["say-hello", "site", "bronze", "Say Hello", "Visit the contact page."],
    ["now-playing", "site", "bronze", "Now Playing", "Watch one of our team videos."],
    ["dept", "site", "bronze", "Department Head", "Filter the team page by department."],
    ["time-travel", "site", "bronze", "Time Traveler", "Score a match from a past FTC season in the calculator."],
    ["night-shift", "site", "bronze", "Night Shift", "Switch between light and dark mode."],
    ["trophy-case", "site", "bronze", "Trophy Case", "Open your trophy case."],
    ["off-field", "site", "bronze", "Off the Field", "Find the page that doesn't exist.", true],
    ["binge", "site", "silver", "Binge Watcher", "Watch four different team videos."],
    ["grand-tour", "site", "silver", "Grand Tour", "Visit every main page of the site."],
    ["overdrive", "site", "gold", "Overdrive", "Discover the secret code.", true],
    ["arcade-regular", "site", "gold", "Arcade Regular", "Play all thirteen arcade games."],
    ["daredevil", "site", "gold", "Daredevil", "Earn the Extreme trophy in 3 different arcade games."],
    ["tinkerer", "site", "bronze", "Make It Yours", "Change a setting in any arcade game."],
    ["field-trip", "site", "silver", "Field Trip", "Explore 5 different FTC fields in 3D on the FTC page."],
    ["historian", "site", "gold", "FTC Historian", "Explore every FTC field in 3D on the FTC page."],
    // Games
    ["oc-first", "overclock", "bronze", "Ignition", "Finish a run in Overclock."],
    ["oc-close", "overclock", "silver", "Close Call", "Earn a close-call bonus in Overclock."],
    ["oc-1000", "overclock", "gold", "Heat Sink", "Score 1,000 points in a single Overclock run."],
    ["oc-hard", "overclock", "silver", "Redline", "Score 750 points in Overclock on Hard or Extreme."],
    ["oc-extreme", "overclock", "gold", "Meltdown", "Score 500 points in Overclock on Extreme."],
    ["gl-first", "gridlock", "bronze", "Docked", "Clear a Gridlock level."],
    ["gl-perfect", "gridlock", "silver", "Perfectionist", "Earn 3 stars on 10 Gridlock levels."],
    ["gl-all", "gridlock", "gold", "Gridmaster", "Clear all 40 Gridlock levels."],
    ["gl-expert", "gridlock", "silver", "Expert Mover", "Clear 5 of Gridlock's Expert levels (31–40)."],
    ["gl-extreme", "gridlock", "gold", "No Room for Error", "Clear 5 Gridlock levels on Extreme."],
    ["ec-first", "echo", "bronze", "Hello, Me", "Record your first echo."],
    ["ec-half", "echo", "silver", "Déjà Vu", "Clear 5 Echo levels."],
    ["ec-all", "echo", "gold", "Echo Chamber", "Clear every Echo level."],
    ["ec-extreme", "echo", "gold", "Paradox", "Clear 3 Echo levels on Extreme."],
    ["pc-5", "pitcrew", "bronze", "Pit Stop", "Fix 5 robots in one Pit Crew shift."],
    ["pc-combo", "pitcrew", "silver", "Combo Crew", "Reach a ×6 combo in Pit Crew."],
    ["pc-30", "pitcrew", "gold", "Pit Boss", "Fix 30 robots in one Pit Crew shift."],
    ["pc-hard", "pitcrew", "silver", "Crunch Time", "Fix 15 robots in one Pit Crew shift on Hard or Extreme."],
    ["pc-extreme", "pitcrew", "gold", "Championship Pit", "Fix 10 robots in one Pit Crew shift on Extreme."],
    ["au-first", "autonomous", "bronze", "Hello, World", "Clear your first Autonomous level."],
    ["au-repeat", "autonomous", "silver", "Loop de Loop", "Clear an Autonomous level using a Repeat block."],
    ["au-all", "autonomous", "gold", "Full Auto", "Clear all 18 Autonomous levels."],
    ["au-stars", "autonomous", "silver", "Code Review", "Earn 3 stars on 10 Autonomous levels."],
    ["au-extreme", "autonomous", "gold", "Zero Margin", "Clear 5 Autonomous levels on Extreme."],
    ["sl-ping", "signal", "bronze", "Marco...", "Send your first ping in Signal Lost."],
    ["sl-floor", "signal", "silver", "Data Miner", "Clear a floor in Signal Lost."],
    ["sl-5", "signal", "gold", "Deep Dive", "Reach floor 5 in Signal Lost."],
    ["sl-quiet", "signal", "silver", "Silent Running", "Clear a Signal Lost floor using 3 pings or fewer."],
    ["sl-extreme", "signal", "gold", "Ghost Protocol", "Reach floor 3 in Signal Lost on Extreme."],
    ["fw-first", "flywheel", "bronze", "Pollinator", "Score your first shot in Flywheel."],
    ["fw-streak", "flywheel", "silver", "Hot Hand", "Score 5 shots in a row in Flywheel."],
    ["fw-gold", "flywheel", "gold", "Sharpshooter", "Score 500 points in a single Flywheel round."],
    ["fw-bull", "flywheel", "silver", "Bullseye", "Make 3 perfect shots in one Flywheel round."],
    ["fw-extreme", "flywheel", "gold", "No Guide Needed", "Score 250 points in one Flywheel round on Extreme."],
    ["mr-first", "mecanum", "bronze", "Strafe Left", "Finish a course in Mecanum Rush."],
    ["mr-clean", "mecanum", "silver", "Clean Run", "Finish a Mecanum Rush course without touching a cone."],
    ["mr-gold", "mecanum", "gold", "Podium Finish", "Earn a gold time on every Mecanum Rush course."],
    ["mr-robot", "mecanum", "silver", "Pro Driver", "Finish a Mecanum Rush course in robot-centric mode."],
    ["mr-extreme", "mecanum", "gold", "Flawless Lap", "Earn a gold time on a Mecanum Rush course on Extreme."],
    ["wu-first", "wireup", "bronze", "It's Alive!", "Power up your first circuit in Wire Up."],
    ["wu-10", "wireup", "silver", "Electrician", "Power up 10 circuits in Wire Up."],
    ["wu-hard", "wireup", "gold", "Master Electrician", "Solve a Hard or Extreme circuit in Wire Up."],
    ["wu-par", "wireup", "silver", "Efficient Engineer", "Solve a Wire Up circuit in the fewest possible turns."],
    ["wu-extreme", "wireup", "gold", "Live Wire", "Solve an 11×11 Extreme circuit in Wire Up."],
    ["su-10", "stackup", "bronze", "Foundation", "Stack 10 pieces in Stack Up."],
    ["su-25", "stackup", "silver", "High Rise", "Stack 25 pieces in Stack Up."],
    ["su-perfect", "stackup", "silver", "Dead Center", "Make 5 perfect drops in a row in Stack Up."],
    ["su-50", "stackup", "gold", "Skyscraper", "Stack 50 pieces in Stack Up."],
    ["su-extreme", "stackup", "gold", "Steady Slide", "Stack 20 pieces in Stack Up on Extreme."],
    ["ba-10", "balance", "bronze", "Collector", "Collect 10 pieces in one Balance run."],
    ["ba-60", "balance", "silver", "Steady", "Keep the platform up for 60 seconds in Balance."],
    ["ba-500", "balance", "gold", "Perfectly Balanced", "Score 500 points in one Balance run."],
    ["ba-extreme", "balance", "gold", "Tightrope", "Last 45 seconds in Balance on Extreme."],
    ["od-5", "odometry", "bronze", "Dead Reckoning", "Drive a 5-step route from memory in Odometry."],
    ["od-10", "odometry", "silver", "Pathfinder", "Drive a 10-step route from memory in Odometry."],
    ["od-15", "odometry", "gold", "Photographic Memory", "Drive a 15-step route from memory in Odometry."],
    ["od-extreme", "odometry", "gold", "Total Recall", "Drive an 8-step route in Odometry on Extreme."],
    ["kv-first", "kilovolt", "bronze", "Charged Up", "Finish a round of Kilovolt."],
    ["kv-surge", "kilovolt", "silver", "One in a Surge", "Get a Full Surge answer in Kilovolt."],
    ["kv-home", "kilovolt", "bronze", "Home Team", "Answer Steel Surge when it fits a Kilovolt prompt.", true],
    ["kv-3000", "kilovolt", "silver", "High Voltage", "Reach 3,000 V in one Kilovolt round."],
    ["kv-5000", "kilovolt", "gold", "Power Grid", "Reach 5,000 V in one Kilovolt round."],
    ["kv-streak", "kilovolt", "silver", "Daily Current", "Play the Kilovolt Daily Charge 3 days in a row."],
    ["kv-extreme", "kilovolt", "gold", "Lightning Round", "Reach 2,500 V in one Kilovolt round on Extreme."],
    // Platinum
    ["platinum", "all", "platinum", "Surge Ahead", "Earn every other trophy."],
  ].map(([id, group, tier, name, desc, hidden]) => ({ id, group, tier, name, desc, hidden: !!hidden }));
  const BY_ID = Object.fromEntries(LIST.map((t) => [t.id, t]));

  const earned = () => get(KEY, {});
  const stats = () => get(STATS, { pages: {}, videos: {}, games: {} });

  /* ---------------- Trophy icon (SVG cup in tier color) ---------------- */
  function cup(tier, size = 40) {
    const c = TIERS[tier].color, id = `tg${Math.random().toString(36).slice(2, 7)}`;
    return `<svg class="trophy-icon tier-${tier}" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".35" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity=".75"/></linearGradient></defs>
      <path d="M12 6h16v8a8 8 0 0 1-16 0z" fill="url(#${id})"/><path d="M12 9H7v2a5 5 0 0 0 5 5M28 9h5v2a5 5 0 0 1-5 5" stroke="${c}" stroke-width="2.2" fill="none"/>
      <path d="M18 21.5h4V27h-4z" fill="${c}"/><rect x="12.5" y="27" width="15" height="4" rx="1.5" fill="${c}"/><rect x="10.5" y="31" width="19" height="3.5" rx="1.5" fill="url(#${id})"/>
      ${tier === "platinum" ? `<path d="m20 9.5 1.3 2.7 3 .4-2.2 2 .6 2.9L20 16.1l-2.7 1.4.6-2.9-2.2-2 3-.4z" fill="#fff"/>` : ""}</svg>`;
  }

  /* ---------------- Unlock pop-up ---------------- */
  const queue = [];
  let showing = false;
  function chime(tier) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC || get("ss-arcade-muted", false)) return;
      const ctx = chime.ctx || (chime.ctx = new AC()); if (ctx.state === "suspended") ctx.resume();
      const notes = tier === "platinum" ? [523, 659, 784, 1047, 1319] : tier === "gold" ? [659, 880, 1175] : [784, 1175];
      notes.forEach((f, i) => {
        const t = ctx.currentTime + i * 0.09, o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.65);
      });
    } catch {}
  }
  function pop() {
    if (showing || !queue.length) return;
    showing = true;
    const t = queue.shift(), root = document.documentElement.dataset.root || ".";
    const el = document.createElement("a");
    el.className = `trophy-pop tier-${t.tier}`; el.href = `${root}/trophies.html#trophy-${t.id}`; el.setAttribute("role", "status");
    el.innerHTML = `${cup(t.tier, 44)}<span><small>You earned a ${TIERS[t.tier].label.toLowerCase()} trophy</small><b>${t.name}</b></span>`;
    document.body.append(el);
    chime(t.tier);
    requestAnimationFrame(() => el.classList.add("in"));
    setTimeout(() => { el.classList.remove("in"); el.classList.add("out"); setTimeout(() => { el.remove(); showing = false; pop(); }, 400); }, 4200);
  }

  /* ---------------- Award logic ---------------- */
  function trophy(id) {
    const t = BY_ID[id]; if (!t) return false;
    const e = earned(); if (e[id]) return false;
    e[id] = Date.now(); set(KEY, e);
    queue.push(t); if (document.body) pop(); else addEventListener("DOMContentLoaded", pop);
    updateBadge();
    window.dispatchEvent(new CustomEvent("ss:trophy", { detail: t }));
    if (/-extreme$/.test(id) && Object.keys(e).filter((k) => /-extreme$/.test(k)).length >= 3) setTimeout(() => trophy("daredevil"), 900);
    if (id !== "platinum" && LIST.every((x) => x.id === "platinum" || e[x.id])) setTimeout(() => trophy("platinum"), 1200);
    return true;
  }

  function track(event, data) {
    const s = stats();
    if (event === "page") {
      s.pages[data] = 1;
      const map = { home: "first-contact", team: "meet-crew", calculator: "scouting", sponsors: "pit-pass", contact: "say-hello", trophies: "trophy-case", 404: "off-field" };
      trophy("first-contact");
      if (map[data]) trophy(map[data]);
      if (MAIN_PAGES.every((p) => s.pages[p])) trophy("grand-tour");
    } else if (event === "video") {
      s.videos[data] = 1; trophy("now-playing");
      if (Object.keys(s.videos).length >= 4) trophy("binge");
    } else if (event === "play") {
      s.games[data] = 1;
      if (GAME_IDS.every((g) => s.games[g])) trophy("arcade-regular");
    }
    set(STATS, s);
  }

  function updateBadge() {
    const n = Object.keys(earned()).length;
    document.querySelectorAll("[data-trophy-count]").forEach((el) => { el.textContent = n; el.hidden = !n; });
  }

  function summary() {
    const e = earned(), have = LIST.filter((t) => e[t.id]);
    const total = LIST.reduce((a, t) => a + TIERS[t.tier].points, 0), pts = have.reduce((a, t) => a + TIERS[t.tier].points, 0);
    const counts = Object.fromEntries(Object.keys(TIERS).map((k) => [k, have.filter((t) => t.tier === k).length]));
    return { earned: have.length, total: LIST.length, pts, totalPts: total, pct: Math.round((pts / total) * 100), level: 1 + Math.floor(pts / 75), counts };
  }

  /* ---------------- Trophy Case page ---------------- */
  function renderCase() {
    const host = document.getElementById("trophy-case"); if (!host) return;
    const e = earned(), s = summary();
    const fmt = (ts) => new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    let filter = "all";
    const draw = () => {
      const groups = Object.keys(GROUPS).filter((g) => filter === "all" || (filter === "site" ? g === "site" || g === "all" : g !== "site" && g !== "all"));
      host.innerHTML = `
        <div class="tc-summary reveal in">
          <div class="tc-level"><span>Level</span><b>${s.level}</b></div>
          <div class="tc-progress">
            <div class="tc-row"><b>${s.earned} of ${s.total} trophies</b><span>${s.pct}%</span></div>
            <div class="tc-bar"><span style="width:${s.pct}%"></span></div>
            <div class="tc-tiers">${Object.keys(TIERS).map((k) => `<span>${cup(k, 22)} ${s.counts[k]}</span>`).join("")}</div>
          </div>
        </div>
        <div class="tc-filters" role="group" aria-label="Show trophies">${[["all", "All"], ["site", "Site"], ["games", "Games"]].map(([k, l]) => `<button class="chip" type="button" data-f="${k}" aria-pressed="${filter === k}">${l}</button>`).join("")}</div>
        ${groups.map((g) => {
          const ts = LIST.filter((t) => t.group === g), got = ts.filter((t) => e[t.id]).length;
          return `<section class="tc-group"><h2>${GROUPS[g]} <span>${got}/${ts.length}</span></h2><div class="tc-list">${ts.map((t) => {
            const have = !!e[t.id], secret = t.hidden && !have;
            return `<article class="tc-item${have ? " earned" : ""}" id="trophy-${t.id}">${cup(t.tier, 44)}<div><h3>${secret ? "Hidden trophy" : t.name}</h3><p>${secret ? "Keep exploring to reveal this one." : t.desc}</p></div><div class="tc-meta"><span class="tc-tier tier-${t.tier}">${TIERS[t.tier].label}</span>${have ? `<small>Earned ${fmt(e[t.id])}</small>` : `<small>Locked</small>`}</div></article>`;
          }).join("")}</div></section>`;
        }).join("")}
        <div class="tc-foot"><p>Trophies are saved in this browser on this device.</p><button class="btn ghost sm" type="button" data-reset>Reset my trophies</button></div>`;
      host.querySelectorAll("[data-f]").forEach((b) => b.addEventListener("click", () => { filter = b.dataset.f; draw(); }));
      host.querySelector("[data-reset]").addEventListener("click", () => {
        if (!confirm("Reset all your trophies and progress on this device? This can't be undone.")) return;
        set(KEY, {}); set(STATS, { pages: {}, videos: {}, games: {} }); location.reload();
      });
      if (location.hash) host.querySelector(location.hash)?.classList.add("flash");
    };
    draw();
  }

  /* ---------------- Boot ---------------- */
  window.SS = Object.assign(window.SS || {}, { trophy, track, trophySummary: summary, TROPHIES: LIST, trophyCup: cup });
  function start() {
    const page = document.body.dataset.page || "";
    if (!page.startsWith("game") && page !== "editor") track("page", page);
    else if (page.startsWith("game")) track("page", "arcade-game");
    updateBadge();
    renderCase();
    pop();
    // FTC page: award when the reader reaches the end.
    const end = document.getElementById("ftc-end");
    if (end && "IntersectionObserver" in window) new IntersectionObserver(([en], io) => { if (en.isIntersecting) { trophy("rookie"); io.disconnect(); } }).observe(end);
    addEventListener("ss:theme", (ev) => { if (ev.detail === "light" || ev.detail === "dark") trophy("night-shift"); });
  }
  document.addEventListener("ss:ready", () => { updateBadge(); renderCase(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
