# Usage: build-facing-aware-lunge.py <base candidate snapshot> <output snapshot>. Never writes game.js.
# Blocker found with combined-09 on seeds 4711 / 77001 (partA-combined-09-acceptance.txt): every contact that regressed by
# more than 1.5 cm had the body still turning at the 3.2 rad/s facing limit on the contact frame (target bearing 1.3-2.0 rad
# off the facing), so the racket head - which only lines up with the target once the turn is complete - was 0.65-0.75 m
# from the shoulder line instead of ~0.37 m: out of reach. The lunge assumed the turn had finished (a distance along the
# athlete->target line). Here the step is the vector still missing at the facing the body actually has.
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
rep('''  let lungeT = 0, crouch = 0, rise = 0;
''','''  let lungeT = 0, crouch = 0, rise = 0, lungeStep = null;
''')
rep('''    md.lungeDir = dist > 0.01 ? { x: dx / dist, z: dz / dist } : md.lungeDir;
''','''    md.lungeDir = dist > 0.01 ? { x: dx / dist, z: dz / dist } : md.lungeDir;
    if (matchClipsEnabled && !debugPose) {
      // The racket head lines up with the target only once the body has finished turning, and the turn is rate
      // limited. Step by what is still missing at the facing the body actually has (same 0.55 m limit).
      const c = Math.cos(previousFacing), s = Math.sin(previousFacing);
      const lx = dx - (hl.x * c + hl.z * s), lz = dz - (hl.z * c - hl.x * s), ll = Math.hypot(lx, lz), k = ll > 0.55 ? 0.55 / ll : 1;
      lungeStep = { x: lx * k, z: lz * k };
    }
''')
rep('''  if (md.lungeDir) mdl.root.position.set(a.x + md.lungeDir.x * md.lunge, a.jumpY + md.rise, a.z + md.lungeDir.z * md.lunge);
''','''  if (matchClipsEnabled && !debugPose) {
    const v = md.lungeVec || (md.lungeVec = { x: 0, z: 0 }), rate = cp ? 16 : 5;
    v.x = damp(v.x, lungeStep ? lungeStep.x * near : 0, rate, dt); v.z = damp(v.z, lungeStep ? lungeStep.z * near : 0, rate, dt);
    mdl.root.position.set(a.x + v.x, a.jumpY + md.rise, a.z + v.z);
  } else if (md.lungeDir) mdl.root.position.set(a.x + md.lungeDir.x * md.lunge, a.jumpY + md.rise, a.z + md.lungeDir.z * md.lunge);
''')
# neutral preparation keeps the same court-facing window the clips use (never turns its back to the net chasing a
# bearing that swings when the shuttle is almost overhead)
rep('''    const desired = md.clipFacing === undefined ? md.yaw : md.clipFacing;
''','''    const desired = md.clipFacing !== undefined ? md.clipFacing
      : cp ? facing + clamp(Math.atan2(Math.sin(md.yaw - facing), Math.cos(md.yaw - facing)), -1.2, 1.2) : md.yaw;
''')
out=ROOT/outname;out.write_bytes(src.encode('utf-8'))
print(outname,hashlib.sha256(out.read_bytes()).hexdigest())
