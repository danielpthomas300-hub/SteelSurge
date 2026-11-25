/* ==========================================================================
   Steel Surge Code Lab — robot simulator
   A top-down FTC field with a two-wheel (tank) drive robot that runs MiniJava
   OpModes. It models what matters for learning autonomous code:
     - motors with direction, power, encoders (goBILDA 312 rpm, 96 mm wheels),
       RUN_WITHOUT_ENCODER / RUN_USING_ENCODER / RUN_TO_POSITION / STOP_AND_RESET
     - a battery that changes from run to run (so timed driving isn't exact)
     - an IMU (yaw), a claw servo that can pick up a sample, telemetry,
       sleep(), opModeIsActive(), ElapsedTime, and the 30-second autonomous timer
   Positions are in inches. The field is 144 × 144 with (0, 0) at the bottom-left.
   Heading 0° faces up the field; positive yaw turns left (counter-clockwise),
   like the real IMU.
   ========================================================================== */
(function (root) {
  "use strict";
  const MJ = root.MiniJava || (typeof require === "function" ? require("./minijava.js") : null);
  const { V, VOID, hostObj, CodeError, TICK } = MJ;

  const FIELD = 144, ROBOT = 18, HALF = ROBOT / 2, CLAW_REACH = 12;
  const TPR = 537.7, WHEEL_D = 3.78, TPI = TPR / (Math.PI * WHEEL_D);   // ≈ 45.3 ticks per inch
  const MAX_TPS = (312 / 60) * TPR;                                      // ≈ 2796 ticks per second at full power
  const TRACK = 15;                                                      // inches between left and right wheels
  const TAU = { BRAKE: 0.08, FLOAT: 0.3 };                               // how quickly wheels speed up / slow down
  const AUTO_SECONDS = 30, TELEOP_SECONDS = 120, START_DELAY_MS = 400, SETTLE_S = 0.8;
  const MEC_K = 14;          // half track + half wheelbase (inches), for mecanum turning
  const STRAFE_EFF = 0.85;   // mecanum wheels strafe a little slower than they drive
  /** Gamepad state the page fills in (keyboard, on-screen pad, or a real controller). */
  const blankPad = () => ({ lx: 0, ly: 0, rx: 0, ry: 0, lt: 0, rt: 0, a: false, b: false, x: false, y: false, lb: false, rb: false, up: false, down: false, left: false, right: false, start: false, back: false, ls: false, rs: false });
  const newInput = () => ({ g1: blankPad(), g2: blankPad() });
  const COST = { cost: 1 }, COST2 = { cost: 2 };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wrapDeg = (d) => { d = ((d + 180) % 360 + 360) % 360 - 180; return d === -180 ? 180 : d; };

  /* ---------- enums shared by every run ---------- */
  const ENUMS = {};
  function enumGroup(owner, group, names) {
    const f = {};
    for (const n of names) f[n] = V(hostObj(`${owner}.${group}`, {}, { __enum: n, __group: group, __str: () => n }), "obj");
    ENUMS[`${owner}.${group}`] = f;
    return V(hostObj(`${owner}.${group}`, { f }), "obj");
  }
  const DIRECTION = enumGroup("DcMotor", "Direction", ["FORWARD", "REVERSE"]);
  const RUNMODE = enumGroup("DcMotor", "RunMode", ["RUN_WITHOUT_ENCODER", "RUN_USING_ENCODER", "RUN_TO_POSITION", "STOP_AND_RESET_ENCODER"]);
  const ZPB = enumGroup("DcMotor", "ZeroPowerBehavior", ["BRAKE", "FLOAT"]);
  const ANGLE = enumGroup("AngleUnit", "Unit", ["DEGREES", "RADIANS"]);
  const LOGO = enumGroup("RevHubOrientationOnRobot", "LogoFacingDirection", ["UP", "DOWN", "LEFT", "RIGHT", "FORWARD", "BACKWARD"]);
  const USB = enumGroup("RevHubOrientationOnRobot", "UsbFacingDirection", ["UP", "DOWN", "LEFT", "RIGHT", "FORWARD", "BACKWARD"]);
  const classToken = (n) => V(hostObj("Class", {}, { __classOf: n, __str: () => `${n}.class` }), "obj");
  const enumName = (x, group, line, what) => {
    if (x?.t === "obj" && x.v.__group === group) return x.v.__enum;
    throw new CodeError(`${what} needs a ${group} value, like ${group === "Direction" ? "DcMotor.Direction.REVERSE" : group === "RunMode" ? "DcMotor.RunMode.RUN_TO_POSITION" : group === "ZeroPowerBehavior" ? "DcMotor.ZeroPowerBehavior.BRAKE" : "AngleUnit.DEGREES"}.`, line);
  };
  const numArg = (x, line, what) => {
    if (!x || !["int", "long", "double", "char"].includes(x.t)) throw new CodeError(`${what} needs a number${x ? `, but got a ${x.t === "String" ? "String (text)" : x.t}` : ""}.`, line);
    return x.v;
  };
  const argc = (a, n, line, what) => { if (a.length !== n) throw new CodeError(`${what} needs ${n === 0 ? "no values" : n + " value" + (n === 1 ? "" : "s")} in the ( ), but got ${a.length}.`, line); };
  /** Hardware calls take a little time on a real robot (about 1 ms each). */
  const hw = (fn, cost = COST) => (args, line, name, interp) => (function* () { yield cost; return fn(args, line, name, interp) ?? VOID; })();

  /* ---------- world ---------- */
  function createWorld(ch, opts = {}) {
    const battery = opts.battery ?? (ch.battery === "random" ? 0.7 + Math.random() * 0.3 : 1);
    const drift = ch.drift || 0;
    const s = ch.start || { x: 72, y: 16, h: 0 };
    const w = {
      ch, battery, t: 0, startT: null, started: false, stopRequested: false, programDone: false,
      robot: { x: s.x, y: s.y, h: (s.h * Math.PI) / 180, v: 0, vs: 0, w: 0 },
      input: opts.input || newInput(), teleop: ch.mode === "teleop", iterative: false, barrierHit: false,
      drive: ch.devices && "frontLeft" in ch.devices ? "mecanum" : "tank",
      motors: {}, servos: {}, yawOffset: 0, devices: {}, telemetry: [], pending: [], log: [],
      trail: [{ x: s.x, y: s.y }], wallHits: 0, movedBeforeStart: false, cp: 0,
      sample: ch.sample ? { x: ch.sample.x, y: ch.sample.y, held: false } : null,
    };
    const say = (kind, text) => w.log.push({ kind, text, t: w.t });

    /* motors */
    const makeMotor = (name) => {
      const m = { name, dir: 1, power: 0, mode: "RUN_WITHOUT_ENCODER", target: null, raw: 0, vel: 0, rawOffset: 0, zpb: "BRAKE" };
      w.motors[name] = m;
      const pos = () => Math.round(m.dir * (m.raw - m.rawOffset));
      const obj = hostObj("DcMotor", { m: {
        setPower: hw((a, line) => { argc(a, 1, line, "setPower"); const p = numArg(a[0], line, "setPower"); m.power = clamp(p, -1, 1); if (!w.started && p !== 0) w.powerBeforeStart = line; }),
        getPower: hw(() => V(m.mode === "STOP_AND_RESET_ENCODER" ? 0 : m.power, "double")),
        setDirection: hw((a, line) => { argc(a, 1, line, "setDirection"); m.dir = enumName(a[0], "Direction", line, "setDirection") === "REVERSE" ? -1 : 1; }),
        getDirection: hw(() => DIRECTION.v.__f[m.dir === 1 ? "FORWARD" : "REVERSE"]),
        getCurrentPosition: hw(() => V(pos(), "int")),
        setMode: hw((a, line) => {
          argc(a, 1, line, "setMode");
          const mode = enumName(a[0], "RunMode", line, "setMode");
          if (mode === "RUN_TO_POSITION" && m.target == null) throw new CodeError(`TargetPositionNotSetException: ${name} needs setTargetPosition(...) before you switch it to RUN_TO_POSITION.`, line);
          if (mode === "STOP_AND_RESET_ENCODER") { m.rawOffset = m.raw; m.vel *= 0.2; }
          m.mode = mode;
        }),
        getMode: hw(() => RUNMODE.v.__f[m.mode]),
        setTargetPosition: hw((a, line) => {
          argc(a, 1, line, "setTargetPosition");
          if (a[0].t === "double") throw new CodeError("setTargetPosition needs a whole number (int) of encoder ticks, but this is a double. Use (int) Math.round(...) to convert it.", line);
          m.target = numArg(a[0], line, "setTargetPosition");
        }),
        getTargetPosition: hw(() => V(m.target ?? 0, "int")),
        isBusy: hw(() => V(m.mode === "RUN_TO_POSITION" && m.power !== 0 && Math.abs((m.target ?? 0) - pos()) > 10, "boolean")),
        setZeroPowerBehavior: hw((a, line) => { m.zpb = enumName(a[0], "ZeroPowerBehavior", line, "setZeroPowerBehavior"); }),
        getZeroPowerBehavior: hw(() => ZPB.v.__f[m.zpb]),
        getVelocity: hw(() => V(Math.round(m.dir * m.vel), "double")),
        setVelocity: hw((a, line) => { m.power = clamp(numArg(a[0], line, "setVelocity") / (MAX_TPS * 0.86), -1, 1); if (m.mode === "RUN_WITHOUT_ENCODER") m.mode = "RUN_USING_ENCODER"; }),
      } }, { __alias: ["DcMotorEx", "DcMotorSimple"], __str: () => `DcMotor "${name}"` });
      return { cls: "DcMotor", obj: V(obj, "obj") };
    };
    const makeServo = (name) => {
      const sv = { name, target: null, pos: 1, dir: 1 };
      w.servos[name] = sv;
      const obj = hostObj("Servo", { m: {
        setPosition: hw((a, line) => {
          argc(a, 1, line, "setPosition");
          const p = numArg(a[0], line, "setPosition");
          if (p < 0 || p > 1) throw new CodeError(`IllegalArgumentException: servo position ${MJ.fmtDouble(p)} is out of range. Servo positions go from 0.0 to 1.0, not degrees.`, line);
          sv.target = p;
        }),
        getPosition: hw(() => V(sv.target ?? 0, "double")),
        setDirection: hw(() => {}),
      } }, { __str: () => `Servo "${name}"` });
      return { cls: "Servo", obj: V(obj, "obj") };
    };
    const yawDeg = () => wrapDeg((w.robot.h * 180) / Math.PI - w.yawOffset);
    const makeImu = () => {
      const angles = (unitArg, line) => {
        const unit = unitArg ? enumName(unitArg, "Unit", line, "getYaw") : "DEGREES";
        const d = yawDeg(); return V(unit === "RADIANS" ? (d * Math.PI) / 180 : d, "double");
      };
      const ypr = () => V(hostObj("YawPitchRollAngles", { m: {
        getYaw: (a, line) => angles(a[0], line), getPitch: () => V(0, "double"), getRoll: () => V(0, "double"),
      } }), "obj");
      const obj = hostObj("IMU", { m: {
        initialize: hw(() => V(true, "boolean")), resetYaw: hw(() => { w.yawOffset = (w.robot.h * 180) / Math.PI; }),
        getRobotYawPitchRollAngles: hw(() => ypr()),
      } }, { __alias: ["BHI260IMU", "BNO055IMU"], __str: () => "IMU" });
      return { cls: "IMU", obj: V(obj, "obj") };
    };
    for (const [name, kind] of Object.entries(ch.devices || { left: "motor", right: "motor", imu: "imu" })) {
      w.devices[name] = kind === "motor" ? makeMotor(name) : kind === "servo" ? makeServo(name) : makeImu();
    }
    const deviceList = () => Object.entries(w.devices).map(([n, d]) => `${n} (${d.cls})`).join(", ");
    const getDevice = (clsName, name, line) => {
      const d = w.devices[name];
      if (!d) {
        const near = MJ.suggest(name, Object.keys(w.devices));
        throw new CodeError(`Unable to find a hardware device with the name "${name}".${near ? ` Did you mean "${near}"?` : ""} This robot's configuration has: ${deviceList()}.`, line);
      }
      const ok = clsName === d.cls || (d.cls === "DcMotor" && ["DcMotorEx", "DcMotorSimple"].includes(clsName)) || (d.cls === "IMU" && ["BHI260IMU", "BNO055IMU"].includes(clsName));
      if (!ok) throw new CodeError(`"${name}" is a ${d.cls}, but the code asks for a ${clsName}.`, line);
      return d.obj;
    };
    const lookupBy = (cls) => V(hostObj("DeviceMapping", { m: { get: hw((a, line) => { argc(a, 1, line, "get"); return getDevice(cls, String(a[0].v), line); }) } }), "obj");

    /* telemetry */
    const telemetry = hostObj("Telemetry", { m: {
      addData: (a, line) => {
        if (a.length < 2) throw new CodeError('telemetry.addData needs a caption and a value, like telemetry.addData("Power", power).', line);
        const val = a.length > 2 && a[1].t === "String" ? MJ.jformat(a[1].v, a.slice(2), line) : MJ.toStr(a[1]);
        w.pending.push(`${MJ.toStr(a[0])} : ${val}`); return VOID;
      },
      addLine: (a) => { w.pending.push(a.length ? MJ.toStr(a[0]) : ""); return VOID; },
      update: hw(() => { w.telemetry = w.pending.slice(-14); w.pending = []; return V(true, "boolean"); }, COST2),
      clear: () => { w.pending = []; return VOID; },
      clearAll: () => { w.pending = []; w.telemetry = []; return VOID; },
      setAutoClear: () => VOID, speak: () => VOID,
    } });
    const AXES = { left_stick_x: "lx", left_stick_y: "ly", right_stick_x: "rx", right_stick_y: "ry", left_trigger: "lt", right_trigger: "rt" };
    const BUTTONS = { a: "a", b: "b", x: "x", y: "y", dpad_up: "up", dpad_down: "down", dpad_left: "left", dpad_right: "right", left_bumper: "lb", right_bumper: "rb", start: "start", back: "back", left_stick_button: "ls", right_stick_button: "rs",
      cross: "a", circle: "b", square: "x", triangle: "y" };
    const pad = (which) => {
      const f = {};
      for (const [k, s] of Object.entries(AXES)) f[k] = () => V(w.started || w.ch.mode === "teleop" ? Math.round((w.input[which][s] || 0) * 1000) / 1000 : 0, "double");
      for (const [k, s] of Object.entries(BUTTONS)) f[k] = () => V(!!w.input[which][s], "boolean");
      return V(hostObj("Gamepad", { f }), "obj");
    };

    const elapsed = () => {
      let t0 = w.t;
      const o = hostObj("ElapsedTime", { m: {
        reset: () => { t0 = w.t; return VOID; }, seconds: () => V(w.t - t0, "double"), time: () => V(w.t - t0, "double"),
        milliseconds: () => V((w.t - t0) * 1000, "double"), startTime: () => V(t0, "double"),
      } }, { __str: () => `${(w.t - t0).toFixed(4)} seconds` });
      return V(o, "obj");
    };

    w.host = {
      types: ["DcMotor", "DcMotorEx", "DcMotorSimple", "Servo", "IMU", "BHI260IMU", "BNO055IMU", "ElapsedTime", "Telemetry", "Gamepad", "HardwareMap", "YawPitchRollAngles",
        "AngleUnit", "Range", "Math", "IMU.Parameters", "RevHubOrientationOnRobot", "DcMotor.Direction", "DcMotor.RunMode", "DcMotor.ZeroPowerBehavior", "DcMotorSimple.Direction"],
      constructible: ["ElapsedTime", "IMU.Parameters", "RevHubOrientationOnRobot"],
      globals: {
        hardwareMap: V(hostObj("HardwareMap", {
          m: { get: hw((a, line) => {
            if (a.length !== 2 || a[0].t !== "obj" || !a[0].v.__classOf) throw new CodeError('hardwareMap.get needs a type and a name, like hardwareMap.get(DcMotor.class, "left").', line);
            if (a[1].t !== "String") throw new CodeError('The device name must be text in quotes, like "left".', line);
            return getDevice(a[0].v.__classOf, a[1].v, line);
          }) },
          f: { dcMotor: lookupBy("DcMotor"), servo: lookupBy("Servo") },
        }), "obj"),
        telemetry: V(telemetry, "obj"),
        gamepad1: pad("g1"), gamepad2: pad("g2"),
        DcMotor: V(hostObj("DcMotor", { f: { Direction: DIRECTION, RunMode: RUNMODE, ZeroPowerBehavior: ZPB, class: classToken("DcMotor") } }), "obj"),
        DcMotorSimple: V(hostObj("DcMotorSimple", { f: { Direction: DIRECTION, class: classToken("DcMotorSimple") } }), "obj"),
        DcMotorEx: V(hostObj("DcMotorEx", { f: { Direction: DIRECTION, RunMode: RUNMODE, ZeroPowerBehavior: ZPB, class: classToken("DcMotorEx") } }), "obj"),
        Servo: V(hostObj("Servo", { f: { class: classToken("Servo") } }), "obj"),
        IMU: V(hostObj("IMU", { f: { class: classToken("IMU") } }), "obj"),
        AngleUnit: V(hostObj("AngleUnit", { f: ANGLE.v.__f }), "obj"),
        RevHubOrientationOnRobot: V(hostObj("RevHubOrientationOnRobot", { f: { LogoFacingDirection: LOGO, UsbFacingDirection: USB } }), "obj"),
      },
      construct: (type, args) => {
        if (type === "ElapsedTime") return elapsed();
        if (type === "IMU.Parameters" || type === "RevHubOrientationOnRobot") return V(hostObj(type, {}), "obj");
        return null;
      },
      builtins: {
        waitForStart: (a, line) => (function* () {
          if (w.iterative) throw new CodeError("waitForStart() only exists in a LinearOpMode. In an OpMode with init() and loop(), the robot starts calling loop() by itself after START.", line);
          argc(a, 0, line, "waitForStart");
          if (w.started) return VOID;
          yield { wait: START_DELAY_MS, line };
          w.started = true; w.startT = w.t; say("info", "START pressed. Autonomous is running.");
          return VOID;
        })(),
        sleep: (a, line) => (function* () {
          if (w.iterative) throw new CodeError("sleep() isn't allowed in an OpMode with init() and loop(): loop() must finish quickly every time. Use an ElapsedTime timer to wait instead.", line);
          argc(a, 1, line, "sleep");
          if (a[0].t === "double") throw new CodeError("sleep needs a whole number of milliseconds (a long), but this is a double. Use sleep(500) or sleep((long) ms).", line);
          const ms = numArg(a[0], line, "sleep");
          if (ms < 0) throw new CodeError("sleep can't use a negative time.", line);
          if (w.stopRequested) return VOID;
          yield { wait: ms, line };
          return VOID;
        })(),
        opModeIsActive: hw((a, line) => { if (w.iterative) throw new CodeError("opModeIsActive() is for LinearOpMode. In an OpMode with loop(), you don't need it: loop() simply stops being called when the match ends.", line); return V(w.started && !w.stopRequested, "boolean"); }),
        opModeInInit: hw(() => V(!w.started && !w.stopRequested, "boolean")),
        isStarted: hw(() => V(w.started, "boolean")),
        isStopRequested: hw(() => V(w.stopRequested, "boolean")),
        idle: hw(() => VOID),
        getRuntime: () => V(w.t, "double"),
        resetRuntime: () => VOID,
        requestOpModeStop: () => { w.stopRequested = true; return VOID; },
        terminateOpModeNow: () => { w.stopRequested = true; return VOID; },
        telemetry: undefined,
      },
    };
    delete w.host.builtins.telemetry;

    /* physics, one small step */
    w.clawPoint = () => ({ x: w.robot.x - Math.sin(w.robot.h) * CLAW_REACH, y: w.robot.y + Math.cos(w.robot.h) * CLAW_REACH });
    w.step = (dt) => {
      const stopped = w.programDone || w.stopRequested;
      for (const m of Object.values(w.motors)) {
        let cmd;
        if (stopped || m.mode === "STOP_AND_RESET_ENCODER") cmd = 0;
        else if (m.mode === "RUN_TO_POSITION") {
          const err = (m.target ?? 0) - Math.round(m.dir * (m.raw - m.rawOffset));
          cmd = Math.abs(err) <= 4 ? 0 : clamp(err / 140, -1, 1) * Math.abs(m.power);
          if (cmd !== 0 && Math.abs(cmd) < 0.06) cmd = 0.06 * Math.sign(cmd);
        } else cmd = m.power;
        const supply = m.mode === "RUN_WITHOUT_ENCODER" ? w.battery : 0.86; // encoder modes regulate speed, so the battery matters less
        const target = m.dir * cmd * supply * MAX_TPS;
        const tau = cmd === 0 ? TAU[m.zpb] : 0.08;
        m.vel += (target - m.vel) * (1 - Math.exp(-dt / tau));
        m.raw += m.vel * dt;
      }
      const L = w.motors.left, R = w.motors.right, FL = w.motors.frontLeft;
      let moved = false;
      const r = w.robot;
      if (FL) {
        // Mecanum: right-side motors are mounted mirrored, like the tank robot
        const fl = FL.vel / TPI, bl = w.motors.backLeft.vel / TPI, fr = -w.motors.frontRight.vel / TPI, br = -w.motors.backRight.vel / TPI;
        r.v = (fl + bl + fr + br) / 4; r.vs = ((fl - bl - fr + br) / 4) * STRAFE_EFF; r.w = -((fl + bl - fr - br) / 4) / MEC_K;
        moved = true;
      } else if (L && R) {
        const vl = (L.vel / TPI) * (1 - drift), vr = -(R.vel / TPI); // the right motor is mounted mirrored
        r.v = (vl + vr) / 2; r.vs = 0; r.w = (vr - vl) / TRACK;
        moved = true;
      }
      if (moved) {
        r.h += r.w * dt;
        let nx = r.x - Math.sin(r.h) * r.v * dt + Math.cos(r.h) * r.vs * dt, ny = r.y + Math.cos(r.h) * r.v * dt + Math.sin(r.h) * r.vs * dt;
        let hitBarrier = false;
        for (const o of w.ch.obstacles || []) {
          const x0 = o.x - HALF, x1 = o.x + o.w + HALF, y0 = o.y - HALF, y1 = o.y + o.h + HALF;
          if (nx > x0 && nx < x1 && ny > y0 && ny < y1) {
            hitBarrier = true;
            const pen = [nx - x0, x1 - nx, ny - y0, y1 - ny], m = Math.min(...pen);
            if (m === pen[0]) nx = x0; else if (m === pen[1]) nx = x1; else if (m === pen[2]) ny = y0; else ny = y1;
          }
        }
        if (hitBarrier && !w.barrierHit) { w.wallHits++; say("warn", "The robot ran into a barrier."); }
        w.barrierHit = hitBarrier;
        const lim = HALF + 0.5;
        if (nx < lim || nx > FIELD - lim || ny < lim || ny > FIELD - lim) {
          if (!w.touchingWall) { w.wallHits++; say("warn", "The robot hit the field wall."); }
          w.touchingWall = true;
        } else w.touchingWall = false;
        r.x = clamp(nx, lim, FIELD - lim); r.y = clamp(ny, lim, FIELD - lim);
        if (!w.started && Math.hypot(r.v, r.vs, r.w * 9) > 1 && !w.movedBeforeStart) { w.movedBeforeStart = true; say("warn", "The robot moved before START. In a real match that's a penalty: call waitForStart() before setting power."); }
        const last = w.trail[w.trail.length - 1];
        if (Math.hypot(last.x - r.x, last.y - r.y) > 1.2) w.trail.push({ x: r.x, y: r.y });
      }
      // servos move toward their target at about 2.5 units per second
      for (const sv of Object.values(w.servos)) if (sv.target != null) sv.pos += clamp(sv.target - sv.pos, -2.5 * dt, 2.5 * dt);
      const claw = w.servos.claw;
      if (claw && w.sample) {
        const cp = w.clawPoint(), closed = claw.pos <= 0.3;
        if (w.sample.held) { if (!closed) { w.sample.held = false; say("info", "Sample released."); } else { w.sample.x = cp.x; w.sample.y = cp.y; } }
        else if (closed && w.wasOpen && Math.hypot(cp.x - w.sample.x, cp.y - w.sample.y) <= 6) { w.sample.held = true; say("good", "Sample picked up!"); }
        w.wasOpen = !closed;
      }
      // checkpoints in order
      const cps = w.ch.checkpoints || [];
      if (w.cp < cps.length) { const c = cps[w.cp]; if (Math.hypot(w.robot.x - c.x, w.robot.y - c.y) <= (c.r || 8)) { w.cp++; say("good", `Checkpoint ${c.label || w.cp} reached.`); } }
      w.t += dt;
    };
    w.yaw = yawDeg;
    w.ticksPerInch = TPI;
    return w;
  }

  /* ---------- goals ---------- */
  const inZone = (z, x, y) => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h;
  /** Returns [{ text, state: "done" | "todo" | "fail", detail }] for the challenge's goals. final = after the run. */
  function goals(w, final) {
    const ch = w.ch, out = [], r = w.robot;
    for (const g of ch.goals || []) {
      if (g.type === "park") {
        const z = ch.zones.find((q) => q.id === g.zone), inside = inZone(z, r.x, r.y), still = Math.hypot(r.v, r.vs || 0) < 1.5 && Math.abs(r.w) < 0.1;
        const cx = z.x + z.w / 2, cy = z.y + z.h / 2;
        let detail = "";
        if (!inside) { const dx = r.x - cx, dy = r.y - cy; const far = Math.hypot(dx, dy); detail = `The robot ended ${far.toFixed(1)} in from the center of the zone.`; }
        out.push({ text: g.text || `Park in the ${z.label || "zone"}`, state: inside && (still || !final) ? "done" : final ? "fail" : "todo", detail });
      } else if (g.type === "checkpoints") {
        const n = (ch.checkpoints || []).length;
        out.push({ text: g.text || `Pass every checkpoint in order (${w.cp}/${n})`, state: w.cp >= n ? "done" : final ? "fail" : "todo", detail: w.cp < n ? `Next one: checkpoint ${ch.checkpoints[w.cp].label}.` : "" });
      } else if (g.type === "sample") {
        const z = ch.zones.find((q) => q.id === g.zone), s = w.sample, inside = s && !s.held && inZone(z, s.x, s.y);
        out.push({ text: g.text || "Drop the sample in the basket", state: inside ? "done" : final ? "fail" : "todo", detail: s?.held ? "The robot is still holding the sample. Open the claw to drop it." : "" });
      } else if (g.type === "noWall") {
        out.push({ text: g.text || "Don't hit the walls", state: w.wallHits ? "fail" : final ? "done" : "todo" });
      }
    }
    return out;
  }

  /* ---------- running a program ---------- */
  /**
   * Compiles and prepares a run. Throws CodeError for compile problems.
   * run.advance(seconds) moves time forward; check run.over, run.error, run.result.
   */
  function createRun(src, ch, opts = {}) {
    const prog = MJ.compile(src);
    if (!prog.className) throw new CodeError("Put your code inside a class: public class MyAuto extends LinearOpMode { ... }", 1);
    const iterative = !!prog.superName && /(^|\.)OpMode$/.test(prog.superName);
    if (iterative && !prog.methods.has("loop")) throw new CodeError("An OpMode that extends OpMode needs a loop() method (and usually init()). Or write extends LinearOpMode and use runOpMode().", 1);
    if (!iterative && !prog.methods.has("runOpMode")) throw new CodeError("Your class needs a runOpMode() method. That's where a LinearOpMode starts: public void runOpMode() { ... }", 1);
    const w = createWorld(ch, opts);
    w.iterative = iterative;
    const interp = new MJ.Interp(prog, w.host);
    const has = (n) => prog.methods.has(n);
    const gen = iterative
      ? (function* () {
        yield* interp.init();
        if (has("init")) yield* interp.call("init", [], null);
        if (has("init_loop")) { const until = w.t * 1000 + START_DELAY_MS; while (w.t * 1000 < until) { yield* interp.call("init_loop", [], null); yield { cost: 10 }; } }
        else yield { wait: START_DELAY_MS };
        w.started = true; w.startT = w.t; w.log.push({ kind: "info", text: "START pressed. loop() is running.", t: w.t });
        if (has("start")) yield* interp.call("start", [], null);
        while (!w.stopRequested) { yield* interp.call("loop", [], null); yield { cost: 10 }; }
        if (has("stop")) yield* interp.call("stop", [], null);
      })()
      : (function* () { yield* interp.init(); yield* interp.call("runOpMode", [], null); })();
    const run = { world: w, interp, prog, over: false, error: null, endReason: "", result: null, progMs: 0, endedAt: null, stepMode: false, stepAllow: 0, paused: false, pausedLine: 0 };
    const limit = w.teleop ? TELEOP_SECONDS : AUTO_SECONDS;
    /** Step mode: pause before each line. step() runs one line; resume() runs freely again. */
    run.pause = () => { run.stepMode = true; run.stepAllow = 0; };
    run.step = () => { run.stepMode = true; run.stepAllow = 0; run.paused = false; }; // runs the line it is paused on, then pauses at the next one
    run.resume = () => { run.stepMode = false; run.paused = false; };
    let spin = 0;
    const finish = (reason) => { if (w.programDone) return; w.programDone = true; run.endedAt = w.t; run.endReason = reason; };
    run.stop = () => { w.stopRequested = true; finish("stopped"); run.over = true; run.result = null; };
    run.advance = (seconds) => {
      if (run.paused) return;
      const end = w.t + seconds;
      while (w.t < end - 1e-9 && !run.over) {
        while (!w.programDone && run.progMs <= w.t * 1000 + 1e-6) {
          let r;
          try { r = gen.next(); } catch (e) {
            run.error = e instanceof CodeError ? e : new CodeError(`Something went wrong: ${e.message}`, interp.curLine);
            if (!run.error.line) run.error.line = interp.curLine;
            finish("error"); break;
          }
          if (r.done) { finish(w.started ? "finished" : "noStart"); break; }
          const y = r.value;
          if (y === TICK || y.stmt != null) {
            if (++spin > 600000) { run.error = new CodeError(w.iterative ? "loop() never finishes. In an OpMode with init() and loop(), loop() must end quickly every time: don't put long while loops inside it." : "Your code is stuck in a loop that never gives the robot time to move. Add opModeIsActive() to the loop's condition, or a sleep() inside it.", interp.curLine); finish("error"); }
            if (y.stmt != null && run.stepMode) { if (run.stepAllow > 0) run.stepAllow--; else { run.paused = true; run.pausedLine = y.stmt; return; } }
            continue;
          }
          spin = 0;
          if (y.cost) run.progMs += y.cost;
          if (y.wait != null) run.progMs = Math.max(run.progMs, w.t * 1000) + y.wait;
        }
        w.step(Math.min(0.005, end - w.t));
        if (w.started && !w.programDone && w.t - w.startT >= limit) {
          w.stopRequested = true; finish("timeout");
          w.log.push({ kind: "warn", text: w.teleop ? "The 2-minute TeleOp period ended." : "The 30-second autonomous period ended, so the OpMode was stopped.", t: w.t });
        }
        // TeleOp challenges finish as soon as every goal is met
        if (w.teleop && w.started && !w.programDone) {
          const gs = goals(w, true);
          if (gs.length && gs.every((g) => g.state === "done")) { w.stopRequested = true; finish("goals"); w.log.push({ kind: "good", text: "Every goal is done!", t: w.t }); }
        }
        if (w.programDone && w.t - run.endedAt >= (run.error ? 0 : SETTLE_S)) {
          run.over = true;
          if (!run.error && run.endReason !== "stopped") {
            const gs = goals(w, true);
            run.result = { pass: gs.length > 0 && gs.every((g) => g.state === "done"), goals: gs, time: w.startT == null ? 0 : (run.endedAt - w.startT) };
          }
        }
      }
    };
    return run;
  }

  /** Runs a whole program as fast as possible (tests and quick checks). */
  function runToEnd(src, ch, opts = {}) {
    const run = createRun(src, ch, opts);
    let guard = 0;
    while (!run.over && guard++ < 4000) run.advance(0.05);
    return run;
  }

  const api = { createWorld, createRun, runToEnd, goals, newInput, blankPad, FIELD, ROBOT, HALF, CLAW_REACH, TPI, TPR, WHEEL_D, AUTO_SECONDS, TELEOP_SECONDS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.RobotSim = api;
})(typeof window !== "undefined" ? window : globalThis);
