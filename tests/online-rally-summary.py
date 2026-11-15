# Usage: online-rally-summary.py <out dir of online-rally-check.py> [...]  -- rally contacts split by own athlete / others
import json,sys,collections
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
for d in sys.argv[1:]:
    for nm,r in json.loads((ROOT/d/'results.json').read_text()).items():
        c=[x for x in r['rec']['contacts'] if not x['shot'].startswith('serve')];me=r['state']['me']
        fps=r['rec']['frames']/max(1e-9,r['rec']['dtSum']);co=r['rec'].get('cost')
        print(f"== {d} / {nm}: {r['state']['kind']}, {fps:.0f} fps avg, rally contacts {len(c)}, shots {dict(collections.Counter(x['shot'] for x in c))}, page errors {r['errors'][:2]}")
        if co: print(f"   posing cost per athlete-frame: prediction/stroke {co['busyMs']/max(1,co['busyN']):.2f} ms (max {co['busyMax']:.0f}) vs other {co['idleMs']/max(1,co['idleN']):.2f} ms")
        for who,name in ((True,'own athlete'),(False,'other athletes')):
            v=[x for x in c if (x['athlete']==me)==who and me is not None and me>=0] if who else [x for x in c if not(me is not None and me>=0 and x['athlete']==me)]
            if not v: continue
            e=sorted(x['error'] for x in v);wb=[x for x in v if x['before']];ok=sum(1 for x in wb if max(x['before'])<=0.15)
            print(f"   {name:14s} n={len(v):3d} stroke-frame error median {e[len(e)//2]*100:4.1f} mean {sum(e)/len(e)*100:4.1f} max {e[-1]*100:5.1f} cm, <=5 cm {sum(1 for x in e if x<=0.05)}/{len(e)}, >10 cm {sum(1 for x in e if x>0.10)} | last frame before hit: mean {sum(x['before'][-1] for x in wb)/max(1,len(wb))*100:4.1f} cm; within 15 cm on the last frame {sum(1 for x in wb if x['before'][-1]<=0.15)}/{len(wb)}, on all 3 frames {ok}/{len(wb)} | frame at contact {sum(x['frameDt'] for x in v)/len(v)*1000:.0f} ms")
        pops=r['rec']['pops'];print('   pops >1.6 rad/frame:',len(pops),collections.Counter((p['joint'],str(p['clip']),p['stroke']) for p in pops).most_common(6))
