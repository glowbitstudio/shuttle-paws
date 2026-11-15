# Usage: build-analytic-fold.py <base candidate snapshot> <output snapshot>. Never writes game.js.
# Blocker (partA-combined-10-disposition.json): targets INSIDE reach were missed by 4.5-9.6 cm because the coordinate
# search does not fold the elbow from a straight-arm start. Every "clean" solve now also tries an analytic two-bone
# start: the elbow hinge (its X axis, the clip's Z kept) is set so the shoulder->racket-head distance equals the
# shoulder->target distance, the shoulder is swung to point the head at the target, and the existing bounded search runs
# from there (it projects onto the joint limits first). The lower error wins; the analytic start must beat the clean one
# by more than 1 cm, and a warm start within the finest solver step still wins at the call sites (continuity).
from pathlib import Path
import hashlib,sys
ROOT=Path(__file__).resolve().parents[1]
base,outname=sys.argv[1],sys.argv[2]
assert outname!='game.js' and base!='game.js'
src=(ROOT/base).read_bytes().decode('utf-8')
def rep(old,new,count=1):
    global src
    old=old.replace('\n','\r\n');new=new.replace('\n','\r\n')
    assert src.count(old)==count,(src.count(old),old[:80])
    src=src.replace(old,new)
rep('''// Racket-head position in the model's own frame (neutral stance) at a clip's authored contact pose.
''','''// Analytic two-bone start: fold the elbow hinge until the racket head is as far from the shoulder as the target is,
// then swing the shoulder so the head points at the target. Wrist, elbow side angle and chest are left as posed.
const foldSh = new THREE.Vector3(), foldTip = new THREE.Vector3();
function foldMatchArm(mdl, target) {
  mdl.root.updateMatrixWorld(true);
  mdl.arm.getWorldPosition(foldSh);
  const want = foldSh.distanceTo(target), original = clamp(mdl.armEl.rotation.x, -2.6, 0.05);
  const head = (x) => { mdl.armEl.rotation.x = x; mdl.armEl.updateMatrixWorld(true); return mdl.wrist.localToWorld(foldTip.set(0, -0.71, 0)).distanceTo(foldSh); };
  let bestX = original, bestGap = Math.abs(head(original) - want);
  for (let i = 0; i <= 53; i++) {           // 0.05 rad steps over the hinge range; ties keep the fold nearest the posed one
    const x = -2.6 + i * 0.05, gap = Math.abs(head(x) - want);
    if (gap < bestGap - 1e-6 || (gap < bestGap + 1e-6 && Math.abs(x - original) < Math.abs(bestX - original))) { bestGap = gap; bestX = x; }
  }
  head(bestX);
  const from = foldTip.clone().sub(foldSh), to = target.clone().sub(foldSh);
  if (from.lengthSq() < 1e-8 || to.lengthSq() < 1e-8) return;
  const swing = new THREE.Quaternion().setFromUnitVectors(from.normalize(), to.normalize());
  const armWorld = mdl.arm.getWorldQuaternion(new THREE.Quaternion()), parentWorld = mdl.arm.parent.getWorldQuaternion(new THREE.Quaternion());
  mdl.arm.quaternion.copy(parentWorld.invert().multiply(swing).multiply(armWorld));
}
// Clean solve = better of (posed start, analytic fold start). The fold must win by more than 1 cm.
function fitMatchClean(mdl, target) {
  const nodes = [mdl.arm, mdl.armEl, mdl.wrist, mdl.rig.chest], start = nodes.map(n => n.quaternion.clone());
  const posedError = fitMatchRacket(mdl, target, 1), posed = nodes.map(n => n.quaternion.clone());
  nodes.forEach((n, i) => n.quaternion.copy(start[i]));
  foldMatchArm(mdl, target);
  const foldError = fitMatchRacket(mdl, target, 1);
  if (window.__matchFoldTrace) window.__matchFoldTrace({ posed: posedError, fold: foldError });
  if (foldError < posedError - 0.01) return foldError;
  nodes.forEach((n, i) => n.quaternion.copy(posed[i]));
  return posedError;
}
// Racket-head position in the model's own frame (neutral stance) at a clip's authored contact pose.
''')
rep('''      const cleanError=fitMatchRacket(mdl,fitTarget,1), cleanSolved=layerNodes.map(n=>n.quaternion.clone());
''','''      const cleanError=fitMatchClean(mdl,fitTarget), cleanSolved=layerNodes.map(n=>n.quaternion.clone());
''')
rep('''        let fitError=fitMatchRacket(mdl,fitTarget,1), fitStart='clean';
''','''        let fitError=fitMatchClean(mdl,fitTarget), fitStart='clean';
''')
rep('''      if(fitMatchRacket(mdl,holdTarget,1)>=warmError) holdNodes.forEach((n,i)=>n.quaternion.copy(warmSolved[i]));
''','''      if(fitMatchClean(mdl,holdTarget)>=warmError) holdNodes.forEach((n,i)=>n.quaternion.copy(warmSolved[i]));
''')
out=ROOT/outname;out.write_bytes(src.encode('utf-8'))
print(outname,hashlib.sha256(out.read_bytes()).hexdigest())
