'use strict';
// Marginal effect of ONE stat, bot-vs-bot, deterministic (seeded LCG).
//   node tests/balance-marginal.js                 -> full sweep: each stat at 5 and at 1 vs baseline 3/3/3/3/3/3
//   node tests/balance-marginal.js --games 250 --diff 2 --points 11 --jobs 3   (--human 1: scripted assisted human vs bot diff 1)
//   node tests/balance-marginal.js --one pow=5      -> a single variant (may combine: pow=5,ctl=1), prints JSON
// Stats are overridden in-process on the athlete (cat's CHARS entry is patched only while charStats runs, then restored).
// Every variant plays as team 0 for half the games and as team 1 for the other half; first serve alternates inside each half.
const path = require('node:path'), { spawn } = require('node:child_process');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const HUMAN = opt('human') !== undefined, HDIFF = +opt('human', 1);   // --human <botDiff>: the variant is a scripted assisted human
const GAMES = +opt('games', 250), DIFF = +opt('diff', 2), POINTS = +opt('points', 11), JOBS = Math.min(+opt('jobs', 3), 10),   // few workers, started at idle priority: this must not hog the machine
      SEED = +opt('seed', 12345), VENUE = +opt('venue', 0), DOUBLES = opt('mode') === '2v2', BO = +opt('bo', 1);   // --venue 0..5, --mode 2v2 (both teammates get the variant stats), --bo 3
const SIM = path.resolve(opt('sim', path.join(__dirname, '..', 'sim.js')));
const STATS = ['spd', 'jmp', 'pow', 'rch', 'ctl', 'sta'];

function statsFor(S, over) {
  const cat = S.CHARS.find((c) => c.id === 'cat'), keep = cat.stats;
  cat.stats = Object.assign({ spd: 3, jmp: 3, pow: 3, rch: 3, ctl: 3, sta: 3 }, over);
  try { return S.charStats('cat'); } finally { cat.stats = keep; }
}
function runOne(spec) {
  const S = require(SIM);
  let seed = SEED; Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const over = {}; if (spec && spec !== 'base') for (const kv of spec.split(',')) { const [k, v] = kv.split('='); over[k] = +v; }
  const R = { spec, games: 0, wins: 0, pf: 0, pa: 0, stuck: 0, rallySum: 0, pts: 0, clock: 0,
    v: { hits: 0, smash: 0, win: 0, out: 0, net: 0, smashWin: 0, smashErr: 0, staEnd: 0, contactY: 0, smashSpeed: 0 },
    o: { hits: 0, smash: 0, win: 0, out: 0, net: 0, smashWin: 0, smashErr: 0, staEnd: 0, contactY: 0, smashSpeed: 0 } };
  for (let g = 0; g < GAMES; g++) {
    const side = g < GAMES / 2 ? 0 : 1;
    const per = DOUBLES ? 2 : 1, me = side * per;   // me: the scripted human's index (1v1 only) / first athlete of the variant team
    const m = S.createMatch({ mode: DOUBLES ? '2v2' : '1v1', points: POINTS, games: BO, venue: VENUE, firstServe: g % 2,
      slots: Array.from({ length: 2 * per }, (_, i) => (HUMAN && i === me ? { char: 'cat', ctrl: 'human', assist: 1 } : { char: 'cat', ctrl: 'bot', diff: HUMAN ? HDIFF : DIFF })) });
    let armed = false, pressAt = Infinity;   // armed: one press per incoming flight
    for (const a of m.athletes) a.st = statsFor(S, a.team === side ? over : {});
    let t = 0, lastShot = null, lastI = -1;
    while (m.state !== 'over' && t++ < 120 * 60 * 30) {
      if (HUMAN) {   // scripted player: default assist (auto-steer, buffered hit), one press 0.2-0.6 s before the expected contact
        const a = m.athletes[me], s = m.shuttle, inp = a.input;
        if (m.state === 'serve' && m.serverIdx === me && m.stateT > 1) { inp.hit = true; inp.power = Math.random() < 0.5 ? 0.2 : 0.8; }
        else if (m.state === 'rally' && s.live && s.lastTeam !== a.team && armed && m.clock >= pressAt) {
          armed = false;
          const out = s.pred && Math.max(Math.abs(s.pred.x) - m.halfW, Math.abs(s.pred.z) - S.HALF_L) > 0.3;
          if (!out) { const r = Math.random(); inp.hit = true; inp.power = r < 0.55 ? 0.85 : r < 0.8 ? 0.55 : 0.2; }   // hard (smash/drive) / clear / drop
        }
      }
      S.step(m);
      for (const e of m.events) {
        if (e.type === 'hit') {
          if (HUMAN && m.athletes[e.i].team !== side) {   // when will it reach racket height on my side? press 0.2-0.6 s before that (never sooner than 0.12 s after their hit)
            const sg = side === 0 ? 1 : -1, fl = S.simLand(m.shuttle.p, m.shuttle.v, m.wind, true).pts;
            const land = fl[fl.length - 1];   // the assist walks the player to the landing spot: contact is where the flight first comes within reach of it
            const c = fl.find((p) => p.z * sg > 0.3 && p.y < 2.2 && Math.hypot(p.x - land.x, p.z - land.z) < 1.2) || land;
            pressAt = m.clock + Math.max(0.12, c.t - (0.2 + 0.4 * Math.random())); armed = true;
          }
          const k = m.athletes[e.i].team === side ? R.v : R.o; k.hits++; lastShot = e.shot; lastI = e.i;
          if (e.shot === 'smash') { k.smash++; k.contactY += e.y; k.smashSpeed += e.speed; } }
        else if (e.type === 'point') {
          R.pts++; R.rallySum += e.rally;
          if (lastI >= 0) { const k = m.athletes[lastI].team === side ? R.v : R.o; const won = e.team === m.athletes[lastI].team;
            if (won) { k.win++; if (lastShot === 'smash') k.smashWin++; }
            else { if (e.why === 'Chạm lưới') k.net++; else k.out++; if (lastShot === 'smash') k.smashErr++; } }
          lastI = -1; lastShot = null;
        }
      }
      m.events.length = 0;
    }
    if (m.state !== 'over') { R.stuck++; continue; }
    R.games++; if (m.winner === side) R.wins++;
    for (const sc of m.gameScores) { R.pf += sc[side]; R.pa += sc[1 - side]; }
    R.v.staEnd += m.athletes[me].sta; R.o.staEnd += m.athletes[(1 - side) * per].sta; R.clock += m.clock;
  }
  return R;
}
function summarize(R) {
  const p = R.wins / R.games, se = Math.sqrt(Math.max(p * (1 - p), 0.0001) / R.games);
  const f = (k) => ({ hits: k.hits, smash: k.smash, winners: k.win, out: k.out, net: k.net, smashWin: k.smashWin, smashErr: k.smashErr,
    contactY: +(k.contactY / (k.smash || 1)).toFixed(2), smashSpd: +(k.smashSpeed / (k.smash || 1)).toFixed(1), staEnd: +(k.staEnd / R.games).toFixed(2) });
  return { spec: R.spec, games: R.games, win: +(100 * p).toFixed(1), ci95: +(196 * se).toFixed(1), delta: +(100 * p - 50).toFixed(1),
    ptShare: +(100 * R.pf / (R.pf + R.pa)).toFixed(1), rally: +(R.rallySum / R.pts).toFixed(1), secPerGame: +(R.clock / R.games).toFixed(0), stuck: R.stuck, v: f(R.v), o: f(R.o) };
}
if (opt('one')) { console.log(JSON.stringify(summarize(runOne(opt('one'))))); return; }

const specs = opt('specs') ? opt('specs').split(';') : ['base'].concat(...STATS.map((s) => [s + '=5', s + '=1']));
const out = new Array(specs.length); let next = 0, live = 0;
function launch() {
  while (live < JOBS && next < specs.length) {
    const i = next++; live++; let buf = '';
    const c = spawn(process.execPath, [__filename, ...(HUMAN ? ['--human', HDIFF] : []), '--one', specs[i], '--games', GAMES, '--diff', DIFF, '--points', POINTS, '--seed', SEED, '--sim', SIM, '--venue', VENUE, '--bo', BO, ...(DOUBLES ? ['--mode', '2v2'] : [])], { stdio: ['ignore', 'pipe', 'inherit'] });
    try { require('node:os').setPriority(c.pid, 19); } catch (e) { /* priority is best effort */ }
    c.stdout.on('data', (b) => buf += b);
    c.on('exit', () => { out[i] = JSON.parse(buf); live--; if (next >= specs.length && !live) report(); else launch(); });
  }
}
function report() {
  console.log(`${HUMAN ? 'SCRIPTED HUMAN (assist 1) vs bot diff ' + HDIFF + '; ' : ''}sim=${path.basename(SIM)} ${DOUBLES ? '2v2 ' : ''}venue=${VENUE} bestOf=${BO} diff=${DIFF} points=${POINTS} games/variant=${GAMES} seed=${SEED}  (win% is the variant's; ci95 = +/- half-width, normal approx)`);
  console.table(out.map((r) => ({ variant: r.spec, 'win%': r.win, '+/-': r.ci95, 'delta pp': r.delta, 'pts%': r.ptShare, rally: r.rally, 's/game': r.secPerGame,
    smashes: r.v.smash, smWin: r.v.smashWin, smErr: r.v.smashErr, winners: r.v.winners, out: r.v.out, net: r.v.net, oppWinners: r.o.winners, oppOut: r.o.out, oppNet: r.o.net, contactY: r.v.contactY, smSpd: r.v.smashSpd, staEnd: r.v.staEnd, oppSta: r.o.staEnd })));
  if (opt('json')) require('node:fs').writeFileSync(opt('json'), JSON.stringify(out, null, 1));
}
launch();
