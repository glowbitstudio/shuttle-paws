# Usage: build-shot-prediction.py <base candidate snapshot> <output snapshot>. Never writes game.js.
# Blocker fixed here (see partA-combined-05-01/disposition.json): preparation assumed a clip guessed from contact height.
#  1. The shots the next hit can produce are derived from the same rules the sim uses (mirrors of humanShot /
#     botChooseShot, cross-checked by tests/shot-prediction-regression.js) and mapped through selectMatchStroke,
#     the function the hit path uses. One candidate clip -> that clip is prepared (prep == stroke by construction).
#  2. Several candidates -> no clip is assumed: the neutral swing is shown, the body is placed for its contact
#     region and kept there through the hit, and the racket is fitted to the predicted contact point as the shuttle
#     arrives. The first stroke frame then starts from the rendered pose (warm start) and blends into the real clip.
from pathlib import Path
import hashlib,sys
ROOT=Path(__file__).resolve().parents[1]
base,outname=sys.argv[1],sys.argv[2]
assert outname!='game.js' and base!='game.js'
src=(ROOT/base).read_bytes().decode('utf-8')
def rep(old,new):
    global src
    old=old.replace('\n','\r\n');new=new.replace('\n','\r\n')
    assert src.count(old)==1,(src.count(old),old[:80])
    src=src.replace(old,new)
# 1. shot prediction helpers
rep('''// Bounded joint fitting: no teleporting the body/racket, no changing the simulation.
''','''// <shot-prediction>
// Which shots can the next hit produce at a predicted contact height? Mirrors of sim.js humanShot and
// botChooseShot (tests/shot-prediction-regression.js keeps them in step). Presentation only.
function humanShotAt(a, y, iy, pw) {
  const az = Math.abs(a.z);
  if (pw !== undefined) {
    if (y < 1.05) return pw < 0.4 ? 'net' : 'lift';
    if (y > 1.45 && (a.jumpY > 0.25 || a.assist) && pw >= 0.72 && a.sta >= 0.15) return 'smash';
    if (pw < 0.35) return y < 1.75 ? 'net' : 'drop';
    if (pw >= 0.72 && y > 1.35) return 'drive';
    return 'clear';
  }
  if ((a.jumpY > 0.25 || (a.assist && y > 1.7)) && y > 1.6 && iy <= 0.4) return 'smash';
  if (y < 1.05) return iy < -0.4 ? 'net' : (iy > 0.4 ? 'lift' : (az < 2.6 ? 'net' : 'lift'));
  if (iy > 0.4) return y < 1.75 ? 'net' : 'drop';
  if (iy < -0.4) return y > 1.58 && az > 2.5 ? 'smash' : 'drive';
  return 'clear';
}
// Every shot botChooseShot can return for this bot at this contact height (its choice is random until the hit).
function botShotOptions(b, y, diffs) {
  const d = diffs[b.diff], az = Math.abs(b.z), out = [];
  const add = (s) => { if (!out.includes(s)) out.push(s); };
  if (y > 1.58 && az < 5.6 && b.sta >= 0.15 && d.smash > 0) { add('smash'); if (d.smash * Math.min(1, Math.max(0.25, b.sta / 0.6)) >= 1) return out; }
  if (y < 1.05) { if (az < 2.6) add('net'); add('lift'); return out; }
  for (let shot of ['clear', 'drop', 'drive']) {
    if (shot === 'drive' && y < 1.5) shot = az < 3 ? 'net' : 'clear';
    if (shot === 'drop' && y < 1.75) shot = 'net';
    add(shot);
  }
  return out;
}
// Nothing known about the hitter's intent (online snapshots carry no plan or buffered press; no button pressed yet).
function genericShots(y) {
  if (y < 1.05) return ['net', 'lift'];
  const out = ['clear', 'drive'];
  if (y > 1.45) out.push('smash');
  out.push(y < 1.75 ? 'net' : 'drop');
  return out;
}
// </shot-prediction>
function predictedShots(m, a, at, y) {
  if (!session || session.kind !== 'local') return genericShots(y);
  if (a.ctrl === 'bot') return S.DIFF[a.diff] ? botShotOptions(at, y, S.DIFF) : genericShots(y);
  const inp = a.input || {}, iy = +inp.y || 0;
  if (a.hitQueue > 0) return [humanShotAt(at, y, iy, a.hitPower)];                                   // buffered press
  if (inp.hold && a.assist >= 1) return [humanShotAt(at, y, iy, clamp(inp.holdPower || 0, 0, 1))];   // held button
  if (a.assist >= 2 && !(m.opts && m.opts.autoSave === false)) return [humanShotAt(at, y, iy, 0.5)]; // auto hit
  return genericShots(y);
}
// Clips the hit can select at the predicted contact, through the same selector the hit path uses.
function prepClips(m, a, h, pred) {
  const at = pred.ax === undefined ? a : { ...a, x: pred.ax, z: pred.az }, clips = [];
  for (const shot of predictedShots(m, a, at, pred.y)) {
    const c = selectMatchStroke(at, h, { x: pred.x, y: pred.y, z: pred.z, shot });
    if (c && !clips.includes(c)) clips.push(c);
  }
  return clips;
}
// Bounded joint fitting: no teleporting the body/racket, no changing the simulation.
''')
# 2. attach the candidate clips to the prediction (copied into lastPred with it)
rep('''  if (md.pred && md.pred.t < 0.6) md.lastPred = Object.assign({ at: t }, md.pred);
''','''  if (md.pred && matchClipsEnabled && !debugPose) {
    // Swing family by contact height relative to the athlete at contact: a jump moves the body, not the swing
    // (a bot can leap 1 m and meet the shuttle at waist height; the overhead pose cannot reach down there).
    const tj = md.pred.t, vy = a.vy || 0, jy = a.jumpY > 0 || vy > 0 ? Math.max(0, a.jumpY + vy * tj - 6.5 * tj * tj) : 0;
    md.pred.type = swingType(md.pred.y - jy);
    md.pred.clips = prepClips(m, a, mdl.h, md.pred);
    md.pred.clip = md.pred.clips.length === 1 ? md.pred.clips[0] : null;   // null: shot unknown, neutral preparation
  }
  if (md.pred && md.pred.t < 0.6) md.lastPred = Object.assign({ at: t }, md.pred);
''')
# 3. body placement basis
rep('''      // Lean / lunge / rise for the clip that will actually be shown, not the old hi/mid/lo swing.
      const ev = md.strokeEvent;
      const reachClip = ev ? selectMatchStroke(a, mdl.h, ev) : md.stroke ? md.stroke.clip
        : cp === md.pred ? selectMatchStroke(a, mdl.h, { ...cp, shot: cp.y > 1.35 ? 'clear' : cp.y > 0.85 ? 'drive' : 'lift' }) : null;
      if (reachClip) hl = clipHeadLocal(md, reachClip);
''','''      // Known shot: lean / lunge / rise for the clip that will be shown. Unknown shot: the neutral swing's contact
      // region, kept through the hit (cp.clip === null) so the root never re-targets in the middle of a stroke.
      const ev = md.strokeEvent;
      const reachClip = cp.clip !== undefined ? cp.clip : ev ? selectMatchStroke(a, mdl.h, ev) : md.stroke ? md.stroke.clip : null;
      if (reachClip) hl = clipHeadLocal(md, reachClip);
''')
# 4. preparation clip = the predicted clip when it is unique; otherwise the neutral fitted preparation
rep('''      // Preparation is provisional: actual hit event always chooses the real shot.
      clip = selectMatchStroke(a, mdl.h, { ...md.pred, shot: md.pred.y > 1.35 ? 'clear' : md.pred.y > 0.85 ? 'drive' : 'lift' });
      ct = clip ? Math.max(0, SPAnim.CLIPS[clip].contact - md.pred.t) : 0;
    }
''','''      // Preparation uses the clip the hit will select when that is already determined; the hit event still decides.
      clip = md.pred.clip || null;
      ct = clip ? Math.max(0, SPAnim.CLIPS[clip].contact - md.pred.t) : 0;
    }
    // Unknown shot: no clip is assumed. What every candidate shares is the contact point.
    if (!clip && !stroke && !holding && md.pred && md.pred.t < 0.3 && incoming && a.swingT < 0 && a.diveT < 0 && a.recoverT <= 0 && mdl.rig) {
      const layerNodes=[mdl.arm,mdl.armEl,mdl.wrist,mdl.rig.chest];
      // Independent poses (never the damped Euler values of the last rendered frame).
      const setBase=(p)=>{mdl.arm.rotation.set(p.s[0],0,p.s[1]*mdl.h); mdl.armEl.rotation.set(p.e[0],0,p.e[1]*mdl.h); mdl.wrist.rotation.set(p.w,0,0); mdl.rig.chest.rotation.set(0,0,0);};
      // 1. Aim: fit the neutral swing's own contact pose to the predicted contact point. That correction varies
      //    slowly (only with the prediction and the body), so the 8 rad/s slew keeps up with it.
      const hit=swingPose(md.pred.type,0.38), fitTarget=new THREE.Vector3(md.pred.x,md.pred.y,md.pred.z);
      setBase(hit);
      const hitBase=layerNodes.map(n=>n.quaternion.clone());
      if(!md.neutralCorrection) md.neutralCorrection=layerNodes.map(()=>new THREE.Quaternion());   // enter from no correction, slewed like every later frame
      const cleanError=fitMatchRacket(mdl,fitTarget,1), cleanSolved=layerNodes.map(n=>n.quaternion.clone());
      layerNodes.forEach((n,i)=>n.quaternion.copy(hitBase[i]).multiply(md.neutralCorrection[i]));
      const warmError=fitMatchRacket(mdl,fitTarget,1);
      if(!(warmError<=cleanError || warmError<0.02)) layerNodes.forEach((n,i)=>n.quaternion.copy(cleanSolved[i]));
      const correction=layerNodes.map((n,i)=>{
        const q=hitBase[i].clone().invert().multiply(n.quaternion), prev=md.neutralCorrection[i], angle=prev.angleTo(q);
        return prev.clone().slerp(q,angle?Math.min(1,8*dt/angle):1);
      });
      md.neutralCorrection=correction.map(q=>q.clone());
      // 2. Show: the neutral swing, carrying the aim in as the shuttle arrives; at contact it is the fitted contact
      //    pose, which the hit frame then starts from. A low swing goes from ready straight to its contact pose:
      //    its drawn-back start passes through the floor (the floor guard would pop the wrist).
      const u=clamp((0.3-md.pred.t)/0.3,0,1);
      setBase(md.pred.type==='lo' ? mixPose(POSE.ready,hit,u*u*(3-2*u)) : pose);
      const base=layerNodes.map(n=>n.quaternion.clone()), w=clamp(1-md.pred.t/0.2,0,1), weight=w*w*(3-2*w);
      layerNodes.forEach((n,i)=>n.quaternion.copy(base[i]).multiply(new THREE.Quaternion().slerp(correction[i],weight)));
      md.matchClip='neutralPrep';   // owner label: crossfades in and out, chest restored before the next frame
    } else md.neutralCorrection=null;
''')
# 4b. vertical arrival never moves the root faster than a jump take-off (the predicted contact height can step on the
#     last frames; closing the whole gap in one frame showed as a 6-8 m/s root pop)
rep('''    md.crouch = (md.crouch || 0) + (crouch - (md.crouch || 0)) * f;
    md.rise = (md.rise || 0) + (rise - (md.rise || 0)) * f;
''','''    const vmax = 4 * dt;   // m per frame; jump take-off speeds are 4.5-5.3 m/s
    md.crouch = (md.crouch || 0) + clamp((crouch - (md.crouch || 0)) * f, -vmax, vmax);
    md.rise = (md.rise || 0) + clamp((rise - (md.rise || 0)) * f, -vmax, vmax);
''')
# 4c. clips do not author the chest: the hit frame's clean start keeps it where it was rendered
rep('''        const fitTarget=new THREE.Vector3(target.x,target.y,target.z);
        let fitError=fitMatchRacket(mdl,fitTarget,1), fitStart='clean';
''','''        const fitTarget=new THREE.Vector3(target.x,target.y,target.z);
        if(stroke && stroke.elapsed===0) mdl.rig.chest.quaternion.copy(previousSolved[3]);   // clips do not author the chest: start it where it was rendered
        let fitError=fitMatchRacket(mdl,fitTarget,1), fitStart='clean';
''')
# 5. a warm start already within the solver's finest step keeps continuity
rep('''          if(warmError<=fitError){fitError=warmError;fitStart='warm';}
''','''          if(warmError<=fitError || warmError<0.02){fitError=warmError;fitStart='warm';}   // within the finest solver step: keep continuity
''')
out=ROOT/outname;out.write_bytes(src.encode('utf-8'))
print(outname,hashlib.sha256(out.read_bytes()).hexdigest())
