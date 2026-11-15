'use strict';
// Keeps the presentation-side shot prediction (between the <shot-prediction> markers of a game.js-like file) in step with
// the simulation's own humanShot / botChooseShot.  Usage: node tests/shot-prediction-regression.js [file, default game.js]
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const file = path.resolve(root, process.argv[2] || 'game.js');
const game = fs.readFileSync(file, 'utf8');
const a0 = game.indexOf('// <shot-prediction>'), a1 = game.indexOf('// </shot-prediction>');
if (a0 < 0 || a1 < 0) { console.log('SKIP ' + path.basename(file) + ' has no <shot-prediction> block (candidate not applied)'); process.exit(0); }
let seed = 4242; const math = Object.create(Math); math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const box = { module: { exports: {} }, Math: math };
vm.runInNewContext(fs.readFileSync(path.join(root, 'sim.js'), 'utf8').replace('  DT, G, DRAG,', '  _humanShot: humanShot, _botChooseShot: botChooseShot,\n  DT, G, DRAG,'), box);
const S = box.module.exports;
const mirror = {}; vm.runInNewContext(game.slice(a0, a1) + '\nout.humanShotAt = humanShotAt; out.botShotOptions = botShotOptions; out.genericShots = genericShots;', { out: mirror });
const rnd = (lo, hi) => lo + (hi - lo) * math.random();
// humans: identical result for every combination
let n = 0;
for (const y of [0.3, 0.9, 1.04, 1.05, 1.06, 1.3, 1.35, 1.36, 1.45, 1.46, 1.58, 1.59, 1.6, 1.61, 1.7, 1.71, 1.74, 1.75, 1.76, 2.2, 2.9])
  for (const pw of [undefined, 0, 0.2, 0.34, 0.35, 0.39, 0.4, 0.5, 0.71, 0.72, 0.85, 1])
    for (const iy of [-1, -0.41, -0.4, 0, 0.4, 0.41, 1])
      for (const jumpY of [0, 0.25, 0.26, 0.9]) for (const assist of [0, 1, 2]) for (const sta of [0.1, 0.15, 1]) for (const z of [1, 2.5, 2.6, 2.61, 4, 6]) {
        const a = { z, jumpY, assist, sta };
        const sim = S._humanShot({ shuttle: { p: { x: 0, y, z } } }, a, iy, pw);
        assert.equal(mirror.humanShotAt(a, y, iy, pw), sim, JSON.stringify({ y, pw, iy, a }));
        assert(mirror.genericShots(y).includes(sim), 'generic set misses ' + sim + ' at y=' + y);
        n++;
      }
console.log('PASS humanShotAt === sim humanShot for ' + n + ' combinations; genericShots covers every one');
// bots: the sim's (random) choice is always inside the predicted option set, and every predicted option does occur
let cases = 0;
for (let k = 0; k < 400; k++) {
  const diff = k % 4, doubles = k % 8 >= 4;
  const b = { team: 0, diff, z: rnd(0.4, 6.6), sta: [0.05, 0.14, 0.15, 0.3, 0.6, 1][k % 6] };
  const y = k % 5 === 0 ? [1.04, 1.05, 1.5, 1.58, 1.75][(k / 5 | 0) % 5] + (k % 2 ? 0.001 : -0.001) : rnd(0.3, 3.0);
  const m = { doubles, shuttle: { p: { x: 0, y, z: b.z } }, athletes: [b, { team: 1, z: -rnd(0.5, 6.5) }] };
  const options = mirror.botShotOptions(b, y, S.DIFF), seen = new Set();
  for (let i = 0; i < 6000; i++) { m.athletes[1].z = -rnd(0.5, 6.5); const s = S._botChooseShot(m, b); seen.add(s); assert(options.includes(s), `bot diff ${diff} y=${y.toFixed(3)} z=${b.z.toFixed(2)} sta=${b.sta}: sim chose ${s}, predicted ${options}`); }
  for (const o of options) assert(seen.has(o), `predicted option ${o} never chosen (diff ${diff} y=${y.toFixed(3)} z=${b.z.toFixed(2)} sta=${b.sta} doubles=${doubles})`);
  cases++;
}
console.log('PASS botShotOptions is exactly the set botChooseShot can return for ' + cases + ' bot situations x 6000 draws');
