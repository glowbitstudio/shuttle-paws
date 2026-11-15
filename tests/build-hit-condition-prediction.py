# Usage: build-hit-condition-prediction.py <base (accepted game.js copy or candidate snapshot)> <output snapshot>. Never writes game.js.
# Milestone 1 (late racket arrival on smash / lift / net). With ?matchClips=1 the contact prediction used "first point in
# reach from where the athlete is now". The sim hits later than that:
#   bots   : in reach AND (shuttle falling OR within 0.55 m OR below 1.2 m), on their own side, with their scheduled jump
#            (a.jumpAt) and their desperate extra reach; a bot that decided to leave the shuttle does not hit at all;
#   humans : buffered press = first reach on own side; held button = falling and (within 0.65 m or below 1.25 m);
#            assist-2 auto hit = falling and (below 0.55 m, or within 0.7 m, or below 1.3 m).
# The prediction now walks the same conditions (mirrors of tickBot / tickHuman, presentation only), extrapolates the jump
# (13 m/s^2, as the sim) and stops a bot at its run target. An assisted human smash is predicted at the lifted contact
# height the sim will use, so the body starts rising before the hit instead of being 30 cm short.
# Online / spectating sessions have none of this state and keep the first-in-reach prediction.
from pathlib import Path
import hashlib,sys
ROOT=Path(__file__).resolve().parents[1]
base,outname=sys.argv[1],sys.argv[2]
assert outname!='game.js'
src=(ROOT/base).read_bytes().decode('utf-8')
def rep(old,new):
    global src
    old=old.replace('\n','\r\n');new=new.replace('\n','\r\n')
    assert src.count(old)==1,(src.count(old),old[:80])
    src=src.replace(old,new)
rep('''// Bounded joint fitting: no teleporting the body/racket, no changing the simulation.
''','''// Where and when will this athlete actually hit the incoming shuttle? Walks the sim's own hit conditions forward
// (mirrors of tickBot / tickHuman; presentation only, the simulation is untouched).
function predictMatchContact(m, a) {
  const s = m.shuttle, sg = S.sgn(a.team), DT = S.DT, local = !!session && session.kind === 'local';
  const bot = local && a.ctrl === 'bot' && !!S.DIFF[a.diff], inp = a.input || {};
  if (bot && a.plan && a.plan.leave) return null;                     // it has judged the shuttle out
  const mode = !local ? 'first' : bot ? 'bot' : a.hitQueue > 0 ? 'first' : inp.hold && a.assist >= 1 ? 'hold'
    : a.assist >= 2 && !(m.opts && m.opts.autoSave === false) ? 'auto' : 'first';
  const p = { x: s.p.x, y: s.p.y, z: s.p.z }, v = { x: s.v.x, y: s.v.y, z: s.v.z }, at = { ...a };
  if (bot) at._extra = a.plan && a.plan.p && a.plan.p.desperate && a.diff > 0 ? 0.35 : 0;
  const speed = Math.hypot(a.vx, a.vz);
  // a bot runs to (tx, tz) and stops there; anyone else is assumed to keep their velocity
  const toTarget = bot && a.tx !== undefined ? Math.hypot(a.tx - a.x, a.tz - a.z) : Infinity;
  let jy = a.jumpY || 0, vy = a.vy || 0;
  for (let k = 0; k < 70; k++) {
    const travel = Math.min(speed * k * DT, toTarget), ux = speed > 1e-6 ? a.vx / speed : 0, uz = speed > 1e-6 ? a.vz / speed : 0;
    at.x = a.x + ux * travel; at.z = a.z + uz * travel;
    if (bot && a.jumpAt > 0 && m.clock + k * DT >= a.jumpAt && jy === 0 && vy === 0) { vy = a.st.jumpVy * (1 - 0.15 * S.fatigue(a)); jy = 0.001; }
    at.jumpY = jy;
    const r = S.inReachAt(at, p);
    const ok = r.ok && (!local || p.z * sg > 0.05) && (mode === 'first'
      || (mode === 'bot' && (v.y < 0 || r.dh < 0.55 || p.y < 1.2))
      || (mode === 'hold' && v.y < 0 && (r.dh < 0.65 || p.y < 1.25))
      || (mode === 'auto' && v.y < 0 && (p.y < 0.55 || r.dh < 0.7 || p.y < 1.3)));
    if (ok) {
      const pred = { t: k * DT, x: p.x, y: p.y, z: p.z, ax: at.x, az: at.z, jy };
      if (local && !bot && a.assist && a.sta >= 0.15) {
        // assisted smash: the sim takes the contact up to this height on the hit tick and starts the jump there
        const shots = predictedShots(m, a, at, p.y), lifted = 2.05 + (a.st.jumpVy - 4.94) * 0.2 + 0.30 * (1 - 0.15 * S.fatigue(a));
        if (shots.length === 1 && shots[0] === 'smash' && p.y < lifted) { pred.shotY = p.y; pred.y = lifted; pred.lift = true; }
      }
      return pred;
    }
    S.stepShuttle(p, v, DT, m.wind); if (p.y <= 0) return null;
    if (jy > 0 || vy > 0) { vy -= 13 * DT; jy += vy * DT; if (jy <= 0) { jy = 0; vy = 0; } }
  }
  return null;
}
// Bounded joint fitting: no teleporting the body/racket, no changing the simulation.
''')
rep('''    const at = matchClipsEnabled ? { ...a } : a;
    for (let k = 0; k < 70; k++) {
      if (at !== a) { at.x = a.x + a.vx * k * S.DT; at.z = a.z + a.vz * k * S.DT; }
      if (S.inReachAt(at, p).ok) { md.pred = { t: k * S.DT, x: p.x, y: p.y, z: p.z, type: swingType(p.y) }; if (at !== a) { md.pred.ax = at.x; md.pred.az = at.z; } break; }
      S.stepShuttle(p, v, S.DT, m.wind); if (p.y <= 0) break;
    }
  }
''','''    if (matchClipsEnabled && !debugPose) { md.pred = predictMatchContact(m, a); if (md.pred) md.pred.type = swingType(md.pred.y); }
    else for (let k = 0; k < 70; k++) {
      if (S.inReachAt(a, p).ok) { md.pred = { t: k * S.DT, x: p.x, y: p.y, z: p.z, type: swingType(p.y) }; break; }
      S.stepShuttle(p, v, S.DT, m.wind); if (p.y <= 0) break;
    }
  }
''')
# the shot rules use the un-lifted height; the swing family and the body use the predicted jump at contact
rep('''    const tj = md.pred.t, vy = a.vy || 0, jy = a.jumpY > 0 || vy > 0 ? Math.max(0, a.jumpY + vy * tj - 6.5 * tj * tj) : 0;
    md.pred.type = swingType(md.pred.y - jy);
''','''    md.pred.type = swingType(md.pred.y - md.pred.jy);
''')
rep('''  for (const shot of predictedShots(m, a, at, pred.y)) {
''','''  for (const shot of predictedShots(m, a, at, pred.shotY === undefined ? pred.y : pred.shotY)) {
''')
rep('''    const dh = cp.y - (hl.y + a.jumpY);
    crouch = clamp(-dh * 0.8, 0, 0.34);                         // bend down for low shuttles
    rise = clamp(dh, 0, 0.6);                                   // go up on the toes / hop for high ones
''','''    // while the prediction is live the body is placed for the jump height it will have AT contact (a constant target);
    // an assisted smash is met by rising early: the sim only starts that jump on the hit tick
    const dh = cp.y - (hl.y + (stance && cp.jy !== undefined ? cp.jy : a.jumpY));
    crouch = clamp(-dh * 0.8, 0, 0.34);                         // bend down for low shuttles
    rise = clamp(dh, 0, cp.lift ? 0.95 : 0.6);                  // go up on the toes / hop for high ones
''')
out=ROOT/outname;out.write_bytes(src.encode('utf-8'))
print(outname,hashlib.sha256(out.read_bytes()).hexdigest())
