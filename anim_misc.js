/* Shuttle Paws v2 move pack: misc — serves & receive, footwork, doubles stances, trick shots, non-play gestures
   (docs/MOVES.md sections B, D, E, F, G). Registered into SPAnim. Right-handed definitions, mirrored automatically. */
(function () {
'use strict';
if (!window.SPAnim) return;

const W = (o) => Object.assign({ world: 1 }, o);   // travelling pose (court-space feet)
const RF = { s: [-0.9, 0.5], e: [-1.0, 0], w: 0 };  // relaxed free arm in front (balance)

// ---------------------------------------------------------------- arm poses (racket arm)
const arms = {
  misc_bhServeSet:  { s: [-0.55, -0.21], e: [-0.89, -0.6], w: 0.06 },  // racket across the waist, head down, ready to push
  misc_bhServePush: { s: [-1.13, -0.83], e: [-0.28, 0.34], w: -0.09 },   // short push: forearm forward, wrist firm
  misc_bhFlick:     { s: [-1.6, -0.56], e: [-0.13, 0.26], w: -0.79 },     // sudden wrist flick up
  misc_fhServeBack: { s: [1.5, 0.14], e: [-1.26, 0.48], w: 1.31 },      // long take-back for the high serve
  misc_fhHighHit:   { s: [-0.94, 0.02], e: [-0.02, 0.24], w: -0.67 },       // underarm contact in front of the front foot
  misc_fhHighFoll:  { s: [-2.6, -0.55], e: [-0.4, 0.2], w: -0.6 },      // big follow-through over the other shoulder
  misc_fhShortSet:  { s: [0.17, 0.99], e: [-0.26, -0.6], w: 1.63 },         // compact take-back
  misc_fhShortHit:  { s: [-0.69, 0.14], e: [-0.74, -0.04], w: -0.11 },
  misc_driveHit:    { s: [-0.84, 0.17], e: [-0.74, 0.22], w: -0.08 },     // flat fast underarm
  misc_rcvUp:       { s: [-1.55, 0.55], e: [-1.2, 0.2], w: -0.5 },      // doubles receive / front court: racket high in front
  misc_defLow:      { s: [-0.85, -0.25], e: [-1.15, 0.2], w: -0.35 },   // defence: racket low in front, backhand grip
  misc_twHit:       { s: [-0.07, -0.38], e: [-0.02, -0.01], w: 1.02 },        // tweener: racket swings back between the legs
  misc_twBack:      { s: [-0.32, 0.08], e: [-0.69, -0.6], w: -1.33 },         // tweener wind-up in front
  misc_bbCock:      { s: [0.2, 0.35], e: [-1.7, 0.1], w: 0.3 },         // behind-the-back: racket taken behind the hips
  misc_bbHit:       { s: [0.75, -0.25], e: [-1.9, 0.35], w: 1.0 },      // flick across behind the back
  misc_strings:     { s: [-1.25, 0.15], e: [-1.6, 0.05], w: -1.5 },     // racket face held up in front of the face
  misc_hangDown:    { s: [-0.29, 0.15], e: [-0.22, 0.32], w: -1.48 }  /* racket held loosely, head off the floor */,        // racket hanging, disappointed
  misc_scoop:       { s: [-0.29, 0.15], e: [-0.22, 0.32], w: -1.48 },        // racket low to scoop the shuttle
  misc_toss:        { s: [-1.6, 0.25], e: [-0.6, 0.1], w: -0.6 },       // tossing the shuttle over with the racket
  misc_shake:       { s: [-0.29, 0.15], e: [-0.22, 0.32], w: -1.48 },        // racket held to the side while shaking hands
  misc_hsMid:       { s: [-4.16, 0.46], e: [-1.79, 0.6], w: 1.78 },   // high serve: racket coming down behind
  misc_hsLow:       { s: [0.21, 0.81], e: [0.05, -0.6], w: -1.75 },   // bottom of the underarm swing, head kept off the floor
  misc_lungeReach:  { s: [-1.02, 0.38], e: [-0.06, -0.14], w: -1.02 },
  misc_spFoll:      { s: [-1.05, -0.53], e: [-0.07, -0.6], w: -0.37 },
  misc_trophyR:     { s: [-3.0, 0.4], e: [-0.4, 0.1], w: -0.2 },
};
// ---------------------------------------------------------------- free arm poses
const free = {
  misc_holdFeathers: { s: [-1.25, -0.15], e: [-0.7, -0.35], w: 0 },  // shuttle held by the feathers in front of the waist
  misc_release:      { s: [-0.7, 0.25], e: [-0.5, 0], w: 0 },        // hand drops away after letting go
  misc_balanceBack:  { s: [0.6, 0.9], e: [-0.3, 0], w: 0 },          // arm thrown back for balance
  misc_pump:         { s: [-1.4, 0.3], e: [-1.6, 0], w: 0 },         // running arm swing (front)
  misc_pumpB:        { s: [0.5, 0.3], e: [-1.3, 0], w: 0 },          // running arm swing (back)
  misc_forehead:     { s: [-2.35, 0.95], e: [-2.1, 0], w: 0 },       // wiping the forehead
  misc_foreheadB:    { s: [-2.2, 0.35], e: [-2.0, 0], w: 0 },
  misc_reachFloor:   { s: [-1.0, 0.3], e: [-0.1, 0], w: 0 },
  misc_toStrings:    { s: [-1.45, -0.35], e: [-1.3, -0.2], w: 0 },
  misc_protest:      { s: [-2.2, 1.1], e: [-0.6, 0], w: 0 },         // hand raised to the umpire
  misc_shakeHand:    { s: [-1.35, 0.15], e: [-0.25, 0], w: 0 },      // hand out over the net
  misc_trophyL:      { s: [-3.0, 0.35], e: [-0.4, 0], w: 0 },
  misc_reachSwitch:  { s: [-1.55, 1.35], e: [-0.1, 0], w: 0 },       // emergency reach on the backhand side
};

// ---------------------------------------------------------------- poses
const poses = {
  // ---- serves
  misc_hsSet:   { y: -0.04, yaw: 0.9, pitch: 0.05, fR: [0.16, -0.18, 0, 0.9], fL: [0.12, 0.16, 0, 0.45], arm: 'serve', free: 'hold', head: [0.15, -0.6] },
  misc_hsBack:  { y: -0.07, yaw: 1.0, pitch: 0.02, cy: 0.15, fR: [0.16, -0.18, 0, 0.9], fL: [0.12, 0.16, 0, 0.45], arm: 'misc_fhServeBack', free: 'misc_release', head: [0.3, -0.6] },
  misc_hsHit:   { y: -0.06, yaw: 0.35, pitch: 0.15, cy: -0.2, fR: [0.16, -0.18, 0.02, 0.6], fL: [0.12, 0.16, 0, 0.45], arm: 'misc_fhHighHit', free: RF, head: [0.35, -0.2] },
  misc_hsFoll:  { y: -0.03, yaw: -0.2, pitch: 0.12, cy: -0.35, fR: [0.15, -0.12, 0.05, 0.3], fL: [0.12, 0.16, 0, 0.4], arm: 'misc_fhHighFoll', free: { s: [-0.5, 0.7], e: [-1.0, 0], w: 0 }, head: [-0.1, 0] },
  misc_bsSet:   { y: -0.08, pitch: 0.22, cp: 0.05, fR: [0.12, 0.14, 0, 0.1], fL: [0.14, -0.14, 0, -0.1], arm: 'misc_bhServeSet', free: 'misc_holdFeathers', head: [0.25, 0] },
  misc_bsPush:  { y: -0.07, pitch: 0.24, cp: 0.06, fR: [0.12, 0.14, 0, 0.1], fL: [0.14, -0.14, 0.01, -0.1], arm: 'misc_bhServePush', free: 'misc_release', head: [0.15, 0] },
  misc_bsFlick: { y: -0.04, pitch: 0.16, cp: -0.05, fR: [0.12, 0.14, 0, 0.1], fL: [0.14, -0.14, 0.02, -0.1], arm: 'misc_bhFlick', free: 'misc_release', head: [-0.2, 0] },
  misc_fsSet:   { y: -0.06, yaw: 0.6, pitch: 0.12, fR: [0.16, -0.14, 0, 0.7], fL: [0.12, 0.14, 0, 0.35], arm: 'misc_fhShortSet', free: 'hold', head: [0.25, -0.4] },
  misc_fsHit:   { y: -0.06, yaw: 0.35, pitch: 0.16, fR: [0.16, -0.14, 0, 0.6], fL: [0.12, 0.14, 0, 0.35], arm: 'misc_fhShortHit', free: 'misc_release', head: [0.2, -0.2] },
  misc_ffFlick: { y: -0.04, yaw: 0.2, pitch: 0.1, cy: -0.15, fR: [0.16, -0.14, 0.02, 0.5], fL: [0.12, 0.14, 0, 0.35], arm: 'follLo', free: RF, head: [-0.15, 0] },
  misc_dsHit:   { y: -0.07, yaw: 0.25, pitch: 0.2, cy: -0.25, fR: [0.16, -0.12, 0.02, 0.5], fL: [0.12, 0.16, 0, 0.35], arm: 'misc_driveHit', free: RF, head: [0.1, -0.1] },
  misc_hsMidP:  { y: -0.06, yaw: 0.95, pitch: 0.03, fR: [0.16, -0.18, 0, 0.9], fL: [0.12, 0.16, 0, 0.45], arm: 'misc_hsMid', free: 'misc_release', head: [0.25, -0.6] },
  misc_hsLowP:  { y: -0.07, yaw: 0.65, pitch: 0.1, cy: -0.05, fR: [0.16, -0.18, 0.01, 0.75], fL: [0.12, 0.16, 0, 0.45], arm: 'misc_hsLow', free: RF, head: [0.35, -0.4] },
  misc_ritA:    { y: -0.03, pitch: 0.05, fR: [0.15, 0.02, 0, 0.3], fL: [0.15, -0.02, 0, -0.2], arm: 'misc_strings', free: 'misc_toStrings', head: [0.3, 0] },
  misc_ritB:    { y: -0.02, pitch: -0.05, cp: -0.08, fR: [0.15, 0.02, 0, 0.3], fL: [0.15, -0.02, 0, -0.2], arm: 'misc_bhServeSet', free: 'misc_holdFeathers', head: [-0.15, 0] },
  // ---- receive / doubles stances
  misc_rcvS:    { y: -0.1, yaw: 0.35, pitch: 0.25, cp: 0.08, fR: [0.2, -0.16, 0, 0.5], fL: [0.17, 0.18, 0, 0.1], arm: 'ready', free: RF, head: [-0.15, -0.2] },
  misc_rcvS2:   { y: -0.13, yaw: 0.35, pitch: 0.28, cp: 0.1, fR: [0.2, -0.16, 0, 0.5], fL: [0.17, 0.18, 0, 0.1], arm: 'ready', free: RF, head: [-0.18, -0.2] },
  misc_rcvD:    { y: -0.16, yaw: 0.2, pitch: 0.42, cp: 0.12, fR: [0.2, -0.24, 0, 0.3], fL: [0.16, 0.28, 0, 0.05], arm: 'misc_rcvUp', free: { s: [-1.3, 0.55], e: [-1.4, 0], w: 0 }, head: [-0.3, -0.1] },
  misc_rcvD2:   { y: -0.18, yaw: 0.2, pitch: 0.45, cp: 0.13, fR: [0.2, -0.24, 0, 0.3], fL: [0.16, 0.28, 0, 0.05], arm: 'misc_rcvUp', free: { s: [-1.3, 0.55], e: [-1.4, 0], w: 0 }, head: [-0.32, -0.1] },
  misc_atkF:    { y: -0.13, pitch: 0.32, cp: 0.12, fR: [0.2, 0.06, 0, 0.25], fL: [0.2, -0.04, 0, -0.2], arm: 'misc_rcvUp', free: { s: [-1.2, 0.5], e: [-1.3, 0], w: 0 }, head: [-0.25, 0] },
  misc_atkF2:   { y: -0.16, pitch: 0.35, cp: 0.12, fR: [0.21, 0.06, 0, 0.25], fL: [0.21, -0.04, 0, -0.2], arm: 'misc_rcvUp', free: { s: [-1.2, 0.5], e: [-1.3, 0], w: 0 }, head: [-0.27, 0] },
  misc_atkB:    { y: -0.07, yaw: 0.8, pitch: 0.05, cy: 0.2, cp: -0.08, fR: [0.15, -0.16, 0, 0.85], fL: [0.13, 0.12, 0, 0.45], arm: 'ohPrep', free: 'point', head: [-0.35, -0.5] },
  misc_atkB2:   { y: -0.1, yaw: 0.8, pitch: 0.07, cy: 0.2, cp: -0.08, fR: [0.15, -0.16, 0, 0.85], fL: [0.13, 0.12, 0, 0.45], arm: 'ohPrep', free: 'point', head: [-0.38, -0.5] },
  misc_def:     { y: -0.2, pitch: 0.38, cp: 0.14, fR: [0.27, 0.02, 0, 0.45], fL: [0.27, 0.0, 0, -0.45], arm: 'misc_defLow', free: { s: [-0.7, 0.6], e: [-1.2, 0], w: 0 }, head: [-0.2, 0] },
  misc_def2:    { y: -0.23, pitch: 0.4, cp: 0.15, fR: [0.27, 0.02, 0, 0.45], fL: [0.27, 0.0, 0, -0.45], arm: 'misc_defLow', free: { s: [-0.7, 0.6], e: [-1.2, 0], w: 0 }, head: [-0.22, 0] },

  // ---- footwork (travel). px + = racket side, pz + = toward the net
  misc_c0:  W({ y: -0.1, pitch: 0.22, fR: [0.2, 0.02, 0, 0.25], fL: [-0.2, -0.02, 0, -0.2], arm: 'ready', free: RF, head: [-0.12, 0] }),
  misc_cR1: W({ px: 0.18, y: -0.08, pitch: 0.2, cr: 0.05, fR: [0.45, 0.02, 0.06, 0.3], fL: [-0.12, -0.02, 0, -0.2], arm: 'ready', free: RF, head: [-0.12, 0] }),
  misc_cR2: W({ px: 0.38, y: -0.12, pitch: 0.2, fR: [0.55, 0.02, 0, 0.3], fL: [0.2, -0.02, 0.05, -0.2], arm: 'ready', free: RF, head: [-0.12, 0] }),
  misc_cR3: W({ px: 0.6, y: -0.08, pitch: 0.2, cr: 0.05, fR: [0.85, 0.02, 0.06, 0.3], fL: [0.32, -0.02, 0, -0.2], arm: 'ready', free: RF, head: [-0.12, 0] }),
  misc_cR4: W({ px: 0.85, y: -0.2, pitch: 0.28, cr: 0.15, fR: [1.15, 0.05, 0, 0.6], fL: [0.45, -0.02, 0, -0.2], arm: 'cockMid', free: RF, head: [-0.15, -0.3] }),
  misc_cL1: W({ px: -0.18, y: -0.08, pitch: 0.2, cr: -0.05, fR: [0.12, 0.02, 0, 0.25], fL: [-0.45, -0.02, 0.06, -0.3], arm: 'ready', free: RF, head: [-0.12, 0] }),
  misc_cL2: W({ px: -0.38, y: -0.12, pitch: 0.2, fR: [-0.2, 0.02, 0.05, 0.25], fL: [-0.55, -0.02, 0, -0.3], arm: 'ready', free: RF, head: [-0.12, 0] }),
  misc_cL3: W({ px: -0.6, y: -0.08, pitch: 0.2, cr: -0.05, fR: [-0.32, 0.02, 0, 0.25], fL: [-0.85, -0.02, 0.06, -0.3], arm: 'ready', free: RF, head: [-0.12, 0] }),
  misc_cL4: W({ px: -0.85, y: -0.2, yaw: -0.5, pitch: 0.28, cr: -0.15, fR: [-1.15, 0.12, 0, -0.6], fL: [-0.45, -0.05, 0, -0.4], arm: 'misc_defLow', free: { s: [0.3, 0.7], e: [-0.4, 0], w: 0 }, head: [-0.15, 0.3] }),
  // diagonal forward to the forehand net corner (run, run, lunge)
  misc_dF1: W({ px: 0.15, pz: 0.25, ry: 0.35, y: -0.08, pitch: 0.3, fR: [0.35, 0.38, 0.07, 0.6], fL: [-0.1, 0.0, 0, 0.1], arm: 'ready', free: 'misc_pump', head: [-0.2, -0.2] }),
  misc_dF2: W({ px: 0.38, pz: 0.6, ry: 0.4, y: -0.08, pitch: 0.32, fR: [0.4, 0.42, 0, 0.6], fL: [0.32, 0.72, 0.07, 0.4], arm: 'ready', free: 'misc_pumpB', head: [-0.2, -0.2] }),
  misc_dF3: W({ px: 0.6, pz: 0.95, ry: 0.35, y: -0.24, pitch: 0.42, cp: 0.12, fR: [0.85, 1.4, 0, 0.5], fL: [0.32, 0.55, 0, -0.2], arm: 'misc_lungeReach', free: 'misc_balanceBack', head: [-0.35, -0.1] }),
  // diagonal backward to the backhand rear corner (side-on, cross-behind step)
  misc_dB1: W({ px: -0.12, pz: -0.25, ry: -0.6, y: -0.08, pitch: 0.12, fR: [0.08, -0.05, 0.05, -0.5], fL: [-0.32, -0.38, 0, -0.6], arm: 'ready', free: RF, head: [-0.3, 0.5] }),
  misc_dB2: W({ px: -0.35, pz: -0.7, ry: -0.75, y: -0.06, pitch: 0.1, fR: [-0.3, -0.85, 0, -0.6], fL: [-0.3, -0.4, 0.07, -0.6], arm: 'ready', free: RF, head: [-0.35, 0.55] }),
  misc_dB3: W({ px: -0.6, pz: -1.15, ry: -0.8, y: -0.13, pitch: 0.08, fR: [-0.5, -0.95, 0, -0.6], fL: [-0.85, -1.4, 0, -0.7], arm: 'bhHiCock', free: RF, head: [-0.45, 0.6] }),
  // turn and chase (back to the net)
  misc_ch1: W({ px: 0.02, pz: -0.2, ry: 1.6, y: -0.06, pitch: 0.15, fR: [0.12, -0.05, 0.05, 1.5], fL: [-0.16, -0.25, 0, 1.4], arm: 'ready', free: 'misc_pump', head: [-0.3, -0.9] }),
  misc_ch2: W({ px: 0.05, pz: -0.65, ry: 3.0, y: -0.05, pitch: 0.3, fR: [0.12, -0.85, 0, 3.0], fL: [-0.1, -0.45, 0.08, 3.0], arm: 'misc_hangDown', free: 'misc_pumpB', head: [-0.2, -1.0] }),
  misc_ch3: W({ px: 0.05, pz: -1.15, ry: 3.1, y: -0.05, pitch: 0.32, fR: [0.12, -0.9, 0.08, 3.1], fL: [-0.1, -1.45, 0, 3.1], arm: 'misc_hangDown', free: 'misc_pump', head: [-0.2, -1.0] }),
  misc_ch4: W({ px: 0.05, pz: -1.65, ry: 3.1, y: -0.05, pitch: 0.32, fR: [0.12, -1.95, 0, 3.1], fL: [-0.1, -1.45, 0.08, 3.1], arm: 'misc_hangDown', free: 'misc_pumpB', head: [-0.2, -1.0] }),
  // brake on the outside foot, then push back to the centre
  misc_br0: W({ px: 0.0, y: -0.08, pitch: 0.2, cr: 0.1, fR: [0.25, 0.02, 0.06, 0.3], fL: [-0.18, -0.02, 0, -0.2], arm: 'ready', free: RF, head: [-0.12, 0] }),
  misc_br1: W({ px: 0.45, y: -0.22, pitch: 0.18, roll: -0.12, cr: -0.12, fR: [0.95, 0.02, 0, 0.9], fL: [0.12, -0.02, 0, -0.2], arm: 'cockMid', free: 'misc_balanceBack', head: [-0.12, 0] }),
  misc_br2: W({ px: 0.38, y: -0.14, pitch: 0.2, roll: 0.1, fR: [0.95, 0.02, 0, 0.9], fL: [0.12, -0.02, 0.04, -0.2], arm: 'ready', free: RF, head: [-0.12, 0] }),
  misc_br3: W({ px: 0.0, y: -0.1, pitch: 0.22, fR: [0.2, 0.02, 0, 0.25], fL: [-0.2, -0.02, 0, -0.2], arm: 'ready', free: RF, head: [-0.12, 0] }),
  // slip on a slippery court
  misc_sl1: W({ px: 0.3, y: -0.12, pitch: 0.15, roll: -0.1, fR: [0.7, 0.05, 0, 0.5], fL: [0.0, -0.02, 0, -0.2], arm: 'ready', free: RF, head: [-0.12, 0] }),
  misc_sl2: W({ px: 0.42, y: -0.3, pitch: -0.15, roll: 0.25, cr: 0.2, fR: [1.15, 0.12, 0, 0.6], fL: [0.05, -0.05, 0, -0.2], arm: { s: [-1.6, 1.2], e: [-0.4, 0], w: 0 }, free: { s: [-1.8, 1.3], e: [-0.3, 0], w: 0 }, head: [0.2, 0.2] }),
  misc_sl3: W({ px: 0.42, y: -0.22, pitch: 0.25, roll: -0.15, cr: -0.15, fR: [1.05, 0.1, 0, 0.6], fL: [0.12, -0.04, 0, -0.2], arm: { s: [-1.2, 1.0], e: [-0.8, 0], w: 0 }, free: { s: [-1.0, 1.1], e: [-0.6, 0], w: 0 }, head: [-0.1, -0.1] }),
  misc_sl4: W({ px: 0.2, y: -0.1, pitch: 0.22, fR: [0.4, 0.02, 0, 0.25], fL: [0.02, -0.02, 0, -0.2], arm: 'ready', free: RF, head: [-0.12, 0] }),

  // ---- trick shots
  // tweener: chase back to the base line with the back to the net, legs wide, swing between the legs
  misc_tw1: W({ px: 0.0, pz: -0.4, ry: 3.0, y: -0.06, pitch: 0.28, fR: [0.12, -0.6, 0, 3.0], fL: [-0.12, -0.25, 0.07, 3.0], arm: 'misc_hangDown', free: 'misc_pump', head: [-0.1, 0] }),
  misc_tw2: W({ px: 0.0, pz: -1.2, ry: 3.1, y: -0.06, pitch: 0.3, fR: [0.12, -1.0, 0.07, 3.1], fL: [-0.12, -1.45, 0, 3.1], arm: 'misc_twBack', free: 'misc_pumpB', head: [0.25, 0] }),
  misc_tw3: W({ px: 0.0, pz: -1.65, ry: 3.14, y: -0.18, pitch: 0.3, cp: 0.35, fR: [0.24, -1.7, 0, 2.9], fL: [-0.24, -1.6, 0, 3.4], arm: 'misc_twBack', free: 'misc_balanceBack', head: [0.55, 0] }),
  misc_tw4: W({ px: 0.0, pz: -1.7, ry: 3.14, y: -0.2, pitch: 0.32, cp: 0.4, fR: [0.25, -1.72, 0, 2.9], fL: [-0.25, -1.62, 0, 3.4], arm: 'misc_twHit', free: 'misc_balanceBack', head: [0.6, 0] }),
  misc_tw5: W({ px: 0.0, pz: -1.85, ry: 2.6, y: -0.08, pitch: 0.3, fR: [0.2, -1.95, 0.06, 2.6], fL: [-0.22, -1.65, 0, 3.0], arm: 'misc_hangDown', free: RF, head: [-0.2, -0.8] }),
  misc_tw6: W({ px: 0.0, pz: -1.4, ry: 0.0, y: -0.1, pitch: 0.22, fR: [0.2, -1.38, 0, 0.25], fL: [-0.2, -1.42, 0, -0.2], arm: 'ready', free: RF, head: [-0.12, 0] }),
  // behind-the-back on the backhand side
  misc_bb1: { y: -0.1, yaw: -0.35, pitch: 0.2, cy: -0.2, fR: [0.18, 0.05, 0, 0.2], fL: [0.26, -0.08, 0, -0.6], arm: 'misc_bbCock', free: { s: [-1.1, 0.7], e: [-0.8, 0], w: 0 }, head: [-0.2, 0.9] },
  misc_bb2: { y: -0.14, yaw: -0.5, pitch: 0.28, cy: -0.25, cr: -0.12, fR: [0.18, 0.05, 0, 0.2], fL: [0.3, -0.1, 0, -0.7], arm: 'misc_bbHit', free: { s: [-1.3, 0.9], e: [-0.6, 0], w: 0 }, head: [-0.2, 1.1] },
  misc_bb3: { y: -0.1, yaw: -0.2, pitch: 0.2, fR: [0.18, 0.05, 0, 0.2], fL: [0.26, -0.08, 0, -0.5], arm: 'misc_hangDown', free: RF, head: [-0.15, 0.6] },
  // rolling dive save
  misc_rd1: { y: -0.15, yaw: -0.3, pitch: 0.45, fR: [0.3, 0.3, 0, 0.3], fL: [0.2, -0.2, 0, -0.2], arm: 'hitLo', free: 'misc_balanceBack', head: [-0.3, 0] },
  misc_rd2: { y: -0.34, yaw: -0.4, pitch: 1.2, roll: 0.25, fR: [0.3, -0.25, 0.1, 0.3], fL: [0.2, -0.45, 0.18, -0.2], arm: 'dive', free: 'dive', head: [-0.9, 0] },
  misc_rd3: { y: -0.4, yaw: -1.6, pitch: 1.35, roll: 0.9, fR: [0.15, -0.3, 0.2, 0.3], fL: [0.1, -0.35, 0.25, -0.2], arm: 'misc_hangDown', free: { s: [-1.5, 1.4], e: [-0.4, 0], w: 0 }, head: [-0.6, 0] },
  misc_rd4: { y: -0.3, yaw: -0.8, pitch: 0.9, roll: 0.3, fR: [0.25, 0.05, 0, 0.3], fL: [0.2, -0.3, 0.05, -0.2], arm: 'misc_hangDown', free: 'misc_reachFloor', head: [-0.3, 0] },
  misc_rd5: { y: -0.1, pitch: 0.25, fR: [0.2, 0.04, 0, 0.25], fL: [0.2, -0.02, 0, -0.2], arm: 'ready', free: RF, head: [-0.12, 0] },
  // 360° spinning jump smash
  misc_sp1: W({ y: -0.16, yaw: 0.2, pitch: 0.1, cp: -0.15, fR: [0.2, -0.05, 0, 0.3], fL: [0.2, 0.05, 0, -0.1], arm: 'ohPrep', free: 'point', head: [-0.5, 0] }),
  misc_sp2: W({ ry: -2.4, jump: 0.5, cy: 0.3, cp: -0.3, fR: [0.15, -0.05, 0.15, -2.2], fL: [0.12, 0.05, 0.1, -2.4], arm: 'cockHi', free: 'point', head: [-0.55, 0.4] }),
  misc_sp3: W({ ry: -4.9, jump: 0.6, cy: 0.4, cp: -0.35, cr: 0.15, fR: [0.15, -0.05, 0.16, -4.7], fL: [0.12, 0.05, 0.12, -4.9], arm: 'cockHi', free: 'point', head: [-0.6, -0.5] }),
  misc_sp4: W({ ry: -6.28, jump: 0.62, pitch: 0.15, cy: -0.35, cp: 0.15, cr: -0.1, fR: [0.12, 0.12, 0.12, -6.0], fL: [0.12, -0.15, 0.15, -6.3], arm: 'hitHi', free: { s: [-0.6, 0.6], e: [-1.4, 0], w: 0 }, head: [-0.35, 0] }),
  misc_sp5: W({ ry: -6.28, y: -0.2, pitch: 0.4, cp: 0.15, fR: [0.2, 0.15, 0, -6.0], fL: [0.2, -0.15, 0, -6.4], arm: 'misc_spFoll', free: { s: [-0.6, 0.6], e: [-1.2, 0], w: 0 }, head: [-0.05, 0] }),
  // emergency switch-hand reach (racket stays in the racket hand for now — see report)
  misc_sw1: { y: -0.12, yaw: -0.6, pitch: 0.3, cr: -0.15, fR: [0.15, 0.0, 0, 0.1], fL: [0.45, 0.2, 0, -0.7], arm: 'misc_hangDown', free: 'misc_reachSwitch', head: [-0.2, 0.9] },
  misc_sw2: { y: -0.22, yaw: -0.8, pitch: 0.45, cr: -0.3, fR: [0.12, -0.05, 0, 0.1], fL: [0.62, 0.3, 0, -0.8], arm: 'misc_hangDown', free: 'misc_reachSwitch', head: [-0.25, 1.0] },

  // ---- non-play
  misc_ds1: { y: -0.02, pitch: 0.35, cp: 0.2, fR: [0.15, 0.02, 0, 0.2], fL: [0.15, -0.02, 0, -0.2], arm: 'misc_hangDown', free: { s: [-0.2, 0.2], e: [-0.3, 0], w: 0 }, head: [0.55, 0] },
  misc_ds2: { y: -0.02, pitch: 0.3, cp: 0.2, fR: [0.15, 0.25, 0.12, 0.2], fL: [0.15, -0.02, 0, -0.2], arm: 'misc_hangDown', free: { s: [-0.2, 0.2], e: [-0.3, 0], w: 0 }, head: [0.5, 0.2] },
  misc_ws1: { y: -0.02, pitch: 0.05, fR: [0.15, 0.02, 0, 0.2], fL: [0.15, -0.02, 0, -0.2], arm: 'misc_hangDown', free: 'misc_forehead', head: [0.1, 0] },
  misc_ws2: { y: -0.02, pitch: 0.05, fR: [0.15, 0.02, 0, 0.2], fL: [0.15, -0.02, 0, -0.2], arm: 'misc_hangDown', free: 'misc_foreheadB', head: [0.15, 0.15] },
  misc_as1: { y: -0.02, pitch: 0.08, fR: [0.15, 0.02, 0, 0.2], fL: [0.15, -0.02, 0, -0.2], arm: 'misc_strings', free: 'misc_toStrings', head: [0.25, 0] },
  misc_as2: { y: -0.02, pitch: 0.08, fR: [0.15, 0.02, 0, 0.2], fL: [0.15, -0.02, 0, -0.2], arm: 'misc_strings', free: { s: [-1.5, -0.25], e: [-1.2, -0.3], w: 0 }, head: [0.3, 0.05] },
  misc_pk1: { y: -0.24, pitch: 0.4, cp: 0.4, fR: [0.18, 0.12, 0, 0.2], fL: [0.18, -0.12, 0, -0.2], arm: 'misc_scoop', free: 'misc_reachFloor', head: [0.4, 0] },
  misc_pk2: { y: -0.05, pitch: 0.12, fR: [0.15, 0.04, 0, 0.2], fL: [0.15, -0.02, 0, -0.2], arm: 'misc_scoop', free: RF, head: [-0.1, 0] },
  misc_pk3: { y: -0.04, pitch: 0.05, cy: -0.1, fR: [0.15, 0.04, 0, 0.2], fL: [0.15, -0.02, 0, -0.2], arm: 'misc_toss', free: RF, head: [-0.25, 0] },
  misc_pr1: { y: -0.02, yaw: -0.4, pitch: 0.05, fR: [0.18, 0.02, 0, 0.2], fL: [0.18, -0.02, 0, -0.4], arm: 'misc_hangDown', free: 'misc_protest', head: [-0.15, 0.8] },
  misc_pr2: { y: -0.02, yaw: -0.4, pitch: 0.0, fR: [0.18, 0.02, 0, 0.2], fL: [0.18, -0.02, 0, -0.4], arm: 'misc_hangDown', free: { s: [-2.5, 1.0], e: [-0.3, 0], w: 0 }, head: [-0.2, 0.85] },
  misc_hs1: { y: -0.02, pitch: 0.1, fR: [0.15, 0.02, 0, 0.2], fL: [0.15, 0.15, 0, -0.1], arm: 'misc_shake', free: 'misc_shakeHand', head: [0, 0] },
  misc_hs2: { y: -0.03, pitch: 0.14, fR: [0.15, 0.02, 0, 0.2], fL: [0.15, 0.15, 0, -0.1], arm: 'misc_shake', free: { s: [-1.45, 0.15], e: [-0.25, 0], w: 0 }, head: [0.05, 0] },
  misc_tr1: { y: -0.15, pitch: 0.2, fR: [0.2, 0.02, 0, 0.3], fL: [0.2, -0.02, 0, -0.3], arm: 'misc_shake', free: 'misc_shakeHand', head: [-0.1, 0] },
  misc_tr2: { y: 0.0, pitch: -0.15, cp: -0.2, jump: 0.25, fR: [0.15, 0.02, 0.08, 0.2], fL: [0.15, -0.02, 0.08, -0.2], arm: 'misc_trophyR', free: 'misc_trophyL', head: [-0.45, 0] },
  misc_tr3: { y: -0.05, pitch: -0.12, cp: -0.15, fR: [0.18, 0.02, 0, 0.2], fL: [0.18, -0.02, 0, -0.2], arm: 'misc_trophyR', free: 'misc_trophyL', head: [-0.4, 0] },
  // ---- auto-fixed in-between keys (racket kept off the floor), generated by the lab repair pass
  misc_fx_tweener_80: {'y': -0.197, 'yaw': 0, 'pitch': 0.336, 'roll': 0, 'cy': 0, 'cp': 0.34, 'cr': 0, 'jump': 0, 'px': 0, 'pz': -1.694, 'ry': 3.14, 'fR': [0.249, -1.717, 0, 2.9], 'fL': [-0.249, -1.617, 0, 3.4], 'world': true, 'arm': {'s': [-0.22, -0.76], 'e': [-0.15, -0.38], 'w': 0.71}, 'free': {'s': [0.6, 0.9], 'e': [-0.3, 0], 'w': 0}, 'head': [0.594, 0]},
  misc_fx_tweener_98: {'y': -0.146, 'yaw': 0, 'pitch': 0.35, 'roll': 0, 'cy': 0, 'cp': 0.164, 'cr': 0, 'jump': 0, 'px': 0, 'pz': -1.768, 'ry': 2.895, 'fR': [0.227, -1.824, 0.027, 2.764], 'fL': [-0.236, -1.634, 0, 3.219], 'world': true, 'arm': {'s': [0.45, -0.16], 'e': [0.05, 0.19], 'w': 0.39}, 'free': {'s': [-0.08, 0.72], 'e': [-0.62, 0], 'w': 0}, 'head': [0.237, -0.363]},
  misc_fx_tweener_100: {'y': -0.132, 'yaw': 0, 'pitch': 0.35, 'roll': 0, 'cy': 0, 'cp': 0.13, 'cr': 0, 'jump': 0, 'px': 0, 'pz': -1.785, 'ry': 2.834, 'fR': [0.221, -1.85, 0.034, 2.73], 'fL': [-0.232, -1.638, 0, 3.173], 'world': true, 'arm': {'s': [0.49, 0.26], 'e': [0.05, 0.58], 'w': 0.15}, 'free': {'s': [-0.25, 0.67], 'e': [-0.7, 0], 'w': 0}, 'head': [0.146, -0.454]},
  misc_fx_behindBack_30: {'y': -0.1, 'yaw': -0.35, 'pitch': 0.2, 'roll': 0, 'cy': -0.2, 'cp': 0, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.18, 0.05, 0, 0.2], 'fL': [0.26, -0.08, 0, -0.6], 'world': false, 'arm': {'s': [0.12, 0.35], 'e': [-1.8, 0.12], 'w': 0.2}, 'free': {'s': [-1.1, 0.7], 'e': [-0.8, 0], 'w': 0}, 'head': [-0.2, 0.9]},
  misc_fx_rollDive_88: {'y': -0.326, 'yaw': -1.004, 'pitch': 1.015, 'roll': 0.453, 'cy': 0, 'cp': 0, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.224, -0.039, 0.05, 0.3], 'fL': [0.174, -0.313, 0.1, -0.2], 'world': false, 'arm': {'s': [-0.59, 2.22], 'e': [-0.86, 0.03], 'w': -3}, 'free': {'s': [-1.13, 0.58], 'e': [-0.17, 0], 'w': 0}, 'head': [-0.377, 0]},
  misc_fx_rollDive_46: {'y': -0.365, 'yaw': -0.906, 'pitch': 1.263, 'roll': 0.524, 'cy': 0, 'cp': 0, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.237, -0.271, 0.142, 0.3], 'fL': [0.158, -0.408, 0.209, -0.2], 'world': false, 'arm': {'s': [-1.82, 1.95], 'e': [-0.17, 0.56], 'w': -0.56}, 'free': {'s': [-2.19, 0.79], 'e': [-0.23, 0], 'w': 0}, 'head': [-0.773, 0]},
  misc_fx_rollDive_90: {'y': -0.32, 'yaw': -0.959, 'pitch': 0.99, 'roll': 0.419, 'cy': 0, 'cp': 0, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.23, -0.019, 0.039, 0.3], 'fL': [0.18, -0.31, 0.089, -0.2], 'world': false, 'arm': {'s': [-0.61, 2.13], 'e': [-0.78, -0.07], 'w': -2.86}, 'free': {'s': [-1.1, 0.52], 'e': [-0.15, 0], 'w': 0}, 'head': [-0.36, 0]},
  misc_fx_rollDive_92: {'y': -0.31, 'yaw': -0.88, 'pitch': 0.945, 'roll': 0.36, 'cy': 0, 'cp': 0, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.24, 0.015, 0.019, 0.3], 'fL': [0.19, -0.305, 0.069, -0.2], 'world': false, 'arm': {'s': [-0.96, 1.67], 'e': [-0.65, 0.2], 'w': -2.01}, 'free': {'s': [-1.05, 0.41], 'e': [-0.12, 0], 'w': 0}, 'head': [-0.33, 0]},
  misc_fx_rollDive_18: {'y': -0.15, 'yaw': -0.3, 'pitch': 0.45, 'roll': 0, 'cy': 0, 'cp': 0, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.3, 0.3, 0, 0.3], 'fL': [0.2, -0.2, 0, -0.2], 'world': false, 'arm': {'s': [-0.92, 0.09], 'e': [-0.24, 0.17], 'w': -0.75}, 'free': {'s': [0.6, 0.9], 'e': [-0.3, 0], 'w': 0}, 'head': [-0.3, 0]},
  misc_fx_rollDive_38: {'y': -0.346, 'yaw': -0.512, 'pitch': 1.214, 'roll': 0.311, 'cy': 0, 'cp': 0, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.286, -0.255, 0.109, 0.3], 'fL': [0.191, -0.441, 0.186, -0.2], 'world': false, 'arm': {'s': [-3.02, 0.56], 'e': [-0.27, 0.06], 'w': -0.05}, 'free': {'s': [-2.59, 0.45], 'e': [-0.13, 0], 'w': 0}, 'head': [-0.872, 0]},
  misc_fx_serveHighFH_62: {'y': -0.07, 'yaw': 0.788, 'pitch': 0.068, 'roll': 0, 'cy': 0.029, 'cp': 0, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.16, -0.18, 0.006, 0.809], 'fL': [0.12, 0.16, 0, 0.45], 'world': false, 'arm': {'s': [1.2, 0.57], 'e': [0, -0.15], 'w': -0.12}, 'free': {'s': [-0.82, 0.4], 'e': [-0.8, 0], 'w': 0}, 'head': [0.33, -0.479]},
  misc_fx_serveHighFH_50: {'y': -0.068, 'yaw': 0.988, 'pitch': 0.022, 'roll': 0, 'cy': 0.113, 'cp': 0, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.16, -0.18, 0, 0.9], 'fL': [0.12, 0.16, 0, 0.45], 'world': false, 'arm': {'s': [-0.26, 0.53], 'e': [-1.7, 0.57], 'w': 1.04}, 'free': {'s': [-0.7, 0.25], 'e': [-0.5, 0], 'w': 0}, 'head': [0.288, -0.6]},
  misc_fx_serveHighFH_52: {'y': -0.069, 'yaw': 0.996, 'pitch': 0.021, 'roll': 0, 'cy': 0.137, 'cp': 0, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.16, -0.18, 0, 0.9], 'fL': [0.12, 0.16, 0, 0.45], 'world': false, 'arm': {'s': [1.04, 0.33], 'e': [-1.22, 0.58], 'w': 1.38}, 'free': {'s': [-0.7, 0.25], 'e': [-0.5, 0], 'w': 0}, 'head': [0.296, -0.6]},
  misc_fx_serveShortFH_48: {'y': -0.064, 'yaw': 0.622, 'pitch': 0.111, 'roll': 0, 'cy': -0.022, 'cp': 0, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.16, -0.158, 0.004, 0.722], 'fL': [0.12, 0.149, 0, 0.394], 'world': false, 'arm': {'s': [0.49, 1.17], 'e': [0.03, -0.37], 'w': 0.35}, 'free': {'s': [-0.96, 0.28], 'e': [-0.78, -0.14], 'w': 0}, 'head': [0.294, -0.4]},
  misc_fx_serveShortFH_50: {'y': -0.066, 'yaw': 0.629, 'pitch': 0.108, 'roll': 0, 'cy': -0.029, 'cp': 0, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.16, -0.164, 0.006, 0.729], 'fL': [0.12, 0.152, 0, 0.408], 'world': false, 'arm': {'s': [0.46, 1.38], 'e': [0.05, -0.25], 'w': -0.08}, 'free': {'s': [-0.94, 0.34], 'e': [-0.84, -0.1], 'w': 0}, 'head': [0.308, -0.4]},
  misc_fx_flickFH_48: {'y': -0.067, 'yaw': 0.637, 'pitch': 0.105, 'roll': 0, 'cy': -0.037, 'cp': 0, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.16, -0.169, 0.007, 0.737], 'fL': [0.12, 0.155, 0, 0.423], 'world': false, 'arm': {'s': [-0.13, 0.94], 'e': [-0.22, -0.58], 'w': -1.17}, 'free': {'s': [-0.93, 0.39], 'e': [-0.89, -0.07], 'w': 0}, 'head': [0.323, -0.4]},
  misc_fx_flickFH_46: {'y': -0.065, 'yaw': 0.629, 'pitch': 0.108, 'roll': 0, 'cy': -0.029, 'cp': 0, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.16, -0.163, 0.005, 0.729], 'fL': [0.12, 0.152, 0, 0.407], 'world': false, 'arm': {'s': [-0.31, 0.98], 'e': [-0.4, -0.45], 'w': -0.76}, 'free': {'s': [-0.95, 0.33], 'e': [-0.83, -0.11], 'w': 0}, 'head': [0.307, -0.4]},
  misc_fx_flickFH_44: {'y': -0.063, 'yaw': 0.615, 'pitch': 0.114, 'roll': 0, 'cy': -0.015, 'cp': 0, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.16, -0.152, 0.003, 0.715], 'fL': [0.12, 0.146, 0, 0.379], 'world': false, 'arm': {'s': [0.06, 1.37], 'e': [-0.25, -0.28], 'w': 0.57}, 'free': {'s': [-0.97, 0.22], 'e': [-0.72, -0.18], 'w': 0}, 'head': [0.279, -0.4]},
  misc_fx_serveDrive_44: {'y': -0.07, 'yaw': 0.832, 'pitch': 0.058, 'roll': 0, 'cy': 0.054, 'cp': 0, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.16, -0.18, 0.005, 0.828], 'fL': [0.12, 0.16, 0, 0.45], 'world': false, 'arm': {'s': [1.2, 0.55], 'e': [-0.24, 0.03], 'w': 0.15}, 'free': {'s': [-0.8, 0.37], 'e': [-0.74, 0], 'w': 0}, 'head': [0.324, -0.504]},
  misc_fx_serveDrive_46: {'y': -0.07, 'yaw': 0.786, 'pitch': 0.069, 'roll': 0, 'cy': 0.028, 'cp': 0, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.16, -0.18, 0.006, 0.808], 'fL': [0.12, 0.16, 0, 0.45], 'world': false, 'arm': {'s': [1.2, 0.66], 'e': [0.03, -0.12], 'w': -0.17}, 'free': {'s': [-0.83, 0.4], 'e': [-0.81, 0], 'w': 0}, 'head': [0.331, -0.478]},
  misc_fx_tweener_74: {'y': -0.187, 'yaw': 0, 'pitch': 0.35, 'roll': 0, 'cy': 0, 'cp': 0.267, 'cr': 0, 'jump': 0, 'px': 0, 'pz': -1.667, 'ry': 3.14, 'fR': [0.243, -1.707, 0, 2.9], 'fL': [-0.243, -1.607, 0, 3.4], 'world': true, 'arm': {'s': [-0.6, -0.34], 'e': [-0.78, -0.59], 'w': -0.79}, 'free': {'s': [0.6, 0.9], 'e': [-0.3, 0], 'w': 0}, 'head': [0.567, 0]},
  misc_fx_tweener_102: {'y': -0.119, 'yaw': 0, 'pitch': 0.35, 'roll': 0, 'cy': 0, 'cp': 0.096, 'cr': 0, 'jump': 0, 'px': 0, 'pz': -1.802, 'ry': 2.773, 'fR': [0.216, -1.876, 0.041, 2.696], 'fL': [-0.229, -1.641, 0, 3.128], 'world': true, 'arm': {'s': [-0.37, 0.21], 'e': [-0.61, 0.49], 'w': -0.85}, 'free': {'s': [-0.42, 0.63], 'e': [-0.78, 0], 'w': 0}, 'head': [0.056, -0.544]},
  misc_fx_tweener_76: {'y': -0.192, 'yaw': 0, 'pitch': 0.35, 'roll': 0, 'cy': 0, 'cp': 0.279, 'cr': 0, 'jump': 0, 'px': 0, 'pz': -1.679, 'ry': 3.14, 'fR': [0.246, -1.712, 0, 2.9], 'fL': [-0.246, -1.612, 0, 3.4], 'world': true, 'arm': {'s': [-0.74, -0.71], 'e': [-0.72, -0.6], 'w': -0.23}, 'free': {'s': [0.6, 0.9], 'e': [-0.3, 0], 'w': 0}, 'head': [0.579, 0]},
  misc_fx_tweener_78: {'y': -0.195, 'yaw': 0, 'pitch': 0.35, 'roll': 0, 'cy': 0, 'cp': 0.288, 'cr': 0, 'jump': 0, 'px': 0, 'pz': -1.688, 'ry': 3.14, 'fR': [0.248, -1.715, 0, 2.9], 'fL': [-0.248, -1.615, 0, 3.4], 'world': true, 'arm': {'s': [-0.41, -0.86], 'e': [-0.33, -0.6], 'w': 0.38}, 'free': {'s': [0.6, 0.9], 'e': [-0.3, 0], 'w': 0}, 'head': [0.588, 0]},
  misc_fx_behindBack_50: {'y': -0.134, 'yaw': -0.457, 'pitch': 0.269, 'roll': 0, 'cy': -0.214, 'cp': 0, 'cr': -0.103, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.18, 0.05, 0, 0.2], 'fL': [0.294, -0.097, 0, -0.671], 'world': false, 'arm': {'s': [0.15, -0.03], 'e': [-2.02, 0.32], 'w': 0.29}, 'free': {'s': [-1.24, 0.84], 'e': [-0.66, 0], 'w': 0}, 'head': [-0.193, 1.029]},
  misc_fx_behindBack_38: {'y': -0.136, 'yaw': -0.486, 'pitch': 0.272, 'roll': 0, 'cy': -0.245, 'cp': 0, 'cr': -0.109, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.18, 0.05, 0, 0.2], 'fL': [0.296, -0.098, 0, -0.69], 'world': false, 'arm': {'s': [0.25, -0.08], 'e': [-2.31, 0.3], 'w': 0.48}, 'free': {'s': [-1.28, 0.88], 'e': [-0.62, 0], 'w': 0}, 'head': [-0.2, 1.081]},
  misc_fx_behindBack_42: {'y': -0.139, 'yaw': -0.498, 'pitch': 0.279, 'roll': 0, 'cy': -0.249, 'cp': 0, 'cr': -0.119, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.18, 0.05, 0, 0.2], 'fL': [0.299, -0.1, 0, -0.699], 'world': false, 'arm': {'s': [1.26, -0.24], 'e': [-1.49, 0.45], 'w': 1.26}, 'free': {'s': [-1.3, 0.9], 'e': [-0.6, 0], 'w': 0}, 'head': [-0.2, 1.098]},
  misc_fx_behindBack_48: {'y': -0.14, 'yaw': -0.5, 'pitch': 0.28, 'roll': 0, 'cy': -0.25, 'cp': 0, 'cr': -0.12, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.18, 0.05, 0, 0.2], 'fL': [0.3, -0.1, 0, -0.7], 'world': false, 'arm': {'s': [0.29, -0.13], 'e': [-2.39, 0.26], 'w': 0.52}, 'free': {'s': [-1.3, 0.9], 'e': [-0.6, 0], 'w': 0}, 'head': [-0.2, 1.1]},
  misc_fx_behindBack_40: {'y': -0.138, 'yaw': -0.492, 'pitch': 0.276, 'roll': 0, 'cy': -0.247, 'cp': 0, 'cr': -0.114, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.18, 0.05, 0, 0.2], 'fL': [0.297, -0.099, 0, -0.695], 'world': false, 'arm': {'s': [0.32, -0.05], 'e': [-2.28, 0.34], 'w': 0.4}, 'free': {'s': [-1.29, 0.89], 'e': [-0.61, 0], 'w': 0}, 'head': [-0.2, 1.09]},
  misc_fx_behindBack_44: {'y': -0.14, 'yaw': -0.5, 'pitch': 0.28, 'roll': 0, 'cy': -0.25, 'cp': 0, 'cr': -0.12, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.18, 0.05, 0, 0.2], 'fL': [0.3, -0.1, 0, -0.7], 'world': false, 'arm': {'s': [0.34, -0.12], 'e': [-2.41, 0.22], 'w': 0.5}, 'free': {'s': [-1.3, 0.9], 'e': [-0.6, 0], 'w': 0}, 'head': [-0.2, 1.1]},
  misc_fx_rollDive_60: {'y': -0.399, 'yaw': -1.588, 'pitch': 1.348, 'roll': 0.893, 'cy': 0, 'cp': 0, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.152, -0.299, 0.199, 0.3], 'fL': [0.101, -0.351, 0.249, -0.2], 'world': false, 'arm': {'s': [-1.2, 2.27], 'e': [0.03, 0.6], 'w': -1.32}, 'free': {'s': [-1.51, 1.39], 'e': [-0.4, 0], 'w': 0}, 'head': [-0.603, 0]},
  misc_fx_rollDive_62: {'y': -0.4, 'yaw': -1.6, 'pitch': 1.35, 'roll': 0.9, 'cy': 0, 'cp': 0, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.15, -0.3, 0.2, 0.3], 'fL': [0.1, -0.35, 0.25, -0.2], 'world': false, 'arm': {'s': [-1.04, 2.68], 'e': [-0.51, 0.36], 'w': -3.88}, 'free': {'s': [-1.5, 1.4], 'e': [-0.4, 0], 'w': 0}, 'head': [-0.6, 0]},
  misc_fx_rollDive_94: {'y': -0.3, 'yaw': -0.801, 'pitch': 0.901, 'roll': 0.301, 'cy': 0, 'cp': 0, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.25, 0.049, 0, 0.3], 'fL': [0.2, -0.3, 0.05, -0.2], 'world': false, 'arm': {'s': [-0.78, 1.35], 'e': [-0.35, 0.6], 'w': -1.26}, 'free': {'s': [-1, 0.3], 'e': [-0.1, 0], 'w': 0}, 'head': [-0.301, 0]},
  misc_fx_rollDive_96: {'y': -0.3, 'yaw': -0.799, 'pitch': 0.899, 'roll': 0.3, 'cy': 0, 'cp': 0, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.25, 0.05, 0, 0.3], 'fL': [0.2, -0.3, 0.05, -0.2], 'world': false, 'arm': {'s': [-0.77, -1.07], 'e': [-0.45, -0.42], 'w': -1.4}, 'free': {'s': [-1, 0.3], 'e': [-0.1, 0], 'w': 0}, 'head': [-0.3, 0]},
  misc_fx_rollDive_76: {'y': -0.362, 'yaw': -1.294, 'pitch': 1.178, 'roll': 0.671, 'cy': 0, 'cp': 0, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.188, -0.166, 0.123, 0.3], 'fL': [0.138, -0.331, 0.173, -0.2], 'world': false, 'arm': {'s': [-0.76, 2.5], 'e': [-0.63, 0.26], 'w': -3.6}, 'free': {'s': [-1.31, 0.98], 'e': [-0.29, 0], 'w': 0}, 'head': [-0.486, 0]},
  misc_fx_rollDive_84: {'y': -0.338, 'yaw': -1.099, 'pitch': 1.069, 'roll': 0.525, 'cy': 0, 'cp': 0, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.212, -0.081, 0.074, 0.3], 'fL': [0.162, -0.319, 0.124, -0.2], 'world': false, 'arm': {'s': [-0.58, 2.41], 'e': [-0.95, 0.21], 'w': -3.15}, 'free': {'s': [-1.19, 0.71], 'e': [-0.21, 0], 'w': 0}, 'head': [-0.413, 0]},
  misc_fx_pickUp_46: {'y': -0.3, 'yaw': 0, 'pitch': 0.35, 'roll': 0, 'cy': 0, 'cp': 0.3, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.18, 0.12, 0, 0.2], 'fL': [0.18, -0.12, 0, -0.2], 'world': false, 'arm': {'s': [-1.05, 1.19], 'e': [-0.27, 0.6], 'w': -1.29}, 'free': {'s': [-1, 0.3], 'e': [-0.1, 0], 'w': 0}, 'head': [0.4, 0]},
  misc_fx_pickUp_80: {'y': -0.3, 'yaw': 0, 'pitch': 0.35, 'roll': 0, 'cy': 0, 'cp': 0.3, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.18, 0.12, 0, 0.2], 'fL': [0.18, -0.12, 0, -0.2], 'world': false, 'arm': {'s': [0.46, 0.32], 'e': [-0.39, 0.42], 'w': -2.86}, 'free': {'s': [-1, 0.3], 'e': [-0.1, 0], 'w': 0}, 'head': [0.4, 0]},
  misc_fx_pickUp_44: {'y': -0.3, 'yaw': 0, 'pitch': 0.35, 'roll': 0, 'cy': 0, 'cp': 0.3, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.18, 0.12, 0, 0.2], 'fL': [0.18, -0.12, 0, -0.2], 'world': false, 'arm': {'s': [-0.98, 1.2], 'e': [-0.47, 0.6], 'w': -1.28}, 'free': {'s': [-1, 0.3], 'e': [-0.1, 0], 'w': 0}, 'head': [0.4, 0]},
  misc_fx_pickUp_62: {'y': -0.3, 'yaw': 0, 'pitch': 0.35, 'roll': 0, 'cy': 0, 'cp': 0.3, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.18, 0.12, 0, 0.2], 'fL': [0.18, -0.12, 0, -0.2], 'world': false, 'arm': {'s': [0.3, 0.88], 'e': [-0.17, 0.56], 'w': -2.99}, 'free': {'s': [-1, 0.3], 'e': [-0.1, 0], 'w': 0}, 'head': [0.4, 0]},
  misc_fx_pickUp_54: {'y': -0.3, 'yaw': 0, 'pitch': 0.35, 'roll': 0, 'cy': 0, 'cp': 0.3, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.18, 0.12, 0, 0.2], 'fL': [0.18, -0.12, 0, -0.2], 'world': false, 'arm': {'s': [-0.71, 1.47], 'e': [-0.74, 0.3], 'w': -2.8}, 'free': {'s': [-1, 0.3], 'e': [-0.1, 0], 'w': 0}, 'head': [0.4, 0]},
  misc_fx_pickUp_50: {'y': -0.3, 'yaw': 0, 'pitch': 0.35, 'roll': 0, 'cy': 0, 'cp': 0.3, 'cr': 0, 'jump': 0, 'px': 0, 'pz': 0, 'ry': 0, 'fR': [0.18, 0.12, 0, 0.2], 'fL': [0.18, -0.12, 0, -0.2], 'world': false, 'arm': {'s': [-1.07, 1.29], 'e': [-0.62, 0.44], 'w': -1.96}, 'free': {'s': [-1, 0.3], 'e': [-0.1, 0], 'w': 0}, 'head': [0.4, 0]},
};

// High serve uses its own continuous underarm arc, not the floor-repair keys that
// reversed the shoulder several times in 0.2 s. Keep shared short/drive serves unchanged.
poses.misc_hsTakeBack = Object.assign({}, poses.misc_hsBack, {
  arm: { s: [0.8, 0.4], e: [-0.65, 0.3], w: 0.7 }, free: 'hold'
});
poses.misc_hsSwing = Object.assign({}, poses.misc_hsLowP, {
  arm: { s: [0.2, 0.35], e: [-0.32, 0.28], w: -0.9 }, free: 'misc_release'
});

// ---------------------------------------------------------------- clips
const clips = {
  // serves
  misc_serveHighFH:  { label: 'Giao cao thuận tay', group: 'Giao cầu', contact: 0.72, contactBlend: 0.035, keys: [[0, 'misc_hsSet'], [0.35, 'misc_hsSet'], [0.52, 'misc_hsTakeBack', 'io'], [0.62, 'misc_hsSwing', 'in'], [0.72, 'misc_hsHit', 'lin'], [1.01, 'misc_hsFoll', 'out'], [1.5, 'misc_rcvS', 'io']] },
  misc_serveShortBH: { label: 'Giao ngắn trái tay', group: 'Giao cầu', contact: 0.6, keys: [[0, 'misc_bsSet'], [0.45, 'misc_bsSet'], [0.6, 'misc_bsPush', 'out'], [0.8, 'misc_bsPush'], [1.2, 'misc_rcvD', 'io']] },
  misc_serveShortFH: { label: 'Giao ngắn thuận tay', group: 'Giao cầu', contact: 0.62, keys: [[0, 'misc_fsSet'], [0.4, 'misc_fsSet'], [0.48, 'misc_fx_serveShortFH_48', 'io'], [0.5, 'misc_fx_serveShortFH_50', 'io'], [0.52, 'misc_hsLowP', 'in'], [0.62, 'misc_fsHit', 'out'], [0.85, 'misc_fsHit'], [1.25, 'misc_rcvD', 'io']] },
  misc_flickBH:      { label: 'Giao bổng trái tay', group: 'Giao cầu', contact: 0.55, keys: [[0, 'misc_bsSet'], [0.45, 'misc_bsSet'], [0.55, 'misc_bsFlick', 'whip'], [0.8, 'misc_bsFlick'], [1.2, 'misc_rcvD', 'io']] },
  misc_flickFH:      { label: 'Giao bổng thuận tay', group: 'Giao cầu', contact: 0.55, keys: [[0, 'misc_fsSet'], [0.42, 'misc_fsSet'], [0.44, 'misc_fx_flickFH_44', 'io'], [0.46, 'misc_fx_flickFH_46', 'io'], [0.48, 'misc_fx_flickFH_48', 'io'], [0.49, 'misc_hsLowP', 'in'], [0.55, 'misc_ffFlick', 'out'], [0.8, 'misc_ffFlick'], [1.2, 'misc_rcvS', 'io']] },
  misc_serveDrive:   { label: 'Giao tạt', group: 'Giao cầu', contact: 0.6, keys: [[0, 'misc_fsSet'], [0.35, 'misc_hsBack', 'io'], [0.44, 'misc_fx_serveDrive_44', 'io'], [0.46, 'misc_fx_serveDrive_46', 'io'], [0.48, 'misc_hsLowP', 'in'], [0.6, 'misc_dsHit', 'out'], [0.85, 'misc_ffFlick', 'out'], [1.3, 'misc_rcvS', 'io']] },
  misc_ritual:       { label: 'Nghi thức trước giao', group: 'Giao cầu', loop: true, keys: [[0, 'misc_ritA'], [0.9, 'misc_ritA'], [1.5, 'misc_ritB', 'io'], [2.6, 'misc_ritB'], [3.2, 'misc_ritA', 'io']] },
  misc_receiveS:     { label: 'Nhận giao (đơn)', group: 'Giao cầu', loop: true, keys: [[0, 'misc_rcvS'], [0.5, 'misc_rcvS2', 'io'], [1.0, 'misc_rcvS', 'io']] },
  misc_receiveD:     { label: 'Nhận giao (đôi)', group: 'Giao cầu', loop: true, keys: [[0, 'misc_rcvD'], [0.4, 'misc_rcvD2', 'io'], [0.8, 'misc_rcvD', 'io']] },
  // doubles stances
  misc_dblFront:     { label: 'Đôi: đứng lưới', group: 'Đánh đôi', loop: true, keys: [[0, 'misc_atkF'], [0.35, 'misc_atkF2', 'io'], [0.7, 'misc_atkF', 'io']] },
  misc_dblBack:      { label: 'Đôi: đứng sau tấn công', group: 'Đánh đôi', loop: true, keys: [[0, 'misc_atkB'], [0.45, 'misc_atkB2', 'io'], [0.9, 'misc_atkB', 'io']] },
  misc_dblDefence:   { label: 'Đôi: phòng thủ ngang', group: 'Đánh đôi', loop: true, keys: [[0, 'misc_def'], [0.35, 'misc_def2', 'io'], [0.7, 'misc_def', 'io']] },
  // footwork
  misc_chasseR:      { label: 'Bước đệm sang phải tay vợt', group: 'Bước chân', keys: [[0, 'misc_c0'], [0.14, 'misc_cR1', 'out'], [0.26, 'misc_cR2', 'io'], [0.38, 'misc_cR3', 'out'], [0.55, 'misc_cR4', 'in'], [0.9, 'misc_cR4'], [1.4, 'misc_c0', 'io']] },
  misc_chasseL:      { label: 'Bước đệm sang trái tay', group: 'Bước chân', keys: [[0, 'misc_c0'], [0.14, 'misc_cL1', 'out'], [0.26, 'misc_cL2', 'io'], [0.38, 'misc_cL3', 'out'], [0.55, 'misc_cL4', 'in'], [0.9, 'misc_cL4'], [1.4, 'misc_c0', 'io']] },
  misc_diagFwd:      { label: 'Chéo lên lưới thuận tay', group: 'Bước chân', keys: [[0, 'misc_c0'], [0.16, 'misc_dF1', 'out'], [0.32, 'misc_dF2'], [0.5, 'misc_dF3', 'out'], [0.8, 'misc_dF3'], [1.4, 'misc_c0', 'io']] },
  misc_diagBack:     { label: 'Chéo lùi góc trái tay', group: 'Bước chân', keys: [[0, 'misc_c0'], [0.16, 'misc_dB1', 'out'], [0.34, 'misc_dB2'], [0.52, 'misc_dB3', 'in'], [0.85, 'misc_dB3'], [1.45, 'misc_c0', 'io']] },
  misc_chase:        { label: 'Quay lưng chạy đuổi cầu', group: 'Bước chân', keys: [[0, 'misc_c0'], [0.14, 'misc_ch1', 'out'], [0.3, 'misc_ch2'], [0.44, 'misc_ch3'], [0.58, 'misc_ch4'], [0.9, 'misc_ch4'], [1.5, 'misc_c0', 'io']] },
  misc_brake:        { label: 'Phanh rồi về giữa sân', group: 'Bước chân', keys: [[0, 'misc_br0'], [0.22, 'misc_br1', 'out'], [0.42, 'misc_br1'], [0.58, 'misc_br2', 'io'], [0.95, 'misc_br3', 'out']] },
  misc_slip:         { label: 'Trượt chân', group: 'Bước chân', keys: [[0, 'misc_c0'], [0.2, 'misc_sl1', 'out'], [0.36, 'misc_sl2', 'out'], [0.6, 'misc_sl3', 'io'], [0.85, 'misc_sl2', 'io'], [1.3, 'misc_sl4', 'io'], [1.7, 'misc_c0', 'io']] },
  // trick shots
  misc_tweener:      { label: 'Đánh qua háng', group: 'Biểu diễn', contact: 0.92, keys: [[0, 'misc_c0'], [0.18, 'misc_tw1', 'out'], [0.45, 'misc_tw2'], [0.72, 'misc_tw3', 'in'], [0.74, 'misc_fx_tweener_74', 'io'], [0.76, 'misc_fx_tweener_76', 'io'], [0.78, 'misc_fx_tweener_78', 'io'], [0.8, 'misc_fx_tweener_80', 'io'], [0.92, 'misc_tw4', 'whip'], [0.98, 'misc_fx_tweener_98', 'io'], [1, 'misc_fx_tweener_100', 'io'], [1.02, 'misc_fx_tweener_102', 'io'], [1.15, 'misc_tw5', 'out'], [1.7, 'misc_tw6', 'io']] },
  misc_behindBack:   { label: 'Đánh sau lưng', group: 'Biểu diễn', contact: 0.48, keys: [[0, 'ready'], [0.3, 'misc_fx_behindBack_30', 'io'], [0.38, 'misc_fx_behindBack_38', 'io'], [0.4, 'misc_fx_behindBack_40', 'io'], [0.42, 'misc_fx_behindBack_42', 'io'], [0.44, 'misc_fx_behindBack_44', 'io'], [0.48, 'misc_fx_behindBack_48', 'whip'], [0.5, 'misc_fx_behindBack_50', 'io'], [0.75, 'misc_bb3', 'out'], [1.2, 'ready', 'io']] },
  misc_rollDive:     { label: 'Lao người lăn tròn', group: 'Biểu diễn', contact: 0.34, allow: ['overreach', 'racketFloor', 'bodySink', 'kneeFloor', 'footFloat', 'footSink'], keys: [[0, 'ready'], [0.18, 'misc_fx_rollDive_18', 'io'], [0.34, 'misc_rd2', 'out'], [0.38, 'misc_fx_rollDive_38', 'io'], [0.46, 'misc_fx_rollDive_46', 'io'], [0.6, 'misc_fx_rollDive_60', 'io'], [0.62, 'misc_fx_rollDive_62', 'io'], [0.76, 'misc_fx_rollDive_76', 'io'], [0.84, 'misc_fx_rollDive_84', 'io'], [0.88, 'misc_fx_rollDive_88', 'io'], [0.9, 'misc_fx_rollDive_90', 'io'], [0.92, 'misc_fx_rollDive_92', 'io'], [0.94, 'misc_fx_rollDive_94', 'io'], [0.95, 'misc_rd4', 'io'], [0.96, 'misc_fx_rollDive_96', 'io'], [1.45, 'misc_rd5', 'io']] },
  misc_spinSmash:    { label: 'Đập xoay 360°', group: 'Biểu diễn', contact: 0.74, keys: [[0, 'misc_c0'], [0.28, 'misc_sp1', 'io'], [0.46, 'misc_sp2', 'out'], [0.62, 'misc_sp3'], [0.74, 'misc_sp4', 'whip'], [1.0, 'misc_sp5', 'in'], [1.5, 'misc_c0', 'io']] },
  misc_switchHand:   { label: 'Cứu cầu đổi tay', group: 'Biểu diễn', contact: 0.42, keys: [[0, 'ready'], [0.22, 'misc_sw1', 'out'], [0.42, 'misc_sw2', 'whip'], [0.7, 'misc_sw2'], [1.2, 'ready', 'io']] },
  // non-play
  misc_disappointed: { label: 'Thất vọng', group: 'Ngoài pha cầu', keys: [[0, 'ready'], [0.35, 'misc_ds1', 'io'], [0.7, 'misc_ds2', 'out'], [0.9, 'misc_ds1', 'in'], [1.8, 'misc_ds1'], [2.3, 'ready', 'io']] },
  misc_wipeSweat:    { label: 'Lau mồ hôi', group: 'Ngoài pha cầu', keys: [[0, 'ready'], [0.4, 'misc_ws1', 'io'], [0.8, 'misc_ws2', 'io'], [1.1, 'misc_ws1', 'io'], [1.6, 'ready', 'io']] },
  misc_adjustStrings:{ label: 'Chỉnh dây vợt', group: 'Ngoài pha cầu', keys: [[0, 'ready'], [0.4, 'misc_as1', 'io'], [0.7, 'misc_as2', 'io'], [1.0, 'misc_as1', 'io'], [1.3, 'misc_as2', 'io'], [1.9, 'ready', 'io']] },
  misc_pickUp:       { label: 'Nhặt cầu đưa sang', group: 'Ngoài pha cầu', keys: [[0, 'ready'], [0.44, 'misc_fx_pickUp_44', 'io'], [0.45, 'misc_pk1', 'io'], [0.46, 'misc_fx_pickUp_46', 'io'], [0.5, 'misc_fx_pickUp_50', 'io'], [0.54, 'misc_fx_pickUp_54', 'io'], [0.62, 'misc_fx_pickUp_62', 'io'], [0.8, 'misc_fx_pickUp_80'], [1.15, 'misc_pk2', 'io'], [1.4, 'misc_pk3', 'whip'], [1.9, 'ready', 'io']] },
  misc_protest:      { label: 'Phản đối / xin Hawk-Eye', group: 'Ngoài pha cầu', keys: [[0, 'ready'], [0.35, 'misc_pr1', 'out'], [0.7, 'misc_pr2', 'io'], [1.05, 'misc_pr1', 'io'], [1.6, 'ready', 'io']] },
  misc_handshake:    { label: 'Bắt tay qua lưới', group: 'Ngoài pha cầu', keys: [[0, 'ready'], [0.45, 'misc_hs1', 'io'], [0.65, 'misc_hs2', 'io'], [0.85, 'misc_hs1', 'io'], [1.05, 'misc_hs2', 'io'], [1.6, 'ready', 'io']] },
  misc_trophy:       { label: 'Giơ cúp', group: 'Ngoài pha cầu', keys: [[0, 'misc_tr1'], [0.4, 'misc_tr3', 'io'], [0.65, 'misc_tr2', 'out'], [0.9, 'misc_tr3', 'in'], [1.15, 'misc_tr2', 'out'], [1.4, 'misc_tr3', 'in'], [2.0, 'misc_tr3']] },
};

SPAnim.register({ poses, arms, free, clips });
})();
