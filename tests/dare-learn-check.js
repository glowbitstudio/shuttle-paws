'use strict';
// Shared challenger memory: a report is clamped, moves the average, is limited to one a minute per player, and comes back in the welcome message.
const assert = require('node:assert/strict'), { spawn } = require('node:child_process'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), WebSocket = require('ws');
const ROOT = path.join(__dirname, '..'), PORT = 3072, dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spdare-'));
const srv = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: Object.assign({}, process.env, { PORT, DATA_DIR: dir }) });
process.on('exit', () => { try { srv.kill(); } catch (e) { /* gone */ } });
const session = (hello, after) => new Promise((res, rej) => {
  const ws = new WebSocket('ws://127.0.0.1:' + PORT); let welcome = null;
  ws.on('open', () => ws.send(JSON.stringify(Object.assign({ t: 'hello', name: 'T', char: 'cat' }, hello))));
  ws.on('message', (d) => { const m = JSON.parse(d); if (m.t === 'welcome') { welcome = m; for (const x of after || []) ws.send(JSON.stringify(x)); } });
  ws.on('error', rej); setTimeout(() => { ws.close(); res(welcome); }, 900);
});
(async () => {
  await new Promise((r) => setTimeout(r, 1200));
  const a = await session({}, [{ t: 'dareLearn', front: 5, bad: { smash: 99, drop: 1, hack: 3 } }, { t: 'dareLearn', front: -5, bad: { smash: 0 } }]);
  assert.equal(a.dare, null, 'nothing learned yet');
  const b = await session({ id: a.id, secret: a.secret }, [{ t: 'dareLearn', front: -5, bad: {} }]);
  assert.deepEqual([b.dare.n, b.dare.front, b.dare.bad.smash, b.dare.bad.drop, b.dare.bad.hack], [1, 1.25, 6, 1, undefined], 'first report clamped; the second one in the same minute ignored');
  const c = await session({}, [{ t: 'dareLearn', front: 0, bad: { smash: 0 } }]);            // another player
  const d = await session({ id: a.id, secret: a.secret });
  assert.equal(d.dare.n, 2, 'same player still limited, the other player counted'); assert(d.dare.front < 1.25 && d.dare.front > 0 && d.dare.bad.smash < 6);
  srv.kill(); fs.rmSync(dir, { recursive: true, force: true });
  console.log('PASS dare-learn: reports are clamped, averaged, limited to one a minute per player, and sent to every client on welcome');
})().catch((e) => { console.error(e); process.exit(1); });
