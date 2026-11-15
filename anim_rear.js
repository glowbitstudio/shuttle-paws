/* Shuttle Paws v2 move pack: rear court (docs/MOVES.md C1, C2). Registered into SPAnim. */
(function () {
'use strict';
if (!window.SPAnim) return;
const M = (base, over) => Object.assign({}, base, over);
const FREE_BAL = { s: [-0.6, 0.6], e: [-1.3, 0], w: 0 };        // free arm pulled down/in for balance after the hit
const FREE_READY = { s: [-0.9, 0.5], e: [-1.0, 0], w: 0 };

// ---------------- forehand overhead (side-on, left shoulder to the net for a right-hander)
const SIDE = { y: -0.06, yaw: 0.9, pitch: 0.02, cy: 0.25, cp: -0.1, fR: [0.14, -0.2, 0, 0.9], fL: [0.12, 0.14, 0, 0.5], arm: 'ohPrep', free: 'rear_point', head: [-0.45, -0.5] };
const DROP = M(SIDE, { y: -0.12, yaw: 0.95, pitch: -0.06, cy: 0.38, cp: -0.24, cr: 0.12, arm: 'cockHi', head: [-0.55, -0.55] });
const HIT = { y: -0.02, yaw: -0.15, pitch: 0.1, cy: -0.3, cp: 0.08, cr: -0.08, fR: [0.14, -0.16, 0.04, 0.6], fL: [0.12, 0.14, 0, 0.4], arm: 'hitHi', free: FREE_BAL, head: [-0.4, 0] };
const FOLL = { y: -0.08, yaw: -0.5, pitch: 0.35, cy: -0.35, cp: 0.25, cr: -0.1, fR: [0.16, 0.0, 0.05, 0.3], fL: [0.13, 0.16, 0, 0.2], arm: 'follHi', free: { s: [-0.3, 0.7], e: [-1.5, 0], w: 0 }, head: [-0.05, 0.1] };
const RECOV = { y: -0.1, pitch: 0.25, fR: [0.2, 0.16, 0, 0.3], fL: [0.2, -0.04, 0, -0.2], arm: 'ready', free: FREE_READY, head: [-0.12, 0] };

const poses = {
  rear_side: SIDE, rear_drop: DROP, rear_recov: RECOV,
  // smashes: full body whip, weight onto the front foot, deep forward bend
  rear_smHit: M(HIT, { pitch: 0.2, cp: 0.2 }),
  rear_smFoll: M(FOLL, { pitch: 0.42, cp: 0.25, y: -0.12 }),
  rear_halfHit: M(HIT, { pitch: 0.12, cp: 0.08, cy: -0.22 }),
  rear_halfFoll: M(FOLL, { pitch: 0.32, cp: 0.18 }),
  rear_crossHit: M(HIT, { yaw: -0.35, cy: -0.6, pitch: 0.18, cp: 0.15 }),
  rear_crossFoll: M(FOLL, { yaw: -0.75, cy: -0.6, pitch: 0.45, arm: 'rear_follCross' }),
  rear_strHit: M(HIT, { yaw: -0.05, cy: -0.2, pitch: 0.2, cp: 0.18 }),
  rear_strFoll: M(FOLL, { yaw: -0.25, cy: -0.2, pitch: 0.45, cp: 0.3, arm: 'rear_follStraight' }),
  // clears: upright contact, body opens less, shorter follow-through
  rear_clHit: M(HIT, { pitch: -0.08, cp: -0.06, cy: -0.25 }),
  rear_clFoll: M(FOLL, { pitch: 0.15, cp: 0.05, y: -0.06, arm: 'rear_follClear' }),
  rear_acHit: M(HIT, { pitch: 0.04, cp: 0.02, cy: -0.3 }),
  rear_acFoll: M(FOLL, { pitch: 0.25, cp: 0.12, arm: 'rear_follClear' }),
  // drops: same preparation (disguise), soft checked contact
  rear_dpHit: M(HIT, { pitch: 0.08, cp: 0.05, cy: -0.18, arm: 'rear_dropHit' }),
  rear_dpFoll: M(FOLL, { yaw: -0.25, pitch: 0.22, cp: 0.12, cy: -0.15, arm: 'rear_dropFoll' }),
  rear_slHit: M(HIT, { pitch: 0.1, cp: 0.06, cy: -0.35, cr: -0.15, arm: 'rear_slice' }),
  rear_slFoll: M(FOLL, { yaw: -0.55, pitch: 0.28, cy: -0.45, arm: 'rear_sliceFoll' }),
  rear_rsHit: M(HIT, { pitch: 0.08, cp: 0.05, cy: -0.1, cr: 0.08, arm: 'rear_revSlice' }),
  rear_rsFoll: M(FOLL, { yaw: -0.05, pitch: 0.2, cy: 0.1, cr: 0.1, arm: 'rear_revSliceFoll' }),

  // ---------------- round-the-head (backhand rear corner, taken above the other shoulder)
  rear_rhSide: M(SIDE, { yaw: 0.85, head: [-0.5, 0.25] }),
  rear_rhDrop: M(DROP, { yaw: 0.85, cr: 0.15, arm: 'rhCock', head: [-0.6, 0.3] }),
  rear_rhHit: { y: -0.02, yaw: 0.2, pitch: 0.05, cy: -0.3, cp: 0.0, cr: -0.3, fR: [0.14, -0.18, 0.04, 0.6], fL: [0.12, 0.14, 0, 0.4], arm: 'rhHit', free: { s: [-0.2, 0.3], e: [-0.6, 0], w: 0 }, head: [-0.45, 0.3] },
  rear_rhSmHit: { y: -0.02, yaw: 0.1, pitch: 0.08, cy: -0.4, cp: 0.06, cr: -0.3, fR: [0.14, -0.18, 0.04, 0.6], fL: [0.12, 0.14, 0, 0.4], arm: 'rhHit', free: { s: [-0.2, 0.3], e: [-0.6, 0], w: 0 }, head: [-0.4, 0.3] },
  rear_rhDpHit: { y: -0.02, yaw: 0.25, pitch: 0.02, cy: -0.2, cr: -0.28, fR: [0.14, -0.18, 0.04, 0.6], fL: [0.12, 0.14, 0, 0.4], arm: 'rear_rhDrop', free: { s: [-0.2, 0.3], e: [-0.6, 0], w: 0 }, head: [-0.45, 0.3] },
  rear_rhFoll: M(FOLL, { yaw: -0.2, cr: -0.25, pitch: 0.3 }),
  rear_rhSmFoll: M(FOLL, { yaw: -0.3, cr: -0.25, pitch: 0.42, cp: 0.25, y: -0.12 }),
  rear_rhDpFoll: M(FOLL, { yaw: 0.0, cr: -0.2, pitch: 0.2, cp: 0.1, arm: 'rear_dropFoll' }),

  // ---------------- backhand overhead (back to the net)
  rear_bhTurn: { y: -0.08, yaw: -1.35, pitch: 0.1, cy: -0.3, cp: 0.05, fR: [0.06, -0.14, 0, -1.2], fL: [0.2, 0.08, 0, -0.9], arm: 'bhHiCock', free: { s: [-0.3, 0.3], e: [-0.6, 0], w: 0 }, head: [-0.4, 0.95] },
  rear_bhLoad: { y: -0.15, yaw: -1.5, pitch: 0.16, cy: -0.42, cp: 0.12, fR: [0.04, -0.18, 0, -1.3], fL: [0.22, 0.1, 0, -1.0], arm: 'bhHiCock', free: { s: [-0.2, 0.25], e: [-0.5, 0], w: 0 }, head: [-0.5, 1.0] },
  rear_bhClHit: { y: -0.02, yaw: -1.2, pitch: 0.02, cy: 0.3, cp: -0.12, fR: [0.05, -0.14, 0.03, -1.2], fL: [0.22, 0.1, 0, -0.9], arm: 'bhHiHit', free: { s: [-0.1, 0.4], e: [-0.4, 0], w: 0 }, head: [-0.5, 0.9] },
  rear_bhClFoll: { y: -0.06, yaw: -1.05, pitch: 0.06, cy: 0.4, fR: [0.06, -0.12, 0, -1.1], fL: [0.22, 0.1, 0, -0.9], arm: 'bhHiFoll', free: { s: [-0.2, 0.5], e: [-0.6, 0], w: 0 }, head: [-0.3, 0.7] },
  rear_bhDpHit: { y: -0.04, yaw: -1.3, pitch: 0.08, cy: 0.12, cp: -0.05, fR: [0.05, -0.15, 0.02, -1.2], fL: [0.22, 0.1, 0, -0.9], arm: 'rear_bhDrop', free: { s: [-0.1, 0.4], e: [-0.4, 0], w: 0 }, head: [-0.45, 0.9] },
  rear_bhDpFoll: { y: -0.07, yaw: -1.2, pitch: 0.1, cy: 0.18, fR: [0.06, -0.14, 0, -1.15], fL: [0.22, 0.1, 0, -0.9], arm: 'rear_bhDropFoll', free: { s: [-0.2, 0.45], e: [-0.6, 0], w: 0 }, head: [-0.3, 0.75] },
  rear_bhBack: { y: -0.08, yaw: -0.5, pitch: 0.15, fR: [0.12, 0.0, 0, -0.4], fL: [0.2, 0.06, 0, -0.4], arm: 'ready', free: FREE_READY, head: [-0.2, 0.3] },

  // ---------------- late: shuttle already behind the body (lean back, wrist flick, lift only)
  rear_ltFhReach: { y: -0.12, yaw: 0.6, pitch: -0.25, cy: 0.35, cp: -0.28, cr: 0.15, fR: [0.18, -0.34, 0, 0.8], fL: [0.12, 0.12, 0, 0.4], arm: 'rear_lateCock', free: { s: [-1.4, 0.7], e: [-0.4, 0], w: 0 }, head: [-0.5, -0.9] },
  rear_ltFhHit: { y: -0.14, yaw: 0.55, pitch: -0.3, cy: 0.3, cp: -0.3, cr: 0.15, fR: [0.18, -0.36, 0, 0.8], fL: [0.12, 0.12, 0.03, 0.4], arm: 'rear_lateHit', free: { s: [-1.4, 0.7], e: [-0.4, 0], w: 0 }, head: [-0.55, -0.85] },
  rear_ltFhFoll: { y: -0.1, yaw: 0.3, pitch: -0.1, cy: 0.1, cp: -0.1, fR: [0.18, -0.3, 0, 0.6], fL: [0.12, 0.1, 0, 0.3], arm: 'rear_lateFoll', free: { s: [-1.0, 0.6], e: [-0.8, 0], w: 0 }, head: [-0.4, -0.4] },
  rear_ltBhReach: { y: -0.12, yaw: -0.9, pitch: -0.2, cy: -0.3, cp: -0.22, cr: -0.12, fR: [0.06, -0.3, 0, -0.8], fL: [0.2, 0.1, 0, -0.6], arm: 'rear_lateBhCock', free: { s: [-0.4, 0.4], e: [-0.6, 0], w: 0 }, head: [-0.5, 1.0] },
  rear_ltBhHit: { y: -0.14, yaw: -0.85, pitch: -0.25, cy: 0.05, cp: -0.25, cr: -0.12, fR: [0.06, -0.32, 0, -0.8], fL: [0.2, 0.1, 0.03, -0.6], arm: 'rear_lateBhHit', free: { s: [-0.3, 0.5], e: [-0.6, 0], w: 0 }, head: [-0.55, 0.95] },
  rear_ltBhFoll: { y: -0.1, yaw: -0.6, pitch: -0.08, cy: 0.2, fR: [0.08, -0.26, 0, -0.6], fL: [0.2, 0.08, 0, -0.5], arm: 'rear_lateBhFoll', free: { s: [-0.4, 0.5], e: [-0.7, 0], w: 0 }, head: [-0.35, 0.6] },

  // ---------------- chase-back: turn and run after a low shuttle behind, lift it near the floor (court-space feet)
  rear_c0: { world: 1, y: -0.08, pitch: 0.2, fR: [0.2, 0.05, 0, 0.2], fL: [-0.18, -0.05, 0, -0.2], arm: 'ready', free: FREE_READY, head: [-0.12, 0] },
  // forehand side (racket side, behind)
  rear_cf1: { world: 1, px: 0.08, pz: -0.25, ry: 1.6, y: -0.06, pitch: 0.2, fR: [0.25, -0.1, 0.06, 1.6], fL: [-0.1, -0.22, 0, 1.2], arm: 'ready', free: { s: [-0.5, 0.5], e: [-1.2, 0], w: 0 }, head: [-0.2, -0.5] },
  rear_cf2: { world: 1, px: 0.3, pz: -0.8, ry: 2.5, y: -0.05, pitch: 0.25, fR: [0.4, -0.95, 0, 2.5], fL: [0.12, -0.5, 0.08, 2.5], arm: 'ready', free: { s: [-1.2, 0.5], e: [-1.2, 0], w: 0 }, head: [-0.3, 0] },
  rear_cf3: { world: 1, px: 0.5, pz: -1.4, ry: 2.6, y: -0.06, pitch: 0.28, fR: [0.4, -0.98, 0.08, 2.6], fL: [0.62, -1.6, 0, 2.6], arm: 'ready', free: { s: [-0.3, 0.5], e: [-1.2, 0], w: 0 }, head: [-0.35, 0] },
  rear_cf4: { world: 1, px: 0.7, pz: -1.95, ry: 2.6, y: -0.26, pitch: 0.55, cp: 0.25, fR: [0.85, -2.35, 0, 2.6], fL: [0.55, -1.55, 0, 2.3], arm: 'rear_chFhCock', free: { s: [0.4, 0.8], e: [-0.3, 0], w: 0 }, head: [-0.5, 0] },
  rear_cf5: { world: 1, px: 0.72, pz: -1.98, ry: 2.55, y: -0.24, pitch: 0.4, cp: 0.1, fR: [0.85, -2.35, 0, 2.6], fL: [0.55, -1.55, 0, 2.3], arm: 'rear_chFhHit', free: { s: [0.4, 0.8], e: [-0.3, 0], w: 0 }, head: [-0.35, 0] },
  rear_cf6: { world: 1, px: 0.62, pz: -1.8, ry: 1.4, y: -0.1, pitch: 0.2, fR: [0.7, -2.0, 0, 1.4], fL: [0.45, -1.5, 0, 1.0], arm: 'ready', free: FREE_READY, head: [-0.2, -0.3] },
  rear_cf7: { world: 1, px: 0.3, pz: -1.1, y: -0.08, pitch: 0.2, fR: [0.5, -0.95, 0, 0.2], fL: [0.08, -1.15, 0, -0.2], arm: 'ready', free: FREE_READY, head: [-0.12, 0] },
  // backhand side (other side, behind)
  rear_cb1: { world: 1, px: -0.08, pz: -0.25, ry: -1.6, y: -0.06, pitch: 0.2, fR: [0.12, -0.18, 0, -1.4], fL: [-0.25, -0.08, 0.06, -1.6], arm: 'ready', free: { s: [-0.5, 0.5], e: [-1.2, 0], w: 0 }, head: [-0.2, 0.5] },
  rear_cb2: { world: 1, px: -0.3, pz: -0.8, ry: -2.5, y: -0.05, pitch: 0.25, fR: [-0.12, -0.5, 0.08, -2.5], fL: [-0.4, -0.95, 0, -2.5], arm: 'ready', free: { s: [-1.2, 0.5], e: [-1.2, 0], w: 0 }, head: [-0.3, 0] },
  rear_cb3: { world: 1, px: -0.5, pz: -1.4, ry: -2.6, y: -0.06, pitch: 0.28, fR: [-0.62, -1.6, 0, -2.6], fL: [-0.4, -0.98, 0.08, -2.6], arm: 'ready', free: { s: [-0.3, 0.5], e: [-1.2, 0], w: 0 }, head: [-0.35, 0] },
  rear_cb4: { world: 1, px: -0.7, pz: -1.95, ry: -2.6, y: -0.26, pitch: 0.55, cp: 0.25, fR: [-0.85, -2.35, 0, -2.6], fL: [-0.55, -1.55, 0, -2.3], arm: 'rear_chBhCock', free: { s: [-0.2, 0.4], e: [-0.6, 0], w: 0 }, head: [-0.5, 0] },
  rear_cb5: { world: 1, px: -0.72, pz: -1.98, ry: -2.55, y: -0.24, pitch: 0.4, cp: 0.1, fR: [-0.85, -2.35, 0, -2.6], fL: [-0.55, -1.55, 0, -2.3], arm: 'rear_chBhHit', free: { s: [-0.2, 0.4], e: [-0.6, 0], w: 0 }, head: [-0.35, 0] },
  rear_cb6: { world: 1, px: -0.62, pz: -1.8, ry: -1.4, y: -0.1, pitch: 0.2, fR: [-0.45, -1.5, 0, -1.0], fL: [-0.7, -2.0, 0, -1.4], arm: 'ready', free: FREE_READY, head: [-0.2, 0.3] },
  rear_cb7: { world: 1, px: -0.3, pz: -1.1, y: -0.08, pitch: 0.2, fR: [-0.1, -0.95, 0, 0.2], fL: [-0.5, -1.15, 0, -0.2], arm: 'ready', free: FREE_READY, head: [-0.12, 0] },
};

const arms = {
  rear_follCross:    { s: [-1.0, -0.95], e: [-0.4, -0.3], w: 0.3 },   // finishes far across the body
  rear_follStraight: { s: [-1.5, -0.25], e: [-0.25, -0.1], w: 0.35 }, // finishes down the line
  rear_follClear:    { s: [-2.1, -0.45], e: [-0.35, -0.1], w: 0.0 },  // stays high
  rear_dropHit:      { s: [-2.85, 0.05], e: [-0.25, 0], w: -0.35 },   // checked: wrist held back
  rear_dropFoll:     { s: [-2.2, -0.15], e: [-0.45, 0], w: -0.5 },    // short, soft
  rear_slice:        { s: [-2.75, -0.3], e: [-0.12, -0.2], w: -0.15, r: -0.8 }, // face cuts across the shuttle
  rear_sliceFoll:    { s: [-1.8, -0.8], e: [-0.35, -0.3], w: -0.5, r: -0.9 },
  rear_revSlice:     { s: [-2.9, 0.35], e: [-0.1, 0.2], w: 0.15, r: 0.8 },     // cuts the other way (outward)
  rear_revSliceFoll: { s: [-2.0, 0.65], e: [-0.3, 0.2], w: 0.6, r: 0.9 },
  rear_rhDrop:       { s: [-2.75, -0.4], e: [-0.05, -0.1], w: 0.05 },   // contact above the other shoulder, slightly in front
  rear_bhDrop:       { s: [-2.8, -0.1], e: [-0.35, 0], w: 0.25 },     // backhand, wrist checked
  rear_bhDropFoll:   { s: [-2.6, 0.1], e: [-0.45, 0], w: 0.45 },
  rear_lateCock:     { s: [0.9, 0.55], e: [-0.6, 0], w: 0.8 },        // racket reached back/down behind
  rear_lateHit:      { s: [-0.4, 0.45], e: [-0.25, 0], w: -0.9 },     // wrist flick up
  rear_lateFoll:     { s: [-1.6, 0.35], e: [-0.3, 0], w: -0.6 },
  rear_lateBhCock:   { s: [-0.6, -0.95], e: [-1.2, 0.1], w: -0.8 },
  rear_lateBhHit:    { s: [-1.5, -0.35], e: [-0.25, 0], w: 0.6 },
  rear_lateBhFoll:   { s: [-2.0, 0.2], e: [-0.3, 0], w: 0.8 },
  rear_chFhCock:     { s: [0.8, 0.45], e: [-0.3, 0], w: 0.7 },        // low, racket back, reaching for the floor
  rear_chFhHit:      { s: [-0.9, 0.3], e: [-0.2, 0], w: -0.9 },       // lifts it up and back
  rear_chBhCock:     { s: [-0.5, -0.9], e: [-0.8, 0.1], w: -0.7 },
  rear_chBhHit:      { s: [-1.3, -0.3], e: [-0.2, 0], w: 0.7 },
};

// overhead clips share the same preparation so the opponent can't read them (like real players)
const OH = (hit, foll, ease) => [[0, 'ready'], [0.26, 'rear_side', 'io'], [0.44, 'rear_drop', 'io'], [0.54, hit, ease || 'whip'], [0.74, foll, 'out'], [1.15, 'rear_recov', 'io'], [1.45, 'ready', 'io']];
const RH = (hit, foll, ease) => [[0, 'ready'], [0.26, 'rear_rhSide', 'io'], [0.44, 'rear_rhDrop', 'io'], [0.54, hit, ease || 'whip'], [0.74, foll, 'out'], [1.15, 'rear_recov', 'io'], [1.45, 'ready', 'io']];
const BH = (hit, foll, ease) => [[0, 'ready'], [0.22, 'rear_bhTurn', 'io'], [0.4, 'rear_bhLoad', 'io'], [0.52, hit, ease || 'whip'], [0.7, foll, 'out'], [1.05, 'rear_bhBack', 'io'], [1.4, 'ready', 'io']];
const G = 'Cuối sân';
const C = (label, contact, keys) => ({ label, group: G, loop: false, contact, keys });
const clips = {
  rear_smash:      C('Đập đứng · thuận tay', 0.54, OH('rear_smHit', 'rear_smFoll')),
  rear_halfSmash:  C('Đập nửa lực · thuận tay', 0.54, OH('rear_halfHit', 'rear_halfFoll')),
  rear_crossSmash: C('Đập chéo · thuận tay', 0.54, OH('rear_crossHit', 'rear_crossFoll')),
  rear_strSmash:   C('Đập thẳng · thuận tay', 0.54, OH('rear_strHit', 'rear_strFoll')),
  rear_clear:      C('Phông cao · thuận tay', 0.54, OH('rear_clHit', 'rear_clFoll')),
  rear_attClear:   C('Phông tấn công · thuận tay', 0.54, OH('rear_acHit', 'rear_acFoll')),
  rear_drop:       C('Bỏ nhỏ cuối sân · thuận tay', 0.54, OH('rear_dpHit', 'rear_dpFoll', 'io')),
  rear_slice:      C('Bỏ nhỏ cắt · thuận tay', 0.54, OH('rear_slHit', 'rear_slFoll')),
  rear_revSlice:   C('Bỏ nhỏ cắt ngược · thuận tay', 0.54, OH('rear_rsHit', 'rear_rsFoll')),
  rear_rhClear:    C('Phông vòng đầu', 0.54, RH('rear_rhHit', 'rear_rhFoll')),
  rear_rhDrop:     C('Bỏ nhỏ vòng đầu', 0.54, RH('rear_rhDpHit', 'rear_rhDpFoll', 'io')),
  rear_rhSmash:    C('Đập vòng đầu', 0.54, RH('rear_rhSmHit', 'rear_rhSmFoll')),
  rear_bhClear:    C('Phông trái tay (quay lưng)', 0.52, BH('rear_bhClHit', 'rear_bhClFoll')),
  rear_bhDrop:     C('Bỏ nhỏ trái tay (quay lưng)', 0.52, BH('rear_bhDpHit', 'rear_bhDpFoll', 'io')),
  rear_lateFh:     C('Cứu muộn sau người · thuận tay', 0.46, [[0, 'ready'], [0.3, 'rear_ltFhReach', 'io'], [0.46, 'rear_ltFhHit', 'whip'], [0.66, 'rear_ltFhFoll', 'out'], [1.05, 'rear_recov', 'io'], [1.35, 'ready', 'io']]),
  rear_lateBh:     C('Cứu muộn sau người · trái tay', 0.46, [[0, 'ready'], [0.3, 'rear_ltBhReach', 'io'], [0.46, 'rear_ltBhHit', 'whip'], [0.66, 'rear_ltBhFoll', 'out'], [1.05, 'rear_bhBack', 'io'], [1.35, 'ready', 'io']]),
  rear_chaseFh:    C('Quay lưng đuổi cầu, lốp · thuận tay', 0.86, [[0, 'rear_c0'], [0.16, 'rear_cf1', 'out'], [0.36, 'rear_cf2'], [0.56, 'rear_cf3'], [0.74, 'rear_cf4', 'in'], [0.86, 'rear_cf5', 'whip'], [1.2, 'rear_cf6', 'io'], [1.7, 'rear_cf7', 'io']]),
  rear_chaseBh:    C('Quay lưng đuổi cầu, lốp · trái tay', 0.86, [[0, 'rear_c0'], [0.16, 'rear_cb1', 'out'], [0.36, 'rear_cb2'], [0.56, 'rear_cb3'], [0.74, 'rear_cb4', 'in'], [0.86, 'rear_cb5', 'whip'], [1.2, 'rear_cb6', 'io'], [1.7, 'rear_cb7', 'io']]),
};

// free arm pointing at the shuttle, held out in front/side so the big head doesn't hide it
const free = { rear_point: { s: [-2.35, 0.8], e: [-0.1, 0], w: 0 } };
SPAnim.register({ poses, arms, free, clips });
})();
