'use strict';
// Challenger position memory: lessons are kept per situation (the bot's own last shot), repeated lessons add up to a limit,
// contradictory lessons in a row return to neutral with smaller steps instead of swinging to the other side.
const assert = require('node:assert/strict'), S = require('../sim');
const m = S.createMatch({ mode: '1v1', points: 21, venue: 0, slots: [{ name: 'h', char: 'cat', ctrl: 'bot', diff: 3 }, { name: 'c', char: 'cat', ctrl: 'bot', diff: 4 }] });
const b = m.athletes[1], sg = S.sgn(b.team);
const lose = (short, shot) => { b.lastShot = shot; b.z = sg * (short ? 4.5 : 2.5); m.shuttle.p.z = sg * (short ? 1.5 : 5.5); m.shuttle.lastTeam = 0; S.botLearn(m, 0); };
lose(true, 'smash'); lose(true, 'smash'); lose(true, 'smash'); lose(true, 'smash');
assert.equal(b.learn.pos.smash, 1.25, 'beaten short after its smash again and again: forward, up to the limit');
assert.equal(b.learn.pos.drop || 0, 0, 'what it does after a drop is untouched');
lose(false, 'drop'); assert.equal(b.learn.pos.drop, -0.45, 'beaten deep after its drop: back, in that situation only'); assert.equal(b.learn.pos.smash, 1.25);
// alternate short / deep in one situation: the value must stay near neutral, never swing between the extremes
const seen = []; for (let i = 0; i < 10; i++) { lose(i % 2 === 0, 'clear'); seen.push(b.learn.pos.clear); }
assert(Math.max(...seen.slice(1).map(Math.abs)) <= 0.16, 'alternating lessons stay near neutral: ' + seen.join(' '));
assert(Math.abs(b.learn.front) <= 0.65 && b.learn.bad.smash === 4 && b.learn.bad.clear === 10, JSON.stringify(b.learn));
// a point lost to its own error (shuttle on the other side) teaches nothing about position
const before = JSON.stringify(b.learn.pos); b.lastShot = 'drive'; m.shuttle.p.z = -sg * 3; m.shuttle.lastTeam = b.team; S.botLearn(m, 0); assert.equal(JSON.stringify(b.learn.pos), before); assert.equal(b.learn.bad.drive, 1);
// ---- situation table: the same shot is judged per situation (bot zone, opponent zone, opponent down or not)
{ const m2 = S.createMatch({ mode: '1v1', points: 21, venue: 0, slots: [{ name: 'h', char: 'cat', ctrl: 'bot', diff: 3 }, { name: 'c', char: 'cat', ctrl: 'bot', diff: 4 }] });
  const c = m2.athletes[1], h = m2.athletes[0], g = S.sgn(c.team), hg = S.sgn(h.team);
  const set = (bz, oz, down) => { c.z = g * bz; h.z = hg * oz; h.diveT = -1; h.recoverT = down ? 0.3 : 0; m2.shuttle.p.y = 2.3; m2.shuttle.p.z = g * bz; c.sta = 1; c.lastKey = c.lastShot = null; c.hist = []; };   // each call stands for a fresh rally
  set(5.2, 3.0, true); assert.equal(S.dareKey(m2, c), '211'); set(5.2, 3.0, false); assert.equal(S.dareKey(m2, c), '210'); set(1.5, 5.5, false); assert.equal(S.dareKey(m2, c), '020');
  const share = (bz, oz, down, n) => { let k = 0; for (let i = 0; i < n; i++) { set(bz, oz, down); if (S.botChooseShot(m2, c) === 'smash') k++; } return k / n; };
  assert(share(5.2, 3.0, true, 300) > 0.85, 'nothing learned: a high shuttle at the back is smashed');
  // lesson: smashing from the rear court while the opponent is down loses (they drop short as they get up); a clear from there wins
  c.learn.T = {}; for (let i = 0; i < 6; i++) { set(5.2, 3.0, true); c.lastKey = '211'; c.lastShot = 'smash'; m2.shuttle.p.z = g * 1.4; m2.shuttle.p.x = c.x; m2.shuttle.lastTeam = h.team; S.botLearn(m2, h.team); }
  for (let i = 0; i < 6; i++) { c.lastKey = '211'; c.lastShot = 'clear'; S.botLearn(m2, c.team); }
  assert.deepEqual(c.learn.T['c|211|smash'], [6, 0]); assert.deepEqual(c.learn.T['c|211|clear'], [6, 6]);
  assert.deepEqual(c.learn.T['y|211|smash'], [6, 0, 0, 0, 0], 'the reason is kept: beaten short while standing deep'); assert.deepEqual(c.learn.T['r|211|smash'], [6, 0, 0], 'and where the reply came: short');
  const a1 = share(5.2, 3.0, true, 400), a2 = share(5.2, 3.0, false, 400), a3 = share(3.5, 3.0, true, 400);
  assert(a1 < 0.3, 'in that situation it now mostly avoids the smash: ' + a1); assert(a2 > 0.6 && a3 > 0.6 && a2 > a1 + 0.35 && a3 > a1 + 0.35, 'other situations keep the smash (only a weak general nudge): ' + a2 + ' ' + a3);
  // after playing that shot in that situation it goes where the reply usually comes: forward
  console.log('situation table: smash share at the back with the opponent down ' + a1.toFixed(2) + ', opponent up ' + a2.toFixed(2) + ', from mid-court ' + a3.toFixed(2)); }
console.log('PASS dare-lesson: per-situation position memory, limit on repeats, contradictory lessons damped to neutral; values seen when alternating: ' + seen.join(' '));
