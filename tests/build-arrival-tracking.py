# Usage: build-arrival-tracking.py <base candidate snapshot> <output snapshot>. Never writes game.js.
# Step 2a blocker (tests/arrival-diagnose.py on combined-15): the contact prediction is exact, the solver reaches the
# predicted point (0-8 cm), but the SHOWN racket drifts away over the last frames (4 -> 22 cm). Cause: the preparation
# warm-started every solve from the shown (rate-limited, half-way) pose, not from the previous solution; the solve then
# landed in a different solution branch from frame to frame and the 8 rad/s slew kept chasing a target that jumped.
# Fix: the solved aim is kept separately (warm-started from the previous SOLUTION, so it stays in one branch and may only
# switch branch while there is still time to travel), and the shown correction is time-aligned: it closes the remaining
# angle by the predicted contact time (never slower than the old 8 rad/s), so the racket arrives along its path.
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
rep('''      if(!md.neutralCorrection) md.neutralCorrection=layerNodes.map(()=>new THREE.Quaternion());   // enter from no correction, slewed like every later frame
      const cleanError=fitMatchClean(mdl,fitTarget), cleanSolved=layerNodes.map(n=>n.quaternion.clone());
      layerNodes.forEach((n,i)=>n.quaternion.copy(hitBase[i]).multiply(md.neutralCorrection[i]));
      const warmError=fitMatchRacket(mdl,fitTarget,1);
      if(!(warmError<=cleanError+0.02)) layerNodes.forEach((n,i)=>n.quaternion.copy(cleanSolved[i]));   // warm keeps unless beaten by more than the finest solver step
      const correction=layerNodes.map((n,i)=>{
        const q=hitBase[i].clone().invert().multiply(n.quaternion), prev=md.neutralCorrection[i], angle=prev.angleTo(q);
        return prev.clone().slerp(q,angle?Math.min(1,8*dt/angle):1);
      });
      md.neutralCorrection=correction.map(q=>q.clone());
''','''      if(!md.neutralCorrection) md.neutralCorrection=layerNodes.map(()=>new THREE.Quaternion());   // enter from no correction, slewed like every later frame
      const correction=trackMatchAim(md,'neutralAim',mdl,layerNodes,hitBase,fitTarget,md.neutralCorrection,md.pred.t,dt);
      md.neutralCorrection=correction.map(q=>q.clone());
''')
rep('''    } else md.neutralCorrection=null;
''','''    } else { md.neutralCorrection=null; md.neutralAim=null; }
''')
rep('''        let fitError=fitMatchClean(mdl,fitTarget), fitStart='clean';
        if(md.armLayer.correction){
''','''        let fitError=0, fitStart='clean', tracked=null;
        if(!stroke){
          // preparation: branch-stable aim, shown correction arrives by the predicted contact time
          if(!md.armLayer.correction) md.armLayer.correction=layerNodes.map(()=>new THREE.Quaternion());
          tracked=trackMatchAim(md.armLayer,'aim',mdl,layerNodes,aim,fitTarget,md.armLayer.correction,md.pred.t,dt);
        } else fitError=fitMatchClean(mdl,fitTarget);
        if(stroke && md.armLayer.correction){
''')
rep('''        let correction=layerNodes.map((n,i)=>aim[i].clone().invert().multiply(n.quaternion));
        if(md.armLayer.correction && !(stroke && stroke.elapsed===0)) correction=correction.map((q,i)=>{
''','''        let correction=tracked || layerNodes.map((n,i)=>aim[i].clone().invert().multiply(n.quaternion));
        if(!tracked && md.armLayer.correction && !(stroke && stroke.elapsed===0)) correction=correction.map((q,i)=>{
''')
rep('''// Racket-head position in the model's own frame (neutral stance) at a clip's authored contact pose.
''','''// Preparation aim. `store[key]` holds the last SOLVED correction (relative to `aimBase`, the contact pose being aimed):
// the next solve warm-starts from it, so the solution stays in one branch while the target and the body move. Another
// branch is taken only when it is better by 3 cm and there is still time to travel there (or the kept one misses by
// 10 cm). Returns the correction to SHOW: `shown` moved toward the solution so that it gets there by the predicted
// contact time `tLeft` (never slower than 8 rad/s).
function trackMatchAim(store, key, mdl, nodes, aimBase, target, shown, tLeft, dt) {
  const cleanError = fitMatchClean(mdl, target), cleanSolved = nodes.map(n => n.quaternion.clone());
  if (store[key]) {
    nodes.forEach((n, i) => n.quaternion.copy(aimBase[i]).multiply(store[key][i]));
    const keptError = fitMatchRacket(mdl, target, 1);
    const switchBranch = keptError > 0.10 || (tLeft > 0.12 && keptError > cleanError + 0.03);
    if (switchBranch && cleanError < keptError) nodes.forEach((n, i) => n.quaternion.copy(cleanSolved[i]));
  }
  store[key] = nodes.map((n, i) => aimBase[i].clone().invert().multiply(n.quaternion));
  const frames = Math.max(1, Math.round(tLeft / dt));
  return store[key].map((q, i) => { const angle = shown[i].angleTo(q); return shown[i].clone().slerp(q, angle ? Math.min(1, Math.max(8 * dt, angle / frames) / angle) : 1); });
}
// Racket-head position in the model's own frame (neutral stance) at a clip's authored contact pose.
''')
out=ROOT/outname;out.write_bytes(src.encode('utf-8'))
print(outname,hashlib.sha256(out.read_bytes()).hexdigest())
