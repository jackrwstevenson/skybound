// ───────────────────────── trailer: scripted 30-second cinematic + video recorder ─────────────────────────
// Plays a sequence of camera shots through the real game world with dedicated actors, composites
// letterbox + captions onto a 1920×1080 2D canvas, and (optionally) records it with MediaRecorder.
const TR_W = 1920, TR_H = 1080;
const _tv = new THREE.Vector3(), _tv2 = new THREE.Vector3();

const TR_CAPTIONS = [
  [0.5, 3.2, 'Every legend begins small'],
  [3.9, 7.2, 'Choose a friend for life'],
  [7.9, 10.8, 'Learn to ride. Learn to glide.'],
  [11.5, 15.7, 'Grow up and take to the skies'],
  [16.25, 18.8, 'Earn the trust of ancient dragons'],
  [19.3, 22.2, 'Swim with the mermaids'],
  [22.8, 26.2, 'Face the Blackwake together'],
];
const TR_CUTS = [3.5, 7.5, 11, 16, 19, 22.5, 26.5]; // soft dips to black (24.3 is a hard cut)

const Trailer = {
  active: false, record: false, type: 'ember', T: 0, lastT: 0, phase: 'off', shot: null, shotIdx: -1, f: {}, shake: 0, flash: 0,
  camS: null, look: new THREE.Vector3(), saved: null, rec: null, chunks: [], cancelled: false, url: null,

  // ───── menu ─────
  initUI() {
    const pick = $('trPick');
    pick.querySelectorAll('.chip').forEach((b) => (b.onclick = () => { this.type = b.dataset.type; pick.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === b)); Audio.sfx('ui'); }));
    $('trRec').onclick = () => { $('trailerModal').classList.remove('show'); this.start(true); };
    $('trWatch').onclick = () => { $('trailerModal').classList.remove('show'); this.start(false); };
    $('trCancel').onclick = () => { $('trailerModal').classList.remove('show'); Audio.sfx('ui'); };
    $('trAgain').onclick = () => { this.closeDone(); this.openMenu(); };
    $('trClose').onclick = () => { this.closeDone(); Audio.sfx('ui'); };
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.active) { const wasRec = this.record; this.finish(true); if (wasRec) setTimeout(() => UI.toast('Recording stopped because the tab was hidden. Keep the tab visible while recording.', 'info'), 300); } });
  },
  canRecord() { return !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream); },
  openMenu() {
    const ok = this.canRecord();
    $('trRec').disabled = !ok;
    $('trNote').textContent = ok ? 'Keep this tab open and visible while it records — it takes 30 seconds.' : 'This browser can’t record video directly. You can still watch the trailer and capture it with your computer’s screen recorder.';
    $('trailerModal').classList.add('show');
  },
  closeDone() { $('trailerDone').classList.remove('show'); const v = $('trVideo'); try { v.pause(); } catch (e) {} },

  // ───── setup ─────
  buildActors() {
    const t = this.type, pal = PALETTES[t][0];
    this.root = new THREE.Group(); W.scene.add(this.root);
    this.H = [0, 1, 2, 3].map((s) => { const H = buildHuman(playerLook(s)); this.root.add(H.root); return H; });
    this.C = [0, 1, 2, 3].map((s) => { const C = buildCreature(t, s, pal); this.root.add(C.root); return C; });
    this.mer = buildMermaid({ hair: 0xe2573a, tail: 0x3fc3b0, fin: 0x9cf0e0 }); this.mer.root.scale.setScalar(1.4); this.root.add(this.mer.root);
    const kinds = ['deckhand', 'deckhand', 'gunner', 'brute', 'deckhand', 'captain'];
    this.pirates = kinds.map((k) => { const H = buildPirate(k); setHumanWeapon(H, k === 'brute' ? 'anchor' : k === 'gunner' ? null : k === 'captain' ? 'saber' : 'cutlass'); this.root.add(H.root); return { H, kind: k, x: 0, y: 0, z: 0, yaw: 0, vx: 0, vy: 0, vz: 0, flying: false, splashed: false }; });
  },
  removeActors() { if (this.root) { W.scene.remove(this.root); this.root = null; } },
  hideAll() {
    for (const H of this.H) { this.root.add(H.root); H.root.visible = false; H.root.rotation.set(0, 0, 0); H.root.position.set(0, 0, 0); }
    for (const C of this.C) C.root.visible = false;
    this.mer.root.visible = false;
    for (const p of this.pirates) p.H.root.visible = false;
  },
  ride(H, C) { C.root.add(H.root); H.root.visible = true; C.root.visible = true; },
  poseRider(H, C, dt, o = {}) {
    animateHuman(H, { mode: 'ride', speed: o.speed ?? 10, lean: o.lean || 0, boost: !!o.boost, celebrate: !!o.celebrate }, dt);
    H.root.position.set(0, C.seatY + C.scaler.position.y, C.seatZ);
    H.root.rotation.set(-(o.pitch || 0) * 0.5, 0, -(o.lean || 0) * 0.8);
  },
  placeC(C, x, y, z, yaw) { C.root.position.set(x, y, z); C.root.rotation.set(0, yaw, 0); },
  placeH(H, x, y, z, yaw) { H.root.position.set(x, y, z); H.root.rotation.set(0, yaw, 0); },
  focusAt(x, y, z) { P1.x = x; P1.y = y; P1.z = z; this.focus = { x, y, z }; },
  cam(px, py, pz, lx, ly, lz) {
    let sx = 0, sy = 0;
    if (this.shake > 0) { sx = (Math.random() - 0.5) * this.shake; sy = (Math.random() - 0.5) * this.shake; }
    W.camera.position.set(px + sx, py + sy, pz);
    this.look.set(lx, ly, lz); W.camera.lookAt(this.look);
  },
  smoothCam(tx, ty, tz, lambda, dt) {
    if (!this.camS) this.camS = new THREE.Vector3(tx, ty, tz);
    else { this.camS.x = damp(this.camS.x, tx, lambda, dt); this.camS.y = damp(this.camS.y, ty, lambda, dt); this.camS.z = damp(this.camS.z, tz, lambda, dt); }
    return this.camS;
  },
  setFov(f) { if (W.camera.fov !== f) { W.camera.fov = f; W.camera.updateProjectionMatrix(); } },
  once(k, cond, fn) { if (cond && !this.f[k]) { this.f[k] = 1; fn(); } },
  setFog(region) {
    const under = region === 'under';
    W.fog.color.copy(linColor(under ? 0x3aa8b8 : REGION_INFO[region].fog));
    W.fog.near = under ? 6 : region === 'nest' ? 70 : region === 'frost' ? 120 : 140;
    W.fog.far = under ? 70 : region === 'nest' ? 340 : 520;
    W.scene.background.copy(W.fog.color);
    W.sky.visible = !under;
    curRegion = under ? 'lagoon' : region;
  },
  ambience(wind, waves) {
    if (!Audio.ctx) return;
    const now = Audio.ctx.currentTime;
    Audio.windGain.gain.setTargetAtTime(wind * 0.35, now, 0.3);
    Audio.windFilter.frequency.setTargetAtTime(300 + wind * 900, now, 0.3);
    Audio.wavesGain.gain.setTargetAtTime(waves * 0.12, now, 0.4);
  },
  elemColor() { return this.type === 'ember' ? 0xff9a4a : this.type === 'cloud' ? 0xeaf6ff : 0x9ff3ff; },
  trails(C, col, s = 0.4) { const tips = creatureWingTips(C, []); for (const t of tips) FX.trail(t.x, t.y, t.z, col, s); },

  // 3D Catmull-Rom path with arc-length lookup
  makePath(pts, per = 24) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let s = 0; s < per; s++) {
        const t = s / per, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y), z: f(p0.z, p1.z, p2.z, p3.z) });
      }
    }
    out.push(Object.assign({}, pts[pts.length - 1]));
    const L = [0]; for (let i = 1; i < out.length; i++) L.push(L[i - 1] + dist3d(out[i], out[i - 1]));
    const at = (d) => {
      d = clamp(d, 0, L[L.length - 1]); let i = 1; while (i < L.length - 1 && L[i] < d) i++;
      const k = (d - L[i - 1]) / ((L[i] - L[i - 1]) || 1), a = out[i - 1], b = out[i];
      return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) };
    };
    const tan = (d) => { const a = at(d - 1), b = at(d + 1); const l = dist3d(a, b) || 1; return { x: (b.x - a.x) / l, y: (b.y - a.y) / l, z: (b.z - a.z) / l }; };
    return { pts: out, L, total: L[L.length - 1], at, tan, nodeD: (j) => L[Math.min(L.length - 1, j * per)] };
  },

  // ───── the shots ─────
  buildShots() {
    const S = Spots, tr = this;
    const shots = [];
    // 1 — village, child and hatchling
    shots.push({ dur: 3.5, region: 'village', sky: 0.27, fov: 45, wind: 0.05, waves: 0,
      enter() { tr.H[0].root.visible = true; tr.C[0].root.visible = true; tr.last = null; },
      update(t, k, dt) {
        const A = { x: -12, z: 14 }, B = { x: -6.5, z: 9.8 };
        const kk = easeInOut(clamp(t / 2.6, 0, 1));
        const x = lerp(A.x, B.x, kk), z = lerp(A.z, B.z, kk), y = Terrain.getH(x, z);
        const sp = tr.last ? Math.hypot(x - tr.last.x, z - tr.last.z) / Math.max(dt, 1e-3) : 0; tr.last = { x, z };
        const ang = t * 2.6, hx = x + Math.cos(ang) * 1.5, hz = z + Math.sin(ang) * 1.5;
        const walkYaw = Math.atan2(B.x - A.x, B.z - A.z), hatchYaw = Math.atan2(hx - x, hz - z);
        tr.placeH(tr.H[0], x, y, z, t < 2.6 ? walkYaw : dampAngle(tr.H[0].root.rotation.y, hatchYaw, 6, dt));
        animateHuman(tr.H[0], { speed: sp, mode: 'walk', wave: t > 2.7 }, dt);
        tr.placeC(tr.C[0], hx, Terrain.getH(hx, hz), hz, Math.atan2(-Math.sin(ang), Math.cos(ang)));
        animateCreature(tr.C[0], { speed: 4, mood: 'happy', hop: Math.abs(Math.sin(t * 8)) * 0.22, lookAt: _tv.set(x, y + 1, z) }, dt);
        tr.once('chirp', t > 1.2, () => Audio.sfx('creature', { type: tr.type, mood: 'happy', stage: 0 }));
        tr.focusAt(x, y + 0.6, z);
        const py = Terrain.getH(P.plaza.x, P.plaza.z);
        tr.cam(lerp(-1, -2.2, k), py + lerp(4.2, 2.7, k), lerp(19, 15.8, k), lerp(x, P.plaza.x, 0.3), py + 1.0, lerp(z, P.plaza.z, 0.3));
      } });
    // 2 — the nursery
    shots.push({ dur: 4, region: 'village', sky: 0.3, fov: 45, wind: 0.05, waves: 0,
      enter() { tr.H[0].root.visible = true; tr.saved.bonding = G.flags.bonding; G.flags.bonding = true; },
      update(t, k, dt) {
        const N = S.nursery; const x = N.x + 0.8, z = N.z + 1.2, y = Terrain.getH(x, z);
        tr.placeH(tr.H[0], x, y, z, Math.atan2(-0.8, -1.2));
        animateHuman(tr.H[0], { speed: 0, mode: 'walk', pet: t > 0.3 && t < 2.2 ? 1 : 0, celebrate: t > 2.6 }, dt);
        tr.focusAt(x, y + 0.6, z);
        tr.once('excite', t > 1.0, () => Hatch.list.forEach((h, i) => { h.reactT = 2.8; h.reactMood = 'celebrate'; setTimeout(() => Audio.sfx('creature', { type: h.type, mood: 'happy', stage: 0 }), i * 180); }));
        tr.once('hearts', t > 2.2, () => { FX.hearts(x, y + 1.4, z); Audio.sfx('heart'); });
        const ang = lerp(0.85, 1.5, k), r = lerp(8, 6.5, k);
        tr.cam(N.x + Math.cos(ang) * r, N.y + lerp(3.4, 2.4, k), N.z + Math.sin(ang) * r, N.x + 0.4, N.y + 0.8, N.z + 0.6);
      } });
    // 3 — teen rides and glides off Lookout Hill
    shots.push({ dur: 3.5, region: 'village', sky: 0.36, fov: 50, wind: 0.4, waves: 0,
      enter() { tr.ride(tr.H[1], tr.C[1]); tr.camS = null; },
      update(t, k, dt) {
        const L = S.lookout, top = Terrain.getH(L.x, L.z);
        const dl = Math.hypot(0.99, -0.12), dir = { x: 0.99 / dl, z: -0.12 / dl }, yaw = Math.atan2(dir.x, dir.z);
        let x, y, z, cs;
        if (t < 0.8) {
          const d = -5 + t * 7; x = L.x + dir.x * d; z = L.z + dir.z * d; y = Terrain.getH(x, z);
          tr.placeC(tr.C[1], x, y, z, yaw);
          animateCreature(tr.C[1], { speed: 9, mood: 'happy' }, dt);
          cs = { lean: 0, speed: 9 };
        } else {
          const s = t - 0.8, d = 0.6 + s * 13; x = L.x + dir.x * d; z = L.z + dir.z * d;
          y = Math.max(top + 3 * Math.sin(Math.min(1, s / 0.5) * Math.PI / 2) - Math.max(0, s - 0.5) * 3.2, Terrain.getH(x, z) + 1.2);
          tr.placeC(tr.C[1], x, y, z, yaw);
          const bank = Math.sin(s * 1.5) * 0.15;
          animateCreature(tr.C[1], { fly: true, flap: s < 0.4 ? 1 : 0.08, flapRate: s < 0.4 ? 9 : 1.2, bank, pitch: -0.1, mood: 'happy' }, dt);
          cs = { lean: bank, speed: 13 };
          tr.once('leap', true, () => { Audio.sfx('wing', { v: 1.6 }); Audio.sfx('whoosh'); FX.dust(x, Terrain.getH(x, z), z, 14); });
          if (s > 0.6) tr.trails(tr.C[1], 0xffffff, 0.25);
        }
        tr.poseRider(tr.H[1], tr.C[1], dt, cs);
        tr.focusAt(x, y + 1, z);
        const side = { x: -dir.z, z: dir.x }; // south side of the path
        let cx = x + side.x * 12 - dir.x * 2, cz = z + side.z * 12 - dir.z * 2;
        let cy = Math.max(y + 2, Terrain.getH(cx, cz) + 2);
        const c = tr.smoothCam(cx, cy, cz, 6, dt);
        tr.cam(c.x, c.y, c.z, x + dir.x * 4, y + 0.8, z + dir.z * 4);
      } });
    // 4 — adult flight through the Frostpeak arches
    shots.push({ dur: 5, region: 'frost', sky: 0.42, fov: 58, wind: 1, waves: 0,
      enter() {
        tr.ride(tr.H[2], tr.C[2]); tr.camS = null; tr.bank = 0; tr.lastYaw = null;
        const a = S.arches.slice(0, 4);
        const t0 = { x: a[1].x - a[0].x, y: 0, z: a[1].z - a[0].z }; const l0 = Math.hypot(t0.x, t0.z);
        const n = a.length - 1, t1 = { x: a[n].x - a[n - 1].x, z: a[n].z - a[n - 1].z }; const l1 = Math.hypot(t1.x, t1.z);
        const lead = { x: a[0].x - (t0.x / l0) * 22, y: a[0].y - 3, z: a[0].z - (t0.z / l0) * 22 };
        const tail = { x: a[n].x + (t1.x / l1) * 20, y: a[n].y + 2, z: a[n].z + (t1.z / l1) * 20 };
        tr.path = tr.makePath([lead, ...a.map((p) => ({ x: p.x, y: p.y, z: p.z })), tail]);
        tr.archs = a;
      },
      update(t, k, dt) {
        const pth = tr.path, d = (pth.total - 8) * (t / 5);
        const p = pth.at(d), tn = pth.tan(d), yaw = Math.atan2(tn.x, tn.z);
        const rate = tr.lastYaw === null ? 0 : wrapAngle(yaw - tr.lastYaw) / Math.max(dt, 1e-3); tr.lastYaw = yaw;
        tr.bank = damp(tr.bank, clamp(rate * 0.35, -0.8, 0.8), 4, dt);
        const pitch = clamp(tn.y * 1.2, -0.5, 0.5);
        tr.placeC(tr.C[2], p.x, p.y, p.z, yaw);
        const boost = t < 1.6;
        animateCreature(tr.C[2], { fly: true, flap: tn.y > 0.05 || boost ? 1 : 0.55, bank: tr.bank, pitch, mood: 'happy' }, dt);
        tr.poseRider(tr.H[2], tr.C[2], dt, { lean: tr.bank, boost, pitch, speed: 24 });
        tr.trails(tr.C[2], boost ? tr.elemColor() : 0xffffff, boost ? 0.5 : 0.3);
        tr.once('boost', true, () => { Audio.sfx('gust'); tr.shake = 0.25; });
        tr.archs.forEach((a, i) => tr.once('arch' + i, d >= pth.nodeD(i + 1) - 2, () => { Audio.sfx('whoosh'); FX.sparkle(a.x, a.y, a.z, 0x9ff3ff, 30); }));
        tr.focusAt(p.x, p.y + 1, p.z);
        const side = { x: -tn.z, z: tn.x };
        let tx = p.x - tn.x * 11 + side.x * 1.5, tz = p.z - tn.z * 11 + side.z * 1.5, ty = p.y - tn.y * 11 + 3.2;
        const c = tr.smoothCam(tx, ty, tz, 5, dt);
        c.y = Math.max(c.y, Terrain.getH(c.x, c.z) + 3);
        tr.cam(c.x, c.y, c.z, p.x + tn.x * 5, p.y + tn.y * 5 + 0.5, p.z + tn.z * 5);
      } });
    // 5 — over the Dragon's Nest; Ashka roars fire into the sky
    shots.push({ dur: 3, region: 'nest', sky: 0.45, fov: 50, wind: 0.5, waves: 0,
      enter() { tr.ride(tr.H[2], tr.C[2]); },
      update(t, k, dt) {
        const en = S.elderNest, c0 = P.nest;
        const dl = Math.hypot(en.x - c0.x, en.z - c0.z) || 1, dir = { x: (en.x - c0.x) / dl, z: (en.z - c0.z) / dl }, perp = { x: -dir.z, z: dir.x };
        const s = lerp(-26, 22, k);
        const x = en.x + perp.x * s - dir.x * 4, z = en.z + perp.z * s - dir.z * 4;
        const y = Math.max(en.y + 19 - 3 * k, Terrain.getH(x, z) + 6);
        const yaw = Math.atan2(perp.x, perp.z);
        tr.placeC(tr.C[2], x, y, z, yaw);
        animateCreature(tr.C[2], { fly: true, flap: 0.6, bank: -0.25, pitch: -0.05, mood: 'happy' }, dt);
        tr.poseRider(tr.H[2], tr.C[2], dt, { lean: -0.25, speed: 22 });
        tr.trails(tr.C[2], 0xffffff, 0.3);
        tr.focusAt(x, y, z);
        const head = Nest.ashka.C.headPivot.getWorldPosition(_tv2);
        tr.once('roar', t > 0.7, () => { Audio.sfx('roar'); Audio.sfx('fire'); tr.shake = 0.35; });
        if (t > 0.75 && t < 1.8) {
          const fx = x - head.x, fy = y - head.y, fz = z - head.z, fl = Math.hypot(fx, fy, fz) || 1;
          for (let i = 0; i < 6; i++) FX.fire(head.x, head.y, head.z, (fx / fl) * 24 + rand(-3, 3), (fy / fl) * 24 + rand(-2, 2), (fz / fl) * 24 + rand(-3, 3), 2.4);
        }
        const cx = c0.x + dir.x * 12, cz = c0.z + dir.z * 12, cy = Math.max(Terrain.getH(cx, cz), 26.2) + 3.5;
        tr.cam(cx, cy + k * 0.8, cz, lerp(head.x, x, 0.45), lerp(head.y, y, 0.45), lerp(head.z, z, 0.45));
      } });
    // 6 — underwater with a mermaid
    shots.push({ dur: 3.5, region: 'under', sky: 0.45, fov: 50, wind: 0, waves: 0.1,
      enter() { tr.ride(tr.H[2], tr.C[2]); tr.mer.root.visible = true; tr.camS = null; Audio.sfx('splash'); },
      update(t, k, dt) {
        const LG = P.lagoon;
        const x = LG.x - 18 + 30 * k, z = LG.z + 6 - 8 * k, y = -9 + Math.sin(t * 2.2) * 0.7;
        const yaw = Math.atan2(30, -8), fwd = { x: Math.sin(yaw), z: Math.cos(yaw) }, side = { x: -fwd.z, z: fwd.x };
        tr.placeC(tr.C[2], x, y, z, yaw);
        animateCreature(tr.C[2], { swim: true, speed: 8, mood: 'happy' }, dt);
        tr.poseRider(tr.H[2], tr.C[2], dt, { speed: 8 });
        const mx = x + fwd.x * 1.2 + side.x * 2.6, mz = z + fwd.z * 1.2 + side.z * 2.6, my = y + 1.2 + Math.sin(t * 1.7) * 0.4;
        tr.mer.root.position.set(mx, my, mz); tr.mer.root.rotation.set(0, yaw, 0); animateMermaid(tr.mer, { sit: false }, dt);
        if (Math.random() < dt * 14) FX.bubble(x + rand(-1, 1), y + 1.5, z + rand(-1, 1));
        if (Math.random() < dt * 6) FX.bubble(mx, my + 1, mz, 0, 1, 0, 0.25);
        tr.once('bub', t > 0.4, () => Audio.sfx('bubble'));
        tr.focusAt(x, y, z);
        const tx = x + fwd.x * 6 + side.x * 7, tz = z + fwd.z * 6 + side.z * 7;
        const c = tr.smoothCam(tx, clamp(y - 1, Terrain.getH(tx, tz) + 2, -2.5), tz, 5, dt);
        tr.cam(c.x, c.y, c.z, x + side.x * 1.2, y + 0.6, z + side.z * 1.2);
      } });
    // 7a — swooping in on the Blackwake under cannon fire
    const bez = (u) => {
      const p0 = shipLocal(55, 40), p1 = shipLocal(20, 18), p2 = shipLocal(2, 0);
      const y0 = 30, y1 = 22, y2 = Ship.deck, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
      return { x: a * p0.x + b * p1.x + c * p2.x, y: a * y0 + b * y1 + c * y2, z: a * p0.z + b * p1.z + c * p2.z };
    };
    const piratesFace = (dt, tx, tz, raise) => {
      for (const p of tr.pirates) {
        if (p.flying || !p.H.root.visible) continue;
        p.yaw = dampAngle(p.yaw, Math.atan2(tx - p.x, tz - p.z), 6, dt);
        p.H.root.position.set(p.x, p.y, p.z); p.H.root.rotation.set(0, p.yaw, 0);
        animateHuman(p.H, { speed: 0, mode: 'walk', wave: p.kind === 'captain', attack: 0 }, dt);
        if (raise && p.kind !== 'captain') { p.H.arms[1].rotation.set(-2.2 + Math.sin(W.time * 9 + p.x) * 0.3, 0, 0.2); }
      }
    };
    shots.push({ dur: 1.8, region: 'ship', sky: 0.58, fov: 56, wind: 0.6, waves: 0.7,
      enter() {
        tr.ride(tr.H[3], tr.C[3]);
        const spots = [[-3, -3.5], [-6, 2.5], [6, -4], [-1, 4], [8, 3.5]];
        tr.pirates.forEach((p, i) => {
          const q = p.kind === 'captain' ? shipLocal(-Ship.L + 10, 0) : shipLocal(spots[i][0], spots[i][1]);
          p.x = q.x; p.z = q.z; p.y = p.kind === 'captain' ? Ship.aft : Ship.deck; p.flying = false; p.splashed = false; p.H.root.visible = true;
          p.yaw = Math.atan2(Spots.mainDeck.x - p.x, Spots.mainDeck.z - p.z);
        });
      },
      update(t, k, dt) {
        const u = k * 0.82, p = bez(u), p2 = bez(Math.min(1, u + 0.02));
        const yaw = Math.atan2(p2.x - p.x, p2.z - p.z), pitch = clamp((p2.y - p.y) / (Math.hypot(p2.x - p.x, p2.z - p.z) || 1), -0.5, 0.5);
        tr.placeC(tr.C[3], p.x, p.y, p.z, yaw);
        animateCreature(tr.C[3], { fly: true, flap: 0.7, bank: Math.sin(t * 2.5) * 0.3, pitch, mood: 'angry' }, dt);
        tr.poseRider(tr.H[3], tr.C[3], dt, { lean: Math.sin(t * 2.5) * 0.3, pitch, speed: 24 });
        tr.trails(tr.C[3], tr.elemColor(), 0.4);
        piratesFace(dt, p.x, p.z, true);
        [0.25, 0.75, 1.25].forEach((tt, i) => tr.once('flak' + i, t > tt, () => {
          const cn = Spots.cannons[(i * 2 + 1) % Spots.cannons.length];
          Audio.sfx('cannon'); FX.burst(cn.mx, Ship.deck + 0.8, cn.mz, 12, { speed: 3, life: 1.2, size: 1.5, size1: 3.5, color: 0xd8d0c8, alpha: 0.6 });
          const fx = { x: p.x + Math.sin(yaw) * 7 + rand(-4, 4), y: p.y + rand(-2, 3), z: p.z + Math.cos(yaw) * 7 + rand(-4, 4) };
          setTimeout(() => { Audio.sfx('boom'); FX.burst(fx.x, fx.y, fx.z, 30, { speed: 6, life: 0.6, size: 1.4, size1: 0.3, color: 0xffb347, color1: 0xff3a10, add: true }); FX.burst(fx.x, fx.y, fx.z, 10, { speed: 2, life: 1.4, size: 2, size1: 4, color: 0x5a5a5a, alpha: 0.5 }); tr.shake = 0.3; }, 220);
        }));
        tr.focusAt(p.x, p.y, p.z);
        const cp = shipLocal(10 - k * 2, 40);
        tr.cam(cp.x, 6 + k * 0.6, cp.z, lerp(p.x, Ship.x, 0.25), lerp(p.y, Ship.deck + 4, 0.3), lerp(p.z, Ship.z, 0.25));
      } });
    // 7b — landing on deck, Skybound Strike sends the crew overboard
    shots.push({ dur: 2.2, region: 'ship', sky: 0.6, fov: 52, wind: 0.2, waves: 0.7,
      enter() { tr.ride(tr.H[3], tr.C[3]); tr.pirates.forEach((p) => (p.H.root.visible = !p.splashed)); },
      update(t, k, dt) {
        const landed = t >= 0.45;
        const u = landed ? 1 : 0.82 + 0.18 * easeOut(t / 0.45), p = bez(u), pe = bez(1), pb = bez(0.9);
        const yaw = Math.atan2(pe.x - pb.x, pe.z - pb.z);
        tr.placeC(tr.C[3], p.x, p.y, p.z, yaw);
        const struck = t >= 0.85;
        if (!landed) animateCreature(tr.C[3], { fly: true, flap: 1, flapRate: 7, pitch: 0.3, mood: 'angry' }, dt);
        else animateCreature(tr.C[3], { speed: 0, mood: struck ? 'celebrate' : 'angry', flare: struck ? 0 : 1, lookAt: _tv.set(Ship.x, Ship.deck + 2, Ship.z) }, dt);
        tr.poseRider(tr.H[3], tr.C[3], dt, { speed: landed ? 0 : 10, celebrate: struck && t > 1.3 });
        tr.once('land', landed, () => { Audio.sfx('step', { v: 3 }); FX.dust(pe.x, Ship.deck, pe.z, 20); tr.shake = 0.35; });
        tr.once('strike', struck, () => {
          Audio.sfx('roar'); Audio.sfx('boom'); Audio.sfx('stage'); tr.shake = 0.9; tr.flash = 1;
          const col = tr.elemColor();
          for (let r = 0; r < 3; r++) setTimeout(() => { for (let i = 0; i < 60; i++) { const a = (i / 60) * TAU; FX.spawn({ x: pe.x, y: Ship.deck + 0.6, z: pe.z, vx: Math.cos(a) * (16 + r * 4), vz: Math.sin(a) * (16 + r * 4), vy: 1, life: 0.8, size: 1.4, size1: 0.3, color: col, add: true, drag: 1.5 }); } }, r * 110);
          FX.burst(pe.x, Ship.deck + 2, pe.z, 50, { speed: 10, life: 1.1, size: 1, size1: 0.1, color: 0xffe08a, add: true, up: 4 });
          for (const pr of tr.pirates) {
            if (pr.kind === 'captain') continue;
            const dx = pr.x - pe.x, dz = pr.z - pe.z, dd = Math.hypot(dx, dz) || 1;
            pr.flying = true; pr.vx = (dx / dd) * rand(11, 14); pr.vz = (dz / dd) * rand(11, 14); pr.vy = rand(8.5, 10.5); pr.spin = rand(6, 10) * (Math.random() < 0.5 ? -1 : 1);
          }
        });
        for (const pr of tr.pirates) {
          if (!pr.flying || pr.splashed) continue;
          pr.vy -= 22 * dt; pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.z += pr.vz * dt;
          pr.H.root.position.set(pr.x, pr.y, pr.z); pr.H.root.rotation.x += pr.spin * dt;
          animateHuman(pr.H, { speed: 0, mode: 'walk', hurt: 1 }, dt);
          if (pr.y < 0.2) { pr.splashed = true; pr.H.root.visible = false; FX.splash(pr.x, 0, pr.z, 30); Audio.sfx('splash'); }
        }
        piratesFace(dt, pe.x, pe.z, !struck);
        if (struck) { const cap = tr.pirates.find((q) => q.kind === 'captain'); animateHuman(cap.H, { speed: 0, mode: 'walk', hurt: 1, wave: true }, dt); }
        tr.focusAt(pe.x, Ship.deck + 1, pe.z);
        const cp = shipLocal(13, 5.0), lk = shipLocal(-1, 0);
        tr.cam(cp.x, Ship.deck + 3.0, cp.z, lk.x, Ship.deck + 1.8, lk.z);
      } });
    // 8 — sunset beneath the Elder Tree; title card
    shots.push({ dur: 3.5, region: 'village', sky: 0.86, fov: 45, wind: 0.05, waves: 0,
      enter() {
        tr.H[3].root.visible = true; tr.C[3].root.visible = true;
        tr.pirates.forEach((p) => (p.H.root.visible = false));
        Audio.sfx('bell');
      },
      update(t, k, dt) {
        const et = S.elderTree, ety = Terrain.getH(et.x, et.z);
        const hx = et.x + 6.2, hz = et.z + 3.6, hy = Terrain.getH(hx, hz);
        const kk = easeInOut(k);
        const cx = et.x + lerp(7, 10, kk), cy = ety + lerp(2.4, 10, kk), cz = et.z + lerp(13, 24, kk);
        tr.placeH(tr.H[3], hx, hy, hz, Math.atan2(cx - hx, cz - hz));
        animateHuman(tr.H[3], { speed: 0, mode: 'sit' }, dt);
        const qx = et.x + 8.2, qz = et.z + 2.4;
        tr.placeC(tr.C[3], qx, Terrain.getH(qx, qz), qz, Math.atan2(hx - qx, hz - qz) + 0.6);
        animateCreature(tr.C[3], { speed: 0, sit: true, mood: 'happy', lookAt: _tv.set(hx, hy + 1.2, hz) }, dt);
        if (Math.random() < dt * 6) FX.petal(et.x, ety + 12, et.z);
        [0.6, 1.2, 1.8].forEach((tt, i) => tr.once('fw' + i, t > tt, () => Fireworks.launch(et.x + [-14, 6, 18][i], ety + 26 + i * 3, et.z + [-6, -14, 2][i])));
        tr.focusAt(hx, hy + 0.8, hz);
        tr.cam(cx, cy, cz, et.x + lerp(6, 1, kk), ety + lerp(1.3, 6, kk), et.z + lerp(3.4, 0, kk));
      } });
    let t0 = 0; for (const s of shots) { s.t0 = t0; t0 += s.dur; }
    this.DUR = t0;
    return shots;
  },

  // ───── music score (scheduled with lookahead against the audio clock) ─────
  section(t) { return t < 7.5 ? 'wonder' : t < 16 ? 'soar' : t < 19 ? 'dragon' : t < 22.5 ? 'lagoon' : t < 26.5 ? 'battle' : 'finale'; },
  buildScore() {
    const ev = [], A = Audio, tr = this;
    const add = (t, fn) => ev.push({ t, fn });
    const m = (n) => A.mtof(n);
    const tone = (t, n, d, o) => add(t, (dl) => A.tone(m(n), d, Object.assign({ delay: dl, dest: tr.bus }, o)));
    const kick = (t, v = 0.4) => add(t, (dl) => A.tone(150, 0.32, { type: 'sine', vol: v, slide: 0.3, delay: dl, dest: tr.bus }));
    const snare = (t, v = 0.16) => add(t, (dl) => A.noise(0.16, { vol: v, freq: 1900, q: 0.6, delay: dl }));
    const hat = (t, v = 0.05) => add(t, (dl) => A.noise(0.05, { vol: v, freq: 7000, q: 1.2, delay: dl }));
    const timp = (t, v = 0.35) => add(t, (dl) => { A.tone(90, 0.9, { type: 'sine', vol: v, slide: 0.7, delay: dl, dest: tr.bus }); A.noise(0.5, { vol: 0.12, freq: 200, type: 'lowpass', delay: dl }); });
    const chords = [
      [0, 2, 60, 'M'], [2, 2, 57, 'm'], [4, 2, 53, 'M'], [6, 1.5, 55, 'M'],
      [7.5, 2, 60, 'M'], [9.5, 2, 55, 'M'], [11.5, 2, 57, 'm'], [13.5, 2.5, 53, 'M'],
      [16, 1.5, 57, 'm'], [17.5, 1.5, 53, 'M'],
      [19, 1.75, 53, 'M'], [20.75, 1.75, 52, 'm'],
      [22.5, 1, 57, 'm'], [23.5, 1, 53, 'M'], [24.5, 1, 55, 'M'], [25.5, 1, 52, 'm'],
      [26.5, 3.5, 60, 'M'],
    ];
    for (const [t0, d, r, q] of chords) {
      const tn = q === 'm' ? [0, 3, 7] : [0, 4, 7];
      const sec = this.section(t0);
      const padV = { wonder: 0.05, soar: 0.065, dragon: 0.05, lagoon: 0.045, battle: 0.06, finale: 0.085 }[sec];
      tn.forEach((o) => tone(t0, r - 12 + o, d + 0.4, { type: 'triangle', vol: padV, attack: 0.35, filter: 1400 }));
      tone(t0, r - 24, d + 0.3, { type: 'sine', vol: padV * 1.4, attack: 0.2 });
      if (sec === 'wonder') { const pat = [0, 1, 2, 1]; for (let b = 0; b * 0.5 < d - 0.01; b++) tone(t0 + b * 0.5, r + 12 + tn[pat[b % 4]], 0.9, { type: 'triangle', vol: 0.075, echo: true, filter: 3200 }); }
      if (sec === 'soar') {
        const ext = [tn[0], tn[1], tn[2], 12], pat = [0, 1, 2, 3, 2, 1, 2, 3];
        for (let b = 0; b * 0.25 < d - 0.01; b++) tone(t0 + b * 0.25, r + 12 + ext[pat[b % 8]], 0.45, { type: 'triangle', vol: 0.06, echo: b % 4 === 0, filter: 3200 });
        for (let b = 0; b * 0.5 < d - 0.01; b++) { kick(t0 + b * 0.5, 0.3); if (t0 >= 11.5) hat(t0 + b * 0.5 + 0.25); }
      }
      if (sec === 'dragon') {
        tone(t0, r - 24, d + 0.2, { type: 'sawtooth', vol: 0.07, filter: 420, attack: 0.1 });
        for (let b = 0; b * 0.75 < d - 0.01; b++) timp(t0 + b * 0.75, 0.3);
        tone(t0 + 0.375, r + 12 + tn[2], 0.7, { type: 'triangle', vol: 0.05, echo: true });
      }
      if (sec === 'lagoon') { const ext = [tn[0], tn[1], tn[2], 12, tn[1] + 12]; for (let b = 0; b * 0.125 < d - 0.01; b++) tone(t0 + b * 0.125, r + 24 + ext[b % 5], 0.35, { type: 'sine', vol: 0.035, echo: true }); }
      if (sec === 'battle') {
        add(t0, (dl) => tn.forEach((o) => A.tone(m(r + o), 0.35, { type: 'sawtooth', vol: 0.05, filter: 2000, delay: dl, dest: tr.bus })));
        for (let b = 0; b * 0.25 < d - 0.01; b++) {
          tone(t0 + b * 0.25, r - 12, 0.2, { type: 'square', vol: 0.04, filter: 800 });
          if (b % 2 === 0) kick(t0 + b * 0.25, 0.4);
          if (b % 4 === 2) snare(t0 + b * 0.25);
          hat(t0 + b * 0.25 + 0.125, 0.04);
        }
      }
      if (sec === 'finale') { [12, 16, 19, 24].forEach((o) => tone(t0, r + o, 3.6, { type: 'triangle', vol: 0.07, attack: 0.05, echo: true })); tone(t0, r - 12, 3.6, { type: 'sine', vol: 0.12, attack: 0.05 }); }
    }
    for (let i = 0; i < 8; i++) snare(26.0 + i * 0.0625, 0.06 + i * 0.02);            // roll into the title
    add(26.5, (dl) => A.noise(2.5, { vol: 0.18, freq: 6000, type: 'highpass', q: 0.5, delay: dl })); // crash
    add(6.6, (dl) => A.noise(0.9, { vol: 0.1, freq: 3000, q: 0.5, attack: 0.85, delay: dl }));     // swell into "soar"
    ev.sort((a, b) => a.t - b.t);
    return ev;
  },

  // ───── run ─────
  async start(record) {
    if (this.active) return;
    Audio.init(); Audio.resume();
    this.record = record && this.canRecord();
    this.active = true; W.trailerActive = true; this.phase = 'prep';
    this.saved = { mode: G.mode, x: P1.x, y: P1.y, z: P1.z, muted: Audio.muted, pr: W.renderer.getPixelRatio ? W.renderer.getPixelRatio() : 1, bonding: G.flags.bonding, region: curRegion };
    G.mode = 'trailer';
    document.body.classList.add('trailering');
    $('trailerHud').classList.add('show');
    $('trRecDot').style.display = this.record ? '' : 'none';
    $('trStatus').textContent = 'Preparing…';
    $('trEsc').textContent = this.record ? 'to stop' : 'to skip';
    P1.root.visible = false;
    if (this.record && Audio.muted) Audio.setMuted(false);
    // render at a fixed 1080p, regardless of the window
    if (W.renderer.setPixelRatio) W.renderer.setPixelRatio(1);
    W.renderer.setSize(TR_W, TR_H, false);
    W.camera.aspect = TR_W / TR_H; W.camera.updateProjectionMatrix();
    this.cv = $('trailerCv'); this.g2 = this.cv.getContext('2d');
    this.makeVignette();
    this.buildActors();
    this.shots = this.buildShots();
    this.shotIdx = -1; this.f = {}; this.shake = 0; this.flash = 0; this.T = -0.6; this.lastT = -0.6;
    // music bus
    if (Audio.ctx) {
      this.bus = Audio.ctx.createGain(); this.bus.gain.value = 0.9; this.bus.connect(Audio.master);
      Audio.music.padGain.gain.setTargetAtTime(0, Audio.ctx.currentTime, 0.2);
    }
    this.score = this.buildScore(); this.si = 0;
    // pose shot one, then compile every material so nothing hitches mid-take
    this.enterShot(0); this.shots[0].update(0, 0, 1 / 60);
    const hidden = []; W.scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
    try { if (W.renderer.compile) W.renderer.compile(W.scene, W.camera); } catch (e) { /* ignore */ }
    hidden.forEach((o) => (o.visible = false));
    try { if (document.fonts && document.fonts.load) await Promise.race([Promise.all([document.fonts.load('italic 700 58px "Alegreya"'), document.fonts.load('italic 800 200px "Alegreya"'), document.fonts.load('italic 500 60px "Alegreya"')]), new Promise((r) => setTimeout(r, 1500))]); } catch (e) { /* ignore */ }
    if (!this.active) return;
    // recorder
    if (this.record) {
      try {
        const stream = this.cv.captureStream(30);
        if (Audio.ctx && Audio.ctx.createMediaStreamDestination) { this.dest = Audio.ctx.createMediaStreamDestination(); Audio.comp.connect(this.dest); this.dest.stream.getAudioTracks().forEach((tk) => stream.addTrack(tk)); }
        const types = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1.4D0028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
        this.mime = types.find((tp) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(tp)) || '';
        this.rec = new MediaRecorder(stream, this.mime ? { mimeType: this.mime, videoBitsPerSecond: 10000000 } : { videoBitsPerSecond: 10000000 });
        const rec = this.rec, chunks = []; this.cancelled = false;
        rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onerror = (e) => { console.error(e); UI.toast('Recording failed in this browser. Try “Just watch” with a screen recorder.', 'info'); };
        rec.onstop = () => this.onRecorded(rec, chunks, this.cancelled);
        rec.start(250);
      } catch (e) { console.error(e); this.record = false; this.rec = null; $('trRecDot').style.display = 'none'; UI.toast('This browser couldn’t start recording — playing the trailer instead.', 'info'); }
    }
    if (Audio.ctx && Audio.ctx.state !== 'running') { try { await Promise.race([Audio.ctx.resume(), new Promise((r) => setTimeout(r, 500))]); } catch (e) { /* ignore */ } }
    this.audioT0 = Audio.ctx && Audio.ctx.state === 'running' ? Audio.ctx.currentTime + 0.6 : null;
    this.phase = 'run';
  },
  clock(dtRaw) {
    // advance with frame time, gently locked to the audio clock (which moves in coarse buffer steps)
    let T = this.T + dtRaw;
    if (this.audioT0 !== null && Audio.ctx && Audio.ctx.state === 'running') {
      const a = Audio.ctx.currentTime - this.audioT0, e = a - T;
      T = Math.abs(e) > 0.25 ? a : T + e * 0.1;
    }
    return T;
  },
  enterShot(i) {
    this.shotIdx = i; const s = this.shots[i]; this.shot = s;
    this.hideAll(); this.f = {}; this.camS = null;
    this.setFov(s.fov); this.setFog(s.region); skyOverride = s.sky; this.ambience(s.wind, s.waves);
    s.enter();
  },
  frame(dtRaw) {
    if (Input.hit('escape')) { this.finish(true); return; }
    if (this.phase === 'prep') { W.renderer.render(W.scene, W.camera); this.composite(-1); return; }
    const T = this.clock(dtRaw);
    const dt = clamp(T - this.lastT, 0, 0.05); this.lastT = T; this.T = T;
    W.time += dt;
    // music lookahead
    if (Audio.ctx && this.bus) while (this.si < this.score.length && this.score[this.si].t < T + 0.3) { const e = this.score[this.si++]; if (e.t >= T - 0.05) e.fn(Math.max(0, e.t - T)); }
    this.once('fadeout', T > 29.1, () => { if (this.bus) this.bus.gain.setTargetAtTime(0, Audio.ctx.currentTime, 0.3); });
    // pick the shot
    let idx = this.shots.length - 1; for (let i = 0; i < this.shots.length; i++) if (T < this.shots[i].t0 + this.shots[i].dur) { idx = i; break; }
    if (T < 0) idx = 0;
    if (idx !== this.shotIdx) this.enterShot(idx);
    const s = this.shot, lt = clamp(T - s.t0, 0, s.dur);
    this.shake = Math.max(0, this.shake - dt * 2.2); this.flash = Math.max(0, this.flash - dt * 5);
    s.update(lt, lt / s.dur, dt);
    // world simulation around the focus
    updateSky(dt); updateWorldAnim(dt); updateEmitters(dt);
    Wild.update(dt); NPCs.update(dt); Mermaids.update(dt);
    FX.update(dt); Sprites.update(dt); Telegraphs.update(dt);
    W.renderer.render(W.scene, W.camera);
    this.composite(T);
    $('trStatus').textContent = (this.record ? 'Recording · ' : 'Playing · ') + Math.max(0, Math.ceil(this.DUR - T)) + 's';
    if (T >= this.DUR) this.finish(false);
  },

  // ───── 2D composite: frame + letterbox + captions + title ─────
  makeVignette() {
    if (this.vig) return;
    const c = document.createElement('canvas'); c.width = TR_W; c.height = TR_H; const g = c.getContext('2d');
    const gr = g.createRadialGradient(TR_W / 2, TR_H / 2, TR_H * 0.35, TR_W / 2, TR_H / 2, TR_H * 0.95);
    gr.addColorStop(0, 'rgba(18,24,44,0)'); gr.addColorStop(1, 'rgba(18,24,44,0.5)');
    g.fillStyle = gr; g.fillRect(0, 0, TR_W, TR_H); this.vig = c;
  },
  composite(T) {
    const g = this.g2, bar = 72;
    g.globalAlpha = 1; g.shadowBlur = 0; g.shadowOffsetY = 0;
    g.drawImage(W.renderer.domElement, 0, 0, TR_W, TR_H);
    g.drawImage(this.vig, 0, 0);
    g.fillStyle = '#000'; g.fillRect(0, 0, TR_W, bar); g.fillRect(0, TR_H - bar, TR_W, bar);
    if (this.flash > 0) { g.globalAlpha = this.flash * 0.8; g.fillStyle = '#fff8e8'; g.fillRect(0, 0, TR_W, TR_H); g.globalAlpha = 1; }
    // captions
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    for (const [a, b, text] of TR_CAPTIONS) {
      if (T < a || T > b) continue;
      const al = Math.min(1, (T - a) / 0.35, (b - T) / 0.35);
      g.globalAlpha = al;
      g.font = 'italic 700 62px "Alegreya", Georgia, serif';
      g.shadowColor = 'rgba(16,22,40,0.9)'; g.shadowBlur = 22; g.shadowOffsetY = 3;
      g.fillStyle = '#f7f1e3';
      g.fillText(text, TR_W / 2, TR_H - bar - 64 + (1 - al) * 14);
      g.shadowBlur = 0; g.shadowOffsetY = 0;
    }
    // title card
    if (T > 26.9) {
      const al = clamp((T - 26.9) / 0.7, 0, 1), sc = 1.05 - 0.05 * easeOut(al);
      g.save(); g.translate(TR_W / 2, TR_H * 0.43); g.scale(sc, sc); g.globalAlpha = al;
      g.font = 'italic 800 210px "Alegreya", Georgia, serif';
      g.shadowColor = 'rgba(16,22,40,0.85)'; g.shadowBlur = 40; g.shadowOffsetY = 8;
      g.fillStyle = '#1d2740'; g.fillText('Skybound', 0, 8);
      g.fillStyle = '#f7f1e3'; g.fillText('Skybound', 0, 0);
      g.shadowBlur = 16; g.shadowOffsetY = 3;
      g.font = 'italic 500 60px "Alegreya", Georgia, serif'; g.fillStyle = '#f0c869';
      g.globalAlpha = clamp((T - 27.4) / 0.6, 0, 1);
      g.fillText('A lifetime together', 0, 104);
      g.restore();
    }
    // dips to black between shots, fade in/out
    let dark = T < 0 ? 1 : Math.max(0, 1 - T / 0.7);
    for (const c of TR_CUTS) dark = Math.max(dark, (1 - Math.abs(T - c) / 0.16) * 0.92);
    if (T > 29.3) dark = Math.max(dark, (T - 29.3) / 0.7);
    if (dark > 0) { g.globalAlpha = clamp(dark, 0, 1); g.fillStyle = '#000'; g.fillRect(0, 0, TR_W, TR_H); }
    g.globalAlpha = 1;
  },

  // ───── wrap up ─────
  finish(cancelled) {
    if (!this.active) return;
    this.active = false; W.trailerActive = false; this.phase = 'off';
    this.cancelled = cancelled;
    if (this.rec && this.rec.state !== 'inactive') { try { this.rec.stop(); } catch (e) { /* ignore */ } }
    if (this.dest) { try { Audio.comp.disconnect(this.dest); } catch (e) { /* ignore */ } this.dest = null; }
    if (this.bus) { const b = this.bus; setTimeout(() => { try { b.disconnect(); } catch (e) { /* ignore */ } }, 1500); this.bus = null; }
    if (Audio.ctx) { Audio.music.padGain.gain.setTargetAtTime(0.16, Audio.ctx.currentTime, 1.5); this.ambience(0, 0); }
    if (this.saved.muted && !Audio.muted) Audio.setMuted(true);
    this.removeActors();
    P1.x = this.saved.x; P1.y = this.saved.y; P1.z = this.saved.z; P1.root.visible = true;
    G.flags.bonding = this.saved.bonding; Hatch.list.forEach((h) => (h.reactT = 0));
    skyOverride = null; this.setFog('village'); curRegion = this.saved.region; W.sky.visible = true;
    if (W.renderer.setPixelRatio) W.renderer.setPixelRatio(this.saved.pr);
    W.renderer.setSize(innerWidth, innerHeight);
    W.camera.aspect = innerWidth / innerHeight; W.camera.fov = 45; W.camera.updateProjectionMatrix();
    G.mode = this.saved.mode === 'trailer' ? 'title' : this.saved.mode;
    document.body.classList.remove('trailering');
    $('trailerHud').classList.remove('show');
    if (!this.rec) { if (!cancelled) Audio.sfx('quest'); }
  },
  onRecorded(rec, chunks, cancelled) {
    if (this.rec === rec) this.rec = null;
    try { rec.stream.getTracks().forEach((t) => t.stop()); } catch (e) { /* ignore */ }
    if (cancelled) return;
    if (!chunks.length) { UI.toast('The recording came out empty in this browser. Try “Just watch” with a screen recorder.', 'info'); return; }
    const type = (rec && rec.mimeType) || this.mime || 'video/webm';
    const blob = new Blob(chunks, { type: type.split(';')[0] });
    const ext = type.indexOf('mp4') >= 0 ? 'mp4' : 'webm';
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = URL.createObjectURL(blob);
    const v = $('trVideo');
    v.onloadedmetadata = () => { if (v.duration === Infinity) { v.currentTime = 1e101; v.ontimeupdate = () => { v.ontimeupdate = null; v.currentTime = 0; }; } };
    v.src = this.url;
    const a = $('trDl'); a.href = this.url; a.download = 'skybound-trailer.' + ext;
    $('trInfo').textContent = `${(blob.size / 1e6).toFixed(1)} MB · ${ext.toUpperCase()} · 1920 × 1080` + (ext === 'webm' ? ' · WebM plays in Chrome, Firefox and VLC. Some social sites need MP4, so you may need to convert it first.' : '');
    $('trailerDone').classList.add('show');
    Audio.sfx('quest');
  },
};
