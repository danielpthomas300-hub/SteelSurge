/* ==========================================================================
   Steel Surge — engineering portfolio rules (used by portfolio.js, tested by
   tools/test_features.js). What judges look for in each award area, as
   evidence that can be found in a portfolio's text, and how it's scored.
   ========================================================================== */
(function (root) {
  "use strict";
  /* ---------------- What judges look for, as evidence we can find in text ----------------
     Each area lists signals: [label, regex, weight, tip when missing]. A signal found on
     2+ pages counts a little more (it shows depth, not a passing mention). */
  const R = (s) => new RegExp(s, "i");
  const AREAS = [
    { id: "eng", name: "Engineering process", award: "Think · Inspire", blurb: "How you got from the problem to the robot: requirements, ideas you compared, prototypes, tests, and what the data told you.",
      signals: [
        ["Goals or requirements", R("\\b(requirements?|constraints?|design goals?|objectives?|criteria)\\b"), 2, "State what each mechanism had to do (requirements and constraints) before showing the design."],
        ["Ideas compared", R("\\b(brainstorm\\w*|decision matrix|trade-?offs?|pros and cons|alternatives?|options? (we )?(considered|compared))\\b"), 3, "Show the options you considered and why you picked one, e.g. a decision matrix."],
        ["Prototypes", R("\\bprototyp\\w*"), 2, "Include early prototypes (even cardboard or wood) and what they taught you."],
        ["Iterations", R("\\b(iterat\\w*|version \\d|v\\d\\b|revision|redesign\\w*|second design|improved design)\\b"), 3, "Walk through at least one mechanism's versions: what changed between them and why."],
        ["Testing", R("\\b(test(s|ed|ing)?|trials?|experiment\\w*)\\b"), 2, "Describe how you tested designs, not just that you did."],
        ["Data and measurements", R("\\b(data|measur\\w*|results?|recorded|average|graph|chart)\\b"), 2, "Add real numbers: cycle times, success rates, before-and-after measurements."],
        ["Math and science", R("\\b(calculat\\w*|torque|gear ratio|velocity|acceleration|force|equation|formula|physics)\\b"), 2, "Show a calculation that drove a decision (gear ratio, torque, launch angle)."],
        ["Failures and lessons", R("\\b(fail\\w*|broke|didn'?t work|problem we|lessons? learned|we learned|mistake)\\b"), 3, "Judges like honest failures: what broke, what you learned, what you changed."],
      ],
      ask: ["Walk us through how you designed your intake.", "What would you change if you started over?", "Which test changed your design the most?"] },
    { id: "design", name: "Robot design and innovation", award: "Innovate · Design", blurb: "What's clever, reliable, or well built about the robot, and how you designed and made it.",
      signals: [
        ["Mechanisms explained", R("\\b(intake|drivetrain|drive ?train|lift|slides?|arm|claw|gripper|launcher|shooter|turret|outtake)\\b"), 2, "Give each major mechanism its own short section: what it does and how."],
        ["Something unique", R("\\b(unique|innovat\\w*|novel|creative|custom|first of its kind|nobody else)\\b"), 3, "Point out what's different about your solution and why it's better."],
        ["CAD", R("\\b(CAD|onshape|fusion ?360|solidworks|inventor|render\\w*|3d model)\\b"), 2, "Include CAD views or renders with labels."],
        ["Manufacturing", R("\\b(3d[- ]?print\\w*|machin\\w*|laser[- ]?cut\\w*|CNC|fabricat\\w*|lathe|mill)\\b"), 2, "Explain how parts were made and why that method."],
        ["Reliability and weight", R("\\b(reliab\\w*|robust|durab\\w*|weight|lighter|center of (mass|gravity)|wire management|cable)\\b"), 2, "Show how you made the robot reliable: fixes after breakdowns, weight savings, wiring."],
        ["Looks and driver-friendliness", R("\\b(aesthetic\\w*|appearance|ergonomic\\w*|branding|team colou?rs|driver feedback|easy to (repair|service))\\b"), 1, "Mention design choices that make the robot easier to drive, repair, or recognize."],
      ],
      ask: ["What's the most innovative part of your robot?", "How did you make it more reliable over the season?", "Why did you choose this drivetrain?"] },
    { id: "control", name: "Control and programming", award: "Control", blurb: "How sensors and software make the robot smarter in autonomous and TeleOp.",
      signals: [
        ["Sensors", R("\\b(sensors?|encoders?|IMU|gyro|color sensor|distance sensor|limit switch|touch sensor|odometry pods?|dead wheels?)\\b"), 3, "Name the sensors you use and what each one tells the robot."],
        ["Control algorithms", R("\\b(PID|PIDF|feed-?forward|state machine|motion profil\\w*|closed[- ]loop|feedback loop)\\b"), 3, "Explain one control method (like PID on the lift) and how you tuned it."],
        ["Navigation", R("\\b(odometry|locali[sz]ation|path ?(planning|following)|trajector\\w*|road ?runner|pedro|spline)\\b"), 2, "Describe how the robot knows where it is and follows paths in autonomous."],
        ["Vision", R("\\b(vision|camera|webcam|apriltags?|opencv|limelight|pipeline)\\b"), 2, "If you use a camera, explain what it detects and how reliable it is."],
        ["Autonomous routines", R("\\bautonomous\\b|\\bauto (routine|mode|path)s?\\b"), 2, "Show your autonomous routines, with points scored and success rate."],
        ["Driver assists", R("\\b(tele-?op|driver[- ]?(control|assist)|automat\\w*|macro|one-button|button press)\\b"), 2, "Mention automation that helps drivers (one-button scoring, auto-align)."],
        ["Measured results", R("\\b(accura\\w*|consisten\\w*|success rate|\\d+ ?%|percent|cycle time|seconds faster)\\b"), 2, "Back up your code with numbers: accuracy, success rate, time saved."],
      ],
      ask: ["Which sensor matters most to your robot and why?", "How did you tune your PID?", "How consistent is your autonomous?"] },
    { id: "outreach", name: "Outreach and connections", award: "Connect · Reach · Inspire", blurb: "How you share STEM with your community and learn from engineers and professionals.",
      signals: [
        ["Outreach events", R("\\b(outreach|demo(nstration)?s?|workshops?|summer camp|library|science (night|fair)|STEM (night|event|fair))\\b"), 3, "List outreach events with dates and what you did at each."],
        ["People reached", R("\\b\\d[\\d,]*\\+? ?(students|people|kids|children|attendees|visitors|participants)\\b|\\b(reached|impacted) \\d"), 3, "Count your impact: people reached, hours, events."],
        ["Outreach hours", R("\\b\\d+\\+? ?(outreach |volunteer |team )?hours\\b"), 2, "Total your outreach hours."],
        ["Engineers and professionals", R("\\b(engineers?|professionals?|industry|compan(y|ies)|internship|tour(ed)?|interview\\w*|expert)\\b"), 3, "Describe conversations with engineers or companies and what you learned from them."],
        ["FIRST community", R("\\b(FLL|FIRST LEGO|rookie teams?|mentor(ed|ing) (a |another |other )?teams?|hosted (a )?(scrimmage|meet|workshop)|other teams)\\b"), 2, "Show how you help other FIRST teams (mentoring FLL or rookie FTC teams)."],
        ["Reflection on impact", R("\\b(impact|feedback|we learned|inspired|changed how|reflect\\w*)\\b"), 1, "Say what your outreach changed, for them and for you."],
      ],
      ask: ["What's the outreach you're proudest of?", "What did you learn from working with professionals?", "How do you measure your impact?"] },
    { id: "team", name: "Team, plan, and sustainability", award: "Motivate · Sustain · Inspire", blurb: "Who the team is, how it works, and how it will keep going after this season.",
      signals: [
        ["Team and roles", R("\\b(team members?|roles?|sub-?teams?|captain|leads?|leadership|organi[sz]ation chart)\\b"), 2, "Introduce the team: members, roles, and how decisions get made."],
        ["Goals and plan", R("\\b(goals?|team plan|business plan|strategic plan|timeline|schedule|milestones?)\\b"), 3, "Include a team plan: this season's goals and whether you met them."],
        ["Money and sponsors", R("\\b(budget|fundrais\\w*|sponsors?|grants?|donat\\w*|expenses?)\\b"), 2, "Show your budget and how you raise money."],
        ["Recruiting and training", R("\\b(recruit\\w*|new members|train(ed|ing)|taught|onboard\\w*|knowledge transfer|documentation)\\b"), 3, "Explain how new members learn skills (training, documentation)."],
        ["Future and sustainability", R("\\b(sustainab\\w*|next (year|season)|future|succession|alumni|long-?term)\\b"), 2, "Say how the team will continue when seniors graduate."],
        ["Inclusion and culture", R("\\b(inclusiv\\w*|divers\\w*|welcom\\w*|team culture|gracious professionalism|coopertition|core values)\\b"), 2, "Show how the team is welcoming and lives the FIRST core values."],
      ],
      ask: ["How do new members learn?", "How will the team keep going after this year?", "How do you make decisions as a team?"] },
    { id: "story", name: "Clarity and story", award: "All awards", blurb: "Whether a judge can skim it: a summary up front, clear sections, and pictures that explain.",
      signals: [
        ["Summary or about us", R("\\b(summary|about (us|our team)|who we are|team overview|introduction)\\b"), 3, "Open with a one-page summary: who you are and your highlights this season."],
        ["Table of contents", R("\\b(table of contents|contents)\\b"), 1, "A short table of contents helps judges find sections quickly."],
        ["Pictures and figures", R("\\b(figure|fig\\.|diagram|photo|picture|image|shown (above|below)|see (figure|image))\\b"), 2, "Refer to your pictures in the text (\"Figure 3 shows…\") so they explain something."],
        ["Award connections", R("\\b(think award|connect award|innovate award|control award|motivate award|design award|inspire award|reach award|sustain award)\\b"), 1, "Some teams label which pages support which award; it helps judges."],
      ],
      ask: ["Give us your 30-second team summary.", "What are you most proud of this season?"] },
  ];

  const words = (t) => (t.match(/[A-Za-z0-9][\w'’-]*/g) || []).length;
  // Short lines with no ending punctuation are headings: end them like a sentence so quotes don't start with them.
  // Longer lines are just wrapped paragraphs, so their line breaks become spaces.
  const sentences = (t) => t.replace(/^([^\n.!?:]{1,60})\n(?=[A-Z0-9"“])/gm, "$1.\n").replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/).map((s) => s.trim()).filter((s) => s.length > 20);
  const hits = (re, t) => (t.match(new RegExp(re.source, "gi")) || []).length;
  function scoreArea(area, raw, text) {
    const pages = raw.map((t) => t.replace(/\s+/g, " ")); // match across line breaks ("150" + newline + "students")
    const found = [], missing = [], perPage = raw.map(() => []); let got = 0, max = 0;
    for (const [label, re, w, tip] of area.signals) {
      max += w + 1;
      const on = pages.map((t, i) => (re.test(t) ? i + 1 : 0)).filter(Boolean);
      on.forEach((p) => perPage[p - 1].push(label));
      if (!on.length) { missing.push({ label, tip, w }); continue; }
      got += w + (on.length >= 2 ? 1 : 0);
      let quote = "", qp = on[0];
      // Quote from the page with the most evidence (a passing mention on the cover is less useful)
      for (const p of [...on].sort((a, b) => hits(re, pages[b - 1]) - hits(re, pages[a - 1]))) { const s = sentences(raw[p - 1]).find((x) => re.test(x)); if (s) { quote = s; qp = p; break; } }
      if (quote.length > 190) { const m = quote.search(re); const st = Math.max(0, m - 70); quote = (st ? "…" : "") + quote.slice(st, st + 180) + "…"; }
      const fromPic = !!quote && !text[qp - 1].replace(/\s+/g, " ").includes(quote.replace(/^…|…$/g, "").slice(0, 40));
      found.push({ label, pages: on, quote, qp, fromPic });
    }
    return { ...area, score: Math.round((got / max) * 100), found, missing: missing.sort((a, b) => b.w - a.w), perPage };
  }

  const PortfolioRules = { AREAS, scoreArea, words, sentences };
  if (typeof module === "object" && module.exports) module.exports = PortfolioRules; else root.PortfolioRules = PortfolioRules;
})(typeof window !== "undefined" ? window : globalThis);
