/* ==========================================================================
   Steel Surge — 3D FTC field replicas
   Each season's field is modeled from the official Competition Manual
   figures and dimensions (units are inches; the field is 144 × 144 in.).
   The audience side is +Z; the back wall is −Z.

   Usage:  const viewer = await mountField(containerEl, 2026); viewer.dispose();
   ========================================================================== */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const C = {
  red: 0xd8343b, redLight: 0xff6a6f, blue: 0x2c6fdf, blueLight: 0x6aa0ff, yellow: 0xf4c21b, white: 0xf2f4f7, black: 0x1a1d22,
  tile: 0x7a8189, tileAlt: 0x737a82, rail: 0xb9c2cc, steel: 0x8a96a3, dark: 0x2a3038, green: 0x2fae5a, purple: 0x7b3fd1, orange: 0xf08a24,
  wood: 0x8c6a46, gray: 0xb7bdc5, tan: 0xc9a979,
};
const W = 144, H = 72; // field width and half-width

/* ---------------- Small builder helpers ---------------- */
function mat(color, opts = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.08, ...opts }); }
function mesh(geo, material, { cast = true, receive = true } = {}) { const m = new THREE.Mesh(geo, material); m.castShadow = cast; m.receiveShadow = receive; return m; }

class Builder {
  constructor(scene) { this.scene = scene; this.parts = []; this.cache = new Map(); }
  m(color, opts) { const k = color + JSON.stringify(opts || {}); if (!this.cache.has(k)) this.cache.set(k, mat(color, opts)); return this.cache.get(k); }
  /** Registers a named, hoverable group. */
  part(name, detail, objects) { const g = new THREE.Group(); objects.flat().forEach((o) => g.add(o)); g.userData = { name, detail }; this.scene.add(g); this.parts.push(g); return g; }
  add(...objs) { objs.flat().forEach((o) => this.scene.add(o)); }
  box(w, h, d, color, x = 0, y = 0, z = 0, opts) { const b = mesh(new THREE.BoxGeometry(w, h, d), this.m(color, opts)); b.position.set(x, y, z); return b; }
  cyl(rt, rb, h, color, x = 0, y = 0, z = 0, opts, seg = 24) { const c = mesh(new THREE.CylinderGeometry(rt, rb, h, seg), this.m(color, opts)); c.position.set(x, y, z); return c; }
  ball(r, color, x, y, z, opts) { const s = mesh(new THREE.SphereGeometry(r, 18, 14), this.m(color, opts)); s.position.set(x, y + r, z); return s; }
  /** A bar (tube) between two 3D points. */
  bar(a, b, r, color, opts) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), len = va.distanceTo(vb);
    const c = mesh(new THREE.CylinderGeometry(r, r, len, 12), this.m(color, opts));
    c.position.copy(va.clone().add(vb).multiplyScalar(0.5));
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    return c;
  }
  /** Gaffer tape line on the tiles (flat strip from (x1,z1) to (x2,z2)). */
  tape(x1, z1, x2, z2, color, width = 2) {
    const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
    const t = mesh(new THREE.BoxGeometry(len, 0.12, width), this.m(color, { roughness: 0.4 }), { cast: false });
    t.position.set((x1 + x2) / 2, 0.66, (z1 + z2) / 2); t.rotation.y = -Math.atan2(dz, dx); return t;
  }
  /** Closed tape outline through points [[x,z],...]. */
  outline(points, color, width = 2, closed = true) {
    const out = [];
    for (let i = 0; i < points.length - (closed ? 0 : 1); i++) { const a = points[i], b = points[(i + 1) % points.length]; out.push(this.tape(a[0], a[1], b[0], b[1], color, width)); }
    return out;
  }
  /** Flat translucent colored zone on the floor. */
  zone(points, color, opacity = 0.22, y = 0.64) {
    const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ShapeGeometry(shape); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false })); m.position.y = y; return m;
  }
  /** Text label lying on the floor or standing (canvas texture). */
  label(text, x, y, z, { size = 10, color = "#e9eef4", flat = true, rot = 0 } = {}) {
    const c = document.createElement("canvas"), ctx = c.getContext("2d"), fs = 64;
    ctx.font = `700 ${fs}px "Space Grotesk", system-ui, sans-serif`; const w = Math.ceil(ctx.measureText(text).width) + 20;
    c.width = w; c.height = fs + 24; ctx.font = `700 ${fs}px "Space Grotesk", system-ui, sans-serif`; ctx.fillStyle = color; ctx.textBaseline = "middle"; ctx.fillText(text, 10, c.height / 2);
    const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(size * w / c.height, size), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    p.position.set(x, y, z); if (flat) p.rotation.x = -Math.PI / 2; p.rotation.z = rot; return p;
  }
}

/* ---------------- Shared field: tiles, perimeter, alliance areas ---------------- */
function baseField(b, { redSide = "left", wallH = 12, alliance = true } = {}) {
  // Floor outside the field
  const ground = mesh(new THREE.PlaneGeometry(520, 520), new THREE.MeshStandardMaterial({ color: 0x14181d, roughness: 1 }), { cast: false });
  ground.rotation.x = -Math.PI / 2; b.add(ground);
  // 36 foam tiles with small gaps so seams read clearly
  const tiles = [];
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) tiles.push(b.box(23.8, 0.6, 23.8, (i + j) % 2 ? C.tile : C.tileAlt, -60 + i * 24, 0.3, -60 + j * 24, { roughness: 0.95 }));
  b.part("Foam tiles", "36 soft foam tiles, each about 24 × 24 in., make up the 12 × 12 ft. field.", tiles);
  // Perimeter: aluminum rails with clear polycarbonate panels
  const panel = new THREE.MeshPhysicalMaterial({ color: 0xcfe3ff, transparent: true, opacity: 0.16, roughness: 0.15, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
  const walls = [];
  for (const [x, z, w, d] of [[0, -H - 0.5, W + 2, 1], [0, H + 0.5, W + 2, 1], [-H - 0.5, 0, 1, W + 2], [H + 0.5, 0, 1, W + 2]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), panel); p.position.set(x, wallH / 2, z); walls.push(p);
    walls.push(b.box(w + (d > 1 ? 0 : 1), 1.2, d + (w > 1 ? 0 : 1), C.rail, x, wallH, z, { metalness: 0.6, roughness: 0.35 }));
    walls.push(b.box(w + (d > 1 ? 0 : 1), 2, d + (w > 1 ? 0 : 1), C.rail, x, 1, z, { metalness: 0.6, roughness: 0.35 }));
  }
  for (const [x, z] of [[-H, -H], [H, -H], [-H, H], [H, H]]) walls.push(b.box(2, wallH + 1, 2, C.steel, x, (wallH + 1) / 2, z, { metalness: 0.5 }));
  b.part("Field perimeter", "The perimeter wall surrounds the field, with clear panels so the audience can see the robots.", walls);
  if (alliance) {
    const side = (color, sx) => b.outline([[sx * 78, -48], [sx * 132, -48], [sx * 132, 48], [sx * 78, 48]], color, 3);
    const red = redSide === "left" ? -1 : 1;
    b.part("Red alliance area", "Where the red alliance's drivers and coach stand during the match.", side(C.red, red));
    b.part("Blue alliance area", "Where the blue alliance's drivers and coach stand during the match.", side(C.blue, -red));
  }
  b.add(b.label("AUDIENCE", 0, 0.7, H + 16, { size: 7, color: "#7b8a9e" }));
}

/* ---------------- Season builders ---------------- */
const SEASONS = {
  /* ===== 2026–27 BIOBUZZ ===== */
  2026(b) {
    baseField(b, { redSide: "left" });
    // HIVE frame: two A-frames at x = ±24.7, crossbar at 44 in.
    const frame = [];
    for (const x of [-24.7, 24.7]) {
      frame.push(b.bar([x, 0.6, -19.5], [x, 44, 0], 0.9, C.steel, { metalness: 0.7, roughness: 0.3 }));
      frame.push(b.bar([x, 0.6, 19.5], [x, 44, 0], 0.9, C.steel, { metalness: 0.7, roughness: 0.3 }));
      frame.push(b.bar([x, 1.2, -19.5], [x, 1.2, 19.5], 0.7, C.steel, { metalness: 0.7 }));
    }
    frame.push(b.bar([-24.7, 44, 0], [24.7, 44, 0], 0.9, C.steel, { metalness: 0.7 }));
    const sign = b.box(20, 6, 0.4, C.yellow, 0, 30, 0); frame.push(sign);
    b.part("HIVE frame", "Two triangular frames joined by a crossbar. The HIVE pivots sit about 44 in. above the tiles.", frame);
    // Two HIVES, each a seesaw with two CELLS. Red's +Z cell starts up; blue's −Z cell starts up.
    const hive = (cx, color, upSign) => {
      const g = new THREE.Group(); g.position.set(cx, 44, 0);
      const arm = b.box(3, 2, 22, C.dark); g.add(arm);
      for (const s of [-1, 1]) {
        const cell = new THREE.Group(); cell.position.set(0, -6, s * 9.4);
        cell.add(b.box(20, 1, 12, color, 0, -7, 0)); // floor
        cell.add(b.box(20, 14, 1, color, 0, 0, s * 6)); // back
        cell.add(b.box(1, 14, 12, color, -10, 0, 0), b.box(1, 14, 12, color, 10, 0, 0));
        cell.add(b.bar([-10, 7, -s * 6], [10, 7, -s * 6], 0.5, color));
        if (s === upSign) for (let k = 0; k < 3; k++) cell.add(b.ball(1.8, color === C.red ? C.red : C.blue, -5 + k * 4.2, -6.5, s * 3));
        g.add(cell);
      }
      g.rotation.x = upSign * 0.38;
      return g;
    };
    b.part("Red HIVE", "The red alliance's HIVE. Launching enough elements into its upward CELL tips it for 20 points.", [hive(-12, C.red, 1)]);
    b.part("Blue HIVE", "The blue alliance's HIVE. Each TIP flips which CELL faces up.", [hive(12, C.blue, -1)]);
    // FLOWERS on the walls (pinwheel layout), 21.5 in. tall with a 4 in. opening
    const flower = (x, z, rot) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
      g.add(b.cyl(4.2, 4.2, 0.4, C.yellow, 0, 0.8, 3.5));
      for (const [px, pz] of [[-2.3, 1.2], [2.3, 1.2], [-2.3, 5.8], [2.3, 5.8]]) g.add(b.cyl(0.4, 0.4, 17, C.white, px, 13, pz));
      g.add(b.cyl(3.4, 2.4, 2.4, C.yellow, 0, 21.5, 3.5));
      g.add(b.cyl(3.0, 3.0, 0.8, C.yellow, 0, 9, 3.5));
      g.add(b.box(2, 22, 1.5, C.dark, 0, 11, 0.2));
      for (let k = 0; k < 6; k++) { const p = b.cyl(1.4, 0.2, 0.4, 0xffd84d, Math.cos(k) * 4.2, 22.6, 3.5 + Math.sin(k) * 4.2); p.rotation.z = 0.3; g.add(p); }
      for (let k = 0; k < 4; k++) g.add(b.ball(1.4, C.yellow, 0, 9.4 + k * 2.9, 3.5));
      return g;
    };
    b.part("FLOWERS", "Four FLOWERS on the walls. After the 1:00 mark, the alliance with its NECTAR on top owns a FLOWER and scores for everything inside.",
      [flower(-24, -H, 0), flower(H, -24, -Math.PI / 2), flower(-H, 24, Math.PI / 2), flower(24, H, Math.PI)]);
    // Loading zones and gardens
    b.part("Red LOADING ZONE", "Robots park here (5 points). It also holds the red preloads at the start.", [b.zone([[-72, -48], [-61, -48], [-61, -25], [-72, -25]], C.red, 0.3), ...b.outline([[-72, -48], [-61, -48], [-61, -25], [-72, -25]], C.red)]);
    b.part("Blue LOADING ZONE", "Robots park here (5 points). It also holds the blue preloads at the start.", [b.zone([[72, 25], [61, 25], [61, 48], [72, 48]], C.blue, 0.3), ...b.outline([[72, 25], [61, 25], [61, 48], [72, 48]], C.blue)]);
    const gardenPollen = (x0, dir, z) => Array.from({ length: 4 }, (_, k) => b.ball(1.4, C.yellow, x0 + dir * (2 + k * 3), 0.6, z));
    b.part("Red GARDEN", "Any POLLEN or NECTAR in the red GARDEN scores 1 point for red at the end.", [b.tape(-72, 70, -49, 70, C.red, 2), ...gardenPollen(-72, 1, 67)]);
    b.part("Blue GARDEN", "Any POLLEN or NECTAR in the blue GARDEN scores 1 point for blue at the end.", [b.tape(49, -70, 72, -70, C.blue, 2), ...gardenPollen(72, -1, -67)]);
    // Nectar supply in each alliance area
    const supply = (x, color) => Array.from({ length: 5 }, (_, k) => b.ball(1.8, color, x + (k % 2) * 3.6, 0, -4 + Math.floor(k / 2) * 3.8));
    b.part("NECTAR supply", "Five NECTAR wait in each alliance area. One is released each time the alliance tips its HIVE.", [...supply(-82, C.red), ...supply(80, C.blue)]);
  },

  /* ===== 2025–26 DECODE ===== */
  2025(b) {
    baseField(b, { redSide: "left", wallH: 12 });
    const goal = (sx, color) => {
      const g = new THREE.Group(); g.position.set(sx * 58, 0, -58); g.rotation.y = sx > 0 ? Math.PI / 4 : -Math.PI / 4;
      g.add(b.box(30, 38, 2, color, 0, 19, -6));
      g.add(b.box(2, 38, 18, color, -14, 19, 2), b.box(2, 38, 18, color, 14, 19, 2));
      g.add(b.box(30, 2, 18, color, 0, 38, 2));
      g.add(b.box(26, 10, 2, color, 0, 33, 10));
      const tag = b.box(6.5, 6.5, 0.3, C.white, 0, 27, 11.2); g.add(tag);
      return g;
    };
    b.part("Blue GOAL", "Blue launches ARTIFACTS through the top opening of this corner GOAL.", [goal(-1, C.blue)]);
    b.part("Red GOAL", "Red launches ARTIFACTS through the top opening of this corner GOAL.", [goal(1, C.red)]);
    // Ramps (classifier) running down each side wall from the goal, with a gate at the bottom
    const ramp = (sx, color) => {
      const parts = [];
      const r = b.box(5, 1, 46, color, sx * 66, 0, -26); r.position.y = 9; r.rotation.x = -0.16; parts.push(r);
      parts.push(b.box(1, 3, 46, C.rail, sx * 63.5, 10, -26, { metalness: 0.6 }), b.box(1, 3, 46, C.rail, sx * 68.5, 10, -26, { metalness: 0.6 }));
      for (let k = 0; k < 5; k++) parts.push(b.ball(2.5, k % 3 === 1 ? C.green : C.purple, sx * 66, 6.5 + k * 0.85, -6 - k * 5.2));
      return parts;
    };
    b.part("Blue RAMP and CLASSIFIER", "Scored ARTIFACTS roll down here. Their color order forms blue's PATTERN.", ramp(-1, C.blue));
    b.part("Red RAMP and CLASSIFIER", "Scored ARTIFACTS roll down here. Their color order forms red's PATTERN.", ramp(1, C.red));
    b.part("GATES", "Robots open the GATE at the bottom of the ramp to release ARTIFACTS.", [b.box(5, 6, 1.5, C.blue, -66, 4, 0), b.box(5, 6, 1.5, C.red, 66, 4, 0), b.tape(-62, 0, -56, 0, C.blue), b.tape(56, 0, 62, 0, C.red)]);
    // Obelisk outside the back wall
    const obelisk = b.box(9, 24, 9, C.black, 0, 12, -82); obelisk.rotation.y = Math.PI / 4;
    const tagO = b.box(6, 6, 0.3, C.white, 0, 18, -76.2);
    b.part("OBELISK", "Randomized before each match to show one of three MOTIFS that set the PATTERN to build.", [obelisk, tagO]);
    // Launch line triangles (white tape) and base zones
    b.part("Launch zones", "White tape marks the launch zones. Robots leave the LAUNCH LINE in auto for 3 points.", [b.tape(-72, -72, 0, 0, C.white), b.tape(72, -72, 0, 0, C.white), b.tape(-24, 72, 0, 48, C.white), b.tape(24, 72, 0, 48, C.white)]);
    b.part("Red BASE ZONE", "Robots return here at the end: 5 points partially, 10 points fully.", [b.zone([[-42, 28], [-24, 28], [-24, 46], [-42, 46]], C.red, 0.25), ...b.outline([[-42, 28], [-24, 28], [-24, 46], [-42, 46]], C.red)]);
    b.part("Blue BASE ZONE", "Robots return here at the end: 5 points partially, 10 points fully.", [b.zone([[24, 28], [42, 28], [42, 46], [24, 46]], C.blue, 0.25), ...b.outline([[24, 28], [42, 28], [42, 46], [24, 46]], C.blue)]);
    b.part("LOADING ZONES", "Human players hand ARTIFACTS to robots in the front corners.", [...b.outline([[-72, 48], [-48, 48], [-48, 72]], C.white, 2, false), ...b.outline([[72, 48], [48, 48], [48, 72]], C.white, 2, false)]);
    // Artifacts in rows of three (G P P / P G P / P P G)
    const rows = [[-12, [C.green, C.purple, C.purple]], [12, [C.purple, C.green, C.purple]], [36, [C.purple, C.purple, C.green]]];
    const arts = [];
    for (const [z, cols] of rows) cols.forEach((c, k) => { arts.push(b.ball(2.5, c, -52 + k * 5, 0.6, z)); arts.push(b.ball(2.5, cols[2 - k], 42 + k * 5, 0.6, z)); });
    for (const sx of [-1, 1]) [C.purple, C.green, C.purple].forEach((c, k) => arts.push(b.ball(2.5, c, sx * 68, 0.6, 58 + k * 5)));
    b.part("ARTIFACTS", "Purple and green balls staged in three rows on each side and in the loading corners.", arts);
  },

  /* ===== 2024–25 INTO THE DEEP ===== */
  2024(b) {
    baseField(b, { redSide: "right" });
    // Submersible: zone 42.75 (x) × 27.5 (z); chambers face the alliance walls, rungs on the other sides
    const sub = [];
    for (const x of [-23, 23]) for (const z of [-15, 15]) sub.push(b.box(1.5, 36, 1.5, C.dark, x, 18, z, { metalness: 0.6 }));
    for (const z of [-15, 15]) { sub.push(b.bar([-23, 20, z], [23, 20, z], 0.8, C.yellow, { metalness: 0.5 })); sub.push(b.bar([-23, 36, z], [23, 36, z], 0.8, C.yellow, { metalness: 0.5 })); }
    for (const x of [-23, 23]) { sub.push(b.bar([x, 13, -15], [x, 13, 15], 0.6, x < 0 ? C.blue : C.red)); sub.push(b.bar([x, 26, -15], [x, 26, 15], 0.6, x < 0 ? C.blue : C.red)); }
    sub.push(b.box(46, 2, 1, C.dark, 0, 2, -15), b.box(46, 2, 1, C.dark, 0, 2, 15), b.box(1, 2, 30, C.dark, -23, 2, 0), b.box(1, 2, 30, C.dark, 23, 2, 0));
    b.part("SUBMERSIBLE", "The center structure. LOW and HIGH CHAMBERS face each alliance; the yellow LOW (20 in.) and HIGH (36 in.) RUNGS are for ascending.", sub);
    const samples = [];
    for (let i = 0; i < 46; i++) { const c = i % 5 === 0 ? C.red : i % 5 === 1 ? C.blue : C.yellow; const s = b.box(3.5, 1.5, 1.5, c, -19 + (i * 7.3) % 38, 1.4 + (i % 3) * 0.2, -12 + ((i * 4.1) % 24)); s.rotation.y = i * 0.7; samples.push(s); }
    b.part("SAMPLES", "Yellow samples score in the BASKETS. Red and blue samples become SPECIMENS.", samples);
    b.part("ASCENT ZONES", "Taped areas under the rungs where robots ascend at the end.", [b.zone([[-23, -15], [23, -15], [23, -24], [0, -30], [-23, -24]], C.blue, 0.25), b.zone([[-23, 15], [23, 15], [23, 24], [0, 30], [-23, 24]], C.red, 0.25)]);
    // Net zones and baskets in opposite corners
    const basket = (x, z, color) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); const o = -Math.sign(x) * 4;
      g.add(b.box(2, 46, 2, C.dark, 0, 23, 0, { metalness: 0.6 }));
      g.add(b.box(9, 6, 9, color, o, 28.75, o * Math.sign(z) * Math.sign(x), { transparent: true, opacity: 0.8 }), b.box(9, 6, 9, color, o, 46, o * Math.sign(z) * Math.sign(x), { transparent: true, opacity: 0.8 }));
      return g;
    };
    b.part("Blue NET ZONE and BASKETS", "Samples here score 2 points; low and high baskets score 4 and 8.", [b.zone([[-72, -72], [-49, -72], [-72, -49]], C.blue, 0.35), b.tape(-49, -72, -72, -49, C.blue), basket(-66, -66, C.blue)]);
    b.part("Red NET ZONE and BASKETS", "Samples here score 2 points; low and high baskets score 4 and 8.", [b.zone([[72, 72], [49, 72], [72, 49]], C.red, 0.35), b.tape(49, 72, 72, 49, C.red), basket(66, 66, C.red)]);
    b.part("OBSERVATION ZONES", "Human players turn samples into SPECIMENS here. Parking here scores 3 points.", [b.zone([[-72, 36], [-59, 46], [-59, 72], [-72, 72]], C.blue, 0.3), b.zone([[72, -36], [59, -46], [59, -72], [72, -72]], C.red, 0.3)]);
    const spike = [];
    for (let k = 0; k < 3; k++) { spike.push(b.box(3.5, 1.5, 1.5, C.yellow, -48 + k * 10, 1.4, -56)); spike.push(b.box(3.5, 1.5, 1.5, C.yellow, 48 - k * 10, 1.4, 56)); spike.push(b.box(3.5, 1.5, 1.5, C.blue, -48 + k * 10, 1.4, 56)); spike.push(b.box(3.5, 1.5, 1.5, C.red, 48 - k * 10, 1.4, -56)); }
    b.part("SPIKE MARKS", "Twelve samples start on spike marks near the walls.", spike);
  },

  /* ===== 2023–24 CENTERSTAGE ===== */
  2023(b) {
    baseField(b, { redSide: "right" });
    const backdrop = (x, color) => {
      const g = new THREE.Group(); g.position.set(x, 0, -66); g.rotation.x = -0.52;
      g.add(b.box(20, 30, 1.2, C.dark, 0, 15, 0));
      for (let r = 0; r < 11; r++) for (let c = 0; c < (r % 2 ? 6 : 7); c++) if ((r * 7 + c) % 4 === 0) g.add(b.cyl(1.4, 1.4, 0.6, [C.white, C.yellow, C.green, C.purple][(r + c) % 4], -7.5 + c * 2.5 + (r % 2) * 1.25, 3 + r * 2.4, 0.9, {}, 6).rotateX(Math.PI / 2));
      g.add(b.box(20, 1.4, 1.4, color, 0, 30.5, 0.6));
      return g;
    };
    b.part("BACKDROPS", "Angled pegboards on the back wall where robots place PIXELS to build rows and MOSAICS.", [backdrop(-24, C.blue), backdrop(24, C.red)]);
    // Trusses across the field with a stage door in the middle
    const truss = [];
    for (const x of [-72, -48, -24, 24, 48, 72]) truss.push(b.box(2, 20, 2, C.dark, x, 10, 0, { metalness: 0.5 }));
    truss.push(b.box(46, 2, 2, C.yellow, -48, 20, 0), b.box(46, 2, 2, C.yellow, 48, 20, 0), b.box(46, 2, 2, C.yellow, -48, 14, 0), b.box(46, 2, 2, C.yellow, 48, 14, 0));
    truss.push(b.box(46, 2, 2, C.yellow, 0, 20, 0));
    b.part("TRUSSES", "Low trusses separate the front of the field from the BACKSTAGE. Robots drive under them.", truss);
    b.part("STAGE DOOR", "A hinged door in the center truss that robots can push through.", [b.box(44, 12, 0.8, C.gray, 0, 7, 0, { transparent: true, opacity: 0.85 })]);
    b.part("RIGGING", "Bars robots grab to suspend for 20 points in the End Game.", [b.bar([-72, 24, 0], [-26, 24, 0], 0.7, C.blue), b.bar([26, 24, 0], [72, 24, 0], 0.7, C.red)]);
    b.part("WINGS", "Front-corner triangles where human players load PIXELS.", [b.zone([[-72, 44], [-44, 72], [-72, 72]], C.red, 0.3), b.tape(-72, 44, -44, 72, C.red), b.zone([[72, 44], [44, 72], [72, 72]], C.blue, 0.3), b.tape(72, 44, 44, 72, C.blue)]);
    const marks = [];
    for (const [x, z] of [[-24, -36], [24, -36], [-24, 36], [24, 36]]) { marks.push(b.tape(x - 12, z, x - 6, z, x < 0 ? C.blue : C.red), b.tape(x + 6, z, x + 12, z, x < 0 ? C.blue : C.red), b.tape(x, z - 12, x, z - 6, x < 0 ? C.blue : C.red)); }
    b.part("SPIKE MARKS", "Three marks per starting position show the randomized target in autonomous.", marks);
    const stacks = [];
    for (const x of [-66, 66]) for (let k = 0; k < 5; k++) stacks.push(b.cyl(1.6, 1.6, 0.5, C.white, x, 1 + k * 0.55, 0, {}, 6));
    b.part("PIXELS", "Hexagonal pieces in white, yellow, green, and purple.", stacks);
    b.part("LANDING ZONES", "Paper drones fly over the truss into zones 1, 2, and 3 beyond the audience wall.", [b.zone([[-72, 76], [72, 76], [72, 98], [-72, 98]], C.tan, 0.28, 0.05), b.zone([[-72, 100], [72, 100], [72, 122], [-72, 122]], C.tan, 0.22, 0.05), b.zone([[-72, 124], [72, 124], [72, 146], [-72, 146]], C.tan, 0.16, 0.05)]);
  },

  /* ===== 2022–23 POWERPLAY ===== */
  2022(b) {
    baseField(b, { redSide: "right" });
    const H_LOW = 13.5, H_MID = 23.5, H_HIGH = 33.5, layout = [["g", "l", "g", "l", "g"], ["l", "m", "h", "m", "l"], ["g", "h", "g", "h", "g"], ["l", "m", "h", "m", "l"], ["g", "l", "g", "l", "g"]];
    const groups = { g: [], l: [], m: [], h: [] };
    layout.forEach((row, r) => row.forEach((t, c) => {
      const x = -48 + c * 24, z = -48 + r * 24;
      if (t === "g") groups.g.push(b.cyl(3, 3.2, 0.9, C.black, x, 1, z));
      else { const h = t === "l" ? H_LOW : t === "m" ? H_MID : H_HIGH; groups[t].push(b.cyl(0.5, 0.5, h, C.yellow, x, h / 2 + 0.6, z, { metalness: 0.4 }), b.cyl(2.5, 2.5, 0.8, C.black, x, 1, z)); }
    }));
    b.part("Ground junctions", "Nine low domes at tile corners. A cone on a ground junction scores 2 points.", groups.g);
    b.part("Low junctions", "Eight poles about 13.5 in. tall. A cone scores 3 points.", groups.l);
    b.part("Medium junctions", "Four poles about 23.5 in. tall. A cone scores 4 points.", groups.m);
    b.part("High junctions", "Four poles about 33.5 in. tall in the middle. A cone scores 5 points.", groups.h);
    const cone = (x, y, z, color) => b.cyl(0.6, 2, 4, color, x, y + 2.6, z);
    const cones = [cone(0, 22.5, -24, C.red), cone(0, 32.5, 24, C.blue), cone(-24, 12, -48, C.blue), cone(24, 12, 48, C.red)];
    for (const [x, z, color] of [[-12, -66, C.blue], [12, -66, C.red], [-12, 66, C.blue], [12, 66, C.red]]) for (let k = 0; k < 5; k++) cones.push(cone(x, k * 1.2, z, color));
    b.part("CONES", "Red and blue cones, staged in stacks of five and supplied by human players.", cones);
    b.part("SIGNALS", "Printed cones that tell robots which zone to park in during autonomous.", [b.cyl(2, 2.6, 6, C.white, -36, 3.6, -36), b.cyl(2, 2.6, 6, C.white, 36, 3.6, -36), b.cyl(2, 2.6, 6, C.white, -36, 3.6, 36), b.cyl(2, 2.6, 6, C.white, 36, 3.6, 36)]);
    b.part("TERMINALS", "Corner triangles. A cone in a terminal scores 1 point.", [b.tape(-72, -49, -49, -72, C.red), b.tape(72, -49, 49, -72, C.blue), b.tape(-72, 49, -49, 72, C.blue), b.tape(72, 49, 49, 72, C.red)]);
    b.part("SUBSTATIONS", "Taped V shapes on each side wall where human players pass in cones.", [b.tape(-72, -11, -60, 0, C.blue), b.tape(-60, 0, -72, 11, C.blue), b.tape(72, -11, 60, 0, C.red), b.tape(60, 0, 72, 11, C.red)]);
  },

  /* ===== 2021–22 FREIGHT FRENZY ===== */
  2021(b) {
    baseField(b, { redSide: "right" });
    const hub = (x, z, color, shared) => {
      const g = new THREE.Group(); g.position.set(x, 0, z);
      g.add(b.cyl(9, 9, 2, shared ? C.dark : color, 0, 1.6, 0));
      g.add(b.cyl(0.8, 0.8, 19, C.steel, 0, 11, 0, { metalness: 0.6 }));
      if (shared) { g.add(b.cyl(7.5, 7.5, 1.2, C.white, 0, 8, 0)); g.rotation.z = 0.08; }
      else { g.add(b.cyl(9, 9, 1, color, 0, 3.5, 0), b.cyl(7, 7, 1, color, 0, 9, 0), b.cyl(5, 5, 1, color, 0, 15, 0)); }
      g.add(b.cyl(1.4, 1.4, 2, C.yellow, 0, 21.5, 0));
      return g;
    };
    b.part("Blue SHIPPING HUB", "Freight scores 2, 4, or 6 points on levels 1, 2, and 3.", [hub(-24, 0, C.blue)]);
    b.part("Red SHIPPING HUB", "Freight scores 2, 4, or 6 points on levels 1, 2, and 3.", [hub(24, 0, C.red)]);
    b.part("SHARED SHIPPING HUB", "A tipping hub inside the warehouse that both alliances score on.", [hub(0, -50, 0, true)]);
    const bars = [b.box(144, 2.5, 3, C.gray, 0, 1.8, -28.5), b.box(3, 2.5, 43, C.gray, -24, 1.8, -50), b.box(3, 2.5, 43, C.gray, 24, 1.8, -50)];
    b.part("BARRIERS", "Low barriers separate the WAREHOUSE from the rest of the field.", bars);
    const freight = [];
    for (const sx of [-1, 1]) for (let i = 0; i < 26; i++) {
      const x = sx * (50 + (i * 5.7) % 18), z = -66 + ((i * 3.3) % 16);
      freight.push(i % 3 ? b.box(2, 2, 2, C.yellow, x, 1.6, z) : b.ball(1.4, C.white, x, 0.6, z));
    }
    b.part("FREIGHT", "Boxes and balls start in the warehouse corners, and ducks wait on the carousels.", freight);
    b.part("WAREHOUSE", "The back area where freight is collected. Parking completely inside scores 10 points in auto.", [b.zone([[-72, -72], [72, -72], [72, -28.5], [-72, -28.5]], C.yellow, 0.06)]);
    const carousel = (x, z) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.add(b.cyl(7.5, 7.5, 2, C.dark, 0, 6, 0), b.cyl(1, 1, 6, C.steel, 0, 3, 0)); g.add(b.ball(1.6, C.yellow, 4, 7, 0)); return g; };
    b.part("CAROUSELS", "Turntables holding ducks. Spinning one off scores 10 points in auto.", [carousel(-66, 66), carousel(66, 66)]);
    b.part("STORAGE UNITS", "Taped squares near the audience wall.", [...b.outline([[-35, 72], [-35, 49], [-12, 49], [-12, 72]], C.blue, 2, false), ...b.outline([[12, 72], [12, 49], [35, 49], [35, 72]], C.red, 2, false)]);
    const barcodes = [];
    for (const x of [-48, 48]) for (const z of [-18, 18]) for (let k = 0; k < 3; k++) barcodes.push(b.box(1.5, 0.2, 1.5, x < 0 ? C.blue : C.red, x - 3 + k * 0, 0.7, z - 8 + k * 8));
    b.part("BARCODES", "Three positions per start where a duck or team shipping element sets the auto target level.", barcodes);
  },

  /* ===== 2020–21 ULTIMATE GOAL ===== */
  2020(b) {
    baseField(b, { redSide: "right" });
    const tower = (x, color) => {
      const g = new THREE.Group(); g.position.set(x, 0, -66);
      g.add(b.box(22, 33, 10, color, 0, 16.5, 0));
      g.add(b.box(16, 6, 4, C.black, 0, 34, 3));
      g.add(b.box(14, 4, 2, C.white, 0, 27, 5.2));
      g.add(b.box(12, 4, 2, C.black, 0, 21, 5.2), b.box(12, 4, 2, C.black, 0, 13, 5.2));
      return g;
    };
    b.part("Blue TOWER GOAL", "Low, middle, and high goals. High goal rings score 12 points in auto and 6 in teleop.", [tower(-36, C.blue)]);
    b.part("Red TOWER GOAL", "Low, middle, and high goals. High goal rings score 12 points in auto and 6 in teleop.", [tower(36, C.red)]);
    const ps = [b.box(48, 1.5, 1.5, C.steel, 0, 24, -66)];
    for (const x of [-18.75, -11.25, -3.75, 3.75, 11.25, 18.75]) ps.push(b.box(1.4, 6, 1.4, x < 0 ? C.blue : C.red, x, 28, -66), b.box(4.5, 3, 0.6, C.white, x, 31, -65));
    b.part("POWER SHOT targets", "Six targets between the towers. Knocking one back scores 15 points.", ps);
    const zones = [];
    for (const [x, z, n] of [[-58, -12, "A"], [-36, -36, "B"], [-58, -60, "C"]]) { const pts = [[x - 11, z - 11], [x + 11, z - 11], [x + 11, z + 11], [x - 11, z + 11]]; zones.push(...b.outline(pts, C.blue), ...b.outline(pts.map(([px, pz]) => [-px, pz]), C.red), b.label(n, x, 0.8, z, { size: 8, color: "#8fb3ff" }), b.label(n, -x, 0.8, z, { size: 8, color: "#ff9a9e" })); }
    b.part("TARGET ZONES", "Zones A, B, and C. The starter stack's ring count picks the wobble goal target in auto.", zones);
    b.part("LAUNCH LINE", "Robots must launch from behind this white line.", [b.tape(-72, -6, 72, -6, C.white, 2)]);
    const rings = [];
    for (const x of [-36, 36]) for (let k = 0; k < 4; k++) { const r = mesh(new THREE.TorusGeometry(2.1, 0.55, 10, 20), b.m(C.orange)); r.rotation.x = Math.PI / 2; r.position.set(x, 1.2 + k * 0.85, 24); rings.push(r); }
    b.part("STARTER STACKS", "Zero, one, or four rings, randomized each match.", rings);
    const wobble = (x, color) => { const g = new THREE.Group(); g.position.set(x, 0, 48); g.add(b.cyl(4, 4, 1.4, color, 0, 1.4, 0), b.cyl(0.8, 0.8, 18, color, 0, 10.5, 0), b.cyl(1.5, 1.5, 2, color, 0, 20, 0)); return g; };
    b.part("WOBBLE GOALS", "Tall goals robots carry. Delivering one to the drop zone scores 20 points.", [wobble(-48, C.blue), wobble(-24, C.blue), wobble(24, C.red), wobble(48, C.red)]);
    b.part("Start lines", "Robots start on these taped lines near the audience wall.", [b.tape(-48, 48, -48, 72, C.blue), b.tape(-24, 48, -24, 72, C.blue), b.tape(24, 48, 24, 72, C.red), b.tape(48, 48, 48, 72, C.red)]);
  },

  /* ===== 2019–20 SKYSTONE ===== */
  2019(b) {
    baseField(b, { redSide: "right" });
    const bridge = [b.box(2, 20, 2, C.dark, -72, 10, 0), b.box(2, 20, 2, C.dark, 72, 10, 0), b.box(2, 20, 2, C.dark, -24, 10, -6), b.box(2, 20, 2, C.dark, 24, 10, -6), b.box(2, 20, 2, C.dark, -24, 10, 6), b.box(2, 20, 2, C.dark, 24, 10, 6)];
    bridge.push(b.box(48, 2, 14, C.black, 0, 20, 0), b.bar([-72, 18, -2], [-24, 18, -2], 0.6, C.blue), b.bar([-72, 18, 2], [-24, 18, 2], 0.6, C.blue), b.bar([24, 18, -2], [72, 18, -2], 0.6, C.red), b.bar([24, 18, 2], [72, 18, 2], 0.6, C.red));
    bridge.push(b.box(46, 0.4, 0.6, C.yellow, 0, 21.2, -3), b.box(46, 0.4, 0.6, C.yellow, 0, 21.2, 3));
    b.part("SKYBRIDGE", "Robots carry stones under the bridge. Each alliance has its own lane, plus a neutral center.", bridge);
    b.part("Building / loading zones", "The back half is the building zone; the front half is the loading zone.", [b.tape(-72, 0, -24, 0, C.blue), b.tape(24, 0, 72, 0, C.red)]);
    const foundation = (x, color) => { const g = new THREE.Group(); g.position.set(x, 0, -50); g.add(b.box(18.5, 2.3, 34.5, color, 0, 1.8, 0)); for (let i = 0; i < 4; i++) for (let j = 0; j < 8; j++) g.add(b.cyl(0.6, 0.6, 0.6, color, -6 + i * 4, 3.2, -14 + j * 4)); return g; };
    b.part("Blue FOUNDATION", "Blue's base for building a skyscraper. Moving it out of the building site at the end scores 15 points.", [foundation(-14, C.blue)]);
    b.part("Red FOUNDATION", "Red's base for building a skyscraper.", [foundation(14, C.red)]);
    b.part("BUILDING SITES", "Corner triangles at the back of the field.", [b.tape(-72, -50, -50, -72, C.blue), b.tape(72, -50, 50, -72, C.red)]);
    const stone = (x, z, sky) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.add(b.box(4, 4, 8, C.yellow, 0, 2.6, 0)); if (sky) g.add(b.box(4.1, 2.5, 8.1, C.black, 0, 2, 0)); return g; };
    const quarry = [];
    for (const x of [-22, 22]) for (let k = 0; k < 6; k++) quarry.push(stone(x, 27 + k * 8.1, k === 1 || k === 4));
    b.part("QUARRY", "Two lines of six STONES. Each line hides two SKYSTONES with a black face.", quarry);
    b.part("DEPOTS", "L-shaped taped depots in the front corners.", [...b.outline([[-72, 49], [-49, 49], [-49, 72]], C.red, 2, false), ...b.outline([[72, 49], [49, 49], [49, 72]], C.blue, 2, false)]);
    const supply = [];
    for (const x of [-84, 84]) for (let k = 0; k < 8; k++) supply.push(b.box(4, 4, 8, C.yellow, x, 2.6 + Math.floor(k / 2) * 4.1, 66 + (k % 2) * 8.2 - 8));
    b.part("Stone supply", "Extra stones beside each alliance area for the human players.", supply);
  },

  /* ===== 2018–19 ROVER RUCKUS ===== */
  2018(b) {
    baseField(b, { redSide: "right" });
    const lander = [];
    for (const [x, z] of [[-11, -11], [11, -11], [-11, 11], [11, 11]]) lander.push(b.bar([x * 1.7, 0.6, z * 1.7], [x, 14, z], 0.7, C.steel, { metalness: 0.6 }));
    lander.push(b.box(23, 8, 23, C.gray, 0, 18, 0, { metalness: 0.4 }));
    lander.push(b.box(10, 6, 21, C.yellow, -5.5, 25, 0), b.box(10, 6, 21, C.white, 5.5, 25, 0));
    lander.push(b.box(3, 3, 3, C.dark, 0, 22, -12.5), b.box(3, 3, 3, C.dark, 0, 22, 12.5));
    const landerG = b.part("LANDER", "Robots start hanging from the lander. Gold goes in the gold cargo hold and silver in the silver hold (5 points each).", lander);
    landerG.rotation.y = Math.PI / 4;
    b.part("Landing zones", "Diamond-shaped taped zones around the lander.", [...b.outline([[0, -36], [36, 0], [0, 36]], C.red, 3, false), ...b.outline([[0, -36], [-36, 0], [0, 36]], C.blue, 3, false)]);
    const crater = (cx, cz, rot) => {
      const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = rot;
      const rim = mesh(new THREE.TorusGeometry(36, 2.6, 10, 40, Math.PI / 2), b.m(C.dark)); rim.rotation.x = Math.PI / 2; rim.position.y = 2; g.add(rim);
      for (let i = 0; i < 48; i++) { const a = (i * 0.61) % (Math.PI / 2), r = 8 + (i * 7.3) % 25; const x = Math.cos(a) * r, z = Math.sin(a) * r; g.add(i % 3 ? b.box(2, 2, 2, C.yellow, x, 1.6, z) : b.ball(1.4, C.white, x, 0.6, z)); }
      return g;
    };
    b.part("CRATERS", "Two craters full of gold cubes and silver balls. Parking completely inside scores 25 points at the end.", [crater(-72, -72, 0), crater(72, 72, Math.PI)]);
    b.part("DEPOTS", "Corner squares where robots drop their team marker in autonomous (15 points).", [...b.outline([[-72, 49], [-49, 49], [-49, 72], [-72, 72]], C.blue, 3), ...b.outline([[72, -49], [49, -49], [49, -72], [72, -72]], C.red, 3)]);
    const sample = [];
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (let k = 0; k < 3; k++) { const x = sx * (28 + k * 9.5), z = sz * (46 - k * 9.5); sample.push(k === 1 ? b.box(2, 2, 2, C.yellow, x, 1.6, z) : b.ball(1.4, C.white, x, 0.6, z)); }
    b.part("SAMPLE FIELDS", "Three minerals per position; robots must find and move the single gold one (25 points).", sample);
  },

  /* ===== 2017–18 RELIC RECOVERY ===== */
  2017(b) {
    baseField(b, { redSide: "left" });
    const stone = (x, z, color) => b.box(24, 2, 24, color, x, 1.6, z, { roughness: 0.5 });
    b.part("BALANCING STONES", "Robots start here and balance on them at the end for 20 points.", [stone(-48, -48, C.red), stone(-48, 24, C.red), stone(48, -48, C.blue), stone(48, 24, C.blue)]);
    const crypto = (x, z, rot, color) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
      for (let c = 0; c < 5; c++) g.add(b.box(1.2, 22, 3, color, -12 + c * 6, 11.6, -2));
      g.add(b.box(25, 2, 6, C.white, 0, 1.6, 0));
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) if ((r + c) % 3 !== 2) g.add(b.box(5.6, 5.6, 5.6, (r + c) % 2 ? C.wood : C.gray, -9 + c * 6, 3.2 + r * 6, 1));
      return g;
    };
    b.part("CRYPTOBOXES", "Four-column boxes on the walls. Completed rows, columns, and ciphers earn bonuses.", [crypto(-66, -12, Math.PI / 2, C.red), crypto(-36, 66, 0, C.red), crypto(66, -12, -Math.PI / 2, C.blue), crypto(36, 66, 0, C.blue)]);
    const glyphs = [];
    for (let i = 0; i < 24; i++) { const g = b.box(6, 6, 6, i % 2 ? C.wood : C.gray, -9 + (i % 4) * 6, 3.6, -30 + Math.floor(i / 4) * 10); g.rotation.y = (i % 5) * 0.3; glyphs.push(g); }
    b.part("GLYPH PIT", "The center pit holds the glyphs (brown and gray six-inch cubes).", [...b.outline([[-24, -46], [0, -60], [24, -46], [24, 26], [0, 40], [-24, 26]], C.red, 2), ...glyphs]);
    const relic = (x, z, color) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.add(b.cyl(2, 2.5, 2, color, 0, 1.6, 0), b.cyl(1.2, 1.5, 6, C.yellow, 0, 5.6, 0), b.ball(1.8, C.yellow, 0, 8, 0)); return g; };
    b.part("RELICS", "Robots carry relics over the wall into zones 1, 2, or 3 for up to 40 points, plus 15 if upright.", [relic(-66, -66, C.red), relic(66, -66, C.blue), relic(-66, 66, C.red), relic(66, 66, C.blue)]);
    b.part("RELIC RECOVERY ZONES", "Three zones outside the back wall where relics are scored.", [b.zone([[-48, -76], [-14, -76], [-14, -124], [-48, -124]], C.red, 0.2, 0.05), b.zone([[14, -76], [48, -76], [48, -124], [14, -124]], C.blue, 0.2, 0.05)]);
    const jewels = [];
    for (const [x, z] of [[-66, -40], [-66, 30], [66, -40], [66, 30]]) jewels.push(b.box(6, 3, 3, C.dark, x, 2, z), b.ball(1.9, C.red, x - 2, 3.4, z), b.ball(1.9, C.blue, x + 2, 3.4, z));
    b.part("JEWELS", "In autonomous, robots knock the opponent's jewel off the platform for 30 points.", jewels);
  },
};

export const AVAILABLE_SEASONS = Object.keys(SEASONS).map(Number).sort((a, b) => b - a);

/* ---------------- Viewer ---------------- */
export async function mountField(container, year) {
  const build = SEASONS[year];
  if (!build) throw new Error(`No field model for ${year}`);
  const canvasHost = container.querySelector(".field3d-canvas");
  const tip = container.querySelector(".field3d-tip");
  const legend = container.querySelector(".field3d-legend");

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" }); }
  catch { throw new Error("WebGL unavailable"); }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  canvasHost.innerHTML = ""; canvasHost.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f14);
  scene.fog = new THREE.Fog(0x0b0f14, 360, 620);
  const camera = new THREE.PerspectiveCamera(40, 1, 1, 2000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.minDistance = 90; controls.maxDistance = 420;
  controls.maxPolarAngle = Math.PI * 0.47; controls.target.set(0, 8, 0); controls.autoRotate = !matchMedia("(prefers-reduced-motion: reduce)").matches; controls.autoRotateSpeed = 0.5;

  scene.add(new THREE.HemisphereLight(0xe8f0ff, 0x2a3038, 1.25));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1); sun.position.set(-90, 200, 120); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 10, far: 500 }); sun.shadow.bias = -0.0004;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x9cc8ff, 0.35); fill.position.set(120, 80, -140); scene.add(fill);

  const b = new Builder(scene);
  build(b);

  const views = { angle: [0, 138, 188], top: [0, 290, 0.01], side: [-240, 64, 0] };
  const setView = (v) => { camera.position.set(...views[v]); controls.target.set(0, 8, 0); controls.update(); };
  setView("angle");

  // Legend: every named part, clickable to highlight
  legend.innerHTML = b.parts.filter((p) => !/perimeter|Foam tiles/.test(p.userData.name)).map((p, i) => `<li><button type="button" data-part="${b.parts.indexOf(p)}">${p.userData.name}</button></li>`).join("");
  let flash = null;
  const highlight = (g) => {
    if (flash) flash.restore();
    const touched = [];
    g.traverse((o) => { if (o.isMesh && o.material && "emissive" in o.material) { const m = o.material.clone(); m.emissive = new THREE.Color(0x3ba8ff); m.emissiveIntensity = 0.55; touched.push([o, o.material]); o.material = m; } });
    flash = { restore: () => touched.forEach(([o, m]) => { o.material.dispose(); o.material = m; }) };
    clearTimeout(highlight.t); highlight.t = setTimeout(() => { flash?.restore(); flash = null; }, 2200);
  };
  legend.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-part]"); if (!btn) return;
    const g = b.parts[+btn.dataset.part]; highlight(g); controls.autoRotate = false;
    tip.innerHTML = `<b>${g.userData.name}</b><span>${g.userData.detail}</span>`; tip.hidden = false; tip.style.left = "16px"; tip.style.top = "16px";
  });

  // Hover tooltips via raycasting
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2(); let hovering = null;
  const onMove = (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(b.parts, true).find((h) => h.object.visible);
    let g = hit?.object; while (g && !g.userData?.name) g = g.parent;
    if (g && !/Foam tiles|perimeter/.test(g.userData.name)) {
      hovering = g; tip.hidden = false; tip.innerHTML = `<b>${g.userData.name}</b><span>${g.userData.detail}</span>`;
      tip.style.left = `${Math.min(r.width - 270, e.clientX - r.left + 14)}px`; tip.style.top = `${Math.max(8, e.clientY - r.top - 10)}px`;
      renderer.domElement.style.cursor = "help";
    } else if (hovering) { hovering = null; tip.hidden = true; renderer.domElement.style.cursor = ""; }
  };
  renderer.domElement.addEventListener("pointermove", onMove);
  renderer.domElement.addEventListener("pointerleave", () => { tip.hidden = true; hovering = null; });
  renderer.domElement.addEventListener("pointerdown", () => { controls.autoRotate = false; });

  // Size + render loop (only while visible)
  const resize = () => { const w = canvasHost.clientWidth, h = canvasHost.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const ro = new ResizeObserver(resize); ro.observe(canvasHost); resize();
  let visible = true, raf = 0;
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) loop(); });
  io.observe(canvasHost);
  function loop() { cancelAnimationFrame(raf); if (!visible || document.hidden) return; controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(loop); }
  const onVis = () => { if (!document.hidden) loop(); };
  document.addEventListener("visibilitychange", onVis);
  loop();

  return {
    setView, toggleSpin() { controls.autoRotate = !controls.autoRotate; return controls.autoRotate; },
    dispose() {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener("visibilitychange", onVis); controls.dispose();
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach((m) => { m.map?.dispose(); m.dispose(); }); });
      renderer.dispose(); renderer.domElement.remove();
    },
  };
}
