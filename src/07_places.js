// ───────────────────────── places: village, regions, ship ─────────────────────────
const Interact = []; // {id, x,y,z, r, label, cond(), act(), icon}
const POI = []; // things the companion looks at / sniffs {x,y,z, kind, ref}
const Landmarks = []; // {id, name, x, z, r, found}
const Chests = []; // {id, x,y,z, mesh, lid, opened, loot}
const Emitters = []; // {x,y,z, kind, rate, acc}
const Updrafts = []; // {x,z,r,top,strength}
const Spots = {}; // named world points created during build
function addInteract(o) { o.y = o.y ?? gy(o.x, o.z); o.r = o.r || 2.6; Interact.push(o); return o; }
function addLandmark(id, name, x, z, r = 14) { Landmarks.push({ id, name, x, z, r, found: false }); }

const ROOF = [0xc8553d, 0x3d6f8f, 0x6f8f3d, 0xb8743a, 0x8a4f7d, 0x5a6a8a];
const WALL = [0xf3ead8, 0xefe2c8, 0xf6efe2, 0xe9dcc2];
function housePartsLocal(w, d, h, roofC, wallC, opt = {}) {
  const P2 = [], G = [];
  const tim = opt.timber || 0x5a3f2c;
  P2.push(part(box(w + 0.4, 0.6, d + 0.4), 0x9a8f80, { y: 0.3, jit: 0.05 })); // stone base
  P2.push(part(box(w, h, d), wallC, { y: h / 2 + 0.3 }));
  // timber frame
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P2.push(part(box(0.3, h, 0.3), tim, { x: sx * w / 2, y: h / 2 + 0.3, z: sz * d / 2 }));
  P2.push(part(box(w + 0.1, 0.25, d + 0.1), tim, { y: h * 0.55 + 0.3 }));
  P2.push(part(box(w + 0.1, 0.25, d + 0.1), tim, { y: h + 0.2 }));
  for (const sz of [-1, 1]) { P2.push(part(box(0.18, h * 0.62, 0.12), tim, { x: -w * 0.25, y: h * 0.3 + 0.3, z: sz * (d / 2 + 0.03), rz: 0.6 })); P2.push(part(box(0.18, h * 0.62, 0.12), tim, { x: w * 0.25, y: h * 0.3 + 0.3, z: sz * (d / 2 + 0.03), rz: -0.6 })); }
  // roof
  const k = opt.pitch || 0.62;
  const r = (w / 2 + 0.7) / 0.866;
  P2.push(part(cyl(r, r, d + 1.0, 3), roofC, { rx: -Math.PI / 2, sz: k, y: h + 0.3 + 0.5 * r * k, jit: 0.06 }));
  P2.push(part(box(0.35, 0.35, d + 1.1), 0x5a3f2c, { y: h + 0.3 + 1.5 * r * k - 0.05 }));
  // chimney
  if (opt.chimney !== false) P2.push(part(box(0.9, 2.4, 0.9), 0x8a7f74, { x: w * 0.25, y: h + 0.3 + r * k * 0.9, z: -d * 0.25, jit: 0.1 }));
  // door (front = +x face)
  P2.push(part(box(0.2, 2.0, 1.2), 0x7a4f2e, { x: w / 2 + 0.06, y: 1.3, z: 0 }));
  P2.push(part(box(0.25, 0.2, 1.5), tim, { x: w / 2 + 0.1, y: 2.35, z: 0 }));
  // windows glowing
  for (const sz of [-1, 1]) {
    G.push(part(box(0.12, 0.8, 0.8), 0xffd98a, { x: w / 2 + 0.03, y: h * 0.75, z: sz * d * 0.3 }));
    G.push(part(box(0.8, 0.8, 0.12), 0xffd98a, { x: sz * w * 0.22, y: h * 0.5, z: d / 2 + 0.03 }));
    G.push(part(box(0.8, 0.8, 0.12), 0xffd98a, { x: sz * w * 0.22, y: h * 0.5, z: -d / 2 - 0.03 }));
  }
  // flower boxes
  for (const sz of [-1, 1]) P2.push(part(box(0.35, 0.25, 1.0), 0x7a4f2e, { x: w / 2 + 0.2, y: h * 0.75 - 0.5, z: sz * d * 0.3 }), part(ico(0.35, 0), pick([0xf2779a, 0xf7c548, 0xb985f0]), { x: w / 2 + 0.25, y: h * 0.75 - 0.3, z: sz * d * 0.3, sz: 1.4, jit: 0.3 }));
  return { P2, G, r, k, roofTop: h + 0.3 + 1.5 * r * k, rise: 1.5 * r * k };
}
function buildHouse(x, z, ry, w = 7, d = 6, h = 3.4, opt = {}) {
  const y = gy(x, z) - 0.15;
  const roofC = opt.roof ?? pick(ROOF), wallC = opt.wall ?? pick(WALL);
  const { P2, G, roofTop, rise } = housePartsLocal(w, d, h, roofC, wallC, opt);
  Batch.add(place(P2, x, y, z, ry)); Batch.add(place(G, x, y, z, ry), true);
  Colliders.addBox(x, z, w / 2 + 0.2, d / 2 + 0.2, ry, y + h + 0.3 + rise * 0.45, { walk: true, solid: true, tag: 'house' });
  // ridge as walkable landing for rooftops (approximation)
  Colliders.addBox(x, z, w * 0.18, d / 2, ry, y + roofTop - 0.6, { walk: true, solid: false });
  Emitters.push({ x: x + Math.cos(-ry) * w * 0.25 - Math.sin(-ry) * -d * 0.25, y: y + roofTop + 0.5, z: z + Math.sin(-ry) * w * 0.25 + Math.cos(-ry) * -d * 0.25, kind: 'smoke', rate: 1.5, acc: Math.random() });
  avoid(x, z, Math.max(w, d) * 0.8 + 1);
  return { x, y, z, ry, door: { x: x + Math.cos(ry) * (w / 2 + 1.5), z: z - Math.sin(ry) * (w / 2 + 1.5) } };
}

function buildWindmill(x, z, ry, s = 1) {
  const y = gy(x, z) - 0.2;
  const parts = [
    part(cyl(2.0 * s, 2.8 * s, 9 * s, 8), 0xf0e6d2, { y: 4.5 * s, jit: 0.05 }),
    part(cyl(2.85 * s, 2.85 * s, 0.4 * s, 8), 0x8a7f74, { y: 0.2 }),
    part(cone(2.6 * s, 3 * s, 8), 0xa8483a, { y: 10.5 * s, jit: 0.08 }),
    part(box(1.2 * s, 2 * s, 0.3 * s), 0x7a4f2e, { y: 1.0 * s, z: 2.6 * s }),
    part(box(0.9 * s, 0.9 * s, 0.2 * s), 0x5a3f2c, { y: 5.5 * s, z: 2.35 * s }),
    part(box(1.6 * s, 0.2 * s, 1.0 * s), 0x7a4f2e, { y: 9.2 * s, z: 2.4 * s }),
  ];
  Batch.add(place(parts, x, y, z, ry));
  const hub = new THREE.Group(); hub.position.set(x + Math.sin(ry) * 2.9 * s, y + 8.8 * s, z + Math.cos(ry) * 2.9 * s); hub.rotation.y = ry;
  const sails = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU;
    const L = 6.5 * s;
    sails.push(part(box(0.25 * s, L, 0.15 * s), 0x6b4a32, { y: L / 2, rz: 0 }));
    sails.push(part(box(1.5 * s, L * 0.8, 0.06 * s), 0xf7f0e2, { x: 0.85 * s, y: L * 0.55 }));
    sails.forEach((g, j) => { if (j >= sails.length - 2) g.rotateZ(a); });
  }
  sails.push(part(cyl(0.4 * s, 0.4 * s, 0.6 * s, 8), 0x5a3f2c, { rx: Math.PI / 2 }));
  const m = meshOf(sails, vcMatDS()); hub.add(m); W.scene.add(hub);
  W.spinners.push({ obj: hub, axis: 'z', speed: 0.6 });
  Colliders.addCircle(x, z, 2.8 * s, y + 9 * s);
  Colliders.addBox(x, z, 1.5 * s, 1.5 * s, 0, y + 12 * s, { walk: true, solid: false });
  avoid(x, z, 6 * s);
  return { x, y, z, top: y + 12 * s };
}

function buildFence(pts, closed = false, col = 0x8a6340) {
  const list = closed ? pts.concat([pts[0]]) : pts;
  for (let i = 0; i < list.length - 1; i++) {
    const [ax, az] = list[i], [bx, bz] = list[i + 1];
    const L = Math.hypot(bx - ax, bz - az); const n = Math.max(1, Math.round(L / 2.2));
    const ang = Math.atan2(bz - az, bx - ax);
    for (let k = 0; k <= n; k++) { const t = k / n; const x = lerp(ax, bx, t), z = lerp(az, bz, t); ps('fencePost', 'fencePost').add(x, gy(x, z), z, 1, 0); }
    for (let k = 0; k < n; k++) { const t = (k + 0.5) / n; const x = lerp(ax, bx, t), z = lerp(az, bz, t); ps('fenceRail', 'fenceRail').add(x, gy(x, z), z, 1, -ang, { sx: L / n }); }
    Colliders.addBox((ax + bx) / 2, (az + bz) / 2, L / 2, 0.2, -ang, gy((ax + bx) / 2, (az + bz) / 2) + 1.1, { walk: false });
  }
}

function lantern(x, z, ry = 0) {
  const y = gy(x, z);
  ps('lanternPost', 'lanternPost').add(x, y, z, 1, ry);
  ps('lanternGlow', 'lanternGlow', { material: new THREE.MeshBasicMaterial({ vertexColors: true }), shadow: false }).add(x, y, z, 1, ry);
  const gx = x + Math.cos(ry) * 0.8, gz = z - Math.sin(ry) * 0.8;
  W.glows.push({ x: gx, y: y + 2.5, z: gz, s: 2.4, c: 0xffc46a });
  Colliders.addCircle(x, z, 0.25, y + 3);
}

function buildBridge(ax, az, bx, bz, width = 3.6) {
  const L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bz - az, bx - ax);
  const ha = gy(ax, az), hb = gy(bx, bz); const top = Math.max(ha, hb, 1.2) + 0.5;
  const cx = (ax + bx) / 2, cz = (az + bz) / 2;
  const parts = [];
  const n = Math.round(L / 0.7);
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; const arch = Math.sin(t * Math.PI) * 0.8; parts.push(part(box(0.66, 0.2, width), i % 2 ? 0xa57a4f : 0x9a6f45, { x: (t - 0.5) * L, y: top + arch - 0.1, jit: 0.1 })); }
  for (const s of [-1, 1]) {
    for (let i = 0; i <= 6; i++) { const t = i / 6; const arch = Math.sin(t * Math.PI) * 0.8; parts.push(part(box(0.2, 1.1, 0.2), 0x6b4a32, { x: (t - 0.5) * L, y: top + arch + 0.45, z: s * width / 2 })); }
    for (let i = 0; i < 6; i++) { const t0 = i / 6, t1 = (i + 1) / 6; const a0 = Math.sin(t0 * Math.PI) * 0.8, a1 = Math.sin(t1 * Math.PI) * 0.8; const seg = L / 6; parts.push(part(box(Math.hypot(seg, a1 - a0) + 0.1, 0.12, 0.14), 0x7a5634, { x: ((t0 + t1) / 2 - 0.5) * L, y: top + (a0 + a1) / 2 + 0.95, z: s * width / 2, rz: Math.atan2(a1 - a0, seg) })); }
  }
  parts.push(part(box(0.5, top + 3, 0.5), 0x8a7f74, { x: -L * 0.25, y: (top - 3) / 2 - 1, z: 0 }), part(box(0.5, top + 3, 0.5), 0x8a7f74, { x: L * 0.25, y: (top - 3) / 2 - 1, z: 0 }));
  Batch.add(place(parts, cx, 0, cz, -ang));
  // walk surface: three segments approximating arch
  const segs = 5;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs; const a0 = Math.sin(t0 * Math.PI) * 0.8, a1 = Math.sin(t1 * Math.PI) * 0.8;
    const mx = lerp(ax, bx, (t0 + t1) / 2), mz = lerp(az, bz, (t0 + t1) / 2);
    // box local z axis aligned to bridge direction: rot so that local z = direction
    Colliders.addBox(mx, mz, width / 2, L / segs / 2 + 0.05, Math.PI / 2 - ang, 0, { top0: top + a0, top1: top + a1, walk: true, solid: false });
  }
  for (const s of [-1, 1]) { const ox = -Math.sin(ang) * s * (width / 2 + 0.1), oz = Math.cos(ang) * s * (width / 2 + 0.1); Colliders.addBox(cx + ox, cz + oz, 0.12, L / 2 - 0.6, Math.PI / 2 - ang, top + 1.8, { walk: false, bottom: top - 0.2 }); }
}

function buildTree(x, z, kind, s) {
  const y = gy(x, z);
  ps(kind, kind).add(x, y - 0.1, z, s, Math.random() * TAU);
  Colliders.addCircle(x, z, 0.45 * s, y + 3 * s);
}

// ── Village ──
function buildVillage() {
  // home (player's house) faces +x (east) toward plaza
  Spots.home = buildHouse(P.home.x, P.home.z, 0, 8, 7, 3.6, { roof: 0xc8553d, wall: 0xf6efe2 });
  Spots.homeDoor = { x: P.home.x + 6, z: P.home.z };
  // home decorations per stage (toggled)
  W.homeDeco = [0, 1, 2, 3].map(() => { const g = new THREE.Group(); W.scene.add(g); return g; });
  const hx = P.home.x, hz = P.home.z, hy = gy(hx + 6, hz);
  // child: kite on fence, little swing, toy blocks
  W.homeDeco[0].add(meshOf([part(box(0.2, 2.6, 0.2), 0x7a5634, { x: 7, y: 1.3, z: -4 }), part(box(0.2, 2.6, 0.2), 0x7a5634, { x: 9, y: 1.3, z: -4 }), part(box(2.4, 0.2, 0.2), 0x7a5634, { x: 8, y: 2.6, z: -4 }), part(box(0.9, 0.1, 0.4), 0xe2573a, { x: 8, y: 0.8, z: -4 }), part(box(0.4, 0.4, 0.4), 0x5b8fd6, { x: 6, y: 0.2, z: 4 }), part(box(0.4, 0.4, 0.4), 0xf7c548, { x: 6.5, y: 0.2, z: 4.4 }), part(box(0.4, 0.4, 0.4), 0xe2573a, { x: 6.2, y: 0.6, z: 4.2 })]));
  // teen: saddle rack & practice target
  W.homeDeco[1].add(meshOf([part(box(1.6, 0.15, 0.6), 0x7a5634, { x: 7, y: 1.2, z: -4 }), part(box(0.2, 1.2, 0.2), 0x7a5634, { x: 6.4, y: 0.6, z: -4 }), part(box(0.2, 1.2, 0.2), 0x7a5634, { x: 7.6, y: 0.6, z: -4 }), part(sph(0.6, 8, 4), 0x9b5a2e, { x: 7, y: 1.5, z: -4, sy: 0.4 }), part(cyl(0.9, 0.9, 0.2, 10), 0xf6efe2, { x: 9, y: 1.4, z: 4, rx: Math.PI / 2 }), part(cyl(0.55, 0.55, 0.22, 10), 0xe2573a, { x: 9, y: 1.4, z: 4, rx: Math.PI / 2 })]));
  // adult: big perch and garden beds
  W.homeDeco[2].add(meshOf([part(box(0.4, 3.2, 0.4), 0x6b4a32, { x: 8, y: 1.6, z: -5 }), part(box(3, 0.3, 0.4), 0x6b4a32, { x: 8, y: 3.2, z: -5 }), part(box(2.4, 0.4, 1.4), 0x7a5634, { x: 7, y: 0.2, z: 5 }), part(ico(0.5, 0), 0x86c25a, { x: 6.4, y: 0.6, z: 5 }), part(ico(0.5, 0), 0xf2779a, { x: 7.6, y: 0.6, z: 5 })]));
  // elder: rocking chair, flowering arch, trophy banner
  W.homeDeco[3].add(meshOf([part(box(1, 0.15, 1), 0x7a5634, { x: 6.5, y: 0.7, z: 3 }), part(box(1, 1.2, 0.15), 0x7a5634, { x: 6.5, y: 1.3, z: 3.5 }), part(tor(0.7, 0.08, 4, 10, Math.PI), 0x7a5634, { x: 6.5, y: 0.1, z: 3, ry: Math.PI / 2, sx: 1 }), part(tor(1.6, 0.18, 5, 12, Math.PI), 0x5a9a42, { x: 6.6, y: 0, z: 0, ry: Math.PI / 2 }), part(ico(0.3, 0), 0xf2a7bf, { x: 6.6, y: 1.6, z: 0.9 }), part(ico(0.3, 0), 0xf7c548, { x: 6.6, y: 1.5, z: -0.9 }), part(ico(0.3, 0), 0xf2779a, { x: 6.6, y: 1.65, z: 0 }), part(box(0.1, 1.6, 1.2), 0x3d6f8f, { x: 4.1, y: 2.6, z: -2 }), part(box(0.12, 0.3, 0.3), 0xf2c45a, { x: 4.12, y: 2.8, z: -2 })]));
  W.homeDeco.forEach((g) => { g.position.set(hx, gy(hx + 6, hz), hz); g.traverse((m) => m.isMesh && (m.castShadow = true)); g.visible = false; });

  const houses = [
    [-44, 8, 0.3], [-30, 46, -0.6], [-8, 44, -1.4], [20, 40, -2.0], [38, 14, Math.PI], [34, -4, Math.PI + 0.3],
    [-50, -16, 0.2], [-14, -40, 1.4], [6, -36, 1.6], [24, -54, 1.9], [-62, 28, 0.1], [66, 10, Math.PI],
  ];
  houses.forEach(([x, z, ry], i) => buildHouse(x, z, ry, 6 + (i % 3), 5.5 + (i % 2), 3.2 + (i % 2) * 0.6));
  Spots.windmillA = buildWindmill(72, -46, -0.8, 1.1);
  Spots.windmillB = buildWindmill(-66, -2, 1.3, 0.95);
  // plaza fountain
  const py = gy(P.plaza.x, P.plaza.z);
  Batch.add(place([
    part(cyl(4.2, 4.5, 0.9, 12), 0xb9ae9c, { y: 0.45, jit: 0.05 }), part(cyl(3.6, 3.6, 0.2, 12), 0x5ec3d6, { y: 0.85 }),
    part(cyl(0.5, 0.7, 2.6, 8), 0xb9ae9c, { y: 1.3 }), part(cyl(1.4, 0.6, 0.4, 10), 0xb9ae9c, { y: 2.6 }), part(sph(0.5, 8, 6), 0x7fd0e0, { y: 3.1 }),
  ], P.plaza.x, py, P.plaza.z));
  Colliders.addCircle(P.plaza.x, P.plaza.z, 4.4, py + 0.9);
  Emitters.push({ x: P.plaza.x, y: py + 3.2, z: P.plaza.z, kind: 'fountain', rate: 14, acc: 0 });
  // plaza lantern ring & bunting
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + 0.2; lantern(P.plaza.x + Math.cos(a) * 11, P.plaza.z + Math.sin(a) * 11, -a + Math.PI); }
  // bunting lines (flags)
  const flagParts = [];
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * TAU + 0.2, a1 = ((i + 1) / 8) * TAU + 0.2;
    const x0 = Math.cos(a0) * 11, z0 = Math.sin(a0) * 11, x1 = Math.cos(a1) * 11, z1 = Math.sin(a1) * 11;
    for (let k = 1; k < 6; k++) { const t = k / 6; const sag = Math.sin(t * Math.PI) * 0.8; flagParts.push(part(cone(0.25, 0.5, 3), pick([0xe2573a, 0xf7c548, 0x5b8fd6, 0x6fae4f, 0xf2779a]), { x: lerp(x0, x1, t), y: 3.4 - sag - 0.25, z: lerp(z0, z1, t), rx: Math.PI, ry: -Math.atan2(z1 - z0, x1 - x0) })); }
  }
  Batch.add(place(flagParts, P.plaza.x, py, P.plaza.z));
  // Elder tree (ceremony)
  const et = { x: 18, z: -18 }; Spots.elderTree = et;
  const ety = gy(et.x, et.z);
  const tp = [part(cyl(1.0, 1.8, 7, 8), 0x7a5536, { y: 3.5, jit: 0.1 })];
  for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; tp.push(part(cyl(0.3, 0.6, 4, 6), 0x7a5536, { x: Math.cos(a) * 1.6, y: 7.2, z: Math.sin(a) * 1.6, rz: Math.cos(a) * 0.7, rx: -Math.sin(a) * 0.7 })); }
  [[0, 10, 0, 5], [3.5, 9, 1.5, 3.6], [-3.4, 9.2, -1, 3.6], [1, 9.5, -3.4, 3.4], [-1.5, 8.8, 3.3, 3.2]].forEach(([x, y, z, r]) => tp.push(part(ico(r, 1), 0xf2a7bf, { x, y, z, jit: 0.2 })));
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.4; tp.push(part(cyl(1.0, 1.4, 0.5, 6), 0x7a5536, { x: Math.cos(a) * 1.8, y: 0.1, z: Math.sin(a) * 1.8, rz: Math.cos(a) * 1.3, rx: -Math.sin(a) * 1.3 })); }
  Batch.add(place(tp, et.x, ety - 0.2, et.z));
  Colliders.addCircle(et.x, et.z, 1.9, ety + 7);
  Colliders.addBox(et.x, et.z, 4.5, 4.5, 0, ety + 13, { walk: true, solid: false });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; W.glows.push({ x: et.x + Math.cos(a) * 5.5, y: ety + 7.2, z: et.z + Math.sin(a) * 5.5, s: 1.8, c: 0xffd08a }); }
  Batch.add(place([0, 1, 2, 3, 4, 5].map((i) => { const a = (i / 6) * TAU; return part(box(0.4, 0.5, 0.4), 0xffd08a, { x: Math.cos(a) * 5.5, y: 7.2, z: Math.sin(a) * 5.5 }); }), et.x, ety, et.z), true);
  Emitters.push({ x: et.x, y: ety + 11, z: et.z, kind: 'petals', rate: 2, acc: 0 });
  avoid(et.x, et.z, 7);

  // nursery pen
  const nx = P.nursery.x, nz = P.nursery.z;
  const penPts = []; for (let i = 0; i <= 14; i++) { const a = (i / 16) * TAU + 1.18; penPts.push([nx + Math.cos(a) * 10, nz + Math.sin(a) * 10]); }
  buildFence(penPts, false, 0x8a6340);
  const ny = gy(nx, nz);
  const nestParts = [];
  [[-4, -4], [4, -3], [0, 5]].forEach(([x, z]) => { nestParts.push(part(tor(1.2, 0.45, 5, 10), 0xb58a52, { x, y: 0.3, z, rx: Math.PI / 2, jit: 0.2 }), part(cyl(1.0, 1.0, 0.2, 10), 0xe7cf8a, { x, y: 0.15, z })); });
  nestParts.push(part(box(3, 2.4, 2.2), 0xe9dcc2, { x: -7, y: 1.2, z: 3 }), part(cyl(1.9, 1.9, 2.8, 3), 0x6f8f3d, { x: -7, y: 3.1, z: 3, rx: -Math.PI / 2, sz: 0.8 }));
  nestParts.push(part(box(1.4, 0.8, 1.0), 0x9b6a3c, { x: 6, y: 0.4, z: 4 }), part(ico(0.25, 0), 0xe8603c, { x: 5.8, y: 0.9, z: 4 }), part(ico(0.25, 0), 0xc23a5a, { x: 6.2, y: 0.9, z: 3.8 }), part(ico(0.25, 0), 0xe8603c, { x: 6.1, y: 0.95, z: 4.2 }));
  nestParts.push(part(cyl(0.8, 0.6, 0.6, 8), 0x9b6a3c, { x: 7, y: 0.3, z: -4 }), part(sph(0.35, 8, 6), 0xf7c548, { x: 6.8, y: 0.85, z: -4 }), part(sph(0.35, 8, 6), 0x5b8fd6, { x: 7.3, y: 0.85, z: -3.8 }));
  Batch.add(place(nestParts, nx, ny, nz));
  Spots.nursery = { x: nx, z: nz, y: ny, nests: [[-4, -4], [4, -3], [0, 5]].map(([x, z]) => ({ x: nx + x, z: nz + z })), treats: { x: nx + 6, z: nz + 4 }, balls: { x: nx + 7, z: nz - 4 } };
  Colliders.addBox(nx - 7, nz + 3, 1.6, 1.2, 0, ny + 2.4);
  avoid(nx, nz, 12);
  // training yard
  const tx = 30, tz = 22; Spots.yard = { x: tx, z: tz };
  buildFence([[tx - 8, tz - 7], [tx + 8, tz - 7], [tx + 8, tz + 7], [tx - 8, tz + 7]], false);
  Spots.dummies = [[tx - 3, tz - 2], [tx + 3, tz - 3], [tx, tz + 3]].map(([x, z]) => ({ x, z }));
  avoid(tx, tz, 10);
  // farm
  const fx = -42, fz = 42; Spots.farm = { x: fx, z: fz };
  buildFence([[fx - 10, fz - 6], [fx + 10, fz - 6], [fx + 10, fz + 8], [fx - 10, fz + 8]], true);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) {
    const x = fx - 8 + i * 3.2, z = fz - 4 + j * 2.8; const y = gy(x, z);
    if (j % 2) ps('cabbage', 'cabbage').add(x, y, z, 1 + Math.random() * 0.3, Math.random() * 3); else ps('pumpkin', 'pumpkin').add(x, y, z, 0.9 + Math.random() * 0.4, Math.random() * 3);
  }
  for (let i = 0; i < 6; i++) ps('sunflower', 'sunflower').add(fx - 9 + i * 3.5, gy(fx - 9 + i * 3.5, fz + 7.5), fz + 7.5, 1, 0.3);
  Batch.add(place([part(box(0.2, 2.4, 0.2), 0x6b4a32, { y: 1.2 }), part(box(1.6, 0.2, 0.2), 0x6b4a32, { y: 1.8 }), part(ico(0.35, 0), 0xe7c46a, { y: 2.5 }), part(cyl(0.6, 0.6, 0.12, 8), 0xe7c46a, { y: 2.75 }), part(box(0.6, 0.9, 0.35), 0x5b8fd6, { y: 1.6 })], fx, gy(fx, fz), fz));
  avoid(fx, fz, 13);
  // stall / shop near plaza
  Spots.shop = { x: 12, z: 16 };
  const sy = gy(12, 16);
  Batch.add(place([part(box(4, 1.1, 1.8), 0x9b6a3c, { y: 0.55 }), part(box(0.2, 3, 0.2), 0x6b4a32, { x: -1.9, y: 1.5, z: -0.8 }), part(box(0.2, 3, 0.2), 0x6b4a32, { x: 1.9, y: 1.5, z: -0.8 }), part(box(0.2, 3, 0.2), 0x6b4a32, { x: -1.9, y: 1.5, z: 0.8 }), part(box(0.2, 3, 0.2), 0x6b4a32, { x: 1.9, y: 1.5, z: 0.8 }),
    part(box(4.6, 0.15, 2.6), 0xe2573a, { y: 3.05, rx: 0.15 }), part(box(4.6, 0.12, 0.5), 0xf6efe2, { y: 2.95, z: 1.2, rx: 0.15 }), part(ico(0.3, 0), 0xf7c548, { x: -1, y: 1.3 }), part(ico(0.3, 0), 0xf2779a, { x: 0, y: 1.3 }), part(ico(0.25, 0), 0x5b8fd6, { x: 1, y: 1.3 })], 12, sy, 16, 0.3));
  Colliders.addBox(12, 16, 2.1, 1.0, 0.3, sy + 1.1);
  avoid(12, 16, 4);
  // lookout hill for glide practice
  Spots.lookout = { x: P.lookout.x, z: P.lookout.z };
  // village lanterns along paths
  for (const path of PATHS) for (let i = 4; i < path.length; i += 6) {
    const [x, z] = path[i]; if (Math.hypot(x, z) > 95) continue; if (isAvoided(x + 3, z, 0)) continue;
    const [x2, z2] = path[Math.min(path.length - 1, i + 1)]; const ang = Math.atan2(z2 - z, x2 - x);
    lantern(x - Math.sin(ang) * 3, z + Math.cos(ang) * 3, -ang + Math.PI / 2);
  }
  // bridges where paths cross the river
  for (const path of PATHS) {
    let best = null;
    for (let i = 0; i < path.length; i++) { const d = distToPolyline(path[i][0], path[i][1], RIVER); if (d < 2.5 && (!best || d < best.d)) best = { d, i }; }
    if (best) {
      const [x, z] = path[best.i]; const [x2, z2] = path[Math.min(path.length - 1, best.i + 1)];
      const ang = Math.atan2(z2 - z, x2 - x);
      buildBridge(x - Math.cos(ang) * 8, z - Math.sin(ang) * 8, x + Math.cos(ang) * 8, z + Math.sin(ang) * 8);
      avoid(x, z, 9);
      if (!Spots.bridge) Spots.bridge = { x, z };
    }
  }
  addLandmark('plaza', 'Lantern Plaza', P.plaza.x, P.plaza.z, 10);
  addLandmark('windmill', 'Old Windmill Hill', Spots.windmillA.x, Spots.windmillA.z, 12);
  addLandmark('elder', 'The Elder Tree', et.x, et.z, 10);
  if (Spots.bridge) addLandmark('bridge', 'Willow Bridge', Spots.bridge.x, Spots.bridge.z, 10);
  addLandmark('lookout', 'Lookout Hill', Spots.lookout.x, Spots.lookout.z, 12);
}

// ── Frostpeak ──
function buildFrost() {
  Spots.lodge = buildHouse(P.lodge.x, P.lodge.z, Math.PI / 2, 9, 7, 3.6, { roof: 0x3d6f8f, wall: 0xe9dcc2 });
  for (let i = 0; i < 5; i++) { const a = i * 1.2 + 0.4; lantern(P.lodge.x + Math.cos(a) * 14, P.lodge.z + Math.sin(a) * 14, -a); }
  // arch course: rock arches rising toward summit
  const course = [[-20, -168, 40], [-46, -194, 48], [-74, -214, 58], [-104, -236, 70], [-128, -278, 84], [-120, -306, 96], [-70, -300, 104], [-40, -262, 90]];
  Spots.arches = [];
  course.forEach(([x, z, y], i) => {
    const next = course[Math.min(course.length - 1, i + 1)], prev = course[Math.max(0, i - 1)];
    const ang = Math.atan2(next[0] - prev[0], next[1] - prev[1]);
    const R = 7.5; const g = gy(x, z);
    const y0 = Math.max(y, g + R + 2);
    const parts = [];
    const segs = 9;
    for (let k = 0; k <= segs; k++) {
      const a = Math.PI * (k / segs);
      parts.push(part(dod(1.7 + (k % 2) * 0.4), k % 3 ? 0x8b8f9c : 0x9aa3b4, { x: Math.cos(a) * R, y: Math.sin(a) * R, jit: 0.15 }));
      if (k % 3 === 0) parts.push(part(dod(1.1), 0xf3f7fb, { x: Math.cos(a) * R, y: Math.sin(a) * R + 1.2, sy: 0.5 }));
    }
    // pillars down to ground
    for (const s of [-1, 1]) { const px = s * R; const ph = y0 - g + 2; parts.push(part(cyl(1.4, 2.2, ph, 6), 0x7d8290, { x: px, y: -ph / 2, jit: 0.12 })); }
    Batch.add(placeM(parts, x, y0, z, 0, ang, 0));
    Spots.arches.push({ x, y: y0 + 1.5, z, r: R - 1.2, ang });
  });
  // updraft columns
  [[-34, -184], [-90, -226], [-120, -290], [-80, -312], [20, -260], [-160, -330]].forEach(([x, z]) => Updrafts.push({ x, z, r: 7, top: 150, strength: 16 }));
  // ice cave at P.cave: crystals and an ice wall
  const cx = P.cave.x, cz = P.cave.z, cyy = gy(cx, cz);
  Spots.cave = { x: cx, z: cz, y: cyy };
  for (let i = 0; i < 26; i++) { const a = rand(0, TAU), r = rand(8, 16); const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; ps('crystalIce', 'crystal', { material: new THREE.MeshLambertMaterial({ color: linColor(0xbfe9ff), emissive: linColor(0x2a6a8a), transparent: true, opacity: 0.9 }) }).add(x, gy(x, z) - 0.4, z, rand(1, 2.4), rand(0, TAU), { rx: rand(-0.3, 0.3), rz: rand(-0.3, 0.3) }); }
  // overhang arch of ice (cave mouth)
  const archP = [];
  for (let k = 0; k <= 10; k++) { const a = Math.PI * (k / 10); archP.push(part(dod(2.2), k % 2 ? 0xcfe9f6 : 0xa9d6ee, { x: Math.cos(a) * 9, y: Math.sin(a) * 7, jit: 0.1 })); }
  Batch.add(placeM(archP, cx, cyy, cz + 9, 0, 0, 0));
  // ice wall (destructible)
  const wall = meshOf([part(box(7, 5, 1.4), 0xbfe9ff, { y: 2.5, jit: 0.15 }), part(dod(1.4), 0xd6f2ff, { x: -2, y: 4.5 }), part(dod(1.2), 0xd6f2ff, { x: 2.4, y: 4.2 })], new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.85, emissive: linColor(0x1a4a6a) }));
  wall.position.set(cx, cyy, cz - 3); W.scene.add(wall);
  Spots.iceWall = { mesh: wall, x: cx, z: cz - 3, y: cyy, hp: 3, col: Colliders.addBox(cx, cz - 3, 3.6, 0.8, 0, cyy + 5, { walk: false }) };
  Spots.pip = { x: cx, z: cz - 8 };
  addLandmark('lodge', 'Frostpeak Lodge', P.lodge.x, P.lodge.z, 18);
  addLandmark('cave', 'Glimmerfrost Cave', cx, cz, 16);
  addLandmark('summit', 'Frostpeak Summit', P.summit.x, P.summit.z, 16);
  Spots.frostbloom = { x: P.summit.x + 3, z: P.summit.z - 2 };
}

// ── Dragon's Nest ──
function buildNest() {
  const nx = P.nest.x, nz = P.nest.z;
  // big nests
  Spots.nests = [];
  const nestDefs = [[NEST_GATE_ANG + 0.7, 34, 4.2], [NEST_GATE_ANG - 0.8, 33, 3.6], [NEST_GATE_ANG + 2.4, 32, 4.5], [NEST_GATE_ANG - 2.3, 31, 4.0], [NEST_GATE_ANG + Math.PI, 33, 3.4]];
  nestDefs.forEach(([a, r, s], i) => {
    const x = nx + Math.cos(a) * r, z = nz + Math.sin(a) * r; const y = gy(x, z);
    const parts = [];
    for (let k = 0; k < 3; k++) parts.push(part(tor(s, s * 0.32, 6, 14), k % 2 ? 0x4a3a30 : 0x6b5240, { y: 0.4 + k * 0.5, rx: Math.PI / 2, ry: k, jit: 0.25, sx: 1 - k * 0.05, sy: 1 - k * 0.05 }));
    parts.push(part(cyl(s * 0.95, s * 0.95, 0.4, 12), 0x3e3438, { y: 0.4 }));
    if (i !== 0) for (let e = 0; e < 3; e++) parts.push(part(sph(0.55, 8, 6), pick([0xe2573a, 0xf7c548, 0x7a5ad6, 0x4fb3a9]), { x: Math.cos(e * 2) * s * 0.4, y: 1.0, z: Math.sin(e * 2) * s * 0.4, sy: 1.3 }));
    Batch.add(place(parts, x, y, z, Math.random()));
    Colliders.addBox(x, z, s, s, 0, y + 1.0, { walk: true, solid: false });
    Spots.nests.push({ x, z, y: y + 1.0, s });
  });
  Spots.elderNest = Spots.nests[0];
  // glowing crystals
  const cm = new THREE.MeshBasicMaterial({ vertexColors: true });
  for (let i = 0; i < 46; i++) {
    const a = rand(0, TAU), r = rand(40, 64); const x = nx + Math.cos(a) * r, z = nz + Math.sin(a) * r; const y = gy(x, z);
    ps('crystalNest', 'crystal', { material: cm, shadow: false }).add(x, y - 0.3, z, rand(0.8, 2.2), rand(0, TAU), { tint: hexLin(pick([0xff8a3a, 0xc46aff, 0xff5a7a, 0xffc14a])), rx: rand(-0.3, 0.3), rz: rand(-0.3, 0.3) });
    if (i % 4 === 0) W.glows.push({ x, y: y + 1.5, z, s: 4, c: 0xff9a5a });
  }
  for (let i = 0; i < 60; i++) { const a = rand(0, TAU), r = rand(52, 110); const x = nx + Math.cos(a) * r, z = nz + Math.sin(a) * r; if (angDiff(a, NEST_GATE_ANG) < 0.25) continue; ps('basalt', 'basalt').add(x, gy(x, z) - 0.3, z, rand(0.8, 2), rand(0, TAU)); }
  // geysers for the trial
  Spots.geysers = [];
  for (let i = 0; i < 9; i++) {
    const a = NEST_GATE_ANG + Math.PI + (i - 4) * 0.28, r = 22 + (i % 3) * 4.5;
    const x = nx + Math.cos(a) * r, z = nz + Math.sin(a) * r; const y = gy(x, z);
    Batch.add(place([part(cyl(1.2, 1.8, 0.8, 7), 0x3e3438, { y: 0.2, jit: 0.15 }), part(cyl(0.9, 0.9, 0.82, 7), 0xff7a2a, { y: 0.2 })], x, y, z));
    Spots.geysers.push({ x, z, y, t: i * 0.7, state: 0 });
  }
  // cinder's outcrop on far side
  const ca = NEST_GATE_ANG + Math.PI, cr = 33;
  Spots.cinder = { x: nx + Math.cos(ca) * cr, z: nz + Math.sin(ca) * cr };
  Spots.nestGate = { x: nx + Math.cos(NEST_GATE_ANG) * 52, z: nz + Math.sin(NEST_GATE_ANG) * 52 };
  Spots.trialStart = { x: nx + Math.cos(NEST_GATE_ANG) * 30, z: nz + Math.sin(NEST_GATE_ANG) * 30 };
  Emitters.push({ x: nx, y: 26.5, z: nz, kind: 'embers', rate: 10, acc: 0 });
  addLandmark('nest', "The Dragon's Nest", nx, nz, 40);
  addLandmark('nestgate', 'Ember Gate', Spots.nestGate.x, Spots.nestGate.z, 12);
}

// ── Beach ──
function buildBeach() {
  // shipwrecks
  const wreck = (x, z, ry, s, tilt) => {
    const y = gy(x, z) - 1.2 * s;
    const parts = [];
    for (let i = 0; i < 9; i++) { const t = i / 8 - 0.5; const w = Math.cos(t * Math.PI * 0.9) * 2.6 * s; for (const sd of [-1, 1]) parts.push(part(box(1.3 * s, 2.4 * s, 0.25 * s), i % 2 ? 0x6b4a32 : 0x7a5634, { x: t * 11 * s, y: 1.4 * s, z: sd * w, rx: sd * 0.3, jit: 0.15 })); }
    parts.push(part(box(11 * s, 0.3 * s, 3.6 * s), 0x5a3f2c, { y: 0.4 * s }));
    for (let i = 0; i < 7; i++) parts.push(part(tor(2.2 * s, 0.14 * s, 4, 8, Math.PI), 0x4a3a2e, { x: (i / 6 - 0.5) * 9 * s, y: 0.6 * s, ry: Math.PI / 2, rz: 0 }));
    parts.push(part(cyl(0.25 * s, 0.3 * s, 7 * s, 6), 0x5a3f2c, { x: 1.5 * s, y: 3.8 * s, rz: 0.5 }));
    parts.push(part(box(2.6 * s, 2.2 * s, 0.06 * s), 0xd9cfbd, { x: 2.6 * s, y: 5 * s, rz: 0.5, ry: 0.1 }));
    Batch.add(placeM(parts, x, y, z, 0, ry, tilt));
    Colliders.addBox(x, z, 5.5 * s, 2.4 * s, ry, y + 2.5 * s, { walk: false });
    avoid(x, z, 8 * s);
    return { x, z, y };
  };
  Spots.wreck = wreck(P.wreck.x, P.wreck.z, 0.4, 1.4, 0.18);
  wreck(132, 296, -0.9, 1.0, -0.25);
  wreck(-60, 286, 1.8, 0.9, 0.3);
  Spots.wreckChest = { x: P.wreck.x + 6, z: P.wreck.z - 7 };
  // beach decor
  scatter(160, [-110, 200, 210, 300], (x, z, h) => { if (h < 0.6 || h > 4 || isAvoided(x, z, 1)) return; const r = Math.random(); if (r < 0.15) ps('shell', 'shell').add(x, h, z, rand(0.8, 1.4), rand(0, TAU)); else if (r < 0.25) ps('starfish', 'starfish').add(x, h, z, rand(0.8, 1.3), rand(0, TAU)); else if (r < 0.33) ps('driftwood', 'driftwood').add(x, h, z, rand(0.8, 1.2), rand(0, TAU)); else if (r < 0.42) ps('sandrock', 'sandrock').add(x, h - 0.1, z, rand(0.6, 1.6), rand(0, TAU)); });
  // palms
  scatter(90, [-120, 196, 220, 260], (x, z, h) => { if (h < 1.6 || h > 5 || isAvoided(x, z, 3)) return; buildTree(x, z, 'palm', rand(0.9, 1.3)); });
  // umbrellas & sandcastle & kids
  Spots.raceStart = { x: 96, z: 226 };
  Spots.sandcastle = { x: 40, z: 232 };
  const scy = gy(40, 232);
  Batch.add(place([part(cyl(1.4, 1.6, 1, 8), 0xe6c584, { y: 0.5 }), part(cyl(0.5, 0.6, 1.2, 6), 0xe6c584, { x: 1.4, y: 0.6 }), part(cyl(0.5, 0.6, 1.2, 6), 0xe6c584, { x: -1.4, y: 0.6 }), part(cone(0.6, 0.8, 6), 0xd8b470, { x: 1.4, y: 1.6 }), part(cone(0.6, 0.8, 6), 0xd8b470, { x: -1.4, y: 1.6 }), part(cyl(0.6, 0.8, 1.6, 6), 0xe6c584, { y: 1.6 }), part(cone(0.8, 1, 6), 0xd8b470, { y: 2.9 }), part(box(0.05, 0.6, 0.4), 0xe2573a, { y: 3.6, z: 0.2 })], 40, scy, 232));
  [[70, 222, 0xe2573a], [24, 224, 0x5b8fd6], [110, 230, 0xf7c548]].forEach(([x, z, c]) => { const y = gy(x, z); Batch.add(place([part(cyl(0.06, 0.06, 3, 4), 0xf6efe2, { y: 1.5, rz: 0.1 }), part(cone(2.2, 0.8, 8), c, { y: 3, rz: 0.1 }), part(box(1.8, 0.1, 0.9), 0xf6efe2, { x: 1, y: 0.15 })], x, y, z)); });
  // hidden cove interior: chest + clue 3
  Spots.coveChest = { x: P.cove.x - 4, z: P.cove.z - 6 };
  Spots.coveSpy = { x: P.cove.x + 5, z: P.cove.z - 2 };
  for (let i = 0; i < 6; i++) { const a = rand(0, TAU), r = rand(4, 14); const x = P.cove.x + Math.cos(a) * r, z = P.cove.z + Math.sin(a) * r; if (gy(x, z) > 0.8) W.glows.push({ x, y: gy(x, z) + 0.3, z, s: 1.4, c: 0x9ff3ff }); }
  // dig spots
  Spots.digs = [[-20, 236], [30, 244], [84, 238], [120, 228], [-50, 240], [62, 252], [P.cove.x, P.cove.z + 4]].map(([x, z], i) => ({ x, z, i }));
  // race rings (ground race + glide hops)
  Spots.raceRings = [[86, 236], [64, 248], [40, 252], [14, 246], [-12, 238], [-40, 244], [-58, 232], [-34, 222], [0, 222], [36, 218], [70, 214], [96, 226]].map(([x, z]) => ({ x, z, y: gy(x, z) + 2.2 }));
  // coastline sky rings (optional)
  Spots.coastRings = [];
  for (let i = 0; i < 10; i++) { const a = i / 9; Spots.coastRings.push({ x: lerp(-90, 190, a), z: 300 + Math.sin(a * TAU) * 20, y: 18 + Math.sin(a * 9) * 8 }); }
  addLandmark('beach', 'Sunspill Beach', P.beach.x, P.beach.z, 30);
  addLandmark('wreck', 'Wreck of the Merry Gull', P.wreck.x, P.wreck.z, 14);
  addLandmark('cove', 'Hidden Cove', P.cove.x, P.cove.z, 14);
}

// ── Lagoon ──
function buildLagoon() {
  const lx = P.lagoon.x, lz = P.lagoon.z;
  // coral gardens
  const coralMat = vcMat();
  const tints = [0xff7a8a, 0xffa94d, 0xb985f0, 0x4fd6c8, 0xffd84d, 0xff5ab0, 0x7ab8ff];
  for (let i = 0; i < 240; i++) {
    const a = rand(0, TAU), r = Math.sqrt(Math.random()) * 52; const x = lx + Math.cos(a) * r, z = lz + Math.sin(a) * r; const h = gy(x, z);
    if (h > -1.5) continue;
    const kind = pick(['coralBranch', 'coralBranch', 'coralFan', 'brain', 'kelp', 'glowplant']);
    const tint = hexLin(pick(tints));
    if (kind === 'kelp') ps('kelp', 'kelp').add(x, h, z, rand(0.8, 1.5), rand(0, TAU));
    else if (kind === 'glowplant') { ps('glowplant', 'glowplant', { material: new THREE.MeshBasicMaterial({ vertexColors: true }), shadow: false }).add(x, h, z, rand(0.8, 1.6), rand(0, TAU), { tint: hexLin(pick([0x9ff3ff, 0xc9a6ff, 0x9fffc8])) }); }
    else ps(kind, kind, { material: coralMat }).add(x, h, z, rand(0.7, 1.6), rand(0, TAU), { tint });
  }
  // rocks / pillars in lagoon
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + 0.3; const r = 40 + (i % 2) * 8; const x = lx + Math.cos(a) * r, z = lz + Math.sin(a) * r;
    if (angDiff(a, LAGOON_INLET_ANG) < 0.4) continue;
    const h = gy(x, z); const top = 2 + (i % 3) * 3;
    Batch.add(place([part(cyl(2.4, 3.6, top - h, 7), 0x7f8a86, { y: (top - h) / 2, jit: 0.15 }), part(ico(2.6, 0), 0x6f9a76, { y: top - h, sy: 0.4 })], x, h, z, a));
    Colliders.addCircle(x, z, 3.2, top);
    Colliders.addBox(x, z, 2.2, 2.2, 0, top + 0.2, { walk: true, solid: false });
  }
  // queen's rock (big flat rock)
  const qa = LAGOON_INLET_ANG + Math.PI * 0.85; const qx = lx + Math.cos(qa) * 30, qz = lz + Math.sin(qa) * 30;
  const qh = gy(qx, qz);
  Batch.add(place([part(cyl(4.5, 6, 1.6 - qh, 8), 0x8a948f, { y: (1.6 - qh) / 2, jit: 0.1 }), part(cyl(4.6, 4.6, 0.3, 8), 0xc9d6c8, { y: 1.6 - qh }), part(box(1.2, 2.2, 0.5), 0xf2c45a, { y: 2.9 - qh, z: -2 })], qx, qh, qz));
  Colliders.addCircle(qx, qz, 4.6, 1.5);
  Colliders.addBox(qx, qz, 3.6, 3.6, 0, 1.9, { walk: true, solid: false });
  Spots.queen = { x: qx, z: qz, y: 1.9 };
  // song clams around the grotto
  Spots.grotto = { x: lx, z: lz, y: gy(lx, lz) };
  const clamCols = [0xff7a8a, 0x7ab8ff, 0xffd84d];
  Spots.clams = clamCols.map((c, i) => {
    const a = (i / 3) * TAU + 0.6; const x = lx + Math.cos(a) * 14, z = lz + Math.sin(a) * 14; const y = gy(x, z);
    const g = new THREE.Group(); g.position.set(x, y, z);
    const bottom = meshOf([part(sph(1.4, 10, 5, 0), c, { sy: 0.45, jit: 0.1 })]);
    const top = meshOf([part(sph(1.4, 10, 5), mixHex(c, 0xffffff, 0.3), { sy: 0.45, jit: 0.1 })]); top.position.set(0, 0.25, -1.0);
    const tg = new THREE.Group(); tg.position.set(0, 0.2, -1.2); top.position.set(0, 0.1, 1.2); tg.add(top); g.add(bottom); g.add(tg);
    const pearl = new THREE.Mesh(sph(0.4, 10, 8), glowMat(0xfff6e6)); pearl.position.y = 0.6; g.add(pearl);
    W.scene.add(g);
    return { x, z, y, c, g, lid: tg, pearl, i, note: [72, 76, 79][i] };
  });
  // grotto gate: two shell doors at bottom center
  const gg = new THREE.Group(); gg.position.set(lx, Spots.grotto.y, lz); W.scene.add(gg);
  Batch.add(place([part(tor(4.6, 1.1, 6, 14, Math.PI), 0x9fb8b0, { rz: 0, jit: 0.1 }), part(cyl(5.5, 6.2, 1.2, 12), 0x9fb8b0, { y: -0.4 })], lx, Spots.grotto.y, lz));
  const doorL = meshOf([part(cyl(3.6, 3.6, 0.4, 10, 1), 0xf2dcb6, { rx: Math.PI / 2, x: -1.8, sx: 0.5, y: 2.2, jit: 0.1 })]);
  const doorR = meshOf([part(cyl(3.6, 3.6, 0.4, 10, 1), 0xf2dcb6, { rx: Math.PI / 2, x: 1.8, sx: 0.5, y: 2.2, jit: 0.1 })]);
  gg.add(doorL); gg.add(doorR);
  Spots.gate = { g: gg, doorL, doorR, open: 0 };
  Spots.grottoPrize = { x: lx, z: lz + 3, y: Spots.grotto.y + 1 };
  // mermaid swim ring course (underwater)
  Spots.swimRings = [];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU * 1.2 + 1; const r = 22 + Math.sin(i * 1.7) * 10; const x = lx + Math.cos(a) * r, z = lz + Math.sin(a) * r; const floor = gy(x, z); Spots.swimRings.push({ x, z, y: Math.min(-3, floor + 4 + (i % 2) * 2) }); }
  // underwater treasures
  Spots.lagoonChests = [[-20, 18], [26, -10], [6, 34]].map(([dx, dz]) => ({ x: lx + dx, z: lz + dz }));
  // air bubble vents
  Spots.vents = [[10, -22], [-28, -4], [16, 24]].map(([dx, dz]) => ({ x: lx + dx, z: lz + dz, y: gy(lx + dx, lz + dz) }));
  Spots.vents.forEach((v) => Emitters.push({ x: v.x, y: v.y + 0.3, z: v.z, kind: 'vent', rate: 8, acc: 0 }));
  // pirate camp on rim
  Spots.camp = { x: P.camp.x, z: P.camp.z, y: gy(P.camp.x, P.camp.z) };
  const cy2 = Spots.camp.y;
  Batch.add(place([part(cone(3, 3.4, 4), 0xb9ab8a, { y: 1.7, ry: Math.PI / 4 }), part(cyl(0.06, 0.06, 4.6, 3), 0x5a3f2c, { y: 2.3 }), part(box(1.2, 0.8, 0.05), 0x1a1a1a, { x: 0.6, y: 4.2 }), part(sph(0.18, 6, 4), 0xf6efe2, { x: 0.6, y: 4.25, z: 0.05 })], P.camp.x - 5, cy2, P.camp.z - 3));
  for (let i = 0; i < 5; i++) ps('barrel', 'barrel').add(P.camp.x + rand(-6, 6), cy2, P.camp.z + rand(-6, 6), 1, rand(0, 3));
  for (let i = 0; i < 4; i++) ps('crate', 'crate').add(P.camp.x + rand(-6, 6), cy2, P.camp.z + rand(-6, 6), rand(0.9, 1.3), rand(0, 3));
  Emitters.push({ x: P.camp.x, y: cy2 + 0.3, z: P.camp.z, kind: 'campfire', rate: 10, acc: 0 });
  Batch.add(place([part(cyl(0.8, 1, 0.3, 7), 0x5a5a5a, { y: 0.15 }), part(box(1.4, 0.2, 0.2), 0x5a3f2c, { y: 0.3, ry: 0.5 }), part(box(1.4, 0.2, 0.2), 0x5a3f2c, { y: 0.3, ry: -0.6 })], P.camp.x, cy2, P.camp.z), false);
  W.glows.push({ x: P.camp.x, y: cy2 + 0.9, z: P.camp.z, s: 3.5, c: 0xff9a3a });
  addLandmark('lagoon', 'The Mermaid Lagoon', lx, lz, 50);
  addLandmark('camp', "Smugglers' Rocks", P.camp.x, P.camp.z, 14);
}

// ── Pirate Ship ──
const Ship = { x: P.ship.x, z: P.ship.z, ang: -0.6, deck: 6.2, fore: 9, aft: 10.4, L: 30 };
function shipLocal(lx, lz) { const c = Math.cos(Ship.ang), s = Math.sin(Ship.ang); return { x: Ship.x + lx * c - lz * s, z: Ship.z + lx * s + lz * c }; }
function buildShip() {
  const S = Ship; const parts = [], glowP = [];
  const hullC = 0x4a3428, hullD = 0x3a281e, trim = 0xd9a441, deckC = 0xa57a4f;
  // hull: stacked tapered slabs
  for (let k = 0; k < 6; k++) {
    const y = -3 + k * 1.6; const wd = 6.4 - Math.abs(2.5 - k) * 0.35 - (k < 2 ? (2 - k) * 0.8 : 0);
    parts.push(part(box(S.L * 2 - Math.abs(2.5 - k) * 2, 1.6, wd * 2), k % 2 ? hullC : hullD, { y, jit: 0.05 }));
  }
  parts.push(part(cone(6.2, 10, 4), hullC, { x: S.L + 4, y: 2.4, rz: -Math.PI / 2, ry: Math.PI / 4, sx: 1, sz: 1 })); // bow
  parts.push(part(box(2, 0.3, 12.6), trim, { x: S.L, y: S.deck + 0.1 }));
  parts.push(part(cyl(0.25, 0.25, 12, 5), 0x6b4a32, { x: S.L + 9, y: S.deck + 2, rz: -1.2 })); // bowsprit
  // deck planks
  parts.push(part(box(S.L * 2, 0.3, 12.2), deckC, { y: S.deck - 0.15, jit: 0.05 }));
  for (let i = -6; i <= 6; i += 1.2) parts.push(part(box(S.L * 2, 0.02, 0.06), 0x7a5634, { y: S.deck + 0.01, z: i }));
  // forecastle (bow raised) & quarterdeck (stern raised)
  parts.push(part(box(12, S.fore - S.deck, 12.2), hullC, { x: S.L - 6, y: (S.fore + S.deck) / 2 - 0.15 }), part(box(12, 0.3, 12.2), deckC, { x: S.L - 6, y: S.fore - 0.15 }));
  parts.push(part(box(16, S.aft - S.deck, 12.6), hullC, { x: -S.L + 8, y: (S.aft + S.deck) / 2 - 0.15 }), part(box(16, 0.3, 12.6), deckC, { x: -S.L + 8, y: S.aft - 0.15 }));
  parts.push(part(box(2, 4, 13), hullD, { x: -S.L - 0.8, y: S.aft - 1 })); // stern
  for (let i = -2; i <= 2; i++) glowP.push(part(box(0.1, 0.9, 1.4), 0xffc46a, { x: -S.L - 1.85, y: S.aft - 2, z: i * 2.4 }));
  // rails
  for (const sd of [-1, 1]) {
    parts.push(part(box(S.L * 2, 1.0, 0.25), hullD, { y: S.deck + 0.5, z: sd * 6.05 }));
    parts.push(part(box(12, 0.9, 0.25), hullD, { x: S.L - 6, y: S.fore + 0.45, z: sd * 6.05 }));
    parts.push(part(box(16, 0.9, 0.25), hullD, { x: -S.L + 8, y: S.aft + 0.45, z: sd * 6.25 }));
    parts.push(part(box(S.L * 2, 0.15, 0.35), trim, { y: S.deck + 1.02, z: sd * 6.05 }));
    for (let i = -3; i <= 3; i++) parts.push(part(box(1.2, 1.0, 0.1), 0x1a1410, { x: i * 5, y: 3.5, z: sd * 6.45 })); // gunports
  }
  parts.push(part(box(0.25, 0.9, 12.2), hullD, { x: -S.L + 16, y: S.aft + 0.45 })); // quarterdeck front rail
  // stairs visuals
  for (const sd of [-1, 1]) for (let k = 0; k < 6; k++) { parts.push(part(box(0.8, 0.25, 3), deckC, { x: -S.L + 16.4 + k * 0.8, y: S.aft - 0.3 - k * 0.7, z: sd * 4 })); parts.push(part(box(0.8, 0.25, 3), deckC, { x: S.L - 12.4 - k * 0.8, y: S.fore - 0.3 - k * 0.47, z: sd * 4 })); }
  // masts
  const masts = [[-6, 30], [10, 34], [S.L - 4, 22]];
  masts.forEach(([mx, mh]) => {
    parts.push(part(cyl(0.45, 0.6, mh, 7), 0x6b4a32, { x: mx, y: S.deck + mh / 2 }));
    parts.push(part(box(0.4, 0.4, 14), 0x6b4a32, { x: mx, y: S.deck + mh * 0.45 }), part(box(0.35, 0.35, 11), 0x6b4a32, { x: mx, y: S.deck + mh * 0.8 }));
    parts.push(part(cyl(1.8, 1.4, 1.0, 8), 0x5a3f2c, { x: mx, y: S.deck + mh * 0.86 }));
  });
  Batch.add(placeM(parts, S.x, 0, S.z, 0, -S.ang, 0));
  Batch.add(placeM(glowP, S.x, 0, S.z, 0, -S.ang, 0), true);
  // sails (cloth, separate double-sided, swaying)
  const sailParts = [];
  masts.forEach(([mx, mh], i) => {
    sailParts.push(part(box(0.15, mh * 0.32, 13), 0x2a2228, { x: mx + 0.5, y: S.deck + mh * 0.6, jit: 0.05 }));
    sailParts.push(part(box(0.15, mh * 0.22, 10), 0x332a30, { x: mx + 0.5, y: S.deck + mh * 0.92 - mh * 0.12 }));
    if (i === 1) sailParts.push(part(cyl(2.2, 2.2, 0.2, 10), 0xf6efe2, { x: mx + 0.62, y: S.deck + mh * 0.6, rz: Math.PI / 2 }), part(box(0.22, 0.6, 3.6), 0xf6efe2, { x: mx + 0.64, y: S.deck + mh * 0.6 - 2.6, rx: 0.7 }), part(box(0.22, 0.6, 3.6), 0xf6efe2, { x: mx + 0.64, y: S.deck + mh * 0.6 - 2.6, rx: -0.7 }));
  });
  const sail = meshOf(sailParts, vcMatDS()); sail.position.set(S.x, 0, S.z); sail.rotation.y = -S.ang; W.scene.add(sail); W.shipSail = sail;
  // flag
  const flag = meshOf([part(box(0.05, 1.6, 2.6), 0x111111, { z: -1.3 }), part(sph(0.35, 6, 4), 0xf6efe2, { x: 0.05, z: -1.3, y: 0.15 })], vcMatDS());
  const fp = shipLocal(10, 0); flag.position.set(fp.x, S.deck + 35, fp.z); flag.rotation.y = -S.ang; W.scene.add(flag); W.flags.push(flag);
  // lanterns
  [[-S.L + 2, 4], [-S.L + 2, -4], [0, 5.5], [0, -5.5], [S.L - 2, 0]].forEach(([x, z]) => { const p = shipLocal(x, z); W.glows.push({ x: p.x, y: (x < -14 ? S.aft : x > 18 ? S.fore : S.deck) + 2, z: p.z, s: 2.6, c: 0xffc46a }); });
  // ── colliders ──
  const rot = -S.ang; // Colliders box rot so that local x aligns
  const box2 = (lx, lz, hw, hd, top, opt) => { const p = shipLocal(lx, lz); return Colliders.addBox(p.x, p.z, hw, hd, rot, top, opt); };
  box2(0, 0, S.L, 6.2, S.deck, { walk: true, solid: true, bottom: -6 }); // main deck/hull
  box2(S.L - 6, 0, 6, 6.2, S.fore, { walk: true, solid: true, bottom: S.deck - 0.1 });
  box2(-S.L + 8, 0, 8, 6.4, S.aft, { walk: true, solid: true, bottom: S.deck - 0.1 });
  box2(S.L + 4, 0, 4, 3.5, S.deck, { walk: true, solid: true, bottom: -6 });
  // rails (block walking off, low height so flying passes over)
  for (const sd of [-1, 1]) {
    const gap = sd > 0 ? 4 : -4; // boarding-net gap
    box2((-S.L + gap - 2) / 2, sd * 6.1, (gap - 2 + S.L) / 2, 0.2, S.deck + 1.1, { walk: false, bottom: S.deck - 0.5 });
    box2((S.L + gap + 2) / 2, sd * 6.1, (S.L - gap - 2) / 2, 0.2, S.deck + 1.1, { walk: false, bottom: S.deck - 0.5 });
    box2(S.L - 6, sd * 6.1, 6, 0.2, S.fore + 1.0, { walk: false, bottom: S.fore - 0.5 });
    box2(-S.L + 8, sd * 6.3, 8, 0.2, S.aft + 1.0, { walk: false, bottom: S.aft - 0.5 });
  }
  // stern rail & bow rail, quarterdeck front rail (gaps at the stairs)
  box2(-S.L - 0.1, 0, 0.25, 6.4, S.aft + 1.0, { walk: false, bottom: S.aft - 0.5 });
  box2(S.L + 0.1, 0, 0.25, 6.2, S.fore + 1.0, { walk: false, bottom: S.fore - 0.5 });
  for (const [z0, z1] of [[-6.3, -5.6], [-2.4, 2.4], [5.6, 6.3]]) {
    box2(-S.L + 16, (z0 + z1) / 2, 0.2, (z1 - z0) / 2, S.aft + 1.0, { walk: false, bottom: S.aft - 0.5 });
    box2(S.L - 12, (z0 + z1) / 2, 0.2, (z1 - z0) / 2, S.fore + 1.0, { walk: false, bottom: S.fore - 0.5 });
  }
  // stairs: sloped walk boxes (local x dir). Colliders slope along local z, so build with rot+PI/2
  const ramp = (lx0, lx1, lz, topLow, topHigh) => { const p = shipLocal((lx0 + lx1) / 2, lz); return Colliders.addBox(p.x, p.z, 1.5, Math.abs(lx1 - lx0) / 2, rot + Math.PI / 2, 0, { top0: lx1 > lx0 ? topLow : topHigh, top1: lx1 > lx0 ? topHigh : topLow, walk: true, solid: false }); };
  for (const sd of [-1, 1]) {
    ramp(-S.L + 15.6, -S.L + 21, sd * 4, S.aft, S.deck); // from quarterdeck down to main
    ramp(S.L - 17, S.L - 11.6, sd * 4, S.deck, S.fore);
  }
  // boarding ramp/net from water on port side (local z = +6.2)
  const rp = shipLocal(4, 9.4);
  Colliders.addBox(rp.x, rp.z, 1.6, 3.4, rot, 0, { top0: S.deck, top1: -1.2, walk: true, solid: false });
  const rp2 = shipLocal(-4, -9.4);
  Colliders.addBox(rp2.x, rp2.z, 1.6, 3.4, rot, 0, { top0: -1.2, top1: S.deck, walk: true, solid: false });
  // rail gaps at ramps: disable small part? simpler: rail segments split — rebuild rails with gaps
  const netParts = [];
  for (const [lx, sd] of [[4, 1], [-4, -1]]) { for (let k = 0; k < 7; k++) netParts.push(part(box(3.2, 0.12, 0.12), 0xc9b994, { x: lx, y: S.deck - k * 1.1, z: sd * (6.3 + k * 0.45) })); for (const ox of [-1.5, 0, 1.5]) netParts.push(part(box(0.1, 7.8, 0.1), 0xc9b994, { x: lx + ox, y: S.deck / 2 - 0.6, z: sd * 7.7, rx: sd * 0.4 })); }
  Batch.add(placeM(netParts, S.x, 0, S.z, 0, -S.ang, 0));
  // crow's nest platform
  const cnP = shipLocal(10, 0); Spots.crowsNest = { x: cnP.x, z: cnP.z, y: S.deck + 34 * 0.86 + 0.5 };
  Colliders.addBox(cnP.x, cnP.z, 1.8, 1.8, rot, Spots.crowsNest.y, { walk: true, solid: false });
  Colliders.addCircle(cnP.x, cnP.z, 0.6, S.deck + 34 * 0.86);
  const m1 = shipLocal(-6, 0), m3 = shipLocal(S.L - 4, 0);
  Colliders.addCircle(m1.x, m1.z, 0.6, S.deck + 30); Colliders.addCircle(m3.x, m3.z, 0.6, S.deck + 22);
  Spots.mastBase = shipLocal(11.5, 0);
  // cannons (visual) along sides
  Spots.cannons = [];
  for (const sd of [-1, 1]) for (const lx of [-10, 0, 10]) {
    const p = shipLocal(lx, sd * 5.2);
    const g = new THREE.Group(); g.position.set(p.x, S.deck, p.z); g.rotation.y = -S.ang + (sd > 0 ? 0 : Math.PI);
    g.add(meshOf([part(box(1.2, 0.6, 1.6), 0x5a3f2c, { y: 0.3 }), part(cyl(0.3, 0.38, 2.2, 8), 0x2a2a30, { y: 0.8, z: 0.6, rx: Math.PI / 2 }), part(cyl(0.35, 0.35, 0.12, 8), 0x2a2a30, { y: 0.15, x: 0.65, rz: Math.PI / 2 }), part(cyl(0.35, 0.35, 0.12, 8), 0x2a2a30, { y: 0.15, x: -0.65, rz: Math.PI / 2 })]));
    W.scene.add(g);
    const mz = shipLocal(lx, sd * 7.2);
    Spots.cannons.push({ g, x: p.x, z: p.z, mx: mz.x, mz: mz.z, cd: rand(1, 4) });
    Colliders.addCircle(p.x, p.z, 0.8, S.deck + 1.2);
  }
  // treasure on quarterdeck
  const tq = shipLocal(-S.L + 4, 0); Spots.shipTreasure = { x: tq.x, z: tq.z, y: S.aft };
  const q = shipLocal(-S.L + 9, 0); Spots.captainSpot = { x: q.x, z: q.z, y: S.aft };
  Spots.mainDeck = shipLocal(2, 0); Spots.foreDeck = shipLocal(S.L - 6, 0);
  for (let i = 0; i < 8; i++) { const lx = rand(-S.L + 18, S.L - 14), lz = pick([-1, 1]) * rand(3.5, 5); if (Math.abs(lx - 4) < 3 || Math.abs(lx + 4) < 3 || lx < -S.L + 24 || lx > S.L - 20) continue; const p = shipLocal(lx, lz); ps(i % 2 ? 'barrel' : 'crate', i % 2 ? 'barrel' : 'crate').add(p.x, S.deck, p.z, 1, rand(0, 3)); Colliders.addCircle(p.x, p.z, 0.6, S.deck + 1.1); }
  addLandmark('ship', 'The Blackwake', S.x, S.z, 40);
  // anchor chain visual
  const ac = shipLocal(S.L + 2, 3);
  Batch.add(place([part(cyl(0.12, 0.12, 12, 4), 0x3a3a3a, { y: 0, rz: 0.5 })], ac.x, 1, ac.z));
}

// ── Scatter nature everywhere ──
function scatterNature() {
  const rng = mulberry32(42);
  scatter(4200, [-500, -500, 500, 500], (x, z, h, r) => {
    if (h < 1.6 || isAvoided(x, z, 1.5)) return;
    const reg = regionAt(x, z); const sl = Terrain.normalSlope(x, z);
    const pathD = inPath(x, z); if (pathD < 3 && h < 30) return;
    const dv = Math.hypot(x, z);
    const n = fbm(x * 0.03 + 50, z * 0.03, 2);
    if (Math.hypot(x - P.nest.x, z - P.nest.z) < 160) { if (r() < 0.06 && Math.hypot(x - P.nest.x, z - P.nest.z) > 60) ps('basalt', 'basalt').add(x, h - 0.3, z, 0.6 + r(), r() * TAU); return; }
    if (reg === 'frost' || z < -150) {
      if (h > 80) { if (r() < 0.25) ps('snowrock', 'snowrock').add(x, h - 0.3, z, 0.8 + r() * 2.4, r() * TAU); return; }
      if (sl > 1.3) { if (r() < 0.2) ps('rock', 'rock').add(x, h - 0.3, z, 1 + r() * 2.5, r() * TAU); return; }
      if (n > 0.45 && r() < 0.6) buildTree(x, z, h > 40 ? 'snowpine' : 'pine', 0.9 + r() * 0.8);
      else if (r() < 0.12) ps(h > 45 ? 'snowrock' : 'mossrock', h > 45 ? 'snowrock' : 'mossrock').add(x, h - 0.3, z, 0.6 + r() * 1.4, r() * TAU);
      return;
    }
    if (reg === 'nest') return;
    if (reg === 'beach' && h < 4.5) return;
    if (reg === 'lagoon') { if (r() < 0.25 && h > 3) buildTree(x, z, r() < 0.5 ? 'palm' : 'oak', 0.9 + r() * 0.5); return; }
    if (Math.hypot(x - P.nest.x, z - P.nest.z) < 160) { if (r() < 0.06) ps('basalt', 'basalt').add(x, h - 0.3, z, 0.6 + r(), r() * TAU); return; }
    if (dv < 70) {
      if (r() < 0.05) buildTree(x, z, r() < 0.5 ? 'blossom' : 'oak', 0.8 + r() * 0.4);
      else if (r() < 0.25) ps('flower', 'flower').add(x, h, z, 0.8 + r() * 0.6, r() * TAU, { tint: hexLin(pick([0xf2779a, 0xf7c548, 0xb985f0, 0xffffff, 0x7ab8ff])) });
      else if (r() < 0.4) ps('grass', 'grass').add(x, h, z, 0.8 + r() * 0.6, r() * TAU, { tint: hexLin(pick([0x6fae4f, 0x86c25a, 0x5a9a42])) });
      return;
    }
    if (n > 0.52 && r() < 0.55) buildTree(x, z, r() < 0.2 ? 'pine' : r() < 0.12 ? 'blossom' : 'oak', 0.9 + r() * 0.7);
    else if (r() < 0.06) ps('bush', 'bush').add(x, h, z, 0.8 + r() * 0.8, r() * TAU);
    else if (r() < 0.05) ps('mossrock', 'mossrock').add(x, h - 0.2, z, 0.6 + r() * 1.6, r() * TAU);
    else if (r() < 0.2) ps('flower', 'flower').add(x, h, z, 0.8 + r() * 0.6, r() * TAU, { tint: hexLin(pick([0xf2779a, 0xf7c548, 0xb985f0, 0xffffff])) });
    else if (r() < 0.25) ps('grass', 'grass').add(x, h, z, 0.8 + r() * 0.8, r() * TAU, { tint: hexLin(pick([0x6fae4f, 0x86c25a, 0x9bc95a])) });
    else if (r() < 0.03) ps('mushroom', 'mushroom').add(x, h, z, 0.7 + r() * 0.8, r() * TAU, { tint: hexLin(pick([0xe2573a, 0xf6efe2, 0xb985f0])) });
  }, rng);
  // sea stacks with rings (optional sky course near east coast)
  Spots.stackRings = [];
  [[300, 120], [330, 60], [318, 0], [290, -60]].forEach(([x, z], i) => {
    const h = gy(x, z); const top = 18 + i * 4;
    Batch.add(place([part(cyl(4, 6, top - h, 7), 0x8b8f9c, { y: (top - h) / 2, jit: 0.15 }), part(ico(4.4, 0), 0x6f9a52, { y: top - h, sy: 0.35 })], x, h, z));
    Colliders.addCircle(x, z, 5, top); Colliders.addBox(x, z, 3.5, 3.5, 0, top + 0.6, { walk: true, solid: false });
    Spots.stackRings.push({ x: x - 14, z, y: top + 6 });
  });
  addLandmark('stacks', 'The Sea Stacks', 315, 30, 30);
  // clouds high up
  for (let i = 0; i < 40; i++) ps('cloud', 'cloud', { material: new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: linColor(0x9aa8b8), transparent: true, opacity: 0.85, fog: false, depthWrite: false }), shadow: false }).add(rand(-500, 500), rand(95, 140), rand(-500, 500), rand(0.8, 1.8), rand(0, TAU));
}

function buildGlows() {
  // additive glow sprites as single Points cloud
  const n = W.glows.length; const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n);
  W.glows.forEach((g, i) => { pos[i * 3] = g.x; pos[i * 3 + 1] = g.y; pos[i * 3 + 2] = g.z; const c = hexLin(g.c); col.set(c, i * 3); size[i] = g.s; });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: TEX.soft }, uScale: { value: pointScale() }, uTime: { value: 0 }, uNight: { value: 0.4 } },
    vertexShader: `attribute float size; attribute vec3 color; varying vec3 vC; uniform float uScale; uniform float uTime; varying float vF;
      void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); float fl = 0.9 + 0.1*sin(uTime*3.0 + position.x*1.7 + position.z);
        vF = fl; gl_PointSize = size * fl * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D uTex; uniform float uNight; varying vec3 vC; varying float vF; void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vC * t.a * (0.55 + uNight) * vF, 1.0); ${COLORSPACE_CHUNK} }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 5; W.scene.add(pts); W.glowMat = mat;
}

function buildWorld() {
  W.glows = [];
  Terrain.bake();
  buildTerrainMesh();
  buildWater(); buildSky(); buildLava();
  buildProtos();
  buildVillage(); buildFrost(); buildNest(); buildBeach(); buildLagoon(); buildShip();
  scatterNature();
  buildPropSets();
  Batch.build();
  buildGlows();
}
