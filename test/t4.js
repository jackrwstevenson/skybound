// save mid-game, reload into a fresh game, verify state + objectives rebuild
const { makeGame } = require('./harness.js');
const vm = require('vm');
const mock = require('./mock.js');
let g = makeGame(); let X = g.X; let run = (c) => vm.runInContext(c, g.ctx);
g.boot(); g.step(5); run("UI.menuAct('new')"); g.secs(1.2); g.dialog();
run("G.ctype='cloud'; G.name='Gale'; G.palette=1; Comp.build(); G.flags.bonding=false; applyStage(2); G.done.ride=G.done.ride2=G.done.glide=G.done.beach=G.done.clue1=G.done.clue2=G.done.clue3=G.done.firstflight=G.done.frost=true; G.flags.sorrelMet=true; G.done.arches=true; G.coins=77; G.xp=50; G.chests.wreck=true; G.weapons.cutlass=true; G.weapon='cutlass';");
g.tp(P = X.P.lodge.x + 9, X.P.lodge.z); g.step(10);
run('saveGame(true)');
const saved = mock.store['skybound-lifetime-v1'];
console.log('saved bytes', saved.length);
// fresh game sharing localStorage
g = makeGame(); X = g.X; run = (c) => vm.runInContext(c, g.ctx);
g.boot(); g.step(3);
console.log('hasSave', run('hasSave()'));
run("UI.menuAct('continue')"); g.secs(1); 
console.log('loaded', X.G.name, X.G.ctype, 'stage', X.G.stage, 'coins', X.G.coins, 'weapon', X.G.weapon, 'P', X.P1.x.toFixed(0), X.P1.z.toFixed(0));
console.log('objectives', X.Obj.list.map((o) => o.id).join(', '));
console.log('wreck chest opened', X.Chests.find((c) => c.id === 'wreck').opened, 'comp built', !!X.Comp.C, 'mode', X.G.mode);
g.secs(2);
console.log('errors', g.errors.length);
