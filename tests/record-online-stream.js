'use strict';
// Usage: node tests/record-online-stream.js <port> <out json> [seconds]
// Plays one online match as a page-less scripted player against the server's bot (same script as online-bot-client.js)
// and records every message the server sends, with its arrival time. The recording is replayed deterministically in the
// browser by tests/online-replay.py - as this player's own view or as a spectator's view.
const WS = require('ws'), fs = require('fs'), path = require('path'), Sim = require(path.join(__dirname, '..', 'sim.js'));
const port = process.argv[2] || '3062', out = process.argv[3], seconds = +process.argv[4] || 150;
const ws = new WS('ws://127.0.0.1:' + port); const send = (o) => ws.readyState === 1 && ws.send(JSON.stringify(o));
let me = -1, h = 0, presses = 0, lastPress = 0, t0 = 0, start = null; const msgs = [];
const finish = () => { fs.writeFileSync(out, JSON.stringify({ start, msgs })); console.log('recorded', msgs.length, 'messages', ((msgs.length ? msgs[msgs.length - 1].t : 0) / 1000).toFixed(1), 's, hits', msgs.reduce((n, x) => n + (x.m.ev || []).filter((e) => e.type === 'hit').length, 0)); process.exit(0); };
ws.on('open', () => send({ t: 'hello', name: 'Node player', char: 'fox', hand: 'R', assist: 1 }));
ws.on('message', (buf) => { let m; try { m = JSON.parse(buf); } catch (e) { return; }
  if (m.t === 'welcome') send({ t: 'createRoom', open: true, points: 21 });
  else if (m.t === 'room' && m.room && !start) send({ t: 'start' });
  else if (m.t === 'start') { me = m.you; start = m; t0 = Date.now(); }
  else if (start && (m.t === 'snap' || m.t === 'over')) { msgs.push({ t: Date.now() - t0, m }); if (m.t === 'over') return finish(); }
  if (m.t === 'snap' && start) { const s = m.s, a = s.a[me], sh = s.sh, sg = Sim.sgn(me), now = Date.now();
    const live = !!(sh[6] & 1), netted = !!(sh[6] & 4), inc = live && !netted && sh[8] !== me;
    let x = 0, y = 0;
    if (inc && s.pr) { const dx = (s.pr[0] - a[0]) * sg, dz = (s.pr[1] - a[1]) * sg, l = Math.hypot(dx, dz); if (l > 0.25) { x = dx / l; y = dz / l; } }
    let p = -1;
    if (s.st === 'serve' && s.srv === me && s.sT > 1.2 && now - lastPress > 900) { h++; p = presses % 2 ? 0.2 : 0.6; lastPress = now; presses++; }
    else if (s.st === 'rally' && inc && sh[2] * sg > 0.05 && now - lastPress > 450) { h++; p = [0.5, 0.5, 0.85, 0.2][presses % 4]; lastPress = now; presses++; }
    send({ t: 'input', x: +x.toFixed(2), y: +y.toFixed(2), h, j: 0, d: 0, e: 0, em: 0, p, hd: 0, hp: 0, lag: 0.1 }); } });
ws.on('error', (e) => { console.error('WS error', e.message); process.exit(1); });
setTimeout(finish, seconds * 1000);
