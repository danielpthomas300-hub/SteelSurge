/* ==========================================================================
   KILOVOLT — a daily FTC trivia game.
   Seven prompts ("Name an FTC team from Ohio", "Name a game element from
   SKYSTONE"). Any right answer scores, but the less obvious it is, the more
   charge it's worth:
   Spark → Static → Current → Voltage → Overload → Full Surge.
   Team data: content/teams.json (every FTC team since 2019, from FTCScout),
   refreshed automatically once a week. Everything else (game elements,
   awards, robot parts…): assets/js/arcade/kilovolt-facts.js.
   ========================================================================== */
(() => {
  "use strict";
  const { Game, Sound, COLORS: C, store, pick, level, levelName, rand } = window.Arcade;
  const W = 900, H0 = 620, ROUND = 7;

  /* ---------------- Tiers ---------------- */
  const TIERS = [
    { key: "spark", name: "Spark", pts: 10, color: "#ffd166", emoji: "🟨", blurb: "One of the best-known answers." },
    { key: "static", name: "Static", pts: 15, color: "#c9d3de", emoji: "⬜", blurb: "A popular pick." },
    { key: "current", name: "Current", pts: 30, color: "#3ddc97", emoji: "🟩", blurb: "A solid answer beyond the obvious." },
    { key: "voltage", name: "Voltage", pts: 60, color: "#3ba8ff", emoji: "🟦", blurb: "Uncommon. Nice." },
    { key: "overload", name: "Overload", pts: 85, color: "#c38bff", emoji: "🟪", blurb: "A deep cut." },
    { key: "surge", name: "Full Surge", pts: 100, color: "#ff8a3d", emoji: "⚡", blurb: "One in a surge." },
  ];
  // Share of the valid answers (most famous first) that falls in each tier
  const CUTS = [0.03, 0.08, 0.25, 0.5, 0.8, 1];
  const RANKS = [[0, "Spark"], [1000, "Static"], [2000, "Current"], [3500, "Voltage"], [5000, "Overload"], [6000, "Full Surge"]];
  const rankFor = (v) => RANKS.filter(([min]) => v >= min).pop()[1];
  /** Scales a score to a seven-prompt round, so ranks and trophies are fair for any round length. */
  const per7 = (total, n) => Math.round((total * ROUND) / Math.max(1, n || ROUND));
  const HOME = 27254; // Steel Surge

  /* ---------------- Names for regions ---------------- */
  const US = { AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "Washington, D.C.", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", PR: "Puerto Rico" };
  const CA = { AB: "Alberta", BC: "British Columbia", MB: "Manitoba", NB: "New Brunswick", NL: "Newfoundland and Labrador", NS: "Nova Scotia", ON: "Ontario", PE: "Prince Edward Island", QC: "Quebec", SK: "Saskatchewan" };
  const seasonName = (y) => `${y}–${String(y + 1).slice(2)}`;

  /* ---------------- Themed word lists (matched as whole words) ---------------- */
  const THEMES = [
    { id: "animal", label: "an animal in its name", words: "wolf wolves lion lions tiger tigers bear bears panther panthers falcon falcons eagle eagles hawk hawks owl owls raven ravens shark sharks bee bees hornet hornets wasp wasps penguin penguins fox foxes cat cats dog dogs duck ducks squirrel squirrels llama llamas monkey monkeys gorilla gorillas cobra cobras viper vipers python pythons dragonfly octopus kraken jaguar jaguars cheetah cheetahs bulldog bulldogs mustang mustangs bison buffalo rhino rhinos hippo turtle turtles frog frogs goat goats ram rams moose otter otters beaver beavers badger badgers wolverine wolverines lynx coyote coyotes stallion stallions spider spiders scorpion scorpions ant ants beetle beetles dolphin dolphins whale whales orca orcas crab crabs lobster lobsters mantis rabbit rabbits bunny bunnies mouse mice rat rats bat bats crow crows sparrow robin robins parrot parrots flamingo flamingos pelican swan swans goose geese chicken chickens rooster yak zebra zebras giraffe kangaroo koala panda pandas sloth sloths hedgehog hedgehogs raccoon raccoons armadillo armadillos alpaca alpacas" },
    { id: "color", label: "a color in its name", words: "red blue green yellow orange purple violet black white gray grey silver gold golden crimson scarlet azure cyan teal maroon indigo pink navy emerald ruby sapphire amber" },
    { id: "food", label: "a food in its name", words: "pi pie pizza taco tacos cookie cookies donut donuts doughnut bacon waffle waffles pickle pickles potato potatoes noodle noodles nugget nuggets cheese burrito burritos pancake pancakes muffin muffins cupcake cupcakes toast bagel bagels pretzel pretzels popcorn peanut peanuts butter banana bananas apple apples cherry cherries lemon lemons mango coconut nacho nachos spaghetti meatball meatballs sushi dumpling dumplings cake candy chocolate coffee tea juice soup bean beans pepper peppers carrot carrots tomato tomatoes onion onions avocado broccoli pineapple" },
    { id: "space", label: "something from space in its name", words: "star stars galaxy galaxies nebula comet comets meteor meteors asteroid asteroids orbit orbital rocket rockets astro astronaut astronauts cosmic cosmos planet planets moon lunar solar sun sol mars jupiter saturn venus mercury neptune pluto apollo voyager nova supernova quasar pulsar eclipse universe space spaceship satellite satellites" },
    { id: "weather", label: "weather in its name", words: "storm storms thunder lightning tornado tornadoes hurricane hurricanes blizzard cyclone typhoon rain snow snowflake hail frost ice icy wind winds cloud clouds fog thunderstorm tempest avalanche" },
    { id: "myth", label: "a mythical creature or legend in its name", words: "dragon dragons phoenix griffin griffins gryphon unicorn unicorns titan titans kraken hydra pegasus centaur minotaur cyclops yeti sasquatch golem golems wizard wizards wizardz sorcerer valkyrie valkyries dino dinos dinosaur dinosaurs mermaid troll trolls goblin goblins ogre ogres elf elves dwarf dwarves zeus thor odin loki athena hermes poseidon hades atlas olympus" },
    { id: "metal", label: "a metal in its name", words: "steel iron titanium copper bronze tin zinc nickel cobalt chrome chromium aluminum aluminium platinum tungsten metal metals metallic alloy lead mercury" },
    { id: "ocean", label: "something from the ocean in its name", words: "ocean oceans sea seas wave waves tide tides shark sharks whale whales dolphin dolphins octopus kraken squid coral reef pirate pirates anchor anchors ship ships sail sails submarine sub subs marine navy fish fishes crab crabs lobster lobsters turtle turtles orca orcas jellyfish seal seals deep abyss atlantis trident poseidon neptune harbor port" },
    { id: "music", label: "something musical in its name", words: "rock roll rocker rockers band bands music musical jazz blues beat beats rhythm melody harmony symphony tempo bass drum drums guitar piano note notes tune tunes song songs sonic sound sounds echo echoes chorus disco funk punk pop opera" },
    { id: "speed", label: "speed in its name", words: "fast faster turbo rapid rapids sonic swift velocity zoom rush speed speedy hyper quick quicksilver nitro blitz dash racer racers racing sprint jet jets warp flash momentum" },
    { id: "computer", label: "something from computers or coding in its name", words: "byte bytes bit bits code coders coding coder pixel pixels binary java python cpu data algorithm algorithms debug bug bugs glitch glitches hack hackers hacker cyber software hardware kernel syntax compile compiler loop loops boolean null error errors overflow cache cloud server servers firewall network matrix digital virtual ai" },
    { id: "royal", label: "royalty in its name", words: "king kings queen queens royal royals royalty crown crowns prince princes princess throne castle castles empire emperor kingdom regal duke lord lords monarch monarchs majesty" },
    { id: "nature", label: "something from nature in its name", words: "tree trees forest forests leaf leaves oak pine maple wood woods root roots flower flowers rose roses river rivers mountain mountains rock rocks stone stones canyon desert volcano volcanoes island islands earth terra garden gardens seed seeds bloom" },
    { id: "numword", label: "a number word in its name", words: "zero one two three four five six seven eight nine ten eleven twelve hundred thousand million billion infinity infinite first second third prime" },
    { id: "feeling", label: "a feeling or mood in its name", words: "happy mad crazy chaos chaotic panic confused clueless angry calm wild fearless brave bold savage silly lucky lost curious awesome epic insane frantic frenzy determined relentless unstoppable" },
    { id: "light", label: "light or fire in its name", words: "light lights fire fires flame flames blaze blazing spark sparks ember embers inferno glow neon laser lasers solar sunshine bright flash flare torch shine shining radiant lumen lumens" },
    { id: "job", label: "a job or role in its name", words: "knight knights pirate pirates ninja ninjas viking vikings spartan spartans warrior warriors samurai engineer engineers mechanic mechanics wizard wizards captain captains pilot pilots ranger rangers guardian guardians sentinel sentinels hunter hunters builder builders explorer explorers raider raiders crusader crusaders gladiator gladiators scout scouts soldier soldiers agent agents chef chefs doctor doctors king kings queen queens prince princess" },
  ];
  const KEYWORDS = ["bot", "robo", "tech", "gear", "byte", "bolt", "cyber", "mech", "circuit", "code", "quantum", "atomic", "nerd", "droid", "machine", "chaos", "error", "android", "logic", "binary", "pixel", "wired", "volt", "electric", "spark", "surge", "power", "fusion", "matrix", "techno", "engine", "crew", "squad", "lab", "factory", "robot", "titan", "dragon", "knight", "storm", "eagle", "hawk", "fire", "ice", "star", "lion", "tiger", "bear", "shark", "panther", "falcon", "phoenix", "viking", "pirate", "ninja", "spartan", "thunder", "lightning", "blue", "red", "green", "black", "gold", "iron", "steel", "metal", "rocket", "space", "galaxy", "atom", "wolf", "pack", "force", "max", "nova", "bit", "brain", "mind", "girl", "united", "alpha", "omega", "infinity", "zero", "hive", "bee", "rover", "drive", "motor", "wheel", "build", "maker", "inventor", "dynamic", "kinetic", "mechanical", "electro", "digital", "smart", "auto"];

  /* ---------------- Data ---------------- */
  let TEAMS = [], BY_NUM = new Map(), INDEX = new Map(), CATS = [], META = null;
  const norm = (s) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  const DROP = new Set(["the", "team", "robotics", "robotic", "ftc", "frc", "club", "inc"]);
  const key1 = (s) => norm(s).replace(/ /g, "");
  const key2 = (s) => norm(s).split(" ").filter((w) => !DROP.has(w)).join("");
  const words = (s) => new Set(norm(s).split(" "));

  async function loadData() {
    const res = await fetch("../content/teams.json", { cache: "no-cache" });
    const d = await res.json(); META = d;
    const COUNTRY_ALIAS = { "Chinese Taipei": "Taiwan", Independent: "" };
    TEAMS = d.teams.map(([number, name, rookie, city, state, country, fame, seasons]) => ({ number, name, rookie, city, state, country: COUNTRY_ALIAS[country] ?? country, fame, seasons, words: words(name), k1: key1(name), k2: key2(name) }));
    for (const t of TEAMS) {
      BY_NUM.set(t.number, t);
      for (const k of new Set([t.k1, t.k2])) { if (!k) continue; if (!INDEX.has(k)) INDEX.set(k, []); INDEX.get(k).push(t); }
    }
    buildCategories();
    buildFacts(window.KilovoltFacts);
    buildFacts(teamPrompts(await teamContent()));
  }
  /** The site's content (the team's draft when previewing), once site.js has loaded it. */
  const teamContent = () => window.SS?.content ? Promise.resolve(window.SS.content) : new Promise((r) => { document.addEventListener("ss:ready", (e) => r(e.detail), { once: true }); setTimeout(() => r(window.SS?.content || null), 4000); });
  /** Prompts the team writes in the Team editor (Site → Kilovolt prompts). Unlimited and Practice only. */
  const teamPrompts = (c) => (c?.kilovolt || []).filter((p) => String(p.prompt || "").trim() && (p.answers || []).some((a) => String(a).trim()))
    .map((p, i) => ({ id: `team-${i}`, type: "ftc", own: true, text: String(p.prompt).trim(), items: p.answers.map((a) => String(a).replace(/\|/g, "/").trim()).filter(Boolean).join("|") }));

  /* ---------------- FTC knowledge prompts (kilovolt-facts.js) ---------------- */
  // Answers are compared without capitals, spaces, punctuation, "the", or plural endings
  const sing = (w) => (w.length > 3 && /(ch|sh|x)es$/.test(w) ? w.slice(0, -2) : w.length > 3 && /[^s]s$/.test(w) ? w.slice(0, -1) : w);
  const fkey = (s) => norm(String(s).replace(/['’]/g, "")).split(" ").filter((w) => w && !["the", "a", "an"].includes(w)).map(sing).join("");
  const FACT_ALL = new Map();
  function buildFacts(list) {
    for (const f of list || []) {
      const seen = new Set(), items = [];
      f.items.split("|").map((n) => n.trim()).filter(Boolean).forEach((name) => {
        const keys = [...new Set([fkey(name), / award$/i.test(name) ? fkey(name.replace(/ award$/i, "")) : ""])].filter((k) => k && !seen.has(k));
        if (!keys.length) return; keys.forEach((k) => seen.add(k)); items.push({ name, rank: items.length, keys });
      });
      const cat = { type: f.type, id: f.id, text: f.text, season: f.season || "", facts: true, own: !!f.own, items, valid: items, test: () => false };
      for (const it of items) for (const k of it.keys) { if (!FACT_ALL.has(k)) FACT_ALL.set(k, []); FACT_ALL.get(k).push({ it, cat }); }
      CATS.push(cat);
    }
  }
  /** Earlier answers on a list are the obvious ones; later ones are worth more. */
  const factTier = (cat, it) => Math.min(5, Math.floor(((it.rank + 0.5) / cat.items.length) * 6));
  /** Returns { item, fits } for the best match, or null when it isn't on any list. */
  function findFact(raw, cat) {
    const k = fkey(raw); if (!k) return null;
    const max = k.length >= 10 ? 2 : 1;
    const dist = (it) => (it.keys.includes(k) ? 0 : k.length >= 4 && it.keys.some((x) => lev(x, k, max) <= max) ? 1 : -1);
    let best = null;
    for (const it of cat.items) { const d = dist(it); if (d >= 0 && (!best || d < best.d || (d === best.d && it.rank < best.it.rank))) best = { it, d }; }
    if (best) return { item: best.it, fits: true };
    const other = (FACT_ALL.get(k) || []).find((x) => x.cat !== cat);
    return other ? { item: other.it, fits: false, cat: other.cat } : null;
  }

  /** Every prompt type, built from the data so new teams and places appear automatically. */
  function buildCategories() {
    const group = (fn) => { const m = new Map(); for (const t of TEAMS) { const k = fn(t); if (!k) continue; if (!m.has(k)) m.set(k, []); m.get(k).push(t); } return m; };
    const cats = [];
    for (const [st, list] of group((t) => (t.country === "USA" && US[t.state] ? t.state : null))) if (list.length >= 60) cats.push({ type: "place", id: `us-${st}`, text: `Name an FTC team from ${US[st]}.`, test: (t) => t.country === "USA" && t.state === st });
    for (const [pr, list] of group((t) => (t.country === "Canada" && CA[t.state] ? t.state : null))) if (list.length >= 30) cats.push({ type: "place", id: `ca-${pr}`, text: `Name an FTC team from ${CA[pr]}, Canada.`, test: (t) => t.country === "Canada" && t.state === pr });
    for (const [c, list] of group((t) => (t.country && t.country !== "USA" ? t.country : null))) if (list.length >= 35) cats.push({ type: "country", id: `c-${c}`, text: `Name an FTC team from ${c === "USA" ? "the United States" : /^(United|Netherlands|Philippines)/.test(c) ? "the " + c : c}.`, test: (t) => t.country === c });
    // Skip military mail addresses (APO/FPO/DPO), which aren't real cities
    for (const [k, list] of group((t) => (t.city && !/^(APO|FPO|DPO)$/i.test(t.city) && !["AA", "AE", "AP"].includes(t.state) ? `${t.city}|${t.state}|${t.country}` : null))) {
      if (list.length < 18) continue;
      const [city, st, co] = k.split("|"), where = co === "USA" ? US[st] || st : co === "Canada" ? CA[st] || st : co;
      cats.push({ type: "city", id: `city-${k}`, text: `Name an FTC team from ${city}, ${where}.`, test: (t) => t.city === city && t.state === st && t.country === co });
    }
    for (const [y, list] of group((t) => t.rookie || null)) if (list.length >= 80) cats.push({ type: "rookie", id: `rook-${y}`, text: `Name an FTC team whose rookie season was ${seasonName(+y)}.`, test: (t) => t.rookie === +y });
    for (const w of KEYWORDS) {
      const W1 = w[0].toUpperCase() + w.slice(1), test = (t) => t.words.has(w) || t.words.has(w + "s");
      if (TEAMS.filter(test).length >= 35) cats.push({ type: "word", id: `w-${w}`, text: `Name an FTC team with the word “${W1}” or “${W1}s” in its name.`, test });
    }
    for (const th of THEMES) { const set = new Set(th.words.split(" ")); const test = (t) => [...t.words].some((x) => set.has(x)); if (TEAMS.filter(test).length >= 40) cats.push({ type: "theme", id: `t-${th.id}`, text: `Name an FTC team with ${th.label}.`, test }); }
    const special = [
      { id: "sp-the", text: "Name an FTC team whose name starts with “The”.", test: (t) => /^the\b/i.test(t.name.trim()) },
      { id: "sp-digit", text: "Name an FTC team with a number in its name.", test: (t) => /\d/.test(t.name) },
      { id: "sp-vet", text: "Name an FTC team that has competed in every season since 2019–20.", test: (t) => t.seasons >= META.season - 2019 + 1 },
      { id: "sp-one", text: "Name an FTC team with a one-word name.", test: (t) => norm(t.name).split(" ").length === 1 },
      { id: "sp-long", text: "Name an FTC team with a name of five or more words.", test: (t) => norm(t.name).split(" ").length >= 5 },
      { id: "sp-intl", text: "Name an FTC team from outside the United States.", test: (t) => t.country && t.country !== "USA" },
      { id: "sp-old", text: "Name an FTC team that has been around since 2012 or earlier.", test: (t) => t.rookie && t.rookie <= 2012 },
      { id: "sp-new", text: `Name an FTC team in its first or second season (rookie year ${seasonName(META.season - 1)} or later).`, test: (t) => t.rookie >= META.season - 1 },
    ];
    for (const s of special) if (TEAMS.filter(s.test).length >= 25) cats.push({ type: "special", ...s });

    // US regions and continents
    const REGIONS = {
      "New England": "CT ME MA NH RI VT", "the Mid-Atlantic": "NY NJ PA DE MD DC", "the Southeast": "VA WV NC SC GA FL AL MS TN KY", "the Midwest": "OH IN IL MI WI MN IA MO ND SD NE KS",
      "the Southwest": "AZ NM TX OK", "the Mountain West": "MT ID WY CO UT NV", "the Pacific Northwest": "WA OR AK", "the Great Lakes region": "MI OH IN IL WI MN NY PA",
    };
    for (const [name, list] of Object.entries(REGIONS)) { const set = new Set(list.split(" ")), test = (t) => t.country === "USA" && set.has(t.state); if (TEAMS.filter(test).length >= 60) cats.push({ type: "region", id: `r-${name}`, text: `Name an FTC team from ${name} in the U.S.`, test }); }
    const CONT = {
      Europe: "United Kingdom,Romania,France,Netherlands,Greece,Moldova,Cyprus,Lithuania,Germany,Italy,Ukraine,Hungary,Poland,Belgium,Czech Republic,Spain,Switzerland,Norway,Macedonia,Slovenia,Albania,San Marino,Portugal,Montenegro,Serbia,Sweden,Russia",
      Asia: "Kazakhstan,China,South Korea,Thailand,India,Vietnam,Taiwan,Indonesia,Malaysia,Uzbekistan,Kyrgyzstan,Japan,Sri Lanka,Laos,Turkmenistan,Philippines,Azerbaijan",
      Africa: "Libya,South Africa,Nigeria,Morocco,Eswatini,Lesotho,Zimbabwe,Egypt",
      "the Middle East": "Israel,Saudi Arabia,Qatar,Türkiye,United Arab Emirates,Jordan,Kuwait",
      "Latin America or the Caribbean": "Mexico,Brazil,Jamaica,Paraguay,Argentina,Venezuela,Ecuador,Trinidad and Tobago,Haiti,Colombia,Bermuda",
      Oceania: "Australia,New Zealand",
    };
    for (const [name, list] of Object.entries(CONT)) { const set = new Set(list.split(",")), test = (t) => set.has(t.country); if (TEAMS.filter(test).length >= 40) cats.push({ type: "region", id: `cont-${name}`, text: `Name an FTC team from ${name}.`, test }); }

    // State + era combinations
    const bigStates = [...group((t) => (t.country === "USA" && US[t.state] ? t.state : null))].filter(([, l]) => l.length >= 200).map(([st]) => st);
    for (const st of bigStates) {
      const combos = [
        [`that started in ${seasonName(2020)} or later`, (t) => t.rookie >= 2020], [`that started before ${seasonName(2015)}`, (t) => t.rookie && t.rookie < 2015],
        ["that has competed in 5 or more seasons since 2019", (t) => t.seasons >= 5], ["with a one-word name", (t) => norm(t.name).split(" ").length === 1],
      ];
      combos.forEach(([txt, f], i) => { const test = (t) => t.country === "USA" && t.state === st && f(t); if (TEAMS.filter(test).length >= 35) cats.push({ type: "combo", id: `combo-${st}-${i}`, text: `Name an FTC team from ${US[st]} ${txt}.`, test }); });
    }
    for (const [lo, hi] of [[2007, 2011], [2012, 2015], [2016, 2018], [2019, 2021], [2022, 2024]]) cats.push({ type: "rookie", id: `rr-${lo}`, text: `Name an FTC team whose rookie season was between ${seasonName(lo)} and ${seasonName(hi)}.`, test: (t) => t.rookie >= lo && t.rookie <= hi });

    // First letters
    for (const L of "ABCDEFGHIJKLMNOPRSTVWXYZ") {
      const test = (t) => { const w = norm(t.name).split(" ").filter((x) => x !== "the"); return (w[0] || "")[0] === L.toLowerCase(); };
      if (TEAMS.filter(test).length >= 40) cats.push({ type: "letter", id: `l-${L}`, text: `Name an FTC team whose name starts with the letter ${L} (not counting “The”).`, test });
    }

    // Name styles
    const styles = [
      ["st-two", "Name an FTC team with a name of exactly two words.", (t) => norm(t.name).split(" ").length === 2],
      ["st-three", "Name an FTC team with a name of exactly three words.", (t) => norm(t.name).split(" ").length === 3],
      ["st-short", "Name an FTC team whose name is 5 letters or fewer (not counting spaces).", (t) => key1(t.name).length <= 5],
      ["st-long", "Name an FTC team whose name has 25 or more letters.", (t) => key1(t.name).length >= 25],
      ["st-caps", "Name an FTC team whose name is written in ALL CAPS.", (t) => /[A-Z]{3,}/.test(t.name) && t.name === t.name.toUpperCase()],
      ["st-allit", "Name an FTC team with an alliterative name, where every word starts with the same letter (like “Robo Rangers”).", (t) => { const w = norm(t.name).split(" ").filter((x) => x.length > 1 && !["the", "of", "and"].includes(x)); return w.length >= 2 && w.every((x) => x[0] === w[0][0]); }],
      ["st-hyphen", "Name an FTC team with a hyphen (-) in its name.", (t) => /\w-\w/.test(t.name)],
      ["st-punct", "Name an FTC team with an exclamation point, question mark, or period in its name.", (t) => /[!?.]/.test(t.name)],
      ["st-robotics", "Name an FTC team whose name ends with the word “Robotics”.", (t) => /robotics\s*$/i.test(t.name)],
      ["st-bots", "Name an FTC team whose name ends in “bots”.", (t) => /bots\s*$/i.test(t.name)],
      ["st-of", "Name an FTC team with the word “of” in its name.", (t) => t.words.has("of")],
      ["st-and", "Name an FTC team with “and” or “&” in its name.", (t) => /\band\b|&/i.test(t.name)],
      ["st-x", "Name an FTC team with the letter X in its name.", (t) => /x/i.test(t.name)],
      ["st-z", "Name an FTC team with the letter Z in its name.", (t) => /z/i.test(t.name)],
      ["st-q", "Name an FTC team with the letter Q in its name.", (t) => /q/i.test(t.name)],
      ["st-double", "Name an FTC team with a double letter in its name (like the “ee” in Steel).", (t) => /([a-z])\1/i.test(t.name.replace(/\s/g, ""))],
    ];
    for (const [id, text, test] of styles) if (TEAMS.filter(test).length >= 35) cats.push({ type: "style", id, text, test });

    // Team numbers (you still answer with the name, so this is real trivia)
    const nums = [
      ["n-1k", "Name an FTC team whose team number is under 1000.", (t) => t.number < 1000],
      ["n-5k", "Name an FTC team whose team number is between 1000 and 4999.", (t) => t.number >= 1000 && t.number < 5000],
      ["n-10k", "Name an FTC team whose team number is between 5000 and 9999.", (t) => t.number >= 5000 && t.number < 10000],
      ["n-15k", "Name an FTC team whose team number is between 10000 and 14999.", (t) => t.number >= 10000 && t.number < 15000],
      ["n-20k", "Name an FTC team whose team number is between 15000 and 19999.", (t) => t.number >= 15000 && t.number < 20000],
      ["n-zero", "Name an FTC team whose team number ends in 0.", (t) => t.number % 10 === 0],
      ["n-7", "Name an FTC team whose team number has a 7 in it.", (t) => String(t.number).includes("7")],
      ["n-pal", "Name an FTC team whose team number is a palindrome, reading the same backward (like 12321).", (t) => { const x = String(t.number); return x.length > 1 && x === [...x].reverse().join(""); }],
      ["n-same", "Name an FTC team whose team number has the same digit twice in a row (like 4455 or 27754).", (t) => /(\d)\1/.test(String(t.number))],
      ["n-odd", "Name an FTC team whose team number is odd and under 5000.", (t) => t.number % 2 === 1 && t.number < 5000],
    ];
    for (const [id, text, test] of nums) if (TEAMS.filter(test).length >= 35) cats.push({ type: "number", id, text, test });

    // Seasons played
    for (const [id, text, test] of [
      ["s-one", "Name an FTC team that has competed in exactly one season since 2019.", (t) => t.seasons === 1],
      ["s-five", "Name an FTC team that has competed in 5 or more seasons since 2019.", (t) => t.seasons >= 5],
      ["s-three", "Name an FTC team that has competed in exactly 3 seasons since 2019.", (t) => t.seasons === 3],
    ]) if (TEAMS.filter(test).length >= 35) cats.push({ type: "special", id, text, test });
    CATS = cats.map((c) => ({ ...c, valid: null }));
  }
  function validFor(cat) { if (!cat.valid) { cat.valid = TEAMS.filter(cat.test).sort((a, b) => b.fame - a.fame); cat.rankOf = new Map(cat.valid.map((t, i) => [t.number, i])); } return cat.valid; }
  function tierFor(cat, team) {
    if (cat.facts) return factTier(cat, team);
    validFor(cat);
    if (team.number === HOME) return 5;
    const p = (cat.rankOf.get(team.number) + 0.5) / cat.valid.length;
    return CUTS.findIndex((c) => p <= c);
  }

  /* ---------------- Seeded prompts ---------------- */
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // A good round mixes kinds of prompts
  // Each round draws 7 different kinds of prompt; places, keywords, and themes come up a little more often
  const PLAN = ["place", "place", "word", "word", "theme", "theme", "rookie", "country", "region", "city", "letter", "style", "number", "combo", "special"];
  function makeRound(seed) {
    const r = rng(seed), used = new Set(), out = [];
    const shuffled = PLAN.slice().sort(() => r() - 0.5), plan = [];
    for (const t of shuffled) if (!plan.includes(t) && CATS.some((c) => c.type === t)) plan.push(t);
    // Five team prompts, plus one about an FTC game and one about FTC in general, in a random order
    plan.length = Math.min(plan.length, ROUND - 2);
    for (const t of ["game", "ftc"]) if (CATS.some((c) => c.type === t)) plan.splice(Math.floor(r() * (plan.length + 1)), 0, t);
    for (const type of plan) {
      let pool = CATS.filter((c) => c.type === type && !c.own && !used.has(c.id));
      if (!pool.length) pool = CATS.filter((c) => !c.own && !used.has(c.id));
      const c = pool[Math.floor(r() * pool.length)]; used.add(c.id); out.push(c);
    }
    return out.slice(0, ROUND);
  }
  /* ---------------- Unlimited round settings ---------------- */
  const TOPICS = [
    ["places", "Places", "States, countries, regions, cities"],
    ["names", "Team names", "Words, themes, letters, name styles"],
    ["history", "Rookie years & numbers", "Start years, team numbers, seasons played"],
    ["seasons", "Past game elements", "Pieces and field parts from each game"],
    ["games", "FTC game names", "Every FTC game since 2005"],
    ["events", "Awards & events", "Awards, events, match words, values"],
    ["robots", "Robot parts & tools", "Mechanisms, sensors, CAD, suppliers"],
    ["code", "Code & autonomous", "Tools, Java, autonomous methods"],
    ["ours", "Steel Surge trivia", "Questions written by our team"],
  ];
  const TYPE_TOPIC = { place: "places", country: "places", region: "places", city: "places", combo: "places", word: "names", theme: "names", letter: "names", style: "names", rookie: "history", number: "history", special: "history" };
  const FACT_TOPIC = { "f-games": "games", "f-oldgames": "games", "g-ball": "games", "g-hang": "games", "f-awards": "events", "f-events": "events", "f-judging": "events", "f-programs": "events", "f-match": "events", "f-parts": "robots", "f-drive": "robots", "f-elec": "robots", "f-cad": "robots", "f-brands": "robots", "f-code": "code", "f-sdk": "code", "f-auto": "code" };
  const topicOf = (c) => (c.own ? "ours" : c.facts ? FACT_TOPIC[c.id] || (c.type === "game" ? "seasons" : "events") : TYPE_TOPIC[c.type] || "history");
  const MIXES = [["mixed", "Mixed", "Mostly teams, plus two FTC knowledge prompts in every seven."], ["teams", "Teams only", "Every prompt asks for a real FTC team."], ["ftc", "FTC knowledge", "Game elements, game names, awards, parts, and code. No teams."], ["old", "Old games", "Game elements and game names from past FTC seasons."]];
  const LENGTHS = [5, 7, 10, 15, 0]; // 0 = Endless: prompts keep coming until your third miss
  const LIVES = 3;
  const STANDARD = { length: 7, mix: "mixed", topics: TOPICS.map(([k]) => k), shaped: true, timer: true, noRepeat: true };
  const opts = (() => { const o = { ...STANDARD, ...(store.get("ss-kilovolt-opts", {}) || {}) }; if (!LENGTHS.includes(o.length)) o.length = 7; if (!MIXES.some(([k]) => k === o.mix)) o.mix = "mixed"; if (!Array.isArray(o.topics)) o.topics = STANDARD.topics.slice(); return o; })();
  const saveOpts = () => store.set("ss-kilovolt-opts", opts);
  /** Standard rounds count toward your best score; custom ones don't. */
  const isStandard = () => opts.length === 7 && opts.mix === "mixed" && opts.timer && STANDARD.topics.every((k) => opts.topics.includes(k));
  const optsLabel = (o) => [o.length ? `${o.length} prompts` : "Endless", MIXES.find(([k]) => k === o.mix)[1], o.topics.length < TOPICS.length ? `${o.topics.length} of ${TOPICS.length} topics` : "", o.timer ? "" : "no timer"].filter(Boolean).join(" · ");
  const inMix = (c, mix = opts.mix) => (mix === "teams" ? !c.facts : mix === "ftc" ? !!c.facts : mix === "old" ? !!c.facts && ["seasons", "games"].includes(topicOf(c)) : true);
  const matching = () => CATS.filter((c) => inMix(c) && opts.topics.includes(topicOf(c)));
  /** How broad a prompt is next to others of its kind: 0 = the narrowest, 1 = the broadest. Older seasons count as harder. */
  let EASE = null;
  function ease(c) {
    if (!EASE) {
      EASE = new Map();
      for (const group of [CATS.filter((x) => !x.facts), CATS.filter((x) => x.facts)]) {
        const sorted = group.slice().sort((a, b) => validFor(a).length - validFor(b).length);
        sorted.forEach((x, i) => { let e = sorted.length > 1 ? i / (sorted.length - 1) : 0.5; const y = /^g-(\d{4})$/.exec(x.id); if (y) e -= (2026 - +y[1]) * 0.05; if (x.id === "g-old" || x.id === "f-oldgames") e -= 0.3; EASE.set(x.id, e); });
      }
    }
    return EASE.get(c.id);
  }
  // Super Easy and Easy ask broad prompts; Hard and Extreme ask narrow ones
  const BANDS = [(e) => e >= 0.55, (e) => e >= 0.35, () => true, (e) => e <= 0.65, (e) => e <= 0.45];
  /** Builds an Unlimited round from the player's settings. Returns { prompts, note }. */
  function makeCustom(r, also = []) {
    const L = opts.length || 10, recent = new Set([...(opts.noRepeat ? saved.recent || [] : []), ...also]), band = BANDS[level()] || BANDS[2];
    const sh = (a) => a.map((x) => [r(), x]).sort((p, q) => p[0] - q[0]).map((x) => x[1]);
    let base = matching(), note = "";
    if (!base.length) { base = CATS.filter((c) => inMix(c)); note = "None of your topics fit this mix, so every topic is on for this round."; }
    const fits = (c) => !opts.shaped || band(ease(c));
    const layers = [[(c) => !recent.has(c.id) && fits(c), ""], [fits, "You've seen every matching prompt lately, so a few repeat."], [() => true, "Not many prompts match this difficulty, so a few are easier or harder."]];
    let pool = [];
    for (const [f, msg] of layers) { pool = base.filter(f); if (pool.length >= L || f === layers[2][0]) { if (pool.length >= L || !note) note = note || (pool.length ? msg : ""); break; } }
    if (pool.length < L) pool = sh(base);
    // Spread the round across topics, and across kinds of prompt within a topic
    const spread = (list, n) => {
      const byTopic = new Map(); for (const c of sh(list)) { const t = topicOf(c); if (!byTopic.has(t)) byTopic.set(t, []); byTopic.get(t).push(c); }
      const queues = sh([...byTopic.values()]), out = [];
      while (out.length < n && queues.some((q) => q.length)) for (const q of queues) { if (out.length >= n || !q.length) continue; const types = new Set(out.map((o) => o.type)); const i = q.findIndex((c) => !types.has(c.type)); out.push(q.splice(Math.max(0, i), 1)[0]); }
      return out;
    };
    let out;
    if (opts.mix === "mixed") {
      const facts = pool.filter((c) => c.facts), teams = pool.filter((c) => !c.facts), k = Math.min(facts.length, Math.max(1, Math.round((L * 2) / 7)));
      out = [...spread(facts, k), ...spread(teams, L - k)];
      if (out.length < L) out.push(...spread(pool.filter((c) => !out.includes(c)), L - out.length));
    } else out = spread(pool, L);
    if (out.length < L) note = `Only ${out.length} prompt${out.length === 1 ? " matches" : "s match"} your settings, so this round is shorter.`;
    return { prompts: sh(out), note };
  }

  /** For testing: every prompt and how many teams fit it. */
  window.KilovoltPrompts = () => CATS.map((c) => [c.type, c.text, validFor(c).length]);
  window.KilovoltTest = { opts, makeCustom: (seed = 1) => makeCustom(rng(seed)).prompts.map((c) => [topicOf(c), c.id, Math.round(ease(c) * 100) / 100]), ease: (id) => ease(CATS.find((c) => c.id === id)), state: () => s };
  const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const EPOCH = Date.UTC(2026, 10, 22); // Kilovolt #1
  const dayNumber = () => { const d = new Date(); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / 86400000) + 1; };
  const seedFor = (key) => [...key].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619), 2166136261);

  /* ---------------- Matching an answer ---------------- */
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i]; let best = i;
      for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); best = Math.min(best, cur[j]); }
      if (best > max) return max + 1; prev = cur;
    }
    return prev[b.length];
  }
  /** Returns { team, fits } for the best match, or { numberOnly } / null. */
  function findTeam(raw, cat) {
    let text = raw.trim(); if (!text) return null;
    // "27254 Steel Surge" or "#27254 - Steel Surge": use the name part; a bare number isn't enough
    const m = text.match(/^#?\s*(\d{1,6})\s*[-–:·.]?\s*(.*)$/);
    if (m && !m[2]) return { numberOnly: true, team: BY_NUM.get(+m[1]) };
    if (m && m[2]) text = m[2];
    const k1 = key1(text), k2 = key2(text);
    let cands = [...(INDEX.get(k1) || []), ...(INDEX.get(k2) || [])];
    if (!cands.length && k2.length >= 4) {
      const max = k2.length >= 12 ? 2 : 1;
      for (const [k, list] of INDEX) { if (Math.abs(k.length - k2.length) <= max && lev(k, k2, max) <= max) cands.push(...list); }
    }
    if (!cands.length) return null;
    cands = [...new Set(cands)];
    const fitting = cands.filter((t) => cat.test(t));
    // If several real teams share the name, the name is only as rare as its best-known team
    if (fitting.length) return { team: fitting.sort((a, b) => b.fame - a.fame)[0], fits: true, shared: fitting.length > 1 };
    return { team: cands.sort((a, b) => b.fame - a.fame)[0], fits: false };
  }

  /* ---------------- Game state ---------------- */
  const game = new Game({ id: "kilovolt", width: W, height: H0, pausable: false });
  game.puzzle = true;
  game.difficultyNote = "Sets the answer timer: 60 seconds on Super Easy down to 12 on Extreme. Super Easy and Easy also offer a hint on each prompt.";
  // Text game: let the stage grow with its content instead of a fixed shape
  Object.assign(game.stage.style, { aspectRatio: "auto", maxWidth: "none" });
  const saved = store.get("ss-kilovolt", { days: {}, streak: 0, lastDay: null, bestUnlimited: 0, rounds: 0 });
  const save = () => store.set("ss-kilovolt", saved);
  let s = null;
  const timeLimit = () => pick([60, 40, 25, 18, 12]);
  const timed = () => !s || s.mode === "daily" || (s.cfg.timer && !s.practice);
  const hintsAllowed = () => level() <= 1 || !!s?.practice;

  const ui = document.createElement("div"); ui.className = "kv"; game.stage.append(ui);
  const esc = (x) => String(x).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const where = (t) => [t.city, t.country === "USA" ? t.state : t.country === "Canada" ? t.state + ", Canada" : t.country].filter(Boolean).join(", ");
  const volts = (n) => `${(n * 10).toLocaleString()} V`;

  function startRound(mode) {
    const daily = mode === "daily", key = todayKey();
    if (daily && saved.days[key]) return showSummary(saved.days[key], true);
    const seed = daily ? seedFor(key) : (Math.random() * 2 ** 31) | 0;
    const built = daily ? { prompts: makeRound(seed), note: "" } : makeCustom(rng(seed));
    const practice = mode === "practice";
    s = { mode, key, prompts: built.prompts, i: -1, answers: [], total: 0, t: 0, phase: "idle", hinted: false, cfg: { ...opts, topics: opts.topics.slice() }, custom: !daily && !isStandard(), endless: !daily && !practice && opts.length === 0, practice, lives: LIVES };
    if (!daily) { saved.recent = [...s.prompts.map((c) => c.id), ...(saved.recent || [])].slice(0, 90); save(); }
    game.start(); ui.hidden = false;
    nextPrompt();
    if (built.note) game.setMessage(built.note);
  }
  function nextPrompt() {
    s.i++;
    if (s.endless ? s.lives <= 0 : s.i >= s.prompts.length) return finishRound();
    // Endless: top up with fresh prompts before running out (repeats only once every match has been used)
    if (s.endless && s.i >= s.prompts.length - 1) {
      const last = s.prompts[s.prompts.length - 1], more = makeCustom(rng((Math.random() * 2 ** 31) | 0), s.prompts.map((c) => c.id)).prompts.filter((c) => c !== last);
      s.prompts.push(...(more.length ? more : CATS.filter((c) => c !== last).slice(0, 1)));
    }
    s.t = timed() ? timeLimit() : Infinity; s.phase = "ask"; s.hinted = false;
    const c = s.prompts[s.i], n = validFor(c).length, fact = !!c.facts;
    game.setHud("round", s.endless ? `#${s.i + 1}` : `${s.i + 1}/${s.prompts.length}`); game.setHud("charge", volts(s.total));
    ui.innerHTML = `
      <div class="kv-top"><span class="kv-mode">${s.mode === "daily" ? `Daily Charge #${dayNumber()}` : s.practice ? "Practice" : s.endless ? "Endless" : s.custom ? "Unlimited · Custom" : "Unlimited"}</span><span class="kv-step">${s.endless ? `Prompt ${s.i + 1} ${livesHtml()}` : `Prompt ${s.i + 1} of ${s.prompts.length}`}</span><span class="kv-diff">${timed() ? "" : "No timer · "}${levelName()}</span></div>
      <div class="kv-timer"${timed() ? "" : " hidden"}><i style="width:100%"></i></div>
      <div class="kv-body">
        <div class="kv-main">
          <h2 class="kv-prompt">${esc(c.text)}</h2>
          <p class="kv-sub">${fact ? `${n} answers on our list. The less obvious your answer, the more charge it's worth.` : `${n.toLocaleString()} FTC teams fit. The less famous your answer, the more charge it's worth.`}</p>
          <form class="kv-form" autocomplete="off"><label class="sr-only" for="kv-in">${fact ? "Your answer" : "Team name"}</label>
            <input id="kv-in" type="text" maxlength="80" placeholder="${fact ? "Type your answer…" : "Type a team name…"}" spellcheck="false" autocapitalize="words">
            <button class="btn primary" type="submit">Lock in</button></form>
          <div class="kv-actions">${hintsAllowed() ? '<button class="btn sm" type="button" data-hint>Hint</button>' : ""}<button class="btn sm ghost" type="button" data-skip>${s.practice ? "Show answers" : "Skip"}</button></div>
          <p class="kv-hint" aria-live="polite"></p>
        </div>
        ${meterHtml()}
      </div>`;
    const input = ui.querySelector("#kv-in");
    ui.querySelector(".kv-form").addEventListener("submit", (e) => { e.preventDefault(); submit(input.value); });
    ui.querySelector("[data-skip]").addEventListener("click", () => submit(""));
    ui.querySelector("[data-hint]")?.addEventListener("click", hint);
    setTimeout(() => input.focus({ preventScroll: true }), 30);
    Sound.select();
  }
  const livesHtml = () => `<span class="kv-lives" role="img" aria-label="${s.lives} miss${s.lives === 1 ? "" : "es"} left">${Array.from({ length: LIVES }, (_, i) => `<i class="${i < s.lives ? "on" : ""}">⚡</i>`).join("")}</span>`;
  function meterHtml() {
    const n = s.endless ? Math.max(1, s.i + 1) : s.prompts.length, pct = Math.min(100, s.total / (n * 100) * 100);
    return `<aside class="kv-meter" aria-label="Charge ${volts(s.total)}"><div class="kv-bar"><i style="height:${pct}%;--w:${pct}%"></i>${RANKS.slice(1).map(([v, nm]) => `<span style="bottom:${v / 70}%" title="${nm}"></span>`).join("")}</div>
      <b>${volts(s.total)}</b><small>${rankFor(per7(s.total, n) * 10)}</small></aside>`;
  }
  function hint() {
    if (s.phase !== "ask" || s.hinted) return;
    const v = validFor(s.prompts[s.i]); s.hinted = true;
    const mid = v[Math.floor(v.length * rand(0.3, 0.7))];
    const masked = mid.name.split(" ").map((w) => (w.length > 1 ? w[0] + "•".repeat(Math.min(w.length - 1, 8)) : w)).join(" ");
    ui.querySelector(".kv-hint").classList.remove("warn");
    ui.querySelector(".kv-hint").innerHTML = s.prompts[s.i].facts ? `Hint: one answer that fits is <b>${esc(masked)}</b>.` : `Hint: one team that fits is <b>${esc(masked)}</b> from ${esc(where(mid))}.`;
    ui.querySelector("[data-hint]").disabled = true;
  }

  function submit(raw) {
    if (!s || s.phase !== "ask") return;
    const c = s.prompts[s.i], v = validFor(c), fact = !!c.facts, res = raw.trim() ? (fact ? findFact(raw, c) : findTeam(raw, c)) : null;
    // Unknown names and bare numbers don't use up the prompt: say why and let them try again
    if (raw.trim() && s.t > 0 && (!res || res.numberOnly)) {
      const box = ui.querySelector(".kv-hint"), input = ui.querySelector("#kv-in");
      box.textContent = !res ? (fact ? `“${raw.trim()}” isn't on our list. Check the spelling, or try another answer.` : `No FTC team called “${raw.trim()}”. Check the spelling and try again.`) : res.team ? `Type the team's name, not its number. (#${res.team.number} is ${res.team.name}.)` : "Type a team name, not a number.";
      box.classList.add("warn"); input.select(); Sound.error();
      return;
    }
    s.phase = "reveal";
    let tier = -1, msg = "", team = fact ? null : res?.team || null;
    const item = fact ? res?.item || null : null;
    if (!raw.trim()) msg = s.t <= 0 ? "Time's up." : "Skipped.";
    else if (!res) msg = `We couldn't find an FTC team called “${esc(raw.trim())}”. Check the spelling, or try another team.`;
    else if (res.numberOnly) msg = res.team ? `Type the team's name, not its number. (#${res.team.number} is ${esc(res.team.name)}.)` : "Type a team name, not a number.";
    else if (fact && !res.fits) msg = `${esc(item.name)} is real${res.cat.season ? ` (it's from ${esc(res.cat.season)})` : ""}, but it doesn't fit this prompt.`;
    else if (!res.fits) msg = `${esc(team.name)} (#${team.number}, ${esc(where(team))}) is a real team, but it doesn't fit this prompt.`;
    else tier = tierFor(c, fact ? item : team);
    const pts = tier >= 0 ? TIERS[tier].pts : 0;
    if (s.endless && tier < 0) s.lives--;
    s.total += pts; s.answers.push({ prompt: c.text, answer: tier >= 0 ? (fact ? item.name : team.name) : raw.trim(), team: team && tier >= 0 ? team.number : null, tier, pts });
    game.setHud("charge", volts(s.total));
    // Feedback
    if (tier >= 0) {
      const T = TIERS[tier];
      [null, () => Sound.blip(), () => Sound.pickup(), () => Sound.pickup(), () => Sound.win(), () => Sound.win()][tier]?.();
      if (tier === 0) Sound.tone({ f: 520, dur: 0.08, type: "triangle", vol: 0.1 });
      const r = game.stage.getBoundingClientRect();
      game.particles.burst(W / 2, (r.height / r.width) * W * 0.35, { n: 10 + tier * 10, color: T.color, speed: 160 + tier * 50, life: 0.8, gravity: 120 });
      if (tier >= 3) Sound.zap();
      if (tier >= 4) game.shake(4 + tier);
      if (tier === 5 && !s.practice) game.trophy("kv-surge");
      if (team?.number === HOME && !s.practice) game.trophy("kv-home");
    } else Sound.miss();
    const mine = fact ? item : team, ex = s.practice ? answerList(c) : examples(c, mine);
    const T = tier >= 0 ? TIERS[tier] : null;
    ui.querySelector(".kv-main").innerHTML = `
      <h2 class="kv-prompt small">${esc(c.text)}</h2>
      ${T ? `<div class="kv-result" style="--tc:${T.color}"><span class="kv-tier">${T.name}</span><span class="kv-pts">+${volts(T.pts)}</span></div>
        ${fact ? `<div class="kv-team"><b>${esc(item.name)}</b>${c.season ? `<span>${esc(c.season)}</span>` : ""}</div>
        <p class="kv-note">${T.blurb}</p>` : `<div class="kv-team"><b>${esc(team.name)}</b><span>#${team.number} · ${esc(where(team))} · rookie ${seasonName(team.rookie)}</span></div>
        <p class="kv-note">${team.number === HOME ? "That's us! Steel Surge always counts as a Full Surge. ⚡" : T.blurb}${res.shared ? " (More than one team has this name, so it's scored by the best-known one.)" : ""}</p>`}`
      : `<div class="kv-result miss"><span class="kv-tier">No charge</span><span class="kv-pts">+0 V</span></div><p class="kv-note">${msg}</p>`}
      ${s.endless && tier < 0 ? `<p class="kv-lifeline${s.lives ? "" : " out"}">${livesHtml()} ${s.lives ? `${s.lives} miss${s.lives === 1 ? "" : "es"} left.` : `That was your third miss. You charged up ${s.answers.filter((a) => a.tier >= 0).length} answers.`}</p>` : ""}
      <div class="kv-examples"><h3>${s.practice ? (fact ? "Every answer on the list, most obvious first" : (ex.length >= v.length ? `All ${v.length} teams that fit, best-known first` : `${ex.length} of the ${v.length.toLocaleString()} teams that fit, best-known first`)) : "Answers that would have worked"}</h3><ul class="${s.practice ? "kv-all" : ""}">${ex.map(({ t, k }) => `<li style="--tc:${TIERS[k].color}"${t === mine && tier >= 0 ? ' class="mine"' : ""}><span>${TIERS[k].name}</span>${esc(t.name)}${fact ? "" : ` <small>#${t.number} · ${esc(where(t))}</small>`}</li>`).join("")}</ul><p>${fact ? `${v.length} answers were on the list.` : `${v.length.toLocaleString()} teams fit this prompt.`}</p></div>
      <button class="btn primary" type="button" data-next>${(s.endless ? s.lives <= 0 : s.i + 1 >= s.prompts.length) ? "See results" : "Next prompt"}</button>`;
    ui.querySelector(".kv-meter")?.replaceWith(Object.assign(document.createElement("div"), { innerHTML: meterHtml() }).firstElementChild);
    ui.querySelector(".kv-timer i").style.width = "0%";
    const next = ui.querySelector("[data-next]");
    next.addEventListener("click", () => nextPrompt()); setTimeout(() => next.focus({ preventScroll: true }), 30);
  }
  /** Practice mode: every answer on a knowledge list, or 30 teams spread from best-known to deepest cut. */
  function answerList(c) {
    if (c.facts) return c.items.map((t) => ({ t, k: factTier(c, t) }));
    const v = validFor(c), n = Math.min(30, v.length), out = [];
    for (let i = 0; i < n; i++) { const t = v[Math.floor((i / n) * v.length)]; out.push({ t, k: tierFor(c, t) }); }
    return out;
  }
  /** A few real answers from different tiers, so every prompt teaches you some teams. */
  function examples(c, mine) {
    if (c.facts) {
      const out = [];
      for (const k of [0, 2, 3, 5]) { const pool = c.items.filter((it) => it !== mine && factTier(c, it) === k && !out.some((o) => o.t === it)); if (pool.length) out.push({ t: pool[Math.floor(Math.random() * pool.length)], k }); }
      return out;
    }
    const v = validFor(c), out = [], seen = new Set(mine ? [mine.number] : []), names = new Set(mine ? [mine.k2] : []);
    for (const k of [0, 2, 3, 5]) {
      const lo = k ? Math.floor(CUTS[k - 1] * v.length) : 0, hi = Math.max(lo + 1, Math.floor(CUTS[k] * v.length));
      for (let tries = 0; tries < 6; tries++) { const t = v[Math.min(v.length - 1, lo + Math.floor(Math.random() * (hi - lo)))]; if (t && !seen.has(t.number) && !names.has(t.k2)) { seen.add(t.number); names.add(t.k2); out.push({ t, k: tierFor(c, t) }); break; } }
    }
    return out;
  }

  function finishRound() {
    s.phase = "done"; game.stop();
    if (s.practice) {
      // Practice isn't scored or saved: no best, streak, trophies, or weekly challenge
      return showSummary({ mode: "practice", total: s.total, len: s.prompts.length, correct: s.answers.filter((a) => a.tier >= 0).length, tiers: s.answers.map((a) => a.tier), answers: s.answers, level: levelName() }, false);
    }
    const total = s.total, n = s.endless ? s.answers.length : s.prompts.length, correct = s.answers.filter((a) => a.tier >= 0).length;
    let newBest = false;
    if (s.endless && (correct > (saved.bestEndless?.correct || 0) || (correct === (saved.bestEndless?.correct || 0) && total > (saved.bestEndless?.total || 0)))) { saved.bestEndless = { correct, total }; newBest = correct > 0; }
    const record = { mode: s.mode, total, len: n, endless: s.endless, correct, newBest, custom: s.custom, cfg: s.custom ? optsLabel(s.cfg) : "", tiers: s.answers.map((a) => a.tier), answers: s.answers, level: levelName(), day: dayNumber() };
    saved.rounds++;
    if (s.mode === "daily") {
      saved.days[s.key] = record;
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yk = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
      saved.streak = saved.lastDay === yk ? saved.streak + 1 : 1; saved.lastDay = s.key;
      if (saved.streak >= 3) game.trophy("kv-streak");
    } else if (!s.custom) saved.bestUnlimited = Math.max(saved.bestUnlimited, total);
    save();
    game.trophy("kv-first");
    // Trophies compare rounds of any length fairly, as if they had seven prompts (and only with a timer)
    const even = per7(total, n);
    if (timed()) { if (even * 10 >= 3000) game.trophy("kv-3000"); if (even * 10 >= 5000) game.trophy("kv-5000"); if (level() === 4 && even * 10 >= 2500) game.trophy("kv-extreme"); }
    if (!s.custom) game.submitBest(total, volts(total));
    game.setHud("streak", String(saved.streak));
    showSummary(record, false);
  }

  function shareText(r) {
    const row = (tiers) => tiers.map((k) => (k >= 0 ? TIERS[k].emoji : "⬛")).join("");
    if (r.endless) {
      // Long runs: one line of up to 15 squares per row, at most 3 rows
      const rows = []; for (let i = 0; i < Math.min(r.tiers.length, 45); i += 15) rows.push(row(r.tiers.slice(i, i + 15)));
      return `⚡ Kilovolt Endless · ${r.correct} answer${r.correct === 1 ? "" : "s"} · ${volts(r.total)}\n${rows.join("\n")}${r.tiers.length > 45 ? " …" : ""}\n${r.level} · Steel Surge Arcade · FTC 27254`;
    }
    return `⚡ Kilovolt #${r.day} · ${volts(r.total)}\n${row(r.tiers)}\nSteel Surge Arcade · FTC 27254`;
  }

  /* ---------------- Daily Charge stats ---------------- */
  const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  function dailyStats() {
    const days = Object.entries(saved.days || {}).sort(([a], [b]) => a.localeCompare(b)), totals = days.map(([, r]) => r.total);
    const counts = TIERS.map(() => 0); let misses = 0;
    for (const [, r] of days) for (const k of r.tiers || []) k >= 0 ? counts[k]++ : misses++;
    // Longest run of back-to-back days
    let best = 0, run = 0, prev = null;
    for (const [k] of days) { const d = new Date(k + "T12:00"); run = prev && Math.round((d - prev) / 864e5) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; }
    const today = new Date(), yest = new Date(); yest.setDate(yest.getDate() - 1);
    const current = [dayKey(today), dayKey(yest)].includes(saved.lastDay) ? saved.streak : 0;
    const fav = counts.some(Boolean) ? counts.indexOf(Math.max(...counts)) : -1;
    const answers = counts.reduce((a, b) => a + b, 0) + misses;
    return { played: days.length, best: totals.length ? Math.max(...totals) : 0, avg: totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0,
      bestStreak: Math.max(best, current), current, fav, counts, misses, hitRate: answers ? Math.round(((answers - misses) / answers) * 100) : 0 };
  }
  function showStats(back) {
    const st = dailyStats(), cells = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const r = saved.days?.[dayKey(d)], label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const tier = r ? Math.min(5, Math.floor(per7(r.total, r.len || ROUND) / 120)) : -1;
      cells.push(`<i class="${r ? "on" : ""}${i === 0 ? " today" : ""}" style="${r ? `--h:${Math.max(12, Math.min(100, (r.total / 700) * 100))}%;--tc:${TIERS[tier].color}` : ""}" title="${esc(label)}: ${r ? `${volts(r.total)} (${rankFor(per7(r.total, r.len || ROUND) * 10)})` : "not played"}"></i>`);
    }
    const tile = (v, l) => `<div class="kv-stat"><b>${v}</b><span>${l}</span></div>`, max = Math.max(1, ...st.counts, st.misses);
    game.showOverlay(`<span class="kicker">Kilovolt · Daily Charge</span><h2>Your stats</h2>
      ${st.played ? `<div class="kv-stats">${tile(st.played, "Days played")}${tile(st.current, "Current streak")}${tile(st.bestStreak, "Best streak")}${tile(volts(st.best), "Best day")}${tile(volts(st.avg), "Average")}${tile(`${st.hitRate}%`, "Answers that scored")}</div>
      <div class="kv-cal-wrap"><span class="kv-set-h">Last 30 days</span><div class="kv-cal" role="img" aria-label="Daily Charge scores for the last 30 days">${cells.join("")}</div><div class="kv-cal-axis"><span>30 days ago</span><span>Today</span></div></div>
      <div class="kv-dist"><span class="kv-set-h">Your answers by tier${st.fav >= 0 ? ` · most often ${TIERS[st.fav].name}` : ""}</span>
        ${TIERS.map((T, k) => `<div style="--tc:${T.color}"><span>${T.name}</span><i style="width:${(st.counts[k] / max) * 100}%"></i><b>${st.counts[k]}</b></div>`).join("")}<div style="--tc:#4a5b70"><span>Miss</span><i style="width:${(st.misses / max) * 100}%"></i><b>${st.misses}</b></div></div>`
      : `<p>Play your first Daily Charge to start your stats. Everyone gets the same seven prompts each day.</p>`}
      <p class="kv-small">Stats are saved in this browser.</p>
      <div class="overlay-actions"><button class="btn primary" data-primary>Back</button></div>`, { onPrimary: back });
  }
  function showSummary(r, again) {
    ui.hidden = true;
    const isDaily = r.mode === "daily" || !r.mode, practice = r.mode === "practice";
    const shown = r.endless ? (r.answers || []).slice(-25) : r.answers || [];
    const rows = shown.map((a) => { const T = a.tier >= 0 ? TIERS[a.tier] : null; return `<li style="--tc:${T ? T.color : "#4a5b70"}"><span>${T ? T.name : "Miss"}</span><b>${esc(a.answer || "No answer")}</b><small>${esc(a.prompt)}</small></li>`; }).join("");
    if (practice) {
      game.showOverlay(`<span class="kicker">Practice round · ${esc(r.level || levelName())}</span><h2>${r.correct} of ${r.len} right</h2>
        <div class="kv-emoji" aria-hidden="true">${r.tiers.map((k) => (k >= 0 ? TIERS[k].emoji : "⬛")).join("")}</div>
        <ol class="kv-recap">${rows}</ol><p class="kv-small">Practice rounds aren't scored or saved. Ready? Try today's Daily Charge.</p>
        <div class="overlay-actions"><button class="btn primary" data-primary>Practice again</button><button class="btn" data-daily>Daily Charge</button><button class="btn ghost" data-settings>Round settings</button></div>`, { onPrimary: () => startRound("practice") });
      game.overlay.querySelector("[data-daily]").addEventListener("click", () => { Sound.select(); startRound("daily"); });
      game.overlay.querySelector("[data-settings]").addEventListener("click", () => { Sound.select(); showSettings(() => showSummary(r, again)); });
      return;
    }
    game.showOverlay(`<span class="kicker">${isDaily ? `Daily Charge #${r.day}` : r.endless ? "Endless run" : "Unlimited round"} · ${esc(r.level || levelName())}</span>
      <h2>${r.endless ? `${r.correct} answer${r.correct === 1 ? "" : "s"}` : rankFor(per7(r.total, r.len || ROUND) * 10)}</h2>
      <div class="big-score">${volts(r.total)}</div>
      ${r.endless ? `${r.newBest ? '<span class="record">New best run</span>' : ""}<p>You charged up ${r.correct} of ${r.len} prompts before your third miss. Average quality: <b>${rankFor(per7(r.total, r.len) * 10)}</b>.</p>` : ""}
      <div class="kv-emoji" aria-hidden="true">${r.tiers.map((k) => (k >= 0 ? TIERS[k].emoji : "⬛")).join("")}</div>
      ${again ? "<p>You've already charged up today. A new Daily Charge unlocks at midnight.</p>" : ""}
      ${r.custom && !r.endless ? `<p class="kv-small">Custom round: ${esc(r.cfg)}. Custom rounds don't count toward your best score.</p>` : ""}
      ${r.endless && r.answers.length > shown.length ? `<p class="kv-small">Your last ${shown.length} prompts:</p>` : ""}<ol class="kv-recap">${rows}</ol>
      <p>${isDaily ? `Daily streak: <b>${saved.streak}</b>` : r.endless ? `Best Endless run: <b>${saved.bestEndless?.correct || 0} answers</b> (${volts(saved.bestEndless?.total || 0)})` : `Best Unlimited round: <b>${volts(saved.bestUnlimited)}</b>`}</p>
      <div class="overlay-actions">${isDaily || r.endless ? '<button class="btn" data-share>Copy result</button>' : ""}${isDaily ? '<button class="btn" data-stats>My stats</button>' : ""}<button class="btn primary" data-primary>${r.endless ? "New Endless run" : "Play Unlimited"}</button><button class="btn" data-settings>Round settings</button><a class="btn ghost" href="../arcade.html">More games</a></div>`, { onPrimary: () => startRound("unlimited") });
    game.overlay.querySelector("[data-settings]")?.addEventListener("click", () => { Sound.select(); showSettings(() => showSummary(r, again)); });
    game.overlay.querySelector("[data-stats]")?.addEventListener("click", () => { Sound.select(); showStats(() => showSummary(r, again)); });
    game.overlay.querySelector("[data-share]")?.addEventListener("click", async (e) => {
      try { await navigator.clipboard.writeText(shareText(r)); e.target.textContent = "Copied!"; } catch { e.target.textContent = "Couldn't copy"; }
    });
  }

  /* ---------------- Loop and rendering ---------------- */
  game.update = (dt) => {
    if (!s || s.phase !== "ask" || !timed()) return;
    s.t -= dt;
    const bar = ui.querySelector(".kv-timer i");
    if (bar) { const p = Math.max(0, s.t / timeLimit()); bar.style.width = `${p * 100}%`; bar.classList.toggle("low", s.t < 5); }
    if (s.t <= 0) submit(ui.querySelector("#kv-in")?.value || "");
  };
  game.render = (ctx) => {
    const r = game.stage.getBoundingClientRect(), h = r.width ? (r.height / r.width) * W : H0;
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#0a111c"); g.addColorStop(1, "#06090d");
    ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, h + 40);
    ctx.strokeStyle = "#101924"; ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 45) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 45) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // drifting sparks
    const t = game.time;
    for (let i = 0; i < 14; i++) { const x = (i * 137 + t * (18 + i * 3)) % W, y = (i * 89 + Math.sin(t * 0.6 + i) * 30 + h) % h; ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 2 + i); ctx.fillStyle = i % 3 ? C.surge : C.amber; ctx.fillRect(x, y, 2, 2); }
    ctx.globalAlpha = 1;
    game.particles.draw(ctx); game.floaters.draw(ctx);
  };
  game.onDifficulty = () => { if (s?.phase === "ask" && timed()) s.t = Math.min(s.t, timeLimit()); };

  /* ---------------- Start screen ---------------- */
  function intro() {
    const done = saved.days[todayKey()];
    game.setHud("streak", String(saved.streak || 0));
    game.showOverlay(`<span class="kicker">Steel Surge Arcade</span><h2>Kilovolt</h2>
      <p>Seven prompts, one answer each. Most ask for a real FTC team, like “a team from Ohio.” Others ask about FTC itself: game elements from past seasons, awards, robot parts, and more. Any right answer charges you up, but <b>the less obvious your answer, the more it's worth</b>.</p>
      <div class="kv-legend">${TIERS.map((T) => `<span style="--tc:${T.color}"><b>${T.name}</b>${volts(T.pts)}</span>`).join("")}</div>
      <p class="kv-small">Team data covers all ${TEAMS.length.toLocaleString()} FTC teams that have competed since 2019–20, from FTCScout, and updates every week. Plus ${CATS.filter((c) => c.facts && !c.own).length} FTC knowledge prompts${CATS.some((c) => c.own) ? ` and ${CATS.filter((c) => c.own).length} Steel Surge trivia prompt${CATS.filter((c) => c.own).length === 1 ? "" : "s"}` : ""}. <b>Practice</b> has no timer or score and shows every answer.</p>
      <div class="overlay-actions"><button class="btn primary" data-primary>${done ? "See today's result" : `Daily Charge #${dayNumber()}`}</button><button class="btn" data-unlimited>${opts.length ? `Unlimited${isStandard() ? "" : " · Custom"}` : "Endless"}</button><button class="btn" data-practice>Practice</button><button class="btn ghost" data-settings>Round settings</button>${Object.keys(saved.days || {}).length ? '<button class="btn ghost" data-stats>My stats</button>' : ""}</div>`, { onPrimary: () => startRound("daily") });
    game.overlay.querySelector("[data-stats]")?.addEventListener("click", () => { Sound.select(); showStats(intro); });
    game.overlay.querySelector("[data-unlimited]").addEventListener("click", () => { Sound.select(); startRound("unlimited"); });
    game.overlay.querySelector("[data-settings]").addEventListener("click", () => { Sound.select(); showSettings(intro); });
    game.overlay.querySelector("[data-practice]").addEventListener("click", () => { Sound.select(); startRound("practice"); });
  }

  /** Unlimited round settings. The Daily Charge always uses the standard round so everyone gets the same one. */
  function showSettings(back) {
    const tog = (k, label, sub) => `<label class="kv-tog"><input type="checkbox" data-opt="${k}"${opts[k] ? " checked" : ""}><i></i><span><b>${label}</b><small>${sub}</small></span></label>`;
    const ov = game.showOverlay(`<span class="kicker">Kilovolt · Unlimited</span><h2>Round settings</h2>
      <div class="kv-set">
        <div class="kv-set-row"><span class="kv-set-h">Prompts per round</span><div class="kv-seg" role="radiogroup" aria-label="Prompts per round">${LENGTHS.map((n) => `<button type="button" role="radio" data-len="${n}">${n || "Endless"}</button>`).join("")}</div></div>
        <div class="kv-set-row"><span class="kv-set-h">Mix</span><div class="kv-seg" role="radiogroup" aria-label="Mix">${MIXES.map(([k, lab]) => `<button type="button" role="radio" data-mix="${k}">${lab}</button>`).join("")}</div><small class="kv-set-sub" data-mixnote></small></div>
        <div class="kv-set-row"><span class="kv-set-h">Topics <button type="button" class="kv-link" data-alltopics>All</button></span><div class="kv-topics">${TOPICS.map(([k, lab, sub]) => `<label class="kv-topic" data-topic-row="${k}"><input type="checkbox" data-topic="${k}"${opts.topics.includes(k) ? " checked" : ""}><span><b>${lab}</b><small>${sub}</small></span></label>`).join("")}</div></div>
        <div class="kv-set-row kv-togs">
          ${tog("shaped", "Match prompts to the difficulty", "Super Easy and Easy ask broad prompts. Hard and Extreme ask narrow ones and older seasons, with no hints.")}
          ${tog("timer", "Answer timer", "Off lets you take as long as you like.")}
          ${tog("noRepeat", "Skip recent prompts", "Avoids prompts from your last few Unlimited rounds.")}
        </div>
        <p class="kv-set-status" data-status aria-live="polite"></p>
      </div>
      <div class="overlay-actions"><button class="btn primary" data-primary>${opts.length ? "Play Unlimited" : "Start Endless run"}</button><button class="btn" data-std>Standard round</button><button class="btn ghost" data-back>Back</button></div>`, { onPrimary: () => startRound("unlimited") });
    ov.classList.add("kv-settings");
    const $$ = (q) => [...ov.querySelectorAll(q)];
    const draw = () => {
      $$("[data-len]").forEach((b) => { const on = +b.dataset.len === opts.length; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); });
      $$("[data-mix]").forEach((b) => { const on = b.dataset.mix === opts.mix; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); });
      ov.querySelector("[data-mixnote]").textContent = MIXES.find(([k]) => k === opts.mix)[2];
      $$("[data-topic]").forEach((i) => { i.checked = opts.topics.includes(i.dataset.topic); i.closest(".kv-topic").classList.toggle("off", !CATS.some((c) => topicOf(c) === i.dataset.topic && inMix(c))); });
      $$("[data-opt]").forEach((i) => (i.checked = !!opts[i.dataset.opt]));
      const n = matching().length, st = ov.querySelector("[data-status]");
      st.classList.toggle("warn", !n);
      st.innerHTML = !n ? "None of the checked topics fit this mix. Check a topic that isn't dimmed."
        : `<b>${n}</b> prompts match. ${!opts.length ? `Endless: prompts keep coming until your third miss (skips count). Your longest run is saved.` : isStandard() ? "This is a standard round, so it counts toward your best score." : "Custom round: it won't count toward your best score."} Difficulty: <b>${esc(levelName())}</b> (change it with the difficulty button above the game).`;
      const go = ov.querySelector("[data-primary]"); go.disabled = !n; go.textContent = opts.length ? "Play Unlimited" : "Start Endless run";
    };
    const change = () => { saveOpts(); draw(); Sound.tone({ f: 660, dur: 0.04, type: "triangle", vol: 0.05 }); };
    $$("[data-len]").forEach((b) => b.addEventListener("click", () => { opts.length = +b.dataset.len; change(); }));
    $$("[data-mix]").forEach((b) => b.addEventListener("click", () => { opts.mix = b.dataset.mix; change(); }));
    $$("[data-topic]").forEach((i) => i.addEventListener("change", () => { opts.topics = i.checked ? [...new Set([...opts.topics, i.dataset.topic])] : opts.topics.filter((k) => k !== i.dataset.topic); change(); }));
    $$("[data-opt]").forEach((i) => i.addEventListener("change", () => { opts[i.dataset.opt] = i.checked; change(); }));
    ov.querySelector("[data-alltopics]").addEventListener("click", () => { opts.topics = STANDARD.topics.slice(); change(); });
    ov.querySelector("[data-std]").addEventListener("click", () => { Object.assign(opts, { ...STANDARD, topics: STANDARD.topics.slice() }); change(); });
    ov.querySelector("[data-back]").addEventListener("click", () => { Sound.select(); back(); });
    draw();
  }

  game.setHudBest(game.best()?.label ?? "—");
  game.setMessage("Name real FTC teams, game elements, and more. Obscure answers are worth more.");
  game.showOverlay(`<span class="kicker">Steel Surge Arcade</span><h2>Kilovolt</h2><p>Loading every FTC team…</p>`);
  ui.hidden = true;
  loadData().then(intro).catch(() => {
    game.showOverlay(`<span class="kicker">Kilovolt</span><h2>Couldn't load the teams</h2><p>Check your connection, then try again.</p><div class="overlay-actions"><button class="btn primary" data-primary>Try again</button></div>`, { onPrimary: () => location.reload() });
  });
})();
