'use strict';
// What one stat buys a HUMAN player (assist 1), measured directly on the human code path, deterministic.
//   node tests/balance-human-proxy.js [simFile=../sim.js]
// For each stat: value 1 / 3 / 5 with every other stat at 3 (cat's CHARS entry is patched only while the match is created).
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const file = path.resolve(process.argv[2] || path.join(__dirname, '..', 'sim.js'));
function load() { let seed = 777; const math = Object.create(Math); math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  const box = { module: { exports: {} }, Math: math };
  vm.runInNewContext(fs.readFileSync(file, 'utf8').replace('  DT, G, DRAG,', '  _hit: doHit, _rest: restAll,\n  DT, G, DRAG,'), box); return box.module.exports; }
function match(S, over) { const cat = S.CHARS.find((c) => c.id === 'cat'), keep = cat.stats; cat.stats = Object.assign({ spd: 3, jmp: 3, pow: 3, rch: 3, ctl: 3, sta: 3 }, over);
  try { return S.createMatch({ mode: '1v1', points: 11, venue: 0, firstServe: 0, moveAssist: false, autoSave: false, slots: [{ char: 'cat', ctrl: 'human', assist: 1 }, { char: 'bear', ctrl: 'human', assist: 1 }] }); } finally { cat.stats = keep; } }
function rally(m) { m.state = 'rally'; m.clock = 1; Object.assign(m.shuttle, { held: false, live: false, landed: true }); m.athletes[0].x = 0; m.athletes[0].z = 4; }
const f = (v, d = 2) => +v.toFixed(d);
function measure(stat, val) {
  const over = { [stat]: val }, out = {};
  { const S = load(), m = match(S, over), a = m.athletes[0]; rally(m); a.input.x = 1; let t = 0; while (a.x < 2.5 && t < 600) { S.step(m); t++; } out['run 2.5 m (s)'] = f(t / 120, 3);
    out['top speed m/s'] = f(a.st.speed); }
  { const S = load(), m = match(S, over), a = m.athletes[0]; rally(m); a.input.jump = true; let peak = 0; for (let i = 0; i < 150; i++) { S.step(m); peak = Math.max(peak, a.jumpY); } out['jump peak (m)'] = f(peak); }
  { const S = load(), m = match(S, over), a = m.athletes[0]; rally(m); out['reach radius (m)'] = f(1.05 * a.st.reach * 1.08, 3); }
  { const S = load(), m = match(S, over), a = m.athletes[0]; rally(m); a.x = 0; a.z = 4; a.input.hit = true; a.input.power = 0.85;
    Object.assign(m.shuttle, { held: false, live: true, landed: false, last: 1, lastTeam: 1, p: { x: 0, y: 1.7, z: 4 }, v: { x: 0, y: -1, z: 0 } }); S.step(m);
    const hit = m.events.find((e) => e.type === 'hit'); out['smash contact y'] = f(hit.y); out['smash launch m/s'] = f(hit.speed, 1);
    const p = { ...m.shuttle.p }, v = { ...m.shuttle.v }; let t = 0; while (p.z > -3 && p.y > 0 && t < 3) { S.stepShuttle(p, v, S.DT, null); t += S.DT; }
    out['smash to receiver, 7 m (s)'] = f(t, 3); out['smash heaviness'] = m.shuttle.heavy === undefined ? 'n/a' : f(m.shuttle.heavy); }
  { let sum = 0, n = 300, S = load(); for (let i = 0; i < n; i++) { const m = match(S, over), a = m.athletes[0]; rally(m); m.shuttle.p = { x: 0, y: 2, z: 3 }; S._hit(m, a, 'clear', { x: 1, z: -5 }, 0.75);
      const r = S.simLand(m.shuttle.p, m.shuttle.v, m.wind); sum += Math.hypot(r.x - 1, r.z + 5); } out['Good clear miss (m, avg)'] = f(sum / n); }
  { // longest early press (buffered hit) that is still graded Perfect
    let best = 0; for (let d = 0.2; d <= 0.9; d += 0.01) { const S = load(), m = match(S, over), a = m.athletes[0]; rally(m); a.x = 0; a.z = 3; a.hitQueue = m.clock - d; a.hitPower = 0.5;
      Object.assign(m.shuttle, { live: true, landed: false, lastTeam: 1, last: 1, p: { x: 0, y: 1.7, z: 3 }, v: { x: 0, y: -1, z: 0 } }); S.step(m); const h = m.events.find((e) => e.type === 'hit'); if (h && h.q > 0.9) best = d; }
    out['early press still Perfect (s)'] = f(best); }
  { const S = load(), m = match(S, over), a = m.athletes[0]; m.state = 'rally'; for (let j = 0; j < 20; j++) { m.shuttle.p = { x: 0, y: 2.5, z: 3 }; S._hit(m, a, 'smash', { x: 0, z: -5 }, 1); } out['stamina after 20 smashes'] = f(a.sta);
    a.sta = 0.4; S._rest(m, 0.12); out['interval rest from 0.40'] = f(a.sta); }
  return out;
}
const S0 = load(); console.log(path.basename(file));
for (const stat of ['spd', 'jmp', 'pow', 'rch', 'ctl', 'sta']) {
  const r = [1, 3, 5].map((v) => measure(stat, v)), rows = {};
  for (const k of Object.keys(r[0])) if (r[0][k] !== r[2][k]) rows[k] = { 'stat=1': r[0][k], 'stat=3': r[1][k], 'stat=5': r[2][k] };
  console.log('\n' + stat + ' (only the measures it changes):'); console.table(rows);
}
