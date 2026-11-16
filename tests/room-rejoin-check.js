'use strict';
// Live server: room bench + seat swapping in a full room, and rejoining a running online match (after a deliberate exit and
// after a lost connection, including when nobody else is left in the match).
const assert = require('node:assert/strict'), { spawn } = require('node:child_process'), path = require('node:path'), WS = require('ws');
const root = path.resolve(__dirname, '..'), port = 31488, sockets = [];
const child = spawn(process.execPath, [path.join(root, 'server.js')], { cwd: root, env: { ...process.env, PORT: String(port), NODE_PATH: 'D:/Game/game/node_modules' }, stdio: ['ignore', 'pipe', 'pipe'] });
let logs = ''; child.stdout.on('data', (b) => logs += b); child.stderr.on('data', (b) => logs += b);
const delay = (n) => new Promise((r) => setTimeout(r, n));
async function client(name, cred) {
  const ws = new WS('ws://127.0.0.1:' + port), messages = []; sockets.push(ws);
  ws.on('message', (b) => messages.push(JSON.parse(b)));
  await new Promise((r, j) => { ws.once('open', r); ws.once('error', j); });
  const c = { ws, messages, mark: () => messages.length, send: (o) => ws.send(JSON.stringify(o)),
    wait: async (pred, from = 0, ms = 4000) => { const t = Date.now(); for (;;) { const m = messages.slice(from).find(pred); if (m) return m; if (Date.now() - t > ms) throw new Error(name + ' timed out waiting; last: ' + JSON.stringify(messages.slice(-3)).slice(0, 400)); await delay(15); } },
    none: async (pred, from, ms = 300) => { await delay(ms); assert(!messages.slice(from).some(pred), name + ' got a message it should not have'); } };
  c.send({ t: 'hello', name, char: 'cat', ...(cred || {}) });
  const w = await c.wait((m) => m.t === 'welcome'); c.id = w.id; c.secret = w.secret;
  return c;
}
const act = async (c, msg, pred) => { const n = c.mark(); c.send(msg); return c.wait(pred, n); };
const seats = (room) => room.slots.map((s) => (s ? s.name : null));
(async () => {
  try {
    for (let i = 0; i < 100; i++) { try { const ws = new WS('ws://127.0.0.1:' + port); await new Promise((r, j) => { ws.once('open', r); ws.once('error', j); }); ws.terminate(); break; } catch { await delay(30); } }
    const A = await client('An'), B = await client('Binh'), C = await client('Chi');
    // ---- room: full 1v1 room, third player lands on the bench
    let room = (await act(A, { t: 'createRoom', mode: '1v1' }, (m) => m.t === 'room' && m.room)).room;
    await act(B, { t: 'joinRoom', code: room.code }, (m) => m.t === 'room' && m.room);
    room = (await act(C, { t: 'joinRoom', code: room.code }, (m) => m.t === 'room' && m.room)).room;
    assert.deepEqual(seats(room), ['An', 'Binh']); assert.deepEqual(room.bench.map((b) => b.name), ['Chi']);
    // a non-host asks for an occupied seat: nothing moves until the owner agrees
    let bn = B.mark(), an = A.mark();
    C.send({ t: 'swap', slot: 1 });
    const ask = await B.wait((m) => m.t === 'swapAsk', bn); assert.equal(ask.name, 'Chi');
    await A.none((m) => m.t === 'room', an);
    // refusing leaves everything as it was
    let cn = C.mark(); B.send({ t: 'swapReply', from: ask.from, ok: false });
    await C.wait((m) => m.t === 'notice' && /không đồng ý/.test(m.text), cn);
    // asking again and agreeing trades places: Chi plays, Binh watches
    bn = B.mark(); C.send({ t: 'swap', slot: 1 }); await B.wait((m) => m.t === 'swapAsk', bn);
    room = (await act(B, { t: 'swapReply', from: C.id, ok: true }, (m) => m.t === 'room' && m.room && m.room.slots[1] && m.room.slots[1].name === 'Chi')).room;
    assert.deepEqual(seats(room), ['An', 'Chi']); assert.deepEqual(room.bench.map((b) => b.name), ['Binh']);
    // a forged reply (nobody asked) does nothing
    an = A.mark(); B.send({ t: 'swapReply', from: A.id, ok: true }); await A.none((m) => m.t === 'room', an);
    // the host swaps sides directly with a seated player, and can step down / sit back
    room = (await act(A, { t: 'swap', slot: 1 }, (m) => m.t === 'room' && m.room && m.room.slots[1] && m.room.slots[1].name === 'An')).room;
    assert.deepEqual(seats(room), ['Chi', 'An']);
    room = (await act(A, { t: 'swap', slot: -1 }, (m) => m.t === 'room' && m.room && !m.room.slots[1])).room;
    assert.deepEqual(room.bench.map((b) => b.name).sort(), ['An', 'Binh']); assert.equal(room.host, A.id);
    room = (await act(B, { t: 'swap', slot: 1 }, (m) => m.t === 'room' && m.room && m.room.slots[1] && m.room.slots[1].name === 'Binh')).room;
    assert.deepEqual(seats(room), ['Chi', 'Binh']);
    // ---- start: seated players play, the bench (the host here) watches the same match
    an = A.mark(); bn = B.mark(); cn = C.mark(); A.send({ t: 'start' });
    const sC = await C.wait((m) => m.t === 'start', cn), sB = await B.wait((m) => m.t === 'start', bn), sA = await A.wait((m) => m.t === 'start', an);
    assert.equal(sC.you, 0); assert.equal(sB.you, 1); assert.equal(sA.you, -1); assert.equal(sA.id, sC.id);
    // ---- deliberate exit: bot takes the seat, the player is offered the way back and can take it
    cn = C.mark(); bn = B.mark(); C.send({ t: 'leaveMatch' });
    const offer = await C.wait((m) => m.t === 'rejoinOffer' && m.id, cn); assert.equal(offer.id, sC.id); assert.equal(offer.names[0], 'Chi');
    await B.wait((m) => m.t === 'notice' && /rời trận/.test(m.text), bn);
    // someone else cannot take that seat
    let n0 = A.mark(); A.send({ t: 'rejoin', id: sC.id }); await A.wait((m) => m.t === 'rejoinOffer' && m.id === null, n0);
    cn = C.mark(); bn = B.mark(); C.send({ t: 'rejoin', id: sC.id });
    const back = await C.wait((m) => m.t === 'start', cn); assert.equal(back.id, sC.id); assert.equal(back.you, 0); assert.equal(back.slots[0].ctrl, 'human'); assert.equal(back.slots[0].name, 'Chi');
    await B.wait((m) => m.t === 'notice' && /vào lại/.test(m.text), bn);
    await C.wait((m) => m.t === 'snap' && m.id === sC.id, C.mark());                       // and the snapshots flow again
    // ---- lost connection: reconnect with the same identity, get the offer at hello, rejoin
    bn = B.mark(); C.ws.terminate();
    await B.wait((m) => m.t === 'notice' && /mất kết nối/.test(m.text), bn);
    const C2 = await client('Chi', { id: C.id, secret: C.secret });
    const offer2 = await C2.wait((m) => m.t === 'rejoinOffer'); assert.equal(offer2.id, sC.id);
    const back2 = await act(C2, { t: 'rejoin', id: sC.id }, (m) => m.t === 'start'); assert.equal(back2.you, 0);
    const rm = await act(C2, { t: 'lobby' }, (m) => m.t === 'lobby'); assert(rm.matches.some((x) => x.id === sC.id));
    // ---- everybody drops: the match survives the grace period and the first one back gets in
    B.ws.terminate(); C2.ws.terminate(); await delay(400);
    const B2 = await client('Binh', { id: B.id, secret: B.secret });
    const offer3 = await B2.wait((m) => m.t === 'rejoinOffer'); assert.equal(offer3.id, sC.id, 'match kept alive after every player lost the connection');
    const back3 = await act(B2, { t: 'rejoin', id: sC.id }, (m) => m.t === 'start'); assert.equal(back3.you, 1);
    // a fresh player has nothing to rejoin
    const D = await client('Dung'); const none = await D.wait((m) => m.t === 'rejoinOffer'); assert.equal(none.id, null);
    // deliberate exit of the last player ends the match at once (rooms are not blocked) and withdraws the offer
    n0 = B2.mark(); B2.send({ t: 'leaveMatch' }); const gone = await B2.wait((m) => m.t === 'rejoinOffer', n0); assert.equal(gone.id, null);
    await delay(300); assert.equal(child.exitCode, null);
    if (logs.includes('handler')) throw new Error('server handler error: ' + logs.slice(-600));
    console.log('PASS room bench / swap request / host swap / bench watches / rejoin after exit, after disconnect, after everyone dropped');
  } finally { for (const ws of sockets) ws.terminate(); child.kill(); await new Promise((r) => child.once('exit', r)); }
})().catch((e) => { console.error(e); process.exit(1); });
