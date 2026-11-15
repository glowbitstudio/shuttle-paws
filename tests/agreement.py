# Usage: agreement.py <trace dir> [trace dir ...]
# Prep-vs-stroke clip agreement per clip contact: what the preparation showed on the last predicted frame before the hit
# versus the clip the hit event selected.
#   exact-correct : one clip prepared and it is the stroke clip
#   exact-wrong   : one clip prepared, the hit selected another
#   neutral       : shot not determined, neutral preparation (candidate set recorded; 'covers' = stroke clip is in it)
#   none          : no prediction in the 6 frames before the hit (serve, or unpredicted exchange)
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[1]
for d in sys.argv[1:]:
    r=json.loads((ROOT/d/'presentation-0.json').read_text())
    rows={(x['tick'],x['player']):x for x in r['rows']}
    count={};lines=[]
    for h in r['hits']:
        t=round(h['renderClock']*120)-1
        p=[p for p in (0,1) if rows[(t,p)]['stroke']==h['clip']][0]
        prev=next((rows[(t-k,p)] for k in range(1,7) if rows.get((t-k,p)) and rows[(t-k,p)]['prediction']),None)
        if h['shot'].startswith('serve') or prev is None: kind='none';shown=None
        elif 'clips' in prev['prediction']:
            c=prev['prediction']['clips']
            if len(c)==1: kind='exact-correct' if c[0]==h['clip'] else 'exact-wrong';shown=c[0]
            else: kind='neutral ('+('covers' if h['clip'] in c else 'MISSES')+')';shown='|'.join(c)
        else:
            shown=prev['clip'];kind='exact-correct' if shown==h['clip'] else 'exact-wrong'
        count[kind]=count.get(kind,0)+1
        lines.append(f"  {h['shot']:10s} t{t:5d} p{p} stroke {h['clip']:17s} {kind:18s} prep {shown}")
    rally=sum(v for k,v in count.items() if k!='none')
    print(d,'rally contacts',rally,count)
    print('\n'.join(lines))
