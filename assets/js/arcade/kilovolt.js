/* ==========================================================================
   KILOVOLT — a daily FTC team-name trivia game.
   Seven prompts ("Name an FTC team from Ohio"). Any real team that fits
   scores, but the less famous your answer, the more charge it's worth:
   Spark → Static → Current → Voltage → Overload → Full Surge.
   Team data: content/teams.json (every FTC team since 2019, from FTCScout),
   refreshed automatically once a week.
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
    for (const type of plan) {
      let pool = CATS.filter((c) => c.type === type && !used.has(c.id));
      if (!pool.length) pool = CATS.filter((c) => !used.has(c.id));
      const c = pool[Math.floor(r() * pool.length)]; used.add(c.id); out.push(c);
    }
    return out.slice(0, ROUND);
  }
  /** For testing: every prompt and how many teams fit it. */
  window.KilovoltPrompts = () => CATS.map((c) => [c.type, c.text, validFor(c).length]);
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
  const hintsAllowed = () => level() <= 1;

  const ui = document.createElement("div"); ui.className = "kv"; game.stage.append(ui);
  const esc = (x) => String(x).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const where = (t) => [t.city, t.country === "USA" ? t.state : t.country === "Canada" ? t.state + ", Canada" : t.country].filter(Boolean).join(", ");
  const volts = (n) => `${(n * 10).toLocaleString()} V`;

  function startRound(mode) {
    const daily = mode === "daily", key = todayKey();
    if (daily && saved.days[key]) return showSummary(saved.days[key], true);
    const seed = daily ? seedFor(key) : (Math.random() * 2 ** 31) | 0;
    s = { mode, key, prompts: makeRound(seed), i: -1, answers: [], total: 0, t: 0, phase: "idle", hinted: false };
    game.start(); ui.hidden = false;
    nextPrompt();
  }
  function nextPrompt() {
    s.i++;
    if (s.i >= s.prompts.length) return finishRound();
    s.t = timeLimit(); s.phase = "ask"; s.hinted = false;
    const c = s.prompts[s.i], n = validFor(c).length;
    game.setHud("round", `${s.i + 1}/${ROUND}`); game.setHud("charge", volts(s.total));
    ui.innerHTML = `
      <div class="kv-top"><span class="kv-mode">${s.mode === "daily" ? `Daily Charge #${dayNumber()}` : "Unlimited"}</span><span class="kv-step">Prompt ${s.i + 1} of ${ROUND}</span><span class="kv-diff">${levelName()}</span></div>
      <div class="kv-timer"><i style="width:100%"></i></div>
      <div class="kv-body">
        <div class="kv-main">
          <h2 class="kv-prompt">${esc(c.text)}</h2>
          <p class="kv-sub">${n.toLocaleString()} FTC teams fit. The less famous your answer, the more charge it's worth.</p>
          <form class="kv-form" autocomplete="off"><label class="sr-only" for="kv-in">Team name</label>
            <input id="kv-in" type="text" maxlength="80" placeholder="Type a team name…" spellcheck="false" autocapitalize="words">
            <button class="btn primary" type="submit">Lock in</button></form>
          <div class="kv-actions">${hintsAllowed() ? '<button class="btn sm" type="button" data-hint>Hint</button>' : ""}<button class="btn sm ghost" type="button" data-skip>Skip</button></div>
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
  function meterHtml() {
    const pct = Math.min(100, s.total / (ROUND * 100) * 100);
    return `<aside class="kv-meter" aria-label="Charge ${volts(s.total)}"><div class="kv-bar"><i style="height:${pct}%;--w:${pct}%"></i>${RANKS.slice(1).map(([v, n]) => `<span style="bottom:${v / 70}%" title="${n}"></span>`).join("")}</div>
      <b>${volts(s.total)}</b><small>${rankFor(s.total * 10)}</small></aside>`;
  }
  function hint() {
    if (s.phase !== "ask" || s.hinted) return;
    const v = validFor(s.prompts[s.i]); s.hinted = true;
    const mid = v[Math.floor(v.length * rand(0.3, 0.7))];
    const masked = mid.name.split(" ").map((w) => (w.length > 1 ? w[0] + "•".repeat(Math.min(w.length - 1, 8)) : w)).join(" ");
    ui.querySelector(".kv-hint").classList.remove("warn");
    ui.querySelector(".kv-hint").innerHTML = `Hint: one team that fits is <b>${esc(masked)}</b> from ${esc(where(mid))}.`;
    ui.querySelector("[data-hint]").disabled = true;
  }

  function submit(raw) {
    if (!s || s.phase !== "ask") return;
    const c = s.prompts[s.i], v = validFor(c), res = raw.trim() ? findTeam(raw, c) : null;
    // Unknown names and bare numbers don't use up the prompt: say why and let them try again
    if (raw.trim() && s.t > 0 && (!res || res.numberOnly)) {
      const box = ui.querySelector(".kv-hint"), input = ui.querySelector("#kv-in");
      box.textContent = !res ? `No FTC team called “${raw.trim()}”. Check the spelling and try again.` : res.team ? `Type the team's name, not its number. (#${res.team.number} is ${res.team.name}.)` : "Type a team name, not a number.";
      box.classList.add("warn"); input.select(); Sound.error();
      return;
    }
    s.phase = "reveal";
    let tier = -1, msg = "", team = res?.team || null;
    if (!raw.trim()) msg = s.t <= 0 ? "Time's up." : "Skipped.";
    else if (!res) msg = `We couldn't find an FTC team called “${esc(raw.trim())}”. Check the spelling, or try another team.`;
    else if (res.numberOnly) msg = res.team ? `Type the team's name, not its number. (#${res.team.number} is ${esc(res.team.name)}.)` : "Type a team name, not a number.";
    else if (!res.fits) msg = `${esc(team.name)} (#${team.number}, ${esc(where(team))}) is a real team, but it doesn't fit this prompt.`;
    else tier = tierFor(c, team);
    const pts = tier >= 0 ? TIERS[tier].pts : 0;
    s.total += pts; s.answers.push({ prompt: c.text, answer: tier >= 0 ? team.name : raw.trim(), team: team && tier >= 0 ? team.number : null, tier, pts });
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
      if (tier === 5) game.trophy("kv-surge");
      if (team.number === HOME) game.trophy("kv-home");
    } else Sound.miss();
    const ex = examples(c, team);
    const T = tier >= 0 ? TIERS[tier] : null;
    ui.querySelector(".kv-main").innerHTML = `
      <h2 class="kv-prompt small">${esc(c.text)}</h2>
      ${T ? `<div class="kv-result" style="--tc:${T.color}"><span class="kv-tier">${T.name}</span><span class="kv-pts">+${volts(T.pts)}</span></div>
        <div class="kv-team"><b>${esc(team.name)}</b><span>#${team.number} · ${esc(where(team))} · rookie ${seasonName(team.rookie)}</span></div>
        <p class="kv-note">${team.number === HOME ? "That's us! Steel Surge always counts as a Full Surge. ⚡" : T.blurb}${res.shared ? " (More than one team has this name, so it's scored by the best-known one.)" : ""}</p>`
      : `<div class="kv-result miss"><span class="kv-tier">No charge</span><span class="kv-pts">+0 V</span></div><p class="kv-note">${msg}</p>`}
      <div class="kv-examples"><h3>Answers that would have worked</h3><ul>${ex.map(({ t, k }) => `<li style="--tc:${TIERS[k].color}"><span>${TIERS[k].name}</span>${esc(t.name)} <small>#${t.number} · ${esc(where(t))}</small></li>`).join("")}</ul><p>${v.length.toLocaleString()} teams fit this prompt.</p></div>
      <button class="btn primary" type="button" data-next>${s.i + 1 >= ROUND ? "See results" : "Next prompt"}</button>`;
    ui.querySelector(".kv-meter")?.replaceWith(Object.assign(document.createElement("div"), { innerHTML: meterHtml() }).firstElementChild);
    ui.querySelector(".kv-timer i").style.width = "0%";
    const next = ui.querySelector("[data-next]");
    next.addEventListener("click", () => nextPrompt()); setTimeout(() => next.focus({ preventScroll: true }), 30);
  }
  /** A few real answers from different tiers, so every prompt teaches you some teams. */
  function examples(c, mine) {
    const v = validFor(c), out = [], seen = new Set(mine ? [mine.number] : []), names = new Set(mine ? [mine.k2] : []);
    for (const k of [0, 2, 3, 5]) {
      const lo = k ? Math.floor(CUTS[k - 1] * v.length) : 0, hi = Math.max(lo + 1, Math.floor(CUTS[k] * v.length));
      for (let tries = 0; tries < 6; tries++) { const t = v[Math.min(v.length - 1, lo + Math.floor(Math.random() * (hi - lo)))]; if (t && !seen.has(t.number) && !names.has(t.k2)) { seen.add(t.number); names.add(t.k2); out.push({ t, k: tierFor(c, t) }); break; } }
    }
    return out;
  }

  function finishRound() {
    s.phase = "done"; game.stop();
    const total = s.total, record = { mode: s.mode, total, tiers: s.answers.map((a) => a.tier), answers: s.answers, level: levelName(), day: dayNumber() };
    saved.rounds++;
    if (s.mode === "daily") {
      saved.days[s.key] = record;
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yk = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
      saved.streak = saved.lastDay === yk ? saved.streak + 1 : 1; saved.lastDay = s.key;
      if (saved.streak >= 3) game.trophy("kv-streak");
    } else saved.bestUnlimited = Math.max(saved.bestUnlimited, total);
    save();
    game.trophy("kv-first");
    if (total * 10 >= 3000) game.trophy("kv-3000"); if (total * 10 >= 5000) game.trophy("kv-5000");
    if (level() === 4 && total * 10 >= 2500) game.trophy("kv-extreme");
    game.submitBest(total, volts(total));
    game.setHud("streak", String(saved.streak));
    showSummary(record, false);
  }

  function shareText(r) {
    return `⚡ Kilovolt #${r.day} · ${volts(r.total)}\n${r.tiers.map((k) => (k >= 0 ? TIERS[k].emoji : "⬛")).join("")}\nSteel Surge Arcade · FTC 27254`;
  }
  function showSummary(r, again) {
    ui.hidden = true;
    const isDaily = r.mode !== "unlimited";
    const rows = (r.answers || []).map((a) => { const T = a.tier >= 0 ? TIERS[a.tier] : null; return `<li style="--tc:${T ? T.color : "#4a5b70"}"><span>${T ? T.name : "Miss"}</span><b>${esc(a.answer || "No answer")}</b><small>${esc(a.prompt)}</small></li>`; }).join("");
    game.showOverlay(`<span class="kicker">${isDaily ? `Daily Charge #${r.day}` : "Unlimited round"} · ${esc(r.level || levelName())}</span>
      <h2>${rankFor(r.total * 10)}</h2>
      <div class="big-score">${volts(r.total)}</div>
      <div class="kv-emoji" aria-hidden="true">${r.tiers.map((k) => (k >= 0 ? TIERS[k].emoji : "⬛")).join("")}</div>
      ${again ? "<p>You've already charged up today. A new Daily Charge unlocks at midnight.</p>" : ""}
      <ol class="kv-recap">${rows}</ol>
      <p>${isDaily ? `Daily streak: <b>${saved.streak}</b>` : `Best Unlimited round: <b>${volts(saved.bestUnlimited)}</b>`}</p>
      <div class="overlay-actions">${isDaily ? '<button class="btn" data-share>Copy result</button>' : ""}<button class="btn primary" data-primary>Play Unlimited</button><a class="btn ghost" href="../arcade.html">More games</a></div>`, { onPrimary: () => startRound("unlimited") });
    game.overlay.querySelector("[data-share]")?.addEventListener("click", async (e) => {
      try { await navigator.clipboard.writeText(shareText(r)); e.target.textContent = "Copied!"; } catch { e.target.textContent = "Couldn't copy"; }
    });
  }

  /* ---------------- Loop and rendering ---------------- */
  game.update = (dt) => {
    if (!s || s.phase !== "ask") return;
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
  game.onDifficulty = () => { if (s?.phase === "ask") s.t = Math.min(s.t, timeLimit()); };

  /* ---------------- Start screen ---------------- */
  function intro() {
    const done = saved.days[todayKey()];
    game.setHud("streak", String(saved.streak || 0));
    game.showOverlay(`<span class="kicker">Steel Surge Arcade</span><h2>Kilovolt</h2>
      <p>Seven prompts, one answer each. Name a real FTC team that fits, like “a team from Ohio.” Any correct team charges you up, but <b>the less famous your answer, the more it's worth</b>.</p>
      <div class="kv-legend">${TIERS.map((T) => `<span style="--tc:${T.color}"><b>${T.name}</b>${volts(T.pts)}</span>`).join("")}</div>
      <p class="kv-small">Team data covers all ${TEAMS.length.toLocaleString()} FTC teams that have competed since 2019–20, from FTCScout. It updates every week.</p>
      <div class="overlay-actions"><button class="btn primary" data-primary>${done ? "See today's result" : `Daily Charge #${dayNumber()}`}</button><button class="btn" data-unlimited>Unlimited</button></div>`, { onPrimary: () => startRound("daily") });
    game.overlay.querySelector("[data-unlimited]").addEventListener("click", () => { Sound.select(); startRound("unlimited"); });
  }

  game.setHudBest(game.best()?.label ?? "—");
  game.setMessage("Name real FTC teams. Obscure answers are worth more.");
  game.showOverlay(`<span class="kicker">Steel Surge Arcade</span><h2>Kilovolt</h2><p>Loading every FTC team…</p>`);
  ui.hidden = true;
  loadData().then(intro).catch(() => {
    game.showOverlay(`<span class="kicker">Kilovolt</span><h2>Couldn't load the teams</h2><p>Check your connection, then try again.</p><div class="overlay-actions"><button class="btn primary" data-primary>Try again</button></div>`, { onPrimary: () => location.reload() });
  });
})();
