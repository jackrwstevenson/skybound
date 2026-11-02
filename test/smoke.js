// Fast CI check (~15s): the bundle parses, boots, and the first minutes of the game are playable.
const { makeGame } = require('./harness.js');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const fail = [];
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail.push(m); };

// 1. shipped HTML is intact
ok(html.includes('id="gameSrc"') && !html.includes('/*__GAME__*/'), 'game source was injected into the page');
ok((html.match(/<script/g) || []).length === (html.match(/<\/script>/g) || []).length, 'script tags are balanced');
ok(/cdn\.jsdelivr\.net[^'"]*three/.test(html), 'Three.js CDN loader present');

// 2. boots and plays the opening
const g = makeGame(); const X = g.X; const run = (c) => vm.runInContext(c, g.ctx);
g.boot(); g.step(10);
ok(X.G.mode === 'title', 'boots to the title screen');
run("UI.menuAct('new')"); g.secs(1.5); g.dialog();
ok(X.Obj.has('nursery'), 'new game gives the first objective');
const bram = X.NPCs.get('bram'); g.tp(bram.x - 3, bram.z + 2); g.step(5); g.dialog();
ok(X.G.flags.bonding, 'nursery bonding sequence starts');
g.interact('hatch_ember', [1]);
ok(X.Hatch.byType.ember.aff > 0, 'playing with a hatchling builds affection');
run("G.ctype='ember'; G.name='Spark'; Comp.build(); G.flags.bonding=false; applyStage(2);");
g.tp(0, 20); g.step(5); g.press('e'); g.step(3); g.press('space'); g.secs(2);
ok(X.P1.mode === 'fly', 'an adult pair can take off and fly');
run('saveGame(true)'); ok(run('hasSave()'), 'saving works');
ok(g.errors.length === 0, 'no runtime errors (' + g.errors.length + ')');
console.log(fail.length ? '\n' + fail.length + ' check(s) failed' : '\nSmoke test passed');
process.exit(fail.length ? 1 : 0);
