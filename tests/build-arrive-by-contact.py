# Usage: build-arrive-by-contact.py <base candidate snapshot> <output snapshot> [all|vertical]. Never writes game.js.
# all (combined-04, REJECTED: full horizontal arrival puts smash/lift/net targets inside reach where the solver cannot fold)
# vertical (combined-05): only rise / crouch arrive by contact; the horizontal lunge keeps its damped chase.
# Blocker found on the Part-A input (partA-combined-03-01): clear/rear_clear tick 374 p1 misses by 5.6 cm because the root
# rise is a first-order damp chasing the 0.35 s `near` ramp and is still 6.7 cm short of its own target on the contact frame
# (arm fully extended: physical reach, not the solver). While the prediction is live the time to contact is known, so the
# remaining lunge / crouch / rise gap is closed linearly and placement is complete on the contact frame. Opt-in clips only.
from pathlib import Path
import hashlib,sys
ROOT=Path(__file__).resolve().parents[1]
base,outname=sys.argv[1],sys.argv[2]
mode=sys.argv[3] if len(sys.argv)>3 else 'all'
assert mode in('all','vertical')
assert outname!='game.js' and base!='game.js'
src=(ROOT/base).read_bytes().decode('utf-8')
def rep(old,new):
    global src
    old=old.replace('\n','\r\n');new=new.replace('\n','\r\n')
    assert src.count(old)==1,(src.count(old),old[:80])
    src=src.replace(old,new)
rep('''  md.lunge = damp(md.lunge || 0, lungeT * near, cp ? 16 : 5, dt);
  md.crouch = damp(md.crouch || 0, crouch * near, cp ? 16 : 5, dt);
  md.rise = damp(md.rise || 0, rise * near, cp ? 18 : 6, dt);
''','''  if (matchClipsEnabled && !debugPose && cp && cp === md.pred && near > 0) {
    // Time to contact is known: close the remaining gap linearly so body placement is complete on the contact
    // frame. A damped chase of the ramp is still ~20% short there, which costs reach on high / wide contacts.
    const f = Math.min(1, dt / Math.max(cp.t, dt));
    LUNGE
    md.crouch = (md.crouch || 0) + (crouch - (md.crouch || 0)) * f;
    md.rise = (md.rise || 0) + (rise - (md.rise || 0)) * f;
  } else {
    md.lunge = damp(md.lunge || 0, lungeT * near, cp ? 16 : 5, dt);
    md.crouch = damp(md.crouch || 0, crouch * near, cp ? 16 : 5, dt);
    md.rise = damp(md.rise || 0, rise * near, cp ? 18 : 6, dt);
  }
''')
src=src.replace('    LUNGE','    md.lunge = (md.lunge || 0) + (lungeT - (md.lunge || 0)) * f;' if mode=='all' else '    md.lunge = damp(md.lunge || 0, lungeT * near, 16, dt);   // horizontal: unchanged damped chase')
if mode=='vertical': src=src.replace('so body placement is complete on the contact','so the vertical placement (rise / crouch) is complete on the contact')
out=ROOT/outname;out.write_bytes(src.encode('utf-8'))
print(outname,hashlib.sha256(out.read_bytes()).hexdigest())
