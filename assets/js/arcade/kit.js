/* ==========================================================================
   Steel Surge Arcade — shared game kit
   Canvas stage, fixed-step loop, input, synth sound, particles, overlays,
   and best-score storage. Each game builds on window.Arcade.
   ========================================================================== */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const store = {
    get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Player settings (shared by every game, saved on this device) ---------------- */
  /** Five difficulty levels shared by every game. `m` scales speed and pressure in action games. */
  const LEVELS = [
    { key: "superEasy", label: "Super Easy", m: 0.55 },
    { key: "easy", label: "Easy", m: 0.78 },
    { key: "medium", label: "Medium", m: 1 },
    { key: "hard", label: "Hard", m: 1.3 },
    { key: "extreme", label: "Extreme", m: 1.6 },
  ];
  const DEFAULTS = { difficulty: "medium", volume: 0.7, sfx: true, shake: !reducedMotion, particles: true, contrast: false, bigText: false };
  const Settings = Object.assign({}, DEFAULTS, store.get("ss-arcade-settings", {}));
  if (Settings.difficulty === "normal") Settings.difficulty = "medium"; // older saved setting
  if (!LEVELS.some((l) => l.key === Settings.difficulty)) Settings.difficulty = "medium";
  /** 0 = Super Easy … 4 = Extreme */
  const level = () => Math.max(0, LEVELS.findIndex((l) => l.key === Settings.difficulty));
  const levelName = () => LEVELS[level()].label;
  /** Pressure multiplier for action games: 0.55 (Super Easy) to 1.6 (Extreme). */
  const diff = () => LEVELS[level()].m;
  /** Pick a value by difficulty: pick([superEasy, easy, medium, hard, extreme]) */
  const pick = (arr) => arr[level()];
  const saveSettings = () => { store.set("ss-arcade-settings", Settings); applyLook(); if (typeof Sound !== "undefined") Sound.applyVolume(); };
  function applyLook() { const g = document.getElementById("game"); if (g) { g.classList.toggle("hc", Settings.contrast); g.classList.toggle("bigtext", Settings.bigText); } }

  const COLORS = {
    bg: "#070a0e", floor: "#0e151d", grid: "#131c26", line: "#212c39", steel: "#2d3b4c", steelHi: "#4a5b70",
    text: "#e9eef4", muted: "#97a4b4", dim: "#67768a",
    surge: "#3ba8ff", surge2: "#84cdff", amber: "#ffb547", ok: "#3ddc97", danger: "#ff5d5d", violet: "#c38bff",
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = { outCubic: (t) => 1 - Math.pow(1 - t, 3), outBack: (t) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }, inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2) };
  const rand = (a, b) => a + Math.random() * (b - a);

  /* ---------------- Sound: tiny WebAudio synth ---------------- */
  const Sound = {
    ctx: null, master: null, muted: store.get("ss-arcade-muted", false),
    ensure() {
      if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return this.ctx; }
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      this.ctx = new AC(); this.master = this.ctx.createGain(); this.applyVolume();
      const comp = this.ctx.createDynamicsCompressor(); this.master.connect(comp); comp.connect(this.ctx.destination);
      return this.ctx;
    },
    setMuted(m) { this.muted = m; store.set("ss-arcade-muted", m); this.applyVolume(); },
    applyVolume() { if (this.master) this.master.gain.value = this.muted || !Settings.sfx ? 0 : 0.85 * Settings.volume; },
    tone({ f = 440, f2 = null, dur = 0.12, type = "square", vol = 0.18, attack = 0.005, delay = 0 } = {}) {
      const ctx = this.ensure(); if (!ctx || this.muted) return;
      const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
    },
    noise({ dur = 0.25, vol = 0.25, f = 1200, q = 0.8, type = "lowpass", delay = 0 } = {}) {
      const ctx = this.ensure(); if (!ctx || this.muted) return;
      const t = ctx.currentTime + delay, len = Math.ceil(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource(), filt = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = buf; filt.type = type; filt.frequency.value = f; filt.Q.value = q; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filt); filt.connect(g); g.connect(this.master); src.start(t);
    },
    // Named effects shared across games
    blip() { this.tone({ f: 660, f2: 990, dur: 0.07, type: "square", vol: 0.08 }); },
    select() { this.tone({ f: 520, dur: 0.06, type: "triangle", vol: 0.12 }); this.tone({ f: 780, dur: 0.08, type: "triangle", vol: 0.1, delay: 0.05 }); },
    pickup() { this.tone({ f: 880, f2: 1760, dur: 0.1, type: "triangle", vol: 0.12 }); },
    thud() { this.noise({ dur: 0.12, vol: 0.18, f: 400 }); this.tone({ f: 120, f2: 60, dur: 0.12, type: "sine", vol: 0.25 }); },
    boom() { this.noise({ dur: 0.6, vol: 0.45, f: 900 }); this.tone({ f: 160, f2: 30, dur: 0.5, type: "sawtooth", vol: 0.22 }); },
    win() { [523, 659, 784, 1047].forEach((f, i) => this.tone({ f, dur: 0.22, type: "triangle", vol: 0.13, delay: i * 0.09 })); },
    warn() { this.tone({ f: 1100, dur: 0.05, type: "square", vol: 0.06 }); },
    rewind() { this.tone({ f: 900, f2: 140, dur: 0.35, type: "sawtooth", vol: 0.1 }); this.noise({ dur: 0.3, vol: 0.08, f: 3000, type: "bandpass", q: 2 }); },
  };

  /* ---------------- Particles ---------------- */
  class Particles {
    constructor() { this.list = []; }
    burst(x, y, { n = 16, color = COLORS.surge, speed = 220, life = 0.6, size = 3, gravity = 300, spread = Math.PI * 2, angle = 0, drag = 0.9, glow = true } = {}) {
      if (!Settings.particles) return;
      if (reducedMotion) n = Math.ceil(n / 3);
      for (let i = 0; i < n; i++) {
        const a = angle + (Math.random() - 0.5) * spread, s = speed * (0.35 + Math.random() * 0.65);
        this.list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.6 + Math.random() * 0.4), max: life, size: size * (0.6 + Math.random() * 0.7), color, gravity, drag, glow });
      }
    }
    update(dt) {
      for (const p of this.list) { p.vx *= Math.pow(p.drag, dt * 60); p.vy = p.vy * Math.pow(p.drag, dt * 60) + p.gravity * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
      this.list = this.list.filter((p) => p.life > 0);
    }
    draw(ctx) {
      for (const p of this.list) {
        const a = clamp(p.life / p.max, 0, 1);
        ctx.globalAlpha = a; ctx.fillStyle = p.color;
        if (p.glow) { ctx.shadowColor = p.color; ctx.shadowBlur = 8; }
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    }
  }

  /* ---------------- Floating text ---------------- */
  class Floaters {
    constructor() { this.list = []; }
    add(text, x, y, color = COLORS.text, size = 18) { this.list.push({ text, x, y, color, size, t: 0 }); }
    update(dt) { this.list.forEach((f) => (f.t += dt)); this.list = this.list.filter((f) => f.t < 0.9); }
    draw(ctx) {
      for (const f of this.list) {
        const k = f.t / 0.9; ctx.globalAlpha = 1 - k * k;
        ctx.font = `700 ${f.size}px "Space Grotesk", system-ui, sans-serif`; ctx.textAlign = "center"; ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y - ease.outCubic(k) * 34);
      }
      ctx.globalAlpha = 1;
    }
  }

  /* ---------------- Robot drawing (shared look) ---------------- */
  function drawBot(ctx, x, y, s, { color = COLORS.surge, body = "#1b2633", alpha = 1, look = 1, squash = 0, glow = 10, eye = true, tilt = 0, hot = 0 } = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(1 + squash, 1 - squash); ctx.globalAlpha = alpha;
    const w = s, h = s * 0.82, r = s * 0.22;
    if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
    ctx.fillStyle = body; ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, s * 0.08);
    roundRect(ctx, -w / 2, -h / 2, w, h, r); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    if (hot > 0) { ctx.globalAlpha = alpha * hot * 0.55; ctx.fillStyle = COLORS.danger; roundRect(ctx, -w / 2, -h / 2, w, h, r); ctx.fill(); ctx.globalAlpha = alpha; }
    // antenna
    ctx.strokeStyle = COLORS.steelHi; ctx.lineWidth = Math.max(1.5, s * 0.05);
    ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.lineTo(0, -h / 2 - s * 0.16); ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -h / 2 - s * 0.18, s * 0.06, 0, Math.PI * 2); ctx.fill();
    // visor
    if (eye) {
      ctx.fillStyle = "#0a0f15"; roundRect(ctx, -w * 0.32, -h * 0.2, w * 0.64, h * 0.34, h * 0.17); ctx.fill();
      ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 6;
      const ex = look * w * 0.1;
      roundRect(ctx, -w * 0.2 + ex, -h * 0.1, w * 0.13, h * 0.14, 2); ctx.fill();
      roundRect(ctx, w * 0.07 + ex, -h * 0.1, w * 0.13, h * 0.14, 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  /* ---------------- Game shell ---------------- */
  /**
   * new Arcade.Game({ id, width, height, update(dt), render(ctx), onKey(e) })
   * Handles canvas sizing (crisp on any screen), a fixed-step loop, pause on tab switch,
   * screen shake, overlays, HUD buttons, and best scores.
   */
  class Game {
    constructor(opts) {
      Object.assign(this, { width: 960, height: 540 }, opts);
      this.root = $("#game");
      this.stage = $(".stage", this.root);
      this.canvas = $("canvas", this.stage);
      this.ctx = this.canvas.getContext("2d");
      this.overlay = $(".overlay", this.stage);
      this.stage.style.aspectRatio = `${this.width} / ${this.height}`;
      // Keep the whole board on screen: limit width by available height.
      this.stage.style.maxWidth = `max(320px, calc((100svh - 270px) * ${this.width / this.height}))`;
      this.stage.style.marginInline = "auto";
      this.shakeAmt = 0; this.time = 0; this.running = false; this.paused = false; this.acc = 0; this.last = 0;
      this.keys = new Set(); this.particles = new Particles(); this.floaters = new Floaters();
      this._resize = this._resize.bind(this); this._frame = this._frame.bind(this);
      new ResizeObserver(this._resize).observe(this.stage); this._resize();
      this._wireHud(); this._wireKeys();
      document.addEventListener("visibilitychange", () => { if (document.hidden && this.running && !this.paused && this.pausable !== false) this.pause(); });
      requestAnimationFrame(this._frame);
    }
    _resize() {
      const r = this.stage.getBoundingClientRect(), dpr = Math.min(2.5, devicePixelRatio || 1);
      this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr);
      this.scale = (r.width * dpr) / this.width;
    }
    _wireHud() {
      const mute = $("[data-act=mute]", this.root), pause = $("[data-act=pause]", this.root), full = $("[data-act=fullscreen]", this.root);
      const setMuteIcon = () => { mute.setAttribute("aria-pressed", String(Sound.muted)); mute.setAttribute("aria-label", Sound.muted ? "Unmute sound" : "Mute sound"); mute.classList.toggle("off", Sound.muted); };
      mute?.addEventListener("click", () => { Sound.setMuted(!Sound.muted); setMuteIcon(); if (!Sound.muted) Sound.blip(); });
      setMuteIcon();
      // Settings button (difficulty, sound, accessibility)
      const gear = document.createElement("button");
      gear.className = "icon-btn"; gear.type = "button"; gear.dataset.act = "settings"; gear.setAttribute("aria-label", "Game settings"); gear.title = "Settings";
      gear.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>';
      mute?.before(gear);
      gear.addEventListener("click", () => this.openSettings());
      // Difficulty badge: always shows the current level; click to change it
      const badge = document.createElement("button");
      badge.className = "diff-badge"; badge.type = "button"; badge.dataset.act = "difficulty"; badge.title = "Change difficulty";
      gear.before(badge);
      this._syncBadge = () => { const i = level(); badge.textContent = levelName(); badge.dataset.level = String(i); badge.setAttribute("aria-label", `Difficulty: ${levelName()}. Change difficulty`); };
      this._syncBadge();
      badge.addEventListener("click", () => this.openSettings());
      applyLook();
      pause?.addEventListener("click", () => (this.paused ? this.resume() : this.pause()));
      if (full) {
        if (!document.fullscreenEnabled) full.hidden = true;
        full.addEventListener("click", () => { if (document.fullscreenElement) document.exitFullscreen(); else this.root.requestFullscreen?.().catch(() => {}); });
      }
      this.stage.addEventListener("pointerdown", () => Sound.ensure(), { passive: true });
    }
    _wireKeys() {
      addEventListener("keydown", (e) => {
        if (e.target.closest && e.target.closest("input, textarea, select")) return;
        Sound.ensure();
        const gameKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Space"];
        if (gameKeys.includes(e.key) && this.stage.getBoundingClientRect().bottom > 0) e.preventDefault();
        if (e.key === "Escape" || e.key === "p" || e.key === "P") { if (this.running && this.pausable !== false) { this.paused ? this.resume() : this.pause(); } return; }
        if (e.key === "m" || e.key === "M") { $("[data-act=mute]", this.root)?.click(); return; }
        if (this.stage.querySelector(".settings-layer")) return;
        if (this.overlayOpen() && (e.key === " " || e.key === "Enter")) {
          const primary = $("[data-primary]", this.overlay), a = document.activeElement;
          // Only when focus isn't on some other control (so Tab + Enter on "More games" still works).
          if (primary && (!a || a === document.body || a === primary)) { e.preventDefault(); if (!e.repeat) primary.click(); return; }
        }
        if (!e.repeat) this.keys.add(e.key);
        this.onKey?.(e);
      });
      addEventListener("keyup", (e) => { this.keys.delete(e.key); this.onKeyUp?.(e); });
      addEventListener("blur", () => this.keys.clear());
    }
    _frame(t) {
      requestAnimationFrame(this._frame);
      const dt = Math.min(0.05, (t - (this.last || t)) / 1000); this.last = t;
      if (this.running && !this.paused) {
        this.acc += dt; const step = 1 / 120;
        while (this.acc >= step) { this.time += step; this.update?.(step); this.acc -= step; }
      }
      if (!this.paused) { this.particles.update(dt); this.floaters.update(dt); this.shakeAmt = Math.max(0, this.shakeAmt - dt * 40); this.ambient?.(dt); }
      const ctx = this.ctx; ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
      if (this.shakeAmt > 0 && !reducedMotion) ctx.translate(rand(-1, 1) * this.shakeAmt, rand(-1, 1) * this.shakeAmt);
      this.render?.(ctx, dt);
    }
    shake(n) { if (!Settings.shake) return; this.shakeAmt = Math.max(this.shakeAmt, n); if (navigator.vibrate && n > 6 && navigator.userActivation?.hasBeenActive) try { navigator.vibrate(Math.min(60, n * 4)); } catch {} }

    showOverlay(html, { onPrimary, primarySelector = "[data-primary]" } = {}) {
      this.overlay.innerHTML = `<div class="overlay-card">${html}</div>`;
      this.overlay.hidden = false; this.overlay.classList.remove("out");
      const btn = $(primarySelector, this.overlay);
      if (btn && onPrimary) { btn.addEventListener("click", (e) => { e.stopPropagation(); Sound.select(); onPrimary(); }); setTimeout(() => btn.focus({ preventScroll: true }), 50); }
      return this.overlay;
    }
    /** True while an overlay is showing (false as soon as it starts fading out). */
    overlayOpen() { return !this.overlay.hidden && !this.overlay.classList.contains("out"); }
    hideOverlay() {
      if (!this.overlayOpen()) return;
      this.overlay.classList.add("out");
      clearTimeout(this._hideT);
      this._hideT = setTimeout(() => { if (this.overlay.classList.contains("out")) { this.overlay.hidden = true; this.overlay.classList.remove("out"); } }, 180);
    }
    start() { this.running = true; this.paused = false; this.hideOverlay(); this._setPauseBtn(); window.SS?.track?.("play", this.id); }
    /** Awards a site trophy (see assets/js/trophies.js). */
    trophy(id) { window.SS?.trophy?.(id); }
    stop() { this.running = false; this._setPauseBtn(); }
    pause() {
      if (!this.running || this.paused) return; this.paused = true; this._setPauseBtn();
      this.showOverlay(`<h2>Paused</h2><p>Take a breather.</p><div class="overlay-actions"><button class="btn primary" data-primary>Resume</button>${this.pauseExtra || ""}</div><p class="overlay-hint">Esc or P to resume</p>`, { onPrimary: () => this.resume() });
      this.onPause?.();
    }
    resume() { if (!this.paused) return; this.paused = false; this.last = performance.now(); this.hideOverlay(); this._setPauseBtn(); this.onResume?.(); }
    _setPauseBtn() { const b = $("[data-act=pause]", this.root); if (!b) return; b.setAttribute("aria-label", this.paused ? "Resume" : "Pause"); b.classList.toggle("is-paused", this.paused); b.disabled = !this.running; }

    /** Settings panel. Pauses action games while open; changes save instantly. */
    openSettings() {
      const wasRunning = this.running && !this.paused && this.pausable !== false;
      if (wasRunning) { this.paused = true; this._setPauseBtn(); }
      this.stage.querySelector(".settings-layer")?.remove();
      const layer = document.createElement("div"); layer.className = "overlay settings-layer"; layer.setAttribute("role", "dialog"); layer.setAttribute("aria-label", "Game settings");
      const radio = (name, val, label) => `<label class="opt"><input type="radio" name="${name}" value="${val}" ${Settings[name] === val ? "checked" : ""}><span>${label}</span></label>`;
      const check = (name, label, hint) => `<label class="toggle"><input type="checkbox" name="${name}" ${Settings[name] ? "checked" : ""}><span class="sw"></span><span><b>${label}</b>${hint ? `<small>${hint}</small>` : ""}</span></label>`;
      layer.innerHTML = `<div class="overlay-card settings">
        <span class="kicker">Settings</span><h2>Make it yours</h2>
        <fieldset><legend>Difficulty</legend><div class="opts five">${LEVELS.map((l) => radio("difficulty", l.key, l.label)).join("")}</div>
          <p class="set-note">${this.difficultyNote || "Higher levels are faster and less forgiving."} ${this.puzzle ? "Changes apply right away." : "Takes effect on your next run."} Hard and Extreme unlock extra trophies.</p></fieldset>
        <fieldset><legend>Sound</legend>${check("sfx", "Sound effects")}<label class="range"><span>Volume</span><input type="range" name="volume" min="0" max="1" step="0.05" value="${Settings.volume}"></label></fieldset>
        <fieldset><legend>Accessibility</legend>${check("shake", "Screen shake", "Turn off if motion bothers you")}${check("particles", "Particle effects", "Sparks and bursts")}${check("contrast", "High contrast", "Brighter, stronger colors")}${check("bigText", "Larger text", "Bigger menus and labels")}</fieldset>
        <div class="overlay-actions"><button class="btn primary" data-done>Done</button><button class="btn" data-reset>Reset to defaults</button></div></div>`;
      this.stage.append(layer);
      const close = () => { layer.remove(); removeEventListener("keydown", onKey, true); if (wasRunning) this.resume(); this.stage.querySelector("[data-primary]")?.focus({ preventScroll: true }); };
      const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); close(); } };
      addEventListener("keydown", onKey, true);
      layer.querySelector("[data-done]").addEventListener("click", close);
      layer.querySelector("[data-done]").focus({ preventScroll: true });
      layer.querySelector("[data-reset]").addEventListener("click", () => { Object.assign(Settings, DEFAULTS); saveSettings(); close(); this.openSettings(); });
      layer.querySelectorAll("input").forEach((el) => el.addEventListener("input", () => {
        if (el.type === "radio") Settings[el.name] = el.value; else if (el.type === "checkbox") Settings[el.name] = el.checked; else Settings[el.name] = +el.value;
        saveSettings(); Sound.blip(); window.SS?.trophy?.("tinkerer");
        if (el.name === "difficulty") { this._syncBadge?.(); this.onDifficulty?.(); }
      }));
    }

    best() { return store.get(`ss-arcade-${this.id}`, null); }
    /** Saves if better. `better(a,b)` returns true when a beats b. Returns true on new record. */
    submitBest(value, label, better = (a, b) => a > b) {
      const prev = this.best();
      if (!prev || better(value, prev.value)) { store.set(`ss-arcade-${this.id}`, { value, label, at: Date.now() }); this.setHudBest(label); return true; }
      return false;
    }
    setHudBest(label) { const el = $("[data-hud=best]", this.root); if (el) el.textContent = label ?? "—"; }
    /** One-line hint shown above the game (real text, so it stays readable on phones). */
    setMessage(text) { const el = $("[data-msg]", this.root); if (el && el.textContent !== text) { el.textContent = text || ""; el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); } }
    setHud(name, text) { const el = $(`[data-hud=${name}]`, this.root); if (el) el.textContent = text; }
  }

  /* ---------------- Touch helpers ---------------- */
  function onSwipe(el, cb, { min = 24 } = {}) {
    let sx = 0, sy = 0, id = null;
    el.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") return; id = e.pointerId; sx = e.clientX; sy = e.clientY; });
    el.addEventListener("pointerup", (e) => {
      if (e.pointerId !== id) return; id = null;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < min) return;
      cb(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "R" : "L") : (dy > 0 ? "D" : "U"));
    });
  }

  window.Arcade = { Game, Sound, Particles, Floaters, COLORS, drawBot, roundRect, clamp, lerp, ease, rand, store, onSwipe, reducedMotion, Settings, diff, level, levelName, pick, LEVELS };
})();
