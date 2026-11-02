const { makeGame } = require('./harness.js');
const vm = require('vm');
const g = makeGame(); const run = (c) => vm.runInContext(c, g.ctx);
g.boot(); g.step(2);
// fake audio context so buildScore runs
run(`Audio.ctx = { currentTime: 0 }; Trailer.bus = {}; Audio.tone = function(){ globalThis.__n = (globalThis.__n||0)+1; }; Audio.noise = function(){ globalThis.__n = (globalThis.__n||0)+1; };`);
const ev = run('Trailer.buildScore()');
const shots = run('Trailer.shots ? 0 : (Trailer.shots = Trailer.buildShots(), Trailer.shots.map(s => [s.t0, s.dur]))');
console.log('events', ev.length, 'first', ev[0].t, 'last', ev[ev.length - 1].t.toFixed(2));
console.log('shot starts', shots.map(([a]) => a).join(', '), 'total', run('Trailer.DUR'));
ev.forEach((e) => e.fn(0)); console.log('voices fired', run('__n'));
const caps = run('TR_CAPTIONS'); for (const [a, b, t] of caps) { const s = shots.findIndex(([s0, d]) => a >= s0 && b <= s0 + d); console.log(`  ${a}-${b} [shot ${s}] ${t}`); }
