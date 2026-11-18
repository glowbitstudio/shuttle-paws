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
console.log('PASS dare-lesson: per-situation position memory, limit on repeats, contradictory lessons damped to neutral; values seen when alternating: ' + seen.join(' '));
