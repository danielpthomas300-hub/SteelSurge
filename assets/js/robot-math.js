/* ==========================================================================
   Steel Surge — Robot calculator math (used by robot-calc.js, tested by tools/test_features.js)
   No page code here: just numbers in, numbers out. Everything inside is SI
   (metres, kilograms, newtons, N·m, seconds); the page converts inches, mm and pounds.
     MOTORS          motor specs from goBILDA's and REV's own product pages
     gearRatio()     overall reduction from gear stages
     drivetrain()    wheel speed, top speed, pushing force, time to cross the field
     encoder()       ticks per inch/mm of travel or per degree of an arm
     mecanum()       wheel powers for drive / strafe / turn, and the reverse
     arm(), lift()   torque needed vs. what the motor has
   ========================================================================== */
(function (root) {
  "use strict";
  const G = 9.80665, KGCM = 0.0980665; // kg·cm → N·m

  /* Motor specs at 12 V, copied from the makers' pages (checked November 2026):
       goBILDA 5203 Yellow Jacket: gobilda.com product pages ("Specs" table on each ratio's page)
       REV HD Hex, Core Hex, 40:1 spur: revrobotics.com/rev-41-1291, rev-41-1300, rev-41-1301
       REV HD Hex + UltraPlanetary: docs.revrobotics.com HD Hex page (its table of combinations)
     cpr = encoder counts per OUTPUT shaft revolution, as the FTC SDK counts them.
     For REV gearboxes the page gives 28 counts per motor turn, so cpr = 28 × the actual ratio. */
  const gb = (ratio, rpm, kgcm, cpr) => ({ id: `gb-${rpm}`, brand: "goBILDA", name: `Yellow Jacket ${ratio}:1 (${rpm} RPM)`, ratio, rpm, stallNm: kgcm * KGCM, stallA: 9.2, freeA: 0.25, cpr });
  const MOTORS = [
    gb(1, 6000, 1.47, 28), gb(3.7, 1620, 5.4, 103.8), gb(5.2, 1150, 7.9, 145.1), gb(13.7, 435, 18.7, 384.5),
    gb(19.2, 312, 24.3, 537.7), gb(26.9, 223, 38.0, 751.8), gb(50.9, 117, 68.4, 1425.1), gb(71.2, 84, 93.6, 1993.6),
    gb(99.5, 60, 133.2, 2786.2), gb(139, 43, 185, 3895.9), gb(188, 30, 250, 5281.1),
    { id: "rev-hd", brand: "REV", name: "HD Hex, no gearbox (6000 RPM)", ratio: 1, rpm: 6000, stallNm: 0.105, stallA: 8.5, freeA: 0.4, cpr: 28 },
    { id: "rev-up5", brand: "REV", name: "HD Hex + UltraPlanetary 5:1 (5.23:1, 1147 RPM)", ratio: 5.23, rpm: 1147, stallNm: 0.55, stallA: 8.5, freeA: 0.4, cpr: 28 * 5.23 },
    { id: "rev-up20", brand: "REV", name: "HD Hex + UltraPlanetary 20:1 (18.9:1, 317 RPM)", ratio: 18.9, rpm: 317, stallNm: 1.98, stallA: 8.5, freeA: 0.4, cpr: 28 * 18.9 },
    { id: "rev-up60", brand: "REV", name: "HD Hex + UltraPlanetary 60:1 (54.8:1, 109.5 RPM)", ratio: 54.8, rpm: 109.5, stallNm: 5.75, stallA: 8.5, freeA: 0.4, cpr: 28 * 54.8 },
    { id: "rev-spur40", brand: "REV", name: "HD Hex + 40:1 spur gearbox (150 RPM)", ratio: 40, rpm: 150, stallNm: 4.2, stallA: 8.5, freeA: 0.4, cpr: 28 * 40 },
    { id: "rev-core", brand: "REV", name: "Core Hex (72:1, 125 RPM)", ratio: 72, rpm: 125, stallNm: 3.2, stallA: 4.4, freeA: null, cpr: 288 },
  ];
  const motor = (id) => MOTORS.find((m) => m.id === id) || null;

  /** Overall reduction from gear (or belt/sprocket) stages: [{ driver, driven }] in teeth.
      Above 1 = slower and stronger at the output. Bad or empty stages count as 1:1. */
  const gearRatio = (stages = []) => stages.reduce((r, s) => (s && s.driver > 0 && s.driven > 0 ? r * (s.driven / s.driver) : r), 1);

  /* Losses: real drivetrains don't reach free speed or full stall force. These are the usual
     FTC rules of thumb, shown on the page so nobody mistakes them for measurements. */
  const EFF = 0.85, SPEED_LOSS = 0.8;

  /** Drivetrain: motor, extra reduction after the motor, wheel diameter (m), number of drive motors,
      robot mass (kg) and wheel grip (mu: about 1.0 for grippy traction wheels, 0.7 for mecanum). */
  function drivetrain({ m, ext = 1, wheelD, motors = 4, mass = 14, mu = 0.7 }) {
    if (!m || !(wheelD > 0) || !(ext > 0)) return null;
    const wheelRpm = m.rpm / ext, r = wheelD / 2;
    const free = (wheelRpm / 60) * Math.PI * wheelD;           // m/s, no load
    const top = free * SPEED_LOSS;                              // m/s, what robots usually reach
    const motorForce = (motors * m.stallNm * ext * EFF) / r;    // N at the wheels, motors stalled
    const grip = mu * mass * G;                                 // N before the wheels slip
    const push = Math.min(motorForce, grip);
    const cross = (d) => timeTo(d, { top, force: motorForce, grip, mass });
    return { ratio: m.ratio * ext, wheelRpm, free, top, motorForce, grip, push, slips: motorForce > grip, stallA: motors * m.stallA, tile: cross(0.6096), twoTiles: cross(1.2192), field: cross(3.6576) };
  }
  /** Time (s) to cover distance d from a standstill: force falls off linearly with speed, as a DC
      motor's does, and is capped by grip. Small steps; stops at 30 s for robots that can't move. */
  function timeTo(d, { top, force, grip, mass }) {
    if (!(top > 0) || !(force > 0) || !(mass > 0)) return Infinity;
    let v = 0, x = 0, t = 0; const dt = 0.001;
    while (x < d && t < 30) { const f = Math.min(force * Math.max(0, 1 - v / top), grip); v += (f / mass) * dt; x += v * dt; t += dt; }
    return x >= d ? t : Infinity;
  }

  /** Encoder ticks. With a wheel (or spool) diameter: ticks per metre of travel.
      Always: ticks per output revolution and per degree. */
  function encoder({ cpr, ext = 1, wheelD = 0 }) {
    if (!(cpr > 0) || !(ext > 0)) return null;
    const perRev = cpr * ext;
    return { perRev, perDeg: perRev / 360, perM: wheelD > 0 ? perRev / (Math.PI * wheelD) : null };
  }

  /** Mecanum wheel powers. drive = forward, strafe = right, turn = clockwise, each -1..1.
      Scaled so no wheel goes past 1 (the same as the common FTC sample code). Rollers make an X
      when seen from above. */
  function mecanum(drive, strafe, turn) {
    const raw = { fl: drive + strafe + turn, fr: drive - strafe - turn, bl: drive - strafe + turn, br: drive + strafe - turn };
    const k = Math.max(1, ...Object.values(raw).map(Math.abs));
    const out = {}; for (const w in raw) out[w] = raw[w] / k + 0; // + 0 turns -0 into 0
    return out;
  }
  /** The reverse: given the four wheel powers, how the robot moves (same units as mecanum()'s inputs). */
  const mecanumMotion = ({ fl, fr, bl, br }) => ({ drive: (fl + fr + bl + br) / 4, strafe: (fl - fr - bl + br) / 4, turn: (fl - fr + bl - br) / 4 });
  /** Field-centric driving: turns a stick push meant for the field into one for the robot.
      heading = the robot's yaw in degrees, counter-clockwise positive (as the FTC IMU reports it). */
  function fieldCentric(drive, strafe, heading) {
    const a = (-heading * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), z = (v) => (Math.abs(v) < 1e-12 ? 0 : v);
    return { drive: z(strafe * s + drive * c), strafe: z(strafe * c - drive * s) };
  }

  /** How hard a motor works at a given output torque: share of stall, current, and speed under that load. */
  function load(m, motors, ext, need) {
    const have = motors * m.stallNm * ext * EFF, share = need / have;
    const rpm = (m.rpm / ext) * Math.max(0, 1 - share);
    const amps = share >= 1 ? m.stallA : (m.freeA ?? 0) + (m.stallA - (m.freeA ?? 0)) * share;
    const verdict = share >= 1 ? "stall" : share > 0.6 ? "hard" : share > 0.3 ? "ok" : "easy";
    return { need, have, share, rpm, amps, verdict };
  }
  /** Arm held straight out (the worst case): load (kg) at length (m), plus the arm's own mass,
      which acts at about half its length. */
  function arm({ m, ext = 1, motors = 1, length, loadKg = 0, armKg = 0, angle = 0 }) {
    if (!m || !(length > 0) || !(ext > 0)) return null;
    const flat = G * (loadKg * length + armKg * length / 2);       // straight out: the most it ever needs
    const need = flat * Math.abs(Math.cos((angle * Math.PI) / 180)); // at the angle asked about (0 = straight out)
    const res = load(m, motors, ext, need);
    // kG: motor power that just holds the arm straight out. Power ≈ share of stall torque at standstill.
    return { ...res, flat, kG: flat / (motors * m.stallNm * ext * EFF), sec90: res.rpm > 0 ? 0.25 / (res.rpm / 60) : Infinity };
  }
  /** Lift on a spool or pulley: lifts mass (kg) straight up; diameter (m) of the spool. */
  function lift({ m, ext = 1, motors = 1, spoolD, massKg = 0 }) {
    if (!m || !(spoolD > 0) || !(ext > 0)) return null;
    const need = massKg * G * (spoolD / 2);
    const res = load(m, motors, ext, need);
    return { ...res, speed: (res.rpm / 60) * Math.PI * spoolD };
  }

  const RobotMath = { G, KGCM, EFF, SPEED_LOSS, MOTORS, motor, gearRatio, drivetrain, timeTo, encoder, mecanum, mecanumMotion, fieldCentric, arm, lift };
  if (typeof module === "object" && module.exports) module.exports = RobotMath; else root.RobotMath = RobotMath;
})(typeof window !== "undefined" ? window : globalThis);
