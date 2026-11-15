'use strict';
// Usage: record-human-buffered.js <output dir name> [ticks] [seed] [--dry]
// Immutable replay input that exercises the human "known shot" path: player 0 is a scripted human (assist 1, 3-button
// style presses = input.hit + power) against a bot. The script presses EARLY (as soon as the shuttle has crossed the net,
// re-pressing if the 1 s buffer expired), cycling clear / smash-or-drive / drop-or-net, so most of its hits come from the
// buffered press (a.hitQueue > 0 on the frames before contact) and the shot is determined before the hit.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.resolve(__dirname, '..'), S = require(path.join(root, 'sim.js'));
const TICKS = +process.argv[3] || 2400, SEED0 = +process.argv[4] || 5150, dry = process.argv[5] === '--dry';
let seed = SEED0; Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const options = { mode: '1v1', points: 21, games: 1, venue: 0, hitStop: false, autoSplit: true, autoSave: false,
  slots: [{ name: 'Human', char: 'cat', ctrl: 'human', assist: 1, hand: 'L' }, { name: 'Bot', char: 'frog', ctrl: 'bot', diff: 1, hand: 'R' }] };
const m = S.createMatch(options), dt = 1 / 120, frames = [], POWERS = [0.5, 0.85, 0.2];
let presses = 0, lastPress = -999; const log = [];
for (let i = 0; i < TICKS; i++) {
  const a = m.athletes[0], s = m.shuttle, sg = Math.sign(a.z) || 1;
  a.input.x = 0; a.input.y = 0;
  if (m.state === 'serve' && m.serverIdx === 0 && m.stateT > 1.2 && i - lastPress > 60) { a.input.hit = true; a.input.power = presses % 2 ? 0.2 : 0.8; lastPress = i; presses++; }
  else if (m.state === 'rally' && s.live && !s.netted && s.lastTeam !== a.team && s.p.z * sg > 0.05 && !(a.hitQueue > 0) && a.swingT < 0 && i - lastPress > 24) {
    a.input.hit = true; a.input.power = POWERS[presses % 3]; lastPress = i; presses++;
  }
  const queued = a.hitQueue > 0;
  S.step(m, dt);
  const events = m.events.splice(0);
  for (const e of events) if (e.type === 'hit') log.push(i + ':' + e.shot + ':p' + e.i + (e.i === 0 ? (queued ? ':buffered' : ':direct') : ''));
  if (!dry) frames.push({ tick: i, state: JSON.parse(JSON.stringify(m)), events });
}
console.log(log.join(' ')); console.log('score', m.score, 'presses', presses);
if (dry) process.exit(0);
const output = path.join(root, process.argv[2]); fs.mkdirSync(output);
const bytes = JSON.stringify({ dt, options, frames }); fs.writeFileSync(path.join(output, 'authoritative.json'), bytes);
const hash = x => crypto.createHash('sha256').update(x).digest('hex');
fs.writeFileSync(path.join(output, 'provenance.json'), JSON.stringify({ recorder: 'tests/record-human-buffered.js', initialSeed: SEED0, finalSeed: seed, dt, ticks: frames.length, hits: log, simRawSHA256: hash(fs.readFileSync(path.join(root, 'sim.js'))), inputSHA256: hash(bytes) }, null, 2));
console.log('Recorded', frames.length, 'ticks', hash(bytes));
