const { makeGame } = require('./harness.js');
const vm = require('vm');
const g = makeGame(); const X = g.X; const run = (c) => vm.runInContext(c, g.ctx);
g.boot(); g.step(3);
for (const it of X.Interact) {
  if (it.follow) { it.x = it.follow.x; it.z = it.follow.z; it.y = it.follow.y ?? it.y; }
  const land = X.Colliders.ground(it.x, it.z, 999);
  const terr = X.Terrain.getH(it.x, it.z);
  const water = terr < -1.15 && land < 0;
  const yr = it.yr || 4;
  let ok;
  if (water) ok = it.y >= terr - yr && it.y <= -0.55 + yr; else ok = Math.abs(it.y - land) <= yr;
  // also check standable within radius r (some ground within r with |y-it.y|<yr)
  let near = false;
  for (let a = 0; a < 12 && !near; a++) for (const rr of [0.5, it.r * 0.6, it.r * 0.95]) { const x = it.x + Math.cos(a / 12 * 6.283) * rr, z = it.z + Math.sin(a / 12 * 6.283) * rr; const gg = X.Colliders.ground(x, z, it.y + 1.2, 1.2); const t2 = X.Terrain.getH(x, z); const w2 = t2 < -1.15 && gg < 0; if (w2 ? (it.y >= t2 - yr && it.y <= -0.55 + yr) : Math.abs(gg - it.y) <= yr) near = true; }
  if (!ok || !near) console.log('SUSPECT', it.id, 'y', (+it.y).toFixed(1), 'land', land.toFixed(1), 'terr', terr.toFixed(1), water ? 'WATER' : '', 'near', near);
}
console.log('checked', X.Interact.length);
