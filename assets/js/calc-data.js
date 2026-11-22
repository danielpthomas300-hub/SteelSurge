/* ==========================================================================
   Steel Surge — score calculator data
   Point values for every FTC game since 2017–18, taken from each season's
   official Competition Manual / Game Manual Part 2 scoring summary.

   Item types:
     count   a number you can step up and down     { pts, max }
     robots  one checkbox per robot                { pts }
     slots   a choice for each robot (or object)   { slots: [...], options: [[label, pts], ...] }
     toggle  a single yes/no for the alliance      { pts }
   bonus(v)  extra points computed from other inputs
   rp        bonus Ranking Points (seasons that have them), using regular-event thresholds
   fouls     { minor, major, mode: "credit" (points go to the other alliance) | "deduct" (subtracted from yours) }
   ========================================================================== */
window.CALC_SEASONS = [
  {
    year: 2026, name: "BIOBUZZ", presenter: "RTX",
    fouls: { minor: 5, major: 20, mode: "credit" },
    winRP: { win: 3, tie: 1 },
    periods: [
      { id: "auto", label: "Autonomous", sub: "First 30 seconds", items: [
        { id: "leave", type: "robots", label: "LEAVE", pts: 3, help: "The robot is no longer touching the perimeter wall at the end of auto." },
        { id: "aPark", type: "robots", label: "PARK in the LOADING ZONE", pts: 5, help: "At least partly in your LOADING ZONE at the end of auto." },
        { id: "aTip", type: "count", label: "HIVE TIPS", pts: 20, max: 10, help: "Each time your HIVE flips to the other side during auto." },
      ] },
      { id: "teleop", label: "TeleOp", sub: "2 minutes of driver control", items: [
        { id: "tTip", type: "count", label: "HIVE TIPS", pts: 20, max: 20, help: "Each time your HIVE flips during TeleOp." },
      ] },
      { id: "end", label: "End of match", sub: "Counted after everything comes to rest", items: [
        { id: "ePark", type: "robots", label: "PARK in the LOADING ZONE", pts: 5, help: "At least partly in your LOADING ZONE when the match ends." },
        { id: "cell", type: "count", label: "POLLEN or NECTAR left in your upward CELL", pts: 2, max: 40 },
        { id: "owned", type: "count", label: "POLLEN or NECTAR in FLOWERS you own", pts: 2, max: 60, help: "You own a FLOWER when your NECTAR is the top-most scored element in it. Every element in it counts for you." },
        { id: "bottom", type: "count", label: "Bottom NECTAR bonus (FLOWERS)", pts: 5, max: 4, help: "For each FLOWER where your NECTAR is the bottom-most scored element." },
        { id: "garden", type: "count", label: "POLLEN or NECTAR in your GARDEN", pts: 1, max: 60 },
      ] },
    ],
    rp: [
      { label: "SWARM RP", need: "LEAVE + PARK points ≥ 16", ok: (v, s) => s("leave") + s("aPark") + s("ePark") >= 16 },
      { label: "POLLINATOR 1 RP", need: "4 or more HIVE TIPS", ok: (v) => v.aTip + v.tTip >= 4 },
      { label: "POLLINATOR 2 RP", need: "7 or more HIVE TIPS", ok: (v) => v.aTip + v.tTip >= 7 },
    ],
  },
  {
    year: 2025, name: "DECODE", presenter: "RTX",
    fouls: { minor: 5, major: 15, mode: "credit" },
    winRP: { win: 3, tie: 1 },
    periods: [
      { id: "auto", label: "Autonomous", sub: "First 30 seconds", items: [
        { id: "leave", type: "robots", label: "LEAVE", pts: 3, help: "No longer over any LAUNCH LINE at the end of auto." },
        { id: "aClass", type: "count", label: "ARTIFACTS CLASSIFIED", pts: 3, max: 30, help: "Scored through the GOAL and kept on your RAMP." },
        { id: "aOver", type: "count", label: "ARTIFACTS OVERFLOW", pts: 1, max: 30, help: "Scored through the GOAL when the RAMP is already full." },
        { id: "aPat", type: "count", label: "PATTERN matches (ARTIFACTS matching the MOTIF)", pts: 2, max: 9, help: "At the end of auto, each RAMP spot whose color matches the MOTIF." },
      ] },
      { id: "teleop", label: "TeleOp", sub: "2 minutes of driver control", items: [
        { id: "tClass", type: "count", label: "ARTIFACTS CLASSIFIED", pts: 3, max: 60 },
        { id: "tOver", type: "count", label: "ARTIFACTS OVERFLOW", pts: 1, max: 60 },
        { id: "depot", type: "count", label: "ARTIFACTS in the DEPOT", pts: 1, max: 30, help: "Resting in front of your GOAL at the end of the match." },
        { id: "tPat", type: "count", label: "PATTERN matches", pts: 2, max: 9, help: "At the end of the match, each RAMP spot whose color matches the MOTIF." },
      ] },
      { id: "end", label: "End of match", sub: "Return to BASE", items: [
        { id: "base", type: "slots", label: "BASE", slots: ["Robot 1", "Robot 2"], options: [["Not in BASE", 0], ["Partly in", 5], ["Fully in", 10]] },
      ] },
    ],
    bonus: (v) => (v.base[0] === 2 && v.base[1] === 2 ? [{ label: "Both robots fully in BASE", pts: 10, period: "end" }] : []),
    rp: [
      { label: "MOVEMENT RP", need: "LEAVE + BASE points ≥ 16", ok: (v, s) => s("leave") + s("base") >= 16 },
      { label: "GOAL RP", need: "36 or more ARTIFACTS through the GOAL", ok: (v) => v.aClass + v.aOver + v.tClass + v.tOver >= 36 },
      { label: "PATTERN RP", need: "PATTERN points ≥ 18", ok: (v, s) => s("aPat") + s("tPat") >= 18 },
    ],
    rpNote: "The PATTERN RP can also be awarded by a foul: if the other alliance breaks rule G417 or G418 (gate and ramp interference), you get it even without the points.",
  },
  {
    year: 2024, name: "INTO THE DEEP", presenter: "RTX",
    fouls: { minor: 5, major: 15, mode: "credit" },
    winRP: { win: 2, tie: 1 },
    periods: [
      { id: "auto", label: "Autonomous", sub: "First 30 seconds", items: [
        { id: "aPark", type: "slots", label: "Robot position", slots: ["Robot 1", "Robot 2"], options: [["None", 0], ["Parked in OBSERVATION ZONE", 3], ["LEVEL 1 ASCENT", 3]] },
        { id: "aNet", type: "count", label: "SAMPLES in the NET ZONE", pts: 2, max: 40 },
        { id: "aLowB", type: "count", label: "SAMPLES in the LOW BASKET", pts: 4, max: 40 },
        { id: "aHighB", type: "count", label: "SAMPLES in the HIGH BASKET", pts: 8, max: 40 },
        { id: "aLowC", type: "count", label: "SPECIMENS on the LOW CHAMBER", pts: 6, max: 20 },
        { id: "aHighC", type: "count", label: "SPECIMENS on the HIGH CHAMBER", pts: 10, max: 20 },
      ] },
      { id: "teleop", label: "TeleOp", sub: "2 minutes of driver control", items: [
        { id: "tNet", type: "count", label: "SAMPLES in the NET ZONE", pts: 2, max: 60, help: "Counted at the end of the match." },
        { id: "tLowB", type: "count", label: "SAMPLES in the LOW BASKET", pts: 4, max: 60 },
        { id: "tHighB", type: "count", label: "SAMPLES in the HIGH BASKET", pts: 8, max: 60 },
        { id: "tLowC", type: "count", label: "SPECIMENS on the LOW CHAMBER", pts: 6, max: 30 },
        { id: "tHighC", type: "count", label: "SPECIMENS on the HIGH CHAMBER", pts: 10, max: 30 },
      ] },
      { id: "end", label: "End of match", sub: "Park or ASCEND (highest only)", items: [
        { id: "ascent", type: "slots", label: "Robot position", slots: ["Robot 1", "Robot 2"], options: [["None", 0], ["Parked in OBSERVATION ZONE", 3], ["LEVEL 1 ASCENT", 3], ["LEVEL 2 ASCENT", 15], ["LEVEL 3 ASCENT", 30]], help: "A robot only earns its highest achievement." },
      ] },
    ],
  },
  {
    year: 2023, name: "CENTERSTAGE", presenter: "RTX",
    fouls: { minor: 10, major: 30, mode: "credit" },
    periods: [
      { id: "auto", label: "Autonomous", sub: "First 30 seconds", items: [
        { id: "aPark", type: "robots", label: "Parked BACKSTAGE", pts: 5 },
        { id: "purple", type: "slots", label: "Purple PIXEL on the correct SPIKE MARK", slots: ["Robot 1", "Robot 2"], options: [["No", 0], ["Using the white PIXEL", 10], ["Using your TEAM PROP", 20]] },
        { id: "yellow", type: "slots", label: "Yellow PIXEL in the correct BACKDROP spot", slots: ["Robot 1", "Robot 2"], options: [["No", 0], ["Using the white PIXEL", 10], ["Using your TEAM PROP", 20]] },
        { id: "aBoard", type: "count", label: "PIXELS on your BACKDROP", pts: 5, max: 30 },
        { id: "aStage", type: "count", label: "PIXELS in your BACKSTAGE", pts: 3, max: 30 },
      ] },
      { id: "teleop", label: "TeleOp", sub: "Count everything at the end, including auto PIXELS", items: [
        { id: "tBoard", type: "count", label: "PIXELS on your BACKDROP", pts: 3, max: 70, help: "PIXELS still on the BACKDROP at the end score again, including ones placed in auto." },
        { id: "tStage", type: "count", label: "PIXELS in your BACKSTAGE", pts: 1, max: 40 },
        { id: "mosaic", type: "count", label: "MOSAICS completed", pts: 10, max: 20 },
        { id: "sets", type: "count", label: "SET LINES reached", pts: 10, max: 3 },
      ] },
      { id: "end", label: "End game", sub: "Last 30 seconds", items: [
        { id: "ePos", type: "slots", label: "Robot position", slots: ["Robot 1", "Robot 2"], options: [["None", 0], ["Parked BACKSTAGE", 5], ["Suspended from RIGGING", 20]] },
        { id: "drone", type: "slots", label: "DRONE landing", slots: ["Robot 1", "Robot 2"], options: [["None", 0], ["Zone 3", 10], ["Zone 2", 20], ["Zone 1", 30]] },
      ] },
    ],
  },
  {
    year: 2022, name: "POWERPLAY", presenter: "Raytheon Technologies",
    fouls: { minor: 10, major: 30, mode: "credit" },
    periods: [
      { id: "auto", label: "Autonomous", sub: "First 30 seconds", items: [
        { id: "aNav", type: "robots", label: "Parked in a TERMINAL or SUBSTATION", pts: 2 },
        { id: "signal", type: "slots", label: "Parked in the SIGNAL ZONE", slots: ["Robot 1", "Robot 2"], options: [["No", 0], ["Using the field SIGNAL", 10], ["Using your SIGNAL SLEEVE", 20]] },
        { id: "aTerm", type: "count", label: "CONES in a TERMINAL", pts: 1, max: 30 },
        { id: "aG", type: "count", label: "CONES on GROUND JUNCTIONS", pts: 2, max: 20 },
        { id: "aL", type: "count", label: "CONES on LOW JUNCTIONS", pts: 3, max: 20 },
        { id: "aM", type: "count", label: "CONES on MEDIUM JUNCTIONS", pts: 4, max: 20 },
        { id: "aH", type: "count", label: "CONES on HIGH JUNCTIONS", pts: 5, max: 20 },
      ] },
      { id: "teleop", label: "TeleOp", sub: "Count every CONE at the end, including auto CONES", items: [
        { id: "tTerm", type: "count", label: "CONES in a TERMINAL", pts: 1, max: 40 },
        { id: "tG", type: "count", label: "CONES on GROUND JUNCTIONS", pts: 2, max: 40, help: "CONES from auto that are still there count again here." },
        { id: "tL", type: "count", label: "CONES on LOW JUNCTIONS", pts: 3, max: 40 },
        { id: "tM", type: "count", label: "CONES on MEDIUM JUNCTIONS", pts: 4, max: 40 },
        { id: "tH", type: "count", label: "CONES on HIGH JUNCTIONS", pts: 5, max: 40 },
      ] },
      { id: "end", label: "End game", sub: "Last 30 seconds", items: [
        { id: "ePark", type: "robots", label: "Parked in a TERMINAL", pts: 2 },
        { id: "ownCone", type: "count", label: "JUNCTIONS owned by a CONE", pts: 3, max: 25, help: "Your CONE is on top." },
        { id: "ownBeacon", type: "count", label: "JUNCTIONS owned by a BEACON", pts: 10, max: 2 },
        { id: "circuit", type: "toggle", label: "Completed CIRCUIT", pts: 20 },
      ] },
    ],
  },
  {
    year: 2021, name: "FREIGHT FRENZY", presenter: "Raytheon Technologies",
    fouls: { minor: 10, major: 30, mode: "deduct" },
    periods: [
      { id: "auto", label: "Autonomous", sub: "First 30 seconds", items: [
        { id: "aDuck", type: "toggle", label: "Duck delivered from the CAROUSEL", pts: 10 },
        { id: "aPark", type: "slots", label: "Parking", slots: ["Robot 1", "Robot 2"], options: [["None", 0], ["In STORAGE UNIT", 3], ["Completely in STORAGE UNIT", 6], ["In WAREHOUSE", 5], ["Completely in WAREHOUSE", 10]] },
        { id: "bonus", type: "slots", label: "Pre-load box on the randomized level", slots: ["Robot 1", "Robot 2"], options: [["No", 0], ["Using the duck", 10], ["Using your team shipping element", 20]] },
        { id: "aStore", type: "count", label: "FREIGHT completely in STORAGE UNIT", pts: 2, max: 20 },
        { id: "aHub", type: "count", label: "FREIGHT completely on the SHIPPING HUB", pts: 6, max: 20 },
      ] },
      { id: "teleop", label: "TeleOp", sub: "Driver control", items: [
        { id: "tStore", type: "count", label: "FREIGHT completely in STORAGE UNIT", pts: 1, max: 40 },
        { id: "tL1", type: "count", label: "FREIGHT on ALLIANCE HUB level 1", pts: 2, max: 40 },
        { id: "tL2", type: "count", label: "FREIGHT on ALLIANCE HUB level 2", pts: 4, max: 40 },
        { id: "tL3", type: "count", label: "FREIGHT on ALLIANCE HUB level 3", pts: 6, max: 40 },
        { id: "tShared", type: "count", label: "FREIGHT on the SHARED HUB", pts: 4, max: 40 },
      ] },
      { id: "end", label: "End game", sub: "Last 30 seconds", items: [
        { id: "ducks", type: "count", label: "Ducks or team shipping elements delivered", pts: 6, max: 10 },
        { id: "balanced", type: "toggle", label: "ALLIANCE HUB balanced", pts: 10 },
        { id: "unbal", type: "toggle", label: "SHARED HUB tipped toward you (unbalanced)", pts: 20 },
        { id: "ePark", type: "slots", label: "Parking", slots: ["Robot 1", "Robot 2"], options: [["None", 0], ["In WAREHOUSE", 3], ["Completely in WAREHOUSE", 6]] },
        { id: "cap", type: "count", label: "Team shipping elements capped", pts: 15, max: 2 },
      ] },
    ],
  },
  {
    year: 2020, name: "ULTIMATE GOAL", presenter: "Qualcomm",
    fouls: { minor: 10, major: 30, mode: "deduct" },
    periods: [
      { id: "auto", label: "Autonomous", sub: "First 30 seconds", items: [
        { id: "wobbleA", type: "count", label: "WOBBLE GOALS delivered to the TARGET ZONE", pts: 15, max: 2 },
        { id: "nav", type: "robots", label: "Parked over the LAUNCH LINE", pts: 5 },
        { id: "aLow", type: "count", label: "RINGS in the LOW GOAL", pts: 3, max: 30 },
        { id: "aMid", type: "count", label: "RINGS in the MID GOAL", pts: 6, max: 30 },
        { id: "aHigh", type: "count", label: "RINGS in the HIGH GOAL", pts: 12, max: 30 },
        { id: "aPower", type: "count", label: "POWER SHOT targets knocked back", pts: 15, max: 3 },
      ] },
      { id: "teleop", label: "TeleOp", sub: "Driver control", items: [
        { id: "tLow", type: "count", label: "RINGS in the LOW GOAL", pts: 2, max: 80 },
        { id: "tMid", type: "count", label: "RINGS in the MID GOAL", pts: 4, max: 80 },
        { id: "tHigh", type: "count", label: "RINGS in the HIGH GOAL", pts: 6, max: 80 },
      ] },
      { id: "end", label: "End game", sub: "Last 30 seconds", items: [
        { id: "wobbleE", type: "slots", label: "WOBBLE GOALS", slots: ["Wobble goal 1", "Wobble goal 2"], options: [["None", 0], ["Over the START LINE", 5], ["In the DROP ZONE", 20]] },
        { id: "wRings", type: "count", label: "RINGS on WOBBLE GOALS", pts: 5, max: 20 },
        { id: "ePower", type: "count", label: "POWER SHOT targets knocked back", pts: 15, max: 3 },
      ] },
    ],
  },
  {
    year: 2019, name: "SKYSTONE", presenter: "Qualcomm",
    fouls: { minor: 5, major: 20, mode: "credit" },
    periods: [
      { id: "auto", label: "Autonomous", sub: "First 30 seconds", items: [
        { id: "sky", type: "count", label: "SKYSTONES among your first two deliveries", pts: 10, max: 2, help: "Only the first two STONES delivered can earn the SKYSTONE bonus." },
        { id: "aDeliv", type: "count", label: "Other STONES delivered", pts: 2, max: 20 },
        { id: "repos", type: "toggle", label: "FOUNDATION repositioned", pts: 10 },
        { id: "aPlace", type: "count", label: "STONES placed on the FOUNDATION", pts: 4, max: 20 },
        { id: "aNav", type: "robots", label: "Parked under the SKYBRIDGE", pts: 5 },
      ] },
      { id: "teleop", label: "TeleOp", sub: "Driver control", items: [
        { id: "tDeliv", type: "count", label: "STONES delivered under the SKYBRIDGE", pts: 1, max: 60 },
        { id: "tPlace", type: "count", label: "STONES placed on the FOUNDATION", pts: 1, max: 60 },
        { id: "tall", type: "count", label: "Levels in your tallest SKYSCRAPER", pts: 2, max: 30 },
      ] },
      { id: "end", label: "End game", sub: "Last 30 seconds", items: [
        { id: "caps", type: "count", label: "CAPSTONES placed", pts: 5, max: 2 },
        { id: "capLv", type: "count", label: "Capping bonus (levels under each CAPSTONE, added up)", pts: 1, max: 60 },
        { id: "moved", type: "toggle", label: "FOUNDATION moved out of the BUILDING SITE", pts: 15 },
        { id: "ePark", type: "robots", label: "Parked in the BUILDING SITE", pts: 5 },
      ] },
    ],
  },
  {
    year: 2018, name: "ROVER RUCKUS", presenter: "Qualcomm",
    fouls: { minor: 10, major: 40, mode: "credit" },
    periods: [
      { id: "auto", label: "Autonomous", sub: "First 30 seconds", items: [
        { id: "land", type: "robots", label: "Landed from the LANDER", pts: 30 },
        { id: "sample", type: "robots", label: "Sampled the gold mineral", pts: 25 },
        { id: "claim", type: "robots", label: "Claimed the DEPOT (team marker)", pts: 15 },
        { id: "aPark", type: "robots", label: "Parked in a CRATER", pts: 10 },
        { id: "aDepot", type: "count", label: "Minerals in the DEPOT", pts: 2, max: 30 },
        { id: "aHold", type: "count", label: "Minerals in the correct CARGO HOLD", pts: 5, max: 30 },
      ] },
      { id: "teleop", label: "TeleOp", sub: "Driver control", items: [
        { id: "tDepot", type: "count", label: "Minerals in the DEPOT", pts: 2, max: 60 },
        { id: "tHold", type: "count", label: "Minerals in the correct CARGO HOLD", pts: 5, max: 100, help: "Gold in the gold hold or silver in the silver hold. Wrong-color minerals score 0." },
      ] },
      { id: "end", label: "End game", sub: "Last 30 seconds", items: [
        { id: "ePos", type: "slots", label: "Robot position", slots: ["Robot 1", "Robot 2"], options: [["None", 0], ["In a CRATER", 15], ["Completely in a CRATER", 25], ["LATCHED to the LANDER", 50]] },
      ] },
    ],
  },
  {
    year: 2017, name: "RELIC RECOVERY", presenter: "Qualcomm",
    fouls: { minor: 10, major: 40, mode: "credit" },
    periods: [
      { id: "auto", label: "Autonomous", sub: "First 30 seconds", items: [
        { id: "jewel", type: "count", label: "Platforms with only your color JEWEL left", pts: 30, max: 2 },
        { id: "aGlyph", type: "count", label: "GLYPHS scored in your CRYPTOBOXES", pts: 15, max: 24 },
        { id: "key", type: "count", label: "CRYPTOBOX KEY bonus (first GLYPH in the right column)", pts: 30, max: 2 },
        { id: "safe", type: "robots", label: "Parked in a SAFE ZONE", pts: 10 },
      ] },
      { id: "teleop", label: "TeleOp", sub: "Driver control", items: [
        { id: "tGlyph", type: "count", label: "GLYPHS scored", pts: 2, max: 24 },
        { id: "rows", type: "count", label: "Completed rows of 3", pts: 10, max: 8 },
        { id: "cols", type: "count", label: "Completed columns of 4", pts: 20, max: 6 },
        { id: "cipher", type: "count", label: "Completed CIPHERS", pts: 30, max: 2 },
      ] },
      { id: "end", label: "End game", sub: "Last 30 seconds", items: [
        { id: "relic", type: "slots", label: "RELICS", slots: ["Relic 1", "Relic 2"], options: [["Not scored", 0], ["Zone 1", 10], ["Zone 2", 20], ["Zone 3", 40]] },
        { id: "upright", type: "count", label: "RELICS standing upright", pts: 15, max: 2 },
        { id: "balanced", type: "robots", label: "Balanced on a BALANCING STONE", pts: 20 },
      ] },
    ],
  },
];
