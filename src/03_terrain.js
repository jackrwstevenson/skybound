// ───────────────────────── terrain & world layout ─────────────────────────
const WORLD = { half: 520, res: 260 }; // grid res cells, cell = 4 units
WORLD.cell = (WORLD.half * 2) / WORLD.res;

const P = {
  village: { x: 0, z: 0 },
  home: { x: -26, z: 18 },
  nursery: { x: -32, z: -30 },
  plaza: { x: 0, z: 4 },
  lodge: { x: -10, z: -200 },
  cave: { x: -128, z: -262 },
  summit: { x: -92, z: -334 },
  nest: { x: 250, z: -170 },
  beach: { x: 60, z: 238 },
  wreck: { x: 18, z: 276 },
  cove: { x: 178, z: 262 },
  lagoon: { x: -232, z: 238 },
  ship: { x: -372, z: 418 },
  camp: { x: -178, z: 178 },
  gull: { x: -300, z: 352 },
  lookout: { x: -72, z: 72 },
};
const NEST_GATE_ANG = Math.atan2(P.village.z - P.nest.z, P.village.x - P.nest.x); // toward village
const LAGOON_INLET_ANG = Math.atan2(P.ship.z - P.lagoon.z, P.ship.x - P.lagoon.x);

const RIVER = catmull([[-22, -150], [-4, -100], [30, -62], [50, -16], [52, 36], [44, 100], [60, 170], [78, 225], [90, 300]], 10);
const PATHS = [
  catmull([[0, 4], [10, 60], [30, 130], [52, 200], [56, 236]], 10), // to beach
  catmull([[0, 4], [-50, 60], [-110, 120], [-150, 165], [-168, 182]], 10), // to lagoon
  catmull([[0, 4], [60, -30], [120, -80], [170, -118], [200, -136]], 10), // to nest gate
  catmull([[0, 4], [-14, -40], [-28, -90], [-30, -130]], 10), // north to foothills
  catmull([[-26, 18], [-10, 10], [0, 4], [-16, -14], [-32, -30]], 8), // home-plaza-nursery
];

function angDiff(a, b) { return Math.abs(wrapAngle(a - b)); }

function rawHeight(x, z) {
  const b = (cx, cz, r) => 1 - Math.hypot(x - cx, z - cz) / r;
  let m = Math.max(b(10, 10, 300), b(-60, -270, 220), b(250, -170, 160), b(60, 220, 150), b(-215, 205, 155), b(170, 230, 90));
  m += (fbm(x * 0.009 + 7, z * 0.009 - 3, 4) - 0.5) * 0.32;
  let h = lerp(-22, 3.2, smoothstep(-0.04, 0.16, m));
  const land = smoothstep(0.08, 0.3, m);
  h += land * (fbm(x * 0.02, z * 0.02, 4) - 0.45) * 8;
  h += land * Math.max(0, fbm(x * 0.007 + 11, z * 0.007 + 5, 3) - 0.48) * 60;

  // mountains
  const dm = Math.hypot((x + 60) * 0.9, z + 285);
  const mm = smoothstep(200, 80, dm) * smoothstep(-110, -175, z);
  if (mm > 0) {
    h += mm * (22 + ridged(x * 0.011 + 3, z * 0.011 - 2, 4) * 92);
    h += 68 * gauss(x, z, P.summit.x, P.summit.z, 30) * mm;
  }
  // mountain lodge plateau
  const dLo = Math.hypot(x - P.lodge.x, z - P.lodge.z);
  if (dLo < 34) h = lerp(h, 34 + (fbm(x * 0.1, z * 0.1, 2) - 0.5) * 1.2, smoothstep(34, 18, dLo));
  // ice cave ledge
  const dCa = Math.hypot(x - P.cave.x, z - P.cave.z);
  if (dCa < 26) h = lerp(h, 44, smoothstep(26, 12, dCa));

  // volcano / dragon's nest
  const dn = Math.hypot(x - P.nest.x, z - P.nest.z);
  if (dn < 170) {
    const ang = Math.atan2(z - P.nest.z, x - P.nest.x);
    const gate = Math.exp(-Math.pow(angDiff(ang, NEST_GATE_ANG) / 0.16, 2));
    const rim = 70 - 32 * gate + (fbm(ang * 3 + 5, 1.3, 2) - 0.5) * 10 * (1 - gate);
    let vol;
    if (dn < 46) vol = lerp(31, rim, Math.pow(smoothstep(30, 47, dn), 1.4));
    else vol = rim * Math.pow(1 - smoothstep(47, 160, dn), 1.5) + 3 * (1 - smoothstep(47, 160, dn));
    if (dn < 46) {
      vol -= 7 * smoothstep(21, 11, dn); // central lava pit
      vol += (fbm(x * 0.08, z * 0.08, 2) - 0.5) * 2;
    }
    const w = smoothstep(170, 130, dn);
    h = dn < 60 ? vol : lerp(h, Math.max(h, vol), w);
  }

  // village plateau
  const dv = Math.hypot(x - P.village.x, z - P.village.z);
  if (dv < 100) h = lerp(h, 5 + (fbm(x * 0.05, z * 0.05, 2) - 0.5) * 1.4, smoothstep(100, 64, dv));

  // lookout hill (glide training)
  h += 15 * gauss(x, z, P.lookout.x, P.lookout.z, 13);
  const dlk = Math.hypot(x - P.lookout.x, z - P.lookout.z);
  if (dlk < 7) h = lerp(h, 5 + 15 * gauss(P.lookout.x, P.lookout.z, P.lookout.x, P.lookout.z, 13) - 0.6, smoothstep(7, 3, dlk));
  // beach
  const db = Math.hypot((x - 60) * 0.75, z - 262);
  if (db < 140) {
    const target = lerp(3.4, -5, smoothstep(212, 305, z)) + (fbm(x * 0.03, z * 0.03, 2) - 0.5) * 0.8;
    h = lerp(h, target, smoothstep(140, 85, db));
    // tide pools
    for (const tp of TIDEPOOLS) { const g = gauss(x, z, tp.x, tp.z, tp.r * 0.55); h -= g * 2.4; }
  }
  // hidden cove — ring of cliffs open to the south
  const dc = Math.hypot(x - P.cove.x, z - P.cove.z);
  if (dc < 60) {
    const a = Math.atan2(z - P.cove.z, x - P.cove.x);
    const open = Math.exp(-Math.pow(angDiff(a, Math.PI / 2) / 0.45, 2));
    const cliff = Math.exp(-Math.pow((dc - 31) / 6, 2)) * 24 * (1 - open);
    const inner = 1.6 - 3.2 * smoothstep(6, 28, dc) * open;
    h = lerp(inner, h, smoothstep(22, 34, dc)) + cliff;
  }

  // lagoon
  const dl = Math.hypot(x - P.lagoon.x, z - P.lagoon.z);
  if (dl < 110) {
    const ang = Math.atan2(z - P.lagoon.z, x - P.lagoon.x);
    const inner = -22 + 15 * smoothstep(6, 56, dl) + (fbm(x * 0.05, z * 0.05, 3) - 0.5) * 3;
    const rimH = 12 + (fbm(ang * 4 + 2, 3.7, 3) - 0.5) * 9;
    let lh;
    if (dl < 56) lh = inner;
    else if (dl < 66) lh = lerp(-7, rimH, smoothstep(56, 66, dl));
    else lh = lerp(rimH, h, smoothstep(66, 108, dl));
    const inlet = Math.exp(-Math.pow(angDiff(ang, LAGOON_INLET_ANG) / 0.17, 2));
    if (dl > 40) lh = lerp(lh, Math.min(lh, lerp(-7, -16, smoothstep(50, 110, dl))), inlet);
    h = lh;
  }

  // river
  const dr = distToPolyline(x, z, RIVER);
  if (dr < 11) h = lerp(Math.min(h, -2.4), h, smoothstep(3.6, 10.5, dr));

  // paths: very slight flattening
  // deep ocean toward ship
  const ds = Math.hypot(x - P.ship.x, z - P.ship.z);
  if (ds < 120) h = Math.min(h, lerp(-26, h, smoothstep(60, 120, ds)));
  // Gull Rock islet (safe spot near the ship)
  const dg = Math.hypot(x - P.gull.x, z - P.gull.z);
  if (dg < 18) h = Math.max(h, lerp(3.4 + (fbm(x * 0.2, z * 0.2, 2) - 0.5), -12, smoothstep(7, 18, dg)));
  // world edge falls to deep sea
  const de = Math.max(Math.abs(x), Math.abs(z));
  h = lerp(h, -30, smoothstep(440, 515, de));
  return h;
}
const TIDEPOOLS = [{ x: -14, z: 246, r: 6 }, { x: 8, z: 252, r: 5 }, { x: 96, z: 250, r: 7 }, { x: 124, z: 246, r: 5 }, { x: -38, z: 250, r: 5 }];

function inPathRaw(x, z) { let d = 1e9; for (const p of PATHS) d = Math.min(d, distToPolyline(x, z, p)); return d; }
const _pathGrid = { n: 0, c: 2, a: null };
function inPath(x, z) {
  // cached on a 2-unit grid, bilinear; far-away cells store a large value
  const G2 = _pathGrid;
  if (!G2.a) { G2.n = Math.ceil((WORLD.half * 2) / G2.c) + 1; G2.a = new Float32Array(G2.n * G2.n).fill(-1); }
  const fx = (x + WORLD.half) / G2.c, fz = (z + WORLD.half) / G2.c; const i = Math.floor(fx), j = Math.floor(fz);
  if (i < 0 || j < 0 || i >= G2.n - 1 || j >= G2.n - 1) return 1e9;
  const get = (ii, jj) => { const k = jj * G2.n + ii; let v = G2.a[k]; if (v < 0) { v = Math.min(60, inPathRaw(-WORLD.half + ii * G2.c, -WORLD.half + jj * G2.c)); G2.a[k] = v; } return v; };
  const u = fx - i, v = fz - j;
  return lerp(lerp(get(i, j), get(i + 1, j), u), lerp(get(i, j + 1), get(i + 1, j + 1), u), v);
}

// ───── baked grid ─────
const Terrain = {
  N: WORLD.res + 1, heights: null, colors: null, regionGrid: null,
  bake() {
    const N = this.N; this.heights = new Float32Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = -WORLD.half + i * WORLD.cell, z = -WORLD.half + j * WORLD.cell;
      this.heights[j * N + i] = rawHeight(x, z);
    }
  },
  hAt(i, j) { const N = this.N; i = clamp(i, 0, N - 1); j = clamp(j, 0, N - 1); return this.heights[j * N + i]; },
  // exact triangle interpolation matching mesh triangulation (a=(i,j) b=(i+1,j) c=(i,j+1) d=(i+1,j+1); tris a,c,b & c,d,b)
  getH(x, z) {
    const fx = (x + WORLD.half) / WORLD.cell, fz = (z + WORLD.half) / WORLD.cell;
    const i = Math.floor(fx), j = Math.floor(fz);
    if (i < 0 || j < 0 || i >= this.N - 1 || j >= this.N - 1) return -30;
    const u = fx - i, v = fz - j;
    const a = this.hAt(i, j), b = this.hAt(i + 1, j), c = this.hAt(i, j + 1), d = this.hAt(i + 1, j + 1);
    if (u + v <= 1) return a + (b - a) * u + (c - a) * v;
    return d + (c - d) * (1 - u) + (b - d) * (1 - v);
  },
  normalSlope(x, z) {
    const e = 1.5; const hx = this.getH(x + e, z) - this.getH(x - e, z); const hz = this.getH(x, z + e) - this.getH(x, z - e);
    return Math.hypot(hx, hz) / (2 * e);
  },
};

function regionAt(x, z, y = 0) {
  const ds = Math.hypot(x - P.ship.x, z - P.ship.z); if (ds < 75) return 'ship';
  const dl = Math.hypot(x - P.lagoon.x, z - P.lagoon.z); if (dl < 78) return 'lagoon';
  const dn = Math.hypot(x - P.nest.x, z - P.nest.z); if (dn < 115) return 'nest';
  if (z < -150 || Math.hypot(x + 60, z + 285) < 150) return 'frost';
  if (z > 196 && x > -120) return 'beach';
  const dv = Math.hypot(x, z); if (dv < 105) return 'village';
  if (Math.max(Math.abs(x), Math.abs(z)) > 380 || Terrain.getH(x, z) < -12) return 'sea';
  return 'wilds';
}
const REGION_INFO = {
  village: { name: 'Hearthvale Village', sub: 'Home, where every story starts', fog: 0xcfe3e8, music: 'village' },
  frost: { name: 'Frostpeak Mountains', sub: 'Where wings learn the wind', fog: 0xdbe6f2, music: 'frost' },
  nest: { name: "The Dragon's Nest", sub: 'Ancient fire, older than the village', fog: 0x8a6a62, music: 'nest' },
  beach: { name: 'Sunspill Beach', sub: 'Golden sand and secrets in the tide', fog: 0xe9e2c8, music: 'beach' },
  lagoon: { name: 'The Mermaid Lagoon', sub: 'Sheltered waters, singing deep', fog: 0xa9dcd6, music: 'lagoon' },
  ship: { name: 'The Blackwake', sub: 'Pirate galleon at anchor', fog: 0x9aa7b4, music: 'ship' },
  sea: { name: 'The Open Sea', sub: '', fog: 0xbcd5e0, music: 'sea' },
  wilds: { name: 'Hearthvale Meadows', sub: '', fog: 0xd3e5e0, music: 'village' },
};

function terrainColor(x, z, h, slope) {
  const reg = regionAt(x, z);
  const n = fbm(x * 0.06, z * 0.06, 2);
  const grass = mixC(hexLin(0x6fae4f), hexLin(0x9bc95a), n);
  const meadow = mixC(hexLin(0x7fb85a), hexLin(0xb7cf62), fbm(x * 0.02 + 4, z * 0.02, 2));
  const sand = mixC(hexLin(0xf0d79c), hexLin(0xe6c584), n);
  const wetSand = hexLin(0xc9ad78);
  const seabed = mixC(hexLin(0xd9c79a), hexLin(0x7fae9e), smoothstep(-1, -12, h));
  const rock = mixC(hexLin(0x8b8f9c), hexLin(0x6d7280), n);
  const snow = mixC(hexLin(0xf3f7fb), hexLin(0xdfe8f3), n);
  const basalt = mixC(hexLin(0x3e3438), hexLin(0x5b4a49), n);
  const ash = hexLin(0x7a6560);
  const dirt = mixC(hexLin(0xc4a173), hexLin(0xb08d62), n);
  let c;
  if (h < -0.6) c = seabed;
  else if (h < 1.3) c = h < 0.3 ? wetSand : sand;
  else c = reg === 'village' ? grass : meadow;
  if (reg === 'beach' && h < 3.5 && h > -0.6) c = mixC(sand, meadow, smoothstep(2.6, 4.2, h));
  if (reg === 'frost' || z < -140) {
    const t = smoothstep(16, 50, h);
    c = mixC(c, mixC(hexLin(0x6f9a68), rock, smoothstep(0.5, 1.1, slope)), t);
    c = mixC(c, snow, smoothstep(58, 80, h) * (1 - smoothstep(1.2, 1.8, slope) * 0.6));
  }
  const dn = Math.hypot(x - P.nest.x, z - P.nest.z);
  if (dn < 150) { const t = smoothstep(150, 70, dn); c = mixC(c, dn < 50 ? mixC(basalt, ash, smoothstep(20, 42, dn)) : mixC(ash, basalt, n), t); }
  const dl = Math.hypot(x - P.lagoon.x, z - P.lagoon.z);
  if (dl < 100 && h > -0.6) c = mixC(c, mixC(hexLin(0x6f8f76), hexLin(0x9aa48a), n), smoothstep(100, 70, dl) * smoothstep(3, 8, h));
  if (dl < 60 && h < -0.6) c = mixC(hexLin(0xf2dcb6), hexLin(0xd9b9a0), n);
  if (slope > 0.9 && h > 1.5 && dn > 60) c = mixC(c, reg === 'frost' && h > 50 ? mixC(rock, snow, 0.4) : rock, smoothstep(0.9, 1.5, slope));
  if (h > 1.0 && h < 30 && inPath(x, z) < 2.6) c = mixC(c, dirt, 0.85);
  if (Math.hypot(x - P.plaza.x, z - P.plaza.z) < 12) c = mixC(hexLin(0xbfae94), hexLin(0xa89a86), hash2(Math.floor(x / 2), Math.floor(z / 2)));
  return c;
}

// ───── colliders & platforms (spatial hash) ─────
const Colliders = {
  cell: 24, map: new Map(), circles: [], boxes: [],
  key(i, j) { return i * 10007 + j; },
  insert(obj, minx, minz, maxx, maxz) {
    const c = this.cell;
    for (let i = Math.floor(minx / c); i <= Math.floor(maxx / c); i++) for (let j = Math.floor(minz / c); j <= Math.floor(maxz / c); j++) {
      const k = this.key(i, j); if (!this.map.has(k)) this.map.set(k, []); this.map.get(k).push(obj);
    }
  },
  // solid cylinder obstacle: y range [bottom, top]
  addCircle(x, z, r, top = 999, bottom = -999, tag) { const o = { t: 'c', x, z, r, top, bottom, tag }; this.circles.push(o); this.insert(o, x - r, z - r, x + r, z + r); return o; },
  // oriented box: center, half-sizes, rot (yaw), top height. slope: top varies from top0 (local -z) to top1 (+z). solid: blocks if above step
  addBox(cx, cz, hw, hd, rot, top, opt = {}) {
    const o = { t: 'b', cx, cz, hw, hd, rot, top0: opt.top0 ?? top, top1: opt.top1 ?? top, bottom: opt.bottom ?? -999, walk: opt.walk !== false, solid: opt.solid !== false, tag: opt.tag, cos: Math.cos(rot), sin: Math.sin(rot), enabled: true };
    const r = Math.hypot(hw, hd); this.boxes.push(o); this.insert(o, cx - r, cz - r, cx + r, cz + r); return o;
  },
  near(x, z) { const c = this.cell; return this.map.get(this.key(Math.floor(x / c), Math.floor(z / c))) || []; },
  local(o, x, z) { const dx = x - o.cx, dz = z - o.cz; return { lx: dx * o.cos - dz * o.sin, lz: dx * o.sin + dz * o.cos }; },
  boxTop(o, lz) { return o.top0 === o.top1 ? o.top0 : lerp(o.top0, o.top1, clamp((lz + o.hd) / (2 * o.hd), 0, 1)); },
  // ground height including walkable platforms at or below y+step
  ground(x, z, y = 999, step = 1.2) {
    let g = Terrain.getH(x, z);
    for (const o of this.near(x, z)) {
      if (o.t !== 'b' || !o.walk || !o.enabled) continue;
      const { lx, lz } = this.local(o, x, z);
      if (Math.abs(lx) <= o.hw && Math.abs(lz) <= o.hd) { const t = this.boxTop(o, lz); if (t <= y + step && t > g) g = t; }
    }
    return g;
  },
  // push a circle (radius rad) at height y out of obstacles. returns adjusted {x,z}
  resolve(p, rad, y, step = 1.2, height = 1.6) {
    for (let iter = 0; iter < 2; iter++) {
      for (const o of this.near(p.x, p.z)) {
        if (o.t === 'c') {
          if (o.enabled === false) continue;
          if (y > o.top - 0.05 || y + height < o.bottom) continue;
          const dx = p.x - o.x, dz = p.z - o.z; const d = Math.hypot(dx, dz); const m = o.r + rad;
          if (d < m && d > 1e-4) { p.x = o.x + (dx / d) * m; p.z = o.z + (dz / d) * m; }
        } else {
          if (!o.solid || !o.enabled) continue;
          const { lx, lz } = this.local(o, p.x, p.z);
          const top = this.boxTop(o, lz);
          if (o.walk && top <= y + step) continue;
          if (y + height < o.bottom || y > top - 0.05) continue;
          const ex = o.hw + rad - Math.abs(lx), ez = o.hd + rad - Math.abs(lz);
          if (ex > 0 && ez > 0) {
            let nlx = lx, nlz = lz;
            if (ex < ez) nlx = Math.sign(lx || 1) * (o.hw + rad); else nlz = Math.sign(lz || 1) * (o.hd + rad);
            // back to world
            p.x = o.cx + nlx * o.cos + nlz * o.sin; p.z = o.cz - nlx * o.sin + nlz * o.cos;
          }
        }
      }
    }
    return p;
  },
};
