// Headless trailer run: plays every shot, samples camera & actors, checks state restoration.
const { makeGame } = require('./harness.js');
const vm = require('vm');
const TYPE = process.argv[2] || 'ember';
const g = makeGame(); const X = g.X; const run = (c) => vm.runInContext(c, g.ctx);
g.boot(); g.step(5);
const ctx = g.ctx;
ctx.HTMLCanvasElement = function () {}; ctx.HTMLCanvasElement.prototype = {};  // no recorder in mock → "Just watch" path
const fail = []; const ok = (c, m) => { if (!c) fail.push(m); };
run(`Trailer.type='${TYPE}'; Trailer.start(false);`);
g.step(150); // prep + fonts timeout
const T = () => run('Trailer.T');
ok(run('Trailer.phase') === 'run', 'trailer running, phase=' + run('Trailer.phase'));
const seen = new Set(); let minCamClear = 99, worst = '', actorBelow = [], frames = 0, maxShot = -1;
const camGround = (x, z) => Math.max(run(`Colliders.ground(${x},${z},999,0)`), -999);
while (run('Trailer.active') && frames < 60 * 40) {
  g.frame(); frames++;
  const si = run('Trailer.shotIdx'); seen.add(si); maxShot = Math.max(maxShot, si);
  if (frames % 6) continue;
  const c = X.W.camera.position, t = T();
  const under = si === 5;
  const gnd = X.Terrain.getH(c.x, c.z);
  const clear = c.y - gnd;
  if (clear < minCamClear) { minCamClear = clear; worst = `shot ${si} t=${t.toFixed(2)} cam(${c.x.toFixed(1)},${c.y.toFixed(1)},${c.z.toFixed(1)}) ground ${gnd.toFixed(1)}`; }
  if (!under && c.y < 0.3 && gnd < 0) actorBelow.push(`camera under water shot ${si} t=${t.toFixed(2)}`);
  // visible creatures above terrain
  for (const k of [0, 1, 2, 3]) {
    const C = run(`Trailer.C && Trailer.C[${k}]`); if (!C || !C.root.visible) continue;
    const p = C.root.position, tg = X.Terrain.getH(p.x, p.z);
    if (p.y < tg - 0.3 && !under) actorBelow.push(`creature${k} below ground shot ${si} t=${t.toFixed(2)} y=${p.y.toFixed(1)} g=${tg.toFixed(1)}`);
  }
}
console.log('frames', frames, 'shots seen', [...seen].sort().join(','), 'trailer dur', run('Trailer.DUR'));
console.log('min camera clearance', minCamClear.toFixed(2), '@', worst);
console.log('actor issues', actorBelow.slice(0, 8));
ok(!run('Trailer.active'), 'trailer finished');
ok(maxShot === run('Trailer.shots.length') - 1 && seen.size === run('Trailer.shots.length'), 'all shots played');
ok(minCamClear > 0.8, 'camera never clips terrain');
ok(actorBelow.length === 0, 'actors above ground');
ok(X.G.mode === 'title', 'returned to title, mode=' + X.G.mode);
ok(X.P1.root.visible, 'player visible again');
ok(!run('Trailer.root'), 'actors removed');
ok(Math.abs(X.W.camera.fov - 45) < 1e-6, 'fov restored');
ok(g.errors.length === 0, 'no errors (' + g.errors.length + ')');
// game still playable afterwards
run("UI.menuAct('new')"); g.secs(1.5);
ok(X.G.mode === 'play' && X.Dialog.open, 'new game starts after trailer');
console.log(fail.length ? 'FAILURES:\n  ' + fail.join('\n  ') : 'TRAILER OK');
