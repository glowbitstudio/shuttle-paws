# Usage: rebase-partA.py <old-base candidate snapshot> <output snapshot>
# Re-applies a candidate's diff (against the pre-Part-A accepted game.js, sha 271ffb3c...) onto the Part-A game.js.
# Part A changed exactly two places in game.js (arena light rings, timing-meter zones); neither overlaps a candidate hunk,
# so base+PartA+candidate == candidate with the same two replacements. Both identities are asserted. Never writes game.js.
from pathlib import Path
import hashlib,sys,difflib
ROOT=Path(__file__).resolve().parents[1]
old=(ROOT/'game.js.pre-partA.bak').read_bytes().decode('utf-8')
assert hashlib.sha256(old.encode()).hexdigest()=='271ffb3cbe5812a4d742efac04f990c95f71ac92d4f2ccc5a5017052ef8d3460'
new=(ROOT/'game.js').read_bytes().decode('utf-8')
assert hashlib.sha256(new.encode()).hexdigest()=='ab2806f46546f1d6ea63e6810d676ec0d85e09ed41a3c5d9f0d866376e8e1d84'
ol,nl=old.split('\r\n'),new.split('\r\n')
reps=[]
for tag,i1,i2,j1,j2 in difflib.SequenceMatcher(None,ol,nl,autojunk=False).get_opcodes():
    if tag!='equal': reps.append(('\r\n'.join(ol[i1:i2]),'\r\n'.join(nl[j1:j2])))
assert len(reps)==2,len(reps)
chk=old
for a,b in reps:
    assert chk.count(a)==1; chk=chk.replace(a,b)
assert chk==new
src=(ROOT/sys.argv[1]).read_bytes().decode('utf-8')
assert sys.argv[2]!='game.js'
for a,b in reps:
    assert src.count(a)==1,(src.count(a),a[:60]); src=src.replace(a,b)
(ROOT/sys.argv[2]).write_bytes(src.encode('utf-8'))
print(sys.argv[2],hashlib.sha256(src.encode()).hexdigest())
