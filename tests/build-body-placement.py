# Usage: build-body-placement.py <A|AB> <output snapshot>. Builds a body-placement candidate from accepted game.js; never writes game.js.
from pathlib import Path
import hashlib,sys
ROOT=Path(__file__).resolve().parents[1]
variant,outname=sys.argv[1],sys.argv[2]
assert outname!='game.js'
# Optional third argument: another candidate snapshot to build on (default: accepted game.js, hash-checked).
base=sys.argv[3] if len(sys.argv)>3 else 'game.js'
src=(ROOT/base).read_bytes().decode('utf-8')
assert base!='game.js' or hashlib.sha256(src.encode('utf-8')).hexdigest()=='271ffb3cbe5812a4d742efac04f990c95f71ac92d4f2ccc5a5017052ef8d3460'
def rep(old,new):
    global src
    old=old.replace('\n','\r\n');new=new.replace('\n','\r\n')
    assert src.count(old)==1,(src.count(old),old[:80])
    src=src.replace(old,new)
# A1: gated prediction tests reach from where the athlete will be, not where it is now.
rep('''    for (let k = 0; k < 70; k++) {
      if (S.inReachAt(a, p).ok) { md.pred = { t: k * S.DT, x: p.x, y: p.y, z: p.z, type: swingType(p.y) }; break; }
''','''    // Opt-in clips: the athlete keeps travelling until contact, so test reach from where it will be.
    // Presentation only; the simulation's own reach test and positions are untouched.
    const at = matchClipsEnabled ? { ...a } : a;
    for (let k = 0; k < 70; k++) {
      if (at !== a) { at.x = a.x + a.vx * k * S.DT; at.z = a.z + a.vz * k * S.DT; }
      if (S.inReachAt(at, p).ok) { md.pred = { t: k * S.DT, x: p.x, y: p.y, z: p.z, type: swingType(p.y) }; if (at !== a) { md.pred.ax = at.x; md.pred.az = at.z; } break; }
''')
# A2: lunge geometry is measured from the predicted contact stance while the prediction is live.
old_cp='''    const hl = md.headLocal[cp.type], dx = cp.x - a.x, dz = cp.z - a.z, dist = Math.hypot(dx, dz);
'''
new_cp='''    const stance = cp === md.pred && cp.ax !== undefined;
    const dx = cp.x - (stance ? cp.ax : a.x), dz = cp.z - (stance ? cp.az : a.z), dist = Math.hypot(dx, dz);
    let hl = md.headLocal[cp.type];
'''
if variant=='AB':
    new_cp+='''    if (matchClipsEnabled && !debugPose) {
      // Lean / lunge / rise for the clip that will actually be shown, not the old hi/mid/lo swing.
      const ev = md.strokeEvent;
      const reachClip = ev ? selectMatchStroke(a, mdl.h, ev) : md.stroke ? md.stroke.clip
        : cp === md.pred ? selectMatchStroke(a, mdl.h, { ...cp, shot: cp.y > 1.35 ? 'clear' : cp.y > 0.85 ? 'drive' : 'lift' }) : null;
      if (reachClip) hl = clipHeadLocal(md, reachClip);
    }
'''
rep(old_cp,new_cp)
# A3: clip facing during prediction also aims from the predicted contact stance.
rep('''        const dx=target.x-a.x, dz=target.z-a.z;
        const desired=Math.atan2(dx,dz)-Math.atan2(localTip.x,localTip.z);''','''        const dx=target.x-(target.ax===undefined?a.x:target.ax), dz=target.z-(target.az===undefined?a.z:target.az);
        const desired=Math.atan2(dx,dz)-Math.atan2(localTip.x,localTip.z);''')
if variant=='AB':
    rep('''const legTgt = new THREE.Vector3();
function animateAthlete(''','''// Racket-head position in the model's own frame (neutral stance) at a clip's authored contact pose.
// Joint Euler values are restored exactly: later code reads them component-wise.
function clipHeadLocal(md, clip) {
  const cache = md.clipHead || (md.clipHead = {});
  if (!cache[clip]) {
    const mdl = md.model, nodes = [mdl.body, mdl.rig.chest, mdl.arm, mdl.armEl, mdl.wrist];
    const keep = nodes.map(n => [n.rotation.x, n.rotation.y, n.rotation.z]), keepY = mdl.body.position.y;
    nodes.forEach(n => n.rotation.set(0, 0, 0)); mdl.body.position.y = 0;
    setArm(mdl, 'arm', SPAnim.sample(clip, SPAnim.CLIPS[clip].contact).arm, 0, 0); mdl.root.updateMatrixWorld(true);
    const v = mdl.wrist.localToWorld(new THREE.Vector3(0, -0.71, 0)); mdl.root.worldToLocal(v);
    cache[clip] = { x: v.x, y: v.y, z: v.z, r: Math.hypot(v.x, v.z), ang: Math.atan2(v.x, v.z) };
    nodes.forEach((n, i) => n.rotation.set(keep[i][0], keep[i][1], keep[i][2])); mdl.body.position.y = keepY;
  }
  return cache[clip];
}
const legTgt = new THREE.Vector3();
function animateAthlete(''')
out=ROOT/outname
out.write_bytes(src.encode('utf-8'))
print(variant,outname,hashlib.sha256(out.read_bytes()).hexdigest())
