// Verifies every puzzle level is solvable:  node tools/check_levels.js
const echo = require("../assets/js/arcade/echo.js");
let ok = true;
echo.LEVELS.forEach((l, i) => {
  const solved = echo.verify(l, l.solution), alone = echo.solvableAlone(l);
  console.log(`Echo ${i + 1} ${l.name.padEnd(13)} solution ${solved ? "OK" : "FAIL"}  ${alone ? "(solvable without echoes!)" : ""}`);
  if (!solved || alone) ok = false;
});
console.log("Gridlock and Autonomous levels are self-checked by their generators (tools/gridlock_levels.js, tools/autonomous_levels.js).");
process.exit(ok ? 0 : 1);
