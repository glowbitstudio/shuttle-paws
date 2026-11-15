'use strict';
// Parallel bot-vs-bot round robin (same match setup as balance-roundrobin.js, one child process per home character,
// each with its own fixed seed => deterministic). node tests/balance-roundrobin-par.js [gamesPerOrderedPair=6] [diff=2] [jobs=3]
const { spawn } = require('node:child_process');
const S = require('../sim.js');
// env RR_MODE=2v2 (same-character pairs), RR_VENUE=0..5, RR_IDS=a,b,c (subset; default = every character in S.CHARS)
const MODE = process.env.RR_MODE === '2v2' ? '2v2' : '1v1', VENUE = +(process.env.RR_VENUE || 0);
const ids = process.env.RR_IDS ? process.env.RR_IDS.split(',') : S.CHARS.map((c) => c.id);
if (process.argv[2] === '--child') {
  const a = process.argv[3], N = +process.argv[4], DIFF = +process.argv[5];
  let seed = (12345 + 7919 * ids.indexOf(a)) >>> 0; Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const out = [];
  for (const b of ids) { if (a === b) continue;
    for (let g = 0; g < N; g++) {
      const m = S.createMatch({ mode: MODE, points: 11, venue: VENUE, firstServe: g % 2, slots: (MODE === '2v2' ? [a, a, b, b] : [a, b]).map((c) => ({ char: c, ctrl: 'bot', diff: DIFF })) });
      let t = 0; while (m.state !== 'over' && t++ < 120 * 60 * 30) { S.step(m); m.events.length = 0; }
      if (m.state !== 'over') { out.push([a, b, -1, 0, 0]); continue; }
      const sc = m.gameScores[m.gameScores.length - 1]; out.push([a, b, m.winner, sc[0], sc[1]]);
    } }
  console.log(JSON.stringify(out)); return;
}
const N = +process.argv[2] || 6, DIFF = process.argv[3] === undefined ? 2 : +process.argv[3], JOBS = Math.min(+process.argv[4] || 3, 10);   // few workers at idle priority
const W = {}, P = {}, G = {}; ids.forEach((i) => { W[i] = 0; P[i] = 0; G[i] = 0; });
let next = 0, live = 0, stuck = 0;
function launch() {
  while (live < JOBS && next < ids.length) {
    const a = ids[next++]; live++; let buf = '';
    const c = spawn(process.execPath, [__filename, '--child', a, N, DIFF], { stdio: ['ignore', 'pipe', 'inherit'] });
    try { require('node:os').setPriority(c.pid, 19); } catch (e) { /* best effort */ }
    c.stdout.on('data', (d) => buf += d);
    c.on('exit', () => { for (const [x, y, w, s0, s1] of JSON.parse(buf)) { if (w < 0) { stuck++; continue; } G[x]++; G[y]++; W[w === 0 ? x : y]++; P[x] += s0 - s1; P[y] += s1 - s0; }
      live--; if (next >= ids.length && !live) report(); else launch(); });
  }
}
function report() {
  const rows = ids.map((i) => { const st = S.CHARS.find((x) => x.id === i).stats; const total = Object.values(st).reduce((a, b) => a + b, 0);
    return Object.assign({ id: i, win: +(100 * W[i] / G[i]).toFixed(1), ptDiff: +(P[i] / G[i]).toFixed(2), games: G[i], total }, st); }).sort((x, y) => y.win - x.win);
  console.log(`${MODE} venue=${VENUE} diff=${DIFF} games per ordered pair=${N} (each character plays ${rows[0].games}; 95% CI about +/-${(196 * 0.5 / Math.sqrt(rows[0].games)).toFixed(1)} pp)`);
  console.table(rows); console.log('stuck matches:', stuck);
  const corr = (k) => { const xs = rows.map((r) => r[k]), ys = rows.map((r) => r.win), mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
    let sxy = 0, sxx = 0, syy = 0; xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; }); return +(sxy / Math.sqrt(sxx * syy)).toFixed(2); };
  console.log('correlation with win%:', ['spd', 'jmp', 'pow', 'rch', 'ctl', 'sta', 'total'].map((k) => k + ' ' + corr(k)).join(', '));
}
launch();
