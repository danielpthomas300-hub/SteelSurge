#!/usr/bin/env node
/* Tests for the site's newer features (run on every push by the Site check workflow):
     Kilovolt answer matching and prompt lists   assets/js/arcade/kilovolt-match.js, kilovolt-facts.js
     Scouting predictions and rank projection    assets/js/scout-model.js
     Calendar files and Google links             assets/js/ics.js
     Portfolio check scoring                     assets/js/portfolio-rules.js
     Robot calculators (drivetrain, encoders,    assets/js/robot-math.js
       mecanum, arm and lift)
   Usage: node tools/test_features.js */
"use strict";
const path = require("path");
const ROOT = path.join(__dirname, "..");
global.window = global.window || {};
const KM = require(path.join(ROOT, "assets/js/arcade/kilovolt-match.js"));
require(path.join(ROOT, "assets/js/arcade/kilovolt-facts.js")); // sets window.KilovoltFacts
const SM = require(path.join(ROOT, "assets/js/scout-model.js"));
const CAL = require(path.join(ROOT, "assets/js/ics.js"));
const PR = require(path.join(ROOT, "assets/js/portfolio-rules.js"));

let passed = 0; const failures = [];
const test = (name, fn) => { try { fn(); passed++; } catch (e) { failures.push(`${name}\n    ${e.message}`); } };
const eq = (a, b, msg = "") => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok = (v, msg) => { if (!v) throw new Error(msg || "expected true"); };
const near = (a, b, tol, msg = "") => { if (Math.abs(a - b) > tol) throw new Error(`${msg} expected ${b} ± ${tol}, got ${a}`); };

/* ---------------- Kilovolt ---------------- */
const FACTS = window.KilovoltFacts;
const itemsOf = (id) => { const f = FACTS.find((x) => x.id === id); const seen = new Set(); return f.items.split("|").map((n) => n.trim()).filter(Boolean).map((name, rank) => ({ name, rank, keys: KM.answerKeys(name).filter((k) => !seen.has(k) && seen.add(k)) })).filter((it) => it.keys.length); };
const answer = (id, raw) => { const r = KM.matchList(itemsOf(id), raw); return !r ? "none" : r.ambiguous ? "ambiguous" : `${r.item.name}${r.fuzzy ? " (typo)" : ""}`; };

test("Kilovolt: every prompt has a unique id, a type, and text", () => {
  const ids = new Set();
  for (const f of FACTS) { ok(!ids.has(f.id), `duplicate id ${f.id}`); ids.add(f.id); ok(["game", "ftc"].includes(f.type), `${f.id} has type ${f.type}`); ok(/^Name /.test(f.text), `${f.id} text should start with "Name"`); }
});
test("Kilovolt: every prompt has at least 3 distinct answers", () => {
  for (const f of FACTS) { const n = itemsOf(f.id).length; ok(n >= 3, `${f.id} has only ${n} usable answers`); }
});
test("Kilovolt: no answer is a duplicate of another in the same prompt", () => {
  for (const f of FACTS) { const names = f.items.split("|").map((n) => n.trim()).filter(Boolean); ok(itemsOf(f.id).length === names.length, `${f.id}: ${names.length - itemsOf(f.id).length} answer(s) repeat another`); }
});
test("Kilovolt: exact answers, capitals, plurals, and 'the' are accepted", () => {
  eq(answer("g-2022", "cone"), "Cone"); eq(answer("g-2022", "Cones"), "Cone");
  eq(answer("g-2022", "the signal sleeves"), "Signal sleeve"); eq(answer("f-awards", "inspire"), "Inspire Award");
});
test("Kilovolt: short forms count (tank, omni, color, net)", () => {
  eq(answer("f-drive", "tank"), "Tank drive"); eq(answer("f-drive", "omni"), "Omni wheel");
  eq(answer("f-elec", "color"), "Color sensor"); eq(answer("g-2024", "net"), "Net zone");
});
test("Kilovolt: one typo is forgiven from 4 letters, swapped letters count as one", () => {
  eq(answer("g-2022", "cnoe"), "Cone (typo)"); eq(answer("f-drive", "tnak"), "Tank drive (typo)");
  eq(answer("f-drive", "mechanum"), "Mecanum (typo)"); eq(answer("f-drive", "mecahnum"), "Mecanum (typo)");
  eq(answer("f-awards", "inspyre"), "Inspire Award (typo)");
});
test("Kilovolt: too many typos, wrong first letters, and short misspellings are rejected", () => {
  eq(answer("f-parts", "amr"), "none"); eq(answer("g-2022", "xyzzy"), "none"); eq(answer("g-2022", "pone"), "none");
});
test("Kilovolt: a typo equally close to two answers isn't guessed", () => {
  const items = ["Rover", "Roves"].map((name, rank) => ({ name, rank, keys: KM.answerKeys(name) }));
  eq(KM.matchList(items, "rovee"), { ambiguous: true });
});
test("Kilovolt: team names ignore 'the', 'robotics', and punctuation", () => {
  eq(KM.key2("The Steel Surge Robotics"), "steelsurge"); eq(KM.key1("Steel-Surge!"), "steelsurge");
});
test("Kilovolt: typo limits by length", () => { eq([3, 4, 12, 13].map(KM.slack), [0, 1, 1, 2]); eq(KM.lev("cone", "cnoe", 2), 1); });

/* ---------------- Scouting ---------------- */
// A small made-up event: 8 teams with known strength, every team in 6 qualification matches
const TEAMS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ n, name: `Team ${n}`, opr: 10 * n, rp: null, played: 0 }));
const oprOf = (n) => TEAMS.find((t) => t.n === n)?.opr ?? 0;
function schedule(scoreFor = (side) => side.reduce((s, n) => s + oprOf(n), 0)) {
  const out = []; let k = 1;
  for (let r = 0; r < 6; r++) for (let i = 0; i < 2; i++) {
    const order = [...TEAMS.map((t) => t.n)].sort((a, b) => ((a * 7 + r * 3 + i) % 8) - ((b * 7 + r * 3 + i) % 8));
    const red = order.slice(i * 4, i * 4 + 2), blue = order.slice(i * 4 + 2, i * 4 + 4);
    out.push({ n: k++, level: "Quals", red, blue, rs: scoreFor(red, k), bs: scoreFor(blue, k) });
  }
  return out;
}
test("Scouting: equal alliances are a coin flip, a stronger one is favored", () => {
  const a = { mean: 100, sd: 20 };
  near(SM.winChance(a, a), 0.5, 1e-6, "equal");
  ok(SM.winChance({ mean: 140, sd: 20 }, a) > 0.85, "much stronger should be > 85%");
  ok(SM.winChance({ mean: 105, sd: 20 }, a) > 0.5 && SM.winChance({ mean: 105, sd: 20 }, a) < 0.65, "slightly stronger is a small edge");
  near(SM.winChance({ mean: 120, sd: 20 }, a) + SM.winChance(a, { mean: 120, sd: 20 }), 1, 1e-6, "both sides add to 100%");
});
test("Scouting: a team that scores the same every match rates steady", () => {
  const cons = SM.consistency(TEAMS, schedule(), oprOf);
  for (const t of TEAMS) { const c = cons.get(t.n); ok(c && c.n >= 3, `team ${t.n} should have matches`); ok(c.score >= 95, `team ${t.n} steady score ${c.score}`); near(c.mean, t.opr, 0.01, `team ${t.n} share`); }
});
test("Scouting: a team whose scores swing rates lower", () => {
  const wild = (side, k) => side.reduce((s, n) => s + oprOf(n), 0) + (side.includes(3) ? (k % 2 ? 40 : -25) : 0);
  const cons = SM.consistency(TEAMS, schedule(wild), oprOf);
  ok(cons.get(3).score < 60, `team 3 should swing, got ${cons.get(3).score}`);
  ok(cons.get(8).score > cons.get(3).score, "a steady team rates higher than a swinging one");
});
test("Scouting: with every match played, the projection is the official ranking", () => {
  const teams = TEAMS.map((t, i) => ({ ...t, rp: 3 - i * 0.2, tb1: 0, tb2: 0, played: 6, w: 6 - i % 6, l: i % 6, t: 0, rank: 8 - i }));
  const res = SM.project({ teams, matches: schedule(), team: 1, K: 4, oprOf });
  eq(res.left, 0); eq(res.rows.map((r) => r.n), [8, 7, 6, 5, 4, 3, 2, 1]);
  eq(res.rows.map((r) => r.mid), [1, 2, 3, 4, 5, 6, 7, 8]);
});
test("Scouting: mid-event projection is sensible and repeatable", () => {
  const ms = schedule(); ms.slice(6).forEach((m) => { m.rs = null; m.bs = null; });
  const a = SM.project({ teams: TEAMS, matches: ms, team: 8, K: 4, seed: 42, runs: 1500, oprOf });
  const b = SM.project({ teams: TEAMS, matches: ms, team: 8, K: 4, seed: 42, runs: 1500, oprOf });
  eq(a.rows.map((r) => r.n), b.rows.map((r) => r.n), "same seed gives same answer");
  eq(a.left, 6); near(a.rows.reduce((s, r) => s + r.top, 0), 4, 1e-6, "top-4 chances add up to 4");
  ok(a.rows[0].n === 8 || a.rows[0].n === 7, `strongest teams should lead, got ${a.rows[0].n}`);
  ok(a.rows.at(-1).n <= 2, `weakest teams should trail, got ${a.rows.at(-1).n}`);
  for (const k of a.keys) { ok(k.pWin >= 0 && k.pWin <= 1, "win chance between 0 and 1"); ok(k.m.red.includes(8) || k.m.blue.includes(8), "key matches are ours"); }
});

test("Alliances: captains are the top teams, picking the best available in order", () => {
  const order = [8, 7, 6, 5, 4, 3, 2, 1];
  eq(SM.draft({ order, K: 2, size: 2, value: oprOf }), [[8, 6], [7, 5]]);
});
test("Alliances: 3-team alliances pick in a snake (round 2 reversed)", () => {
  eq(SM.draft({ order: [8, 7, 6, 5, 4, 3, 2, 1], K: 2, size: 3, value: oprOf }), [[8, 6, 3], [7, 5, 4]]);
});
test("Alliances: a forced pick is used, and crossed-off teams are skipped", () => {
  const order = [8, 7, 6, 5, 4, 3, 2, 1];
  eq(SM.draft({ order, K: 2, size: 2, value: oprOf, forced: { 8: [2] } }), [[8, 2], [7, 6]]);
  eq(SM.draft({ order, K: 2, size: 2, value: oprOf, taken: new Set([6]) }), [[8, 5], [7, 4]]);
});
test("Alliances: first-pick suggestions are ranked by win chance, and only for captains", () => {
  const order = [8, 7, 6, 5, 4, 3, 2, 1], cons = SM.consistency(TEAMS, schedule(), oprOf);
  const picks = SM.firstPicks({ order, K: 2, size: 2, us: 8, oprOf, cons });
  eq(picks[0].n, 6, "the strongest non-captain is the best pick");
  ok(picks.every((p, i) => i === 0 || Math.round(p.avg * 100) <= Math.round(picks[i - 1].avg * 100)), "sorted by win chance");
  ok(picks.every((p) => p.ours[0] === 8 && p.ours[1] === p.n), "our alliance includes the pick");
  eq(SM.firstPicks({ order, K: 2, size: 2, us: 3, oprOf, cons }), null, "not a captain");
});

/* ---------------- Calendar ---------------- */
const lines = (ics) => ics.split("\r\n");
test("Calendar: an all-day event ends the day after its last day", () => {
  const ics = CAL.icsFile([{ id: "a", title: "Qualifier", start: "2026-12-05", end: "2026-12-06" }], new Date("2026-11-01T00:00:00Z"));
  ok(lines(ics).includes("DTSTART;VALUE=DATE:20261205")); ok(lines(ics).includes("DTEND;VALUE=DATE:20261207"));
});
test("Calendar: dates roll over months and years", () => { eq(CAL.nextDay("2026-12-31"), "20270101"); eq(CAL.nextDay("2028-02-28"), "20280229"); eq(CAL.nextDay("2026-04-30"), "20260501"); });
test("Calendar: timed events use the start and end times", () => {
  const ics = CAL.icsFile([{ id: "b", title: "Demo", start: "2026-12-05", time: "18:00", endTime: "19:30" }]);
  ok(lines(ics).includes("DTSTART:20261205T180000")); ok(lines(ics).includes("DTEND:20261205T193000"));
});
test("Calendar: commas, semicolons, and line breaks are escaped; lines are folded", () => {
  const ics = CAL.icsFile([{ id: "c", title: "Demo, robots; fun", start: "2026-12-05", detail: "Line one\nLine two " + "x".repeat(120) }]);
  ok(ics.includes("SUMMARY:Demo\\, robots\\; fun"), "summary escaped"); ok(ics.includes("Line one\\nLine two"), "line break escaped");
  ok(lines(ics).every((l) => l.length <= 75), "lines folded to 75 characters"); ok(ics.startsWith("BEGIN:VCALENDAR\r\n") && ics.endsWith("END:VCALENDAR\r\n"));
});
test("Calendar: Google link has the event's dates", () => {
  const u = new URL(CAL.googleCal({ title: "Qualifier", start: "2026-12-05" })); eq(u.searchParams.get("dates"), "20261205/20261206"); eq(u.searchParams.get("text"), "Qualifier");
});

/* ---------------- Portfolio check ---------------- */
const PAGES = [
  "About us\nSteel Surge is FTC team 27254. Our team has 7 members with roles in mechanical and programming.",
  "Engineering process\nRequirements: the intake had to collect game pieces in under 2 seconds. We brainstormed four ideas and compared them in a decision matrix. Our first prototype was tested in 20 trials and the data showed a 60% success rate. Version 2 fixed it. Lesson learned: test early.",
  "Outreach\nWe ran robot demos at the library, reaching 150\nstudents. We completed 64 outreach hours.",
];
const area = (id) => PR.scoreArea(PR.AREAS.find((a) => a.id === id), PAGES, PAGES);
test("Portfolio: every area has signals with tips and judge questions", () => {
  for (const a of PR.AREAS) { ok(a.signals.length >= 3, `${a.id} needs signals`); ok(a.signals.every(([label, re, w, tip]) => label && re instanceof RegExp && w > 0 && tip), `${a.id} has an incomplete signal`); ok(a.ask.length >= 2, `${a.id} needs questions`); }
});
test("Portfolio: finds engineering evidence with page numbers and clean quotes", () => {
  const e = area("eng"), labels = e.found.map((f) => f.label);
  for (const l of ["Goals or requirements", "Ideas compared", "Prototypes", "Iterations", "Testing", "Data and measurements", "Failures and lessons"]) ok(labels.includes(l), `missing ${l}`);
  ok(e.found.every((f) => f.pages.includes(2)), "all on page 2"); ok(!e.found.some((f) => /^Engineering process/.test(f.quote)), "quotes don't start with the heading");
  ok(e.missing.some((m) => m.label === "Math and science"), "math is missing"); ok(e.score > 50 && e.score <= 100, `score ${e.score}`);
});
test("Portfolio: matches across line breaks (\"150\" + newline + \"students\")", () => { ok(area("outreach").found.some((f) => f.label === "People reached"), "people reached found"); });
test("Portfolio: an empty portfolio scores zero with every tip listed", () => {
  const a = PR.scoreArea(PR.AREAS[0], ["", ""], ["", ""]); eq(a.score, 0); eq(a.missing.length, PR.AREAS[0].signals.length);
});
test("Portfolio: word counts and sentences", () => {
  eq(PR.words("We built 2 robots, quickly."), 5);
  eq(PR.sentences("Our Robot\nThe intake grabs pixels fast. It never jams in testing."), ["Our Robot.", "The intake grabs pixels fast.", "It never jams in testing."].filter((s) => s.length > 20));
});

/* ---------------- Robot calculators ---------------- */
const RM = require(path.join(ROOT, "assets/js/robot-math.js"));
test("Robot: motor specs match the makers' pages", () => {
  const ids = new Set();
  for (const m of RM.MOTORS) { ok(!ids.has(m.id), `duplicate motor ${m.id}`); ids.add(m.id); ok(m.rpm > 0 && m.stallNm > 0 && m.cpr > 0 && m.stallA > 0, `${m.id} is missing a spec`); }
  const y312 = RM.motor("gb-312"); eq([y312.ratio, y312.rpm, y312.cpr], [19.2, 312, 537.7]); near(y312.stallNm, 24.3 * 0.0980665, 1e-9);
  eq(RM.motor("gb-435").cpr, 384.5); eq(RM.motor("rev-core").cpr, 288); near(RM.motor("rev-up20").cpr, 529.2, 1e-9);
  // Free speed falls as the ratio rises, and torque grows (within a brand's planetary line)
  const gbs = RM.MOTORS.filter((m) => m.brand === "goBILDA");
  for (let i = 1; i < gbs.length; i++) ok(gbs[i].rpm < gbs[i - 1].rpm && gbs[i].stallNm > gbs[i - 1].stallNm, `${gbs[i].id} out of order`);
});
test("Robot: gear stages multiply, and bad stages count as 1:1", () => {
  eq(RM.gearRatio([]), 1); eq(RM.gearRatio([{ driver: 20, driven: 40 }]), 2);
  near(RM.gearRatio([{ driver: 20, driven: 40 }, { driver: 15, driven: 45 }]), 6, 1e-12);
  eq(RM.gearRatio([{ driver: 0, driven: 40 }, null]), 1); eq(RM.gearRatio([{ driver: 40, driven: 20 }]), 0.5);
});
test("Robot: drivetrain speed, force, and times", () => {
  const m = RM.motor("gb-312"), r = RM.drivetrain({ m, wheelD: 0.096, motors: 4, mass: 14, mu: 0.7 });
  near(r.wheelRpm, 312, 1e-9); near(r.free, (312 / 60) * Math.PI * 0.096, 1e-9); near(r.top, r.free * 0.8, 1e-9);
  near(r.motorForce, (4 * m.stallNm * 0.85) / 0.048, 1e-6); near(r.grip, 0.7 * 14 * 9.80665, 1e-9);
  eq(r.slips, true); near(r.push, r.grip, 1e-9);
  ok(r.tile > 0 && r.tile < r.twoTiles && r.twoTiles < r.field, "times should grow with distance");
  ok(r.field > 3.6576 / r.top, "can't beat crossing the field at top speed the whole way");
  const geared = RM.drivetrain({ m, ext: 2, wheelD: 0.096, motors: 4, mass: 14 });
  near(geared.wheelRpm, 156, 1e-9); near(geared.motorForce, r.motorForce * 2, 1e-6);
  eq(RM.drivetrain({ m, wheelD: 0 }), null);
  eq(RM.timeTo(1, { top: 1, force: 0, grip: 10, mass: 10 }), Infinity);
});
test("Robot: encoder ticks per inch and per degree", () => {
  const r = RM.encoder({ cpr: 537.7, wheelD: 0.096 });
  near(r.perRev, 537.7, 1e-9); near(r.perM * 0.0254, 45.29, 0.01); near(r.perDeg, 537.7 / 360, 1e-12);
  near(RM.encoder({ cpr: 288, ext: 3 }).perDeg, 2.4, 1e-12); eq(RM.encoder({ cpr: 288 }).perM, null); eq(RM.encoder({ cpr: 0 }), null);
});
test("Robot: mecanum wheel powers and the reverse", () => {
  eq(RM.mecanum(1, 0, 0), { fl: 1, fr: 1, bl: 1, br: 1 });
  eq(RM.mecanum(0, 1, 0), { fl: 1, fr: -1, bl: -1, br: 1 });
  eq(RM.mecanum(0, 0, 1), { fl: 1, fr: -1, bl: 1, br: -1 });
  eq(RM.mecanum(1, 1, 0), { fl: 1, fr: 0, bl: 0, br: 1 }); // diagonal: scaled so nothing passes 1
  for (const [d, s, t] of [[0.5, 0.2, 0], [0.3, -0.4, 0.2], [-0.2, 0.1, -0.3]]) {
    const mo = RM.mecanumMotion(RM.mecanum(d, s, t)); near(mo.drive, d, 1e-12); near(mo.strafe, s, 1e-12); near(mo.turn, t, 1e-12);
  }
  const w = RM.mecanum(1, 1, 1); ok(Math.max(...Object.values(w).map(Math.abs)) <= 1 + 1e-12, "no wheel past full power");
});
test("Robot: arm and lift torque", () => {
  const m = RM.motor("gb-117"), a = RM.arm({ m, length: 0.3, loadKg: 1, armKg: 0 });
  near(a.need, 9.80665 * 0.3, 1e-9); near(a.have, m.stallNm * 0.85, 1e-9); near(a.share, a.need / a.have, 1e-12);
  eq(a.verdict, "ok"); ok(a.rpm < 117 && a.rpm > 0, "slower under load"); ok(a.amps > 0.25 && a.amps < 9.2, "current between free and stall");
  near(RM.arm({ m, length: 0.3, loadKg: 0, armKg: 2 }).need, 9.80665 * 2 * 0.15, 1e-9); // arm weight acts at half its length
  eq(RM.arm({ m, length: 1, loadKg: 5 }).verdict, "stall"); eq(RM.arm({ m, length: 1, loadKg: 5 }).rpm, 0);
  near(RM.arm({ m, motors: 2, length: 0.3, loadKg: 1 }).share, a.share / 2, 1e-12); // two motors halve the share
  const l = RM.lift({ m: RM.motor("gb-312"), spoolD: 0.038, massKg: 2 });
  near(l.need, 2 * 9.80665 * 0.019, 1e-9); eq(l.verdict, "easy"); ok(l.speed > 0 && l.speed < (312 / 60) * Math.PI * 0.038, "lift speed under load");
});

test("Robot: field-centric turns field directions into robot directions", () => {
  eq(RM.fieldCentric(1, 0, 0), { drive: 1, strafe: 0 });
  const left = RM.fieldCentric(1, 0, 90); near(left.drive, 0, 1e-12); near(left.strafe, 1, 1e-12); // facing left: field-forward is the robot's right
  const back = RM.fieldCentric(1, 0, 180); near(back.drive, -1, 1e-12); near(back.strafe, 0, 1e-12);
  const any = RM.fieldCentric(0.6, -0.3, 37); near(Math.hypot(any.drive, any.strafe), Math.hypot(0.6, 0.3), 1e-12, "same stick strength");
});
test("Robot: arm torque at an angle and hold power", () => {
  const m = RM.motor("gb-117"), flat = RM.arm({ m, length: 0.3, loadKg: 1 }), up = RM.arm({ m, length: 0.3, loadKg: 1, angle: 60 });
  near(up.need, flat.need * 0.5, 1e-9); near(up.flat, flat.need, 1e-12); near(flat.kG, flat.share, 1e-12);
  near(RM.arm({ m, length: 0.3, loadKg: 1, angle: 90 }).need, 0, 1e-9); near(RM.arm({ m, length: 0.3, loadKg: 1, angle: -60 }).need, up.need, 1e-9);
});

/* ---------------- Report ---------------- */
console.log(failures.length ? `\nFeature tests: ${passed} passed, ${failures.length} failed\n\n  ✗ ${failures.join("\n  ✗ ")}\n` : `Feature tests: ${passed} passed, 0 failed.`);
process.exit(failures.length ? 1 : 0);
