// ───────────────────────── world: scene, terrain, water, sky ─────────────────────────
const REV = parseInt(THREE.REVISION, 10) || 128;
const LI = REV >= 155 ? Math.PI : 1; // legacy light intensity compensation
const COLORSPACE_CHUNK = REV >= 154 ? '#include <colorspace_fragment>' : '#include <encodings_fragment>';
function srgbTex(t) { if ('colorSpace' in t) t.colorSpace = 'srgb'; else if (THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding; return t; }
const gy = (x, z) => Terrain.getH(x, z);
// world-correct gl_PointSize factor: px per world unit at distance 1, times pixel ratio
function pointScale() { const fov = W.camera ? W.camera.fov : 45; const pr = W.renderer && W.renderer.getPixelRatio ? W.renderer.getPixelRatio() : 1; const h = W.renderer && W.renderer.domElement && W.renderer.domElement.height ? W.renderer.domElement.height : innerHeight * pr; return (h * 0.5) / Math.tan((fov * Math.PI) / 360) * 0.55; }

const W = {
  scene: null, camera: null, renderer: null, sun: null, hemi: null, fog: null,
  spinners: [], bobbers: [], flags: [], water: null, waterMat: null, lavaMat: null, skyMat: null,
  dyn: {}, // dynamic named objects
  time: 0,
};

function initRenderer() {
  const canvas = document.getElementById('game');
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  r.setSize(window.innerWidth, window.innerHeight);
  if ('outputColorSpace' in r) r.outputColorSpace = 'srgb'; else r.outputEncoding = THREE.sRGBEncoding;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  W.renderer = r;
  W.scene = new THREE.Scene();
  W.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 1600);
  W.fog = new THREE.Fog(linColor(0xcfe3e8), 120, 460);
  W.scene.fog = W.fog;
  W.scene.background = linColor(0xcfe3e8);

  W.hemi = new THREE.HemisphereLight(linColor(0xd8ecff), linColor(0x8c7a5a), 0.52 * LI);
  W.scene.add(W.hemi);
  W.sun = new THREE.DirectionalLight(linColor(0xfff0d8), 0.88 * LI);
  W.sun.castShadow = true;
  const sc = W.sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 1; sc.far = 400;
  if (sc.updateProjectionMatrix) sc.updateProjectionMatrix();
  W.sun.shadow.mapSize.set(2048, 2048);
  W.sun.shadow.bias = -0.0006;
  if ('normalBias' in W.sun.shadow) W.sun.shadow.normalBias = 0.04;
  W.scene.add(W.sun); W.scene.add(W.sun.target);
  W.ambient = new THREE.AmbientLight(linColor(0xffffff), 0.08 * LI);
  W.scene.add(W.ambient);
  window.addEventListener('resize', () => {
    if (W.trailerActive) return;
    W.camera.aspect = window.innerWidth / window.innerHeight; W.camera.updateProjectionMatrix();
    W.renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ───── terrain mesh (flat-shaded, vertex coloured) ─────
function buildTerrainMesh() {
  const N = Terrain.N, C = WORLD.cell, H = WORLD.half;
  const quads = (N - 1) * (N - 1);
  const pos = new Float32Array(quads * 18), col = new Float32Array(quads * 18);
  let o = 0;
  const vx = (i) => -H + i * C;
  for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
    const a = [vx(i), Terrain.hAt(i, j), vx(j)], b = [vx(i + 1), Terrain.hAt(i + 1, j), vx(j)];
    const c = [vx(i), Terrain.hAt(i, j + 1), vx(j + 1)], d = [vx(i + 1), Terrain.hAt(i + 1, j + 1), vx(j + 1)];
    const tris = [[a, c, b], [c, d, b]];
    for (const t of tris) {
      const cx = (t[0][0] + t[1][0] + t[2][0]) / 3, cz = (t[0][2] + t[1][2] + t[2][2]) / 3, ch = (t[0][1] + t[1][1] + t[2][1]) / 3;
      const hs = [t[0][1], t[1][1], t[2][1]];
      const slope = (Math.max(...hs) - Math.min(...hs)) / C;
      const colr = terrainColor(cx, cz, ch, slope * 1.2);
      const jit = 0.94 + hash2(i * 3 + (t === tris[0] ? 0 : 1), j * 7) * 0.12;
      for (const v of t) { pos[o] = v[0]; pos[o + 1] = v[1]; pos[o + 2] = v[2]; col[o] = colr[0] * jit; col[o + 1] = colr[1] * jit; col[o + 2] = colr[2] * jit; o += 3; }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals(); g.computeBoundingSphere();
  const m = new THREE.Mesh(g, vcMat()); m.receiveShadow = true; m.castShadow = true;
  W.scene.add(m); W.terrain = m;
}

// height texture for water depth
function heightTexture() {
  const N = Terrain.N; const data = new Uint8Array(N * N * 4);
  for (let k = 0; k < N * N; k++) {
    const h = Terrain.heights[k]; const v = clamp((h + 30) / 40, 0, 1);
    data[k * 4] = Math.round(v * 255); data[k * 4 + 1] = 0; data[k * 4 + 2] = 0; data[k * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
  return t;
}

function buildWater() {
  const geo = new THREE.PlaneGeometry(WORLD.half * 2.6, WORLD.half * 2.6, 160, 160);
  geo.rotateX(-Math.PI / 2);
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uTime: { value: 0 }, uHeight: { value: null }, uHalf: { value: WORLD.half }, uClear: { value: 0 },
    uLagoon: { value: new THREE.Vector3(P.lagoon.x, P.lagoon.z, 70) },
    uShallow: { value: linColor(0x7fe6d6) }, uMid: { value: linColor(0x2aa7c7) }, uDeep: { value: linColor(0x1a5b97) },
    uLagoonCol: { value: linColor(0x48d6c8) },
  }]);
  uniforms.uHeight.value = heightTexture();
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, fog: true, depthWrite: false,
    vertexShader: `
      uniform float uTime; varying vec3 vW; varying float vWave;
      #include <fog_pars_vertex>
      void main(){
        vec3 p = position;
        float w = sin(p.x*0.09 + uTime*1.2)*0.18 + sin(p.z*0.11 - uTime*0.9)*0.16 + sin((p.x+p.z)*0.21 + uTime*2.0)*0.06;
        p.y += w; vWave = w;
        vec4 wp = modelMatrix * vec4(p,1.0); vW = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform float uTime; uniform sampler2D uHeight; uniform float uHalf; uniform float uClear;
      uniform vec3 uLagoon; uniform vec3 uShallow; uniform vec3 uMid; uniform vec3 uDeep; uniform vec3 uLagoonCol;
      varying vec3 vW; varying float vWave;
      #include <fog_pars_fragment>
      float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float vnoise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(hsh(i),hsh(i+vec2(1,0)),f.x), mix(hsh(i+vec2(0,1)),hsh(i+vec2(1,1)),f.x), f.y); }
      void main(){
        vec2 uv = (vW.xz + uHalf) / (uHalf*2.0);
        float h = texture2D(uHeight, clamp(uv, 0.0, 1.0)).r * 40.0 - 30.0;
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) h = -30.0;
        float depth = max(0.0, -h);
        vec3 col = mix(uShallow, uMid, smoothstep(0.5, 6.0, depth));
        col = mix(col, uDeep, smoothstep(6.0, 24.0, depth));
        float dl = length(vW.xz - uLagoon.xy);
        float lag = 1.0 - smoothstep(uLagoon.z*0.75, uLagoon.z, dl);
        col = mix(col, uLagoonCol, lag*0.65);
        // ripples & sparkles
        float n = vnoise(vW.xz*0.35 + vec2(uTime*0.4, uTime*0.25)) * vnoise(vW.xz*0.6 - vec2(uTime*0.3, -uTime*0.2));
        col += vec3(0.9,1.0,1.0) * smoothstep(0.55, 0.75, n) * 0.22;
        col += vec3(0.05,0.08,0.09) * vWave;
        // shore foam
        float foamBand = 1.0 - smoothstep(0.0, 0.9 + 0.4*sin(uTime*1.5 + vW.x*0.2), depth);
        float foamN = vnoise(vW.xz*1.4 + uTime*0.6);
        col = mix(col, vec3(1.0), foamBand * smoothstep(0.25, 0.6, foamN) * 0.85);
        float alpha = mix(0.5, 0.9, smoothstep(0.3, 9.0, depth));
        alpha = mix(alpha, 0.55, lag*0.7);
        alpha *= mix(1.0, 0.35, uClear * lag);
        alpha = max(alpha, foamBand*0.7);
        gl_FragColor = vec4(col, alpha);
        ${COLORSPACE_CHUNK}
        #include <fog_fragment>
      }`,
  });
  const m = new THREE.Mesh(geo, mat); m.position.y = 0; m.renderOrder = -1;
  W.scene.add(m); W.water = m; W.waterMat = mat;
}

function buildSky() {
  const geo = new THREE.SphereGeometry(1200, 24, 12);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: linColor(0x7fb6e6) }, uBot: { value: linColor(0xf3e6cf) } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uTop; uniform vec3 uBot; varying vec3 vP; void main(){ float t = smoothstep(-0.1, 0.6, vP.y); gl_FragColor = vec4(mix(uBot,uTop,t),1.0); ${COLORSPACE_CHUNK} }`,
  });
  const m = new THREE.Mesh(geo, mat); m.renderOrder = -1; m.frustumCulled = false;
  W.scene.add(m); W.sky = m; W.skyMat = mat;
}

function buildLava() {
  const geo = new THREE.CircleGeometry(23, 36); geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 vU; void main(){ vU = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uTime; varying vec2 vU;
      float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float vn(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hsh(i),hsh(i+vec2(1,0)),f.x), mix(hsh(i+vec2(0,1)),hsh(i+vec2(1,1)),f.x), f.y); }
      void main(){ float n = vn(vU*0.35 + vec2(uTime*0.15, uTime*0.1)) * 0.6 + vn(vU*0.9 - uTime*0.2)*0.4;
        vec3 c = mix(vec3(0.6,0.05,0.0), vec3(1.0,0.55,0.05), smoothstep(0.35,0.75,n));
        c = mix(c, vec3(1.0,0.95,0.6), smoothstep(0.78,0.9,n));
        gl_FragColor = vec4(c,1.0); ${COLORSPACE_CHUNK} }`,
  });
  const m = new THREE.Mesh(geo, mat); m.position.set(P.nest.x, 26, P.nest.z);
  W.scene.add(m); W.lavaMat = mat; W.lava = m;
}

// ───── static batching ─────
const Batch = {
  lit: new Map(), glow: new Map(), B: 130,
  key(g) { const a = g.attributes.position.array; let sx = 0, sz = 0; const n = a.length / 3; const st = Math.max(1, Math.floor(n / 12)); let c = 0; for (let i = 0; i < n; i += st) { sx += a[i * 3]; sz += a[i * 3 + 2]; c++; } return Math.floor(sx / c / this.B) + ',' + Math.floor(sz / c / this.B); },
  add(parts, glow = false) { const M = glow ? this.glow : this.lit; for (const p of parts) { const k = this.key(p); if (!M.has(k)) M.set(k, []); M.get(k).push(p); } },
  build() {
    for (const [, parts] of this.lit) { const m = meshOf(parts); m.receiveShadow = true; W.scene.add(m); }
    for (const [, parts] of this.glow) { const m = meshOf(parts, new THREE.MeshBasicMaterial({ vertexColors: true })); m.castShadow = false; W.scene.add(m); }
    this.lit.clear(); this.glow.clear();
  },
};
function place(parts, x, y, z, ry = 0, s = 1) {
  const m = new THREE.Matrix4().makeRotationY(ry); m.scale(new THREE.Vector3(s, s, s)); m.setPosition(x, y, z);
  for (const p of parts) p.applyMatrix4(m);
  return parts;
}
function placeM(parts, x, y, z, rx, ry, rz, s = 1) {
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz)); m.scale(new THREE.Vector3(s, s, s)); m.setPosition(x, y, z);
  for (const p of parts) p.applyMatrix4(m);
  return parts;
}

// ───── prop prototypes (merged geometries for instancing) ─────
const PROTO = {};
function buildProtos() {
  PROTO.oak = mergeParts([
    part(cyl(0.3, 0.5, 2.6, 6), 0x7a5536, { y: 1.3 }),
    part(ico(2.3, 0), 0x5f9e45, { y: 3.9, jit: 0.25 }),
    part(ico(1.6, 0), 0x77b24d, { x: 1.2, y: 3.2, z: 0.6, jit: 0.25 }),
    part(ico(1.5, 0), 0x6aa848, { x: -1.0, y: 3.4, z: -0.7, jit: 0.25 }),
  ]);
  PROTO.blossom = mergeParts([
    part(cyl(0.25, 0.42, 2.4, 6), 0x7a5536, { y: 1.2 }),
    part(ico(2.0, 0), 0xf2a7bf, { y: 3.5, jit: 0.25 }),
    part(ico(1.3, 0), 0xf8c6d4, { x: 1.0, y: 3.0, z: 0.5, jit: 0.2 }),
  ]);
  PROTO.pine = mergeParts([
    part(cyl(0.25, 0.4, 2, 5), 0x6b4a32, { y: 1 }),
    part(cone(2.2, 3.2, 7), 0x2f6b4f, { y: 3, jit: 0.2 }),
    part(cone(1.7, 2.8, 7), 0x377a58, { y: 4.6, jit: 0.2 }),
    part(cone(1.1, 2.2, 7), 0x3f8661, { y: 6, jit: 0.2 }),
  ]);
  PROTO.snowpine = mergeParts([
    part(cyl(0.25, 0.4, 2, 5), 0x6b4a32, { y: 1 }),
    part(cone(2.2, 3.2, 7), 0x2e6150, { y: 3, jit: 0.2 }),
    part(cone(1.8, 1.0, 7), 0xf2f6fb, { y: 4.3 }),
    part(cone(1.7, 2.8, 7), 0x356b58, { y: 4.6, jit: 0.2 }),
    part(cone(1.25, 0.9, 7), 0xf2f6fb, { y: 5.7 }),
    part(cone(1.1, 2.2, 7), 0x3a735e, { y: 6, jit: 0.2 }),
    part(cone(0.6, 0.9, 7), 0xffffff, { y: 6.9 }),
  ]);
  const palmParts = [];
  let px = 0, py = 0;
  for (let i = 0; i < 5; i++) { palmParts.push(part(cyl(0.26, 0.32, 1.25, 6), i % 2 ? 0xa57c52 : 0x8f6a45, { x: px, y: py + 0.62, rz: -0.12 - i * 0.04 })); px += 0.12 + i * 0.05; py += 1.2; }
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU;
    palmParts.push(part(box(3.4, 0.08, 0.8), i % 2 ? 0x4f9a3f : 0x5fae48, { x: px + Math.cos(a) * 1.6, y: py - 0.35, z: Math.sin(a) * 1.6, ry: -a, rz: 0, rx: 0, jit: 0.15 }));
  }
  palmParts.push(part(sph(0.28, 5, 4), 0x8a6a3a, { x: px, y: py - 0.6, z: 0.3 }), part(sph(0.28, 5, 4), 0x8a6a3a, { x: px - 0.3, y: py - 0.6, z: -0.1 }));
  PROTO.palm = mergeParts(palmParts);
  PROTO.bush = mergeParts([part(ico(1.1, 0), 0x5a9a42, { y: 0.7, jit: 0.25 }), part(ico(0.8, 0), 0x6cae4d, { x: 0.7, y: 0.5, jit: 0.25 })]);
  PROTO.rock = mergeParts([part(dod(1), 0x8f93a0, { y: 0.4, jit: 0.2, sy: 0.7 })]);
  PROTO.mossrock = mergeParts([part(dod(1), 0x868b92, { y: 0.4, jit: 0.2, sy: 0.7 }), part(dod(0.75), 0x6f9a52, { y: 0.75, sy: 0.35, jit: 0.2 })]);
  PROTO.snowrock = mergeParts([part(dod(1), 0x9aa3b4, { y: 0.4, jit: 0.15, sy: 0.75 }), part(dod(0.85), 0xf5f8fc, { y: 0.8, sy: 0.35 })]);
  PROTO.basalt = mergeParts([part(cyl(0.8, 1, 2.2, 6), 0x3e3438, { y: 1.1, jit: 0.2 }), part(cyl(0.6, 0.8, 1.4, 6), 0x4b3f42, { x: 1.1, y: 0.7, jit: 0.2 })]);
  PROTO.sandrock = mergeParts([part(dod(1), 0xc9b08a, { y: 0.35, jit: 0.15, sy: 0.6 })]);
  PROTO.grass = mergeParts([
    part(cone(0.12, 0.8, 3), 0xffffff, { y: 0.4, rz: 0.2 }), part(cone(0.12, 0.9, 3), 0xffffff, { x: 0.15, y: 0.45, rz: -0.25 }), part(cone(0.1, 0.7, 3), 0xffffff, { x: -0.1, y: 0.35, z: 0.12, rx: 0.3 }),
  ]);
  PROTO.flower = mergeParts([
    part(cyl(0.03, 0.03, 0.6, 3), 0x4c8a3c, { y: 0.3 }),
    part(ico(0.2, 0), 0xffffff, { y: 0.65 }), part(ico(0.08, 0), 0xffe9a0, { y: 0.72 }),
  ]);
  PROTO.crystal = mergeParts([part(cone(0.5, 2.6, 5), 0xffffff, { y: 1.2 }), part(cone(0.35, 1.6, 5), 0xffffff, { x: 0.5, y: 0.7, rz: -0.4 }), part(cone(0.3, 1.3, 5), 0xffffff, { x: -0.45, y: 0.6, rz: 0.45 })]);
  PROTO.coralBranch = mergeParts([
    part(cyl(0.12, 0.2, 1.6, 5), 0xffffff, { y: 0.8 }), part(cyl(0.09, 0.12, 1.1, 5), 0xffffff, { x: 0.35, y: 1.4, rz: -0.6 }), part(cyl(0.09, 0.12, 1.0, 5), 0xffffff, { x: -0.32, y: 1.2, rz: 0.7 }),
    part(sph(0.16, 5, 4), 0xffffff, { y: 1.65 }), part(sph(0.13, 5, 4), 0xffffff, { x: 0.65, y: 1.75 }), part(sph(0.13, 5, 4), 0xffffff, { x: -0.6, y: 1.55 }),
  ]);
  PROTO.coralFan = mergeParts([part(cyl(1.2, 1.2, 0.1, 9, 1), 0xffffff, { y: 1.1, rx: Math.PI / 2, sy: 1 }), part(cyl(0.08, 0.1, 0.6, 4), 0xffffff, { y: 0.2 })]);
  PROTO.brain = mergeParts([part(ico(0.9, 1), 0xffffff, { y: 0.3, sy: 0.6, jit: 0.2 })]);
  PROTO.kelp = mergeParts([part(box(0.25, 5, 0.06), 0x3f8d4a, { y: 2.5, jit: 0.2 }), part(box(0.22, 4, 0.06), 0x4fa356, { x: 0.3, y: 2, ry: 1.2, jit: 0.2 }), part(box(0.2, 3.4, 0.06), 0x5ab560, { x: -0.25, y: 1.7, ry: 2.2, jit: 0.2 })]);
  PROTO.glowplant = mergeParts([part(cyl(0.04, 0.05, 1.2, 3), 0xffffff, { y: 0.6 }), part(sph(0.22, 6, 4), 0xffffff, { y: 1.25 }), part(cyl(0.04, 0.05, 0.8, 3), 0xffffff, { x: 0.3, y: 0.4, rz: -0.3 }), part(sph(0.16, 6, 4), 0xffffff, { x: 0.42, y: 0.85 })]);
  PROTO.shell = mergeParts([part(cone(0.3, 0.25, 6), 0xf6d9c4, { y: 0.1, rx: Math.PI / 2 })]);
  PROTO.starfish = mergeParts([0, 1, 2, 3, 4].map((i) => part(box(0.5, 0.08, 0.14), 0xf28a5a, { x: Math.cos((i / 5) * TAU) * 0.22, y: 0.05, z: Math.sin((i / 5) * TAU) * 0.22, ry: -(i / 5) * TAU })));
  PROTO.lanternPost = mergeParts([
    part(cyl(0.1, 0.14, 3, 5), 0x4a3a2e, { y: 1.5 }), part(box(0.9, 0.1, 0.1), 0x4a3a2e, { x: 0.4, y: 2.9 }),
  ]);
  PROTO.lanternGlow = mergeParts([part(box(0.42, 0.55, 0.42), 0xffcf6e, { x: 0.8, y: 2.5 }), part(cone(0.36, 0.3, 4), 0x5a4030, { x: 0.8, y: 2.92, ry: Math.PI / 4 })]);
  PROTO.fencePost = mergeParts([part(box(0.22, 1.2, 0.22), 0x8a6340, { y: 0.6 })]);
  PROTO.fenceRail = mergeParts([part(box(1, 0.12, 0.08), 0xa57a4f, { y: 0.85 }), part(box(1, 0.12, 0.08), 0xa57a4f, { y: 0.45 })]);
  PROTO.crate = mergeParts([part(box(1, 1, 1), 0xa47848, { y: 0.5, jit: 0.1 }), part(box(1.04, 0.14, 1.04), 0x7a5634, { y: 0.9 }), part(box(1.04, 0.14, 1.04), 0x7a5634, { y: 0.1 })]);
  PROTO.barrel = mergeParts([part(cyl(0.45, 0.4, 1.1, 8), 0x9b6a3c, { y: 0.55, jit: 0.1 }), part(cyl(0.47, 0.47, 0.08, 8), 0x555a60, { y: 0.85 }), part(cyl(0.47, 0.47, 0.08, 8), 0x555a60, { y: 0.25 })]);
  PROTO.cabbage = mergeParts([part(ico(0.38, 0), 0x86c25a, { y: 0.3, jit: 0.2 })]);
  PROTO.pumpkin = mergeParts([part(sph(0.45, 7, 5), 0xe88a2e, { y: 0.35, sy: 0.75, jit: 0.1 }), part(cyl(0.05, 0.06, 0.25, 4), 0x5b7a3a, { y: 0.75 })]);
  PROTO.sunflower = mergeParts([part(cyl(0.05, 0.06, 1.8, 4), 0x4c8a3c, { y: 0.9 }), part(cyl(0.38, 0.38, 0.08, 8), 0xf6c33a, { y: 1.85, rx: 1.2 }), part(cyl(0.18, 0.18, 0.1, 8), 0x6b4a2a, { y: 1.88, z: 0.03, rx: 1.2 })]);
  PROTO.cloud = mergeParts([part(ico(6, 1), 0xffffff, { sy: 0.55 }), part(ico(4.5, 1), 0xffffff, { x: 5, y: -0.5, sy: 0.6 }), part(ico(4, 1), 0xffffff, { x: -5, y: -0.8, sy: 0.55 })]);
  PROTO.driftwood = mergeParts([part(cyl(0.18, 0.22, 2.6, 5), 0xb39b7f, { y: 0.15, rz: Math.PI / 2 }), part(cyl(0.1, 0.12, 0.9, 4), 0xb39b7f, { x: 0.6, y: 0.35, rz: 0.6 })]);
  PROTO.mushroom = mergeParts([part(cyl(0.12, 0.16, 0.6, 5), 0xf5ead8, { y: 0.3 }), part(sph(0.4, 6, 4), 0xffffff, { y: 0.62, sy: 0.55 })]);
  PROTO.ember = mergeParts([part(dod(0.6), 0xffffff, { y: 0.3, jit: 0.3 })]);
}

const PropSets = {};
function ps(name, proto, opt) { if (!PropSets[name]) PropSets[name] = new PropSet(name, PROTO[proto], opt); return PropSets[name]; }
function buildPropSets() { for (const k in PropSets) PropSets[k].build(W.scene); }

// scatter helper: tries n times, calls test(x,z,h) → put
const Avoid = []; // {x,z,r}
function avoid(x, z, r) { Avoid.push({ x, z, r }); }
function isAvoided(x, z, pad = 0) { for (const a of Avoid) if (Math.hypot(x - a.x, z - a.z) < a.r + pad) return true; return false; }
function scatter(n, bounds, test, rng = Math.random) {
  for (let k = 0; k < n; k++) {
    const x = lerp(bounds[0], bounds[2], rng()), z = lerp(bounds[1], bounds[3], rng());
    const h = gy(x, z);
    test(x, z, h, rng);
  }
}
