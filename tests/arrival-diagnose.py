# Usage: arrival-diagnose.py <trace dir> [...]  -- per rally contact, frames t-12..t-1: racket head to final contact point,
# head to that frame's predicted point (arm tracking error), predicted point to final contact (prediction error), predicted time error.
from pathlib import Path
import json,math,sys
ROOT=Path(__file__).resolve().parents[1]
tot={}
for d in sys.argv[1:]:
    r=json.loads((ROOT/d/'presentation-0.json').read_text());rows={(x['tick'],x['player']):x for x in r['rows']}
    print('==',d)
    for h in r['hits']:
        if h['shot'].startswith('serve'): continue
        t=round(h['renderClock']*120)-1;p=[p for p in (0,1) if rows[(t,p)]['stroke']==h['clip']][0];tg=h['target'];line=[]
        for k in (12,8,5,3,2,1):
            row=rows.get((t-k,p));pr=row and row['prediction']
            if not row: continue
            a=math.dist(row['tip'],tg)
            if pr:
                pp=[pr['x'],pr['y'],pr['z']];line.append(f"-{k}:{a*100:4.0f}|arm{math.dist(row['tip'],pp)*100:4.0f}|pred{math.dist(pp,tg)*100:4.0f}|dt{(pr['t']*120-k):+4.0f}|{(row['clip'] or '-')[:7]}")
                if k<=3:
                    s=tot.setdefault(d,[0,0,0,0]);s[0]+=a;s[1]+=math.dist(row['tip'],pp);s[2]+=math.dist(pp,tg);s[3]+=1
            else: line.append(f"-{k}:{a*100:4.0f}|nopred|{(row['clip'] or '-')[:7]}")
        print(f"{h['shot']:6s}t{t:5d}p{p} "+'  '.join(line))
for d,s in tot.items(): print(d,'last-3 means cm: head->contact %.1f  head->predicted %.1f  predicted->contact %.1f (n=%d)'%(s[0]/s[3]*100,s[1]/s[3]*100,s[2]/s[3]*100,s[3]))
