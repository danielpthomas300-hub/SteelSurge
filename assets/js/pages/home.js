/* ==========================================================================
   Steel Surge — Home page
   Split from site.js: only pages that need it load it. Shared helpers come
   from site.js through window.SS._ (the calendar adds its own).
   ========================================================================== */
(() => {
  "use strict";
  const { $, BUILD_STEPS, HOME_CREWS, HOME_DEFAULTS, ICON, a11y, currentSeason, esc, fmtDate, gameCards, hexRgb, initReveal, journeyStats, loadFTC, loadVideos, look, outreachStat, pages, reducedMotion, runCounts, seasonLabel, summarize, theme, url, videoCard, wireVideoCards } = window.SS._;
  const { calButtons, calendarEvents, nextLabel, wireCalButtons } = window.SS._; // pages/calendar.js

  /* ---------------- Hero canvas: current running through a circuit grid ---------------- */
  /* ---------------- Home hero: an FTC field in perspective, charged with energy ----------------
     Layers, back to front: horizon glow behind the logo, field tiles rolling toward you with
     pulses running along the seams, rising sparks, and the occasional lightning arc off the
     logo's power ring. Colors follow the site's accent (Appearance). Move the mouse for sparks;
     click for a shockwave. */
  function heroCanvas(canvas) {
    const ctx = canvas.getContext("2d"), hero = canvas.parentElement;
    let w = 0, h = 0, dpr = 1, raf = 0, visible = true, C = null, last = performance.now(), time = 0;
    let fx = 0, fy = 0, fr = 0, hy = 0, sparks = [], pulses = [], bolts = [], ripples = [], nextBolt = 2, nextPulse = 0.4;
    const hexRgb = (hex) => { const m = /^#?([\da-f]{6})$/i.exec(String(hex).trim()); if (!m) return [59, 168, 255]; const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
    const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a))})`;
    const readColors = () => {
      const cs = getComputedStyle(document.documentElement), g = (k) => cs.getPropertyValue(k).trim();
      C = { surge: hexRgb(g("--surge")), surge2: hexRgb(g("--surge-2")), amber: hexRgb(g("--amber")), light: document.documentElement.dataset.theme === "light" };
    };
    const layout = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const em = hero.querySelector(".hero-emblem"), r = canvas.getBoundingClientRect();
      if (em && getComputedStyle(em).position === "absolute") { const e = em.getBoundingClientRect(); fx = e.left - r.left + e.width / 2; fy = e.top - r.top + e.height / 2; fr = e.width * 0.5; hy = Math.min(h - 90, fy + fr * 0.8); }
      else { fx = w * 0.5; fy = h * 0.2; fr = 0; hy = h * 0.6; }
    };
    const z2y = (z) => hy + (h - hy) / (1 + z * 0.55);        // depth → screen y (z = 0 at the bottom edge)
    const LANES = 16, laneX = (i, y) => fx + (i * (w / LANES) * 1.35) * ((y - hy) / (h - hy));
    const intensity = () => (document.documentElement.classList.contains("overdrive") ? 2.4 : 1);

    function drawGlow() {
      const a = C.light ? 0.16 : 0.22;
      let g = ctx.createRadialGradient(fx, hy, 0, fx, hy, Math.max(w, h) * 0.55);
      g.addColorStop(0, rgba(C.surge, a)); g.addColorStop(0.35, rgba(C.surge, a * 0.35)); g.addColorStop(1, rgba(C.surge, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      if (fr) { g = ctx.createRadialGradient(fx, fy, fr * 0.4, fx, fy, fr * 1.25); g.addColorStop(0, rgba(C.surge2, C.light ? 0.10 : 0.16)); g.addColorStop(1, rgba(C.surge2, 0)); ctx.fillStyle = g; ctx.fillRect(fx - fr * 1.3, fy - fr * 1.3, fr * 2.6, fr * 2.6); }
    }
    function drawFloor() {
      const base = C.light ? 0.42 : 0.62;
      ctx.lineWidth = 1;
      // Lanes running into the distance
      for (let i = -LANES; i <= LANES; i++) {
        const g = ctx.createLinearGradient(0, hy, 0, h); g.addColorStop(0, rgba(C.surge, 0)); g.addColorStop(1, rgba(C.surge, base * (i % 3 === 0 ? 1 : 0.55)));
        ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(fx, hy); ctx.lineTo(laneX(i, h), h); ctx.stroke();
      }
      // Tile seams rolling toward the viewer
      const off = (time * 0.42) % 1;
      for (let k = 0; k < 22; k++) {
        const z = k + 1 - off, y = z2y(z); if (y <= hy + 1) continue;
        ctx.strokeStyle = rgba(C.surge, base * (k % 3 === 0 ? 1.15 : 0.7) / (1 + z * 0.22));
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      // Horizon line
      const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, rgba(C.surge, 0)); g.addColorStop(fx / w, rgba(C.surge2, C.light ? 0.55 : 0.8)); g.addColorStop(1, rgba(C.surge, 0));
      ctx.strokeStyle = g; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(w, hy); ctx.stroke();
    }
    function spawnPulse() { pulses.push({ lane: Math.round((Math.random() * 2 - 1) * LANES * 0.8), p: 0, speed: 0.22 + Math.random() * 0.2, amber: Math.random() < 0.15 }); }
    function drawPulses(dt) {
      for (const q of pulses) {
        q.p += q.speed * dt;
        const col = q.amber ? C.amber : C.surge2;
        for (let k = 6; k >= 0; k--) {
          const p = Math.max(0, q.p - k * 0.018), y = z2y((1 - p) * 20), x = laneX(q.lane, y), s = 1 + p * 2.6;
          ctx.fillStyle = rgba(col, (1 - k / 7) * 0.9); ctx.beginPath(); ctx.arc(x, y, s * (k ? 0.7 : 1), 0, Math.PI * 2); ctx.fill();
        }
        const y = z2y((1 - q.p) * 20), x = laneX(q.lane, y), g = ctx.createRadialGradient(x, y, 0, x, y, 18 * (1 + q.p));
        g.addColorStop(0, rgba(col, 0.5)); g.addColorStop(1, rgba(col, 0)); ctx.fillStyle = g; ctx.fillRect(x - 40, y - 40, 80, 80);
      }
      pulses = pulses.filter((q) => q.p < 1.02);
    }
    function spawnSpark(x, y, burst = false) {
      sparks.push({ x: x ?? Math.random() * w, y: y ?? hy + Math.random() * (h - hy), vx: (Math.random() - 0.5) * (burst ? 80 : 14), vy: -(burst ? 30 + Math.random() * 90 : 12 + Math.random() * 26),
        life: 0, max: burst ? 0.6 + Math.random() * 0.6 : 2.5 + Math.random() * 3.5, r: Math.random() < 0.15 ? 2 : 1.2, amber: Math.random() < 0.12, seed: Math.random() * 10 });
    }
    function drawSparks(dt) {
      for (const p of sparks) {
        p.life += dt; p.x += (p.vx + Math.sin(time * 1.3 + p.seed) * 8) * dt; p.y += p.vy * dt;
        const a = Math.sin(Math.PI * Math.min(1, p.life / p.max)) * (0.55 + 0.45 * Math.sin(time * 9 + p.seed * 7));
        ctx.fillStyle = rgba(p.amber ? C.amber : C.surge2, a); ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
      }
      sparks = sparks.filter((p) => p.life < p.max && p.y > -10);
    }
    function bolt(x1, y1, x2, y2, rough) {
      const pts = [[x1, y1], [x2, y2]];
      for (let pass = 0; pass < 5; pass++) for (let i = pts.length - 1; i > 0; i--) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i], len = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / (len || 1), ny = (bx - ax) / (len || 1), d = (Math.random() - 0.5) * len * rough;
        pts.splice(i, 0, [(ax + bx) / 2 + nx * d, (ay + by) / 2 + ny * d]);
      }
      return pts;
    }
    function spawnBolt() {
      if (!fr) return;
      const a = Math.random() * Math.PI * 2, b = a + (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.9), R1 = fr * 0.98, R2 = fr * (1.05 + Math.random() * 0.25);
      bolts.push({ pts: bolt(fx + Math.cos(a) * R1, fy + Math.sin(a) * R1, fx + Math.cos(b) * R2, fy + Math.sin(b) * R2, 0.35), t: 0 });
    }
    function drawBolts(dt) {
      for (const b of bolts) {
        b.t += dt; const a = Math.max(0, 1 - b.t / 0.45) * (0.6 + 0.4 * Math.random());
        ctx.save(); ctx.lineJoin = "round"; ctx.shadowColor = rgba(C.surge2, 1); ctx.shadowBlur = 14;
        ctx.strokeStyle = rgba(C.surge2, a); ctx.lineWidth = 2; ctx.beginPath(); b.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
        ctx.shadowBlur = 0; ctx.strokeStyle = `rgba(255,255,255,${a * 0.9})`; ctx.lineWidth = 0.8; ctx.stroke(); ctx.restore();
      }
      bolts = bolts.filter((b) => b.t < 0.45);
    }
    function drawRipples(dt) {
      for (const r of ripples) {
        r.t += dt; const k = r.t / 0.9, rad = 10 + k * 160;
        ctx.strokeStyle = rgba(C.surge2, (1 - k) * 0.7); ctx.lineWidth = 2 * (1 - k) + 0.5;
        ctx.beginPath(); ctx.ellipse(r.x, r.y, rad, rad * (r.y > hy ? 0.35 : 1), 0, 0, Math.PI * 2); ctx.stroke();
      }
      ripples = ripples.filter((r) => r.t < 0.9);
    }
    const calm = () => document.documentElement.classList.contains("a11y-calm");
    function frame(now) {
      if (calm()) { staticFrame(); return; } // visitor turned on "reduce motion"
      const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
      const k = intensity();
      ctx.clearRect(0, 0, w, h);
      drawGlow(); drawFloor();
      if ((nextPulse -= dt * k) <= 0) { spawnPulse(); nextPulse = 0.35 + Math.random() * 0.7; }
      drawPulses(dt);
      if (sparks.length < (w < 700 ? 22 : 48) * k && Math.random() < 0.5) spawnSpark();
      drawSparks(dt); drawRipples(dt);
      if ((nextBolt -= dt * k) <= 0) { spawnBolt(); if (Math.random() < 0.4) spawnBolt(); nextBolt = 2.2 + Math.random() * 3.5; }
      drawBolts(dt);
      if (visible) raf = requestAnimationFrame(frame);
    }
    readColors(); layout();
    const relayout = () => { layout(); if (reducedMotion || document.documentElement.classList.contains("a11y-calm")) staticFrame(); };
    addEventListener("resize", relayout);
    addEventListener("ss:theme", () => requestAnimationFrame(() => { readColors(); if (reducedMotion) staticFrame(); }));
    function staticFrame() { ctx.clearRect(0, 0, w, h); drawGlow(); drawFloor(); }
    if (reducedMotion) { staticFrame(); return; }
    // Logo tilt and sparks follow the pointer; a click sends a shockwave
    const stage = hero.querySelector(".emblem-stage");
    let lastSpark = 0;
    hero.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (stage) { stage.style.setProperty("--ry", `${((x / w) - 0.5) * 14}deg`); stage.style.setProperty("--rx", `${(0.5 - y / h) * 10}deg`); }
      const t = performance.now(); if (t - lastSpark > 60 && sparks.length < 140) { lastSpark = t; for (let i = 0; i < 2; i++) spawnSpark(x, y, true); }
    });
    hero.addEventListener("pointerleave", () => { stage?.style.setProperty("--rx", "0deg"); stage?.style.setProperty("--ry", "0deg"); });
    hero.addEventListener("pointerdown", (e) => {
      if (e.target.closest("a, button")) return;
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      ripples.push({ x, y, t: 0 }); for (let i = 0; i < 14; i++) spawnSpark(x, y, true);
      if (fr && Math.hypot(x - fx, y - fy) < fr * 1.2) { spawnBolt(); spawnBolt(); }
    });
    const resume = () => { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame); };
    addEventListener("ss:a11y", () => { if (!calm() && visible) resume(); });
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) resume(); }).observe(canvas);
    document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) resume(); });
    // The logo settles in after its entrance animation, so measure again once it has
    setTimeout(relayout, 1000);
    for (let i = 0; i < 30; i++) { spawnSpark(); sparks[sparks.length - 1].life = Math.random() * 2; }
    for (let i = 0; i < 3; i++) { spawnPulse(); pulses[pulses.length - 1].p = Math.random() * 0.8; }
    raf = requestAnimationFrame(frame);
  }

  function nextEventCard(e) {
    if (!e) return "";
    const place = [e.venue, [e.city, e.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
    return `<div class="next-event reveal"><span class="tag ok">Up next · ${esc(nextLabel(e))}</span><h3>${esc(e.name)}</h3><p>${fmtDate(e.start)}${place ? ` · ${esc(place)}` : ""}</p><a class="link-arrow" href="https://ftcscout.org/events/${esc(e.season)}/${esc(e.code)}" target="_blank" rel="noopener">Follow it live on FTCScout ${ICON.arrow}</a></div>`;
  }
  /** "This season" banner under the home hero, from content/seasons.json (newest game first). */
  async function seasonBanner() {
    const wrap = $("#home-season-wrap"), host = $("#home-season"); if (!host) return;
    let s;
    try { s = (await (await fetch(url("content/seasons.json"), { cache: "no-cache" })).json()).seasons?.[0]; } catch { return; }
    if (!s?.name) return;
    const y = Number(s.year), now = currentSeason(), live = y === now;
    host.innerHTML = `
      <div class="season-card reveal">
        <div class="season-text">
          <span class="season-kicker"><i></i>${live ? "This season" : y > now ? "Next season" : "Latest game"} · ${seasonLabel(y)}</span>
          <h2>${esc(s.name)}</h2>
          <p class="season-meta">${[s.theme, s.presenter].filter(Boolean).map(esc).join(" · ")}</p>
          ${s.tagline ? `<p class="season-tag">${esc(s.tagline)}</p>` : ""}
        </div>
        <div class="season-actions">
          <a class="btn primary" href="${url(`ftc.html?season=${y}`)}#games">How ${esc(s.name)} works ${ICON.arrow}</a>
          <a class="btn" href="${url(`calculator.html?season=${y}`)}">Score a match</a>
        </div>
      </div>`;
    wrap.hidden = false; initReveal(host);
  }
  pages.home = async (c) => {
    $("#hero-lead").textContent = c.team.intro;
    const badge = $("#hero-badge");
    badge.innerHTML = `<b>FTC #${esc(c.team.number)}</b> ${seasonLabel(currentSeason())} season · ${esc(c.team.location)}`;
    $("#hero-meta").innerHTML = `
      <div><dt>Based in</dt><dd>${esc(c.team.location)}</dd></div>
      <div><dt>Founded</dt><dd>${esc(c.team.rookieYear)}</dd></div>
      <div><dt>Members</dt><dd>${c.members.filter((m) => !m.alumni).length}</dd></div>
      ${outreachStat(c) ? `<div><dt>Outreach</dt><dd>${esc(outreachStat(c).hours)} hrs</dd></div>` : ""}`;
    if (look(c).heroAnimation !== false && look(c).animations !== false) heroCanvas($(".hero-canvas")); else $(".hero-canvas")?.remove();

    const H = { ...HOME_DEFAULTS, ...(c.home?.sections || {}) };
    let pillars = HOME_CREWS;
    if (c.home?.crews?.length) pillars = c.home.crews.filter((x) => x.title).map((x, i) => [x.icon || ["gear", "code", "heart", "star"][i % 4], x.title, x.text || "", x.dept || ""]);
    $("#pillars").innerHTML = pillars.map(([i, t, d, dept]) => `
      <a class="card crew-card reveal" href="${url("team.html")}${dept ? "#" + esc(dept.toLowerCase()) : ""}"><span class="crew-art" aria-hidden="true">${ICON[i] || ICON.star}</span><div class="card-icon">${ICON[i] || ICON.star}</div><h3>${esc(t)}</h3><p>${esc(d)}</p><span class="link-arrow">${dept ? `Meet the ${esc(dept.toLowerCase())} crew` : "Meet the team"} ${ICON.arrow}</span></a>`).join("");
    const steps = c.home?.steps?.length ? c.home.steps.filter((x) => x.title).map((x, k) => [["flag", "pencil", "gear", "code", "trophy", "star"][k % 6], esc(x.title), esc(x.text || "")]) : BUILD_STEPS;
    $("#build-steps").innerHTML = steps.map(([i, t, d], k) => `<li class="step reveal"><span class="step-num">${String(k + 1).padStart(2, "0")}</span><div class="card-icon">${ICON[i] || ICON.star}</div><h3>${t}</h3><p>${d}</p></li>`).join("");

    if (H.season) seasonBanner();

    // Latest videos: the newest upload is featured; the next few are listed. All automatic.
    const vids = (await loadVideos()).slice(0, 5);
    const list = vids.length ? vids : (c.featuredVideos || []);
    const host = $("#latest-videos");
    if (!list.length) { host.closest("section").hidden = true; }
    else {
      const [first, ...rest] = list;
      host.innerHTML = `<div class="latest-main">${videoCard(first, true)}</div><div class="latest-list">${rest.slice(0, 4).map((v) => videoCard(v)).join("")}</div>`;
      wireVideoCards(host);
    }

    $("#home-games").innerHTML = gameCards(3, c.home?.games);
    const names = (c.sponsors || []).map((s) => `<span>${esc(s.name)}</span>`).join("");
    $("#home-sponsors").innerHTML = names ? `<p class="marquee-label">Supported by</p><div class="marquee" aria-label="Our sponsors and partners"><div class="marquee-track">${names}${names}${names}${names}</div></div>` : "";

    // Sections the team switched off in the editor (Home page)
    const hideSec = (el) => { const s = el?.closest("section"); if (s) s.hidden = true; };
    if (!H.stats) hideSec($("#home-stats")); if (!H.crews) hideSec($("#pillars")); if (!H.build) hideSec($("#build-steps"));
    if (!H.videos) hideSec($("#latest-videos")); if (!H.arcade) hideSec($("#home-games")); if (!H.codelab) hideSec($(".codelab-band"));
    if (!H.sponsors) $("#home-sponsors")?.remove(); if (!H.cta) $("#home-cta")?.remove();
    if (!H.sponsors && !H.cta) hideSec($("#home-sponsors") || $("#home-cta"));
    if (!H.stats) return;
    const ftcHost = $("#home-stats");
    ftcHost.innerHTML = `<dl class="stats">${'<div class="stat"><dt class="skeleton">Loading</dt><dd class="skeleton">00</dd></div>'.repeat(4)}</dl>`;
    const ftc = await loadFTC(c.team.number, c.team.rookieYear);
    ftcHost.innerHTML = journeyStats(c, ftc);
    const s = summarize(ftc);
    if (s?.next) {
      badge.innerHTML = `<b>Up next</b> ${esc(s.next.name)} · ${fmtDate(s.next.start)}`; ftcHost.insertAdjacentHTML("afterbegin", nextEventCard(s.next));
      const ev = calendarEvents(c, ftc).find((e) => e.comp), card = $(".next-event", ftcHost);
      if (ev && card && !window.SSCalendar) await new Promise((r) => (document.readyState === "complete" ? r() : addEventListener("load", r, { once: true })));
      if (ev && card) { card.insertAdjacentHTML("beforeend", `${calButtons(ev)}<a class="link-arrow cal-more" href="${url("team.html")}#calendar">Full season calendar ${ICON.arrow}</a>`); wireCalButtons(card, [ev]); }
    }
    runCounts(ftcHost); initReveal(ftcHost);
  };
})();
