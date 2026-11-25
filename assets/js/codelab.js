/* ==========================================================================
   Steel Surge Code Lab — page
   Three levels of FTC programming practice:
     1. Debug it  — read real FTC code, find the bug          (codelab-data.js DEBUG)
     2. Write it  — finish a method, checked by test inputs   (DRILLS, run by MiniJava)
     3. Drive it  — program an autonomous on a simulated field (CHALLENGES, codelab-sim.js)
   Progress and code are saved in this browser (localStorage "ss-codelab").
   ========================================================================== */
(() => {
  "use strict";
  const MJ = window.MiniJava, SIM = window.RobotSim, DATA = window.CODELAB;
  const host = document.getElementById("codelab");
  if (!host || !MJ || !SIM || !DATA) return;

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const KEY = "ss-codelab";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const state = Object.assign({ tab: "learn", learn: {}, debug: {}, drills: {}, auto: {}, cur: {} }, load());
  state.learn ||= {};
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };
  const trophy = (id) => window.SS?.trophy?.(id);
  const toast = (m) => window.SS?.toast?.(m);
  const ICON = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z"/></svg>',
    stop: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2.5"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    bug: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="6" width="8" height="14" rx="4"/><path d="M19 7l-3 2M5 7l3 2M19 19l-3-2M5 19l3-2M20 13h-4M4 13h4M10 4l1 2M14 4l-1 2"/></svg>',
    code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/></svg>',
    robot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M9 14h.01M15 14h.01M2 13v3M22 13v3"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>',
    step: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 5v14M10 7l8 5-8 5V7Z"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14Z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
  };

  /* ================================================================ Syntax highlighting */
  const KW = new Set("abstract boolean break byte case catch char class continue default do double else enum extends final float for if implements import int interface long new package private protected public return short static super switch this throw throws try void while var true false null".split(" "));
  function highlight(src) {
    const re = /(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?)|(@[A-Za-z_]\w*)|(\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?[dDfFlL]?\b)|([A-Za-z_$][\w$]*)(\s*\()?|([^\sA-Za-z_$\d"'@/]+|\/)/g;
    let out = "", last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index)); last = re.lastIndex;
      const [all, com, str, ann, num, word, paren, punct] = m;
      if (com) out += `<span class="c-com">${esc(com)}</span>`;
      else if (str) out += `<span class="c-str">${esc(str)}</span>`;
      else if (ann) out += `<span class="c-ann">${esc(ann)}</span>`;
      else if (num) out += `<span class="c-num">${esc(num)}</span>`;
      else if (word) {
        const cls = KW.has(word) ? (["int", "double", "boolean", "long", "char", "float", "void", "var"].includes(word) ? "c-type" : "c-kw") : /^[A-Z][A-Z0-9_]+$/.test(word) && word.length > 1 ? "c-const" : /^[A-Z]/.test(word) ? "c-type" : paren ? "c-fn" : "c-id";
        out += `<span class="${cls}">${esc(word)}</span>${paren ? esc(paren) : ""}`;
      } else out += `<span class="c-p">${esc(punct || all)}</span>`;
    }
    return out + esc(src.slice(last));
  }

  /* ================================================================ Read-only code view */
  function codeView(code, { clickable = false } = {}) {
    const lines = code.split("\n");
    return `<div class="cl-view${clickable ? " clickable" : ""}" role="${clickable ? "listbox" : "presentation"}"${clickable ? ' aria-label="Click the line with the problem"' : ""}>${lines.map((l, i) => {
      const inner = `<span class="ln" aria-hidden="true">${i + 1}</span><span class="lc">${highlight(l) || " "}</span>`;
      return clickable && l.trim() ? `<button type="button" class="cl-line" role="option" data-line="${i + 1}" aria-label="Line ${i + 1}: ${esc(l.trim())}">${inner}</button>` : `<div class="cl-line">${inner}</div>`;
    }).join("")}</div>`;
  }


  /* ================================================================ Autocomplete catalog */
  // [name, parameters (null = a field, not a method), what it does]
  const API = {
    DcMotor: [["setPower", "double power", "Power from -1.0 (full reverse) to 1.0 (full forward). 0 stops."], ["getPower", "", "The power you last set."],
      ["setDirection", "DcMotor.Direction direction", "FORWARD or REVERSE. Reverse one side so positive power drives forward."], ["getCurrentPosition", "", "Encoder position in ticks (an int)."],
      ["setTargetPosition", "int position", "Target in ticks for RUN_TO_POSITION. Set it before switching modes."], ["setMode", "DcMotor.RunMode mode", "RUN_WITHOUT_ENCODER, RUN_USING_ENCODER, RUN_TO_POSITION, or STOP_AND_RESET_ENCODER."],
      ["isBusy", "", "True while RUN_TO_POSITION is still moving."], ["setZeroPowerBehavior", "DcMotor.ZeroPowerBehavior behavior", "BRAKE stops quickly at 0 power; FLOAT coasts."],
      ["getTargetPosition", "", "The target you set."], ["getMode", "", "The current run mode."], ["getVelocity", "", "Speed in ticks per second (DcMotorEx)."]],
    Servo: [["setPosition", "double position", "0.0 to 1.0 across the servo's range."], ["getPosition", "", "The last position you set."]],
    IMU: [["getRobotYawPitchRollAngles", "", "Current angles. Follow with .getYaw(AngleUnit.DEGREES)."], ["resetYaw", "", "Make the robot's current heading 0."], ["initialize", "IMU.Parameters parameters", "Tell the IMU how the Control Hub is mounted."]],
    YawPitchRollAngles: [["getYaw", "AngleUnit unit", "Heading. Positive means turned left."], ["getPitch", "AngleUnit unit", "Tilt forward and back."], ["getRoll", "AngleUnit unit", "Tilt side to side."]],
    Telemetry: [["addData", "String caption, Object value", "Add a line to the Driver Station screen."], ["addLine", "String text", "Add a plain line of text."], ["update", "", "Send the lines to the Driver Station."], ["clear", "", "Drop lines you haven't sent yet."]],
    HardwareMap: [["get", "Class type, String name", 'Get a device by its configured name: hardwareMap.get(DcMotor.class, "left")']],
    Gamepad: [["left_stick_x", null, "-1 (left) to 1 (right)"], ["left_stick_y", null, "-1 (pushed UP) to 1 (down)"], ["right_stick_x", null, "-1 (left) to 1 (right)"], ["right_stick_y", null, "-1 (pushed UP) to 1 (down)"],
      ["left_trigger", null, "0 to 1"], ["right_trigger", null, "0 to 1"], ["a", null, "true while pressed"], ["b", null, "true while pressed"], ["x", null, "true while pressed"], ["y", null, "true while pressed"],
      ["left_bumper", null, "true while pressed"], ["right_bumper", null, "true while pressed"], ["dpad_up", null, "true while pressed"], ["dpad_down", null, "true while pressed"], ["dpad_left", null, "true while pressed"], ["dpad_right", null, "true while pressed"]],
    Math: [["abs", "double a", "Distance from 0 (always positive)."], ["max", "double a, double b", "The bigger of two numbers."], ["min", "double a, double b", "The smaller of two numbers."],
      ["round", "double a", "Nearest whole number. Gives a long: use (int) Math.round(x)."], ["sqrt", "double a", "Square root."], ["pow", "double a, double b", "a to the power b."], ["hypot", "double x, double y", "Length of (x, y)."],
      ["atan2", "double y, double x", "Angle in radians."], ["sin", "double radians", ""], ["cos", "double radians", ""], ["toRadians", "double degrees", ""], ["toDegrees", "double radians", ""],
      ["signum", "double a", "1.0, -1.0, or 0.0 depending on the sign."], ["floor", "double a", "Round down."], ["ceil", "double a", "Round up."], ["PI", null, "3.14159…"]],
    Range: [["clip", "double value, double min, double max", "Keep a value between min and max."], ["scale", "double n, double x1, double x2, double y1, double y2", "Map n from one range to another."]],
    ElapsedTime: [["reset", "", "Start counting from 0 again."], ["seconds", "", "Seconds since created or reset."], ["milliseconds", "", "Milliseconds since created or reset."]],
    String: [["equals", "Object other", "Same text? Use this, not ==."], ["length", "", "Number of characters."], ["contains", "String text", ""], ["startsWith", "String text", ""], ["toUpperCase", "", ""], ["toLowerCase", "", ""], ["isEmpty", "", ""]],
    "DcMotor.static": [["Direction", null, "FORWARD or REVERSE"], ["RunMode", null, "Encoder modes"], ["ZeroPowerBehavior", null, "BRAKE or FLOAT"], ["class", null, "For hardwareMap.get"]],
    "DcMotor.Direction": [["FORWARD", null, ""], ["REVERSE", null, "Positive power spins the other way."]],
    "DcMotor.RunMode": [["RUN_WITHOUT_ENCODER", null, "Plain power control."], ["RUN_USING_ENCODER", null, "Speed control using the encoder."], ["RUN_TO_POSITION", null, "Drive to setTargetPosition, then hold."], ["STOP_AND_RESET_ENCODER", null, "Stop and set the encoder to 0."]],
    "DcMotor.ZeroPowerBehavior": [["BRAKE", null, "Stop quickly at 0 power."], ["FLOAT", null, "Coast at 0 power."]],
    AngleUnit: [["DEGREES", null, ""], ["RADIANS", null, ""]],
    "Class.static": [["class", null, "For hardwareMap.get"]],
  };
  const RETURNS = { getRobotYawPitchRollAngles: "YawPitchRollAngles" };
  const GLOBAL_TYPES = { gamepad1: "Gamepad", gamepad2: "Gamepad", telemetry: "Telemetry", hardwareMap: "HardwareMap", Math: "Math", Range: "Range", AngleUnit: "AngleUnit",
    DcMotor: "DcMotor.static", DcMotorEx: "DcMotor.static", DcMotorSimple: "DcMotor.static", Servo: "Class.static", IMU: "Class.static" };
  const BUILTINS = [["sleep", "long milliseconds", "Pause the program (autonomous only)."], ["waitForStart", "", "Wait for the START button."], ["opModeIsActive", "", "True until STOP or time runs out."], ["idle", "", "Let the robot catch up inside a loop."], ["getRuntime", "", "Seconds since INIT."]];
  function declaredTypes(code) {
    const map = {};
    const re = /\b(DcMotor(?:Ex|Simple)?|Servo|IMU|ElapsedTime|String|YawPitchRollAngles|int|double|boolean|long)(\[\])?\s+([A-Za-z_]\w*)((?:\s*(?:=[^,;()]*)?\s*,\s*[A-Za-z_]\w*)*)\s*(?=[=;,)])/g;
    let m;
    while ((m = re.exec(code))) { const t = m[2] ? "array" : m[1].replace(/Ex$|Simple$/, ""); [m[3], ...(m[4] || "").split(",").slice(1).map((x) => x.trim().split(/\s|=/)[0])].forEach((n) => { if (n && !(n in map)) map[n] = t; }); }
    return map;
  }
  function resolveType(expr, code) {
    const parts = expr.split("."), vars = declaredTypes(code);
    let t = GLOBAL_TYPES[parts[0]] || vars[parts[0]];
    for (const p of parts.slice(1)) {
      if (!t) return null;
      if (p.endsWith("()")) { t = RETURNS[p.slice(0, -2)] || null; continue; }
      if (t === "DcMotor.static" && ["Direction", "RunMode", "ZeroPowerBehavior"].includes(p)) t = `DcMotor.${p}`; else return null;
    }
    return t;
  }
  function suggestions(code, pos, force) {
    const before = code.slice(0, pos);
    const dot = before.match(/([A-Za-z_$][\w$]*(?:\(\))?(?:\.[A-Za-z_$][\w$]*(?:\(\))?)*)\.([A-Za-z_$][\w$]*)?$/);
    if (dot) {
      const t = resolveType(dot[1], code), prefix = dot[2] || "";
      return { prefix, items: (API[t] || []).map(([name, params, doc]) => ({ name, params, doc, kind: params == null ? "field" : "method" })) };
    }
    if (!force) return null;
    const w = before.match(/([A-Za-z_$][\w$]*)$/), prefix = w ? w[1] : "", vars = declaredTypes(code);
    const methods = [...code.matchAll(/\b(?:void|int|double|boolean|long|String)\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/g)].map((m) => ({ name: m[1], params: m[2].trim(), doc: "Your method", kind: "method" }));
    const items = [...Object.entries(vars).map(([name, t]) => ({ name, params: null, doc: t === "array" ? "array" : t, kind: "var" })), ...methods,
      ...BUILTINS.map(([name, params, doc]) => ({ name, params, doc, kind: "method" })), ...Object.keys(GLOBAL_TYPES).map((name) => ({ name, params: null, doc: GLOBAL_TYPES[name].replace(".static", ""), kind: "global" }))];
    const seen = new Set(); return { prefix, items: items.filter((i) => !seen.has(i.name) && seen.add(i.name)) };
  }

  /* ================================================================ Editor */
  const LINE_H = 21, PAD = 14;
  function createEditor(el, { value = "", onChange, onRun, snippets = [], label = "Code editor" } = {}) {
    el.classList.add("cl-editor");
    el.innerHTML = `
      <div class="cl-ed-scroll">
        <div class="cl-gutter" aria-hidden="true"></div>
        <div class="cl-ed-body">
          <div class="cl-marks" aria-hidden="true"></div>
          <pre class="cl-hl" aria-hidden="true"><code></code></pre>
          <textarea spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="${esc(label)}"></textarea>
        </div>
      </div>
      ${snippets.length ? `<div class="cl-snips" role="toolbar" aria-label="Insert code">${snippets.map((s, i) => `<button type="button" data-snip="${i}" title="Insert ${esc(s.insert ?? s)}">${esc(s.label ?? s)}</button>`).join("")}</div>` : ""}`;
    const ta = $("textarea", el), code = $(".cl-hl code", el), gutter = $(".cl-gutter", el), marks = $(".cl-marks", el);
    const acBox = document.createElement("div"); acBox.className = "cl-ac"; acBox.hidden = true; acBox.setAttribute("role", "listbox"); acBox.setAttribute("aria-label", "Suggestions"); el.append(acBox);
    let ac = null; // { items, sel, start }
    let charW = 0;
    const acClose = () => { ac = null; acBox.hidden = true; };
    const acRender = () => {
      if (!ac) return;
      acBox.innerHTML = ac.items.map((it, i) => `<div role="option" class="cl-ac-item${i === ac.sel ? " on" : ""}" data-i="${i}" aria-selected="${i === ac.sel}"><span class="k k-${it.kind}">${it.kind === "method" ? "m" : it.kind === "field" ? "f" : it.kind === "var" ? "v" : "g"}</span><b>${esc(it.name)}</b>${it.params != null ? `<span class="sig">(${esc(it.params)})</span>` : ""}</div>`).join("")
        + (ac.items[ac.sel]?.doc ? `<div class="cl-ac-doc">${esc(ac.items[ac.sel].doc)}</div>` : "");
      $(".cl-ac-item.on", acBox)?.scrollIntoView({ block: "nearest" });
    };
    const acOpen = (force) => {
      const pos = ta.selectionStart, got = suggestions(ta.value, pos, force);
      if (!got) return acClose();
      const items = got.items.filter((it) => it.name.toLowerCase().startsWith(got.prefix.toLowerCase())).slice(0, 40);
      if (!items.length || (items.length === 1 && items[0].name === got.prefix && !force)) return acClose();
      ac = { items, sel: 0, start: pos - got.prefix.length };
      // place it under the word being completed
      if (!charW) { const c = document.createElement("canvas").getContext("2d"); c.font = getComputedStyle(ta).font; charW = c.measureText("MMMMMMMMMM").width / 10; }
      const before = ta.value.slice(0, ac.start), line = before.split("\n").length - 1, col = before.length - before.lastIndexOf("\n") - 1;
      const sc = $(".cl-ed-scroll", el), gw = gutter.offsetWidth, er = el.getBoundingClientRect(), scr = sc.getBoundingClientRect();
      let top = scr.top - er.top + PAD + (line + 1) * lh() - sc.scrollTop + 2, left = gw + 16 + col * charW - sc.scrollLeft;
      acBox.hidden = false; acRender();
      const bh = acBox.offsetHeight, bw = acBox.offsetWidth;
      if (top + bh > el.clientHeight - 8 && top - lh() - bh > 0) top = top - lh() - bh - 4;
      acBox.style.top = `${Math.max(4, top)}px`; acBox.style.left = `${Math.max(4, Math.min(left, el.clientWidth - bw - 6))}px`;
    };
    const acAccept = () => {
      const it = ac.items[ac.sel], start = ac.start; acClose();
      const tail = it.kind === "method" ? (it.params ? "()" : "()") : "";
      ta.setSelectionRange(start, ta.selectionStart);
      insert(it.name + tail, it.kind === "method" && it.params ? 1 : 0);
    };
    acBox.addEventListener("mousedown", (e) => { const o = e.target.closest("[data-i]"); if (!o) return; e.preventDefault(); ac.sel = +o.dataset.i; acAccept(); });
    ta.addEventListener("blur", () => setTimeout(acClose, 120));
    ta.addEventListener("click", acClose);
    let err = null, runLine = 0;
    const lh = () => parseFloat(getComputedStyle(ta).lineHeight) || LINE_H;
    const paint = () => {
      const v = ta.value, lines = v.split("\n"), n = lines.length;
      code.innerHTML = highlight(v) + "\n";
      gutter.innerHTML = Array.from({ length: n }, (_, i) => `<span class="${err && err.line === i + 1 ? "bad" : ""}">${i + 1}</span>`).join("");
      const longest = lines.reduce((m, l) => Math.max(m, l.replace(/\t/g, "    ").length), 0);
      ta.style.height = `${n * lh() + PAD * 2}px`;
      ta.style.width = `max(100%, calc(${longest + 4}ch + ${PAD * 2}px))`;
      code.parentElement.style.width = ta.style.width;
      drawMarks();
    };
    const drawMarks = () => {
      marks.innerHTML = (runLine ? `<div class="run" style="top:${PAD + (runLine - 1) * lh()}px"></div>` : "") +
        (err && err.line ? `<div class="err" style="top:${PAD + (err.line - 1) * lh()}px"></div>` : "");
    };
    const insert = (text, selectInside = 0) => {
      ta.focus();
      const ok = document.execCommand?.("insertText", false, text);
      if (!ok) { const s = ta.selectionStart; ta.setRangeText(text, s, ta.selectionEnd, "end"); ta.dispatchEvent(new Event("input")); }
      if (selectInside) { const p = ta.selectionStart - selectInside; ta.setSelectionRange(p, p); }
    };
    ta.addEventListener("input", (e) => {
      err = null; paint(); onChange?.(ta.value);
      const ch = ta.value[ta.selectionStart - 1] || "";
      if (ch === "." && e.inputType !== "insertFromPaste") acOpen(false);
      else if (ac && /[\w$]/.test(ch)) acOpen(false);
      else if (ac) acClose();
    });
    ta.addEventListener("keydown", (e) => {
      const v = ta.value, s = ta.selectionStart, end = ta.selectionEnd;
      if (ac) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); ac.sel = (ac.sel + (e.key === "ArrowDown" ? 1 : -1) + ac.items.length) % ac.items.length; acRender(); return; }
        if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); acAccept(); return; }
        if (e.key === "Escape") { e.preventDefault(); acClose(); return; }
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === " " || e.code === "Space")) { e.preventDefault(); acOpen(true); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); onRun?.(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        const a = v.lastIndexOf("\n", s - 1) + 1, b = v.indexOf("\n", end - 1 < s ? s : end - 1); const stop = b === -1 ? v.length : b;
        const block = v.slice(a, stop).split("\n"), allC = block.every((l) => !l.trim() || /^\s*\/\//.test(l));
        const next = block.map((l) => (!l.trim() ? l : allC ? l.replace(/^(\s*)\/\/ ?/, "$1") : l.replace(/^(\s*)/, "$1// "))).join("\n");
        ta.setSelectionRange(a, stop); insert(next); ta.setSelectionRange(a, a + next.length); return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        const a = v.lastIndexOf("\n", s - 1) + 1;
        if (s === end && !e.shiftKey) { insert("    "); return; }
        const stop = end > s && v[end - 1] === "\n" ? end - 1 : end;
        const b = v.indexOf("\n", stop); const z = b === -1 ? v.length : b;
        const block = v.slice(a, z).split("\n").map((l) => (e.shiftKey ? l.replace(/^ {1,4}/, "") : "    " + l)).join("\n");
        ta.setSelectionRange(a, z); insert(block); ta.setSelectionRange(a, a + block.length); return;
      }
      if (e.key === "Enter" && !e.shiftKey && s === end) {
        e.preventDefault();
        const a = v.lastIndexOf("\n", s - 1) + 1, line = v.slice(a, s), ind = line.match(/^\s*/)[0];
        const opens = /[{(]\s*$/.test(line), closesNext = /^\s*[})]/.test(v.slice(s, v.indexOf("\n", s) === -1 ? v.length : v.indexOf("\n", s)));
        if (opens && closesNext) { insert("\n" + ind + "    " + "\n" + ind, ind.length + 1); return; }
        insert("\n" + ind + (opens ? "    " : "")); return;
      }
      if (e.key === "}" && s === end) {
        const a = v.lastIndexOf("\n", s - 1) + 1, line = v.slice(a, s);
        if (/^\s+$/.test(line) && line.length >= 4) { e.preventDefault(); ta.setSelectionRange(s - 4, s); insert("}"); return; }
      }
      const pairs = { "(": ")", "{": "}", "[": "]", '"': '"' };
      if (pairs[e.key] && s === end && !e.ctrlKey && !e.metaKey) {
        const next = v[s] || "";
        if (e.key === '"' && next === '"') { e.preventDefault(); ta.setSelectionRange(s + 1, s + 1); return; }
        if (/^$|[\s)\]};,]/.test(next) && !(e.key === '"' && /\w/.test(v[s - 1] || ""))) { e.preventDefault(); insert(e.key + pairs[e.key], 1); return; }
      }
      if ([")", "]"].includes(e.key) && v[s] === e.key && s === end) { e.preventDefault(); ta.setSelectionRange(s + 1, s + 1); return; }
      if (e.key === "Backspace" && s === end && s > 0 && pairs[v[s - 1]] && v[s] === pairs[v[s - 1]]) { e.preventDefault(); ta.setSelectionRange(s - 1, s + 1); insert(""); }
    });
    $$("[data-snip]", el).forEach((b) => b.addEventListener("click", () => { const sn = snippets[+b.dataset.snip]; insert(sn.insert ?? sn, sn.back || 0); }));
    ta.value = value; paint();
    return {
      el, ta,
      get: () => ta.value,
      set: (v) => { ta.value = v; err = null; runLine = 0; paint(); },
      error: (line, message) => { err = { line, message }; paint(); if (line) scrollToLine(line); },
      clearError: () => { err = null; paint(); },
      running: (line) => { if (line === runLine) return; runLine = line; drawMarks(); },
      focusLine: (line) => scrollToLine(line),
      setReadOnly: (on) => { ta.readOnly = on; el.classList.toggle("locked", on); },
    };
    function scrollToLine(line) {
      const sc = $(".cl-ed-scroll", el), y = PAD + (line - 1) * lh();
      if (y < sc.scrollTop + 20 || y > sc.scrollTop + sc.clientHeight - 40) sc.scrollTo({ top: Math.max(0, y - sc.clientHeight / 3), behavior: reducedMotion ? "auto" : "smooth" });
    }
  }

  /* ================================================================ Layout + tabs */
  const LEVELS = [
    { id: "learn", n: 0, title: "Start here", sub: "Coding, CAD, and outreach lessons", icon: ICON.book, total: () => (DATA.LESSONS || []).length, done: () => (DATA.LESSONS || []).filter((l) => state.learn[l.id]).length },
    { id: "debug", n: 1, title: "Debug it", sub: "Find the bug in real FTC code", icon: ICON.bug, total: () => DATA.DEBUG.length, done: () => DATA.DEBUG.filter((q) => state.debug[q.id]?.solved).length },
    { id: "write", n: 2, title: "Write it", sub: "Finish methods, checked by tests", icon: ICON.code, total: () => DATA.DRILLS.length, done: () => DATA.DRILLS.filter((d) => state.drills[d.id]?.done).length },
    { id: "drive", n: 3, title: "Drive it", sub: "Program a robot on the field", icon: ICON.robot, total: () => DATA.CHALLENGES.length, done: () => DATA.CHALLENGES.filter((c) => state.auto[c.id]?.done).length },
  ];
  host.innerHTML = `
    <div class="cl-tabs" role="tablist" aria-label="Code Lab levels">${LEVELS.map((l) => `
      <button class="cl-tab" role="tab" type="button" id="tab-${l.id}" aria-controls="panel-${l.id}" data-tab="${l.id}">
        <span class="cl-tab-ico">${l.icon}</span>
        <span class="cl-tab-text"><small>${l.n ? `Level ${l.n}` : "Lessons"}</small><b>${l.title}</b><em>${l.sub}</em></span>
        <span class="cl-tab-prog" data-prog="${l.id}"></span>
      </button>`).join("")}
    </div>
    ${LEVELS.map((l) => `<div class="cl-panel" role="tabpanel" id="panel-${l.id}" aria-labelledby="tab-${l.id}" hidden></div>`).join("")}`;
  const panels = Object.fromEntries(LEVELS.map((l) => [l.id, $(`#panel-${l.id}`)]));
  const rendered = {};
  function updateProgress() {
    for (const l of LEVELS) {
      const d = l.done(), t = l.total(), el = $(`[data-prog="${l.id}"]`);
      el.innerHTML = `<span class="ring" style="--p:${(d / t) * 100}"><span>${d}/${t}</span></span>`;
      el.closest(".cl-tab").classList.toggle("complete", d === t);
    }
  }
  function show(tab, push = true) {
    if (!panels[tab]) tab = "learn";
    state.tab = tab; save();
    $$(".cl-tab").forEach((b) => { const on = b.dataset.tab === tab; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
    for (const [id, p] of Object.entries(panels)) p.hidden = id !== tab;
    if (!rendered[tab]) { rendered[tab] = true; ({ learn: renderLearn, debug: renderDebug, write: renderWrite, drive: renderDrive })[tab](); }
    if (tab !== "drive") sim.stop?.();
    if (push) history.replaceState(null, "", `#${tab}`);
  }
  $$(".cl-tab").forEach((b) => b.addEventListener("click", () => show(b.dataset.tab)));
  $(".cl-tabs").addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    const tabs = $$(".cl-tab"), i = tabs.findIndex((t) => t.dataset.tab === state.tab);
    const n = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    e.preventDefault(); tabs[n].focus(); show(tabs[n].dataset.tab);
  });

  const lessonLink = (topic) => { const l = DATA.LESSONS?.find((x) => x.id === DATA.TOPIC_LESSON?.[topic]); return l ? `<button type="button" class="cl-lesson-link" data-lesson="${l.id}">${ICON.book} Lesson: ${esc(l.title)}</button>` : ""; };

  /* Small list used by every level's sidebar */
  const sideList = (items, cur, status, attr) => `<ol class="cl-list">${items.map((it, i) => {
    const st = status(it);
    return `<li><button type="button" ${attr}="${it.id}" class="${it.id === cur ? "on" : ""} ${st}" aria-current="${it.id === cur}">
      <span class="dot">${st === "done" ? ICON.check : i + 1}</span><span><b>${esc(it.title)}</b><small>${esc(it.topic)}</small></span></button></li>`; }).join("")}</ol>`;

  /* ================================================================ Level 1: Debug it */
  function renderDebug() {
    const P = panels.debug;
    let cur = state.cur.debug && DATA.DEBUG.some((q) => q.id === state.cur.debug) ? state.cur.debug : (DATA.DEBUG.find((q) => !state.debug[q.id]?.solved) || DATA.DEBUG[0]).id;
    const draw = () => {
      const qi = DATA.DEBUG.findIndex((q) => q.id === cur), q = DATA.DEBUG[qi], st = state.debug[q.id] || {};
      state.cur.debug = cur; save();
      const reveal = st.solved || (st.wrong || 0) >= 2;
      P.innerHTML = `
        <div class="cl-layout">
          <aside class="cl-side">
            <div class="cl-side-head"><b>Questions</b><span>${LEVELS[1].done()} of ${DATA.DEBUG.length} solved</span></div>
            ${sideList(DATA.DEBUG, cur, (x) => (state.debug[x.id]?.solved ? "done" : state.debug[x.id]?.wrong ? "tried" : ""), "data-q")}
          </aside>
          <article class="cl-main cl-card">
            <header class="cl-q-head"><span class="cl-chip">${esc(q.topic)}</span>${lessonLink(q.topic)}<span class="cl-count">Question ${qi + 1} of ${DATA.DEBUG.length}</span></header>
            <h2 class="cl-title">${esc(q.title)}</h2>
            <p class="cl-prompt">${esc(q.prompt)}</p>
            ${codeView(q.code, { clickable: q.type === "line" && !reveal })}
            ${q.type === "choice" ? `<div class="cl-choices" role="group" aria-label="Answers">${q.options.map((o, i) => {
              const picked = (st.picks || []).includes(i), right = i === q.answer;
              const cls = reveal && right ? "right" : picked && !right ? "wrong" : "";
              return `<button type="button" class="cl-choice ${cls}" data-pick="${i}" ${reveal || picked ? "disabled" : ""}><span class="letter">${"ABCD"[i]}</span><span>${esc(o)}</span>${cls === "right" ? ICON.check : cls === "wrong" ? ICON.x : ""}</button>`; }).join("")}</div>`
              : `<p class="cl-tip">${reveal ? "" : "Tip: click a line in the code above."}</p>`}
            <div class="cl-feedback" aria-live="polite">${feedback(q, st, reveal)}</div>
            <footer class="cl-actions">
              <button type="button" class="btn ghost" data-prev ${qi === 0 ? "disabled" : ""}>Previous</button>
              <button type="button" class="btn ${reveal ? "primary" : ""}" data-next>${qi === DATA.DEBUG.length - 1 ? "Back to the first" : "Next question"} ${ICON.arrow}</button>
            </footer>
          </article>
        </div>`;
      // mark the answer line once revealed, and wrong line picks
      if (q.type === "line") {
        $$(".cl-line", P).forEach((l) => {
          const n = +(l.dataset.line || $(".ln", l).textContent);
          if (reveal && n === q.answer) l.classList.add("right");
          else if ((st.picks || []).includes(n)) l.classList.add("wrong");
        });
      }
      $("[data-lesson]", P)?.addEventListener("click", (e) => goTo("learn", e.currentTarget.dataset.lesson));
      $$("[data-q]", P).forEach((b) => b.addEventListener("click", () => { cur = b.dataset.q; draw(); $(".cl-main", P).scrollIntoView({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" }); }));
      $$("[data-pick]", P).forEach((b) => b.addEventListener("click", () => answer(q, +b.dataset.pick)));
      $$("button.cl-line", P).forEach((b) => b.addEventListener("click", () => answer(q, +b.dataset.line)));
      $("[data-prev]", P).addEventListener("click", () => { cur = DATA.DEBUG[Math.max(0, qi - 1)].id; draw(); });
      $("[data-next]", P).addEventListener("click", () => { cur = DATA.DEBUG[(qi + 1) % DATA.DEBUG.length].id; draw(); });
    };
    const feedback = (q, st, reveal) => {
      if (st.solved) return `<div class="cl-fb good">${ICON.check}<div><b>${st.wrong ? "Got it." : "Correct!"}</b><p>${q.explain}</p></div></div>`;
      if (reveal) return `<div class="cl-fb reveal">${ICON.bulb}<div><b>Here's the answer.</b><p>${q.explain}</p></div></div>`;
      if (st.wrong) return `<div class="cl-fb bad">${ICON.x}<div><b>Not quite. Try again.</b><p>${q.type === "line" ? "Read each line and ask: what does the robot actually do here?" : "Think about what the code does step by step."}</p></div></div>`;
      return "";
    };
    const answer = (q, pick) => {
      const st = state.debug[q.id] || (state.debug[q.id] = {});
      if (st.solved || (st.picks || []).includes(pick)) return;
      st.picks = [...(st.picks || []), pick];
      if (pick === q.answer) {
        st.solved = true;
        trophy("cl-first-bug");
        if (DATA.DEBUG.every((x) => state.debug[x.id]?.solved)) { trophy("cl-debug-all"); toast("Every bug found. Nice debugging!"); }
      } else st.wrong = (st.wrong || 0) + 1;
      save(); updateProgress(); draw();
      $(".cl-feedback", panels.debug).scrollIntoView({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
    };
    draw();
  }

  /* ================================================================ Level 2: Write it */
  const fmtVal = (x) => (x == null ? "—" : x.t === "array" ? `{${x.v.items.map(fmtVal).join(", ")}}` : x.t === "double" ? MJ.fmtDouble(Math.round(x.v * 1e6) / 1e6) : x.t === "String" ? `"${x.v}"` : MJ.toStr(x));
  const expected = new Map();
  function expectedFor(d) {
    if (!expected.has(d.id)) { const p = MJ.compile(d.solution); expected.set(d.id, d.tests.map((args) => MJ.callMethod(p, d.method, args))); }
    return expected.get(d.id);
  }
  const SNIPS_WRITE = [";", { label: "{ }", insert: "{}", back: 1 }, { label: "( )", insert: "()", back: 1 }, "return ", { label: "if", insert: "if () {\n    \n}", back: 9 }, { label: "Math.abs", insert: "Math.abs()", back: 1 }, { label: "Math.max", insert: "Math.max(, )", back: 3 }, { label: "Range.clip", insert: "Range.clip(, -1.0, 1.0)", back: 13 }, "==", "&&", "!"];
  function renderWrite() {
    const P = panels.write;
    let cur = state.cur.write && DATA.DRILLS.some((d) => d.id === state.cur.write) ? state.cur.write : (DATA.DRILLS.find((d) => !state.drills[d.id]?.done) || DATA.DRILLS[0]).id;
    let ed;
    const draw = () => {
      const di = DATA.DRILLS.findIndex((d) => d.id === cur), d = DATA.DRILLS[di], st = state.drills[d.id] || (state.drills[d.id] = {});
      state.cur.write = cur; save();
      P.innerHTML = `
        <div class="cl-layout">
          <aside class="cl-side">
            <div class="cl-side-head"><b>Drills</b><span>${LEVELS[2].done()} of ${DATA.DRILLS.length} passed</span></div>
            ${sideList(DATA.DRILLS, cur, (x) => (state.drills[x.id]?.done ? "done" : state.drills[x.id]?.runs ? "tried" : ""), "data-d")}
          </aside>
          <article class="cl-main cl-card">
            <header class="cl-q-head"><span class="cl-chip">${esc(d.topic)}</span>${lessonLink(d.topic)}<span class="cl-count">Drill ${di + 1} of ${DATA.DRILLS.length}</span></header>
            <h2 class="cl-title">${esc(d.title)}</h2>
            <p class="cl-prompt">${d.intro}</p>
            ${sharedNotice("write", d.id)}
            <div class="cl-ed-host"></div>
            <div class="cl-actions left">
              <button type="button" class="btn primary" data-run>${ICON.play} Run tests</button>
              <button type="button" class="btn" data-hint>${ICON.bulb} Hint</button>
              <button type="button" class="btn ghost" data-sol ${st.runs ? "" : "disabled title=\"Run your code once first\""}>${ICON.eye} Show a solution</button>
              <button type="button" class="btn ghost" data-reset>${ICON.reset} Start over</button>
              <span class="cl-kbd">Ctrl + Enter runs · Ctrl + Space suggests</span>
            </div>
            <div class="cl-tools" role="group" aria-label="Save and share"><button type="button" class="cl-tool" data-copy>${ICON.copy} Copy code</button><button type="button" class="cl-tool" data-share>${ICON.link} Share link</button></div>
            <div class="cl-hint" hidden>${ICON.bulb}<p>${d.hint}</p></div>
            <div class="cl-results" aria-live="polite"></div>
          </article>
        </div>`;
      const useShared = shared && shared.level === "write" && shared.id === d.id;
      ed = createEditor($(".cl-ed-host", P), { value: useShared ? shared.code : st.code ?? d.template, onChange: (v) => { st.code = v; save(); }, onRun: () => runDrill(d), snippets: SNIPS_WRITE, label: `Code for ${d.title}` });
      $("[data-lesson]", P)?.addEventListener("click", (e) => goTo("learn", e.currentTarget.dataset.lesson));
      $("[data-copy]", P).addEventListener("click", () => copyCode(ed.get()));
      $("[data-share]", P).addEventListener("click", () => shareLink("write", d.id, ed.get()));
      $("[data-mine]", P)?.addEventListener("click", () => { shared = null; history.replaceState(null, "", "#write"); draw(); });
      $$("[data-d]", P).forEach((b) => b.addEventListener("click", () => { cur = b.dataset.d; draw(); }));
      $("[data-run]", P).addEventListener("click", () => runDrill(d));
      $("[data-hint]", P).addEventListener("click", (e) => { const h = $(".cl-hint", P); h.hidden = !h.hidden; e.currentTarget.classList.toggle("on", !h.hidden); });
      $("[data-sol]", P).addEventListener("click", () => {
        const box = $(".cl-results", P);
        box.innerHTML = `<div class="cl-solution"><div class="cl-sol-head"><b>One way to write it</b><button type="button" class="btn sm" data-use>Use this code</button></div>${codeView(d.solution)}</div>`;
        $("[data-use]", box).addEventListener("click", () => { ed.set(d.solution); st.code = d.solution; save(); });
      });
      twoStep($("[data-reset]", P), "Click again to reset", () => { ed.set(d.template); st.code = d.template; save(); $(".cl-results", P).innerHTML = ""; });
      if (st.done && st.code) runDrill(d, true);
    };
    const runDrill = (d, quiet = false) => {
      const st = state.drills[d.id], box = $(".cl-results", P), src = ed.get();
      ed.clearError();
      let prog;
      try { prog = MJ.compile(src); } catch (e) { return showError(e); }
      if (!prog.methods.has(d.method)) return showError(new MJ.CodeError(`Your code needs a method called ${d.method}. Did it get renamed or deleted? Use "Start over" to get it back.`, 1));
      const exp = expectedFor(d), rows = [];
      for (let i = 0; i < d.tests.length; i++) {
        const args = d.tests[i];
        try { const got = MJ.callMethod(prog, d.method, args, {}, 300000); rows.push({ args, got, ok: got.t === exp[i].t && (got.t === "double" ? Math.abs(got.v - exp[i].v) < 1e-6 : got.v === exp[i].v), exp: exp[i] }); }
        catch (e) { return showError(e, args); }
      }
      const passed = rows.filter((r) => r.ok).length, all = passed === rows.length;
      if (!quiet) { st.runs = (st.runs || 0) + 1; $("[data-sol]", P).disabled = false; $("[data-sol]", P).removeAttribute("title"); }
      if (all && !st.done) {
        st.done = true; trophy("cl-first-drill");
        if (DATA.DRILLS.every((x) => state.drills[x.id]?.done)) { trophy("cl-drills-all"); toast("Every drill passed!"); }
        updateProgress(); $$(".cl-list button", P).forEach((b) => { if (b.dataset.d === d.id) { b.classList.add("done"); $(".dot", b).innerHTML = ICON.check; } });
      }
      save();
      const typeNote = rows.find((r) => !r.ok && r.got.t !== r.exp.t);
      const di = DATA.DRILLS.findIndex((x) => x.id === d.id), nextD = DATA.DRILLS[di + 1];
      box.innerHTML = `
        <div class="cl-score ${all ? "good" : "bad"}">${all ? ICON.check : ICON.x}<div><b>${all ? "All tests passed!" : `${passed} of ${rows.length} tests passed`}</b>
          <p>${all ? (st.runs === 1 ? "First try, too." : "Nice work.") : typeNote ? `One answer came back as a ${typeNote.got.t} instead of a ${typeNote.exp.t}.` : "Compare your answers with the expected ones below."}</p></div>
          ${all && nextD ? `<button type="button" class="btn primary sm" data-nextd>Next drill ${ICON.arrow}</button>` : ""}</div>
        <div class="cl-table-wrap"><table class="cl-table"><thead><tr><th scope="col">Call</th><th scope="col">Expected</th><th scope="col">Your code</th><th scope="col"><span class="sr-only">Result</span></th></tr></thead><tbody>
          ${rows.map((r) => `<tr class="${r.ok ? "ok" : "no"}"><td><code>${esc(d.method)}(${r.args.map(fmtVal).join(", ")})</code></td><td><code>${esc(fmtVal(r.exp))}</code></td><td><code>${esc(fmtVal(r.got))}</code></td><td>${r.ok ? ICON.check : ICON.x}</td></tr>`).join("")}
        </tbody></table></div>`;
      $("[data-nextd]", box)?.addEventListener("click", () => { cur = nextD.id; draw(); P.scrollIntoView({ block: "start", behavior: reducedMotion ? "auto" : "smooth" }); });
    };
    const showError = (e, args) => {
      const box = $(".cl-results", P);
      ed.error(e.line, e.message);
      box.innerHTML = `<div class="cl-error">${ICON.x}<div><b>${e.line ? `Line ${e.line}` : "Problem"}${args ? ` (while testing ${esc(args.map(fmtVal).join(", "))})` : ""}</b><p>${esc(e.message)}</p></div></div>`;
      const st = state.drills[cur]; st.runs = (st.runs || 0) + 1; save();
      const sol = $("[data-sol]", P); if (sol) { sol.disabled = false; sol.removeAttribute("title"); }
    };
    draw();
  }

  /** A button that needs two clicks (for resets), without a pop-up dialog. */
  function twoStep(btn, armedText, fn) {
    const original = btn.innerHTML; let t;
    btn.addEventListener("click", () => {
      if (btn.classList.contains("armed")) { clearTimeout(t); btn.classList.remove("armed"); btn.innerHTML = original; fn(); return; }
      btn.classList.add("armed"); btn.textContent = armedText;
      t = setTimeout(() => { btn.classList.remove("armed"); btn.innerHTML = original; }, 3000);
    });
  }

  /* ================================================================ Level 3: Drive it */
  const sim = { run: null, raf: 0, speed: 1, stop: null };
  const SNIPS_DRIVE = [";", { label: "{ }", insert: "{}", back: 1 }, { label: "( )", insert: "()", back: 1 },
    { label: "left.setPower", insert: "left.setPower();", back: 2 }, { label: "right.setPower", insert: "right.setPower();", back: 2 }, { label: "sleep", insert: "sleep();", back: 2 },
    { label: "while", insert: "while (opModeIsActive() && ) {\n    \n}", back: 9 }, { label: "getCurrentPosition", insert: "left.getCurrentPosition()" },
    { label: "telemetry", insert: 'telemetry.addData("", );\ntelemetry.update();', back: 24 }, { label: "if", insert: "if () {\n    \n}", back: 9 }];
  const SNIPS_TELE = [";", { label: "{ }", insert: "{}", back: 1 }, { label: "( )", insert: "()", back: 1 },
    { label: "-left_stick_y", insert: "-gamepad1.left_stick_y" }, { label: "-right_stick_y", insert: "-gamepad1.right_stick_y" }, { label: "right_stick_x", insert: "gamepad1.right_stick_x" },
    { label: "gamepad1.a", insert: "gamepad1.a" }, { label: "if", insert: "if () {\n    \n}", back: 9 }, { label: "Range.clip", insert: "Range.clip(, -1.0, 1.0)", back: 13 },
    { label: "telemetry", insert: 'telemetry.addData("", );', back: 5 }, "&&", "!"];

  /* ---------- gamepad: keyboard, on-screen pad, and real controllers ---------- */
  const pad = { keys: new Set(), touch: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 }, btn: new Set() }, input: SIM.newInput(), connected: "" };
  const PAD_KEYS = { a: "lx-", d: "lx+", w: "ly-", s: "ly+", arrowleft: "rx-", arrowright: "rx+", arrowup: "ry-", arrowdown: "ry+", j: "a", k: "b", u: "x", i: "y", q: "lb", e: "rb", z: "lt", c: "rt", t: "up", g: "down", f: "left", h: "right" };
  const teleopLive = () => sim.run && sim.run.world.teleop && !sim.run.over;
  const typingInField = (t) => t && t.closest?.("textarea, input, select, [contenteditable]");
  addEventListener("keydown", (e) => {
    if (!teleopLive() || typingInField(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase(); if (!(k in PAD_KEYS)) return;
    e.preventDefault(); pad.keys.add(k);
  });
  addEventListener("keyup", (e) => pad.keys.delete(e.key.toLowerCase()));
  addEventListener("blur", () => { pad.keys.clear(); pad.touch.btn.clear(); });
  function readPad() {
    const g = SIM.blankPad(), k = pad.keys, t = pad.touch, pick = (a, b) => (Math.abs(b) > Math.abs(a) ? b : a);
    for (const key of k) { const m = PAD_KEYS[key]; if (!m) continue; if (m.endsWith("+") || m.endsWith("-")) g[m.slice(0, 2)] += m.endsWith("+") ? 1 : -1; else if (m === "lt" || m === "rt") g[m] = 1; else g[m] = true; }
    for (const a of ["lx", "ly", "rx", "ry"]) g[a] = Math.max(-1, Math.min(1, g[a]));
    g.lx = pick(g.lx, t.left.x); g.ly = pick(g.ly, t.left.y); g.rx = pick(g.rx, t.right.x); g.ry = pick(g.ry, t.right.y);
    for (const b of t.btn) g[b] = true;
    let gp = null; try { gp = [...(navigator.getGamepads?.() || [])].find(Boolean) || null; } catch {}
    pad.connected = gp ? gp.id.replace(/\s*\(.*$/, "").slice(0, 40) || "Controller" : "";
    if (gp) {
      const dz = (v) => (Math.abs(v || 0) < 0.07 ? 0 : v), B = (i) => !!gp.buttons[i]?.pressed;
      g.lx = pick(g.lx, dz(gp.axes[0])); g.ly = pick(g.ly, dz(gp.axes[1])); g.rx = pick(g.rx, dz(gp.axes[2])); g.ry = pick(g.ry, dz(gp.axes[3]));
      g.a ||= B(0); g.b ||= B(1); g.x ||= B(2); g.y ||= B(3); g.lb ||= B(4); g.rb ||= B(5); g.back ||= B(8); g.start ||= B(9);
      g.up ||= B(12); g.down ||= B(13); g.left ||= B(14); g.right ||= B(15);
      g.lt = Math.max(g.lt, gp.buttons[6]?.value || 0); g.rt = Math.max(g.rt, gp.buttons[7]?.value || 0);
    }
    Object.assign(pad.input.g1, g);
    return g;
  }
  function wirePad(P) {
    for (const st of $$("[data-stick]", P)) {
      const side = st.dataset.stick, knob = $(".knob", st);
      let id = null;
      const set = (e) => {
        const r = st.getBoundingClientRect(), rad = r.width / 2 - 14;
        let x = (e.clientX - r.left - r.width / 2) / rad, y = (e.clientY - r.top - r.height / 2) / rad; const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
        pad.touch[side] = { x, y };
      };
      st.addEventListener("pointerdown", (e) => { id = e.pointerId; st.setPointerCapture(id); set(e); e.preventDefault(); });
      st.addEventListener("pointermove", (e) => { if (e.pointerId === id) set(e); });
      const up = (e) => { if (e.pointerId !== id) return; id = null; pad.touch[side] = { x: 0, y: 0 }; };
      st.addEventListener("pointerup", up); st.addEventListener("pointercancel", up);
      knob.style.transform = "";
    }
    for (const b of $$("[data-btn]", P)) {
      const n = b.dataset.btn;
      b.addEventListener("pointerdown", (e) => { pad.touch.btn.add(n); b.setPointerCapture(e.pointerId); e.preventDefault(); });
      const up = () => pad.touch.btn.delete(n);
      b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up); b.addEventListener("lostpointercapture", up);
    }
  }
  function showPad(P, g) {
    for (const st of $$("[data-stick]", P)) {
      const side = st.dataset.stick, x = side === "left" ? g.lx : g.rx, y = side === "left" ? g.ly : g.ry, rad = st.getBoundingClientRect().width / 2 - 14;
      $(".knob", st).style.transform = `translate(${x * rad}px, ${y * rad}px)`;
    }
    for (const b of $$("[data-btn]", P)) b.classList.toggle("down", !!g[b.dataset.btn]);
    const s = $("[data-padstatus]", P); if (s) s.textContent = pad.connected ? `🎮 ${pad.connected}` : "Keyboard or touch";
  }

  /* ---------- variables panel ---------- */
  const fmtVar = (x) => {
    if (!x) return "not set";
    if (x.t === "array") return `{${x.v.items.slice(0, 6).map(fmtVar).join(", ")}${x.v.items.length > 6 ? ", …" : ""}}`;
    if (x.t === "obj") return x.v.__str ? x.v.__str() : x.v.__cls;
    if (x.t === "double") return MJ.fmtDouble(Math.round(x.v * 10000) / 10000);
    if (x.t === "String") return `"${x.v}"`;
    if (x.t === "char") return `'${x.v}'`;
    return MJ.toStr(x);
  };
  function renderVars(P, snap, prev) {
    const box = $("[data-vars]", P); if (!box) return {};
    const rows = [...snap.locals, ...snap.fields], now = {};
    $("[data-where]", P).textContent = snap.stack.length ? `in ${snap.stack.join(" → ")}()` : "";
    if (!rows.length) { box.innerHTML = `<p class="cl-vars-empty">No variables yet.</p>`; return now; }
    box.innerHTML = `<table class="cl-vars-table"><tbody>${rows.map((r) => {
      const key = (r.field ? "f:" : "l:") + r.name, val = fmtVar(r.v); now[key] = val;
      const changed = prev && key in prev && prev[key] !== val;
      return `<tr class="${r.field ? "is-field" : ""}${changed ? " chg" : ""}"><th scope="row">${esc(r.name)}</th><td class="t">${esc(r.type === "obj" ? (r.v?.v?.__cls || "object") : r.type)}</td><td class="v">${esc(val)}</td></tr>`; }).join("")}</tbody></table>`;
    return now;
  }

  /* ---------- export, copy, share ---------- */
  const IMPORTS = [
    [/@Autonomous\b/, "com.qualcomm.robotcore.eventloop.opmode.Autonomous"], [/@TeleOp\b/, "com.qualcomm.robotcore.eventloop.opmode.TeleOp"], [/@Disabled\b/, "com.qualcomm.robotcore.eventloop.opmode.Disabled"],
    [/\bextends\s+LinearOpMode\b/, "com.qualcomm.robotcore.eventloop.opmode.LinearOpMode"], [/\bextends\s+OpMode\b/, "com.qualcomm.robotcore.eventloop.opmode.OpMode"],
    [/\bDcMotor\b/, "com.qualcomm.robotcore.hardware.DcMotor"], [/\bDcMotorEx\b/, "com.qualcomm.robotcore.hardware.DcMotorEx"], [/\bDcMotorSimple\b/, "com.qualcomm.robotcore.hardware.DcMotorSimple"],
    [/\bServo\b/, "com.qualcomm.robotcore.hardware.Servo"], [/\bIMU\b/, "com.qualcomm.robotcore.hardware.IMU"], [/\bRevHubOrientationOnRobot\b/, "com.qualcomm.hardware.rev.RevHubOrientationOnRobot"],
    [/\bRange\./, "com.qualcomm.robotcore.util.Range"], [/\bElapsedTime\b/, "com.qualcomm.robotcore.util.ElapsedTime"],
    [/\bAngleUnit\b/, "org.firstinspires.ftc.robotcore.external.navigation.AngleUnit"], [/\bYawPitchRollAngles\b/, "org.firstinspires.ftc.robotcore.external.navigation.YawPitchRollAngles"],
  ];
  function toJavaFile(src) {
    const name = (src.match(/\bclass\s+([A-Za-z_]\w*)/) || [])[1] || "MyOpMode";
    const body = src.replace(/^\s*(package|import)\s[^;]*;\s*\n/gm, "");
    const imports = IMPORTS.filter(([re]) => re.test(body)).map(([, i]) => `import ${i};`).sort();
    const notes = ["// Exported from the Steel Surge Code Lab.", "// Before running it on a real robot, check that:", "//  - the device names match your robot configuration on the Driver Station", "//  - motor directions match how your motors are mounted"];
    if (/\bIMU\b/.test(body) && !/\.initialize\(/.test(body)) notes.push("//  - the IMU is initialized with imu.initialize(...) for how your Control Hub is mounted");
    if (/TICKS_PER_INCH/.test(body)) notes.push("//  - TICKS_PER_INCH matches your motors and wheels (45.3 is a goBILDA 312 rpm motor with 96 mm wheels)");
    return { name: `${name}.java`, text: `package org.firstinspires.ftc.teamcode;\n\n${imports.join("\n")}\n\n${notes.join("\n")}\n\n${body.trim()}\n` };
  }
  function download(name, text) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/x-java;charset=utf-8" })); a.download = name;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  const b64u = { enc: (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
    dec: (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)) };
  async function packCode(s) {
    const bytes = new TextEncoder().encode(s);
    if (window.CompressionStream) { try { const buf = await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer(); return "z" + b64u.enc(new Uint8Array(buf)); } catch {} }
    return "p" + b64u.enc(bytes);
  }
  async function unpackCode(t) {
    const bytes = b64u.dec(t.slice(1));
    if (t[0] === "z") return new TextDecoder().decode(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
    return new TextDecoder().decode(bytes);
  }
  async function shareLink(level, id, code) {
    const url = `${location.origin}${location.pathname}#share=${level}.${id}.${await packCode(code)}`;
    try { await navigator.clipboard.writeText(url); toast("Share link copied. Anyone who opens it sees this code."); } catch { prompt("Copy this link to share your code:", url); }
  }
  async function copyCode(code) { try { await navigator.clipboard.writeText(code); toast("Code copied."); } catch { toast("Couldn't copy from this browser."); } }
  let shared = null; // { level, id, code } from a #share= link
  const sharedNotice = (level, id) => (shared && shared.level === level && shared.id === id ? `<div class="cl-notice" data-shared>${ICON.link}<span>You're looking at code from a shared link. Edit it to keep it, or</span><button type="button" class="btn sm" data-mine>Go back to my code</button></div>` : "");

  function renderDrive() {
    const P = panels.drive;
    let cur = state.cur.drive && DATA.CHALLENGES.some((c) => c.id === state.cur.drive) ? state.cur.drive : (DATA.CHALLENGES.find((c) => !state.auto[c.id]?.done) || DATA.CHALLENGES[0]).id;
    let ed, canvas, ctx, world, hintsShown = 0, prevVars = null, lastAria = 0;
    const groups = [["Autonomous", DATA.CHALLENGES.filter((c) => c.mode !== "teleop")], ["TeleOp", DATA.CHALLENGES.filter((c) => c.mode === "teleop")]];
    const draw = () => {
      stopSim();
      const ci = DATA.CHALLENGES.findIndex((c) => c.id === cur), ch = DATA.CHALLENGES[ci], st = state.auto[ch.id] || (state.auto[ch.id] = {});
      const tele = ch.mode === "teleop", lid = DATA.TOPIC_LESSON?.[ch.topic], lesson = DATA.LESSONS?.find((l) => l.id === lid);
      state.cur.drive = cur; save(); hintsShown = 0; prevVars = null;
      const useShared = shared && shared.level === "drive" && shared.id === ch.id;
      let n = 0;
      P.innerHTML = `
        <nav class="cl-steps" aria-label="Challenges">${groups.map(([label, list]) => `<div class="cl-steps-row"><span class="cl-steps-label">${label}</span>${list.map((c) => { n++; return `<button type="button" data-c="${c.id}" class="${c.id === cur ? "on" : ""} ${state.auto[c.id]?.done ? "done" : ""}" aria-current="${c.id === cur}"><span class="dot">${state.auto[c.id]?.done ? ICON.check : n}</span><span>${esc(c.title)}</span></button>`; }).join("")}</div>`).join("")}</nav>
        <div class="cl-drive">
          <div class="cl-drive-code">
            <article class="cl-card cl-brief">
              <header class="cl-q-head"><span class="cl-chip ${tele ? "tele" : ""}">${tele ? "TeleOp · " : ""}${esc(ch.topic)}</span>${lesson ? `<button type="button" class="cl-lesson-link" data-lesson="${lesson.id}">${ICON.book} Lesson: ${esc(lesson.title)}</button>` : ""}<span class="cl-count">Challenge ${ci + 1} of ${DATA.CHALLENGES.length}</span></header>
              <h2 class="cl-title">${esc(ch.title)}</h2>
              <p class="cl-prompt">${ch.brief}</p>
              <ul class="cl-goals" data-goals></ul>
              <div class="cl-hints" data-hints></div>
            </article>
            ${sharedNotice("drive", ch.id)}
            <div class="cl-ed-host"></div>
            <div class="cl-actions left">
              <button type="button" class="btn primary" data-go>${ICON.play} Run on the field</button>
              <button type="button" class="btn" data-hint>${ICON.bulb} Hint</button>
              <button type="button" class="btn ghost" data-sol>${ICON.eye} Solution</button>
              <button type="button" class="btn ghost" data-reset>${ICON.reset} Start over</button>
            </div>
            <div class="cl-tools" role="group" aria-label="Save and share">
              <button type="button" class="cl-tool" data-export title="Download a .java file for Android Studio">${ICON.download} Download .java</button>
              <button type="button" class="cl-tool" data-copy>${ICON.copy} Copy code</button>
              <button type="button" class="cl-tool" data-share>${ICON.link} Share link</button>
            </div>
          </div>
          <div class="cl-drive-sim">
            <div class="cl-ds">
              <div class="cl-ds-top">
                <span class="cl-ds-state" data-state>READY</span>
                <span class="cl-ds-time" data-time>0.0 s</span>
                <span class="cl-ds-mode">${tele ? "TeleOp · 2:00" : "Auto · 0:30"}</span>
                <span class="cl-ds-batt" data-batt title="Battery voltage" hidden></span>
              </div>
              <div class="cl-field-wrap">
                <canvas class="cl-field" role="img" aria-label="Simulated FTC field, top view"></canvas>
                <div class="cl-result" data-result hidden aria-live="polite"></div>
              </div>
              <div class="cl-pose"><span data-pose></span><span data-best></span></div>
              <div class="cl-ds-controls">
                <button type="button" class="cl-play" data-play aria-label="Run">${ICON.play}<span>Run</span></button>
                <button type="button" class="cl-icon" data-pause aria-label="Pause" title="Pause" disabled>${ICON.pause}</button>
                <button type="button" class="cl-icon" data-step aria-label="Step one line" title="Step: run one line at a time">${ICON.step}</button>
                <button type="button" class="cl-icon" data-stop aria-label="Stop" title="Stop" disabled>${ICON.stop}</button>
                <button type="button" class="cl-icon" data-home aria-label="Put the robot back at the start" title="Reset the field">${ICON.reset}</button>
                <div class="cl-speed" role="group" aria-label="Playback speed">${[1, 2, 4].map((s) => `<button type="button" data-speed="${s}" aria-pressed="${sim.speed === s}" ${tele && s > 1 ? "disabled" : ""}>${s}×</button>`).join("")}</div>
              </div>
              ${tele ? `<div class="cl-pad" data-pad>
                <div class="cl-pad-top"><button type="button" data-btn="lb">LB</button><span class="cl-pad-status" data-padstatus>Keyboard or touch</span><button type="button" data-btn="rb">RB</button></div>
                <div class="cl-pad-main">
                  <div class="cl-stick" data-stick="left" aria-label="Left stick"><span class="knob"></span></div>
                  <div class="cl-face"><button type="button" data-btn="y" class="y">Y</button><button type="button" data-btn="x" class="x">X</button><button type="button" data-btn="b" class="b">B</button><button type="button" data-btn="a" class="a">A</button></div>
                  <div class="cl-stick" data-stick="right" aria-label="Right stick"><span class="knob"></span></div>
                </div>
                <p class="cl-pad-keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> left stick · <kbd>←</kbd><kbd>↑</kbd><kbd>→</kbd><kbd>↓</kbd> right stick · <kbd>J</kbd> A · <kbd>K</kbd> B · <kbd>U</kbd> X · <kbd>I</kbd> Y · <kbd>Q</kbd> <kbd>E</kbd> bumpers. A USB or Bluetooth controller works too.</p>
              </div>` : ""}
              <div class="cl-telemetry"><div class="cl-tel-head">Telemetry</div><pre data-tel>No telemetry yet.</pre></div>
              <details class="cl-vars" open><summary><span>Variables</span><small data-where></small></summary><div data-vars><p class="cl-vars-empty">Run your code, or press Step to go one line at a time and watch every variable change.</p></div></details>
              <div class="cl-log" data-log aria-live="polite"></div>
            </div>
          </div>
        </div>`;
      ed = createEditor($(".cl-ed-host", P), { value: useShared ? shared.code : st.code ?? ch.template, onChange: (v) => { st.code = v; save(); }, onRun: () => go(ch), snippets: tele ? SNIPS_TELE : SNIPS_DRIVE, label: `Code for ${ch.title}` });
      canvas = $(".cl-field", P); ctx = canvas.getContext("2d");
      world = SIM.createWorld(ch, { battery: 1 });
      renderGoals(SIM.goals(world, false));
      updatePose(); updateBest(ch);
      if (tele) { wirePad(P); showPad(P, readPad()); }
      $$("[data-c]", P).forEach((b) => b.addEventListener("click", () => { cur = b.dataset.c; draw(); }));
      $("[data-lesson]", P)?.addEventListener("click", (e) => goTo("learn", e.currentTarget.dataset.lesson));
      $("[data-go]", P).addEventListener("click", () => go(ch));
      $("[data-play]", P).addEventListener("click", () => { if (sim.run && sim.run.paused) resume(); else go(ch); });
      $("[data-pause]", P).addEventListener("click", () => { if (!sim.run) return; if (sim.run.stepMode) resume(); else { sim.run.pause(); } });
      $("[data-step]", P).addEventListener("click", () => { if (!sim.run) go(ch, true); else sim.run.step(); });
      $("[data-stop]", P).addEventListener("click", () => { if (sim.run) { sim.run.stop(); finishRun(ch, true); } });
      $("[data-home]", P).addEventListener("click", () => { stopSim(); world = SIM.createWorld(ch, { battery: 1 }); hideResult(); setState("READY"); $("[data-time]", P).textContent = "0.0 s"; $("[data-tel]", P).textContent = "No telemetry yet."; $("[data-log]", P).innerHTML = ""; ed.running(0); renderGoals(SIM.goals(world, false)); updatePose(); paintField(); });
      $$("[data-speed]", P).forEach((b) => b.addEventListener("click", () => { sim.speed = +b.dataset.speed; $$("[data-speed]", P).forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }));
      $("[data-hint]", P).addEventListener("click", () => {
        hintsShown = Math.min(ch.hints.length, hintsShown + 1);
        $("[data-hints]", P).innerHTML = ch.hints.slice(0, hintsShown).map((h, i) => `<div class="cl-hint">${ICON.bulb}<p><b>Hint ${i + 1}.</b> ${h}</p></div>`).join("");
        if (hintsShown >= ch.hints.length) $("[data-hint]", P).disabled = true;
      });
      twoStep($("[data-sol]", P), "Replace your code?", () => { ed.set(ch.solution); st.code = ch.solution; save(); log("info", "Loaded a working solution. Run it, then change numbers to see what happens."); });
      twoStep($("[data-reset]", P), "Click again to reset", () => { ed.set(ch.template); st.code = ch.template; save(); });
      $("[data-export]", P).addEventListener("click", () => { const f = toJavaFile(ed.get()); download(f.name, f.text); trophy("cl-export"); toast(`Downloaded ${f.name}. Put it in TeamCode/src/main/java/org/firstinspires/ftc/teamcode.`); });
      $("[data-copy]", P).addEventListener("click", () => copyCode(ed.get()));
      $("[data-share]", P).addEventListener("click", () => shareLink("drive", ch.id, ed.get()));
      $("[data-mine]", P)?.addEventListener("click", () => { shared = null; history.replaceState(null, "", "#drive"); draw(); });
      new ResizeObserver(() => paintField()).observe(canvas);
      paintField();
    };
    const setState = (t, cls = "") => { const el = $("[data-state]", P); el.textContent = t; el.className = `cl-ds-state ${cls}`; };
    const log = (kind, text) => { const el = $("[data-log]", P); el.insertAdjacentHTML("beforeend", `<div class="cl-log-${kind}">${esc(text)}</div>`); el.scrollTop = el.scrollHeight; };
    const hideResult = () => { const r = $("[data-result]", P); if (r) r.hidden = true; };
    const renderGoals = (gs) => {
      $("[data-goals]", P).innerHTML = gs.map((g) => `<li class="${g.state}"><span class="gi">${g.state === "done" ? ICON.check : g.state === "fail" ? ICON.x : ""}</span>${esc(g.text)}</li>`).join("");
    };
    const headingDeg = () => { let d = (world.robot.h * 180) / Math.PI; d = ((d + 180) % 360 + 360) % 360 - 180; return d; };
    function updatePose() {
      const r = world.robot, el = $("[data-pose]", P); if (!el) return;
      el.textContent = `x ${r.x.toFixed(1)} in · y ${r.y.toFixed(1)} in · heading ${headingDeg().toFixed(0)}°`;
      const now = performance.now();
      if (now - lastAria > 600) {
        lastAria = now;
        const parts = [`Robot at ${Math.round(r.x)} by ${Math.round(r.y)} inches, facing ${Math.round(headingDeg())} degrees`];
        for (const z of world.ch.zones || []) parts.push(`${z.label} from ${z.x} to ${z.x + z.w} across and ${z.y} to ${z.y + z.h} up`);
        (world.ch.checkpoints || []).forEach((c, i) => parts.push(`checkpoint ${c.label} at ${c.x}, ${c.y}${world.cp > i ? " reached" : ""}`));
        if (world.sample) parts.push(world.sample.held ? "holding the sample" : `sample at ${Math.round(world.sample.x)}, ${Math.round(world.sample.y)}`);
        canvas.setAttribute("aria-label", `Field, 144 inches square. ${parts.join(". ")}.`);
      }
    }
    function updateBest(ch) { const st = state.auto[ch.id] || {}, el = $("[data-best]", P); if (el) el.textContent = st.best != null && Number.isFinite(st.best) ? `Your best: ${st.best.toFixed(1)} s` : ""; }
    const stopSim = () => { cancelAnimationFrame(sim.raf); sim.raf = 0; if (sim.run && !sim.run.over) sim.run.stop(); sim.run = null; pad.keys.clear(); };
    sim.stop = stopSim;
    function syncButtons() {
      const run = sim.run, live = !!run && !run.over;
      $("[data-stop]", P).disabled = !live; $("[data-go]", P).disabled = live && !run.paused;
      $("[data-play]", P).disabled = live && !run.paused;
      const pz = $("[data-pause]", P); pz.disabled = !live;
      const paused = live && run.stepMode;
      pz.innerHTML = paused ? ICON.play : ICON.pause; pz.setAttribute("aria-label", paused ? "Continue" : "Pause"); pz.title = paused ? "Continue running" : "Pause";
      $("[data-step]", P).disabled = live && !run.paused;
    }
    function resume() { if (!sim.run) return; sim.run.resume(); syncButtons(); }

    function go(ch, stepping = false) {
      stopSim(); hideResult();
      $("[data-log]", P).innerHTML = ""; $("[data-tel]", P).textContent = "No telemetry yet."; ed.clearError(); prevVars = null;
      let run;
      pad.input = SIM.newInput();
      try { run = SIM.createRun(ed.get(), ch, { input: pad.input }); }
      catch (e) { ed.error(e.line, e.message); log("err", `Line ${e.line || "?"}: ${e.message}`); setState("ERROR", "bad"); world = SIM.createWorld(ch, { battery: 1 }); paintField(); return; }
      sim.run = run; world = run.world; trophy("cl-first-run");
      if (stepping) { run.pause(); trophy("cl-step"); }
      $("[data-batt]", P).hidden = false; $("[data-batt]", P).textContent = `Battery ${(11.9 + world.battery * 1.4).toFixed(1)} V`;
      $("[data-batt]", P).classList.toggle("low", world.battery < 0.82);
      setState("INIT", "init");
      if (world.teleop) { log("info", "TeleOp is running. Drive with the on-screen pad, the keyboard, or a controller."); document.activeElement?.blur?.(); }
      let lastLog = 0, last = performance.now(), lastVars = 0, lastPausedLine = 0;
      const frame = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (world.teleop) showPad(P, readPad());
        run.advance(dt * (world.teleop ? 1 : sim.speed));
        const w = run.world;
        while (lastLog < w.log.length) { const l = w.log[lastLog++]; log(l.kind === "good" ? "good" : l.kind === "warn" ? "warn" : "info", l.text); }
        if (run.paused) setState("PAUSED", "pause"); else if (w.started && !w.programDone) setState("RUNNING", "run");
        $("[data-time]", P).textContent = `${(w.startT == null ? 0 : Math.max(0, (w.programDone ? run.endedAt : w.t) - w.startT)).toFixed(1)} s`;
        $("[data-tel]", P).textContent = w.telemetry.length ? w.telemetry.join("\n") : "No telemetry yet.";
        ed.running(w.programDone ? 0 : run.paused ? run.pausedLine : run.interp.curLine);
        if (run.paused && run.pausedLine !== lastPausedLine) { lastPausedLine = run.pausedLine; ed.focusLine(run.pausedLine); }
        if (run.paused || now - lastVars > 160) { lastVars = now; prevVars = renderVars(P, run.interp.snapshot(), prevVars); }
        renderGoals(SIM.goals(w, false));
        updatePose(); syncButtons();
        paintField();
        if (run.over) return finishRun(ch);
        sim.raf = requestAnimationFrame(frame);
      };
      syncButtons();
      sim.raf = requestAnimationFrame(frame);
    }
    function finishRun(ch, stopped = false) {
      cancelAnimationFrame(sim.raf); sim.raf = 0;
      const run = sim.run; sim.run = null; pad.keys.clear(); pad.touch = { left: { x: 0, y: 0 }, right: { x: 0, y: 0 }, btn: new Set() };
      syncButtons(); ed.running(0);
      if (!run) return;
      const w = run.world;
      prevVars = renderVars(P, run.interp.snapshot(), prevVars);
      if (stopped) { setState("STOPPED"); log("info", "Stopped."); return; }
      if (run.error) {
        setState("ERROR", "bad"); ed.error(run.error.line, run.error.message);
        log("err", `Line ${run.error.line || "?"}: ${run.error.message}`);
        showResult(false, "Your code hit an error", run.error.message);
        return;
      }
      if (run.endReason === "noStart") log("warn", "The program ended without calling waitForStart(), so the match never started.");
      const r = run.result; renderGoals(r.goals);
      setState(r.pass ? "COMPLETE" : "DONE", r.pass ? "good" : "");
      if (r.pass) {
        const st = state.auto[ch.id], first = !st.done, better = !(st.best <= r.time);
        st.done = true;
        if (better) { st.best = r.time; st.bestTrail = w.trail.filter((_, i) => i % Math.ceil(w.trail.length / 220 || 1) === 0).map((p) => [Math.round(p.x * 2) / 2, Math.round(p.y * 2) / 2]); }
        save();
        trophy("cl-first-auto"); if (ch.mode === "teleop") trophy("cl-teleop");
        if (DATA.CHALLENGES.every((c) => state.auto[c.id]?.done)) { trophy("cl-auto-all"); if (first) toast("Every robot challenge complete!"); }
        updateProgress(); updateBest(ch);
        $$("[data-c]", P).forEach((b) => { if (b.dataset.c === ch.id) { b.classList.add("done"); $(".dot", b).innerHTML = ICON.check; } });
        const ci = DATA.CHALLENGES.findIndex((c) => c.id === ch.id), next = DATA.CHALLENGES[ci + 1];
        const extra = ch.battery === "random" ? " The battery changes every run, so run it again: a solid program works every time." : "";
        showResult(true, better && !first ? "New best time!" : "Challenge complete!", `Finished in ${r.time.toFixed(1)} s on a ${(11.9 + w.battery * 1.4).toFixed(1)} V battery.${extra}`, next);
        celebrate();
      } else {
        const why = r.goals.filter((g) => g.state !== "done").map((g) => g.detail || g.text).filter(Boolean);
        showResult(false, "Not quite yet", why[0] || "Check the goals below the challenge description.");
      }
    }
    function showResult(ok, title, text, next) {
      const el = $("[data-result]", P);
      el.className = `cl-result ${ok ? "good" : "bad"}`;
      el.innerHTML = `<div class="cl-result-card"><span class="cl-result-ico">${ok ? ICON.check : ICON.x}</span><b>${esc(title)}</b><p>${esc(text)}</p>
        <div class="cl-result-actions">${ok && next ? `<button type="button" class="btn primary sm" data-next-c>Next challenge ${ICON.arrow}</button>` : ""}<button type="button" class="btn sm" data-again>${ok ? "Run again" : "Try again"}</button><button type="button" class="btn ghost sm" data-close>Close</button></div></div>`;
      el.hidden = false;
      $("[data-again]", el).addEventListener("click", () => go(DATA.CHALLENGES.find((c) => c.id === cur)));
      $("[data-close]", el).addEventListener("click", hideResult);
      $("[data-next-c]", el)?.addEventListener("click", () => { cur = next.id; draw(); P.scrollIntoView({ block: "start", behavior: reducedMotion ? "auto" : "smooth" }); });
    }

    /* ---------- field drawing ---------- */
    let confetti = [];
    function celebrate() {
      if (reducedMotion) return;
      const W = canvas.width;
      confetti = Array.from({ length: 70 }, () => ({ x: W / 2, y: W / 2, vx: (Math.random() - 0.5) * W * 1.4, vy: -Math.random() * W * 1.2, r: Math.random() * Math.PI, c: ["#3ba8ff", "#84cdff", "#3ddc97", "#ffb547", "#ffffff"][Math.floor(Math.random() * 5)], life: 1.4 }));
      let last = performance.now();
      const tick = (now) => { const dt = (now - last) / 1000; last = now; confetti.forEach((p) => { p.vy += W * 1.6 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 6; p.life -= dt; }); confetti = confetti.filter((p) => p.life > 0); paintField(); if (confetti.length) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }
    function paintField() {
      if (!canvas || !world) return;
      const css = canvas.getBoundingClientRect().width; if (!css) return;
      const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(css * dpr);
      if (canvas.width !== W) { canvas.width = W; canvas.height = W; }
      const s = W / SIM.FIELD, X = (x) => x * s, Y = (y) => (SIM.FIELD - y) * s, ch = world.ch;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const g = ctx.createLinearGradient(0, 0, W, W); g.addColorStop(0, "#1a222d"); g.addColorStop(1, "#11171f");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
      for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { ctx.fillStyle = (i + j) % 2 ? "rgba(255,255,255,.018)" : "rgba(0,0,0,.05)"; ctx.fillRect(i * 24 * s, j * 24 * s, 24 * s, 24 * s); }
      ctx.strokeStyle = "rgba(0,0,0,.45)"; ctx.lineWidth = Math.max(1, s * 0.35);
      for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(i * 24 * s, 0); ctx.lineTo(i * 24 * s, W); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * 24 * s); ctx.lineTo(W, i * 24 * s); ctx.stroke(); }
      for (const z of ch.zones || []) {
        const yellow = z.color === "yellow", col = yellow ? "255,193,61" : "59,168,255";
        ctx.save(); ctx.beginPath(); ctx.roundRect(X(z.x), Y(z.y + z.h), z.w * s, z.h * s, 3 * s); ctx.fillStyle = `rgba(${col},.14)`; ctx.fill();
        if (yellow) { ctx.clip(); ctx.strokeStyle = `rgba(${col},.18)`; ctx.lineWidth = 2 * s; for (let k = -z.h; k < z.w; k += 5) { ctx.beginPath(); ctx.moveTo(X(z.x + k), Y(z.y)); ctx.lineTo(X(z.x + k + z.h), Y(z.y + z.h)); ctx.stroke(); } }
        ctx.restore();
        ctx.setLineDash([3 * s, 2 * s]); ctx.strokeStyle = `rgba(${col},.85)`; ctx.lineWidth = Math.max(1.5, 0.6 * s); ctx.beginPath(); ctx.roundRect(X(z.x), Y(z.y + z.h), z.w * s, z.h * s, 3 * s); ctx.stroke(); ctx.setLineDash([]);
        const words = z.label.toUpperCase().split(" "), lines = words.length > 1 && z.w < 30 ? words : [words.join(" ")];
        let fs = Math.max(8, 3.1 * s); ctx.font = `700 ${fs}px "JetBrains Mono", monospace`;
        const widest = Math.max(...lines.map((l) => ctx.measureText(l).width)); if (widest > z.w * s * 0.86) { fs *= (z.w * s * 0.86) / widest; ctx.font = `700 ${fs}px "JetBrains Mono", monospace`; }
        ctx.fillStyle = `rgba(${col},.95)`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        lines.forEach((l, i) => ctx.fillText(l, X(z.x + z.w / 2), Y(z.y + z.h / 2) + (i - (lines.length - 1) / 2) * fs * 1.15));
      }
      // barriers
      for (const o of ch.obstacles || []) {
        ctx.save(); ctx.beginPath(); ctx.roundRect(X(o.x), Y(o.y + o.h), o.w * s, o.h * s, 1.2 * s); ctx.fillStyle = "#2a3441"; ctx.fill(); ctx.clip();
        ctx.strokeStyle = "rgba(255,181,71,.55)"; ctx.lineWidth = 1.6 * s; for (let k = -o.h; k < o.w; k += 4) { ctx.beginPath(); ctx.moveTo(X(o.x + k), Y(o.y)); ctx.lineTo(X(o.x + k + o.h), Y(o.y + o.h)); ctx.stroke(); }
        ctx.restore(); ctx.strokeStyle = world.barrierHit ? "#ff6b6b" : "#ffb547"; ctx.lineWidth = Math.max(1.5, 0.5 * s); ctx.beginPath(); ctx.roundRect(X(o.x), Y(o.y + o.h), o.w * s, o.h * s, 1.2 * s); ctx.stroke();
      }
      (ch.checkpoints || []).forEach((c, i) => {
        const done = world.cp > i, next = world.cp === i;
        ctx.beginPath(); ctx.arc(X(c.x), Y(c.y), (c.r || 8) * s, 0, Math.PI * 2);
        ctx.fillStyle = done ? "rgba(61,220,151,.2)" : next ? "rgba(195,139,255,.18)" : "rgba(195,139,255,.08)"; ctx.fill();
        ctx.setLineDash(done ? [] : [2.5 * s, 2 * s]); ctx.strokeStyle = done ? "#3ddc97" : "#c38bff"; ctx.lineWidth = Math.max(1.5, (next ? 0.7 : 0.5) * s); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = done ? "#3ddc97" : "#d9b8ff"; ctx.font = `700 ${Math.max(10, 4 * s)}px "Space Grotesk", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(c.label, X(c.x), Y(c.y));
      });
      const st0 = ch.start;
      ctx.save(); ctx.translate(X(st0.x), Y(st0.y)); ctx.rotate(-st0.h * Math.PI / 180); ctx.strokeStyle = "rgba(255,255,255,.14)"; ctx.setLineDash([2 * s, 2 * s]); ctx.lineWidth = Math.max(1, 0.4 * s); ctx.strokeRect(-SIM.HALF * s, -SIM.HALF * s, SIM.ROBOT * s, SIM.ROBOT * s); ctx.restore(); ctx.setLineDash([]);
      // best run ghost
      const best = state.auto[ch.id]?.bestTrail;
      if (best && best.length > 1) { ctx.beginPath(); ctx.moveTo(X(best[0][0]), Y(best[0][1])); for (const [bx, by] of best) ctx.lineTo(X(bx), Y(by)); ctx.strokeStyle = "rgba(61,220,151,.4)"; ctx.setLineDash([1.5 * s, 1.5 * s]); ctx.lineWidth = Math.max(1, 0.5 * s); ctx.stroke(); ctx.setLineDash([]); }
      const tr = world.trail;
      if (tr.length > 1) { ctx.beginPath(); ctx.moveTo(X(tr[0].x), Y(tr[0].y)); for (const p of tr) ctx.lineTo(X(p.x), Y(p.y)); ctx.strokeStyle = "rgba(132,205,255,.55)"; ctx.lineWidth = Math.max(1.5, 0.7 * s); ctx.lineJoin = "round"; ctx.shadowColor = "#3ba8ff"; ctx.shadowBlur = 6; ctx.stroke(); ctx.shadowBlur = 0; }
      const sm = world.sample;
      const drawSample = () => { ctx.save(); ctx.translate(X(sm.x), Y(sm.y)); ctx.rotate(sm.held ? -world.robot.h : 0); ctx.fillStyle = "#ffc13d"; ctx.shadowColor = "#ffc13d"; ctx.shadowBlur = 10; ctx.beginPath(); ctx.roundRect(-2.2 * s, -1.2 * s, 4.4 * s, 2.4 * s, 0.6 * s); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(-2.2 * s, 0.2 * s, 4.4 * s, 1 * s); ctx.restore(); };
      if (sm && !sm.held) drawSample();
      // robot
      const r = world.robot, h = SIM.HALF * s, mec = world.drive === "mecanum";
      ctx.save(); ctx.translate(X(r.x), Y(r.y)); ctx.rotate(-r.h);
      ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.roundRect(-h + s, -h + 1.5 * s, 2 * h, 2 * h, 2.5 * s); ctx.fill();
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const wx = sx * (h - 1.2 * s) - 1.5 * s, wy = sy * 4.5 * s - 2.6 * s;
        ctx.fillStyle = "#0a0f15"; ctx.beginPath(); ctx.roundRect(wx, wy, 3 * s, 5.2 * s, 0.8 * s); ctx.fill();
        if (mec) { ctx.save(); ctx.beginPath(); ctx.roundRect(wx, wy, 3 * s, 5.2 * s, 0.8 * s); ctx.clip(); ctx.strokeStyle = "#4a5b70"; ctx.lineWidth = Math.max(1, 0.35 * s); const dir = sx * sy; for (let k = -2; k < 4; k++) { ctx.beginPath(); ctx.moveTo(wx, wy + k * 1.6 * s); ctx.lineTo(wx + 3 * s, wy + k * 1.6 * s + dir * 3 * s); ctx.stroke(); } ctx.restore(); }
      }
      const bg = ctx.createLinearGradient(0, -h, 0, h); bg.addColorStop(0, "#2c3b4d"); bg.addColorStop(1, "#16202b");
      ctx.fillStyle = bg; ctx.shadowColor = "#3ba8ff"; ctx.shadowBlur = 12; ctx.beginPath(); ctx.roundRect(-h + 1.2 * s, -h, 2 * h - 2.4 * s, 2 * h, 2.4 * s); ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = "#3ba8ff"; ctx.lineWidth = Math.max(1.5, 0.55 * s); ctx.stroke();
      ctx.fillStyle = "#84cdff"; ctx.beginPath(); ctx.moveTo(0, -h + 1.4 * s); ctx.lineTo(3 * s, -h + 5 * s); ctx.lineTo(-3 * s, -h + 5 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(233,238,244,.75)"; ctx.font = `700 ${Math.max(7, 2.6 * s)}px "JetBrains Mono", monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("27254", 0, 2.5 * s);
      if (world.servos.claw) {
        const open = world.servos.claw.pos, spread = (1.4 + 2.2 * open) * s;
        ctx.strokeStyle = "#cfd8e3"; ctx.lineWidth = Math.max(1.5, 0.8 * s); ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(-spread, -h); ctx.lineTo(-spread * 0.7, -h - 3.6 * s); ctx.moveTo(spread, -h); ctx.lineTo(spread * 0.7, -h - 3.6 * s); ctx.stroke();
      }
      ctx.restore();
      if (sm && sm.held) drawSample();
      ctx.strokeStyle = "#4a5b70"; ctx.lineWidth = Math.max(3, 1.2 * s); ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, W - ctx.lineWidth);
      if (world.touchingWall) { ctx.strokeStyle = "rgba(255,93,93,.8)"; ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, W - ctx.lineWidth); }
      for (const p of confetti) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = Math.min(1, p.life); ctx.fillStyle = p.c; ctx.fillRect(-4 * dpr, -2 * dpr, 8 * dpr, 4 * dpr); ctx.restore(); }
      ctx.globalAlpha = 1;
    }
    draw();
  }

  /* ================================================================ Start here: lessons in three tracks */
  const TRACKS = [["code", "Coding", ICON.code], ["cad", "CAD", '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="m3 7 9 5 9-5M12 12v10"/></svg>'],
    ["outreach", "Outreach", '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/></svg>']];
  const trackOf = (l) => l.track || "code";
  function renderLearn() {
    const P = panels.learn, L = DATA.LESSONS || [];
    state.learnChecks ||= {};
    let cur = state.cur.learn && L.some((l) => l.id === state.cur.learn) ? state.cur.learn : (L.find((l) => !state.learn[l.id]) || L[0]).id;
    const practiceFor = (lid) => [
      ...DATA.DEBUG.filter((q) => DATA.TOPIC_LESSON[q.topic] === lid).map((q) => ["debug", q.id, `Debug: ${q.title}`]),
      ...DATA.DRILLS.filter((d) => DATA.TOPIC_LESSON[d.topic] === lid).map((d) => ["write", d.id, `Write: ${d.title}`]),
      ...DATA.CHALLENGES.filter((c) => DATA.TOPIC_LESSON[c.topic] === lid).map((c) => ["drive", c.id, `Drive: ${c.title}`]),
    ];
    const draw = () => {
      const l = L.find((x) => x.id === cur), track = trackOf(l), list = L.filter((x) => trackOf(x) === track), li = list.indexOf(l);
      const tName = TRACKS.find((t) => t[0] === track)[1];
      state.cur.learn = cur; if (!state.learn[cur]) { state.learn[cur] = true; updateProgress(); if (L.every((x) => state.learn[x.id])) trophy("cl-learn-all"); } save();
      const pr = track === "code" ? practiceFor(l.id) : [], done = (lv, id) => (lv === "debug" ? state.debug[id]?.solved : lv === "write" ? state.drills[id]?.done : state.auto[id]?.done);
      const checks = state.learnChecks[l.id] || [];
      const next = list[li + 1], nextTrack = TRACKS[(TRACKS.findIndex((t) => t[0] === track) + 1) % TRACKS.length];
      P.innerHTML = `
        <div class="cl-layout">
          <aside class="cl-side">
            <div class="cl-tracks" role="tablist" aria-label="Lesson tracks">${TRACKS.map(([id, name, ico]) => { const tl = L.filter((x) => trackOf(x) === id), read = tl.filter((x) => state.learn[x.id]).length;
              return `<button type="button" role="tab" aria-selected="${id === track}" data-track="${id}">${ico}<span>${name}</span><small>${read}/${tl.length}</small></button>`; }).join("")}</div>
            <div class="cl-side-head"><b>${tName} lessons</b><span>${list.filter((x) => state.learn[x.id]).length} of ${list.length} read</span></div>
            ${sideList(list.map((x, i) => ({ id: x.id, title: x.title, topic: `Lesson ${i + 1}` })), cur, (x) => (state.learn[x.id] ? "done" : ""), "data-l")}
          </aside>
          <article class="cl-main cl-card cl-lesson">
            <header class="cl-q-head"><span class="cl-chip ${track}">${tName} · Lesson ${li + 1} of ${list.length}</span><span class="cl-count">About 2 minutes</span></header>
            <h2 class="cl-title">${esc(l.title)}</h2>
            <div class="cl-lesson-body">${l.body}</div>
            ${l.code ? codeView(l.code) : ""}
            ${l.checklist ? `<div class="cl-checklist"><h3>Try it</h3><ul>${l.checklist.map((c, i) => `<li><label><input type="checkbox" data-check="${i}" ${checks.includes(i) ? "checked" : ""}><span>${esc(c)}</span></label></li>`).join("")}</ul></div>` : ""}
            ${l.links ? `<div class="cl-links"><h3>Free resources</h3><ul>${l.links.map(([t, u]) => { const ext = /^https?:/.test(u); return `<li><a href="${esc(u)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${ext ? ICON.link : ICON.arrow}<span>${esc(t)}</span>${ext ? `<small>${esc(new URL(u).hostname.replace(/^www\./, ""))}</small>` : ""}</a></li>`; }).join("")}</ul></div>` : ""}
            ${pr.length ? `<div class="cl-practice"><h3>Practice this</h3><div>${pr.map(([lv, id, t]) => `<button type="button" class="cl-practice-item${done(lv, id) ? " done" : ""}" data-go-lv="${lv}" data-go-id="${id}">${done(lv, id) ? ICON.check : ICON.arrow}<span>${esc(t)}</span></button>`).join("")}</div></div>` : ""}
            <footer class="cl-actions">
              <button type="button" class="btn ghost" data-prev ${li === 0 ? "disabled" : ""}>Previous</button>
              ${next ? `<button type="button" class="btn primary" data-next>Next lesson ${ICON.arrow}</button>`
                : track === "code" ? `<button type="button" class="btn primary" data-start>Start Debug it ${ICON.arrow}</button>`
                : `<button type="button" class="btn primary" data-track-next="${nextTrack[0]}">Try the ${nextTrack[1]} track ${ICON.arrow}</button>`}
            </footer>
          </article>
        </div>`;
      $$("[data-track]", P).forEach((b) => b.addEventListener("click", () => { const tl = L.filter((x) => trackOf(x) === b.dataset.track); cur = (tl.find((x) => !state.learn[x.id]) || tl[0]).id; draw(); }));
      $$("[data-l]", P).forEach((b) => b.addEventListener("click", () => { cur = b.dataset.l; draw(); }));
      $$("[data-go-lv]", P).forEach((b) => b.addEventListener("click", () => goTo(b.dataset.goLv, b.dataset.goId)));
      $$("[data-check]", P).forEach((c) => c.addEventListener("change", () => { const i = Number(c.dataset.check), arr = new Set(state.learnChecks[l.id] || []); c.checked ? arr.add(i) : arr.delete(i); state.learnChecks[l.id] = [...arr]; save(); if (arr.size === l.checklist.length) toast("Checklist done. Nice!"); }));
      $("[data-prev]", P).addEventListener("click", () => { cur = list[li - 1].id; draw(); });
      $("[data-next]", P)?.addEventListener("click", () => { cur = next.id; draw(); P.scrollIntoView({ block: "start", behavior: reducedMotion ? "auto" : "smooth" }); });
      $("[data-start]", P)?.addEventListener("click", () => show("debug"));
      $("[data-track-next]", P)?.addEventListener("click", (e) => { const tl = L.filter((x) => trackOf(x) === e.currentTarget.dataset.trackNext); cur = tl[0].id; draw(); });
    };
    draw();
  }

  /** Jumps to one item in a level (re-renders that level). */
  function goTo(level, id) {
    if (level === "drive") sim.stop?.();
    state.cur[level] = id; save();
    rendered[level] = false; panels[level].innerHTML = "";
    show(level);
    $(".cl-tabs").scrollIntoView({ block: "start", behavior: reducedMotion ? "auto" : "smooth" });
  }

  /* ================================================================ Start */
  updateProgress();
  const fromHash = location.hash.slice(1);
  const sm = fromHash.match(/^share=(write|drive)\.([\w-]+)\.([\w-]+)$/);
  if (sm && (sm[1] === "write" ? DATA.DRILLS : DATA.CHALLENGES).some((x) => x.id === sm[2])) {
    unpackCode(sm[3]).then((code) => { shared = { level: sm[1], id: sm[2], code }; state.cur[sm[1]] = sm[2]; show(sm[1], false); }).catch(() => { toast("That share link looks broken."); show(state.tab || "learn", false); });
  } else show(LEVELS.some((l) => l.id === fromHash) ? fromHash : state.tab || "learn", false);
  addEventListener("hashchange", () => { const h = location.hash.slice(1); if (LEVELS.some((l) => l.id === h) && h !== state.tab) show(h, false); });
})();
