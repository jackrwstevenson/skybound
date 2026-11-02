// ───────────────────────── story: objectives, growth, population, chapter 0 ─────────────────────────
const Obj = {
  list: [],
  add(id, text, opt = {}) {
    if (G.done[id] || this.list.find((o) => o.id === id)) return;
    const o = Object.assign({ id, text, main: true, target: null, progress: null, xp: 0 }, opt);
    this.list.push(o); UI.objectivesDirty = true;
    if (!opt.silent) { Audio.sfx('ui'); UI.toast((o.main ? 'New goal: ' : 'Side goal: ') + this.fmt(o.text), 'quest'); }
    return o;
  },
  has(id) { return !!this.list.find((o) => o.id === id); },
  complete(id, opt = {}) {
    const i = this.list.findIndex((o) => o.id === id);
    if (G.done[id]) return false;
    G.done[id] = true;
    let o = null;
    if (i >= 0) { o = this.list[i]; this.list.splice(i, 1); }
    UI.objectivesDirty = true;
    if (!opt.silent) { Audio.sfx('quest'); UI.toast('Done: ' + this.fmt(o ? o.text : id), 'done'); }
    const xp = opt.xp ?? (o ? o.xp : 0);
    if (xp) gainXP(xp, 'Quest');
    Comp.celebrateT = 1.6;
    Bus.emit('objDone', id);
    saveGame(true);
    return true;
  },
  remove(id) { this.list = this.list.filter((o) => o.id !== id); UI.objectivesDirty = true; },
  fmt(t) { return (typeof t === 'function' ? t() : t).replace(/\{name\}/g, G.name || 'your hatchling'); },
  tracked() {
    // nearest main objective with a target, else any
    let best = null, bd = 1e9;
    for (const o of this.list) { if (!o.target) continue; const t = o.target(); if (!t) continue; const d = dist2d(t, P1) * (o.main ? 1 : 2.5); if (d < bd) { bd = d; best = o; } }
    return best;
  },
};

function gainXP(n, why) {
  if (!G.ctype || G.stage >= 3 || n <= 0) return;
  const need = XP_NEED[G.stage];
  const was = G.xp;
  G.xp = Math.min(need, G.xp + n);
  if (G.xp > was) UI.xpPulse(n);
  if (was < need && G.xp >= need) {
    Audio.sfx('discover');
    UI.toast(G.name + ' is ready to grow! Visit Elder Wren at the Elder Tree.', 'star');
    Obj.add('grow' + G.stage, () => G.name + ' is ready to grow — visit the Elder Tree', { main: true, target: () => ({ x: Spots.elderTree.x + 6, z: Spots.elderTree.z + 2 }) });
    Comp.react('discover');
  }
}

// ───── population ─────
const Hatch = { list: [], byType: {}, ball: null };
const Story = { chapter: 0 };

function populate() {
  const S = Spots;
  // family & villagers
  NPCs.add({ id: 'mira', name: 'Mira', x: S.homeDoor.x + 1.5, z: S.homeDoor.z - 2, yaw: -Math.PI / 2, look: { age: 2, skin: 0xf1c6a0, hair: 0x7a4a2a, hairStyle: 'long', top: 0x6fae4f, bottom: 0x8a6a4a, accent: 0xf2779a, robe: 0x6fae4f }, lines: ['Mind the flowerbeds, little ones!', 'Supper’s at sundown.'], path: [[S.homeDoor.x + 1.5, S.homeDoor.z - 2], [S.homeDoor.x + 4, S.homeDoor.z - 6], [S.homeDoor.x + 2, S.homeDoor.z + 5]] });
  NPCs.add({ id: 'bram', name: 'Keeper Bram', x: S.nursery.x + 9, z: S.nursery.z + 8, yaw: -2.2, look: { age: 3, skin: 0xd9a37a, hair: 0x5a3a2a, elderHair: 0xcfc8be, beard: true, top: 0x8a6a4a, bottom: 0x5a4a3a, accent: 0xe2573a, hat: 'straw' }, pet: { type: 'ember', stage: 2, pal: PALETTES.ember[1], scale: 0.85 }, lines: ['Gentle hands, gentle hearts.', 'Every hatchling picks its own path.'] });
  NPCs.add({ id: 'wren', name: 'Elder Wren', x: S.elderTree.x + 5, z: S.elderTree.z + 3, yaw: Math.PI / 2, look: { age: 3, skin: 0xf3d0b0, elderHair: 0xf2f2f2, hairStyle: 'long', top: 0x5a6a9a, robe: 0x4a5a8a, accent: 0xf2c45a, hat: 'wizard', hatColor: 0x3a4a7a }, pet: { type: 'moon', stage: 3, scale: 0.9 }, lines: ['The Elder Tree remembers every pair who ever grew here.'] });
  NPCs.add({ id: 'rowan', name: 'Captain Rowan', x: S.yard.x - 5, z: S.yard.z + 5, yaw: 0.6, look: { age: 2, skin: 0xa8754e, hair: 0x1a1a1a, hairStyle: 'pony', top: 0x9a3a2a, vest: 0x5a3a24, straps: true, bottom: 0x3a3a4a, accent: 0xf2c45a, cloak: 0x7a2a2a, glove: 0x4a3426 }, pet: { type: 'cloud', stage: 2, pal: PALETTES.cloud[1] }, weapon: 'cutlass', lines: ['Keep your guard up!', 'A good rider listens to their partner.'] });
  NPCs.add({ id: 'hob', name: 'Farmer Hob', x: S.farm.x + 11, z: S.farm.z - 2, yaw: -Math.PI / 2, look: { age: 2, skin: 0xf1c6a0, hair: 0xb8743a, top: 0xe8e0d0, vest: 0x5a8a4a, bottom: 0x4a5a7a, accent: 0xf7c548, hat: 'straw' }, lines: ['These crows will be the end of my cabbages!'] });
  NPCs.add({ id: 'fen', name: 'Fen the Trader', x: S.shop.x + Math.sin(0.3) * -1.8, z: S.shop.z - 2.2, yaw: 0.3 + Math.PI, look: { age: 2, skin: 0xf6d3b5, hair: 0x2a1a12, hairStyle: 'buns', top: 0xb985f0, bottom: 0x5a4a3a, accent: 0xf2c45a }, lines: ['Honey tarts, fresh this morning!', 'Golden Fruit — rare as starlight!'] });
  // kids with hatchlings — run around the plaza
  const kidLook = [
    { age: 0, skin: 0xf1c6a0, hair: 0xe0a040, hairStyle: 'pony', top: 0xf2779a, bottom: 0x5b8fd6, accent: 0xf7c548, blush: true },
    { age: 0, skin: 0xa8754e, hair: 0x1a1a1a, hairStyle: 'short', top: 0xf7c548, bottom: 0x6a4a3a, accent: 0x5b8fd6 },
    { age: 0, skin: 0xf6d3b5, hair: 0x9a3a1a, hairStyle: 'buns', top: 0x6fae4f, bottom: 0x8a6a4a, accent: 0xe2573a, blush: true },
  ];
  const kidPets = [{ type: 'moon', stage: 0, pal: PALETTES.moon[1] }, { type: 'ember', stage: 0, pal: PALETTES.ember[2] }, { type: 'cloud', stage: 0, pal: PALETTES.cloud[2] }];
  ['Tilly', 'Bo', 'Nell'].forEach((nm, i) => {
    const n = NPCs.add({ id: nm.toLowerCase(), name: nm, x: P.plaza.x + 8, z: P.plaza.z + 8, look: kidLook[i], pet: kidPets[i], speed: 4,
      lines: i === 0 ? ['Hee hee! Can’t catch me!', 'Wanna play hide-and-seek?'] : ['Tag, you’re it!', 'Faster, faster!'],
      custom: (self, dt) => {
        if (self.talking) { self.speedOverride = 0; self.yaw = dampAngle(self.yaw, Math.atan2(P1.x - self.x, P1.z - self.z), 5, dt); self.y = Colliders.ground(self.x, self.z, self.y + 1); return; }
        const t = W.time * (G.stage >= 2 ? 0.16 : 0.42) + i * 2.1; const r = 15 + Math.sin(W.time * 0.3 + i) * 2.5;
        const tx = P.plaza.x + Math.cos(t) * r, tz = P.plaza.z + Math.sin(t) * r;
        const dx = tx - self.x, dz = tz - self.z, d = Math.hypot(dx, dz);
        if (d > 0.1) { const sp = Math.min(G.stage >= 2 ? 2.2 : 5, d * 3); self.x += (dx / d) * sp * dt; self.z += (dz / d) * sp * dt; self.yaw = dampAngle(self.yaw, Math.atan2(dx, dz), 8, dt); self.speedOverride = sp; }
        self.y = Colliders.ground(self.x, self.z, self.y + 1);
      } });
    n.kidIndex = i;
  });
  // villager walkers & pairs
  const walkerLooks = [
    { look: { age: 2, skin: 0xd9a37a, hair: 0x3a2a1a, top: 0x3d6f8f, bottom: 0x5a4a3a, accent: 0xf7c548 }, pet: { type: 'cloud', stage: 1 }, lines: ['Morning! Lovely flying weather.'] },
    { look: { age: 2, skin: 0xf1c6a0, hair: 0xe0c070, hairStyle: 'long', top: 0xc8553d, bottom: 0x4a3a2e, accent: 0x6fae4f }, pet: { type: 'moon', stage: 1, pal: PALETTES.moon[2] }, lines: ['My Ripple loves the river.'] },
    { look: { age: 3, skin: 0xf3d0b0, elderHair: 0xdedad2, top: 0x7a5a8a, bottom: 0x4a3a4a, accent: 0xf2c45a, beard: true }, lines: ['When I was a lad, my griffin and I flew over the moon. Well, nearly.'] },
    { look: { age: 2, skin: 0xa8754e, hair: 0x1a1a1a, hairStyle: 'buns', top: 0x6f8f3d, bottom: 0x3a3a4a, accent: 0xf2779a }, pet: { type: 'ember', stage: 2 }, lines: ['Sparkle, no — not the haystack!'] },
    { look: { age: 1, skin: 0xf6d3b5, hair: 0x6b4226, top: 0x5b8fd6, bottom: 0x4a3a2e, accent: 0xe2573a }, pet: { type: 'ember', stage: 1, pal: PALETTES.ember[1] }, lines: ['One day we’ll ride the Frostpeak winds!'] },
    { look: { age: 2, skin: 0xf1c6a0, hair: 0x9a3a1a, top: 0xe8e0d0, vest: 0x8a4f7d, bottom: 0x4a3a2e, accent: 0x5b8fd6, hat: 'hood', hatColor: 0x8a4f7d }, lines: ['Have you seen the lanterns at dusk?'] },
  ];
  const routes = [
    [[-6, 20], [20, 30], [36, 6], [12, -10], [-10, -6]],
    [[-40, 0], [-20, 30], [-50, 30], [-60, 10]],
    [[6, 12], [-6, 12], [-4, -2], [6, -2]],
    [[24, -40], [8, -24], [40, -20], [52, -40]],
    [[-20, -20], [-40, -40], [-10, -54], [4, -30]],
    [[16, 54], [-10, 60], [-30, 56], [0, 40]],
  ];
  walkerLooks.forEach((w, i) => NPCs.add({ id: 'walker' + i, name: '', x: routes[i][0][0], z: routes[i][0][1], look: w.look, pet: w.pet, path: routes[i], lines: w.lines, speed: 1.8 + (i % 3) * 0.3 }));
  // riders circling the sky (the future)
  [[0, 'cloud', PALETTES.cloud[0], 46, 70], [1, 'ember', PALETTES.ember[1], 58, 95], [2, 'moon', PALETTES.moon[0], 52, 120]].forEach(([i, type, pal, alt, rad]) => {
    const w = Wild.add({ type, stage: 2, pal, x: 0, y: alt, z: 0, always: true });
    const rider = buildHuman({ age: 2, skin: 0xd9a37a, hair: 0x3a2a1a, top: [0x9a3a2a, 0x3d6f8f, 0x6f8f3d][i], bottom: 0x3a3a4a, accent: 0xf2c45a, cloak: [0x7a2a2a, 0x2a4a7a, 0x4a6a2a][i] });
    rider.root.position.set(0, w.C.seatY, w.C.seatZ); w.C.root.add(rider.root);
    w.update = (o, dt) => {
      const t = W.time * (0.16 + i * 0.02) + i * 2;
      o.x = Math.cos(t) * rad + (i - 1) * 30; o.z = Math.sin(t) * rad * 0.8 - 20; o.y = alt + Math.sin(t * 2) * 6;
      o.yaw = Math.atan2(-Math.sin(t) * rad, Math.cos(t) * rad * 0.8);
      o.anim = { fly: true, flap: 0.5, bank: -0.35, pitch: Math.cos(t * 2) * 0.2 };
      animateHuman(rider, { mode: 'ride', speed: 12 }, dt);
    };
  });

  // nursery hatchlings
  const N = Spots.nursery;
  const hdef = [['ember', N.nests[0]], ['cloud', N.nests[1]], ['moon', N.nests[2]]];
  hdef.forEach(([type, nest]) => {
    const h = Wild.add({ type, stage: 0, x: nest.x, y: N.y, z: nest.z, yaw: rand(0, TAU), hatch: true });
    h.aff = 0; h.met = false; h.home = { x: nest.x, z: nest.z }; h.wander = { x: nest.x, z: nest.z, t: 0 };
    h.update = hatchlingUpdate;
    Hatch.list.push(h); Hatch.byType[type] = h;
    addInteract({ id: 'hatch_' + type, x: h.x, z: h.z, r: 2.4, label: () => (G.ctype ? '' : 'Meet ' + CREATURE_DEF[type].name), cond: () => !G.ctype && G.flags.bonding && !h.hidden && !Bond.active, act: () => Bond.menu(h), follow: h });
  });
  // toy bin ball
  addInteract({ id: 'ball', x: N.balls.x, z: N.balls.z, r: 2.4, label: 'Pick up a ball', cond: () => !G.ctype && G.flags.bonding && !P1.carry && !Bond.active, act: () => pickBall() });
  // treat basket
  addInteract({ id: 'treats', x: N.treats.x, z: N.treats.z, r: 2.4, label: 'Take a treat', cond: () => !G.ctype && G.flags.bonding && !G.flags.hasTreat && !Bond.active, act: () => { G.flags.hasTreat = true; Audio.sfx('pickup'); UI.toast('You pocket a crunchy fire-pepper treat.', 'food'); } });

  // NPC talk interactions
  for (const n of NPCs.list) if (n.name) addInteract({ id: 'talk_' + n.id, x: 0, z: 0, r: 2.8, label: () => 'Talk to ' + n.name, follow: n, cond: () => n.visible && !(n.o.noTalk && n.o.noTalk()), act: () => talkTo(n) });
  // shop
  addInteract({ id: 'shop', x: S.shop.x, z: S.shop.z + 1.8, r: 3.2, label: 'Browse Fen’s stall', cond: () => G.ctype, act: () => openShop() });
}

function hatchlingUpdate(h, dt) {
  if (h.custom) return h.custom(h, dt);
  const N = Spots.nursery;
  h.wander.t -= dt;
  if (h.wander.t <= 0) { h.wander.t = rand(2, 5); const a = rand(0, TAU), r = rand(0, 6); h.wander.x = N.x + Math.cos(a) * r; h.wander.z = N.z + Math.sin(a) * r; }
  let tx = h.wander.x, tz = h.wander.z;
  const pd = dist2d(h, P1);
  if (pd < 6 && G.flags.bonding) { tx = P1.x + (h.x - P1.x) * 0.4; tz = P1.z + (h.z - P1.z) * 0.4; }
  const dx = tx - h.x, dz = tz - h.z, d = Math.hypot(dx, dz);
  let sp = 0;
  if (d > 1.2) { sp = h.type === 'cloud' ? 3.5 : h.type === 'ember' ? 3.2 : 2.2; h.x += (dx / d) * sp * dt; h.z += (dz / d) * sp * dt; h.yaw = dampAngle(h.yaw, Math.atan2(dx, dz), 6, dt); }
  else if (pd < 7) h.yaw = dampAngle(h.yaw, Math.atan2(P1.x - h.x, P1.z - h.z), 4, dt);
  h.y = Colliders.ground(h.x, h.z, h.y + 1);
  h.speed = sp;
  h.anim = { lookAt: pd < 9 ? new THREE.Vector3(P1.x, P1.y + 1, P1.z) : null };
  if (h.reactT > 0) { h.reactT -= dt; h.mood = h.reactMood; if (h.reactAnim) h.reactAnim(h, dt); } else { h.mood = pd < 4 ? (h.type === 'moon' ? 'curious' : 'happy') : 'idle'; h.C.scaler.rotation.y = 0; }
  // ball chase
  if (Hatch.ball && Hatch.ball.flying === false && Hatch.ball.chase) {
    const b = Hatch.ball; const bx = b.x - h.x, bz = b.z - h.z, bd = Math.hypot(bx, bz);
    const spd = h.type === 'cloud' ? 6.2 : h.type === 'ember' ? 6.6 : 4.4;
    if (bd > 0.5) { h.x += (bx / bd) * spd * dt; h.z += (bz / bd) * spd * dt; h.yaw = Math.atan2(bx, bz); h.speed = spd; }
    if (bd < 0.9) ballCaught(h);
  }
  // keep in pen
  const pr = Math.hypot(h.x - N.x, h.z - N.z); if (pr > 9) { h.x = N.x + ((h.x - N.x) / pr) * 9; h.z = N.z + ((h.z - N.z) / pr) * 9; }
  // move interaction anchor
}

// ───── Bonding sequence ─────
const BOND_TXT = {
  ember: {
    feed: ['Emberwing gobbles the treat, hiccups — and puffs a perfect smoke ring!', 1],
    play: ['Emberwing pounces on your boots, then chases its own tail in dizzy circles!', 3],
    comfort: ['Emberwing wriggles free. It would much rather play!', 0],
    challengeName: 'Race to the far nest!',
  },
  cloud: {
    feed: ['Cloudclaw snaps the treat out of the air and chirps for another!', 2],
    play: ['Cloudclaw flaps its fluffy wings and tumbles into a wobbly somersault.', 1],
    comfort: ['Cloudclaw puffs up its chest. It’s not scared — but it leans in anyway.', 1],
    challengeName: 'Play tag!',
  },
  moon: {
    feed: ['Moonfin nibbles the treat slowly, then blows a happy bubble.', 1],
    play: ['Moonfin balances a pebble on its nose, wobbles, and giggles bubbles.', 1],
    comfort: ['Moonfin melts into your arms and coos softly. Its fins glow a little.', 3],
    challengeName: 'Pop the bubbles!',
  },
};
const Bond = {
  active: null, chal: null,
  menu(h) {
    const t = h.type, name = CREATURE_DEF[t].name;
    h.met = true;
    const metAll = Hatch.list.every((x) => x.met);
    const total = Hatch.list.reduce((s, x) => s + (x.acts || 0), 0);
    const opts = [
      { label: G.flags.hasTreat ? 'Feed it your treat' : 'Feed it (take a treat from the basket first)', act: () => { if (!G.flags.hasTreat) { UI.toast('The treat basket is by the fence.', 'food'); return; } G.flags.hasTreat = false; this.doAct(h, 'feed'); } },
      { label: 'Play together', act: () => this.doAct(h, 'play') },
      { label: 'Comfort it gently', act: () => this.doAct(h, 'comfort') },
      { label: 'Challenge: ' + BOND_TXT[t].challengeName, act: () => setTimeout(() => this.challenge(h), 50) },
    ];
    if (metAll && total >= 3) opts.push({ label: 'Choose ' + name + ' as your companion', act: () => setTimeout(() => this.confirm(h), 50) });
    opts.push({ label: 'Leave it be', act: () => {} });
    Dialog.say({ name }, [{ who: name, text: () => this.describe(h), opts }]);
  },
  describe(h) {
    const d = { ember: 'A scrappy little dragon, warm as a coal. Its tail never stops wagging.', cloud: 'A fluffy griffin chick with oversized talons and a very serious stare.', moon: 'A shy sea-wyrm with shimmering fins. It watches you with huge, gentle eyes.' }[h.type];
    const a = h.aff || 0;
    const mood = a >= 6 ? ' It looks at you like you hung the moon.' : a >= 3 ? ' It seems to really like you.' : a >= 1 ? ' It’s warming up to you.' : '';
    return d + mood;
  },
  doAct(h, kind) {
    const [txt, gain] = BOND_TXT[h.type][kind];
    h.aff = (h.aff || 0) + gain + 0.5; h.acts = (h.acts || 0) + 1;
    UI.toast(txt, gain >= 2 ? 'heart' : 'info');
    h.reactT = 2.2; h.reactMood = gain >= 2 ? 'celebrate' : gain === 0 ? 'curious' : 'happy';
    Audio.sfx('creature', { type: h.type, mood: 'happy', stage: 0 });
    if (gain >= 2) { FX.hearts(h.x, h.y + 1.2, h.z); Sprites.emote(h, 'heart', 1.8); } else Sprites.emote(h, gain === 0 ? 'q' : 'note', 1.5);
    h.reactAnim = null;
    if (kind === 'feed') { if (h.type === 'ember') setTimeout(() => { FX.smoke(h.x, h.y + 0.9, h.z); FX.fire(h.x + Math.sin(h.yaw) * 0.5, h.y + 0.7, h.z + Math.cos(h.yaw) * 0.5, Math.sin(h.yaw) * 2, 1, Math.cos(h.yaw) * 2, 0.4); Audio.sfx('pop'); }, 600); if (h.type === 'moon') setTimeout(() => FX.bubble(h.x, h.y + 0.9, h.z, 0, 0.8, 0, 0.5), 600); }
    if (kind === 'play') {
      if (h.type === 'ember') h.reactAnim = (o, dt) => { o.C.scaler.rotation.y += dt * 12; };
      if (h.type === 'cloud') h.reactAnim = (o, dt) => { const k = 1 - o.reactT / 2.2; o.C.scaler.rotation.x = k < 0.5 ? -k * 2 * TAU : 0; o.C.scaler.position.y += Math.sin(Math.min(1, k * 2) * Math.PI) * 0.8; };
      if (h.type === 'moon') { for (let i = 0; i < 6; i++) setTimeout(() => FX.bubble(h.x, h.y + 1, h.z, rand(-0.5, 0.5), 1.2, rand(-0.5, 0.5), 0.3), i * 200); }
    }
    if (kind === 'comfort') { P1.petT = 1.2; if (h.type === 'moon') { FX.sparkle(h.x, h.y + 0.8, h.z, 0x9ff3ff, 16); } }
    this.after(h);
  },
  after() {
    const met = Hatch.list.filter((x) => x.met).length;
    UI.objectivesDirty = true;
    if (met === 3 && !G.flags.metAll) {
      G.flags.metAll = true;
      setTimeout(() => {
        const best = Hatch.list.slice().sort((a, b) => b.aff - a.aff)[0];
        const bram = NPCs.get('bram');
        Dialog.say(bram, [
          'You’ve met all three! Look at them — they’re fascinated by you.',
          'If you ask me, ' + CREATURE_DEF[best.type].name + ' has taken a real shine to you.',
          'But a bond isn’t something I can choose for you. Spend as long as you like — and when you’re ready, choose the one who feels right.',
        ]);
        Obj.complete('meet3', { xp: 0, silent: true });
        Obj.add('choose', 'Choose your lifelong companion', { target: () => ({ x: Spots.nursery.x, z: Spots.nursery.z }) });
        best.glowHint = true;
      }, 900);
    }
  },
  challenge(h) {
    if (this.chal) return;
    const N = Spots.nursery;
    h.met = true;
    if (h.type === 'ember') {
      // race to the far nest
      const goal = N.nests[2];
      const far = { x: goal.x, z: goal.z };
      UI.toast('Race! First to the moon-nest wins. Hold Shift to sprint!', 'bang');
      const ring = new RingCourse('hatchrace', [{ x: far.x, y: N.y + 1.2, z: far.z, r: 1.6 }], { color: 0xff9a4a }); ring.start();
      h.custom = (o, dt) => { const dx = far.x - o.x, dz = far.z - o.z, d = Math.hypot(dx, dz); if (d > 0.6) { o.x += (dx / d) * 5.3 * dt; o.z += (dz / d) * 5.3 * dt; o.yaw = Math.atan2(dx, dz); o.speed = 6; o.C.scaler.position.y = Math.abs(Math.sin(o.t * 12)) * 0.3; } else { o.speed = 0; if (!this.chal.done) this.finish(h, false); } o.y = Colliders.ground(o.x, o.z, o.y + 1); o.mood = 'happy'; };
      this.chal = { h, ring, update: (dt) => { const r = ring.update(dt, { x: P1.x, y: P1.y + 1, z: P1.z }); if (r === 'done' && !this.chal.done) this.finish(h, true); } };
    } else if (h.type === 'cloud') {
      UI.toast('Tag! Touch Cloudclaw three times before time runs out.', 'bang');
      let tags = 0, t = 20, cd = 0;
      h.custom = (o, dt) => {
        const dx = o.x - P1.x, dz = o.z - P1.z, d = Math.hypot(dx, dz) || 1;
        let vx = 0, vz = 0;
        if (d < 7) { vx = (dx / d) * 5.0; vz = (dz / d) * 5.0; }
        // stay in pen, slide along fence
        const px = o.x + vx * dt, pz = o.z + vz * dt; const pr = Math.hypot(px - N.x, pz - N.z);
        if (pr > 8.2) { const nx = (px - N.x) / pr, nz = (pz - N.z) / pr; const dot = vx * nx + vz * nz; vx -= nx * dot * 1.6; vz -= nz * dot * 1.6; vx += -nz * 3; vz += nx * 3; }
        o.x += vx * dt; o.z += vz * dt; const pr2 = Math.hypot(o.x - N.x, o.z - N.z); if (pr2 > 8.6) { o.x = N.x + ((o.x - N.x) / pr2) * 8.6; o.z = N.z + ((o.z - N.z) / pr2) * 8.6; }
        if (vx || vz) o.yaw = Math.atan2(vx, vz); o.speed = Math.hypot(vx, vz);
        o.anim = { fly: o.speed > 3.5, flap: 1 }; o.C.scaler.position.y = 0;
        o.y = Colliders.ground(o.x, o.z, o.y + 1) + (o.speed > 3.5 ? 0.6 : 0); o.mood = 'happy';
      };
      this.chal = { h, update: (dt) => {
        t -= dt; cd -= dt; UI.timer(t);
        if (cd <= 0 && dist2d(h, P1) < 1.6) { tags++; cd = 0.8; Audio.sfx('ring', { n: tags * 2 }); FX.sparkle(h.x, h.y + 1, h.z, 0xbfe3ff); UI.toast('Tag ' + tags + '/3!', 'star'); h.x += rand(-1, 1); }
        if (tags >= 3) this.finish(h, true); else if (t <= 0) this.finish(h, false);
      } };
    } else {
      UI.toast('Moonfin blows bubbles — pop them all! (walk into them or click)', 'bang');
      const bubs = [];
      for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU, r = rand(3, 7); const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), new THREE.MeshBasicMaterial({ color: linColor(0xc8f8ff), transparent: true, opacity: 0.5, depthWrite: false })); const b = { m, x: N.x + Math.cos(a) * r, z: N.z + Math.sin(a) * r, y: N.y + 1.2, ph: rand(0, TAU), alive: true }; m.position.set(b.x, b.y, b.z); W.scene.add(m); bubs.push(b); }
      let t = 18;
      h.custom = (o, dt) => { o.speed = 0; o.mood = 'happy'; o.yaw = dampAngle(o.yaw, Math.atan2(P1.x - o.x, P1.z - o.z), 3, dt); o.y = Colliders.ground(o.x, o.z, o.y + 1); if (Math.random() < dt * 3) FX.bubble(o.x, o.y + 0.9, o.z, 0, 0.6, 0, 0.25); };
      this.chal = { h, bubs, update: (dt) => {
        t -= dt; UI.timer(t);
        let left = 0;
        for (const b of bubs) {
          if (!b.alive) continue; left++;
          b.ph += dt; b.x += Math.sin(b.ph * 0.9) * dt * 1.2; b.z += Math.cos(b.ph * 0.7) * dt * 1.2; b.m.position.set(b.x, b.y + Math.sin(b.ph * 2) * 0.3, b.z);
          const near = dist2d(b, P1) < 1.3 || (P1.atkT > 0.5 && dist2d(b, { x: P1.x + Math.sin(P1.yaw) * 1.2, z: P1.z + Math.cos(P1.yaw) * 1.2 }) < 1.6);
          if (near) { b.alive = false; W.scene.remove(b.m); Audio.sfx('pop'); FX.burst(b.x, b.y, b.z, 10, { speed: 3, life: 0.5, size: 0.3, color: 0xd8fbff }); }
        }
        if (left === 0) this.finish(h, true); else if (t <= 0) this.finish(h, false);
      } };
    }
  },
  finish(h, won) {
    const c = this.chal; if (!c || c.done) return; c.done = true;
    if (c.ring) c.ring.clear();
    if (c.bubs) c.bubs.forEach((b) => b.alive && W.scene.remove(b.m));
    UI.timer(null);
    h.custom = null; h.anim = {};
    const fav = { ember: 2, cloud: 3, moon: 2 }[h.type];
    h.aff = (h.aff || 0) + (won ? fav + 1 : fav * 0.5); h.acts = (h.acts || 0) + 1;
    if (won) { Audio.sfx('quest'); FX.confetti(h.x, h.y + 1, h.z, 30); UI.toast({ ember: 'You win! Emberwing pretends it let you.', cloud: 'Tagged! Cloudclaw squawks with delight and demands a rematch.', moon: 'All popped! Moonfin wiggles happily.' }[h.type], 'heart'); }
    else { Audio.sfx('fail'); UI.toast({ ember: 'Emberwing wins and does a smug little victory hop.', cloud: 'Cloudclaw is too quick! It looks very pleased with itself.', moon: 'Moonfin giggles and blows a few more bubbles for you.' }[h.type], 'info'); }
    h.reactT = 2; h.reactMood = 'celebrate'; Sprites.emote(h, won ? 'heart' : 'note', 1.6);
    setTimeout(() => { this.chal = null; }, 300);
    this.after(h);
  },
  confirm(h) {
    const name = CREATURE_DEF[h.type].name;
    Dialog.say({ name: 'Keeper Bram' }, [{ who: 'Keeper Bram', text: name + ' — ' + CREATURE_DEF[h.type].blurb + ' Choose ' + name + ' to grow up with you, for a whole lifetime?', opts: [{ label: 'Yes — this is the one', act: () => setTimeout(() => chooseCompanion(h), 50) }, { label: 'Not yet, I want more time', act: () => {} }] }]);
  },
};

function pickBall() {
  if (Hatch.ball) { W.scene.remove(Hatch.ball.m); }
  const m = meshOf([part(sph(0.3, 10, 8), 0xf7c548), part(tor(0.3, 0.04, 4, 12), 0xe2573a, {})]);
  W.scene.add(m);
  Hatch.ball = { m, x: P1.x, y: P1.y + 1.4, z: P1.z, vx: 0, vy: 0, vz: 0, flying: null, chase: false };
  P1.carry = Hatch.ball; Audio.sfx('pickup');
  Hints.show('throw', 'Click to throw the ball!', 5);
}
function updateBall(dt) {
  const b = Hatch.ball; if (!b) return;
  if (P1.carry === b) { b.x = P1.x + Math.sin(P1.yaw) * 0.5; b.y = P1.y + 1.1; b.z = P1.z + Math.cos(P1.yaw) * 0.5; }
  else if (b.flying) {
    b.vy -= 20 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    const g = Colliders.ground(b.x, b.z, b.y); if (b.y < g + 0.3) { b.y = g + 0.3; b.vy *= -0.5; b.vx *= 0.7; b.vz *= 0.7; if (Math.abs(b.vy) < 1.5) { b.flying = false; b.chase = true; } }
    const N = Spots.nursery; const pr = Math.hypot(b.x - N.x, b.z - N.z); if (pr > 9) { b.x = N.x + ((b.x - N.x) / pr) * 9; b.z = N.z + ((b.z - N.z) / pr) * 9; b.vx *= -0.5; b.vz *= -0.5; }
  } else if (b.holder) { const h = b.holder; b.x = h.x + Math.sin(h.yaw) * 0.5; b.y = h.y + 0.6; b.z = h.z + Math.cos(h.yaw) * 0.5; b.holdT -= dt; if (b.holdT <= 0) { b.holder = null; W.scene.remove(b.m); Hatch.ball = null; return; } }
  b.m.position.set(b.x, b.y, b.z); b.m.rotation.x += dt * (b.flying ? 8 : 0);
}
Bus.on('throw', (b) => { if (b === Hatch.ball) { b.flying = true; b.chase = false; Hatch.list.forEach((h) => { h.met = h.met; }); } });
function ballCaught(h) {
  const b = Hatch.ball; if (!b || b.holder) return;
  b.chase = false; b.holder = h; b.holdT = 2.5;
  h.aff = (h.aff || 0) + (h.type === 'ember' ? 1.5 : 1); h.acts = (h.acts || 0) + 1; h.met = true;
  h.reactT = 2; h.reactMood = 'celebrate'; Sprites.emote(h, 'star', 1.6);
  Audio.sfx('creature', { type: h.type, mood: 'celebrate', stage: 0 });
  UI.toast({ ember: 'Emberwing pounces on the ball first and proudly trots it back!', cloud: 'Cloudclaw snatches the ball mid-bounce!', moon: 'Moonfin bonks the ball with its nose — got it!' }[h.type], 'star');
  Bond.after(h);
}

function chooseCompanion(h) {
  UI.nameCompanion(h.type, (name, pal) => {
    G.ctype = h.type; G.name = name; G.palette = pal; G.stage = 0; G.xp = 0;
    Comp.x = h.x; Comp.y = h.y; Comp.z = h.z; Comp.yaw = h.yaw;
    h.hidden = true; Hatch.list.forEach((o) => { if (o !== h) o.chosenOther = true; });
    Comp.build(); Comp.C.root.position.set(h.x, h.y, h.z);
    G.flags.bonding = false;
    Obj.complete('choose', { xp: 0 });
    Audio.sfx('stage');
    FX.confetti(h.x, h.y + 1.5, h.z, 60); FX.hearts(h.x, h.y + 1, h.z);
    Comp.react('win');
    Cam.override = { pos: new THREE.Vector3(h.x + 4, h.y + 4, h.z + 6), look: new THREE.Vector3(h.x, h.y + 0.8, h.z), dur: 1.2 };
    setTimeout(() => {
      Dialog.say(NPCs.get('bram'), [
        name + '. A fine name! Listen to that happy ' + (h.type === 'ember' ? 'crackle' : h.type === 'cloud' ? 'chirp' : 'burble') + '.',
        'From today, you two grow up together. Look after each other — and give ' + name + ' plenty of cuddles. Walk up and press E.',
        'Don’t worry about the other two. Tilly and her friends have been begging for hatchlings of their own.',
        'Now, why not show ' + name + ' around the village?',
      ], () => {
        Cam.override = null;
        startChild();
      });
    }, 1300);
    // remaining hatchlings go to kids
    gainXP(10, 'Bond');
  });
}

// ───── chapter 0: child ─────
function startChapter0() {
  Story.chapter = 0;
  G.mode = 'play';
  P1.x = Spots.homeDoor.x; P1.z = Spots.homeDoor.z; P1.y = gy(P1.x, P1.z); P1.yaw = Math.PI / 2;
  Cam.snap(P1);
  UI.region('Hearthvale Village', 'Hatching Day');
  setTimeout(() => {
    Dialog.say(NPCs.get('mira'), [
      'There you are, sleepyhead! Do you know what day it is?',
      'It’s Hatching Day! Keeper Bram says this spring’s hatchlings are ready to meet you.',
      'The nursery is just up the lane, past the plaza. Off you go — and say hello to everyone!',
    ], () => {
      Obj.add('nursery', 'Go to the Creature Nursery', { target: () => ({ x: Spots.nursery.x + 9, z: Spots.nursery.z + 8 }) });
      Hints.show('move', 'Use WASD or the arrow keys to move. Hold Shift to run.', 7);
    });
  }, 900);
}
Bus.on('frame', () => {
  if (Obj.has('nursery') && dist2d(P1, NPCs.get('bram')) < 7 && !Dialog.open) {
    Obj.complete('nursery', { silent: true });
    G.flags.bonding = true;
    Dialog.say(NPCs.get('bram'), [
      'Ah! Right on time. Come in, come in — mind the little ones.',
      'Three hatchlings this spring: Emberwing the dragon, Cloudclaw the griffin, and Moonfin, our little sea-wyrm.',
      'Every one of them can grow into a fine flyer. But a companion is for life — so take your time.',
      'Walk up to each one and press E. Feed them, play with them, try their little challenges. There’s a treat basket and a toy bin by the fence.',
    ], () => {
      Obj.add('meet3', () => 'Spend time with each hatchling (' + Hatch.list.filter((x) => x.met).length + '/3)', { target: () => ({ x: Spots.nursery.x, z: Spots.nursery.z }) });
      Hints.show('interact', 'Press E to interact when you see a prompt.', 6);
    });
  }
});

function startChild() {
  Obj.add('tour', () => 'Show ' + G.name + ' around Hearthvale (' + ['plaza', 'elder', 'bridge', 'windmill'].filter((k) => G.landmarks[k]).length + '/4 places)', { target: () => { const L = Landmarks.find((l) => ['plaza', 'elder', 'bridge', 'windmill'].includes(l.id) && !G.landmarks[l.id]); return L ? { x: L.x, z: L.z } : null; }, xp: 10 });
  Obj.add('crows', 'Help Farmer Hob with the crows', { target: () => ({ x: Spots.farm.x + 11, z: Spots.farm.z - 2 }) });
  Obj.add('hide', 'Play hide-and-seek with Tilly', { main: false, target: () => { const t = NPCs.get('tilly'); return { x: t.x, z: t.z }; } });
  Obj.add('train', 'Train with Captain Rowan at the yard', { target: () => ({ x: Spots.yard.x - 5, z: Spots.yard.z + 5 }) });
  Hints.show('pet', 'Press E next to ' + G.name + ' to give them a cuddle.', 7);
  // give remaining hatchlings to kids (visually)
  Hatch.list.forEach((h) => { if (h.chosenOther) h.hidden = true; });
}
Bus.on('landmark', (L) => {
  if (Obj.has('tour') && ['plaza', 'elder', 'bridge', 'windmill'].includes(L.id)) {
    UI.objectivesDirty = true;
    if (['plaza', 'elder', 'bridge', 'windmill'].every((k) => G.landmarks[k])) setTimeout(() => Obj.complete('tour'), 800);
  }
});

// crows quest
const Crows = { left: 0 };
function startCrows() {
  const F = Spots.farm; Crows.left = 6;
  for (let i = 0; i < 6; i++) { const e = Enemies.spawn('crow', F.x - 7 + (i % 3) * 6 + rand(-1, 1), F.z - 3 + Math.floor(i / 3) * 5.6 + rand(-1, 1), { yaw: rand(0, TAU) }); e.crow = true; }
  Obj.remove('crows');
  Obj.add('crows2', () => 'Shoo the crows from the garden (' + (6 - Crows.left) + '/6)', { target: () => ({ x: F.x, z: F.z }) });
  Hints.show('ability', 'Press F to have ' + G.name + ' use their special move — it’s great for startling crows!', 7);
}
Bus.on('crowShoo', () => {
  Crows.left--; UI.objectivesDirty = true;
  Audio.sfx('coin'); G.coins += 1;
  if (Crows.left === 3) Comp.react('win');
  if (Crows.left <= 0) setTimeout(() => {
    Obj.complete('crows2', { xp: 25 });
    Dialog.say(NPCs.get('hob'), ['Well I never! Not a feather left. You and ' + G.name + ' make a fine team.', 'Here — a honey tart each. Don’t tell your mother I gave you dessert first.'], () => { G.coins += 10; UI.toast('+10 coins', 'coin'); Comp.react('food'); gainXP(5, 'Snack'); });
  }, 700);
});

// hide and seek
const HideSeek = { list: [], found: 0 };
function startHide() {
  Obj.remove('hide');
  const spots = [[Spots.bridge.x + 4, Spots.bridge.z + 4, 'under the Willow Bridge'], [-58, 44, 'behind the farm'], [Spots.windmillB.x + 5, Spots.windmillB.z + 3, 'by the west windmill']];
  const pals = [PALETTES.moon[1], PALETTES.ember[2], PALETTES.cloud[2]];
  const types = ['moon', 'ember', 'cloud'];
  spots.forEach(([x, z], i) => {
    const w = Wild.add({ type: types[i], stage: 0, pal: pals[i], x, y: gy(x, z), z, yaw: rand(0, TAU) });
    w.hideIdx = i; w.found = false;
    w.update = (o, dt) => {
      if (o.found) { // run back to kid
        const kid = NPCs.list.find((n) => n.kidIndex === i); const dx = kid.x - o.x, dz = kid.z - o.z, d = Math.hypot(dx, dz);
        if (d > 2) { o.x += (dx / d) * 6 * dt; o.z += (dz / d) * 6 * dt; o.yaw = Math.atan2(dx, dz); o.speed = 6; } else { o.hidden = true; }
        o.y = Colliders.ground(o.x, o.z, o.y + 1); o.mood = 'celebrate'; return;
      }
      o.anim = { sit: true }; o.mood = dist2d(o, P1) < 5 ? 'scared' : 'idle';
      if (dist2d(o, Comp) < 12 && !o.sensed) { o.sensed = true; Sprites.emote(Comp.emoteTarget, 'bang', 2); Comp.goto = { x: o.x + 1.5, z: o.z + 1.5, speed: 1.3, max: 4 }; UI.toast(G.name + ' sniffs out a hiding hatchling!', 'q'); }
    };
    HideSeek.list.push(w);
    addInteract({ id: 'hide' + i, x, z, r: 2.6, label: 'Found you!', follow: w, cond: () => !w.found && Obj.has('hide2'), act: () => { w.found = true; HideSeek.found++; Audio.sfx('pickup'); FX.sparkle(w.x, w.y + 1, w.z); Sprites.emote(w, 'heart', 1.6); UI.objectivesDirty = true; Comp.react('win'); if (HideSeek.found >= 3) setTimeout(() => { Obj.complete('hide2', { xp: 25 }); UI.toast('Tilly cheers: “You found everyone! You’re the best seeker in Hearthvale!”', 'heart'); G.coins += 8; }, 600); } });
  });
  Obj.add('hide2', () => 'Find the hiding hatchlings (' + HideSeek.found + '/3)', { main: false, target: () => { const w = HideSeek.list.find((o) => !o.found); return w && w.sensed ? { x: w.x, z: w.z } : null; } });
}

// training
const Training = { hits: 0, dodges: 0, ability: 0, dummies: [] };
function startTraining() {
  Obj.remove('train');
  Training.dummies = Spots.dummies.map((d) => Enemies.spawn('dummy', d.x, d.z, { yaw: Math.PI }));
  Obj.add('train2', () => 'Training: hit the dummy (' + Math.min(3, Training.hits) + '/3), dodge (' + Math.min(2, Training.dodges) + '/2), team move (' + Math.min(1, Training.ability) + '/1)', { target: () => ({ x: Spots.yard.x, z: Spots.yard.z }) });
  Hints.show('attack', 'Click to swing your training stick. Space to dodge-roll. F for ' + G.name + '’s move.', 8);
}
Bus.on('dummyHit', ({ opt }) => {
  if (!Obj.has('train2')) return;
  if (opt.src === 'player') Training.hits++; else if (opt.src === 'comp') Training.ability++;
  UI.objectivesDirty = true; checkTraining();
});
Bus.on('dodge', () => { if (Obj.has('train2') && dist2d(P1, Spots.yard) < 12) { Training.dodges++; UI.objectivesDirty = true; checkTraining(); } });
function checkTraining() {
  if (Training.hits >= 3 && Training.dodges >= 2 && Training.ability >= 1 && Obj.has('train2')) {
    setTimeout(() => {
      Obj.complete('train2', { xp: 25 });
      Dialog.say(NPCs.get('rowan'), ['Ha! Not bad at all, little sprout.', 'Remember: you’re not fighting alone. When ' + G.name + ' strikes, the enemy flinches — that’s your opening.', 'Come find me when ' + G.name + ' is big enough to carry you. Then the real lessons begin.']);
    }, 400);
  }
}
