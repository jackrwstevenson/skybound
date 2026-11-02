// ───────────────────────── particles & effects ─────────────────────────
const FX = {
  max: 2600, n: 0, p: [], geo: null, pts: null,
  init() {
    const n = this.max;
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.size = new Float32Array(n); this.alpha = new Float32Array(n);
    for (let i = 0; i < n; i++) this.p.push({ life: 0 });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    const mk = (additive) => new THREE.ShaderMaterial({
      uniforms: { uTex: { value: TEX.soft }, uScale: { value: pointScale() } },
      vertexShader: `attribute float size; attribute vec3 color; attribute float alpha; varying vec3 vC; varying float vA; uniform float uScale;
        void main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * uScale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D uTex; varying vec3 vC; varying float vA; void main(){ vec4 t = texture2D(uTex, gl_PointCoord); if (vA <= 0.001) discard; gl_FragColor = vec4(vC, t.a * vA); ${COLORSPACE_CHUNK} }`,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.geo = g;
    this.pts = new THREE.Points(g, mk(false)); this.pts.frustumCulled = false; this.pts.renderOrder = 6; W.scene.add(this.pts);
    // additive layer shares a second geometry
    this.pos2 = new Float32Array(n * 3); this.col2 = new Float32Array(n * 3); this.size2 = new Float32Array(n); this.alpha2 = new Float32Array(n);
    const g2 = new THREE.BufferGeometry();
    g2.setAttribute('position', new THREE.BufferAttribute(this.pos2, 3)); g2.setAttribute('color', new THREE.BufferAttribute(this.col2, 3));
    g2.setAttribute('size', new THREE.BufferAttribute(this.size2, 1)); g2.setAttribute('alpha', new THREE.BufferAttribute(this.alpha2, 1));
    this.geo2 = g2; this.pts2 = new THREE.Points(g2, mk(true)); this.pts2.frustumCulled = false; this.pts2.renderOrder = 7; W.scene.add(this.pts2);
    this.mats = [this.pts.material, this.pts2.material];
  },
  spawn(o) {
    // o: x,y,z, vx,vy,vz, life, size, size1, color(hex or lin), color1, grav, drag, add
    let slot = null;
    for (let k = 0; k < 40; k++) { const i = (this.cursor = ((this.cursor || 0) + 1) % this.max); if (this.p[i].life <= 0) { slot = this.p[i]; break; } }
    if (!slot) slot = this.p[(this.cursor = ((this.cursor || 0) + 1) % this.max)];
    slot.x = o.x; slot.y = o.y; slot.z = o.z; slot.vx = o.vx || 0; slot.vy = o.vy || 0; slot.vz = o.vz || 0;
    slot.life = slot.max = o.life || 1; slot.s0 = o.size || 0.5; slot.s1 = o.size1 ?? slot.s0;
    slot.c0 = typeof o.color === 'number' ? hexLin(o.color) : o.color || [1, 1, 1]; slot.c1 = o.color1 !== undefined ? (typeof o.color1 === 'number' ? hexLin(o.color1) : o.color1) : slot.c0;
    slot.g = o.grav || 0; slot.drag = o.drag || 0; slot.add = !!o.add; slot.a0 = o.alpha ?? 1; slot.fadeIn = o.fadeIn || 0;
    return slot;
  },
  burst(x, y, z, n, o) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, e = (Math.random() - 0.3) * Math.PI * 0.5; const sp = (o.speed || 4) * (0.4 + Math.random() * 0.8);
      this.spawn(Object.assign({}, o, { x: x + rand(-0.2, 0.2), y: y + rand(-0.2, 0.2), z: z + rand(-0.2, 0.2), vx: Math.cos(a) * Math.cos(e) * sp, vy: Math.sin(e) * sp + (o.up || 0), vz: Math.sin(a) * Math.cos(e) * sp, life: (o.life || 0.8) * rand(0.7, 1.2) }));
    }
  },
  update(dt) {
    let k = 0, k2 = 0;
    for (const p of this.p) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy -= p.g * dt;
      if (p.drag) { const f = Math.exp(-p.drag * dt); p.vx *= f; p.vy *= f; p.vz *= f; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const t = 1 - p.life / p.max;
      const s = lerp(p.s0, p.s1, t);
      let a = p.a0 * (t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1);
      if (p.fadeIn && t < p.fadeIn) a *= t / p.fadeIn;
      const c0 = p.c0, c1 = p.c1;
      if (p.add) {
        this.pos2[k2 * 3] = p.x; this.pos2[k2 * 3 + 1] = p.y; this.pos2[k2 * 3 + 2] = p.z;
        this.col2[k2 * 3] = lerp(c0[0], c1[0], t); this.col2[k2 * 3 + 1] = lerp(c0[1], c1[1], t); this.col2[k2 * 3 + 2] = lerp(c0[2], c1[2], t);
        this.size2[k2] = s; this.alpha2[k2] = a; k2++;
      } else {
        this.pos[k * 3] = p.x; this.pos[k * 3 + 1] = p.y; this.pos[k * 3 + 2] = p.z;
        this.col[k * 3] = lerp(c0[0], c1[0], t); this.col[k * 3 + 1] = lerp(c0[1], c1[1], t); this.col[k * 3 + 2] = lerp(c0[2], c1[2], t);
        this.size[k] = s; this.alpha[k] = a; k++;
      }
    }
    this.geo.setDrawRange(0, k); this.geo2.setDrawRange(0, k2);
    for (const g of [this.geo, this.geo2]) for (const n of ['position', 'color', 'size', 'alpha']) g.attributes[n].needsUpdate = true;
    const ps = pointScale(); for (const m of this.mats) m.uniforms.uScale.value = ps;
  },
  // presets
  sparkle(x, y, z, col = 0xfff2a8, n = 14) { this.burst(x, y, z, n, { speed: 3, life: 0.9, size: 0.5, size1: 0.05, color: col, grav: -1, drag: 2, add: true }); },
  hearts(x, y, z) { for (let i = 0; i < 5; i++) this.spawn({ x: x + rand(-0.5, 0.5), y, z: z + rand(-0.5, 0.5), vy: rand(1.5, 2.5), vx: rand(-0.5, 0.5), life: 1.4, size: 0.7, size1: 0.3, color: 0xff6a9a, add: true }); },
  dust(x, y, z, n = 6, col = 0xd8c8a8) { this.burst(x, y + 0.2, z, n, { speed: 2, life: 0.6, size: 0.6, size1: 1.4, color: col, drag: 3, alpha: 0.6, up: 0.6 }); },
  splash(x, y, z, n = 20) { this.burst(x, y, z, n, { speed: 5, life: 0.8, size: 0.4, size1: 0.2, color: 0xe8fbff, grav: 14, up: 5 }); this.spawn({ x, y: y + 0.1, z, life: 0.7, size: 1, size1: 5, color: 0xffffff, alpha: 0.6 }); },
  hit(x, y, z, col = 0xfff2a8) { this.burst(x, y, z, 10, { speed: 7, life: 0.35, size: 0.5, size1: 0.05, color: col, drag: 6, add: true }); this.spawn({ x, y, z, life: 0.18, size: 2.2, size1: 0.5, color: 0xffffff, add: true }); },
  coin(x, y, z) { this.burst(x, y, z, 6, { speed: 2.5, life: 0.6, size: 0.4, size1: 0.05, color: 0xffd34d, add: true, grav: -2 }); },
  smoke(x, y, z) { this.spawn({ x: x + rand(-0.2, 0.2), y, z: z + rand(-0.2, 0.2), vx: rand(0.2, 0.6), vy: rand(0.8, 1.4), vz: rand(-0.2, 0.2), life: 3.5, size: 0.8, size1: 3.2, color: 0xe8e4e0, color1: 0xc9c4c0, alpha: 0.42, drag: 0.4, fadeIn: 0.15 }); },
  fire(x, y, z, vx, vy, vz, s = 1) { this.spawn({ x, y, z, vx, vy, vz, life: 0.55 * rand(0.8, 1.2), size: 0.6 * s, size1: 2.4 * s, color: 0xfff1a0, color1: 0xff3a10, add: true, drag: 1.5, grav: -3 }); },
  gust(x, y, z, vx, vy, vz, s = 1) { this.spawn({ x, y, z, vx, vy, vz, life: 0.55, size: 0.8 * s, size1: 3 * s, color: 0xf2fbff, alpha: 0.55, drag: 1.2 }); },
  bubble(x, y, z, vx = 0, vy = 1, vz = 0, s = 0.4) { this.spawn({ x, y, z, vx, vy, vz, life: 1.4, size: s, size1: s * 1.3, color: 0xd8fbff, alpha: 0.8, drag: 0.8, grav: -1.2 }); },
  trail(x, y, z, col = 0xffffff, s = 0.35) { this.spawn({ x, y, z, life: 0.5, size: s, size1: 0.02, color: col, alpha: 0.75, add: true }); },
  ember(x, y, z) { this.spawn({ x: x + rand(-14, 14), y, z: z + rand(-14, 14), vy: rand(1.5, 4), vx: rand(-0.5, 0.5), vz: rand(-0.5, 0.5), life: 3, size: 0.35, size1: 0.05, color: 0xffb347, color1: 0xff3a10, add: true }); },
  snow(x, y, z) { this.spawn({ x: x + rand(-40, 40), y: y + rand(10, 25), z: z + rand(-40, 40), vx: rand(-1, 1) + 1.5, vy: -rand(1.5, 2.5), vz: rand(-0.5, 0.5), life: 8, size: 0.3, color: 0xffffff, alpha: 0.9 }); },
  mote(x, y, z, col) { this.spawn({ x: x + rand(-25, 25), y: y + rand(-1, 6), z: z + rand(-25, 25), vx: rand(-0.3, 0.3), vy: rand(-0.1, 0.3), vz: rand(-0.3, 0.3), life: 4, size: 0.25, color: col, add: true, fadeIn: 0.3 }); },
  petal(x, y, z) { this.spawn({ x: x + rand(-5, 5), y, z: z + rand(-5, 5), vx: rand(0.3, 1.2), vy: -rand(0.5, 1), vz: rand(-0.5, 0.5), life: 6, size: 0.25, color: 0xf8c6d4 }); },
  confetti(x, y, z, n = 40) { const cs = [0xe2573a, 0xf7c548, 0x5b8fd6, 0x6fae4f, 0xf2779a, 0xb985f0]; for (let i = 0; i < n; i++) this.spawn({ x, y, z, vx: rand(-5, 5), vy: rand(4, 10), vz: rand(-5, 5), life: 2.2, size: 0.35, color: pick(cs), grav: 8, drag: 1.2 }); },
};

// ───── billboard sprites: emotes, telegraphs, rings ─────
const Sprites = {
  list: [],
  emote(target, kind, dur = 1.6, yOff = 0) {
    // target: object with .root (THREE.Object3D) and a height fn
    const mat = new THREE.SpriteMaterial({ map: TEX.emote[kind], transparent: true, depthWrite: false, depthTest: false });
    const s = new THREE.Sprite(mat); s.scale.set(1.2, 1.2, 1); s.renderOrder = 20; W.scene.add(s);
    const e = { s, target, t: 0, dur, yOff };
    // replace existing emote on same target
    this.list = this.list.filter((o) => { if (o.target === target && o.kind === 'emote') { W.scene.remove(o.s); o.s.material.dispose(); return false; } return true; });
    e.kind = 'emote'; this.list.push(e); return e;
  },
  update(dt) {
    this.list = this.list.filter((e) => {
      e.t += dt;
      if (e.t > e.dur) { W.scene.remove(e.s); e.s.material.dispose(); return false; }
      const p = e.target.root.position; const h = (e.target.emoteY ? e.target.emoteY() : 2.2) + e.yOff;
      const pop = e.t < 0.2 ? easeOut(e.t / 0.2) * 1.15 : e.t > e.dur - 0.25 ? (e.dur - e.t) / 0.25 : 1 + Math.sin(e.t * 6) * 0.04;
      e.s.position.set(p.x, p.y + h + Math.sin(e.t * 4) * 0.08, p.z);
      e.s.scale.set(1.2 * pop, 1.2 * pop, 1);
      return true;
    });
  },
};

// ground telegraph decals (red warning circles / cones)
const Telegraphs = {
  list: [],
  circle(x, z, r, dur, col = 0xff4a3a, y = null) {
    const g = new THREE.RingGeometry(r * 0.92, r, 40); g.rotateX(-Math.PI / 2);
    const fillG = new THREE.CircleGeometry(r, 40); fillG.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: linColor(col), transparent: true, opacity: 0.9, depthWrite: false }));
    const f = new THREE.Mesh(fillG, new THREE.MeshBasicMaterial({ color: linColor(col), transparent: true, opacity: 0.25, depthWrite: false }));
    m.renderOrder = f.renderOrder = 8;
    const grp = new THREE.Group(); grp.add(m); grp.add(f);
    const yy = (y ?? Colliders.ground(x, z)) + 0.12;
    grp.position.set(x, Math.max(yy, 0.15), z); grp.renderOrder = 8; W.scene.add(grp);
    const o = { grp, f, t: 0, dur, kind: 'circle' }; this.list.push(o); return o;
  },
  cone(x, z, ang, r, spread, dur, y = null, col = 0xff4a3a) {
    const g = new THREE.CircleGeometry(r, 24, -spread / 2, spread); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: linColor(col), transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(x, (y ?? Colliders.ground(x, z)) + 0.15, z); m.rotation.y = -ang + Math.PI / 2 * 0; m.renderOrder = 8;
    // circle geometry starts at +x; we want direction ang (atan2(dx,dz)) → rotation
    m.rotation.y = ang - Math.PI / 2;
    W.scene.add(m);
    const o = { grp: m, f: m, t: 0, dur, kind: 'cone' }; this.list.push(o); return o;
  },
  update(dt) {
    this.list = this.list.filter((o) => {
      o.t += dt;
      if (o.t >= o.dur || o.dead) { W.scene.remove(o.grp); o.grp.traverse((m) => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } }); return false; }
      const k = o.t / o.dur;
      if (o.kind === 'circle') { o.f.scale.setScalar(Math.max(0.01, k)); o.f.material.opacity = 0.2 + k * 0.25; }
      else o.f.material.opacity = 0.2 + k * 0.35 + Math.sin(o.t * 20) * 0.05;
      return true;
    });
  },
};

// Flight / swim rings
const RINGMAT = {};
class RingCourse {
  constructor(id, pts, opt = {}) {
    this.id = id; this.pts = pts; this.opt = opt; this.idx = 0; this.active = false; this.timer = 0; this.rings = [];
    this.limit = opt.limit || 0; this.color = opt.color || 0xffd34d; this.r = opt.r || 3.2;
  }
  start() {
    this.clear(); this.active = true; this.idx = 0; this.timer = this.limit;
    if (!RINGMAT[this.color]) RINGMAT[this.color] = new THREE.MeshBasicMaterial({ color: linColor(this.color), transparent: true, opacity: 0.9 });
    this.pts.forEach((p, i) => {
      const next = this.pts[Math.min(this.pts.length - 1, i + 1)], prev = this.pts[Math.max(0, i - 1)];
      const m = new THREE.Mesh(new THREE.TorusGeometry(p.r || this.r, 0.28, 6, 28), RINGMAT[this.color].clone());
      m.position.set(p.x, p.y, p.z);
      m.rotation.y = Math.atan2(next.x - prev.x, next.z - prev.z);
      m.visible = i < 3; W.scene.add(m); this.rings.push(m);
    });
    this.refresh();
  }
  refresh() { this.rings.forEach((m, i) => { m.visible = i >= this.idx && i < this.idx + 3; m.material.opacity = i === this.idx ? 0.95 : 0.35; m.scale.setScalar(i === this.idx ? 1 : 0.8); }); }
  clear() { this.rings.forEach((m) => { W.scene.remove(m); m.geometry.dispose(); m.material.dispose(); }); this.rings = []; this.active = false; }
  current() { return this.pts[this.idx]; }
  update(dt, pos) {
    if (!this.active) return null;
    if (this.limit) { this.timer -= dt; if (this.timer <= 0) { this.clear(); return 'fail'; } }
    const p = this.pts[this.idx]; const m = this.rings[this.idx];
    if (m) { m.rotation.z += dt * 1.5; }
    if (dist3d(pos, p) < (p.r || this.r) + 1.2) {
      FX.sparkle(p.x, p.y, p.z, this.color, 22);
      Audio.sfx('ring', { n: Math.min(12, this.idx) });
      if (this.opt.bonus) this.timer += this.opt.bonus;
      this.idx++;
      if (this.idx >= this.pts.length) { this.clear(); return 'done'; }
      this.refresh(); return 'ring';
    }
    return null;
  }
}

// Pickups (coins, fruit, items) with magnet
const Pickups = {
  list: [], coinGeo: null, fruitGeo: null,
  init() {
    this.coinGeo = mergeParts([part(cyl(0.32, 0.32, 0.08, 10), 0xffcf3a, { rx: Math.PI / 2 }), part(cyl(0.2, 0.2, 0.1, 8), 0xffe58a, { rx: Math.PI / 2 })]);
    this.fruitGeo = mergeParts([part(ico(0.38, 1), 0xffc83a, { sy: 1.1 }), part(cyl(0.03, 0.04, 0.2, 4), 0x6b4a2a, { y: 0.45 }), part(box(0.25, 0.04, 0.12), 0x6fae4f, { x: 0.12, y: 0.45, rz: 0.4 })]);
    this.heartGeo = mergeParts([part(ico(0.25, 0), 0xff5a7a, { x: -0.13, y: 0.1 }), part(ico(0.25, 0), 0xff5a7a, { x: 0.13, y: 0.1 }), part(cone(0.34, 0.4, 6), 0xff5a7a, { y: -0.18, rx: Math.PI })]);
    this.treatGeo = mergeParts([part(ico(0.25, 0), 0xe8603c, {}), part(box(0.06, 0.15, 0.06), 0x5b8c5a, { y: 0.25 })]);
  },
  spawn(kind, x, y, z, opt = {}) {
    const geo = kind === 'coin' ? this.coinGeo : kind === 'fruit' ? this.fruitGeo : kind === 'heart' ? this.heartGeo : kind === 'treat' ? this.treatGeo : opt.geo;
    const mat = kind === 'fruit' ? new THREE.MeshBasicMaterial({ vertexColors: true }) : vcMat();
    const m = opt.mesh || new THREE.Mesh(geo, mat); m.castShadow = true; m.position.set(x, y, z); W.scene.add(m);
    const p = { kind, m, x, y, z, vx: opt.vx ?? rand(-3, 3), vy: opt.vy ?? rand(5, 8), vz: opt.vz ?? rand(-3, 3), t: 0, settled: false, val: opt.val || 1, data: opt.data, float: opt.float, magnet: opt.magnet ?? (kind === 'coin' || kind === 'heart') };
    if (kind === 'fruit') { const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.soft, color: linColor(0xffd34d), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); gl.scale.set(2.4, 2.4, 1); m.add(gl); }
    this.list.push(p); return p;
  },
  update(dt, player, onPick) {
    this.list = this.list.filter((p) => {
      p.t += dt;
      if (!p.settled && !p.float) {
        p.vy -= 20 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        const g = Math.max(Colliders.ground(p.x, p.z, p.y + 0.5), p.inWater ? -99 : -0.2);
        if (p.y < g + 0.4) { p.y = g + 0.4; if (Math.abs(p.vy) < 2) { p.settled = true; } p.vy = -p.vy * 0.35; p.vx *= 0.5; p.vz *= 0.5; }
        if (p.y < 0.2 && Terrain.getH(p.x, p.z) < -0.5) { p.y = Math.max(p.y, 0.4); p.settled = true; } // float on water
      }
      const d = dist3d(p, player);
      if (p.magnet && p.t > 0.5 && d < 5) { const k = Math.min(1, dt * 10); p.x += (player.x - p.x) * k; p.y += (player.y + 1 - p.y) * k; p.z += (player.z - p.z) * k; }
      p.m.position.set(p.x, p.y + (p.settled || p.float ? Math.sin(p.t * 3) * 0.15 + 0.15 : 0), p.z);
      p.m.rotation.y += dt * 3;
      if (p.t > 0.4 && d < 1.8) { onPick(p); W.scene.remove(p.m); return false; }
      if (p.kind === 'coin' && p.t > 60) { W.scene.remove(p.m); return false; }
      return true;
    });
  },
  clear() { this.list.forEach((p) => W.scene.remove(p.m)); this.list = []; },
};

// floating damage / reward numbers (DOM)
const Floaters = {
  list: [], el: null,
  init() { this.el = document.getElementById('floaters'); },
  add(text, wp, cls = '') {
    const d = document.createElement('div'); d.className = 'floater ' + cls; d.textContent = text; this.el.appendChild(d);
    this.list.push({ d, x: wp.x, y: wp.y, z: wp.z, t: 0 });
  },
  update(dt, cam) {
    const v = new THREE.Vector3();
    this.list = this.list.filter((f) => {
      f.t += dt; if (f.t > 1.1) { f.d.remove(); return false; }
      v.set(f.x, f.y + f.t * 1.6, f.z).project(cam);
      if (v.z > 1) { f.d.style.display = 'none'; return true; }
      f.d.style.display = '';
      f.d.style.transform = `translate(${(v.x * 0.5 + 0.5) * innerWidth}px, ${(-v.y * 0.5 + 0.5) * innerHeight}px) translate(-50%,-50%) scale(${f.t < 0.15 ? 0.6 + f.t * 4 : 1})`;
      f.d.style.opacity = f.t > 0.7 ? (1.1 - f.t) / 0.4 : 1;
      return true;
    });
  },
};
