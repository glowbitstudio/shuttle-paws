'use strict';
// Own-athlete prediction online, simulated with latency: a "server" moves the athlete with inputs that arrive late and sends 30 snapshots
// a second that arrive late; the client draws at 60 fps. Old drawing = newest snapshot + velocity * rtt/2. New = S.predictSelf.
// Checks: the athlete starts moving on the frame after the input, never stalls while running, stays close to the true (zero-latency)
// position, and ends on the server's position after stopping.
const assert = require('node:assert/strict'), S = require('../sim');
const DT = 1 / 60;
function input(t) { return t < 0.2 ? [0, 0] : t < 0.7 ? [-1, 0] : t < 1.2 ? [1, 0.5] : t < 1.5 ? [0, -1] : [0, 0]; }
function run(rttMs) {
  const half = rttMs / 2000, m = S.createMatch({ mode: '1v1', points: 11, venue: 0, slots: [{ name: 'a', char: 'cat', ctrl: 'human' }, { name: 'b', char: 'cat', ctrl: 'bot', diff: 1 }] });
  m.state = 'rally';
  const srv = m.athletes[0], ideal = JSON.parse(JSON.stringify({ x: srv.x, z: srv.z }));
  const idealA = Object.assign(Object.create(null), srv, { st: srv.st }); idealA.x = srv.x; idealA.z = srv.z; idealA.vx = 0; idealA.vz = 0;
  const cli = { team: srv.team, st: srv.st, sta: srv.sta, jumpY: 0, x: srv.x, z: srv.z, vx: 0, vz: 0 };
  const P = { x: srv.x, z: srv.z, vx: 0, vz: 0, t: 0, h: [] };
  const wire = []; let oldX = srv.x, oldZ = srv.z, tick = 0;
  const out = { firstNew: null, firstOld: null, stallNew: 0, stallOld: 0, errNew: 0, errOld: 0, maxStepNew: 0 };
  let pn = { x: P.x, z: P.z }, po = { x: oldX, z: oldZ };
  for (let t = 0; t < 3.2; t += DT) {
    const [ix, iy] = input(t), [sx, sy] = input(t - half), sg = S.sgn(srv.team);
    S.moveAthlete(m, idealA, ix * sg, iy * sg, idealA.st.speed, DT);            // what a zero-latency game would show
    S.moveAthlete(m, srv, sx * sg, sy * sg, srv.st.speed, DT);                  // the server, hearing inputs late
    if (tick++ % 2 === 0) wire.push({ at: t + half, x: srv.x, z: srv.z, vx: srv.vx, vz: srv.vz });
    while (wire.length && wire[0].at <= t) Object.assign(cli, wire.shift());
    oldX = cli.x + cli.vx * Math.min(0.12, rttMs / 2000); oldZ = cli.z + cli.vz * Math.min(0.12, rttMs / 2000);
    S.predictSelf(P, cli, ix, iy, Math.min(0.3, rttMs / 1000 + 0.02), DT, true, 6);
    const dn = Math.hypot(P.x - pn.x, P.z - pn.z), dold = Math.hypot(oldX - po.x, oldZ - po.z);
    if (t >= 0.2 && out.firstNew === null && dn > 0.002) out.firstNew = Math.round((t - 0.2) * 1000);
    if (t >= 0.2 && out.firstOld === null && dold > 0.002) out.firstOld = Math.round((t - 0.2) * 1000);
    if (t > 0.4 && t < 0.7) { if (dn < 0.005) out.stallNew++; if (dold < 0.005) out.stallOld++; }
    out.maxStepNew = Math.max(out.maxStepNew, dn);
    out.errNew = Math.max(out.errNew, Math.hypot(P.x - idealA.x, P.z - idealA.z)); out.errOld = Math.max(out.errOld, Math.hypot(oldX - idealA.x, oldZ - idealA.z));
    pn = { x: P.x, z: P.z }; po = { x: oldX, z: oldZ };
  }
  out.restNew = Math.hypot(P.x - srv.x, P.z - srv.z);
  for (const k of ['errNew', 'errOld', 'maxStepNew', 'restNew']) out[k] = +out[k].toFixed(3);
  return out;
}
const res = {};
for (const rtt of [0, 60, 120, 250]) {
  const r = res['rtt' + rtt] = run(rtt); console.log(rtt, JSON.stringify(r));
  assert(r.firstNew <= 34, 'answers on the next frame at rtt ' + rtt);
  assert.equal(r.stallNew, 0, 'no stalled frames while running at rtt ' + rtt);
  assert(r.errNew <= Math.max(0.12, r.errOld * 0.6), 'closer to the zero-latency position than before at rtt ' + rtt + ': ' + r.errNew + ' vs ' + r.errOld);
  assert(r.restNew < 0.03, 'settles on the server position at rtt ' + rtt + ': ' + r.restNew);
  assert(r.maxStepNew < 0.12, 'no visible jump at rtt ' + rtt + ': ' + r.maxStepNew);
}
console.log(JSON.stringify(res));
console.log('PASS predict-self: immediate response, no stalls, small error vs zero latency, settles on the server position (rtt 0 / 60 / 120 / 250 ms)');
