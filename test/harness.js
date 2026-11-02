// Headless harness: runs the bundled game logic with mocked THREE/DOM and a simulated clock.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
function makeGame(opts = {}) {
  const mock = require('./mock.js');
  // fresh copies per game (module cache shares; fine for single run)
  let now = 0; const timers = []; let rafCb = null; let tid = 0;
  const errors = [];
  const ctx = {
    console, Math, JSON, Date, Array, Object, String, Number, Boolean, Set, Map, Proxy, Error, Float32Array, Uint8Array, Uint8ClampedArray, Infinity, NaN, parseInt, parseFloat, isNaN, RegExp, Symbol, Promise,
    THREE: mock.THREE, document: mock.document, localStorage: mock.localStorage, location: mock.window.location,
    innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
    addEventListener: mock.window.addEventListener,
    confirm: () => true,
    requestAnimationFrame: (cb) => { rafCb = cb; },
    setTimeout: (fn, ms = 0) => { const id = ++tid; timers.push({ id, t: now + ms, fn }); return id; },
    clearTimeout: (id) => { const i = timers.findIndex((t) => t.id === id); if (i >= 0) timers.splice(i, 1); },
    AudioContext: undefined,
  };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  const code = fs.readFileSync(opts.file || require('path').join(__dirname, '..', 'build', 'game.js'), 'utf8');
  // expose top-level consts by appending an export shim
  const names = ['G', 'P1', 'Comp', 'Obj', 'W', 'Enemies', 'Spots', 'Input', 'Dialog', 'Interact', 'Hatch', 'Bond', 'NPCs', 'Chests', 'Landmarks', 'P', 'Ship', 'Rings', 'Boss', 'Pickups', 'Terrain', 'Colliders', 'UI', 'Nest', 'Pip', 'Song', 'Shells', 'Crows', 'HideSeek', 'Training', 'Finale', 'Ending', 'Wild', 'Mermaids', 'XP_NEED', 'gainXP', 'growCeremony', 'mount', 'dismount', 'saveGame', 'loadGame', 'hasSave', 'Cam', 'Projectiles', 'Breakables', 'director', 'regionAt', 'shipLocal', 'Cannons', 'collectFruit', 'Telegraphs', 'FX', 'Geysers', 'maxHp', 'stamMax', 'hasBreath', 'WEAPON_DEF'];
  const shim = '\n;globalThis.__X = {' + names.map((n) => `${n}: (typeof ${n} !== 'undefined' ? ${n} : undefined)`).join(',') + '};';
  try { vm.runInContext(code + shim, ctx, { filename: 'game.js' }); } catch (e) { console.error('LOAD ERROR', e); throw e; }
  const X = ctx.__X;
  const api = {
    ctx, X, errors,
    boot() { vm.runInContext('boot()', ctx); },
    frame(dt = 1 / 60) {
      now += dt * 1000;
      // fire timers due
      timers.sort((a, b) => a.t - b.t);
      while (timers.length && timers[0].t <= now) { const t = timers.shift(); try { t.fn(); } catch (e) { errors.push(e); console.error('TIMER ERROR', e.stack); } }
      const cb = rafCb; rafCb = null;
      try { cb(now); } catch (e) { errors.push(e); console.error('FRAME ERROR', e.stack); throw e; }
    },
    step(n = 1, dt) { for (let i = 0; i < n; i++) api.frame(dt); },
    secs(s) { api.step(Math.round(s * 60)); },
    press(k) { X.Input.pressed[k] = true; X.Input.keys[k] = true; api.frame(); X.Input.keys[k] = false; },
    hold(k, s) { X.Input.keys[k] = true; api.secs(s); X.Input.keys[k] = false; },
    click() { X.Input.mouse.clicked = true; api.frame(); },
    tp(x, z, y) { const P1 = X.P1; P1.x = x; P1.z = z; P1.y = y ?? X.Colliders.ground(x, z, 999); P1.vx = P1.vy = P1.vz = 0; if (P1.mode !== 'foot' && P1.mode !== 'swim' && P1.mode !== 'fly') {} X.Comp.teleportNear(); X.Cam.snap(P1); },
    walkTo(x, z, maxS = 30, tol = 1.5) {
      // steer with keys toward target
      const P1 = X.P1; let t = 0;
      while (t < maxS) {
        const dx = x - P1.x, dz = z - P1.z, d = Math.hypot(dx, dz);
        if (d < tol) break;
        const K = X.Input.keys; K.w = dz < -0.3 * d; K.s = dz > 0.3 * d; K.a = dx < -0.3 * d; K.d = dx > 0.3 * d;
        api.frame(); t += 1 / 60;
      }
      const K = X.Input.keys; K.w = K.s = K.a = K.d = false;
      return Math.hypot(x - P1.x, z - P1.z);
    },
    dialog(choices = []) {
      // advance dialog; choices is array of option indices consumed in order
      let guard = 0;
      while ((X.Dialog.open || X.Dialog.pending.length) && guard++ < 400) {
        api.secs(0.1);
        const cur = X.Dialog.cur;
        if (!cur) { api.frame(); continue; }
        // finish typing
        api.press('e');
        if (X.Dialog.cur && X.Dialog.cur.opts) { const c = choices.length ? choices.shift() : 0; api.ctx.__c = c; vm.runInContext('Dialog.choose(__c)', ctx); api.frame(); }
      }
      if (X.Dialog.open) throw new Error('dialog stuck: ' + (X.Dialog.cur && X.Dialog.cur.text));
      api.frame();
    },
    lastDialogText: () => X.Dialog.cur && X.Dialog.cur.text,
    interact(id, choices) {
      const it = X.Interact.find((i) => i.id === id);
      if (!it) throw new Error('no interact ' + id);
      if (it.follow) { it.x = it.follow.x; it.z = it.follow.z; }
      const y = it.y ?? X.Colliders.ground(it.x, it.z, 999);
      api.tp(it.x + 0.6, it.z + 0.6, Math.max(y, X.P1.mode === 'swim' ? X.P1.y : y));
      // move companion away so its prompt doesn't steal
      X.Comp.x = X.P1.x + 30; X.Comp.z = X.P1.z + 30; X.Comp.y = X.Colliders.ground(X.Comp.x, X.Comp.z);
      api.step(2);
      if (it.cond && !it.cond()) throw new Error('interact cond false: ' + id);
      // verify it is in range of the resolver, then trigger it explicitly (other interactables may be nearer)
      const d = Math.hypot(it.x - X.P1.x, it.z - X.P1.z);
      if (d > it.r) throw new Error('interact out of range: ' + id + ' d=' + d.toFixed(2));
      X.Input.pressed = {}; it.act(); api.frame();
      if (choices !== false) api.dialog(choices || []);
    },
    run(sec, fn) { for (let i = 0; i < sec * 60; i++) { if (fn && fn()) return true; api.frame(); } return false; },
    now: () => now,
    timersPending: () => timers.length,
  };
  return api;
}
module.exports = { makeGame };
