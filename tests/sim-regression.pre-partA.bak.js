'use strict';
// Offline, deterministic simulation regressions: node tests/sim-regression.js
const assert = require('node:assert/strict');
const S = require('../sim.js');
let count = 0;
function test(name, fn) { fn(); count++; console.log('PASS ' + name); }
function match(n = 2) {
  return S.createMatch({ mode: n === 4 ? '2v2' : '1v1', points: 11, venue: 0,
    firstServe: 0, moveAssist: false, autoSave: false,
    slots: Array.from({ length: n }, () => ({ char: 'cat', ctrl: 'human', assist: 1 })) });
}
function flight(m, p, v = { x: 0, y: -1, z: 0 }) {
  m.state = 'rally'; m.clock = 1;
  Object.assign(m.shuttle, { held: false, live: true, landed: false, last: 0, lastTeam: 0, p, v });
}
function press(a, x, z) { Object.assign(a, { x, z }); Object.assign(a.input, { hit: true, power: .3 }); }
function fixedRandom(value, fn) { const old = Math.random; Math.random = () => value; try { fn(); } finally { Math.random = old; } }
function crossingCase(y, vy, shouldNet) {
  const m = match();
  flight(m, { x: 0, y, z: .01 }, { x: 0, y: vy, z: -20 });
  const p = { ...m.shuttle.p }, v = { ...m.shuttle.v };
  S.stepShuttle(p, v, S.DT, m.wind);
  const crossY = y + (p.y - y) * (.01 / (.01 - p.z));
  const prediction = S.simLand(m.shuttle.p, m.shuttle.v, m.wind);
  assert(Math.abs(prediction.crossY - crossY) < 1e-10);
  fixedRandom(.99, () => S.step(m));
  assert.equal(m.shuttle.netted, shouldNet);
  return { m, crossY, endY: p.y };
}
test('descending: above-net crossing remains legal despite below-net tick endpoint', () => {
  const r = crossingCase(1.8, -42, false);
  assert(r.crossY > S.NET_H && r.endY < S.NET_H);
});
test('ascending: below-net crossing faults despite above-net tick endpoint', () => {
  const r = crossingCase(1.4, 42, true);
  assert(r.crossY < S.NET_H && r.endY > S.NET_H);
});
test('ordinary ascending above-net and descending below-net crossings', () => {
  crossingCase(1.8, 10, false); crossingCase(1.3, -10, true);
});
test('net width uses crossing x, not tick endpoint', () => {
  for (const [x, vx, expected] of [[3.1, 30, true], [3.2, -30, false]]) {
    const m = match(); flight(m, { x, y: 1, z: .01 }, { x: vx, y: 0, z: -20 });
    S.step(m); assert.equal(m.shuttle.netted, expected);
  }
});
test('tape roll uses crossing height and starts a new history segment', () => {
  const m = match(); flight(m, { x: 0, y: 1.53, z: .01 }, { x: 0, y: -20, z: -20 });
  m.hist.push({ t: .9, x: 0, y: 1, z: .5 });
  fixedRandom(.1, () => S.step(m));
  assert(m.events.some(e => e.type === 'netcord'));
  assert.equal(m.shuttle.netted, false);
  assert(!m.hist.some(h => h.t === .9));
});
test('below tape cannot roll over even when endpoint rises into tape range', () => {
  const m = match(); flight(m, { x: 0, y: 1.4, z: .01 }, { x: 0, y: 14, z: -20 });
  fixedRandom(.1, () => S.step(m)); assert(m.shuttle.netted);
  assert(!m.events.some(e => e.type === 'netcord'));
});
test('previous-shot history cannot return a newly hit shuttle', () => {
  const m = match(); flight(m, { x: 0, y: 1, z: -.5 });
  m.hist.push({ t: .9, x: 0, y: 1, z: .5 });
  press(m.athletes[1], 0, -.5); S.step(m);
  assert.equal(m.shuttle.last, 1); assert(!m.hist.some(h => h.t === .9));
  const a = m.athletes[0]; press(a, 0, 1.5); a.lag = .25;
  assert(!S.inReachAt(a, m.shuttle.p).ok); S.step(m);
  assert.equal(m.shuttle.last, 1);
});
test('same-flight history still permits legitimate lag compensation', () => {
  const m = match(); flight(m, { x: 0, y: 1, z: -4 });
  m.hist.push({ t: .9, x: 0, y: 1, z: -2 });
  const a = m.athletes[1]; press(a, 0, -2); a.lag = .25;
  assert(!S.inReachAt(a, m.shuttle.p).ok); S.step(m);
  assert.equal(m.shuttle.last, 1);
  assert(m.events.some(e => e.type === 'hit' && e.z === -2));
});
test('serve reset and new serve clear history', () => {
  const m = match(); m.state = 'point'; m.stateT = 2;
  m.hist.push({ t: .9, x: 0, y: 1, z: .5 }); S.step(m);
  assert.equal(m.state, 'serve'); assert.equal(m.hist.length, 0);
  m.hist.push({ t: m.clock, x: 0, y: 1, z: .5 });
  m.athletes[m.serverIdx].input.hit = true; S.step(m);
  assert.equal(m.state, 'rally'); assert.equal(m.hist.length, 1);
});
for (const ctrl of ['human', 'bot']) for (const correct of [true, false]) {
  test(`${ctrl}: ${correct ? 'designated receiver accepted' : 'wrong receiver awards serving team a fault point'}`, () => {
    const m = match(4); flight(m, { x: 1, y: 1, z: -3 }); m.serveShot = true;
    const i = correct ? m.receiverIdx : 3, a = m.athletes[i];
    m.athletes[2].x = -3; m.athletes[2].z = -6;
    press(a, 1, -3); a.ctrl = ctrl; a.diff = 2;
    fixedRandom(.5, () => S.step(m));
    if (correct) { assert.equal(m.shuttle.last, i); assert.equal(m.state, 'rally'); assert.equal(m.serveShot, false); }
    else {
      assert.equal(m.state, 'point'); assert.deepEqual(m.score, [1, 0]);
      assert.equal(m.shuttle.live, false); assert.equal(m.shuttle.last, 0);
      assert(m.events.some(e => e.type === 'point' && e.why === 'Sai người đỡ giao cầu'));
      assert.equal(m.events.filter(e => e.type === 'hit').length, 0);
    }
  });
}
test('ordinary doubles rally allows receiver partner to hit', () => {
  const m = match(4); flight(m, { x: 1, y: 1, z: -3 }); m.serveShot = false;
  press(m.athletes[3], 1, -3); S.step(m);
  assert.equal(m.shuttle.last, 3); assert.equal(m.state, 'rally');
});
test('two teammates pressing together produce only one normal rally contact', () => {
  const m = match(4); flight(m, { x: 1, y: 1, z: -3 });
  press(m.athletes[2], 1, -3); press(m.athletes[3], 1, -3); S.step(m);
  assert.equal(m.events.filter(e => e.type === 'hit').length, 1);
});
console.log(`${count} simulation regression groups passed`);
