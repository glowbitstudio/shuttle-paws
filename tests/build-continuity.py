# Usage: build-continuity.py <base candidate snapshot> <output snapshot>. Never writes game.js.
# Continuity items left by combined-12 (partA-combined-12-acceptance.txt):
#  1. seed 89123 t1648 (serve hit frame, wrist 2.99 rad) : the analytic clean start beat the warm start by under 2 cm and the
#     pose switched solution branch. A warm start now wins unless another start is better by more than the finest solver
#     step (2 cm) - at all three call sites.
#  2. human input t1217 (known clip, elbow 2.60 rad on the hit frame): the known-clip preparation fitted the SWINGING pose,
#     whose needed correction changes faster than the 8 rad/s slew, so it never converged and the hit frame jumped to the
#     clean solution. It now aims the clip's own CONTACT pose (slowly varying correction, as the neutral preparation
#     does) and carries that correction on the swinging pose.
#  3. human input t776-777 (rise rate 6.1 m/s, arm 2.1 rad): the buffered press expired one frame before the hit, the shot
#     became "unknown" for one frame and body + arm re-targeted. A clip that was already being prepared is kept while it
#     is still among the candidates; and the root rise never moves faster than 4 m/s in any branch.
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
# 1. continuity margin
rep('''      if(!(warmError<=cleanError || warmError<0.02)) layerNodes.forEach((n,i)=>n.quaternion.copy(cleanSolved[i]));
''','''      if(!(warmError<=cleanError+0.02)) layerNodes.forEach((n,i)=>n.quaternion.copy(cleanSolved[i]));   // warm keeps unless beaten by more than the finest solver step
''')
rep('''          if(warmError<=fitError || warmError<0.02){fitError=warmError;fitStart='warm';}   // within the finest solver step: keep continuity
''','''          if(warmError<=fitError+0.02){fitError=warmError;fitStart='warm';}   // warm keeps unless beaten by more than the finest solver step
''')
rep('''      if(fitMatchClean(mdl,holdTarget)>=warmError) holdNodes.forEach((n,i)=>n.quaternion.copy(warmSolved[i]));
''','''      if(fitMatchClean(mdl,holdTarget)+0.02>=warmError) holdNodes.forEach((n,i)=>n.quaternion.copy(warmSolved[i]));
''')
# 2. known-clip preparation aims the contact pose
rep('''      const base=layerNodes.map(n=>n.quaternion.clone());
      if(w>0){
        if(stroke && stroke.elapsed===0){
''','''      const base=layerNodes.map(n=>n.quaternion.clone());
      // Preparation aims the clip's own contact pose (its correction varies slowly, so the slew keeps up and the hit
      // frame starts from a racket that is already there); a running stroke is fitted where it is.
      let aim=base;
      if(!stroke && w>0){
        const cpose=SPAnim.sample(clip,contact).arm;
        aim=[new THREE.Quaternion().setFromEuler(new THREE.Euler(cpose.s[0],0,cpose.s[1]*mdl.h,'XYZ')),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(cpose.e[0],0,cpose.e[1]*mdl.h,'XYZ')),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(cpose.w,0,0,'XYZ')), base[3].clone()];
        layerNodes.forEach((n,i)=>n.quaternion.copy(aim[i]));
      }
      if(w>0){
        if(stroke && stroke.elapsed===0){
''')
rep('''          layerNodes.forEach((n,i)=>n.quaternion.copy(base[i]).multiply(md.armLayer.correction[i]));
          const warmError=fitMatchRacket(mdl,fitTarget,1);
          if(window.__matchFitTrace)''','''          layerNodes.forEach((n,i)=>n.quaternion.copy(aim[i]).multiply(md.armLayer.correction[i]));
          const warmError=fitMatchRacket(mdl,fitTarget,1);
          if(window.__matchFitTrace)''')
rep('''        let correction=layerNodes.map((n,i)=>base[i].clone().invert().multiply(n.quaternion));
''','''        let correction=layerNodes.map((n,i)=>aim[i].clone().invert().multiply(n.quaternion));
''')
# 3. keep a clip that is already being prepared; rise rate cap in every branch
rep('''    md.pred.clip = md.pred.clips.length === 1 ? md.pred.clips[0] : null;   // null: shot unknown, neutral preparation
  }
''','''    md.pred.clip = md.pred.clips.length === 1 ? md.pred.clips[0]
      : md.prepClip && md.pred.clips.includes(md.prepClip) ? md.prepClip   // already preparing it and it is still possible: keep it
      : null;                                                             // shot unknown: neutral preparation
  }
  md.prepClip = md.pred ? md.pred.clip || null : null;
''')
rep('''    md.crouch = damp(md.crouch || 0, crouch * near, cp ? 16 : 5, dt);
    md.rise = damp(md.rise || 0, rise * near, cp ? 18 : 6, dt);
  }
''','''    md.crouch = damp(md.crouch || 0, crouch * near, cp ? 16 : 5, dt);
    const riseBefore = md.rise || 0;
    md.rise = damp(riseBefore, rise * near, cp ? 18 : 6, dt);
    if (matchClipsEnabled && !debugPose) md.rise = riseBefore + clamp(md.rise - riseBefore, -4 * dt, 4 * dt);   // never faster than a jump take-off
  }
''')
out=ROOT/outname;out.write_bytes(src.encode('utf-8'))
print(outname,hashlib.sha256(out.read_bytes()).hexdigest())
