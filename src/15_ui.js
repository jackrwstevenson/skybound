// ───────────────────────── UI ─────────────────────────
const $ = (id) => document.getElementById(id);
// Reloading the page is blocked in some sandboxed hosts; rebuild the scene in place instead.
function restartPage() { try { location.reload(); } catch (e) { /* fall through */ } }
const ICON = {
  ember: '<svg viewBox="0 0 24 24"><path d="M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3-1-3 0-6 1-9z" fill="currentColor"/></svg>',
  cloud: '<svg viewBox="0 0 24 24"><path d="M4 18c2-9 9-14 17-15-3 3-5 6-6 9h3c-2 2-4 3-6 4h2c-3 2-6 2-10 2z" fill="currentColor"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M2 14c3-3 5-3 8 0s5 3 8 0 3-2 4-2v4c-1 0-2 1-4 2-3 2-5 2-8 0s-5-2-8 0z M6 8a3 3 0 1 0 6 0 3 3 0 1 0-6 0" fill="currentColor"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8c2 2 2 6 0 8M18.5 5.5c3.5 3.5 3.5 9.5 0 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l6 6M22 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};
const TOAST_ICON = { quest: '✦', done: '✔', heart: '♥', star: '★', info: '•', bang: '!', q: '?', coin: '◉', food: '❀', sweat: '…' };

const UI = {
  objectivesDirty: true, portraitDirty: true, toasts: [], sayList: [], bars: [], storyCb: null, mapOpen: false, paused: false, regionName: '',
  init() {
    Floaters.init(); Dialog.init();
    $('muteBtn').onclick = () => this.toggleMute();
    $('pauseBtn').onclick = () => this.pause(true);
    document.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => this.menuAct(b.dataset.act)));
    $('vol').oninput = (e) => { Audio.setVolume(e.target.value / 100); };
    this.buildMapCanvas();
    this.mini = $('minimap').getContext('2d');
    $('story').addEventListener('click', () => this.storyNext());
    addEventListener('resize', () => this.layoutMap());
  },
  toggleMute() { Audio.init(); Audio.setMuted(!Audio.muted); $('muteBtn').innerHTML = Audio.muted ? ICON.mute : ICON.sound; $('muteLabel').textContent = Audio.muted ? 'Sound off' : 'Sound on'; },
  menuAct(a) {
    Audio.init(); Audio.sfx('ui');
    if (a === 'new') { if (hasSave() && !confirm('Start a new adventure? Your saved game will be replaced.')) return; this.hideTitle(); newGame(); }
    if (a === 'continue') { this.hideTitle(); loadGame(); }
    if (a === 'controls') { $('controlsCard').classList.toggle('show'); }
    if (a === 'trailer') { Trailer.openMenu(); }
    if (a === 'resume') this.pause(false);
    if (a === 'save') { saveGame(); this.toast('Game saved.', 'done'); }
    if (a === 'load') { if (!hasSave()) return this.toast('No saved game yet.', 'info'); localStorage.setItem('skybound-autoload', '1'); restartPage(); }
    if (a === 'restart') { if (confirm('Restart from the very beginning? This erases your save.')) { localStorage.removeItem(SAVE_KEY); restartPage(); } }
    if (a === 'mute') this.toggleMute();
    if (a === 'map') { this.pause(false); this.toggleMap(true); }
  },
  hideTitle() { $('title').classList.add('gone'); $('hud').classList.add('show'); },
  pause(on) {
    if (G.mode === 'title') return;
    this.paused = on; $('pause').classList.toggle('show', on);
    if (on) { const m = Math.floor(G.playTime / 60); $('pauseStats').textContent = `${STAGE_INFO[G.stage].title} · ${m} min played · ${G.coins} coins · ${Chests.filter((c) => c.opened).length}/${Chests.length} treasures`; }
  },
  // ───── HUD per-frame ─────
  update(dt) {
    if (G.mode === 'title') return;
    // portrait
    if (this.portraitDirty && G.ctype) {
      this.portraitDirty = false;
      $('pIcon').innerHTML = ICON[G.ctype]; $('pIcon').className = 'picon ' + G.ctype;
      $('pName').textContent = G.name; $('pStage').textContent = STAGE_INFO[G.stage].title;
    }
    $('portrait').style.visibility = G.ctype ? 'visible' : 'hidden';
    const mh = maxHp(); G.hp = Math.min(G.hp, mh);
    $('hpFill').style.width = (G.hp / mh) * 100 + '%'; $('hpTxt').textContent = Math.ceil(G.hp) + ' / ' + mh;
    const mounted = P1.mode !== 'foot' && P1.mode !== 'swim';
    $('stamRow').style.display = mounted && G.stage >= 1 ? '' : 'none';
    $('stamFill').style.width = (P1.stam / stamMax()) * 100 + '%';
    $('stamFill').classList.toggle('low', P1.stam < 25);
    const under = P1.y < -1.4 && !hasBreath();
    $('breathRow').style.display = under ? '' : 'none'; $('breathFill').style.width = (P1.breath / 8) * 100 + '%';
    if (G.stage < 3) { $('bondFill').style.width = (G.xp / XP_NEED[G.stage]) * 100 + '%'; $('bondLbl').textContent = G.xp >= XP_NEED[G.stage] ? 'Ready to grow!' : 'Bond'; $('bondRow').classList.toggle('ready', G.xp >= XP_NEED[G.stage]); }
    else { $('bondFill').style.width = Comp.surge + '%'; $('bondLbl').textContent = Comp.surge >= 100 ? 'Surge ready — F' : 'Surge'; $('bondRow').classList.toggle('ready', Comp.surge >= 100); }
    $('coins').textContent = G.coins; $('fruitN').textContent = G.fruit;
    // ability
    if (G.ctype) {
      const k = Comp.abilityCd / Comp.cooldownMax();
      $('abil').style.setProperty('--cd', Math.max(0, k) * 360 + 'deg'); $('abil').classList.toggle('ready', k <= 0);
      $('abilName').textContent = Comp.abilityName(); $('abilIcon').innerHTML = ICON[G.ctype];
      $('weap').textContent = WEAPON_DEF[G.weapon].name; $('weapKey').style.display = Object.keys(G.weapons).length > 1 ? '' : 'none';
    }
    $('actionBar').style.visibility = G.ctype ? 'visible' : 'hidden';
    // objectives
    if (this.objectivesDirty || (W.time * 2 | 0) !== this._ot) { this._ot = W.time * 2 | 0; this.objectivesDirty = false; this.renderObjectives(); }
    this.updateMarker();
    this.drawMinimap();
    if (this.mapOpen) this.drawMap();
    // toasts
    this.toasts = this.toasts.filter((t) => { t.t -= dt; if (t.t <= 0) { t.el.classList.add('out'); setTimeout(() => t.el.remove(), 400); return false; } return true; });
    // speech bubbles
    const v = new THREE.Vector3();
    this.sayList = this.sayList.filter((s) => { s.t -= dt; if (s.t <= 0 || !s.npc.visible) { s.el.remove(); return false; } v.set(s.npc.x, s.npc.y + (s.npc.H ? s.npc.H.height + 0.9 : 2.5), s.npc.z).project(W.camera); const on = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1; s.el.style.display = on ? '' : 'none'; s.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * innerWidth}px,${(-v.y * 0.5 + 0.5) * innerHeight}px) translate(-50%,-100%)`; return true; });
    $('underwater').classList.toggle('on', P1.y < -1.3);
  },
  renderObjectives() {
    const tr = Obj.tracked();
    const list = Obj.list.slice().sort((a, b) => (b === tr) - (a === tr) || b.main - a.main).slice(0, 5);
    $('objs').innerHTML = list.map((o) => { const t = o.target ? o.target() : null; const d = t ? Math.round(dist2d(t, P1)) : null; return `<li class="${o.main ? 'main' : 'side'} ${o === tr ? 'tracked' : ''}"><span class="txt">${Obj.fmt(o.text)}</span>${d !== null && d > 6 ? `<span class="dist">${d} m</span>` : ''}</li>`; }).join('');
  },
  updateMarker() {
    const el = $('marker'); const o = Obj.tracked(); const t = o && o.target ? o.target() : null;
    if (!t || G.mode !== 'play' || Dialog.open) { el.style.display = 'none'; return; }
    const ty = (t.y ?? Colliders.ground(t.x, t.z, 999)) + 3.2;
    const v = new THREE.Vector3(t.x, ty, t.z).project(W.camera);
    const d = dist2d(t, P1);
    el.style.display = d < 4 ? 'none' : '';
    let sx = (v.x * 0.5 + 0.5) * innerWidth, sy = (-v.y * 0.5 + 0.5) * innerHeight;
    const m = 60; const off = v.z > 1 || sx < m || sx > innerWidth - m || sy < m || sy > innerHeight - m;
    if (v.z > 1) { sx = innerWidth - sx; sy = innerHeight - sy; }
    if (off) {
      const cx = innerWidth / 2, cy = innerHeight / 2; const dx = sx - cx, dy = sy - cy; const k = Math.min((cx - m) / Math.abs(dx || 1), (cy - m) / Math.abs(dy || 1));
      sx = cx + dx * Math.min(1, k); sy = cy + dy * Math.min(1, k);
      el.classList.add('edge'); el.style.setProperty('--rot', Math.atan2(dy, dx) + 'rad');
    } else el.classList.remove('edge');
    el.style.transform = `translate(${sx}px,${sy}px)`;
    $('markerDist').textContent = Math.round(d) + ' m';
    el.classList.toggle('side', !o.main);
  },
  prompt(text, key = 'E', extra) {
    const el = $('prompt');
    if (!text) { el.classList.remove('show'); this._pr = ''; return; }
    const html = `<kbd>${key}</kbd><span>${text}</span>` + (extra ? `<span class="sep"></span><kbd>${extra[0]}</kbd><span>${extra[1]}</span>` : '');
    if (html !== this._pr) { el.innerHTML = html; this._pr = html; }
    el.classList.add('show');
  },
  toast(text, kind = 'info') {
    const el = document.createElement('div'); el.className = 'toast ' + kind;
    el.innerHTML = `<i>${TOAST_ICON[kind] || '•'}</i><span>${text}</span>`;
    $('toasts').prepend(el); this.toasts.push({ el, t: 4.2 + Math.min(3, text.length / 40) });
    while (this.toasts.length > 5) { const t = this.toasts.shift(); t.el.remove(); }
  },
  hint(text, dur = 6) {
    const el = $('hint');
    const keys = ['WASD', 'E', 'F', 'Q', 'R', 'C', 'M', 'Space', 'Shift', 'Click', 'Esc'];
    let html = text; for (const k of keys) html = html.replace(new RegExp('\\b' + k + '\\b', 'g'), `<kbd>${k}</kbd>`);
    el.innerHTML = html; el.classList.add('show');
    clearTimeout(this._ht); this._ht = setTimeout(() => el.classList.remove('show'), dur * 1000);
  },
  say(npc, text) {
    const el = document.createElement('div'); el.className = 'bubble'; el.textContent = text; $('bubbles').appendChild(el);
    this.sayList.push({ npc, el, t: 3.6 });
  },
  region(name, sub) {
    const el = $('regionBanner'); $('regionName').textContent = name; $('regionSub').textContent = sub || '';
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(this._rt); this._rt = setTimeout(() => el.classList.remove('show'), 3800);
    $('mmRegion').textContent = name;
  },
  banner(title, dur = 2.5, sub = '') {
    const el = $('banner'); $('bannerTitle').textContent = title; $('bannerSub').textContent = sub;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(this._bt); this._bt = setTimeout(() => el.classList.remove('show'), dur * 1000 + 1500);
  },
  fade(on, text = '', big = false, dur = 0.8) {
    const el = $('fade'); el.style.transitionDuration = dur + 's';
    $('fadeText').textContent = text; $('fadeText').classList.toggle('big', big);
    el.classList.toggle('on', on);
  },
  saveBlip() { const el = $('saveBlip'); el.classList.add('on'); clearTimeout(this._sb); this._sb = setTimeout(() => el.classList.remove('on'), 1400); },
  flashHurt() { const el = $('hurtFlash'); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); },
  xpPulse(n) { const el = $('bondRow'); el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); if (n >= 3) Floaters.add('+' + n + ' bond', { x: P1.x, y: P1.y + 2.6, z: P1.z }, 'bond'); },
  timer(t) { const el = $('timer'); if (t === null || t === undefined) { el.style.display = 'none'; return; } el.style.display = ''; el.textContent = Math.max(0, t).toFixed(1); el.classList.toggle('low', t < 5); },
  // enemy bars
  makeEnemyBar(boss) {
    if (boss) return { remove: () => {}, boss: true };
    const el = document.createElement('div'); el.className = 'ebar'; el.innerHTML = '<i></i>'; $('bubbles').appendChild(el); return el;
  },
  updateEnemyBar(e) {
    if (e.hpBar.boss) { $('bossFill').style.width = Math.max(0, e.hp / e.maxHp) * 100 + '%'; return; }
    const show = e.state !== 'idle' && e.hp < e.maxHp;
    if (!show) { e.hpBar.style.display = 'none'; return; }
    const v = new THREE.Vector3(e.x, e.y + e.h + 0.6, e.z).project(W.camera);
    e.hpBar.style.display = v.z < 1 ? '' : 'none';
    e.hpBar.style.transform = `translate(${(v.x * 0.5 + 0.5) * innerWidth}px,${(-v.y * 0.5 + 0.5) * innerHeight}px) translate(-50%,-50%)`;
    e.hpBar.firstChild.style.width = Math.max(0, e.hp / e.maxHp) * 100 + '%';
  },
  bossBar(on) { $('bossBar').classList.toggle('show', on); },
  // ───── modal: naming ─────
  nameCompanion(type, cb) {
    G.mode = 'modal';
    const sugg = { ember: ['Toffee', 'Blaze', 'Ruby', 'Kindle', 'Sizzle'], cloud: ['Gale', 'Biscuit', 'Skye', 'Talon', 'Puffin'], moon: ['Luna', 'Brook', 'Splash', 'Shimmer', 'Tide'] }[type];
    const pals = PALETTES[type].map((p) => Object.assign({}, CREATURE_DEF[type].pal, p));
    let pal = 0;
    const m = $('nameModal');
    $('nmTitle').textContent = 'Name your ' + CREATURE_DEF[type].name;
    $('nmBlurb').textContent = CREATURE_DEF[type].blurb;
    const inp = $('nmInput'); inp.value = sugg[0];
    $('nmSugg').innerHTML = sugg.map((s) => `<button class="chip">${s}</button>`).join('');
    $('nmSugg').querySelectorAll('.chip').forEach((b) => (b.onclick = () => { inp.value = b.textContent; Audio.sfx('ui'); }));
    const hex = (h) => '#' + h.toString(16).padStart(6, '0');
    $('nmPal').innerHTML = pals.map((p, i) => `<button class="swatch ${i === 0 ? 'on' : ''}" style="--a:${hex(p.body)};--b:${hex(p.wing)};--c:${hex(p.belly)}" data-i="${i}" aria-label="Colour ${i + 1}"></button>`).join('');
    $('nmPal').querySelectorAll('.swatch').forEach((b) => (b.onclick = () => { pal = +b.dataset.i; $('nmPal').querySelectorAll('.swatch').forEach((x) => x.classList.toggle('on', x === b)); Audio.sfx('ui'); if (Hatch.byType[type]) { const h = Hatch.byType[type]; const pos = h.C.root.position.clone(); W.scene.remove(h.C.root); h.C = buildCreature(type, 0, PALETTES[type][pal]); h.root = h.C.root; h.C.root.position.copy(pos); W.scene.add(h.C.root); } }));
    m.classList.add('show'); setTimeout(() => { inp.focus(); inp.select(); }, 50);
    const done = () => { const n = inp.value.trim().slice(0, 14) || sugg[0]; m.classList.remove('show'); G.mode = 'play'; Audio.sfx('quest'); cb(n.charAt(0).toUpperCase() + n.slice(1), pal); };
    $('nmOk').onclick = done; inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') done(); };
  },
  // ───── modal: upgrades ─────
  upgradeChoice() {
    if (Dialog.open || G.mode !== 'play' || G.inCombat || Ending.active) { setTimeout(() => this.upgradeChoice(), 600); return; }
    const avail = UPGRADES.filter((u) => G.upgrades[u.id] < u.max);
    if (!avail.length) { G.coins += 25; this.toast('Fully upgraded! The fruit turns into 25 coins.', 'coin'); return; }
    const pickN = avail.sort(() => Math.random() - 0.5).slice(0, 3);
    const prev = G.mode; G.mode = 'modal';
    const m = $('upModal');
    $('upCards').innerHTML = pickN.map((u) => `<button class="card" data-id="${u.id}"><b>${u.name}</b><span>${u.desc}</span><em>${'●'.repeat(G.upgrades[u.id])}${'○'.repeat(u.max - G.upgrades[u.id])}</em></button>`).join('');
    $('upCards').querySelectorAll('.card').forEach((b) => (b.onclick = () => {
      G.upgrades[b.dataset.id]++; m.classList.remove('show'); G.mode = 'play'; void prev;
      if (b.dataset.id === 'heart') G.hp = maxHp();
      Audio.sfx('quest'); this.toast(UPGRADES.find((u) => u.id === b.dataset.id).name + ' — upgraded!', 'star'); saveGame(true);
    }));
    m.classList.add('show');
  },
  // ───── story captions (ending) ─────
  story(text, cb) {
    const el = $('story'); el.classList.add('show'); $('storyText').textContent = text; $('storyText').classList.remove('in'); void el.offsetWidth; $('storyText').classList.add('in');
    this.storyCb = cb; clearTimeout(this._st); this._st = setTimeout(() => this.storyNext(), 7500);
  },
  storyNext() { if (!this.storyCb) return; clearTimeout(this._st); const f = this.storyCb; this.storyCb = null; Audio.sfx('ui'); f(); },
  credits(cb) {
    $('story').classList.remove('show');
    const s = G.stats; const m = Math.floor(G.playTime / 60);
    $('credStats').innerHTML = [
      ['Companion', `${G.name} the ${CREATURE_DEF[G.ctype].name}`], ['Time together', m + ' minutes'], ['Distance flown', Math.round(s.flown) + ' m'],
      ['Distance swum', Math.round(s.swum) + ' m'], ['Cuddles', s.pets], ['Treasures found', s.treasure], ['Golden Fruit shared', G.fruit], ['Pirates sent packing', s.pirates], ['Rings flown', s.rings],
    ].map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
    $('credits').classList.add('show');
    $('credOk').onclick = () => { $('credits').classList.remove('show'); Audio.sfx('quest'); cb(); };
  },
  // ───── maps ─────
  buildMapCanvas() {
    const R = 320; const cv = document.createElement('canvas'); cv.width = cv.height = R; const g = cv.getContext('2d'); const img = g.createImageData(R, R);
    for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) {
      const x = -WORLD.half + (i + 0.5) / R * WORLD.half * 2, z = -WORLD.half + (j + 0.5) / R * WORLD.half * 2;
      const h = Terrain.getH(x, z); let r, gg, b;
      if (h < 0) { const d = clamp(-h / 24, 0, 1); r = lerp(120, 40, d); gg = lerp(205, 105, d); b = lerp(210, 170, d); if (Math.hypot(x - P.lagoon.x, z - P.lagoon.z) < 56) { r = 90; gg = 210; b = 200; } }
      else { const c = terrainColor(x, z, h, Terrain.normalSlope(x, z)); r = Math.pow(c[0], 1 / 2.2) * 255; gg = Math.pow(c[1], 1 / 2.2) * 255; b = Math.pow(c[2], 1 / 2.2) * 255; const sh = 0.85 + 0.15 * clamp((Terrain.getH(x - 3, z - 3) - h) * -0.3 + 0.5, 0, 1); r *= sh; gg *= sh; b *= sh; }
      const k = (j * R + i) * 4; img.data[k] = r; img.data[k + 1] = gg; img.data[k + 2] = b; img.data[k + 3] = 255;
    }
    g.putImageData(img, 0, 0); this.mapCv = cv; this.mapR = R;
  },
  w2m(x, z, size) { return [((x + WORLD.half) / (WORLD.half * 2)) * size, ((z + WORLD.half) / (WORLD.half * 2)) * size]; },
  drawMinimap() {
    const g = this.mini, S = 168, half = S / 2; const span = 110; // world units radius
    g.save(); g.clearRect(0, 0, S, S); g.beginPath(); g.arc(half, half, half - 2, 0, TAU); g.clip();
    const [mx, mz] = this.w2m(P1.x, P1.z, this.mapR); const pr = (span / (WORLD.half * 2)) * this.mapR;
    g.fillStyle = '#2a6aa0'; g.fillRect(0, 0, S, S);
    g.drawImage(this.mapCv, mx - pr, mz - pr, pr * 2, pr * 2, 0, 0, S, S);
    const toS = (x, z) => [half + ((x - P1.x) / span) * half, half + ((z - P1.z) / span) * half];
    // chests (charm)
    if (G.flags.charm) for (const c of Chests) { if (c.opened || (c.opt.cond && !c.opt.cond())) continue; const [sx, sy] = toS(c.x, c.z); g.fillStyle = '#ffd34d'; g.fillRect(sx - 2.5, sy - 2.5, 5, 5); }
    // objectives
    for (const o of Obj.list) { const t = o.target && o.target(); if (!t) continue; let [sx, sy] = toS(t.x, t.z); const dx = sx - half, dy = sy - half, d = Math.hypot(dx, dy); const lim = half - 10; if (d > lim) { sx = half + (dx / d) * lim; sy = half + (dy / d) * lim; } g.fillStyle = o.main ? '#f0c869' : '#9fd8ec'; g.strokeStyle = '#1d2740'; g.lineWidth = 2; g.beginPath(); g.moveTo(sx, sy - 6); g.lineTo(sx + 5, sy); g.lineTo(sx, sy + 6); g.lineTo(sx - 5, sy); g.closePath(); g.fill(); g.stroke(); }
    // enemies
    for (const e of Enemies.list) { if (e.dead || e.kind === 'dummy' || e.kind === 'crow') continue; const [sx, sy] = toS(e.x, e.z); g.fillStyle = '#ff5a4a'; g.beginPath(); g.arc(sx, sy, e.kind === 'captain' ? 4 : 2.5, 0, TAU); g.fill(); }
    // companion
    if (Comp.C && !Comp.mounted) { const [sx, sy] = toS(Comp.x, Comp.z); g.fillStyle = '#f28aa5'; g.beginPath(); g.arc(sx, sy, 3.5, 0, TAU); g.fill(); }
    // player arrow
    g.translate(half, half); g.rotate(Math.PI - P1.yaw); g.fillStyle = '#fff'; g.strokeStyle = '#1d2740'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -8); g.lineTo(6, 6); g.lineTo(0, 3); g.lineTo(-6, 6); g.closePath(); g.fill(); g.stroke();
    g.restore();
  },
  toggleMap(on) {
    this.mapOpen = on ?? !this.mapOpen; $('mapOverlay').classList.toggle('show', this.mapOpen);
    if (this.mapOpen) { this.layoutMap(); Audio.sfx('ui'); }
  },
  layoutMap() { const c = $('bigmap'); const s = Math.min(innerWidth * 0.86, innerHeight * 0.8) | 0; c.width = c.height = s; this.bigSize = s; },
  drawMap() {
    const c = $('bigmap'); const g = c.getContext('2d'); const S = this.bigSize || c.width;
    g.clearRect(0, 0, S, S); g.drawImage(this.mapCv, 0, 0, S, S);
    const toS = (x, z) => this.w2m(x, z, S);
    g.font = '600 13px "Alegreya Sans", system-ui, sans-serif'; g.textAlign = 'center';
    // region labels
    const regs = [['Hearthvale', 0, 30], ['Frostpeak Mountains', -60, -300], ["Dragon's Nest", P.nest.x, P.nest.z + 80], ['Sunspill Beach', 60, 205], ['Mermaid Lagoon', P.lagoon.x, P.lagoon.z + 72], ['The Blackwake', Ship.x, Ship.z + 46]];
    g.font = 'italic 700 17px "Alegreya", Georgia, serif';
    for (const [n, x, z] of regs) { const [sx, sy] = toS(x, z); g.lineWidth = 4; g.strokeStyle = 'rgba(29,39,64,.75)'; g.strokeText(n, sx, sy); g.fillStyle = '#f7f1e3'; g.fillText(n, sx, sy); }
    g.font = '600 12px "Alegreya Sans", system-ui, sans-serif';
    for (const L of Landmarks) { if (!G.landmarks[L.id]) continue; const [sx, sy] = toS(L.x, L.z); g.fillStyle = '#f0c869'; g.beginPath(); g.arc(sx, sy, 3, 0, TAU); g.fill(); g.lineWidth = 3; g.strokeStyle = 'rgba(29,39,64,.8)'; g.strokeText(L.name, sx, sy - 7); g.fillStyle = '#fff'; g.fillText(L.name, sx, sy - 7); }
    if (G.flags.charm) for (const ch of Chests) { if (ch.opened || (ch.opt.cond && !ch.opt.cond())) continue; const [sx, sy] = toS(ch.x, ch.z); g.fillStyle = '#ffd34d'; g.strokeStyle = '#1d2740'; g.lineWidth = 1.5; g.fillRect(sx - 4, sy - 3, 8, 6); g.strokeRect(sx - 4, sy - 3, 8, 6); }
    for (const o of Obj.list) { const t = o.target && o.target(); if (!t) continue; const [sx, sy] = toS(t.x, t.z); g.fillStyle = o.main ? '#f0c869' : '#9fd8ec'; g.strokeStyle = '#1d2740'; g.lineWidth = 2; g.beginPath(); g.moveTo(sx, sy - 9); g.lineTo(sx + 7, sy); g.lineTo(sx, sy + 9); g.lineTo(sx - 7, sy); g.closePath(); g.fill(); g.stroke(); }
    const [px, py] = toS(P1.x, P1.z); g.save(); g.translate(px, py); g.rotate(Math.PI - P1.yaw); g.fillStyle = '#fff'; g.strokeStyle = '#1d2740'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 8); g.lineTo(0, 4); g.lineTo(-8, 8); g.closePath(); g.fill(); g.stroke(); g.restore();
  },
};
