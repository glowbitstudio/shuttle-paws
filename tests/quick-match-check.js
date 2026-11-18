'use strict';
// Quick match by strength: equal players are paired at once; a player 225 power stronger is not paired at once but within a few
// seconds, once the waiting player's tolerance has grown (150 + 120 per second waited).
const assert = require('node:assert/strict'), { spawn } = require('node:child_process'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), WebSocket = require('ws');
const ROOT = path.join(__dirname, '..'), PORT = 3073, dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spqm-'));
const srv = spawn(process.execPath, ['-r', './tests/rich-preload.js', 'server.js'], { cwd: ROOT, env: Object.assign({}, process.env, { PORT, DATA_DIR: dir }) });
process.on('exit', () => { try { srv.kill(); } catch (e) { /* gone */ } });
const client = () => new Promise((res, rej) => { const ws = new WebSocket('ws://127.0.0.1:' + PORT), c = { ws, got: [], t: {} };
  ws.on('open', () => ws.send(JSON.stringify({ t: 'hello', name: 'T', char: 'cat' })));
  ws.on('message', (d) => { const m = JSON.parse(d); c.got.push(m); if (!(m.t in c.t)) c.t[m.t] = Date.now(); if (m.t === 'wallet' && !c.ready) { c.ready = true; res(c); } }); ws.on('error', rej); });
const say = (c, m) => c.ws.send(JSON.stringify(m)), wait = (ms) => new Promise((r) => setTimeout(r, ms)), last = (c, t) => c.got.filter((m) => m.t === t).pop();
(async () => {
  await wait(1200);
  const a = await client(), b = await client();
  const t0 = Date.now(); say(a, { t: 'quick' }); await wait(150); say(b, { t: 'quick' }); await wait(700);
  assert(last(a, 'found') && last(b, 'found') && a.t.found - t0 < 700, 'equal power: paired at once'); assert.equal(last(a, 'queued').power, 1800); assert.equal(last(a, 'found').power, 1800);
  a.ws.close(); b.ws.close(); await wait(400);
  const weak = await client(), strong = await client();
  for (const id of ['r_pro', 's_pro', 't_pro']) say(strong, { t: 'buyGear', id }); await wait(500);
  const t1 = Date.now(); say(weak, { t: 'quick' }); await wait(100); say(strong, { t: 'quick' }); await wait(450);
  assert.equal(last(strong, 'queued').power, 2025); assert(!last(weak, 'found'), '225 apart: not paired in the first half second');
  await wait(3200);
  assert(last(weak, 'found') && last(strong, 'found'), 'paired once the tolerance has grown'); const took = (weak.t.found - t1) / 1000;
  assert(took > 0.5 && took < 3.5, 'after about a second, took ' + took); assert.equal(last(weak, 'found').power, 2025);
  weak.ws.close(); strong.ws.close(); srv.kill(); await wait(300); fs.rmSync(dir, { recursive: true, force: true });
  console.log('PASS quick-match: equal power paired at once, a 225 gap paired after ' + took.toFixed(1) + ' s');
})().catch((e) => { console.error(e); process.exit(1); });
