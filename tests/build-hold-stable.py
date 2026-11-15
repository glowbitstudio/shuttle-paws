# Usage: build-hold-stable.py <base candidate snapshot> <output snapshot>. Never writes game.js.
# Found in the visual check of combined-13 (partA-accepted-visual-check/R-serveHigh.png): while a serve is held the pose
# was re-solved every frame whenever the best reachable gap stayed above 2 cm, alternating between the warm and the folded
# start, so the racket slewed back and forth (0.05-0.12 m per frame) and was 1.45 m from the contact point when the serve
# was hit. The held target is static: the solution is now kept until it gets 2 cm WORSE than what the solve achieved.
from pathlib import Path
import hashlib,sys
ROOT=Path(__file__).resolve().parents[1]
base,outname=sys.argv[1],sys.argv[2]
assert outname!='game.js' and base!='game.js'
src=(ROOT/base).read_bytes().decode('utf-8')
def rep(old,new):
    global src
    assert src.count(old)==1,(src.count(old),old[:80])
    src=src.replace(old,new)
rep("    if(!md.holdSolved || holdGap()>0.02){","    if(!md.holdSolved || holdGap()>md.holdGapSolved+0.02){")
rep("      md.holdSolved=holdNodes.map(n=>n.quaternion.clone());\r\n","      md.holdSolved=holdNodes.map(n=>n.quaternion.clone()); md.holdGapSolved=holdGap();\r\n")
out=ROOT/outname;out.write_bytes(src.encode('utf-8'))
print(outname,hashlib.sha256(out.read_bytes()).hexdigest())
