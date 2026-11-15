# Builds the projected-warm-start candidate from the (rejected) transfer candidate. Never touches game.js.
from pathlib import Path
import hashlib,sys
ROOT=Path(__file__).resolve().parents[1]
src=(ROOT/'transferred-arm-layer.snapshot').read_bytes().decode('utf-8')
assert hashlib.sha256(src.encode('utf-8')).hexdigest()=='109018d0ee90106b2d3bd6c09769a59ef33abcfae63b43a571619bda577731d2'
def rep(old,new):
    global src
    old=old.replace('\n','\r\n');new=new.replace('\n','\r\n')
    assert src.count(old)==1,(src.count(old),old[:80])
    src=src.replace(old,new)
# 1. shared joint table, feasibility projection, bound assertion
rep('''function fitMatchRacket(mdl, target, weight) {
  const tip = new THREE.Vector3(0, -0.71, 0), world = new THREE.Vector3();
  const joints = [[mdl.arm.rotation,'x',-3.2,1.5], [mdl.arm.rotation,'z',-1.6,1.6],
    [mdl.armEl.rotation,'x',-2.6,0.05], [mdl.armEl.rotation,'z',-0.6,0.6], [mdl.wrist.rotation,'x',-1.5,1.5], [mdl.wrist.rotation,'y',-1.2,1.2], [mdl.rig.chest.rotation,'y',-0.45,0.45], [mdl.rig.chest.rotation,'x',-0.22,0.22]];
''','''const matchFitJoints = mdl => [[mdl.arm.rotation,'x',-3.2,1.5], [mdl.arm.rotation,'z',-1.6,1.6],
    [mdl.armEl.rotation,'x',-2.6,0.05], [mdl.armEl.rotation,'z',-0.6,0.6], [mdl.wrist.rotation,'x',-1.5,1.5], [mdl.wrist.rotation,'y',-1.2,1.2], [mdl.rig.chest.rotation,'y',-0.45,0.45], [mdl.rig.chest.rotation,'x',-0.22,0.22]];
// Project a start pose onto the solver's joint limits. A quaternion has two Euler readings
// (a,b,c) and (a+pi, pi-b, c+pi); each is clamped and the one that moves the joint least is kept.
// Ties keep the reading whose middle angle is within +-pi/2: the branch every authored pose lives in.
function projectMatchFit(mdl) {
  const joints = matchFitJoints(mdl), wrap = v => Math.atan2(Math.sin(v), Math.cos(v));
  let moved = 0;
  for (const node of [mdl.arm, mdl.armEl, mdl.wrist, mdl.rig.chest]) {
    const r = node.rotation, o = r.order.toLowerCase(), original = node.quaternion.clone();
    const readings = [{ x: r.x, y: r.y, z: r.z }, { x: r.x, y: r.y, z: r.z }];
    readings[1][o[0]] = wrap(r[o[0]] + Math.PI); readings[1][o[1]] = wrap(Math.PI - r[o[1]]); readings[1][o[2]] = wrap(r[o[2]] + Math.PI);
    readings.sort((p, q) => Math.abs(p[o[1]]) - Math.abs(q[o[1]]));   // authored branch first
    let best = null;
    for (const reading of readings) {
      const v = { ...reading };
      for (const [jr, k, lo, hi] of joints) if (jr === r) v[k] = clamp(v[k], lo, hi);
      const angle = new THREE.Quaternion().setFromEuler(new THREE.Euler(v.x, v.y, v.z, r.order)).angleTo(original);
      if (!best || angle < best.angle - 1e-9) best = { v, angle };
    }
    r.set(best.v.x, best.v.y, best.v.z);
    moved = Math.max(moved, best.angle);
  }
  return moved;
}
function fitMatchRacket(mdl, target, weight) {
  const tip = new THREE.Vector3(0, -0.71, 0), world = new THREE.Vector3();
  const joints = matchFitJoints(mdl);
  // The coordinate search only clamps trial steps, so it must be entered with a feasible pose.
  projectMatchFit(mdl);
''')
rep('''    r[k]=value;
  }
  return distance();
}''','''    r[k]=value;
  }
  for (const [r,k,lo,hi] of joints) if (!(r[k] >= lo && r[k] <= hi)) {
    (window.__matchFitBoundViolations ||= []).push({ axis: k, value: r[k], lo, hi });
    console.assert(false, 'fitMatchRacket left a joint outside its limits', k, r[k], lo, hi);
  }
  return distance();
}''')
# 2. two deterministic starts: projected warm start vs clean feasible authored start
rep('''        if(md.armLayer.correction) layerNodes.forEach((n,i)=>n.quaternion.copy(base[i]).multiply(md.armLayer.correction[i]));
        fitMatchRacket(mdl,new THREE.Vector3(target.x,target.y,target.z),1);
''','''        const fitTarget=new THREE.Vector3(target.x,target.y,target.z);
        let fitError=fitMatchRacket(mdl,fitTarget,1), fitStart='clean';
        if(md.armLayer.correction){
          // Lower contact error wins; an exact tie keeps the warm start (continuity).
          const cleanSolved=layerNodes.map(n=>n.quaternion.clone());
          layerNodes.forEach((n,i)=>n.quaternion.copy(base[i]).multiply(md.armLayer.correction[i]));
          const warmError=fitMatchRacket(mdl,fitTarget,1);
          if(window.__matchFitTrace) window.__matchFitTrace({player:a.i,clip,clock:m.clock,first:!!(stroke && stroke.elapsed===0),stroke:!!stroke,clean:fitError,warm:warmError});
          if(warmError<=fitError){fitError=warmError;fitStart='warm';}
          else layerNodes.forEach((n,i)=>n.quaternion.copy(cleanSolved[i]));
        }
''')
out=ROOT/'projected-warm-start.snapshot'
out.write_bytes(src.encode('utf-8'))
print(hashlib.sha256(out.read_bytes()).hexdigest())
