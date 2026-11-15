# Usage: build-arm-crossfade.py <base candidate snapshot> <output snapshot>. Adds serve address fit + arm ownership crossfade. Never writes game.js.
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
# 1. Procedural arm poses author X/Z only: clear the axes a fitted/crossfaded quaternion may have left behind.
rep('''  setArm(mdl, 'arm', pose, rate, dt);
  setArm(mdl, 'free', fpose, debugPose ? 0 : 9, dt);
  if (matchClipsEnabled && !debugPose) {''','''  if (matchClipsEnabled && !debugPose) { mdl.arm.rotation.y = 0; mdl.armEl.rotation.y = 0; mdl.wrist.rotation.y = 0; mdl.wrist.rotation.z = 0; }
  setArm(mdl, 'arm', pose, rate, dt);
  setArm(mdl, 'free', fpose, debugPose ? 0 : 9, dt);
  if (matchClipsEnabled && !debugPose) {''')
# 2. Serve address: while the shuttle is held the racket rests at the authoritative contact point,
#    so the release frame (whose timing stays authoritative) starts from there instead of snapping.
rep('''  if(md.armLayer && (!md.matchClip || a.diveT>=0 || m.state!=='rally')) md.armLayer=null;''','''  if (matchClipsEnabled && !debugPose && holding && mdl.rig && !md.stroke) {
    const p=POSE.serve, holdNodes=[mdl.arm,mdl.armEl,mdl.wrist,mdl.rig.chest];
    mdl.arm.rotation.set(p.s[0],0,p.s[1]*mdl.h); mdl.armEl.rotation.set(p.e[0],0,p.e[1]*mdl.h); mdl.wrist.rotation.set(p.w,0,0); mdl.rig.chest.rotation.set(0,0,0);
    const holdTarget=new THREE.Vector3(sh.p.x,sh.p.y,sh.p.z), holdClean=holdNodes.map(n=>n.quaternion.clone());
    const holdGap=()=>{mdl.root.updateMatrixWorld(true);return mdl.wrist.localToWorld(new THREE.Vector3(0,-0.71,0)).distanceTo(holdTarget);};
    // The target is static while held: keep the last solution until it drifts past the solver's finest step (~2 cm).
    if(md.holdSolved) holdNodes.forEach((n,i)=>n.quaternion.copy(md.holdSolved[i]));
    if(!md.holdSolved || holdGap()>0.02){
      const warmError=md.holdSolved?fitMatchRacket(mdl,holdTarget,1):Infinity, warmSolved=holdNodes.map(n=>n.quaternion.clone());
      holdNodes.forEach((n,i)=>n.quaternion.copy(holdClean[i]));
      if(fitMatchRacket(mdl,holdTarget,1)>=warmError) holdNodes.forEach((n,i)=>n.quaternion.copy(warmSolved[i]));
      md.holdSolved=holdNodes.map(n=>n.quaternion.clone());
    }
    // Shown pose slews from the last rendered pose at the fitted layer's existing 8 rad/s limit.
    holdNodes.forEach((n,i)=>{const to=n.quaternion.clone(), angle=previousSolved[i].angleTo(to); n.quaternion.copy(previousSolved[i]).slerp(to,angle>0?Math.min(1,8*dt/angle):1);});
    md.matchClip='serveHold';
  } else md.holdSolved=null;
  if(md.armLayer && (!md.matchClip || a.diveT>=0 || m.state!=='rally')) md.armLayer=null;''')
# 3. Ownership crossfade: any change of what drives the racket arm blends from the last rendered pose
#    over 0.1 s. Entering a stroke is the contact frame and is never blended or delayed.
rep('''  floorGuard(mdl);
  if (matchClipsEnabled && md.checkAt''','''  if (matchClipsEnabled && mdl.rig && !debugPose) {
    const owner = md.stroke ? 'stroke' : (md.matchClip || 'procedural');
    if (owner !== md.armOwner) md.armFade = owner === 'stroke' || md.armOwner === undefined ? null : { elapsed: 0, from: previousSolved };
    md.armOwner = owner;
    if (md.armFade) {
      md.armFade.elapsed += dt;
      const u = clamp(md.armFade.elapsed / 0.1, 0, 1), k = u * u * (3 - 2 * u);
      const layerOwned = owner !== 'procedural' && owner !== 'ready' && owner !== 'splitStep';
      [mdl.arm, mdl.armEl, mdl.wrist, mdl.rig.chest].forEach((n, i) => {
        if (i === 3 && !layerOwned) return;   // chest belongs to locomotion / ready handoff there
        const to = n.quaternion.clone(); n.quaternion.copy(md.armFade.from[i]).slerp(to, k);
      });
      if (u >= 1) md.armFade = null;
    }
  }
  floorGuard(mdl);
  if (matchClipsEnabled && md.checkAt''')
# 4. Drop the unbounded diagnostic array kept by the transfer experiment.
rep('''          (window.__transferChecks ||= []).push({shot:stroke.event.shot,player:a.i,
            angles:base.map((q,i)=>q.clone().multiply(md.armLayer.correction[i]).angleTo(previousSolved[i])),
            previous:previousSolved.map(q=>q.toArray()),authored:base.map(q=>q.toArray()),
            correction:md.armLayer.correction.map(q=>q.toArray())});
''','')
out=ROOT/outname;out.write_bytes(src.encode('utf-8'))
print(outname,hashlib.sha256(out.read_bytes()).hexdigest())
