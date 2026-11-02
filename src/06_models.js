// ───────────────────────── character & creature models ─────────────────────────
function grp(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); if (parent) parent.add(g); return g; }
function addMesh(parent, parts, mat) { const m = meshOf(parts, mat); parent.add(m); return m; }

// ───── Humans ─────
const AGE = [
  { leg: 0.42, torso: 0.4, head: 0.29, w: 0.36, arm: 0.42, hunch: 0, scale: 1 },
  { leg: 0.66, torso: 0.54, head: 0.255, w: 0.42, arm: 0.6, hunch: 0, scale: 1 },
  { leg: 0.8, torso: 0.62, head: 0.25, w: 0.5, arm: 0.7, hunch: 0, scale: 1 },
  { leg: 0.76, torso: 0.6, head: 0.25, w: 0.5, arm: 0.68, hunch: 0.16, scale: 1 },
];
function buildHuman(o) {
  const a = AGE[o.age];
  const root = new THREE.Group();
  const H = { root, age: o.age, opt: o, t: Math.random() * 10 };
  const skin = o.skin || 0xf1c6a0, hair = o.age === 3 ? (o.elderHair || 0xe8e6e2) : o.hair || 0x6b4226;
  const top = o.top || 0x5b8fd6, bottom = o.bottom || 0x5a4a3a, boots = o.boots || 0x4a3426, accent = o.accent || 0xe2573a;
  H.hips = grp(root, 0, a.leg, 0);
  // legs
  H.legs = [-1, 1].map((s) => {
    const g = grp(H.hips, s * a.w * 0.24, 0, 0);
    addMesh(g, [
      part(box(a.w * 0.34, a.leg * 0.62, a.w * 0.36), bottom, { y: -a.leg * 0.31 }),
      part(box(a.w * 0.3, a.leg * 0.42, a.w * 0.32), o.age === 0 ? skin : bottom, { y: -a.leg * 0.72 }),
      part(box(a.w * 0.36, a.leg * 0.16, a.w * 0.5), boots, { y: -a.leg * 0.92, z: a.w * 0.06 }),
    ]);
    return g;
  });
  // torso
  H.torso = grp(H.hips, 0, 0, 0);
  H.torso.rotation.x = a.hunch;
  const tp = [
    part(box(a.w, a.torso * 0.75, a.w * 0.6), top, { y: a.torso * 0.5 }),
    part(box(a.w * 1.02, a.torso * 0.12, a.w * 0.62), o.belt || 0x6b4a2a, { y: a.torso * 0.12 }),
    part(box(a.w * 0.92, a.torso * 0.22, a.w * 0.56), o.age === 3 ? (o.robe || top) : top, { y: a.torso * 0.02 }),
  ];
  if (o.age === 3 || o.robe) tp.push(part(cyl(a.w * 0.52, a.w * 0.62, a.leg * 0.65, 8), o.robe || top, { y: -a.leg * 0.28, sz: 0.72 }));
  if (o.vest) tp.push(part(box(a.w * 1.04, a.torso * 0.6, a.w * 0.64), o.vest, { y: a.torso * 0.5, z: 0.0, sx: 1, sy: 1, sz: 1 }));
  if (o.straps) { tp.push(part(box(a.w * 0.12, a.torso * 0.8, a.w * 0.64), 0x5a3a24, { x: a.w * 0.2, y: a.torso * 0.5, rz: 0.5 })); }
  addMesh(H.torso, tp);
  // scarf / cloak (accent)
  H.scarf = grp(H.torso, 0, a.torso * 0.86, -a.w * 0.25);
  if (o.scarf !== false) {
    addMesh(H.torso, [part(tor(a.w * 0.3, a.w * 0.1, 5, 10), accent, { y: a.torso * 0.88, rx: Math.PI / 2 })]);
    addMesh(H.scarf, [part(box(a.w * 0.22, a.torso * 0.7, 0.05), accent, { y: -a.torso * 0.32, x: a.w * 0.1 }), part(box(a.w * 0.18, a.torso * 0.55, 0.05), accent, { y: -a.torso * 0.26, x: -a.w * 0.12 })]);
  }
  if (o.cloak) addMesh(H.scarf, [part(box(a.w * 1.1, a.torso * 1.5 + a.leg * 0.4, 0.06), o.cloak, { y: -(a.torso * 1.5 + a.leg * 0.4) / 2 + 0.05 }), part(box(a.w * 1.15, 0.06, 0.08), o.trim || 0xf2c45a, { y: -(a.torso * 1.5 + a.leg * 0.4) + 0.08 })]);
  // head
  H.head = grp(H.torso, 0, a.torso * 0.92, 0);
  const hr = a.head;
  const hp = [
    part(ico(hr, 1), skin, { y: hr * 0.95, sy: 1.05 }),
    part(box(hr * 0.22, hr * 0.22, hr * 0.2), skin, { y: hr * 0.85, z: hr * 0.95 }), // nose
    part(box(hr * 0.2, hr * 0.26, hr * 0.06), 0x2a2230, { x: -hr * 0.38, y: hr * 1.05, z: hr * 0.95 }),
    part(box(hr * 0.2, hr * 0.26, hr * 0.06), 0x2a2230, { x: hr * 0.38, y: hr * 1.05, z: hr * 0.95 }),
  ];
  if (o.age === 0 || o.blush) hp.push(part(box(hr * 0.22, hr * 0.12, 0.04), 0xf29a9a, { x: -hr * 0.56, y: hr * 0.78, z: hr * 0.8 }), part(box(hr * 0.22, hr * 0.12, 0.04), 0xf29a9a, { x: hr * 0.56, y: hr * 0.78, z: hr * 0.8 }));
  // hair styles
  const hs = o.hairStyle || 'short';
  hp.push(part(ico(hr * 1.06, 1), hair, { y: hr * 1.15, z: -hr * 0.1, sy: 0.85, sz: 1.02 }));
  if (o.age !== 3 || hs === 'long') {
    if (hs === 'long') hp.push(part(box(hr * 1.9, hr * 1.5, hr * 0.5), hair, { y: hr * 0.5, z: -hr * 0.62 }));
    if (hs === 'pony') hp.push(part(cone(hr * 0.35, hr * 1.4, 5), hair, { y: hr * 0.6, z: -hr * 1.1, rx: -2.6 }));
    if (hs === 'buns') hp.push(part(sph(hr * 0.38, 6, 5), hair, { x: -hr * 0.8, y: hr * 1.6 }), part(sph(hr * 0.38, 6, 5), hair, { x: hr * 0.8, y: hr * 1.6 }));
    if (hs === 'spiky') for (let i = 0; i < 5; i++) hp.push(part(cone(hr * 0.25, hr * 0.6, 4), hair, { x: (i - 2) * hr * 0.35, y: hr * 1.85, z: -hr * 0.1, rz: (i - 2) * -0.3 }));
  }
  if (o.age === 3) {
    hp.push(part(box(hr * 0.6, hr * 0.1, hr * 0.1), hair, { x: -hr * 0.38, y: hr * 1.32, z: hr * 0.92 }), part(box(hr * 0.6, hr * 0.1, hr * 0.1), hair, { x: hr * 0.38, y: hr * 1.32, z: hr * 0.92 })); // brows
    if (o.beard) hp.push(part(cone(hr * 0.7, hr * 1.2, 6), hair, { y: hr * 0.3, z: hr * 0.62, rx: Math.PI, sz: 0.6 }));
    if (hs === 'bun' || hs === 'buns' || hs === 'long') hp.push(part(sph(hr * 0.45, 6, 5), hair, { y: hr * 1.9, z: -hr * 0.3 }));
  }
  if (o.hat === 'wizard') hp.push(part(cone(hr * 1.1, hr * 2.4, 8), o.hatColor || 0x5a4a8a, { y: hr * 2.6, rx: -0.15 }), part(cyl(hr * 1.6, hr * 1.6, hr * 0.12, 10), o.hatColor || 0x5a4a8a, { y: hr * 1.6 }));
  if (o.hat === 'tricorn') { hp.push(part(cyl(hr * 1.5, hr * 1.4, hr * 0.5, 3), o.hatColor || 0x2a2228, { y: hr * 1.85, ry: Math.PI / 6 }), part(cyl(hr * 0.9, hr * 1.0, hr * 0.7, 8), o.hatColor || 0x2a2228, { y: hr * 2.1 })); }
  if (o.hat === 'bandana') hp.push(part(ico(hr * 1.1, 1), o.hatColor || 0xc0392b, { y: hr * 1.3, sy: 0.6 }), part(box(hr * 0.3, hr * 0.7, hr * 0.1), o.hatColor || 0xc0392b, { y: hr * 0.9, z: -hr * 1.05, rz: 0.4 }));
  if (o.hat === 'straw') hp.push(part(cyl(hr * 1.7, hr * 1.7, hr * 0.1, 10), 0xe7c46a, { y: hr * 1.7 }), part(cyl(hr * 0.9, hr * 1.0, hr * 0.6, 10), 0xe7c46a, { y: hr * 1.95 }), part(cyl(hr * 1.02, hr * 1.02, hr * 0.15, 10), 0xc0392b, { y: hr * 1.8 }));
  if (o.hat === 'hood') hp.push(part(ico(hr * 1.25, 1), o.hatColor || 0x6a8a5a, { y: hr * 1.1, z: -hr * 0.2, sz: 1.1 }));
  if (o.hat === 'circlet') hp.push(part(tor(hr * 1.0, hr * 0.08, 4, 14), 0xf2c45a, { y: hr * 1.45, rx: Math.PI / 2 }), part(ico(hr * 0.16, 0), 0x7fe0ff, { y: hr * 1.5, z: hr * 1.0 }));
  if (o.eyepatch) hp.push(part(box(hr * 0.36, hr * 0.32, hr * 0.08), 0x111111, { x: hr * 0.38, y: hr * 1.05, z: hr * 0.94 }));
  H.headMesh = addMesh(H.head, hp);
  // arms
  H.arms = [-1, 1].map((s) => {
    const g = grp(H.torso, s * (a.w * 0.5 + a.w * 0.12), a.torso * 0.8, 0);
    addMesh(g, [
      part(box(a.w * 0.24, a.arm * 0.55, a.w * 0.26), o.sleeve || top, { y: -a.arm * 0.27 }),
      part(box(a.w * 0.22, a.arm * 0.4, a.w * 0.24), o.age === 0 ? skin : (o.forearm || o.sleeve || top), { y: -a.arm * 0.7 }),
      part(ico(a.w * 0.16, 0), o.glove || skin, { y: -a.arm * 0.95 }),
    ]);
    return g;
  });
  if (o.hook) addMesh(H.arms[0], [part(tor(a.w * 0.14, 0.03, 4, 8, Math.PI * 1.3), 0xcfd3da, { y: -a.arm * 1.12 })]);
  H.hand = grp(H.arms[1], 0, -a.arm * 0.95, 0.04);
  H.height = a.leg + a.torso + hr * 2;
  root.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  H.weaponMesh = null;
  return H;
}

const WEAPON_DEF = {
  stick: { name: 'Training Stick', dmg: 10, speed: 0.36, combo: 2, reach: 2.0, arc: 1.6, kb: 3, desc: 'A trusty practice stick.' },
  cutlass: { name: 'Swift Cutlass', dmg: 9, speed: 0.24, combo: 3, reach: 2.3, arc: 1.8, kb: 2.5, desc: 'Fast three-hit combo. Dance around your foes.' },
  anchor: { name: 'Anchor Hammer', dmg: 26, speed: 0.7, combo: 1, reach: 2.7, arc: 3.6, kb: 11, aoe: 3.2, desc: 'Slow, heavy swings that scatter crowds.' },
  saber: { name: "Grimtide's Saber", dmg: 15, speed: 0.3, combo: 3, reach: 2.6, arc: 2.0, kb: 4, desc: 'Balanced and keen. The finisher strikes twice as hard.' },
};
function weaponGeo(kind) {
  if (kind === 'stick') return [part(cyl(0.05, 0.06, 1.1, 5), 0x9b6a3c, { y: 0.55 }), part(box(0.28, 0.06, 0.08), 0x6b4a2a, { y: 0.2 })];
  if (kind === 'cutlass') return [part(box(0.07, 0.3, 0.07), 0x5a3a24, { y: 0.1 }), part(tor(0.12, 0.025, 3, 8, Math.PI), 0xe2b44a, { y: 0.16, rz: 0 }), part(box(0.12, 1.0, 0.03), 0xdfe5ee, { y: 0.78, rz: 0.08 }), part(cone(0.06, 0.2, 3), 0xdfe5ee, { y: 1.35, rz: 0.08 })];
  if (kind === 'anchor') return [part(cyl(0.06, 0.06, 1.4, 6), 0x6a6f7a, { y: 0.7 }), part(tor(0.12, 0.04, 4, 8), 0x6a6f7a, { y: 1.45 }), part(box(0.7, 0.1, 0.1), 0x6a6f7a, { y: 1.2 }), part(tor(0.42, 0.08, 4, 10, Math.PI), 0x7a808c, { y: 0.32, rz: Math.PI }), part(cone(0.12, 0.25, 4), 0x7a808c, { x: 0.42, y: 0.36 }), part(cone(0.12, 0.25, 4), 0x7a808c, { x: -0.42, y: 0.36 })];
  return [part(box(0.07, 0.3, 0.07), 0x2a2228, { y: 0.1 }), part(box(0.34, 0.06, 0.1), 0xf2c45a, { y: 0.26 }), part(box(0.1, 1.15, 0.03), 0xeef2f8, { y: 0.9, rz: 0.12 }), part(ico(0.06, 0), 0xe23a5a, { y: 0.0 })];
}
function setHumanWeapon(H, kind) {
  if (H.weaponMesh) { H.hand.remove(H.weaponMesh); H.weaponMesh = null; }
  if (!kind) return;
  H.weaponMesh = meshOf(weaponGeo(kind)); H.weaponMesh.rotation.x = Math.PI / 2; H.weaponMesh.scale.setScalar(H.age === 0 ? 0.7 : 1);
  H.hand.add(H.weaponMesh);
}

// animation state: {speed, mode:'walk'|'ride'|'swim'|'dive'|'sit'|'roll', attack:0..1, wave, celebrate, pet, talk}
function animateHuman(H, s, dt) {
  H.t += dt;
  const a = AGE[H.age];
  const sp = s.speed || 0;
  const t = H.t;
  let legSwing = 0, armSwing = 0, bob = 0;
  H.root.rotation.x = 0; H.root.rotation.z = 0;
  H.hips.position.y = a.leg; H.torso.rotation.x = a.hunch; H.torso.rotation.z = 0; H.torso.rotation.y = 0; H.head.rotation.set(0, 0, 0);
  H.hips.rotation.set(0, 0, 0);
  if (s.mode === 'ride') {
    H.legs[0].rotation.set(-1.2, 0, -0.55); H.legs[1].rotation.set(-1.2, 0, 0.55);
    H.hips.position.y = 0; H.torso.rotation.x = 0.2 + Math.sin(t * 6) * 0.02 * Math.min(1, sp / 10);
    H.arms[0].rotation.set(-0.9, 0, -0.2); H.arms[1].rotation.set(-0.9, 0, 0.2);
    if (s.lean) H.torso.rotation.z = -s.lean * 0.5;
    if (s.boost) { H.torso.rotation.x = 0.55; }
  } else if (s.mode === 'swim' || s.mode === 'dive') {
    const k = s.mode === 'dive' ? 1 : 0.6;
    H.root.rotation.x = s.mode === 'dive' ? 1.25 : 0.9;
    const st = t * (3 + sp * 0.6);
    H.arms[0].rotation.set(-2.6 + Math.sin(st) * 1.0 * k, 0, -0.4); H.arms[1].rotation.set(-2.6 + Math.sin(st + Math.PI) * 1.0 * k, 0, 0.4);
    H.legs[0].rotation.set(Math.sin(st * 1.4) * 0.4, 0, 0); H.legs[1].rotation.set(Math.sin(st * 1.4 + Math.PI) * 0.4, 0, 0);
    H.head.rotation.x = -0.9;
  } else if (s.mode === 'sit') {
    H.hips.position.y = a.leg * 0.45;
    H.legs[0].rotation.set(-1.4, 0, 0); H.legs[1].rotation.set(-1.4, 0, 0);
    H.arms[0].rotation.set(-0.3, 0, 0.1); H.arms[1].rotation.set(-0.3, 0, -0.1);
  } else if (s.mode === 'roll') {
    H.root.rotation.x = s.roll * TAU; H.hips.position.y = a.leg * 0.6;
    H.legs[0].rotation.set(-1.5, 0, 0); H.legs[1].rotation.set(-1.5, 0, 0);
    H.arms[0].rotation.set(-1.2, 0, 0); H.arms[1].rotation.set(-1.2, 0, 0);
  } else if (s.mode === 'climb') {
    const st = t * 8;
    H.arms[0].rotation.set(-2.8 + Math.sin(st) * 0.4, 0, 0); H.arms[1].rotation.set(-2.8 - Math.sin(st) * 0.4, 0, 0);
    H.legs[0].rotation.set(-0.6 + Math.sin(st) * 0.5, 0, 0); H.legs[1].rotation.set(-0.6 - Math.sin(st) * 0.5, 0, 0);
  } else {
    const f = sp > 0.3 ? Math.min(1, sp / 7) : 0;
    const cad = H.age === 0 ? 11 : 8.5;
    const ph = t * cad * (0.6 + Math.min(1.6, sp / 7) * 0.55);
    legSwing = Math.sin(ph) * 0.75 * f; armSwing = Math.sin(ph) * 0.65 * f;
    bob = Math.abs(Math.sin(ph)) * 0.08 * f * (H.age === 0 ? 1.4 : 1);
    H.legs[0].rotation.set(legSwing, 0, 0); H.legs[1].rotation.set(-legSwing, 0, 0);
    H.arms[0].rotation.set(-armSwing, 0, -0.08); H.arms[1].rotation.set(armSwing, 0, 0.08);
    H.hips.position.y = a.leg + bob + (f === 0 ? Math.sin(t * 2) * 0.008 : 0);
    H.torso.rotation.x = a.hunch + f * (sp > 8 ? 0.22 : 0.06);
    if (f === 0) { H.torso.rotation.z = Math.sin(t * 1.3) * 0.015; H.head.rotation.y = Math.sin(t * 0.7) * 0.15; }
  }
  // overlays
  if (s.attack > 0) {
    const p = s.attack; // 1 → 0
    const sw = s.heavy ? easeInOut(1 - p) : easeOut(1 - p);
    const dir = s.swingDir || 1;
    if (s.heavy) { H.arms[1].rotation.set(-2.8 + sw * 3.2, 0, 0.1); H.arms[0].rotation.set(-2.6 + sw * 3.0, 0, -0.1); H.torso.rotation.x = a.hunch - 0.2 + sw * 0.5; }
    else { H.arms[1].rotation.set(-1.5, 0, 0); H.arms[1].rotation.y = 0; H.torso.rotation.y = dir * (-0.9 + sw * 1.8); H.arms[1].rotation.z = dir * (1.2 - sw * 1.6); }
  }
  if (s.pet > 0) { H.arms[1].rotation.set(-1.3 + Math.sin(t * 12) * 0.15, 0, 0.1); H.torso.rotation.x = a.hunch + 0.25; }
  if (s.wave) { H.arms[1].rotation.set(-2.9, 0, 0.3 + Math.sin(t * 10) * 0.35); }
  if (s.celebrate) { H.arms[0].rotation.set(-2.9, 0, -0.3); H.arms[1].rotation.set(-2.9, 0, 0.3); H.hips.position.y += Math.abs(Math.sin(t * 7)) * 0.25; }
  if (s.talk) { H.head.rotation.x = Math.sin(t * 9) * 0.06; H.arms[0].rotation.x = -0.4 + Math.sin(t * 3) * 0.2; }
  if (s.hurt > 0) { H.torso.rotation.x = a.hunch - 0.35 * s.hurt; }
  if (s.throwT > 0) { H.arms[1].rotation.set(-2.6 + (1 - s.throwT) * 2.5, 0, 0); }
  if (s.carry) { H.arms[0].rotation.set(-1.2, 0, 0.3); H.arms[1].rotation.set(-1.2, 0, -0.3); }
  if (s.lookYaw !== undefined) H.head.rotation.y = clamp(s.lookYaw, -1, 1);
  // scarf flutter
  if (H.scarf) H.scarf.rotation.x = 0.15 + Math.min(1.2, sp * 0.06) + Math.sin(t * 9) * 0.05 * Math.min(1, sp / 6);
}

// ───── Creatures ─────
const CREATURE_DEF = {
  ember: {
    name: 'Emberwing', kind: 'Young dragon', element: 'Fire',
    pal: { body: 0xe2573a, belly: 0xf8d28a, horn: 0xf6ead0, wing: 0xf39a48, wingBone: 0xb8402a, eye: 0xffb020, mark: 0xffd34d, dark: 0x9a2f22, glow: 0xffb347 },
    blurb: 'Playful and bold. Breathes fire and hits hard.',
    ability: ['Spark Puff', 'Flame Breath', 'Flame Breath', 'Inferno Breath'],
  },
  cloud: {
    name: 'Cloudclaw', kind: 'Young griffin', element: 'Wind',
    pal: { body: 0xd9a75e, belly: 0xf3e2bf, horn: 0xf2c14a, wing: 0xf7f4ee, wingBone: 0xdcd2c2, eye: 0x3a8fd6, mark: 0x8fc6ff, dark: 0x9c6c34, glow: 0xbfe3ff, head: 0xfaf6ee },
    blurb: 'Brave and quick. Nimble in the air with powerful gusts.',
    ability: ['Feather Flurry', 'Gale Gust', 'Gale Gust', 'Cyclone'],
  },
  moon: {
    name: 'Moonfin', kind: 'Winged sea-wyrm', element: 'Water',
    pal: { body: 0x7cc6e8, belly: 0xe9f4ff, horn: 0xc9b6ff, wing: 0xa8e6f2, wingBone: 0x6aa8d6, eye: 0x6a4ad6, mark: 0xd8f6ff, dark: 0x4a86c0, glow: 0x9ff3ff },
    blurb: 'Gentle and curious. Swims swiftly and blows healing bubbles.',
    ability: ['Bubble Pop', 'Bubble Ward', 'Bubble Ward', 'Tidal Orb'],
  },
};
const STAGE_INFO = [
  { title: 'Child & Hatchling', short: 'Hatchling' },
  { title: 'Teen & Juvenile', short: 'Juvenile' },
  { title: 'Adult & Mature', short: 'Mature' },
  { title: 'Elder & Legendary', short: 'Legendary' },
];
const C_STAGE = [
  { scale: 0.58, head: 1.55, legs: 0.85, wing: 0.55, neck: 0.65, tail: 0.75 },
  { scale: 1.0, head: 1.15, legs: 1.0, wing: 1.25, neck: 1.0, tail: 1.0 },
  { scale: 1.6, head: 1.0, legs: 1.0, wing: 2.1, neck: 1.15, tail: 1.25 },
  { scale: 1.72, head: 1.0, legs: 1.0, wing: 2.25, neck: 1.2, tail: 1.35 },
];
function mixHex(a, b, t) { const ca = [(a >> 16) & 255, (a >> 8) & 255, a & 255], cb = [(b >> 16) & 255, (b >> 8) & 255, b & 255]; return (Math.round(lerp(ca[0], cb[0], t)) << 16) | (Math.round(lerp(ca[1], cb[1], t)) << 8) | Math.round(lerp(ca[2], cb[2], t)); }

function buildCreature(type, stage, palOverride) {
  const def = CREATURE_DEF[type];
  const pal = Object.assign({}, def.pal, palOverride || {});
  if (stage === 3) { // legendary: weathered silvering + gold
    pal.body = mixHex(pal.body, 0xe8e2f0, 0.22); pal.dark = mixHex(pal.dark, 0xd8c8a0, 0.3); pal.horn = 0xf6d878; pal.mark = 0xffe08a;
  }
  const S = C_STAGE[stage];
  const root = new THREE.Group();
  const scaler = grp(root); scaler.scale.setScalar(S.scale);
  const C = { root, scaler, type, stage, pal, t: Math.random() * 10, blink: 0, nextBlink: 2, wings: [], tail: [], legs: [], eyes: [], glow: [], mood: 'idle', moodT: 0 };
  const legH = 0.55 * S.legs * (type === 'moon' ? 0.75 : 1);
  const bodyL = 1.5, bodyH = 0.85, bodyW = 0.85;
  C.legH = legH; C.dims = { bodyL, bodyH, bodyW };
  C.body = grp(scaler, 0, legH + bodyH * 0.45, 0);
  const bp = [];
  const glowMesh = [];
  if (type === 'ember') {
    bp.push(part(ico(0.5, 1), pal.body, { sx: bodyW * 1.0, sy: bodyH * 1.05, sz: bodyL * 0.95, jit: 0.08 }));
    bp.push(part(ico(0.42, 1), pal.belly, { y: -0.12, z: 0.1, sx: bodyW * 0.9, sy: bodyH * 0.85, sz: bodyL * 0.85 }));
    const spikes = stage >= 2 ? 5 : stage === 1 ? 3 : 0;
    for (let i = 0; i < spikes; i++) bp.push(part(cone(0.09, 0.26, 4), stage === 3 ? pal.horn : pal.dark, { y: 0.42 - Math.abs(i - 2) * 0.03, z: 0.4 - i * 0.22, rx: -0.4 }));
    if (stage >= 2) for (let i = 0; i < 3; i++) glowMesh.push(part(box(0.5, 0.05, 0.08), pal.mark, { y: 0.38, z: 0.2 - i * 0.28, x: 0, sx: 1 - i * 0.2 }));
  } else if (type === 'cloud') {
    bp.push(part(ico(0.5, 1), pal.body, { sx: bodyW * 0.95, sy: bodyH * 1.0, sz: bodyL * 1.0, jit: 0.06 }));
    bp.push(part(ico(0.46, 1), pal.head, { y: 0.06, z: 0.42, sx: bodyW * 0.95, sy: bodyH * 1.05, sz: 0.8, jit: 0.15 })); // feathered chest
    if (stage >= 2) for (let i = 0; i < 4; i++) glowMesh.push(part(box(0.06, 0.06, 0.3), pal.mark, { x: (i % 2 ? 1 : -1) * 0.42, y: 0.1 - Math.floor(i / 2) * 0.16, z: -0.2 }));
  } else {
    bp.push(part(ico(0.5, 1), pal.body, { sx: bodyW * 0.85, sy: bodyH * 0.95, sz: bodyL * 1.05 }));
    bp.push(part(ico(0.44, 1), pal.belly, { y: -0.12, z: 0.06, sx: bodyW * 0.75, sy: bodyH * 0.75, sz: bodyL * 0.9 }));
    for (let i = 0; i < (stage + 1) * 2; i++) glowMesh.push(part(sph(0.06 + (i % 2) * 0.02, 5, 4), pal.mark, { x: (i % 2 ? 1 : -1) * 0.34, y: 0.18, z: 0.3 - Math.floor(i / 2) * 0.22 }));
    // dorsal fin
    bp.push(part(triGeo([[0, 0.38, 0.4], [0, 0.38, -0.5], [0, 0.85 + stage * 0.08, -0.3]], [[0, 1, 2], [0, 2, 1]]), pal.wing, {}));
  }
  addMesh(C.body, bp);
  if (glowMesh.length) { C.glow.push(addMesh(C.body, glowMesh, new THREE.MeshBasicMaterial({ vertexColors: true }))); glowMesh.length = 0; }

  // legs
  const legPos = [[-0.28, 0.42], [0.28, 0.42], [-0.3, -0.42], [0.3, -0.42]];
  legPos.forEach(([lx, lz], i) => {
    const g = grp(scaler, lx, legH, lz);
    const front = i < 2;
    const lp = [];
    if (type === 'cloud' && front) {
      lp.push(part(box(0.16, legH, 0.18), pal.belly, { y: -legH / 2 }), part(box(0.2, 0.06, 0.26), pal.horn, { y: -legH + 0.03, z: 0.06 }));
      lp.push(part(cone(0.03, 0.12, 3), pal.dark, { y: -legH + 0.02, z: 0.2, rx: Math.PI / 2 }));
    } else if (type === 'moon') {
      lp.push(part(box(0.18, legH, 0.2), pal.body, { y: -legH / 2 }), part(triGeo([[-0.14, -legH, 0.05], [0.14, -legH, 0.05], [0, -legH + 0.05, 0.3]], [[0, 1, 2], [0, 2, 1]]), pal.wing, {}));
    } else {
      lp.push(part(box(0.2, legH, 0.22), type === 'cloud' ? pal.body : pal.body, { y: -legH / 2 }), part(box(0.24, 0.08, 0.3), pal.dark, { y: -legH + 0.04, z: 0.05 }));
      if (type === 'ember') lp.push(part(cone(0.03, 0.1, 3), pal.horn, { y: -legH + 0.03, z: 0.22, rx: Math.PI / 2 }));
    }
    addMesh(g, lp);
    C.legs.push(g);
  });

  // neck & head
  C.neck = grp(C.body, 0, 0.22, 0.6);
  const nl = 0.5 * S.neck * (type === 'cloud' ? 0.7 : 1);
  addMesh(C.neck, [part(cyl(0.16, 0.24, nl, 7), type === 'cloud' ? pal.head : pal.body, { y: nl / 2, rx: 0 })]);
  C.neck.rotation.x = -0.5;
  C.headPivot = grp(C.neck, 0, nl, 0);
  C.head = grp(C.headPivot, 0, 0, 0);
  C.head.rotation.x = 0.5;
  C.head.scale.setScalar(S.head);
  const hp = [];
  const hr = 0.32;
  if (type === 'ember') {
    hp.push(part(ico(hr, 1), pal.body, { y: 0.12, sz: 1.1 }));
    hp.push(part(box(0.32, 0.2, 0.36), pal.body, { y: 0.04, z: 0.34 }));
    hp.push(part(box(0.3, 0.06, 0.3), pal.belly, { y: -0.07, z: 0.34 }));
    hp.push(part(sph(0.035, 4, 3), pal.dark, { x: -0.08, y: 0.12, z: 0.52 }), part(sph(0.035, 4, 3), pal.dark, { x: 0.08, y: 0.12, z: 0.52 }));
    const hl = stage === 0 ? 0.14 : stage === 1 ? 0.26 : stage === 2 ? 0.42 : 0.5;
    [-1, 1].forEach((s) => {
      hp.push(part(cone(0.06 + stage * 0.012, hl, 5), pal.horn, { x: s * 0.16, y: 0.36, z: -0.12, rx: -0.9 - (stage === 3 ? 0.5 : 0), rz: s * -0.25 }));
      if (stage === 3) hp.push(part(cone(0.04, 0.2, 4), pal.horn, { x: s * 0.2, y: 0.42, z: -0.45, rx: -2.4, rz: s * -0.2 }));
      hp.push(part(cone(0.06, 0.18, 3), pal.wing, { x: s * 0.3, y: 0.2, z: -0.05, rz: s * -1.2 })); // ear frills
    });
    if (stage === 3) [-1, 1].forEach((s) => hp.push(part(cyl(0.015, 0.008, 0.6, 3), 0xf6e6c0, { x: s * 0.14, y: 0.0, z: 0.5, rz: s * 1.1, rx: 0.3 }))); // whiskers
  } else if (type === 'cloud') {
    hp.push(part(ico(hr * 1.05, 1), pal.head, { y: 0.12, jit: 0.1 }));
    hp.push(part(cone(0.13, 0.32, 4), pal.horn, { y: 0.04, z: 0.38, rx: Math.PI / 2 + 0.35, ry: Math.PI / 4 }));
    hp.push(part(box(0.18, 0.06, 0.14), pal.horn, { y: -0.02, z: 0.26 }));
    const tufts = stage === 0 ? 1 : stage + 1;
    for (let i = 0; i < tufts; i++) hp.push(part(cone(0.06, 0.28 + stage * 0.06, 3), stage === 3 ? 0xdfe6f2 : pal.head, { x: (i - (tufts - 1) / 2) * 0.12, y: 0.42, z: -0.18, rx: -0.9 }));
    [-1, 1].forEach((s) => hp.push(part(cone(0.07, 0.22 + stage * 0.05, 3), pal.mark, { x: s * 0.22, y: 0.36, z: -0.1, rx: -0.6, rz: s * -0.5 })));
    if (stage === 3) hp.push(part(cone(0.18, 0.3, 5), 0xe8edf5, { y: -0.16, z: 0.1, rx: Math.PI }));
  } else {
    hp.push(part(ico(hr, 1), pal.body, { y: 0.1, sz: 1.15, sx: 1.05 }));
    hp.push(part(box(0.26, 0.16, 0.28), pal.body, { y: 0.02, z: 0.32 }));
    hp.push(part(box(0.24, 0.05, 0.24), pal.belly, { y: -0.06, z: 0.32 }));
    // head frill
    const fr = 0.24 + stage * 0.09;
    [-1, 1].forEach((s) => hp.push(part(triGeo([[0, 0, 0], [s * fr * 1.4, fr * 0.6, -0.15], [s * fr * 0.6, fr * 1.4, -0.25]], [[0, 1, 2], [0, 2, 1]]), pal.wing, { x: s * 0.2, y: 0.24, z: -0.05 })));
    hp.push(part(triGeo([[0, 0, 0.1], [0, fr * 1.6, -0.25], [0, 0.04, -0.4]], [[0, 1, 2], [0, 2, 1]]), pal.horn, { y: 0.36 }));
    if (stage === 3) hp.push(part(tor(0.2, 0.025, 4, 10), 0xf6d878, { y: 0.45, rx: Math.PI / 2 }));
  }
  addMesh(C.head, hp);
  // eyes
  [-1, 1].forEach((s) => {
    const e = grp(C.head, s * 0.17, 0.17, 0.25);
    addMesh(e, [
      part(sph(0.1, 8, 6), 0xffffff, { sz: 0.7 }),
      part(sph(0.065, 8, 6), pal.eye, { z: 0.045, sz: 0.6 }),
      part(sph(0.035, 6, 4), 0x141420, { z: 0.07, sz: 0.5 }),
      part(sph(0.022, 4, 3), 0xffffff, { x: s * -0.025, y: 0.03, z: 0.085 }),
    ], new THREE.MeshBasicMaterial({ vertexColors: true }));
    e.rotation.y = s * 0.35;
    C.eyes.push(e);
  });
  // brow lids for expression
  C.lids = [-1, 1].map((s) => { const l = meshOf([part(box(0.2, 0.05, 0.08), type === 'cloud' ? pal.head : pal.body, {})]); l.position.set(s * 0.17, 0.29, 0.25); C.head.add(l); return l; });

  // wings
  const span = 1.0 * S.wing;
  [-1, 1].forEach((s) => {
    const sh = grp(C.body, s * 0.3, 0.28, 0.15);
    const w = grp(sh);
    const wp = [];
    if (type === 'ember') {
      const pts = [[0, 0, 0], [s * span * 0.55, 0.18 * span, -0.05], [s * span, 0.05 * span, -0.15 * span], [s * span * 0.85, 0, -0.55 * span], [s * span * 0.5, 0, -0.62 * span], [s * span * 0.2, 0, -0.5 * span], [0, 0, -0.35]];
      wp.push(part(triGeo(pts, [[0, 1, 6], [1, 5, 6], [1, 2, 5], [2, 4, 5], [2, 3, 4], [0, 6, 1], [1, 6, 5], [1, 5, 2], [2, 5, 4], [2, 4, 3]]), pal.wing, {}));
      wp.push(part(cyl(0.04 * span, 0.06 * span, span * 0.62, 4), pal.wingBone, { x: s * span * 0.28, y: 0.1 * span, rz: s * (Math.PI / 2 - 0.3) }));
      wp.push(part(cyl(0.03 * span, 0.04 * span, span * 0.5, 4), pal.wingBone, { x: s * span * 0.78, y: 0.11 * span, z: -0.07 * span, rz: s * (Math.PI / 2 + 0.3) }));
      wp.push(part(cone(0.04 * span, 0.12 * span, 3), pal.horn, { x: s * span * 0.56, y: 0.22 * span, rz: s * -0.3 }));
      if (stage === 3) glowMesh.length = 0, C.glow.push(addMesh(w, [part(sph(0.05 * span, 4, 3), pal.mark, { x: s * span, y: 0.05 * span, z: -0.15 * span })], new THREE.MeshBasicMaterial({ vertexColors: true })));
    } else if (type === 'cloud') {
      const n = 6;
      wp.push(part(box(span * 0.5, 0.08, 0.32), pal.wing, { x: s * span * 0.25, y: 0.02 }));
      for (let i = 0; i < n; i++) {
        const tt = i / (n - 1);
        const len = span * (0.35 + 0.35 * Math.sin(tt * Math.PI * 0.8 + 0.3));
        const col = i >= n - 2 && stage >= 2 ? (stage === 3 ? 0x7fb0e8 : pal.mark) : pal.wing;
        wp.push(part(box(0.16 * span, 0.04, len), col, { x: s * (0.12 + tt * span * 0.85), y: 0.02 - tt * 0.02, z: -len * 0.45, ry: s * -tt * 0.4, jit: 0.06 }));
      }
    } else {
      const pts = [[0, 0, 0.1], [s * span * 0.7, 0.12 * span, 0.15], [s * span, 0.02, -0.2 * span], [s * span * 0.6, 0, -0.65 * span], [s * span * 0.1, 0, -0.45]];
      wp.push(part(triGeo(pts, [[0, 1, 4], [1, 3, 4], [1, 2, 3], [0, 4, 1], [1, 4, 3], [1, 3, 2]]), pal.wing, {}));
      wp.push(part(cyl(0.025 * span, 0.04 * span, span * 0.75, 4), pal.wingBone, { x: s * span * 0.36, y: 0.07 * span, z: 0.12, rz: s * (Math.PI / 2 - 0.15) }));
      for (let i = 0; i < 3; i++) glowMesh.push(part(sph(0.04 * span, 4, 3), pal.mark, { x: s * span * (0.4 + i * 0.18), y: 0.03, z: -0.2 * span * (i + 1) * 0.6 }));
    }
    addMesh(w, wp, vcMatDS());
    if (type === 'moon') { C.glow.push(addMesh(w, glowMesh.splice(0), new THREE.MeshBasicMaterial({ vertexColors: true }))); }
    C.wings.push({ sh, w, s });
  });

  // tail
  const segs = type === 'cloud' ? 3 : 5;
  let parent = C.body;
  for (let i = 0; i < segs; i++) {
    const g = grp(parent, 0, i === 0 ? 0.05 : 0, i === 0 ? -0.62 : -0.32 * S.tail);
    const r = (0.17 - i * 0.025) * (type === 'cloud' ? 0.5 : 1);
    const tp = [part(cyl(r, r * 0.8, 0.36 * S.tail, 6), type === 'cloud' ? pal.body : pal.body, { z: -0.16 * S.tail, rx: Math.PI / 2 })];
    if (i === segs - 1) {
      if (type === 'ember') tp.push(part(triGeo([[0, 0, 0], [0.22, 0, -0.3], [0, 0, -0.5], [-0.22, 0, -0.3]], [[0, 1, 2], [0, 2, 3], [0, 2, 1], [0, 3, 2]]), pal.dark, { z: -0.3 * S.tail }));
      if (type === 'cloud') tp.push(part(ico(0.16, 0), stage === 3 ? 0xdfe6f2 : pal.dark, { z: -0.42 * S.tail, sz: 1.5 }));
      if (type === 'moon') tp.push(part(triGeo([[0, 0, 0], [0.45, 0.05, -0.45], [0, 0, -0.25], [-0.45, 0.05, -0.45]], [[0, 1, 2], [0, 2, 3], [0, 2, 1], [0, 3, 2]]), pal.wing, { z: -0.3 * S.tail }));
    }
    if (type === 'ember' && stage >= 1 && i < segs - 1) tp.push(part(cone(0.05, 0.16, 4), stage === 3 ? pal.horn : pal.dark, { y: r, z: -0.15, rx: -0.5 }));
    addMesh(g, tp);
    C.tail.push(g); parent = g;
  }
  root.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  // dims for gameplay
  C.seatY = (legH + bodyH * 0.92) * S.scale;
  C.seatZ = 0.05 * S.scale;
  C.headY = (legH + bodyH + 0.5) * S.scale;
  C.radius = 0.7 * S.scale;
  C.span = span * S.scale;
  return C;
}

function creatureWingTips(C, out) {
  // approximate world positions of wing tips (for trails)
  for (let i = 0; i < 2; i++) {
    const w = C.wings[i];
    const v = new THREE.Vector3(w.s * C_STAGE[C.stage].wing * 0.95, 0.05, -0.2);
    w.w.localToWorld(v); out[i] = v;
  }
  return out;
}

// s: {speed, fly, flap, bank, pitch, swim, lookAt (THREE.Vector3 world or null), mood, sit, sleep, dt, hop}
function animateCreature(C, s, dt) {
  C.t += dt;
  const t = C.t, sp = s.speed || 0;
  const st = C.stage;
  // blink
  C.nextBlink -= dt;
  if (C.nextBlink < 0) { C.blink = 0.14; C.nextBlink = 2 + Math.random() * 3; }
  if (C.blink > 0) C.blink -= dt;
  let eyeY = C.blink > 0 ? 0.15 : 1;
  const mood = s.mood || 'idle';
  if (mood === 'happy' || mood === 'celebrate') eyeY = Math.min(eyeY, 0.45 + Math.sin(t * 2) * 0.05);
  if (s.sleep) eyeY = 0.1;
  C.eyes.forEach((e) => (e.scale.y = eyeY));
  C.lids.forEach((l, i) => { const sd = i === 0 ? -1 : 1; l.rotation.z = mood === 'sad' || mood === 'scared' ? sd * 0.5 : mood === 'angry' ? sd * -0.5 : 0; l.position.y = mood === 'angry' ? 0.27 : 0.3; });
  // glow pulse
  for (const g of C.glow) g.visible = true;

  const S = C.scaler;
  S.position.set(0, 0, 0); S.rotation.set(0, 0, 0);
  C.body.rotation.set(0, 0, 0);
  if (s.fly) {
    const flapRate = s.flapRate || (5 + (s.flap || 0) * 6) / (st >= 2 ? 1.25 : 1);
    C.flapPhase = (C.flapPhase || 0) + dt * flapRate;
    const fl = s.flap === undefined ? 1 : s.flap;
    const beat = Math.sin(C.flapPhase);
    C.wings.forEach(({ sh, w, s: sd }) => {
      sh.rotation.set(0, 0, 0);
      w.rotation.z = sd * (beat * (0.25 + 0.75 * fl) * 0.9 + 0.1 - (1 - fl) * 0.05);
      w.rotation.y = 0; w.rotation.x = -0.1;
      w.scale.set(1, 1, 1);
    });
    S.position.y = -beat * 0.08 * fl + Math.sin(t * 2) * 0.05;
    S.rotation.z = -(s.bank || 0);
    S.rotation.x = -(s.pitch || 0) * 0.6;
    C.legs.forEach((l, i) => (l.rotation.x = i < 2 ? -0.9 : 0.9));
    C.neck.rotation.x = -1.0 + (s.pitch || 0) * 0.3; C.head.rotation.x = 1.0;
    C.tail.forEach((g, i) => { g.rotation.y = Math.sin(t * 3 - i * 0.6) * 0.12 + (s.bank || 0) * 0.3; g.rotation.x = Math.sin(t * 2 - i) * 0.05 + (s.pitch || 0) * 0.2; });
  } else if (s.swim) {
    C.wings.forEach(({ sh, w, s: sd }) => { w.rotation.z = sd * (Math.sin(t * 3) * 0.3 - 0.1); w.rotation.y = sd * 0.5; sh.rotation.set(0, 0, 0); });
    S.position.y = Math.sin(t * 2.5) * 0.05;
    C.legs.forEach((l, i) => (l.rotation.x = Math.sin(t * 6 + i * Math.PI) * 0.6));
    C.neck.rotation.x = -0.8; C.head.rotation.x = 0.6;
    C.tail.forEach((g, i) => { g.rotation.y = Math.sin(t * 5 - i * 0.7) * 0.35; g.rotation.x = 0; });
  } else {
    const f = Math.min(1, sp / 8);
    const gait = t * (6 + sp * 0.9) / (st >= 2 ? 1.3 : 1);
    C.legs.forEach((l, i) => { const ph = i === 0 || i === 3 ? 0 : Math.PI; l.rotation.x = s.sit ? (i < 2 ? -0.2 : -1.3) : Math.sin(gait + ph) * 0.7 * f; });
    const bob = Math.abs(Math.sin(gait)) * 0.08 * f;
    S.position.y = bob + (s.sit ? -C.legH * 0.4 : 0);
    if (s.sit) C.body.rotation.x = -0.25;
    if (s.hop) S.position.y += s.hop;
    // wings folded with idle shuffle
    C.wings.forEach(({ sh, w, s: sd }) => {
      const flare = (s.flare || 0);
      sh.rotation.set(0, sd * -0.15 * (1 - flare), 0);
      w.rotation.z = sd * (0.85 - flare * 1.1 + Math.sin(t * 1.3 + sd) * 0.04 - f * 0.1);
      w.rotation.y = sd * (-1.15 * (1 - flare));
      w.rotation.x = 0;
      w.scale.set(1, 1, 1);
    });
    if (mood === 'celebrate') C.wings.forEach(({ w, s: sd }) => { w.rotation.z = sd * (Math.sin(t * 14) * 0.6 - 0.2); w.rotation.y = 0; });
    C.neck.rotation.x = -0.5 - f * 0.2 + Math.sin(t * 1.5) * 0.03; C.head.rotation.x = 0.5 + f * 0.1;
    if (s.sleep) { C.neck.rotation.x = 0.4; C.head.rotation.x = 0.6; S.position.y = -C.legH * 0.7; C.legs.forEach((l, i) => (l.rotation.x = i < 2 ? -1.4 : 1.2)); }
    const wag = mood === 'happy' || mood === 'celebrate' ? 12 : 2.5;
    C.tail.forEach((g, i) => { g.rotation.y = Math.sin(t * wag - i * 0.6) * (mood === 'happy' || mood === 'celebrate' ? 0.35 : 0.12); g.rotation.x = 0.05 + (mood === 'scared' ? 0.25 : 0); });
  }
  // head look
  let yaw = 0, pitch = 0;
  if (s.lookAt) {
    const hp = new THREE.Vector3(); C.neck.getWorldPosition(hp);
    const dx = s.lookAt.x - hp.x, dz = s.lookAt.z - hp.z, dy = s.lookAt.y - hp.y;
    const ry = C.root.rotation.y;
    const localYaw = wrapAngle(Math.atan2(dx, dz) - ry);
    yaw = clamp(localYaw, -1.1, 1.1);
    pitch = clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -0.6, 0.6);
  }
  if (mood === 'celebrate') pitch = -0.4 + Math.sin(t * 8) * 0.1;
  if (mood === 'scared') pitch = 0.4;
  C.headYaw = dampAngle(C.headYaw || 0, yaw, 6, dt);
  C.headPitch = damp(C.headPitch || 0, pitch, 6, dt);
  C.headPivot.rotation.y = C.headYaw;
  C.headPivot.rotation.x = C.headPitch;
  C.headPivot.rotation.z = mood === 'curious' ? Math.sin(t * 2) * 0.3 : 0;
  if (mood === 'happy' && !s.fly) S.position.y += Math.max(0, Math.sin(t * 9)) * 0.08;
  if (mood === 'celebrate' && !s.fly) S.position.y += Math.abs(Math.sin(t * 7)) * 0.35;
  if (mood === 'scared') S.position.x = Math.sin(t * 40) * 0.02;
}

// ───── Mermaid ─────
function buildMermaid(o) {
  const root = new THREE.Group();
  const M = { root, t: Math.random() * 10, tail: [] };
  const skin = o.skin || 0xf3c9a8, hair = o.hair || 0xd04a7a, tailC = o.tail || 0x3fc3b0, fin = o.fin || 0x9cf0e0;
  M.torso = grp(root, 0, 0, 0);
  addMesh(M.torso, [
    part(box(0.42, 0.55, 0.3), skin, { y: 0.28 }),
    part(sph(0.12, 6, 4), o.top || 0xf0e0ff, { x: -0.1, y: 0.42, z: 0.12 }), part(sph(0.12, 6, 4), o.top || 0xf0e0ff, { x: 0.1, y: 0.42, z: 0.12 }),
    part(ico(0.24, 1), skin, { y: 0.8 }),
    part(ico(0.26, 1), hair, { y: 0.88, z: -0.05, sy: 0.9 }),
    part(box(0.5, 0.9, 0.18), hair, { y: 0.45, z: -0.2 }),
    part(box(0.05, 0.07, 0.03), 0x2a2230, { x: -0.09, y: 0.82, z: 0.23 }), part(box(0.05, 0.07, 0.03), 0x2a2230, { x: 0.09, y: 0.82, z: 0.23 }),
    part(cone(0.07, 0.15, 5), 0xfff3a0, { y: 1.12 }), ...(o.crown ? [part(tor(0.2, 0.03, 4, 10), 0xf2c45a, { y: 1.05, rx: Math.PI / 2 }), part(cone(0.05, 0.2, 4), 0xf2c45a, { x: -0.12, y: 1.15 }), part(cone(0.05, 0.2, 4), 0xf2c45a, { x: 0.12, y: 1.15 })] : []),
  ]);
  M.arms = [-1, 1].map((s) => { const g = grp(M.torso, s * 0.26, 0.5, 0); addMesh(g, [part(box(0.1, 0.45, 0.1), skin, { y: -0.22 })]); return g; });
  let parent = M.torso;
  for (let i = 0; i < 4; i++) {
    const g = grp(parent, 0, i === 0 ? 0 : -0.3, 0);
    const r = 0.2 - i * 0.04;
    const tp = [part(cyl(r, r * 0.8, 0.34, 7), tailC, { y: -0.16, jit: 0.1 })];
    if (i === 3) tp.push(part(triGeo([[0, 0, 0], [0.5, -0.45, 0], [0, -0.25, 0.05], [-0.5, -0.45, 0]], [[0, 1, 2], [0, 2, 3], [0, 2, 1], [0, 3, 2]]), fin, { y: -0.3 }));
    addMesh(g, tp, vcMatDS());
    M.tail.push(g); parent = g;
  }
  root.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return M;
}
function animateMermaid(M, s, dt) {
  M.t += dt; const t = M.t;
  // swimming: body horizontal-ish. sitting: upright
  if (s.sit) {
    M.torso.rotation.x = 0;
    M.tail.forEach((g, i) => { g.rotation.x = i === 0 ? 1.2 : 0.25 + Math.sin(t * 2 - i) * 0.12; });
    M.arms[0].rotation.set(0, 0, -0.3 + Math.sin(t * 1.5) * 0.1); M.arms[1].rotation.set(s.wave ? -2.8 : 0, 0, s.wave ? 0.3 + Math.sin(t * 9) * 0.3 : 0.3);
  } else {
    M.torso.rotation.x = 1.3;
    M.tail.forEach((g, i) => { g.rotation.x = Math.sin(t * 4 - i * 0.8) * 0.35; });
    M.arms[0].rotation.set(-2.4 + Math.sin(t * 2) * 0.4, 0, -0.3); M.arms[1].rotation.set(-2.4 + Math.sin(t * 2 + 1) * 0.4, 0, 0.3);
  }
}

// ───── Pirates ─────
function buildPirate(kind) {
  const o = { age: 2, skin: pick([0xf1c6a0, 0xd9a37a, 0xa8754e, 0xf6d3b5]), hair: pick([0x2a1a12, 0x6b4226, 0x9a3a1a, 0x1a1a1a]), top: pick([0xe8e0d0, 0xc9b9a0, 0xd8d0e8]), bottom: 0x3a3a5a, boots: 0x2a2228, accent: 0xc0392b, belt: 0x2a2228, hat: 'bandana', hatColor: pick([0xc0392b, 0x2a6ab0, 0x2a2228]), scarf: false, vest: pick([0x7a2a2a, 0x2a3a5a, 0x3a3a3a]) };
  if (kind === 'brute') Object.assign(o, { hat: null, beard: false, top: 0x8a5a3a, vest: 0x4a3a2a, bottom: 0x2a2a3a });
  if (kind === 'gunner') Object.assign(o, { hat: 'tricorn', hatColor: 0x3a2a2a, vest: 0x2a5a4a });
  if (kind === 'captain') Object.assign(o, { hat: 'tricorn', hatColor: 0x1e1a22, top: 0xe8dcc8, vest: 0x7a1a2a, cloak: 0x5a1020, trim: 0xf2c45a, bottom: 0x22202a, hook: true, eyepatch: true, beard: false, age: 2, hair: 0x1a1a1a });
  const H = buildHuman(o);
  if (kind === 'brute') H.root.scale.set(1.35, 1.25, 1.35);
  if (kind === 'captain') H.root.scale.setScalar(1.55);
  if (kind === 'captain') {
    // beard + captain coat tails
    addMesh(H.head, [part(cone(0.22, 0.4, 6), 0x1a1a1a, { y: 0.06, z: 0.15, rx: Math.PI })]);
  }
  return H;
}
