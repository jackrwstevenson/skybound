// ───────────────────────── story: talk, growth, chapters 1–3, finale, ending ─────────────────────────
const STAGE_UNLOCK = [
  '',
  'Riding unlocked! Press E beside {name} to climb on. Space jumps — hold it in the air to glide.',
  'Full flight unlocked! While riding, press Space to take off.',
  'Legendary bond! Fighting together fills your Surge. When it’s full, F unleashes Skybound Strike.',
];
const STAGE_YEARS = ['', 'Three summers pass…', 'The years fly by…', 'A lifetime of adventures later…'];

function talkTo(n) {
  const id = n.id, nm = G.name;
  const L = (arr, done) => Dialog.say(n, arr, done);
  if (id === 'mira') {
    if (!G.ctype) return L(['The nursery is up the lane, love. Go on!']);
    const t = ['Look at you two! ' + nm + ' has grown so much.', 'Don’t forget to come home for supper, adventurer.', 'Your father used to fly a griffin, you know. You have his grin.', 'I’m so proud of you both.'][G.stage];
    return L([t, G.hp < maxHp() ? { text: 'Here, have some soup. You look worn out.', fn: () => { G.hp = maxHp(); Audio.sfx('heart'); } } : 'Stay safe out there.']);
  }
  if (id === 'bram') {
    if (!G.ctype) return L(['Take your time with them. Watch how each one reacts to you.']);
    return L([['Gentle hands, gentle hearts. ' + nm + ' looks happy.', 'Riding already? Time flies like a griffin.', 'I’ve raised a hundred hatchlings. Few bonds shine like yours.', 'Old friend! Look at the two of you. Legends, the both of you.'][G.stage], 'Tip: cuddle ' + nm + ' often — bonding is what makes them grow.']);
  }
  if (id === 'wren') {
    if (!G.ctype) return L(['The Elder Tree watches over every pair who grows up here.']);
    const need = XP_NEED[G.stage];
    if (G.stage < 3 && G.xp >= need) return L(['The Elder Tree is humming. Can you feel it?', { text: 'Your bond has deepened. Are you ready to grow?', opts: [{ label: 'We’re ready', act: () => setTimeout(() => growCeremony(), 50) }, { label: 'Not just yet', act: () => {} }] }]);
    if (G.stage === 3) return L([G.done.captain ? 'You came home. That is the bravest flight of all.' : 'Even legends need someone to fly home to. Go — the Blackwake waits beyond the lagoon.']);
    return L(['Growing up takes more than time, little one.', 'Explore, help your neighbours, play together, and share Golden Fruit. Your bond meter shows how close you are.', 'When it’s full, come back to me.']);
  }
  if (id === 'rowan') {
    if (!G.ctype) return L(['Hatching Day! Go find your partner, sprout.']);
    if (G.stage === 0) { if (!G.done.train2 && !Obj.has('train2')) return L(['Want to learn to defend yourself? Hit those dummies, and practise dodging with Space.', { text: 'And when you’re in trouble, call on ' + nm + ' with F.', then: () => startTraining() }]); return L(['Keep practising! Your stick is no sword, but heart matters more.']); }
    if (G.stage === 1 && !G.done.ride) {
      if (!Obj.has('ride2')) return L(['Look how big ' + nm + ' has got! Strong enough to carry you now.', 'Climb on — press E beside ' + nm + ' — and follow my rings through the village.', { text: 'Use Shift for a burst of speed. Off you go!', then: () => startRideRings() }]);
      return L(['Follow the rings! Press E beside ' + nm + ' to climb on.']);
    }
    if (G.stage === 1 && !G.done.glide) return L(['Riding like a natural! Next: gliding.', 'Ride up to Lookout Hill, west of the village. Jump off the top with Space, and hold Space to spread those wings.']);
    if (G.stage >= 2 && !G.done.firstflight) return L(['Full wings! It’s time you two really flew.', 'Climb on, press Space to take off. Space climbs, Q dives, Shift boosts.', { text: 'Fly north to Frostpeak Lodge. Ranger Sorrel is expecting you.', then: () => { Obj.add('frost', 'Fly north to Frostpeak Lodge', { target: () => ({ x: P.lodge.x + 9, z: P.lodge.z }) }); } }]);
    return L(['Proud of you, rider. Keep your wings sharp.', G.weapons.cutlass ? 'That cutlass suits you. Press R to swap weapons.' : 'Pirates drop fine weapons. Keep an eye out.']);
  }
  if (id === 'hob') {
    if (G.stage === 0 && !G.done.crows2 && !Obj.has('crows2')) return L(['Oh, thank goodness! Crows everywhere — they’re pecking my cabbages to bits!', { text: 'Could you and ' + (nm || 'your hatchling') + ' shoo them away? Just run at them!', then: () => startCrows() }]);
    return L([['The garden’s never looked better.', 'Fancy a turnip? No? Suit yourself.', 'My cabbages still talk about you.', 'Back in my day we had to shoo crows uphill both ways.'][G.stage]]);
  }
  if (id === 'tilly') {
    if (G.stage === 0 && !G.done.hide2 && !Obj.has('hide2')) return L(['Let’s play hide-and-seek! Our hatchlings are already hiding — betcha can’t find them!', { text: 'One’s near the bridge, one’s near the farm, one’s by a windmill. ' + (nm || 'Your hatchling') + ' can sniff them out!', then: () => startHide() }]);
    return L(['Again! Again!']);
  }
  if (id === 'fen') return openShop();
  if (id === 'marlo') {
    if (!G.done.race && G.stage >= 1) return L(['Ahoy, riders! Fancy a race along the sand? Follow the rings before the timer runs out.', { text: 'Ready?', opts: [{ label: 'Let’s race!', act: () => setTimeout(startRace, 50) }, { label: 'Maybe later', act: () => {} }] }]);
    return L(['Watch the tide pools — crabs pinch!', 'Old Juniper says the wreck has been washed up for years. Never been opened…']);
  }
  if (id === 'juniper') {
    if (!G.done.shells && !Obj.has('shells2')) return L(['My sandcastle needs decorations! Can you find three shiny shells? They sparkle near the water.', { text: 'Pleeease?', then: () => startShells() }]);
    if (Obj.has('shells2')) return L(['Shiny shells! They sparkle. Bring me three!']);
    return L(['Look at my castle! It’s the best castle on the whole beach.']);
  }
  if (id === 'sorrel') return talkSorrel(n);
  if (id === 'coralie') return talkQueen(n);
  if (id === 'lyra') return talkLyra(n);
  if (id === 'marina') return talkMarina(n);
  if (n.lines.length) return L([pick(n.lines)]);
}

// ───── shop ─────
function openShop() {
  const fen = NPCs.get('fen');
  const fruitKey = 'shopFruit' + G.stage;
  const opts = [];
  if (!G.flags[fruitKey]) opts.push({ label: 'Golden Fruit — 60 coins', act: () => { if (G.coins < 60) return UI.toast('Not enough coins (60 needed).', 'coin'); G.coins -= 60; G.flags[fruitKey] = 1; Audio.sfx('coin'); setTimeout(() => collectFruit(), 400); } });
  opts.push({ label: 'Honey stew (full health) — 8 coins', act: () => { if (G.coins < 8) return UI.toast('Not enough coins.', 'coin'); G.coins -= 8; G.hp = maxHp(); Audio.sfx('heart'); UI.toast('Delicious! Fully restored.', 'heart'); } });
  if (!G.flags.charm) opts.push({ label: 'Treasure charm (shows chests on the map) — 40 coins', act: () => { if (G.coins < 40) return UI.toast('Not enough coins.', 'coin'); G.coins -= 40; G.flags.charm = 1; Audio.sfx('pickup'); UI.toast('The charm hums. Unopened chests now appear on your map (M).', 'star'); } });
  opts.push({ label: 'Just looking', act: () => {} });
  Dialog.say(fen, [{ text: 'Welcome, welcome! You have ' + G.coins + ' coins. What’ll it be?', opts }]);
}

// ───── Golden Fruit ─────
function collectFruit() {
  G.fruit++;
  Audio.sfx('golden');
  FX.sparkle(P1.x, P1.y + 1.5, P1.z, 0xffd34d, 40);
  const xp = G.stage < 3 ? Math.round(XP_NEED[G.stage] * 0.35) : 0;
  UI.toast('A Golden Fruit! You share it with ' + G.name + '.', 'star');
  Comp.react('food');
  if (Comp.C) FX.hearts(Comp.x, Comp.y + Comp.C.headY, Comp.z);
  if (xp) gainXP(xp, 'Golden Fruit');
  setTimeout(() => UI.upgradeChoice(), 700);
}
const UPGRADES = [
  { id: 'heart', name: 'Stout Heart', desc: '+25 maximum health for you.', max: 3 },
  { id: 'wings', name: 'Strong Wings', desc: 'Faster flying and riding.', max: 3 },
  { id: 'stamina', name: 'Deep Breath', desc: '+30 flight stamina.', max: 3 },
  { id: 'fierce', name: 'Fierce Spirit', desc: 'Special ability recharges 10% faster.', max: 3 },
  { id: 'swift', name: 'Light Feet', desc: 'Move faster on foot.', max: 3 },
];

// ───── growth ceremony ─────
function growCeremony() {
  const from = G.stage, to = from + 1;
  Obj.complete('grow' + from, { silent: true });
  G.mode = 'cutscene';
  const et = Spots.elderTree;
  const cx = et.x + 7, cz = et.z + 4;
  if (P1.mode !== 'foot' && P1.mode !== 'swim') dismount(true);
  P1.x = cx; P1.z = cz; P1.y = gy(cx, cz); P1.yaw = Math.atan2(et.x - cx, et.z - cz);
  Comp.x = cx + 2.4; Comp.z = cz + 0.8; Comp.y = gy(Comp.x, Comp.z); Comp.yaw = P1.yaw; Comp.air = false;
  Audio.sfx('bell');
  let t0 = 0;
  Cam.override = { pos: (t) => new THREE.Vector3(cx + Math.cos(t * 0.35) * 11, P1.y + 5, cz + Math.sin(t * 0.35) * 11), look: new THREE.Vector3(cx + 1, P1.y + 1.5, cz), dur: 1.5 };
  for (let i = 0; i < 6; i++) setTimeout(() => FX.sparkle(cx + rand(-3, 3), P1.y + rand(1, 4), cz + rand(-3, 3), pick([0xfff2a8, 0xf8c6d4, 0x9ff3ff]), 20), i * 300);
  setTimeout(() => UI.fade(true, STAGE_YEARS[to], true), 2000);
  setTimeout(() => {
    applyStage(to);
    Comp.x = cx + 2.6 + to * 0.3; Comp.z = cz + 1;
    UI.fade(false);
    Audio.sfx('stage');
    FX.confetti(cx, P1.y + 2, cz, 80);
    Comp.celebrateT = 3; G.celebrateT = 2.5;
    UI.banner(STAGE_INFO[to].title, 3, STAGE_UNLOCK[to].replace(/\{name\}/g, G.name));
    void t0;
  }, 4200);
  setTimeout(() => {
    Cam.override = null; G.mode = 'play';
    afterGrow(to);
    saveGame(true);
  }, 8000);
}
function applyStage(s) {
  G.stage = s; G.xp = 0;
  rebuildPlayer();
  if (G.ctype) Comp.build();
  G.hp = maxHp(); P1.stam = stamMax();
  W.homeDeco.forEach((g, i) => (g.visible = i === s));
  UI.portraitDirty = true; UI.objectivesDirty = true;
  // village kids grow too: hide hatchling props of kids as they age
  // the village children grow up alongside you
  ['tilly', 'bo', 'nell'].forEach((id, i) => {
    const n = NPCs.get(id); if (!n || (n.grown || 0) === s) return; n.grown = s;
    const look = Object.assign({}, n.o.look, { age: Math.min(s, 3), blush: s === 0 });
    if (s >= 2) look.vest = [0x7a5636, 0x3d6f8f, 0x8a4f7d][i];
    n.root.remove(n.H.root); n.H = buildHuman(look); n.root.add(n.H.root);
    if (n.pet) { W.scene.remove(n.pet.C.root); n.pet.C = buildCreature(n.o.pet.type, Math.min(s, 3), n.o.pet.pal); W.scene.add(n.pet.C.root); }
    n.lines = [['Hee hee! Can’t catch me!', 'Tag, you’re it!'], ['Race you to the beach someday!', 'We can glide now! Well, sort of.'], ['Off to the mountains this week.', 'Remember when we were tiny?'], ['Our grandchildren adore your stories.', 'Look at us — old and still flying!']][s];
  });
  Bus.emit('stage', s);
}
function afterGrow(s) {
  const nm = G.name;
  if (s === 1) {
    Obj.add('ride', 'Find Captain Rowan for a riding lesson', { target: () => ({ x: Spots.yard.x - 5, z: Spots.yard.z + 5 }) });
    Dialog.say({ name: nm }, [{ who: '', text: nm + ' nudges you with their snout. They’re big enough to carry you now!' }]);
  }
  if (s === 2) {
    Obj.add('firstflight', 'Talk to Captain Rowan about flying', { target: () => ({ x: Spots.yard.x - 5, z: Spots.yard.z + 5 }) });
  }
  if (s === 3) {
    if (G.done.song) startFinaleHook();
    else UI.toast('The Mermaid Lagoon still guards its secrets…', 'q');
  }
}

// ───── chapter 1: teen ─────
function startRideRings() {
  const pts = catmull([[24, 30], [0, 34], [-22, 26], [-30, 4], [-16, -16], [6, -24], [28, -10], [40, 6], [30, 24]], 1).map(([x, z]) => ({ x, z, y: Colliders.ground(x, z) + 1.8, r: 2.8 }));
  const course = new RingCourse('ride', pts, { color: 0x8fd3ff });
  course.start();
  Rings.active = course; Rings.onDone = () => { Obj.complete('ride2', { xp: 35 }); Obj.complete('ride', { silent: true }); Dialog.say(NPCs.get('rowan'), ['Beautiful! You two move as one.', 'Now — gliding. Ride up Lookout Hill to the west, leap off with Space and hold it to glide.'], () => Obj.add('glide', 'Glide from the top of Lookout Hill', { target: () => ({ x: Spots.lookout.x, z: Spots.lookout.z }) })); };
  Obj.add('ride2', 'Ride through Rowan’s rings', { target: () => course.active ? course.current() : null });
}
Bus.on('frame', () => {
  if (Obj.has('glide') && !G.flags.glideStarted && dist2d(P1, Spots.lookout) < 6 && P1.y > 15) {
    G.flags.glideStarted = true;
    const dir = Math.atan2(30 - Spots.lookout.x, 60 - Spots.lookout.z);
    const pts = [];
    for (let i = 1; i <= 5; i++) { const x = Spots.lookout.x + Math.sin(dir) * i * 9, z = Spots.lookout.z + Math.cos(dir) * i * 9; pts.push({ x, z, y: Math.max(gy(x, z) + 2.5, 19 - i * 2.6), r: 3.6 }); }
    const course = new RingCourse('glide', pts, { color: 0xf49ac1 }); course.start();
    Rings.active = course; Rings.onDone = () => { Obj.complete('glide', { xp: 35 }); afterGlide(); };
    Rings.onFail = () => { G.flags.glideStarted = false; };
    UI.toast('Leap off the hill and glide through the rings! (Space to jump, hold to glide)', 'bang');
  }
});
function afterGlide() {
  Dialog.say(NPCs.get('rowan') ? { name: 'Captain Rowan' } : null, [{ who: 'Captain Rowan', text: 'Wonderful gliding! Now, something odd: fishermen say strange ships have been sighted off Sunspill Beach.' }, { who: 'Captain Rowan', text: 'Ride south and have a look around. Carefully!' }], () => Obj.add('beach', 'Ride south to Sunspill Beach', { target: () => ({ x: 60, z: 222 }) }));
}
Bus.on('landmark', (L) => {
  if (L.id === 'beach' && Obj.has('beach')) {
    Obj.complete('beach', { xp: 10 });
    setTimeout(() => Dialog.say(NPCs.get('marlo'), ['Welcome to Sunspill! Best sand on the island.', 'Strange ships? Hmm. There IS the old Merry Gull wreck by the rocks — nobody’s ever opened its strongbox.', 'And if you fancy a race, come find me!'], () => {
      Obj.add('clue1', 'Search the Wreck of the Merry Gull', { target: () => Spots.wreckChest });
      Obj.add('race', 'Race Marlo along the beach', { main: false, target: () => ({ x: NPCs.get('marlo').x, z: NPCs.get('marlo').z }) });
      Obj.add('shells', 'Help Juniper decorate her sandcastle', { main: false, target: () => ({ x: Spots.sandcastle.x + 2, z: Spots.sandcastle.z + 2 }) });
    }), 600);
  }
  if (L.id === 'lodge' && Obj.has('frost')) { Obj.complete('frost', { xp: 15 }); setTimeout(() => { if (!G.flags.sorrelMet) talkSorrel(NPCs.get('sorrel')); }, 500); }
  if (L.id === 'nestgate' && Obj.has('nest')) { Obj.complete('nest', { xp: 10 }); setTimeout(() => { if (!Nest.active && !G.done.nestTrial) talkAshka(); }, 500); }
  if (L.id === 'lagoon' && Obj.has('lagoon')) { Obj.complete('lagoon', { xp: 10 }); setTimeout(() => { if (!G.flags.queenMet) talkQueen(); }, 400); }
});
function startRace() {
  const pts = Spots.raceRings.map((p) => ({ x: p.x, z: p.z, y: Math.max(1.6, Colliders.ground(p.x, p.z)) + 1.8, r: 3.2 }));
  const course = new RingCourse('race', pts, { color: 0xffd34d, limit: 26, bonus: 2.2 });
  course.start(); Rings.active = course; Obj.remove('race');
  Rings.onDone = () => { Obj.complete('race', { xp: 35 }); G.coins += 20; UI.toast('You win! Marlo hands you 20 coins and a medal.', 'coin'); FX.confetti(P1.x, P1.y + 2, P1.z); };
  Rings.onFail = () => { UI.toast('Out of time! Talk to Marlo to try again.', 'info'); Obj.add('race', 'Race Marlo along the beach', { main: false, target: () => ({ x: NPCs.get('marlo').x, z: NPCs.get('marlo').z }), silent: true }); };
  UI.toast('Go! Each ring adds a little time.', 'bang');
}
const Shells = { list: [], n: 0 };
function startShells() {
  Obj.remove('shells');
  const spots = [[-30, 250], [84, 252], [118, 240]];
  Shells.n = 0;
  spots.forEach(([x, z], i) => {
    const m = new THREE.Mesh(PROTO.shell, new THREE.MeshBasicMaterial({ color: linColor(pick([0xffc8e0, 0xc8f0ff, 0xfff0b0])) })); m.scale.setScalar(2);
    const y = Math.max(gy(x, z), 0.2) + 0.2; m.position.set(x, y, z); W.scene.add(m);
    const sh = { m, x, z, y, got: false }; Shells.list.push(sh);
    Emitters.push({ x, y: y + 0.4, z, kind: 'twinkle', rate: 3, acc: 0, cond: () => !sh.got });
    addInteract({ id: 'shell' + i, x, z, y, r: 2.6, label: 'Pick up shiny shell', cond: () => !sh.got, act: () => { sh.got = true; W.scene.remove(m); Shells.n++; Audio.sfx('pickup'); FX.sparkle(x, y + 0.5, z); UI.objectivesDirty = true; if (Shells.n >= 3) UI.toast('Three shells! Take them to Juniper.', 'star'); } });
  });
  Obj.add('shells2', () => (Shells.n >= 3 ? 'Bring the shells to Juniper' : 'Find shiny shells (' + Shells.n + '/3)'), { main: false, target: () => { if (Shells.n >= 3) return { x: Spots.sandcastle.x + 2, z: Spots.sandcastle.z + 2 }; const s = Shells.list.find((s) => !s.got); return s ? { x: s.x, z: s.z } : null; } });
}
Bus.on('frame', () => {
  if (Obj.has('shells2') && Shells.n >= 3 && dist2d(P1, NPCs.get('juniper')) < 3.2) {
    Obj.complete('shells2', { xp: 20 }); Obj.complete('shells', { silent: true }); G.done.shells = true;
    FX.confetti(Spots.sandcastle.x, gy(Spots.sandcastle.x, Spots.sandcastle.z) + 4, Spots.sandcastle.z, 40);
    Dialog.say(NPCs.get('juniper'), ['Yaaay! It’s the most beautiful castle in the world!', 'Here — I found this in the sand. It’s for ' + G.name + '!'], () => { G.coins += 12; Comp.react('food'); });
  }
});

// clue chests
function makeStoryChests() {
  makeChest('wreck', Spots.wreckChest.x, Spots.wreckChest.z, { coins: 12, xp: 15, text: 'Inside the strongbox: a torn page from a pirate’s log!', fn: () => {
    Obj.complete('clue1', { xp: 15 });
    setTimeout(() => Dialog.say({ name: 'Torn log page' }, [{ who: 'Torn log page', text: '“…the Blackwake’s spoils are hidden in the cove beyond the cliffs, where the sand glows blue…” — signed, Grimtide.' }], () => Obj.add('clue2', 'Find the hidden cove east of the beach', { target: () => P.cove })), 600);
  } }, { cond: () => G.stage >= 1 });
  makeChest('cove', Spots.coveChest.x, Spots.coveChest.z, { coins: 15, fruit: true, xp: 15, text: 'A hidden stash! And a spyglass with a note tied to it…', fn: () => {
    Obj.complete('clue2', { xp: 15 });
    setTimeout(() => Dialog.say({ name: 'Note on the spyglass' }, [{ who: 'Note', text: '“Crew: meet at Smugglers’ Rocks, west of the village, above the lagoon. Bring the stolen fruit. — G.”' }], () => Obj.add('clue3', 'Investigate Smugglers’ Rocks', { target: () => P.camp })), 600);
  } }, { cond: () => G.stage >= 1 });
  // optional treasure across the world
  const extra = [
    ['mill', Spots.windmillA.x + 0.5, Spots.windmillA.z + 0.5, { coins: 10, xp: 8 }, { y: Spots.windmillA.top }],
    ['roof', P.home.x + 0.6, P.home.z - 2.2, { coins: 6, xp: 5 }, { yHint: 20 }],
    ['elderTop', Spots.elderTree.x + 1.5, Spots.elderTree.z + 1, { coins: 10, fruit: true, xp: 10, text: 'A Golden Fruit, nestled in the blossoms!' }, { yHint: 30, cond: () => G.stage >= 2 }],
    ['summit', Spots.frostbloom.x, Spots.frostbloom.z, { coins: 25, fruit: true, xp: 20, text: 'The highest point in the world — and a Golden Fruit frozen in the ice!' }, {}],
    ['stack', 330, 60, { coins: 20, xp: 10 }, { yHint: 40 }],
    ['lodgeBack', P.lodge.x - 14, P.lodge.z + 10, { coins: 10, xp: 8 }, {}],
    ['nestRim', P.nest.x + Math.cos(NEST_GATE_ANG + 1.5) * 50, P.nest.z + Math.sin(NEST_GATE_ANG + 1.5) * 50, { coins: 25, fruit: true, xp: 15, text: 'Tucked into the volcano’s rim: a Golden Fruit, warm to the touch.' }, {}],
    ['crow', Spots.crowsNest.x, Spots.crowsNest.z, { coins: 30, xp: 10, text: 'The pirates’ lookout stash!' }, { y: Spots.crowsNest.y, cond: () => G.stage >= 2 }],
    ['gull', P.gull.x + 2, P.gull.z, { coins: 15, xp: 8 }, {}],
  ];
  for (const [id, x, z, loot, opt] of extra) makeChest(id, x, z, loot, opt);
  Spots.lagoonChests.forEach((p, i) => makeChest('sunk' + i, p.x, p.z, { coins: 12 + i * 4, xp: 10, fn: () => { G.flags.sunk = (G.flags.sunk || 0) + 1; UI.objectivesDirty = true; if (G.flags.sunk >= 3) Obj.complete('sunken', { xp: 20 }); } }, { cond: () => G.stage >= 1 }));
  makeChest('grotto', Spots.grottoPrize.x, Spots.grottoPrize.z, { coins: 30, fruit: true, xp: 20, text: 'Inside the grotto: Grimtide’s sea chart!', fn: () => {
    Obj.complete('song', { xp: 40 });
    setTimeout(() => Dialog.say({ name: 'Grimtide’s chart' }, [
      { who: 'Grimtide’s chart', text: 'The chart shows the Blackwake’s anchorage — just beyond the lagoon — and a list of every Golden Fruit grove the pirates have raided.' },
      { who: 'Queen Coralie', text: 'So that’s where they hide. The Blackwake has plagued these waters for longer than I can remember.' },
      { who: 'Queen Coralie', text: G.stage >= 3 ? 'You two are legends now. If anyone can stop Grimtide, it’s you.' : 'When your bond reaches its fullest, you will be strong enough to face them.' },
    ], () => { if (G.stage >= 3) startFinaleHook(); else UI.toast('Grow your bond to the Legendary stage to face the Blackwake.', 'q'); }), 500);
  } }, { cond: () => Spots.gate.open > 0.9, y: Spots.grottoPrize.y - 1 });
}

// smugglers camp fight
function startCamp() {
  if (G.flags.campStarted) return; G.flags.campStarted = true;
  const c = P.camp;
  const kinds = ['deckhand', 'deckhand', 'deckhand', 'gunner'];
  kinds.forEach((k, i) => { const a = (i / kinds.length) * TAU; Enemies.spawn(k, c.x + Math.cos(a) * 5, c.z + Math.sin(a) * 5, { group: 'camp', aggro: 16, drop: i === 0 ? ['cutlass'] : undefined }); });
  Enemies.group('camp', () => {
    Obj.complete('clue3', { xp: 45 });
    Comp.react('win');
    setTimeout(() => Dialog.say({ name: 'Crumpled letter' }, [
      { who: 'Crumpled letter', text: '“Grimtide’s orders: hide the captain’s chart in the mermaids’ grotto, deep in the lagoon. No one will find it there.”' },
      { who: '', text: 'The lagoon is deep — you’ll need a way to breathe underwater. Perhaps the mermaids could help, once you and ' + G.name + ' are grown.' },
    ], () => { G.flags.teenDone = true; if (G.stage >= 2) offerAdultQuests(); }), 800);
  });
  Audio.sfx('warn');
  UI.toast('Pirates! Click to attack, Space to dodge, F for ' + G.name + '’s move.', 'bang');
}
Bus.on('frame', () => { if (Obj.has('clue3') && !G.flags.campStarted && dist2d(P1, P.camp) < 22) startCamp(); });
Bus.on('respawn', () => { if (Obj.has('clue3') && G.flags.campStarted) { /* enemies reset by Enemies.onPlayerDefeated */ } });

// ───── chapter 2: adult ─────
function offerAdultQuests() {
  if (!G.done.frost && !Obj.has('frost') && G.done.firstflight) Obj.add('frost', 'Fly north to Frostpeak Lodge', { target: () => ({ x: P.lodge.x + 9, z: P.lodge.z }) });
  if (G.done.rescue && G.done.arches && !G.done.nest && !G.done.nestTrial) Obj.add('nest', 'Seek the Dragon’s Nest in the eastern volcano', { target: () => Spots.nestGate });
  if (G.done.rescue && G.done.arches && !G.done.lagoon && !G.done.song) Obj.add('lagoon', 'Visit the Mermaid Lagoon in the southwest', { target: () => ({ x: Spots.queen.x, z: Spots.queen.z }) });
}
Bus.on('objDone', (id) => {
  if (id === 'firstflight') { /* Rowan adds frost */ }
  if (id === 'rescue' || id === 'arches') {
    if (G.done.rescue && G.done.arches && !G.flags.frostStamina) {
      G.flags.frostStamina = true; P1.stam = stamMax();
      setTimeout(() => {
        Dialog.say({ name: 'Ranger Sorrel' }, [{ who: 'Ranger Sorrel', text: 'You’ve mastered the mountain winds. ' + G.name + '’s lungs are stronger for it — you’ll have more stamina, and you can climb far higher now.' }, { who: 'Ranger Sorrel', text: 'Some say there’s treasure at the very summit. And while you’re at it — the ancient dragons in the east and the mermaids in the southwest could use friends like you.' }], () => { UI.banner('Mountain Lungs', 2.5, '+50 flight stamina · fly to the highest peaks'); offerAdultQuests(); });
      }, 900);
    }
  }
  if (id === 'firstflight') offerAdultQuests();
  if (id === 'nestTrial' || id === 'song') { /* check readiness */ }
});
Bus.on('takeoff', () => { if (Obj.has('firstflight')) { Obj.complete('firstflight', { xp: 10 }); } });

function talkSorrel(n) {
  if (!n) return;
  const nm = G.name;
  if (G.stage < 2) return Dialog.say(n, ['The peaks are no place for short wings, young one. Come back when ' + nm + ' can really fly.']);
  if (!G.flags.sorrelMet) {
    G.flags.sorrelMet = true;
    return Dialog.say(n, ['So you’re Rowan’s riders! Welcome to Frostpeak.', 'Two jobs for you. First, my griffin’s youngster, Pip, flew into Glimmerfrost Cave chasing snow-imps. Now there’s an ice wall and no Pip.', 'Second: the Arch Run. Fly through every stone arch up the mountain before the wind turns. Use the updrafts — those swirling columns — to climb for free.', 'Do both and you’ll have mastered the mountain.'], () => {
      Obj.add('rescue', 'Rescue Pip from Glimmerfrost Cave', { target: () => P.cave });
      Obj.add('arches', 'Fly the Arch Run (start at the ring post by the lodge)', { target: () => Spots.archPost });
    });
  }
  if (Obj.has('rescue2') && Pip.following) return;
  return Dialog.say(n, [G.done.rescue && G.done.arches ? 'Pip hasn’t stopped talking about you. Well, squawking.' : 'Pip is in the cave to the west. The Arch Run starts at the ring post by the lodge.']);
}

// Arch run
function startArches() {
  if (Rings.active) return;
  const pts = Spots.arches.map((a) => ({ x: a.x, y: a.y, z: a.z, r: a.r }));
  const course = new RingCourse('arches', pts, { color: 0x9ff3ff, limit: 32, bonus: 6, r: 6 });
  course.start(); Rings.active = course;
  Rings.onDone = () => { Obj.complete('arches', { xp: 45 }); FX.confetti(P1.x, P1.y + 2, P1.z); UI.toast('Arch Run complete!', 'star'); };
  Rings.onFail = () => UI.toast('The wind turned! Return to the ring post to try again.', 'info');
  UI.toast('Arch Run! Fly through each arch. Updrafts lift you for free.', 'bang');
}

// Pip rescue
const Pip = { w: null, freed: false, following: false, imps: false };
function setupFrost() {
  const lodge = Spots.lodge;
  NPCs.add({ id: 'sorrel', name: 'Ranger Sorrel', x: P.lodge.x + 8, z: P.lodge.z + 3, yaw: Math.PI / 2, look: { age: 2, skin: 0xf6d3b5, hair: 0xd8d0c0, hairStyle: 'pony', top: 0x3d6f8f, vest: 0xe8e0d0, bottom: 0x4a3a2e, accent: 0x8fd3ff, hat: 'hood', hatColor: 0x6a8a9a, glove: 0x6b4a32 }, pet: { type: 'cloud', stage: 2, pal: PALETTES.cloud[1] } });
  Spots.archPost = { x: P.lodge.x + 12, z: P.lodge.z - 8 };
  buildRingPost(Spots.archPost.x, Spots.archPost.z, 0x9ff3ff);
  addInteract({ id: 'archpost', x: Spots.archPost.x, z: Spots.archPost.z, r: 3.4, label: 'Start the Arch Run (mount first)', cond: () => G.stage >= 2 && (Obj.has('arches') || G.done.arches) && !Rings.active, act: () => { if (P1.mode === 'foot') { UI.toast('Climb onto ' + G.name + ' first (E beside them), then take off.', 'info'); return; } startArches(); } });
  const pp = Spots.pip;
  Pip.w = Wild.add({ type: 'cloud', stage: 1, pal: PALETTES.cloud[1], x: pp.x, y: gy(pp.x, pp.z), z: pp.z, yaw: 0, mood: 'scared' });
  Pip.w.update = (o, dt) => {
    if (G.done.rescue) { // at lodge
      const nx = P.lodge.x + 10 + Math.cos(W.time * 0.8) * 3, nz = P.lodge.z + 5 + Math.sin(W.time * 0.8) * 3;
      o.x = damp(o.x, nx, 2, dt); o.z = damp(o.z, nz, 2, dt); o.y = gy(o.x, o.z); o.yaw = W.time * 0.8 + Math.PI / 2; o.speed = 3; o.mood = 'happy'; o.anim = {};
      return;
    }
    if (!Pip.following) { o.mood = Spots.iceWall.hp <= 0 ? 'happy' : 'scared'; o.anim = { sit: Spots.iceWall.hp > 0 }; o.y = gy(o.x, o.z); return; }
    // follow player, flying
    const tx = P1.x + Math.cos(W.time) * 3, tz = P1.z + Math.sin(W.time) * 3; const ty = Math.max(P1.y + 2, gy(o.x, o.z) + 1);
    const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz);
    const sp = Math.min(d * 2, 40);
    if (d > 0.5) { o.x += (dx / d) * sp * dt; o.z += (dz / d) * sp * dt; o.yaw = Math.atan2(dx, dz); }
    o.y = damp(o.y, ty, 3, dt); o.speed = sp; o.anim = { fly: true, flap: 1 }; o.mood = 'happy';
    if (dist2d(o, { x: P.lodge.x + 8, z: P.lodge.z + 3 }) < 12 && !Dialog.open) {
      Pip.following = false;
      Obj.complete('rescue', { xp: 60 }); Obj.remove('rescue2');
      Dialog.say(NPCs.get('sorrel'), ['Pip! Oh, you silly featherball!', 'Thank you, both of you. You’re braver than you know.'], () => { G.coins += 25; UI.toast('+25 coins', 'coin'); });
    }
  };
  // Ice wall breakable
  const IW = Spots.iceWall;
  Breakables.push({ x: IW.x, z: IW.z, y: IW.y, r: 4, h: 5, needs: 'any', broken: false, hit(dmg) {
    if (G.stage < 2) return;
    IW.hp--; FX.burst(IW.x, IW.y + 2.5, IW.z, 20, { speed: 6, life: 0.7, size: 0.5, color: 0xd6f2ff }); Audio.sfx('hit'); Cam.shake = 0.3;
    IW.mesh.scale.set(1 - (3 - IW.hp) * 0.08, 1 - (3 - IW.hp) * 0.12, 1);
    if (IW.hp <= 0) { this.broken = true; IW.col.enabled = false; W.scene.remove(IW.mesh); Audio.sfx('boom'); FX.burst(IW.x, IW.y + 2.5, IW.z, 60, { speed: 9, life: 1.2, size: 0.7, color: 0xd6f2ff, grav: 10 }); UI.toast('The ice wall shatters! Pip is free!', 'star'); Obj.remove('rescue1'); Obj.add('rescue2', 'Lead Pip home to the lodge', { target: () => ({ x: P.lodge.x + 8, z: P.lodge.z + 3 }) }); Pip.freed = true; setTimeout(() => { Pip.following = true; Sprites.emote(Pip.w, 'heart', 2); Audio.sfx('creature', { type: 'cloud', mood: 'happy', stage: 1 }); }, 800); }
  } });
}
Bus.on('frame', () => {
  if (Obj.has('rescue') && !Pip.imps && dist2d(P1, P.cave) < 40) {
    Pip.imps = true;
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; Enemies.spawn('imp', P.cave.x + Math.cos(a) * 9, P.cave.z + 6 + Math.sin(a) * 6, { group: 'imps', aggro: 18 }); }
    Enemies.group('imps', () => { UI.toast('The imps scatter! Now break the ice wall — hit it, or use ' + G.name + '’s ability.', 'star'); Comp.react('win'); });
    Obj.add('rescue1', 'Break the ice wall in the cave', { target: () => Spots.iceWall });
    UI.toast('Snow imps! They’re mischievous, not wicked — chase them off.', 'bang');
  }
});

// ───── Dragon's Nest ─────
const Nest = { ashka: null, cinder: null, active: false, carrying: false, hits: 0 };
function setupNest() {
  const en = Spots.elderNest;
  Nest.ashka = Wild.add({ type: 'ember', stage: 3, pal: { body: 0x5a3a4a, belly: 0xd8a070, wing: 0x8a4a3a, wingBone: 0x3a2028, dark: 0x2a1a20, mark: 0xffb347 }, x: en.x, y: en.y, z: en.z, yaw: 0, scale: 2.2, always: false });
  Nest.ashka.name = 'Ashka the Ancient';
  Nest.ashka.update = (o, dt) => { o.yaw = dampAngle(o.yaw, Math.atan2(P1.x - o.x, P1.z - o.z), 1, dt); o.anim = { sit: true, lookAt: new THREE.Vector3(P1.x, P1.y + 2, P1.z) }; o.mood = Nest.active ? 'sad' : 'idle'; if (Math.random() < dt * 0.4) FX.smoke(o.x + Math.sin(o.yaw) * 4, o.y + 7, o.z + Math.cos(o.yaw) * 4); };
  // other ancient dragons resting
  Spots.nests.slice(1, 4).forEach((n, i) => { const d = Wild.add({ type: 'ember', stage: 3, pal: [PALETTES.ember[0], { body: 0x6a3a2a, dark: 0x3a1a10 }, PALETTES.ember[2]][i], x: n.x, y: n.y, z: n.z, yaw: rand(0, TAU), scale: 1.5 }); d.update = (o, dt) => { o.anim = { sleep: Math.sin(W.time * 0.1 + i) > -0.3, lookAt: dist2d(o, P1) < 30 ? new THREE.Vector3(P1.x, P1.y + 1, P1.z) : null }; void dt; }; });
  addInteract({ id: 'ashka', x: en.x, z: en.z, r: 9, label: 'Speak with Ashka the Ancient', cond: () => G.stage >= 2, act: () => talkAshka() });
  // Cinder
  const cs = Spots.cinder;
  Nest.cinder = Wild.add({ type: 'ember', stage: 0, pal: { body: 0xb84a2a, mark: 0xffe08a }, x: cs.x, y: gy(cs.x, cs.z), z: cs.z, yaw: 0, mood: 'scared' });
  Nest.cinder.update = (o, dt) => {
    if (G.done.nestTrial) { const n = Spots.elderNest; o.x = n.x + 4; o.z = n.z + 2; o.y = n.y; o.mood = 'happy'; o.anim = { sit: true }; return; }
    if (Nest.carrying) {
      const tx = P1.x - Math.sin(P1.yaw) * 1.6, tz = P1.z - Math.cos(P1.yaw) * 1.6; const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz);
      if (d > 0.4) { const sp = Math.min(d * 3, 9); o.x += (dx / d) * sp * dt; o.z += (dz / d) * sp * dt; o.yaw = Math.atan2(dx, dz); o.speed = sp; } else o.speed = 0;
      o.y = Colliders.ground(o.x, o.z, o.y + 1); o.mood = 'happy'; o.anim = {};
      if (dist2d(o, Spots.elderNest) < 8) finishNest();
    } else {
      o.mood = 'scared'; o.anim = { sit: true }; o.y = Colliders.ground(o.x, o.z, o.y + 1);
      if (Nest.scaredT > 0) { Nest.scaredT -= dt; if (Nest.scaredT <= 0 && dist2d(o, P1) < 7 && Nest.active) { Nest.carrying = true; UI.toast('Cinder takes a brave little breath and follows you again.', 'heart'); Sprites.emote(o, 'heart', 1.5); } }
      else if (Nest.active && Math.random() < dt * 0.5) Sprites.emote(o, 'sweat', 1.2);
    }
  };
  addInteract({ id: 'cinder', x: cs.x, z: cs.z, r: 2.6, label: 'Comfort the frightened hatchling', follow: Nest.cinder, cond: () => Nest.active && !Nest.carrying, act: () => { Nest.carrying = true; P1.petT = 1.2; Audio.sfx('heart'); FX.hearts(Nest.cinder.x, Nest.cinder.y + 1, Nest.cinder.z); UI.toast('Cinder stops trembling and trots after you. Lead it home — mind the geysers!', 'heart'); } });
}
function talkAshka() {
  if (G.stage < 2) return;
  const a = { name: 'Ashka the Ancient' };
  if (G.done.nestTrial) return Dialog.say(a, ['Fly well, little flame-friends. My nest is always open to you.']);
  if (Nest.active) return Dialog.say(a, ['Cinder waits beyond the geysers. Go on foot — and be brave.']);
  Audio.sfx('roar');
  Dialog.say(a, [
    'Hrrmm. Humans, here? It has been… a long time since one of your kind stood in my nest.',
    'Your companion trusts you. I can smell it. But trust from a dragon must be earned.',
    'Cinder, the youngest of my clutch, wandered across the geyser field and is too frightened to come back.',
    { text: 'On foot, without wings to save you — cross the fire, calm the little one, and lead it home. Will you?', opts: [{ label: 'We’ll bring Cinder home', act: () => startNestTrial() }, { label: 'Give us a moment', act: () => {} }] },
  ]);
}
function startNestTrial() {
  Nest.active = true;
  if (P1.mode !== 'foot') dismount();
  Obj.add('nestTrial', () => (Nest.carrying ? 'Lead Cinder back to Ashka’s nest' : 'Cross the geyser field and find Cinder'), { target: () => (Nest.carrying ? Spots.elderNest : Spots.cinder) });
  Hints.show('geyser', 'Geysers glow and rumble before they erupt. Watch the red circles and dodge with Space!', 7);
}
function finishNest() {
  if (G.done.nestTrial) return;
  Nest.active = false; Nest.carrying = false;
  G.flags.kindled = true;
  Obj.complete('nestTrial', { xp: 70 });
  Audio.sfx('roar');
  FX.confetti(Spots.elderNest.x, Spots.elderNest.y + 6, Spots.elderNest.z, 60);
  Dialog.say({ name: 'Ashka the Ancient' }, [
    'You walked through fire for a hatchling not your own. That is courage, not foolishness.',
    'Come here, ' + G.name + '. Let an old dragon share a little of her flame.',
    { text: '', fn: () => { const c = Comp.C ? Comp : null; if (c) { for (let i = 0; i < 40; i++) FX.fire(c.x + rand(-2, 2), c.y + rand(0, 3), c.z + rand(-2, 2), 0, rand(1, 4), 0, 1.2); } Audio.sfx('fire'); }, then: () => {} },
  ].filter((l) => l.text !== ''), () => {
    UI.banner('Ashka’s Blessing', 2.8, G.name + '’s special ability is stronger and recharges faster.');
    Comp.react('win');
    setTimeout(() => offerAdultQuests(), 2500);
  });
}
const Geysers = {
  lavaCd: 0,
  update(dt) {
    if (!Spots.geysers) return;
    // lava pit: gentle bounce-out
    this.lavaCd -= dt;
    const dl = dist2d(P1, P.nest);
    if (dl < 21 && P1.y < 27.2 && this.lavaCd <= 0 && (P1.mode === 'foot' || P1.mode === 'ride')) {
      this.lavaCd = 0.8; const k = (dl || 1);
      P1.vx = ((P1.x - P.nest.x) / k) * 14; P1.vz = ((P1.z - P.nest.z) / k) * 14; P1.vy = 9; P1.onGround = false;
      playerTakeDamage(8, P.nest.x, P.nest.z, { kb: 0 }); FX.burst(P1.x, P1.y, P1.z, 16, { speed: 5, life: 0.5, size: 0.8, color: 0xffb347, add: true });
      if (!G.hints.lava) { G.hints.lava = 1; UI.toast('Hot hot hot! Stay out of the lava.', 'bang'); }
    }
    const near = dist2d(P1, P.nest) < 70;
    for (const g of Spots.geysers) {
      g.t -= dt;
      if (g.state === 0 && g.t <= 0) { g.state = 1; g.t = 1.3; if (near) { g.tele = Telegraphs.circle(g.x, g.z, 3.2, 1.3, 0xff7a2a, g.y); } }
      else if (g.state === 1) { if (near && Math.random() < dt * 20) FX.spawn({ x: g.x + rand(-1, 1), y: g.y + 0.5, z: g.z + rand(-1, 1), vy: 2, life: 0.5, size: 0.5, color: 0xffb347, add: true }); if (g.t <= 0) { g.state = 2; g.t = 1.1; if (near) { Audio.sfx('fire'); } } }
      else if (g.state === 2) {
        if (near) for (let i = 0; i < 4; i++) FX.fire(g.x + rand(-0.6, 0.6), g.y + 0.5, g.z + rand(-0.6, 0.6), rand(-1, 1), rand(10, 16), rand(-1, 1), 1.6);
        if (dist2d(P1, g) < 2.8 && P1.y < g.y + 8) { if (playerTakeDamage(14, g.x, g.z, { kb: 9 }) && Nest.carrying) { Nest.carrying = false; Nest.scaredT = 2.2; UI.toast('Cinder freezes in fright! Stay close — or press E to calm it.', 'sweat'); Sprites.emote(Nest.cinder, 'sweat', 2); } }
        if (g.t <= 0) { g.state = 0; g.t = rand(1.2, 3.2); }
      }
    }
  },
};

// ───── Mermaid Lagoon ─────
const Song = { order: [1, 2, 0, 1], input: [], playing: false };
function setupLagoon() {
  const Q = Spots.queen;
  const coralie = Mermaids.add({ x: Q.x, y: Q.y, z: Q.z, yaw: 0, sit: true, look: { hair: 0xf2c45a, tail: 0x7a5ad6, fin: 0xd6b4ff, crown: true }, scale: 1.7 });
  coralie.name = 'Queen Coralie';
  coralie.update = (o) => { o.yaw = Math.atan2(P1.x - o.x, P1.z - o.z); o.wave = dist2d(o, P1) < 10 && !G.flags.queenMet; };
  NPCs.byId.coralie = { id: 'coralie', name: 'Queen Coralie', x: Q.x, z: Q.z, root: coralie.M.root, talking: false, visible: true };
  addInteract({ id: 'talk_coralie', x: Q.x, z: Q.z, y: 0, yr: 5, r: 7, label: 'Talk to Queen Coralie', cond: () => true, act: () => talkQueen() });
  // Lyra — song keeper near the grotto
  const ly = Mermaids.add({ x: Spots.grotto.x + 6, y: -6, z: Spots.grotto.z - 5, yaw: 0, look: { hair: 0x4fd6c8, tail: 0xff7a8a, fin: 0xffc0c8 } });
  ly.name = 'Lyra';
  ly.update = (o, dt) => { o.t2 = (o.t2 || 0) + dt; o.x = Spots.grotto.x + 7 + Math.cos(o.t2 * 0.4) * 3; o.z = Spots.grotto.z - 4 + Math.sin(o.t2 * 0.4) * 3; o.y = gy(o.x, o.z) + 3; o.yaw = o.t2 * 0.4 + Math.PI; };
  addInteract({ id: 'talk_lyra', x: 0, z: 0, r: 4.5, yr: 9, label: 'Talk to Lyra', follow: ly, cond: () => G.flags.queenMet, act: () => talkLyra() });
  NPCs.byId.lyra = { id: 'lyra', name: 'Lyra', get x() { return ly.x; }, get z() { return ly.z; }, root: ly.M.root, visible: true };
  // Marina — swim guide
  const ma = Mermaids.add({ x: Spots.swimRings[0].x + 3, y: -3, z: Spots.swimRings[0].z, yaw: 0, look: { hair: 0xe2573a, tail: 0x3fc3b0, fin: 0x9cf0e0 } });
  ma.name = 'Marina'; Spots.marina = ma;
  ma.update = (o, dt) => {
    if (Rings.active && Rings.active.id === 'swim') { const c = Rings.active.current(); if (c) { const dx = c.x - o.x, dz = c.z - o.z, dy = c.y - o.y, d = Math.hypot(dx, dz, dy); const ahead = dist3d(P1, c) < 14 ? 1 : 0; const sp = ahead ? 5.5 : 1.0; if (d > 2) { o.x += (dx / d) * sp * dt; o.z += (dz / d) * sp * dt; o.y += (dy / d) * sp * dt; o.yaw = Math.atan2(dx, dz); } } return; }
    o.t2 = (o.t2 || 0) + dt; const hx = Spots.swimRings[0].x + 3, hz = Spots.swimRings[0].z; o.x = damp(o.x, hx + Math.cos(o.t2 * 0.6) * 2, 1, dt); o.z = damp(o.z, hz + Math.sin(o.t2 * 0.6) * 2, 1, dt); o.y = damp(o.y, -2.5, 1, dt); o.yaw = o.t2 * 0.6 + Math.PI / 2;
  };
  addInteract({ id: 'talk_marina', x: 0, z: 0, r: 4.5, yr: 6, label: 'Talk to Marina', follow: ma, cond: () => G.flags.queenMet && !(Rings.active && Rings.active.id === 'swim'), act: () => talkMarina() });
  NPCs.byId.marina = { id: 'marina', name: 'Marina', get x() { return ma.x; }, get z() { return ma.z; }, root: ma.M.root, visible: true };
  // ambient mermaids
  for (let i = 0; i < 4; i++) { const m = Mermaids.add({ x: P.lagoon.x, y: -5, z: P.lagoon.z, look: { hair: pick([0xd04a7a, 0x2a1a12, 0xf2c45a, 0x7ab8ff]), tail: pick([0x3fc3b0, 0x4fa3ff, 0xffa94d, 0xb985f0]) } }); m.update = (o, dt) => { o.t2 = (o.t2 || i * 1.5) + dt * 0.25; const r = 18 + i * 7; o.x = P.lagoon.x + Math.cos(o.t2 + i) * r; o.z = P.lagoon.z + Math.sin(o.t2 + i) * r; o.y = Math.max(gy(o.x, o.z) + 2, -3 - i * 1.5 + Math.sin(o.t2 * 3) * 1.5); o.yaw = o.t2 + i + Math.PI; }; }
  // clams
  Spots.clams.forEach((c) => addInteract({ id: 'clam' + c.i, x: c.x, z: c.z, y: c.y, r: 3.2, label: 'Sing to the clam', cond: () => G.flags.songKnown && Spots.gate.open < 0.1, act: () => pressClam(c) }));
  // bubble vents give breath
}
function talkQueen() {
  const q = { name: 'Queen Coralie' };
  if (G.stage < 2 && !G.flags.queenMet) return Dialog.say(q, ['Welcome, young ones. The lagoon is deep, and you are still small. Come back when you are grown.']);
  if (!G.flags.queenMet) {
    G.flags.queenMet = true; Obj.complete('lagoon', { silent: true });
    return Dialog.say(q, [
      'Surface-folk, and a ' + CREATURE_DEF[G.ctype].kind.toLowerCase() + '! Welcome to my lagoon.',
      'You seek the pirates’ chart? Yes — they hid something in our grotto. The doors have sealed shut ever since.',
      { text: 'First, take this: a Moon Pearl. While you carry it, you can breathe beneath the waves as easily as we do.', fn: () => { G.flags.pearl = true; UI.banner('Moon Pearl', 2.6, 'Breathe underwater. Q dives, Space rises.'); Audio.sfx('golden'); makeBubbleHelm(); } },
      'Swim with Marina, search for sunken treasure, and ask Lyra about the grotto’s song.',
    ], () => {
      Obj.add('swimm', 'Swim with Marina through the coral rings', { main: false, target: () => ({ x: Spots.marina.x, z: Spots.marina.z }) });
      Obj.add('sunken', () => 'Find the 3 sunken chests (' + (G.flags.sunk || 0) + '/3)', { main: false, target: () => { const i = [0, 1, 2].find((k) => !G.chests['sunk' + k]); return i === undefined ? null : Spots.lagoonChests[i]; } });
      Obj.add('song', 'Open the grotto — ask Lyra about its song', { target: () => ({ x: NPCs.byId.lyra.x, z: NPCs.byId.lyra.z }) });
    });
  }
  return Dialog.say(q, [G.done.song ? 'The Blackwake lies just beyond the lagoon’s mouth. Be careful, dear ones.' : 'The pearl will keep you breathing. Explore as long as you like.']);
}
function talkLyra() {
  const l = { name: 'Lyra' };
  if (G.done.song || Spots.gate.open > 0.5) return Dialog.say(l, ['The grotto sings again! Thank you.']);
  G.flags.songKnown = true;
  Dialog.say(l, ['The grotto doors open only to the old song. Three clams around the grotto each sing one note.', { text: 'Listen closely — I’ll sing it for you. Then sing it back to the clams, in the same order.', then: () => playSong() }, 'Swim to each clam and press E to make it sing. If you forget, ask me again!'], () => { Obj.remove('song'); Obj.add('song', 'Sing the grotto song on the clams (listen to Lyra)', { target: () => Spots.grotto, silent: true }); G.done.song = false; });
}
function playSong() {
  Song.playing = true; Song.input = [];
  Song.order.forEach((ci, k) => setTimeout(() => { const c = Spots.clams[ci]; Audio.sfx('clam', { n: c.note }); c.glowT = 0.8; FX.sparkle(c.x, c.y + 1.5, c.z, c.c, 20); if (k === Song.order.length - 1) Song.playing = false; }, 600 + k * 900));
}
function pressClam(c) {
  if (Song.playing) return;
  Audio.sfx('clam', { n: c.note }); c.glowT = 0.8; FX.sparkle(c.x, c.y + 1.5, c.z, c.c, 16);
  Song.input.push(c.i);
  const k = Song.input.length - 1;
  if (Song.order[k] !== c.i) { Song.input = []; setTimeout(() => { Audio.sfx('fail'); UI.toast('The clams fall silent. Start the song again from the beginning.', 'info'); }, 400); return; }
  if (Song.input.length === Song.order.length) {
    setTimeout(() => { Audio.sfx('discover'); UI.toast('The grotto doors grind open!', 'star'); Spots.gate.opening = true; Comp.react('discover'); Obj.remove('song'); Obj.add('song', 'Search the grotto', { target: () => Spots.grottoPrize, silent: true }); G.done.song = false; }, 600);
  }
}
function talkMarina() {
  const m = { name: 'Marina' };
  if (G.done.swimm) return Dialog.say(m, ['That was fun! You swim almost as well as a mermaid. Almost.']);
  Dialog.say(m, ['Hi! Want to race the coral rings with me? Follow me — and keep up!'], () => {
    if (!G.flags.pearl && !hasBreath()) { UI.toast('You’ll need to breathe underwater — talk to the Queen first.', 'info'); return; }
    const course = new RingCourse('swim', Spots.swimRings.map((p) => ({ x: p.x, y: p.y, z: p.z, r: 2.8 })), { color: 0x9ffff0 });
    course.start(); Rings.active = course;
    Rings.onDone = () => { Obj.complete('swimm', { xp: 30 }); Comp.react('win'); Dialog.say(m, ['Woohoo! You’re a natural! Here — a gift from the deep.'], () => { G.coins += 15; }); };
    Hints.show('dive', 'Q to dive, Space to rise. Follow Marina!', 6);
  });
}
function makeBubbleHelm() {
  if (P1.bubble) return;
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), new THREE.MeshBasicMaterial({ color: linColor(0xc8f8ff), transparent: true, opacity: 0.3, depthWrite: false }));
  m.position.y = 1.5; P1.root.add(m); P1.bubble = m; m.visible = false;
}

// ───── chapter 3: finale ─────
const Finale = { started: false, groups: {} };
function startFinaleHook() {
  if (G.done.captain || Obj.has('finale') || Finale.started) return;
  Obj.add('finale', 'Board the Blackwake, anchored beyond the lagoon', { target: () => Spots.mainDeck });
}
Bus.on('frame', () => {
  // warning shot gate before the finale
  const d = dist2d(P1, Ship);
  if (!Finale.started && d < 85 && !G.done.captain) {
    if (Obj.has('finale')) { startFinale(); }
    else if (!G.flags.warnShotT || W.time - G.flags.warnShotT > 12) {
      G.flags.warnShotT = W.time;
      const tx = P1.x + rand(-8, 8) + Math.sin(P1.yaw) * 10, tz = P1.z + rand(-8, 8) + Math.cos(P1.yaw) * 10;
      Audio.sfx('cannon'); setTimeout(() => { FX.splash(tx, 0, tz, 50); Audio.sfx('splash'); Cam.shake = 0.4; }, 900);
      UI.toast(G.stage < 3 ? 'A warning shot from the Blackwake! You’re not ready to face them yet.' : 'A warning shot! Find out what the pirates are hiding first — search the Mermaid Lagoon.', 'bang');
      P1.vx -= (Ship.x - P1.x) / d * 10; P1.vz -= (Ship.z - P1.z) / d * 10;
    }
  }
});
function startFinale() {
  Finale.started = true;
  Cannons.active = true;
  Audio.sfx('bell');
  UI.region('The Blackwake', 'Pirate galleon at anchor');
  Dialog.say({ name: 'Captain Grimtide' }, [{ who: 'Captain Grimtide', text: '(from the quarterdeck) “Riders! Fire everything! Nobody lays a finger on my fruit!”' }]);
  Obj.complete('finale', { xp: 0, silent: true });
  Obj.add('board', 'Board the Blackwake and defeat its crew', { target: () => Spots.mainDeck });
  // crew groups
  const g1 = [['deckhand', -2, -3], ['deckhand', 4, 3], ['gunner', 8, -4], ['deckhand', -8, 2]];
  g1.forEach(([k, lx, lz]) => { const p = shipLocal(lx, lz); Enemies.spawn(k, p.x, p.z, { y: Ship.deck, group: 'deck1', aggro: 16, stay: true }); });
  const g2 = [['brute', Ship.L - 6, 0], ['deckhand', Ship.L - 9, 3], ['gunner', Ship.L - 3, -3]];
  g2.forEach(([k, lx, lz], i) => { const p = shipLocal(lx, lz); Enemies.spawn(k, p.x, p.z, { y: Ship.fore, group: 'deck2', aggro: 14, stay: true, drop: i === 0 ? ['anchor'] : undefined }); });
  Enemies.group('deck1', () => { UI.toast('Main deck clear!', 'star'); Comp.react('win'); checkDecks(); });
  Enemies.group('deck2', () => { UI.toast('Forecastle clear!', 'star'); Comp.react('win'); checkDecks(); });
  Hints.show('ship', 'Approach by air or water. Climb the boarding nets on either side, or land right on the deck!', 7);
  // captain waits on quarterdeck (idle until approached)
  Boss.start(Spots.captainSpot.x, Spots.captainSpot.z, Ship.aft);
}
function checkDecks() {
  const g = Enemies.groups;
  if ((g.deck1 && g.deck1.alive > 0) || (g.deck2 && g.deck2.alive > 0)) return;
  Obj.complete('board', { xp: 0 });
  Obj.add('captain', 'Defeat Captain Grimtide on the quarterdeck', { target: () => Spots.captainSpot });
}
Bus.on('bossStart', () => {
  UI.bossBar(true);
  Dialog.say({ name: 'Captain Grimtide' }, [
    { who: 'Captain Grimtide', text: 'Well, well. An old rider and an old beast. I remember you two — tiny little things, back when I first raided Hearthvale.' },
    { who: 'Captain Grimtide', text: 'Look at you now. Shame I’ll have to sink you! Watch the red, if your old eyes can see it!' },
  ]);
  Hints.show('boss', 'Red zones show where attacks will land. When Grimtide charges, dodge aside — he’ll be winded after.', 7);
});
Bus.on('enemyDown', (e) => {
  if (e.kind !== 'captain') return;
  UI.bossBar(false);
  Cannons.active = false;
  Enemies.list.filter((o) => !o.dead && o.group && o.group.startsWith('bossadds')).forEach((o) => Enemies.kill(o));
  Obj.complete('captain', { xp: 0 });
  Obj.remove('board');
  Audio.sfx('stage');
  FX.confetti(e.x, e.y + 3, e.z, 80);
  setTimeout(() => {
    Dialog.say({ name: 'Captain Grimtide' }, [{ who: 'Captain Grimtide', text: 'Bested… by a pair of grey-whiskers. Fine. Take the fruit. Take the blasted ship!' }, { who: '', text: 'Grimtide leaps overboard and paddles furiously toward the horizon. The crew follow, splashing.' }], () => {
      Obj.add('treasure', 'Open the Blackwake’s treasure hold', { target: () => Spots.shipTreasure });
    });
  }, 1200);
});
function makeShipTreasure() {
  const st = Spots.shipTreasure;
  makeChest('blackwake', st.x, st.z, { coins: 60, fruit: true, xp: 0, text: 'The stolen Golden Fruit of a dozen islands — and a mountain of gold!', fn: () => {
    Obj.complete('treasure', { xp: 0 });
    setTimeout(() => Obj.add('home', 'Fly home to Hearthvale — to the Elder Tree', { target: () => ({ x: Spots.elderTree.x + 7, z: Spots.elderTree.z + 4 }) }), 1500);
  } }, { y: Ship.aft, cond: () => G.done.captain });
}
Bus.on('frame', () => { if (Obj.has('home') && dist2d(P1, Spots.elderTree) < 14 && !Ending.active && !Dialog.open) Ending.play(); });

// ───── ending ─────
const Ending = {
  active: false, extras: [],
  play() {
    this.active = true; G.mode = 'cutscene';
    Obj.complete('home', { xp: 0, silent: true });
    if (P1.mode !== 'foot' && P1.mode !== 'swim') dismount(true);
    const et = Spots.elderTree; const cx = et.x + 7, cz = et.z + 4; const y = gy(cx, cz);
    P1.x = cx; P1.z = cz; P1.y = y; P1.yaw = Math.atan2(et.x - cx, et.z - cz);
    Comp.x = cx + 2.8; Comp.z = cz + 0.5; Comp.y = gy(Comp.x, Comp.z); Comp.yaw = P1.yaw; Comp.air = false;
    // gather villagers in a ring
    const gather = NPCs.list.filter((n) => n.visible && dist2d(n, et) < 140);
    gather.forEach((n, i) => { const a = (i / gather.length) * Math.PI * 1.4 + 1.2; n.teleport(cx + Math.cos(a) * 9, cz + Math.sin(a) * 9, Math.atan2(cx - (cx + Math.cos(a) * 9), cz - (cz + Math.sin(a) * 9))); n.path = null; n.o.custom = null; n.anim = { celebrate: true }; });
    // a new child meets a hatchling — mirror of the beginning
    const kid = buildHuman({ age: 0, skin: 0xf1c6a0, hair: 0x7a4a2a, hairStyle: 'spiky', top: 0x5b8fd6, bottom: 0x8a6a4a, accent: 0xf2c45a, blush: true });
    const kidRoot = new THREE.Group(); kidRoot.add(kid.root); kidRoot.position.set(cx - 3, gy(cx - 3, cz + 3), cz + 3); W.scene.add(kidRoot);
    const hatch = buildCreature(G.ctype, 0, PALETTES[G.ctype][(G.palette + 1) % 3]); hatch.root.position.set(cx - 1.6, gy(cx - 1.6, cz + 3.6), cz + 3.6); W.scene.add(hatch.root);
    this.extras = [{ kid, kidRoot, hatch }];
    const lines = [
      'Hearthvale gathers beneath the Elder Tree, lanterns glowing in the dusk.',
      'Once, you were a child who could barely see over the nursery fence — and ' + G.name + ' was a hatchling who fit in your arms.',
      'Together you learned to ride, to glide, to fly. You crossed the Frostpeak winds, walked through dragon-fire, swam with mermaids, and sent the Blackwake sailing.',
      'Now a new child stands where you once stood, giggling as a tiny ' + CREATURE_DEF[G.ctype].name + ' licks their nose.',
      G.name + ' leans against you, warm and old and happy. The whole sky still waits — and you have all the time in the world.',
    ];
    UI.fade(true, '', false, 0.8);
    setTimeout(() => {
      UI.fade(false);
      setSkyTime(0.85);
      Audio.sfx('bell');
      let i = 0;
      const shots = [
        { pos: () => new THREE.Vector3(cx + 14, y + 10, cz + 14), look: new THREE.Vector3(et.x, y + 6, et.z) },
        { pos: () => new THREE.Vector3(cx + 4, y + 2.4, cz + 6), look: new THREE.Vector3(cx + 1, y + 1.4, cz) },
        { pos: (t) => new THREE.Vector3(cx + Math.cos(t * 0.2) * 18, y + 9, cz + Math.sin(t * 0.2) * 18), look: new THREE.Vector3(cx, y + 2, cz) },
        { pos: () => new THREE.Vector3(cx - 2, y + 2.2, cz + 8), look: new THREE.Vector3(cx - 2.2, y + 0.8, cz + 3.3) },
        { pos: (t) => new THREE.Vector3(cx + 6 + t * 0.4, y + 3 + t * 0.6, cz + 9 + t * 0.3), look: new THREE.Vector3(cx + 1.4, y + 1.6, cz) },
      ];
      const next = () => {
        if (i >= lines.length) return this.finish();
        Cam.override = Object.assign({ dur: 2 }, shots[i]);
        if (i === 2) { for (let k = 0; k < 6; k++) setTimeout(() => Fireworks.launch(cx + rand(-30, 30), y + 30, cz + rand(-30, 30)), k * 700); }
        UI.story(lines[i], () => { i++; next(); });
      };
      next();
    }, 1200);
  },
  update(dt) {
    for (const e of this.extras) {
      animateHuman(e.kid, { speed: 0, mode: 'walk', pet: Math.sin(W.time * 0.8) > 0 ? 1 : 0, celebrate: Math.sin(W.time * 0.8) <= 0 }, dt);
      e.kidRoot.rotation.y = Math.atan2((e.hatch.root.position.x - e.kidRoot.position.x), (e.hatch.root.position.z - e.kidRoot.position.z));
      e.hatch.root.rotation.y = Math.atan2(e.kidRoot.position.x - e.hatch.root.position.x, e.kidRoot.position.z - e.hatch.root.position.z);
      animateCreature(e.hatch, { speed: 0, mood: 'happy', hop: Math.max(0, Math.sin(W.time * 6)) * 0.2 }, dt);
    }
    if (this.active) { Comp.celebrateT = Math.max(Comp.celebrateT, 0.5); if (Math.random() < dt * 2) FX.petal(Spots.elderTree.x, gy(Spots.elderTree.x, Spots.elderTree.z) + 12, Spots.elderTree.z); }
  },
  finish() {
    Cam.override = null;
    G.endingSeen = true;
    UI.credits(() => {
      this.active = false; G.mode = 'play';
      NPCs.list.forEach((n) => { n.anim = {}; });
      Obj.add('explore', () => 'Keep exploring: treasure ' + Chests.filter((c) => c.opened).length + '/' + Chests.length + ', Golden Fruit shared: ' + G.fruit, { main: false, silent: true });
      UI.toast('The adventure continues! Explore freely — there’s still treasure out there.', 'star');
      saveGame(true);
    });
  },
};
const Fireworks = {
  launch(x, y, z) {
    const col = pick([0xff6a9a, 0xffd34d, 0x8fd3ff, 0xb985f0, 0x9fffc8]);
    Audio.sfx('whoosh');
    for (let i = 0; i < 16; i++) FX.spawn({ x, y: y - 22 + i * 1.4, z, life: 0.3 + i * 0.04, size: 0.4, color: 0xfff2a8, add: true });
    setTimeout(() => { Audio.sfx('boom'); FX.burst(x, y, z, 70, { speed: 12, life: 1.6, size: 0.7, size1: 0.1, color: col, add: true, grav: 4, drag: 1.2 }); }, 700);
  },
};

// ───── ring posts and optional sky courses ─────
function buildRingPost(x, z, col) {
  const y = gy(x, z);
  Batch.add(place([part(cyl(0.3, 0.4, 3.4, 6), 0x7a5634, { y: 1.7 }), part(tor(0.8, 0.14, 6, 14), col, { y: 3.9 }), part(cyl(0.7, 0.9, 0.3, 8), 0x8a7f74, { y: 0.15 })], x, y, z));
  W.glows.push({ x, y: y + 3.9, z, s: 3, c: col });
  Colliders.addCircle(x, z, 0.5, y + 4.5);
}
const Rings = {
  active: null, onDone: null, onFail: null,
  update(dt) {
    if (!this.active) return;
    const r = this.active.update(dt, { x: P1.x, y: P1.y + (P1.mode === 'foot' ? 1 : Comp.C ? Comp.C.seatY * 0.6 : 1), z: P1.z });
    if (this.active && this.active.limit) UI.timer(this.active.timer); else UI.timer(null);
    if (r === 'ring') { G.stats.rings++; Comp.setMood('happy', 0.8); }
    if (r === 'done') { G.stats.rings++; const f = this.onDone; this.active = null; this.onDone = this.onFail = null; UI.timer(null); Audio.sfx('quest'); if (f) f(); }
    if (r === 'fail') { const f = this.onFail; this.active = null; this.onDone = this.onFail = null; UI.timer(null); Audio.sfx('fail'); if (f) f(); }
  },
};
function setupOptionalCourses() {
  const courses = [
    { id: 'coast', name: 'Coastline Sky Run', post: { x: -100, z: 230 }, pts: () => Spots.coastRings, stage: 2, color: 0xffd34d, limit: 40, bonus: 4, reward: { coins: 30, xp: 20 } },
    { id: 'stacks', name: 'Sea Stack Slalom', post: { x: 260, z: 140 }, pts: () => Spots.stackRings.concat([{ x: 270, z: -100, y: 30 }]), stage: 2, color: 0x8fd3ff, limit: 34, bonus: 6, reward: { coins: 30, xp: 20 } },
    { id: 'mills', name: 'Windmill Loop', post: { x: 56, z: -30 }, pts: () => [{ x: Spots.windmillA.x, z: Spots.windmillA.z - 8, y: 14 }, { x: 40, z: -70, y: 20 }, { x: -20, z: -70, y: 24 }, { x: Spots.windmillB.x - 8, z: Spots.windmillB.z, y: 16 }, { x: -60, z: 50, y: 22 }, { x: 0, z: 70, y: 18 }, { x: 50, z: 40, y: 16 }, { x: 60, z: -10, y: 12 }], stage: 2, color: 0xf49ac1, limit: 0, reward: { coins: 20, xp: 15 } },
  ];
  for (const c of courses) {
    const py = gy(c.post.x, c.post.z);
    if (py < 1) { c.post.x += 8; }
    buildRingPost(c.post.x, c.post.z, c.color);
    addLandmark('post_' + c.id, c.name, c.post.x, c.post.z, 8);
    addInteract({ id: 'post_' + c.id, x: c.post.x, z: c.post.z, r: 3.4, label: () => 'Start the ' + c.name + (G.done['opt_' + c.id] ? ' (again)' : ''), cond: () => G.stage >= c.stage && !Rings.active, act: () => {
      if (P1.mode === 'foot' || P1.mode === 'swim') { UI.toast('Climb onto ' + G.name + ' first, then take off!', 'info'); return; }
      const course = new RingCourse(c.id, c.pts().map((p) => ({ x: p.x, y: p.y, z: p.z, r: 4 })), { color: c.color, limit: c.limit, bonus: c.bonus, r: 4 });
      course.start(); Rings.active = course;
      Rings.onDone = () => { const first = !G.done['opt_' + c.id]; G.done['opt_' + c.id] = true; G.coins += first ? c.reward.coins : 5; if (first) gainXP(c.reward.xp, 'Sky run'); UI.toast(c.name + ' complete!' + (first ? ' +' + c.reward.coins + ' coins' : ''), 'star'); Comp.react('win'); };
      Rings.onFail = () => UI.toast('Out of time! Try again from the post.', 'info');
    } });
  }
  // stage-1 glide hop near beach cliffs for fun
}

// beach digs
function setupDigs() {
  for (const d of Spots.digs) {
    const y = Math.max(0.2, gy(d.x, d.z));
    addInteract({ id: 'dig' + d.i, x: d.x, z: d.z, y, r: 2.6, label: 'Dig here', cond: () => !G.digs[d.i] && Comp.sensed['dig' + d.i] && G.stage >= 1, act: () => {
      G.digs[d.i] = true; FX.dust(d.x, y, d.z, 16, 0xf0d79c); Audio.sfx('step', { v: 3 }); Comp.strikeT = 0.35;
      setTimeout(() => { const roll = d.i % 3; if (roll === 0) { for (let i = 0; i < 8; i++) Pickups.spawn('coin', d.x, y + 0.6, d.z); } else if (roll === 1) { for (let i = 0; i < 5; i++) Pickups.spawn('coin', d.x, y + 0.6, d.z); Pickups.spawn('heart', d.x, y + 0.6, d.z); } else { for (let i = 0; i < 12; i++) Pickups.spawn('coin', d.x, y + 0.6, d.z); } Comp.react('treasure'); gainXP(5, 'Dig'); }, 300);
    } });
  }
}

// beach NPCs
function setupBeachNPCs() {
  NPCs.add({ id: 'marlo', name: 'Marlo', x: Spots.raceStart.x + 3, z: Spots.raceStart.z - 3, yaw: Math.PI, look: { age: 2, skin: 0xa8754e, hair: 0x1a1a1a, top: 0xe2573a, bottom: 0xf7c548, accent: 0xffffff, hat: 'straw' }, pet: { type: 'moon', stage: 2, pal: PALETTES.moon[2] }, lines: ['Sun, sand, and speed!'] });
  NPCs.add({ id: 'juniper', name: 'Juniper', x: Spots.sandcastle.x + 2.5, z: Spots.sandcastle.z + 2, yaw: -2.4, look: { age: 0, skin: 0xf6d3b5, hair: 0xe0a040, hairStyle: 'buns', top: 0x7ab8ff, bottom: 0xf2779a, accent: 0xf7c548, blush: true }, mode: 'sit', lines: ['La la la, sandcastles!'] });
  for (const id of ['marlo', 'juniper']) { const n = NPCs.get(id); addInteract({ id: 'talk_' + id, x: 0, z: 0, r: 2.8, label: () => 'Talk to ' + n.name, follow: n, cond: () => true, act: () => talkTo(n) }); }
  // beach-goers
  for (let i = 0; i < 4; i++) { const x = rand(-40, 120), z = rand(214, 228); NPCs.add({ id: 'beach' + i, name: '', x, z, look: { age: pick([1, 2, 2, 3]), skin: pick([0xf1c6a0, 0xd9a37a, 0xa8754e]), hair: pick([0x2a1a12, 0xe0c070, 0x9a3a1a]), top: pick([0xf2779a, 0x7ab8ff, 0xf7c548, 0x6fae4f]), bottom: pick([0x5b8fd6, 0xe8e0d0]), accent: 0xffffff, hat: pick(['straw', null]) }, path: [[x, z], [x + rand(-15, 15), z + rand(-4, 4)]], lines: [pick(['Perfect day for a swim!', 'Did you see the mermaid? I swear!', 'Mind the crabs!'])] }); }
}

// ───── Director: keeps objectives consistent (and rebuilds after load) ─────
function director() {
  if (!G.ctype) return;
  const s = G.stage;
  if (s === 0) {
    if (!G.done.tour) Obj.add('tour', () => 'Show ' + G.name + ' around Hearthvale (' + ['plaza', 'elder', 'bridge', 'windmill'].filter((k) => G.landmarks[k]).length + '/4 places)', { target: () => { const L = Landmarks.find((l) => ['plaza', 'elder', 'bridge', 'windmill'].includes(l.id) && !G.landmarks[l.id]); return L ? { x: L.x, z: L.z } : null; }, xp: 10, silent: true });
    if (!G.done.crows2 && !Obj.has('crows2')) Obj.add('crows', 'Help Farmer Hob with the crows', { target: () => ({ x: Spots.farm.x + 11, z: Spots.farm.z - 2 }), silent: true });
    if (!G.done.hide2 && !Obj.has('hide2')) Obj.add('hide', 'Play hide-and-seek with Tilly', { main: false, target: () => { const t = NPCs.get('tilly'); return { x: t.x, z: t.z }; }, silent: true });
    if (!G.done.train2 && !Obj.has('train2')) Obj.add('train', 'Train with Captain Rowan at the yard', { target: () => ({ x: Spots.yard.x - 5, z: Spots.yard.z + 5 }), silent: true });
  }
  if (s >= 1) {
    if (!G.done.ride && !Obj.has('ride2')) Obj.add('ride', 'Find Captain Rowan for a riding lesson', { target: () => ({ x: Spots.yard.x - 5, z: Spots.yard.z + 5 }), silent: true });
    if (G.done.ride && !G.done.glide) { G.flags.glideStarted = Rings.active && Rings.active.id === 'glide'; Obj.add('glide', 'Glide from the top of Lookout Hill', { target: () => ({ x: Spots.lookout.x, z: Spots.lookout.z }), silent: true }); }
    if (G.done.glide && !G.done.beach) Obj.add('beach', 'Ride south to Sunspill Beach', { target: () => ({ x: 60, z: 222 }), silent: true });
    if (G.done.beach && !G.done.clue1) Obj.add('clue1', 'Search the Wreck of the Merry Gull', { target: () => Spots.wreckChest, silent: true });
    if (G.done.clue1 && !G.done.clue2) Obj.add('clue2', 'Find the hidden cove east of the beach', { target: () => P.cove, silent: true });
    if (G.done.clue2 && !G.done.clue3) { if (!Rings.active) G.flags.campStarted = Enemies.groups.camp ? G.flags.campStarted : false; Obj.add('clue3', 'Investigate Smugglers’ Rocks', { target: () => P.camp, silent: true }); }
    if (G.done.beach && !G.done.race) Obj.add('race', 'Race Marlo along the beach', { main: false, target: () => ({ x: NPCs.get('marlo').x, z: NPCs.get('marlo').z }), silent: true });
    if (G.done.beach && !G.done.shells && !Obj.has('shells2')) Obj.add('shells', 'Help Juniper decorate her sandcastle', { main: false, target: () => ({ x: Spots.sandcastle.x + 2, z: Spots.sandcastle.z + 2 }), silent: true });
  }
  if (s >= 2) {
    if (!G.done.firstflight) Obj.add('firstflight', 'Talk to Captain Rowan about flying', { target: () => ({ x: Spots.yard.x - 5, z: Spots.yard.z + 5 }), silent: true });
    if (G.done.firstflight && !G.done.frost) Obj.add('frost', 'Fly north to Frostpeak Lodge', { target: () => ({ x: P.lodge.x + 9, z: P.lodge.z }), silent: true });
    if (G.done.frost && G.flags.sorrelMet) {
      if (!G.done.rescue && !Obj.has('rescue1') && !Obj.has('rescue2')) Obj.add('rescue', 'Rescue Pip from Glimmerfrost Cave', { target: () => P.cave, silent: true });
      if (!G.done.arches) Obj.add('arches', 'Fly the Arch Run (start at the ring post by the lodge)', { target: () => Spots.archPost, silent: true });
    }
    if (G.done.frost && !G.flags.sorrelMet && !Obj.has('frost')) Obj.add('sorrel', 'Talk to Ranger Sorrel at the lodge', { target: () => ({ x: P.lodge.x + 8, z: P.lodge.z + 3 }), silent: true });
    if (G.flags.sorrelMet) Obj.remove('sorrel');
    if (G.done.rescue && G.done.arches) {
      if (!G.done.nestTrial && !Obj.has('nestTrial')) { if (!G.done.nest) Obj.add('nest', 'Seek the Dragon’s Nest in the eastern volcano', { target: () => Spots.nestGate, silent: true }); else Obj.add('nest2', 'Speak with Ashka the Ancient in the Dragon’s Nest', { target: () => Spots.elderNest, silent: true }); }
      if (Obj.has('nestTrial') || G.done.nestTrial) Obj.remove('nest2');
      if (!G.done.song) {
        if (!G.flags.queenMet) Obj.add('lagoon', 'Visit the Mermaid Lagoon in the southwest', { target: () => ({ x: Spots.queen.x, z: Spots.queen.z }), silent: true });
        else if (!Obj.has('song')) Obj.add('song', G.flags.songKnown ? 'Sing the grotto song on the clams (listen to Lyra)' : 'Open the grotto — ask Lyra about its song', { target: () => (Spots.gate.open > 0.5 ? Spots.grottoPrize : G.flags.songKnown ? Spots.grotto : { x: NPCs.byId.lyra.x, z: NPCs.byId.lyra.z }), silent: true });
      }
      if (G.flags.queenMet && !G.done.swimm) Obj.add('swimm', 'Swim with Marina through the coral rings', { main: false, target: () => ({ x: Spots.marina.x, z: Spots.marina.z }), silent: true });
      if (G.flags.queenMet && !G.done.sunken) Obj.add('sunken', () => 'Find the 3 sunken chests (' + (G.flags.sunk || 0) + '/3)', { main: false, target: () => { const i = [0, 1, 2].find((k) => !G.chests['sunk' + k]); return i === undefined ? null : Spots.lagoonChests[i]; }, silent: true });
    }
  }
  if (s >= 3) {
    if (G.done.song && !G.done.captain && !Finale.started) startFinaleHook();
    if (G.done.captain && !G.done.treasure && !Obj.has('treasure')) Obj.add('treasure', 'Open the Blackwake’s treasure hold', { target: () => Spots.shipTreasure, silent: true });
    if (G.done.treasure && !G.endingSeen && !Obj.has('home') && !Ending.active) Obj.add('home', 'Fly home to Hearthvale — to the Elder Tree', { target: () => ({ x: Spots.elderTree.x + 7, z: Spots.elderTree.z + 4 }), silent: true });
    if (G.endingSeen) Obj.add('explore', () => 'Keep exploring: treasure ' + Chests.filter((c) => c.opened).length + '/' + Chests.length + ', Golden Fruit shared: ' + G.fruit, { main: false, silent: true });
  }
  if (s < 3 && G.xp >= XP_NEED[s]) Obj.add('grow' + s, () => G.name + ' is ready to grow — visit the Elder Tree', { target: () => ({ x: Spots.elderTree.x + 6, z: Spots.elderTree.z + 2 }), silent: true });
}
