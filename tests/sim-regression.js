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
test('shuttle travelling low under the net tape is always netted', () => {
  for (const y of [.05, .3, .8, 1.2, 1.45]) { crossingCase(y, 0, true); crossingCase(y, 3, true); }
});
test('oversized or non-numeric move input cannot exceed normal running speed', () => {
  const run = (x, y) => { const m = match(); m.state = 'rally'; const a = m.athletes[0]; const x0 = a.x, z0 = a.z;
    for (let i = 0; i < 120; i++) { a.input.x = x; a.input.y = y; S.step(m); } return Math.hypot(a.x - x0, a.z - z0); };
  const fair = run(Math.SQRT1_2, Math.SQRT1_2);
  assert(fair > 1);
  assert(Math.abs(run(1, 1) - fair) < 1e-9);
  assert(Math.abs(run(50, 50) - fair) < 1e-9);
  assert.equal(run(NaN, Infinity), 0);
  assert.equal(run('abc', {}), 0);
});
test('nothing plays an out-going shuttle for you; Chuyen never auto-hits on a held button', () => {
  const run = ({ assist, pressAt, hold, vz, lateTap }) => {
    const m = S.createMatch({ mode: '1v1', points: 11, venue: 0, firstServe: 0, moveAssist: false, autoSave: false,
      slots: [{ char: 'cat', ctrl: 'human', assist: 1 }, { char: 'cat', ctrl: 'human', assist }] });
    const a = m.athletes[1], sg = Math.sign(a.z) || 1;
    m.state = 'rally'; m.clock = 1; m.wind = { x: 0, z: 0 };
    const p = { x: 0, y: 2.2, z: -sg * 3 }, v = { x: 0, y: vz > 12 ? 9 : 6, z: sg * vz };
    Object.assign(m.shuttle, { held: false, live: true, landed: false, netted: false, last: 0, lastTeam: 0, p: { ...p }, v: { ...v } });
    const r = S.simLand(p, v, m.wind); m.shuttle.pred = { x: r.x, z: r.z, t: r.t, inside: Math.abs(r.z) <= S.HALF_L };
    a.x = 0; a.z = sg * Math.min(Math.abs(r.z) - 0.2, S.HALF_L - 0.1);
    for (let t = 0; m.shuttle.live && t < 600; t++) {
      if (hold) { a.input.hold = true; a.input.holdPower = .5; }
      if (t === pressAt || (lateTap && S.inReachAt(a, m.shuttle.p).ok && m.shuttle.v.y < 0)) { a.input.hit = true; a.input.power = .5; }
      S.step(m); if (m.shuttle.lastTeam === 1) return { hit: true, land: Math.abs(r.z) };
    }
    return { hit: false, land: Math.abs(r.z) };
  };
  assert.equal(run({ assist: 1, pressAt: 5, vz: 9 }).hit, true);            // in: an early press still plays it
  assert.equal(run({ assist: 1, hold: true, vz: 9 }).hit, true);            // in: held button still plays it
  assert.equal(run({ assist: 0, hold: true, vz: 9 }).hit, false);           // Chuyen: holding never plays for you
  for (const vz of [18, 21]) {                                              // narrowly out and clearly out
    const early = run({ assist: 1, pressAt: 5, vz }); assert(early.land > S.HALF_L + 0.1); assert.equal(early.hit, false);
    assert.equal(run({ assist: 1, hold: true, vz }).hit, false);
    assert.equal(run({ assist: 1, lateTap: true, vz }).hit, true);          // you can still choose to play it yourself
  }
});
test('an early press is remembered for 1 s at most', () => {
  const run = (early) => {
    const m = S.createMatch({ mode: '1v1', points: 11, venue: 0, firstServe: 0, moveAssist: false, autoSave: false,
      slots: [{ char: 'cat', ctrl: 'human', assist: 1 }, { char: 'cat', ctrl: 'human', assist: 1 }] });
    const a = m.athletes[1], sg = Math.sign(a.z) || 1;
    m.state = 'rally'; m.clock = 1; m.wind = { x: 0, z: 0 };
    const p = { x: 0, y: 2.2, z: -sg * 3 }, v = { x: 0, y: 20, z: sg * 6 };   // high lob: long flight
    Object.assign(m.shuttle, { held: false, live: true, landed: false, netted: false, last: 0, lastTeam: 0, p: { ...p }, v: { ...v } });
    const r = S.simLand(p, v, m.wind); m.shuttle.pred = { x: r.x, z: r.z, t: r.t, inside: true };
    assert(Math.abs(r.z) < S.HALF_L && r.t > 1.8);
    a.x = 0; a.z = r.z;
    // find when it first comes into reach on the way down, then replay pressing `early` seconds before that
    let reachT = -1; { const q = { ...p }, w = { ...v }; for (let t = 0; t < 600 && q.y > 0; t++) { S.stepShuttle(q, w, S.DT, m.wind); if (w.y < 0 && S.inReachAt(a, q).ok) { reachT = t; break; } } }
    assert(reachT > 150);
    const pressAt = reachT - Math.round(early / S.DT);
    for (let t = 0; m.shuttle.live && t < 800; t++) { if (t === pressAt) { a.input.hit = true; a.input.power = .5; } S.step(m); if (m.shuttle.lastTeam === 1) return true; }
    return false;
  };
  assert.equal(run(0.3), true); assert.equal(run(0.8), true);
  assert.equal(run(1.3), false); assert.equal(run(1.8), false);
});
test('a shuttle still on the opponent side of the net cannot be played (no reaching over or through the net)', () => {
  const tryHit = (ctrl, zSide, y) => {
    const m = S.createMatch({ mode: '1v1', points: 11, venue: 0, firstServe: 0, moveAssist: false, autoSave: false,
      slots: [{ char: 'cat', ctrl: 'human', assist: 1 }, ctrl === 'bot' ? { char: 'cat', ctrl: 'bot', diff: 3 } : { char: 'cat', ctrl: 'human', assist: 1 }] });
    const a = m.athletes[1], sg = Math.sign(a.z) || 1;
    m.state = 'rally'; m.clock = 1; m.wind = { x: 0, z: 0 };
    // shuttle hovering near the net, drifting slowly along it, zSide metres onto the receiver's side (negative = not crossed yet)
    Object.assign(m.shuttle, { held: false, live: true, landed: false, netted: false, last: 0, lastTeam: 0,
      p: { x: 0, y, z: sg * zSide }, v: { x: 0, y: 0.6, z: 0 } });
    m.shuttle.pred = { x: 0, z: sg * Math.max(zSide, 0.2), t: 0.5, inside: true };
    a.x = 0; a.z = sg * 0.7;                                   // standing right at the net, shuttle well within reach
    for (let t = 0; t < 30 && m.shuttle.live; t++) {
      if (ctrl === 'human') { a.input.hit = true; a.input.power = .3; }
      S.step(m); if (m.shuttle.lastTeam === 1) return true;
      Object.assign(m.shuttle.p, { x: 0, y, z: sg * zSide }); Object.assign(m.shuttle.v, { x: 0, y: 0.6, z: 0 });   // hold it there
    }
    return false;
  };
  for (const ctrl of ['human', 'bot']) for (const y of [0.8, 1.3, 1.9]) {
    assert.equal(tryHit(ctrl, -0.25, y), false, ctrl + ' reached 25 cm over/through the net at y=' + y);
    assert.equal(tryHit(ctrl, -0.03, y), false, ctrl + ' played it before it crossed at y=' + y);
  }
  assert.equal(tryHit('human', 0.3, 1.3), true);               // once it has crossed it is playable as before
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
