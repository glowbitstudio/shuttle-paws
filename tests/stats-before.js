/* Shuttle Paws — shared match simulation (browser + Node). Pure logic, no rendering. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SPSim = factory();
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';

const DT = 1 / 120;
// PACE speeds the shuttle up without changing the shape of its flight: speeds x PACE, gravity x PACE^2,
// wind x PACE (drag is per unit speed^2 so it scales on its own). Every shot arrives PACE times sooner.
const PACE = 1.2;
const G = 9.8 * PACE * PACE;
const DRAG = 0.125;
const NET_H = 1.55;
const HALF_L = 6.7;
const HALF_W = 2.59;
const DBL_W = 3.05;
const SHORT_LINE = 1.98;
const LONG_SERVE = 0.76;
const SERVE_CLOCK = 25;

// ------------------------------------------------------------------ data
// stats 1..5 : spd speed, jmp jump, pow smash power, rch reach, ctl perfect window
const CHARS = [
  { id: 'cat',     name: 'Mướp',     kind: 'Mèo',        face: '🐱', ear: 'cat',   body: 0xf6b26b, belly: 0xfff1de, earIn: 0xffb3a7, tail: 'long',  stats: { spd: 3, jmp: 3, pow: 3, rch: 3, ctl: 3, sta: 3 }, desc: 'Cân bằng mọi mặt, dễ chơi.' },
  { id: 'bunny',   name: 'Bông',     kind: 'Thỏ',        face: '🐰', ear: 'bunny', body: 0xf4f0ee, belly: 0xffffff, earIn: 0xffc2cf, tail: 'puff',  stats: { spd: 5, jmp: 4, pow: 2, rch: 2, ctl: 2, sta: 2 }, desc: 'Chạy nhanh như gió, đập hơi nhẹ.' },
  { id: 'bear',    name: 'Ủn',       kind: 'Gấu',        face: '🐻', ear: 'round', body: 0xa9744f, belly: 0xe8c9a8, earIn: 0xe8c9a8, tail: 'puff',  stats: { spd: 2, jmp: 2, pow: 5, rch: 4, ctl: 2, sta: 4 }, desc: 'Chậm mà chắc, đập như sấm.' },
  { id: 'panda',   name: 'Tròn',     kind: 'Gấu trúc',   face: '🐼', ear: 'round', body: 0xfafafa, belly: 0xffffff, earIn: 0x2b2b2b, earCol: 0x2b2b2b, patches: true, tail: 'puff', stats: { spd: 2, jmp: 2, pow: 3, rch: 5, ctl: 3, sta: 4 }, desc: 'Tầm với dài, phòng thủ lì.' },
  { id: 'fox',     name: 'Lửa',      kind: 'Cáo',        face: '🦊', ear: 'cat',   body: 0xff8c42, belly: 0xfff6ec, earIn: 0x3b2f2a, tail: 'fox',   stats: { spd: 4, jmp: 3, pow: 3, rch: 2, ctl: 3, sta: 3 }, desc: 'Lắt léo, thích bỏ nhỏ.' },
  { id: 'frog',    name: 'Ộp',       kind: 'Ếch',        face: '🐸', ear: 'frog',  body: 0x7cc96b, belly: 0xe9f7c8, earIn: 0xffffff, tail: 'none',  stats: { spd: 3, jmp: 5, pow: 3, rch: 2, ctl: 2, sta: 2 }, desc: 'Bật nhảy cực cao, mê đập cầu.' },
  { id: 'penguin', name: 'Lạch Bạch',kind: 'Cánh cụt',   face: '🐧', ear: 'beak',  body: 0x2f3542, belly: 0xffffff, earIn: 0xffa94d, tail: 'none',  stats: { spd: 2, jmp: 2, pow: 3, rch: 4, ctl: 4, sta: 4 }, desc: 'Bình tĩnh, cầm vợt rất chuẩn.' },
  { id: 'duck',    name: 'Quạc',     kind: 'Vịt',        face: '🦆', ear: 'beak',  body: 0xffd84d, belly: 0xfff3b0, earIn: 0xff9f43, tail: 'puff',  stats: { spd: 3, jmp: 3, pow: 2, rch: 3, ctl: 4, sta: 3 }, desc: 'Khéo tay, ít khi đánh hỏng.' },
  { id: 'hamster', name: 'Hạt Dẻ',   kind: 'Chuột hamster', face: '🐹', ear: 'round', body: 0xf0b27a, belly: 0xfff4e6, earIn: 0xffb3a7, tail: 'none', stats: { spd: 5, jmp: 3, pow: 1, rch: 2, ctl: 4, sta: 5 }, desc: 'Chân ngắn nhưng chạy không biết mệt.', unlock: 'win1' },
  { id: 'dog',     name: 'Đốm',      kind: 'Cún',        face: '🐶', ear: 'floppy',body: 0xfff4e6, belly: 0xffffff, earIn: 0x8d6e63, earCol: 0x8d6e63, tail: 'long', stats: { spd: 4, jmp: 3, pow: 3, rch: 3, ctl: 2, sta: 4 }, desc: 'Đuổi theo mọi quả cầu.', unlock: 'matches5' },
  { id: 'sheep',   name: 'Mây',      kind: 'Cừu',        face: '🐑', ear: 'sheep', body: 0xfdfbf7, belly: 0x5d4e46, earIn: 0x5d4e46, tail: 'puff',  stats: { spd: 3, jmp: 2, pow: 2, rch: 4, ctl: 4, sta: 3 }, desc: 'Mềm như mây, thủ chắc như đá.', unlock: 'perfect10' },
  { id: 'koala',   name: 'Ngủ Gật',  kind: 'Koala',      face: '🐨', ear: 'koala', body: 0xa4b0be, belly: 0xe7ecf1, earIn: 0xf1f2f6, tail: 'none',  stats: { spd: 2, jmp: 3, pow: 3, rch: 3, ctl: 5, sta: 2 }, desc: 'Chậm chạp nhưng không bao giờ run tay.', unlock: 'rally25' },
  { id: 'tiger',   name: 'Vằn',      kind: 'Hổ con',     face: '🐯', ear: 'round', body: 0xffa94d, belly: 0xfff4e6, earIn: 0x2b2b2b, stripes: true, tail: 'long', stats: { spd: 3, jmp: 4, pow: 5, rch: 2, ctl: 1, sta: 2 }, desc: 'Một cú đập là đối thủ chảy nước mắt.', unlock: 'smash10' },
  { id: 'otter',   name: 'Lướt',     kind: 'Rái cá',     face: '🦦', ear: 'round', body: 0x8d6e63, belly: 0xd7ccc8, earIn: 0x6d4c41, tail: 'long',  stats: { spd: 4, jmp: 2, pow: 2, rch: 4, ctl: 3, sta: 3 }, desc: 'Cứu cầu bằng những cú lao người.', unlock: 'dive5' },
  { id: 'unicorn', name: 'Cầu Vồng', kind: 'Kỳ lân',     face: '🦄', ear: 'unicorn', body: 0xfdf0ff, belly: 0xffffff, earIn: 0xffb8e0, tail: 'puff', stats: { spd: 4, jmp: 5, pow: 3, rch: 3, ctl: 3, sta: 3 }, desc: 'Lướt trên sân như đang bay.', unlock: 'hardwin' },
  { id: 'dragon',  name: 'Bé Rồng',  kind: 'Rồng con',   face: '🐲', ear: 'dragon',body: 0x7bd389, belly: 0xfff3b0, earIn: 0xffd23f, tail: 'long',  stats: { spd: 3, jmp: 4, pow: 5, rch: 4, ctl: 3, sta: 4 }, desc: 'Nhân vật huyền thoại. Mạnh toàn diện.', unlock: 'master' },
];
function charStats(id) {
  const c = CHARS.find((c) => c.id === id) || CHARS[0];
  const s = c.stats;
  return {
    speed: 4.55 + s.spd * 0.17,
    jumpVy: 4.3 + s.jmp * 0.22,
    power: 0.9 + s.pow * 0.05,
    reach: 0.93 + s.rch * 0.045,
    control: 0.85 + s.ctl * 0.06,
    endurance: 1 + (3 - (s.sta || 3)) * 0.04,   // moderate drain range: 1.08 (sta 1) .. 0.92 (sta 5)
  };
}

const DIFF = [
  // miss: chance of an unforced error on any shot (more when stretched)
  { name: 'Dễ',      speed: 3.0, react: 0.36, skill: 0.52, smash: 0.2,  jump: false, judge: 0.2,  attack: 0, miss: 0.12 },
  { name: 'Vừa',     speed: 3.7, react: 0.15, skill: 0.72, smash: 0.6,  jump: true,  judge: 0.5,  attack: 2, miss: 0.04 },
  { name: 'Khó',     speed: 4.1, react: 0.08, skill: 0.84, smash: 0.7,  jump: true,  judge: 0.85, attack: 2, miss: 0.05 },
  { name: 'Cao thủ', speed: 4.5, react: 0.04, skill: 0.93, smash: 0.95, jump: true,  judge: 0.97, attack: 2, miss: 0.025 },
];

const VENUES = [
  { id: 'gym',   name: 'Nhà thi đấu Hoa Mai', desc: 'Nhà thi đấu ấm áp. Không có gió.', wind: 'none', max: 0 },
  { id: 'arena', name: 'Đấu trường Ánh Sao',  desc: 'Sân lớn dưới đèn rọi. Không có gió.', wind: 'none', max: 0 },
  { id: 'roof',  name: 'Sân thượng Hoàng Hôn', desc: 'Sân trên nóc nhà lúc chiều tà. Gió nhẹ.', wind: 'steady', max: 0.9 },
  { id: 'beach', name: 'Bờ biển Nắng Vàng',   desc: 'Sân cát cạnh biển. Gió biển thổi ngang đều.', wind: 'steady', max: 1.6 },
  { id: 'park',  name: 'Công viên Cỏ Xanh',   desc: 'Sân cỏ. Gió giật đổi chiều mỗi pha.', wind: 'gusty', max: 2.0 },
  { id: 'snow',  name: 'Đỉnh Tuyết Trắng',    desc: 'Sân trên núi tuyết. Gió lạnh thổi từ mọi phía.', wind: 'any', max: 2.4 },
];

const SHOTS = {
  smash:      { angles: [-14, -10, -7, -4, -1, 3, 7], vmax: 32, name: 'Đập' },
  drive:      { angles: [3, 6, 9, 13, 17, 22], vmax: 21, name: 'Tạt' },
  clear:      { angles: [50, 56, 44, 38], vmax: 24, name: 'Phông' },
  lift:       { angles: [52, 60, 45, 40], vmax: 24, name: 'Lốp' },
  drop:       { angles: [12, 18, 25, 32, 40], vmax: 15, name: 'Bỏ nhỏ' },
  net:        { angles: [30, 40, 50, 60, 68, 75], vmax: 11, name: 'Bỏ lưới' },
  serveHigh:  { angles: [56, 62, 50], vmax: 22, name: 'Giao cao' },
  serveShort: { angles: [24, 30, 36, 44, 52], vmax: 13.5, name: 'Giao ngắn' },
};

for (const k in SHOTS) SHOTS[k].vmax *= PACE;

// ------------------------------------------------------------------ helpers
const rand = (a, b) => a + Math.random() * (b - a);
const randn = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const sgn = (team) => (team === 0 ? 1 : -1);                 // team 0 lives on z>0
const courtX = (team, right) => sgn(team) * (right ? 1 : -1);  // x sign of a team's right/left court

function stepShuttle(p, v, dt, w) {
  v.y -= G * dt;
  const rx = v.x - (w ? w.x * PACE : 0), rz = v.z - (w ? w.z * PACE : 0), ry = v.y;
  const f = DRAG * Math.hypot(rx, ry, rz) * dt;
  v.x -= rx * f; v.y -= ry * f; v.z -= rz * f;
  p.x += v.x * dt; p.y += v.y * dt; p.z += v.z * dt;
}

// serves: the server has time to read the wind, so aim off to cancel the drift (full compensation)
function aimIntoWind(from, target, shot, w, powerMul) {
  if (!w || (!w.x && !w.z)) return solveShot(from, target, shot, w, powerMul, 1);
  const aim = { x: target.x, z: target.z };
  let v = null;
  for (let i = 0; i < 4; i++) {
    v = solveShot(from, aim, shot, w, powerMul, 1);
    const r = simLand(from, v, w);
    const ex = r.x - target.x, ez = r.z - target.z;
    if (Math.hypot(ex, ez) < 0.05) break;
    aim.x -= ex; aim.z -= ez;
  }
  return v;
}

// a smash is hit flat out: full racket speed at the steepest downward angle that still clears the net and lands
// in the court (instead of easing off to reach a set spot). Lower contact = flatter, higher/jumping = steeper.
function smashShot(m, from, target, shot, powerMul, team) {
  const dx = target.x - from.x, dz = target.z - from.z, D = Math.hypot(dx, dz) || 0.01;
  const ux = dx / D, uz = dz / D, side = -sgn(team);
  for (const k of [1, 0.9, 0.8]) for (let deg = -24; deg <= 10; deg += 2) {
    const sp = shot.vmax * (powerMul || 1) * k;
    const a = deg * Math.PI / 180, v = { x: ux * Math.cos(a) * sp, y: Math.sin(a) * sp, z: uz * Math.cos(a) * sp };
    const r = simLand(from, v, m.wind);
    const depth = r.z * side;
    if (r.crossY !== null && r.crossY > NET_H + 0.08 && depth > 1.2 && depth < HALF_L - 0.25 && Math.abs(r.x) < m.halfW - 0.1) return v;
  }
  return null;   // no flat-out line works from here: fall back to a placed shot
}

// Position where a physics step intersects the net plane, not its end-of-step position.
function netCrossing(x, y, z, p) {
  if (z === 0 || Math.sign(z) === Math.sign(p.z)) return null;
  const f = z / (z - p.z);
  return { x: lerp(x, p.x, f), y: lerp(y, p.y, f) };
}

function simLand(p0, v0, w, record, maxT) {
  const p = { x: p0.x, y: p0.y, z: p0.z }, v = { x: v0.x, y: v0.y, z: v0.z };
  let crossY = null, t = 0;
  const pts = record ? [] : null;
  const lim = maxT || 6;
  while (t < lim) {
    const px = p.x, py = p.y, pz = p.z;
    stepShuttle(p, v, DT, w); t += DT;
    if (record) pts.push({ x: p.x, y: p.y, z: p.z, t });
    const cross = crossY === null ? netCrossing(px, py, pz, p) : null;
    if (cross) crossY = cross.y;
    if (p.y <= 0) break;
  }
  return { x: p.x, z: p.z, t, crossY, pts };
}

function solveShot(from, target, shot, w, powerMul, comp) {
  const dx = target.x - from.x, dz = target.z - from.z;
  const D = Math.hypot(dx, dz) || 0.01;
  const ux = dx / D, uz = dz / D;
  const vmax = shot.vmax * (powerMul || 1);
  const k = comp === undefined ? 0.55 : comp;              // in rallies players only half-compensate the wind
  const ww = w ? { x: w.x * k, z: w.z * k } : null;
  let best = null;
  const score = (c) => Math.min(c.clear, 0.3) * 3 - Math.max(0, c.short);
  for (const deg of shot.angles) {
    const a = deg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const mk = (s) => ({ x: ux * ca * s, y: sa * s, z: uz * ca * s });
    let lo = 0.5, hi = vmax, r;
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      r = simLand(from, mk(mid), ww);
      const dist = (r.x - from.x) * ux + (r.z - from.z) * uz;
      if (dist < D) lo = mid; else hi = mid;
    }
    const v = mk(hi);
    r = simLand(from, v, ww);
    const clear = r.crossY !== null ? r.crossY - NET_H : -9;
    const dist = (r.x - from.x) * ux + (r.z - from.z) * uz;
    const cand = { v, clear, short: D - dist };
    if (clear > 0.12 && cand.short < 0.4) return v;
    if (!best || score(cand) > score(best)) best = cand;
  }
  return best.v;
}

// ------------------------------------------------------------------ stamina
// a.sta: 1 = fresh, 0 = exhausted. Below 70% fatigue gradually affects movement and shots.
const STA_FREE = 0.7;
const STA_RATE = 1;      // costs below are fractions of the full bar before endurance
const fatigue = (a) => clamp((STA_FREE - (a.sta === undefined ? 1 : a.sta)) / STA_FREE, 0, 1);
const tired = {
  move: (a) => 1 - 0.25 * fatigue(a),
  jump: (a) => 1 - 0.3 * fatigue(a),
  power: (a) => 1 - 0.3 * fatigue(a),
  control: (a) => 1 - 0.35 * fatigue(a),
};
function useStamina(m, a, amt) {
  const before = a.sta;
  a.sta = clamp(a.sta - amt * a.st.endurance * STA_RATE, 0, 1);
  if (before >= 0.3 && a.sta < 0.3) emit(m, { type: 'tired', i: a.i });
}
function restAll(m, amt) { for (const a of m.athletes) a.sta = clamp(a.sta + amt, 0, 1); }

// ------------------------------------------------------------------ match
/*
 opts: { mode:'1v1'|'2v2', points:11|21, games:1|3 (best of), venue:index, hitStop:bool,
         slots:[{ name, char, ctrl:'human'|'bot', diff }] }   (2v2: slots 0,1 = team 0; 2,3 = team 1)
*/
function createMatch(opts) {
  const doubles = opts.mode === '2v2';
  const m = {
    opts, doubles, venue: VENUES[opts.venue] || VENUES[0],
    halfW: doubles ? DBL_W : HALF_W,
    athletes: [], shuttle: null,
    state: 'serve', stateT: 0, clock: 0, hitStop: 0,
    score: [0, 0], games: [0, 0], gameNo: 1, gamesToWin: Math.ceil((opts.games || 1) / 2), gameScores: [], serverTeam: 0, serverIdx: 0, receiverIdx: 1,
    right: [0, 0], left: [0, 0],
    wind: { x: 0, z: 0 }, windBase: Math.random() * Math.PI * 2,
    rally: 0, longest: 0, serveShot: false, winner: -1, pointsLog: [],
    events: [], hist: [],
  };
  const per = doubles ? 2 : 1;
  opts.slots.forEach((s, i) => {
    const team = i < per ? 0 : 1;
    m.athletes.push({
      i, team, name: s.name || (s.ctrl === 'bot' ? 'Bot' : 'Người chơi'), char: s.char, hand: s.hand === 'L' ? 'L' : 'R', ctrl: s.ctrl, diff: s.diff || 0,
      sta: 1, reachT0: -1, hitQueue: 0, hitPower: undefined, ignoreHit: false, st: charStats(s.char), assist: s.ctrl === 'human' ? clamp(s.assist === undefined ? 1 : s.assist | 0, 0, 2) : 0,
      x: 0, z: sgn(team) * 4, vx: 0, vz: 0, jumpY: 0, vy: 0,
      swingT: -1, swingHigh: true, swingHit: false,
      diveT: -1, diveDx: 0, diveDz: 0, recoverT: 0,
      splitT: 0, mood: 0, emote: 0, emoteT: 0, lag: 0,
      tx: 0, tz: sgn(team) * 4, jumpAt: -1, plan: null, home: { x: 0, z: sgn(team) * 3.7 },
      input: { x: 0, y: 0, hit: false, jump: false, dive: false, emote: 0, power: -1, hold: false, holdPower: 0 },
      stats: { hits: 0, perfect: 0, smash: 0, dives: 0, diveSaves: 0, winners: 0, errors: 0 },
    });
  });
  for (let t = 0; t < 2; t++) {
    const mem = m.athletes.filter((a) => a.team === t);
    m.right[t] = mem[0].i; m.left[t] = (mem[1] || mem[0]).i;
  }
  m.shuttle = { p: { x: 0, y: 1, z: 2 }, v: { x: 0, y: 0, z: 0 }, live: false, held: true, last: -1, lastTeam: -1, netted: false, landed: false, pred: null };
  m.serverTeam = Math.random() < 0.5 ? 0 : 1;
  if (opts.firstServe !== undefined) m.serverTeam = opts.firstServe;
  startServe(m);
  return m;
}

function emit(m, e) { m.events.push(e); }

function newWind(m) {
  const v = m.venue, w = m.wind;
  if (v.wind === 'none') { w.x = w.z = 0; return; }
  let ang, str;
  if (v.wind === 'steady') { ang = (Math.cos(m.windBase) >= 0 ? 0 : Math.PI) + randn() * 0.12; str = v.max * rand(0.8, 1.0); }
  else if (v.wind === 'gusty') { ang = (Math.random() < 0.5 ? 0 : Math.PI) + randn() * 0.5; str = v.max * rand(0.3, 1.0); }
  else { ang = Math.random() * Math.PI * 2; str = v.max * rand(0.3, 1.0); }
  w.x = Math.cos(ang) * str; w.z = Math.sin(ang) * str;
}

function startServe(m) {
  m.state = 'serve'; m.stateT = 0; m.rally = 0; m.serveShot = false;
  m.hist.length = 0;
  const T = m.serverTeam, R = 1 - T;
  const right = m.score[T] % 2 === 0;
  m.serverIdx = right ? m.right[T] : m.left[T];
  m.receiverIdx = right ? m.right[R] : m.left[R];
  const d = m.doubles;
  for (const a of m.athletes) {
    a.vx = a.vz = 0; a.jumpY = 0; a.vy = 0; a.swingT = -1; a.diveT = -1; a.recoverT = 0; a.jumpAt = -1; a.plan = null; a.hitQueue = 0;
    const isRight = a.i === m.right[a.team];
    const myRight = d ? isRight : right;
    if (a.i === m.serverIdx) { a.x = courtX(T, right) * 1.0; a.z = sgn(T) * (d ? 2.5 : 3.2); }
    else if (a.i === m.receiverIdx) { a.x = courtX(R, right) * 1.0; a.z = sgn(R) * (d ? 2.6 : 3.0); }
    else { a.x = courtX(a.team, !right) * 1.35; a.z = sgn(a.team) * 4.4; }
    a.home = { x: d ? courtX(a.team, myRight) * 1.3 : 0, z: sgn(a.team) * (d ? 3.4 : 3.7) };
    a.tx = a.x; a.tz = a.z;
  }
  const s = m.shuttle;
  s.live = false; s.held = true; s.last = -1; s.lastTeam = -1; s.netted = false; s.landed = false; s.pred = null;
  holdShuttle(m);
  newWind(m);
  emit(m, { type: 'serve', server: m.serverIdx });
}

function holdShuttle(m) {
  // held in the free (non-racket) paw, raised in front: matches what the client draws
  const a = m.athletes[m.serverIdx], sg = sgn(a.team), hs = a.hand === 'L' ? -1 : 1;
  m.shuttle.p.x = a.x - sg * hs * 0.36; m.shuttle.p.y = 0.56; m.shuttle.p.z = a.z - sg * 0.19;
}

const ASSIST_REACH = [1, 1.08, 1.2];
const BOT_REACH = [1.0, 1.12, 1.14, 1.2];   // stronger bots lunge further instead of running faster
const REACH_H = 1.8;   // top of the racket's reach standing (the models are drawn to match)
function inReachAt(a, p) {
  const dh = Math.hypot(p.x - a.x, p.z - a.z);
  const diving = a.diveT >= 0;
  const rH = (diving ? 1.75 : 1.05) * a.st.reach * (a.ctrl === 'bot' ? BOT_REACH[a.diff || 0] : ASSIST_REACH[a.assist || 0]) + (a._extra || 0);
  const yMin = diving ? 0.0 : 0.15;
  const yMax = diving ? 1.2 : (REACH_H + a.jumpY + (a.assist ? 0.12 : 0)) * (1 + (a.st.reach - 1) * 0.5);
  return { ok: dh < rH && p.y > yMin && p.y < yMax, dh, rH };
}
function inReach(m, a) { return inReachAt(a, m.shuttle.p); }

function histAt(m, t) {
  const h = m.hist;
  for (let i = h.length - 1; i >= 0; i--) if (h[i].t <= t) return h[i];
  return h[0];
}

function doHit(m, a, shotName, target, q, label, pw) {
  const s = m.shuttle, shot = SHOTS[shotName];
  if (m.doubles && m.serveShot && a.team !== s.lastTeam && a.i !== m.receiverIdx) {
    s.live = false; s.held = false; s.landed = true; s.pred = null;
    m.hist.length = 0;
    awardPoint(m, m.serverTeam, 'Sai người đỡ giao cầu');
    return;
  }
  // Rewind samples belong only to the current flight, never the incoming shot we just returned.
  m.hist.length = 0;
  if (pw !== undefined && pw > 0.92) q *= 1 - (pw - 0.92) * 0.6;
  const err = 1 - q;
  // how far off target a shot lands. Players: Perfect = exactly where aimed, Good = ~15-20 cm off,
  // poor timing = ~0.5-0.7 m off (so aiming at the lines with a poor hit is risky)
  const human = a.ctrl === 'human';
  const off = human ? (q > 0.9 ? 0 : Math.pow(err, 1.1) * 1.75) : err * 1.1;   // Good ~25-30 cm, poor ~0.7-0.9 m
  const t = { x: target.x + randn() * off, z: target.z + randn() * off * (human ? 1.25 : 1.1) };
  let blunder = 0;
  if (a._blunder) {   // bot unforced error: into the net, or wide / long
    a._blunder = false;
    const kind = Math.random();
    if (kind < 0.45) blunder = 1;
    else if (kind < 0.75) t.x = (Math.sign(target.x) || 1) * (m.halfW + rand(0.2, 0.7));
    else t.z = target.z + Math.sign(target.z) * rand(1.0, 1.8);
  }
  const from = { x: s.p.x, y: s.p.y, z: s.p.z };
  const botPow = a.ctrl === 'bot' && (shotName === 'smash' || shotName === 'drive') ? [0.85, 0.92, 0.97, 1.04][a.diff] : a.ctrl === 'human' && shotName === 'smash' ? 1.12 : 1;
  useStamina(m, a, shotName === 'smash' ? 0.014 : shotName === 'serveHigh' || shotName === 'serveShort' ? 0.002 : shotName === 'drive' || shotName === 'clear' || shotName === 'lift' ? 0.004 : 0.003);
  const pm = botPow * (shotName === 'smash' || shotName === 'drive' ? a.st.power * tired.power(a) : 1) * (pw !== undefined && (shotName === 'smash' || shotName === 'drive') ? 0.86 + 0.26 * pw : 1);
  const isServe = shotName === 'serveHigh' || shotName === 'serveShort';
  // wind: serves and Perfect hits read it fully; Good hits mostly; poor hits barely (the wind gets them)
  const comp = isServe || (human && q > 0.9) ? 1 : human ? (q > 0.62 ? 0.8 : 0.25) : 0.55;
  // the player aims off for the part of the wind they read (comp); the rest still pushes the shuttle
  const readWind = m.wind && comp < 1 ? { x: m.wind.x * comp, z: m.wind.z * comp } : m.wind;
  // assisted players leap into their smashes like the bots do: the contact is taken high
  if (shotName === 'smash' && human && a.assist && from.y < 2.25 && a.sta >= 0.15) { from.y = 2.25; s.p.y = 2.25; if (a.jumpY === 0) { a.vy = a.st.jumpVy * 0.85; a.jumpY = 0.001; } }
  let v = shotName === 'smash' ? smashShot(m, from, t, shot, pm, a.team) : null;
  if (!v) v = human || isServe ? aimIntoWind(from, t, shot, readWind, pm) : solveShot(from, t, shot, m.wind, pm, comp);
  // a Perfect hit always clears the net: if this line would clip the tape, lift it a little until it doesn't
  if (human && q > 0.9 && !isServe) {
    for (let i = 0; i < 12; i++) { const r = simLand(from, v, m.wind); if (r.crossY === null || r.crossY > NET_H + 0.08) break; v.y += 0.5 * PACE; }
  }
  let mult = 1 + randn() * err * 0.07;
  if (q < 0.22) mult *= rand(0.72, 0.9);
  if (blunder) mult *= rand(0.5, 0.65);
  s.v.x = v.x * mult; s.v.y = v.y * mult; s.v.z = v.z * mult;
  s.live = true; s.held = false; s.netted = false; s.last = a.i; s.lastTeam = a.team;
  m.serveShot = shotName === 'serveHigh' || shotName === 'serveShort';
  m.rally++;
  a.stats.hits++;
  if (a.diveT >= 0) a._diveHit = true;
  if (shotName === 'smash') a.stats.smash++;
  if (q > 0.9 && !m.serveShot) a.stats.perfect++;
  const speed = Math.hypot(s.v.x, s.v.y, s.v.z);
  if (shotName === 'smash' && q > 0.7 && m.opts.hitStop) m.hitStop = q > 0.9 ? 0.1 : 0.06;
  emit(m, { type: 'hit', i: a.i, shot: shotName, q, label: label || null, speed, x: s.p.x, y: s.p.y, z: s.p.z, pw: pw === undefined ? -1 : Math.round(pw * 100) / 100 });
  // split step for the receiving team
  for (const o of m.athletes) if (o.team !== a.team) { o.splitT = 0.28; o.swingHit = false; o.hitQueue = 0; o.ignoreHit = false; }
  // predict
  const r = simLand(s.p, s.v, m.wind, true);
  s.pred = { x: r.x, z: r.z, t: r.t, inside: Math.abs(r.x) <= m.halfW + 0.02 && Math.abs(r.z) <= HALF_L + 0.02 };
  if (m.serveShot && s.pred.inside && serveFault(m, r.x, r.z, a.team)) s.pred.inside = false;   // wrong box counts as out
  planTeam(m, 1 - a.team, r, s.pred.inside);
  for (const o of m.athletes) if (o.team === a.team && o.ctrl === 'bot') { o.plan = null; o.tx = o.home.x; o.tz = o.home.z; o.jumpAt = -1; }
}

function chooseTarget(m, a, shotName, aimX, pw) {
  const opps = m.athletes.filter((o) => o.team !== a.team);
  const zs = -sgn(a.team);
  const deepD = m.doubles ? [4.9, 5.9] : [5.2, 6.1];
  const k01 = (lo, hi) => clamp((pw - lo) / (hi - lo), 0, 1);
  let depth = pw !== undefined ? {
    smash: lerp(3.0, 4.6, k01(0.72, 1)), drive: lerp(4.2, m.doubles ? 5.5 : 5.9, k01(0.72, 1)),
    clear: lerp(4.3, m.doubles ? 5.8 : 6.15, k01(0.35, 0.72)), lift: lerp(4.4, m.doubles ? 5.8 : 6.1, k01(0.4, 1)),
    drop: lerp(0.8, 2.4, k01(0, 0.35)), net: lerp(0.5, 1.6, k01(0, 0.4)),
    serveHigh: m.doubles ? rand(5.1, 5.6) : rand(5.6, 6.2), serveShort: rand(2.1, 2.5),
  }[shotName] : {
    smash: rand(3.0, 5.4), drive: rand(4.0, 5.6), clear: rand(deepD[0], deepD[1]), lift: rand(5.0, 6.0),
    drop: rand(1.0, 2.3), net: rand(0.6, 1.5),
    serveHigh: m.doubles ? rand(5.1, 5.6) : rand(5.6, 6.2), serveShort: rand(2.1, 2.5),
  }[shotName];
  // drops / net shots from deep in the court need more room to clear the net
  if (shotName === 'drop' || shotName === 'net') depth = Math.max(depth, Math.abs(a.z) * 0.36 - 0.2);
  const W = m.doubles ? 2.6 : 2.2;
  const edge = a.ctrl === 'bot' ? [0.6, 0.2, 0.15, 0.05][a.diff] : 0.4;   // stronger bots place closer to the lines
  let x;
  if (aimX) x = aimX * rand(W - 0.3, W + 0.05) * sgn(a.team);   // aiming goes for the lines: risky unless Perfect
  else {
    let best = -1, bx = 0;
    for (const cx of [-2.2, -1.4, -0.6, 0.6, 1.4, 2.2]) {
      const px = cx * (W - edge) / 2.2;
      let dmin = 99;
      for (const o of opps) dmin = Math.min(dmin, Math.abs(px - o.x) + Math.abs(zs * depth - o.z) * 0.3);
      const sc = dmin + Math.random() * 1.2;
      if (sc > best) { best = sc; bx = px; }
    }
    x = bx;
  }
  return { x: clamp(x, -W, W), z: zs * depth };
}

// ------------------------------------------------------------------ bots
function planTeam(m, team, r, landIn) {
  const mates = m.athletes.filter((o) => o.team === team);
  const bots = mates.filter((o) => o.ctrl === 'bot');
  const human = mates.find((o) => o.ctrl === 'human');
  if (!bots.length) return;
  const sg = sgn(team);
  const margin = m.serveShot && !landIn ? 1 : Math.max(Math.abs(r.x) - m.halfW, Math.abs(r.z) - HALF_L);
  let best = null;
  for (const b of bots) {
    b.plan = null; b.jumpAt = -1;
    const d = DIFF[b.diff];
    if (!landIn && margin > 0.12 && Math.random() < d.judge) { b.plan = { leave: true, t0: m.clock, react: d.react }; b.tx = b.home.x; b.tz = b.home.z; continue; }
    const spd = d.speed * (b.st.speed / 5.06) * tired.move(b);
    const jv = b.st.jumpVy * tired.jump(b);
    const yMax = d.jump ? REACH_H + jv * jv / 26 : REACH_H - 0.1;
    const cands = [];
    for (let i = 0; i < r.pts.length; i += 2) {
      const p = r.pts[i];
      if (p.z * sg < 0.35 || p.y < 0.3 || p.y > yMax) continue;
      const dist = Math.max(0, Math.hypot(p.x - b.x, p.z - b.z) - 0.75 * b.st.reach * BOT_REACH[b.diff || 0]);
      if (dist / spd + d.react <= p.t) cands.push(p);
    }
    let pick, slack = 0;
    if (cands.length) {
      if (d.attack === 2) pick = cands.reduce((x, y) => (y.y > x.y + 0.05 ? y : x));
      else if (d.attack === 1) pick = cands[Math.floor(cands.length * rand(0.3, 0.8))];
      else pick = cands[Math.floor(cands.length * rand(0.6, 0.95))];
      slack = cands.length;
    } else {
      const last = r.pts[r.pts.length - 1];
      pick = { x: last.x, z: last.z, y: 0.4, t: last.t, desperate: true };
    }
    const cost = Math.hypot(pick.x - b.x, pick.z - b.z) - slack * 0.002;
    b._cand = { pick, cost, react: d.react };
    if (!best || cost < best._cand.cost) best = b;
  }
  if (!best) return;
  // with a human partner: leave shots on the human's half when they're nearby
  if (human && best._cand) {
    const p = best._cand.pick;
    const humanSide = Math.sign(human.x - best.x) === Math.sign(p.x - (human.x + best.x) / 2);
    const hd = Math.hypot(p.x - human.x, p.z - human.z);
    if (humanSide && hd < 1.6 && hd < best._cand.cost + 0.3) { for (const b of bots) if (!b.plan) { b.tx = b.home.x; b.tz = b.home.z; } return; }
  }
  for (const b of bots) {
    if (b.plan) continue;
    if (b !== best) { b.tx = b.home.x; b.tz = b.home.z; continue; }
    const p = b._cand.pick;
    b.plan = { p, react: b._cand.react, t0: m.clock };
    b.tx = p.x - sg * 0.3; b.tz = p.z + sg * 0.25;
    b.jumpAt = p.y > REACH_H - 0.05 ? m.clock + Math.max(0, p.t - 0.38) : -1;
  }
}

function botChooseShot(m, b) {
  const d = DIFF[b.diff], s = m.shuttle.p, az = Math.abs(b.z);
  if (s.y > 1.58 && az < 5.6 && b.sta >= 0.15 && Math.random() < d.smash * clamp(b.sta / 0.6, 0.25, 1)) return 'smash';
  if (s.y < 1.05) return az < 2.6 && Math.random() < 0.55 ? 'net' : 'lift';
  const r = Math.random();
  let shot;
  if (m.doubles) shot = r < 0.3 ? 'clear' : r < 0.55 ? 'drop' : 'drive';
  else shot = r < 0.45 ? 'clear' : r < 0.75 ? 'drop' : 'drive';
  // smarter bots play away from the opponent: drop when they're deep, clear when they're up at the net
  if (d.attack >= 1 && Math.random() < 0.35 + d.attack * 0.2) {
    const opp = m.athletes.filter((o) => o.team !== b.team);
    const oz = Math.min(...opp.map((o) => Math.abs(o.z)));
    if (oz > 4.6) shot = 'drop'; else if (oz < 2.8) shot = 'clear';
  }
  // low contact: a flat shot would hit the net, so lift it or play a soft net shot
  if (shot === 'drive' && s.y < 1.5) shot = az < 3 ? 'net' : 'clear';
  if (shot === 'drop' && s.y < 1.75) shot = 'net';
  return shot;
}

function serveTarget(m, a, short, aimX) {
  const R = 1 - a.team;
  const right = m.score[a.team] % 2 === 0;
  const cx = courtX(R, right);
  const W = m.doubles ? DBL_W : HALF_W;
  // aim inside the box with a safety margin from every line (aimX nudges toward the centre or the side line)
  const x = cx * clamp(rand(0.9, 1.6) + (aimX || 0) * 0.45 * sgn(a.team) * cx, 0.5, W - 0.5);
  const z = sgn(R) * (short ? rand(2.35, 2.7) : (m.doubles ? rand(5.0, 5.5) : rand(5.6, 6.2)));
  return { x, z };
}

// ------------------------------------------------------------------ athlete tick
function moveAthlete(m, a, mx, mz, speed, dt) {
  if (a.recoverT > 0) { a.recoverT -= dt; mx = mz = 0; }
  if (a.diveT >= 0) {
    a.diveT += dt;
    const k = Math.max(0, 1 - a.diveT / 0.35);
    a.x += a.diveDx * 8.5 * dt * k; a.z += a.diveDz * 8.5 * dt * k;
    if (a.diveT > 0.35) {
      a.diveT = -1; a.recoverT = 0.55 * (1 + 0.7 * fatigue(a));
    }
    a.vx = a.vz = 0;
  } else {
    speed *= tired.move(a);
    const air = a.jumpY > 0 ? 0.6 : 1;
    const boost = a.splitT > 0 && m.opts.autoSplit !== false ? 1.08 : 1;
    const accel = a.ctrl === 'bot' ? 8 : 14;   // bots build up speed and brake more gradually (looks like running, not sliding)
    a.vx = damp(a.vx, mx * speed * air * boost, accel, dt);
    a.vz = damp(a.vz, mz * speed * air * boost, accel, dt);
    a.x += a.vx * dt; a.z += a.vz * dt;
    if (m.state === 'rally') {
      const effort = Math.min(1, Math.hypot(a.vx, a.vz) / (a.st.speed * tired.move(a)));
      if (effort > 0.15) useStamina(m, a, effort * effort * 0.0015 * dt);   // running costs a little; no recovery during a rally
    }
  }
  if (a.jumpY > 0 || a.vy > 0) { a.vy -= 13 * dt; a.jumpY += a.vy * dt; if (a.jumpY <= 0) { a.jumpY = 0; a.vy = 0; } }
  a.x = clamp(a.x, -3.8, 3.8);
  const az = clamp(Math.abs(a.z) * (Math.sign(a.z) === sgn(a.team) ? 1 : -1), 0.45, 8.2);
  a.z = az * sgn(a.team);
  if (a.swingT >= 0) { a.swingT += dt; if (a.swingT > 0.4) a.swingT = -1; }
  if (a.splitT > 0) a.splitT -= dt;
  if (a.emoteT > 0) { a.emoteT -= dt; if (a.emoteT <= 0) a.emote = 0; }
}

// server and receiver must stay inside their diagonal service courts until the serve
function keepInServiceBox(m, a) {
  if (a.i !== m.serverIdx && a.i !== m.receiverIdx) return;
  const right = m.score[m.serverTeam] % 2 === 0;           // server's score even: right courts, odd: left courts
  const sx = courtX(a.team, right), sz = sgn(a.team);
  const W = m.doubles ? DBL_W : HALF_W, back = m.doubles ? HALF_L - LONG_SERVE : HALF_L;
  const ax = clamp(a.x * sx, 0.18, W - 0.15), az = clamp(a.z * sz, SHORT_LINE + 0.2, back - 0.15);
  if (ax !== a.x * sx) a.vx = 0;
  if (az !== a.z * sz) a.vz = 0;
  a.x = ax * sx; a.z = az * sz;
}

function startSwing(m, a) {
  if (a.swingT >= 0 && a.swingT < 0.3) return false;
  a.swingT = 0; a.swingHit = false;
  a.swingHigh = m.shuttle.p.y > 1.3 || a.jumpY > 0.2;
  emit(m, { type: 'swing', i: a.i });
  return true;
}

function humanShot(m, a, iy, pw) {
  const s = m.shuttle.p, az = Math.abs(a.z);
  if (pw !== undefined) {
    if (s.y < 1.05) return pw < 0.4 ? 'net' : 'lift';
    if (s.y > 1.45 && (a.jumpY > 0.25 || a.assist) && pw >= 0.72 && a.sta >= 0.15) return 'smash';
    if (pw < 0.35) return s.y < 1.75 ? 'net' : 'drop';   // low shuttle: lift it softly over the net
    if (pw >= 0.72 && s.y > 1.35) return 'drive';
    return 'clear';
  }
  if ((a.jumpY > 0.25 || (a.assist && s.y > 1.7)) && s.y > 1.6 && iy <= 0.4) return 'smash';
  if (s.y < 1.05) return iy < -0.4 ? 'net' : (iy > 0.4 ? 'lift' : (az < 2.6 ? 'net' : 'lift'));
  if (iy > 0.4) return s.y < 1.75 ? 'net' : 'drop';
  if (iy < -0.4) return s.y > 1.58 && az > 2.5 ? 'smash' : 'drive';
  return 'clear';
}

function tickHuman(m, a, dt) {
  const inp = a.input, sg = sgn(a.team);
  // screen-space input -> world (team 1 sees the court from the other end)
  const wx = inp.x * sg, wz = inp.y * sg;
  const canMove = m.state === 'rally' || m.state === 'serve';   // before the serve both server and receiver can step around their box
  if (inp.emote) { a.emote = inp.emote; a.emoteT = 2.4; emit(m, { type: 'emote', i: a.i, e: inp.emote }); inp.emote = 0; }
  if (inp.jump && a.jumpY === 0 && a.diveT < 0 && a.recoverT <= 0 && m.state === 'rally') { a.vy = a.st.jumpVy * tired.jump(a); a.jumpY = 0.001; useStamina(m, a, 0.01); emit(m, { type: 'jump', i: a.i }); }
  if (inp.dive && a.diveT < 0 && a.recoverT <= 0 && a.jumpY === 0 && canMove && m.state === 'rally') {
    let dx = wx, dz = wz;
    if (!dx && !dz && m.shuttle.pred) { dx = m.shuttle.pred.x - a.x; dz = m.shuttle.pred.z - a.z; }
    const l = Math.hypot(dx, dz) || 1; a.diveDx = dx / l; a.diveDz = dz / l;
    a.diveT = 0; a.swingT = -1; startSwing(m, a); a.swingHigh = false; a.stats.dives++;
    useStamina(m, a, 0.025); emit(m, { type: 'dive', i: a.i });
  }
  const PW = inp.power === undefined || inp.power < 0 ? undefined : clamp(inp.power, 0, 1);
  if (inp.hit && a.ignoreHit) { inp.hit = false; a.ignoreHit = false; }
  const aimDir = (x) => (x > 0.35 ? 1 : x < -0.35 ? -1 : 0);
  if (inp.hit) {
    a.hitPower = PW; a.aimX = aimDir(inp.x);
    if (m.state === 'serve' && a.i === m.serverIdx) {
      serve(m, a, PW !== undefined ? PW < 0.4 : inp.y < -0.4, inp.x);
    } else if (m.state === 'rally') {
      const sh = m.shuttle;
      const inc = sh.live && !sh.netted && sh.lastTeam !== a.team;
      let rewound = false;
      if (a.assist && inc && a.lag > 0.02 && !inReach(m, a).ok) {
        // online: the player sees the shuttle `lag` s late. If it reached the racket within that window,
        // the press was on time from their point of view: hit it from where it was (favour the player)
        for (const h of m.hist) {
          if (h.t < m.clock - a.lag - 0.04 || h.z * sgn(a.team) < -0.3) continue;
          if (inReachAt(a, h).ok) { sh.p.x = h.x; sh.p.y = h.y; sh.p.z = h.z; a.hitQueue = m.clock - 0.12; a.reachT0 = -1; rewound = true; emit(m, { type: 'swing', i: a.i }); break; }
        }
      }
      if (rewound) { /* resolved by the buffered-hit code below */ }
      // with assist, every press while the shuttle is coming (or already at the racket) goes through the
      // buffered hit, which grades timing the same way the timing meter shows it
      else if (a.assist && inc) { a.hitQueue = m.clock; emit(m, { type: 'swing', i: a.i }); }
      else startSwing(m, a);
    }
  }
  inp.hit = inp.jump = inp.dive = false;
  const s = m.shuttle;
  const incoming = m.state === 'rally' && s.live && !s.netted && s.lastTeam !== a.team;
  // you can always move: a queued hit no longer freezes you (left/right while it is queued also sets the aim)
  let mx = canMove ? wx : 0, mz = canMove ? wz : 0;
  // clearly out: the assists leave it alone (the player can still play it by pressing hit)
  const clearlyOut = !!(s.pred && Math.max(Math.abs(s.pred.x) - m.halfW, Math.abs(s.pred.z) - HALF_L) > 0.3);
  // assist: steer toward where the shuttle comes down when the player isn't moving
  // movement assists are for games vs bots only; online PvP sets opts.moveAssist = false
  const moveAssist = a.assist >= 1 && m.opts.moveAssist !== false;
  if (moveAssist && incoming && s.pred && (!clearlyOut || a.hitQueue > 0) && Math.hypot(mx, mz) < 0.1 && a.diveT < 0) {
    const tx = s.pred.x - sg * 0.25, tz = s.pred.z + sg * 0.35;
    const dx = tx - a.x, dz = tz - a.z, l = Math.hypot(dx, dz);
    if (l > 0.25 && Math.abs(s.pred.z) < HALF_L + 0.6 && Math.abs(s.pred.x) < m.halfW + 0.6) { const k = Math.min(1, l / 0.8) * (a.assist >= 2 ? 1 : 0.85); mx = dx / l * k; mz = dz / l * k; }
  }
  // assist: after our own shot, drift back to the base position when the player isn't steering
  if (moveAssist && m.state === 'rally' && s.live && s.lastTeam === a.team && Math.hypot(mx, mz) < 0.1 && a.diveT < 0) {
    const dx = a.home.x - a.x, dz = a.home.z - a.z, l = Math.hypot(dx, dz);
    if (l > 0.3) { const k = Math.min(1, l / 1.2) * (a.assist >= 2 ? 0.9 : 0.75); mx = dx / l * k; mz = dz / l * k; }
  }
  moveAthlete(m, a, mx, mz, a.st.speed, dt);
  if (m.state === 'serve') keepInServiceBox(m, a);

  // when did the shuttle come into reach? (pressing right as it arrives counts as on time)
  if (incoming && inReach(m, a).ok) { if (a.reachT0 < 0) a.reachT0 = m.clock; } else a.reachT0 = -1;
  // buffered hit: pressed early, fires the moment the shuttle reaches the racket
  if (a.hitQueue > 0) {
    const delay = m.clock - a.hitQueue;
    // the press stays queued for the whole flight; pressing early only costs a bit of quality
    if (!incoming || delay > 2.2) a.hitQueue = 0;
    else {
      const r = inReach(m, a);
      if (r.ok && s.p.z * sg > -0.3) {
        a.hitQueue = 0; a.swingT = 0; a.swingHit = true; a.swingHigh = s.p.y > 1.3;
        const lateBy = a.reachT0 >= 0 ? Math.max(0, m.clock - a.reachT0 - (a.lag || 0)) : 0;   // how long it had been at the racket (minus online lag)
        let q = delay < 0.04 ? (lateBy < 0.2 ? 1 : lateBy < 0.35 ? 0.84 : 0.7) : delay <= 0.38 ? 1 : Math.max(0.6, 1 - (delay - 0.38) * 0.4);
        q *= 1 - Math.max(0, r.dh / r.rH - 0.92) * 1.5;   // only a touch worse at the very edge of your reach
        q = clamp(q, 0.45, 1);
        const pw = a.hitPower;
        const shot = humanShot(m, a, inp.y, pw);
        if (shot === 'smash' && a.jumpY === 0) { a.vy = 4.2; a.jumpY = 0.001; }
        const ax = aimDir(inp.x) || a.aimX || 0;
        doHit(m, a, shot, chooseTarget(m, a, shot, ax, pw), q, shot === 'smash' ? 'smash' : q > 0.9 ? 'perfect' : delay < 0.05 ? 'late' : q > 0.62 ? 'good' : 'early', pw);
        return;
      }
      // shuttle dropping just out of reach: dive for it
      if (s.p.y < 1.1 && s.v.y < 0 && a.diveT < 0 && a.recoverT <= 0 && a.jumpY === 0) {
        const dx = s.p.x - a.x, dz = s.p.z - a.z, dist = Math.hypot(dx, dz);
        if (dist > r.rH && dist < r.rH + 0.9) { a.diveDx = dx / dist; a.diveDz = dz / dist; a.diveT = 0; a.stats.dives++; useStamina(m, a, 0.012); emit(m, { type: 'dive', i: a.i }); }
      }
    }
  }

  // still holding the button when the shuttle arrives: hit with the current charge
  if (incoming && inp.hold && !a.swingHit && !(a.swingT >= 0 && a.swingT <= 0.28) && s.p.z * sg > -0.3) {
    const r = inReach(m, a);
    if (r.ok && s.v.y < 0 && (r.dh < 0.65 || s.p.y < 1.25)) {
      const pw = clamp(inp.holdPower || 0, 0, 1);
      a.swingT = 0; a.swingHit = true; a.swingHigh = s.p.y > 1.3; a.ignoreHit = true;
      const shot = humanShot(m, a, inp.y, pw);
      if (shot === 'smash' && a.jumpY === 0) { a.vy = 4.2; a.jumpY = 0.001; }
      const ax = aimDir(inp.x);
      doHit(m, a, shot, chooseTarget(m, a, shot, ax, pw), 0.88, shot === 'smash' ? 'smash' : 'good', pw);
      return;
    }
  }
  // auto hit: only the 'Dễ' assist (2) plays shots for you
  // auto save is an assist too: only in games vs bots (online sets opts.autoSave = false)
  if (incoming && a.assist >= 2 && m.opts.autoSave !== false && !clearlyOut && !a.swingHit && !(a.swingT >= 0 && a.swingT <= 0.28) && s.p.z * sg > -0.3) {
    const r = inReach(m, a);
    const leaving = s.v.y < 0 && (s.p.y < 0.55 || (a.assist >= 2 && (r.dh < 0.7 || s.p.y < 1.3)));
    if (r.ok && leaving) {
      a.swingT = 0; a.swingHit = true; a.swingHigh = s.p.y > 1.3;
      const q = a.assist >= 2 ? 0.74 : 0.5;
      const pw = a.assist >= 2 ? 0.5 : 0.45;
      const shot = humanShot(m, a, inp.y, pw);
      const ax = inp.x > 0.4 ? 1 : inp.x < -0.4 ? -1 : 0;
      doHit(m, a, shot, chooseTarget(m, a, shot, ax, pw), q, a.assist >= 2 ? 'good' : 'save', pw);
      return;
    }
  }
  const win = a.assist ? 0.3 : 0.24;
  if (incoming && a.swingT >= 0 && a.swingT <= win && !a.swingHit && s.p.z * sg > -0.3) {
    let r = inReach(m, a);
    if (!r.ok && a.lag > 0.01 && m.hist.length) { const h = histAt(m, m.clock - a.lag); if (h && h.z * sg > -0.3) { const r2 = inReachAt(a, h); if (r2.ok) r = r2; } }
    if (r.ok) {
      a.swingHit = true;
      const st = a.swingT, c = a.st.control * tired.control(a);
      const hiW = 0.15 * c * (1 + 0.3 * a.assist);
      const qt = st < 0.035 ? 0.55 + st * 6 : st <= hiW ? 1 : 1 - (st - hiW) * 4.5;
      const qd = 1 - Math.max(0, r.dh / r.rH - 0.45) * 0.6;
      let q = clamp(qt * qd, 0.1, 1);
      if (a.diveT >= 0) q = Math.min(q, 0.7);
      const pw = a.hitPower;
      const shot = humanShot(m, a, inp.y, pw);
      const ax = inp.x > 0.4 ? 1 : inp.x < -0.4 ? -1 : 0;
      const label = shot === 'smash' ? 'smash' : q > 0.9 ? 'perfect' : q > 0.62 ? 'good' : st < 0.035 ? 'late' : 'early';
      doHit(m, a, shot, chooseTarget(m, a, shot, ax, pw), q, label, pw);
    }
  }
}

function serve(m, a, short, aimX) {
  a.swingT = 0; a.swingHigh = false;
  m.state = 'rally'; m.stateT = 0;
  const q = a.ctrl === 'bot' ? clamp(DIFF[a.diff].skill + 0.25, 0, 1) : 0.96;
  doHit(m, a, short ? 'serveShort' : 'serveHigh', serveTarget(m, a, short, aimX), q, null);
}

function tickBot(m, a, dt) {
  const d = DIFF[a.diff], s = m.shuttle, sg = sgn(a.team);
  let mx = 0, mz = 0;
  if (m.state === 'serve') {
    if (a.i === m.serverIdx && m.stateT > 1.1) { serve(m, a, Math.random() < (m.doubles ? 0.7 : 0.45), 0); }
  } else if (m.state === 'rally') {
    const reacting = a.plan && m.clock - a.plan.t0 < a.plan.react;
    if (!reacting) {
      const dx = a.tx - a.x, dz = a.tz - a.z, l = Math.hypot(dx, dz);
      if (l > 0.06) { const k = Math.min(1, l / 0.5); mx = dx / l * k; mz = dz / l * k; }
    }
    if (a.jumpAt > 0 && m.clock >= a.jumpAt && a.jumpY === 0) { a.vy = a.st.jumpVy * tired.jump(a); a.jumpY = 0.001; a.jumpAt = -1; useStamina(m, a, 0.008); }   // bots' routine hops to reach high balls
    if (s.live && !s.netted && s.lastTeam !== a.team && !(a.plan && a.plan.leave) && s.p.z * sg > -0.3) {
      const desperate = a.plan && a.plan.p && a.plan.p.desperate;
      a._extra = desperate && a.diff > 0 ? 0.35 : 0;
      const r = inReach(m, a);
      a._extra = 0;
      if (r.ok && (s.v.y < 0 || r.dh < 0.55 || s.p.y < 1.2)) {
        if (desperate && r.dh > 0.9 && a.diveT < 0) { a.diveT = 0.2; a.diveDx = 0; a.diveDz = 0; a.stats.dives++; }
        a.swingT = 0; a.swingHigh = s.p.y > 1.3;
        const shot = botChooseShot(m, a);
        let q = clamp(d.skill + randn() * 0.14 - (desperate ? 0.2 : 0), 0.15, 1);
        // a bot playing alongside a human is a dependable partner: far fewer unforced errors, steadier hands
        const partner = m.athletes.some((o) => o.team === a.team && o.ctrl === 'human');
        if (partner) q = clamp(q + 0.06, 0.15, 1);
        if (Math.random() < d.miss * (desperate ? 2.5 : 1) * (m.serveShot ? 0.3 : 1) * (partner ? 0.35 : m.doubles ? 1.9 : 1)) { q = 0.12; a._blunder = true; }
        doHit(m, a, shot, chooseTarget(m, a, shot, 0), q, shot === 'smash' ? 'smash' : null);
      }
    }
  }
  if (a.input.emote) { a.emote = a.input.emote; a.emoteT = 2.4; emit(m, { type: 'emote', i: a.i, e: a.input.emote }); a.input.emote = 0; }
  moveAthlete(m, a, mx, mz, d.speed * (a.st.speed / 5.06), dt);
}

// ------------------------------------------------------------------ shuttle + rules
function tickShuttle(m, dt) {
  const s = m.shuttle;
  if (s.held) { holdShuttle(m); return; }
  if (!s.live && s.landed) return;
  const px = s.p.x, py = s.p.y, pz = s.p.z;
  stepShuttle(s.p, s.v, dt, s.netted ? null : m.wind);
  const cross = !s.netted ? netCrossing(px, py, pz, s.p) : null;
  const crossing = cross && Math.abs(cross.x) < DBL_W + 0.1 && cross.y < NET_H;
  if (crossing && cross.y > NET_H - 0.07 && Math.random() < 0.6) {
    // clipped the net tape but still rolls over: legal, and it dies just past the net
    m.hist.length = 0;
    s.p.x = cross.x; s.p.z = -Math.sign(pz) * 0.01;
    s.p.y = NET_H + 0.01;
    s.v.x *= 0.5; s.v.z *= 0.25; s.v.y = Math.max(0.5, Math.abs(s.v.y) * 0.3);
    emit(m, { type: 'netcord' });
    const r = simLand(s.p, s.v, m.wind, true);
    s.pred = { x: r.x, z: r.z, t: r.t, inside: Math.abs(r.x) <= m.halfW + 0.02 && Math.abs(r.z) <= HALF_L + 0.02 };
    planTeam(m, 1 - s.lastTeam, r, s.pred.inside);
  } else if (crossing) {
    m.hist.length = 0;
    s.p.x = cross.x; s.p.y = cross.y;
    s.netted = true;
    s.p.z = Math.sign(pz) * 0.04;
    s.v.x *= 0.1; s.v.z = -Math.sign(s.v.z) * 0.4; s.v.y = Math.min(0, s.v.y) * 0.2;
    emit(m, { type: 'net' });
  }
  m.hist.push({ t: m.clock, x: s.p.x, y: s.p.y, z: s.p.z });
  if (m.hist.length > 48) m.hist.shift();
  if (s.p.y <= 0) {
    s.p.y = 0; s.live = false; s.landed = true;
    const inside = Math.abs(s.p.x) <= m.halfW + 0.02 && Math.abs(s.p.z) <= HALF_L + 0.02;
    emit(m, { type: 'land', x: s.p.x, z: s.p.z, inside });
    if (m.state === 'rally') judge(m, inside);
  }
}

// a serve must land in the receiver's diagonal service court
function serveFault(m, x, z, serverTeam) {
  const R = 1 - serverTeam, right = m.score[serverTeam] % 2 === 0;
  const sx = courtX(R, right), sz = sgn(R), e = 0.02;
  const W = m.doubles ? DBL_W : HALF_W, back = m.doubles ? HALF_L - LONG_SERVE : HALF_L;
  const depth = z * sz, side = x * sx;
  if (depth < SHORT_LINE - e) return 'Giao ngắn';
  if (side < -e) return 'Giao sai ô';
  if (depth > back + e) return 'Giao dài';
  if (Math.abs(x) > W + e) return 'Giao ra ngoài';
  return null;
}

function judge(m, inside) {
  const s = m.shuttle, lt = s.lastTeam;
  let winner, why;
  if (s.netted) { winner = 1 - lt; why = 'Chạm lưới'; }
  else if (!inside) { winner = 1 - lt; why = 'Ra ngoài!'; }
  else if (m.serveShot && Math.sign(s.p.z) !== sgn(lt) && serveFault(m, s.p.x, s.p.z, lt)) { winner = 1 - lt; why = serveFault(m, s.p.x, s.p.z, lt); }
  else { winner = s.p.z > 0 ? 1 : 0; why = 'winner'; }
  const hitter = m.athletes[s.last];
  if (hitter) { if (winner === hitter.team) hitter.stats.winners++; else hitter.stats.errors++; if (hitter._diveHit && winner === hitter.team) hitter.stats.diveSaves++; }
  for (const a of m.athletes) a._diveHit = false;
  awardPoint(m, winner, why);
}

// the two ends of the court are mirror images except for the wind, so changing ends = turning the wind around
function changeEnds(m) { m.windBase += Math.PI; m.wind.x = -m.wind.x; m.wind.z = -m.wind.z; emit(m, { type: 'ends' }); }

function awardPoint(m, winner, why) {
  m.state = 'point'; m.stateT = 0;
  restAll(m, 0.014);  // brief point rest; cannot refund a typical rally
  const wasServing = m.serverTeam === winner;
  m.score[winner]++;
  m.longest = Math.max(m.longest, m.rally);
  m.pointsLog.push(winner);
  if (wasServing && m.doubles) { const t = m.right[winner]; m.right[winner] = m.left[winner]; m.left[winner] = t; }
  m.serverTeam = winner;
  for (const a of m.athletes) a.mood = a.team === winner ? 1 : -1;
  const P = m.opts.points, cap = P === 11 ? 15 : 30;
  const won = (a, b) => (a >= P && a - b >= 2) || a >= cap;
  const over = won(m.score[0], m.score[1]) || won(m.score[1], m.score[0]);
  const hi = Math.max(...m.score), lo = Math.min(...m.score);
  const gamePoint = !over && hi > lo && (hi >= P - 1 || hi === cap - 1) ? (m.score[0] > m.score[1] ? 0 : 1) : -1;
  // match point = game point in the deciding game (or the only game)
  const matchPoint = gamePoint >= 0 && m.games[gamePoint] + 1 >= m.gamesToWin;
  emit(m, { type: 'point', team: winner, why, rally: m.rally, score: m.score.slice(), gamePoint, matchPoint, games: m.games.slice() });
  // interval when the leader reaches 11 (6 in 11-point games); in the deciding game the players also change ends
  const mid = P === 21 ? 11 : 6;
  if (!over && !m.intervalDone && hi === mid) {
    m.intervalDone = true;
    m.stateT = -2.2;   // a longer pause before the next serve
    restAll(m, 0.12);
    const deciding = m.games[0] === m.gamesToWin - 1 && m.games[1] === m.gamesToWin - 1;
    if (deciding) changeEnds(m);
    emit(m, { type: 'interval', ends: deciding });
  }
  if (over) {
    m.games[winner]++;
    m.gameScores.push(m.score.slice());
    if (m.games[winner] >= m.gamesToWin) { m.state = 'overPending'; m.winner = winner; }
    else { m.state = 'gameBreak'; m.stateT = 0; emit(m, { type: 'game', team: winner, games: m.games.slice(), score: m.score.slice(), gameNo: m.gameNo }); }
  }
}

function step(m, dt) {
  dt = dt || DT;
  if (m.state === 'over') return;
  if (m.hitStop > 0) { m.hitStop -= dt; return; }
  m.clock += dt; m.stateT += dt;
  for (const a of m.athletes) {
    if (a.ctrl === 'bot') tickBot(m, a, dt); else tickHuman(m, a, dt);
  }
  tickShuttle(m, dt);
  // serve clock
  if (m.state === 'serve') {
    const srv = m.athletes[m.serverIdx];
    if (srv.ctrl !== 'bot' && m.stateT > SERVE_CLOCK) serve(m, srv, false, 0);
  }
  if (m.state === 'point' && m.stateT > 1.8) startServe(m);
  if (m.state === 'gameBreak' && m.stateT > 3.2) { m.score = [0, 0]; m.gameNo++; m.intervalDone = false; restAll(m, 0.28); changeEnds(m); startServe(m); emit(m, { type: 'gameStart', gameNo: m.gameNo }); }
  if (m.state === 'overPending' && m.stateT > 2.0) { m.state = 'over'; emit(m, { type: 'over', winner: m.winner, score: m.score.slice(), games: m.games.slice(), gameScores: m.gameScores.slice() }); }
}

// ------------------------------------------------------------------ network snapshot
const r2 = (v) => Math.round(v * 100) / 100;
function snapshot(m) {
  const s = m.shuttle;
  return {
    c: r2(m.clock), st: m.state, sT: r2(m.stateT), sc: m.score, g: m.games, srv: m.serverIdx, rcv: m.receiverIdx, w: [r2(m.wind.x), r2(m.wind.z)],
    sh: [r2(s.p.x), r2(s.p.y), r2(s.p.z), r2(s.v.x), r2(s.v.y), r2(s.v.z), (s.live ? 1 : 0) | (s.held ? 2 : 0) | (s.netted ? 4 : 0) | (s.landed ? 8 : 0), s.last, s.lastTeam],
    pr: s.pred ? [r2(s.pred.x), r2(s.pred.z), s.pred.inside ? 1 : 0] : null,
    a: m.athletes.map((a) => [r2(a.x), r2(a.z), r2(a.jumpY), r2(a.vx), r2(a.vz), r2(a.swingT), a.swingHigh ? 1 : 0, r2(a.diveT), r2(a.recoverT), r2(a.diveDx), r2(a.diveDz), a.mood, a.emote, r2(a.splitT), r2(a.sta)]),
  };
}
function applyAthleteSnap(a, v) {
  a.x = v[0]; a.z = v[1]; a.jumpY = v[2]; a.vx = v[3]; a.vz = v[4]; a.swingT = v[5]; a.swingHigh = !!v[6];
  a.diveT = v[7]; a.recoverT = v[8]; a.diveDx = v[9]; a.diveDz = v[10]; a.mood = v[11]; a.emote = v[12]; a.splitT = v[13]; if (v[14] !== undefined) a.sta = v[14];
}

return {
  DT, G, DRAG, NET_H, HALF_L, HALF_W, DBL_W, SHORT_LINE, LONG_SERVE, SERVE_CLOCK,
  CHARS, DIFF, VENUES, SHOTS, charStats, fatigue,
  stepShuttle, simLand, solveShot, inReachAt, sgn,
  createMatch, step, snapshot, applyAthleteSnap,
  clamp, lerp, damp, rand, randn,
};
});
