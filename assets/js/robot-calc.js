/* ==========================================================================
   Steel Surge — Robot calculators (Match tools page, "Robot calculators" tab)
   Four tools: drivetrain (gear ratio, wheel and robot speed), encoder ticks,
   a mecanum wheel visualizer, and an arm / lift torque check.
   The math lives in robot-math.js. Values are kept in SI units and shown in
   inches and pounds or millimetres and kilograms. Works offline.
   ========================================================================== */
(() => {
  "use strict";
  const host = document.getElementById("robotcalc");
  if (!host || !window.RobotMath) return;
  const RM = window.RobotMath;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const KEY = "ss-robotcalc", IN = 0.0254, LB = 0.45359237;

  const DEFAULTS = {
    tool: "dt", metric: false,
    dt: { motor: "gb-312", stages: [], wheelD: 0.096, motors: 4, mass: 14, wheel: "mecanum" },
    enc: { motor: "gb-312", stages: [], mode: "wheel", wheelD: 0.096, dist: 24 * IN, deg: 90, ticks: 1000 },
    arm: { mode: "arm", motor: "gb-117", stages: [], motors: 1, length: 0.3, loadKg: 0.25, armKg: 0.3, angle: 0, spoolD: 0.038, massKg: 2 },
    mec: { drive: 0, strafe: 0, turn: 0, field: false, heading: 0 },
    custom: { rpm: 312, stallNm: 2.4, stallA: 9.2, cpr: 537.7 },
  };
  const S = (() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY)) || {};
      const out = structuredClone(DEFAULTS);
      for (const k in out) if (saved[k] != null) out[k] = typeof out[k] === "object" ? { ...out[k], ...saved[k] } : saved[k];
      return out;
    } catch { return structuredClone(DEFAULTS); }
  })();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

  /* ---------------- Units and numbers ---------------- */
  const U = {
    len: () => (S.metric ? { k: 1000, u: "mm" } : { k: 1 / IN, u: "in" }),
    mass: () => (S.metric ? { k: 1, u: "kg" } : { k: 1 / LB, u: "lb" }),
    deg: () => ({ k: 1, u: "°" }),
    n: () => ({ k: 1, u: "" }),
  };
  const f = (v, d = 1) => (Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: 0 }) : "—");
  const shown = (v, kind) => { const u = U[kind](); return +(v * u.k).toFixed(2); };
  const len = (m, d = 1) => (S.metric ? `${f(m * 1000, d)} mm` : `${f(m / IN, d)} in`);
  const speed = (ms) => (S.metric ? `${f(ms, 2)} m/s` : `${f(ms / 0.3048, 1)} ft/s`);
  const speedSub = (ms) => (S.metric ? `${f(ms * 100, 0)} cm/s` : `${f(ms / IN, 0)} in/s`);
  const force = (n) => (S.metric ? `${f(n, 0)} N` : `${f(n / (LB * RM.G), 0)} lbf`);
  const torque = (nm) => `${f(nm, 2)} N·m <small>(${f(nm / RM.KGCM, 1)} kg·cm)</small>`;
  const secs = (s) => (Number.isFinite(s) ? `${f(s, 2)} s` : "doesn't get there");
  const ratioText = (r) => (Math.abs(r - 1) < 1e-9 ? "1:1" : r > 1 ? `${f(r, 2)}:1` : `1:${f(1 / r, 2)}`);

  const motorOf = (id) => (id === "custom" ? { id: "custom", brand: "Custom", name: "Custom motor", ratio: 1, freeA: null, ...S.custom } : RM.motor(id) || RM.motor("gb-312"));

  /* ---------------- Building blocks ---------------- */
  const field = (label, key, kind = "n", opt = {}) => `
    <label class="rc-f"><span>${label}</span><span class="rc-in"><input class="input" type="number" inputmode="decimal" step="any" min="${opt.min ?? 0}"${opt.max != null ? ` max="${opt.max}"` : ""} data-k="${key}" data-u="${kind}" value="${shown(get(key), kind)}">${U[kind]().u ? `<em>${U[kind]().u}</em>` : ""}</span>${opt.hint ? `<small>${opt.hint}</small>` : ""}</label>`;
  const get = (key) => key.split(".").reduce((o, k) => (o == null ? o : o[k]), S);
  const set = (key, v) => { const ks = key.split("."), last = ks.pop(); const o = ks.reduce((o, k) => o[k], S); o[last] = v; };
  const seg = (key, opts) => `<div class="rc-seg" role="group">${opts.map(([v, l]) => `<button type="button" class="chip" data-seg="${key}" data-v="${v}" aria-pressed="${get(key) === v}">${l}</button>`).join("")}</div>`;

  function motorPicker(key) {
    const cur = get(key), grp = (b) => RM.MOTORS.filter((m) => m.brand === b).map((m) => `<option value="${m.id}"${m.id === cur ? " selected" : ""}>${esc(m.name)}</option>`).join("");
    return `
      <label class="rc-f rc-wide"><span>Motor</span><select class="input select" data-motor="${key}">
        <optgroup label="goBILDA 5203 Yellow Jacket">${grp("goBILDA")}</optgroup>
        <optgroup label="REV">${grp("REV")}</optgroup>
        <option value="custom"${cur === "custom" ? " selected" : ""}>Custom motor…</option>
      </select></label>
      ${cur === "custom" ? `<div class="rc-custom">${field("Free speed", "custom.rpm", "n", { hint: "RPM at the output" })}${field("Stall torque", "custom.stallNm", "n", { hint: "N·m (kg·cm × 0.098)" })}${field("Stall current", "custom.stallA", "n", { hint: "amps" })}${field("Encoder counts", "custom.cpr", "n", { hint: "per output turn" })}</div>` : ""}`;
  }
  function gearing(key) {
    const st = get(key);
    return `
      <div class="rc-gears rc-wide">
        <div class="rc-gears-head"><span>Gears, belts or sprockets after the motor</span><b data-ratio="${key}">${ratioText(RM.gearRatio(st))}</b></div>
        ${st.length ? st.map((s, i) => `<div class="rc-stage"><span class="rc-stage-n">${i + 1}</span>
          <label><small>Teeth on the motor side</small><input class="input" type="number" inputmode="numeric" min="1" step="1" data-k="${key}.${i}.driver" data-u="n" value="${s.driver}"></label>
          <span aria-hidden="true">→</span>
          <label><small>Teeth on the output side</small><input class="input" type="number" inputmode="numeric" min="1" step="1" data-k="${key}.${i}.driven" data-u="n" value="${s.driven}"></label>
          <button type="button" class="rc-x" data-unstage="${key}" data-i="${i}" aria-label="Remove stage ${i + 1}">×</button></div>`).join("") : `<p class="fine rc-none">None: the wheel or arm is on the motor shaft.</p>`}
        ${st.length < 3 ? `<button type="button" class="btn sm ghost" data-stage="${key}">+ Add a stage</button>` : ""}
      </div>`;
  }
  /** Drivetrain: the same robot with every listed motor, fastest first. Tap a row to use that motor. */
  function compare(cur, ext) {
    const mu = S.dt.wheel === "traction" ? 1.0 : 0.7;
    const rows = RM.MOTORS.filter((x) => x.rpm >= 84 && x.rpm <= 1700).map((x) => ({ x, r: RM.drivetrain({ m: x, ext, wheelD: S.dt.wheelD, motors: S.dt.motors, mass: S.dt.mass, mu }) })).filter((o) => o.r).sort((a, b) => b.r.top - a.r.top);
    const best = rows.filter((o) => Number.isFinite(o.r.field)).sort((a, b) => a.r.field - b.r.field)[0];
    return `<details class="rc-compare"${S.dt.open ? " open" : ""} data-compare><summary>Compare every motor on this robot${best ? ` <small>fastest across the field: ${esc(best.x.name)}</small>` : ""}</summary>
      <div class="rc-table-wrap"><table class="rc-table"><thead><tr><th scope="col">Motor</th><th scope="col">Top speed</th><th scope="col">One tile</th><th scope="col">Across the field</th><th scope="col">Pushing</th></tr></thead><tbody>
      ${rows.map((o) => `<tr class="${o.x.id === cur.id ? "cur" : ""}${o === best ? " best" : ""}"><th scope="row"><button type="button" class="rc-rowbtn" data-use="dt.motor" data-v="${o.x.id}" aria-label="Use ${esc(o.x.name)}">${esc(o.x.name)}</button>${o === best ? ' <span class="rc-tag">quickest</span>' : ""}</th><td>${speed(o.r.top)}</td><td>${secs(o.r.tile)}</td><td>${secs(o.r.field)}</td><td>${force(o.r.push)}${o.r.slips ? "" : ' <span class="rc-tag warn">stalls</span>'}</td></tr>`).join("")}
      </tbody></table></div>
      <p class="fine">Same wheels, gearing, weight and motor count. The quickest across the field isn't always the fastest motor: very high speeds take longer to reach. "Stalls" means a robot pushing back would stall those motors before your wheels slip.</p></details>`;
  }
  const stat = (label, value, sub = "") => `<div class="rc-stat"><span>${label}</span><b>${value}</b>${sub ? `<small>${sub}</small>` : ""}</div>`;

  /* ---------------- The four tools ---------------- */
  const TOOLS = {
    dt: {
      name: "Drivetrain", form: () => `
        ${motorPicker("dt.motor")}${gearing("dt.stages")}
        ${field("Wheel diameter", "dt.wheelD", "len", { hint: S.metric ? "Common: 75, 96, 104 mm" : "Common: 2.95, 3.78, 4.09 in" })}
        ${field("Drive motors", "dt.motors", "n", { min: 1, max: 8 })}
        ${field("Robot weight", "dt.mass", "mass", { hint: "With battery" })}
        <div class="rc-f"><span>Wheels</span>${seg("dt.wheel", [["mecanum", "Mecanum"], ["traction", "Traction"]])}</div>`,
      out() {
        const m = motorOf(S.dt.motor), ext = RM.gearRatio(S.dt.stages);
        const r = RM.drivetrain({ m, ext, wheelD: S.dt.wheelD, motors: S.dt.motors, mass: S.dt.mass, mu: S.dt.wheel === "traction" ? 1.0 : 0.7 });
        if (!r) return `<p class="muted">Enter a wheel diameter and a gear ratio above zero.</p>`;
        const fast = r.top > 2.2, slow = r.top < 0.9;
        return `
          <div class="rc-stats">
            ${stat("Top speed", speed(r.top), `${speedSub(r.top)} · ${speed(r.free)} with no load`)}
            ${stat("Wheel speed", `${f(r.wheelRpm, 0)} RPM`, `overall ratio ${ratioText(r.ratio)}`)}
            ${stat(`One tile (${S.metric ? "610 mm" : "24 in"})`, secs(r.tile), "from a standstill")}
            ${stat(`Across the field (${S.metric ? "3.66 m" : "12 ft"})`, secs(r.field), `two tiles: ${secs(r.twoTiles)}`)}
            ${stat("Pushing force", force(r.push), r.slips ? "wheels slip first" : "motors stall first")}
            ${stat("Current at stall", `${f(r.stallA, 0)} A`, `${S.dt.motors} motors together`)}
          </div>
          ${compare(m, ext)}
          <p class="rc-note">${fast ? "<b>Very fast.</b> Expect a hard robot to drive precisely; most FTC drivetrains top out around 1.5–2 m/s. " : slow ? "<b>On the slow side.</b> Good for pushing, but cycles across the field will take longer. " : "<b>A typical FTC speed.</b> "}${r.slips ? "The motors can push harder than the wheels can grip, so in a shoving match the wheels slip before the motors stall. That's what you want." : "The wheels grip harder than the motors can push: a pushy robot will stall your motors and they'll heat up. More reduction would help."}</p>`;
      },
      fine: `Top speed is 80% of the no-load speed and pushing force uses 85% of stall torque, the usual allowances for gearbox, wheel and battery losses. Times assume full power from a stop and grip of about ${"0.7 for mecanum and 1.0 for traction wheels"}. Real numbers depend on your robot, so measure when you can.`,
    },
    enc: {
      name: "Encoder ticks", form: () => `
        ${motorPicker("enc.motor")}${gearing("enc.stages")}
        <div class="rc-f rc-wide"><span>What does it turn?</span>${seg("enc.mode", [["wheel", "A wheel or spool"], ["arm", "An arm or turret"]])}</div>
        ${S.enc.mode === "wheel" ? field("Wheel or spool diameter", "enc.wheelD", "len") + field("Distance to move", "enc.dist", "len") : field("Angle to turn", "enc.deg", "deg")}
        ${field("Ticks read (to convert back)", "enc.ticks", "n", { hint: "From telemetry: getCurrentPosition()" })}`,
      out() {
        const m = motorOf(S.enc.motor), ext = RM.gearRatio(S.enc.stages);
        const r = RM.encoder({ cpr: m.cpr, ext, wheelD: S.enc.wheelD });
        if (!r) return `<p class="muted">Enter encoder counts and a gear ratio above zero.</p>`;
        const perU = S.metric ? r.perM / 1000 : r.perM * IN, u = S.metric ? "mm" : "inch";
        const name = S.metric ? "TICKS_PER_MM" : "TICKS_PER_INCH";
        if (S.enc.mode === "wheel" && r.perM) {
          const ticks = Math.round(r.perM * S.enc.dist);
          return `<div class="rc-stats">
              ${stat(`Ticks per ${u}`, f(perU, 3))}
              ${stat(`Ticks for ${len(S.enc.dist)}`, f(ticks, 0), "the target position")}
              ${stat(`${f(S.enc.ticks, 0)} ticks is`, len(S.enc.ticks / r.perM, 2), `${f(S.enc.ticks / r.perRev, 2)} turns of the wheel`)}
              ${stat("Ticks per output turn", f(r.perRev, 1), `motor encoder ${f(m.cpr, 1)} × gearing ${ratioText(ext)}`)}
            </div>
            ${code(`// ${esc(m.name)}${ext !== 1 ? `, ${ratioText(ext)} after the motor` : ""}, ${len(S.enc.wheelD, 2)} wheel
static final double ${name} = ${+perU.toFixed(4)};

int target = motor.getCurrentPosition() + (int) Math.round(${S.metric ? "mm" : "inches"} * ${name});
motor.setTargetPosition(target);
motor.setMode(DcMotor.RunMode.RUN_TO_POSITION);
motor.setPower(0.5);`)}`;
        }
        const ticks = Math.round(r.perDeg * S.enc.deg);
        return `<div class="rc-stats">
            ${stat("Ticks per degree", f(r.perDeg, 3))}
            ${stat(`Ticks for ${f(S.enc.deg, 1)}°`, f(ticks, 0), "the target position")}
            ${stat(`${f(S.enc.ticks, 0)} ticks is`, `${f(S.enc.ticks / r.perDeg, 1)}°`, `${f(S.enc.ticks / r.perRev, 2)} turns of the output`)}
            ${stat("Ticks per output turn", f(r.perRev, 1), `motor encoder ${f(m.cpr, 1)} × gearing ${ratioText(ext)}`)}
          </div>
          ${code(`// ${esc(m.name)}${ext !== 1 ? `, ${ratioText(ext)} after the motor` : ""}
static final double TICKS_PER_DEGREE = ${+r.perDeg.toFixed(4)};

int target = (int) Math.round(degrees * TICKS_PER_DEGREE); // measured from where the arm started
arm.setTargetPosition(target);
arm.setMode(DcMotor.RunMode.RUN_TO_POSITION);
arm.setPower(0.6);`)}`;
      },
      fine: "Encoder counts per output turn are from goBILDA's and REV's product pages (for REV gearboxes: 28 per motor turn × the actual gear ratio). Wheels slip a little, so check long drives against a tape measure.",
    },
    mec: {
      name: "Mecanum", form: () => `
        <div class="rc-mec rc-wide">
          <div class="rc-mec-controls">
            <div class="rc-pad" data-pad tabindex="0" role="group" aria-label="Left stick. Arrow keys move it, 0 centres it."><i class="rc-pad-dot"></i><span class="rc-pad-lab">Left stick</span></div>
            <div class="rc-sliders">
              ${slider("Drive (forward)", "drive")}${slider("Strafe (right)", "strafe")}${slider("Turn (clockwise)", "turn")}
              <div class="rc-fc"><div class="rc-seg" role="group" aria-label="Driving mode">${[[false, "Robot-centric"], [true, "Field-centric"]].map(([v, l]) => `<button type="button" class="chip" data-fc="${v}" aria-pressed="${S.mec.field === v}">${l}</button>`).join("")}</div>
                ${S.mec.field ? `<label class="rc-slide"><span>Robot heading (IMU yaw)<output data-out="heading">${f(S.mec.heading, 0)}°</output></span><input type="range" min="-180" max="180" step="5" value="${S.mec.heading}" data-mec="heading"></label>` : ""}</div>
              <div class="rc-presets">${[["Forward", 1, 0, 0], ["Strafe right", 0, 1, 0], ["Diagonal", 1, 1, 0], ["Spin", 0, 0, 1], ["Arc", 0.7, 0, 0.4], ["Stop", 0, 0, 0]].map(([l, d, s, t]) => `<button type="button" class="chip" data-preset="${d},${s},${t}">${l}</button>`).join("")}</div>
            </div>
          </div>
          <div class="rc-mec-view"><svg viewBox="-30 -10 320 320" class="rc-bot" role="img" aria-label="Robot seen from above with the power of each wheel" data-bot></svg><p class="rc-motion" data-motion aria-live="polite"></p></div>
        </div>`,
      out() {
        const { drive, strafe, turn, field: fc, heading } = S.mec, rf = fc ? RM.fieldCentric(drive, strafe, heading) : { drive, strafe };
        const w = RM.mecanum(rf.drive, rf.strafe, turn);
        drawBot(w, RM.mecanumMotion(w), fc ? heading : 0, fc ? { drive, strafe } : null);
        if (fc) return code(`// Field-centric: pushing the stick forward always drives away from the driver,
// whichever way the robot faces. Needs the IMU (set its orientation in init).
double drive  = -gamepad1.left_stick_y;
double strafe =  gamepad1.left_stick_x;
double turn   =  gamepad1.right_stick_x;
if (gamepad1.options) imu.resetYaw();   // face the robot away from you, then press to re-zero

double heading = imu.getRobotYawPitchRollAngles().getYaw(AngleUnit.RADIANS);
double rotStrafe = strafe * Math.cos(-heading) - drive * Math.sin(-heading);
double rotDrive  = strafe * Math.sin(-heading) + drive * Math.cos(-heading);

double fl = rotDrive + rotStrafe + turn, fr = rotDrive - rotStrafe - turn;
double bl = rotDrive - rotStrafe + turn, br = rotDrive + rotStrafe - turn;
double max = Math.max(1, Math.max(Math.max(Math.abs(fl), Math.abs(fr)), Math.max(Math.abs(bl), Math.abs(br))));

frontLeft.setPower(fl / max);   frontRight.setPower(fr / max);
backLeft.setPower(bl / max);    backRight.setPower(br / max);`);
        return code(`double drive  = -gamepad1.left_stick_y;  // forward is negative on the stick
double strafe =  gamepad1.left_stick_x;
double turn   =  gamepad1.right_stick_x;

double fl = drive + strafe + turn, fr = drive - strafe - turn;
double bl = drive - strafe + turn, br = drive + strafe - turn;
double max = Math.max(1, Math.max(Math.max(Math.abs(fl), Math.abs(fr)), Math.max(Math.abs(bl), Math.abs(br))));

frontLeft.setPower(fl / max);   frontRight.setPower(fr / max);
backLeft.setPower(bl / max);    backRight.setPower(br / max);
// Reverse the motors on one side (usually the left) so "forward" spins every wheel forward.`);
      },
      fine: "Seen from above, the rollers should make an X. If the robot turns when it should strafe, two wheels are swapped; if it goes backwards, reverse the motors on one side. Strafing is usually a bit slower than driving forward because the rollers slip.",
    },
    arm: {
      name: "Arm & lift", form: () => `
        <div class="rc-f rc-wide"><span>Mechanism</span>${seg("arm.mode", [["arm", "Arm (swings)"], ["lift", "Lift (spool or pulley)"]])}</div>
        ${motorPicker("arm.motor")}${gearing("arm.stages")}
        ${field("Motors on it", "arm.motors", "n", { min: 1, max: 4 })}
        ${S.arm.mode === "arm"
          ? field("Arm length", "arm.length", "len", { hint: "Pivot to the load" }) + field("Load at the end", "arm.loadKg", "mass", { hint: "Claw plus game pieces" }) + field("Arm's own weight", "arm.armKg", "mass") + field("Arm angle", "arm.angle", "deg", { min: -90, max: 90, hint: "0 = straight out (worst case), 90 = straight up" })
          : field("Spool diameter", "arm.spoolD", "len") + field("Weight lifted", "arm.massKg", "mass", { hint: "Slides, claw and pieces" })}`,
      out() {
        const m = motorOf(S.arm.motor), ext = RM.gearRatio(S.arm.stages), A = S.arm, isArm = A.mode === "arm";
        const calc = (mm) => (isArm ? RM.arm({ m: mm, ext, motors: A.motors, length: A.length, loadKg: A.loadKg, armKg: A.armKg, angle: A.angle }) : RM.lift({ m: mm, ext, motors: A.motors, spoolD: A.spoolD, massKg: A.massKg }));
        const r = calc(m);
        if (!r) return `<p class="muted">Enter a length or spool diameter above zero.</p>`;
        const pct = Math.round(r.share * 100), V = {
          easy: ["ok", "Easy", "The motor holds this without straining."],
          ok: ["ok", "Fine", "Comfortable for moving it; holding it in place for a long time will warm the motor."],
          hard: ["amber", "Working hard", "It will move, slowly, and the motor will heat up if it holds the load. Consider more reduction."],
          stall: ["danger", "Too heavy", "The motor can't lift this. It needs more gearing, a second motor, or a lighter load."],
        }[r.verdict];
        // Same brand, lightest load share under 50%, fastest first
        const better = r.share > 0.5 && m.id !== "custom" ? RM.MOTORS.filter((x) => x.brand === m.brand && x.id !== m.id).map((x) => ({ x, r: calc(x) })).filter((o) => o.r.share <= 0.5).sort((a, b) => b.r.rpm - a.r.rpm)[0] : null;
        return `
          <div class="rc-gauge rc-${V[0]}"><div class="rc-gauge-bar"><i style="width:${Math.min(100, pct)}%"></i><span style="left:30%"></span><span style="left:60%"></span></div>
            <p><b>${V[1]}: ${pct}% of stall torque.</b> ${V[2]}</p></div>
          <div class="rc-stats">
            ${stat("Torque needed", torque(r.need), isArm ? (A.angle ? `at ${f(A.angle, 0)}° · straight out: ${f(r.flat, 2)} N·m` : "arm held straight out") : "lifting straight up")}
            ${stat("Torque available", torque(r.have), `${A.motors} motor${A.motors > 1 ? "s" : ""} at stall, after losses`)}
            ${isArm ? stat("Time to swing 90°", Number.isFinite(r.sec90) ? `about ${secs(r.sec90)}` : "can't lift it", `full power, ${f(r.rpm, 0)} RPM with this load`) : stat("Lift speed", speed(r.speed), `${speedSub(r.speed)} with this load`)}
            ${stat("Current", `${f(r.amps, 1)} A`, A.motors > 1 ? "per motor" : "while holding")}
            ${isArm ? stat("Hold power (kG)", r.kG < 1 ? f(r.kG, 2) : "over 1", "power that holds it straight out") : stat("Hold power", r.share < 1 ? f(r.share, 2) : "over 1", "power that holds the lift still")}
          </div>
          ${isArm && r.kG < 1 ? code(`// Gravity feedforward: the power that cancels the arm's weight at each angle.
// Add it to whatever your controller (PID, RUN_TO_POSITION) asks for.
static final double kG = ${+r.kG.toFixed(3)};   // from the calculator; tune on the robot

double angle = arm.getCurrentPosition() / TICKS_PER_DEGREE + START_ANGLE; // 0 = straight out
double hold  = kG * Math.cos(Math.toRadians(angle));
arm.setPower(hold + pidOutput);`) : ""}
          ${better ? `<p class="rc-note">A <b>${esc(better.x.name)}</b> would carry this at ${Math.round(better.r.share * 100)}% of stall${isArm ? `, swinging 90° in ${secs(better.r.sec90)}` : `, lifting at ${speed(better.r.speed)}`}.</p>` : ""}`;
      },
      fine: "Torque uses 85% of the motor's stall torque for gearbox losses. An arm needs the most torque when it's straight out to the side; elastic bands or springs that help it up reduce the load. Lifts ignore friction in the slides, so leave some margin.",
    },
  };
  function slider(label, k) {
    return `<label class="rc-slide"><span>${label}<output data-out="${k}">${f(S.mec[k], 2)}</output></span><input type="range" min="-1" max="1" step="0.05" value="${S.mec[k]}" data-mec="${k}"></label>`;
  }
  function code(src) {
    return `<div class="rc-code"><button type="button" class="btn sm ghost" data-copy>Copy</button><pre><code>${src}</code></pre></div>`;
  }

  /* ---------------- Mecanum drawing ---------------- */
  function drawBot(w, mo, heading = 0, fieldStick = null) {
    const svg = $("[data-bot]", host); if (!svg) return;
    const pos = { fl: [44, 48], fr: [176, 48], bl: [44, 192], br: [176, 192] }, slash = { fl: 1, fr: -1, bl: -1, br: 1 };
    const wheel = (k) => {
      const [x, y] = pos[k], p = w[k], h = 60, fill = Math.abs(p) * (h - 8), dir = p > 0.02 ? 1 : p < -0.02 ? -1 : 0;
      const rollers = Array.from({ length: 6 }, (_, i) => { const yy = y + 6 + i * 9; return `<line x1="${x + 4}" y1="${yy + (slash[k] > 0 ? 0 : 8)}" x2="${x + 36}" y2="${yy + (slash[k] > 0 ? 8 : 0)}"/>`; }).join("");
      return `<g class="rc-wheel ${dir > 0 ? "fwd" : dir < 0 ? "rev" : ""}">
        <rect x="${x}" y="${y}" width="40" height="${h}" rx="8" class="rc-tire"/>
        <g class="rc-rollers">${rollers}</g>
        <rect x="${x - 12}" y="${y + 4 + (dir < 0 ? (h - 8) / 2 : (h - 8) / 2 - fill / 2)}" width="6" height="${fill / 2}" rx="3" class="rc-pow"/>
        ${dir ? `<path d="M${x + 20} ${y + h / 2 - dir * 22} l-7 ${dir * 9} h14 z" class="rc-arrow"/>` : ""}
        <text x="${x + 20}" y="${y + h + 16}" text-anchor="middle" class="rc-wlab">${f(p * 100, 0)}%</text></g>`;
    };
    const mag = Math.hypot(mo.drive, mo.strafe), ang = Math.atan2(mo.strafe, mo.drive), cx = 130, cy = 150;
    const ax = cx + Math.sin(ang) * 54 * Math.min(1, mag * 1.4), ay = cy - Math.cos(ang) * 54 * Math.min(1, mag * 1.4);
    const turnArc = Math.abs(mo.turn) > 0.02 ? `<path d="M ${cx - 30} ${cy - 46} A 56 56 0 0 1 ${cx + 30} ${cy - 46}" class="rc-turn" transform="${mo.turn < 0 ? `scale(-1 1) translate(${-2 * cx} 0)` : ""}" marker-end="url(#rc-head)"/>` : "";
    svg.innerHTML = `<defs><marker id="rc-head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="rc-headfill"/></marker></defs>
      ${heading ? `<g class="rc-fieldarrow"><path d="M-14 300 V256" marker-end="url(#rc-head)"/><text x="-6" y="296">field forward</text></g>` : ""}
      <g transform="rotate(${-heading} 130 150)">
      <rect x="64" y="28" width="132" height="244" rx="18" class="rc-chassis"/>
      <path d="M130 40 l-9 12 h18 z" class="rc-front"/><text x="130" y="22" text-anchor="middle" class="rc-flab">FRONT</text>
      ${Object.keys(pos).map(wheel).join("")}
      ${mag > 0.02 ? `<line x1="${cx}" y1="${cy}" x2="${ax}" y2="${ay}" class="rc-move" marker-end="url(#rc-head)"/>` : ""}${turnArc}
      <circle cx="${cx}" cy="${cy}" r="5" class="rc-center"/></g>`;
    const parts = [];
    if (Math.abs(mo.drive) > 0.02) parts.push(`${mo.drive > 0 ? "forward" : "backward"} ${f(Math.abs(mo.drive) * 100, 0)}%`);
    if (Math.abs(mo.strafe) > 0.02) parts.push(`${mo.strafe > 0 ? "right" : "left"} ${f(Math.abs(mo.strafe) * 100, 0)}%`);
    if (Math.abs(mo.turn) > 0.02) parts.push(`turning ${mo.turn > 0 ? "clockwise" : "counter-clockwise"} ${f(Math.abs(mo.turn) * 100, 0)}%`);
    let text = parts.length ? `Relative to itself, the robot moves ${parts.join(", ")}.` : "Stopped. Drag the stick or pick a move.";
    if (fieldStick && Math.hypot(fieldStick.drive, fieldStick.strafe) > 0.02) {
      const dirs = ["away from you", "away and to the right", "to the right", "toward you and to the right", "toward you", "toward you and to the left", "to the left", "away and to the left"];
      text += ` On the field it goes ${dirs[Math.round(((Math.atan2(fieldStick.strafe, fieldStick.drive) * 180) / Math.PI + 360) / 45) % 8]}, the way the stick points.`;
    }
    $("[data-motion]", host).textContent = text;
    const dot = $(".rc-pad-dot", host); if (dot) { dot.style.left = `${50 + S.mec.strafe * 42}%`; dot.style.top = `${50 - S.mec.drive * 42}%`; }
  }

  /* ---------------- Page ---------------- */
  host.innerHTML = `
    <div class="rc-top">
      <div class="rc-tools" role="group" aria-label="Calculator">${Object.entries(TOOLS).map(([k, t]) => `<button type="button" class="chip" data-tool="${k}" aria-pressed="${S.tool === k}">${t.name}</button>`).join("")}</div>
      <div class="rc-top-right"><button type="button" class="btn sm ghost" data-reset>Reset</button>
      <label class="rc-units"><span>Units</span><select class="input select" data-units><option value="in"${S.metric ? "" : " selected"}>Inches, pounds</option><option value="mm"${S.metric ? " selected" : ""}>Millimetres, kilograms</option></select></label></div>
    </div>
    <div class="rc-card"><div class="rc-form" data-form></div><div class="rc-out" data-results aria-live="polite"></div><p class="fine" data-fine></p></div>`;

  function render() {
    const t = TOOLS[S.tool] || TOOLS.dt;
    $("[data-form]", host).innerHTML = t.form();
    $("[data-fine]", host).textContent = t.fine;
    $$("[data-tool]", host).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tool === S.tool)));
    update();
  }
  function update() {
    const t = TOOLS[S.tool] || TOOLS.dt;
    $("[data-results]", host).innerHTML = t.out();
    $$("[data-ratio]", host).forEach((b) => (b.textContent = ratioText(RM.gearRatio(get(b.dataset.ratio)))));
    save();
  }

  host.addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset.k) {
      const v = parseFloat(el.value), kind = el.dataset.u;
      el.setAttribute("aria-invalid", String(!Number.isFinite(v) || v < Number(el.min || 0)));
      if (!Number.isFinite(v) || v < Number(el.min || 0)) return;
      set(el.dataset.k, kind === "n" || kind === "deg" ? v : v / U[kind]().k);
      update();
    } else if (el.dataset.mec) {
      S.mec[el.dataset.mec] = Number(el.value);
      $(`[data-out="${el.dataset.mec}"]`, host).textContent = el.dataset.mec === "heading" ? `${f(S.mec.heading, 0)}°` : f(S.mec[el.dataset.mec], 2);
      update();
    }
  });
  host.addEventListener("toggle", (e) => { if (e.target.matches?.("[data-compare]")) { S.dt.open = e.target.open; save(); } }, true);
  // Keyboard for the stick: arrows move it in steps of 0.1, 0 or Escape centres it
  host.addEventListener("keydown", (e) => {
    if (!e.target.matches?.("[data-pad]")) return;
    const step = { ArrowUp: ["drive", 0.1], ArrowDown: ["drive", -0.1], ArrowRight: ["strafe", 0.1], ArrowLeft: ["strafe", -0.1] }[e.key];
    if (step) S.mec[step[0]] = Math.round(Math.max(-1, Math.min(1, S.mec[step[0]] + step[1])) * 20) / 20;
    else if (e.key === "0" || e.key === "Escape") { S.mec.drive = 0; S.mec.strafe = 0; }
    else return;
    e.preventDefault(); render(); $("[data-pad]", host)?.focus();
  });
  host.addEventListener("change", (e) => {
    const el = e.target;
    if (el.dataset.motor) { set(el.dataset.motor, el.value); render(); }
    else if (el.dataset.units != null) { S.metric = el.value === "mm"; render(); }
  });
  host.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.tool) { S.tool = b.dataset.tool; render(); }
    else if (b.dataset.seg) { set(b.dataset.seg, b.dataset.v); render(); }
    else if (b.dataset.stage) { get(b.dataset.stage).push({ driver: 20, driven: 40 }); render(); }
    else if (b.dataset.unstage) { get(b.dataset.unstage).splice(Number(b.dataset.i), 1); render(); }
    else if (b.hasAttribute("data-reset")) { S[S.tool] = structuredClone(DEFAULTS[S.tool]); render(); }
    else if (b.dataset.use) { set(b.dataset.use, b.dataset.v); render(); $("[data-motor]", host)?.scrollIntoView({ block: "nearest" }); }
    else if (b.dataset.fc) { S.mec.field = b.dataset.fc === "true"; render(); }
    else if (b.dataset.preset) { const [d, s, t] = b.dataset.preset.split(",").map(Number); Object.assign(S.mec, { drive: d, strafe: s, turn: t }); render(); }
    else if (b.hasAttribute("data-copy")) {
      const txt = b.nextElementSibling.textContent;
      (navigator.clipboard?.writeText(txt) || Promise.reject()).then(() => { b.textContent = "Copied"; setTimeout(() => (b.textContent = "Copy"), 1500); }, () => { b.textContent = "Select and copy"; });
    }
  });
  // Joystick pad: drag to set drive and strafe
  host.addEventListener("pointerdown", (e) => {
    const pad = e.target.closest("[data-pad]"); if (!pad) return;
    e.preventDefault(); pad.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const r = pad.getBoundingClientRect(), round = (v) => Math.round(Math.max(-1, Math.min(1, v)) * 20) / 20;
      let x = ((ev.clientX - r.left) / r.width - 0.5) / 0.42, y = -((ev.clientY - r.top) / r.height - 0.5) / 0.42;
      const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
      S.mec.strafe = round(x) + 0; S.mec.drive = round(y) + 0;
      for (const k of ["drive", "strafe"]) { const s = $(`[data-mec="${k}"]`, host); if (s) s.value = S.mec[k]; $(`[data-out="${k}"]`, host).textContent = f(S.mec[k], 2); }
      update();
    };
    move(e);
    const up = () => { pad.removeEventListener("pointermove", move); pad.removeEventListener("pointerup", up); pad.removeEventListener("pointercancel", up); };
    pad.addEventListener("pointermove", move); pad.addEventListener("pointerup", up); pad.addEventListener("pointercancel", up);
  });

  render();
})();
