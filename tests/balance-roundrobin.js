'use strict';
// Bot-vs-bot round robin: every character pair, both sides, equal bot difficulty. node tests/balance-roundrobin.js [games]
const S = require('../sim.js');
const N = +process.argv[2] || 6, DIFF = 2;
let seed = 12345; Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const ids = S.CHARS.map((c) => c.id), W = {}, P = {}, G = {};
ids.forEach((i) => { W[i] = 0; P[i] = 0; G[i] = 0; });
let stuck = 0;
for (const a of ids) for (const b of ids) { if (a === b) continue;
  for (let g = 0; g < N; g++) {
    const m = S.createMatch({ mode: '1v1', points: 11, venue: 0, firstServe: g % 2,
      slots: [{ char: a, ctrl: 'bot', diff: DIFF }, { char: b, ctrl: 'bot', diff: DIFF }] });
    let t = 0; while (m.state !== 'over' && t++ < 120 * 60 * 30) { S.step(m); m.events.length = 0; }
    if (m.state !== 'over') { stuck++; continue; }
    G[a]++; G[b]++; W[m.winner === 0 ? a : b]++;
    const sc = m.gameScores.length ? m.gameScores[m.gameScores.length - 1] : m.score;
    P[a] += sc[0] - sc[1]; P[b] += sc[1] - sc[0];
  } }
const rows = ids.map((i) => { const c = S.CHARS.find((x) => x.id === i);
  return { id: i, win: +(100 * W[i] / G[i]).toFixed(1), ptDiff: +(P[i] / G[i]).toFixed(2), games: G[i] }; }).sort((x, y) => y.win - x.win);
console.table(rows); console.log('stuck matches:', stuck);
