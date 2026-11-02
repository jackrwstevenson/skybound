const { makeGame } = require('./harness.js');
const g = makeGame(); const X = g.X;
g.boot(); g.step(3);
const groups = {};
for (const c of X.W.scene.children) { let n = 0; c.traverse((o) => { if (o.isMesh || o.constructor.name === 'Points' || o.constructor.name === 'Sprite') n++; }); const k = c.constructor.name + (n > 1 ? '(multi)' : ''); groups[k] = groups[k] || { objs: 0, draws: 0 }; groups[k].objs++; groups[k].draws += n; }
console.log(groups);
const per = (C) => { let n = 0; C.root.traverse((o) => { if (o.isMesh) n++; }); return n; };
console.log('creature meshes', per(X.Hatch.list[0].C), 'human meshes', (() => { let n = 0; X.P1.H.root.traverse((o) => { if (o.isMesh) n++; }); return n; })());
console.log('npcs', X.NPCs.list.length, 'wild', X.Wild.list.length, 'mermaids', X.Mermaids.list.length, 'chests', X.Chests.length);
