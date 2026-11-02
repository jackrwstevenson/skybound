// Quest targets reachable? Check each objective target's ground height & region; and companion behaviour sanity over long idle
const { makeGame } = require('./harness.js');
const vm = require('vm');
const g = makeGame(); const X = g.X; const run = (c) => vm.runInContext(c, g.ctx);
g.boot(); g.step(3); run("UI.menuAct('new')"); g.secs(1.2); g.dialog();
run("G.ctype='moon'; G.name='Luna'; Comp.build(); G.flags.bonding=false; applyStage(0);");
g.tp(0, 20); X.Comp.teleportNear(); 
// idle for 40s: companion should sit then sleep
g.secs(10); console.log('after 10s idle comp state', X.Comp.state); g.secs(20); console.log('after 30s', X.Comp.state);
// walk around: companion follows
g.walkTo(40, 40, 15, 1); console.log('comp dist after walk', Math.hypot(X.Comp.x - X.P1.x, X.Comp.z - X.P1.z).toFixed(1), 'state', X.Comp.state);
// swim: companion swims
g.tp(-2, 40); g.step(2); g.walkTo(-2, 60, 6, 1); g.secs(2);
console.log('player mode', X.P1.mode, 'comp swim', X.Comp.swim, 'air', X.Comp.air, 'comp y', X.Comp.y.toFixed(1));
// child ability spark puff hits crows etc ok
// time to fly far: comp teleports
run("applyStage(2)"); g.tp(0, 0); X.Comp.teleportNear(); g.step(2);
g.press('e'); g.press('space'); X.Input.keys.space = true; g.secs(1); X.Input.keys.space = false;
X.Input.keys.w = true; X.Input.keys.shift = true; g.secs(6); X.Input.keys.w = X.Input.keys.shift = false;
console.log('flew to', X.P1.x.toFixed(0), X.P1.z.toFixed(0), 'mode', X.P1.mode, 'stam', X.P1.stam.toFixed(0));
// fly over sea to the ship without finale: warning shot pushes back
g.tp(X.Ship.x + 60, X.Ship.z - 60, 30); X.P1.mode = 'fly'; X.Comp.mounted = true; g.step(2); X.Input.keys.a = true; X.Input.keys.s = true; g.secs(4); X.Input.keys.a = X.Input.keys.s = false;
console.log('near ship pre-finale', Math.hypot(X.P1.x - X.Ship.x, X.P1.z - X.Ship.z).toFixed(0), 'toasts', X.UI.toasts.map((t) => t.el.innerHTML.slice(20, 80)).join(' | '));
console.log('errors', g.errors.length);
