// ───────────────────────── save/load, main loop, boot ─────────────────────────
const SAVE_KEY = 'skybound-lifetime-v1';
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function saveGame(quiet) {
  if (!G.ctype || G.mode === 'title') return;
  const data = {
    v: 1, stage: G.stage, xp: G.xp, name: G.name, ctype: G.ctype, palette: G.palette, coins: G.coins, fruit: G.fruit, hp: G.hp,
    weapons: G.weapons, weapon: G.weapon, upgrades: G.upgrades, flags: G.flags, done: G.done, landmarks: G.landmarks, chests: G.chests, digs: G.digs,
    stats: G.stats, hints: G.hints, playTime: G.playTime, endingSeen: G.endingSeen,
    pos: { x: P1.lastSafe.x, z: P1.lastSafe.z }, sensed: Comp.sensed,
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); if (!quiet) UI.toast('Game saved.', 'done'); else UI.saveBlip(); } catch (e) { if (!quiet) UI.toast('Couldn’t save in this browser.', 'info'); }
}
function loadGame() {
  let d; try { d = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { d = null; }
  if (!d) return newGame();
  Object.assign(G, { stage: d.stage, xp: d.xp, name: d.name, ctype: d.ctype, palette: d.palette || 0, coins: d.coins, fruit: d.fruit, weapons: d.weapons, weapon: d.weapon, upgrades: Object.assign(G.upgrades, d.upgrades), flags: d.flags || {}, done: d.done || {}, landmarks: d.landmarks || {}, chests: d.chests || {}, digs: d.digs || {}, stats: Object.assign(G.stats, d.stats), hints: d.hints || {}, playTime: d.playTime || 0, endingSeen: d.endingSeen });
  // transient flags reset
  delete G.flags.bonding; delete G.flags.hasTreat; delete G.flags.glideStarted; delete G.flags.campStarted; delete G.flags.warnShotT;
  Comp.sensed = d.sensed || {};
  // world state
  for (const c of Chests) if (G.chests[c.id]) { c.opened = true; c.openT = 1; c.lid.rotation.x = -1.9; }
  for (const k in G.landmarks) { const L = Landmarks.find((l) => l.id === k); if (L) L.found = true; }
  Hatch.list.forEach((h) => (h.hidden = true));
  if (G.done.rescue || Spots.iceWall.hp <= 0) { Spots.iceWall.hp = 0; Spots.iceWall.col.enabled = false; W.scene.remove(Spots.iceWall.mesh); const b = Breakables[0]; if (b) b.broken = true; }
  if (G.done.song || G.chests.grotto) { Spots.gate.open = 1; Spots.gate.opening = true; }
  if (G.flags.pearl) makeBubbleHelm();
  if (G.done.crows2) Crows.left = 0;
  if (G.done.hide2) HideSeek.found = 3;
  applyStage(G.stage);
  G.hp = maxHp();
  P1.x = d.pos.x; P1.z = d.pos.z; P1.y = Colliders.ground(P1.x, P1.z) + 0.1; P1.mode = 'foot';
  Comp.teleportNear();
  G.mode = 'play';
  director();
  Cam.snap(P1);
  UI.region(REGION_INFO[regionAt(P1.x, P1.z)].name, 'Welcome back');
  UI.toast('Welcome back, ' + G.name + ' missed you!', 'heart');
  setTimeout(() => Comp.react('pet'), 600);
}
function newGame() {
  G.mode = 'play';
  applyStage(0);
  startChapter0();
}

// ───── interactions ─────
function resolveInteract() {
  if (G.mode !== 'play' || Dialog.open) { UI.prompt(null); return; }
  let best = null, bd = 1e9, bestLabel = '';
  const py = P1.y;
  for (const it of Interact) {
    if (it.follow) { it.x = it.follow.x; it.z = it.follow.z; it.y = it.follow.y ?? it.y; }
    const d = dist2d(it, P1);
    if (d > it.r || Math.abs((it.y ?? py) - py) > (it.yr || 4)) continue;
    if (it.cond && !it.cond()) continue;
    const label = typeof it.label === 'function' ? it.label() : it.label;
    if (!label) continue;
    if (d < bd) { bd = d; best = it; bestLabel = label; }
  }
  // companion contextual actions
  const mounted = P1.mode !== 'foot' && P1.mode !== 'swim';
  let compAct = null, cd = 1e9;
  if (G.ctype && Comp.C) {
    if (mounted) { if (P1.mode === 'ride' || P1.mode === 'rideSwim' || (P1.mode === 'fly' && P1.y - P1.ground < 1.5)) { compAct = { label: P1.mode === 'rideSwim' ? 'Slide off' : 'Hop off', act: () => dismount() }; cd = 1.5; } }
    else {
      cd = dist2d(Comp, P1);
      if (cd < 2.2 + Comp.C.radius && Math.abs(Comp.y - P1.y) < 2.2) compAct = canMount() ? { label: 'Ride ' + G.name, act: () => mount(), alt: { label: 'Cuddle', key: 'C' } } : { label: 'Cuddle ' + G.name, act: () => Comp.pet() };
      cd -= Comp.C.radius * 0.6; // companion bulk counts as closer
    }
  }
  let action = null, label = null, useComp = false;
  if (best && compAct) useComp = mounted ? bd > 2.2 : cd < bd;
  else if (compAct) useComp = true;
  if (useComp) { action = compAct.act; label = compAct.label; }
  else if (best) { action = best.act; label = bestLabel; }
  if (label) {
    const extra = useComp && compAct.alt ? [compAct.alt.key, compAct.alt.label] : null;
    UI.prompt(label, 'E', extra);
    if (Input.hit('e')) { Audio.sfx('ui'); action(); }
  } else UI.prompt(null);
  if (Input.hit('c') && G.ctype && !mounted && dist2d(Comp, P1) < 3 + Comp.C.radius) Comp.pet();
}

// ───── region & landmark tracking ─────
let curRegion = '';
function trackRegion(dt) {
  const r = regionAt(P1.x, P1.z);
  if (r !== curRegion) {
    const prev = curRegion; curRegion = r;
    const info = REGION_INFO[r];
    if (prev && info.sub && G.mode === 'play') UI.region(info.name, info.sub);
    $('mmRegion').textContent = info.name;
    if (!G.landmarks['region_' + r] && G.mode === 'play' && r !== 'wilds' && r !== 'sea') { G.landmarks['region_' + r] = 1; if (prev) { gainXP(12, 'Discovery'); setTimeout(() => Comp.react('discover', 'New region discovered: ' + info.name), 1500); } }
  }
  for (const L of Landmarks) {
    if (L.found) continue;
    if (dist2d(L, P1) < L.r) { L.found = true; G.landmarks[L.id] = 1; if (G.mode === 'play' && G.ctype) { Audio.sfx('discover'); UI.toast('Discovered: ' + L.name, 'star'); gainXP(6, 'Discovery'); Comp.react('discover'); } Bus.emit('landmark', L); }
  }
  // fog & palette blend
  const target = linColor(REGION_INFO[r].fog);
  const under = P1.y < -1.3;
  W.sky.visible = !under;
  if (under) target.copy(linColor(0x3aa8b8));
  W.fog.color.lerp(target, 1 - Math.exp(-dt * 1.5));
  const nearF = under ? 6 : r === 'nest' ? 70 : r === 'frost' ? 120 : 140, farF = under ? (hasBreath() ? 70 : 40) : r === 'nest' ? 340 : 520;
  W.fog.near = damp(W.fog.near, nearF, 2, dt); W.fog.far = damp(W.fog.far, farF, 2, dt);
  W.scene.background.copy(W.fog.color);
}

// sky & time of day: gentle cycle; dusk in nest; ending at golden hour
let skyT = 0.32, skyOverride = null;
function setSkyTime(t) { skyOverride = t; }
function updateSky(dt) {
  skyT = (skyT + dt / 600) % 1; // 10-minute day
  let t = skyOverride ?? skyT;
  // keep mostly daytime: map 0..1 to 0.2..0.85 sun arc with brief dusk
  const k = 0.5 - 0.5 * Math.cos(t * TAU); // 0 midnight..1 noon-ish
  const day = smoothstep(0.15, 0.6, k);
  const dusk = Math.max(0, 1 - Math.abs(k - 0.35) / 0.25) * (1 - day * 0.5);
  const top = new THREE.Color().lerpColors(linColor(0x3a4a7a), linColor(0x7fb6e6), day);
  const bot = new THREE.Color().lerpColors(linColor(0xf2b38a), linColor(0xf3e6cf), day);
  top.lerp(linColor(0x8a6aa8), dusk * 0.3); bot.lerp(linColor(0xffb070), dusk * 0.6);
  bot.lerp(W.fog.color, 0.65); // melt horizon into fog
  W.skyMat.uniforms.uTop.value.copy(top); W.skyMat.uniforms.uBot.value.copy(bot);
  W.sun.intensity = lerp(0.3, 0.88, day) * LI; W.hemi.intensity = lerp(0.36, 0.52, day) * LI;
  W.sun.color.copy(new THREE.Color().lerpColors(linColor(0xffb070), linColor(0xfff0d8), day));
  if (W.glowMat) W.glowMat.uniforms.uNight.value = lerp(0.9, 0.25, day);
  const sunA = t * TAU;
  const off = new THREE.Vector3(Math.cos(sunA * 0.5 + 0.8) * 60, 90, Math.sin(sunA * 0.5 + 0.8) * 50 + 30);
  W.sun.position.set(P1.x + off.x, P1.y + off.y, P1.z + off.z); W.sun.target.position.set(P1.x, P1.y, P1.z);
  W.sky.position.copy(W.camera.position);
  // regional tint over fog/sky handled in trackRegion
  if (curRegion === 'nest') { W.hemi.color.lerp(linColor(0xffb08a), 0.05); } else W.hemi.color.lerp(linColor(0xd8ecff), 0.05);
}

// emitters
function updateEmitters(dt) {
  for (const e of Emitters) {
    if (e.cond && !e.cond()) continue;
    if (Math.abs(e.x - P1.x) > 120 || Math.abs(e.z - P1.z) > 120) continue;
    e.acc += dt * e.rate;
    while (e.acc > 1) {
      e.acc -= 1;
      if (e.kind === 'smoke') FX.smoke(e.x, e.y, e.z);
      else if (e.kind === 'fountain') FX.spawn({ x: e.x + rand(-0.15, 0.15), y: e.y, z: e.z + rand(-0.15, 0.15), vx: rand(-1.5, 1.5), vy: rand(3, 4.5), vz: rand(-1.5, 1.5), life: 1.0, size: 0.3, size1: 0.15, color: 0xd8fbff, grav: 9, alpha: 0.8 });
      else if (e.kind === 'embers') FX.ember(e.x, e.y, e.z);
      else if (e.kind === 'petals') FX.petal(e.x, e.y, e.z);
      else if (e.kind === 'vent') { FX.bubble(e.x + rand(-0.4, 0.4), e.y, e.z + rand(-0.4, 0.4), 0, rand(1.5, 2.5), 0, rand(0.25, 0.5)); }
      else if (e.kind === 'campfire') FX.fire(e.x + rand(-0.3, 0.3), e.y + 0.2, e.z + rand(-0.3, 0.3), 0, rand(1, 2), 0, 0.6);
      else if (e.kind === 'twinkle') FX.spawn({ x: e.x + rand(-0.3, 0.3), y: e.y + rand(0, 0.5), z: e.z + rand(-0.3, 0.3), vy: 0.6, life: 0.8, size: 0.35, size1: 0, color: 0xfff2a8, add: true });
    }
  }
  // regional ambience
  const r = curRegion;
  if (r === 'frost' && Math.random() < dt * 30) FX.snow(P1.x, P1.y, P1.z);
  if (r === 'lagoon' && Math.random() < dt * 8) FX.mote(P1.x, Math.min(P1.y, -1) , P1.z, pick([0x9ff3ff, 0xc9a6ff, 0x9fffc8]));
  if (r === 'village' && Math.random() < dt * 2) FX.mote(P1.x, P1.y + 1, P1.z, 0xfff2a8);
  if (r === 'nest' && Math.random() < dt * 8) FX.ember(P1.x, P1.y, P1.z);
  // vent breath (for those without pearl)
  for (const v of Spots.vents) if (dist3d(P1, { x: v.x, y: P1.y, z: v.z }) < 2.5 && P1.y < -1) P1.breath = Math.min(8, P1.breath + dt * 5);
}

// animated world bits
function updateWorldAnim(dt) {
  for (const s of W.spinners) s.obj.rotation.z += s.speed * dt;
  for (const f of W.flags) f.rotation.z = Math.sin(W.time * 3) * 0.15;
  if (W.shipSail) W.shipSail.rotation.z = Math.sin(W.time * 0.5) * 0.01;
  W.waterMat.uniforms.uTime.value = W.time;
  W.waterMat.uniforms.uClear.value = damp(W.waterMat.uniforms.uClear.value, P1.y < -1 ? 1 : 0, 3, dt);
  W.lavaMat.uniforms.uTime.value = W.time;
  if (W.glowMat) { W.glowMat.uniforms.uTime.value = W.time; W.glowMat.uniforms.uScale.value = pointScale(); }
  // grotto gate
  const gt = Spots.gate;
  if (gt.opening && gt.open < 1) gt.open = Math.min(1, gt.open + dt * 0.4);
  gt.doorL.position.x = -gt.open * 3.2; gt.doorR.position.x = gt.open * 3.2;
  // clams
  for (const c of Spots.clams) { c.glowT = Math.max(0, (c.glowT || 0) - dt); c.lid.rotation.x = -0.25 - Math.sin(W.time * 1.5 + c.i) * 0.1 - c.glowT * 0.9; c.pearl.scale.setScalar(1 + c.glowT * 0.8); }
  // pickups magnet etc
  Pickups.update(dt, P1, onPickup);
}
function onPickup(p) {
  if (p.kind === 'coin') { G.coins += p.val; Audio.sfx('coin'); FX.coin(p.x, p.y, p.z); }
  else if (p.kind === 'heart') { const h = 15; G.hp = Math.min(maxHp(), G.hp + h); Audio.sfx('heart'); Floaters.add('+' + h, { x: P1.x, y: P1.y + 2.2, z: P1.z }, 'heal'); }
  else if (p.kind === 'fruit') collectFruit();
  else if (p.kind === 'weapon') {
    const k = p.data; G.weapons[k] = true; G.weapon = k; setHumanWeapon(P1.H, P1.mode === 'foot' || P1.mode === 'swim' ? k : null);
    Audio.sfx('chest'); UI.banner(WEAPON_DEF[k].name, 2.4, WEAPON_DEF[k].desc + ' Press R to switch weapons.');
    Comp.react('treasure');
  }
  else if (p.kind === 'item' && p.data === 'moonpearl') { G.coins += 40; Audio.sfx('golden'); UI.toast('Grimtide’s black pearl — worth 40 coins to Fen!', 'coin'); }
}

function cycleWeapon() {
  const ks = Object.keys(G.weapons).filter((k) => G.weapons[k]); if (ks.length < 2) return;
  G.weapon = ks[(ks.indexOf(G.weapon) + 1) % ks.length];
  setHumanWeapon(P1.H, P1.mode === 'foot' || P1.mode === 'swim' ? G.weapon : null);
  Audio.sfx('ui'); UI.toast('Equipped: ' + WEAPON_DEF[G.weapon].name + ' — ' + WEAPON_DEF[G.weapon].desc, 'info');
}

// ───── main loop ─────
let last = 0, acc = 0, saveT = 0, titleT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
  Input.mouse.moved = Math.max(0, Input.mouse.moved - dt);
  if (Trailer.active) { Trailer.frame(dt); Input.endFrame(); return; }
  if (Input.hit('escape') || Input.hit('p')) { if (UI.mapOpen) UI.toggleMap(false); else if (G.mode !== 'title' && G.mode !== 'modal') UI.pause(!UI.paused); }
  if (Input.hit('m') && G.mode === 'play' && !UI.paused && !Dialog.open) UI.toggleMap();
  if (UI.paused || G.mode === 'modal') { Input.endFrame(); W.renderer.render(W.scene, W.camera); return; }
  W.time += dt;
  if (G.mode === 'title') { titleT += dt; titleCam(dt); updateSky(dt); updateWorldAnim(dt); Wild.update(dt); NPCs.update(dt); Mermaids.update(dt); FX.update(dt); W.renderer.render(W.scene, W.camera); Input.endFrame(); return; }
  G.playTime += dt; G.celebrateT = Math.max(0, (G.celebrateT || 0) - dt);
  if (G.mode === 'play' && !Dialog.open) {
    if (Input.hit('f')) Comp.useAbility();
    if (Input.hit('r')) cycleWeapon();
  }
  updatePlayer(dt);
  Comp.update(dt);
  updateBall(dt);
  if (Bond.chal) Bond.chal.update(dt);
  NPCs.update(dt); Wild.update(dt); Mermaids.update(dt);
  Enemies.update(dt); Projectiles.update(dt); Cannons.update(dt); Geysers.update(dt);
  Rings.update(dt);
  updateChests(dt);
  Dialog.update(dt);
  resolveInteract();
  trackRegion(dt);
  updateSky(dt);
  updateEmitters(dt);
  updateWorldAnim(dt);
  Ending.update(dt);
  Bus.emit('frame', dt);
  FX.update(dt); Sprites.update(dt); Telegraphs.update(dt);
  Cam.update(dt, P1);
  Floaters.update(dt, W.camera);
  UI.update(dt);
  // passive bond from time together (small)
  if (G.mode === 'play' && G.ctype && G.stage < 3) { G._passive = (G._passive || 0) + dt; if (G._passive > 20) { G._passive = 0; gainXP(1, 'Time'); } }
  // audio
  const wind = P1.mode === 'fly' || P1.mode === 'glide' ? clamp(P1.hspeed / 30, 0.2, 1) : curRegion === 'frost' ? 0.25 : 0.05;
  const waves = clamp(1 - Math.abs(Terrain.getH(P1.x, P1.z)) / 12, 0, 1) * (P1.y > -1 ? 1 : 0.2) + (curRegion === 'beach' ? 0.4 : 0);
  Audio.update(dt, { region: REGION_INFO[curRegion] ? REGION_INFO[curRegion].music : 'village', wind, waves, combat: G.inCombat, calm: G.stage === 0 });
  saveT += dt; if (saveT > 45 && G.mode === 'play') { saveT = 0; saveGame(true); }
  W.renderer.render(W.scene, W.camera);
  Input.endFrame();
}
function titleCam(dt) {
  const t = W.time * 0.05;
  const cx = Math.cos(t) * 60, cz = Math.sin(t) * 60 + 10;
  W.camera.position.set(cx, 38, cz);
  W.camera.lookAt(0, 8, 0);
  W.sky.position.copy(W.camera.position);
  void dt;
}

// ───── boot ─────
function boot() {
  initRenderer();
  makeTextures();
  buildWorld();
  FX.init(); Pickups.init();
  P1.root = new THREE.Group(); W.scene.add(P1.root);
  rebuildPlayer();
  populate();
  setupFrost(); setupNest(); setupLagoon(); setupBeachNPCs(); setupOptionalCourses(); setupDigs();
  makeStoryChests(); makeShipTreasure();
  // nursery hatchling interaction anchors follow hatchlings
  Input.init(); UI.init(); Trailer.initUI();
  W.homeDeco[0].visible = true;
  $('loading').classList.add('gone');
  $('title').classList.add('show');
  $('continueBtn').style.display = hasSave() ? '' : 'none';
  $('muteBtn').innerHTML = ICON.sound;
  let autoload = false; try { autoload = localStorage.getItem('skybound-autoload') === '1'; localStorage.removeItem('skybound-autoload'); } catch (e) {}
  if (autoload && hasSave()) { UI.hideTitle(); loadGame(); }
  requestAnimationFrame(frame);
  window.__skybound = { G, P1, Comp, Obj, W, Enemies, Spots };
}
