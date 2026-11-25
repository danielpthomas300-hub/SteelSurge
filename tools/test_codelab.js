// Tests for the Code Lab:  node tools/test_codelab.js
// - the MiniJava interpreter follows Java's rules (integer division, casts, errors)
// - every Debug question has a valid answer
// - every drill: the template compiles and fails, the reference solution passes
// - every robot challenge: the template compiles, the solution passes on a weak,
//   medium, and full battery, and the starting template does not pass
const M = require("../assets/js/minijava.js");
const S = require("../assets/js/codelab-sim.js");
const { DEBUG, DRILLS, CHALLENGES, LESSONS, TOPIC_LESSON } = require("../assets/js/codelab-data.js");

let fails = 0, passes = 0;
const ok = (cond, msg) => { if (cond) passes++; else { fails++; console.log("FAIL", msg); } };
const D = (v) => ({ v, t: "double" }), I = (v) => ({ v, t: "int" });
const run = (src, name, args) => { try { return M.callMethod(M.compile(src), name, args); } catch (e) { return { err: e.message, line: e.line }; } };
const errOf = (src, name = "f", args = []) => run(src, name, args).err || "";

/* ---------- interpreter ---------- */
const same = (a, b) => a && b && a.t === b.t && (a.v === b.v || (typeof a.v === "number" && Math.abs(a.v - b.v) < 1e-9));
ok(same(run("int f(){ return 7 / 2; }", "f", []), I(3)), "int division truncates");
ok(same(run("int f(){ return -7 / 2; }", "f", []), I(-3)), "int division truncates toward zero");
ok(same(run("int f(){ return -7 % 3; }", "f", []), I(-1)), "Java remainder sign");
ok(same(run("double f(){ return 7 / 2.0; }", "f", []), D(3.5)), "double division");
ok(same(run("double f(){ double x = 537 / 12; return x; }", "f", []), D(44)), "int division before widening");
ok(same(run("int f(){ return (int) 3.99; }", "f", []), I(3)), "cast truncates");
ok(same(run("int f(){ return (int) -3.99; }", "f", []), I(-3)), "cast truncates toward zero");
ok(same(run("long f(){ return Math.round(-2.5); }", "f", []), { v: -2, t: "long" }), "Math.round(-2.5) is -2 like Java");
ok(same(run("int f(){ int x = 2147483647; x++; return x; }", "f", []), I(-2147483648)), "int overflow wraps");
ok(same(run("int f(){ int x = 5; x += 2.7; return x; }", "f", []), I(7)), "compound assignment casts");
ok(same(run('String f(){ return "v" + 1.0 + 2; }', "f", []), { v: "v1.02", t: "String" }), "string concat left to right");
ok(same(run('String f(){ return 1 + 2 + "v"; }', "f", []), { v: "3v", t: "String" }), "numbers add before text");
ok(same(run('String f(){ return String.format("%5.2f|%d|%s", 3.14159, 42, true); }', "f", []), { v: " 3.14|42|true", t: "String" }), "String.format");
ok(same(run("double f(){ double[] a = {1, 2, 3}; double s = 0; for (double v : a) { s += v; } return s / a.length; }", "f", []), D(2)), "arrays and for-each");
ok(same(run("int f(){ int s = 0; for (int i = 0; i < 10; i++) { if (i == 5) continue; if (i == 8) break; s += i; } return s; }", "f", []), I(23)), "break and continue");
ok(same(run("int f(){ int i = 0; do { i++; } while (i < 3); return i; }", "f", []), I(3)), "do-while");
ok(same(run("boolean f(){ return 3 > 2 && !(1 == 2) || false; }", "f", []), { v: true, t: "boolean" }), "boolean logic");
ok(same(run("double f(){ return true ? 1 : 2.5; }", "f", []), D(1)) || same(run("double f(){ return true ? 1 : 2.5; }", "f", []), I(1)) === false, "ternary");
ok(same(run("int g(int n){ return n <= 1 ? 1 : n * g(n - 1); }\nint f(){ return g(5); }", "f", []), I(120)), "recursion");
ok(same(run("static final int K = 3;\nint f(){ return K * 2; }", "f", []), I(6)), "class constants");
ok(/whole numbers only/.test(errOf("int f(){ int y = 2.5; return y; }")), "lossy double to int is an error");
ok(/Math\.round/.test(errOf("int f(){ return Math.round(2.4); }")), "long to int is an error with a hint");
ok(/use ==/.test(errOf("boolean f(){ int a = 1; if (a = 5) { return true; } return false; }")), "= in if gives a hint");
ok(/Missing ;/.test(errOf("int f(){\n  int a = 1\n  return a;\n}")) && run("int f(){\n  int a = 1\n  return a;\n}", "f", []).line === 2, "missing semicolon points at the right line");
ok(/Did you mean power/.test(errOf("double f(double power){ return pwer; }", "f", [D(1)])), "spelling suggestions");
ok(/never closed/.test(errOf("int f(){\n  if (true) {\n    return 1;\n}")), "unclosed brace");
ok(/too long/.test(errOf("int f(){ while (true) { } }")), "infinite loop is caught");
ok(/ArrayIndexOutOfBounds/.test(errOf("int f(){ int[] a = new int[2]; return a[2]; }")), "array bounds");
ok(/by zero/.test(errOf("int f(){ int z = 0; return 5 / z; }")), "int divide by zero");
ok(/must return/.test(errOf("int f(){ int a = 1; }")), "missing return");
ok(/already exists/.test(errOf("int f(){ int a = 1; int a = 2; return a; }")), "duplicate variable");
ok(/doesn't do anything|doesn't use the result/.test(errOf("int f(){ int a = 1; a == 2; return a; }")) && /doesn't do anything/.test(errOf("int f(){ int a = 1; a + 2; return a; }")), "not a statement");
ok(/text in quotes/.test(errOf('int f(){ int a = "5"; return a; }')), "string to int hint");
ok(/length\(\)/.test(errOf('int f(){ String s = "ab"; return s.length; }')), "String length hint");

/* ---------- Level 1 ---------- */
for (const q of DEBUG) {
  const lines = q.code.split("\n").length;
  ok(q.id && q.title && q.prompt && q.explain, `debug ${q.id}: has text`);
  if (q.type === "choice") ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, `debug ${q.id}: answer index`);
  else ok(Number.isInteger(q.answer) && q.answer >= 1 && q.answer <= lines && q.code.split("\n")[q.answer - 1].trim() !== "", `debug ${q.id}: answer line ${q.answer} of ${lines}`);
}
ok(new Set(DEBUG.map((q) => q.id)).size === DEBUG.length, "debug ids are unique");

/* ---------- Level 2 ---------- */
const reference = {
  clip: (p) => Math.max(-1, Math.min(1, p)), deadzone: (s) => (Math.abs(s) < 0.1 ? 0 : s), average: (a, b) => (a + b) / 2,
  ticksToInches: (t) => (t / 537.7) * Math.PI * 3.78, inchesToTicks: (i) => Math.floor((i / (Math.PI * 3.78)) * 537.7 + 0.5), scale: (p, s) => (s ? p * 0.4 : p),
  leftPower: (d, t) => Math.max(-1, Math.min(1, d + t)), frontLeft: (y, x, r) => (y + x + r) / Math.max(Math.abs(y) + Math.abs(x) + Math.abs(r), 1),
  holdArm: (t, c) => Math.max(-0.8, Math.min(0.8, 0.005 * (t - c))), atTarget: (p, t) => Math.abs(t - p) <= 15,
  angleError: (t, h) => { let e = t - h; while (e > 180) e -= 360; while (e <= -180) e += 360; return e; }, justPressed: (n, b) => n && !b,
  maxAbs: (a) => a.reduce((m, x) => Math.max(m, Math.abs(x)), 0), countAbove: (a, l) => a.filter((x) => x > l).length,
  averageAll: (a) => (a.length ? a.reduce((t, x) => t + x, 0) / a.length : 0), ramp: (c, t) => (Math.abs(t - c) <= 0.05 ? t : c + Math.sign(t - c) * 0.05),
};
const raw = (a) => (a.t === "array" ? a.v.items.map((x) => x.v) : a.v);
for (const d of DRILLS) {
  const sol = M.compile(d.solution), tpl = M.compile(d.template);
  let templateFails = false;
  for (const args of d.tests) {
    const r = M.callMethod(sol, d.method, args);
    const exp = reference[d.method](...args.map(raw));
    ok(r.t === d.returns && (typeof exp === "boolean" ? r.v === exp : Math.abs(r.v - exp) < 1e-9), `drill ${d.id}: solution ${JSON.stringify(args.map(raw))} -> ${r.v} (want ${exp})`);
    try { const t = M.callMethod(tpl, d.method, args); if (t.v !== r.v) templateFails = true; } catch { templateFails = true; }
  }
  ok(templateFails, `drill ${d.id}: the starting template should not already pass`);
}
// The classic mistake really is caught
ok(M.callMethod(M.compile("double average(int left, int right){ return (left + right) / 2; }"), "average", [I(100), I(101)]).v === 100, "drill average: int division mistake gives 100");

/* ---------- Level 3 ---------- */
for (const ch of CHALLENGES.filter((c) => c.mode !== "teleop")) {
  for (const battery of ch.battery === "random" ? [0.7, 0.85, 1] : [1]) {
    const r = S.runToEnd(ch.solution, ch, { battery });
    const w = r.world;
    ok(!r.error && r.result && r.result.pass, `challenge ${ch.id}: solution passes on battery ${battery} ` +
      `(${r.error ? "error line " + r.error.line + ": " + r.error.message : r.result ? r.result.goals.map((g) => g.text + "=" + g.state + (g.detail ? " " + g.detail : "")).join("; ") : "no result"}; robot at ${w.robot.x.toFixed(1)},${w.robot.y.toFixed(1)} heading ${(w.robot.h * 57.2958).toFixed(1)}; ${r.endReason})`);
  }
  const t = S.runToEnd(ch.template, ch, { battery: 0.85 });
  ok(!t.error, `challenge ${ch.id}: template runs without errors${t.error ? " (line " + t.error.line + ": " + t.error.message + ")" : ""}`);
  ok(!(t.result && t.result.pass), `challenge ${ch.id}: template should not already pass`);
}
// Timing-only driving should be unreliable on the encoder challenge
const enc = CHALLENGES.find((c) => c.id === "encoders");
const timed = enc.template.replace("// 1. Start both motors.", "left.setPower(0.5);\n        right.setPower(0.5);\n        sleep(1550);\n        left.setPower(0);\n        right.setPower(0);");
ok(S.runToEnd(timed, enc, { battery: 1 }).result.pass && !S.runToEnd(timed, enc, { battery: 0.7 }).result.pass, "challenge encoders: sleep() timing passes on a full battery but fails on a weak one");
// Common mistakes give helpful errors
const first = CHALLENGES[0];
const badName = S.runToEnd(first.template.replace('"left"', '"Left"'), first);
ok(badName.error && /Did you mean "left"/.test(badName.error.message), "wrong device name suggests the right one");
const rtpOrder = CHALLENGES.find((c) => c.id === "rtp");
const wrongOrder = S.runToEnd(rtpOrder.template.replace("// 1. setTargetPosition(target) on both motors", "left.setMode(DcMotor.RunMode.RUN_TO_POSITION);"), rtpOrder);
ok(wrongOrder.error && /TargetPositionNotSet/.test(wrongOrder.error.message), "RUN_TO_POSITION before a target throws like the real SDK");
const stuck = S.runToEnd(first.template.replace("// Drive forward into the parking zone, then stop.", "while (true) { }"), first);
ok(stuck.error && /stuck in a loop/.test(stuck.error.message), "busy loop without time is caught");
const early = S.runToEnd(first.solution.replace("        waitForStart();\n", ""), first);
ok(early.world.log.some((l) => /before START/.test(l.text)) || early.error, "moving before waitForStart is flagged");

/* ---------- TeleOp: an autopilot drives the gamepad to prove each challenge can be finished ---------- */
const wrapRad = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
function autopilot(ch, src, scheme, path, seconds = 110) {
  const input = S.newInput(), run = S.createRun(src, ch, { input, battery: 1 });
  let i = 0, hold = 0;
  for (let k = 0; k < seconds * 50 && !run.over; k++) {
    const w = run.world, rb = w.robot, g = input.g1;
    Object.assign(g, S.blankPad());
    const st = path[i];
    if (st && w.started) {
      if (st.press) { g[st.press] = hold < 0.1; hold += 0.02; if (hold > 0.8) { i++; hold = 0; } }
      else {
        const p = st.claw ? w.clawPoint() : rb, dx = st.x - p.x, dy = st.y - p.y, dist = Math.hypot(dx, dy);
        if (dist < (st.tol || 4)) { i++; }
        else if (scheme === "mecanum") {
          const f = -dx * Math.sin(rb.h) + dy * Math.cos(rb.h), sr = dx * Math.cos(rb.h) + dy * Math.sin(rb.h), m = Math.max(Math.abs(f), Math.abs(sr)), sp = clampN(dist * 0.05, 0.15, 0.6);
          g.ly = -(f / m) * sp; g.lx = (sr / m) * sp; g.rx = clampN(rb.h * 1.2, -0.3, 0.3);
        } else {
          const err = wrapRad(Math.atan2(-dx, dy) - rb.h), t = clampN(err * 1.2, -0.45, 0.45);
          const fwd = Math.abs(err) > 0.35 ? 0 : clampN(dist * 0.04, 0.12, st.slow ? 0.3 : 0.6) * Math.cos(err);
          if (scheme === "tank") { g.ly = -(fwd - t); g.ry = -(fwd + t); }
          else { g.ly = -fwd; g.rx = -t; if (st.slow) { g.rb = true; g.ly = -fwd / 0.4 * 0.4; } }
        }
      }
    }
    run.advance(0.02);
  }
  return run;
}
const TELE = {
  tank: { scheme: "tank", path: [{ x: 72, y: 60 }, { x: 112, y: 100 }, { x: 26, y: 122, tol: 3 }] },
  arcade: { scheme: "arcade", path: [{ x: 104, y: 24 }, { x: 112, y: 46 }, { x: 112, y: 72 }, { x: 50, y: 72 }, { x: 30, y: 96 }, { x: 36, y: 122 }, { x: 110, y: 125, tol: 3 }] },
  mecanumtele: { scheme: "mecanum", path: [{ x: 24, y: 64 }, { x: 120, y: 64 }, { x: 72, y: 122, tol: 3 }] },
  toggle: { scheme: "arcade", path: [{ x: 72, y: 80, claw: true, tol: 3 }, { press: "a" }, { x: 124, y: 124, claw: true, tol: 4 }, { press: "a" }] },
};
for (const ch of CHALLENGES.filter((c) => c.mode === "teleop")) {
  const plan = TELE[ch.id];
  ok(plan, `teleop ${ch.id}: has an autopilot plan in the test`);
  if (!plan) continue;
  const run = autopilot(ch, ch.solution, plan.scheme, plan.path);
  const w = run.world;
  ok(!run.error && run.result && run.result.pass, `teleop ${ch.id}: solution can finish the challenge (${run.error ? "error line " + run.error.line + ": " + run.error.message : run.result ? run.result.goals.map((g) => g.text + "=" + g.state).join("; ") : "not finished, reason " + run.endReason}; robot at ${w.robot.x.toFixed(1)},${w.robot.y.toFixed(1)}, cp ${w.cp}, wall hits ${w.wallHits})`);
  const t = autopilot(ch, ch.template, plan.scheme, plan.path, 6);
  ok(!t.error, `teleop ${ch.id}: template runs without errors${t.error ? " (line " + t.error.line + ": " + t.error.message + ")" : ""}`);
  ok(!(t.result && t.result.pass), `teleop ${ch.id}: template should not already pass`);
}
// The flicker bug really flickers: holding A in the naive version toggles many times
const tog = CHALLENGES.find((c) => c.id === "toggle");
const naive = tog.solution.replace("if (gamepad1.a && !lastA) {", "if (gamepad1.a) {");
{
  const input = S.newInput(), run = S.createRun(naive, tog, { input }); let flips = 0, last = null;
  for (let k = 0; k < 80; k++) { input.g1.a = k > 30 && k < 45; run.advance(0.02); const tgt = run.world.servos.claw.target; if (last !== null && tgt !== last) flips++; last = tgt; }
  ok(flips > 2, `naive toggle flickers when A is held (${flips} flips)`);
}

/* ---------- engine features ---------- */
{
  const ch0 = { start: { x: 72, y: 40, h: 0 }, zones: [], goals: [] };
  const src = `public class T extends LinearOpMode {
    DcMotor left;
    public void runOpMode() {
        left = hardwareMap.get(DcMotor.class, "left");
        waitForStart();
        int count = 0;
        count = count + 2;
        left.setPower(0.2);
    }
}`;
  const run = S.createRun(src, ch0); run.pause(); run.advance(0.1);
  const lines = [run.pausedLine];
  for (let k = 0; k < 4; k++) { run.step(); run.advance(1); lines.push(run.pausedLine); }
  ok(JSON.stringify(lines) === "[4,5,6,7,8]", `step mode runs one line at a time (${lines})`);
  const snap = run.interp.snapshot();
  ok(snap.method === "runOpMode" && snap.locals.some((l) => l.name === "count" && l.v.v === 2) && snap.fields.some((f) => f.name === "left"), "variable snapshot shows locals, fields, and the method");
}
{
  const it = `@TeleOp(name = "It")
public class It extends OpMode {
    DcMotor left, right;
    int loops = 0;
    @Override
    public void init() { left = hardwareMap.get(DcMotor.class, "left"); right = hardwareMap.get(DcMotor.class, "right"); right.setDirection(DcMotor.Direction.REVERSE); }
    @Override
    public void loop() { loops++; left.setPower(0.3); right.setPower(0.3); }
}`;
  const chT = { mode: "teleop", start: { x: 72, y: 20, h: 0 }, zones: [], goals: [] };
  const run = S.createRun(it, chT); for (let k = 0; k < 50; k++) run.advance(0.02);
  ok(!run.error && run.world.robot.y > 25 && run.interp.cls.vars.get("loops").v.v > 20, "OpMode with init() and loop() runs loop() repeatedly");
  const bad = S.createRun(it.replace("loops++;", "loops++; sleep(100);"), chT); for (let k = 0; k < 50; k++) bad.advance(0.02);
  ok(bad.error && /sleep\(\) isn't allowed/.test(bad.error.message), "sleep() inside loop() gives a helpful error");
}
{
  const imuSrc = CHALLENGES.find((c) => c.id === "turn").solution;
  ok(/imu\.initialize\(new IMU\.Parameters\(new RevHubOrientationOnRobot/.test(imuSrc), "IMU templates initialize the IMU like real code");
}
/* ---------- lessons ---------- */
ok(LESSONS.length >= 10 && new Set(LESSONS.map((l) => l.id)).size === LESSONS.length, "lessons have unique ids");
const lessonIds = new Set(LESSONS.map((l) => l.id));
for (const item of [...DEBUG, ...DRILLS, ...CHALLENGES]) ok(lessonIds.has(TOPIC_LESSON[item.topic]), `topic "${item.topic}" (${item.id}) links to a lesson`);
for (const l of LESSONS) if (l.code && /class|setPower|=/.test(l.code)) { try { M.lex(l.code); ok(true, ""); } catch (e) { ok(false, `lesson ${l.id} code doesn't tokenize: ${e.message}`); } }

console.log(`\nCode Lab tests: ${passes} passed, ${fails} failed.`);
process.exit(fails ? 1 : 0);
