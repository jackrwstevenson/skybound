// Minimal THREE + DOM mock for headless logic testing.
const M = {};
class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  setScalar(s) { this.x = this.y = this.z = s; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  length() { return Math.hypot(this.x, this.y, this.z); }
  normalize() { const l = this.length() || 1; return this.multiplyScalar(1 / l); }
  lerpVectors(a, b, t) { this.x = a.x + (b.x - a.x) * t; this.y = a.y + (b.y - a.y) * t; this.z = a.z + (b.z - a.z) * t; return this; }
  applyMatrix4(m) { const e = m.elements, x = this.x, y = this.y, z = this.z; const w = e[3] * x + e[7] * y + e[11] * z + e[15] || 1; this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) / w; this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) / w; this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) / w; return this; }
  project(cam) { cam.updateMatrixWorld(); const inv = new Matrix4().copy(cam.matrixWorld).invert(); this.applyMatrix4(inv); const f = 1 / Math.tan((cam.fov * Math.PI) / 360); const z = -this.z; this.x = (this.x * f / cam.aspect) / (z || 1e-6); this.y = (this.y * f) / (z || 1e-6); this.z = z > 0 ? 0.5 : 2; return this; }
  unproject(cam) { cam.updateMatrixWorld(); const f = 1 / Math.tan((cam.fov * Math.PI) / 360); const d = new Vector3(this.x * cam.aspect / f, this.y / f, -1); d.applyMatrix4(cam.matrixWorld); return this.copy(d); }
}
class Euler { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; } set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } }
class Quaternion { constructor() { this.e = new Euler(); } setFromEuler(e) { this.e.set(e.x, e.y, e.z); return this; } }
class Matrix4 {
  constructor() { this.elements = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
  identity() { this.elements = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; return this; }
  copy(m) { this.elements = m.elements.slice(); return this; }
  multiplyMatrices(a, b) { const ae = a.elements, be = b.elements, te = new Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += ae[k * 4 + i] * be[j * 4 + k]; te[j * 4 + i] = s; } this.elements = te; return this; }
  makeRotationFromEuler(e) { // XYZ order
    const a = Math.cos(e.x), b = Math.sin(e.x), c = Math.cos(e.y), d = Math.sin(e.y), ee = Math.cos(e.z), f = Math.sin(e.z);
    const ae = a * ee, af = a * f, be = b * ee, bf = b * f; const t = this.elements;
    t[0] = c * ee; t[4] = -c * f; t[8] = d; t[1] = af + be * d; t[5] = ae - bf * d; t[9] = -b * c; t[2] = bf - ae * d; t[6] = be + af * d; t[10] = a * c;
    t[3] = t[7] = t[11] = 0; t[12] = t[13] = t[14] = 0; t[15] = 1; return this;
  }
  makeRotationY(y) { return this.makeRotationFromEuler(new Euler(0, y, 0)); }
  makeRotationAxis() { return this.identity(); }
  scale(v) { const t = this.elements; for (let i = 0; i < 3; i++) { t[i] *= v.x; t[4 + i] *= v.y; t[8 + i] *= v.z; } return this; }
  setPosition(x, y, z) { const t = this.elements; t[12] = x; t[13] = y; t[14] = z; return this; }
  compose(p, q, s) { this.makeRotationFromEuler(q.e); this.scale(s); this.setPosition(p.x, p.y, p.z); return this; }
  invert() { // general 4x4 inverse
    const m = this.elements, inv = new Array(16);
    inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] + m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
    inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] - m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
    inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] + m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
    inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] - m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
    inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] - m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
    inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] + m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
    inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] - m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
    inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] + m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
    inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] + m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
    inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] - m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
    inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] + m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
    inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] - m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
    inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] - m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
    inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] + m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
    inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] - m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
    inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] + m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];
    let det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12]; det = det ? 1 / det : 0;
    this.elements = inv.map((v) => v * det); return this;
  }
}
class Color {
  constructor(r = 1, g = 1, b = 1) { if (typeof r === 'number' && g === undefined) { this.setHex(r); } else { this.r = r; this.g = g; this.b = b; } }
  setHex(h) { this.r = ((h >> 16) & 255) / 255; this.g = ((h >> 8) & 255) / 255; this.b = (h & 255) / 255; return this; }
  setRGB(r, g, b) { this.r = r; this.g = g; this.b = b; return this; }
  copy(c) { this.r = c.r; this.g = c.g; this.b = c.b; return this; }
  clone() { return new Color(this.r, this.g, this.b); }
  lerp(c, t) { this.r += (c.r - this.r) * t; this.g += (c.g - this.g) * t; this.b += (c.b - this.b) * t; return this; }
  lerpColors(a, b, t) { return this.copy(a).lerp(b, t); }
}
class BufferAttribute { constructor(arr, n) { this.array = arr; this.itemSize = n; this.count = arr.length / n; this.needsUpdate = false; } }
class BufferGeometry {
  constructor() { this.attributes = {}; this.index = null; }
  setAttribute(n, a) { this.attributes[n] = a; return this; }
  deleteAttribute(n) { delete this.attributes[n]; return this; }
  toNonIndexed() { const g = new BufferGeometry(); g.attributes = Object.assign({}, this.attributes); return g; }
  _xf(fn) { const a = this.attributes.position.array; for (let i = 0; i < a.length; i += 3) { const v = fn(a[i], a[i + 1], a[i + 2]); a[i] = v[0]; a[i + 1] = v[1]; a[i + 2] = v[2]; } return this; }
  scale(x, y, z) { return this._xf((a, b, c) => [a * x, b * y, c * z]); }
  translate(x, y, z) { return this._xf((a, b, c) => [a + x, b + y, c + z]); }
  rotateX(t) { const c = Math.cos(t), s = Math.sin(t); return this._xf((x, y, z) => [x, y * c - z * s, y * s + z * c]); }
  rotateY(t) { const c = Math.cos(t), s = Math.sin(t); return this._xf((x, y, z) => [x * c + z * s, y, -x * s + z * c]); }
  rotateZ(t) { const c = Math.cos(t), s = Math.sin(t); return this._xf((x, y, z) => [x * c - y * s, x * s + y * c, z]); }
  applyMatrix4(m) { const v = new Vector3(); return this._xf((x, y, z) => { v.set(x, y, z).applyMatrix4(m); return [v.x, v.y, v.z]; }); }
  computeVertexNormals() {} computeBoundingSphere() {} dispose() {} setDrawRange(a, b) { this.drawRange = [a, b]; }
}
function boxLike(w, h, d, idx = true) {
  const g = new BufferGeometry(); const p = [];
  const X = w / 2, Y = h / 2, Z = d / 2;
  const v = [[-X, -Y, -Z], [X, -Y, -Z], [X, Y, -Z], [-X, Y, -Z], [-X, -Y, Z], [X, -Y, Z], [X, Y, Z], [-X, Y, Z]];
  const f = [[0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6], [0, 4, 5], [0, 5, 1], [3, 2, 6], [3, 6, 7], [1, 5, 6], [1, 6, 2], [0, 3, 7], [0, 7, 4]];
  for (const t of f) for (const k of t) p.push(...v[k]);
  g.setAttribute('position', new BufferAttribute(new Float32Array(p), 3)); g.setAttribute('normal', new BufferAttribute(new Float32Array(p.length), 3)); g.setAttribute('uv', new BufferAttribute(new Float32Array((p.length / 3) * 2), 2));
  if (idx) g.index = { fake: true };
  return g;
}
class BoxGeometry extends BufferGeometry { constructor(w = 1, h = 1, d = 1) { super(); Object.assign(this, boxLike(w, h, d)); } }
class CylinderGeometry extends BufferGeometry { constructor(rt = 1, rb = 1, h = 1) { super(); const r = Math.max(rt, rb); Object.assign(this, boxLike(r * 2, h, r * 2)); } }
class ConeGeometry extends BufferGeometry { constructor(r = 1, h = 1) { super(); Object.assign(this, boxLike(r * 2, h, r * 2)); } }
class SphereGeometry extends BufferGeometry { constructor(r = 1) { super(); Object.assign(this, boxLike(r * 2, r * 2, r * 2)); } }
class IcosahedronGeometry extends BufferGeometry { constructor(r = 1) { super(); Object.assign(this, boxLike(r * 2, r * 2, r * 2, false)); } }
class DodecahedronGeometry extends BufferGeometry { constructor(r = 1) { super(); Object.assign(this, boxLike(r * 2, r * 2, r * 2, false)); } }
class TorusGeometry extends BufferGeometry { constructor(r = 1, t = 0.2) { super(); Object.assign(this, boxLike(r * 2 + t, r * 2 + t, t * 2)); } }
class PlaneGeometry extends BufferGeometry { constructor(w = 1, h = 1) { super(); Object.assign(this, boxLike(w, h, 0.01)); } }
class CircleGeometry extends BufferGeometry { constructor(r = 1) { super(); Object.assign(this, boxLike(r * 2, r * 2, 0.01)); } }
class RingGeometry extends BufferGeometry { constructor(a = 0.5, r = 1) { super(); Object.assign(this, boxLike(r * 2, r * 2, 0.01)); } }

let objId = 0;
class Object3D {
  constructor() { this.id = ++objId; this.position = new Vector3(); this.rotation = new Euler(); this.scale = new Vector3(1, 1, 1); this.children = []; this.parent = null; this.visible = true; this.matrixWorld = new Matrix4(); this.userData = {}; this.renderOrder = 0; }
  add(c) { if (c.parent) c.parent.remove(c); c.parent = this; this.children.push(c); return this; }
  remove(c) { const i = this.children.indexOf(c); if (i >= 0) { this.children.splice(i, 1); c.parent = null; } return this; }
  traverse(fn) { fn(this); for (const c of this.children.slice()) c.traverse(fn); }
  updateMatrixWorld() {
    const local = new Matrix4().compose(this.position, new Quaternion().setFromEuler(this.rotation), this.scale);
    if (this.parent) { this.parent.updateMatrixWorld(); this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, local); } else this.matrixWorld.copy(local);
  }
  localToWorld(v) { this.updateMatrixWorld(); return v.applyMatrix4(this.matrixWorld); }
  getWorldPosition(v) { this.updateMatrixWorld(); const e = this.matrixWorld.elements; return v.set(e[12], e[13], e[14]); }
  lookAt(t) { // camera-ish lookAt: compute yaw/pitch
    const dx = t.x - this.position.x, dy = t.y - this.position.y, dz = t.z - this.position.z;
    this.rotation.y = Math.atan2(-dx, -dz); this.rotation.x = Math.atan2(dy, Math.hypot(dx, dz)); this.rotation.z = 0; this._look = true;
  }
}
class Group extends Object3D {}
class Scene extends Object3D { constructor() { super(); this.fog = null; this.background = null; } }
class Mesh extends Object3D { constructor(g, m) { super(); this.geometry = g; this.material = m; this.isMesh = true; this.castShadow = false; this.receiveShadow = false; } }
class InstancedMesh extends Mesh { constructor(g, m, n) { super(g, m); this.count = n; this.instanceMatrix = { needsUpdate: false }; this.instanceColor = null; } setMatrixAt() {} setColorAt() { if (!this.instanceColor) this.instanceColor = { needsUpdate: false }; } }
class Points extends Object3D { constructor(g, m) { super(); this.geometry = g; this.material = m; } }
class Sprite extends Object3D { constructor(m) { super(); this.material = m; } }
class Camera extends Object3D {}
class PerspectiveCamera extends Camera {
  constructor(fov, aspect, near, far) { super(); this.fov = fov; this.aspect = aspect; this.near = near; this.far = far; }
  updateProjectionMatrix() {}
  updateMatrixWorld() { // XYZ euler from lookAt doesn't map right; build from yaw/pitch (YXZ)
    const cy = Math.cos(this.rotation.y), sy = Math.sin(this.rotation.y), cx = Math.cos(this.rotation.x), sx = Math.sin(this.rotation.x);
    const t = this.matrixWorld.elements;
    // columns: right, up, back
    const right = [cy, 0, -sy], back = [sy * cx, -sx, cy * cx];
    const up = [back[1] * right[2] - back[2] * right[1], back[2] * right[0] - back[0] * right[2], back[0] * right[1] - back[1] * right[0]];
    t[0] = right[0]; t[1] = right[1]; t[2] = right[2]; t[3] = 0; t[4] = up[0]; t[5] = up[1]; t[6] = up[2]; t[7] = 0; t[8] = back[0]; t[9] = back[1]; t[10] = back[2]; t[11] = 0;
    t[12] = this.position.x; t[13] = this.position.y; t[14] = this.position.z; t[15] = 1;
  }
}
class Light extends Object3D { constructor(c, i) { super(); this.color = c instanceof Color ? c : new Color(); this.intensity = i; this.shadow = { camera: {}, mapSize: { set() {} }, bias: 0, normalBias: 0 }; this.target = new Object3D(); } }
class Material { constructor(o = {}) { Object.assign(this, o); if (!this.color) this.color = new Color(); if (this.emissive === undefined && this._emissive) this.emissive = new Color(0, 0, 0); this.uniforms = o.uniforms || {}; } clone() { const m = new this.constructor({}); Object.assign(m, this); if (this.emissive) m.emissive = this.emissive.clone(); return m; } dispose() {} }
class MeshLambertMaterial extends Material { constructor(o) { super(o); if (!this.emissive) this.emissive = new Color(0, 0, 0); } }
class MeshBasicMaterial extends Material {}
class ShaderMaterial extends Material {}
class SpriteMaterial extends Material {}
class Fog { constructor(c, n, f) { this.color = c; this.near = n; this.far = f; } }
class WebGLRenderer { constructor() { this.shadowMap = {}; this.outputColorSpace = 'srgb'; this.renders = 0; this.domElement = { height: 800 }; } compile() {} getPixelRatio() { return 1; } setPixelRatio() {} setSize() {} render() { this.renders++; } }
class CanvasTexture { constructor(c) { this.image = c; } }
class DataTexture { constructor(d, w, h) { this.image = { data: d, width: w, height: h }; } }

const THREE = {
  REVISION: '158', Vector3, Euler, Quaternion, Matrix4, Color, BufferAttribute, BufferGeometry, BoxGeometry, CylinderGeometry, ConeGeometry, SphereGeometry, IcosahedronGeometry, DodecahedronGeometry, TorusGeometry, PlaneGeometry, CircleGeometry, RingGeometry,
  Object3D, Group, Scene, Mesh, InstancedMesh, Points, Sprite, PerspectiveCamera, HemisphereLight: Light, DirectionalLight: Light, AmbientLight: Light,
  MeshLambertMaterial, MeshBasicMaterial, ShaderMaterial, SpriteMaterial, Fog, WebGLRenderer, CanvasTexture, DataTexture,
  UniformsUtils: { merge: (arr) => Object.assign({}, ...arr.map((o) => { const r = {}; for (const k in o) r[k] = { value: o[k].value }; return r; })) },
  UniformsLib: { fog: { fogColor: { value: null }, fogNear: { value: 1 }, fogFar: { value: 1 } } },
  AdditiveBlending: 2, NormalBlending: 1, DoubleSide: 2, BackSide: 1, LinearFilter: 1, RGBAFormat: 1, PCFSoftShadowMap: 2, sRGBEncoding: 3001,
};

// ───── DOM mock ─────
class ClassList { constructor() { this.s = new Set(); } add(...c) { c.forEach((x) => this.s.add(x)); } remove(...c) { c.forEach((x) => this.s.delete(x)); } toggle(c, on) { if (on === undefined) on = !this.s.has(c); on ? this.s.add(c) : this.s.delete(c); return on; } contains(c) { return this.s.has(c); } }
class El {
  constructor(tag = 'div', id) { this.tagName = tag.toUpperCase(); this.id = id; this.style = { setProperty() {} }; this.classList = new ClassList(); this.children = []; this._html = ''; this.textContent = ''; this.dataset = {}; this.value = ''; this.width = 300; this.height = 150; this.offsetWidth = 100; this.listeners = {}; }
  set innerHTML(v) { this._html = v; this.children = []; } get innerHTML() { return this._html; }
  get firstChild() { return this.children[0] || (this._fc = this._fc || new El()); }
  get childElementCount() { return this.children.length; }
  appendChild(c) { this.children.push(c); c.parentNode = this; return c; } prepend(c) { this.children.unshift(c); c.parentNode = this; }
  remove() { if (this.parentNode) { const i = this.parentNode.children.indexOf(this); if (i >= 0) this.parentNode.children.splice(i, 1); } }
  addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
  querySelectorAll() { return []; } focus() {} select() {}
  getContext() { return ctx2d; }
}
const ctx2d = new Proxy({}, { get: (t, k) => { if (k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }); if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop() {} }); if (k in t) return t[k]; return () => {}; }, set: (t, k, v) => { t[k] = v; return true; } });
const els = {};
const document = {
  getElementById: (id) => els[id] || (els[id] = new El('div', id)),
  createElement: (t) => new El(t),
  querySelectorAll: (sel) => { if (sel === '[data-act]') return []; return []; },
  head: new El('head'), body: new El('body'), addEventListener() {}, hidden: false,
};
const listeners = {};
const window = {
  innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, THREE,
  addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); },
  location: { hash: '', reload() { throw new Error('reload'); } },
};
const store = {};
const localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
module.exports = { THREE, document, window, listeners, localStorage, els, store };
