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
  const DEFAULTS = { difficulty: "medium", volume: 0.7, sfx: true, shake: !reducedMotion, particles: true, glow: true, contrast: false, bigText: false };
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

  /* ---------------- Sound: WebAudio synth with a small effects chain ----------------
     Every sound is made in code (no audio files to download). Voices run through a soft
     filter, a short room reverb, and a limiter so effects sound full without clipping. */
  const Sound = {
    ctx: null, master: null, bus: null, verb: null, muted: store.get("ss-arcade-muted", false), _last: {}, _noise: null, _loops: new Set(),
    ensure() {
      if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {}); return this.ctx; }
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      try { this.ctx = new AC({ latencyHint: "interactive" }); } catch { return null; }
      const ctx = this.ctx;
      // voices → bus → (dry + reverb) → tone filter → master volume → limiter → speakers
      this.master = ctx.createGain(); this.applyVolume();
      const tone = ctx.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 9500; tone.Q.value = 0.5;
      const limit = ctx.createDynamicsCompressor(); limit.threshold.value = -12; limit.knee.value = 8; limit.ratio.value = 6; limit.attack.value = 0.003; limit.release.value = 0.18;
      this.bus = ctx.createGain(); this.bus.gain.value = 1;
      this.verb = ctx.createConvolver(); this.verb.buffer = this._impulse(1.1, 3.2);
      const wet = ctx.createGain(); wet.gain.value = 0.16;
      this.bus.connect(tone); this.bus.connect(this.verb); this.verb.connect(wet); wet.connect(tone);
      tone.connect(this.master); this.master.connect(limit); limit.connect(ctx.destination);
      return ctx;
    },
    /** A short, dark room reverb made from decaying noise. */
    _impulse(secs, decay) {
      const ctx = this.ctx, len = Math.floor(ctx.sampleRate * secs), buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
      return buf;
    },
    _noiseBuf() {
      if (this._noise) return this._noise;
      const ctx = this.ctx, len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return (this._noise = buf);
    },
    /** Skips a named sound if it already played in the last `ms` (stops stacking in busy frames). */
    _gate(key, ms = 30) { const now = performance.now(); if (now - (this._last[key] || 0) < ms) return false; this._last[key] = now; return true; },
    _ready() { const ctx = this.ensure(); return ctx && !this.muted && Settings.sfx ? ctx : null; },
    setMuted(m) { this.muted = m; store.set("ss-arcade-muted", m); this.applyVolume(); if (m) this.stopLoops(); },
    applyVolume() { if (this.master) this.master.gain.setTargetAtTime(this.muted || !Settings.sfx ? 0 : 0.9 * Settings.volume, this.master.context.currentTime, 0.015); },
    _out(pan) {
      if (!pan || !this.ctx.createStereoPanner) return this.bus;
      const p = this.ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); p.connect(this.bus); return p;
    },
    /** One synth voice. Square and saw waves are softened by a filter; `detune` adds a second, slightly
        detuned oscillator for a thicker sound. f2 glides the pitch; `release` lets the tail ring. */
    tone({ f = 440, f2 = null, dur = 0.12, type = "square", vol = 0.18, attack = 0.005, delay = 0, detune = null, pan = 0, release = 0.04, cutoff = null } = {}) {
      const ctx = this._ready(); if (!ctx) return;
      const t = ctx.currentTime + delay, g = ctx.createGain(), end = t + dur;
      const harsh = type === "square" || type === "sawtooth";
      const filt = ctx.createBiquadFilter(); filt.type = "lowpass"; filt.Q.value = 0.7;
      filt.frequency.setValueAtTime(cutoff || (harsh ? Math.min(7000, Math.max(f, f2 || 0) * 5 + 600) : 12000), t);
      const level = vol * (harsh ? 0.8 : 1);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(level, t + attack);
      g.gain.setValueAtTime(level, Math.max(t + attack, end - dur * 0.6)); g.gain.exponentialRampToValueAtTime(0.0001, end + release);
      const cents = detune ?? (harsh ? 7 : 0);
      [0, ...(cents ? [cents] : [])].forEach((dt, i) => {
        const o = ctx.createOscillator(); o.type = type; o.detune.value = i ? dt : 0;
        o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), end);
        const og = ctx.createGain(); og.gain.value = cents ? 0.6 : 1;
        o.connect(og); og.connect(filt); o.start(t); o.stop(end + release + 0.05);
      });
      filt.connect(g); g.connect(this._out(pan));
    },
    /** Filtered noise burst (impacts, air, steam). `f2` sweeps the filter. */
    noise({ dur = 0.25, vol = 0.25, f = 1200, f2 = null, q = 0.8, type = "lowpass", delay = 0, attack = 0.002, pan = 0 } = {}) {
      const ctx = this._ready(); if (!ctx) return;
      const t = ctx.currentTime + delay, src = ctx.createBufferSource(), filt = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = this._noiseBuf(); filt.type = type; filt.frequency.setValueAtTime(f, t); if (f2) filt.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur); filt.Q.value = q;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filt); filt.connect(g); g.connect(this._out(pan)); src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
    },
    /** A held sound (motor, hum) you can steer while it plays: const m = Sound.loop(); m.set({ f, vol }); m.stop(). */
    loop({ f = 110, type = "sawtooth", vol = 0.05, cutoff = 900 } = {}) {
      const ctx = this._ready();
      const dummy = { alive: false, set() {}, stop() {} }; if (!ctx) return dummy;
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), filt = ctx.createBiquadFilter(), g = ctx.createGain(), now = ctx.currentTime;
      o.type = type; o2.type = "sine"; o.frequency.value = f; o2.frequency.value = f / 2;
      filt.type = "lowpass"; filt.frequency.value = cutoff; filt.Q.value = 2;
      g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), now + 0.08);
      o.connect(filt); o2.connect(filt); filt.connect(g); g.connect(this.bus); o.start(); o2.start();
      const h = {
        set: ({ f: nf, vol: nv, cutoff: nc } = {}) => {
          const t = ctx.currentTime;
          if (nf) { o.frequency.setTargetAtTime(nf, t, 0.05); o2.frequency.setTargetAtTime(nf / 2, t, 0.05); }
          if (nv != null) g.gain.setTargetAtTime(Math.max(0.0001, nv), t, 0.05);
          if (nc) filt.frequency.setTargetAtTime(nc, t, 0.05);
        },
        alive: true,
        stop: () => {
          if (!this._loops.has(h)) return; this._loops.delete(h); h.alive = false;
          const t = ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0.0001, t, 0.06); o.stop(t + 0.4); o2.stop(t + 0.4);
        },
      };
      this._loops.add(h); return h;
    },
    stopLoops() { [...this._loops].forEach((l) => l.stop()); },
    /** Plays notes in a row: Sound.seq([523, 659, 784], { gap: 0.08 }) */
    seq(notes, { gap = 0.08, dur = 0.16, type = "triangle", vol = 0.12, delay = 0, release = 0.12 } = {}) {
      notes.forEach((f, i) => { if (f) this.tone({ f, dur, type, vol, delay: delay + i * gap, release }); });
    },
    _bell(f, vol, delay = 0, dur = 0.35) {
      this.tone({ f, dur, type: "sine", vol, delay, release: dur * 0.8 });
      this.tone({ f: f * 2.01, dur: dur * 0.5, type: "sine", vol: vol * 0.35, delay, release: dur * 0.4 });
      this.tone({ f: f * 3.02, dur: dur * 0.25, type: "triangle", vol: vol * 0.12, delay, release: dur * 0.2 });
    },

    /* ---- Named effects shared by every game ---- */
    /** Tiny UI tick (settings, toggles). */
    blip() { if (!this._gate("blip", 40)) return; this.tone({ f: 1250, f2: 1500, dur: 0.035, type: "sine", vol: 0.07, release: 0.03 }); },
    /** Soft hover tick for buttons. */
    hover() { if (!this._gate("hover", 60)) return; this.tone({ f: 2200, dur: 0.018, type: "sine", vol: 0.025, release: 0.015 }); },
    /** Confirm / menu choice. */
    select() { if (!this._gate("select", 50)) return; this._bell(784, 0.1, 0, 0.14); this._bell(1175, 0.08, 0.06, 0.2); },
    /** Collect something good (coin-style two-step). */
    pickup() { if (!this._gate("pickup", 40)) return; this.tone({ f: 988, dur: 0.06, type: "square", vol: 0.07, release: 0.02 }); this.tone({ f: 1319, dur: 0.16, type: "square", vol: 0.07, delay: 0.06, release: 0.12 }); this._bell(2637, 0.03, 0.06, 0.2); },
    /** Rising score blip; pass a combo count to climb a scale. */
    combo(n = 0) {
      const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24], st = scale[Math.min(n, scale.length - 1)], f = 523 * Math.pow(2, st / 12);
      this.tone({ f, f2: f * 1.5, dur: 0.07, type: "square", vol: 0.06, release: 0.05 }); this._bell(f * 2, 0.06, 0.02, 0.22);
    },
    /** Something lands or bumps. */
    thud() { if (!this._gate("thud", 35)) return; this.tone({ f: 150, f2: 48, dur: 0.14, type: "sine", vol: 0.32, release: 0.06 }); this.noise({ dur: 0.09, vol: 0.16, f: 700, f2: 200 }); },
    /** Metal clank, for hitting a wall or obstacle. */
    hit() { if (!this._gate("hit", 50)) return; this.tone({ f: 190, f2: 120, dur: 0.1, type: "square", vol: 0.08 }); this.noise({ dur: 0.12, vol: 0.14, f: 2600, q: 3, type: "bandpass" }); this.tone({ f: 523, dur: 0.06, type: "triangle", vol: 0.04, delay: 0.01, release: 0.15, detune: 25 }); },
    /** Big explosion / crash. */
    boom() {
      if (!this._gate("boom", 120)) return;
      this.tone({ f: 110, f2: 28, dur: 0.6, type: "sine", vol: 0.45, release: 0.2 });
      this.noise({ dur: 0.9, vol: 0.5, f: 2400, f2: 120, q: 0.6 });
      this.noise({ dur: 0.25, vol: 0.25, f: 5000, type: "highpass", delay: 0.02 });
      for (let i = 0; i < 5; i++) this.noise({ dur: 0.05, vol: 0.12, f: 1500 + Math.random() * 2500, q: 4, type: "bandpass", delay: 0.12 + Math.random() * 0.4, pan: Math.random() * 1.4 - 0.7 });
    },
    /** Level or goal complete. */
    win() {
      if (!this._gate("win", 150)) return;
      [523, 659, 784, 1047].forEach((f, i) => { this.tone({ f, dur: 0.12, type: "square", vol: 0.06, delay: i * 0.075, release: 0.05 }); this._bell(f, 0.07, i * 0.075, 0.3); });
      [523, 659, 784].forEach((f) => this.tone({ f: f * 2, dur: 0.45, type: "triangle", vol: 0.05, delay: 0.32, release: 0.35 }));
      this._bell(2093, 0.05, 0.34, 0.6);
    },
    /** New personal best: a bigger fanfare. */
    record() {
      if (!this._gate("record", 400)) return;
      const n = [392, 523, 659, 784, 659, 784, 1047];
      const at = [0, 0.1, 0.2, 0.3, 0.45, 0.52, 0.62];
      n.forEach((f, i) => { this.tone({ f, dur: i === n.length - 1 ? 0.5 : 0.1, type: "square", vol: 0.055, delay: at[i], release: i === n.length - 1 ? 0.4 : 0.04 }); this._bell(f * 2, 0.04, at[i], 0.25); });
      [523, 659, 784, 1047].forEach((f) => this.tone({ f, dur: 0.6, type: "triangle", vol: 0.045, delay: 0.62, release: 0.5 }));
      this.noise({ dur: 0.6, vol: 0.05, f: 8000, type: "highpass", delay: 0.62, attack: 0.05 });
    },
    /** Run starts. */
    go() { if (!this._gate("go", 200)) return; this.tone({ f: 330, f2: 660, dur: 0.16, type: "sawtooth", vol: 0.05 }); this._bell(988, 0.08, 0.1, 0.25); this._bell(1319, 0.07, 0.16, 0.35); },
    /** Countdown beep; pass true for the final "go" beep. */
    tick(last = false) { this.tone({ f: last ? 1319 : 880, dur: last ? 0.22 : 0.08, type: "square", vol: 0.05, release: last ? 0.2 : 0.04 }); },
    /** Low warning beep (heat, time running out). */
    warn() { if (!this._gate("warn", 70)) return; this.tone({ f: 1046, dur: 0.05, type: "square", vol: 0.05, release: 0.02 }); this.tone({ f: 1046 * 0.75, dur: 0.05, type: "square", vol: 0.035, delay: 0.06, release: 0.02 }); },
    /** Wrong answer / not allowed. */
    error() { if (!this._gate("error", 90)) return; this.tone({ f: 180, dur: 0.1, type: "square", vol: 0.08, detune: 30 }); this.tone({ f: 150, dur: 0.16, type: "square", vol: 0.08, delay: 0.1, detune: 30 }); },
    /** You lost a life or missed something important. */
    fail() { if (!this._gate("fail", 120)) return; this.tone({ f: 392, f2: 370, dur: 0.14, type: "triangle", vol: 0.1 }); this.tone({ f: 311, f2: 294, dur: 0.14, type: "triangle", vol: 0.1, delay: 0.15 }); this.tone({ f: 247, f2: 196, dur: 0.35, type: "triangle", vol: 0.1, delay: 0.3, release: 0.2 }); },
    /** Small miss (shot missed, piece dropped). */
    miss() { if (!this._gate("miss", 80)) return; this.tone({ f: 420, f2: 210, dur: 0.18, type: "triangle", vol: 0.08 }); this.noise({ dur: 0.12, vol: 0.05, f: 900, f2: 300 }); },
    /** Game over sting. */
    gameOver() {
      if (!this._gate("over", 500) || performance.now() < (this._recordUntil || 0)) return;
      [[392, 0], [370, 0.18], [349, 0.36], [330, 0.54]].forEach(([f, d], i) => this.tone({ f, dur: i === 3 ? 0.7 : 0.16, type: "square", vol: 0.055, delay: d, release: i === 3 ? 0.4 : 0.05, cutoff: 1400 }));
      this.tone({ f: 82, dur: 0.9, type: "sine", vol: 0.18, delay: 0.54, release: 0.4 });
    },
    /** Air whoosh (menus sliding, fast moves). */
    whoosh() { if (!this._gate("whoosh", 120)) return; this.noise({ dur: 0.28, vol: 0.09, f: 400, f2: 3200, q: 1.4, type: "bandpass", attack: 0.08 }); },
    /** Electric zap. */
    zap() { if (!this._gate("zap", 60)) return; this.tone({ f: 1800, f2: 200, dur: 0.16, type: "sawtooth", vol: 0.06 }); this.noise({ dur: 0.12, vol: 0.08, f: 4000, type: "highpass" }); },
    /** Tape-style rewind. */
    rewind() { this.tone({ f: 1400, f2: 160, dur: 0.38, type: "sawtooth", vol: 0.07, cutoff: 3000 }); this.tone({ f: 1500, f2: 170, dur: 0.38, type: "sawtooth", vol: 0.05, cutoff: 3000, detune: 40 }); this.noise({ dur: 0.34, vol: 0.07, f: 3000, f2: 600, type: "bandpass", q: 2 }); },
    /** Steam hiss (overheat). */
    steam() { this.noise({ dur: 0.9, vol: 0.22, f: 6000, f2: 2500, type: "highpass", attack: 0.03 }); this.tone({ f: 400, f2: 70, dur: 0.6, type: "sawtooth", vol: 0.08, cutoff: 900 }); },
    /** One star earned at the end of a level (i = 0, 1, 2). */
    star(i = 0) { this._bell(1047 * Math.pow(2, (i * 4) / 12), 0.1, 0, 0.5); this.tone({ f: 2093 * Math.pow(2, (i * 4) / 12), dur: 0.05, type: "square", vol: 0.025, release: 0.1 }); },
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
      if (!this.list.length) return;
      ctx.save();
      for (const p of this.list) {
        const a = clamp(p.life / p.max, 0, 1), sz = p.size * (0.55 + 0.45 * a);
        ctx.fillStyle = p.color;
        if (p.glow) {
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = a * 0.28; ctx.beginPath(); ctx.arc(p.x, p.y, sz * 1.9, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(p.x, p.y, sz * 0.62, 0, Math.PI * 2); ctx.fill();
          // streak along the direction of travel for fast sparks
          const sp = Math.hypot(p.vx, p.vy);
          if (sp > 140) { ctx.globalAlpha = a * 0.5; ctx.strokeStyle = p.color; ctx.lineWidth = sz * 0.7; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025); ctx.stroke(); }
        } else {
          ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = a;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((p.x + p.y) * 0.05); ctx.fillRect(-sz / 2, -sz / 2, sz, sz); ctx.restore();
        }
      }
      ctx.restore();
    }
  }

  /* ---------------- Floating text ---------------- */
  class Floaters {
    constructor() { this.list = []; }
    add(text, x, y, color = COLORS.text, size = 18) { this.list.push({ text, x, y, color, size, t: 0 }); }
    update(dt) { this.list.forEach((f) => (f.t += dt)); this.list = this.list.filter((f) => f.t < 0.9); }
    draw(ctx) {
      for (const f of this.list) {
        const k = f.t / 0.9, pop = f.t < 0.18 ? ease.outBack(f.t / 0.18) : 1, y = f.y - ease.outCubic(k) * 34;
        ctx.globalAlpha = 1 - k * k;
        ctx.save(); ctx.translate(f.x, y); ctx.scale(pop, pop);
        ctx.font = `700 ${f.size}px "Space Grotesk", system-ui, sans-serif`; ctx.textAlign = "center"; ctx.lineJoin = "round";
        ctx.lineWidth = Math.max(3, f.size * 0.22); ctx.strokeStyle = "rgba(4,7,11,.85)"; ctx.strokeText(f.text, 0, 0);
        ctx.shadowColor = f.color; ctx.shadowBlur = 10; ctx.fillStyle = f.color; ctx.fillText(f.text, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  }

  /* ---------------- Robot drawing (shared look) ---------------- */
  function drawBot(ctx, x, y, s, { color = COLORS.surge, body = "#1b2633", alpha = 1, look = 1, squash = 0, glow = 10, eye = true, tilt = 0, hot = 0 } = {}) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(1 + squash, 1 - squash); ctx.globalAlpha = alpha;
    const w = s, h = s * 0.82, r = s * 0.22;
    if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
    const bg = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    bg.addColorStop(0, shade(body, 0.22)); bg.addColorStop(0.55, body); bg.addColorStop(1, shade(body, -0.35));
    ctx.fillStyle = bg; ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, s * 0.08);
    roundRect(ctx, -w / 2, -h / 2, w, h, r); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    // rim light along the top edge
    ctx.save(); roundRect(ctx, -w / 2, -h / 2, w, h, r); ctx.clip();
    ctx.globalAlpha = alpha * 0.22; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(1, s * 0.035);
    roundRect(ctx, -w / 2 + s * 0.09, -h / 2 + s * 0.08, w - s * 0.18, h * 0.5, r * 0.7); ctx.stroke();
    ctx.restore(); ctx.globalAlpha = alpha;
    if (hot > 0) { ctx.globalAlpha = alpha * hot * 0.55; ctx.fillStyle = COLORS.danger; roundRect(ctx, -w / 2, -h / 2, w, h, r); ctx.fill(); ctx.globalAlpha = alpha; }
    // antenna
    ctx.strokeStyle = COLORS.steelHi; ctx.lineWidth = Math.max(1.5, s * 0.05);
    ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.lineTo(0, -h / 2 - s * 0.16); ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -h / 2 - s * 0.18, s * 0.06, 0, Math.PI * 2); ctx.fill();
    // visor
    if (eye) {
      const vg = ctx.createLinearGradient(0, -h * 0.2, 0, h * 0.14);
      vg.addColorStop(0, "#03060a"); vg.addColorStop(1, "#101924");
      ctx.fillStyle = vg; roundRect(ctx, -w * 0.32, -h * 0.2, w * 0.64, h * 0.34, h * 0.17); ctx.fill();
      ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 8;
      const ex = look * w * 0.1, now = performance.now() / 1000;
      // blink for ~0.12 s every few seconds (offset by position so bots don't blink together)
      const ph = (now + (x * 0.013 + y * 0.007)) % 4.2, blink = ph < 0.12 ? Math.max(0.15, Math.abs(ph - 0.06) / 0.06) : 1;
      const eh = h * 0.14 * blink, ey = -h * 0.1 + (h * 0.14 - eh) / 2;
      roundRect(ctx, -w * 0.2 + ex, ey, w * 0.13, eh, 2); ctx.fill();
      roundRect(ctx, w * 0.07 + ex, ey, w * 0.13, eh, 2); ctx.fill();
      ctx.shadowBlur = 0;
      // glass reflection
      ctx.globalAlpha = alpha * 0.16; ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.moveTo(-w * 0.26, -h * 0.16); ctx.lineTo(-w * 0.08, -h * 0.16); ctx.lineTo(-w * 0.16, h * 0.1); ctx.lineTo(-w * 0.3, h * 0.1); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = alpha;
    }
    ctx.restore();
  }
  /** Lightens (amt > 0) or darkens (amt < 0) a #rrggbb color. */
  function shade(hex, amt) {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex); if (!m) return hex;
    const f = (v) => Math.round(clamp(amt > 0 ? v + (255 - v) * amt : v * (1 + amt), 0, 255)).toString(16).padStart(2, "0");
    return "#" + f(parseInt(m[1], 16)) + f(parseInt(m[2], 16)) + f(parseInt(m[3], 16));
  }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  /** Full screen, with a fallback that fills the window where real full screen isn't allowed (iPhone, embedded browsers). */
  function toggleFull(el) {
    if (document.fullscreenElement) return document.exitFullscreen();
    if (el.classList.contains("pseudo-full")) return exitPseudo(el);
    const req = el.requestFullscreen?.();
    if (!req) return enterPseudo(el);
    req.catch(() => enterPseudo(el));
    // Some embedded browsers neither grant nor refuse; fall back if nothing happened
    setTimeout(() => { if (!document.fullscreenElement && !el.classList.contains("pseudo-full")) enterPseudo(el); }, 600);
  }
  document.addEventListener("fullscreenchange", () => { if (document.fullscreenElement) document.querySelectorAll(".pseudo-full").forEach(exitPseudo); });
  function enterPseudo(el) {
    el.classList.add("pseudo-full"); document.documentElement.classList.add("no-scroll");
    const onKey = (e) => { if (e.key === "Escape") { exitPseudo(el); removeEventListener("keydown", onKey, true); } };
    addEventListener("keydown", onKey, true);
    dispatchEvent(new Event("resize"));
  }
  function exitPseudo(el) { el.classList.remove("pseudo-full"); document.documentElement.classList.remove("no-scroll"); dispatchEvent(new Event("resize")); }

  /** Can this browser blur and threshold a canvas? (needed for bloom) */
  const Post = { ok: (() => { try { const x = document.createElement("canvas").getContext("2d"); if (typeof x.filter !== "string") return false; x.filter = "blur(2px)"; return x.filter === "blur(2px)"; } catch { return false; } })() };

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
      document.addEventListener("visibilitychange", () => { if (document.hidden) { Sound.stopLoops(); if (this.running && !this.paused && this.pausable !== false) this.pause(); } });
      // Soft tick when the mouse moves over a button inside the game
      this.root.addEventListener("pointerover", (e) => { if (e.pointerType !== "mouse") return; const b = e.target.closest?.(".btn, .level-grid button, .menu-diff button, .icon-btn, .diff-badge"); if (b && !b.contains(e.relatedTarget) && !b.disabled) Sound.hover(); });
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
      addEventListener("resize", () => { if (this.overlayOpen()) this._fitOverlay(); });
      // Difficulty badge: always shows the current level; click to change it
      const badge = document.createElement("button");
      badge.className = "diff-badge"; badge.type = "button"; badge.dataset.act = "difficulty"; badge.title = "Change difficulty";
      gear.before(badge);
      this._syncBadge = () => { const i = level(); badge.textContent = levelName(); badge.dataset.level = String(i); badge.setAttribute("aria-label", `Difficulty: ${levelName()}. Change difficulty`); };
      this._syncBadge();
      badge.addEventListener("click", () => this.openSettings());
      applyLook();
      pause?.addEventListener("click", () => (this.paused ? this.resume() : this.pause()));
      this._setPauseBtn(); // greyed out until a game is running
      if (full) {
        full.addEventListener("click", () => toggleFull(this.root));
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
      this._post(dt);
    }
    /** Screen-space finishing pass: soft neon bloom (bright things glow) and a gentle vignette. */
    _post(dt) {
      const c = this.canvas, W = c.width, H = c.height, ctx = this.ctx;
      if (!W || !H) return;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      // Bloom: shrink the frame, keep only the bright parts, blur, and add it back on top
      if (Settings.glow && Post.ok && !this._slow) {
        const bw = Math.max(64, Math.round(W / 4)), bh = Math.max(36, Math.round(H / 4));
        const b = this._bloom || (this._bloom = document.createElement("canvas")), bx = b.getContext("2d");
        if (b.width !== bw || b.height !== bh) { b.width = bw; b.height = bh; }
        bx.filter = "none"; bx.globalCompositeOperation = "copy"; bx.globalAlpha = 1;
        bx.filter = `brightness(0.9) contrast(2.4) blur(${Math.max(2, bw / 160).toFixed(1)}px)`;
        bx.drawImage(c, 0, 0, bw, bh); bx.filter = "none";
        ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Settings.contrast ? 0.35 : 0.55;
        ctx.imageSmoothingEnabled = true; ctx.drawImage(b, 0, 0, W, H);
        // Watch frame time: switch bloom off on devices that can't keep up
        this._ft = (this._ft ?? 1 / 60) * 0.95 + dt * 0.05;
        if (dt > 0 && this._ft > 1 / 34 && performance.now() - (this._t0 ??= performance.now()) > 4000) this._slow = true;
      }
      // Vignette (cached per canvas size)
      if (!Settings.contrast) {
        if (!this._vig || this._vig.w !== W || this._vig.h !== H) {
          const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.62);
          g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.42)");
          this._vig = { w: W, h: H, g };
        }
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.fillStyle = this._vig.g; ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
    }
    shake(n) { if (!Settings.shake) return; this.shakeAmt = Math.max(this.shakeAmt, n); if (navigator.vibrate && n > 6 && navigator.userActivation?.hasBeenActive) try { navigator.vibrate(Math.min(60, n * 4)); } catch {} }

    showOverlay(html, { onPrimary, primarySelector = "[data-primary]" } = {}) {
      // A game's title screen (it starts with the "Steel Surge Arcade" kicker) becomes the full game menu
      const isMenu = html.includes('class="kicker">Steel Surge Arcade<');
      this.overlay.innerHTML = isMenu ? this._menuHtml(html) : `<div class="overlay-card">${html}</div>`;
      this.overlay.classList.toggle("is-menu", isMenu);
      this.overlay.hidden = false; this.overlay.classList.remove("out");
      const btn = $(primarySelector, this.overlay);
      if (btn && onPrimary) { btn.addEventListener("click", (e) => { e.stopPropagation(); Sound.select(); onPrimary(); }); setTimeout(() => btn.focus({ preventScroll: true }), 50); }
      if (isMenu) this._wireMenu();
      this._addShare();
      const stars = (html.match(/class="stars"[\s\S]*?<\/div>/)?.[0].match(/class="on"/g) || []).length;
      for (let i = 0; i < stars; i++) setTimeout(() => Sound.star(i), 260 + i * 200);
      this._fitOverlay();
      return this.overlay;
    }

    /** Adds a "Share score" button to end-of-run cards that show a big score. */
    _addShare() {
      const big = $(".big-score", this.overlay), actions = $(".overlay-actions", this.overlay);
      if (!big || !actions || $("[data-share]", this.overlay)) return;
      const title = document.querySelector(".game-title h1")?.textContent?.trim() || document.title.split(" · ")[0];
      const pageUrl = location.href.split(/[?#]/)[0];
      const text = `I scored ${big.textContent.trim()} in ${title} on the Steel Surge Arcade (${levelName()}). Can you beat it?`;
      const btn = document.createElement("button"); btn.type = "button"; btn.className = "btn"; btn.dataset.share = ""; btn.textContent = "Share score";
      btn.addEventListener("click", async (e) => {
        e.stopPropagation(); Sound.blip();
        try {
          if (navigator.share && matchMedia("(pointer: coarse)").matches) { await navigator.share({ title: `${title} · Steel Surge Arcade`, text, url: pageUrl }); return; }
          await navigator.clipboard.writeText(`${text} ${pageUrl}`); window.SS?.toast?.("Score copied. Paste it anywhere to share.");
        } catch (err) { if (err?.name !== "AbortError") window.SS?.toast?.("Couldn't share from this browser."); }
      });
      actions.append(btn);
    }

    /* ---------- Game menu: art, play buttons, difficulty, your record, and this game's trophies ---------- */
    _menuHtml(inner) {
      const SS = window.SS || {}, genre = document.querySelector(".game-title span")?.textContent || "";
      const art = SS.gameArt ? SS.gameArt(this.id).replace("<svg ", '<svg preserveAspectRatio="xMidYMid slice" ') : "";
      return `<div class="overlay-card game-menu">
        ${art ? `<div class="menu-art" aria-hidden="true">${art}${genre ? `<span class="menu-genre">${genre}</span>` : ""}</div>` : ""}
        <div class="menu-grid">
          <div class="menu-main">${inner}</div>
          <div class="menu-side">${this._menuSide()}</div>
        </div></div>`;
    }
    _menuSide() {
      const SS = window.SS || {}, earned = store.get("ss-trophies", {}), list = (SS.TROPHIES || []).filter((t) => t.group === this.id);
      const got = list.filter((t) => earned[t.id]).length, plays = store.get("ss-arcade-plays", {})[this.id] || 0, best = this.best();
      const cup = (tier) => (SS.trophyCup ? SS.trophyCup(tier, 22) : "");
      const lv = level();
      return `
        <section class="menu-sec"><h3>Difficulty</h3>
          <div class="menu-diff" role="radiogroup" aria-label="Difficulty">${LEVELS.map((l, i) => `<button type="button" role="radio" aria-checked="${i === lv}" data-level="${l.key}" class="lv-${i}">${l.label}</button>`).join("")}</div>
          <p class="menu-note">${this.difficultyNote || "Higher levels are faster and less forgiving."}</p></section>
        <section class="menu-sec menu-record"><h3>Your record</h3>
          <div><span>Best</span><b>${best ? best.label : "—"}</b></div><div><span>Plays</span><b>${plays.toLocaleString()}</b></div><div><span>Trophies</span><b>${got}/${list.length}</b></div></section>
        ${list.length ? `<section class="menu-sec"><h3>Trophies</h3><ul class="menu-trophies">${list.map((t) => {
          const have = !!earned[t.id], secret = t.hidden && !have;
          return `<li class="${have ? "have" : ""}">${cup(t.tier)}<span><b>${secret ? "Hidden trophy" : t.name}</b><small>${secret ? "Keep playing to find it." : t.desc}</small></span></li>`; }).join("")}</ul></section>` : ""}
        <div class="menu-links"><button type="button" class="btn sm" data-menu-settings>Settings</button><button type="button" class="btn sm" data-menu-howto>How to play</button><a class="btn sm ghost" href="../trophies.html">All trophies</a></div>`;
    }
    _wireMenu() {
      const o = this.overlay;
      o.querySelectorAll(".menu-diff [data-level]").forEach((b) => b.addEventListener("click", (e) => {
        e.stopPropagation(); Settings.difficulty = b.dataset.level; saveSettings(); Sound.blip(); window.SS?.trophy?.("tinkerer");
        this._syncBadge?.(); this.onDifficulty?.();
        o.querySelectorAll(".menu-diff [data-level]").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
      }));
      o.querySelector("[data-menu-settings]")?.addEventListener("click", (e) => { e.stopPropagation(); this.openSettings(); });
      o.querySelector("[data-menu-howto]")?.addEventListener("click", (e) => { e.stopPropagation(); document.querySelector(".game-info")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" }); });
    }
    /** Lets the stage grow while an overlay needs more room than the game's shape allows (phones). */
    _fitOverlay() {
      const card = this.overlay.firstElementChild; if (!card) return;
      this.stage.classList.remove("grown"); this.stage.style.minHeight = this._baseMinH ?? (this._baseMinH = this.stage.style.minHeight || "");
      requestAnimationFrame(() => {
        const need = card.scrollHeight + 36;
        if (need > this.stage.clientHeight + 1) { this.stage.classList.add("grown"); this.stage.style.minHeight = `${need}px`; }
      });
    }
    /** True while an overlay is showing (false as soon as it starts fading out). */
    overlayOpen() { return !this.overlay.hidden && !this.overlay.classList.contains("out"); }
    hideOverlay() {
      if (!this.overlayOpen()) return;
      this.overlay.classList.add("out");
      clearTimeout(this._hideT);
      this._hideT = setTimeout(() => { if (this.overlay.classList.contains("out")) { this.overlay.hidden = true; this.overlay.classList.remove("out"); this.stage.classList.remove("grown"); this.stage.style.minHeight = this._baseMinH ?? ""; } }, 180);
    }
    start() {
      if (!this.running) { const p = store.get("ss-arcade-plays", {}); p[this.id] = (p[this.id] || 0) + 1; store.set("ss-arcade-plays", p); if (!this.puzzle) setTimeout(() => Sound.go(), 60); }
      this.running = true; this.paused = false; this.hideOverlay(); this._setPauseBtn(); window.SS?.track?.("play", this.id);
    }
    /** Awards a site trophy (see assets/js/trophies.js). */
    trophy(id) { window.SS?.trophy?.(id); }
    stop() { this.running = false; this._setPauseBtn(); Sound.stopLoops(); }
    pause() {
      if (!this.running || this.paused) return; this.paused = true; this._setPauseBtn(); Sound.stopLoops(); Sound.tone({ f: 660, f2: 440, dur: 0.12, type: "sine", vol: 0.07 });
      this.showOverlay(`<h2>Paused</h2><p>Take a breather.</p><div class="overlay-actions"><button class="btn primary" data-primary>Resume</button>${this.pauseExtra || ""}</div><p class="overlay-hint">Esc or P to resume</p>`, { onPrimary: () => this.resume() });
      this.onPause?.();
    }
    resume() { if (!this.paused) return; this.paused = false; Sound.tone({ f: 440, f2: 660, dur: 0.12, type: "sine", vol: 0.07 }); this.last = performance.now(); this.hideOverlay(); this._setPauseBtn(); this.onResume?.(); }
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
        <fieldset><legend>Accessibility</legend>${check("shake", "Screen shake", "Turn off if motion bothers you")}${check("particles", "Particle effects", "Sparks and bursts")}${check("glow", "Glow effects", "Neon bloom. Turn off if the game feels slow")}${check("contrast", "High contrast", "Brighter, stronger colors")}${check("bigText", "Larger text", "Bigger menus and labels")}</fieldset>
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
        if (el.name === "difficulty") { this._syncBadge?.(); this.onDifficulty?.(); this.overlay.querySelectorAll(".menu-diff [data-level]").forEach((x) => x.setAttribute("aria-checked", String(x.dataset.level === el.value))); }
      }));
    }

    best() { return store.get(`ss-arcade-${this.id}`, null); }
    /** Saves if better. `better(a,b)` returns true when a beats b. Returns true on new record. */
    submitBest(value, label, better = (a, b) => a > b) {
      const prev = this.best();
      if (!prev || better(value, prev.value)) {
        store.set(`ss-arcade-${this.id}`, { value, label, at: Date.now() }); this.setHudBest(label);
        Sound._recordUntil = performance.now() + 2500; setTimeout(() => Sound.record(), 700); // fanfare instead of the game-over sting
        return true;
      }
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

  window.Arcade = { Game, Sound, Particles, Floaters, COLORS, drawBot, roundRect, shade, clamp, lerp, ease, rand, store, onSwipe, reducedMotion, Settings, diff, level, levelName, pick, LEVELS };
})();
