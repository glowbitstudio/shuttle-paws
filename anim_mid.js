/* Shuttle Paws v2 move pack: MID-court & DEFENCE (see docs/MOVES.md C3, C4, sideways footwork). Registered into SPAnim.
   Right-handed definitions (mirrored automatically). fR = racket-side foot, fL = other foot. */
(function () {
'use strict';
if (!window.SPAnim) return;

const FREE_BAL = { s: [-1.0, 0.6], e: [-0.9, 0], w: 0 };      // non-racket arm out for balance
const FREE_IN = { s: [-0.7, 0.45], e: [-1.2, 0], w: 0 };      // tucked in front (defence)
const FREE_BACK = { s: [0.45, 0.8], e: [-0.3, 0], w: 0 };     // flung back on lunges / dives

const arms = {
  // forehand push / counter: compact, racket in front
  mid_fhPushCock: { s: [-1.35, 0.75], e: [-1.25, 0.1], w: -0.75 },
  mid_fhPush:     { s: [-1.55, 0.45], e: [-0.45, 0], w: -0.15 },
  mid_ctrCock:    { s: [-1.45, 0.8], e: [-1.45, 0.05], w: -0.95 },
  // backhand push / block, thumb-up feel
  mid_bhPushCock: { s: [-1.95, -0.99], e: [0.05, -0.6], w: -1.12 },
  mid_bhPush:     { s: [-1.64, -1.06], e: [-0.26, 0.46], w: -0.31 },
  // backhand drive: racket across the chest, swings out to the backhand side
  mid_bhDriveCock: { s: [-2.34, -1.09], e: [0.05, -0.6], w: -0.95 },
  mid_bhDriveHit:  { s: [0.2, -1.6], e: [-0.45, -0.32], w: 0.07 },
  mid_bhDriveFoll: { s: [-2.65, -1.1], e: [-0.03, 0.03], w: -0.43 },
  // body shot: elbow up, racket across in front of the chest
  mid_bodySet:    { s: [-1.81, -0.87], e: [0.05, -0.49], w: -1.32 },
  mid_bodyHit:    { s: [-1.47, -1.08], e: [-0.32, 0.12], w: -0.97 },
  // low blocks to the net: racket face open, low to the side
  mid_fhBlock:    { s: [-0.75, 0.7], e: [-0.35, 0], w: -0.95 },
  mid_fhBlockHit: { s: [-0.95, 0.6], e: [-0.25, 0], w: -0.6 },
  mid_bhBlock:    { s: [-0.96, -1.08], e: [-0.09, 0.21], w: -0.24 },
  mid_bhBlockHit: { s: [0.85, -1.6], e: [-0.68, -0.6], w: -0.07 },
  // backhand lift from low
  mid_bhLiftCock: { s: [0.02, -1.15], e: [-0.16, -0.09], w: 0.86 },
  mid_bhLiftHit:  { s: [-1.3, -1.08], e: [-0.19, 0.22], w: -0.44 },
  mid_bhLiftFoll: { s: [-2.71, -0.9], e: [-0.1, 0.36], w: -0.33 },
  // shoulder-high side smash
  mid_ssCock:     { s: [-2.9, 0.95], e: [-1.45, 0], w: -1.25 },
  mid_ssHit:      { s: [-2.35, 0.7], e: [-0.1, 0], w: 0.0 },
  // defensive ready (racket low in front, backhand-ready)
  mid_defArm:     { s: [-0.95, -0.2], e: [-1.05, 0.2], w: -0.35 },
  // dives: reaching flat out
  mid_diveFh:     { s: [-1.6, 1.3], e: [-0.1, 0], w: -0.3 },
  mid_diveBh:     { s: [-1.78, -1.34], e: [0.04, 0.02], w: 0.01 },
};

const poses = {
  // ---- defensive base: lower, square to the net
  mid_def:      { y: -0.15, pitch: 0.25, cp: 0.05, fR: [0.27, 0.0, 0, 0.3], fL: [0.27, 0.0, 0, -0.3], arm: 'mid_defArm', free: FREE_IN, head: [-0.05, 0] },

  // ---- drives (flat, shoulder height): short backswing, contact in front
  mid_fdPrep:   { y: -0.1, yaw: 0.45, pitch: 0.15, cy: 0.2, fR: [0.32, 0.0, 0, 0.6], fL: [0.18, 0.02, 0, -0.1], arm: 'cockMid', free: FREE_BAL, head: [-0.05, -0.35] },
  mid_fdHit:    { y: -0.1, yaw: -0.05, pitch: 0.18, cy: -0.25, fR: [0.34, 0.05, 0, 0.5], fL: [0.18, 0.02, 0, -0.1], arm: 'hitMid', free: FREE_BAL, head: [-0.05, -0.35] },
  mid_fdFoll:   { y: -0.09, yaw: -0.25, pitch: 0.16, cy: -0.35, fR: [0.34, 0.05, 0, 0.5], fL: [0.18, 0.02, 0, -0.1], arm: 'follMid', free: FREE_IN, head: [-0.05, -0.1] },
  mid_bdPrep:   { y: -0.1, yaw: -0.6, pitch: 0.15, cy: -0.3, fR: [-0.05, 0.08, 0, -0.5], fL: [0.22, -0.05, 0, -0.4], arm: 'mid_bhDriveCock', free: FREE_IN, head: [-0.05, 0.45] },
  mid_bdHit:    { y: -0.1, yaw: -0.15, pitch: 0.16, cy: 0.2, fR: [-0.05, 0.1, 0, -0.5], fL: [0.22, -0.05, 0, -0.4], arm: 'mid_bhDriveHit', free: FREE_BAL, head: [-0.05, 0.4] },
  mid_bdFoll:   { y: -0.09, yaw: 0.0, pitch: 0.15, cy: 0.3, fR: [-0.05, 0.1, 0, -0.5], fL: [0.22, -0.05, 0, -0.4], arm: 'mid_bhDriveFoll', free: FREE_BAL, head: [-0.05, 0.2] },

  // ---- pushes: step in with the racket foot, firm short punch
  mid_fpPrep:   { y: -0.12, yaw: 0.25, pitch: 0.22, fR: [0.26, 0.24, 0, 0.3], fL: [0.18, -0.08, 0, -0.2], arm: 'mid_fhPushCock', free: FREE_BAL, head: [-0.1, -0.15] },
  mid_fpHit:    { y: -0.14, yaw: 0.05, pitch: 0.26, cy: -0.15, fR: [0.26, 0.28, 0, 0.3], fL: [0.18, -0.08, 0, -0.2], arm: 'mid_fhPush', free: FREE_BAL, head: [-0.1, -0.1] },
  mid_bpPrep:   { y: -0.12, yaw: -0.4, pitch: 0.22, cy: -0.15, fR: [-0.06, 0.24, 0, -0.4], fL: [0.22, -0.08, 0, -0.3], arm: 'mid_bhPushCock', free: FREE_IN, head: [-0.1, 0.25] },
  mid_bpHit:    { y: -0.14, yaw: -0.15, pitch: 0.26, cy: 0.15, fR: [-0.06, 0.28, 0, -0.4], fL: [0.22, -0.08, 0, -0.3], arm: 'mid_bhPush', free: FREE_BAL, head: [-0.1, 0.2] },

  // ---- jump drive / intercept: side jump, hit in the air (travels sideways)
  mid_w0:       { world: 1, y: -0.08, pitch: 0.2, fR: [0.2, 0.03, 0, 0.2], fL: [-0.2, -0.02, 0, -0.2], arm: 'ready', free: FREE_BAL, head: [-0.12, 0] },
  mid_jfLoad:   { world: 1, px: 0.1, y: -0.15, pitch: 0.22, yaw: 0.25, fR: [0.32, 0.02, 0, 0.5], fL: [-0.08, 0.0, 0, -0.1], arm: 'cockMid', free: FREE_BAL, head: [-0.08, -0.4] },
  mid_jfAir:    { world: 1, px: 0.4, jump: 0.34, yaw: 0.35, cy: 0.2, pitch: 0.1, fR: [0.58, 0.04, 0.1, 0.5], fL: [0.22, -0.02, 0.14, -0.1], arm: 'cockMid', free: FREE_BAL, head: [-0.1, -0.45] },
  mid_jfHit:    { world: 1, px: 0.48, jump: 0.38, yaw: -0.15, cy: -0.3, pitch: 0.12, fR: [0.66, 0.06, 0.12, 0.4], fL: [0.3, -0.02, 0.1, -0.1], arm: 'hitMid', free: FREE_BAL, head: [-0.1, -0.4] },
  mid_jfLand:   { world: 1, px: 0.55, y: -0.17, pitch: 0.28, yaw: -0.1, fR: [0.74, 0.02, 0, 0.4], fL: [0.36, -0.02, 0, -0.2], arm: 'follMid', free: FREE_BAL, head: [-0.08, -0.15] },
  mid_jbLoad:   { world: 1, px: -0.1, y: -0.15, pitch: 0.22, yaw: -0.35, fR: [0.08, 0.02, 0, -0.3], fL: [-0.32, 0.0, 0, -0.5], arm: 'mid_bhDriveCock', free: FREE_IN, head: [-0.08, 0.45] },
  mid_jbAir:    { world: 1, px: -0.4, jump: 0.34, yaw: -0.55, cy: -0.25, pitch: 0.1, fR: [-0.22, 0.04, 0.14, -0.5], fL: [-0.58, -0.02, 0.1, -0.5], arm: 'mid_bhDriveCock', free: FREE_IN, head: [-0.1, 0.5] },
  mid_jbHit:    { world: 1, px: -0.48, jump: 0.38, yaw: -0.15, cy: 0.2, pitch: 0.12, fR: [-0.3, 0.06, 0.1, -0.4], fL: [-0.66, -0.02, 0.12, -0.4], arm: 'mid_bhDriveHit', free: FREE_BAL, head: [-0.1, 0.45] },
  mid_jbLand:   { world: 1, px: -0.55, y: -0.17, pitch: 0.28, yaw: -0.05, fR: [-0.36, 0.02, 0, -0.3], fL: [-0.74, -0.02, 0, -0.4], arm: 'mid_bhDriveFoll', free: FREE_BAL, head: [-0.08, 0.2] },

  // ---- shoulder-high side smash (small hop)
  mid_ssPrep:   { y: -0.12, yaw: 0.7, pitch: 0.05, cy: 0.3, cp: -0.1, fR: [0.3, -0.06, 0, 0.8], fL: [0.16, 0.08, 0, 0.3], arm: 'ohPrep', free: 'point', head: [-0.2, -0.5] },
  mid_ssHit:    { y: -0.02, jump: 0.14, yaw: -0.2, pitch: 0.2, cy: -0.35, cp: 0.12, fR: [0.3, 0.02, 0.05, 0.4], fL: [0.16, 0.0, 0.05, 0.1], arm: 'mid_ssHit', free: FREE_IN, head: [-0.15, -0.2] },
  mid_ssFoll:   { y: -0.14, yaw: -0.4, pitch: 0.32, cy: -0.4, cp: 0.2, fR: [0.32, 0.08, 0, 0.3], fL: [0.17, -0.04, 0, 0.0], arm: 'follMid', free: FREE_IN, head: [-0.05, 0] },

  // ---- body shot: backhand block in front of the chest, elbow up
  mid_bbSet:    { y: -0.15, pitch: 0.12, fR: [0.27, 0.0, 0, 0.3], fL: [0.27, 0.0, 0, -0.3], arm: 'mid_bodySet', free: FREE_BAL, head: [0.05, 0] },
  mid_bbHit:    { y: -0.14, pitch: 0.14, cy: 0.12, fR: [0.27, 0.0, 0, 0.3], fL: [0.27, 0.0, 0, -0.3], arm: 'mid_bodyHit', free: FREE_BAL, head: [0.05, 0] },

  // ---- low blocks to the net (soft, low stance)
  mid_fbReach:  { y: -0.22, pitch: 0.3, roll: 0.15, fR: [0.42, 0.06, 0, 0.6], fL: [0.22, -0.02, 0, -0.3], arm: 'mid_fhBlock', free: FREE_BAL, head: [-0.2, -0.3] },
  mid_fbHit:    { y: -0.22, pitch: 0.32, roll: 0.15, fR: [0.42, 0.06, 0, 0.6], fL: [0.22, -0.02, 0, -0.3], arm: 'mid_fhBlockHit', free: FREE_BAL, head: [-0.2, -0.3] },
  mid_bbReach:  { y: -0.22, yaw: -0.25, pitch: 0.3, roll: -0.15, fR: [0.18, 0.04, 0, 0.1], fL: [0.42, 0.0, 0, -0.6], arm: 'mid_bhBlock', free: FREE_IN, head: [-0.2, 0.3] },
  mid_bbkHit:   { y: -0.22, yaw: -0.2, pitch: 0.32, roll: -0.15, fR: [0.18, 0.04, 0, 0.1], fL: [0.42, 0.0, 0, -0.6], arm: 'mid_bhBlockHit', free: FREE_IN, head: [-0.2, 0.3] },

  // ---- defensive lifts (deep stance, from low)
  mid_flLoad:   { y: -0.24, yaw: 0.3, pitch: 0.34, roll: 0.1, fR: [0.45, 0.18, 0, 0.6], fL: [0.2, -0.12, 0, -0.3], arm: 'cockLo', free: FREE_BACK, head: [-0.2, -0.25] },
  mid_flHit:    { y: -0.24, yaw: 0.15, pitch: 0.34, roll: 0.1, fR: [0.45, 0.2, 0, 0.6], fL: [0.2, -0.12, 0, -0.3], arm: 'hitLo', free: FREE_BACK, head: [-0.2, -0.2] },
  mid_flFoll:   { y: -0.18, yaw: -0.05, pitch: 0.24, fR: [0.45, 0.2, 0, 0.6], fL: [0.2, -0.12, 0, -0.3], arm: 'follLo', free: FREE_BAL, head: [-0.25, 0] },
  mid_blLoad:   { y: -0.24, yaw: -0.6, pitch: 0.34, roll: -0.1, cy: -0.2, fR: [-0.15, 0.2, 0, -0.6], fL: [0.24, -0.1, 0, -0.4], arm: 'mid_bhLiftCock', free: FREE_IN, head: [-0.2, 0.35] },
  mid_blHit:    { y: -0.24, yaw: -0.45, pitch: 0.34, roll: -0.1, cy: 0.1, fR: [-0.15, 0.22, 0, -0.6], fL: [0.24, -0.1, 0, -0.4], arm: 'mid_bhLiftHit', free: FREE_BAL, head: [-0.2, 0.3] },
  mid_blFoll:   { y: -0.18, yaw: -0.25, pitch: 0.24, cy: 0.25, fR: [-0.15, 0.22, 0, -0.6], fL: [0.24, -0.1, 0, -0.4], arm: 'mid_bhLiftFoll', free: FREE_BAL, head: [-0.25, 0.1] },

  // ---- counter drives from the defensive stance (flick of the forearm)
  mid_cfSet:    { y: -0.15, yaw: 0.2, pitch: 0.22, fR: [0.3, 0.0, 0, 0.4], fL: [0.26, 0.0, 0, -0.3], arm: 'mid_ctrCock', free: FREE_IN, head: [-0.05, -0.2] },
  mid_cfHit:    { y: -0.14, yaw: -0.1, pitch: 0.22, cy: -0.2, fR: [0.3, 0.0, 0, 0.4], fL: [0.26, 0.0, 0, -0.3], arm: 'hitMid', free: FREE_IN, head: [-0.05, -0.2] },
  mid_cbSet:    { y: -0.15, yaw: -0.25, pitch: 0.22, cy: -0.1, fR: [0.27, 0.0, 0, 0.3], fL: [0.28, 0.0, 0, -0.4], arm: 'mid_bhDriveCock', free: FREE_IN, head: [-0.05, 0.2] },
  mid_cbHit:    { y: -0.14, yaw: -0.05, pitch: 0.22, cy: 0.15, fR: [0.27, 0.0, 0, 0.3], fL: [0.28, 0.0, 0, -0.4], arm: 'mid_bhDriveHit', free: FREE_IN, head: [-0.05, 0.2] },

  // ---- sideways footwork: chassé + side lunge + low lift (travels)
  mid_sfStep1:  { world: 1, px: 0.18, y: -0.1, pitch: 0.2, fR: [0.42, 0.03, 0.06, 0.4], fL: [-0.05, -0.02, 0, -0.2], arm: 'ready', free: FREE_BAL, head: [-0.12, -0.2] },
  mid_sfStep2:  { world: 1, px: 0.36, y: -0.1, pitch: 0.2, fR: [0.5, 0.03, 0, 0.4], fL: [0.22, -0.02, 0.06, -0.2], arm: 'cockLo', free: FREE_BAL, head: [-0.15, -0.3] },
  mid_sfLunge:  { world: 1, px: 0.62, y: -0.22, pitch: 0.28, roll: 0.1, yaw: 0.35, fR: [1.0, 0.08, 0, 0.9], fL: [0.32, -0.04, 0, -0.1], arm: 'hitLo', free: FREE_BACK, head: [-0.25, -0.4] },
  mid_sfPush:   { world: 1, px: 0.45, y: -0.12, pitch: 0.22, roll: 0.05, fR: [0.7, 0.05, 0.05, 0.5], fL: [0.32, -0.04, 0, -0.1], arm: 'follLo', free: FREE_BAL, head: [-0.15, -0.1] },
  mid_sbStep1:  { world: 1, px: -0.18, y: -0.1, pitch: 0.2, fR: [0.05, 0.03, 0, 0.0], fL: [-0.42, -0.02, 0.06, -0.4], arm: 'ready', free: FREE_IN, head: [-0.12, 0.2] },
  mid_sbStep2:  { world: 1, px: -0.36, y: -0.1, pitch: 0.2, yaw: -0.4, fR: [-0.22, 0.03, 0.06, -0.4], fL: [-0.5, -0.02, 0, -0.4], arm: 'mid_bhLiftCock', free: FREE_IN, head: [-0.15, 0.35] },
  mid_sbLunge:  { world: 1, px: -0.62, y: -0.26, pitch: 0.32, roll: -0.15, yaw: -0.9, cy: 0.1, fR: [-1.0, 0.1, 0, -1.2], fL: [-0.32, -0.04, 0, -0.5], arm: 'mid_bhLiftHit', free: FREE_BAL, head: [-0.25, 0.45] },
  mid_sbPush:   { world: 1, px: -0.45, y: -0.12, pitch: 0.22, yaw: -0.4, fR: [-0.7, 0.06, 0.05, -0.8], fL: [-0.32, -0.04, 0, -0.4], arm: 'mid_bhLiftFoll', free: FREE_BAL, head: [-0.15, 0.2] },

  // ---- dive saves (travel, flat out, contact low, land, get up)
  mid_dfLoad:   { world: 1, px: 0.15, y: -0.16, pitch: 0.25, roll: 0.15, fR: [0.4, 0.03, 0, 0.5], fL: [-0.05, -0.02, 0, -0.2], arm: 'cockLo', free: FREE_BAL, head: [-0.15, -0.35] },
  mid_dfFly:    { world: 1, px: 0.7, y: -0.22, jump: 0.1, pitch: 0.25, roll: 0.7, fR: [1.05, 0.03, 0.12, 0.8], fL: [0.45, -0.02, 0.2, 0.2], arm: 'mid_diveFh', free: FREE_BACK, head: [-0.3, -0.5] },
  mid_dfFloor:  { world: 1, px: 0.85, y: -0.3, pitch: 0.2, roll: 0.85, fR: [1.15, 0.03, 0.02, 0.8], fL: [0.6, -0.02, 0.08, 0.2], arm: 'mid_diveFh', free: FREE_BACK, head: [-0.2, -0.4] },
  mid_dfKnee:   { world: 1, px: 0.8, y: -0.28, pitch: 0.35, roll: 0.35, fR: [1.05, 0.05, 0, 0.5], fL: [0.62, -0.05, 0, 0.0], arm: 'ready', free: FREE_BAL, head: [-0.15, -0.2] },
  mid_dfUp:     { world: 1, px: 0.65, y: -0.1, pitch: 0.2, fR: [0.85, 0.03, 0, 0.3], fL: [0.45, -0.02, 0, -0.2], arm: 'ready', free: FREE_BAL, head: [-0.12, 0] },
  mid_dbLoad:   { world: 1, px: -0.15, y: -0.16, pitch: 0.25, roll: -0.15, yaw: -0.3, fR: [0.05, 0.03, 0, -0.2], fL: [-0.4, -0.02, 0, -0.5], arm: 'mid_bhLiftCock', free: FREE_IN, head: [-0.15, 0.35] },
  mid_dbFly:    { world: 1, px: -0.7, y: -0.22, jump: 0.1, pitch: 0.25, roll: -0.7, yaw: -0.3, fR: [-0.45, 0.03, 0.2, -0.2], fL: [-1.05, -0.02, 0.12, -0.8], arm: 'mid_diveBh', free: FREE_BAL, head: [-0.3, 0.5] },
  mid_dbFloor:  { world: 1, px: -0.85, y: -0.3, pitch: 0.2, roll: -0.85, yaw: -0.3, fR: [-0.6, 0.03, 0.08, -0.2], fL: [-1.15, -0.02, 0.02, -0.8], arm: 'mid_diveBh', free: FREE_BAL, head: [-0.2, 0.4] },
  mid_dbKnee:   { world: 1, px: -0.8, y: -0.28, pitch: 0.35, roll: -0.35, fR: [-0.62, 0.05, 0, 0.0], fL: [-1.05, -0.05, 0, -0.5], arm: 'ready', free: FREE_BAL, head: [-0.15, 0.2] },
  mid_dbUp:     { world: 1, px: -0.65, y: -0.1, pitch: 0.2, fR: [-0.45, 0.03, 0, 0.2], fL: [-0.85, -0.02, 0, -0.3], arm: 'ready', free: FREE_BAL, head: [-0.12, 0] },
};

const G = 'Giữa sân';
const C = (label, contact, keys) => ({ label, group: G, contact, loop: false, keys });
const clips = {
  mid_driveFh:     C('Tạt · thuận tay', 0.3, [[0, 'ready'], [0.16, 'mid_fdPrep', 'io'], [0.3, 'mid_fdHit', 'whip'], [0.46, 'mid_fdFoll', 'out'], [0.8, 'ready', 'io']]),
  mid_driveBh:     C('Tạt · trái tay', 0.3, [[0, 'ready'], [0.16, 'mid_bdPrep', 'io'], [0.3, 'mid_bdHit', 'whip'], [0.46, 'mid_bdFoll', 'out'], [0.8, 'ready', 'io']]),
  mid_pushFh:      C('Đẩy cầu · thuận tay', 0.3, [[0, 'ready'], [0.18, 'mid_fpPrep', 'io'], [0.3, 'mid_fpHit', 'whip'], [0.7, 'ready', 'io']]),
  mid_pushBh:      C('Đẩy cầu · trái tay', 0.3, [[0, 'ready'], [0.18, 'mid_bpPrep', 'io'], [0.3, 'mid_bpHit', 'whip'], [0.7, 'ready', 'io']]),
  mid_jumpDriveFh: C('Nhảy chặn ngang · thuận tay', 0.38, [[0, 'mid_w0'], [0.15, 'mid_jfLoad', 'io'], [0.3, 'mid_jfAir', 'out'], [0.38, 'mid_jfHit', 'whip'], [0.56, 'mid_jfLand', 'in'], [1.05, 'mid_w0', 'io']]),
  mid_jumpDriveBh: C('Nhảy chặn ngang · trái tay', 0.38, [[0, 'mid_w0'], [0.15, 'mid_jbLoad', 'io'], [0.3, 'mid_jbAir', 'out'], [0.38, 'mid_jbHit', 'whip'], [0.56, 'mid_jbLand', 'in'], [1.05, 'mid_w0', 'io']]),
  mid_sideSmash:   C('Đập ngang vai', 0.36, [[0, 'ready'], [0.22, 'mid_ssPrep', 'io'], [0.36, 'mid_ssHit', 'whip'], [0.52, 'mid_ssFoll', 'out'], [0.95, 'ready', 'io']]),
  mid_bodyBlock:   C('Chặn cầu vào người', 0.2, [[0, 'mid_def'], [0.12, 'mid_bbSet', 'out'], [0.2, 'mid_bbHit', 'whip'], [0.4, 'mid_def', 'io'], [0.75, 'ready', 'io']]),
  mid_blockFh:     C('Chặn đập · thuận tay', 0.28, [[0, 'mid_def'], [0.18, 'mid_fbReach', 'out'], [0.28, 'mid_fbHit', 'out'], [0.5, 'mid_def', 'io'], [0.85, 'ready', 'io']]),
  mid_blockBh:     C('Chặn đập · trái tay', 0.28, [[0, 'mid_def'], [0.18, 'mid_bbReach', 'out'], [0.28, 'mid_bbkHit', 'out'], [0.5, 'mid_def', 'io'], [0.85, 'ready', 'io']]),
  mid_liftFh:      C('Lốp phòng thủ · thuận tay', 0.34, [[0, 'mid_def'], [0.2, 'mid_flLoad', 'io'], [0.34, 'mid_flHit', 'whip'], [0.55, 'mid_flFoll', 'out'], [0.95, 'ready', 'io']]),
  mid_liftBh:      C('Lốp phòng thủ · trái tay', 0.34, [[0, 'mid_def'], [0.2, 'mid_blLoad', 'io'], [0.34, 'mid_blHit', 'whip'], [0.55, 'mid_blFoll', 'out'], [0.95, 'ready', 'io']]),
  mid_counterFh:   C('Tạt trả · thuận tay', 0.18, [[0, 'mid_def'], [0.1, 'mid_cfSet', 'out'], [0.18, 'mid_cfHit', 'whip'], [0.38, 'mid_def', 'io'], [0.7, 'ready', 'io']]),
  mid_counterBh:   C('Tạt trả · trái tay', 0.18, [[0, 'mid_def'], [0.1, 'mid_cbSet', 'out'], [0.18, 'mid_cbHit', 'whip'], [0.38, 'mid_def', 'io'], [0.7, 'ready', 'io']]),
  mid_sideLungeFh: C('Bước ngang + lunge · thuận tay', 0.5, [[0, 'mid_w0'], [0.14, 'mid_sfStep1', 'io'], [0.28, 'mid_sfStep2', 'io'], [0.5, 'mid_sfLunge', 'out'], [0.72, 'mid_sfLunge'], [0.95, 'mid_sfPush', 'io'], [1.35, 'mid_w0', 'io']]),
  mid_sideLungeBh: C('Bước ngang + lunge · trái tay', 0.5, [[0, 'mid_w0'], [0.14, 'mid_sbStep1', 'io'], [0.28, 'mid_sbStep2', 'io'], [0.5, 'mid_sbLunge', 'out'], [0.72, 'mid_sbLunge'], [0.95, 'mid_sbPush', 'io'], [1.35, 'mid_w0', 'io']]),
  mid_diveFh:      Object.assign(C('Lao người cứu · thuận tay', 0.38, [[0, 'mid_w0'], [0.16, 'mid_dfLoad', 'io'], [0.38, 'mid_dfFly', 'out'], [0.6, 'mid_dfFloor', 'in'], [0.95, 'mid_dfKnee', 'io'], [1.25, 'mid_dfUp', 'io'], [1.75, 'mid_w0', 'io']]), { allow: ['overreach'] }),
  mid_diveBh:      Object.assign(C('Lao người cứu · trái tay', 0.38, [[0, 'mid_w0'], [0.16, 'mid_dbLoad', 'io'], [0.38, 'mid_dbFly', 'out'], [0.6, 'mid_dbFloor', 'in'], [0.95, 'mid_dbKnee', 'io'], [1.25, 'mid_dbUp', 'io'], [1.75, 'mid_w0', 'io']]), { allow: ['overreach'] }),
};

SPAnim.register({ poses, arms, free: {}, clips });
})();
