// ───────────────────────── geometry & material helpers ─────────────────────────
function linColor(hex) { const c = hexLin(hex); return new THREE.Color(c[0], c[1], c[2]); }
let VCMAT = null, VCMAT_DS = null;
function vcMat() { if (!VCMAT) VCMAT = new THREE.MeshLambertMaterial({ vertexColors: true }); return VCMAT; }
function vcMatDS() { if (!VCMAT_DS) VCMAT_DS = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }); return VCMAT_DS; }
const _matCache = {};
function basicMat(hex, opt = {}) {
  const k = 'b' + hex + JSON.stringify(opt);
  if (!_matCache[k]) _matCache[k] = new THREE.MeshBasicMaterial(Object.assign({ color: linColor(hex) }, opt));
  return _matCache[k];
}
function glowMat(hex, opacity = 1, additive = false) {
  return basicMat(hex, { transparent: opacity < 1 || additive, opacity, depthWrite: !(opacity < 1 || additive), blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, fog: true });
}

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, s = 7) => new THREE.CylinderGeometry(rt, rb, h, s);
const cone = (r, h, s = 7) => new THREE.ConeGeometry(r, h, s);
const ico = (r, d = 0) => new THREE.IcosahedronGeometry(r, d);
const sph = (r, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h);
const dod = (r) => new THREE.DodecahedronGeometry(r, 0);
const tor = (r, t, rs = 6, ts = 12, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc);

// shape a geometry and bake a colour into it. t: {x,y,z,rx,ry,rz,sx,sy,sz,jit}
function part(geo, hex, t = {}) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  if (geo.index) geo.dispose();
  if (t.sx !== undefined || t.sy !== undefined || t.sz !== undefined) g.scale(t.sx ?? 1, t.sy ?? 1, t.sz ?? 1);
  if (t.rx) g.rotateX(t.rx);
  if (t.ry) g.rotateY(t.ry);
  if (t.rz) g.rotateZ(t.rz);
  g.translate(t.x || 0, t.y || 0, t.z || 0);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  const base = Array.isArray(hex) ? hex : hexLin(hex);
  const jit = t.jit || 0;
  for (let f = 0; f < n; f += 3) {
    const j = jit ? 1 + (Math.random() - 0.5) * jit : 1;
    for (let k = 0; k < 3 && f + k < n; k++) { const i = (f + k) * 3; col[i] = base[0] * j; col[i + 1] = base[1] * j; col[i + 2] = base[2] * j; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (g.attributes.uv) g.deleteAttribute('uv');
  if (g.attributes.normal) g.deleteAttribute('normal');
  return g;
}
function mergeParts(parts) {
  let n = 0; for (const p of parts) n += p.attributes.position.count;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const p of parts) {
    pos.set(p.attributes.position.array, o * 3);
    col.set(p.attributes.color.array, o * 3);
    o += p.attributes.position.count; p.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
function meshOf(parts, material) {
  const m = new THREE.Mesh(Array.isArray(parts) ? mergeParts(parts) : parts, material || vcMat());
  m.castShadow = true; m.receiveShadow = false; return m;
}
// custom triangle-list geometry (for wing membranes / fins)
function triGeo(points, tris) {
  const pos = [];
  for (const t of tris) for (const k of t) pos.push(points[k][0], points[k][1], points[k][2]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  return g;
}

// Instanced prop set: register many transforms per prototype then build
class PropSet {
  constructor(name, geo, opt = {}) { this.name = name; this.geo = geo; this.items = []; this.opt = opt; }
  add(x, y, z, s = 1, ry = 0, extra = {}) { this.items.push({ x, y, z, s, ry, sx: extra.sx, sy: extra.sy, sz: extra.sz, rx: extra.rx || 0, rz: extra.rz || 0, tint: extra.tint }); }
  build(scene) {
    if (!this.items.length) return null;
    const mesh = new THREE.InstancedMesh(this.geo, this.opt.material || vcMat(), this.items.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
    const c = new THREE.Color();
    const anyTint = this.items.some((x) => x.tint);
    this.items.forEach((it, i) => {
      e.set(it.rx, it.ry, it.rz); q.setFromEuler(e); p.set(it.x, it.y, it.z);
      s.set(it.s * (it.sx || 1), it.s * (it.sy || 1), it.s * (it.sz || 1));
      m4.compose(p, q, s); mesh.setMatrixAt(i, m4);
      const tt = it.tint || [1, 1, 1]; c.setRGB(tt[0], tt[1], tt[2]); mesh.setColorAt(i, c); void anyTint;
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = this.opt.shadow !== false; mesh.receiveShadow = !!this.opt.receive;
    mesh.frustumCulled = false;
    scene.add(mesh); this.mesh = mesh; return mesh;
  }
}

// canvas textures
function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(cv); t.needsUpdate = true;
  if ('colorSpace' in t) t.colorSpace = 'srgb'; else if (THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding;
  return t;
}
const TEX = {};
function makeTextures() {
  TEX.soft = canvasTex(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  TEX.star = canvasTex(64, 64, (g) => {
    g.translate(32, 32); g.fillStyle = '#fff';
    g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 7 : 30; const a = (i / 8) * TAU; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill();
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(-32, -32, 64, 64);
  });
  TEX.ring = canvasTex(64, 64, (g) => { g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); g.arc(32, 32, 24, 0, TAU); g.stroke(); });
  const emote = (draw) => canvasTex(128, 128, (g) => {
    g.fillStyle = 'rgba(255,255,255,0.96)'; g.strokeStyle = 'rgba(40,52,80,0.9)'; g.lineWidth = 6;
    g.beginPath(); g.ellipse(64, 56, 46, 40, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(52, 92); g.lineTo(64, 116); g.lineTo(74, 92); g.closePath(); g.fill();
    g.save(); draw(g); g.restore();
  });
  TEX.emote = {
    heart: emote((g) => { g.fillStyle = '#ef4f7a'; g.beginPath(); g.moveTo(64, 82); g.bezierCurveTo(20, 54, 40, 22, 64, 42); g.bezierCurveTo(88, 22, 108, 54, 64, 82); g.fill(); }),
    bang: emote((g) => { g.fillStyle = '#f2a33a'; g.fillRect(56, 22, 16, 40); g.beginPath(); g.arc(64, 76, 9, 0, TAU); g.fill(); }),
    q: emote((g) => { g.fillStyle = '#4d7fd6'; g.font = 'bold 64px sans-serif'; g.textAlign = 'center'; g.fillText('?', 64, 80); }),
    note: emote((g) => { g.fillStyle = '#7a5ad6'; g.beginPath(); g.ellipse(52, 74, 12, 9, -0.4, 0, TAU); g.fill(); g.fillRect(60, 28, 6, 46); g.fillRect(60, 28, 22, 8); }),
    zzz: emote((g) => { g.fillStyle = '#4d7fd6'; g.font = 'bold 40px sans-serif'; g.fillText('z', 40, 76); g.font = 'bold 30px sans-serif'; g.fillText('z', 66, 58); g.font = 'bold 22px sans-serif'; g.fillText('z', 86, 44); }),
    star: emote((g) => { g.fillStyle = '#f2c23a'; g.translate(64, 56); g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 12 : 28; const a = (i / 10) * TAU - Math.PI / 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill(); }),
    sweat: emote((g) => { g.fillStyle = '#5ab3e6'; g.beginPath(); g.moveTo(64, 26); g.quadraticCurveTo(88, 62, 64, 80); g.quadraticCurveTo(40, 62, 64, 26); g.fill(); }),
    food: emote((g) => { g.fillStyle = '#e8603c'; g.beginPath(); g.arc(64, 60, 20, 0, TAU); g.fill(); g.fillStyle = '#5b8c5a'; g.fillRect(62, 30, 6, 14); }),
  };
}
