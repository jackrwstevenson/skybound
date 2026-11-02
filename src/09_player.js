// ───────────────────────── game state, input, camera, player ─────────────────────────
const XP_NEED = [100, 170, 240, 1];
const G = {
  stage: 0, xp: 0, name: '', ctype: null, coins: 0, fruit: 0, fruitFed: 0,
  hp: 100, weapons: { stick: true }, weapon: 'stick',
  upgrades: { heart: 0, wings: 0, stamina: 0, fierce: 0, swift: 0 },
  flags: {}, done: {}, landmarks: {}, chests: {}, pickups: {}, digs: {},
  stats: { flown: 0, swum: 0, pets: 0, treasure: 0, pirates: 0, rings: 0, time: 0 },
  hints: {}, mode: 'title', playTime: 0, endingSeen: false, palette: 0,
};
function maxHp() { return 100 + G.upgrades.heart * 25 + G.stage * 10; }
function stamMax() { return 100 + (G.flags.frostStamina ? 50 : 0) + G.upgrades.stamina * 30; }
function hasBreath() { return G.flags.pearl || G.ctype === 'moon'; }

// ───── input ─────
const Input = {
  keys: {}, pressed: {}, mouse: { x: 0, y: 0, down: false, clicked: false, moved: 0 },
  init() {
    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const k = this.norm(e);
      if (!this.keys[k]) this.pressed[k] = true;
      this.keys[k] = true;
      if (['space', 'tab', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
      Audio.init(); Audio.resume();
    });
    addEventListener('keyup', (e) => { this.keys[this.norm(e)] = false; });
    addEventListener('blur', () => { this.keys = {}; });
    const cv = document.getElementById('game');
    cv.addEventListener('mousedown', (e) => { if (e.button === 0) { this.mouse.down = true; this.mouse.clicked = true; } Audio.init(); Audio.resume(); });
    addEventListener('mouseup', () => (this.mouse.down = false));
    addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; this.mouse.moved = 2.5; });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
  },
  norm(e) { let k = (e.key || '').toLowerCase(); if (k === ' ') k = 'space'; if (k === 'shift') k = 'shift'; if (e.code === 'Space') k = 'space'; return k; },
  down(k) { return !!this.keys[k]; },
  hit(k) { return !!this.pressed[k]; },
  endFrame() { this.pressed = {}; this.mouse.clicked = false; },
  axis() {
    let x = 0, z = 0;
    if (this.down('w') || this.down('arrowup')) z -= 1;
    if (this.down('s') || this.down('arrowdown')) z += 1;
    if (this.down('a') || this.down('arrowleft')) x -= 1;
    if (this.down('d') || this.down('arrowright')) x += 1;
    const l = Math.hypot(x, z); if (l > 0) { x /= l; z /= l; }
    return { x, z, mag: l > 0 ? 1 : 0 };
  },
};

// ───── camera ─────
const Cam = {
  pos: new THREE.Vector3(0, 30, 30), look: new THREE.Vector3(), dist: 22, pitch: 0.92, shake: 0, override: null, zoom: 1,
  update(dt, P1) {
    if (this.override) {
      const o = this.override; o.t = (o.t || 0) + dt;
      const k = o.dur ? easeInOut(o.t / o.dur) : 1;
      const from = o.fromPos || this.pos.clone(), fromL = o.fromLook || this.look.clone();
      if (!o.fromPos) { o.fromPos = this.pos.clone(); o.fromLook = this.look.clone(); }
      const tp = typeof o.pos === 'function' ? o.pos(o.t) : o.pos, tl = typeof o.look === 'function' ? o.look(o.t) : o.look;
      this.pos.lerpVectors(o.fromPos, tp, k); this.look.lerpVectors(o.fromLook, tl, k);
      void from; void fromL;
    } else {
      let d = 21, pitch = 0.9;
      const m = P1.mode;
      if (G.stage === 0) d = 18;
      if (m === 'ride') d = 24;
      if (m === 'fly' || m === 'glide') { const alt = P1.y - Colliders.ground(P1.x, P1.z); d = 30 + clamp(alt, 0, 80) * 0.12 + P1.hspeed * 0.25; pitch = 0.86; }
      if (P1.y < -2) { d = 20; pitch = 1.05; }
      if (G.inCombat) d *= 1.1;
      if (P1.onShip) d *= 1.1;
      d *= this.zoom;
      this.dist = damp(this.dist, d, 2.5, dt); this.pitch = damp(this.pitch, pitch, 2.5, dt);
      const lead = m === 'fly' || m === 'glide' ? 0.5 : 0.25;
      const tx = P1.x + P1.vx * lead, tz = P1.z + P1.vz * lead, ty = P1.y + 1.2;
      this.look.x = damp(this.look.x, tx, 5, dt); this.look.z = damp(this.look.z, tz, 5, dt); this.look.y = damp(this.look.y, ty, 3.5, dt);
      this.pos.set(this.look.x, this.look.y + Math.sin(this.pitch) * this.dist, this.look.z + Math.cos(this.pitch) * this.dist);
      // keep camera above terrain
      const g = Terrain.getH(this.pos.x, this.pos.z); if (this.pos.y < g + 4) this.pos.y = g + 4;
    }
    let sx = 0, sy = 0;
    if (this.shake > 0) { this.shake = Math.max(0, this.shake - dt * 2.5); sx = (Math.random() - 0.5) * this.shake; sy = (Math.random() - 0.5) * this.shake; }
    W.camera.position.set(this.pos.x + sx, this.pos.y + sy, this.pos.z);
    W.camera.lookAt(this.look);
  },
  snap(P1) { this.look.set(P1.x, P1.y + 1.2, P1.z); this.pos.set(P1.x, P1.y + 1.2 + Math.sin(this.pitch) * this.dist, P1.z + Math.cos(this.pitch) * this.dist); },
};

function mouseGround(y) {
  const v = new THREE.Vector3((Input.mouse.x / innerWidth) * 2 - 1, -(Input.mouse.y / innerHeight) * 2 + 1, 0.5).unproject(W.camera);
  const dir = v.sub(W.camera.position).normalize();
  if (Math.abs(dir.y) < 1e-3) return null;
  const t = (y - W.camera.position.y) / dir.y; if (t < 0) return null;
  return { x: W.camera.position.x + dir.x * t, z: W.camera.position.z + dir.z * t };
}

// ───── player ─────
const P1 = {
  x: P.home.x + 7, y: 6, z: P.home.z + 2, vx: 0, vy: 0, vz: 0, yaw: Math.PI / 2, mode: 'foot', onGround: true, hspeed: 0,
  H: null, root: new THREE.Group(), inv: 0, dodgeT: 0, dodgeCd: 0, dodgeDir: { x: 0, z: 1 },
  atkT: 0, atkCd: 0, combo: 0, comboT: 0, swingDir: 1, hurtT: 0, breath: 8, stam: 100, glide: false, petT: 0, carry: null, throwT: 0,
  air: 0, stepAcc: 0, onShip: false, safe: null, lastSafe: { x: P.home.x + 7, z: P.home.z + 2 }, bubble: null, splashCd: 0, ground: 0,
  emoteY() { return this.H ? this.H.height + 0.5 + (this.mode === 'ride' || this.mode === 'fly' || this.mode === 'glide' ? Comp.C.seatY : 0) : 2; },
  get radius() { return this.mode === 'foot' || this.mode === 'swim' ? 0.45 : Math.max(0.6, Comp.C ? Comp.C.radius : 0.7); },
};

function playerLook(age) {
  const outfits = [
    { top: 0x5b8fd6, bottom: 0x8a6a4a, accent: 0xf2c45a, hairStyle: 'spiky', boots: 0x6b4a2a },
    { top: 0x4f7fc0, bottom: 0x5a4a3a, accent: 0xe2573a, hairStyle: 'spiky', vest: 0x6b4a32, boots: 0x4a3426 },
    { top: 0x3f6fae, bottom: 0x4a3a2e, accent: 0xe2573a, hairStyle: 'spiky', vest: 0x7a5636, straps: true, sleeve: 0x3f6fae, glove: 0x6b4a32, boots: 0x3a2a20, cloak: 0x2f5a8a, trim: 0xf2c45a },
    { top: 0x5a4f7a, bottom: 0x4a3a4a, accent: 0xf2c45a, hairStyle: 'spiky', robe: 0x4a5f8a, cloak: 0x2f3f6a, trim: 0xf2c45a, beard: true, hat: 'circlet', boots: 0x3a2a20 },
  ];
  return Object.assign({ age, skin: 0xf1c6a0, hair: 0x7a4a2a }, outfits[age]);
}
function rebuildPlayer() {
  if (P1.H) P1.root.remove(P1.H.root);
  P1.H = buildHuman(playerLook(G.stage));
  P1.root.add(P1.H.root);
  setHumanWeapon(P1.H, P1.mode === 'foot' || P1.mode === 'swim' ? G.weapon : null);
}

function playerTakeDamage(dmg, fromX, fromZ, opt = {}) {
  if (P1.inv > 0 || G.mode !== 'play' || Ending.active) return false;
  if (Comp.ward > 0) { Comp.ward -= dmg; FX.burst(P1.x, P1.y + 1, P1.z, 10, { speed: 4, life: 0.5, size: 0.6, color: 0x9ff3ff, add: true }); Audio.sfx('pop'); if (Comp.ward <= 0) { Floaters.add('Ward popped', { x: P1.x, y: P1.y + 2.5, z: P1.z }, 'info'); } P1.inv = 0.4; return true; }
  G.hp -= dmg; P1.inv = 0.7; P1.hurtT = 0.4;
  Audio.sfx('hurt'); Cam.shake = Math.max(Cam.shake, 0.5);
  Floaters.add('-' + Math.round(dmg), { x: P1.x, y: P1.y + 2.2, z: P1.z }, 'hurt');
  const dx = P1.x - fromX, dz = P1.z - fromZ, d = Math.hypot(dx, dz) || 1;
  const kb = opt.kb ?? 6; P1.vx += (dx / d) * kb; P1.vz += (dz / d) * kb;
  UI.flashHurt();
  Comp.onPlayerHurt(fromX, fromZ);
  if (G.hp <= 0) { G.hp = 0; playerDefeated(); }
  return true;
}
function playerDefeated() {
  G.mode = 'defeat';
  UI.fade(true, 'You and ' + G.name + ' regroup somewhere safe…');
  Audio.sfx('fail');
  setTimeout(() => {
    const s = nearestSafe();
    if (P1.mode !== 'foot') dismount(true);
    P1.mode = 'foot';
    P1.x = s.x; P1.z = s.z; P1.y = Colliders.ground(s.x, s.z) + 0.1; P1.vx = P1.vy = P1.vz = 0;
    G.hp = maxHp(); Comp.teleportNear();
    Enemies.onPlayerDefeated();
    Cam.snap(P1);
    UI.fade(false);
    G.mode = 'play';
    Bus.emit('respawn');
    setTimeout(() => UI.toast(G.name + ' nuzzles you until you feel better.', 'heart'), 500);
  }, 1500);
}
function nearestSafe() {
  const pts = [{ x: P.home.x + 7, z: P.home.z + 2 }, { x: P.lodge.x + 9, z: P.lodge.z }, { x: Spots.nestGate.x, z: Spots.nestGate.z }, { x: 60, z: 222 }, { x: Spots.queen.x, z: Spots.queen.z }, { x: P.gull.x, z: P.gull.z }, { x: P.camp.x + 10, z: P.camp.z - 10 }];
  let best = pts[0], bd = 1e9; for (const p of pts) { const d = dist2d(p, P1); if (d < bd) { bd = d; best = p; } }
  return best;
}

function canMount() { return G.stage >= 1 && G.ctype && Comp.C; }
function mount() {
  if (!canMount()) return;
  P1.mode = Terrain.getH(P1.x, P1.z) < -1.4 && P1.y < 0.5 ? 'rideSwim' : 'ride';
  P1.x = Comp.x; P1.z = Comp.z; P1.y = Comp.y; P1.yaw = Comp.yaw;
  setHumanWeapon(P1.H, null);
  Audio.sfx('creature', { type: G.ctype, mood: 'happy', stage: G.stage }); Audio.sfx('whoosh');
  FX.dust(P1.x, P1.y, P1.z, 10);
  Comp.mounted = true;
  Hints.show('mount2', G.stage >= 2 ? 'Space to take off. Shift to boost. Q to descend and land.' : 'Hold Space while airborne to glide. E to hop off.', 7);
  Bus.emit('mounted');
}
function dismount(silent) {
  if (P1.mode === 'foot' || P1.mode === 'swim') return;
  const wasWater = P1.mode === 'rideSwim';
  Comp.mounted = false;
  Comp.x = P1.x; Comp.z = P1.z; Comp.y = P1.y; Comp.yaw = P1.yaw;
  P1.x += Math.cos(P1.yaw) * 1.6; P1.z -= Math.sin(P1.yaw) * 1.6;
  P1.mode = wasWater ? 'swim' : 'foot';
  P1.vy = 2; P1.glide = false;
  setHumanWeapon(P1.H, G.weapon);
  if (!silent) Audio.sfx('step');
  Bus.emit('dismounted');
}

function waterDepth(x, z) { return -Terrain.getH(x, z); }

function updatePlayer(dt) {
  const inp = G.mode === 'play' && !Dialog.open ? Input.axis() : { x: 0, z: 0, mag: 0 };
  const sprint = Input.down('shift');
  P1.inv = Math.max(0, P1.inv - dt); P1.hurtT = Math.max(0, P1.hurtT - dt);
  P1.dodgeCd = Math.max(0, P1.dodgeCd - dt); P1.atkCd = Math.max(0, P1.atkCd - dt); P1.comboT = Math.max(0, P1.comboT - dt);
  P1.splashCd = Math.max(0, P1.splashCd - dt); P1.throwT = Math.max(0, P1.throwT - dt * 3);
  const m = P1.mode;
  if (m === 'foot' || m === 'swim') updateFoot(dt, inp, sprint);
  else updateMounted(dt, inp, sprint);
  // world bounds
  P1.x = clamp(P1.x, -WORLD.half + 8, WORLD.half - 8); P1.z = clamp(P1.z, -WORLD.half + 8, WORLD.half - 8);
  P1.hspeed = Math.hypot(P1.vx, P1.vz);
  // ship flag
  const sl = shipLocalOf(P1.x, P1.z); P1.onShip = Math.abs(sl.x) < Ship.L + 6 && Math.abs(sl.z) < 7 && P1.y > Ship.deck - 0.5;
  // safe spot tracking
  if ((m === 'foot' || m === 'ride') && P1.onGround && Terrain.getH(P1.x, P1.z) > 0.5 && !P1.onShip) { P1.lastSafe.x = P1.x; P1.lastSafe.z = P1.z; }
  // render
  P1.root.position.set(P1.x, P1.y, P1.z);
  P1.root.rotation.set(0, P1.yaw, 0);
  P1.H.root.position.set(0, 0, 0); P1.H.root.rotation.set(0, 0, 0);
  const st = { speed: P1.hspeed, mode: 'walk', attack: P1.atkT, heavy: WEAPON_DEF[G.weapon].combo === 1, swingDir: P1.swingDir, pet: P1.petT, hurt: P1.hurtT / 0.4, throwT: P1.throwT, carry: !!P1.carry };
  if (P1.dodgeT > 0) { st.mode = 'roll'; st.roll = 1 - P1.dodgeT / 0.42; }
  if (m === 'swim') { st.mode = P1.y < -1.6 ? 'dive' : 'swim'; P1.H.root.position.y = 0.2; }
  if (m === 'ride' || m === 'fly' || m === 'glide' || m === 'rideSwim') {
    st.mode = 'ride'; st.lean = Comp.bank; st.boost = P1.boosting;
    P1.H.root.position.set(0, Comp.C.seatY + Comp.C.scaler.position.y * Comp.C.scaler.scale.x * 0 + Comp.renderBob, Comp.C.seatZ);
    P1.H.root.rotation.z = -Comp.bank * 0.8; P1.H.root.rotation.x = -Comp.pitchV * 0.5;
  }
  if (Dialog.open && Dialog.talking) st.talk = true;
  if (G.celebrateT > 0) st.celebrate = true;
  animateHuman(P1.H, st, dt);
  // invuln blink
  P1.H.root.visible = !(P1.inv > 0 && P1.hurtT > 0 && Math.floor(P1.inv * 20) % 2 === 0);
  // bubble helm
  if (P1.bubble) { P1.bubble.visible = P1.y < -1.2; }
}

function shipLocalOf(x, z) { const dx = x - Ship.x, dz = z - Ship.z, c = Math.cos(Ship.ang), s = Math.sin(Ship.ang); return { x: dx * c + dz * s, z: -dx * s + dz * c }; }

function moveWithCollision(dx, dz, rad, step) {
  // try full move, then axis-separated on steep walls
  const tryMove = (nx, nz) => {
    const g = Colliders.ground(nx, nz, P1.y, step);
    if (P1.onGround && g - P1.y > step && P1.mode !== 'fly' && P1.mode !== 'glide') return false;
    return true;
  };
  let nx = P1.x + dx, nz = P1.z + dz;
  if (!tryMove(nx, nz)) {
    if (tryMove(P1.x + dx, P1.z)) nz = P1.z; else if (tryMove(P1.x, P1.z + dz)) nx = P1.x; else { nx = P1.x; nz = P1.z; }
  }
  const p = { x: nx, z: nz };
  Colliders.resolve(p, rad, P1.y, step, P1.mode === 'foot' || P1.mode === 'swim' ? 1.6 : 2.4);
  P1.x = p.x; P1.z = p.z;
}

function updateFoot(dt, inp, sprint) {
  const child = G.stage === 0;
  const depth = waterDepth(P1.x, P1.z);
  const deep = depth > 1.15;
  if (deep && P1.y < 0.3 && P1.mode !== 'swim') { P1.mode = 'swim'; FX.splash(P1.x, 0, P1.z, 14); Audio.sfx('splash'); Hints.show('swim', hasBreath() ? 'Swimming! Q dives down, Space rises.' : 'Swimming! Q to dive — watch your breath.', 6); }
  if (P1.mode === 'swim' && (!deep || P1.y > 0.4)) { P1.mode = 'foot'; }
  if (P1.mode === 'swim') return updateSwim(dt, inp, sprint, depth);

  // dodge
  if (G.mode === 'play' && !Dialog.open && Input.hit('space') && P1.dodgeCd <= 0 && P1.onGround) {
    P1.dodgeT = 0.42; P1.dodgeCd = 0.75; P1.inv = Math.max(P1.inv, 0.4);
    P1.dodgeDir = inp.mag ? { x: inp.x, z: inp.z } : { x: Math.sin(P1.yaw), z: Math.cos(P1.yaw) };
    Audio.sfx('dodge'); FX.dust(P1.x, P1.y, P1.z, 6);
    Bus.emit('dodge');
  }
  let speed = (child ? 5.2 : 6.2) * (sprint ? 1.6 : 1) * (1 + G.upgrades.swift * 0.08);
  if (depth > 0.2) speed *= 0.65;
  if (P1.carry) speed *= 0.85;
  if (P1.atkT > 0) speed *= 0.35;
  let tvx = inp.x * speed, tvz = inp.z * speed;
  if (P1.dodgeT > 0) { P1.dodgeT -= dt; tvx = P1.dodgeDir.x * 13; tvz = P1.dodgeDir.z * 13; }
  const acc = P1.onGround ? 14 : 4;
  P1.vx = damp(P1.vx, tvx, acc, dt); P1.vz = damp(P1.vz, tvz, acc, dt);
  if (inp.mag && P1.atkT <= 0) P1.yaw = dampAngle(P1.yaw, Math.atan2(inp.x, inp.z), 14, dt);
  if (P1.dodgeT > 0) P1.yaw = Math.atan2(P1.dodgeDir.x, P1.dodgeDir.z);
  moveWithCollision(P1.vx * dt, P1.vz * dt, P1.radius, 1.1);
  // vertical
  const g = Colliders.ground(P1.x, P1.z, P1.y, 1.1);
  P1.ground = g;
  P1.vy -= 30 * dt; P1.y += P1.vy * dt;
  if (P1.y <= g + 0.02) { if (!P1.onGround && P1.vy < -12) { FX.dust(P1.x, g, P1.z, 6); Audio.sfx('step', { v: 2 }); } P1.y = g; P1.vy = 0; P1.onGround = true; }
  else if (P1.y > g + 0.35 || P1.vy > 0.5) P1.onGround = false;
  else { P1.y = damp(P1.y, g, 20, dt); P1.vy = Math.min(P1.vy, 0); P1.onGround = true; }
  // fell into deep water from height
  // footsteps
  const sp = Math.hypot(P1.vx, P1.vz);
  if (P1.onGround && sp > 1) { P1.stepAcc += dt * sp * (child ? 0.55 : 0.4); if (P1.stepAcc > 1) { P1.stepAcc = 0; Audio.sfx(depth > 0.1 ? 'splashstep' : 'step'); if (depth > 0.1) FX.splash(P1.x, 0, P1.z, 3); else if (sprint && Math.random() < 0.5) FX.dust(P1.x, P1.y, P1.z, 2); } }
  // attack
  if (G.mode === 'play' && !Dialog.open && Input.mouse.clicked && P1.atkCd <= 0 && P1.dodgeT <= 0) playerAttack();
  if (P1.atkT > 0) P1.atkT = Math.max(0, P1.atkT - dt / WEAPON_DEF[G.weapon].speed);
  if (P1.petT > 0) P1.petT -= dt;
}

function updateSwim(dt, inp, sprint, depth) {
  const breathOK = hasBreath();
  const speed = (sprint ? 6.5 : 4.4) * (G.flags.pearl ? 1.25 : 1) * (G.ctype === 'moon' ? 1.15 : 1);
  P1.vx = damp(P1.vx, inp.x * speed, 4, dt); P1.vz = damp(P1.vz, inp.z * speed, 4, dt);
  if (inp.mag) P1.yaw = dampAngle(P1.yaw, Math.atan2(inp.x, inp.z), 8, dt);
  const floor = Terrain.getH(P1.x, P1.z) + 0.6;
  let tvy = 0;
  const surf = -0.55;
  if (Input.down('q') && G.mode === 'play') tvy = -4.5;
  else if (Input.down('space') && G.mode === 'play') tvy = 4.5;
  else tvy = P1.y < surf - 0.3 ? (breathOK ? 0 : 1.6) : (surf - P1.y) * 4;
  if (P1.breath <= 0) tvy = 4;
  P1.vy = damp(P1.vy, tvy, 5, dt);
  P1.y += P1.vy * dt;
  if (P1.y > surf) P1.y = damp(P1.y, surf, 8, dt);
  if (P1.y < floor) P1.y = floor;
  moveWithCollision(P1.vx * dt, P1.vz * dt, 0.5, 0.6);
  P1.onGround = false;
  const gp = Colliders.ground(P1.x, P1.z, P1.y + 0.8, 1.0);
  if (gp > P1.y - 0.25 && gp > -1.6) { P1.mode = 'foot'; P1.y = gp; P1.vy = 0; P1.onGround = true; return; }
  const under = P1.y < -1.4;
  if (under) {
    if (!breathOK) { P1.breath -= dt; if (P1.breath <= 0) { P1.breath = 0; if (!P1._drown || P1._drown < 0) { P1._drown = 1; G.hp -= 4; UI.flashHurt(); } P1._drown -= dt; } }
    if (Math.random() < dt * 4) FX.bubble(P1.x, P1.y + 1, P1.z, 0, 1.2, 0, 0.25);
    G.stats.swum += Math.hypot(P1.vx, P1.vz) * dt;
    if (!G.hints.diveOK) { G.hints.diveOK = 1; if (!breathOK) UI.toast('Without magic, you can only hold your breath briefly.', 'info'); }
  } else { P1.breath = Math.min(8, P1.breath + dt * 3); }
  if (Math.hypot(P1.vx, P1.vz) > 1 && !under && P1.splashCd <= 0) { P1.splashCd = 0.35; FX.splash(P1.x, 0, P1.z, 3); }
  if (G.mode === 'play' && !Dialog.open && Input.mouse.clicked && P1.atkCd <= 0) playerAttack();
  if (P1.atkT > 0) P1.atkT = Math.max(0, P1.atkT - dt / WEAPON_DEF[G.weapon].speed);
  if (G.hp <= 0 && G.mode === 'play') playerDefeated();
}

function updateMounted(dt, inp, sprint) {
  const C = Comp.C;
  const stage = G.stage;
  const agile = G.ctype === 'cloud' ? 1.15 : 1;
  const flySpd = (17 + stage * 1.5 + G.upgrades.wings * 2) * agile;
  const g = Colliders.ground(P1.x, P1.z, P1.y, 1.4);
  P1.ground = g;
  P1.boosting = false;
  const depth = waterDepth(P1.x, P1.z);
  const sm = stamMax(); P1.stam = Math.min(P1.stam, sm);
  const play = G.mode === 'play' && !Dialog.open;
  // ── ground ride ──
  if (P1.mode === 'ride') {
    const speed = (9 + stage * 1.2) * (sprint ? 1.55 : 1) * agile;
    P1.vx = damp(P1.vx, inp.x * speed, 6, dt); P1.vz = damp(P1.vz, inp.z * speed, 6, dt);
    if (inp.mag) P1.yaw = dampAngle(P1.yaw, Math.atan2(inp.x, inp.z), 8, dt);
    moveWithCollision(P1.vx * dt, P1.vz * dt, P1.radius, 1.4);
    P1.vy -= 30 * dt; P1.y += P1.vy * dt;
    const g2 = Colliders.ground(P1.x, P1.z, P1.y, 1.4);
    if (P1.y <= g2) { if (!P1.onGround && P1.vy < -10) { FX.dust(P1.x, g2, P1.z, 10); Audio.sfx('step', { v: 2 }); Cam.shake = 0.2; } P1.y = g2; P1.vy = 0; P1.onGround = true; P1.glide = false; }
    else if (P1.y > g2 + 0.5 || P1.vy > 0.5) P1.onGround = false;
    else { P1.y = damp(P1.y, g2, 20, dt); P1.onGround = true; }
    P1.stam = Math.min(sm, P1.stam + dt * 30);
    if (play && Input.hit('space')) {
      if (stage >= 2) { P1.mode = 'fly'; P1.vy = 9; P1.y += 0.8; P1.flyT = 0; FX.dust(P1.x, P1.y, P1.z, 14); Audio.sfx('wing', { v: 1.6 }); Bus.emit('takeoff'); Hints.show('fly1', 'Flying! WASD to steer. Space climbs, Q descends. Shift to boost.', 7); }
      else if (P1.onGround) { P1.vy = 10; P1.onGround = false; Audio.sfx('wing'); FX.dust(P1.x, P1.y, P1.z, 6); }
    }
    if (!P1.onGround && stage === 1 && Input.down('space') && P1.vy < 0) { P1.mode = 'glide'; Bus.emit('glide'); }
    if (depth > 1.4 && P1.y < 0.3) { P1.mode = 'rideSwim'; FX.splash(P1.x, 0, P1.z, 20); Audio.sfx('splash'); }
    if (P1.onGround && Math.hypot(P1.vx, P1.vz) > 2) { P1.stepAcc += dt * Math.hypot(P1.vx, P1.vz) * 0.25; if (P1.stepAcc > 1) { P1.stepAcc = 0; Audio.sfx('step', { v: 1 + stage * 0.4 }); if (sprint) FX.dust(P1.x, P1.y, P1.z, 3); } }
  }
  // ── glide (teen) ──
  else if (P1.mode === 'glide') {
    const fwd = { x: Math.sin(P1.yaw), z: Math.cos(P1.yaw) };
    const speed = 13 * agile;
    if (inp.mag) P1.yaw = dampAngle(P1.yaw, Math.atan2(inp.x, inp.z), 2.6, dt);
    const turn = inp.mag ? wrapAngle(Math.atan2(inp.x, inp.z) - P1.yaw) : 0;
    Comp.bank = damp(Comp.bank, clamp(turn, -0.8, 0.8) * 0.7, 4, dt);
    P1.vx = damp(P1.vx, fwd.x * speed, 2, dt); P1.vz = damp(P1.vz, fwd.z * speed, 2, dt);
    let sink = Input.down('space') ? -2.4 : -9;
    const up = updraftAt(P1.x, P1.z, P1.y); if (up > 0) sink = up * 0.6;
    P1.vy = damp(P1.vy, sink, 3, dt);
    P1.y += P1.vy * dt;
    moveWithCollision(P1.vx * dt, P1.vz * dt, P1.radius, 2);
    const g2 = Colliders.ground(P1.x, P1.z, P1.y, 1.5);
    G.stats.flown += speed * dt;
    if (P1.y <= g2) { P1.y = g2; P1.mode = 'ride'; P1.onGround = true; P1.vy = 0; FX.dust(P1.x, g2, P1.z, 10); Audio.sfx('step', { v: 2 }); Bus.emit('landed'); }
    if (depth > 1.4 && P1.y < 0.3) { P1.mode = 'rideSwim'; FX.splash(P1.x, 0, P1.z, 20); Audio.sfx('splash'); }
    if (!Input.down('space') && P1.vy < -6) { P1.mode = 'ride'; P1.onGround = false; }
  }
  // ── flight ──
  else if (P1.mode === 'fly') {
    const boost = sprint && P1.stam > 1 && inp.mag;
    P1.boosting = boost;
    const tSpeed = inp.mag ? (boost ? flySpd * 1.75 : flySpd) : 3;
    // heading turns toward input with limited rate -> banking
    let turn = 0;
    if (inp.mag) { const desired = Math.atan2(inp.x, inp.z); turn = wrapAngle(desired - P1.yaw); const rate = (boost ? 2.4 : 3.6) * agile; P1.yaw += clamp(turn, -rate * dt, rate * dt); }
    Comp.bank = damp(Comp.bank, clamp(turn * 0.9, -0.9, 0.9), 4, dt);
    const fwd = { x: Math.sin(P1.yaw), z: Math.cos(P1.yaw) };
    const spd = damp(Math.hypot(P1.vx, P1.vz), tSpeed, boost ? 2.2 : 1.6, dt);
    P1.vx = fwd.x * spd; P1.vz = fwd.z * spd;
    let tvy = 0;
    const up = updraftAt(P1.x, P1.z, P1.y);
    if (play && Input.down('space') && P1.stam > 0) { tvy = 10; P1.stam -= dt * 7; }
    else if (play && Input.down('q')) tvy = -14;
    else tvy = Math.sin(W.time * 1.2) * 0.4;
    if (P1.stam <= 0.5 && !Input.down('q')) tvy = Math.min(tvy, -2);
    if (up > 0) { tvy += up; P1.stam = Math.min(sm, P1.stam + dt * 25); if (Math.random() < dt * 20) FX.gust(P1.x + rand(-3, 3), P1.y - 3, P1.z + rand(-3, 3), 0, 8, 0, 0.6); }
    P1.vy = damp(P1.vy, tvy, 3, dt);
    if (boost) { P1.stam -= dt * 20; if (P1.stam <= 0) { P1.stam = 0; UI.toast(G.name + ' needs to catch their breath.', 'info'); } }
    else if (!Input.down('space')) P1.stam = Math.min(sm, P1.stam + dt * 14);
    P1.y += P1.vy * dt;
    const maxAlt = G.flags.frostStamina ? 175 : 120;
    if (P1.y > maxAlt) { P1.y = maxAlt; P1.vy = Math.min(0, P1.vy); if (!G.hints.ceiling) { G.hints.ceiling = 1; UI.toast(G.flags.frostStamina ? 'The air is too thin to climb further.' : 'The air grows thin. Master the Frostpeak winds to fly higher.', 'info'); } }
    moveWithCollision(P1.vx * dt, P1.vz * dt, P1.radius, 3);
    const g2 = Colliders.ground(P1.x, P1.z, P1.y, 2);
    Comp.pitchV = damp(Comp.pitchV, clamp(P1.vy / 14, -0.6, 0.6), 4, dt);
    P1.flyT = (P1.flyT || 0) + dt;
    if (P1.y < g2 + 0.6) {
      P1.y = g2 + 0.6;
      if (P1.flyT > 0.6 && (P1.vy < -1 || Input.down('q') || (spd < 4 && !Input.down('space')))) {
        if (g2 > -0.3 || Colliders.ground(P1.x, P1.z, P1.y, 2) > -0.5) { P1.mode = 'ride'; P1.y = g2; P1.vy = 0; P1.onGround = true; FX.dust(P1.x, g2, P1.z, 16); Audio.sfx('step', { v: 2.5 }); Bus.emit('landed'); }
      } else P1.vy = Math.max(P1.vy, 0);
    }
    if (P1.y < 0.2 && depth > 1.4) { P1.mode = 'rideSwim'; P1.y = -0.3; FX.splash(P1.x, 0, P1.z, 30); Audio.sfx('splash'); Bus.emit('landed'); }
    G.stats.flown += spd * dt;
    // wing beats sfx
    Comp.flapAcc = (Comp.flapAcc || 0) + dt * (inp.mag ? (boost ? 2.4 : 1.4) : 1) * (Input.down('space') ? 1.5 : 1);
    if (Comp.flapAcc > 1) { Comp.flapAcc = 0; Audio.sfx('wing', { v: 0.6 + G.stage * 0.2 }); }
    if (boost && !P1._boostFx) { P1._boostFx = true; Audio.sfx('gust'); Cam.shake = 0.25; } if (!boost) P1._boostFx = false;
  }
  // ── swim while mounted ──
  else if (P1.mode === 'rideSwim') {
    const fast = G.ctype === 'moon' ? 1.6 : 1;
    const speed = (6 + stage) * fast * (sprint ? 1.5 : 1) * (G.flags.pearl ? 1.2 : 1);
    P1.vx = damp(P1.vx, inp.x * speed, 3.5, dt); P1.vz = damp(P1.vz, inp.z * speed, 3.5, dt);
    if (inp.mag) P1.yaw = dampAngle(P1.yaw, Math.atan2(inp.x, inp.z), 5, dt);
    const surf = -0.3; const floor = Terrain.getH(P1.x, P1.z) + 1.0;
    let tvy;
    if (play && Input.down('q')) tvy = hasBreath() || P1.breath > 0 ? -5 : 0;
    else if (play && Input.down('space')) tvy = 5;
    else tvy = P1.y < surf - 0.4 ? (hasBreath() ? 0 : 2) : (surf - P1.y) * 4;
    P1.vy = damp(P1.vy, tvy, 4, dt); P1.y += P1.vy * dt;
    if (P1.y > surf) {
      // breach into the air
      if (play && Input.down('space') && stage >= 2 && P1.y > surf + 0.1) { P1.mode = 'fly'; P1.vy = 8; P1.flyT = 0; FX.splash(P1.x, 0, P1.z, 30); Audio.sfx('splash'); Audio.sfx('wing', { v: 1.6 }); }
      else P1.y = damp(P1.y, surf, 8, dt);
    }
    if (P1.y < floor) P1.y = floor;
    moveWithCollision(P1.vx * dt, P1.vz * dt, P1.radius, 1.4);
    const under = P1.y < -1.6;
    if (under && !hasBreath()) { P1.breath -= dt; if (P1.breath <= 0) { P1.breath = 0; } }
    else if (!under) P1.breath = Math.min(8, P1.breath + dt * 3);
    if (under) { G.stats.swum += Math.hypot(P1.vx, P1.vz) * dt; if (Math.random() < dt * 5) FX.bubble(P1.x, P1.y + 2, P1.z, 0, 1.4, 0, 0.3); }
    if (!under && Math.hypot(P1.vx, P1.vz) > 1.5 && P1.splashCd <= 0) { P1.splashCd = 0.25; FX.splash(P1.x - Math.sin(P1.yaw) * 1.4, 0, P1.z - Math.cos(P1.yaw) * 1.4, 4); }
    const g2 = Colliders.ground(P1.x, P1.z, P1.y, 1.4);
    if (depth < 1.0 || g2 > P1.y - 0.2) { P1.mode = 'ride'; P1.y = Math.max(P1.y, g2); }
    Comp.pitchV = damp(Comp.pitchV, clamp(P1.vy / 8, -0.5, 0.5), 4, dt);
  }
  if (P1.mode !== 'fly') Comp.pitchV = damp(Comp.pitchV, 0, 4, dt);
  if (P1.mode !== 'fly' && P1.mode !== 'glide') Comp.bank = damp(Comp.bank, 0, 5, dt);
  // mounted attack = companion strike
  if (play && Input.mouse.clicked && P1.atkCd <= 0) mountedAttack();
  if (P1.atkT > 0) P1.atkT = Math.max(0, P1.atkT - dt / 0.35);
}

function updraftAt(x, z, y) {
  let s = 0;
  for (const u of Updrafts) { const d = Math.hypot(x - u.x, z - u.z); if (d < u.r && y < u.top) s = Math.max(s, u.strength * (1 - d / u.r * 0.5)); }
  return s;
}

// ───── attacks ─────
function aimYaw() {
  if (Input.mouse.moved > 0) { const g = mouseGround(P1.y + 0.8); if (g) { const dx = g.x - P1.x, dz = g.z - P1.z; if (Math.hypot(dx, dz) > 0.8) return Math.atan2(dx, dz); } }
  // auto-aim at nearest enemy in front-ish
  const e = Enemies.nearest(P1, 6); if (e) return Math.atan2(e.x - P1.x, e.z - P1.z);
  return P1.yaw;
}
function playerAttack() {
  const w = WEAPON_DEF[G.weapon];
  if (P1.carry) { throwCarried(); return; }
  P1.yaw = aimYaw();
  P1.combo = P1.comboT > 0 ? (P1.combo + 1) % w.combo : 0;
  P1.comboT = w.speed + 0.35;
  P1.swingDir = P1.combo % 2 ? -1 : 1;
  P1.atkT = 1; P1.atkCd = w.speed * 0.9;
  Audio.sfx(w.combo === 1 ? 'heavyswing' : 'whoosh');
  const finisher = w.combo > 1 && P1.combo === w.combo - 1;
  const delay = w.combo === 1 ? w.speed * 0.45 * 1000 : 70;
  setTimeout(() => {
    const reach = w.reach * (G.stage === 0 ? 0.8 : 1);
    const dmg = w.dmg * (finisher ? (G.weapon === 'saber' ? 2 : 1.4) : 1) * (1 + G.stage * 0.15);
    const fx = P1.x + Math.sin(P1.yaw) * reach * 0.6, fz = P1.z + Math.cos(P1.yaw) * reach * 0.6;
    // slash arc particles
    for (let i = 0; i < 7; i++) { const a = P1.yaw + (i / 6 - 0.5) * w.arc * P1.swingDir; FX.trail(P1.x + Math.sin(a) * reach * 0.8, P1.y + 1.0, P1.z + Math.cos(a) * reach * 0.8, w.combo === 1 ? 0xc9d6e8 : 0xffffff, 0.5); }
    if (w.aoe) { FX.dust(fx, P1.y, fz, 14, 0xd8c8a8); Cam.shake = Math.max(Cam.shake, 0.45); Audio.sfx('boom'); }
    const hits = Hitbox.melee(P1.x, P1.z, P1.y, P1.yaw, reach, w.arc, dmg, w.kb * (finisher ? 1.5 : 1), 'player', w.aoe);
    if (hits) { Cam.shake = Math.max(Cam.shake, 0.18 + (w.aoe ? 0.3 : 0)); }
  }, delay);
}
function mountedAttack() {
  P1.atkT = 1; P1.atkCd = 0.45;
  const yaw = aimYaw();
  if (P1.mode === 'ride' || P1.mode === 'rideSwim') P1.yaw = yaw;
  Audio.sfx('creature', { type: G.ctype, mood: 'angry', stage: G.stage }); Audio.sfx('whoosh');
  Comp.strikeT = 0.35;
  const reach = 2.8 + G.stage * 0.6, dmg = 14 + G.stage * 6;
  setTimeout(() => {
    const y = P1.mode === 'fly' ? P1.y - 2 : P1.y;
    for (let i = 0; i < 8; i++) { const a = yaw + (i / 7 - 0.5) * 2; FX.trail(P1.x + Math.sin(a) * reach, P1.y + 1, P1.z + Math.cos(a) * reach, Comp.elemColor(), 0.6); }
    Hitbox.melee(P1.x, P1.z, y, yaw, reach, 2.2, dmg, 7, 'player', 0, P1.mode === 'fly' ? 6 : 2.5);
  }, 120);
}

// carryable throwables (ball in nursery)
function throwCarried() {
  const c = P1.carry; P1.carry = null; P1.throwT = 1;
  P1.yaw = aimYaw();
  const sp = 9;
  c.vx = Math.sin(P1.yaw) * sp; c.vz = Math.cos(P1.yaw) * sp; c.vy = 6; c.x = P1.x; c.y = P1.y + 1.4; c.z = P1.z; c.flying = true;
  Audio.sfx('whoosh');
  Bus.emit('throw', c);
}

// ───── hints (gradual control introduction) ─────
const Hints = {
  show(id, text, dur = 6) { if (G.hints[id]) return; G.hints[id] = 1; UI.hint(text, dur); },
};
