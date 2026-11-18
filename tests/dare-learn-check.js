'use strict';
// Shared challenger memory: a report is clamped, moves the average (shots, general position, position per situation), is limited to one
// a minute per player and comes back in the welcome message; a signed copy handed back at hello restores it after the server lost its data.
const assert = require('node:assert/strict'), { spawn } = require('node:child_process'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), WebSocket = require('ws');
const ROOT = path.join(__dirname, '..'), PORT = 3072, dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spdare-'));
let srv = null;
const start = () => new Promise((res) => { srv = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: Object.assign({}, process.env, { PORT, DATA_DIR: dir, BACKUP_KEY: 'k1' }) }); setTimeout(res, 1200); });
const stop = () => new Promise((res) => { srv.kill(); setTimeout(res, 900); });
process.on('exit', () => { try { srv.kill(); } catch (e) { /* gone */ } });
const session = (hello, after) => new Promise((res, rej) => {
  const ws = new WebSocket('ws://127.0.0.1:' + PORT); let welcome = null;
  ws.on('open', () => ws.send(JSON.stringify(Object.assign({ t: 'hello', name: 'T', char: 'cat' }, hello))));
  ws.on('message', (d) => { const m = JSON.parse(d); if (m.t === 'welcome') { welcome = m; for (const x of after || []) ws.send(JSON.stringify(x)); } });
  ws.on('error', rej); setTimeout(() => { ws.close(); res(welcome); }, 900);
});
(async () => {
  await start();
  const a = await session({}, [{ t: 'dareLearn', front: 5, bad: { smash: 99, drop: 1, hack: 3 }, pos: { smash: 9, drop: -9, hack: 1 } }, { t: 'dareLearn', front: -5, bad: { smash: 0 } }]);
  assert.equal(a.dare, null, 'nothing learned yet'); assert.equal(a.dareT, null);
  const b = await session({ id: a.id, secret: a.secret }, [{ t: 'dareLearn', front: -5, bad: {} }]);
  assert.deepEqual([b.dare.n, b.dare.front, b.dare.bad.smash, b.dare.bad.drop, b.dare.bad.hack], [1, 1.25, 6, 1, undefined], 'first report clamped; the second one in the same minute ignored');
  assert.deepEqual([b.dare.pos.smash, b.dare.pos.drop, b.dare.pos.hack], [1.25, -0.8, undefined], 'positions per situation clamped too');
  await session({}, [{ t: 'dareLearn', front: 0, bad: { smash: 0 }, pos: { smash: 0 } }]);            // another player
  const d = await session({ id: a.id, secret: a.secret });
  assert.equal(d.dare.n, 2, 'same player still limited, the other player counted'); assert(d.dare.front < 1.25 && d.dare.front > 0 && d.dare.bad.smash < 6 && d.dare.pos.smash < 1.25 && d.dare.pos.smash > 0);
  assert(typeof d.dareT === 'string' && d.dareT.includes('.'), 'a signed copy is handed out');
  // the server loses everything: a tampered copy is refused, the real one brings the memory back
  await stop(); fs.rmSync(path.join(dir, 'data.json'), { force: true }); await start();
  const e = await session({ dareT: d.dareT.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')) }); assert.equal(e.dare, null, 'tampered copy refused');
  const f = await session({ dareT: d.dareT }); assert.deepEqual(f.dare, d.dare, 'memory restored from the signed copy');
  const g = await session({ dareT: b.dareT }); assert.equal(g.dare.n, 2, 'an older copy does not replace a newer memory');
  await stop(); fs.rmSync(dir, { recursive: true, force: true });
  console.log('PASS dare-learn: reports clamped, averaged, one a minute per player, sent on welcome; signed copy restores the memory after data loss, tampered and older copies do not');
})().catch((e) => { console.error(e); process.exit(1); });
