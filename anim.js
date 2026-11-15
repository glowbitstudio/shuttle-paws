/* Shuttle Paws v2 — character rig + keyframed moves (browser only, needs THREE).
   The look of the characters is unchanged; this adds a skeleton inside:
   body > hips (pivot) > waist/chest (pivot) > head, arms   and   hips > thigh > knee > ankle (2-bone IK legs).
   Moves are keyframe clips with easing; feet are placed by IK so they stay planted. */
(function (root) {
'use strict';
const T = root.THREE;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));

// ------------------------------------------------------------------ rig helpers
// a pivot at point p of `parent`; things added to `inner` keep the coordinates they had in parent space
function pivot(parent, x, y, z) {
  const p = new T.Group(); p.position.set(x, y, z); parent.add(p);
  const inner = new T.Group(); inner.position.set(-x, -y, -z); p.add(inner);
  return { p, inner };
}

const tmpA = new T.Vector3(), tmpB = new T.Vector3();
const qKnee = new T.Quaternion(), qWant = new T.Quaternion(), qTmp = new T.Quaternion(), eFoot = new T.Euler();
// place the ankle of `leg` at `target` (a point in the model's body space) with the knee bending forward
function legIK(mdl, leg, target, footPitch, footYaw) {
  mdl.body.updateMatrixWorld(true);
  tmpA.copy(target); mdl.body.localToWorld(tmpA);            // target -> world
  leg.parent.worldToLocal(tmpA);                              // -> the space the thigh lives in
  const hx = leg.thigh.position.x, hy = leg.thigh.position.y, hz = leg.thigh.position.z;
  const dx = tmpA.x - hx, dy = tmpA.y - hy, dz = tmpA.z - hz;
  const L1 = leg.L1, L2 = leg.L2;
  let len = Math.hypot(dx, dy, dz);
  leg.reachErr = Math.max(0, len - (L1 + L2));                 // how far the foot target is beyond the leg (for the checker)
  len = clamp(len, Math.abs(L1 - L2) + 1e-3, (L1 + L2) * 0.999);
  // thigh rotation order is ZYX (pitch about x first, then splay about z): splay is measured in the x-y plane,
  // pitch out of it - so the knee bends in the plane that really contains hip and ankle
  const roll = Math.atan2(dx, -dy);                           // out to the side
  const pitch = Math.atan2(dz, Math.hypot(dx, dy));           // forward +
  const alpha = Math.acos(clamp((L1 * L1 + len * len - L2 * L2) / (2 * L1 * len), -1, 1));
  const bend = Math.PI - Math.acos(clamp((L1 * L1 + L2 * L2 - len * len) / (2 * L1 * L2), -1, 1));
  leg.thigh.rotation.set(-(pitch + alpha), 0, roll);
  leg.knee.rotation.set(bend, 0, 0);
  // keep the foot level with the floor (minus the hips' own tilt), then apply extra pitch / toe direction
  leg.knee.updateMatrixWorld(true);
  leg.knee.getWorldQuaternion(qKnee);
  mdl.body.getWorldQuaternion(qWant);
  qTmp.setFromEuler(eFoot.set(footPitch || 0, footYaw || 0, 0, 'YXZ'));
  qWant.multiply(qTmp);
  leg.ankle.quaternion.copy(qKnee.invert().multiply(qWant));
}

// ------------------------------------------------------------------ poses
// Defined for a RIGHT-handed player facing +z; mirrored automatically for left-handers.
//  y: hips drop (m)        yaw/pitch/roll: hips turn (yaw + = racket shoulder pulled back), lean forward, tilt to racket side
//  cy/cp/cr: extra chest twist / bend / side-bend      jump: whole body off the floor (m)
//  fR/fL: racket-side / other foot [out, forward, lift, toeYaw]   arm/free: shoulder/elbow/wrist pose   head: [pitch, yaw]
const P = {
  ready:   { y: -0.06, pitch: 0.18, cp: 0.08, fR: [0.2, 0.04, 0, 0.25], fL: [0.2, -0.02, 0, -0.2], arm: 'ready', free: { s: [-0.9, 0.5], e: [-1.0, 0], w: 0 }, head: [-0.1, 0] },
  readyLo: { y: -0.1, pitch: 0.26, cp: 0.1, fR: [0.22, 0.05, 0, 0.3], fL: [0.22, -0.03, 0, -0.25], arm: 'ready', free: { s: [-0.9, 0.55], e: [-1.0, 0], w: 0 }, head: [-0.15, 0] },
  splitUp: { y: 0.02, pitch: 0.12, jump: 0.07, fR: [0.16, 0.02, 0.03, 0.2], fL: [0.16, -0.02, 0.03, -0.15], arm: 'ready', free: { s: [-0.9, 0.5], e: [-1.0, 0], w: 0 }, head: [-0.1, 0] },
  splitLand:{ y: -0.12, pitch: 0.24, fR: [0.25, 0.05, 0, 0.35], fL: [0.25, -0.03, 0, -0.3], arm: 'ready', free: { s: [-0.9, 0.55], e: [-1.0, 0], w: 0 }, head: [-0.15, 0] },
  // overhead: turn sideways, racket drops behind, free arm points at the shuttle
  ohTurn:  { y: -0.05, yaw: 0.85, pitch: 0.02, cy: 0.25, cp: -0.12, fR: [0.12, -0.16, 0, 0.9], fL: [0.12, 0.1, 0, 0.5], arm: 'ohPrep', free: 'point', head: [-0.4, -0.5] },
  ohLoad:  { y: -0.13, yaw: 0.95, pitch: -0.05, cy: 0.35, cp: -0.22, cr: 0.12, fR: [0.13, -0.18, 0, 0.9], fL: [0.12, 0.12, 0, 0.5], arm: 'ohPrep', free: 'point', head: [-0.5, -0.55] },
  ohAir:   { y: 0.0, yaw: 0.7, pitch: -0.12, cy: 0.4, cp: -0.3, cr: 0.15, jump: 0.42, fR: [0.12, -0.2, 0.12, 0.9], fL: [0.12, 0.14, 0.06, 0.5], arm: 'cockHi', free: 'point', head: [-0.55, -0.5] },
  ohHit:   { y: 0.0, yaw: -0.25, pitch: 0.12, cy: -0.35, cp: 0.12, cr: -0.1, jump: 0.48, fR: [0.12, 0.12, 0.1, 0.3], fL: [0.12, -0.18, 0.16, 0.3], arm: 'hitHi', free: { s: [-0.6, 0.6], e: [-1.4, 0], w: 0 }, head: [-0.35, 0.05] },
  ohFoll:  { y: -0.02, yaw: -0.55, pitch: 0.4, cy: -0.4, cp: 0.3, cr: -0.12, jump: 0.2, fR: [0.12, 0.2, 0.08, 0.1], fL: [0.14, -0.22, 0.06, 0.4], arm: 'follHi', free: { s: [-0.3, 0.7], e: [-1.6, 0], w: 0 }, head: [0, 0.1] },
  ohLand:  { y: -0.17, yaw: -0.3, pitch: 0.35, cp: 0.12, fR: [0.2, 0.18, 0, 0.3], fL: [0.2, -0.16, 0, -0.1], arm: 'follHi', free: { s: [-0.6, 0.6], e: [-1.2, 0], w: 0 }, head: [-0.05, 0] },
  // net lunge with the racket foot
  luStep:  { y: -0.1, yaw: 0.25, pitch: 0.3, fR: [0.16, 0.3, 0.08, 0.2], fL: [0.18, -0.12, 0, -0.4], arm: 'cockLo', free: { s: [-0.2, 0.9], e: [-0.6, 0], w: 0 }, head: [-0.2, 0] },
  luDeep:  { y: -0.24, yaw: 0.35, pitch: 0.42, cp: 0.12, fR: [0.18, 0.62, 0, 0.15], fL: [0.2, -0.36, 0, -0.6], arm: 'hitLo', free: { s: [0.5, 1.0], e: [-0.2, 0], w: 0 }, head: [-0.35, 0] },
  luBack:  { y: -0.1, yaw: 0.1, pitch: 0.22, fR: [0.18, 0.22, 0.05, 0.2], fL: [0.2, -0.12, 0, -0.3], arm: 'follLo', free: { s: [-0.5, 0.7], e: [-0.9, 0], w: 0 }, head: [-0.15, 0] },
  // backhand: turn the back to the net, elbow leads, wrist snaps
  bhTurn:  { y: -0.08, yaw: -1.3, pitch: 0.1, cy: -0.3, cp: 0.05, fR: [0.06, -0.12, 0, -1.2], fL: [0.2, 0.08, 0, -0.9], arm: 'bhCock', free: { s: [-0.3, 0.3], e: [-0.6, 0], w: 0 }, head: [-0.3, 0.9] },
  bhLoad:  { y: -0.14, yaw: -1.5, pitch: 0.16, cy: -0.4, cp: 0.12, fR: [0.04, -0.16, 0, -1.3], fL: [0.22, 0.1, 0, -1.0], arm: 'bhCock', free: { s: [-0.2, 0.25], e: [-0.5, 0], w: 0 }, head: [-0.35, 1.0] },
  bhHit:   { y: -0.04, yaw: -0.9, pitch: 0.05, cy: 0.2, cp: -0.05, fR: [0.06, -0.08, 0.03, -1.1], fL: [0.22, 0.12, 0, -0.9], arm: 'bhHit', free: { s: [-0.1, 0.4], e: [-0.4, 0], w: 0 }, head: [-0.3, 0.85] },
  bhFoll:  { y: -0.06, yaw: -0.6, pitch: 0.08, cy: 0.3, fR: [0.08, -0.04, 0, -0.8], fL: [0.22, 0.1, 0, -0.7], arm: 'bhFoll', free: { s: [-0.2, 0.5], e: [-0.6, 0], w: 0 }, head: [-0.2, 0.6] },

  // ---- retreats (court-space feet: [toward racket side, toward net, lift, toe]; px/pz/ry = body travel & turn)
  // 1) forehand rear corner: turn side-on, chassé back, plant, scissor-jump smash, land swapping feet, recover
  rf0: { world: 1, y: -0.1, pitch: 0.25, fR: [0.22, 0.22, 0, 0.2], fL: [-0.2, -0.12, 0, -0.2], arm: 'ready', free: { s: [-0.9, 0.5], e: [-1.0, 0], w: 0 }, head: [-0.15, 0] },
  rf1: { world: 1, px: 0.05, pz: -0.2, ry: 0.9, y: -0.08, pitch: 0.1, fR: [0.24, 0.0, 0.05, 0.9], fL: [-0.15, -0.18, 0, 0.4], arm: 'ohPrep', free: 'point', head: [-0.35, -0.7] },
  rf2: { world: 1, px: 0.25, pz: -0.75, ry: 0.95, y: -0.06, fR: [0.45, -0.9, 0, 0.9], fL: [0.05, -0.4, 0.07, 0.4], arm: 'ohPrep', free: 'point', head: [-0.4, -0.7] },
  rf3: { world: 1, px: 0.45, pz: -1.2, ry: 0.95, y: -0.07, fR: [0.62, -1.3, 0.07, 0.9], fL: [0.35, -0.8, 0, 0.4], arm: 'ohPrep', free: 'point', head: [-0.45, -0.65] },
  rf4: { world: 1, px: 0.62, pz: -1.7, ry: 0.95, y: -0.07, fR: [0.8, -1.85, 0, 0.9], fL: [0.5, -1.25, 0.06, 0.4], arm: 'ohPrep', free: 'point', head: [-0.5, -0.6] },
  rf5: { world: 1, px: 0.72, pz: -2.0, ry: 0.95, y: -0.14, pitch: -0.05, cy: 0.3, cp: -0.22, cr: 0.12, fR: [0.9, -2.2, 0, 0.9], fL: [0.6, -1.7, 0, 0.4], arm: 'cockHi', free: 'point', head: [-0.5, -0.6] },
  rf6: { world: 1, px: 0.74, pz: -2.0, ry: 0.9, jump: 0.4, cy: 0.4, cp: -0.3, cr: 0.15, fR: [0.88, -2.25, 0.14, 0.9], fL: [0.62, -1.65, 0.06, 0.4], arm: 'cockHi', free: 'point', head: [-0.55, -0.5] },
  rf7: { world: 1, px: 0.72, pz: -1.98, ry: 0.3, jump: 0.45, pitch: 0.12, cy: -0.35, cp: 0.12, cr: -0.1, fR: [0.8, -1.8, 0.12, 0.3], fL: [0.6, -2.25, 0.15, 0.3], arm: 'hitHi', free: { s: [-0.6, 0.6], e: [-1.4, 0], w: 0 }, head: [-0.35, 0] },
  rf8: { world: 1, px: 0.7, pz: -1.95, ry: -0.05, y: -0.18, pitch: 0.35, cp: 0.12, fR: [0.78, -1.75, 0, 0.2], fL: [0.62, -2.3, 0, 0.2], arm: 'follHi', free: { s: [-0.6, 0.6], e: [-1.2, 0], w: 0 }, head: [-0.05, 0] },
  rf9: { world: 1, px: 0.35, pz: -1.1, y: -0.08, pitch: 0.2, fR: [0.55, -0.95, 0, 0.2], fL: [0.12, -1.15, 0, -0.2], arm: 'ready', free: { s: [-0.9, 0.5], e: [-1.0, 0], w: 0 }, head: [-0.12, 0] },
  // 2) backhand rear corner, in time: round-the-head (side-on, take it above the other shoulder, lean hard)
  rh1: { world: 1, px: -0.05, pz: -0.2, ry: 0.9, y: -0.08, fR: [0.15, 0.0, 0.05, 0.9], fL: [-0.2, -0.2, 0, 0.4], arm: 'ohPrep', free: 'point', head: [-0.4, -0.2] },
  rh2: { world: 1, px: -0.3, pz: -0.75, ry: 0.9, y: -0.06, fR: [-0.05, -0.85, 0, 0.9], fL: [-0.45, -0.45, 0.07, 0.4], arm: 'ohPrep', free: 'point', head: [-0.45, 0.1] },
  rh3: { world: 1, px: -0.55, pz: -1.3, ry: 0.9, y: -0.07, fR: [-0.3, -1.4, 0.07, 0.9], fL: [-0.6, -1.0, 0, 0.4], arm: 'ohPrep', free: 'point', head: [-0.5, 0.2] },
  rh4: { world: 1, px: -0.75, pz: -1.8, ry: 0.85, y: -0.13, cp: -0.15, cr: 0.1, fR: [-0.5, -2.05, 0, 0.9], fL: [-0.95, -1.6, 0, 0.4], arm: 'rhCock', free: 'point', head: [-0.55, 0.3] },
  rh5: { world: 1, px: -0.77, pz: -1.82, ry: 0.8, jump: 0.3, cp: -0.25, cr: -0.15, fR: [-0.52, -2.08, 0.12, 0.9], fL: [-0.95, -1.58, 0.06, 0.4], arm: 'rhCock', free: 'point', head: [-0.55, 0.35] },
  rh6: { world: 1, px: -0.78, pz: -1.82, ry: 0.4, jump: 0.35, cy: -0.3, cp: 0.05, cr: -0.45, fR: [-0.6, -1.65, 0.12, 0.3], fL: [-0.85, -2.1, 0.12, 0.3], arm: 'rhHit', free: { s: [-0.2, 0.3], e: [-0.6, 0], w: 0 }, head: [-0.4, 0.3] },
  rh7: { world: 1, px: -0.78, pz: -1.82, y: -0.17, pitch: 0.3, cr: -0.15, fR: [-0.6, -1.6, 0, 0.2], fL: [-0.95, -2.05, 0, 0.2], arm: 'follHi', free: { s: [-0.6, 0.6], e: [-1.2, 0], w: 0 }, head: [-0.05, 0] },
  rh8: { world: 1, px: -0.35, pz: -1.0, y: -0.08, pitch: 0.2, fR: [-0.15, -0.9, 0, 0.2], fL: [-0.55, -1.1, 0, -0.2], arm: 'ready', free: { s: [-0.9, 0.5], e: [-1.0, 0], w: 0 }, head: [-0.12, 0] },
  // 3) backhand rear corner, late: turn the back to the net, run, high backhand, turn back
  rb1: { world: 1, px: -0.1, pz: -0.2, ry: -1.4, y: -0.08, fR: [0.1, 0.05, 0.06, -1.2], fL: [-0.22, -0.15, 0, -1.0], arm: 'ready', free: { s: [-0.6, 0.6], e: [-1.0, 0], w: 0 }, head: [-0.3, 0.6] },
  rb2: { world: 1, px: -0.35, pz: -0.7, ry: -2.2, y: -0.06, pitch: 0.12, fR: [-0.55, -0.85, 0, -2.0], fL: [-0.2, -0.45, 0.07, -2.0], arm: 'ready', free: { s: [-0.4, 0.5], e: [-1.2, 0], w: 0 }, head: [-0.35, 0.8] },
  rb3: { world: 1, px: -0.6, pz: -1.25, ry: -2.3, y: -0.06, pitch: 0.12, fR: [-0.6, -0.9, 0.07, -2.1], fL: [-0.75, -1.45, 0, -2.1], arm: 'ready', free: { s: [-1.2, 0.5], e: [-1.2, 0], w: 0 }, head: [-0.4, 0.9] },
  rb4: { world: 1, px: -0.85, pz: -1.75, ry: -2.4, y: -0.12, cp: 0.12, fR: [-1.05, -2.05, 0, -2.3], fL: [-0.6, -1.4, 0, -2.0], arm: 'bhHiCock', free: { s: [-0.3, 0.3], e: [-0.6, 0], w: 0 }, head: [-0.45, 0.9] },
  rb5: { world: 1, px: -0.86, pz: -1.76, ry: -2.45, y: -0.15, cy: -0.35, cp: 0.15, fR: [-1.05, -2.05, 0, -2.3], fL: [-0.6, -1.4, 0, -2.0], arm: 'bhHiCock', free: { s: [-0.2, 0.25], e: [-0.5, 0], w: 0 }, head: [-0.5, 0.95] },
  rb6: { world: 1, px: -0.86, pz: -1.76, ry: -2.3, y: -0.04, cy: 0.35, cp: -0.1, fR: [-1.05, -2.05, 0.03, -2.3], fL: [-0.6, -1.4, 0, -2.0], arm: 'bhHiHit', free: { s: [-0.1, 0.4], e: [-0.4, 0], w: 0 }, head: [-0.45, 0.85] },
  rb7: { world: 1, px: -0.86, pz: -1.76, ry: -2.2, y: -0.06, cy: 0.45, fR: [-1.05, -2.05, 0, -2.3], fL: [-0.6, -1.4, 0, -2.0], arm: 'bhHiFoll', free: { s: [-0.2, 0.5], e: [-0.6, 0], w: 0 }, head: [-0.3, 0.6] },
  rb8: { world: 1, px: -0.75, pz: -1.6, ry: -1.0, y: -0.08, fR: [-0.9, -1.85, 0, -0.8], fL: [-0.5, -1.4, 0, -0.6], arm: 'ready', free: { s: [-0.7, 0.5], e: [-1.0, 0], w: 0 }, head: [-0.2, 0.3] },
  rb9: { world: 1, px: -0.35, pz: -1.0, y: -0.08, pitch: 0.2, fR: [-0.15, -0.9, 0, 0.2], fL: [-0.55, -1.1, 0, -0.2], arm: 'ready', free: { s: [-0.9, 0.5], e: [-1.0, 0], w: 0 }, head: [-0.12, 0] },
  // celebration
  cheerA:  { y: 0.0, pitch: -0.15, cp: -0.15, jump: 0.3, fR: [0.15, 0.02, 0.1, 0.2], fL: [0.15, -0.02, 0.12, -0.2], arm: 'cheer', free: 'up', head: [-0.4, 0] },
  cheerB:  { y: -0.16, pitch: 0.3, cp: 0.25, fR: [0.24, 0.04, 0, 0.3], fL: [0.24, -0.02, 0, -0.3], arm: { s: [-1.2, 0.3], e: [-2.2, 0], w: -0.6 }, free: { s: [-0.8, 0.5], e: [-2.2, 0], w: 0 }, head: [0.15, 0] },
};
// extra arm poses (racket arm) for the backhand; others come from the game's POSE table
const ARM_EXTRA = {
  bhHiCock: { s: [-2.6, -0.7], e: [-1.9, 0.2], w: -1.0 },  // high backhand: elbow up and pointing at the shuttle
  bhHiHit:  { s: [-3.0, 0.05], e: [-0.1, 0], w: 0.7 },
  bhHiFoll: { s: [-2.4, 0.5], e: [-0.3, 0], w: 1.0 },
  rhCock:   { s: [-2.95, -0.35], e: [-1.1, 0.4], w: -1.6 },   // round-the-head: racket drops behind the head
  rhHit:    { s: [-3.0, -0.5], e: [-0.15, -0.1], w: 0.1 },  // contact above the other shoulder

  ohPrep: { s: [-2.2, 1.25], e: [-1.6, 0.1], w: -0.5 },    // elbow up at shoulder height, racket head up behind the head

  bhCock: { s: [-1.55, -0.85], e: [-1.75, 0.2], w: -0.9 },
  bhHit:  { s: [-2.35, -0.15], e: [-0.25, 0.05], w: 0.55 },
  bhFoll: { s: [-2.1, 0.5], e: [-0.4, 0.2], w: 0.9 },
};

// clips: [time (s), pose, ease into this key]. 'contact' = time the racket meets the shuttle
const CLIPS = {
  ready:     { loop: true,  keys: [[0, 'ready'], [0.45, 'readyLo', 'io'], [0.9, 'ready', 'io']] },
  splitStep: { loop: false, keys: [[0, 'ready'], [0.12, 'splitUp', 'out'], [0.26, 'splitLand', 'in'], [0.6, 'ready', 'io']] },
  jumpSmash: { loop: false, contact: 0.62, keys: [[0, 'ready'], [0.22, 'ohTurn', 'io'], [0.38, 'ohLoad', 'io'], [0.52, 'ohAir', 'out'], [0.62, 'ohHit', 'whip'], [0.8, 'ohFoll', 'out'], [1.02, 'ohLand', 'in'], [1.45, 'ready', 'io']] },
  netLunge:  { loop: false, contact: 0.42, keys: [[0, 'ready'], [0.18, 'luStep', 'io'], [0.42, 'luDeep', 'out'], [0.62, 'luDeep'], [0.9, 'luBack', 'io'], [1.2, 'ready', 'io']] },
  backhand:  { loop: false, contact: 0.5, keys: [[0, 'ready'], [0.2, 'bhTurn', 'io'], [0.38, 'bhLoad', 'io'], [0.5, 'bhHit', 'whip'], [0.68, 'bhFoll', 'out'], [1.1, 'ready', 'io']] },
  rearForehand: { loop: false, contact: 0.9, keys: [[0, 'rf0'], [0.16, 'rf1', 'out'], [0.3, 'rf2'], [0.43, 'rf3'], [0.56, 'rf4'], [0.68, 'rf5', 'in'], [0.8, 'rf6', 'out'], [0.9, 'rf7', 'whip'], [1.06, 'rf8', 'in'], [1.6, 'rf9', 'io']] },
  roundHead:    { loop: false, contact: 0.82, keys: [[0, 'rf0'], [0.16, 'rh1', 'out'], [0.32, 'rh2'], [0.46, 'rh3'], [0.6, 'rh4', 'in'], [0.72, 'rh5', 'out'], [0.82, 'rh6', 'whip'], [1.0, 'rh7', 'in'], [1.5, 'rh8', 'io']] },
  rearBackhand: { loop: false, contact: 0.8, keys: [[0, 'rf0'], [0.15, 'rb1', 'out'], [0.3, 'rb2'], [0.44, 'rb3'], [0.58, 'rb4', 'in'], [0.7, 'rb5', 'io'], [0.8, 'rb6', 'whip'], [0.95, 'rb7', 'out'], [1.3, 'rb8', 'io'], [1.75, 'rb9', 'io']] },
  celebrate: { loop: false, keys: [[0, 'ready'], [0.18, 'cheerB', 'io'], [0.42, 'cheerA', 'out'], [0.66, 'cheerB', 'in'], [0.9, 'cheerA', 'out'], [1.15, 'cheerB', 'in'], [1.6, 'ready', 'io']] },
};
const EASE = {
  lin: (t) => t,
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  io: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  whip: (t) => 1 - Math.pow(1 - t, 4),            // explosive: most of the motion right away
};

// resolve a pose: arm names -> arm poses, 'up' etc. -> free-arm poses (from the game's tables)
let GAME = { POSE: {}, FREE: {}, setArm: null };
function armOf(v) { return typeof v === 'string' ? (ARM_EXTRA[v] || GAME.POSE[v]) : v; }
const FREE_EXTRA = { point: { s: [-2.75, 0.35], e: [-0.15, 0], w: 0 } };   // straight arm pointing up at the shuttle
function freeOf(v) { return typeof v === 'string' ? (FREE_EXTRA[v] || GAME.FREE[v]) : v; }
const Z = { y: 0, yaw: 0, pitch: 0, roll: 0, cy: 0, cp: 0, cr: 0, jump: 0, px: 0, pz: 0, ry: 0 };
function full(p) {
  const q = Object.assign({}, Z, p);
  q.arm = armOf(p.arm || 'ready'); q.free = freeOf(p.free || 'rest'); q.head = p.head || [0, 0];
  q.world = !!p.world;
  q.fR = p.fR || [0.18, 0.03, 0, 0.2]; q.fL = p.fL || [0.18, -0.02, 0, -0.2];
  return q;
}
const mixArm = (a, b, t) => ({ s: [lerp(a.s[0], b.s[0], t), lerp(a.s[1], b.s[1], t)], e: [lerp(a.e[0], b.e[0], t), lerp(a.e[1], b.e[1], t)], w: lerp(a.w, b.w, t), r: lerp(a.r || 0, b.r || 0, t) });
function mix(a, b, t) {
  const o = {};
  for (const k in Z) o[k] = lerp(a[k], b[k], t);
  o.fR = a.fR.map((v, i) => lerp(v, b.fR[i], t)); o.fL = a.fL.map((v, i) => lerp(v, b.fL[i], t));
  o.world = a.world || b.world;
  o.arm = mixArm(a.arm, b.arm, t); o.free = mixArm(a.free, b.free, t); o.head = [lerp(a.head[0], b.head[0], t), lerp(a.head[1], b.head[1], t)];
  return o;
}
// pose of a clip at time t
function sample(name, t) {
  const c = CLIPS[name];
  // Opt-in C1 bridge around contact: preserve the authored poses outside this
  // small window, matching both pose and velocity at its boundaries.
  const w = c.contactBlend;
  if (w && Math.abs(t - c.contact) < w) {
    const lo = c.contact - w, hi = c.contact + w, d = hi - lo, eps = 0.0001;
    const a = sampleRaw(c, lo), b = sampleRaw(c, hi);
    const ap = sampleRaw(c, lo + eps), am = sampleRaw(c, lo - eps);
    const bp = sampleRaw(c, hi + eps), bm = sampleRaw(c, hi - eps);
    const u = (t - lo) / d, u2 = u * u, u3 = u2 * u;
    const bridge = (a, b, ap, am, bp, bm) => {
      if (typeof a === 'number') return (2*u3-3*u2+1)*a + (-2*u3+3*u2)*b
        + (u3-2*u2+u)*d*(ap-am)/(2*eps) + (u3-u2)*d*(bp-bm)/(2*eps);
      if (typeof a === 'boolean') return a || b;
      const out = Array.isArray(a) ? [] : {};
      for (const k in a) out[k] = bridge(a[k], b[k], ap[k], am[k], bp[k], bm[k]);
      return out;
    };
    return bridge(a, b, ap, am, bp, bm);
  }
  return sampleRaw(c, t);
}
function sampleRaw(c, t) {
  const ks = c.keys, end = ks[ks.length - 1][0];
  if (c.loop) t = ((t % end) + end) % end; else t = clamp(t, 0, end);
  let i = 0; while (i < ks.length - 2 && t > ks[i + 1][0]) i++;
  const [t0, p0] = ks[i], [t1, p1, e] = ks[i + 1];
  const u = t1 > t0 ? clamp((t - t0) / (t1 - t0), 0, 1) : 1;
  return mix(full(P[p0]), full(P[p1]), (EASE[e || 'io'] || EASE.io)(u));
}
const clipLength = (name) => { const ks = CLIPS[name].keys; return ks[ks.length - 1][0]; };

// ------------------------------------------------------------------ apply a pose to a rigged model
const tgt = new T.Vector3();
function apply(mdl, q, opt) {
  opt = opt || {};
  const h = mdl.h;                       // -1 = right-handed (racket on -x), +1 = left-handed
  const R = mdl.rig;
  // hips: height, turn, lean
  // pose drops are authored for a 0.19 m leg; scale to this character and never fold the leg more than ~half
  const legL = R.legs[0].L1 + R.legs[0].L2;
  const drop = q.y < 0 ? -Math.min(-q.y * 0.4 * (legL / 0.19), legL * 0.45) : q.y;
  R.hips.position.y = R.hipY + drop + (opt.noJump ? 0 : q.jump);
  R.hips.rotation.set(q.pitch, q.yaw * h, q.roll * -h, 'YXZ');
  R.chest.rotation.set(q.cp, q.cy * h, q.cr * -h, 'YXZ');
  mdl.head.rotation.x = q.head[0]; mdl.head.rotation.y = q.head[1] * h;
  // whole-body travel / turn (court-relative), for clips that move: px + = toward the racket side, pz + = toward the net
  const B = opt.base;
  if (B) {
    mdl.root.position.x = B.x + q.px * h * B.sc;
    mdl.root.position.z = B.z + q.pz * B.sc;
    mdl.root.rotation.y = B.ry + q.ry * h;
    mdl.root.updateMatrixWorld(true);
  }
  // feet: body space (racket-side foot on the racket side), or court space when the clip travels
  const targets = R.legs.map((leg) => {
    const f = leg.side === h ? q.fR : q.fL;
    const lift = R.ankleY + f[2] + (opt.noJump ? 0 : q.jump);
    const v = new T.Vector3();
    if (q.world && B) {
      v.set(B.x + f[0] * h * B.sc, 0, B.z + f[1] * B.sc);
      mdl.body.worldToLocal(v); v.y = lift;
    } else v.set(leg.side * f[0], lift, f[1]);
    const fp = -Math.min(0.35, Math.max(0, f[2] - 0.02) * 4);   // toe points down as the foot lifts
    v.y += Math.sin(-fp) * 0.13;                                 // ...without dipping the toe into the floor
    return { leg, v, pitch: fp, yaw: f[3] * -h };
  });
  // wide stances / long lunges: drop the hips just enough for both feet to reach (like a real deep lunge)
  let extra = 0;
  for (let it = 0; it < 9; it++) {
    let worst = 0;
    for (const o of targets) { legIK(mdl, o.leg, o.v, o.pitch, o.yaw); worst = Math.max(worst, o.leg.reachErr || 0); }
    if (worst < 0.004) break;
    if (extra < legL * 0.5) { const d = Math.min(worst * 0.9, legL * 0.5 - extra); R.hips.position.y -= d; extra += d; continue; }
    // still too far for these short legs: shorten the step (pull the foot in toward the hip, keep it on the floor)
    for (const o of targets) {
      if ((o.leg.reachErr || 0) < 0.004) continue;
      o.leg.thigh.getWorldPosition(tmpB); mdl.body.worldToLocal(tmpB);
      const dx = o.v.x - tmpB.x, dz = o.v.z - tmpB.z, hd = Math.hypot(dx, dz) || 1;
      const k = Math.max(0, (hd - o.leg.reachErr * 1.15) / hd);
      o.v.x = tmpB.x + dx * k; o.v.z = tmpB.z + dz * k;
    }
  }
  const kneeMin = 0.085 / (mdl.body.getWorldScale(tmpB).y || 1);   // knee centre must stay a shin-radius above the floor (body units)
  for (let it = 0; it < 4; it++) {
    let low = 9;
    for (const o of targets) { o.leg.knee.getWorldPosition(tmpA); mdl.body.worldToLocal(tmpA); low = Math.min(low, tmpA.y); }
    if (low >= kneeMin) break;
    R.hips.position.y += (kneeMin - low) * 1.1;
    for (const o of targets) legIK(mdl, o.leg, o.v, o.pitch, o.yaw);
  }
  if (GAME.setArm) { GAME.setArm(mdl, 'arm', q.arm, 0, 0); GAME.setArm(mdl, 'free', q.free, 0, 0); }
  racketGuard(mdl);
}

// keep the racket out of the floor and out of the head (safety net for every pose)
const RK = [[0, -0.34], [0, -0.53], [0, -0.71], [0, -0.87], [0.12, -0.71], [-0.12, -0.71]].map(([x, y]) => new T.Vector3(x, y, 0)), rp = new T.Vector3(), hcen = new T.Vector3(), hsc = new T.Vector3();
function racketLow(mdl) { mdl.root.updateMatrixWorld(true); let mn = 9; for (const p of RK) { rp.copy(p); mdl.wrist.localToWorld(rp); mn = Math.min(mn, rp.y); } return mn; }
function racketInHead(mdl) {
  const hs = mdl.head.children[0]; if (!hs || !hs.children[0]) return 0;
  const sk = hs.children[0];
  hs.getWorldPosition(hcen); hs.getWorldScale(hsc);
  const r = 0.34 * hsc.x * Math.min(sk.scale.x, sk.scale.y, sk.scale.z) * 0.95;
  let worst = 0;
  for (const p of RK) { rp.copy(p); mdl.wrist.localToWorld(rp); worst = Math.max(worst, r - rp.distanceTo(hcen)); }
  return worst;
}
function racketGuard(mdl) {
  // greedy search over a few joints: each step pick the nudge that best gets the racket out of the floor / head
  const cost = () => Math.max(0, racketInHead(mdl) + 0.01) + Math.max(0, 0.05 - racketLow(mdl));
  let c = cost(); if (c <= 0) return;
  const J = [[mdl.wrist.rotation, 'x'], [mdl.arm.rotation, 'x'], [mdl.arm.rotation, 'z'], [mdl.armEl.rotation, 'x']];
  const start = J.map(([o, k]) => o[k]);
  for (let it = 0; it < 24 && c > 0; it++) {
    let best = null;
    for (let j = 0; j < J.length; j++) for (const d of [0.15, -0.15]) {
      const [o, k] = J[j], v0 = o[k];
      if (Math.abs(v0 + d - start[j]) > 1.4) continue;
      if (j === 3 && v0 + d > 0.05) continue;              // elbow never bends backwards
      o[k] = v0 + d; const cc = cost(); o[k] = v0;
      if (!best || cc < best[0]) best = [cc, j, d];
    }
    if (!best || best[0] >= c - 1e-4) break;
    const [o, k] = J[best[1]]; o[k] += best[2]; c = best[0];
  }
}

// move packs (anim_*.js) add their poses / arm poses / clips here. Clip extras: label (Vietnamese name), group, contact.
function register(pack) {
  Object.assign(P, pack.poses || {}); Object.assign(ARM_EXTRA, pack.arms || {}); Object.assign(FREE_EXTRA, pack.free || {});
  for (const k in pack.clips || {}) { if (CLIPS[k]) console.warn('SPAnim: clip name reused', k); CLIPS[k] = pack.clips[k]; }
}
root.SPAnim = { armOf, pivot, legIK, apply, sample, clipLength, register, CLIPS, POSES: P, ARM_EXTRA, FREE_EXTRA, EASE, init(g) { GAME = Object.assign(GAME, g); } };
})(typeof self !== 'undefined' ? self : this);
