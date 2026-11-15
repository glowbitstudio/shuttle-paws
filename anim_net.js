/* Shuttle Paws v2 move pack: NET / front court (see docs/MOVES.md, C5). Registered into SPAnim.
   Every clip: ready (mid-court) -> approach steps -> lunge with the racket foot -> stroke -> push back -> ready.
   Poses are generated: court-space feet stay planted while the body travels (world: 1, px/pz/ry). */
(function () {
'use strict';
if (!window.SPAnim) return;

// ---- arm poses (fitted so the racket head reaches the right spot; right-handed, mirrored automatically)
const arms = {
  net_fhPrep:    { s: [-0.74, 0.24], e: [-1.5, 0.5], w: -0.1 },     // racket up and slightly back, in front
  net_fhReach:   { s: [-1.53, 0.24], e: [-0.17, 0.08], w: -0.19 },  // arm out at net height, face up
  net_fhSpinLo:  { s: [-1.09, 0.27], e: [-0.61, 0.2], w: -0.07 },   // racket under the cork
  net_fhSpin:    { s: [-1.45, 0.3], e: [-0.3, 0.12], w: -0.6, r: 0.7 },     // wrist rolls/brushes up
  net_fhCross:   { s: [-1.34, 0.42], e: [-0.69, -0.5], w: 0.09, r: 0.5 },   // face angled across court
  net_fhKillCock:{ s: [-2.51, 0.24], e: [-0.4, -0.12], w: 0.07 },   // racket up above the tape
  net_fhKillHit: { s: [-2.18, 0.16], e: [-0.03, -0.15], w: 0.09 },  // short jab forward/down
  net_fhKillFoll:{ s: [-1.6, 0.1], e: [-0.3, -0.1], w: 0.45 },
  net_fhBrushA:  { s: [-2.18, 0.5], e: [0.05, 0.08], w: 0.1 },      // racket out to the side at tape height
  net_fhBrushB:  { s: [-1.85, 0.3], e: [-0.35, -0.32], w: 0.32, r: 0.4 },   // sweeps across the top of the tape
  net_fhLiftPrep:{ s: [-0.84, 0.4], e: [-0.07, 0.08], w: -0.56 },   // racket low in front
  net_fhLiftHit: { s: [-1.1, 0.35], e: [-0.05, 0.05], w: -0.25 },
  net_fhLiftFoll:{ s: [-2.14, 0.13], e: [-0.02, -0.16], w: -0.6 },  // finishes high
  net_fhLiftX:   { s: [-2.1, -0.25], e: [-0.1, -0.2], w: -0.5 },    // cross lift finishes across the body
  net_fhPush:    { s: [-1.71, 0.24], e: [-0.06, -0.02], w: 0.04 },  // flat push forward
  net_bhPrep:    { s: [-1.14, -0.78], e: [-0.13, -0.32], w: -1.07 },// racket across the body, cocked
  net_bhReach:   { s: [-1.5, -0.8], e: [-0.09, 0.22], w: -0.31 },
  net_bhSpinLo:  { s: [-1.4, -0.79], e: [-0.1, 0.22], w: -0.28 },
  net_bhSpin:    { s: [-1.55, -0.75], e: [-0.12, 0.2], w: 0.25, r: -0.7 },
  net_bhCross:   { s: [-1.32, -0.69], e: [-0.5, 0.5], w: -0.14, r: -0.5 },
  net_bhKillCock:{ s: [-2.56, -0.8], e: [0.03, 0.47], w: -0.24 },
  net_bhKillHit: { s: [-1.98, -0.57], e: [-0.09, 0.23], w: -0.04 },
  net_bhKillFoll:{ s: [-1.6, -0.45], e: [-0.25, 0.2], w: 0.35 },
  net_bhBrushA:  { s: [-2.25, -0.78], e: [0.03, 0.14], w: 0.12 },
  net_bhBrushB:  { s: [-1.99, -0.56], e: [-0.17, 0.39], w: 0.29, r: -0.4 },
  net_bhLiftPrep:{ s: [-1.0, -0.6], e: [0.02, 0.04], w: -0.45 },
  net_bhLiftHit: { s: [-1.25, -0.6], e: [-0.05, 0.1], w: -0.1 },
  net_bhLiftFoll:{ s: [-2.15, -0.57], e: [-0.14, 0.19], w: -0.4 },
  net_bhLiftX:   { s: [-2.1, -0.1], e: [-0.1, 0.25], w: -0.3 },
  net_bhPush:    { s: [-1.75, -0.59], e: [-0.03, 0.16], w: 0.05 },
};
const free = {
  net_balance: { s: [0.55, 0.7], e: [-0.3, 0], w: 0 },   // other arm reaches back for balance in the lunge
  net_guard:   { s: [-0.7, 0.55], e: [-1.1, 0], w: 0 },   // other arm up in front while approaching
};

// ---- court geometry helpers (racket frame: x + = toward the racket side, z + = toward the net)
const STAND = { R: [0.16, 0.04], L: [-0.16, -0.02] };
// a local foot offset (lx toward the racket side, lz forward) -> court position for a body at (px, pz) turned ry
function foot(px, pz, ry, lx, lz) {
  const fx = Math.sin(ry), fz = Math.cos(ry), rx = Math.cos(ry), rz = -Math.sin(ry);
  return [px + rx * lx + fx * lz, pz + rz * lx + fz * lz];
}
const ff = (p, lift, yaw) => [p[0], p[1], lift || 0, yaw || 0];
const half = (a, c) => [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
// arm poses were fitted standing upright; when the body leans forward by `lean` rad the whole arm tips down
// with it, so lift the shoulder by the same amount (the shoulder's swing axis is parallel to the lean axis)
function comp(name, lean) {
  const a = arms[name]; if (!a || !lean) return name;
  const key = name + '_c' + Math.round(lean * 100);
  if (!arms[key]) arms[key] = { s: [a.s[0] - lean, a.s[1]], e: a.e.slice(), w: a.w };
  return key;
}

// Build a net clip.
//  side 'FH' | 'BH';  steps: approach step count;  arm: { prep, hit, foll } arm names
//  kill: hop into a jab;  hold: pause at contact (deception) before the flick
function netClip(o) {
  const bh = o.side === 'BH', poses = {}, keys = [];
  const end = bh ? [-0.42, 0.62] : [0.42, 0.62];                 // body position at the lunge
  const ryEnd = bh ? -0.55 : 0.35;                               // facing toward the corner
  const n = o.steps || 2, id = o.id;
  let fR = STAND.R.slice(), fL = STAND.L.slice();
  let t = 0;
  const put = (name, tt, pose, ease) => { poses[id + '_' + name] = Object.assign({ world: 1 }, pose); keys.push([+tt.toFixed(3), id + '_' + name, ease]); };
  const body = (k) => ({ px: end[0] * k, pz: end[1] * k, ry: ryEnd * Math.min(1, k * 1.4) });
  const readyArms = { arm: 'ready', free: { s: [-0.9, 0.5], e: [-1.0, 0], w: 0 } };
  put('a0', 0, Object.assign({ y: -0.06, pitch: 0.18, cp: 0.08, head: [-0.1, 0], fR: ff(fR, 0, 0.25), fL: ff(fL, 0, -0.2) }, readyArms));
  // split step
  t = 0.1;
  put('a1', t, { y: -0.12, pitch: 0.24, fR: ff(fR, 0, 0.3), fL: ff(fL, 0, -0.25), arm: 'ready', free: 'net_guard', head: [-0.12, 0] }, 'out');
  // approach steps: alternate feet; the planted foot keeps its court spot. The last approach step is the
  // other foot, so the lunge lands on the racket foot.
  const stepT = 0.13;
  for (let i = 1; i <= n; i++) {
    const k = i / (n + 1), b = body(k), moveR = (n - i) % 2 === 1;
    const target = moveR ? foot(b.px, b.pz, b.ry, 0.12, 0.08) : foot(b.px, b.pz, b.ry, -0.12, 0.02);
    const mid = body(k - 0.5 / (n + 1));
    put('m' + i, t + stepT * 0.5, Object.assign({}, mid, { y: -0.08, pitch: 0.28, arm: o.arm.prep, free: 'net_guard', head: [-0.15, 0],
      fR: moveR ? ff(half(fR, target), 0.06, 0.3) : ff(fR, 0, 0.3), fL: moveR ? ff(fL, 0, 0) : ff(half(fL, target), 0.06, 0) }));
    if (moveR) fR = target; else fL = target;
    t += stepT;
    put('s' + i, t, Object.assign({}, b, { y: -0.1, pitch: 0.3, arm: o.arm.prep, free: 'net_guard', head: [-0.15, 0], fR: ff(fR, 0, 0.3), fL: ff(fL, 0, 0) }));
  }
  // lunge: racket foot far forward, back leg extended, chest over the knee
  const bL = body(1);
  const lungeR = foot(bL.px, bL.pz, bL.ry, 0.08, 0.17), lungeL = fL;   // back foot stays planted
  const tPrep = t + 0.07, tc = t + 0.15;
  // The dedicated FH lunge sinks into the supporting knee; ordinary net strokes keep their stance.
  const deep = id === 'net_lungeFH';
  const lean = { y: o.kill ? -0.04 : deep ? -0.23 : -0.15, pitch: o.kill ? 0.18 : deep ? 0.55 : 0.38, cp: o.kill ? 0.0 : 0.14, cy: bh ? -0.25 : 0.1 };
  const L = lean.pitch + lean.cp, Lp = 0.6 * L;
  put('lp', tPrep, Object.assign({}, body(0.93), lean, { y: deep ? -0.18 : -0.1, arm: comp(o.arm.prep, Lp), free: 'net_guard', head: [-0.18, 0], fR: ff(half(fR, lungeR), o.kill ? 0.09 : 0.07, 0.2), fL: ff(fL, 0, 0) }), 'out');
  const hit = Object.assign({}, bL, lean, { jump: o.kill ? 0.12 : 0, arm: comp(o.arm.hit, L), free: 'net_balance', head: o.kill ? [-0.05, 0] : [-0.25, 0],
    fR: ff(lungeR, o.kill ? 0.05 : 0, 0.15), fL: ff(lungeL, o.kill ? 0.04 : 0, bh ? -0.6 : -0.5) });
  put('hit', tc, hit, o.kill ? 'whip' : 'out');
  let te = tc;
  if (o.hold) { te = tc + 0.18; put('hold', te, Object.assign({}, hit)); }          // freeze: looks like a net shot...
  const fol = Object.assign({}, hit, { y: o.kill ? -0.12 : deep ? -0.24 : -0.17, jump: 0, arm: comp(o.arm.foll, L), fR: ff(lungeR, 0, 0.15), fL: ff(lungeL, 0, bh ? -0.6 : -0.5) });
  put('fo', te + (o.hold ? 0.08 : 0.11), fol, o.hold ? 'whip' : 'out');               // ...then the flick / follow-through
  put('st', te + 0.24, Object.assign({}, fol, { y: deep ? -0.23 : -0.16 }));
  // push back off the front foot and recover to the middle with two steps
  const b1 = body(0.55), b2 = body(0.15);
  const r1R = foot(b1.px, b1.pz, b1.ry * 0.6, 0.14, 0.04);
  put('r1', te + 0.42, Object.assign({}, b1, { ry: b1.ry * 0.6, y: -0.09, pitch: 0.22, arm: 'ready', free: 'net_guard', head: [-0.12, 0], fR: ff(r1R, 0, 0.25), fL: ff(lungeL, 0, 0) }), 'io');
  const r2L = foot(b2.px, b2.pz, 0, -0.16, -0.02);
  put('r2', te + 0.58, Object.assign({}, b2, readyArms, { ry: 0, y: -0.08, pitch: 0.2, head: [-0.1, 0], fR: ff(r1R, 0.05, 0.25), fL: ff(r2L, 0, -0.2) }), 'io');
  put('r3', te + 0.78, Object.assign({ px: 0, pz: 0, ry: 0, y: -0.06, pitch: 0.18, cp: 0.08, head: [-0.1, 0], fR: ff(STAND.R, 0, 0.25), fL: ff(STAND.L, 0, -0.2) }, readyArms), 'io');
  return { poses, clip: { loop: false, label: o.label, group: 'Lưới', contact: +tc.toFixed(3), keys } };
}

const DEF = [
  { id: 'net_lungeFH', side: 'FH', steps: 3, label: 'Lên lưới · lunge thuận tay', arm: { prep: 'net_fhPrep', hit: 'net_fhReach', foll: 'net_fhReach' } },
  { id: 'net_lungeBH', side: 'BH', steps: 3, label: 'Lên lưới · lunge trái tay', arm: { prep: 'net_bhPrep', hit: 'net_bhReach', foll: 'net_bhReach' } },
  { id: 'net_shotFH', side: 'FH', label: 'Bỏ lưới · thuận tay', arm: { prep: 'net_fhPrep', hit: 'net_fhReach', foll: 'net_fhReach' } },
  { id: 'net_shotBH', side: 'BH', label: 'Bỏ lưới · trái tay', arm: { prep: 'net_bhPrep', hit: 'net_bhReach', foll: 'net_bhReach' } },
  { id: 'net_spinFH', side: 'FH', label: 'Bỏ lưới xoáy · thuận tay', arm: { prep: 'net_fhSpinLo', hit: 'net_fhSpin', foll: 'net_fhReach' } },
  { id: 'net_spinBH', side: 'BH', label: 'Bỏ lưới xoáy · trái tay', arm: { prep: 'net_bhSpinLo', hit: 'net_bhSpin', foll: 'net_bhReach' } },
  { id: 'net_crossFH', side: 'FH', label: 'Bỏ lưới chéo · thuận tay', arm: { prep: 'net_fhPrep', hit: 'net_fhCross', foll: 'net_fhCross' } },
  { id: 'net_crossBH', side: 'BH', label: 'Bỏ lưới chéo · trái tay', arm: { prep: 'net_bhPrep', hit: 'net_bhCross', foll: 'net_bhCross' } },
  { id: 'net_killFH', side: 'FH', kill: true, label: 'Chụp lưới · thuận tay', arm: { prep: 'net_fhKillCock', hit: 'net_fhKillHit', foll: 'net_fhKillFoll' } },
  { id: 'net_killBH', side: 'BH', kill: true, label: 'Chụp lưới · trái tay', arm: { prep: 'net_bhKillCock', hit: 'net_bhKillHit', foll: 'net_bhKillFoll' } },
  { id: 'net_brushFH', side: 'FH', label: 'Gạt mép lưới · thuận tay', arm: { prep: 'net_fhBrushA', hit: 'net_fhBrushB', foll: 'net_fhBrushB' } },
  { id: 'net_brushBH', side: 'BH', label: 'Gạt mép lưới · trái tay', arm: { prep: 'net_bhBrushA', hit: 'net_bhBrushB', foll: 'net_bhBrushB' } },
  { id: 'net_liftFH', side: 'FH', label: 'Lốp lưới thẳng · thuận tay', arm: { prep: 'net_fhLiftPrep', hit: 'net_fhLiftHit', foll: 'net_fhLiftFoll' } },
  { id: 'net_liftBH', side: 'BH', label: 'Lốp lưới thẳng · trái tay', arm: { prep: 'net_bhLiftPrep', hit: 'net_bhLiftHit', foll: 'net_bhLiftFoll' } },
  { id: 'net_liftXFH', side: 'FH', label: 'Lốp lưới chéo · thuận tay', arm: { prep: 'net_fhLiftPrep', hit: 'net_fhLiftHit', foll: 'net_fhLiftX' } },
  { id: 'net_liftXBH', side: 'BH', label: 'Lốp lưới chéo · trái tay', arm: { prep: 'net_bhLiftPrep', hit: 'net_bhLiftHit', foll: 'net_bhLiftX' } },
  { id: 'net_pushFH', side: 'FH', label: 'Đẩy lưới · thuận tay', arm: { prep: 'net_fhPrep', hit: 'net_fhPush', foll: 'net_fhPush' } },
  { id: 'net_pushBH', side: 'BH', label: 'Đẩy lưới · trái tay', arm: { prep: 'net_bhPrep', hit: 'net_bhPush', foll: 'net_bhPush' } },
  { id: 'net_flickFH', side: 'FH', hold: true, label: 'Giữ vợt rồi hất (lừa) · thuận tay', arm: { prep: 'net_fhPrep', hit: 'net_fhReach', foll: 'net_fhLiftFoll' } },
];

const poses = {}, clips = {};
for (const d of DEF) { const r = netClip(d); Object.assign(poses, r.poses); clips[d.id] = r.clip; }
SPAnim.register({ poses, arms, free, clips });
})();
