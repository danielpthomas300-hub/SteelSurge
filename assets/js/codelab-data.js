/* ==========================================================================
   Steel Surge Code Lab — lessons
   Level 1 "Debug it": read real FTC code and find the problem.
   Level 2 "Write it": finish a method; it's checked against test inputs.
   Level 3 "Drive it": program an autonomous for the simulated robot.

   To add a question, drill, or challenge, copy one of the entries below.
   - Debug questions: type "choice" (answer = index into options, from 0) or
     "line" (answer = the line number of the problem, from 1).
   - Drills: `solution` is the reference answer; expected results are worked
     out by running it, so tests only list inputs. Run `node tools/test_codelab.js`.
   - Challenges: field positions are in inches; (0, 0) is the bottom-left corner,
     heading 0 faces up the field and positive headings turn left.
   ========================================================================== */
(function (root) {
  "use strict";

  /* ------------------------------------------------------------ Level 1 */
  const DEBUG = [
    {
      id: "wait", topic: "OpMode basics", title: "The early start",
      code: `@Autonomous(name = "Drive Off")
public class DriveOff extends LinearOpMode {
    @Override
    public void runOpMode() {
        DcMotor left = hardwareMap.get(DcMotor.class, "left");
        DcMotor right = hardwareMap.get(DcMotor.class, "right");
        right.setDirection(DcMotor.Direction.REVERSE);

        left.setPower(0.5);
        right.setPower(0.5);
        sleep(2000);
    }
}`,
      prompt: "The robot starts driving the moment the driver presses INIT, before the match begins. That's a penalty. What's missing?",
      type: "choice",
      options: ["waitForStart(); before the robot moves", "telemetry.update(); at the end", "left.setDirection(...) for the left motor", "A while loop around the sleep"],
      answer: 0,
      explain: "Everything in runOpMode() before <code>waitForStart()</code> runs during INIT. Put setup (hardwareMap, directions) first, then <code>waitForStart();</code>, then the code that moves the robot.",
    },
    {
      id: "stick", topic: "Gamepad", title: "Backwards stick",
      code: `while (opModeIsActive()) {
    double drive = gamepad1.left_stick_y;
    left.setPower(drive);
    right.setPower(drive);
}`,
      prompt: "Pushing the left stick forward makes the robot drive backward. Why?",
      type: "choice",
      options: ["The stick's y value is negative when pushed forward", "The motors are plugged into the wrong ports", "It should read left_stick_x", "setPower only works with whole numbers"],
      answer: 0,
      explain: "On gamepads, up on a stick is <b>negative</b> y. That's why most FTC code writes <code>double drive = -gamepad1.left_stick_y;</code>.",
    },
    {
      id: "spin", topic: "Motors", title: "Round and round",
      code: `DcMotor left = hardwareMap.get(DcMotor.class, "left");
DcMotor right = hardwareMap.get(DcMotor.class, "right");

waitForStart();

left.setPower(0.5);
right.setPower(0.5);
sleep(1500);`,
      prompt: "Both motors get the same power, but the robot spins in place instead of driving forward. What's the fix?",
      type: "choice",
      options: ["Reverse one side: right.setDirection(DcMotor.Direction.REVERSE);", "Give the right motor more power", "Add sleep(100) between the two setPower lines", "Use 1.0 instead of 0.5"],
      answer: 0,
      explain: "The motors on each side face opposite directions, so the same power spins the wheels opposite ways. Reversing one side in code makes positive power mean forward for both.",
    },
    {
      id: "intdiv", topic: "Java math", title: "Where did the decimals go?",
      code: `int ticksPerRev = 537;
int wheelCircumference = 12;   // inches
double ticksPerInch = ticksPerRev / wheelCircumference;
telemetry.addData("Ticks per inch", ticksPerInch);`,
      prompt: "Telemetry shows 44.0 instead of 44.75. Why?",
      type: "choice",
      options: ["int / int does whole-number division, so the .75 is dropped before it's stored", "A double can only hold one decimal place", "telemetry rounds every number", "537 should be written 537L"],
      answer: 0,
      explain: "When both sides are <code>int</code>, Java divides and throws away the remainder, <i>then</i> stores 44 in the double. Make one side a double: <code>537.0 / 12</code> or <code>(double) ticksPerRev / wheelCircumference</code>.",
    },
    {
      id: "sleep-teleop", topic: "TeleOp loops", title: "The frozen robot",
      code: `while (opModeIsActive()) {
    left.setPower(-gamepad1.left_stick_y);
    right.setPower(-gamepad1.right_stick_y);

    if (gamepad1.a) {
        claw.setPosition(0.0);
        sleep(1000);
    }
    telemetry.update();
}`,
      prompt: "Drivers say the robot ignores the sticks for a second whenever they close the claw. Click the line that causes it.",
      type: "line", answer: 7,
      explain: "<code>sleep()</code> pauses the whole loop, so the drive motors keep their last power and the sticks are ignored. In TeleOp, never sleep inside the loop. If you need timing, use an <code>ElapsedTime</code> timer.",
    },
    {
      id: "rtp", topic: "Encoders", title: "Crash on start",
      code: `arm.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);
arm.setMode(DcMotor.RunMode.RUN_TO_POSITION);
arm.setTargetPosition(800);
arm.setPower(0.6);
while (opModeIsActive() && arm.isBusy()) {
    idle();
}`,
      prompt: "The OpMode crashes with “TargetPositionNotSetException.” Which line has to move earlier?",
      type: "line", answer: 3,
      explain: "A motor must know its target <i>before</i> it switches to RUN_TO_POSITION. The order is: reset, <code>setTargetPosition</code>, <code>setMode(RUN_TO_POSITION)</code>, then <code>setPower</code>.",
    },
    {
      id: "reset", topic: "Encoders", title: "The move that doesn't move",
      code: `// First move: 1000 ticks forward
while (opModeIsActive() && left.getCurrentPosition() < 1000) {
    left.setPower(0.5);
    right.setPower(0.5);
}
// Second move: another 1000 ticks
while (opModeIsActive() && left.getCurrentPosition() < 1000) {
    left.setPower(0.5);
    right.setPower(0.5);
}
left.setPower(0);
right.setPower(0);`,
      prompt: "The first move works, but the second one ends instantly. Why?",
      type: "choice",
      options: ["The encoder still reads about 1000, so the second condition is already false", "Motors can only use encoders once per OpMode", "The second loop needs sleep() inside it", "getCurrentPosition() returns inches, not ticks"],
      answer: 0,
      explain: "Encoders keep counting. Either reset them (<code>STOP_AND_RESET_ENCODER</code>, then a run mode again), or aim for <code>2000</code>, or save the start position and compare <code>getCurrentPosition() - start</code>.",
    },
    {
      id: "assign", topic: "Java logic", title: "The claw that never opens",
      code: `boolean clawClosed = false;
while (opModeIsActive()) {
    if (clawClosed = true) {
        claw.setPosition(0.0);
    } else {
        claw.setPosition(1.0);
    }
    clawClosed = gamepad1.a;
}`,
      prompt: "The claw stays closed even when A isn't pressed. Click the line with the bug.",
      type: "line", answer: 3,
      explain: "<code>=</code> <i>stores</i> a value, so <code>clawClosed = true</code> sets it to true and the if always runs. Compare with <code>==</code>, or better, just write <code>if (clawClosed)</code>.",
    },
    {
      id: "strings", topic: "Java logic", title: "The color that never matches",
      code: `String color = detectColor();   // returns "red", "blue", or "none"
if (color == "red") {
    telemetry.addLine("Red alliance sample!");
}`,
      prompt: "Sometimes detectColor() returns \"red\" but the message never appears. What should line 2 use?",
      type: "choice",
      options: ['color.equals("red")', 'color = "red"', 'color === "red"', '(int) color == "red"'],
      answer: 0,
      explain: "For text (Strings), <code>==</code> checks whether they're the same object in memory, not the same letters. Use <code>.equals(...)</code> to compare what the text says.",
    },
    {
      id: "toggle", topic: "TeleOp loops", title: "The flickering claw",
      code: `boolean clawOpen = false;
while (opModeIsActive()) {
    if (gamepad1.a) {
        clawOpen = !clawOpen;
    }
    claw.setPosition(clawOpen ? 1.0 : 0.0);
}`,
      prompt: "One quick tap of A makes the claw flicker and land open or closed at random. Why?",
      type: "choice",
      options: ["The loop runs many times while A is held, flipping clawOpen each time", "setPosition can't be called inside a loop", "!clawOpen is not valid Java", "The ? : operator only works with ints"],
      answer: 0,
      explain: "A loop runs about 50+ times a second, so one tap flips the value many times. Only toggle when A is <i>newly</i> pressed: keep <code>boolean lastA</code> and check <code>gamepad1.a && !lastA</code>, then set <code>lastA = gamepad1.a;</code> at the end of the loop.",
    },
    {
      id: "telemetry", topic: "Telemetry", title: "The blank Driver Station",
      code: `while (opModeIsActive()) {
    double power = -gamepad1.left_stick_y;
    left.setPower(power);
    right.setPower(power);
    telemetry.addData("Power", power);
}`,
      prompt: "Nothing ever shows on the Driver Station screen. What's missing?",
      type: "choice",
      options: ["telemetry.update(); after adding the data", "A sleep(50) inside the loop", "telemetry.addLine(); before addData", "Quotes around power"],
      answer: 0,
      explain: "<code>addData</code> only queues the lines. <code>telemetry.update()</code> sends them to the Driver Station, usually once at the end of each loop.",
    },
    {
      id: "stuck", topic: "Encoders", title: "The stop button doesn't work",
      code: `int target = 3000;
left.setPower(0.4);
right.setPower(0.4);
while (left.getCurrentPosition() < target) {
    telemetry.addData("Ticks", left.getCurrentPosition());
    telemetry.update();
}
left.setPower(0);
right.setPower(0);`,
      prompt: "If the robot gets blocked, pressing STOP doesn't end the OpMode, and the app eventually restarts. Click the line to fix.",
      type: "line", answer: 4,
      explain: "The loop never checks whether STOP was pressed. Add it to the condition: <code>while (opModeIsActive() && left.getCurrentPosition() < target)</code>. Every long loop in a LinearOpMode should check <code>opModeIsActive()</code>.",
    },
    {
      id: "servo", topic: "Servos", title: "Servo at 90",
      code: `Servo claw = hardwareMap.get(Servo.class, "claw");
waitForStart();
claw.setPosition(90);   // turn the claw servo 90 degrees`,
      prompt: "This line crashes the OpMode. What does setPosition expect?",
      type: "choice",
      options: ["A number from 0.0 to 1.0 across the servo's range", "Degrees from 0 to 180", "Degrees from -90 to 90", "Encoder ticks"],
      answer: 0,
      explain: "Servo positions go from <code>0.0</code> to <code>1.0</code> over the servo's full range. On a typical 180° servo, 90° is about <code>0.5</code>.",
    },
    {
      id: "scope", topic: "Java basics", title: "Cannot find symbol",
      code: `if (gamepad1.right_bumper) {
    double speed = 0.4;
} else {
    double speed = 1.0;
}
left.setPower(-gamepad1.left_stick_y * speed);
right.setPower(-gamepad1.right_stick_y * speed);`,
      prompt: "Android Studio says “cannot find symbol: speed.” Click the first line where speed is used out of reach.",
      type: "line", answer: 6,
      explain: "A variable only exists inside the <code>{ }</code> where it's created. Declare it once before the if: <code>double speed = 1.0;</code> then set <code>speed = 0.4;</code> inside the if.",
    },
    {
      id: "hwname", topic: "OpMode basics", title: "Crash on INIT",
      code: `// Robot configuration on the phone:
//   Motor port 0: "leftDrive"
//   Motor port 1: "rightDrive"
DcMotor left = hardwareMap.get(DcMotor.class, "left_drive");
DcMotor right = hardwareMap.get(DcMotor.class, "rightDrive");`,
      prompt: "The OpMode crashes as soon as INIT is pressed. Click the line with the problem.",
      type: "line", answer: 4,
      explain: "The name in <code>hardwareMap.get</code> must match the robot configuration exactly, including capital letters and underscores: <code>\"leftDrive\"</code>.",
    },
    {
      id: "mecanum", topic: "Drive code", title: "The wobbly strafe",
      code: `double y = -gamepad1.left_stick_y;
double x = gamepad1.left_stick_x;
double rx = gamepad1.right_stick_x;

frontLeft.setPower(y + x + rx);
backLeft.setPower(y - x + rx);
frontRight.setPower(y - x - rx);
backRight.setPower(y + x - rx);`,
      prompt: "Strafing works, but pushing forward and sideways while turning makes the robot drift off course. Why?",
      type: "choice",
      options: ["Sums can go above 1.0, and the motors can't go faster than full power, so the wheels lose their balance", "x and y are swapped", "rx should be multiplied by 2", "Mecanum wheels can't turn and strafe at the same time"],
      answer: 0,
      explain: "With all three inputs pushed, a wheel can be asked for 2.0 or more, but a motor tops out at full power, so the wheels no longer keep the right ratio. Divide every power by <code>Math.max(Math.abs(y) + Math.abs(x) + Math.abs(rx), 1)</code> to keep the ratio.",
    },
    {
      id: "halfpower", topic: "Java math", title: "Half power, no power",
      code: `waitForStart();
left.setPower(1 / 2);
right.setPower(1 / 2);
sleep(2000);`,
      prompt: "The robot should drive at half power, but it doesn't move at all. Why?",
      type: "choice",
      options: ["1 / 2 is whole-number division, which gives 0", "setPower needs a percentage like 50", "sleep(2000) is too short to see it move", "Two motors can't have the same power"],
      answer: 0,
      explain: "Both 1 and 2 are ints, so Java divides them as whole numbers: <code>1 / 2</code> is <code>0</code>. Write <code>0.5</code>, or <code>1.0 / 2</code>.",
    },
    {
      id: "exact", topic: "IMU", title: "The turn that never ends",
      code: `left.setPower(-0.3);
right.setPower(0.3);
while (opModeIsActive() && heading() != 90) {
    telemetry.addData("Heading", heading());
    telemetry.update();
}
left.setPower(0);
right.setPower(0);`,
      prompt: "The robot spins forever instead of stopping at 90°. Click the line to fix.",
      type: "line", answer: 3,
      explain: "The heading is a double like 89.6 or 90.3, so it almost never equals exactly 90. Compare with a range instead: <code>heading() < 90</code>, or <code>Math.abs(90 - heading()) > 2</code>.",
    },
    {
      id: "nostop", topic: "Encoders", title: "It just keeps going",
      code: `left.setPower(0.5);
right.setPower(0.5);
while (opModeIsActive() && left.getCurrentPosition() < 2000) {
    telemetry.addData("Ticks", left.getCurrentPosition());
    telemetry.update();
}
sleep(1000);
arm.setPower(0.4);`,
      prompt: "The robot drives past its target and keeps going while the arm moves. What's missing right after the loop?",
      type: "choice",
      options: ["left.setPower(0); and right.setPower(0);", "Another waitForStart();", "A second while loop", "telemetry.clear();"],
      answer: 0,
      explain: "Motors keep the last power you gave them. The loop only <i>waits</i>; once it ends, set the drive motors back to <code>0</code>.",
    },
    {
      id: "timer", topic: "Loops and timing", title: "The timer that's already late",
      code: `ElapsedTime timer = new ElapsedTime();
// ...setup code, then the drivers wait for the match...
waitForStart();

left.setPower(0.5);
right.setPower(0.5);
while (opModeIsActive() && timer.seconds() < 2.0) {
    idle();
}`,
      prompt: "In testing the robot drives for 2 seconds, but in a real match it barely moves. Why?",
      type: "choice",
      options: ["The timer started counting during INIT, so 2 seconds had already passed", "ElapsedTime only counts milliseconds", "idle() stops the motors", "The loop needs a sleep() inside it"],
      answer: 0,
      explain: "An <code>ElapsedTime</code> starts counting when it's created. Call <code>timer.reset();</code> right after <code>waitForStart()</code> so it measures from the start of the match.",
    },
    {
      id: "offbyone", topic: "Java basics", title: "One too many",
      code: `DcMotor[] motors = {frontLeft, frontRight, backLeft, backRight};
for (int i = 0; i <= motors.length; i++) {
    motors[i].setPower(0);
}`,
      prompt: "This crashes with an ArrayIndexOutOfBoundsException. Click the line with the bug.",
      type: "line", answer: 2,
      explain: "An array with 4 items has indexes 0, 1, 2, and 3. The loop should stop before 4: use <code>i < motors.length</code>, not <code><=</code>.",
    },
    {
      id: "iterloop", topic: "Loops and timing", title: "The frozen loop()",
      code: `@TeleOp(name = "Drive")
public class Drive extends OpMode {
    // ...init() gets the motors...
    @Override
    public void loop() {
        while (gamepad1.a) {
            arm.setPower(0.5);
        }
        arm.setPower(0);
        left.setPower(-gamepad1.left_stick_y);
    }
}`,
      prompt: "Holding A freezes the whole robot, and the app warns that loop() is stuck. Click the line to change.",
      type: "line", answer: 6,
      explain: "In an OpMode, <code>loop()</code> is called over and over and must finish quickly each time. A <code>while</code> that waits on a button never lets it return. Use <code>if (gamepad1.a)</code>: the next call of loop() checks again.",
    },
    {
      id: "wrap", topic: "IMU", title: "Stuck at 180",
      code: `// Turn around to face the other way
left.setPower(-0.3);
right.setPower(0.3);
while (opModeIsActive() && heading() < 180) {
    idle();
}
left.setPower(0);
right.setPower(0);`,
      prompt: "The robot spins forever when turning to 180°. Why?",
      type: "choice",
      options: ["The heading jumps from 180 to -180, so it never gets above 180", "IMUs can't measure past 90°", "idle() resets the heading", "The motor powers need the same sign"],
      answer: 0,
      explain: "The IMU heading runs from -180 to 180. Turning past 179.9 jumps to -179.9, so <code>heading() < 180</code> stays true forever. Turn to 178 instead, or wrap the error into -180 to 180 (see the <i>Shortest turn</i> drill).",
    },
    {
      id: "gamepad2", topic: "Gamepad", title: "The driver's stick does nothing",
      code: `while (opModeIsActive()) {
    // Driver uses controller 1, operator uses controller 2
    double drive = -gamepad2.left_stick_y;
    double turn = gamepad1.right_stick_x;
    left.setPower(drive + turn);
    right.setPower(drive - turn);
    arm.setPower(-gamepad2.right_stick_y);
}`,
      prompt: "The driver can turn, but pushing their left stick doesn't drive. Click the line with the bug.",
      type: "line", answer: 3,
      explain: "Driving reads <code>gamepad2</code>, the operator's controller. It should be <code>gamepad1.left_stick_y</code>. Mixing up gamepad1 and gamepad2 is a classic!",
    },
  ];

  /* ------------------------------------------------------------ Level 2 */
  const D = (v) => ({ v, t: "double" }), I = (v) => ({ v, t: "int" }), B = (v) => ({ v, t: "boolean" });
  const A = (elem, vals) => ({ t: "array", v: { elem, items: vals.map((v) => ({ v, t: elem })) } });
  const DRILLS = [
    {
      id: "clip", topic: "Motor power", title: "Keep power in range",
      intro: "Motor power must stay between <code>-1.0</code> and <code>1.0</code>. Return <code>power</code>, but capped: anything above 1.0 becomes 1.0, anything below -1.0 becomes -1.0.",
      method: "clip", returns: "double", params: ["power"],
      template: `double clip(double power) {
    // Your code here

    return power;
}`,
      solution: `double clip(double power) {
    if (power > 1.0) {
        return 1.0;
    }
    if (power < -1.0) {
        return -1.0;
    }
    return power;
}`,
      hint: "Two if statements work: one for <code>power > 1.0</code> and one for <code>power < -1.0</code>. Or try <code>Math.max(-1.0, Math.min(1.0, power))</code>.",
      tests: [[D(0.5)], [D(1.7)], [D(-2.0)], [D(-0.3)], [D(1.0)], [D(0.0)]],
    },
    {
      id: "deadzone", topic: "Gamepad", title: "Joystick deadzone",
      intro: "Worn joysticks don't rest exactly at 0, so robots creep. If the stick is closer to 0 than <code>0.1</code> (either direction), return <code>0.0</code>. Otherwise return the stick value unchanged.",
      method: "deadzone", returns: "double", params: ["stick"],
      template: `double deadzone(double stick) {
    // Your code here

    return stick;
}`,
      solution: `double deadzone(double stick) {
    if (Math.abs(stick) < 0.1) {
        return 0.0;
    }
    return stick;
}`,
      hint: "<code>Math.abs(stick)</code> gives the distance from 0, whether the stick is pushed up or down.",
      tests: [[D(0.05)], [D(-0.08)], [D(0.6)], [D(-0.75)], [D(0.0)], [D(0.25)]],
    },
    {
      id: "average", topic: "Java math", title: "Average of two encoders",
      intro: "Return the average of the left and right encoder readings as a double. Watch out: both inputs are <code>int</code>s, so the average of 100 and 101 should be <code>100.5</code>, not 100.",
      method: "average", returns: "double", params: ["left", "right"],
      template: `double average(int left, int right) {
    // Your code here

    return 0;
}`,
      solution: `double average(int left, int right) {
    return (left + right) / 2.0;
}`,
      hint: "<code>(left + right) / 2</code> is int ÷ int, which drops the .5. Divide by <code>2.0</code> instead.",
      tests: [[I(100), I(101)], [I(0), I(0)], [I(-3), I(4)], [I(1500), I(1480)], [I(7), I(8)]],
    },
    {
      id: "toinches", topic: "Encoders", title: "Ticks to inches",
      intro: "Turn encoder ticks into inches driven. One wheel rotation is <code>TICKS_PER_REV</code> ticks and moves the robot one wheel circumference (π × diameter).",
      method: "ticksToInches", returns: "double", params: ["ticks"],
      template: `static final double TICKS_PER_REV = 537.7;   // goBILDA 312 rpm motor
static final double WHEEL_DIAMETER = 3.78;   // inches (96 mm wheel)

double ticksToInches(int ticks) {
    // Your code here

    return 0;
}`,
      solution: `static final double TICKS_PER_REV = 537.7;   // goBILDA 312 rpm motor
static final double WHEEL_DIAMETER = 3.78;   // inches (96 mm wheel)

double ticksToInches(int ticks) {
    double rotations = ticks / TICKS_PER_REV;
    return rotations * Math.PI * WHEEL_DIAMETER;
}`,
      hint: "First find how many wheel rotations that is: <code>ticks / TICKS_PER_REV</code>. Then multiply by the circumference: <code>Math.PI * WHEEL_DIAMETER</code>.",
      tests: [[I(537)], [I(0)], [I(1000)], [I(-2000)], [I(5377)]],
    },
    {
      id: "toticks", topic: "Encoders", title: "Inches to ticks",
      intro: "The opposite direction: turn a distance in inches into a whole number of encoder ticks, rounded to the nearest tick, for <code>setTargetPosition</code>.",
      method: "inchesToTicks", returns: "int", params: ["inches"],
      template: `static final double TICKS_PER_REV = 537.7;
static final double WHEEL_DIAMETER = 3.78;   // inches

int inchesToTicks(double inches) {
    // Your code here

    return 0;
}`,
      solution: `static final double TICKS_PER_REV = 537.7;
static final double WHEEL_DIAMETER = 3.78;   // inches

int inchesToTicks(double inches) {
    double ticks = inches / (Math.PI * WHEEL_DIAMETER) * TICKS_PER_REV;
    return (int) Math.round(ticks);
}`,
      hint: "Work out the ticks as a double, then round it. <code>Math.round</code> gives a <code>long</code>, so convert it: <code>(int) Math.round(ticks)</code>.",
      tests: [[D(12.0)], [D(0.0)], [D(24.5)], [D(-6.0)], [D(100.0)]],
    },
    {
      id: "slow", topic: "Drive code", title: "Slow mode",
      intro: "Drivers hold a bumper for precise moves. If <code>slow</code> is true, return 40% of the power (<code>power × 0.4</code>). If not, return the power unchanged.",
      method: "scale", returns: "double", params: ["power", "slow"],
      template: `double scale(double power, boolean slow) {
    // Your code here

    return power;
}`,
      solution: `double scale(double power, boolean slow) {
    if (slow) {
        return power * 0.4;
    }
    return power;
}`,
      hint: "<code>slow</code> is already true or false, so you can write <code>if (slow)</code>. You could also use <code>slow ? power * 0.4 : power</code>.",
      tests: [[D(1.0), B(true)], [D(1.0), B(false)], [D(-0.5), B(true)], [D(0.25), B(false)], [D(0.0), B(true)]],
    },
    {
      id: "arcade", topic: "Drive code", title: "Arcade drive (left side)",
      intro: "In arcade drive, one stick moves forward and back (<code>drive</code>) and another turns (<code>turn</code>). The left wheels get <code>drive + turn</code>. Return that, kept between -1.0 and 1.0.",
      method: "leftPower", returns: "double", params: ["drive", "turn"],
      template: `double leftPower(double drive, double turn) {
    // Your code here

    return 0;
}`,
      solution: `double leftPower(double drive, double turn) {
    return Range.clip(drive + turn, -1.0, 1.0);
}`,
      hint: "Add them, then cap the result. FTC has a helper for capping: <code>Range.clip(value, -1.0, 1.0)</code>.",
      tests: [[D(0.5), D(0.0)], [D(0.5), D(0.5)], [D(0.0), D(0.4)], [D(0.8), D(0.6)], [D(-0.5), D(0.2)], [D(-0.9), D(-0.4)]],
    },
    {
      id: "mecanum", topic: "Drive code", title: "Mecanum front-left wheel",
      intro: "For mecanum drive, the front-left wheel gets <code>y + x + rx</code>. To keep every wheel in the right ratio, divide by the bigger of <code>|y| + |x| + |rx|</code> and <code>1</code>.",
      method: "frontLeft", returns: "double", params: ["y", "x", "rx"],
      template: `double frontLeft(double y, double x, double rx) {
    // Your code here

    return 0;
}`,
      solution: `double frontLeft(double y, double x, double rx) {
    double denominator = Math.max(Math.abs(y) + Math.abs(x) + Math.abs(rx), 1);
    return (y + x + rx) / denominator;
}`,
      hint: "Make a variable <code>denominator = Math.max(Math.abs(y) + Math.abs(x) + Math.abs(rx), 1)</code>, then return <code>(y + x + rx) / denominator</code>.",
      tests: [[D(1.0), D(0.0), D(0.0)], [D(0.0), D(1.0), D(0.0)], [D(1.0), D(1.0), D(0.0)], [D(0.5), D(0.5), D(0.5)], [D(0.5), D(-0.5), D(0.0)], [D(0.3), D(0.2), D(0.1)]],
    },
    {
      id: "holdarm", topic: "Control", title: "Hold the arm (P controller)",
      intro: "A proportional controller pushes harder the farther the arm is from its target: power = <code>kP × (target − current)</code>. Use <code>kP = 0.005</code> and keep the power between <code>-0.8</code> and <code>0.8</code>.",
      method: "holdArm", returns: "double", params: ["target", "current"],
      template: `static final double KP = 0.005;

double holdArm(int target, int current) {
    // Your code here

    return 0;
}`,
      solution: `static final double KP = 0.005;

double holdArm(int target, int current) {
    double error = target - current;
    return Range.clip(KP * error, -0.8, 0.8);
}`,
      hint: "The error is <code>target - current</code>. Multiply by <code>KP</code>, then cap it with <code>Range.clip(..., -0.8, 0.8)</code>.",
      tests: [[I(500), I(500)], [I(500), I(400)], [I(500), I(0)], [I(0), I(300)], [I(100), I(140)]],
    },
    {
      id: "attarget", topic: "Control", title: "Close enough",
      intro: "Motors never stop exactly on a number. Return <code>true</code> when <code>position</code> is within 15 ticks of <code>target</code> (either side), otherwise <code>false</code>.",
      method: "atTarget", returns: "boolean", params: ["position", "target"],
      template: `boolean atTarget(int position, int target) {
    // Your code here

    return false;
}`,
      solution: `boolean atTarget(int position, int target) {
    return Math.abs(target - position) <= 15;
}`,
      hint: "<code>Math.abs(target - position)</code> is how far off you are. Compare it with 15 and return the result directly.",
      tests: [[I(100), I(100)], [I(110), I(100)], [I(85), I(100)], [I(84), I(100)], [I(130), I(100)], [I(-10), I(0)]],
    },
    {
      id: "angle", topic: "Control", title: "Shortest turn",
      intro: "The IMU heading runs from -180° to 180°. Return how far to turn from <code>heading</code> to reach <code>target</code>, taking the short way around: always between -180 and 180. From 170° to -170° is <code>20</code>, not -340.",
      method: "angleError", returns: "double", params: ["target", "heading"],
      template: `double angleError(double target, double heading) {
    double error = target - heading;
    // Your code here: wrap error into the range -180 to 180

    return error;
}`,
      solution: `double angleError(double target, double heading) {
    double error = target - heading;
    while (error > 180) {
        error -= 360;
    }
    while (error <= -180) {
        error += 360;
    }
    return error;
}`,
      hint: "If the error is more than 180, subtract 360. If it's -180 or less, add 360. A while loop handles big values too.",
      tests: [[D(90), D(0)], [D(-170), D(170)], [D(170), D(-170)], [D(45), D(-90)], [D(-90), D(135)], [D(0), D(0)]],
    },
    {
      id: "pressed", topic: "Gamepad", title: "Just pressed",
      intro: "To toggle something with one button, you need to know when it was <i>just</i> pressed. Return <code>true</code> only if the button is down now (<code>now</code>) and was up on the last loop (<code>before</code>).",
      method: "justPressed", returns: "boolean", params: ["now", "before"],
      template: `boolean justPressed(boolean now, boolean before) {
    // Your code here

    return false;
}`,
      solution: `boolean justPressed(boolean now, boolean before) {
    return now && !before;
}`,
      hint: "“Down now” is <code>now</code>. “Was up before” is <code>!before</code>. Combine them with <code>&&</code>.",
      tests: [[B(true), B(false)], [B(true), B(true)], [B(false), B(true)], [B(false), B(false)]],
    },
    {
      id: "maxabs", topic: "Loops and arrays", title: "Biggest power",
      intro: "Return the largest <i>size</i> of any power in the array, ignoring the sign. For <code>{0.5, -1.2, 0.8}</code> that's <code>1.2</code>. Mecanum code uses this to scale all four wheel powers.",
      method: "maxAbs", returns: "double", params: ["powers"],
      template: `double maxAbs(double[] powers) {
    double biggest = 0;
    // Your code here: look at every power

    return biggest;
}`,
      solution: `double maxAbs(double[] powers) {
    double biggest = 0;
    for (double p : powers) {
        if (Math.abs(p) > biggest) {
            biggest = Math.abs(p);
        }
    }
    return biggest;
}`,
      hint: "A for-each loop visits every item: <code>for (double p : powers) { ... }</code>. Inside it, if <code>Math.abs(p)</code> is bigger than <code>biggest</code>, store it.",
      tests: [[A("double", [0.5, -1.2, 0.8])], [A("double", [0, 0, 0, 0])], [A("double", [-0.3])], [A("double", [1, 1, -1, 0.2])], [A("double", [0.1, 0.25, -0.05, 0.2])]],
    },
    {
      id: "countabove", topic: "Loops and arrays", title: "Count the readings",
      intro: "A distance sensor saved several readings. Return how many are <b>greater than</b> <code>limit</code>.",
      method: "countAbove", returns: "int", params: ["readings", "limit"],
      template: `int countAbove(int[] readings, int limit) {
    int count = 0;
    // Your code here

    return count;
}`,
      solution: `int countAbove(int[] readings, int limit) {
    int count = 0;
    for (int i = 0; i < readings.length; i++) {
        if (readings[i] > limit) {
            count++;
        }
    }
    return count;
}`,
      hint: "Loop with <code>for (int i = 0; i < readings.length; i++)</code> and add one to <code>count</code> (<code>count++;</code>) whenever <code>readings[i] > limit</code>.",
      tests: [[A("int", [10, 50, 90]), I(40)], [A("int", []), I(0)], [A("int", [5, 5, 5]), I(5)], [A("int", [-3, 2, 8, 100]), I(-5)], [A("int", [7]), I(6)]],
    },
    {
      id: "averageall", topic: "Loops and arrays", title: "Average them all",
      intro: "Return the average of every encoder reading in the array as a double. If the array is empty, return <code>0.0</code>. Careful with whole-number division again!",
      method: "averageAll", returns: "double", params: ["ticks"],
      template: `double averageAll(int[] ticks) {
    int total = 0;
    // Your code here

    return 0;
}`,
      solution: `double averageAll(int[] ticks) {
    if (ticks.length == 0) {
        return 0.0;
    }
    int total = 0;
    for (int t : ticks) {
        total += t;
    }
    return (double) total / ticks.length;
}`,
      hint: "Add every item to <code>total</code> in a loop. Then divide, but make one side a double first: <code>(double) total / ticks.length</code>. Check <code>ticks.length == 0</code> before dividing.",
      tests: [[A("int", [100, 101])], [A("int", [10, 20, 30, 41])], [A("int", [])], [A("int", [-5])], [A("int", [3, 4])]],
    },
    {
      id: "ramp", topic: "Control", title: "Smooth acceleration",
      intro: "Jumping straight to full power makes robots skid. Move <code>current</code> toward <code>target</code> by at most <code>0.05</code> per loop. If it's already within 0.05, return <code>target</code>.",
      method: "ramp", returns: "double", params: ["current", "target"],
      template: `double ramp(double current, double target) {
    // Your code here

    return target;
}`,
      solution: `double ramp(double current, double target) {
    double diff = target - current;
    if (Math.abs(diff) <= 0.05) {
        return target;
    }
    return current + Math.signum(diff) * 0.05;
}`,
      hint: "Find <code>diff = target - current</code>. If it's small, return the target. Otherwise add 0.05 in the right direction: <code>Math.signum(diff)</code> is 1.0 or -1.0.",
      tests: [[D(0), D(1)], [D(0.5), D(0.52)], [D(0.3), D(-1)], [D(1), D(1)], [D(-0.2), D(0)]],
    },
  ];

  /* ------------------------------------------------------------ Level 3 */
  const SETUP = `        DcMotor left = hardwareMap.get(DcMotor.class, "left");
        DcMotor right = hardwareMap.get(DcMotor.class, "right");`;
  const DRIVE_HELPER = `    // Drives straight for a distance using the left encoder.
    void driveInches(double inches, double power) {
        int start = left.getCurrentPosition();
        int target = (int) Math.round(inches * TICKS_PER_INCH);
        left.setPower(power);
        right.setPower(power);
        while (opModeIsActive() && left.getCurrentPosition() - start < target) {
            idle();
        }
        left.setPower(0);
        right.setPower(0);
        sleep(250);
    }`;
  const HEADING = `    // The robot's heading in degrees. Positive = turned left.
    double heading() {
        return imu.getRobotYawPitchRollAngles().getYaw(AngleUnit.DEGREES);
    }`;
  const TURN_SOLUTION = `    // Spins in place until the heading is within 1 degree of target.
    void turnTo(double target) {
        double error = target - heading();
        while (opModeIsActive() && Math.abs(error) > 1) {
            double power = Range.clip(error * 0.02, -0.4, 0.4);
            if (Math.abs(power) < 0.08) {
                power = 0.08 * Math.signum(power);
            }
            left.setPower(-power);
            right.setPower(power);
            error = target - heading();
        }
        left.setPower(0);
        right.setPower(0);
        sleep(250);
    }`;
  const FIELDS = (extra = "") => `    DcMotor left, right;
    IMU imu;${extra}
    static final double TICKS_PER_INCH = 45.3;   // goBILDA 312 rpm motor, 96 mm wheel
`;
  const INIT = (extra = "") => `        left = hardwareMap.get(DcMotor.class, "left");
        right = hardwareMap.get(DcMotor.class, "right");
        imu = hardwareMap.get(IMU.class, "imu");${extra}
        imu.initialize(new IMU.Parameters(new RevHubOrientationOnRobot(
                RevHubOrientationOnRobot.LogoFacingDirection.UP,
                RevHubOrientationOnRobot.UsbFacingDirection.FORWARD)));
        right.setDirection(DcMotor.Direction.REVERSE);
        left.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);
        right.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);
        imu.resetYaw();`;

  const MEC_SETUP = `        DcMotor frontLeft = hardwareMap.get(DcMotor.class, "frontLeft");
        DcMotor frontRight = hardwareMap.get(DcMotor.class, "frontRight");
        DcMotor backLeft = hardwareMap.get(DcMotor.class, "backLeft");
        DcMotor backRight = hardwareMap.get(DcMotor.class, "backRight");
        frontRight.setDirection(DcMotor.Direction.REVERSE);
        backRight.setDirection(DcMotor.Direction.REVERSE);`;
  const TANK_SETUP = `        DcMotor left = hardwareMap.get(DcMotor.class, "left");
        DcMotor right = hardwareMap.get(DcMotor.class, "right");
        right.setDirection(DcMotor.Direction.REVERSE);`;

  const CHALLENGES = [
    {
      id: "first", title: "First drive", topic: "Motors and sleep",
      brief: "Drive forward into the blue parking zone and stop there. Set both motors' power, wait with <code>sleep()</code>, then set the power back to 0.",
      start: { x: 36, y: 16, h: 0 },
      zones: [{ id: "park", x: 24, y: 60, w: 24, h: 24, label: "parking zone", color: "blue" }],
      goals: [{ type: "park", zone: "park" }, { type: "noWall" }],
      template: `@Autonomous(name = "First Drive")
public class FirstDrive extends LinearOpMode {

    @Override
    public void runOpMode() {
${SETUP}
        right.setDirection(DcMotor.Direction.REVERSE);

        waitForStart();

        // Drive forward into the parking zone, then stop.
        // Try power 0.5 and sleep(2000), which waits 2000 ms (2 seconds).

    }
}`,
      solution: `@Autonomous(name = "First Drive")
public class FirstDrive extends LinearOpMode {

    @Override
    public void runOpMode() {
${SETUP}
        right.setDirection(DcMotor.Direction.REVERSE);

        waitForStart();

        left.setPower(0.5);
        right.setPower(0.5);
        sleep(1900);
        left.setPower(0);
        right.setPower(0);
    }
}`,
      hints: ["Three steps: <code>left.setPower(0.5);</code> and <code>right.setPower(0.5);</code>, then <code>sleep(2000);</code>, then set both powers to <code>0</code>.", "If you stop short, sleep longer. If you overshoot, sleep less. At power 0.5 this robot drives about 30 inches per second."],
      battery: "full",
    },
    {
      id: "spin", title: "Why does it spin?", topic: "Motor direction",
      brief: "This program should drive straight into the zone, but the robot spins in place. Add <b>one line</b> to fix it.",
      start: { x: 108, y: 16, h: 0 },
      zones: [{ id: "park", x: 96, y: 60, w: 24, h: 24, label: "parking zone", color: "blue" }],
      goals: [{ type: "park", zone: "park" }, { type: "noWall" }],
      template: `@Autonomous(name = "Spin Fix")
public class SpinFix extends LinearOpMode {

    @Override
    public void runOpMode() {
${SETUP}

        waitForStart();

        left.setPower(0.5);
        right.setPower(0.5);
        sleep(1900);
        left.setPower(0);
        right.setPower(0);
    }
}`,
      solution: `@Autonomous(name = "Spin Fix")
public class SpinFix extends LinearOpMode {

    @Override
    public void runOpMode() {
${SETUP}
        right.setDirection(DcMotor.Direction.REVERSE);

        waitForStart();

        left.setPower(0.5);
        right.setPower(0.5);
        sleep(1900);
        left.setPower(0);
        right.setPower(0);
    }
}`,
      hints: ["The two drive motors face opposite directions on the robot, so the same power turns their wheels opposite ways.", "Before <code>waitForStart()</code>, add <code>right.setDirection(DcMotor.Direction.REVERSE);</code>"],
      battery: "full",
    },
    {
      id: "encoders", title: "Encoders beat timers", topic: "Encoders",
      brief: "The parking zone is only 12 inches deep, and this robot's battery changes every run, so <code>sleep()</code> timing won't be reliable. Drive <b>48 inches</b> using the encoder: keep driving while <code>left.getCurrentPosition()</code> is less than the target.",
      start: { x: 72, y: 16, h: 0 },
      zones: [{ id: "park", x: 60, y: 60, w: 24, h: 12, label: "parking zone", color: "blue" }],
      goals: [{ type: "park", zone: "park" }, { type: "noWall" }],
      template: `@Autonomous(name = "Encoder Drive")
public class EncoderDrive extends LinearOpMode {

    static final double TICKS_PER_INCH = 45.3;   // goBILDA 312 rpm motor, 96 mm wheel

    @Override
    public void runOpMode() {
${SETUP}
        right.setDirection(DcMotor.Direction.REVERSE);
        left.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);
        left.setMode(DcMotor.RunMode.RUN_WITHOUT_ENCODER);

        waitForStart();

        int target = (int) Math.round(48 * TICKS_PER_INCH);

        // 1. Start both motors.
        // 2. Loop while opModeIsActive() and the left encoder is below target.
        //    Show the encoder with telemetry inside the loop.
        // 3. Stop both motors.

    }
}`,
      solution: `@Autonomous(name = "Encoder Drive")
public class EncoderDrive extends LinearOpMode {

    static final double TICKS_PER_INCH = 45.3;   // goBILDA 312 rpm motor, 96 mm wheel

    @Override
    public void runOpMode() {
${SETUP}
        right.setDirection(DcMotor.Direction.REVERSE);
        left.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);
        left.setMode(DcMotor.RunMode.RUN_WITHOUT_ENCODER);

        waitForStart();

        int target = (int) Math.round(48 * TICKS_PER_INCH);

        left.setPower(0.5);
        right.setPower(0.5);
        while (opModeIsActive() && left.getCurrentPosition() < target) {
            telemetry.addData("Ticks", left.getCurrentPosition());
            telemetry.addData("Target", target);
            telemetry.update();
        }
        left.setPower(0);
        right.setPower(0);
    }
}`,
      hints: ["Set both powers to 0.5 first. Then write <code>while (opModeIsActive() && left.getCurrentPosition() < target) { ... }</code>.", "Inside the loop, <code>telemetry.addData(\"Ticks\", left.getCurrentPosition());</code> and <code>telemetry.update();</code> let you watch it count. After the loop, set both powers to 0."],
      battery: "random",
    },
    {
      id: "rtp", title: "Run to position", topic: "Encoders",
      brief: "Let the motor controller do the work. Give both motors a target of <b>56 inches</b> in ticks, switch them to <code>RUN_TO_POSITION</code>, set a power, and wait while they're busy.",
      start: { x: 72, y: 16, h: 0 },
      zones: [{ id: "park", x: 60, y: 66, w: 24, h: 12, label: "parking zone", color: "blue" }],
      goals: [{ type: "park", zone: "park" }, { type: "noWall" }],
      template: `@Autonomous(name = "Run To Position")
public class RunToPosition extends LinearOpMode {

    static final double TICKS_PER_INCH = 45.3;

    @Override
    public void runOpMode() {
${SETUP}
        right.setDirection(DcMotor.Direction.REVERSE);
        left.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);
        right.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);

        waitForStart();

        int target = (int) Math.round(56 * TICKS_PER_INCH);

        // 1. setTargetPosition(target) on both motors
        // 2. setMode(DcMotor.RunMode.RUN_TO_POSITION) on both motors
        // 3. setPower(0.6) on both motors
        // 4. wait while (opModeIsActive() && (left.isBusy() || right.isBusy()))
        // 5. set both powers to 0

    }
}`,
      solution: `@Autonomous(name = "Run To Position")
public class RunToPosition extends LinearOpMode {

    static final double TICKS_PER_INCH = 45.3;

    @Override
    public void runOpMode() {
${SETUP}
        right.setDirection(DcMotor.Direction.REVERSE);
        left.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);
        right.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);

        waitForStart();

        int target = (int) Math.round(56 * TICKS_PER_INCH);

        left.setTargetPosition(target);
        right.setTargetPosition(target);
        left.setMode(DcMotor.RunMode.RUN_TO_POSITION);
        right.setMode(DcMotor.RunMode.RUN_TO_POSITION);
        left.setPower(0.6);
        right.setPower(0.6);
        while (opModeIsActive() && (left.isBusy() || right.isBusy())) {
            telemetry.addData("Left", left.getCurrentPosition());
            telemetry.addData("Right", right.getCurrentPosition());
            telemetry.update();
        }
        left.setPower(0);
        right.setPower(0);
    }
}`,
      hints: ["Order matters: <code>setTargetPosition</code> must come <i>before</i> <code>setMode(DcMotor.RunMode.RUN_TO_POSITION)</code>, or the motor throws an error.", "In RUN_TO_POSITION, <code>setPower(0.6)</code> is the top speed. The motor slows down by itself near the target. <code>isBusy()</code> turns false once it arrives."],
      battery: "random",
    },
    {
      id: "turn", title: "Turn with the IMU", topic: "IMU and methods",
      brief: "Drive up, turn left 90°, and park in the zone. <code>driveInches</code> and <code>heading()</code> are written for you. Finish <code>turnTo(target)</code>: spin in place until <code>heading()</code> is close to the target. Watch out: the robot keeps turning a little after the motors stop.",
      start: { x: 108, y: 16, h: 0 },
      zones: [{ id: "park", x: 36, y: 60, w: 24, h: 24, label: "parking zone", color: "blue" }],
      goals: [{ type: "park", zone: "park" }, { type: "noWall" }],
      template: `@Autonomous(name = "IMU Turn")
public class ImuTurn extends LinearOpMode {

${FIELDS()}
    @Override
    public void runOpMode() {
${INIT()}

        waitForStart();

        driveInches(56, 0.5);
        turnTo(90);           // 90 = a quarter turn to the left
        driveInches(60, 0.5);
    }

${DRIVE_HELPER}

${HEADING}

    // Spin in place until heading() is within a degree or two of target.
    // To turn left: left motor backward (negative), right motor forward.
    void turnTo(double target) {
        // Your code here

    }
}`,
      solution: `@Autonomous(name = "IMU Turn")
public class ImuTurn extends LinearOpMode {

${FIELDS()}
    @Override
    public void runOpMode() {
${INIT()}

        waitForStart();

        driveInches(56, 0.5);
        turnTo(90);           // 90 = a quarter turn to the left
        driveInches(60, 0.5);
    }

${DRIVE_HELPER}

${HEADING}

${TURN_SOLUTION}
}`,
      hints: ["Start simple: set <code>left.setPower(-0.3)</code> and <code>right.setPower(0.3)</code>, loop <code>while (opModeIsActive() && heading() < target)</code>, then stop. Run it and look at where it ends up.", "It overshoots because the robot coasts. Slow down near the target: make the power proportional to the error, like <code>double power = Range.clip((target - heading()) * 0.02, -0.4, 0.4);</code>, and loop until the error is under 1°."],
      battery: "random",
    },
    {
      id: "sample", title: "Score a sample", topic: "Servos and sequencing",
      brief: "Drive up to the yellow sample, close the claw to grab it, turn toward the basket, drive there, and open the claw to drop it in. The claw is <code>1.0</code> open and <code>0.0</code> closed. The claw reaches 12 inches in front of the robot's center. Both helpers are ready to use.",
      start: { x: 72, y: 16, h: 0 },
      sample: { x: 72, y: 72 },
      zones: [{ id: "basket", x: 108, y: 108, w: 36, h: 36, label: "basket", color: "yellow" }],
      goals: [{ type: "sample", zone: "basket" }, { type: "noWall" }],
      devices: { left: "motor", right: "motor", imu: "imu", claw: "servo" },
      template: `@Autonomous(name = "Score Sample")
public class ScoreSample extends LinearOpMode {

${FIELDS("\n    Servo claw;")}
    @Override
    public void runOpMode() {
${INIT('\n        claw = hardwareMap.get(Servo.class, "claw");')}
        claw.setPosition(1.0);   // start with the claw open

        waitForStart();

        // 1. Drive until the claw reaches the sample (about 44 inches).
        // 2. Close the claw and give it half a second.
        // 3. Turn to face the basket (turning right = negative heading).
        // 4. Drive to the basket and open the claw.

    }

${DRIVE_HELPER}

${HEADING}

${TURN_SOLUTION}
}`,
      solution: `@Autonomous(name = "Score Sample")
public class ScoreSample extends LinearOpMode {

${FIELDS("\n    Servo claw;")}
    @Override
    public void runOpMode() {
${INIT('\n        claw = hardwareMap.get(Servo.class, "claw");')}
        claw.setPosition(1.0);   // start with the claw open

        waitForStart();

        driveInches(44, 0.5);
        claw.setPosition(0.0);   // grab
        sleep(500);
        turnTo(-45);
        driveInches(64, 0.5);
        claw.setPosition(1.0);   // drop
        sleep(500);
    }

${DRIVE_HELPER}

${HEADING}

${TURN_SOLUTION}
}`,
      hints: ["<code>driveInches(44, 0.5);</code> brings the claw to the sample. Then <code>claw.setPosition(0.0);</code> and <code>sleep(500);</code> so it has time to close.", "The basket is up and to the right, so turn to <code>-45</code> degrees (negative = right), then drive about 64 inches before opening the claw."],
      battery: "random",
    },
    {
      id: "route", title: "The long route", topic: "Methods",
      brief: "Pass checkpoint A, then B, then park in the zone. This time there are no helpers: write your own <code>driveInches</code> and <code>turnTo</code> methods (you can reuse what you learned), then call them from <code>runOpMode()</code>.",
      start: { x: 24, y: 16, h: 0 },
      checkpoints: [{ x: 24, y: 64, label: "A" }, { x: 100, y: 64, label: "B" }],
      zones: [{ id: "park", x: 88, y: 112, w: 24, h: 24, label: "parking zone", color: "blue" }],
      goals: [{ type: "checkpoints" }, { type: "park", zone: "park" }, { type: "noWall" }],
      template: `@Autonomous(name = "Long Route")
public class LongRoute extends LinearOpMode {

${FIELDS()}
    @Override
    public void runOpMode() {
${INIT()}

        waitForStart();

        // Plan: up 48 in to A, turn right to face B (-90), drive 76 in,
        // turn back to 0, then drive 60 in into the zone.

    }

    // Write your helper methods here: driveInches, heading, turnTo...

}`,
      solution: `@Autonomous(name = "Long Route")
public class LongRoute extends LinearOpMode {

${FIELDS()}
    @Override
    public void runOpMode() {
${INIT()}

        waitForStart();

        driveInches(48, 0.5);
        turnTo(-90);
        driveInches(76, 0.5);
        turnTo(0);
        driveInches(60, 0.5);
    }

${DRIVE_HELPER}

${HEADING}

${TURN_SOLUTION}
}`,
      hints: ["A method is a named block you can call again and again. Start by copying <code>driveInches</code> and <code>heading()</code> from the earlier challenges, below runOpMode() but inside the class.", "The route: <code>driveInches(48, 0.5)</code>, <code>turnTo(-90)</code>, <code>driveInches(76, 0.5)</code>, <code>turnTo(0)</code>, <code>driveInches(60, 0.5)</code>."],
      battery: "random",
    },
    {
      id: "strafe", title: "Strafe to park", topic: "Mecanum drive",
      brief: "This robot has <b>mecanum wheels</b>, so it can slide sideways. Strafe <b>72 inches to the right</b> into the zone without turning. Strafing covers about 85% as much ground as driving forward, so it needs more encoder ticks per inch.",
      start: { x: 36, y: 40, h: 0 },
      zones: [{ id: "park", x: 96, y: 28, w: 24, h: 24, label: "parking zone", color: "blue" }],
      goals: [{ type: "park", zone: "park" }, { type: "noWall" }],
      devices: { frontLeft: "motor", frontRight: "motor", backLeft: "motor", backRight: "motor", imu: "imu" },
      template: `@Autonomous(name = "Strafe Park")
public class StrafePark extends LinearOpMode {

    static final double TICKS_PER_INCH = 45.3;

    @Override
    public void runOpMode() {
${MEC_SETUP}

        waitForStart();

        int target = (int) Math.round(72 * TICKS_PER_INCH / 0.85);

        // Strafe right: frontLeft +, backLeft -, frontRight -, backRight +
        // Keep going while frontLeft's encoder is below target, then stop all four.

    }
}`,
      solution: `@Autonomous(name = "Strafe Park")
public class StrafePark extends LinearOpMode {

    static final double TICKS_PER_INCH = 45.3;

    @Override
    public void runOpMode() {
${MEC_SETUP}

        waitForStart();

        int target = (int) Math.round(72 * TICKS_PER_INCH / 0.85);

        frontLeft.setPower(0.5);
        backLeft.setPower(-0.5);
        frontRight.setPower(-0.5);
        backRight.setPower(0.5);
        while (opModeIsActive() && frontLeft.getCurrentPosition() < target) {
            telemetry.addData("Ticks", frontLeft.getCurrentPosition());
            telemetry.update();
        }
        frontLeft.setPower(0);
        backLeft.setPower(0);
        frontRight.setPower(0);
        backRight.setPower(0);
    }
}`,
      hints: ["Strafing right means the front-left and back-right wheels spin forward while the other two spin backward: <code>frontLeft.setPower(0.5); backLeft.setPower(-0.5); frontRight.setPower(-0.5); backRight.setPower(0.5);</code>", "Loop <code>while (opModeIsActive() && frontLeft.getCurrentPosition() < target)</code>, then set all four powers to 0."],
      battery: "random",
    },
    {
      id: "barrier", title: "Around the barrier", topic: "Planning a path",
      brief: "A barrier blocks the way to the parking zone. Plan a path around it with the helpers: up a little, left past the barrier, up the side, then right into the zone. Touching the barrier or a wall fails the run.",
      start: { x: 72, y: 16, h: 0 },
      obstacles: [{ x: 48, y: 56, w: 48, h: 8 }],
      zones: [{ id: "park", x: 60, y: 100, w: 24, h: 24, label: "parking zone", color: "blue" }],
      goals: [{ type: "park", zone: "park" }, { type: "noWall", text: "Don't touch the barrier or the walls" }],
      template: `@Autonomous(name = "Around The Barrier")
public class AroundTheBarrier extends LinearOpMode {

${FIELDS()}
    @Override
    public void runOpMode() {
${INIT()}

        waitForStart();

        // Plan: forward 24 in, turn left (90), drive 40 in,
        // turn back to 0, drive 72 in, turn right (-90), drive 40 in.

    }

${DRIVE_HELPER}

${HEADING}

${TURN_SOLUTION}
}`,
      solution: `@Autonomous(name = "Around The Barrier")
public class AroundTheBarrier extends LinearOpMode {

${FIELDS()}
    @Override
    public void runOpMode() {
${INIT()}

        waitForStart();

        driveInches(24, 0.5);
        turnTo(90);
        driveInches(40, 0.5);
        turnTo(0);
        driveInches(72, 0.5);
        turnTo(-90);
        driveInches(40, 0.5);
    }

${DRIVE_HELPER}

${HEADING}

${TURN_SOLUTION}
}`,
      hints: ["Sketch it first: the barrier is 48 inches wide in the middle of the field. Going around the left side needs about 40 inches of clearance from the center.", "<code>driveInches(24, 0.5); turnTo(90); driveInches(40, 0.5); turnTo(0); driveInches(72, 0.5); turnTo(-90); driveInches(40, 0.5);</code>"],
      battery: "random",
    },
    {
      id: "tank", mode: "teleop", title: "Tank drive", topic: "Gamepad",
      brief: "Your first <b>TeleOp</b>: you drive! The left stick powers the left wheels and the right stick the right wheels. Write the code inside the loop, press Run, then drive through A and B and park. Use the on-screen sticks, the keyboard (W/S and ↑/↓), or plug in a controller.",
      start: { x: 72, y: 16, h: 0 },
      checkpoints: [{ x: 72, y: 60, label: "A" }, { x: 112, y: 100, label: "B" }],
      zones: [{ id: "park", x: 12, y: 108, w: 28, h: 28, label: "parking zone", color: "blue" }],
      goals: [{ type: "checkpoints" }, { type: "park", zone: "park" }],
      template: `@TeleOp(name = "Tank Drive")
public class TankDrive extends LinearOpMode {

    @Override
    public void runOpMode() {
${TANK_SETUP}

        waitForStart();

        while (opModeIsActive()) {
            // Left stick drives the left wheels, right stick the right wheels.
            // Pushing a stick forward gives a NEGATIVE y value.


            telemetry.update();
        }
    }
}`,
      solution: `@TeleOp(name = "Tank Drive")
public class TankDrive extends LinearOpMode {

    @Override
    public void runOpMode() {
${TANK_SETUP}

        waitForStart();

        while (opModeIsActive()) {
            double leftPower = -gamepad1.left_stick_y;
            double rightPower = -gamepad1.right_stick_y;
            left.setPower(leftPower);
            right.setPower(rightPower);

            telemetry.addData("Left", leftPower);
            telemetry.addData("Right", rightPower);
            telemetry.update();
        }
    }
}`,
      hints: ["Inside the loop: <code>left.setPower(-gamepad1.left_stick_y);</code> and <code>right.setPower(-gamepad1.right_stick_y);</code> The minus sign makes forward on the stick mean forward on the robot.", "Keyboard: W and S move the left stick, ↑ and ↓ move the right stick. Push both forward to drive straight, one forward and one back to spin."],
      battery: "full",
    },
    {
      id: "arcade", mode: "teleop", title: "Arcade drive + slow mode", topic: "Gamepad",
      brief: "Arcade drive: the <b>left stick</b> moves forward and back, the <b>right stick</b> turns. Hold the <b>right bumper</b> for slow mode (40% power) to thread between the barriers without touching them.",
      start: { x: 24, y: 16, h: 0 },
      obstacles: [{ x: 0, y: 44, w: 76, h: 6 }, { x: 68, y: 92, w: 76, h: 6 }],
      checkpoints: [{ x: 112, y: 46, label: "A" }, { x: 30, y: 96, label: "B" }],
      zones: [{ id: "park", x: 96, y: 112, w: 28, h: 26, label: "parking zone", color: "blue" }],
      goals: [{ type: "checkpoints" }, { type: "park", zone: "park" }, { type: "noWall", text: "Don't touch the barriers or the walls" }],
      template: `@TeleOp(name = "Arcade Drive")
public class ArcadeDrive extends LinearOpMode {

    @Override
    public void runOpMode() {
${TANK_SETUP}

        waitForStart();

        while (opModeIsActive()) {
            double drive = -gamepad1.left_stick_y;   // forward and back
            double turn = gamepad1.right_stick_x;    // left and right

            // 1. If the right bumper is held, multiply drive and turn by 0.4.
            // 2. Left wheels get drive + turn, right wheels get drive - turn.


            telemetry.update();
        }
    }
}`,
      solution: `@TeleOp(name = "Arcade Drive")
public class ArcadeDrive extends LinearOpMode {

    @Override
    public void runOpMode() {
${TANK_SETUP}

        waitForStart();

        while (opModeIsActive()) {
            double drive = -gamepad1.left_stick_y;   // forward and back
            double turn = gamepad1.right_stick_x;    // left and right

            if (gamepad1.right_bumper) {
                drive = drive * 0.4;
                turn = turn * 0.4;
            }
            left.setPower(Range.clip(drive + turn, -1.0, 1.0));
            right.setPower(Range.clip(drive - turn, -1.0, 1.0));

            telemetry.addData("Slow mode", gamepad1.right_bumper);
            telemetry.update();
        }
    }
}`,
      hints: ["<code>if (gamepad1.right_bumper) { drive = drive * 0.4; turn = turn * 0.4; }</code>", "<code>left.setPower(drive + turn);</code> and <code>right.setPower(drive - turn);</code> Wrap each in <code>Range.clip(..., -1.0, 1.0)</code> to keep it in range. Keyboard: W/S drive, ←/→ turn, E is the right bumper."],
      battery: "full",
    },
    {
      id: "mecanumtele", mode: "teleop", title: "Mecanum TeleOp", topic: "Mecanum drive",
      brief: "Drive a mecanum robot: left stick moves (including sideways), right stick turns. Finish the four wheel powers, keeping them in proportion. Then slide through A and B without turning much, and park.",
      start: { x: 72, y: 20, h: 0 },
      devices: { frontLeft: "motor", frontRight: "motor", backLeft: "motor", backRight: "motor", imu: "imu" },
      checkpoints: [{ x: 24, y: 64, label: "A" }, { x: 120, y: 64, label: "B" }],
      zones: [{ id: "park", x: 58, y: 108, w: 28, h: 28, label: "parking zone", color: "blue" }],
      goals: [{ type: "checkpoints" }, { type: "park", zone: "park" }],
      template: `@TeleOp(name = "Mecanum Drive")
public class MecanumDrive extends LinearOpMode {

    @Override
    public void runOpMode() {
${MEC_SETUP}

        waitForStart();

        while (opModeIsActive()) {
            double y = -gamepad1.left_stick_y;   // forward
            double x = gamepad1.left_stick_x;    // strafe right
            double rx = gamepad1.right_stick_x;  // turn right

            double denominator = Math.max(Math.abs(y) + Math.abs(x) + Math.abs(rx), 1);
            // frontLeft = (y + x + rx), backLeft = (y - x + rx),
            // frontRight = (y - x - rx), backRight = (y + x - rx), each divided by denominator


            telemetry.update();
        }
    }
}`,
      solution: `@TeleOp(name = "Mecanum Drive")
public class MecanumDrive extends LinearOpMode {

    @Override
    public void runOpMode() {
${MEC_SETUP}

        waitForStart();

        while (opModeIsActive()) {
            double y = -gamepad1.left_stick_y;   // forward
            double x = gamepad1.left_stick_x;    // strafe right
            double rx = gamepad1.right_stick_x;  // turn right

            double denominator = Math.max(Math.abs(y) + Math.abs(x) + Math.abs(rx), 1);
            frontLeft.setPower((y + x + rx) / denominator);
            backLeft.setPower((y - x + rx) / denominator);
            frontRight.setPower((y - x - rx) / denominator);
            backRight.setPower((y + x - rx) / denominator);

            telemetry.addData("Forward", y);
            telemetry.addData("Strafe", x);
            telemetry.update();
        }
    }
}`,
      hints: ["Four lines, one per wheel: <code>frontLeft.setPower((y + x + rx) / denominator);</code> and so on, following the comments.", "Keyboard: W/A/S/D is the left stick (A and D strafe), ←/→ turn."],
      battery: "full",
    },
    {
      id: "toggle", mode: "teleop", title: "Claw toggle", topic: "TeleOp buttons",
      brief: "Driving works already. Make the <b>A button</b> toggle the claw: one press closes it, the next press opens it. Then grab the sample and drop it in the basket. If you just flip it whenever A is down, it'll flicker, so only toggle when A was <i>just</i> pressed.",
      start: { x: 72, y: 16, h: 0 },
      sample: { x: 72, y: 80 },
      zones: [{ id: "basket", x: 108, y: 108, w: 36, h: 36, label: "basket", color: "yellow" }],
      goals: [{ type: "sample", zone: "basket" }],
      devices: { left: "motor", right: "motor", imu: "imu", claw: "servo" },
      template: `@TeleOp(name = "Claw Toggle")
public class ClawToggle extends LinearOpMode {

    @Override
    public void runOpMode() {
${TANK_SETUP}
        Servo claw = hardwareMap.get(Servo.class, "claw");

        boolean clawClosed = false;
        boolean lastA = false;

        waitForStart();

        while (opModeIsActive()) {
            double drive = -gamepad1.left_stick_y;
            double turn = gamepad1.right_stick_x;
            left.setPower(Range.clip(drive + turn, -1.0, 1.0));
            right.setPower(Range.clip(drive - turn, -1.0, 1.0));

            // Toggle clawClosed only when A was just pressed (down now, up last loop).
            // Then set the claw: 0.0 is closed, 1.0 is open.


            telemetry.addData("Claw closed", clawClosed);
            telemetry.update();
        }
    }
}`,
      solution: `@TeleOp(name = "Claw Toggle")
public class ClawToggle extends LinearOpMode {

    @Override
    public void runOpMode() {
${TANK_SETUP}
        Servo claw = hardwareMap.get(Servo.class, "claw");

        boolean clawClosed = false;
        boolean lastA = false;

        waitForStart();

        while (opModeIsActive()) {
            double drive = -gamepad1.left_stick_y;
            double turn = gamepad1.right_stick_x;
            left.setPower(Range.clip(drive + turn, -1.0, 1.0));
            right.setPower(Range.clip(drive - turn, -1.0, 1.0));

            if (gamepad1.a && !lastA) {
                clawClosed = !clawClosed;
            }
            lastA = gamepad1.a;
            claw.setPosition(clawClosed ? 0.0 : 1.0);

            telemetry.addData("Claw closed", clawClosed);
            telemetry.update();
        }
    }
}`,
      hints: ["<code>if (gamepad1.a && !lastA) { clawClosed = !clawClosed; }</code> then <code>lastA = gamepad1.a;</code>", "Set the servo every loop: <code>claw.setPosition(clawClosed ? 0.0 : 1.0);</code> Keyboard: J is the A button."],
      battery: "full",
    },
  ];

  /* ------------------------------------------------------------ Lessons */
  const LESSONS = [
    { id: "opmode", title: "What's an OpMode?", body: `<p>An <b>OpMode</b> is one program the robot can run, picked from the Driver Station. Autonomous ones run by themselves for the first 30 seconds of a match; TeleOp ones let drivers control the robot for 2 minutes.</p>
<p>A <code>LinearOpMode</code> runs <code>runOpMode()</code> from top to bottom. Everything before <code>waitForStart()</code> happens when the driver presses <b>INIT</b>: set up hardware there, but don't move. After <b>START</b>, the rest runs. Long loops check <code>opModeIsActive()</code> so the STOP button works.</p>`,
      code: `@Autonomous(name = "My Auto")
public class MyAuto extends LinearOpMode {
    @Override
    public void runOpMode() {
        // INIT: set up hardware here
        waitForStart();
        // START: the match is on
        while (opModeIsActive()) {
            // repeat until STOP or time runs out
        }
    }
}` },
    { id: "java", title: "Variables and types", body: `<p>A variable holds a value, and its <b>type</b> says what kind. The ones you'll use most:</p>
<ul><li><code>int</code>: whole numbers, like encoder ticks (<code>1200</code>)</li><li><code>double</code>: numbers with decimals, like motor power (<code>0.75</code>)</li><li><code>boolean</code>: <code>true</code> or <code>false</code>, like a button</li><li><code>String</code>: text in double quotes</li></ul>
<p>Watch out: dividing two ints gives an int, so <code>7 / 2</code> is <code>3</code>. Write <code>7 / 2.0</code> to keep the decimals. To turn a double into an int, cast it: <code>(int) Math.round(x)</code>.</p>`,
      code: `int ticks = 1200;
double power = 0.75;
boolean slow = gamepad1.right_bumper;
double half = ticks / 2.0;           // 600.0
int target = (int) Math.round(48.6); // 49` },
    { id: "motors", title: "Motors and power", body: `<p>Get each motor from the robot's configuration by name, then set its power from <code>-1.0</code> (full reverse) to <code>1.0</code> (full forward). <code>0</code> stops it.</p>
<p>The motors on each side of a drivetrain face opposite ways, so one side needs <code>setDirection(DcMotor.Direction.REVERSE)</code> for positive power to mean forward on both. Motors keep the last power you set until you change it.</p>`,
      code: `DcMotor left = hardwareMap.get(DcMotor.class, "left");
DcMotor right = hardwareMap.get(DcMotor.class, "right");
right.setDirection(DcMotor.Direction.REVERSE);

left.setPower(0.5);
right.setPower(0.5);
sleep(1000);       // drive for 1 second
left.setPower(0);
right.setPower(0);` },
    { id: "loops", title: "Loops and timing", body: `<p>A <code>while</code> loop repeats as long as its condition is true. In a LinearOpMode, always include <code>opModeIsActive()</code> so STOP works.</p>
<p><code>sleep(ms)</code> pauses your whole program. That's fine in autonomous, but never in a TeleOp loop: the robot would ignore the drivers. To wait without freezing, use an <code>ElapsedTime</code> timer and check <code>timer.seconds()</code>.</p>`,
      code: `ElapsedTime timer = new ElapsedTime();
waitForStart();
timer.reset();
while (opModeIsActive() && timer.seconds() < 2.0) {
    telemetry.addData("Time", timer.seconds());
    telemetry.update();
}` },
    { id: "gamepad", title: "Reading the gamepad", body: `<p><code>gamepad1</code> is the driver's controller and <code>gamepad2</code> the operator's. Sticks give doubles from -1.0 to 1.0, and buttons are booleans.</p>
<p>The big gotcha: pushing a stick <b>up</b> gives a <b>negative</b> y. That's why drive code uses <code>-gamepad1.left_stick_y</code>. Read the gamepad inside your loop so the robot reacts every cycle.</p>`,
      code: `while (opModeIsActive()) {
    double drive = -gamepad1.left_stick_y;  // up = positive
    double turn = gamepad1.right_stick_x;
    left.setPower(drive + turn);
    right.setPower(drive - turn);
    if (gamepad1.a) {
        claw.setPosition(0.0);
    }
}` },
    { id: "telemetry", title: "Telemetry", body: `<p>Telemetry shows values on the Driver Station screen, which is the best way to see what your code is thinking. Add lines with <code>addData</code>, then send them with <code>update()</code>, usually once per loop.</p>`,
      code: `telemetry.addData("Power", power);
telemetry.addData("Ticks", left.getCurrentPosition());
telemetry.addData("Heading", "%.1f deg", heading());
telemetry.update();` },
    { id: "encoders", title: "Encoders", body: `<p>An encoder counts how far a motor has turned, in <b>ticks</b>. For this robot one wheel turn is 537.7 ticks and moves π × 3.78 inches, so 1 inch is about <b>45.3 ticks</b>.</p>
<p>Drive by distance instead of time, because timing changes with the battery. Either loop until <code>getCurrentPosition()</code> reaches a target, or let the motor do it: <code>setTargetPosition</code>, then <code>setMode(RUN_TO_POSITION)</code>, then <code>setPower</code>, and wait while <code>isBusy()</code>.</p>`,
      code: `int target = (int) Math.round(24 * 45.3);   // 24 inches
left.setTargetPosition(target);
left.setMode(DcMotor.RunMode.RUN_TO_POSITION);
left.setPower(0.5);
while (opModeIsActive() && left.isBusy()) {
    idle();
}` },
    { id: "imu", title: "The IMU and turning", body: `<p>The IMU measures which way the robot faces. <code>getYaw</code> gives degrees from -180 to 180; turning left makes it <b>positive</b>. Call <code>resetYaw()</code> at the start so the robot's starting direction is 0.</p>
<p>Robots coast after the motors stop, so a turn that stops exactly at the target overshoots. Slow down as you get close: make the power proportional to how far you have left to turn.</p>`,
      code: `double heading = imu.getRobotYawPitchRollAngles().getYaw(AngleUnit.DEGREES);
double error = 90 - heading;            // how far to go
double power = Range.clip(error * 0.02, -0.4, 0.4);
left.setPower(-power);                  // turn left
right.setPower(power);` },
    { id: "servos", title: "Servos", body: `<p>A servo moves to a <b>position</b>, not a speed. Positions go from <code>0.0</code> to <code>1.0</code> across its range (about 0° to 180° on a typical servo). Claws, wrists, and launch triggers usually use servos.</p>
<p>Servos take a moment to get there, so add a short <code>sleep</code> in autonomous before driving away with something you just grabbed.</p>`,
      code: `Servo claw = hardwareMap.get(Servo.class, "claw");
claw.setPosition(1.0);   // open
sleep(500);
claw.setPosition(0.0);   // closed` },
    { id: "methods", title: "Methods", body: `<p>A method is a named block of code you can run again and again. Parameters pass values in, and <code>return</code> sends a value back (or the method is <code>void</code>).</p>
<p>Helpers like <code>driveInches</code> and <code>turnTo</code> make autonomous code short and readable. Write them inside your class but outside <code>runOpMode()</code>.</p>`,
      code: `void driveInches(double inches, double power) {
    int target = left.getCurrentPosition() + (int) Math.round(inches * 45.3);
    left.setPower(power);
    right.setPower(power);
    while (opModeIsActive() && left.getCurrentPosition() < target) {
        idle();
    }
    left.setPower(0);
    right.setPower(0);
}` },
    { id: "control", title: "Feedback control", body: `<p>A <b>proportional (P) controller</b> pushes harder the farther you are from where you want to be: <code>power = kP × error</code>. As the error shrinks, the power shrinks, so the robot eases in instead of overshooting.</p>
<p>Pick <code>kP</code> by testing: too small and it never quite gets there, too big and it wobbles. Cap the result with <code>Range.clip</code>.</p>`,
      code: `double error = target - arm.getCurrentPosition();
double power = Range.clip(0.005 * error, -0.8, 0.8);
arm.setPower(power);` },
    { id: "mecanum", title: "Mecanum drive", body: `<p>Mecanum wheels have angled rollers, so a robot can drive in any direction. Each wheel's power mixes forward (<code>y</code>), strafe (<code>x</code>), and turn (<code>rx</code>). Dividing by the biggest total keeps every wheel in proportion when the sticks are pushed hard.</p>`,
      code: `double y = -gamepad1.left_stick_y, x = gamepad1.left_stick_x, rx = gamepad1.right_stick_x;
double d = Math.max(Math.abs(y) + Math.abs(x) + Math.abs(rx), 1);
frontLeft.setPower((y + x + rx) / d);
backLeft.setPower((y - x + rx) / d);
frontRight.setPower((y - x - rx) / d);
backRight.setPower((y + x - rx) / d);` },
    /* ---------------- CAD track ---------------- */
    { id: "cad-why", track: "cad", title: "Why design in CAD?", body: `<p><b>CAD</b> (computer-aided design) lets you build the robot on a computer before cutting a single part. You find out whether things fit, how much they weigh, and where the motors go, while changes are still free.</p>
<p>Most FTC teams use <b>Onshape</b>. It runs in a web browser (even on a Chromebook), saves automatically, keeps every version, and lets the whole team work on the same robot at once. Students and teachers can get it free through Onshape's education plan.</p>`,
      links: [["Onshape for education (free accounts)", "https://www.onshape.com/en/education"], ["Onshape for robotics teams", "https://www.onshape.com/en/education/robotics"], ["Game Manual 0: CAD", "https://gm0.org/en/latest/docs/design-skills/cad.html"]],
      checklist: ["Create a free Onshape education account", "Ask a CAD lead to share the team's robot document with you", "Open it and spin the robot around with the right mouse button"] },
    { id: "cad-sketch", track: "cad", title: "Sketch, extrude, repeat", body: `<p>Almost every part starts the same way: draw a 2D <b>sketch</b> on a plane, then <b>extrude</b> it into 3D. Add holes, round the edges with a <b>fillet</b>, and you have a bracket.</p>
<p>Give sketches real <b>dimensions</b> and <b>constraints</b> (like "these lines are parallel" or "this hole is centered"). A fully defined sketch turns black in Onshape. Then if a motor changes size later, you change one number and the whole part updates.</p>`,
      links: [["Onshape Learning Center: free courses", "https://learn.onshape.com/courses"], ["Onshape Fundamentals: CAD (free course)", "https://learn.onshape.com/learn/course/fundamentals-cad"], ["Game Manual 0: CAD tutorials", "https://gm0.org/en/latest/docs/design-skills/cad-tutorials.html"]],
      checklist: ["Sketch a rectangle and dimension it 2 in × 1 in", "Extrude it 0.25 in thick", "Add two 4 mm holes and fully define the sketch", "Fillet the corners"] },
    { id: "cad-assembly", track: "cad", title: "Parts, assemblies, and kit parts", body: `<p>A <b>Part Studio</b> is where you design parts. An <b>Assembly</b> is where you put parts together and say how they move, using <b>mates</b>: fastened for things bolted together, revolute for things that spin, like wheels.</p>
<p>Don't redraw store-bought parts. The FTC parts library for Onshape has goBILDA, REV, and other common FTC parts ready to drop in, so your robot model matches what you can actually buy.</p>`,
      links: [["FTC parts library for Onshape", "https://ftconshape.com/introduction-to-the-ftc-parts-library/"], ["Game Manual 0: CAD", "https://gm0.org/en/latest/docs/design-skills/cad.html"]],
      checklist: ["Insert a motor and a channel from the parts library", "Fasten the motor to the channel with a mate", "Add a wheel with a revolute mate and spin it"] },
    { id: "cad-print", track: "cad", title: "Designing for 3D printing", body: `<p>A part that looks right on screen can still print badly. A few habits help:</p>
<ul><li><b>Orientation matters.</b> Prints are weakest between layers, so lay parts so the force runs along the layers, not across them.</li><li><b>Leave clearance.</b> Printed holes come out a little small. Add a few tenths of a millimeter to holes and slots that need to fit something.</li><li><b>Avoid supports</b> when you can: flat bottoms and gentle (45° or less) overhangs print cleanly.</li><li><b>Walls and infill:</b> more walls usually add more strength than more infill.</li></ul>
<p>Export the part as an STL or 3MF and slice it. Then test-fit, adjust, and reprint. That's normal!</p>`,
      links: [["Game Manual 0: CAD tutorials", "https://gm0.org/en/latest/docs/design-skills/cad-tutorials.html"]],
      checklist: ["Pick a print orientation and explain why", "Add clearance to a hole that a shaft goes through", "Export an STL and slice it"] },
    { id: "cad-portfolio", track: "cad", title: "Showing your design work", body: `<p>Judges love seeing <b>how</b> a design changed, not only the final robot. Save screenshots of each version, note what didn't work and why, and keep part names clear (like <i>intake-roller-v3</i>).</p>
<p>Onshape's version history makes this easy: create a named version at each milestone, and pull images from it for the engineering portfolio.</p>`,
      links: [["Game Manual 0: the engineering portfolio", "https://gm0.org/en/latest/docs/awards/portfolio.html"]],
      checklist: ["Make a named version after your next design change", "Screenshot before and after for the portfolio", "Write one sentence on why you changed it"] },

    /* ---------------- Outreach track ---------------- */
    { id: "out-why", track: "outreach", title: "What outreach is (and why it matters)", body: `<p><b>Outreach</b> is sharing STEM and robotics with people outside the team: robot demos at libraries and schools, helping younger teams, mentoring, and working with local businesses.</p>
<p>It's at the heart of <i>FIRST</i>. It grows the next generation of teams, builds support for your own team, and is a big part of how judges decide several awards.</p>`,
      links: [["Game Manual 0: outreach basics", "https://gm0.org/en/latest/docs/being-a-team/outreach-basics.html"], ["Game Manual 0: FTC award types", "https://gm0.org/en/latest/docs/awards/award-types.html"]],
      checklist: ["List three places nearby that might host a robot demo", "Ask the team who has contacts there"] },
    { id: "out-demo", track: "outreach", title: "Planning a robot demo", body: `<p>A good demo is mostly planning. Settle these a week ahead:</p>
<ul><li><b>Who, where, when:</b> a contact person, the address, setup time, and how long you'll stay.</li><li><b>Space and power:</b> a clear floor area for driving and an outlet for chargers.</li><li><b>Roles:</b> a driver, someone explaining, and someone watching the robot's area.</li><li><b>Pack:</b> charged batteries, the controller and phone, tools, spare parts, and something to hand out.</li></ul>`,
      checklist: ["Confirm the date, time, and a contact person", "Check there's space to drive and an outlet", "Charge every battery the night before", "Pack the controller, Driver Station phone, and tools", "Bring handouts with the team's website and email", "Ask before taking photos of anyone, especially kids"] },
    { id: "out-pitch", track: "outreach", title: "Explaining FTC to anyone", body: `<p>Have a <b>30-second version</b> ready: who you are, what FTC is, and what your robot does. Then go deeper only if they're curious.</p>
<p>Match the audience. Kids want to drive. Parents want to know how their kid could join. Businesses want to hear what students learn and how support helps. Skip jargon like "OPR" or "odometry" unless someone asks.</p>`,
      checklist: ["Write your 30-second pitch", "Practice it on someone outside the team", "Prepare one easy way for a kid to try driving safely"] },
    { id: "out-safety", track: "outreach", title: "Safety at events", body: `<p>Crowds and robots need clear rules:</p>
<ul><li>Mark a driving area and keep visitors, especially small kids, outside it.</li><li>Only a trained team member drives near people, and stays ready to press STOP.</li><li>Turn the robot off before anyone reaches in or touches it.</li><li>Check batteries and wires before each demo. Don't use a battery that's damaged or swollen.</li><li>Have an adult or mentor with the team.</li></ul>`,
      checklist: ["Agree on the driving area before visitors arrive", "Choose who is allowed to drive", "Check batteries and wiring", "Know who the adult in charge is"] },
    { id: "out-log", track: "outreach", title: "Log it and tell the story", body: `<p>Right after each event, write it down while you remember: the date, where, how many team members helped and for how long, and roughly how many people you reached.</p>
<p>Add it to the <b>outreach log</b> in the Team editor. The website adds up the season's hours automatically and lists every event on the Team page. Post a short update with a photo, and keep notes for the engineering portfolio.</p>`,
      links: [["Game Manual 0: outreach basics", "https://gm0.org/en/latest/docs/being-a-team/outreach-basics.html"], ["Game Manual 0: the engineering portfolio", "https://gm0.org/en/latest/docs/awards/portfolio.html"], ["Steel Surge outreach log", "team.html#outreach"]],
      checklist: ["Log the event in the Team editor (Season → Outreach)", "Post a team update with a photo", "Add a paragraph to the portfolio notes"] },
  ];
  /** Which lesson explains each topic (used for "Review the lesson" links). */
  const TOPIC_LESSON = {
    "OpMode basics": "opmode", "Gamepad": "gamepad", "Motors": "motors", "Motor power": "motors", "Motors and sleep": "motors", "Motor direction": "motors",
    "Java math": "java", "Java logic": "java", "Java basics": "java", "TeleOp loops": "loops", "Loops and timing": "loops", "Loops and arrays": "loops",
    "Encoders": "encoders", "Telemetry": "telemetry", "Servos": "servos", "Servos and sequencing": "servos", "Drive code": "mecanum", "Mecanum drive": "mecanum",
    "Control": "control", "IMU": "imu", "IMU and methods": "imu", "Methods": "methods", "Planning a path": "methods", "TeleOp buttons": "gamepad",
  };

  const api = { DEBUG, DRILLS, CHALLENGES, LESSONS, TOPIC_LESSON };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CODELAB = api;
})(typeof window !== "undefined" ? window : globalThis);
