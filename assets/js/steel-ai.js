/* ==========================================================================
   Steel Surge — Steel AI
   A site assistant that runs entirely in the visitor's browser: no server,
   no API key, no cost. It answers from the site's own data:
     content/content.json   team, members, sponsors, milestones, contact
     content/seasons.json   every FTC game since 2017–18
     assets/js/calc-data.js point values and ranking points (score calculator)
     FTCScout (live)        events, records, awards
     plus built-in FTC basics, the arcade, and trophies below.
   Exact questions (points, people, results) get exact answers; everything
   else is matched with a small search engine (BM25) over the same data.
   ========================================================================== */
(() => {
  "use strict";
  const SS = () => window.SS || {};
  const PAGE = document.body.dataset.page || "";
  if (PAGE === "editor" || PAGE.startsWith("game")) return;

  const V = ((document.currentScript && document.currentScript.src.match(/\?v=\w+/)) || [""])[0];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const u = (p) => (SS().url ? SS().url(p) : p);
  const CHAT_KEY = "ss-ai-chat";
  const MANUALS = "https://www.firstinspires.org/programs/ftc/game-and-season";
  const QA = "https://ftc-qa.firstinspires.org/";

  /* ---------------- Text tools ---------------- */
  const STOP = new Set("a an the is are was were be been am do does did of to in on at for with and or but if it its this that these those what whats which who whos whom how hows why when where can could would should will shall may might i me my we our us you your yo tell about please give show know want get got there their they them he she his her any some much many more most so just like than then also from by as into out up down very really thing things".split(" "));
  const GENERIC = new Set(["point", "pts", "worth", "score", "scor", "value", "get", "earn", "season", "game", "year", "ftc"]);
  const SYN = {
    pts: "point", worth: "point", bot: "robot", robo: "robot", auton: "autonomous", auto: "autonomous", tele: "teleop", "tele-op": "teleop",
    driver: "teleop", end: "endgame", donate: "sponsor", donation: "sponsor", fund: "sponsor", funding: "sponsor", sponsorship: "sponsor", money: "sponsor",
    signup: "join", "sign-up": "join", member: "member", email: "contact", mail: "contact", reach: "contact", penalty: "foul", penalti: "foul",
    rp: "rank", rps: "rank", ranking: "rank", park: "park", parking: "park", minigame: "arcade", games: "arcade",
    coder: "programming", code: "programming", programmer: "programming", software: "programming", build: "mechanical", builder: "mechanical",
    cad: "cad", design: "cad", drive: "driver", drives: "driver", driving: "driver",
    touch: "contact", touching: "contact", touches: "contact", hit: "contact", opponent: "opposing", opponents: "opposing", other: "opposing", opposite: "opposing", enemy: "opposing",
    big: "size", large: "size", tall: "size", wide: "size", sizing: "size", dimension: "size", dimensions: "size", cube: "size", heavy: "weight",
    hold: "control", holding: "control", carry: "control", carrying: "control", possess: "control", possession: "control", piece: "element", pieces: "element", shoot: "launch", shooting: "launch", throw: "launch", fling: "launch",
  };
  const stem = (w) => {
    w = w.replace(/'s$/, "");
    if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
    if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
    if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
    if (w.length > 3 && /(s|x|ch|sh)es$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
    return w;
  };
  const words = (t) => String(t).toLowerCase().replace(/[’']/g, "'").match(/[a-z0-9][a-z0-9'+-]*/g) || [];
  const terms = (t) => words(t).filter((w) => !STOP.has(w)).map((w) => { const s = stem(w); return SYN[w] || SYN[s] || s; });
  const has = (q, re) => re.test(q);
  const fmtDate = (d) => { if (!d) return ""; const x = new Date(d.length <= 7 ? d + "-01T12:00" : d + "T12:00"); return isNaN(x) ? d : x.toLocaleDateString(undefined, d.length <= 7 ? { month: "long", year: "numeric" } : { month: "short", day: "numeric", year: "numeric" }); };
  const list = (a) => (a.length <= 1 ? a.join("") : a.slice(0, -1).join(", ") + (a.length > 2 ? "," : "") + " and " + a.at(-1));
  const ord = (n) => n + (["th", "st", "nd", "rd"][(n % 100 > 10 && n % 100 < 14) ? 0 : n % 10] || "th");
  const label = (y) => `${y}–${String(y + 1).slice(2)}`;
  const curSeason = () => (SS().currentSeason ? SS().currentSeason() : (() => { const n = new Date(); return n.getMonth() >= 8 ? n.getFullYear() : n.getFullYear() - 1; })());
  const link = (href, text, ext) => `<a href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${esc(text)}</a>`;

  /* ---------------- Built-in knowledge (written for this site) ---------------- */
  const BASICS = [
    ["What is FTC?", "FIRST Tech Challenge (FTC) is a robotics program for students in grades 7–12. Teams of up to 15 students design, build, and program a robot to play a new game every season, then compete in alliances of two teams against another alliance.", "ftc.html", "first tech challenge program what"],
    ["How a match works", "Every match starts with a 30-second autonomous period, where robots run pre-programmed code with no driver input. After a short transition, drivers take over for 2 minutes of driver-controlled TeleOp. The last part of TeleOp is the endgame, which usually has its own scoring tasks.", "ftc.html", "match length long time timing minute second period autonomous teleop endgame"],
    ["Alliances", "Each match is 2 vs 2: a red alliance and a blue alliance, each made of two teams. In qualification matches your partners are random, so you play with and against many teams. In playoffs, the top-ranked teams choose their alliance partners.", "ftc.html", "alliance red blue partner 2v2 alliance selection pick"],
    ["Ranking", "Teams are ranked by their average Ranking Points (RP) from qualification matches. Wins and ties earn RP, and many recent games also award bonus RP for reaching scoring goals. Ties in the rankings are broken by other stats set in that season's manual.", "calculator.html", "rank ranking point rp qualification standing"],
    ["Playoffs", "After qualification matches, the top teams pick partners in alliance selection. The alliances then play a double-elimination playoff bracket, and the last alliance standing wins the event.", "ftc.html", "playoff elimination bracket final semifinal double win event"],
    ["Fouls and penalties", "Breaking a game rule usually costs a MINOR or MAJOR foul. In recent seasons foul points are added to the other alliance's score. Serious or repeated problems can also earn a yellow or red card. The exact point values change by season, so ask me about a specific game.", "calculator.html", "foul penalty minor major yellow red card rule break @manual"],
    ["Robot size and parts", "At the start of a match a robot must fit inside an 18 × 18 × 18 inch box. Teams use a REV Control Hub as the robot's brain and a Driver Hub with gamepads to drive. Allowed motors, servos, and materials are listed in the season's Competition Manual.", "ftc.html", "robot size big large tall wide maximum max dimension inch box sizing cube control hub driver hub motor servo part legal @manual"],
    ["Programming", "FTC robots are programmed in Java (with Android Studio or OnBot Java) or with Blocks, a drag-and-drop editor. Teams use the official FTC SDK, and many add libraries for path following and computer vision, like reading AprilTags.", "ftc.html", "program language java blocks android studio onbot sdk vision apriltag"],
    ["The field", "The FTC field is a 12 × 12 foot square made of 36 foam tiles, each 2 feet wide, surrounded by a short wall. The game elements on it change every season.", "ftc.html", "field size tile foot feet mat dimension"],
    ["Awards", "Judges give awards for more than robot performance: the Inspire Award (the top award), Think (engineering portfolio), Connect, Innovate, Control, Motivate, Design, Reach, and Sustain. Students can also be nominated for the Dean's List.", "ftc.html", "award inspire think connect innovate control motivate design reach sustain dean list judge portfolio"],
    ["Engineering portfolio", "Teams write an engineering portfolio that shows their design process, outreach, and plans. Judges read it, interview the team, and use it for most judged awards. Length limits and rules are in the season's Competition Manual.", "ftc.html", "portfolio notebook engineering judge interview @manual"],
    ["Gracious Professionalism", "Gracious Professionalism is a core FIRST value: compete hard, but treat everyone with respect and help other teams succeed. Coopertition means competing and cooperating at the same time, like lending a part to the team you face next.", "team.html", "gracious professionalism gp coopertition value respect"],
    ["The season calendar", "A new FTC game is revealed at kickoff each September. Teams compete at scrimmages, league meets, and qualifiers through the winter, then the best teams advance to state or regional championships and the FIRST Championship in the spring.", "ftc.html", "season kickoff reveal when calendar qualifier championship worlds state league scrimmage"],
    ["FTC, FRC, and FLL", "FIRST runs several robotics programs. FIRST LEGO League is for younger students and uses LEGO robots. FIRST Tech Challenge (FTC, grades 7–12) uses smaller robots on a 12 × 12 foot field in 2 vs 2 alliances. FIRST Robotics Competition (FRC, high school) builds much larger robots for 3 vs 3 alliances.", "ftc.html", "frc fll first robotics competition lego league difference compare vex program"],
    ["The drive team", "At a match, each team's drive team stands in the alliance station: up to two drivers who hold the gamepads and a coach who helps with strategy. Some games also have a human player who passes game pieces onto the field. Roles and limits are set in each season's manual.", "ftc.html", "drive team driver coach human player alliance station role @manual"],
    ["Starting a team", "To start an FTC team you need a group of students, at least two adult mentors, and a team registration with FIRST. Teams usually buy a starter kit, then fundraise for parts and event fees. FIRST's website has a step-by-step guide.", "https://www.firstinspires.org/programs/ftc", "start new team create cost register registration fee how begin mentor"],
    ["Inspection", "Before an event's matches, every robot goes through inspection to check it's safe and follows the robot rules: size, parts, wiring, and software. Teams also check their own robot against the season's inspection checklist.", "ftc.html", "inspection inspect checklist pass robot legal safe @manual"],
    ["3D-printed parts", "Yes, FTC robots can use 3D-printed parts. They count as custom parts your team makes, so they must follow the same robot rules as any other part (size, safety, and allowed materials). Many teams print brackets, intakes, and sensor mounts.", "ftc.html", "3d print printed printer printing part custom fabricate allowed legal"],
    ["Cycles", "A cycle is one trip a robot makes to pick up a game element and score it. Fast, reliable cycles win matches, so teams practice driving and tune their mechanisms to shave seconds off each one.", "ftc.html", "cycle cycling cycle time strategy"],
    ["OPR", "OPR (Offensive Power Rating) estimates how many points a team adds to its alliance each match, worked out from all of its match scores. Sites like FTCScout show OPR for every team.", "https://ftcscout.org/", "opr npopr offensive power rating stat statistic scouting"],
    ["Scouting", "Scouting means tracking how other teams play, so you know which teams would make good alliance partners in playoffs. Many teams use FTCScout plus their own notes.", "ftc.html", "scout scouting alliance selection pick list"],
    ["Event types", "Scrimmages are practice events. Leagues hold meets over several weeks, and qualifiers and league tournaments send top teams to the state or regional championship.", "ftc.html", "scrimmage league meet qualifier tournament championship state regional event type"],
    ["Official manuals and rulings", "For the exact wording of any rule, use the season's Competition Manual from FIRST. If something is unclear, the official FTC Q&A forum is where rule questions get answered by the game design team.", MANUALS, "manual rule rulebook official wording q&a ruling legal allow allowed can we illegal gm"],
  ];

  const PAGES = [
    ["Home page", "The home page has our latest news, this season's record, and quick links to everything on the site.", "index.html", "home main start"],
    ["Team page", "Meet the students on Steel Surge, see our values and projects, and read our milestones and awards.", "team.html", "team member student people roster who milestone award history story"],
    ["FTC page", "Our guide to FIRST Tech Challenge: how it works, every game since 2017–18 in 3D, and an FAQ for new families.", "ftc.html", "ftc page explain guide 3d field model"],
    ["Scouting tool", "The Match tools page has an Event scouting tab. Pick any FTC event to see every team's rank, record, and OPR (auto and TeleOp) live from FTCScout, write pit and match notes on your phone, see the match schedule with predicted scores, and build an alliance pick list. Scouts can combine notes by sharing a link.", "calculator.html#scout", "scouting scout scouts alliance selection pick list picklist opr event teams notes partner partners"],
    ["CAD and outreach lessons", "The Code Lab's Start here tab has three tracks: Coding, CAD, and Outreach. The CAD track covers Onshape (free for students), sketching and extruding, assemblies with the FTC parts library, and designing for 3D printing. The Outreach track covers planning robot demos, explaining FTC, safety at events, and logging outreach.", "codelab.html#learn", "cad onshape design 3d printing print outreach demo demos lessons learn training trainings"],
    ["Code Lab", "The Code Lab is free FTC programming practice in your browser. Level 1, Debug it: find the bug in real FTC Java. Level 2, Write it: finish methods like a deadzone, mecanum math, or a P controller, checked by tests. Level 3, Drive it: program an autonomous with motors, encoders, the IMU, and a claw, then watch a simulated robot run it.", "codelab.html", "code lab coding programming practice java learn program code exercises autonomous simulator sim debug drills learn to code"],
    ["Score calculator", "Score a match for any FTC game since 2017–18. It counts every period, fouls, and bonus ranking points, and you can share a scoresheet with a link.", "calculator.html", "calculator score calculate scoresheet tally count share"],
    ["Media page", "Our videos, photos, and team updates.", "media.html", "media video youtube photo picture"],
    ["Arcade", "Thirteen original robotics games, each with five difficulty levels and trophies to earn.", "arcade.html", "arcade game play fun minigame"],
    ["Sponsors page", "Our sponsors and the sponsorship tiers, from Bronze up. Every sponsor helps pay for parts, fees, and outreach.", "sponsors.html", "sponsor sponsorship partner support donate tier"],
    ["Contact page", "Send the team a message for sponsorships, joining, outreach events, or mentoring. Messages go to the team email.", "contact.html", "contact message email reach form"],
    ["Trophies", "Earn trophies for exploring the site and playing the arcade. Your progress is saved in this browser.", "trophies.html", "trophy trophies achievement badge platinum"],
  ];

  const JOKES = [
    "Why did the robot go on vacation? It needed to recharge its batteries.",
    "Our robot isn't lazy. It's in power-saving mode.",
    "How does a robot shave? With a laser blade.",
    "Why was the robot bad at tennis? It kept getting stuck in the net code.",
    "What's a robot's favorite music? Heavy metal.",
    "Our autonomous routine is 100% reliable, except for the 0% of the time it works on the real field.",
  ];

  /* ---------------- Data loading ---------------- */
  let dataP;
  const loadCalc = () => window.CALC_SEASONS ? Promise.resolve(window.CALC_SEASONS) : new Promise((res) => {
    const s = document.createElement("script"); s.src = u("assets/js/calc-data.js") + V; s.onload = () => res(window.CALC_SEASONS || []); s.onerror = () => res([]); document.head.append(s);
  });
  function loadData() {
    return (dataP ||= (async () => {
      const [content, seasons, calc] = await Promise.all([
        (SS().loadContent ? SS().loadContent() : fetch(u("content/content.json")).then((r) => r.json())).catch(() => null),
        fetch(u("content/seasons.json") + V).then((r) => r.json()).then((j) => j.seasons || []).catch(() => []),
        loadCalc(),
      ]);
      const D = { content, seasons, calc };
      D.docs = buildDocs(D); D.index = buildIndex(D.docs);
      return D;
    })());
  }
  let ftcP;
  const loadResults = (c) => (ftcP ||= (SS().loadFTC ? SS().loadFTC(c.team.number, c.team.rookieYear).catch(() => null) : Promise.resolve(null)));

  /* ---------------- Search index ---------------- */
  function buildDocs({ content: c, seasons }) {
    const docs = [];
    const add = (title, text, href, tags = "", kind = "info") => docs.push({ title, text, href, tags, kind });
    BASICS.forEach(([t, x, h, g]) => add(t, x, h, g, "ftc"));
    PAGES.forEach(([t, x, h, g]) => add(t, x, h, g, "page"));
    for (const s of seasons) {
      const nm = `${s.name} (${label(s.year)})`, h = `ftc.html?season=${s.year}#games`;
      add(nm, `${s.summary} ${s.objective || ""}`, h, `${s.name} ${s.theme || ""} ${s.year} overview summary objective about`, "season");
      if (s.periods) for (const [p, x] of Object.entries(s.periods)) add(`${s.name}: ${p === "auto" ? "autonomous" : p === "teleop" ? "TeleOp" : "endgame"}`, x, h, `${s.name} ${p} ${p === "auto" ? "autonomous" : ""}`, "season");
      (s.elements || []).forEach((e) => add(`${s.name}: ${e.name}`, e.detail, h, `${s.name} element field`, "season"));
      if (s.scoring) add(`${s.name} scoring`, s.scoring.map(([a, b]) => `${a}: ${b}`).join(". ") + ".", `calculator.html?season=${s.year}`, `${s.name} point score scoring worth`, "season");
      if (s.unique) add(`What makes ${s.name} different`, s.unique, h, `${s.name} unique special different`, "season");
    }
    (SS().GAMES || []).forEach((g) => add(`${g.title} (arcade game)`, `${g.title} is a ${g.genre.toLowerCase()} game. ${g.blurb} Controls: ${g.controls}.`, `arcade/${g.id}.html`, `arcade game play ${g.title}`, "game"));
    (SS().TROPHIES || []).filter((t) => !t.hidden).forEach((t) => add(`Trophy: ${t.name}`, `${t.desc || ""} It's a ${t.tier} trophy.`, "trophies.html", `trophy ${t.name} earn unlock`, "trophy"));
    if (c) {
      const T = c.team;
      add(`About ${T.name}`, `${T.intro} We're FTC team ${T.number} from ${T.location}, and our rookie season was ${label(T.rookieYear)}. Our motto is "${T.motto}".`, "team.html", "team about who us steel surge history number location school", "team");
      (c.values || []).forEach((v) => add(`Our value: ${v.title}`, v.body, "team.html", "value", "team"));
      (c.projects || []).forEach((p) => add(`Project: ${p.title}`, p.body, "team.html", "project made print", "team"));
      (c.members || []).forEach((m) => add(`${m.name}, ${m.role}`, m.bio, "team.html", `member ${m.dept} ${m.role}`, "member"));
      (c.achievements || []).forEach((a) => add(a.title, `${a.detail} (${fmtDate(a.date)})`, "team.html#milestones", "milestone history award achievement", "team"));
      (c.updates || []).forEach((p) => add(`Update: ${p.title}`, p.body, "media.html", "update news latest", "team"));
      if (c.sponsorPitch) add("Why sponsor Steel Surge", c.sponsorPitch, "sponsors.html", "sponsor why support", "team");
      if (c.outreach?.hours) add("Outreach", `We've done ${c.outreach.hours} ${c.outreach.label}. Outreach means running demos, mentoring younger students, and sharing STEM with our community.`, "team.html", "outreach volunteer community hours", "team");
    }
    return docs;
  }
  function buildIndex(docs) {
    const df = {}, surf = {}; let total = 0;
    docs.forEach((d) => words(`${d.title} ${d.text}`).forEach((w) => { if (/^[a-z]{4,}$/.test(w)) { const t = terms(w)[0]; if (t && !(t in surf)) surf[t] = w; } }));
    const toks = docs.map((d) => { const t = [...terms(d.title), ...terms(d.title), ...terms(d.tags), ...terms(d.text)]; total += t.length; new Set(t).forEach((w) => (df[w] = (df[w] || 0) + 1)); return t; });
    return { toks, df, surf, avg: total / Math.max(1, docs.length), n: docs.length };
  }
  const search = (D, q, n = 4) => rank(D.docs, D.index, q, n);
  function rank(docs, index, q, n = 4) {
    const qs = [...new Set(terms(q))]; const { toks, df, avg, n: N } = index;
    return docs.map((d, i) => {
      const t = toks[i]; let s = 0;
      for (const w of qs) {
        const f = t.filter((x) => x === w).length; if (!f) continue;
        const idf = Math.log(1 + (N - df[w] + 0.5) / (df[w] + 0.5));
        s += idf * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * t.length / avg));
      }
      return { d, s };
    }).filter((r) => r.s > 0).sort((a, b) => b.s - a.s).slice(0, n);
  }

  /* ---------------- Game manuals (content/manuals/<year>.json, built by tools/build_manuals.py) ---------------- */
  const manualP = {};
  const loadManual = (y) => (manualP[y] ||= fetch(u(`content/manuals/${y}.json`) + V).then((r) => (r.ok ? r.json() : null)).then((m) => {
    if (!m) return null;
    m.byId = Object.fromEntries(m.docs.filter((d) => d.r).map((d) => [d.r.toUpperCase(), d]));
    m.index = buildIndex(m.docs.map((d) => ({ title: `${d.r} ${d.t} ${d.t}`, tags: d.s, text: d.x })));
    return m;
  }).catch(() => null));
  const RULE_ID = /(?:^|[\s(<"'])<?([a-z]{1,3}\d{1,3}[a-z]?)>?(?=[\s?.,!)"']|$)/gi;

  function manualAnswer(m, d, q, others = []) {
    const src = m.sources[d.m] || m.sources[0];
    let x = d.x;
    if (d.t && x.startsWith(d.t) && x.length > d.t.length + 20) x = x.slice(d.t.length).replace(/^\s*[–-]?\s*/, "");
    const w = x.split(" "), cut = 75;
    const body = w.length > cut + 15
      ? `<blockquote class="ai-quote">${esc(w.slice(0, cut).join(" "))}… <details><summary>Show the full ${d.r ? "rule" : "section"}</summary>${esc(w.slice(cut).join(" "))}</details></blockquote>`
      : `<blockquote class="ai-quote">${esc(x)}</blockquote>`;
    const head = d.r ? `<b>${esc(d.r)}</b>${d.t ? ` · ${esc(d.t)}` : ""}` : `<b>${esc(d.t || "From the manual")}</b>`;
    const cite = `${m.name} ${src.label} (${label(m.year)}), page ${d.p}`;
    return A(`<p>${head}</p>${body}<p class="ai-dim">From the ${esc(cite)}.</p>`, {
      src: [[`${src.url}#page=${d.p}`, `Open the manual at page ${d.p}`, 1]],
      chips: others.map((o) => (o.r ? `What is ${o.r} in ${m.name}?` : `${o.t} in ${m.name}`)).slice(0, 2),
      manual: true,
    });
  }

  /** "What is G417?", "explain <GS4> in POWERPLAY" */
  async function ruleIdAnswer(q, year, named) {
    const ids = [...q.matchAll(RULE_ID)].map((x) => x[1].toUpperCase()).filter((x) => !/^(RP|PM|AM|TU)\d/.test(x));
    if (!ids.length) return null;
    const years = named ? [year] : [year, ...[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017].filter((y) => y !== year)];
    for (const y of years) {
      const m = await loadManual(y); const d = m?.byId[ids[0]];
      if (d) { ctx.season = y; return manualAnswer(m, d, q); }
      if (named) return A(`<p>I couldn't find rule <b>${esc(ids[0])}</b> in the ${esc(m?.name || label(y))} manual. Rule numbers change every season, so try describing what the rule is about.</p>`);
    }
    return null;
  }

  /** Best manual passages for a question, or null when nothing fits well. */
  async function manualSearch(q, year) {
    const m = await loadManual(year); if (!m) return null;
    const qs = words(q).filter((w) => { const t = terms(w)[0]; return t && !terms(m.name).includes(t) && !/^\d+$/.test(w) && !["rule", "manual", "allow", "legal"].includes(t); }).join(" ");
    const want = [...new Set(terms(qs))].filter((w) => !GENERIC.has(w) && w !== "robot");
    const askLimit = /\b(how many|how much|limit|max(imum)?|at once|at a time)\b/i.test(q);
    const { df, n: N } = m.index, idf = (w) => Math.log(1 + (N - (df[w] || 0) + 0.5) / ((df[w] || 0) + 0.5));
    const hits = rank(m.docs, m.index, qs, 25).map((h) => {
      const have = new Set(terms(`${h.d.r} ${h.d.t} ${h.d.x}`)), inTitle = new Set(terms(h.d.t));
      const bonus = 0.6 * want.filter((w) => inTitle.has(w)).reduce((a, w) => a + idf(w), 0);
      const limit = askLimit && /\b(more than \d+|at a time|limit(ed)?|maximum|no more than)\b/i.test(`${h.d.t} ${h.d.x.slice(0, 200)}`) ? 1.35 : 1;
      return { ...h, s: (h.s + bonus) * (h.d.r ? 1.25 : 1) * limit, cov: want.length ? want.filter((w) => have.has(w)).length / want.length : 0 };
    }).filter((h) => h.cov >= (want.length <= 2 ? 0.99 : 0.6)).sort((a, b) => b.s - a.s).slice(0, 8);
    return hits.length ? { m, hits } : null;
  }

  /* ---------------- Conversation memory ---------------- */
  const ctx = { season: null };

  function findSeason(D, q) {
    const ql = q.toLowerCase();
    const alias = { "into the deep": 2024, itd: 2024, "center stage": 2023, centerstage: 2023, "power play": 2022, powerplay: 2022, "freight frenzy": 2021, "ultimate goal": 2020, skystone: 2019, "rover ruckus": 2018, "relic recovery": 2017, biobuzz: 2026, "bio buzz": 2026, decode: 2025 };
    for (const [k, y] of Object.entries(alias)) if (new RegExp(`\\b${k}\\b`).test(ql)) return y;
    const m = ql.match(/\b(20(1[7-9]|2\d))(?:\s*[-–/]\s*(?:20)?\d\d)?\b/); if (m && D.seasons.some((s) => s.year === +m[1])) return +m[1];
    if (/\b(last|previous) (year|season|game)\b/.test(ql)) return curSeason() - 1;
    if (/\b(this|current|new|latest) (year|season|game)\b|\bthis year'?s\b/.test(ql)) return curSeason();
    return null;
  }

  /* ---------------- Answer builders ---------------- */
  const A = (html, opts = {}) => ({ html, ...opts });

  function pointsAnswer(D, q, year) {
    const cs = D.calc.find((s) => s.year === year); if (!cs) return null;
    const ss = D.seasons.find((s) => s.year === year);
    const qt = terms(q).filter((w) => !GENERIC.has(w) && !terms(cs.name).includes(w) && !/^\d+$/.test(w));
    const ql = q.toLowerCase();
    if (/\b(foul|penalt|minor|major)/.test(ql) && cs.fouls) {
      const f = cs.fouls;
      return A(`<p>In <b>${esc(cs.name)}</b>, a MINOR foul is worth <b>${f.minor}</b> points and a MAJOR foul is worth <b>${f.major}</b>. ${f.mode === "credit" ? "Those points are added to the <i>other</i> alliance's score." : "Those points are subtracted from the score of the alliance that broke the rule."}</p>`, { src: [[`calculator.html?season=${year}`, `${cs.name} score calculator`]] });
    }
    if (/\b(rank|rp|ranking)/.test(ql) || qt.includes("rank")) {
      const win = cs.winRP ? `<p>A win earns <b>${cs.winRP.win} RP</b> and a tie earns <b>${cs.winRP.tie}</b>.</p>` : "";
      if (!cs.rp?.length) return A(`<p><b>${esc(cs.name)}</b> didn't have bonus ranking points that you score on the field.${win ? "" : " Teams were ranked by wins, losses, and ties, with tiebreakers from the manual."}</p>${win}`, { src: [[`calculator.html?season=${year}`, `${cs.name} score calculator`]] });
      return A(`<p>Bonus ranking points in <b>${esc(cs.name)}</b>:</p><ul>${cs.rp.map((r) => `<li><b>${esc(r.label)}</b>: ${esc(r.need)}</li>`).join("")}</ul>${win}${cs.rpNote ? `<p class="ai-note">${esc(cs.rpNote)}</p>` : ""}`, { src: [[`calculator.html?season=${year}`, `${cs.name} score calculator`]] });
    }
    if (!qt.length) return null;
    const items = cs.periods.flatMap((p) => p.items.map((it) => ({ ...it, period: p.label })));
    const scored = items.map((it) => {
      const lt = terms(it.label), ht = terms(it.help || "");
      let s = 0; for (const w of qt) { if (lt.includes(w)) s += 3; else if (ht.includes(w)) s += 1; }
      return { it, s };
    }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
    const extra = (ss?.scoring || []).filter(([a]) => qt.some((w) => terms(a).includes(w)));
    if (!scored.length && !extra.length) return null;
    const top = scored.length ? scored[0].s : 0;
    const keep = scored.filter((x) => x.s >= Math.max(3, top * 0.75)).map((x) => x.it);
    const byLabel = new Map(); keep.forEach((it) => { const k = it.label.toLowerCase(); if (!byLabel.has(k)) byLabel.set(k, []); byLabel.get(k).push(it); });
    const val = (it) => it.type === "slots" ? it.options.map(([l, p]) => `${l} ${p}`).join(" · ") : it.type === "robots" ? `${it.pts} points per robot` : it.type === "count" ? `${it.pts} point${it.pts === 1 ? "" : "s"} each` : `${it.pts} points`;
    const rows = [...byLabel.values()].slice(0, 5).map((its) => {
      const same = its.every((x) => val(x) === val(its[0]));
      const body = same ? `${esc(val(its[0]))} <span class="ai-dim">(${esc(list(its.map((x) => x.period)))})</span>` : its.map((x) => `${esc(x.period)}: ${esc(val(x))}`).join("; ");
      return `<li><b>${esc(its[0].label)}</b>: ${body}${its[0].help ? `<br><span class="ai-dim">${esc(its[0].help)}</span>` : ""}</li>`;
    });
    if (!rows.length) extra.slice(0, 4).forEach(([a, b]) => rows.push(`<li><b>${esc(a)}</b>: ${esc(b)}</li>`));
    return A(`<p>In <b>${esc(cs.name)}</b> (${label(year)}):</p><ul>${rows.join("")}</ul>`, {
      src: [[`calculator.html?season=${year}`, `Try it in the ${cs.name} calculator`]],
      chips: [`What are the ranking points in ${cs.name}?`, `How much is a foul in ${cs.name}?`],
    });
  }

  function seasonAnswer(D, year, part) {
    const s = D.seasons.find((x) => x.year === year); if (!s) return null;
    const h = `ftc.html?season=${year}#games`;
    if (part && s.periods?.[part]) {
      const nm = part === "auto" ? "autonomous (the first 30 seconds)" : part === "teleop" ? "TeleOp" : "the endgame";
      return A(`<p>In <b>${esc(s.name)}</b>, here's what happens in ${nm}:</p><p>${esc(s.periods[part])}</p>`, { src: [[h, `${s.name} in 3D`]], chips: [`How do you score points in ${s.name}?`] });
    }
    const cur = year === curSeason();
    const intro = cur ? `is this season's FTC game (${label(year)})` : `was the ${label(year)} FTC game`;
    return A(`<p><b>${esc(s.name)}</b> ${s.presenter ? `${esc(s.presenter)} ` : ""}${intro}${s.theme ? `, part of the ${esc(s.theme)} season` : ""}.</p><p>${esc(s.summary)}</p>${s.objective ? `<p><b>Goal:</b> ${esc(s.objective)}</p>` : ""}`, {
      src: [[h, `See ${s.name} in 3D`], [`calculator.html?season=${year}`, `${s.name} score calculator`]],
      chips: [`What happens in auto in ${s.name}?`, `How do you score points in ${s.name}?`, `What are the ranking points in ${s.name}?`],
    });
  }

  async function resultsAnswer(D, q) {
    const c = D.content; if (!c) return null;
    const ftc = await loadResults(c);
    const fs = `https://ftcscout.org/teams/${c.team.number}`;
    if (!ftc) return A(`<p>I couldn't load our live results right now. You can see every event and match on ${link(fs, "FTCScout", true)}.</p>`);
    const ql = q.toLowerCase();
    if (/\baward/.test(ql)) {
      const aw = ftc.awards || [];
      const mile = (c.achievements || []).filter((a) => a.icon === "award");
      if (!aw.length && !mile.length) return A(`<p>We haven't won an official FTC award yet, but we're working on it! Our milestones are on the ${link(u("team.html#milestones"), "Team page")}.</p>`);
      return A(`<p>Our awards:</p><ul>${aw.map((a) => `<li><b>${esc(a.type.replace(/([a-z])([A-Z])/g, "$1 $2"))}${/Award|Alliance/.test(a.type) ? "" : " Award"}</b> at ${esc(a.eventName)}</li>`).join("")}${mile.map((a) => `<li><b>${esc(a.title)}</b> (${esc(fmtDate(a.date))})</li>`).join("")}</ul>`, { src: [["team.html#milestones", "Milestones and awards"]] });
    }
    if (/\b(next|upcoming|coming up|schedule)\b/.test(ql)) {
      const n = (ftc.upcoming || [])[0];
      if (!n) return A(`<p>We don't have another event on the schedule yet. Check ${link(fs, "FTCScout", true)} for updates.</p>`);
      return A(`<p>Our next event is <b>${esc(n.name)}</b> on ${esc(fmtDate(n.start))}${n.city ? ` in ${esc(n.city)}, ${esc(n.state)}` : ""}${n.venue ? ` (${esc(n.venue)})` : ""}. Come cheer us on!</p>`, { src: [[fs, "Event list on FTCScout", 1]] });
    }
    const evs = ftc.seasons.flatMap((s) => s.events);
    if (!evs.length) return A(`<p>We haven't played any matches yet this season. Check back soon!</p>`, { src: [[fs, "FTCScout", 1]] });
    const tally = (e) => e.reduce((a, x) => [a[0] + x.wins, a[1] + x.losses, a[2] + x.ties], [0, 0, 0]);
    const rec = ([w, l, t]) => `${w}–${l}${t ? `–${t}` : ""}`;
    const rows = ftc.seasons.filter((s) => s.events.length).map((s) => {
      const nm = D.seasons.find((x) => x.year === s.season)?.name || label(s.season);
      return `<li><b>${esc(nm)}</b> (${label(s.season)}): ${s.events.length} event${s.events.length > 1 ? "s" : ""}, ${rec(tally(s.events))} record<ul>${s.events.map((e) => `<li>${esc(e.name)}${e.rank ? `: ranked ${ord(e.rank)}` : ""}${e.wins + e.losses + e.ties ? `, ${rec([e.wins, e.losses, e.ties])}` : ""}</li>`).join("")}</ul></li>`;
    });
    const best = evs.filter((e) => e.rank).sort((a, b) => a.rank - b.rank)[0];
    return A(`<p>Here's how Steel Surge has done so far (${rec(tally(evs))} overall in qualification matches):</p><ul>${rows.join("")}</ul>${best ? `<p>Our best finish so far: <b>${ord(best.rank)}</b> at ${esc(best.name)}.</p>` : ""}${ftc.stale ? '<p class="ai-note">These numbers come from our saved copy, because live data didn\'t load.</p>' : ""}`, {
      src: [[fs, "Every match on FTCScout", 1]], chips: ["When is our next event?", "Has Steel Surge won any awards?"],
    });
  }

  function memberAnswer(D, q) {
    const c = D.content; if (!c?.members?.length) return null;
    const ql = q.toLowerCase(), M = c.members;
    const byName = M.filter((m) => { const [f, ...r] = m.name.toLowerCase().split(" "); return new RegExp(`\\b(${f}|${m.name.toLowerCase()})\\b`).test(ql) || r.some((x) => x.length > 3 && new RegExp(`\\b${x}\\b`).test(ql) && ql.includes(f)); });
    const card = (m) => `<div class="ai-person"><img src="${esc(u(m.photo))}" alt="" loading="lazy" onerror="this.remove()"><div><b>${esc(m.name)}</b><span>${esc(m.role)}</span></div></div>`;
    if (byName.length) return A(byName.map((m) => `${card(m)}<p>${esc(m.bio)}</p>`).join(""), { src: [["team.html", "Meet the whole team"]] });
    const roles = [["captain", /captain|leader of (the )?team|team leader|runs the team|in charge of the team/], ["driv", /driv/], ["programm", /program|code|coder|software/], ["cad", /\bcad\b|design/], ["mechanical", /mechanic|build/], ["outreach", /outreach|business|social media/]];
    const want = /\bwho\b|\blead|\bhead|\bcaptain|\bin charge|\brun/.test(ql) ? roles.find(([, re]) => re.test(ql)) : null;
    if (want) {
      const byRole = M.filter((m) => new RegExp(want[0], "i").test(m.role));
      const hits = (byRole.length ? byRole : M.filter((m) => new RegExp(want[0], "i").test(m.bio))).sort((a, b) => (/head|lead/i.test(b.role) ? 1 : 0) - (/head|lead/i.test(a.role) ? 1 : 0));
      if (hits.length) return A(`${hits.slice(0, 3).map((m) => card(m)).join("")}<p>${esc(hits[0].bio)}</p>`, { src: [["team.html", "Meet the whole team"]] });
    }
    if (/\b(how many (members|students|people|kids)|members|roster|who('s| is) on (the |your |steel surge)|team members|students)\b/.test(ql)) {
      return A(`<p>Steel Surge has <b>${M.length} students</b>:</p><ul>${M.map((m) => `<li><b>${esc(m.name)}</b>, ${esc(m.role)}</li>`).join("")}</ul>`, { src: [["team.html", "Team page"]], chips: [`Tell me about ${M[0].name.split(" ")[0]}`, "Who is the lead driver?"] });
    }
    return null;
  }

  function teamAnswer(D, q) {
    const c = D.content; if (!c) return null; const T = c.team, ql = q.toLowerCase();
    if (/\b(join|sign ?up|be on the team|become a member|tryout|try out|recruit)/.test(ql)) return A(`<p>We'd love to have you! Fill out our ${T.joinFormUrl ? link(T.joinFormUrl, "interest form", true) : "interest form"}, or send us a message on the ${link(u("contact.html"), "Contact page")} and pick "Joining the team". We're students from the Unionville-Chadds Ford School District.</p>`, { src: [["contact.html", "Contact page"]] });
    if (/\b(sponsor|donat|fund|support (the|your|steel)|tier)/.test(ql)) {
      const tiers = (c.sponsorTiers || []).map((t) => `<li><b>${esc(t.name)}</b> ($${Number(t.amount).toLocaleString()}): ${esc(list(t.perks))}</li>`).join("");
      return A(`<p>${esc(c.sponsorPitch || "Sponsors keep our team building.")}</p>${tiers ? `<ul>${tiers}</ul>` : ""}<p>To sponsor us, send a message on the ${link(u("contact.html"), "Contact page")} and choose "Sponsorship".</p>`, { src: [["sponsors.html", "Sponsors page"]], chips: ["Who sponsors Steel Surge?"] });
    }
    if (/\b(who sponsors|our sponsors|your sponsors|sponsors are)/.test(ql)) return A(`<p>Our partners and sponsors: ${esc(list((c.sponsors || []).map((s) => s.name)))}. Thank you!</p>`, { src: [["sponsors.html", "Sponsors page"]] });
    if (/\b(contact|email|reach|message|get in touch)/.test(ql)) return A(`<p>Email the team at ${link("mailto:" + T.email, T.email)} or use the form on the ${link(u("contact.html"), "Contact page")}. Every message goes to the team account.</p>`);
    if (/\b(number|team #|what team)\b/.test(ql)) return A(`<p>We're FIRST Tech Challenge team <b>#${esc(T.number)}</b>, ${esc(T.name)}.</p>`, { src: [[`https://ftcscout.org/teams/${T.number}`, "Team 27254 on FTCScout", 1]] });
    if (/\b(where|located|location|from|school|district)\b/.test(ql)) return A(`<p>We're based in <b>${esc(T.location)}</b>. Our students come from ${esc(T.school)}.</p>`);
    if (/\b(founded|rookie|how old|first season)\b|\bwhen (did|was) (you|we|steel surge|the team)\b/.test(ql)) return A(`<p>Steel Surge was founded in 2024. Our rookie season was <b>${label(T.rookieYear)}</b> (INTO THE DEEP).</p>`, { src: [["team.html#milestones", "Our milestones"]] });
    if (/\b(motto|slogan|mascot)\b/.test(ql)) return A(`<p>Our motto is <b>"${esc(T.motto)}"</b>${T.mascot ? ` and our mascot is <b>${esc(T.mascot)}</b>` : ""}. ⚡</p>`);
    if (/\b(social|instagram|youtube|channel|video)/.test(ql)) return A(`<p>Find us here: ${(T.socials || []).map((s) => link(s.url, s.label, true)).join(" · ")}${T.instagram ? ` · ${link("https://instagram.com/" + T.instagram, "Instagram", true)}` : ""}. Our videos are also on the ${link(u("media.html"), "Media page")}.</p>`);
    return null;
  }

  function arcadeAnswer(D, q) {
    const G = SS().GAMES || [], ql = q.toLowerCase();
    const g = G.find((x) => new RegExp(`\\b${x.title.toLowerCase()}\\b`).test(ql));
    if (g) return A(`<p><b>${esc(g.title)}</b> · ${esc(g.genre)}</p><p>${esc(g.blurb)}</p><p><b>Controls:</b> ${esc(g.controls)}. Every game has five difficulty levels, from Super Easy to Extreme.</p>`, { src: [[`arcade/${g.id}.html`, `Play ${g.title}`]] });
    if (/\b(arcade|minigames?|bored|something fun|games (on|in) (the|this|your) (site|website)|what games|play a game)\b/.test(ql)) {
      return A(`<p>The Steel Surge Arcade has ${G.length} original games, each with five difficulty levels:</p><ul>${G.map((x) => `<li>${link(u(`arcade/${x.id}.html`), x.title)} · ${esc(x.genre)}</li>`).join("")}</ul>`, { src: [["arcade.html", "Open the arcade"]], chips: ["How do I play Kilovolt?", "How do I earn trophies?"] });
    }
    return null;
  }

  function trophyAnswer(D, q) {
    const L = (SS().TROPHIES || []).filter((t) => !t.hidden); if (!L.length || !/troph|badge|platinum|achievement/i.test(q)) return null;
    const qs = terms(q).filter((w) => !["trophy", "earn", "unlock", "badge"].includes(w));
    const t = L.find((x) => qs.length && terms(x.name).length && terms(x.name).every((w) => qs.includes(w)));
    if (t) return A(`<p><b>${esc(t.name)}</b> (${esc(t.tier)}): ${esc(t.desc)}</p>`, { src: [["trophies.html", "Your trophies"]] });
    const s = SS().trophySummary?.();
    return A(`<p>There are <b>${(SS().TROPHIES || []).length} trophies</b> to earn by exploring the site and playing the arcade, from bronze up to a platinum for collecting them all.${s ? ` You have <b>${s.earned}</b> so far.` : ""}</p><p>Tip: playing arcade games on Extreme unlocks the hardest ones.</p>`, { src: [["trophies.html", "See every trophy"]] });
  }

  function smallTalk(q) {
    const ql = q.toLowerCase().trim();
    if (/^(hi|hey|hello|yo|sup|howdy|hiya|good (morning|afternoon|evening))\b[!. ]*$/.test(ql)) return A("<p>Hi! I'm Steel AI. ⚡ Ask me about Steel Surge, FTC, this year's game, point values, or the arcade.</p>");
    if (/\b(thank|thanks|thx|ty)\b/.test(ql)) return A("<p>Anytime! Surge Ahead. ⚡</p>");
    if (/\b(who|what) are you\b|\bare you (an? )?(ai|bot|robot|real|human|chatgpt)\b|\bwhat can you do\b|\bhelp\b$/.test(ql)) return A("<p>I'm <b>Steel AI</b>, Steel Surge's site assistant. I run right in your browser and answer from our site's data: the team, every FTC game since 2017–18, point values and ranking points, our results, the arcade, and trophies.</p><p>I'm not a full chatbot, so for official rulings, check the game manual.</p>", { chips: ["What's this year's game?", "How did Steel Surge do this season?", "How many points is a HIVE TIP?"] });
    if (/\bjoke|funny|make me laugh\b/.test(ql)) return A(`<p>${JOKES[Math.floor(Math.random() * JOKES.length)]}</p>`, { chips: ["Tell me another joke"] });
    if (/\b(best team|are you good|is steel surge good)\b/.test(ql)) return A("<p>I might be a little biased, but Steel Surge is my favorite team. ⚡ See for yourself:</p>", { chips: ["How did Steel Surge do this season?"] });
    return null;
  }

  /** Edit distance with an early exit once it passes `max`. */
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i]; let low = i;
      for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); low = Math.min(low, cur[j]); }
      if (low > max) return max + 1; prev = cur;
    }
    return prev[b.length];
  }
  /** "artifcats in decod" → "artifacts in decode". Only unknown words of 5+ letters are touched. */
  async function correct(D, q) {
    const m = await loadManual(curSeason());
    const idx = [D.index, m?.index].filter(Boolean);
    const known = (t) => idx.some((x) => t in x.df);
    const fixes = [];
    const out = q.replace(/[A-Za-z]{5,}/g, (w) => {
      const lw = w.toLowerCase(), t = terms(lw)[0];
      if (!t || STOP.has(lw) || known(t) || D.seasons.some((s) => s.name.toLowerCase().replace(/ /g, "") === lw)) return w;
      const max = lw.length >= 8 ? 2 : 1; let best = null;
      for (const x of idx) for (const [v, n] of Object.entries(x.surf)) {
        const d = lev(lw, x.surf[v], max); if (d > max) continue;
        const score = d * 1000 - (x.df[v] || 0);
        if (!best || score < best.score) best = { word: x.surf[v], score };
      }
      if (!best) return w;
      fixes.push(best.word); return best.word;
    });
    return { q: out, fixed: fixes.length > 0 };
  }

  async function answer(raw) {
    const D = await loadData();
    const { q, fixed } = await correct(D, raw);
    const a = await answerCore(D, q);
    if (fixed && !a.miss) a.html = `<p class="ai-dim">I read that as "${esc(q)}".</p>` + a.html;
    return a;
  }

  async function answerCore(D, q) {
    const ql = q.toLowerCase();
    const st = smallTalk(q); if (st) return st;
    const named = findSeason(D, q);
    const year = named || ctx.season || curSeason();
    if (named) ctx.season = named;
    const rulesy = /\b(allowed|legal|illegal|can (we|i|a robot|robots|you|teams?|drivers?|the (coach|driver|human player))|is it ok|rules?|manual|what happens if|penalt(y|ies) for|disqualif\w*|yellow card|red card|inspection|inspector|sizing|starting (size|configuration)|weight|batter(y|ies)|motors?|servos?|cameras?|legal parts?|drive team|human player|coach|g\d{3}|r\d{3})\b/.test(ql);
    const rid = await ruleIdAnswer(q, year, named); if (rid) return rid;

    // Results and team facts first: they are about us, not a game
    const aboutUs = /\b(we|our|us|you|your|steel surge|the team|27254)\b/.test(ql);
    if ((/\b(how did|how('d| are| is) (we|you|steel surge|the team) (do|doing)|record|results?|rank(ed)? at|next (event|competition|match)|upcoming)\b/.test(ql) || (aboutUs && /\b(win|won|wins|awards?|compete|competition|events?)\b/.test(ql))) && !/\b(rank(ing)? points?|rp)\b/.test(ql) && !/\b(worth|points? (for|is)|how many points)\b/.test(ql)) {
      const r = await resultsAnswer(D, q); if (r) return r;
    }
    if (/\bhow long (is|are|does) (a |an |the |each )?(ftc )?match/.test(ql) || /\bmatch (length|time)\b/.test(ql)) {
      const b = BASICS.find((x) => x[0] === "How a match works");
      return A(`<p><b>${esc(b[0])}</b></p><p>${esc(b[1])}</p><p>That's 2 minutes and 38 seconds in all, including the 8-second transition.</p>`, { src: [["ftc.html", "FTC page"]] });
    }
    const mem = memberAnswer(D, q); if (mem) return mem;
    const tm = teamAnswer(D, q); if (tm) return tm;
    const tr = trophyAnswer(D, q); if (tr) return tr;

    // Points, fouls, ranking points
    if (!rulesy && /\b(points?|pts|worth|scor(e|es|ing)|how much|value|fouls?|penalt\w*|ranking points?|rp|rps|bonus)\b/.test(ql)) {
      let p = pointsAnswer(D, q, year), py = year;
      if (!p && !named) for (const y of D.calc.map((c) => c.year).filter((y) => y !== year)) { p = pointsAnswer(D, q, y); if (p) { py = y; break; } }
      if (p) { ctx.season = py; return p; }
    }
    if (named && /\b(how (do|does|can) (you|i|we|teams?|robots?) score|scoring|ways to score)\b/.test(ql)) {
      const s = D.seasons.find((x) => x.year === named);
      if (s?.scoring) return A(`<p>Main ways to score in <b>${esc(s.name)}</b>:</p><ul>${s.scoring.map(([a, b]) => `<li><b>${esc(a)}</b>: ${esc(b)}</li>`).join("")}</ul>`, { src: [[`calculator.html?season=${named}`, `${s.name} score calculator`]], chips: [`What are the ranking points in ${s.name}?`, `What happens in auto in ${s.name}?`] });
    }
    const man = await manualSearch(q, year);
    const manualReply = () => {
      const top = man.hits[0], others = man.hits.slice(1).filter((h) => h.s > top.s * 0.6 && h.d !== top.d);
      const a = manualAnswer(man.m, top.d, q, others.map((h) => h.d));
      if (!named) a.html = `<p class="ai-dim">From the ${esc(man.m.name)} (${label(year)}) manual. Name a season to search a different one.</p>` + a.html;
      const prev = D.seasons.find((s) => s.year === year - 1);
      if (!named && prev) a.chips = [...(a.chips || []).slice(0, 2), `${q.replace(/[?.!\s]+$/, "")} in ${prev.name}?`];
      ctx.season = year; return a;
    };
    // ...unless a built-in answer covers the whole question better than any rule does
    const kbFull = (() => { const want = [...new Set(terms(q))].filter((w) => !GENERIC.has(w) && w !== "robot"); return search(D, q, 3).some((h) => h.d.kind === "ftc" && !h.d.tags.includes("@manual") && want.every((w) => new Set(terms(`${h.d.title} ${h.d.tags} ${h.d.text}`)).has(w))); })();
    if (rulesy && man && man.hits[0].s >= 4 && !(kbFull && man.hits[0].cov < 1)) return manualReply();

    // Season overview / periods
    const part = /\b(auto|autonomous|auton)\b/.test(ql) ? "auto" : /\b(tele-?op|driver[- ]controlled)\b/.test(ql) ? "teleop" : /\bend ?game\b/.test(ql) ? "endgame" : null;
    if (named && (part || /\b(what|about|explain|overview|summary|describe|how do you play|how does|rules?)\b/.test(ql) || terms(q).length <= 2)) {
      const qt = terms(q).filter((w) => !terms(D.seasons.find((s) => s.year === named)?.name || "").includes(w) && !GENERIC.has(w) && !/^\d+$/.test(w) && !["what", "explain", "overview", "summary", "describe", "play", "rule", "autonomous", "teleop", "endgame"].includes(w));
      if (!qt.length || part) { const s = seasonAnswer(D, named, part); if (s) return s; }
    }
    if (!named && /\b(this|current|new) (year'?s? )?(game|season)\b|\bthis year'?s game\b|\bwhat game\b/.test(ql)) { ctx.season = curSeason(); return seasonAnswer(D, curSeason(), part); }
    if (!named && part && ctx.season) return seasonAnswer(D, ctx.season, part);

    const ar = !named && !rulesy && arcadeAnswer(D, q); if (ar) return ar;

    // Everything else: search the knowledge base
    const sq = named ? q : (ctx.season && /\b(it|that|they|this)\b/.test(ql) ? `${q} ${D.seasons.find((s) => s.year === ctx.season)?.name || ""}` : q);
    let hits = search(D, sq, 8);
    if (rulesy) hits = hits.filter((h) => h.d.kind === "season" || h.d.kind === "ftc");
    if (named) { const nm = D.seasons.find((s) => s.year === named)?.name; const pref = hits.filter((h) => h.d.kind !== "season" || h.d.title.startsWith(nm)); if (pref.length) hits = pref; }
    const want = [...new Set(terms(sq))].filter((w) => !GENERIC.has(w));
    hits = hits.filter((h) => { if (!want.length) return true; const have = new Set(terms(`${h.d.title} ${h.d.tags} ${h.d.text}`)); const c = want.filter((w) => have.has(w)).length / want.length; return c >= (want.length <= 2 ? 0.99 : 0.5); });
    const best = hits[0];
    if (man && man.hits[0].s >= 5 && best && best.d.tags.includes("@manual")) return manualReply();
    const definition = !rulesy && /^(what|what's|whats) (is|are)\b/.test(ql);
    if (man && man.hits[0].s >= 6 && (!best || (!definition && (best.s < 4 || man.hits[0].s > best.s * 1.6)))) return manualReply();
    if (!best || best.s < 2.2) {
      if (man && man.hits[0].s >= 4) return manualReply();
      return A(`<p>I'm not sure about that one yet. ${rulesy ? `For rule questions, the official ${link(MANUALS, "Competition Manual", true)} and the ${link(QA, "FTC Q&A forum", true)} have the final word.` : `You can email the team at ${link("mailto:" + (D.content?.team.email || ""), D.content?.team.email || "our team email")} and a real person will answer.`}</p><p>Here are some things I know well:</p>`, { chips: ["What's this year's game?", "How does an FTC match work?", "How can I join the team?", "What games are in the arcade?"], miss: true });
    }
    const d = best.d;
    const others = hits.slice(1).filter((h) => h.s > best.s * 0.55 && h.d.title !== d.title).slice(0, 2);
    const src = [[d.href, d.href.startsWith("http") ? "Official source" : (PAGES.find((p) => p[2] === d.href.split("?")[0].split("#")[0])?.[0] || "Read more"), d.href.startsWith("http")]];
    let html = `<p><b>${esc(d.title)}</b></p><p>${esc(d.text)}</p>`;
    if (rulesy) html += `<p class="ai-note">Rules can be tricky, so check the exact wording in the ${link(MANUALS, "official manual", true)} before a match.</p>`;
    if (d.kind === "season") { const y = D.seasons.find((s) => d.title.startsWith(s.name))?.year; if (y) ctx.season = y; }
    return A(html, { src, chips: others.map((h) => `Tell me about ${h.d.title.replace(/ \(arcade game\)$/, "").replace(/^Trophy: /, "the trophy ")}`) });
  }

  /* ---------------- Widget ---------------- */
  const BOLT = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 2 4 13.5h6.5L9 22l10-12.5h-6.6L13.5 2Z"/></svg>';
  const X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  const SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const RESET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>';
  const START = ["What's this year's game?", "How many points is a HIVE TIP?", "How big can a robot be?", "Who is our lead driver?", "How did Steel Surge do this season?", "How can I join the team?"];

  let root, log, input, open = false, busy = false, history = [];
  const save = () => { try { sessionStorage.setItem(CHAT_KEY, JSON.stringify(history.slice(-40))); } catch {} };

  function build() {
    root = document.createElement("div"); root.className = "ai"; root.innerHTML = `
      <button class="ai-fab" type="button" aria-expanded="false" aria-controls="ai-panel">${BOLT}<span>Ask Steel AI</span></button>
      <section class="ai-panel" id="ai-panel" role="dialog" aria-label="Steel AI assistant" hidden>
        <header class="ai-head">
          <span class="ai-avatar">${BOLT}</span>
          <div><b>Steel AI</b><small>Answers from our site and FTC game data</small></div>
          <button class="ai-icon" type="button" data-ai="reset" title="New chat" aria-label="Start a new chat">${RESET}</button>
          <button class="ai-icon" type="button" data-ai="close" title="Close" aria-label="Close Steel AI">${X}</button>
        </header>
        <div class="ai-log" aria-live="polite"></div>
        <form class="ai-form">
          <input type="text" maxlength="300" autocomplete="off" placeholder="Ask about the team, FTC, or a game…" aria-label="Your question">
          <button class="ai-send" type="submit" aria-label="Send">${SEND}</button>
        </form>
        <p class="ai-foot">Steel AI can make mistakes. For official rulings, see the ${link(MANUALS, "game manual", true)}.</p>
      </section>`;
    document.body.append(root);
    log = root.querySelector(".ai-log"); input = root.querySelector("input");
    root.querySelector(".ai-fab").addEventListener("click", () => toggle(!open));
    root.querySelector('[data-ai="close"]').addEventListener("click", () => toggle(false));
    root.querySelector('[data-ai="reset"]').addEventListener("click", () => { history = []; ctx.season = null; save(); log.innerHTML = ""; welcome(); input.focus(); });
    root.querySelector(".ai-form").addEventListener("submit", (e) => { e.preventDefault(); ask(input.value); });
    input.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowUp" || input.value) return;
      const last = [...history].reverse().find((m) => m.role === "user"); if (!last) return;
      e.preventDefault(); input.value = last.text; input.setSelectionRange(input.value.length, input.value.length);
    });
    document.addEventListener("click", (e) => {
      const t = e.target.closest("[data-ai-ask]"); if (!t) return;
      e.preventDefault(); toggle(true); if (t.dataset.aiAsk) ask(t.dataset.aiAsk);
    });
    log.addEventListener("click", (e) => { const b = e.target.closest(".ai-chip"); if (b) ask(b.dataset.q); });
    addEventListener("keydown", (e) => { if (e.key === "Escape" && open) { toggle(false); root.querySelector(".ai-fab").focus(); } });
    try { history = JSON.parse(sessionStorage.getItem(CHAT_KEY)) || []; } catch { history = []; }
  }

  function toggle(v) {
    open = v; const p = root.querySelector(".ai-panel"), fab = root.querySelector(".ai-fab");
    p.hidden = !v; fab.setAttribute("aria-expanded", String(v)); root.classList.toggle("open", v);
    document.documentElement.classList.toggle("ai-open", v);
    if (v) {
      if (!log.childElementCount) { if (history.length) history.forEach((m) => render(m, false)); else welcome(); }
      loadData(); setTimeout(() => input.focus(), 60); log.scrollTop = log.scrollHeight;
    }
  }

  function welcome() {
    render({ role: "bot", html: "<p>Hi, I'm <b>Steel AI</b> ⚡ I know about Steel Surge, every FTC game since 2017–18 (including the official game manuals), point values, our results, and the arcade. What would you like to know?</p>", chips: START }, false);
  }

  function render(m, keep = true) {
    const el = document.createElement("div"); el.className = `ai-msg ${m.role}`;
    if (m.role === "user") el.textContent = m.text;
    else {
      el.innerHTML = m.html
        + (m.src?.length ? `<div class="ai-src">${m.src.map(([h, t, ext]) => `<a href="${esc(/^https?:/.test(h) ? h : u(h))}"${ext || /^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ""}>${esc(t)} →</a>`).join("")}</div>` : "")
        + (m.chips?.length ? `<div class="ai-chips">${m.chips.map((c) => `<button type="button" class="ai-chip" data-q="${esc(c)}">${esc(c)}</button>`).join("")}</div>` : "");
    }
    log.append(el); log.scrollTop = log.scrollHeight;
    if (keep) { history.push(m); save(); }
    return el;
  }

  async function ask(text) {
    const q = String(text || "").trim(); if (!q || busy) return;
    busy = true; input.value = "";
    log.querySelectorAll(".ai-chips").forEach((c) => c.remove());
    render({ role: "user", text: q });
    const dots = document.createElement("div"); dots.className = "ai-msg bot ai-typing"; dots.innerHTML = "<i></i><i></i><i></i>"; dots.setAttribute("aria-label", "Steel AI is thinking"); log.append(dots); log.scrollTop = log.scrollHeight;
    let a; const t0 = performance.now();
    try { a = await answer(q); } catch (err) { console.error("[Steel AI]", err); a = A("<p>Something went wrong on my end. Try asking again in a moment.</p>"); }
    await new Promise((r) => setTimeout(r, Math.max(0, 450 - (performance.now() - t0))));
    dots.remove();
    render({ role: "bot", ...a }).classList.add("in");
    busy = false; input.focus();
    SS().trophy?.("curious");
  }

  window.SteelAI = { ask: (q) => { if (!open) toggle(true); return ask(q); }, answer, open: () => toggle(true), forget: () => { ctx.season = null; }, searchManual: (q, y) => manualSearch(q, y || curSeason()) };
  const start = async () => {
    // Stay hidden when the team switches Steel AI off or the site is in maintenance mode.
    try { const c = await SS().loadContent?.(); if (c && SS().siteOff?.(c, "steelAI")) return; } catch {}
    build(); if (/[?&]ask=/.test(location.search)) { const q = new URLSearchParams(location.search).get("ask"); toggle(true); if (q) ask(q); } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
