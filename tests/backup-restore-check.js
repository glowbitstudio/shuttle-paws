'use strict';
// Player backup: a server with BACKUP_KEY hands the client a signed copy of its record; after the data file is gone, a hello with
// that copy restores gold / items; a tampered copy, a copy for another id, or a server without the key give a fresh account.
const assert = require('node:assert/strict'), { spawn } = require('node:child_process'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), WebSocket = require('ws');
const ROOT = path.join(__dirname, '..'), PORT = 3071, dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spbk-'));
let p0 = null;
const start = (key) => new Promise((res) => { const p = p0 = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: Object.assign({}, process.env, { PORT, DATA_DIR: dir, BACKUP_KEY: key }) }); setTimeout(() => res(p), 1200); });
const session = (hello, after) => new Promise((res, rej) => {
  const ws = new WebSocket('ws://127.0.0.1:' + PORT), got = { wallet: null, backup: null, welcome: null };
  ws.on('open', () => ws.send(JSON.stringify(Object.assign({ t: 'hello', name: 'T', char: 'cat' }, hello))));
  ws.on('message', (d) => { const m = JSON.parse(d); if (m.t in got) got[m.t] = m; if (m.t === 'welcome' && after) for (const x of after) ws.send(JSON.stringify(x)); });
  ws.on('error', rej); setTimeout(() => { ws.close(); res(got); }, 1500);
});
(async () => {
  let p = await start('k1');
  const a = await session({}, [{ t: 'claimLogin' }]);
  assert(a.backup && a.wallet.gold > 200 && !a.wallet.login.can, 'backup handed out, login reward claimed');
  const id = a.welcome.id, secret = a.welcome.secret, gold = a.wallet.gold;
  p.kill(); await new Promise((r) => setTimeout(r, 900)); fs.rmSync(path.join(dir, 'data.json'), { force: true });
  p = await start('k1');
  const bad = await session({ id, secret, backup: a.backup.v.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')) });
  assert.notEqual(bad.welcome.id, id, 'tampered copy refused');
  const b = await session({ id, secret, backup: a.backup.v });
  assert.equal(b.welcome.id, id); assert.equal(b.wallet.gold, gold); assert(!b.wallet.login.can, 'record restored');
  const other = await session({ id: bad.welcome.id, secret: bad.welcome.secret, backup: a.backup.v });
  assert.equal(other.wallet.gold, 200, 'a copy cannot be applied to another account');
  p.kill(); await new Promise((r) => setTimeout(r, 900)); fs.rmSync(path.join(dir, 'data.json'), { force: true });
  p = await start('');
  const c = await session({ id, secret, backup: a.backup.v });
  assert.notEqual(c.welcome.id, id, 'no key: no restore'); assert.equal(c.backup, null);
  p.kill(); fs.rmSync(dir, { recursive: true, force: true });
  console.log('PASS backup: signed copy restores the record after data loss; tampered / foreign copies and keyless servers do not');
})().catch((e) => { console.error(e); process.exit(1); });
process.on('exit', () => { try { p0 && p0.kill(); } catch (e) { /* gone */ } });
