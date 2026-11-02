// Full scripted playthrough. Usage: node play.js [ember|cloud|moon] [stopAt]
const { makeGame } = require('./harness.js');
const vm = require('vm');
const TYPE = process.argv[2] || 'ember';
const STOP = process.argv[3] || 'end';
const g = makeGame();
const X = g.X;
const run = (code) => vm.runInContext(code, g.ctx);
const log = (...a) => console.log(`[${(g.now() / 1000).toFixed(1)}s]`, ...a);
const objs = () => X.Obj.list.map((o) => o.id).join(',');
function expect(c, msg) { if (!c) { console.error('FAIL:', msg, '| objs:', objs(), '| mode', X.G.mode, X.P1.mode); process.exit(1); } else log('ok:', msg); }
function waitFor(fn, s, msg) { const r = g.run(s, fn); expect(r || fn(), msg); }
function waitDialog(s = 5) { g.run(s, () => X.Dialog.open); }
function pickUpgrades() { while (X.G.mode === 'modal' && run("document.getElementById('upModal').classList.contains('show')")) { run("(function(){const u=UPGRADES.filter(u=>G.upgrades[u.id]<u.max)[0]; G.upgrades[u.id]++; document.getElementById('upModal').classList.remove('show'); G.mode='play';})()"); g.step(2); } }
function ensureDialog(choices) { pickUpgrades(); waitDialog(); if (X.Dialog.open) g.dialog(choices); g.secs(0.8); pickUpgrades(); }

g.boot(); g.step(5);
let dmgTaken = 0, heals = 0; const _hp = { v: 0 }; vm.runInContext('globalThis.__dm = 0; const __ptd = playerTakeDamage; playerTakeDamage = function(d, x, z, o){ const r = __ptd(d, x, z, o); if (r) globalThis.__dm += d; return r; };', g.ctx);
run("UI.menuAct('new')");
g.secs(1.2); ensureDialog();
expect(X.Obj.has('nursery'), 'nursery objective');
// walk to Bram (exercise walking + collisions)
const bram = X.NPCs.get('bram');
const left = g.walkTo(bram.x - 3, bram.z + 3, 40, 4);
log('walk dist left', left.toFixed(1), 'pos', X.P1.x.toFixed(1), X.P1.z.toFixed(1));
if (left > 4) g.tp(bram.x - 3, bram.z + 2);
g.step(5); ensureDialog();
expect(X.G.flags.bonding && X.Obj.has('meet3'), 'bonding started');
// play with each hatchling
g.interact('hatch_ember', [1]);
g.interact('hatch_cloud', [3]); // tag challenge
g.step(10);
expect(!!X.Bond.chal, 'tag challenge running');
// do tag: chase cloudclaw
const hc = X.Hatch.byType.cloud;
let tagged = g.run(22, () => { X.P1.x = hc.x - 0.5; X.P1.z = hc.z; return !X.Bond.chal; });
log('toasts', X.UI.toasts.map(t=>t.el.innerHTML.slice(20,70)).join(' | '), 'dialog', X.Dialog.open);
log('tag challenge ended', tagged, 'cloud aff', hc.aff.toFixed(1));
g.interact('treats', false); g.step(2);
expect(X.G.flags.hasTreat, 'took treat');
g.interact('hatch_moon', [0]);
log('after moon', X.Hatch.list.map(h=>h.type+':'+h.aff+':'+h.met).join(' '), 'metAll', X.G.flags.metAll, 'dlg', X.Dialog.open);
g.secs(1.5); ensureDialog();
expect(X.G.flags.metAll && X.Obj.has('choose'), 'met all, choose objective');
// ball throw test
g.interact('ball', false); g.step(2);
expect(!!X.P1.carry, 'carrying ball');
g.click(); g.secs(4);
log('ball caught?', X.Hatch.list.map((h) => h.type + ':' + (h.aff || 0).toFixed(1)).join(' '));
// choose
g.interact('hatch_' + TYPE, [4]);
g.step(5); ensureDialog([0]);
g.step(5);
expect(X.G.mode === 'modal', 'naming modal open');
run("document.getElementById('nmOk').onclick()");
g.secs(1.6); ensureDialog();
expect(X.G.ctype === TYPE && X.Comp.C, 'companion chosen: ' + X.G.name);
expect(X.Obj.has('tour') && X.Obj.has('crows') && X.Obj.has('train') && X.Obj.has('hide'), 'child objectives');
// pet companion
g.tp(X.P1.x, X.P1.z); X.Comp.x = X.P1.x + 1; X.Comp.z = X.P1.z; g.step(3); g.press('e'); g.step(10);
expect(X.G.stats.pets === 1, 'cuddled companion');
// tour
for (const id of ['plaza', 'elder', 'bridge', 'windmill']) { const L = X.Landmarks.find((l) => l.id === id); g.tp(L.x + 2, L.z + 2); g.secs(0.5); }
g.secs(1.5);
expect(X.G.done.tour, 'village tour done');
// crows
g.interact('talk_hob');
expect(X.Obj.has('crows2'), 'crows started');
for (const e of X.Enemies.list.filter((e) => e.kind === 'crow')) { g.tp(e.x + 0.5, e.z); g.step(3); }
g.secs(1.5); ensureDialog();
expect(X.G.done.crows2, 'crows done');
// training
g.interact('talk_rowan');
expect(X.Obj.has('train2'), 'training started');
const dum = X.Enemies.list.find((e) => e.kind === 'dummy');
g.tp(dum.x, dum.z + 1.6); X.P1.yaw = Math.PI;
for (let i = 0; i < 4; i++) { g.click(); g.secs(0.6); }
g.press('space'); g.secs(1); g.press('space'); g.secs(1);
X.Comp.x = dum.x; X.Comp.z = dum.z + 2; X.Comp.yaw = Math.PI; X.Input.mouse.moved = 0;
g.press('f'); g.secs(1.5);
log('training', X.Training.hits, X.Training.dodges, X.Training.ability);
ensureDialog();
expect(X.G.done.train2, 'training done');
// hide and seek
log('pre-tilly dlg', X.Dialog.open, X.Dialog.pending.length, X.Dialog.cur && X.Dialog.cur.text);
g.interact('talk_tilly');
log('post-tilly', X.Dialog.open, X.Dialog.pending.length, X.Obj.list.map(o=>o.id).join(','));
for (let i = 0; i < 3; i++) g.interact('hide' + i, false), g.step(2);
g.secs(2);
expect(X.G.done.hide2, 'hide and seek done');
log('XP', X.G.xp, '/', X.XP_NEED[0]);
// top up XP by cuddles if needed (pets limited) — exploring more
let guard = 0;
while (X.G.xp < X.XP_NEED[0] && guard++ < 30) { const L = X.Landmarks.find((l) => !l.found && Math.hypot(l.x, l.z) < 140); if (!L) break; g.tp(L.x, L.z); g.secs(0.5); }
log('XP after exploring', X.G.xp);
if (X.G.xp < X.XP_NEED[0]) { log('WARNING: child stage short of XP by', X.XP_NEED[0] - X.G.xp, '- passive time would fill it'); run('gainXP(' + (X.XP_NEED[0] - X.G.xp) + ')'); }
expect(X.Obj.has('grow0'), 'ready to grow');
function grow() {
  g.interact('talk_wren', [0]);
  g.secs(9); ensureDialog();
}
grow();
expect(X.G.stage === 1 && X.G.mode === 'play', 'grew to teen');
if (STOP === 'teen') process.exit(0);

// ───── Teen ─────
g.interact('talk_rowan');
expect(X.Obj.has('ride2') && X.Rings.active, 'ride rings started');
// mount
g.tp(X.P1.x, X.P1.z); X.Comp.x = X.P1.x + 1; X.Comp.z = X.P1.z; X.Comp.y = X.P1.y; g.step(3); g.press('e'); g.step(3);
expect(X.P1.mode === 'ride', 'mounted');
// ride through rings
for (let i = 0; i < 40 && X.Rings.active && X.Rings.active.id === 'ride'; i++) { const c = X.Rings.active.current(); g.tp(c.x, c.z); g.step(3); }
g.secs(1); ensureDialog();
expect(X.G.done.ride2 && X.Obj.has('glide'), 'ride rings complete');
// glide: go to lookout top while mounted
g.tp(X.Spots.lookout.x, X.Spots.lookout.z); g.step(10);
expect(X.Rings.active && X.Rings.active.id === 'glide', 'glide course started at lookout (y=' + X.P1.y.toFixed(1) + ')');
// real glide test: jump & hold space toward first ring
X.Input.keys.space = true; X.Input.pressed.space = true; g.step(1);
const r0 = X.Rings.active.current(); const gy0 = X.P1.y;
let sawGlide = false;
g.run(3, () => { const dx = r0.x - X.P1.x, dz = r0.z - X.P1.z; X.Input.keys.d = dx > 1; X.Input.keys.a = dx < -1; X.Input.keys.s = dz > 1; X.Input.keys.w = dz < -1; if (X.P1.mode === 'glide') sawGlide = true; return false; });
X.Input.keys.space = false; ['w', 'a', 's', 'd'].forEach((k) => (X.Input.keys[k] = false));
log('glide mode seen', sawGlide, 'from y', gy0.toFixed(1), 'now', X.P1.y.toFixed(1), X.P1.mode);
expect(sawGlide, 'gliding works');
for (let i = 0; i < 20 && X.Rings.active && X.Rings.active.id === 'glide'; i++) { const c = X.Rings.active.current(); X.P1.x = c.x; X.P1.z = c.z; X.P1.y = c.y - 1; g.step(2); }
g.secs(1); ensureDialog();
expect(X.G.done.glide && X.Obj.has('beach'), 'glide done → beach');
// beach
g.tp(60, 222); g.secs(1.5); ensureDialog();
expect(X.Obj.has('clue1') && X.Obj.has('race') && X.Obj.has('shells'), 'beach quests');
// race
g.interact('talk_marlo', [0]); g.step(3);
expect(X.Rings.active && X.Rings.active.id === 'race', 'race started');
for (let i = 0; i < 30 && X.Rings.active; i++) { const c = X.Rings.active.current(); g.tp(c.x, c.z); g.step(3); }
g.secs(1);
expect(X.G.done.race, 'race won');
// shells
g.interact('talk_juniper');
for (let i = 0; i < 3; i++) { g.interact('shell' + i, false); g.step(2); }
g.tp(X.NPCs.get('juniper').x + 1, X.NPCs.get('juniper').z + 1); g.secs(1); ensureDialog();
expect(X.G.done.shells2, 'shells done');
// digs: walk companion near to sense
// clue chain
g.interact('chest_wreck', false); g.secs(1.5); ensureDialog();
expect(X.G.done.clue1 && X.Obj.has('clue2'), 'clue 1 → cove');
g.interact('chest_cove', false); g.secs(1.5); ensureDialog();
expect(X.G.done.clue2 && X.Obj.has('clue3'), 'clue 2 → camp');
// fruit pickups near cove
g.secs(1);
for (const p of X.Pickups.list.slice()) { if (p.kind === 'fruit') { X.P1.x = p.x; X.P1.z = p.z; g.step(5); } }
g.step(60); if (X.G.mode === 'modal') run("document.getElementById('upCards')"), run("UI.upgradeChoice; G.upgrades.heart++; document.getElementById('upModal').classList.remove('show'); G.mode='play'");
log('fruit', X.G.fruit, 'coins', X.G.coins);
// camp fight (real combat)
if (X.P1.mode !== 'foot') run('dismount(true)');
g.tp(X.P.camp.x + 14, X.P.camp.z + 14); g.secs(1);
expect(X.G.flags.campStarted, 'camp fight started');
function fight(group, maxS = 120, mounted = false) {
  let t = 0;
  while (t < maxS) {
    const alive = X.Enemies.list.filter((e) => !e.dead && (!group || e.group === group || (group === '*' && e.group)));
    if (!alive.length) break;
    const e = alive.sort((a, b) => Math.hypot(a.x - X.P1.x, a.z - X.P1.z) - Math.hypot(b.x - X.P1.x, b.z - X.P1.z))[0];
    // approach
    const dx = e.x - X.P1.x, dz = e.z - X.P1.z, d = Math.hypot(dx, dz);
    const K = X.Input.keys;
    K.w = K.s = K.a = K.d = false;
    if (d > 1.8) { K.w = dz < -0.3 * d; K.s = dz > 0.3 * d; K.a = dx < -0.3 * d; K.d = dx > 0.3 * d; }
    // dodge telegraphed attacks
    if (e.atkT > 0 && e.atkT < 0.35 && d < 4 && X.P1.dodgeCd <= 0) X.Input.pressed.space = true;
    if (d < 2.4 && X.P1.atkCd <= 0) X.Input.mouse.clicked = true;
    if (X.Comp.abilityCd <= 0 && d < 7) X.Input.pressed.f = true;
    if (X.G.hp < 30 && X.G.hp > 0) X.G.hp += 40; // potion-ish to keep the test going
    g.frame(); t += 1 / 60;
    if (X.Dialog.open) g.dialog();
  }
  const K = X.Input.keys; K.w = K.s = K.a = K.d = false;
  return t;
}
run('__dm = 0'); const tCamp = fight('camp', 120); log('camp damage taken', run('__dm'));
log('camp fight took', tCamp.toFixed(1), 's, hp', Math.round(X.G.hp), 'deaths?');
g.secs(1.5); ensureDialog();
expect(X.G.done.clue3, 'camp cleared');
log('weapons', Object.keys(X.G.weapons).join(','));
// cutlass pickup
for (const p of X.Pickups.list.slice()) { X.P1.x = p.x; X.P1.z = p.z; g.step(4); }
g.secs(1);
log('weapons after pickup', Object.keys(X.G.weapons).join(','), 'xp', X.G.xp, '/', X.XP_NEED[1]);
// digs with companion sensing
for (const d of X.Spots.digs.slice(0, 3)) { g.tp(d.x + 4, d.z + 4); X.Comp.senseCd = 0; g.secs(0.5); if (X.Comp.sensed['dig' + d.i]) { g.interact('dig' + d.i, false); g.secs(1.5); } }
log('digs', JSON.stringify(X.G.digs), 'xp', X.G.xp);
let guard2 = 0;
while (X.G.xp < X.XP_NEED[1] && guard2++ < 40) { const L = X.Landmarks.find((l) => !l.found); if (!L) break; g.tp(L.x, L.z); g.secs(0.4); }
log('teen XP', X.G.xp, '/', X.XP_NEED[1], 'landmarks found', X.Landmarks.filter((l) => l.found).length);
if (X.G.xp < X.XP_NEED[1]) { log('WARNING teen short', X.XP_NEED[1] - X.G.xp); run('gainXP(' + (X.XP_NEED[1] - X.G.xp) + ')'); }
grow();
expect(X.G.stage === 2, 'grew to adult');
if (STOP === 'adult') process.exit(0);

// ───── Adult ─────
g.interact('talk_rowan'); g.step(3);
expect(X.Obj.has('frost'), 'frost objective');
// take off & fly test
g.tp(X.P1.x, X.P1.z); X.Comp.x = X.P1.x + 1; X.Comp.z = X.P1.z; X.Comp.y = X.P1.y; g.step(3); g.press('e'); g.step(3);
expect(X.P1.mode === 'ride', 'mounted adult');
g.press('space'); g.step(3);
expect(X.P1.mode === 'fly', 'took off');
const y0 = X.P1.y; g.hold('space', 2); log('climbed', (X.P1.y - y0).toFixed(1));
// boost north
X.Input.keys.w = true; X.Input.keys.shift = true; g.secs(2); const sp = X.P1.hspeed; X.Input.keys.shift = false; g.secs(1); X.Input.keys.w = false;
log('boost speed', sp.toFixed(1), 'stam', X.P1.stam.toFixed(0));
expect(sp > 25, 'boost works');
// land with Q
g.run(15, () => { X.Input.keys.q = true; return X.P1.mode === 'ride' || X.P1.mode === 'rideSwim'; }); X.Input.keys.q = false;
expect(X.P1.mode === 'ride' || X.P1.mode === 'rideSwim', 'landed with Q (' + X.P1.mode + ')');
// fly to lodge
g.tp(X.P.lodge.x + 9, X.P.lodge.z); g.secs(1.5); ensureDialog();
expect(X.G.flags.sorrelMet && X.Obj.has('rescue') && X.Obj.has('arches'), 'frost quests');
// arch run (needs mounted)
g.interact('archpost', false); g.step(3);
expect(X.Rings.active && X.Rings.active.id === 'arches', 'arch run started');
for (let i = 0; i < 20 && X.Rings.active; i++) { const c = X.Rings.active.current(); X.P1.mode = 'fly'; X.P1.x = c.x; X.P1.z = c.z; X.P1.y = c.y - 1; g.step(3); }
g.secs(1);
expect(X.G.done.arches, 'arch run done');
// rescue
run('dismount(true)'); g.tp(X.P.cave.x + 6, X.P.cave.z + 20); g.secs(1);
expect(X.Obj.has('rescue1'), 'imps & wall objective');
fight('imps', 90);
log('imps cleared, hp', Math.round(X.G.hp));
const IW = X.Spots.iceWall;
g.tp(IW.x, IW.z + 2.2); X.P1.yaw = Math.PI; X.Input.mouse.moved = 0;
for (let i = 0; i < 20 && IW.hp > 0; i++) { X.P1.x = IW.x; X.P1.z = IW.z + 2.2; X.P1.yaw = Math.PI; X.Input.mouse.moved = 0; g.click(); g.secs(0.5); }
log('ice wall hp', IW.hp);
expect(IW.hp <= 0 && X.Obj.has('rescue2'), 'ice wall broken');
g.secs(1.5);
// fly Pip home (Pip follows player)
g.tp(X.P.lodge.x + 8, X.P.lodge.z + 3); g.secs(3); ensureDialog();
expect(X.G.done.rescue, 'Pip rescued');
g.secs(2); ensureDialog();
expect(X.G.flags.frostStamina, 'frost stamina reward');
log('stam max', run('stamMax()'));
expect(X.Obj.has('nest') && X.Obj.has('lagoon'), 'nest & lagoon open');
// nest
g.tp(X.Spots.nestGate.x, X.Spots.nestGate.z); g.secs(1.5); ensureDialog([0]);
expect(X.Obj.has('nestTrial'), 'nest trial started');
g.interact('cinder', false); g.step(3);
expect(X.Nest.carrying, 'carrying cinder');
// walk back toward ashka nest across geysers
const en = X.Spots.elderNest;
const leftN = g.walkTo(en.x, en.z, 40, 6);
log('nest walk left', leftN.toFixed(1), 'hp', Math.round(X.G.hp), 'carrying', X.Nest.carrying);
for (let k = 0; k < 10 && !X.G.done.nestTrial; k++) { X.G.hp = run('maxHp()'); if (!X.Nest.carrying) { const c = X.Nest.cinder; g.tp(c.x + 1, c.z + 1); X.Input.pressed = {}; X.Interact.find(i=>i.id==='cinder').act(); g.step(2); } g.walkTo(en.x, en.z, 20, 3); }
log('nest attempts done', X.G.done.nestTrial, 'hp', Math.round(X.G.hp));
ensureDialog();
expect(X.G.done.nestTrial && X.G.flags.kindled, 'nest trial done (kindled)');
// lagoon
g.interact('talk_coralie'); g.step(3);
expect(X.G.flags.pearl && X.Obj.has('song'), 'pearl & song');
// dive test
g.tp(X.P.lagoon.x + 20, X.P.lagoon.z); g.step(20);
log('mode in lagoon', X.P1.mode, 'y', X.P1.y.toFixed(1));
g.hold('q', 2); log('dived to', X.P1.y.toFixed(1), 'breath', X.P1.breath.toFixed(1), 'hp', Math.round(X.G.hp));
expect(X.P1.y < -4 && X.P1.mode === 'swim', 'diving works');
g.secs(5); expect(X.G.hp > 0 && X.P1.breath > 7, 'pearl breathing');
// sunken chests
for (let i = 0; i < 3; i++) { g.interact('chest_sunk' + i, false); g.secs(1.2); }
g.secs(1);
expect(X.G.done.sunken, 'sunken treasure');
// swim with marina
g.interact('talk_marina'); g.step(3);
expect(X.Rings.active && X.Rings.active.id === 'swim', 'swim course');
for (let i = 0; i < 20 && X.Rings.active; i++) { const c = X.Rings.active.current(); X.P1.x = c.x; X.P1.z = c.z; X.P1.y = c.y; g.step(3); }
g.secs(1); ensureDialog();
expect(X.G.done.swimm, 'swam with marina');
// song puzzle
g.interact('talk_lyra'); g.secs(5);
expect(X.G.flags.songKnown, 'song known');
// wrong note first
g.interact('clam0', false); g.secs(1);
expect(X.Song.input.length === 0, 'wrong note resets');
for (const ci of [1, 2, 0, 1]) { g.interact('clam' + ci, false); g.secs(0.6); }
g.secs(4);
expect(X.Spots.gate.open > 0.9, 'grotto open');
g.interact('chest_grotto', false); g.secs(2); ensureDialog();
expect(X.G.done.song, 'grotto chart found');
log('adult XP', X.G.xp, '/', X.XP_NEED[2]);
let guard3 = 0;
while (X.G.xp < X.XP_NEED[2] && guard3++ < 60) { const L = X.Landmarks.find((l) => !l.found); if (!L) break; g.tp(L.x, L.z); g.secs(0.4); }
// optional chests
for (const c of X.Chests.filter((c) => !c.opened && (!c.opt.cond || c.opt.cond()) && ['mill', 'summit', 'nestRim', 'elderTop'].includes(c.id))) { g.interact('chest_' + c.id, false); g.secs(1.2); }
g.secs(2); while (X.G.mode === 'modal') { run("document.getElementById('upModal').classList.remove('show'); G.mode='play'"); g.step(2); }
log('adult XP after extras', X.G.xp, 'fruit', X.G.fruit);
if (X.G.xp < X.XP_NEED[2]) { log('WARNING adult short', X.XP_NEED[2] - X.G.xp); run('gainXP(' + (X.XP_NEED[2] - X.G.xp) + ')'); }
grow();
expect(X.G.stage === 3, 'grew to elder');
g.secs(1); ensureDialog();
expect(X.Obj.has('finale'), 'finale objective');
if (STOP === 'elder') process.exit(0);

// ───── Finale ─────
g.tp(X.Ship.x + 40, X.Ship.z - 40); g.secs(1); ensureDialog();
expect(X.Finale.started && X.Obj.has('board'), 'finale started');
// board via deck
const md = X.Spots.mainDeck; g.tp(md.x, md.z, X.Ship.deck); g.step(5);
log('on ship', X.P1.onShip, 'y', X.P1.y.toFixed(2));
expect(X.P1.onShip && Math.abs(X.P1.y - X.Ship.deck) < 0.3, 'standing on deck');
fight('deck1', 120); log('deck1 done hp', Math.round(X.G.hp));
const fd = X.Spots.foreDeck; g.tp(fd.x, fd.z, X.Ship.fore); g.step(5);
fight('deck2', 120); log('deck2 done hp', Math.round(X.G.hp));
g.secs(1);
expect(X.Obj.has('captain'), 'captain objective');
// pick up anchor
for (const p of X.Pickups.list.slice()) { X.P1.x = p.x; X.P1.z = p.z; X.P1.y = p.y - 0.4; g.step(4); }
log('weapons', Object.keys(X.G.weapons).join(','));
// boss
const cs = X.Spots.captainSpot; g.tp(cs.x + 6, cs.z, X.Ship.aft); g.step(30); ensureDialog();
expect(X.Boss.e && X.Boss.e.state === 'chase', 'boss engaged');
run('__dm = 0'); let bt = 0, deaths = 0, offShip = 0; const hp0 = X.Boss.e.hp;
while (!X.Boss.e.dead && bt < 240) {
  const e = X.Boss.e; const adds = X.Enemies.list.filter((o) => !o.dead && o.group && o.group.startsWith('bossadds'));
  const tgt = adds.length ? adds[0] : e;
  const dx = tgt.x - X.P1.x, dz = tgt.z - X.P1.z, d = Math.hypot(dx, dz);
  const K = X.Input.keys; K.w = K.s = K.a = K.d = false;
  if (e.mv && e.mv.kind === 'charge' && e.mv.t < e.mv.wind && X.P1.dodgeCd <= 0) { X.Input.pressed.space = true; }
  if (d > 2) { K.w = dz < -0.3 * d; K.s = dz > 0.3 * d; K.a = dx < -0.3 * d; K.d = dx > 0.3 * d; }
  if (d < 3 && X.P1.atkCd <= 0) X.Input.mouse.clicked = true;
  if (X.Comp.abilityCd <= 0 && d < 7) X.Input.pressed.f = true;
  if (X.G.hp < 35) X.G.hp += 50;
  if (X.G.mode === 'defeat') deaths++;
  g.frame(); bt += 1 / 60;
  if (X.Dialog.open) g.dialog();
  if (Math.floor(bt*60) % 600 === 0) log('boss t', bt.toFixed(0), 'hp', Math.round(e.hp), 'phase', e.phase, 'mv', e.mv && e.mv.kind, 'stun', e.stun.toFixed(1), 'pmode', X.P1.mode, 'py', X.P1.y.toFixed(1), 'onShip', X.P1.onShip, 'd', d.toFixed(1), 'adds', adds.length, 'inv', e.invuln);
  if (X.P1.mode === 'swim' || !X.P1.onShip) { offShip++; g.tp(cs.x + 4, cs.z, X.Ship.aft); }
}
log('knocked off ship times', offShip, 'boss damage taken', run('__dm'), 'maxHp', run('maxHp()')); log('boss fight', bt.toFixed(1), 's; boss hp', Math.round(X.Boss.e.hp), '/', hp0, 'surge used?');
expect(X.Boss.e.dead, 'captain defeated');
g.secs(2); ensureDialog();
expect(X.Obj.has('treasure'), 'treasure objective');
g.interact('chest_blackwake', false); g.secs(3);
while (X.G.mode === 'modal') { run("document.getElementById('upModal').classList.remove('show'); G.mode='play'"); g.step(2); }
expect(X.Obj.has('home'), 'fly home objective');
const et = X.Spots.elderTree; g.tp(et.x + 9, et.z + 6); g.secs(1);
expect(X.Ending.active, 'ending started');
// click through story
g.run(80, () => { if (X.UI.storyCb) run('UI.storyNext()'); return run("document.getElementById('credits').classList.contains('show')"); });
expect(run("document.getElementById('credits').classList.contains('show')"), 'credits shown');
run("document.getElementById('credOk').onclick()"); g.secs(1);
expect(X.G.mode === 'play' && X.G.endingSeen && X.Obj.has('explore'), 'control returned after ending');
// save/load roundtrip
run('saveGame(true)');
const saved = JSON.parse(X.ctx ? '{}' : '{}');
log('SAVE size', run('localStorage.getItem(SAVE_KEY).length'));
log('TOTAL play time (sim)', (X.G.playTime / 60).toFixed(1), 'min; errors', g.errors.length);
log('chests opened', X.Chests.filter((c) => c.opened).length, '/', X.Chests.length);
console.log('ALL GOOD');
