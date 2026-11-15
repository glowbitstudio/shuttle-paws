'use strict';
// Usage: node tests/online-bot-client.js <port> [seconds]
// A page-less scripted PLAYER for online tests: connects like a browser client, creates an open room, starts the match
// alone (the server fills the other seat with its bot) and plays through the normal input messages: runs toward the
// predicted landing point, presses a shot (clear / clear / smash / drop in turn) while the shuttle is incoming, serves.
// Starts a new match when one ends. Prints the room code and match ids so a browser page can spectate.
const WS = require('ws'), path = require('path'), Sim = require(path.join(__dirname, '..', 'sim.js'));
const port = process.argv[2] || '3062', seconds = +process.argv[3] || 300;
const ws = new WS('ws://127.0.0.1:' + port); const send = (o) => ws.readyState === 1 && ws.send(JSON.stringify(o));
let me = -1, h = 0, presses = 0, lastPress = 0, matches = 0, inMatch = false;
const begin = () => { send({ t: 'createRoom', open: true, points: 21 }); };
ws.on('open', () => send({ t: 'hello', name: 'Node player', char: 'fox', hand: 'R', assist: 1 }));
ws.on('message', (buf) => { let m; try { m = JSON.parse(buf); } catch (e) { return; }
  if (m.t === 'welcome') begin();
  else if (m.t === 'room' && m.room && !inMatch) send({ t: 'start' });
  else if (m.t === 'start') { me = m.you; inMatch = true; matches++; console.log('MATCH', m.id, 'slot', me); }
  else if (m.t === 'over') { inMatch = false; send({ t: 'leaveRoom' }); setTimeout(begin, 800); }
  else if (m.t === 'snap' && inMatch) { const s = m.s, a = s.a[me], sh = s.sh, sg = Sim.sgn(me), now = Date.now();
    const live = !!(sh[6] & 1), netted = !!(sh[6] & 4), inc = live && !netted && sh[8] !== me;
    let x = 0, y = 0;
    if (inc && s.pr) { const dx = (s.pr[0] - a[0]) * sg, dz = (s.pr[1] - a[1]) * sg, l = Math.hypot(dx, dz); if (l > 0.25) { x = dx / l; y = dz / l; } }
    let p = -1;
    if (s.st === 'serve' && s.srv === me && s.sT > 1.2 && now - lastPress > 900) { h++; p = presses % 2 ? 0.2 : 0.6; lastPress = now; presses++; }
    else if (s.st === 'rally' && inc && sh[2] * sg > 0.05 && now - lastPress > 450) { h++; p = [0.5, 0.5, 0.85, 0.2][presses % 4]; lastPress = now; presses++; }
    send({ t: 'input', x: +x.toFixed(2), y: +y.toFixed(2), h, j: 0, d: 0, e: 0, em: 0, p, hd: 0, hp: 0, lag: 0.1 }); } });
ws.on('error', (e) => { console.error('WS error', e.message); process.exit(1); });
setTimeout(() => { console.log('DONE matches', matches); ws.close(); process.exit(0); }, seconds * 1000);
