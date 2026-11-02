// ───────────────────────── NPCs, creatures, mermaids, dialog ─────────────────────────
class NPC {
  constructor(o) {
    this.o = o; this.id = o.id; this.name = o.name || '';
    this.H = buildHuman(Object.assign({ age: 2 }, o.look));
    this.root = new THREE.Group(); this.root.add(this.H.root); W.scene.add(this.root);
    this.x = o.x; this.z = o.z; this.y = gy(o.x, o.z); this.yaw = o.yaw || 0;
    this.path = o.path || null; this.pi = 0; this.wait = rand(0, 3); this.speed = o.speed || 2.2;
    this.pet = null; this.lines = o.lines || []; this.lineCd = rand(2, 8); this.bubble = null; this.mode = o.mode || 'walk';
    this.anim = {}; this.onTalk = o.onTalk; this.emoteY = () => this.H.height + 0.6;
    if (o.pet) {
      this.pet = { C: buildCreature(o.pet.type, o.pet.stage, o.pet.pal), x: this.x + 1.5, z: this.z, y: this.y, yaw: 0, fly: false };
      if (o.pet.scale) this.pet.C.root.scale.setScalar(o.pet.scale);
      W.scene.add(this.pet.C.root);
    }
    if (o.weapon) setHumanWeapon(this.H, o.weapon);
    this.visible = true;
  }
  setVisible(v) { this.visible = v; this.root.visible = v; if (this.pet) this.pet.C.root.visible = v; }
  teleport(x, z, yaw) { this.x = x; this.z = z; this.y = Colliders.ground(x, z, 999); if (yaw !== undefined) this.yaw = yaw; this.path = null; if (this.pet) { this.pet.x = x + 1.5; this.pet.z = z; } }
  update(dt) {
    if (!this.visible) return;
    const d = dist2d(this, P1);
    let speed = 0;
    if (this.o.custom) this.o.custom(this, dt);
    else if (this.path && !this.talking && d > 3.5) {
      if (this.wait > 0) this.wait -= dt;
      else {
        const t = this.path[this.pi]; const dx = t[0] - this.x, dz = t[1] - this.z, dd = Math.hypot(dx, dz);
        if (dd < 0.6) { this.pi = (this.pi + 1) % this.path.length; this.wait = rand(1.5, 5); }
        else { speed = this.speed; this.x += (dx / dd) * speed * dt; this.z += (dz / dd) * speed * dt; this.yaw = dampAngle(this.yaw, Math.atan2(dx, dz), 6, dt); }
      }
    }
    if (!this.o.custom) {
      if (d < 5 && speed === 0) this.yaw = dampAngle(this.yaw, Math.atan2(P1.x - this.x, P1.z - this.z), 4, dt);
      this.y = this.o.fixedY ?? Colliders.ground(this.x, this.z, this.y + 1, 1.2);
    }
    this.root.position.set(this.x, this.y, this.z); this.root.rotation.y = this.yaw;
    const st = Object.assign({ speed: this.o.custom ? this.speedOverride || 0 : speed, mode: this.mode }, this.anim);
    if (this.talking) st.talk = true;
    animateHuman(this.H, st, dt);
    // ambient chatter bubble
    this.lineCd -= dt;
    if (this.lines.length && this.lineCd <= 0 && d < 14 && !Dialog.open) { this.lineCd = rand(9, 16); UI.say(this, pick(this.lines)); }
    // companion follows owner
    if (this.pet && !this.o.petCustom) {
      const p = this.pet; const C = p.C;
      const tx = this.x - Math.sin(this.yaw) * 1.8 + Math.cos(this.yaw) * 1.4, tz = this.z - Math.cos(this.yaw) * 1.8 - Math.sin(this.yaw) * 1.4;
      const dx = tx - p.x, dz = tz - p.z, dd = Math.hypot(dx, dz);
      let sp = 0;
      if (dd > 0.8) { sp = Math.min(this.speed * 1.4, dd * 2.5); p.x += (dx / dd) * sp * dt; p.z += (dz / dd) * sp * dt; p.yaw = dampAngle(p.yaw, Math.atan2(dx, dz), 6, dt); }
      else p.yaw = dampAngle(p.yaw, this.yaw, 2, dt);
      p.y = Colliders.ground(p.x, p.z, p.y + 1, 1.2);
      C.root.position.set(p.x, p.y, p.z); C.root.rotation.y = p.yaw;
      animateCreature(C, { speed: sp, mood: d < 4 ? 'happy' : 'idle', lookAt: d < 8 ? new THREE.Vector3(P1.x, P1.y + 1, P1.z) : null, sit: sp === 0 && this.wait > 2 }, dt);
    }
    if (this.o.petCustom) this.o.petCustom(this, dt);
  }
}

const NPCs = {
  list: [], byId: {},
  add(o) { const n = new NPC(o); this.list.push(n); this.byId[o.id] = n; return n; },
  get(id) { return this.byId[id]; },
  update(dt) {
    for (const n of this.list) {
      const near = dist2d(n, P1) < 120 || n.o.always;
      const show = n.visible && near; n.root.visible = show; if (n.pet) n.pet.C.root.visible = show;
      if (near) n.update(dt);
    }
  },
};

// ───── wild creatures & set pieces ─────
const Wild = {
  list: [],
  add(o) { o.C = buildCreature(o.type, o.stage, o.pal); if (o.scale) o.C.scaler.scale.multiplyScalar(o.scale); W.scene.add(o.C.root); o.t = rand(0, 10); o.emoteY = () => o.C.headY * (o.scale || 1) + 0.6; o.root = o.C.root; this.list.push(o); return o; },
  update(dt) {
    for (const o of this.list) {
      if (o.hidden) { o.C.root.visible = false; continue; }
      o.C.root.visible = true;
      o.t += dt;
      const far = dist2d(o, P1) > 190 && !o.always;
      o.C.root.visible = !far;
      if (far) continue;
      if (o.update) o.update(o, dt);
      o.C.root.position.set(o.x, o.y, o.z); o.C.root.rotation.y = o.yaw || 0;
      animateCreature(o.C, Object.assign({ speed: o.speed || 0, mood: o.mood || 'idle' }, o.anim || {}), dt);
    }
  },
};

const Mermaids = {
  list: [],
  add(o) { o.M = buildMermaid(o.look || {}); o.M.root.scale.setScalar(o.scale || 1.4); W.scene.add(o.M.root); o.t = rand(0, 10); o.root = o.M.root; o.emoteY = () => 2.2; this.list.push(o); return o; },
  update(dt) {
    for (const o of this.list) {
      o.t += dt;
      const far = dist2d(o, P1) > 160; o.M.root.visible = !far;
      if (far) continue;
      if (o.update) o.update(o, dt);
      o.M.root.position.set(o.x, o.y, o.z); o.M.root.rotation.y = o.yaw || 0;
      animateMermaid(o.M, { sit: o.sit, wave: o.wave }, dt);
      if (!o.sit && o.y < -1 && Math.random() < dt * 3) FX.bubble(o.x, o.y + 1, o.z, 0, 1, 0, 0.2);
    }
  },
};

// ───── dialog ─────
const Dialog = {
  open: false, queue: [], cur: null, typed: 0, talking: false, speaker: null, onDone: null, choiceIdx: 0,
  el: null, nameEl: null, textEl: null, optsEl: null,
  init() {
    this.el = document.getElementById('dialog'); this.nameEl = document.getElementById('dlgName'); this.textEl = document.getElementById('dlgText'); this.optsEl = document.getElementById('dlgOpts');
    this.el.addEventListener('click', (e) => { if (e.target.tagName !== 'BUTTON') this.advance(); });
  },
  // lines: [{who, text, opts:[{label, act}] , then}] or strings
  pending: [],
  say(speaker, lines, onDone) {
    if (this.open) { this.pending.push([speaker, lines, onDone]); return; }
    this.queue = lines.map((l) => (typeof l === 'string' ? { who: speaker ? speaker.name : '', text: l } : Object.assign({ who: speaker ? speaker.name : '' }, l)));
    this.speaker = speaker; this.onDone = onDone; this.open = true; this.el.classList.add('show');
    if (speaker) speaker.talking = true;
    this.next();
  },
  next() {
    this.cur = this.queue.shift();
    if (!this.cur) return this.close();
    this.typed = 0; this.talking = true;
    this.nameEl.textContent = this.cur.who || '';
    this.nameEl.style.display = this.cur.who ? '' : 'none';
    this.textEl.textContent = '';
    this.optsEl.innerHTML = '';
    if (this.cur.fn) this.cur.fn();
  },
  update(dt) {
    if (!this.open || !this.cur) return;
    const full = this.fmt(this.cur.text);
    if (this.typed < full.length) {
      const before = Math.floor(this.typed);
      this.typed = Math.min(full.length, this.typed + dt * 55);
      if (Math.floor(this.typed / 4) !== Math.floor(before / 4)) Audio.sfx('talk');
      this.textEl.textContent = full.slice(0, Math.floor(this.typed));
      if (this.typed >= full.length) this.showOpts();
    } else this.talking = false;
    // input
    if (Input.hit('e') || Input.hit('space') || Input.hit('enter')) {
      if (this.typed < full.length) { this.typed = full.length; this.textEl.textContent = full; this.showOpts(); }
      else if (!this.cur.opts) this.advance();
    }
    if (this.open && this.cur && this.cur.opts && this.typed >= full.length) {
      for (let i = 0; i < this.cur.opts.length; i++) if (Input.hit(String(i + 1))) this.choose(i);
    }
  },
  fmt(t) { return typeof t === 'function' ? t() : String(t).replace(/\{name\}/g, G.name || 'your hatchling'); },
  showOpts() {
    if (!this.cur.opts || this.optsEl.childElementCount) return;
    this.cur.opts.forEach((o, i) => {
      const b = document.createElement('button'); b.className = 'opt'; b.innerHTML = `<kbd>${i + 1}</kbd> ${this.fmt(o.label)}`;
      b.onclick = (e) => { e.stopPropagation(); this.choose(i); };
      this.optsEl.appendChild(b);
    });
  },
  choose(i) {
    const o = this.cur.opts[i]; Audio.sfx('ui');
    this.cur.opts = null; this.optsEl.innerHTML = '';
    if (o.lines) this.queue = o.lines.map((l) => (typeof l === 'string' ? { who: this.speaker ? this.speaker.name : '', text: l } : Object.assign({ who: this.speaker ? this.speaker.name : '' }, l))).concat(this.queue);
    if (o.act) o.act();
    if (this.open) this.next();
  },
  advance() {
    if (!this.cur) return;
    const full = this.fmt(this.cur.text);
    if (this.typed < full.length) { this.typed = full.length; this.textEl.textContent = full; this.showOpts(); return; }
    if (this.cur.opts) return;
    if (this.cur.then) this.cur.then();
    this.next();
  },
  close() {
    this.open = false; this.talking = false; this.el.classList.remove('show');
    if (this.speaker) this.speaker.talking = false;
    const f = this.onDone; this.onDone = null; this.cur = null;
    Input.pressed = {};
    if (f) f();
    if (!this.open && this.pending.length) { const p = this.pending.shift(); this.say(p[0], p[1], p[2]); }
  },
};

// ───── chests ─────
function makeChest(id, x, z, loot, opt = {}) {
  const y = opt.y ?? Colliders.ground(x, z, opt.yHint ?? 999);
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = opt.ry || rand(0, TAU);
  const base = meshOf([part(box(1.3, 0.75, 0.85), 0x8a5a34, { y: 0.38, jit: 0.08 }), part(box(1.36, 0.12, 0.9), 0xd9a441, { y: 0.1 }), part(box(1.36, 0.12, 0.9), 0xd9a441, { y: 0.7 }), part(box(0.2, 0.25, 0.1), 0xd9a441, { y: 0.66, z: 0.46 })]);
  const lid = new THREE.Group(); lid.position.set(0, 0.75, -0.42);
  lid.add(meshOf([part(cyl(0.42, 0.42, 1.3, 8, 1), 0x9a6a3c, { rz: Math.PI / 2, z: 0.42, sy: 1, jit: 0.08 }), part(box(0.12, 0.45, 0.9), 0xd9a441, { x: 0.5, y: 0.12, z: 0.42 }), part(box(0.12, 0.45, 0.9), 0xd9a441, { x: -0.5, y: 0.12, z: 0.42 })]));
  g.add(base); g.add(lid); W.scene.add(g);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.soft, color: linColor(0xffd34d), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.6 })); glow.scale.set(3, 3, 1); glow.position.y = 0.7; g.add(glow);
  const c = { id, x, y, z, g, lid, glow, loot, opened: false, opt };
  Chests.push(c);
  addInteract({ id: 'chest_' + id, x, z, y, r: 2.4, label: 'Open chest', icon: 'chest', cond: () => !c.opened && (!opt.cond || opt.cond()), act: () => openChest(c) });
  return c;
}
function openChest(c) {
  c.opened = true; G.chests[c.id] = true;
  Audio.sfx('chest'); FX.sparkle(c.x, c.y + 1, c.z, 0xffd34d, 30);
  c.openT = 0;
  G.stats.treasure++;
  const L = c.loot;
  setTimeout(() => {
    if (L.coins) for (let i = 0; i < L.coins; i++) Pickups.spawn('coin', c.x, c.y + 1, c.z, { val: 1 });
    if (L.fruit) Pickups.spawn('fruit', c.x, c.y + 1.2, c.z, { vy: 7, magnet: false });
    if (L.weapon) dropLoot(L.weapon, c.x, c.y + 1, c.z);
    if (L.fn) L.fn(c);
    Comp.react('treasure', L.text || null);
    gainXP(L.xp ?? 8, 'Treasure');
  }, 350);
  Bus.emit('chest', c);
}
function updateChests(dt) {
  for (const c of Chests) {
    if (c.opened) { if (c.openT !== undefined && c.openT < 1) { c.openT = Math.min(1, c.openT + dt * 3); c.lid.rotation.x = -easeOut(c.openT) * 1.9; } c.glow.visible = false; }
    else { c.glow.material.opacity = 0.35 + Math.sin(W.time * 3 + c.x) * 0.2; }
    c.g.visible = (!c.opt.cond || c.opt.cond() || c.opened) && Math.abs(c.x - P1.x) < 170 && Math.abs(c.z - P1.z) < 170;
  }
}
