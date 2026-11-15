# Usage: mobile-coverage.py <layout dir> [layout dir ...]   (reads <dir>/layout.json written by mobile-layout.py)
# Share of the screen covered by HUD + touch controls (worst case: hint and timing meter both showing), and which court
# landmarks (corners, net ends, baseline centres) lie under a HUD element or a button.
import json,math,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
HUD=['score','wind','topBtns','hint','tmeter','serveClock','ctrlHelp']
for d in sys.argv[1:]:
    data=json.loads((ROOT/d/'layout.json').read_text());print('==',d)
    print('size                          HUD%   controls%  total%   target  court landmarks covered')
    for s in data['sizes']:
        area=s['vw']*s['vh'];hud=0;rects=[]
        for k in HUD:
            r=s['hud'].get(k)
            if r and r['w']>0 and r['h']>0: hud+=r['w']*r['h'];rects.append((k,r))
        ctl=0
        for k,r in s['controls'].items():
            if k=='stickZone' or not r or r['w']<=0: continue
            ctl+=math.pi*(r['w']/2)**2;rects.append((k,r))
        cov=[]
        for name,(x,y) in (s.get('court') or {}).items():
            if name=='me': continue
            for k,r in rects:
                if k in('stick',): continue
                if r['x']<=x<=r['x']+r['w'] and r['y']<=y<=r['y']+r['h']: cov.append(name+'<'+k)
            if not (0<=x<=s['vw'] and 0<=y<=s['vh']): cov.append(name+':offscreen')
        land=s['vw']>s['vh'];tgt=20 if land else 15;tot=(hud+ctl)/area*100
        print(f"{s['name']:29s} {hud/area*100:5.1f}  {ctl/area*100:6.1f}    {tot:5.1f}   <={tgt}% {'ok ' if tot<=tgt else 'OVER'} {cov if s.get('court') else 'n/a (not recorded)'}")
