const { makeGame } = require('./harness.js');
const vm = require('vm');
const g = makeGame(); const X = g.X; const run = (c) => vm.runInContext(c, g.ctx);
g.boot(); g.step(5); run("UI.menuAct('new')"); g.secs(1.2); g.dialog();
run("G.ctype='ember'; G.name='T'; Comp.build(); applyStage(2); G.flags.bonding=false;");
const S = X.Ship; const lp = (lx, lz) => run(`shipLocal(${lx},${lz})`); const loc = () => run(`shipLocalOf(${X.P1.x},${X.P1.z})`);
function walkLocal(lx0, lz0, y0, lx1, lz1, secs) {
  let p = lp(lx0, lz0); g.tp(p.x, p.z, y0); X.Comp.x = 9999; g.step(3);
  const t = lp(lx1, lz1); const r = []; 
  g.run(secs, () => { const dx = t.x - X.P1.x, dz = t.z - X.P1.z, d = Math.hypot(dx, dz); const K = X.Input.keys; K.w = dz < -0.3 * d; K.s = dz > 0.3 * d; K.a = dx < -0.3 * d; K.d = dx > 0.3 * d; return d < 0.8; });
  const K = X.Input.keys; K.w = K.s = K.a = K.d = false; const l = loc();
  return `local (${l.x.toFixed(1)},${l.z.toFixed(1)}) y ${X.P1.y.toFixed(2)} mode ${X.P1.mode}`;
}
// ramp ground sampling
for (const lx of [-S.L + 15, -S.L + 16.5, -S.L + 18, -S.L + 20, -S.L + 21.5]) { const p = lp(lx, 4); console.log('stair ground at lx', lx, run(`Colliders.ground(${p.x},${p.z},20,1.2)`).toFixed(2)); }
for (const lz of [6.5, 8, 10, 12, 13]) { const p = lp(4, lz); console.log('net ground at lz', lz, run(`Colliders.ground(${p.x},${p.z},20,1.2)`).toFixed(2), 'terrain', X.Terrain.getH(p.x, p.z).toFixed(1)); }
console.log('stairs up:', walkLocal(-S.L + 23, 4, S.deck, -S.L + 12, 4, 8));
console.log('stairs down:', walkLocal(-S.L + 12, 4, S.aft, -S.L + 23, 4, 8));
console.log('fore up:', walkLocal(S.L - 19, -4, S.deck, S.L - 8, -4, 8));
console.log('net up:', walkLocal(4, 15, -0.5, 4, 2, 10));
console.log('net2 up:', walkLocal(-4, -15, -0.5, -4, -2, 10));
for (const lx of [12, 13.5, 15, 16.5, 18, 19]) { const p = lp(lx, -4); console.log('fore stair ground at lx', lx, run(`Colliders.ground(${p.x},${p.z},20,1.2)`).toFixed(2)); }
{ let p = lp(12, -4); g.tp(p.x, p.z, S.deck); X.Comp.x = 9999; g.step(3); const t = lp(24, -4);
  for (let i = 0; i < 240; i++) { const dx = t.x - X.P1.x, dz = t.z - X.P1.z, d = Math.hypot(dx, dz); const K = X.Input.keys; K.w = dz < -0.3 * d; K.s = dz > 0.3 * d; K.a = dx < -0.3 * d; K.d = dx > 0.3 * d; g.frame(); if (i % 20 === 0) { const l = loc(); console.log('t', i, 'local', l.x.toFixed(2), l.z.toFixed(2), 'y', X.P1.y.toFixed(2), 'gnd', run(`Colliders.ground(${X.P1.x},${X.P1.z},${X.P1.y},1.1)`).toFixed(2)); } } }
