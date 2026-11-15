# Usage: build-neutral-lowmid.py <base candidate snapshot> <output snapshot>. Never writes game.js.
# Continuity item (seed 4711, tick 956, player 0): inside the neutral preparation a side-arm ('mid') wind-up dipped the
# racket under the floor and the floor guard bent the wrist 1.9 rad in one frame. The neutral preparation now goes from
# ready straight to the contact pose for side-arm swings too (as it already did for low swings); only overhead swings
# keep their wind-up.
from pathlib import Path
import hashlib,sys
ROOT=Path(__file__).resolve().parents[1]
base,outname=sys.argv[1],sys.argv[2]
assert outname!='game.js' and base!='game.js'
src=(ROOT/base).read_bytes().decode('utf-8')
old="setBase(md.pred.type==='lo' ? mixPose(POSE.ready,hit,u*u*(3-2*u)) : pose);"
new="setBase(md.pred.type!=='hi' ? mixPose(POSE.ready,hit,u*u*(3-2*u)) : pose);   // side-arm and low wind-ups can dip under the floor (floor-guard pop)"
assert src.count(old)==1
src=src.replace(old,new)
out=ROOT/outname;out.write_bytes(src.encode('utf-8'))
print(outname,hashlib.sha256(out.read_bytes()).hexdigest())
