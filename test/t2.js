const { makeGame } = require('./harness.js');
const vm = require('vm');
const g = makeGame(); const X = g.X; const run = (c) => vm.runInContext(c, g.ctx);
g.boot(); g.step(5);
// draw-call estimate
let meshes = 0, inst = 0, skinned = 0, pts = 0, shadow = 0;
X.W.scene.traverse((o) => { if (o.isMesh) { meshes++; if (o.castShadow) shadow++; if (o.count) inst++; } if (o.constructor.name === 'Points') pts++; });
console.log('meshes', meshes, 'instanced', inst, 'points', pts, 'shadow casters', shadow, 'colliders', X.Colliders.boxes.length, X.Colliders.circles.length);
run("UI.menuAct('new')"); g.secs(1.2); g.dialog();
run("G.ctype='ember'; G.name='T'; Comp.build(); applyStage(2); G.flags.bonding=false;");
// 1. house blocks
const h = X.Spots.home; g.tp(h.x + 9, h.z); X.Comp.x = 999;
g.walkTo(h.x - 10, h.z, 4, 0.5);
console.log('house block: started x', (h.x + 9).toFixed(1), 'ended x', X.P1.x.toFixed(1), '(house spans', (h.x - 4).toFixed(1), '..', (h.x + 4).toFixed(1), ')');
// 2. bridge
const b = X.Spots.bridge; let maxY = -9; g.tp(b.x - 9, b.z + 0); 
console.log('bridge start y', X.P1.y.toFixed(2), 'terrain at center', X.Terrain.getH(b.x, b.z).toFixed(2));
// walk across along path direction: find path dir
g.walkTo(b.x + 9, b.z, 6, 0.6);
console.log('bridge end', X.P1.x.toFixed(1), X.P1.z.toFixed(1), 'mode', X.P1.mode);
// 3. ship: stand on main deck and walk to quarterdeck via stairs
const S = X.Ship;
const lp = (lx, lz) => run(`shipLocal(${lx},${lz})`);
let p = lp(0, 4); g.tp(p.x, p.z, S.deck); g.step(5);
console.log('deck y', X.P1.y.toFixed(2), 'expected', S.deck);
let tgt = lp(-S.L + 10, 4); g.walkTo(tgt.x, tgt.z, 10, 0.8);
console.log('climbed to quarterdeck y', X.P1.y.toFixed(2), 'expected', S.aft, 'pos local', JSON.stringify(run(`shipLocalOf(${X.P1.x},${X.P1.z})`)));
tgt = lp(S.L - 6, 3); g.walkTo(tgt.x, tgt.z, 14, 0.8);
console.log('walked to forecastle y', X.P1.y.toFixed(2), 'expected', S.fore, 'local', JSON.stringify(run(`shipLocalOf(${X.P1.x},${X.P1.z})`)));
// try walking off the side (rail)
p = lp(10, 0); g.tp(p.x, p.z, S.deck); tgt = lp(10, 14); g.walkTo(tgt.x, tgt.z, 3, 0.5);
console.log('rail test local', JSON.stringify(run(`shipLocalOf(${X.P1.x},${X.P1.z})`)), 'y', X.P1.y.toFixed(2));
// boarding net from water: start in water at +z side near lx=4
p = lp(4, 16); g.tp(p.x, p.z, -0.5); g.step(30);
console.log('in water mode', X.P1.mode, X.P1.y.toFixed(2));
tgt = lp(4, 2); g.walkTo(tgt.x, tgt.z, 10, 0.8);
console.log('climbed net: mode', X.P1.mode, 'y', X.P1.y.toFixed(2), 'local', JSON.stringify(run(`shipLocalOf(${X.P1.x},${X.P1.z})`)));
// 4. defeat flow
g.tp(0, 30); run('G.hp = 1; playerTakeDamage(20, 1, 30)'); g.secs(3);
console.log('after defeat: mode', X.G.mode, 'hp', X.G.hp, 'pos', X.P1.x.toFixed(0), X.P1.z.toFixed(0), 'stage', X.G.stage);
// 5. drowning without pearl (teen, ember)
run("applyStage(1)"); g.tp(X.P.lagoon.x, X.P.lagoon.z); g.step(10); X.Input.keys.q = true; g.secs(4); X.Input.keys.q = false;
console.log('no-pearl dive: y', X.P1.y.toFixed(1), 'breath', X.P1.breath.toFixed(1)); g.secs(8);
console.log('after 8s: y', X.P1.y.toFixed(1), 'hp', X.G.hp, 'mode', X.P1.mode);
// 6. companion follows into swim and flight
run("applyStage(2)"); g.tp(0, 30); X.Comp.x = X.P1.x + 1; X.Comp.z = X.P1.z; g.step(2); g.press('e'); g.press('space'); X.Input.keys.space = true; g.secs(3); X.Input.keys.space=false; X.Input.keys.w = true; g.secs(4); X.Input.keys.w=false;
console.log('flying alt', (X.P1.y - X.Terrain.getH(X.P1.x, X.P1.z)).toFixed(1), 'speed', X.P1.hspeed.toFixed(1));
// ceiling
X.Input.keys.space = true; g.secs(20); X.Input.keys.space = false; console.log('ceiling y', X.P1.y.toFixed(1), 'stam', X.P1.stam.toFixed(0));
