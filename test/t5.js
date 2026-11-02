const { makeGame } = require('./harness.js');
const g = makeGame(); const X = g.X;
g.boot(); g.step(5);
// estimate real triangle counts by geometry type
const T = { BoxGeometry: 12, CylinderGeometry: 28, ConeGeometry: 14, SphereGeometry: 84, IcosahedronGeometry: 80, DodecahedronGeometry: 36, TorusGeometry: 144 };
let draws = 0, vis = 0;
X.W.scene.traverse((o) => { if (o.isMesh || o.constructor.name === 'Points' || o.constructor.name === 'Sprite') { draws++; let p = o, v = true; while (p) { if (!p.visible) v = false; p = p.parent; } if (v) vis++; } });
console.log('total drawables', draws, 'visible at title', vis);
g.tp(0, 0); g.step(5);
vis = 0; X.W.scene.traverse((o) => { if (o.isMesh || o.constructor.name === 'Points' || o.constructor.name === 'Sprite') { let p = o, v = true; while (p) { if (!p.visible) v = false; p = p.parent; } if (v) vis++; } }); console.log('visible in village', vis);
g.tp(X.Ship.x, X.Ship.z, X.Ship.deck); g.step(5);
vis = 0; X.W.scene.traverse((o) => { if (o.isMesh || o.constructor.name === 'Points' || o.constructor.name === 'Sprite') { let p = o, v = true; while (p) { if (!p.visible) v = false; p = p.parent; } if (v) vis++; } }); console.log('visible at ship', vis);
let inst = 0; X.W.scene.traverse((o) => { if (o.count) inst += o.count; }); console.log('instances', inst);
