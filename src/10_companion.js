// ───────────────────────── companion ─────────────────────────
const Comp = {
  C: null, x: 0, y: 0, z: 0, yaw: 0, vx: 0, vz: 0, vy: 0, mounted: false, air: false, swim: false,
  state: 'follow', mood: 'idle', moodT: 0, abilityCd: 0, ward: 0, wardT: 0, wardMesh: null, bank: 0, pitchV: 0, renderBob: 0, strikeT: 0,
  surge: 0, idleT: 0, look: null, lookT: 0, sensed: {}, senseCd: 4, attackCd: 0, target: null, dazed: 0, protectCd: 0, chatterCd: 8,
  goto: null, playBall: null, trailCd: 0, stepAcc: 0, celebrateT: 0, followSide: 1, abilityActive: null,
  emoteY() { return this.C ? this.C.headY + 0.6 : 2; },
  get root() { return this.C ? this.C.root : null; },
  elemColor() { return G.ctype === 'ember' ? 0xff9a4a : G.ctype === 'cloud' ? 0xeaf6ff : 0x9ff3ff; },
  build() {
    const pos = this.C ? this.C.root.position.clone() : null;
    if (this.C) W.scene.remove(this.C.root);
    this.C = buildCreature(G.ctype, G.stage, PALETTES[G.ctype][G.palette || 0]);
    W.scene.add(this.C.root);
    this.emoteTarget = { root: this.C.root, emoteY: () => this.emoteY() };
    if (pos) this.C.root.position.copy(pos);
    // ward bubble
    if (!this.wardMesh) {
      this.wardMesh = new THREE.Mesh(new THREE.SphereGeometry(1.5, 18, 12), new THREE.MeshBasicMaterial({ color: linColor(0x9ff3ff), transparent: true, opacity: 0.22, depthWrite: false }));
      this.wardMesh.visible = false; W.scene.add(this.wardMesh);
    }
  },
  setMood(m, t = 2) { this.mood = m; this.moodT = t; },
  react(kind, text) {
    // companion reaction to events
    const map = { discover: ['star', 'celebrate'], treasure: ['star', 'happy'], hurt: ['bang', 'angry'], pet: ['heart', 'happy'], food: ['heart', 'happy'], scared: ['sweat', 'scared'], curious: ['q', 'curious'], sing: ['note', 'happy'], win: ['star', 'celebrate'] };
    const [em, mood] = map[kind] || ['heart', 'happy'];
    if (this.C && !this.mounted) Sprites.emote(this.emoteTarget, em, 1.6);
    else if (this.C) Sprites.emote(P1, em, 1.6, 0.6);
    this.setMood(mood, kind === 'discover' || kind === 'win' ? 2.2 : 1.6);
    if (kind !== 'scared') Audio.sfx('creature', { type: G.ctype, mood: mood === 'celebrate' ? 'celebrate' : 'happy', stage: G.stage });
    if (text) UI.toast(text, kind === 'treasure' || kind === 'discover' ? 'star' : 'heart');
  },
  teleportNear() {
    if (!this.C) return;
    this.x = P1.x - Math.sin(P1.yaw) * 2.5 + 1.5; this.z = P1.z - Math.cos(P1.yaw) * 2.5; this.y = Colliders.ground(this.x, this.z, P1.y + 2, 3);
    if (this.y < -1 && Terrain.getH(this.x, this.z) < -1) this.y = -0.3;
    this.air = false; this.vy = 0;
  },
  onPlayerHurt(fx, fz) {
    if (!this.C || this.mounted) return;
    const e = Enemies.nearestTo(fx, fz, 4);
    if (e && this.protectCd <= 0) { this.target = e; this.protectCd = 4; this.dashTo = e; this.react('hurt'); }
  },
  pet() {
    P1.petT = 1.1; this.setMood('happy', 2.4); FX.hearts(this.x, this.y + this.C.headY, this.z);
    Audio.sfx('heart'); Audio.sfx('creature', { type: G.ctype, mood: 'happy', stage: G.stage });
    Sprites.emote(this.emoteTarget, 'heart', 1.6);
    G.stats.pets++;
    const k = 'pet' + G.stage; G.flags[k] = (G.flags[k] || 0) + 1;
    if (G.flags[k] <= 5) gainXP(3, 'Cuddle');
    this.idleT = 0; this.state = 'follow';
    Bus.emit('pet');
  },
  update(dt) {
    if (!this.C) return;
    const C = this.C;
    this.abilityCd = Math.max(0, this.abilityCd - dt); this.attackCd = Math.max(0, this.attackCd - dt); this.protectCd = Math.max(0, this.protectCd - dt);
    this.dazed = Math.max(0, this.dazed - dt); this.strikeT = Math.max(0, this.strikeT - dt); this.celebrateT = Math.max(0, this.celebrateT - dt);
    if (this.moodT > 0) { this.moodT -= dt; if (this.moodT <= 0) this.mood = 'idle'; }
    if (this.wardT > 0) { this.wardT -= dt; if (this.wardT <= 0) this.ward = 0; }
    this.wardMesh.visible = this.ward > 0;
    if (this.ward > 0) { this.wardMesh.position.set(P1.x, P1.y + 1.1 + (this.mounted ? C.seatY * 0.6 : 0), P1.z); const s = (this.mounted ? 1.6 + G.stage * 0.3 : 1) * (1 + Math.sin(W.time * 4) * 0.03); this.wardMesh.scale.setScalar(s); }
    if (this.abilityActive) this.abilityActive.update(dt);
    if (this.mounted) return this.updateMounted(dt);
    this.updateFree(dt);
  },
  updateMounted(dt) {
    const C = this.C;
    this.x = P1.x; this.y = P1.y; this.z = P1.z; this.yaw = P1.yaw;
    const m = P1.mode;
    C.root.position.set(P1.x, P1.y, P1.z); C.root.rotation.set(0, P1.yaw, 0);
    const fly = m === 'fly' || m === 'glide';
    const st = { speed: P1.hspeed, fly, flap: m === 'glide' ? 0.08 : P1.boosting ? 1 : Input.down('space') ? 1 : P1.hspeed > 4 ? 0.55 : 0.75, bank: this.bank, pitch: this.pitchV, swim: m === 'rideSwim', mood: this.strikeT > 0 ? 'angry' : this.mood, lookAt: this.lookTargetPos() };
    if (m === 'glide') { st.flapRate = 1.2; }
    animateCreature(C, st, dt);
    this.renderBob = C.scaler.position.y;
    if (this.strikeT > 0) { C.headPivot.rotation.x -= Math.sin((this.strikeT / 0.35) * Math.PI) * 0.6; }
    // wing trails
    if (fly && (P1.hspeed > 14 || P1.boosting)) {
      this.trailCd -= dt;
      if (this.trailCd <= 0) { this.trailCd = 0.03; const tips = creatureWingTips(C, []); for (const t of tips) FX.trail(t.x, t.y, t.z, P1.boosting ? this.elemColor() : 0xffffff, P1.boosting ? 0.5 : 0.3); }
      if (P1.boosting && Math.random() < dt * 30) FX.spawn({ x: P1.x + rand(-1, 1), y: P1.y + rand(0, 2), z: P1.z + rand(-1, 1), vx: -P1.vx * 0.3, vz: -P1.vz * 0.3, life: 0.4, size: 0.2, size1: 0.02, color: 0xffffff, add: true });
    }
    if (m === 'rideSwim' && P1.y < -1.6 && Math.random() < dt * 6) FX.bubble(P1.x + rand(-1, 1), P1.y + 1, P1.z + rand(-1, 1));
  },
  lookTargetPos() {
    // something interesting to look at
    this.lookT -= 1 / 60;
    if (this.lookT <= 0) {
      this.lookT = 0.5;
      let best = null, bd = 14;
      const e = Enemies.nearest(this, 16); if (e) { best = { x: e.x, y: e.y + 1, z: e.z }; bd = 0; }
      if (!best) for (const p of Pickups.list) { const d = dist2d(p, this); if (d < bd) { bd = d; best = p; } }
      if (!best) for (const n of NPCs.list) { if (!n.root.visible) continue; const d = dist2d(n, this); if (d < Math.min(bd, 9)) { bd = d; best = { x: n.x, y: n.y + 1.4, z: n.z }; } }
      if (!best) for (const c of Chests) { if (c.opened) continue; const d = dist2d(c, this); if (d < bd) { bd = d; best = c; } }
      if (!best && !this.mounted) best = { x: P1.x, y: P1.y + (P1.H ? P1.H.height : 1.5), z: P1.z };
      this.look = best;
    }
    return this.look;
  },
  updateFree(dt) {
    const C = this.C;
    const pm = P1.mode;
    // desired position: beside & behind player
    const side = this.followSide;
    const back = 2.2 + C.radius * 1.4, lat = 1.4 + C.radius;
    let tx = P1.x - Math.sin(P1.yaw) * back + Math.cos(P1.yaw) * lat * side;
    let tz = P1.z - Math.cos(P1.yaw) * back - Math.sin(P1.yaw) * lat * side;
    let ty = null;
    let speedMul = 1;
    // combat behaviour
    if (G.inCombat && this.dazed <= 0) {
      if (!this.target || this.target.dead || dist2d(this.target, P1) > 18) this.target = Enemies.targetFor(this);
      if (this.target) {
        const e = this.target; const d = dist2d(e, this);
        const reach = 1.4 + C.radius + e.r;
        tx = e.x - ((e.x - this.x) / (d || 1)) * reach * 0.9; tz = e.z - ((e.z - this.z) / (d || 1)) * reach * 0.9;
        speedMul = this.dashTo === e ? 2.2 : 1.4;
        if (d < reach + 0.6 && this.attackCd <= 0) {
          this.attackCd = 1.5 - G.stage * 0.12; this.strikeT = 0.35;
          const dmg = 4 + G.stage * 4 + (G.flags.kindled ? 3 : 0);
          setTimeout(() => { if (!e.dead) { Enemies.hurt(e, dmg, e.x - this.x, e.z - this.z, { kb: 3 + G.stage, src: 'comp', interrupt: this.dashTo === e }); FX.hit(e.x, e.y + 1, e.z, this.elemColor()); } }, 140);
          Audio.sfx('creature', { type: G.ctype, mood: 'angry', stage: G.stage });
          this.dashTo = null;
        }
      }
    } else this.target = null;
    // special goto (play, sensing)
    if (this.goto && !G.inCombat) { tx = this.goto.x; tz = this.goto.z; speedMul = this.goto.speed || 1.2; this.goto.t = (this.goto.t || 0) + dt; if (this.goto.t > (this.goto.max || 6)) this.goto = null; }
    const dx = tx - this.x, dz = tz - this.z; const dist = Math.hypot(dx, dz);
    const pdist = Math.hypot(P1.x - this.x, P1.z - this.z);
    // teleport if hopelessly far
    if (pdist > 70) { this.teleportNear(); FX.sparkle(this.x, this.y + 1, this.z, this.elemColor()); }
    const pAlt = P1.y - Colliders.ground(P1.x, P1.z, P1.y, 1.2);
    const playerUnder = P1.y < -1.2;
    const depth = -Terrain.getH(this.x, this.z);
    const wantAir = (Math.abs(P1.y - this.y) > 3 && !playerUnder && !(depth > 1.2 && P1.mode === 'swim')) || pdist > 22 || pAlt > 2.5;
    if (wantAir && !this.air) { this.air = true; this.vy = 6; Audio.sfx('wing'); }
    let spd = 0;
    // movement
    const baseSpd = (G.stage === 0 ? 5.4 : 6.8) * speedMul * (pdist > 8 ? 1.6 : 1) * (Input.down('shift') ? 1.5 : 1);
    if (dist > (this.goto || this.target ? 0.4 : 1.2)) {
      spd = Math.min(baseSpd * (this.air ? 1.6 : 1), dist * 3);
      const tyaw = Math.atan2(dx, dz);
      this.yaw = dampAngle(this.yaw, tyaw, 8, dt);
      this.vx = damp(this.vx, (dx / dist) * spd, 6, dt); this.vz = damp(this.vz, (dz / dist) * spd, 6, dt);
      this.idleT = 0;
    } else {
      this.vx = damp(this.vx, 0, 8, dt); this.vz = damp(this.vz, 0, 8, dt);
      if (P1.hspeed < 0.5) this.idleT += dt; else this.idleT = 0;
      // face player or look target when idle
      if (!this.target) { const ly = Math.atan2(P1.x - this.x, P1.z - this.z); this.yaw = dampAngle(this.yaw, ly, 2, dt); }
    }
    let nx = this.x + this.vx * dt, nz = this.z + this.vz * dt;
    if (this.air) {
      ty = ty ?? Math.max(P1.y + 1.2, Colliders.ground(nx, nz, P1.y + 2, 3) + 1.4);
      this.y = damp(this.y, ty, 3.5, dt);
      this.x = nx; this.z = nz;
      const g = Colliders.ground(this.x, this.z, this.y, 1.5);
      if (pdist < 6 && !wantAir && this.y - g < 2.2 && Math.abs(P1.y - g) < 2.5) { this.air = false; FX.dust(this.x, g, this.z, 6); }
      if (playerUnder && depth > 1.2) { this.air = false; }
    } else {
      const p = { x: nx, z: nz }; Colliders.resolve(p, C.radius * 0.8, this.y, 1.3, 1.5);
      const g = Colliders.ground(p.x, p.z, this.y, 1.3);
      if (g - this.y > 1.4 && depth < 1.2) { this.air = true; this.vy = 6; }
      this.x = p.x; this.z = p.z;
      if (depth > 1.2) {
        this.swim = true;
        const wantY = playerUnder ? Math.max(P1.y + 0.3, Terrain.getH(this.x, this.z) + 0.8) : -0.35 - C.legH * C_STAGE[G.stage].scale * 0.6;
        this.y = damp(this.y, wantY, 3, dt);
        if (Math.hypot(this.vx, this.vz) > 1 && this.y > -1 && Math.random() < dt * 5) FX.splash(this.x, 0, this.z, 2);
        if (this.y < -1.5 && Math.random() < dt * 3) FX.bubble(this.x, this.y + 1, this.z);
      } else {
        this.swim = false;
        this.vy -= 30 * dt; this.y += this.vy * dt;
        if (this.y <= g) { this.y = g; this.vy = 0; }
        if (this.hopT > 0) { this.hopT -= dt; }
      }
    }
    // idle behaviours
    if (!G.inCombat && !this.goto) {
      if (this.idleT > 24) this.state = 'sleep';
      else if (this.idleT > 7) this.state = 'sit';
      else this.state = 'follow';
      if (this.state === 'sleep' && Math.random() < dt * 0.3) Sprites.emote(this.emoteTarget, 'zzz', 2.4);
      this.chatterCd -= dt;
      if (this.chatterCd <= 0) { this.chatterCd = rand(10, 22); if (this.state !== 'sleep' && pdist < 15) { Audio.sfx('creature', { type: G.ctype, mood: 'happy', stage: G.stage }); if (Math.random() < 0.4) this.setMood('happy', 1.2); } }
      // sense hidden treasure
      this.senseCd -= dt;
      if (this.senseCd <= 0) { this.senseCd = 3; this.senseTreasure(); }
    }
    // render
    C.root.position.set(this.x, this.y, this.z); C.root.rotation.set(0, this.yaw, 0);
    const hspd = Math.hypot(this.vx, this.vz);
    const st = { speed: hspd, fly: this.air, flap: 0.7, bank: 0, pitch: 0, swim: this.swim && !this.air, mood: this.dazed > 0 ? 'scared' : this.celebrateT > 0 ? 'celebrate' : this.mood, lookAt: this.lookTargetPos(), sit: this.state === 'sit', sleep: this.state === 'sleep', hop: 0 };
    if (G.stage === 0 && this.air) st.flapRate = 16; // hatchling flutters frantically
    animateCreature(C, st, dt);
    if (this.strikeT > 0) { C.scaler.position.z = Math.sin((this.strikeT / 0.35) * Math.PI) * 0.6; C.headPivot.rotation.x -= Math.sin((this.strikeT / 0.35) * Math.PI) * 0.5; }
    // footsteps
    if (!this.air && !this.swim && hspd > 1.5) { this.stepAcc += dt * hspd * 0.35; if (this.stepAcc > 1) { this.stepAcc = 0; Audio.sfx('step', { v: 0.5 + G.stage * 0.4 }); } }
  },
  senseTreasure() {
    let best = null, bd = 18;
    for (const c of Chests) { if (c.opened || this.sensed[c.id]) continue; const d = dist2d(c, P1); if (d < bd && Math.abs(c.y - P1.y) < 8) { bd = d; best = c; } }
    for (const d0 of Spots.digs || []) { if (G.digs[d0.i] || this.sensed['dig' + d0.i] || G.stage < 1) continue; const d = dist2d(d0, P1); if (d < bd) { bd = d; best = Object.assign({ id: 'dig' + d0.i, dig: true }, d0); } }
    if (best) {
      this.sensed[best.id] = true;
      this.goto = { x: best.x + 1.5, z: best.z + 1.5, speed: 1.4, max: 5 };
      Sprites.emote(this.emoteTarget, 'bang', 1.8);
      Audio.sfx('creature', { type: G.ctype, mood: 'happy', stage: G.stage });
      UI.toast(best.dig ? G.name + ' is sniffing at the sand…' : G.name + ' senses something nearby!', 'q');
      if (best.dig) Hints.show('dig', 'Treasure in the sand! Stand where ' + G.name + ' is sniffing and press E to dig.', 6);
    }
  },

  // ───── special ability (F) ─────
  abilityName() {
    if (!G.ctype) return '';
    if (G.stage >= 3 && this.surge >= 100) return 'Skybound Strike';
    const n = CREATURE_DEF[G.ctype].ability[G.stage];
    return (G.flags.kindled && G.stage < 3 ? 'Kindled ' : '') + n;
  },
  cooldownMax() { return (G.stage === 0 ? 4 : 6.5) * (G.flags.kindled ? 0.78 : 1) * (1 - G.upgrades.fierce * 0.1); },
  useAbility() {
    if (!this.C || G.mode !== 'play' || Dialog.open) return;
    if (this.abilityCd > 0) { if (!this._cdWarn || W.time - this._cdWarn > 1) { this._cdWarn = W.time; Audio.sfx('ui'); } return; }
    const yaw = aimYaw();
    const src = this.mounted ? { x: P1.x, y: P1.y + this.C.headY * 0.7, z: P1.z } : { x: this.x, y: this.y + this.C.headY * 0.7, z: this.z };
    if (!this.mounted) { this.yaw = yaw; this.idleT = 0; this.state = 'follow'; }
    if (G.stage >= 3 && this.surge >= 100) return this.skyboundStrike();
    const st = G.stage, k = G.flags.kindled ? 1.4 : 1;
    this.abilityCd = this.cooldownMax();
    this.strikeT = 0.35;
    const type = G.ctype;
    Bus.emit('ability', { type });
    if (type === 'ember') {
      const range = (st === 0 ? 4.5 : 7 + st * 1.4) * k, arc = st === 0 ? 0.8 : 1.0, dmg = (st === 0 ? 5 : 7 + st * 3) * k;
      Audio.sfx('fire'); Audio.sfx('creature', { type, mood: 'angry', stage: st });
      let t = 0, ticks = 0;
      this.abilityActive = { update: (dt) => {
        t += dt;
        const s0 = this.mounted ? { x: P1.x + Math.sin(P1.yaw) * this.C.radius * 1.5, y: P1.y + this.C.headY * 0.75, z: P1.z + Math.cos(P1.yaw) * this.C.radius * 1.5 } : { x: this.x + Math.sin(yaw) * this.C.radius, y: this.y + this.C.headY * 0.7, z: this.z + Math.cos(yaw) * this.C.radius };
        for (let i = 0; i < (st === 0 ? 3 : 6); i++) { const a = yaw + rand(-arc / 2, arc / 2), v = range * rand(1.4, 2); FX.fire(s0.x, s0.y, s0.z, Math.sin(a) * v, rand(-0.5, 1), Math.cos(a) * v, st === 0 ? 0.6 : 1 + st * 0.15); }
        if (t > ticks * 0.25) { ticks++; Hitbox.cone(s0.x, s0.z, s0.y - 1, yaw, range, arc, dmg, 2, { src: 'comp', interrupt: true, element: 'fire', yRange: 4 + st }); }
        if (t > (st === 0 ? 0.5 : 0.9)) this.abilityActive = null;
      } };
      if (st === 0) Hints.show('sparkpuff', this.name() + ' puffs a little spark! It can light lanterns and scare pests.', 5);
    } else if (type === 'cloud') {
      const range = (st === 0 ? 5 : 8 + st * 1.4) * k, arc = st >= 3 ? TAU : 1.3, dmg = (st === 0 ? 4 : 6 + st * 3) * k;
      Audio.sfx('gust'); Audio.sfx('creature', { type, mood: 'angry', stage: st });
      for (let i = 0; i < (st === 0 ? 20 : 50); i++) { const a = st >= 3 ? rand(0, TAU) : yaw + rand(-arc / 2, arc / 2), v = range * rand(1.3, 2.2); FX.gust(src.x, src.y, src.z, Math.sin(a) * v, rand(0, 2), Math.cos(a) * v, st === 0 ? 0.5 : 1 + st * 0.2); }
      if (st >= 3) { // cyclone pulls then flings
        for (let i = 0; i < 40; i++) { const a = (i / 40) * TAU * 3; FX.spawn({ x: src.x + Math.cos(a) * (2 + i * 0.15), y: src.y - 1 + i * 0.12, z: src.z + Math.sin(a) * (2 + i * 0.15), vx: -Math.sin(a) * 6, vz: Math.cos(a) * 6, vy: 2, life: 1, size: 1.2, size1: 2.5, color: 0xf2fbff, alpha: 0.5 }); }
      }
      Hitbox.cone(src.x, src.z, src.y - 1.5, yaw, range, arc, dmg, (st === 0 ? 6 : 14) * k, { src: 'comp', interrupt: true, stun: st === 0 ? 0.6 : 1.4, element: 'wind', yRange: 4 + st });
      Cam.shake = Math.max(Cam.shake, 0.3);
    } else {
      // bubble projectile + ward
      Audio.sfx('bubble'); Audio.sfx('creature', { type, mood: 'happy', stage: st });
      const target = Enemies.nearest(this.mounted ? P1 : this, 14 + st * 2);
      const tyaw = target ? Math.atan2(target.x - src.x, target.z - src.z) : yaw;
      const big = st >= 3;
      Projectiles.spawn({ x: src.x, y: src.y, z: src.z, vx: Math.sin(tyaw) * 14, vy: 0, vz: Math.cos(tyaw) * 14, r: big ? 2.2 : 0.8, life: 1.4, kind: 'bubble', from: 'comp', dmg: (st === 0 ? 4 : 6 + st * 3) * k, stun: (st === 0 ? 1.2 : 2.6) * k, aoe: big ? 6 : 0, home: target });
      if (st >= 1) {
        this.ward = (25 + st * 12) * k; this.wardT = 8;
        const heal = 12 + st * 6; G.hp = Math.min(maxHp(), G.hp + heal); Floaters.add('+' + heal, { x: P1.x, y: P1.y + 2.4, z: P1.z }, 'heal');
        FX.burst(P1.x, P1.y + 1, P1.z, 20, { speed: 3, life: 0.8, size: 0.5, color: 0x9ff3ff, add: true });
      }
    }
  },
  name() { return G.name || 'your companion'; },
  addSurge(n) { if (G.stage < 3) return; const was = this.surge; this.surge = Math.min(100, this.surge + n); if (was < 100 && this.surge >= 100) { UI.toast('Your bond surges! Press F for Skybound Strike.', 'star'); Audio.sfx('discover'); } },
  skyboundStrike() {
    this.surge = 0; this.abilityCd = 2;
    const cx = P1.x, cz = P1.z, cy = P1.y;
    Audio.sfx('roar'); Audio.sfx('stage');
    G.celebrateT = 0.8;
    Cam.shake = 1.0;
    const col = this.elemColor();
    UI.banner('Skybound Strike', 1.6);
    setTimeout(() => {
      Audio.sfx('boom');
      for (let r = 0; r < 3; r++) setTimeout(() => {
        for (let i = 0; i < 60; i++) { const a = (i / 60) * TAU; FX.spawn({ x: cx, y: cy + 0.6, z: cz, vx: Math.cos(a) * (16 + r * 4), vz: Math.sin(a) * (16 + r * 4), vy: 1, life: 0.8, size: 1.4, size1: 0.3, color: col, add: true, drag: 1.5 }); }
      }, r * 120);
      FX.burst(cx, cy + 2, cz, 50, { speed: 10, life: 1.1, size: 1, size1: 0.1, color: 0xffe08a, add: true, up: 4 });
      Hitbox.radius(cx, cz, cy, 12, 55, 16, { src: 'comp', interrupt: true, stun: 3, yRange: 8 });
    }, 350);
  },
};

const PALETTES = {
  ember: [{}, { body: 0x3f8f5a, belly: 0xe8e2a0, wing: 0x8fd16a, wingBone: 0x2f6a40, dark: 0x2a5a36, mark: 0xfff08a }, { body: 0x5a4a8a, belly: 0xe8d8ff, wing: 0xb98af0, wingBone: 0x3f2f6a, dark: 0x2f2550, mark: 0xffd34d }],
  cloud: [{}, { body: 0x8a8f9c, head: 0xf2f4f8, belly: 0xe2e6ee, horn: 0xf2c14a, dark: 0x5a5f6a, mark: 0x7fd3f0 }, { body: 0xb5653a, head: 0xf8e6c8, belly: 0xf3e2bf, dark: 0x7a3f22, mark: 0xffc864 }],
  moon: [{}, { body: 0xf2a7c8, belly: 0xfff0f6, wing: 0xffd6ea, wingBone: 0xd67aa8, dark: 0xb05a88, mark: 0xfff6c8, horn: 0xffe08a }, { body: 0x4fb3a0, belly: 0xe0fff6, wing: 0x9ff3d6, wingBone: 0x2f8a78, dark: 0x2a6a5e, mark: 0xd8fff0 }],
};

// ───── hit detection ─────
const Breakables = [];
const Hitbox = {
  _apply(list, test, dmg, kb, opt, cx, cz) {
    let n = 0;
    for (const e of list) {
      if (e.dead || !test(e)) continue;
      n++;
      Enemies.hurt(e, dmg, e.x - cx, e.z - cz, Object.assign({ kb }, opt));
    }
    for (const b of Breakables) {
      if (b.broken || !test(b)) continue;
      if (b.needs && opt && b.needs !== 'any' && !b.needs.includes(opt.element || (opt.src === 'player' ? 'melee' : 'comp'))) { if (b.onWrong) b.onWrong(opt); continue; }
      n++; b.hit(dmg, opt);
    }
    if (n && opt.src === 'player') { Comp.addSurge(4 * n); }
    return n;
  },
  melee(x, z, y, yaw, reach, arc, dmg, kb, src, aoe, yRange = 2.5) {
    return this._apply(Enemies.list, (e) => {
      if (Math.abs((e.y + (e.h || 1.5) / 2) - (y + 0.8)) > yRange + (e.h || 1.5) / 2) return false;
      const dx = e.x - x, dz = e.z - z, d = Math.hypot(dx, dz);
      if (aoe && d < aoe + (e.r || 0.5)) return true;
      if (d > reach + (e.r || 0.5)) return false;
      return d < (e.r || 0.5) + 0.6 || Math.abs(wrapAngle(Math.atan2(dx, dz) - yaw)) < arc / 2;
    }, dmg, kb, { src, interrupt: aoe ? true : false, element: 'melee' }, x, z);
  },
  cone(x, z, y, yaw, range, arc, dmg, kb, opt = {}) {
    const yr = opt.yRange || 3;
    return this._apply(Enemies.list, (e) => {
      if (Math.abs((e.y + (e.h || 1.5) / 2) - (y + 1)) > yr + (e.h || 1.5) / 2) return false;
      const dx = e.x - x, dz = e.z - z, d = Math.hypot(dx, dz);
      if (d > range + (e.r || 0.5)) return false;
      return arc >= TAU - 0.01 || d < (e.r || 0.5) + 0.5 || Math.abs(wrapAngle(Math.atan2(dx, dz) - yaw)) < arc / 2;
    }, dmg, kb, opt, x, z);
  },
  radius(x, z, y, r, dmg, kb, opt = {}) {
    const yr = opt.yRange || 3;
    return this._apply(Enemies.list, (e) => Math.abs(e.y - y) < yr + (e.h || 1.5) && Math.hypot(e.x - x, e.z - z) < r + (e.r || 0.5), dmg, kb, opt, x, z);
  },
};

// projectiles (bubbles, bombs, cannonballs, thrown balls)
const Projectiles = {
  list: [],
  geo: {},
  spawn(o) {
    let m;
    if (o.kind === 'bubble') m = new THREE.Mesh(new THREE.SphereGeometry(o.r, 14, 10), new THREE.MeshBasicMaterial({ color: linColor(0xc8f8ff), transparent: true, opacity: 0.45, depthWrite: false }));
    else if (o.kind === 'bomb') m = meshOf([part(sph(0.4, 8, 6), 0x2a2a30), part(cyl(0.05, 0.05, 0.3, 4), 0x8a6a4a, { y: 0.45 })]);
    else if (o.kind === 'cannonball') m = meshOf([part(sph(0.6, 10, 8), 0x2a2a30)]);
    else if (o.kind === 'snowball') m = meshOf([part(ico(0.35, 1), 0xf2f8ff)]);
    o.m = m; o.t = 0; m.position.set(o.x, o.y, o.z); W.scene.add(m);
    this.list.push(o); return o;
  },
  update(dt) {
    this.list = this.list.filter((p) => {
      p.t += dt;
      if (p.kind === 'bubble') {
        if (p.home && !p.home.dead) { const dx = p.home.x - p.x, dz = p.home.z - p.z, dy = p.home.y + 1 - p.y; const d = Math.hypot(dx, dy, dz) || 1; p.vx = damp(p.vx, (dx / d) * 15, 4, dt); p.vz = damp(p.vz, (dz / d) * 15, 4, dt); p.vy = damp(p.vy, (dy / d) * 15, 4, dt); }
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        p.m.scale.setScalar(1 + Math.sin(p.t * 12) * 0.06);
        if (Math.random() < dt * 30) FX.bubble(p.x, p.y, p.z, 0, 0.5, 0, 0.2);
        let hit = false;
        for (const e of Enemies.list) { if (!e.dead && dist3d({ x: e.x, y: e.y + (e.h || 1.5) / 2, z: e.z }, p) < p.r + (e.r || 0.6) + 0.4) { hit = true; break; } }
        for (const b of Breakables) if (!b.broken && dist3d({ x: b.x, y: b.y + 1, z: b.z }, p) < p.r + b.r) hit = true;
        if (hit || p.t > p.life) {
          Audio.sfx('pop');
          FX.burst(p.x, p.y, p.z, 16, { speed: 4, life: 0.6, size: 0.4, color: 0xd8fbff, alpha: 0.8 });
          const r = (p.aoe || 0) + p.r + 1.0;
          Hitbox.radius(p.x, p.z, p.y - 1, r, p.dmg, 2, { src: 'comp', interrupt: true, stun: p.stun, element: 'water', yRange: 3, bubble: true });
          W.scene.remove(p.m); return false;
        }
        p.m.position.set(p.x, p.y, p.z); return true;
      }
      // ballistic
      p.vy -= (p.grav || 20) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.m.position.set(p.x, p.y, p.z); p.m.rotation.x += dt * 5;
      if (p.kind === 'bomb' && Math.random() < dt * 30) FX.spawn({ x: p.x, y: p.y + 0.5, z: p.z, life: 0.3, size: 0.3, size1: 0.05, color: 0xffd34d, add: true });
      if (p.kind === 'cannonball' && Math.random() < dt * 30) FX.spawn({ x: p.x, y: p.y, z: p.z, life: 0.6, size: 0.6, size1: 1.5, color: 0x8a8a8a, alpha: 0.4 });
      const g = Math.max(Colliders.ground(p.x, p.z, p.y + 1, 2), Terrain.getH(p.x, p.z) < 0 ? 0 : -99);
      const hitPlayer = p.from === 'enemy' && p.kind === 'snowball' && dist3d(p, { x: P1.x, y: P1.y + 1, z: P1.z }) < 1.2;
      if (p.y <= g + 0.1 || hitPlayer || p.t > 6) {
        if (p.kind === 'snowball') { FX.burst(p.x, p.y, p.z, 10, { speed: 3, life: 0.5, size: 0.4, color: 0xffffff }); if (hitPlayer) playerTakeDamage(p.dmg, p.x - p.vx, p.z - p.vz, { kb: 3 }); }
        else {
          Audio.sfx('boom'); Cam.shake = Math.max(Cam.shake, dist2d(p, P1) < 20 ? 0.5 : 0.1);
          FX.burst(p.x, Math.max(p.y, g) + 0.5, p.z, 26, { speed: 7, life: 0.6, size: 1.2, size1: 0.2, color: 0xffb347, color1: 0xff3a10, add: true, up: 2 });
          FX.burst(p.x, Math.max(p.y, g) + 0.5, p.z, 12, { speed: 3, life: 1.2, size: 1.4, size1: 3, color: 0x8a8580, alpha: 0.5, up: 2 });
          if (g <= 0.1 && Terrain.getH(p.x, p.z) < -0.5) FX.splash(p.x, 0, p.z, 30);
          const r = p.blast || 2.6;
          if (dist2d(p, P1) < r + 0.4 && Math.abs(P1.y - g) < 3) playerTakeDamage(p.dmg, p.x, p.z, { kb: 10 });
          if (p.tele) p.tele.dead = true;
        }
        W.scene.remove(p.m); return false;
      }
      return true;
    });
  },
  clear() { this.list.forEach((p) => W.scene.remove(p.m)); this.list = []; },
};
