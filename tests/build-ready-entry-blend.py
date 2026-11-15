# Usage: build-ready-entry-blend.py <base candidate snapshot> <output snapshot>. Never writes game.js.
# Entering the ready / split-step clip from anything but a finished stroke (e.g. getting up from a dive, body still tilted
# 0.5 rad) snapped the whole body in one frame. Every entry now blends from the pose it had (the existing 0.22 s handoff).
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
rep('''    mdl.body.position.y = 0;
    mdl.body.rotation.x = 0; mdl.body.rotation.z = 0;
''','''    if (!md.readyHandoff && md.readyFrame !== md.frameNo - 1)   // fresh entry: blend in from the pose it has now
      md.readyHandoff={elapsed:0,nodes:[mdl.body,mdl.rig.hips,mdl.rig.chest,mdl.head,...mdl.rig.legs.flatMap(l=>[l.thigh,l.knee,l.ankle])].map(node=>({node,p:node.position.clone(),q:node.quaternion.clone()}))};
    md.readyFrame = md.frameNo;
    mdl.body.position.y = 0;
    mdl.body.rotation.x = 0; mdl.body.rotation.z = 0;
''')
rep('''  const previousSolved=[mdl.arm,mdl.armEl,mdl.wrist,mdl.rig.chest].map(n=>n.quaternion.clone());
''','''  const previousSolved=[mdl.arm,mdl.armEl,mdl.wrist,mdl.rig.chest].map(n=>n.quaternion.clone());
  md.frameNo = (md.frameNo || 0) + 1;
''')
out=ROOT/outname;out.write_bytes(src.encode('utf-8'))
print(outname,hashlib.sha256(out.read_bytes()).hexdigest())
