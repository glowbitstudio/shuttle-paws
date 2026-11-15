# Usage: build-smooth-floor-guard.py <base candidate snapshot> <output snapshot>. Never writes game.js.
# The floor guard bends the wrist in one frame by whatever keeps the racket above the floor (up to 2.2 rad) and can flip
# direction the next frame: a visible wrist pop when a low wind-up dips (seed 4711, t1787/1789). With match clips the
# racket arm is first blended toward the ready pose by the smallest amount that clears the floor (continuous in time);
# the wrist-bending guard remains as the safety net and for dives.
from pathlib import Path
import hashlib,sys
ROOT=Path(__file__).resolve().parents[1]
base,outname=sys.argv[1],sys.argv[2]
assert outname!='game.js' and base!='game.js'
src=(ROOT/base).read_bytes().decode('utf-8')
old="  floorGuard(mdl);\r\n"
new="""  if (matchClipsEnabled && !debugPose && mdl.rig && a.diveT < 0 && a.recoverT <= 0) {
    // Continuous guard: blend the racket arm toward the ready pose (always clear of the floor) by the smallest amount
    // that lifts the racket clear. The wrist-bending guard below stays as the safety net (and for dives).
    mdl.root.updateMatrixWorld(true);
    const low = () => { let mn = 9; for (const y of [-0.4, -0.6, -0.71, -0.86]) mn = Math.min(mn, mdl.wrist.localToWorld(guardV.set(0, y, 0)).y); return mn; };
    if (low() < 0.06) {
      const nodes = [mdl.arm, mdl.armEl, mdl.wrist], from = nodes.map(n => n.quaternion.clone()), p = POSE.ready;
      const safe = [new THREE.Quaternion().setFromEuler(new THREE.Euler(p.s[0], 0, p.s[1] * mdl.h, 'XYZ')), new THREE.Quaternion().setFromEuler(new THREE.Euler(p.e[0], 0, p.e[1] * mdl.h, 'XYZ')), new THREE.Quaternion().setFromEuler(new THREE.Euler(p.w, 0, 0, 'XYZ'))];
      const set = (u) => { nodes.forEach((n, i) => n.quaternion.copy(from[i]).slerp(safe[i], u)); mdl.arm.updateMatrixWorld(true); return low(); };
      let lo = 0, hi = 1;
      if (set(1) >= 0.06) { for (let i = 0; i < 7; i++) { const mid = (lo + hi) / 2; if (set(mid) >= 0.06) hi = mid; else lo = mid; } set(hi); }
    }
  }
  floorGuard(mdl);
"""
assert src.count(old)==1; src=src.replace(old,new)
out=ROOT/outname;out.write_bytes(src.encode('utf-8'))
print(outname,hashlib.sha256(out.read_bytes()).hexdigest())
