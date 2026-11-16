# One-off patch: 2v2 bot teamwork (serve receiver, who takes the shuttle, cover positions) + master-level partner bots.
import io
def patch(p, reps):
    s=open(p,encoding='utf-8',newline='').read(); crlf='\r\n' in s
    for a,b in reps:
        if crlf: a=a.replace('\n','\r\n'); b=b.replace('\n','\r\n')
        assert s.count(a)==1,(p,a[:70],s.count(a)); s=s.replace(a,b)
    open(p,'w',encoding='utf-8',newline='').write(s)
patch('sim.js',[
("  for (const o of m.athletes) if (o.team === a.team && o.ctrl === 'bot') { o.plan = null; o.tx = o.home.x; o.tz = o.home.z; o.jumpAt = -1; }",
 "  coverHomes(m, a.team);\n  for (const o of m.athletes) if (o.team === a.team && o.ctrl === 'bot') { o.plan = null; o.tx = o.home.x; o.tz = o.home.z; o.jumpAt = -1; }"),
("// ------------------------------------------------------------------ bots\nfunction planTeam(m, team, r, landIn) {",
 """// ------------------------------------------------------------------ bots
// doubles: a bot holds the half of the court its partner is not standing in (sides are re-read on every hit)
function coverHomes(m, team) {
  if (!m.doubles) return;
  const t = m.athletes.filter((o) => o.team === team); if (t.length !== 2) return;
  const hx = Math.max(Math.abs(t[0].home.x), Math.abs(t[1].home.x), 1), side = t[0].x >= t[1].x ? 1 : -1;
  if (t[0].ctrl === 'bot') t[0].home.x = side * hx;
  if (t[1].ctrl === 'bot') t[1].home.x = -side * hx;
}
// the mate who is not taking the shuttle: opposite half, and behind a front contact / in front of a deep one
function coverSpot(b, p, sg, taker, m) {
  const az = Math.abs(p.z), hx = Math.abs(b.home.x) || 1;
  b.plan = { yield: true, to: taker.i, t0: m.clock, react: 0 };
  b.tx = Math.abs(p.x) < 0.4 ? b.home.x : (p.x > 0 ? -hx : hx) * 0.8;
  b.tz = sg * (az < 2.6 ? 4.3 : az > 4.5 ? 2.9 : Math.abs(b.home.z));
}
function planTeam(m, team, r, landIn) {"""),
("  const sg = sgn(team);\n  const margin = m.serveShot && !landIn ?",
 "  const sg = sgn(team);\n  coverHomes(m, team);\n  const rcv = m.doubles && m.serveShot ? m.athletes[m.receiverIdx] : null;   // doubles: only the receiver may return a serve\n  const margin = m.serveShot && !landIn ?"),
("    b.plan = null; b.jumpAt = -1;\n    const d = DIFF[b.diff];\n",
 "    b.plan = null; b.jumpAt = -1; b._cand = null;\n    const d = DIFF[b.diff];\n    if (rcv && b !== rcv) { b.plan = { leave: true, t0: m.clock, react: d.react }; b.tx = b.home.x; b.tz = b.home.z; continue; }\n"),
("    const cost = Math.hypot(pick.x - b.x, pick.z - b.z) - slack * 0.002;\n    b._cand = { pick, cost, react: d.react };",
 "    const dist = Math.hypot(pick.x - b.x, pick.z - b.z);\n    const cost = dist - slack * 0.002 + (cands.length ? 0 : 2.5);   // a mate who can really get there goes before one who would have to lunge\n    b._cand = { pick, cost, dist, react: d.react };"),
("""  if (human && best._cand) {
    const p = best._cand.pick;
    const humanSide = Math.sign(human.x - best.x) === Math.sign(p.x - (human.x + best.x) / 2);
    const hd = Math.hypot(p.x - human.x, p.z - human.z);
    if (humanSide && hd < 1.6 && hd < best._cand.cost + 0.3) { for (const b of bots) if (!b.plan) { b.tx = b.home.x; b.tz = b.home.z; } return; }
  }
  for (const b of bots) {
    if (b.plan) continue;
    if (b !== best) { b.tx = b.home.x; b.tz = b.home.z; continue; }""",
 """  // with a human partner: the nearer one takes it. The human gets it when they are practically there already,
  // or when the bot could only lunge and the human is closer. The bot then covers and steps in only if the human is far off.
  if (human && best._cand && !rcv) {
    const c = best._cand, p = c.pick;
    const hd = Math.hypot(p.x - human.x, p.z - human.z);
    if ((hd < 1.4 && hd <= c.dist + 0.3) || (p.desperate && hd < c.dist)) { for (const b of bots) if (!b.plan) coverSpot(b, p, sg, human, m); return; }
  }
  for (const b of bots) {
    if (b.plan) continue;
    if (b !== best) { coverSpot(b, best._cand.pick, sg, best, m); continue; }"""),
("      const desperate = a.plan && a.plan.p && a.plan.p.desperate;\n",
 "      const desperate = a.plan && a.plan.p && a.plan.p.desperate;\n      // this shuttle is the partner's: stay out of it unless the partner is nowhere near and it is about to drop\n      const yl = a.plan && a.plan.yield ? m.athletes[a.plan.to] : null;\n      const mine = !yl || (s.v.y < 0 && s.p.y < 1.4 && Math.hypot(s.p.x - yl.x, s.p.z - yl.z) > 1.5);\n"),
("      if (r.ok && (s.v.y < 0 || r.dh < 0.55 || s.p.y < 1.2)) {\n        if (desperate",
 "      if (mine && r.ok && (s.v.y < 0 || r.dh < 0.55 || s.p.y < 1.2)) {\n        if (desperate"),
])
patch('game.js',[("ctrl: 'bot', diff: Math.max(1, d), hand: botHand() });","ctrl: 'bot', diff: 3, hand: botHand() });   // the partner bot always plays at master level")])
patch('server.js',[("diff: teamHasHuman(Math.floor(i / per)) ? 2 : 1 }));","diff: teamHasHuman(Math.floor(i / per)) ? 3 : 2 }));"),
 ("a.ctrl = 'bot'; a.diff = 2; a.name = 'Bot';","a.ctrl = 'bot'; a.diff = 3; a.name = 'Bot';")])
print('ok')
