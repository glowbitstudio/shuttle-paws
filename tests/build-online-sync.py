# Usage: build-online-sync.py <base (game.js or snapshot)> <output snapshot>. Never writes game.js.
# Online / spectating stroke timeline (measured with tests/online-rally-check.py: stroke frame fine, but the racket arrived
# in one frame and the old procedural swing cut in). Client side of the fix; server.js adds two optional fields
# (bot difficulty in the start message's slots, sim clock `c` on hit events) - both ignored by old clients, and a new
# client without them behaves as before.
#  1. Swing clock on the presentation timeline: snapshots say "swinging" up to ~0.1 s before the hit event is shown
#     (own athlete: latest snapshot; others: the later snapshot of the interpolated pair). The clock used for posing now
#     starts when the hit event is presented (offset by how late it is shown, from the event's sim clock). A swing with
#     no hit event (a miss) is played from its start once 0.25 s have passed without one.
#  2. Own athlete lined up with the shuttle around a hit: it is normally drawn ahead of the interpolated shuttle (latest
#     snapshot + extrapolation); while a contact is predicted within 0.35 s or a stroke has just started it is eased onto
#     the interpolated timeline (and back afterwards), so body, racket and shuttle meet in the same place.
#  3. Server bots use the bot hit rule (needs the difficulty from the start message); all human athletes get the reach the
#     server gives them (assist 1); vertical speed is derived from the drawn jump height.
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
# --- view: bot difficulty (if the server sends it) and the humans' real reach
rep('''      i, team: doubles ? (i < 2 ? 0 : 1) : (i < 1 ? 0 : 1), name: s.name, char: s.char, hand: s.hand, ctrl: s.ctrl, st: S.charStats(s.char), assist: 0,
''','''      i, team: doubles ? (i < 2 ? 0 : 1) : (i < 1 ? 0 : 1), name: s.name, char: s.char, hand: s.hand, ctrl: s.ctrl, st: S.charStats(s.char),
      assist: s.ctrl === 'human' ? 1 : 0,                                            // the server plays every human with the same hit help
      diff: s.ctrl === 'bot' && Number.isInteger(s.diff) ? s.diff : undefined,       // server bots: difficulty (newer servers send it)
''')
# --- prediction: bot rule wherever the difficulty is known
rep('''  const bot = local && a.ctrl === 'bot' && !!S.DIFF[a.diff], inp = a.input || {};
''','''  const bot = a.ctrl === 'bot' && !!S.DIFF[a.diff], inp = a.input || {};
''')
rep('''  const mode = !local ? 'first' : bot ? 'bot' :''','''  const mode = bot ? 'bot' : !local ? 'first' :''')
rep('''    const ok = r.ok && (!local || p.z * sg > 0.05) && (mode === 'first'
''','''    const ok = r.ok && (!(local || bot) || p.z * sg > 0.05) && (mode === 'first'
''')
rep('''  if (!session || session.kind !== 'local') return genericShots(y);
  if (a.ctrl === 'bot') return S.DIFF[a.diff] ? botShotOptions(at, y, S.DIFF) : genericShots(y);
''','''  if (!session) return genericShots(y);
  if (a.ctrl === 'bot') return S.DIFF[a.diff] ? botShotOptions(at, y, S.DIFF) : genericShots(y);
  if (session.kind !== 'local') return genericShots(y);
''')
# --- hit event: remember how late it is presented
rep('''        if (matchClipsEnabled) md.strokeEvent = { ...e, receivedClock: m.clock, athleteX: m.athletes[e.i].x, athleteZ: m.athletes[e.i].z };
''','''        if (matchClipsEnabled) md.strokeEvent = { ...e, receivedClock: m.clock, athleteX: m.athletes[e.i].x, athleteZ: m.athletes[e.i].z };
        if (matchClipsEnabled && session.kind !== 'local') md.evSwingStart = e.c !== undefined && session.simNow !== undefined ? clamp(session.simNow - e.c, 0, 0.1) : 0;
''')
# --- presentation swing clock + vertical speed + own-athlete sync request
rep('''  md.frameNo = (md.frameNo || 0) + 1;
''','''  md.frameNo = (md.frameNo || 0) + 1;
  if (matchClipsEnabled && session && session.kind !== 'local') {
    if (md.evSwingStart !== undefined) { md.evSwingT = md.evSwingStart; md.evSwingStart = undefined; }
    else if (md.evSwingT >= 0) { md.evSwingT += dt; if (md.evSwingT > 0.45) md.evSwingT = -1; }
    md.rawSwingAge = a.swingT >= 0 ? (md.rawSwingAge || 0) + dt : 0;
    // no hit event 0.25 s after the snapshots say "swinging": a miss - play that swing from its start (not from the middle)
    a.swingT = md.evSwingT >= 0 ? md.evSwingT : (md.rawSwingAge > 0.25 ? md.rawSwingAge - 0.25 : -1);
    if (dt > 0) a.vy = md.prevJumpY === undefined ? 0 : (a.jumpY - md.prevJumpY) / dt;        // snapshots carry no vertical speed
    md.prevJumpY = a.jumpY;
  }
''')
rep('''  if (md.pred && md.pred.t < 0.6) md.lastPred = Object.assign({ at: t }, md.pred);
''','''  if (md.pred && md.pred.t < 0.6) md.lastPred = Object.assign({ at: t }, md.pred);
  if (matchClipsEnabled && session && session.kind === 'online' && a.i === session.me)
    session.meSyncWant = (md.pred && md.pred.t < 0.35) || (md.stroke && md.stroke.elapsed < 0.2) || md.strokeEvent ? 1 : 0;
''')
# --- frameOnline: sim clock of the presentation timeline; own athlete eased onto it around a hit
rep('''  const latest = snaps[snaps.length - 1].s;
  m.athletes.forEach((a, i) => {
    if (i === session.me) {
      S.applyAthleteSnap(a, latest.a[i]);
      const ex = Math.min(0.12, Net.rtt / 2);
      a.x += a.vx * ex; a.z += a.vz * ex;
    } else {
''','''  const latest = snaps[snaps.length - 1].s;
  session.simNow = sa.c !== undefined && sb.c !== undefined ? lerp(sa.c, sb.c, k) : undefined;
  session.meSync = matchClipsEnabled ? damp(session.meSync || 0, session.meSyncWant || 0, session.meSyncWant ? 14 : 6, rdt) : 0;
  m.athletes.forEach((a, i) => {
    if (i === session.me) {
      S.applyAthleteSnap(a, latest.a[i]);
      const ex = Math.min(0.12, Net.rtt / 2);
      a.x += a.vx * ex; a.z += a.vz * ex;
      if (session.meSync > 0.001) {   // around a hit: onto the interpolated timeline the shuttle and the hit event are on
        const va = sa.a[i], vb = sb.a[i], w = session.meSync;
        a.x = lerp(a.x, lerp(va[0], vb[0], k), w); a.z = lerp(a.z, lerp(va[1], vb[1], k), w); a.jumpY = lerp(a.jumpY, lerp(va[2], vb[2], k), w);
      }
    } else {
''')
# --- 4. discrete shuttle / athlete state comes from the snapshot AT the drawn time, not the next one: the later snapshot
#        already says "hit" (shuttle going the other way, hitter swinging) up to 33 ms before the hit event is presented,
#        which ended the preparation two frames early (the racket then jumped away just before contact).
rep("""  sh.v.x = hb[3]; sh.v.y = hb[4]; sh.v.z = hb[5];
  sh.live = !!(hb[6] & 1); sh.held = !!(hb[6] & 2); sh.netted = !!(hb[6] & 4); sh.landed = !!(hb[6] & 8); sh.last = hb[7]; sh.lastTeam = hb[8];
  sh.pred = sb.pr ? { x: sb.pr[0], z: sb.pr[1], inside: !!sb.pr[2] } : null;
""","""  const early = matchClipsEnabled && !jump && k < 1, hs = early ? ha : hb, ss = early ? sa : sb;   // state at the drawn time (the later snapshot once its time is reached - that is when its events are shown)
  sh.v.x = hs[3]; sh.v.y = hs[4]; sh.v.z = hs[5];
  sh.live = !!(hs[6] & 1); sh.held = !!(hs[6] & 2); sh.netted = !!(hs[6] & 4); sh.landed = !!(hs[6] & 8); sh.last = hs[7]; sh.lastTeam = hs[8];
  sh.pred = ss.pr ? { x: ss.pr[0], z: ss.pr[1], inside: !!ss.pr[2] } : null;
""")
rep("""      const va = sa.a[i], vb = sb.a[i];
      S.applyAthleteSnap(a, vb);
""","""      const va = sa.a[i], vb = sb.a[i];
      S.applyAthleteSnap(a, matchClipsEnabled && k < 1 ? va : vb);
""")
# --- 5. the snapshot pair that straddles a hit: do not slide the shuttle toward its post-hit position before the hit is
#        shown (the predicted contact point moved and the racket jumped on the very last frame) - carry it on along its
#        incoming flight from the earlier snapshot instead.
rep("""  sh.p.x = jump ? hb[0] : lerp(ha[0], hb[0], k); sh.p.y = jump ? hb[1] : lerp(ha[1], hb[1], k); sh.p.z = jump ? hb[2] : lerp(ha[2], hb[2], k);
""","""  sh.p.x = jump ? hb[0] : lerp(ha[0], hb[0], k); sh.p.y = jump ? hb[1] : lerp(ha[1], hb[1], k); sh.p.z = jump ? hb[2] : lerp(ha[2], hb[2], k);
  if (matchClipsEnabled && !jump && B !== A && (ha[6] & 1) && (hb[7] !== ha[7] || hb[8] !== ha[8])) {
    // the hit event that comes with the later snapshot says where (and, on newer servers, when) the shuttle was hit:
    // fly it to that point by that time and hold it there until the hit is shown
    const item = session.presentationEvents.find((q) => q.at === B.at && q.events), hit = item && item.events.find((e) => e.type === 'hit');
    if (hit) {
      const kHit = hit.c !== undefined && sa.c !== undefined && sb.c > sa.c ? clamp((hit.c - sa.c) / (sb.c - sa.c), 0.05, 1) : 0.5, u = Math.min(1, k / kHit);
      sh.p.x = lerp(ha[0], hit.x, u); sh.p.y = lerp(ha[1], hit.y, u); sh.p.z = lerp(ha[2], hit.z, u);
    } else { const ahead = clamp(rt - A.at, 0, 0.04); sh.p.x = ha[0] + ha[3] * ahead; sh.p.y = Math.max(0, ha[1] + ha[4] * ahead); sh.p.z = ha[2] + ha[5] * ahead; }
  }
""")
rep("""  m.state = sb.st; m.stateT = sb.sT; m.serverIdx = sb.srv; if (sb.rcv !== undefined) m.receiverIdx = sb.rcv;""","""  const st0 = matchClipsEnabled && k < 1 ? sa : sb;   // state at the drawn time (the later snapshot already says "rally" before the serve is shown)
  m.state = st0.st; m.stateT = st0.sT; m.serverIdx = st0.srv; if (st0.rcv !== undefined) m.receiverIdx = st0.rcv;""")
out=ROOT/outname;out.write_bytes(src.encode('utf-8'))
print(outname,hashlib.sha256(out.read_bytes()).hexdigest())
