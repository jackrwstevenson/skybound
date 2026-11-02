// ───────────────────────── enemies ─────────────────────────
const ENEMY_DEF = {
  dummy: { hp: 9999, r: 0.6, h: 1.8, speed: 0, coins: 0 },
  crow: { hp: 1, r: 0.4, h: 0.6, speed: 0, coins: 0 },
  imp: { hp: 22, r: 0.5, h: 1.1, speed: 4.2, coins: 3, range: 9 },
  deckhand: { hp: 34, r: 0.5, h: 1.9, speed: 4.4, coins: 5, range: 2.2 },
  brute: { hp: 80, r: 0.8, h: 2.5, speed: 3.2, coins: 10, range: 3.2 },
  gunner: { hp: 30, r: 0.5, h: 1.9, speed: 3.6, coins: 7, range: 13 },
  captain: { hp: 1100, r: 0.9, h: 3, speed: 4.6, coins: 0, range: 3.2 },
};

function buildImp() {
  const root = new THREE.Group();
  const body = meshOf([
    part(ico(0.5, 1), 0xdff2ff, { y: 0.55, jit: 0.08 }), part(ico(0.35, 1), 0xf6fbff, { y: 0.55, z: 0.18, sy: 0.9 }),
    part(cone(0.12, 0.35, 4), 0xa9d6ee, { x: -0.25, y: 1.0, rz: 0.4 }), part(cone(0.12, 0.35, 4), 0xa9d6ee, { x: 0.25, y: 1.0, rz: -0.4 }),
    part(box(0.1, 0.12, 0.05), 0x2a4a8a, { x: -0.14, y: 0.66, z: 0.47 }), part(box(0.1, 0.12, 0.05), 0x2a4a8a, { x: 0.14, y: 0.66, z: 0.47 }),
    part(box(0.18, 0.05, 0.05), 0x2a4a8a, { y: 0.48, z: 0.48 }),
    part(cone(0.18, 0.5, 4), 0xbfe9ff, { y: 1.15 }),
  ]);
  root.add(body);
  const arms = [-1, 1].map((s) => { const a = meshOf([part(box(0.12, 0.35, 0.12), 0xdff2ff, { y: -0.15 })]); a.position.set(s * 0.45, 0.65, 0); root.add(a); return a; });
  return { root, body, arms, t: 0 };
}
function buildCrow() {
  const root = new THREE.Group();
  const b = meshOf([part(ico(0.25, 0), 0x2a2a35, { y: 0.3, sz: 1.4 }), part(ico(0.16, 0), 0x2a2a35, { y: 0.5, z: 0.25 }), part(cone(0.05, 0.18, 4), 0xf2c14a, { y: 0.5, z: 0.45, rx: Math.PI / 2 }), part(box(0.5, 0.04, 0.2), 0x1e1e28, { y: 0.35, z: -0.1 })]);
  root.add(b); return { root, body: b, t: Math.random() * 5 };
}
function buildDummy() {
  const root = new THREE.Group();
  root.add(meshOf([part(cyl(0.12, 0.12, 1.4, 5), 0x7a5634, { y: 0.7 }), part(cyl(0.45, 0.4, 0.9, 7), 0xe7c46a, { y: 1.5, jit: 0.15 }), part(ico(0.3, 0), 0xe7c46a, { y: 2.2 }), part(box(1.2, 0.12, 0.12), 0x7a5634, { y: 1.6 }), part(cyl(0.46, 0.46, 0.1, 7), 0xe2573a, { y: 1.5 })]));
  return { root, t: 0 };
}

const Enemies = {
  list: [], groups: {},
  spawn(kind, x, z, opt = {}) {
    const d = ENEMY_DEF[kind];
    let model, H = null;
    if (kind === 'imp') model = buildImp();
    else if (kind === 'crow') model = buildCrow();
    else if (kind === 'dummy') model = buildDummy();
    else { H = buildPirate(kind); model = { root: H.root }; setHumanWeapon(H, kind === 'brute' ? 'anchor' : kind === 'gunner' ? null : kind === 'captain' ? 'saber' : 'cutlass'); }
    const root = new THREE.Group(); root.add(model.root); W.scene.add(root);
    const y = opt.y ?? Colliders.ground(x, z, 999);
    const scaleHp = 1 + (G.stage >= 2 ? 0.25 : 0) + (G.stage >= 3 ? 0.25 : 0);
    const e = {
      kind, x, z, y, vx: 0, vz: 0, vy: 0, yaw: opt.yaw ?? rand(0, TAU), hp: d.hp * (kind === 'captain' || kind === 'dummy' || kind === 'crow' ? 1 : scaleHp), r: d.r * (kind === 'brute' ? 1 : 1), h: d.h,
      state: opt.state || 'idle', t: 0, atkT: 0, cd: rand(0.5, 1.5), stun: 0, dead: false, model, H, root, group: opt.group, home: { x, z }, aggro: opt.aggro || 14, focus: 'player', flash: 0, opt, hpBar: null, phase: 0,
      emoteY() { return this.h + 0.5; },
    };
    e.maxHp = e.hp;
    if (kind !== 'dummy' && kind !== 'crow') e.hpBar = UI.makeEnemyBar(kind === 'captain');
    this.list.push(e);
    if (e.group) { (this.groups[e.group] = this.groups[e.group] || { alive: 0, total: 0, onClear: null }); this.groups[e.group].alive++; this.groups[e.group].total++; }
    return e;
  },
  group(id, onClear) { const g = this.groups[id] || (this.groups[id] = { alive: 0, total: 0 }); g.onClear = onClear; return g; },
  nearest(p, r) { let b = null, bd = r; for (const e of this.list) { if (e.dead || e.kind === 'crow' || e.kind === 'dummy') continue; const d = dist2d(e, p); if (d < bd && Math.abs(e.y - p.y) < 6) { bd = d; b = e; } } return b; },
  nearestTo(x, z, r) { return this.nearest({ x, z, y: P1.y }, r); },
  targetFor(c) { let b = null, bd = 16; for (const e of this.list) { if (e.dead || e.kind === 'crow' || e.kind === 'dummy' || e.state === 'idle') continue; const d = dist2d(e, c) + (e.atkT > 0 ? -4 : 0) + (e.kind === 'gunner' ? -2 : 0); if (d < bd && Math.abs(e.y - P1.y) < 4) { bd = d; b = e; } } return b; },
  hurt(e, dmg, dx, dz, opt = {}) {
    if (e.dead) return;
    if (e.kind === 'captain' && e.invuln > 0) { FX.hit(e.x, e.y + 1.5, e.z, 0x9aa7b4); Audio.sfx('hit'); return; }
    if (e.kind === 'dummy') { e.flash = 0.15; e.wob = 1; FX.hit(e.x, e.y + 1.5, e.z); Audio.sfx('hit'); Floaters.add(Math.round(dmg), { x: e.x, y: e.y + 2.2, z: e.z }, 'dmg'); Bus.emit('dummyHit', { e, opt }); return; }
    if (e.kind === 'crow') { this.kill(e, opt); return; }
    e.hp -= dmg; e.flash = 0.15;
    Floaters.add(Math.round(dmg), { x: e.x, y: e.y + e.h + 0.4, z: e.z }, opt.src === 'comp' ? 'dmg comp' : 'dmg');
    FX.hit(e.x, e.y + e.h * 0.6, e.z, opt.src === 'comp' ? Comp.elemColor() : 0xfff2a8);
    Audio.sfx('hit');
    const d = Math.hypot(dx, dz) || 1; const kb = (opt.kb || 3) * (e.kind === 'brute' || e.kind === 'captain' ? 0.35 : 1);
    e.vx += (dx / d) * kb; e.vz += (dz / d) * kb;
    if (e.state === 'idle') e.state = 'chase';
    if (opt.src === 'comp' && e.kind !== 'captain' && Math.random() < 0.5) { e.focus = 'comp'; e.focusT = 3; }
    // interrupt windups
    if (e.atkT > 0 && (opt.interrupt || (e.kind !== 'brute' && e.kind !== 'captain' && opt.src === 'player' && dmg > 14))) {
      e.atkT = 0; if (e.tele) e.tele.dead = true; e.stun = Math.max(e.stun, e.kind === 'captain' ? 1.2 : 1.0);
      Floaters.add('Interrupted!', { x: e.x, y: e.y + e.h + 1, z: e.z }, 'info');
      if (opt.src === 'comp') { Comp.react('win'); Comp.addSurge(10); }
      Bus.emit('interrupt', e);
    }
    if (opt.stun) e.stun = Math.max(e.stun, e.kind === 'captain' ? opt.stun * 0.4 : opt.stun);
    if (opt.bubble && e.kind !== 'captain') { e.bubbled = opt.stun; }
    if (e.hp <= 0) this.kill(e, opt);
  },
  kill(e, opt = {}) {
    e.dead = true;
    if (e.tele) e.tele.dead = true;
    if (e.kind === 'crow') {
      e.flee = { vx: rand(-4, 4), vy: 9, vz: rand(-4, 4), t: 0 }; Audio.sfx('wing', { v: 0.5 });
      Bus.emit('crowShoo', e); return;
    }
    Audio.sfx('puff');
    FX.burst(e.x, e.y + 1, e.z, 26, { speed: 4, life: 0.9, size: 1.2, size1: 2.6, color: e.kind === 'imp' ? 0xeaf6ff : 0xd8d0c8, alpha: 0.7, up: 1.5, drag: 2 });
    FX.sparkle(e.x, e.y + 1, e.z, 0xffd34d, 10);
    if (e.hpBar) e.hpBar.remove();
    W.scene.remove(e.root);
    const d = ENEMY_DEF[e.kind];
    const n = d.coins + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) Pickups.spawn('coin', e.x, e.y + 1, e.z, { val: 1 + G.stage });
    if (Math.random() < 0.3) Pickups.spawn('heart', e.x, e.y + 1, e.z);
    if (e.opt.drop) for (const dr of [].concat(e.opt.drop)) dropLoot(dr, e.x, e.y + 1, e.z);
    else if (['deckhand', 'brute', 'gunner'].includes(e.kind) && G.stage >= 3 && Math.random() < 0.06 && !G.flags['rareFruit' + (G.flags.rareFruitN || 0)]) { G.flags.rareFruitN = (G.flags.rareFruitN || 0) + 1; if (G.flags.rareFruitN <= 2) dropLoot('fruit', e.x, e.y + 1, e.z); }
    G.stats.pirates += e.kind === 'imp' ? 0 : 1;
    Comp.addSurge(12);
    if (e.group && this.groups[e.group]) { const g = this.groups[e.group]; g.alive--; if (g.alive <= 0 && g.onClear) { const f = g.onClear; g.onClear = null; setTimeout(f, 600); } }
    Bus.emit('enemyDown', e);
  },
  clearAll() { for (const e of this.list) { W.scene.remove(e.root); if (e.hpBar) e.hpBar.remove(); if (e.tele) e.tele.dead = true; } this.list = []; this.groups = {}; },
  removeGroup(id) { this.list = this.list.filter((e) => { if (e.group === id) { W.scene.remove(e.root); if (e.hpBar) e.hpBar.remove(); if (e.tele) e.tele.dead = true; return false; } return true; }); delete this.groups[id]; },
  onPlayerDefeated() {
    // reset combat encounters (heal enemies, return home)
    for (const e of this.list) {
      if (e.dead) continue;
      // gentle: the captain keeps most of the damage you dealt
      e.hp = e.kind === 'captain' ? Math.min(e.maxHp, e.hp + e.maxHp * 0.2) : e.maxHp;
      e.x = e.home.x; e.z = e.home.z; e.state = 'idle'; e.atkT = 0; if (e.tele) e.tele.dead = true; if (e.kind === 'captain') Boss.reset(e);
    }
    Projectiles.clear();
  },
  update(dt) {
    let combat = false;
    for (const e of this.list) {
      if (e.dead) {
        if (e.flee) { e.flee.t += dt; e.x += e.flee.vx * dt; e.y += e.flee.vy * dt; e.z += e.flee.vz * dt; e.root.position.set(e.x, e.y, e.z); e.model.body.rotation.z = Math.sin(e.flee.t * 30) * 0.6; if (e.flee.t > 2.5) { W.scene.remove(e.root); e.flee = null; } }
        continue;
      }
      e.t += dt; e.flash = Math.max(0, e.flash - dt);
      if (e.kind === 'dummy') { e.wob = Math.max(0, (e.wob || 0) - dt * 2); e.root.position.set(e.x, e.y, e.z); e.root.rotation.z = Math.sin(e.t * 20) * 0.2 * e.wob; continue; }
      if (e.kind === 'crow') { this.updateCrow(e, dt); continue; }
      if (e.kind === 'captain') { Boss.update(e, dt); if (e.state !== 'idle') combat = true; this.render(e, dt); continue; }
      const d = dist2d(e, P1);
      const playerHere = Math.abs(P1.y - e.y) < 5 || (P1.mode === 'fly' && e.kind === 'gunner' && d < 30);
      if (e.state === 'idle') {
        if (d < e.aggro && playerHere && G.mode === 'play') { e.state = 'chase'; Sprites.emote(e, 'bang', 1.2); if (e.kind !== 'imp') Audio.sfx('warn'); }
        // idle wander
        e.vx = damp(e.vx, 0, 5, dt); e.vz = damp(e.vz, 0, 5, dt);
      } else {
        combat = combat || d < 30;
        if (d > 40 && !e.opt.stay) { e.state = 'idle'; e.hp = e.maxHp; }
      }
      if (e.stun > 0) { e.stun -= dt; e.atkT = 0; e.vx = damp(e.vx, 0, 6, dt); e.vz = damp(e.vz, 0, 6, dt); }
      else if (e.state === 'chase') this.ai(e, dt, d);
      // physics
      if (e.focusT > 0) { e.focusT -= dt; if (e.focusT <= 0) e.focus = 'player'; }
      const nx = e.x + e.vx * dt, nz = e.z + e.vz * dt;
      const p = { x: nx, z: nz }; Colliders.resolve(p, e.r, e.y, 1.2, e.h);
      const g = Colliders.ground(p.x, p.z, e.y, 1.2);
      if (g - e.y < 1.3 && (Terrain.getH(p.x, p.z) > -1.0 || g > -0.5 || e.kind === 'imp')) { e.x = p.x; e.z = p.z; }
      else { e.vx *= -0.3; e.vz *= -0.3; }
      // separation
      for (const o of this.list) { if (o === e || o.dead || o.kind === 'crow') continue; const dx = e.x - o.x, dz = e.z - o.z, dd = Math.hypot(dx, dz); const m = e.r + o.r + 0.2; if (dd < m && dd > 0.001) { e.x += (dx / dd) * (m - dd) * 0.5; e.z += (dz / dd) * (m - dd) * 0.5; } }
      e.vy -= 30 * dt; e.y += e.vy * dt; const g2 = Colliders.ground(e.x, e.z, e.y + 0.5, 1.2); if (e.y < g2) { e.y = g2; e.vy = 0; }
      if (e.y < -3) { e.y = g2; }
      this.render(e, dt);
    }
    G.inCombat = combat;
  },
  updateCrow(e, dt) {
    e.t += dt; e.root.position.set(e.x, e.y + Math.abs(Math.sin(e.t * 3)) * 0.05, e.z);
    e.model.body.rotation.x = Math.sin(e.t * 5) > 0.95 ? 0.5 : 0; // peck
    const near = dist2d(e, P1) < 1.5 || (Comp.C && dist2d(e, Comp) < 1.4 + Comp.C.radius);
    if (near) { this.kill(e, { src: 'scare' }); }
  },
  ai(e, dt, d) {
    const def = ENEMY_DEF[e.kind];
    const tgt = e.focus === 'comp' && Comp.C && !Comp.mounted ? Comp : P1;
    const dx = tgt.x - e.x, dz = tgt.z - e.z, dt2 = Math.hypot(dx, dz) || 1;
    if (e.atkT > 0) { this.attackTick(e, dt, tgt); return; }
    e.cd -= dt;
    const want = e.kind === 'gunner' || e.kind === 'imp' ? 8 : def.range * 0.8;
    let mx = 0, mz = 0;
    if (dt2 > want + 0.5) { mx = dx / dt2; mz = dz / dt2; }
    else if (dt2 < want - 2 && (e.kind === 'gunner' || e.kind === 'imp')) { mx = -dx / dt2; mz = -dz / dt2; }
    else { // circle strafe
      const s = Math.sin(e.t * 0.7 + e.home.x) > 0 ? 1 : -1; mx = (-dz / dt2) * s * 0.5; mz = (dx / dt2) * s * 0.5;
    }
    const spd = def.speed * (e.bubbled > 0 ? 0.3 : 1);
    e.vx = damp(e.vx, mx * spd, 6, dt); e.vz = damp(e.vz, mz * spd, 6, dt);
    e.yaw = dampAngle(e.yaw, Math.atan2(dx, dz), 8, dt);
    if (e.bubbled > 0) e.bubbled -= dt;
    // decide to attack
    const reach = def.range + (tgt === Comp ? Comp.C.radius : 0);
    const attackers = this.list.filter((o) => !o.dead && o.atkT > 0).length;
    if (e.cd <= 0 && attackers < 2 && dt2 < reach + 0.5 && Math.abs(tgt.y - e.y) < 3.5) this.startAttack(e, tgt);
    if (e.cd <= 0 && (e.kind === 'gunner' || e.kind === 'imp') && dt2 < def.range + 6 && attackers < 2) this.startAttack(e, tgt);
  },
  startAttack(e, tgt) {
    const def = ENEMY_DEF[e.kind];
    e.atkYaw = Math.atan2(tgt.x - e.x, tgt.z - e.z); e.yaw = e.atkYaw;
    e.vx = 0; e.vz = 0;
    if (e.kind === 'deckhand') { e.atkT = e.atkDur = 0.75; e.tele = Telegraphs.cone(e.x, e.z, e.atkYaw, def.range + 0.6, 1.8, 0.75, e.y); }
    else if (e.kind === 'brute') { e.atkT = e.atkDur = 1.1; const fx = e.x + Math.sin(e.atkYaw) * 1.8, fz = e.z + Math.cos(e.atkYaw) * 1.8; e.atkPt = { x: fx, z: fz }; e.tele = Telegraphs.circle(fx, fz, 3.0, 1.1, 0xff4a3a, e.y); }
    else if (e.kind === 'gunner') {
      e.atkT = e.atkDur = 0.6;
      const lead = 0.6; const tx = tgt.x + (tgt.vx || 0) * lead * 0.5, tz = tgt.z + (tgt.vz || 0) * lead * 0.5;
      e.atkPt = { x: tx, z: tz }; Audio.sfx('fuse');
    }
    else if (e.kind === 'imp') { e.atkT = e.atkDur = 0.55; }
    e.cd = rand(1.4, 2.4) + (e.kind === 'brute' ? 1 : 0);
  },
  attackTick(e, dt, tgt) {
    const before = e.atkT; e.atkT -= dt;
    const def = ENEMY_DEF[e.kind];
    if (e.atkT > 0) return;
    // release
    e.tele = null;
    if (e.kind === 'deckhand') {
      Audio.sfx('whoosh');
      for (let i = 0; i < 6; i++) { const a = e.atkYaw + (i / 5 - 0.5) * 1.8; FX.trail(e.x + Math.sin(a) * 2, e.y + 1.1, e.z + Math.cos(a) * 2, 0xffd0c0, 0.5); }
      this.hitTargets(e, (o) => { const dx = o.x - e.x, dz = o.z - e.z, d = Math.hypot(dx, dz); return d < def.range + 0.9 && Math.abs(wrapAngle(Math.atan2(dx, dz) - e.atkYaw)) < 1.0; }, 12 + G.stage * 2);
      e.swing = 0.3;
    } else if (e.kind === 'brute') {
      Audio.sfx('boom'); Cam.shake = Math.max(Cam.shake, 0.4); FX.dust(e.atkPt.x, e.y, e.atkPt.z, 20);
      this.hitTargets(e, (o) => dist2d(o, e.atkPt) < 3.2, 22 + G.stage * 3, 9);
      e.swing = 0.4;
    } else if (e.kind === 'gunner') {
      const tx = e.atkPt.x, tz = e.atkPt.z; const dx = tx - e.x, dz = tz - e.z; const d = Math.hypot(dx, dz);
      const T = clamp(d / 10, 0.7, 1.4);
      const gy2 = Colliders.ground(tx, tz, e.y + 4, 3); const ty = Math.max(gy2, Terrain.getH(tx, tz) < -0.5 ? 0 : gy2);
      const tele = Telegraphs.circle(tx, tz, 2.6, T, 0xff4a3a, ty);
      Projectiles.spawn({ kind: 'bomb', x: e.x, y: e.y + 1.6, z: e.z, vx: dx / T, vz: dz / T, vy: (ty - (e.y + 1.6)) / T + 0.5 * 20 * T, grav: 20, dmg: 14 + G.stage * 2, from: 'enemy', blast: 2.6, tele });
      Audio.sfx('whoosh'); e.swing = 0.3;
    } else if (e.kind === 'imp') {
      const dx = tgt.x - e.x, dz = tgt.z - e.z, d = Math.hypot(dx, dz) || 1; const T = clamp(d / 12, 0.4, 1);
      Projectiles.spawn({ kind: 'snowball', x: e.x, y: e.y + 1, z: e.z, vx: dx / T, vz: dz / T, vy: (tgt.y + 1 - (e.y + 1)) / T + 0.5 * 14 * T, grav: 14, dmg: 6, from: 'enemy' });
      e.swing = 0.3;
    }
    void before;
  },
  hitTargets(e, test, dmg, kb = 6) {
    if (test(P1) && Math.abs(P1.y - e.y) < 2.5) playerTakeDamage(dmg, e.x, e.z, { kb });
    if (Comp.C && !Comp.mounted && test(Comp) && Math.abs(Comp.y - e.y) < 2.5) { Comp.dazed = 1.2; Sprites.emote(Comp.emoteTarget, 'sweat', 1.2); Audio.sfx('creature', { type: G.ctype, mood: 'sad', stage: G.stage }); Comp.vx += Math.sin(e.atkYaw || 0) * 6; Comp.vz += Math.cos(e.atkYaw || 0) * 6; }
  },
  render(e, dt) {
    e.root.position.set(e.x, e.y, e.z); e.root.rotation.y = e.yaw;
    const sp = Math.hypot(e.vx, e.vz);
    if (e.H) {
      const st = { speed: sp, mode: 'walk', attack: 0, heavy: e.kind === 'brute' };
      if (e.atkT > 0) { const k = e.atkT / e.atkDur; st.attack = 0; if (e.kind === 'brute') { e.H.arms[0].rotation.x = -2.8 * (1 - k * 0.2); } }
      if (e.swing > 0) { e.swing -= dt; st.attack = e.swing / 0.4; }
      if (e.stun > 0) st.hurt = 1;
      animateHuman(e.H, st, dt);
      if (e.atkT > 0) { // windup pose
        const k = 1 - e.atkT / e.atkDur;
        if (e.kind === 'brute') { e.H.arms[0].rotation.set(-2.9 * k - 0.2, 0, -0.1); e.H.arms[1].rotation.set(-2.9 * k - 0.2, 0, 0.1); e.H.torso.rotation.x = -0.3 * k; }
        else if (e.kind === 'gunner') { e.H.arms[1].rotation.set(-2.4 * k, 0, 0.2); }
        else { e.H.arms[1].rotation.set(-1.2, 0, 1.3 * k); e.H.torso.rotation.y = -0.8 * k; }
        e.root.position.x += Math.sin(e.t * 40) * 0.03 * k;
      }
      if (e.stun > 0) { e.H.head.rotation.z = Math.sin(e.t * 8) * 0.3; if (Math.random() < dt * 4) FX.spawn({ x: e.x + rand(-0.4, 0.4), y: e.y + e.h + 0.2, z: e.z + rand(-0.4, 0.4), vy: 0.5, life: 0.6, size: 0.35, color: 0xfff2a8, add: true }); }
      if (e.bubbled > 0) { if (!e.bubbleM) { e.bubbleM = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), new THREE.MeshBasicMaterial({ color: linColor(0xc8f8ff), transparent: true, opacity: 0.35, depthWrite: false })); e.root.add(e.bubbleM); e.bubbleM.position.y = 1.1; } e.bubbleM.visible = true; } else if (e.bubbleM) e.bubbleM.visible = false;
      if (e.kind === 'gunner' && e.atkT > 0 && !e.bombHeld) { /* fuse sparks */ if (Math.random() < dt * 20) FX.spawn({ x: e.x + Math.sin(e.yaw) * 0.4, y: e.y + 2.4, z: e.z + Math.cos(e.yaw) * 0.4, life: 0.3, size: 0.25, color: 0xffd34d, add: true, vy: 1 }); }
    } else if (e.kind === 'imp') {
      e.model.body.position.y = Math.abs(Math.sin(e.t * 6)) * 0.25; e.model.body.rotation.z = Math.sin(e.t * 6) * 0.1;
      e.model.arms.forEach((a, i) => (a.rotation.x = e.atkT > 0 ? -2.6 : Math.sin(e.t * 6 + i * 3) * 0.5));
      if (Math.random() < dt * 3) FX.spawn({ x: e.x, y: e.y + 0.4, z: e.z, life: 0.8, size: 0.2, color: 0xffffff, vy: -0.3 });
    }
    // hit flash
    const flash = e.flash > 0;
    if (flash !== e._flashOn) { e._flashOn = flash; e.root.traverse((m) => { if (m.isMesh && m.material && m.material.emissive) { if (!m.material._cl) { m.material = m.material.clone(); m.material._cl = true; } m.material.emissive.setRGB(flash ? 0.9 : 0, flash ? 0.9 : 0, flash ? 0.9 : 0); } }); }
    if (e.hpBar) UI.updateEnemyBar(e);
  },
};

function dropLoot(kind, x, y, z) {
  if (kind === 'fruit') Pickups.spawn('fruit', x, y, z, { magnet: false });
  else if (kind === 'cutlass' || kind === 'anchor' || kind === 'saber') {
    if (G.weapons[kind]) { for (let i = 0; i < 8; i++) Pickups.spawn('coin', x, y, z, { val: 2 }); return; }
    const m = meshOf(weaponGeo(kind)); m.rotation.z = 0.5;
    const g = new THREE.Group(); g.add(m);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.star, color: linColor(0xfff2a8), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); gl.scale.set(2, 2, 1); gl.position.y = 0.6; g.add(gl);
    Pickups.spawn('weapon', x, y, z, { mesh: g, data: kind, magnet: false });
  }
  else if (kind === 'pearl') { const m = new THREE.Mesh(sph(0.45, 12, 10), glowMat(0xf6f0ff)); Pickups.spawn('item', x, y, z, { mesh: m, data: 'moonpearl', magnet: false }); }
}

// ───── Boss: Captain Grimtide ─────
const Boss = {
  e: null, bar: null,
  start(x, z, y) {
    const e = Enemies.spawn('captain', x, z, { y, state: 'idle', aggro: 13, stay: true, drop: ['saber', 'fruit', 'pearl'], group: 'captain' });
    e.phase = 1; e.invuln = 0; e.moveCd = 2; e.summoned = {};
    this.e = e; return e;
  },
  reset(e) { e.phase = 1; e.atkT = 0; e.mv = null; e.invuln = 0; e.stun = 0; },
  update(e, dt) {
    const d = dist2d(e, P1);
    if (e.state === 'idle') {
      e.vx = damp(e.vx, 0, 5, dt); e.vz = damp(e.vz, 0, 5, dt);
      if (d < e.aggro && G.mode === 'play' && Math.abs(P1.y - e.y) < 4) { e.state = 'chase'; Bus.emit('bossStart'); }
      this.phys(e, dt); return;
    }
    if (e.invuln > 0) e.invuln -= dt;
    const hpk = e.hp / e.maxHp;
    // phase transitions: summon reinforcements
    if (hpk < 0.66 && !e.summoned[1]) { e.summoned[1] = true; this.summon(e, 1); }
    if (hpk < 0.33 && !e.summoned[2]) { e.summoned[2] = true; this.summon(e, 2); }
    e.phase = hpk < 0.33 ? 3 : hpk < 0.66 ? 2 : 1;
    if (e.stun > 0) { e.stun -= dt; e.mv = null; e.atkT = 0; if (e.tele) { e.tele.dead = true; e.tele = null; } this.phys(e, dt); return; }
    const tgt = P1;
    const dx = tgt.x - e.x, dz = tgt.z - e.z, dd = Math.hypot(dx, dz) || 1;
    if (e.mv) {
      const mv = e.mv; mv.t += dt;
      if (mv.kind === 'sweep') {
        if (mv.t < mv.wind) { e.yaw = dampAngle(e.yaw, mv.yaw, 10, dt); }
        else if (!mv.done) { mv.done = true; e.tele = null; Audio.sfx('heavyswing'); for (let i = 0; i < 10; i++) { const a = mv.yaw + (i / 9 - 0.5) * 2.6; FX.trail(e.x + Math.sin(a) * 4, e.y + 1.5, e.z + Math.cos(a) * 4, 0xffc0c0, 0.7); } Enemies.hitTargets(e, (o) => { const ox = o.x - e.x, oz = o.z - e.z, od = Math.hypot(ox, oz); return od < 5.2 && Math.abs(wrapAngle(Math.atan2(ox, oz) - mv.yaw)) < 1.35; }, 20, 10); e.swing = 0.4; }
        if (mv.t > mv.wind + 0.5) e.mv = null;
      } else if (mv.kind === 'charge') {
        if (mv.t < mv.wind) { e.yaw = mv.yaw; e.vx = 0; e.vz = 0; }
        else if (mv.t < mv.wind + 0.75) {
          if (!mv.go) { mv.go = true; e.tele = null; Audio.sfx('roar'); }
          e.vx = Math.sin(mv.yaw) * 20; e.vz = Math.cos(mv.yaw) * 20;
          if (Math.random() < 0.5) FX.dust(e.x, e.y, e.z, 2);
          if (!mv.hit && dist2d(e, P1) < 1.8 && Math.abs(P1.y - e.y) < 2.5) { mv.hit = true; playerTakeDamage(22, e.x - Math.sin(mv.yaw) * 2, e.z - Math.cos(mv.yaw) * 2, { kb: 12 }); }
          if (Comp.C && !Comp.mounted && dist2d(e, Comp) < 2 + Comp.C.radius && !mv.chit) { mv.chit = true; Comp.dazed = 1; }
        } else { e.vx = damp(e.vx, 0, 6, dt); e.vz = damp(e.vz, 0, 6, dt); if (mv.t > mv.wind + 1.4) { e.mv = null; e.stun = 0.9; Floaters.add('Winded!', { x: e.x, y: e.y + 4, z: e.z }, 'info'); } }
      } else if (mv.kind === 'barrage') {
        if (mv.t > mv.next && mv.n > 0) {
          mv.n--; mv.next = mv.t + 0.35;
          const tx = P1.x + rand(-3, 3) + P1.vx * 0.4, tz = P1.z + rand(-3, 3) + P1.vz * 0.4;
          const T = 1.1; const ty = Colliders.ground(tx, tz, P1.y + 3, 3);
          const tele = Telegraphs.circle(tx, tz, 2.8, T, 0xff4a3a, ty);
          Projectiles.spawn({ kind: 'bomb', x: e.x, y: e.y + 3, z: e.z, vx: (tx - e.x) / T, vz: (tz - e.z) / T, vy: (ty - (e.y + 3)) / T + 0.5 * 20 * T, grav: 20, dmg: 15, from: 'enemy', blast: 2.8, tele });
          Audio.sfx('fuse');
        }
        e.yaw = dampAngle(e.yaw, Math.atan2(dx, dz), 6, dt);
        if (mv.n <= 0 && mv.t > mv.next + 0.6) e.mv = null;
      }
      this.phys(e, dt); return;
    }
    // approach
    const want = 2.6;
    if (dd > want) { e.vx = damp(e.vx, (dx / dd) * 4.2 * (e.phase === 3 ? 1.25 : 1), 5, dt); e.vz = damp(e.vz, (dz / dd) * 4.2 * (e.phase === 3 ? 1.25 : 1), 5, dt); }
    else { e.vx = damp(e.vx, 0, 6, dt); e.vz = damp(e.vz, 0, 6, dt); }
    e.yaw = dampAngle(e.yaw, Math.atan2(dx, dz), 6, dt);
    e.moveCd -= dt;
    if (e.moveCd <= 0) {
      const r = Math.random();
      const yaw = Math.atan2(dx, dz);
      const speedK = e.phase === 3 ? 0.8 : 1;
      if (dd < 5.5 && (r < 0.55 || e.phase === 1)) { e.mv = { kind: 'sweep', t: 0, wind: 0.95 * speedK, yaw }; e.tele = Telegraphs.cone(e.x, e.z, yaw, 5.2, 2.7, 0.95 * speedK, e.y); Audio.sfx('warn'); e.moveCd = 1.6 * speedK; }
      else if (e.phase >= 2 && r < 0.8 && dd > 4) { e.mv = { kind: 'charge', t: 0, wind: 1.0 * speedK, yaw }; e.tele = this.lineTele(e, yaw, 15, 1.0 * speedK); Audio.sfx('warn'); e.moveCd = 2.4 * speedK; }
      else if (dd >= 5.5 || e.phase >= 2) { e.mv = { kind: 'barrage', t: 0, n: e.phase === 3 ? 6 : 4, next: 0.4 }; Audio.sfx('warn'); Floaters.add('Bombs away!', { x: e.x, y: e.y + 4.5, z: e.z }, 'info'); e.moveCd = 2.6 * speedK; }
      else e.moveCd = 0.5;
    }
    this.phys(e, dt);
  },
  lineTele(e, yaw, len, dur) {
    const g = new THREE.PlaneGeometry(2.6, len); g.rotateX(-Math.PI / 2); g.translate(0, 0, len / 2);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: linColor(0xff4a3a), transparent: true, opacity: 0.3, depthWrite: false }));
    m.position.set(e.x, e.y + 0.15, e.z); m.rotation.y = yaw; W.scene.add(m);
    const o = { grp: m, f: m, t: 0, dur, kind: 'cone' }; Telegraphs.list.push(o); return o;
  },
  summon(e, n) {
    Audio.sfx('roar'); UI.toast('Grimtide: "All hands! Throw these meddlers overboard!"', 'bang');
    const kinds = n === 1 ? ['deckhand', 'deckhand', 'gunner'] : ['brute', 'deckhand', 'gunner'];
    kinds.forEach((k, i) => { const p = shipLocal(-Ship.L + 14, (i - 1) * 3.5); const en = Enemies.spawn(k, p.x, p.z, { y: Ship.aft, state: 'chase', stay: true, group: 'bossadds' + n }); FX.dust(en.x, en.y, en.z, 10); });
    e.invuln = 1.0;
  },
  phys(e, dt) {
    const p = { x: e.x + e.vx * dt, z: e.z + e.vz * dt }; Colliders.resolve(p, e.r, e.y, 1.2, 3);
    const g = Colliders.ground(p.x, p.z, e.y, 1.2);
    if (Math.abs(g - e.y) < 1.3) { e.x = p.x; e.z = p.z; e.y = g; } else { e.vx = 0; e.vz = 0; }
    // keep on quarterdeck area
    const sl = shipLocalOf(e.x, e.z); if (sl.x > -Ship.L + 15.5 || sl.x < -Ship.L + 0.5 || Math.abs(sl.z) > 5.6) { const c = shipLocal(clamp(sl.x, -Ship.L + 0.5, -Ship.L + 15.5), clamp(sl.z, -5.6, 5.6)); e.x = c.x; e.z = c.z; }
  },
};

// Ship cannons: fire at player when flying close or swimming near
const Cannons = {
  active: false,
  update(dt) {
    if (!this.active || G.mode !== 'play') return;
    const d = dist2d(P1, Ship);
    if (d > 90 || P1.onShip) return;
    for (const c of Spots.cannons) {
      c.cd -= dt;
      const sideOK = true;
      if (c.cd <= 0 && sideOK && dist2d(c, P1) < 70) {
        c.cd = rand(3.5, 6);
        const lead = 1.2; const tx = P1.x + P1.vx * lead, tz = P1.z + P1.vz * lead;
        const flying = P1.mode === 'fly' || P1.mode === 'glide';
        const ty = flying ? P1.y + P1.vy * lead * 0.5 : Math.max(0, Colliders.ground(tx, tz, P1.y + 2, 3));
        const T = 1.8;
        const sx = c.mx, sz = c.mz, sy = Ship.deck + 0.8;
        if (!flying) { const tele = Telegraphs.circle(tx, tz, 3, T, 0xff4a3a, ty); Projectiles.spawn({ kind: 'cannonball', x: sx, y: sy, z: sz, vx: (tx - sx) / T, vz: (tz - sz) / T, vy: (ty - sy) / T + 0.5 * 9.8 * T, grav: 9.8, dmg: 16, from: 'enemy', blast: 3, tele }); }
        else { // flak: telegraphed burst puff at predicted point
          const pt = { x: tx, y: ty, z: tz };
          const warn = new THREE.Mesh(new THREE.SphereGeometry(3.2, 14, 10), new THREE.MeshBasicMaterial({ color: linColor(0xff4a3a), transparent: true, opacity: 0.18, depthWrite: false }));
          warn.position.set(pt.x, pt.y, pt.z); W.scene.add(warn);
          const o = { grp: warn, f: warn, t: 0, dur: T, kind: 'cone' }; Telegraphs.list.push(o);
          Projectiles.spawn({ kind: 'cannonball', x: sx, y: sy, z: sz, vx: (tx - sx) / T, vz: (tz - sz) / T, vy: (ty - sy) / T + 0.5 * 9.8 * T, grav: 9.8, dmg: 0, from: 'enemy', blast: 0, tele: o });
          setTimeout(() => { Audio.sfx('boom'); FX.burst(pt.x, pt.y, pt.z, 30, { speed: 6, life: 0.6, size: 1.4, size1: 0.3, color: 0xffb347, color1: 0xff3a10, add: true }); FX.burst(pt.x, pt.y, pt.z, 10, { speed: 2, life: 1.4, size: 2, size1: 4, color: 0x5a5a5a, alpha: 0.5 }); if (dist3d(P1, pt) < 3.6) playerTakeDamage(14, pt.x, pt.z, { kb: 8 }); }, T * 1000);
        }
        Audio.sfx('cannon');
        FX.burst(sx, sy, sz, 12, { speed: 3, life: 1.2, size: 1.5, size1: 3.5, color: 0xd8d0c8, alpha: 0.6 });
        c.g.position.y = Ship.deck - 0.1; setTimeout(() => (c.g.position.y = Ship.deck), 200);
        if (!G.hints.cannon) { G.hints.cannon = 1; UI.toast('Cannons! Watch for the red warning zones.', 'bang'); }
        break; // one cannon per tick
      }
    }
  },
};
