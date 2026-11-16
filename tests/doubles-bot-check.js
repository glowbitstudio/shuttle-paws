'use strict';
// Usage: node tests/doubles-bot-check.js [matches]   -- 2v2 bot behaviour, measured over simulated matches.
// A: four master bots. B: an idle human + master bot against two master bots (the human never moves or swings).
// Reports how points end, wrong-receiver faults, and points where both mates of a team swung at the same shuttle.
const S = require('../sim');
const N = +process.argv[2] || 30, DT = 1 / 60;
function run(slots) {
  const why = {}; let pts = 0, wrongByBot = 0, doubleSwing = 0, wins = [0, 0], rallySum = 0;
  for (let k = 0; k < N; k++) {
    const m = S.createMatch({ mode: '2v2', points: 11, venue: 0, slots: slots.map((s) => Object.assign({}, s)) });
    let guard = 0, prevSwing = [false, false, false, false], swungThisFlight = new Set(), lastTeam = -1;
    while (m.state !== 'over' && guard++ < 60 * 60 * 30) {
      S.step(m, DT);
      if (m.shuttle.lastTeam !== lastTeam) { lastTeam = m.shuttle.lastTeam; swungThisFlight = new Set(); }
      m.athletes.forEach((a, i) => { const sw = a.swingT >= 0 && a.swingT < 0.05; if (sw && !prevSwing[i]) { for (const j of swungThisFlight) if (m.athletes[j].team === a.team && j !== i) doubleSwing++; swungThisFlight.add(i); } prevSwing[i] = sw; });
      for (const e of m.events) if (e.type === 'point') { pts++; rallySum += e.rally || 0; why[e.why] = (why[e.why] || 0) + 1; if (/Sai người/.test(e.why || '')) wrongByBot++; }
      m.events.length = 0;
    }
    if (m.state === 'over') wins[m.games[0] > m.games[1] || (m.games[0] === m.games[1] && m.score[0] > m.score[1]) ? 0 : 1]++;
  }
  return { points: pts, avgRally: +(rallySum / Math.max(1, pts)).toFixed(2), wins, wrongReceiver: wrongByBot, doubleSwing, why };
}
const bot = (d) => ({ name: 'b', char: 'cat', ctrl: 'bot', diff: d });
const out = {
  A_fourMasters: run([bot(3), bot(3), bot(3), bot(3)]),
  B_idleHumanPlusMaster: run([{ name: 'h', char: 'cat', ctrl: 'human', assist: 0 }, bot(3), bot(3), bot(3)]),
};
console.log(JSON.stringify(out, null, 1));
if (process.argv[3] === 'assert') {
  if (out.A_fourMasters.wrongReceiver || out.B_idleHumanPlusMaster.wrongReceiver) { console.error('FAIL wrong receiver'); process.exit(1); }
  console.log('PASS doubles bots: no wrong-receiver faults');
}
