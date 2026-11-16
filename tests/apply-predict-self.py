# One-off patch: online, the player's own athlete is predicted locally (answers input at once) and settles onto the server's position.
def patch(p, reps):
    s=open(p,encoding='utf-8',newline='').read(); crlf='\r\n' in s
    for a,b in reps:
        if crlf: a=a.replace('\n','\r\n'); b=b.replace('\n','\r\n')
        assert s.count(a)==1,(p,a[:70],s.count(a)); s=s.replace(a,b)
    open(p,'w',encoding='utf-8',newline='').write(s)
patch('sim.js',[
("function applyAthleteSnap(a, v) {",
"""// Online, on the player's own screen: their athlete answers the stick at once instead of waiting for the server's reply.
// P = { x, z, vx, vz, t, h: [] } is the locally predicted state; `a` holds the newest server state; lagT = how far the server's
// picture of me trails my inputs (round trip + a tick). The prediction uses the same movement rule as moveAthlete and is pulled
// toward the server by the error between where I predicted I was lagT ago and where the server says I am now.
function predictSelf(P, a, ix, iy, lagT, dt, free, pull) {
  P.t += dt;
  if (!free) {
    const k = 1 - Math.exp(-20 * dt); P.x += (a.x - P.x) * k; P.z += (a.z - P.z) * k; P.vx = a.vx; P.vz = a.vz; P.h.length = 0; return P;
  }
  const sg = sgn(a.team), l = Math.hypot(ix, iy); if (l > 1) { ix /= l; iy /= l; }
  const spd = a.st.speed * tired.move(a) * (a.jumpY > 0 ? 0.6 : 1);
  P.vx = damp(P.vx, ix * sg * spd, a.st.accel, dt); P.vz = damp(P.vz, iy * sg * spd, a.st.accel, dt);
  P.x += P.vx * dt; P.z += P.vz * dt;
  P.h.push({ t: P.t, x: P.x, z: P.z });
  while (P.h.length > 2 && P.h[1].t <= P.t - lagT) P.h.shift();
  const old = P.h[0], ex = old.x - a.x, ez = old.z - a.z, e = Math.hypot(ex, ez);
  if (e > 1.5) { P.x = a.x; P.z = a.z; P.vx = a.vx; P.vz = a.vz; P.h.length = 0; return P; }
  const k = 1 - Math.exp(-(pull || 6) * dt), cx = ex * k, cz = ez * k;
  P.x -= cx; P.z -= cz; for (const q of P.h) { q.x -= cx; q.z -= cz; }
  P.x = clamp(P.x, -3.8, 3.8); P.z = clamp(Math.abs(P.z) * (Math.sign(P.z) === sg ? 1 : -1), 0.45, 8.2) * sg;
  return P;
}
function applyAthleteSnap(a, v) {"""),
("  clamp, lerp, damp, rand, randn,","  clamp, lerp, damp, rand, randn, predictSelf, moveAthlete,"),
])
patch('game.js',[
("""      S.applyAthleteSnap(a, latest.a[i]);
      const ex = Math.min(0.12, Net.rtt / 2);
      a.x += a.vx * ex; a.z += a.vz * ex;
""","""      S.applyAthleteSnap(a, latest.a[i]);
      // my own athlete answers the stick at once (predicted locally), then settles onto the server's position
      const P = session.mePred || (session.mePred = { x: a.x, z: a.z, vx: a.vx, vz: a.vz, t: 0, h: [] });
      const mvp = paused || session.over ? { x: 0, y: 0 } : readMove();
      S.predictSelf(P, a, mvp.x, mvp.y, Math.min(0.3, Net.rtt + 0.05), rdt, (m.state === 'rally' || m.state === 'serve') && a.diveT < 0 && a.recoverT <= 0, m.state === 'serve' ? 14 : 6);
      a.x = P.x; a.z = P.z; a.vx = P.vx; a.vz = P.vz;
"""),
])
print('ok')
