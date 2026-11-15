# Usage: floor-check.py <trace dir> [...]   -- per trace: minimum height of the racket points ('floor'), racket head, and
# racket shoulder; number of frames each is below the floor (-0.005 m tolerance) and where the worst frames are.
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[1]
for d in sys.argv[1:]:
    r=json.loads((ROOT/d/'presentation-0.json').read_text());rows=r['rows']
    def stat(f):
        vals=[(f(x),x['tick'],x['player'],x['clip']) for x in rows];m=min(vals);n=sum(1 for v in vals if v[0]<-0.005);return m,n
    fl,nf=stat(lambda x:x['floor']);tp,nt=stat(lambda x:x['tip'][1]);sh,ns=stat(lambda x:x['shoulder'][1])
    print(f"{d:40s} racket min {fl[0]:+.3f} (t{fl[1]} p{fl[2]} {fl[3]}) below-floor frames {nf} | head min {tp[0]:+.3f} frames {nt} | shoulder min {sh[0]:+.3f} (t{sh[1]} p{sh[2]}) frames {ns}")
