const { makeGame } = require('./harness.js');
const vm = require('vm');
const g = makeGame(); const X = g.X; const run = (c) => vm.runInContext(c, g.ctx);
g.boot(); g.step(5);
g.ctx.HTMLCanvasElement = function () {}; g.ctx.HTMLCanvasElement.prototype = {};
run(`Trailer.type='ember'; Trailer.start(false);`); g.step(150);
const rows = []; let frames = 0;
const subj = { 0: [0, 0], 1: [0, 0], 2: [1, 1], 3: [2, 2], 4: [2, 2], 5: [2, 2], 6: [3, 3], 7: [3, 3], 8: [3, 3] };
while (run('Trailer.active') && frames < 2400) {
  g.frame(); frames++; if (frames % 20) continue;
  const si = run('Trailer.shotIdx'), t = run('Trailer.T');
  const ci = subj[si][1];
  const C = run(`Trailer.C[${ci}]`);
  let target = C.root.visible ? C.root.position : null;
  if (si === 1) target = run('Trailer.H[0].root.position');
  if (!target) { rows.push(`shot ${si} t=${t.toFixed(1)} NO SUBJECT VISIBLE`); continue; }
  const cam = X.W.camera; cam.updateMatrixWorld();
  const v = new X.W.camera.position.constructor(target.x, target.y + 1, target.z).project(cam);
  const d = Math.hypot(cam.position.x - target.x, cam.position.y - target.y, cam.position.z - target.z);
  const inFrame = v.z < 1 && Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.85;
  rows.push(`shot ${si} t=${t.toFixed(1)} ndc(${v.x.toFixed(2)},${v.y.toFixed(2)}) dist ${d.toFixed(1)} ${inFrame ? '' : '<-- OUT OF FRAME'}`);
}
console.log(rows.join('\n'));
