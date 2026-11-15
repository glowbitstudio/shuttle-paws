# Usage: SP_REPLAY_INPUT=<input dir> analyze-input.py <out json> <baseline dir> <candidate dir> [more candidate dirs]
from pathlib import Path
import json,math,sys,os
ROOT=Path(__file__).resolve().parents[1]
NAMES=['root','body','chest','arm','elbow','wrist']
data=json.loads((ROOT/os.environ['SP_REPLAY_INPUT']/'authoritative.json').read_text())
def qangle(a,b): return 2*math.acos(min(1,abs(sum(x*y for x,y in zip(a,b)))))
def metrics(d):
    r=json.loads((ROOT/d/'presentation-0.json').read_text());rep=json.loads((ROOT/d/'reproducibility.json').read_text())
    rows={(x['tick'],x['player']):x for x in r['rows']}
    out={'dir':d,'identical':rep['identical'],'hash':rep['traceHashes'][0][:12],'source':rep['sourceRawSHA256'],'console':[c for c in rep['consoleErrors'] if 'ERR_FAILED' not in c]}
    cs=[]
    for h in r['hits']:
        tick=round(h['renderClock']*120)-1
        pl=[p for p in (0,1) if rows[(tick,p)]['stroke']==h['clip']][0]
        row=rows[(tick,pl)];a=data['frames'][tick]['state']['athletes'][pl];tg=h['target']
        cs.append({'shot':h['shot'],'clip':h['clip'],'tick':tick,'player':pl,'error':h['error'],'postGuard':h.get('postGuardError'),
          'shoulderToTarget':math.dist(row['shoulder'],tg),'extension':math.dist(row['shoulder'],row['tip']),
          'rootOffset':math.hypot(row['positions'][0][0]-a['x'],row['positions'][0][2]-a['z']),'rise':row['positions'][0][1]-a['jumpY'],
          # racket head to the contact point on the frames BEFORE contact (t-1, t-2, t-3) and how many consecutive frames before contact were within 10 cm
          'approach':[math.dist(rows[(tick-k,pl)]['tip'],tg) for k in (1,2,3) if (tick-k,pl) in rows],
          'within10':next((k-1 for k in range(1,61) if (tick-k,pl) not in rows or math.dist(rows[(tick-k,pl)]['tip'],tg)>0.10),60)})
    out['contacts']=cs
    rm={'all':(0,None),'sameState':(0,None),'rootRelative':(0,None)};jm=[(0,None)]*6;fl=(9,None);big=0;offMax=(0,None);offRate=(0,None);riseRate=(0,None);pred=0
    for (t,p),row in sorted(rows.items()):
        a=data['frames'][t]['state']['athletes'][p]
        off=(row['positions'][0][0]-a['x'],row['positions'][0][2]-a['z'],row['positions'][0][1]-a['jumpY'])
        if row['prediction']: pred+=1
        if math.hypot(off[0],off[1])>offMax[0]: offMax=(math.hypot(off[0],off[1]),(t,p))
        if row['floor']<fl[0]: fl=(row['floor'],(t,p,row['clip']))
        q=rows.get((t-1,p))
        if q:
            b=data['frames'][t-1]['state']['athletes'][p]
            poff=(q['positions'][0][0]-b['x'],q['positions'][0][2]-b['z'],q['positions'][0][1]-b['jumpY'])
            tag=(t,p,q['clip'],row['clip'],row['state'])
            if row['state']==q['state']:
                rate=math.hypot(off[0]-poff[0],off[1]-poff[1])*120
                if rate>offRate[0]: offRate=(rate,tag)
                rr=abs(off[2]-poff[2])*120
                if rr>riseRate[0]: riseRate=(rr,tag)
            dd=math.dist(row['tip'],q['tip'])
            rel=math.dist([x-y for x,y in zip(row['tip'],row['positions'][0])],[x-y for x,y in zip(q['tip'],q['positions'][0])])
            if dd>rm['all'][0]: rm['all']=(dd,tag)
            if row['state']==q['state']:
                if dd>rm['sameState'][0]: rm['sameState']=(dd,tag)
                if dd>0.3: big+=1
            if rel>rm['rootRelative'][0]: rm['rootRelative']=(rel,tag)
            for i in range(6):
                ang=qangle(row['quaternions'][i],q['quaternions'][i])
                if ang>jm[i][0]: jm[i]=(ang,tag)
    bad=[s for s in r['solves'] if s['bad']]
    out.update({'racketMax':rm,'jointMax':dict(zip(NAMES,jm)),'floorMin':fl,'bigJumps':big,'rootOffsetMax':offMax,'rootOffsetRateMax':offRate,'riseRateMax':riseRate,'predictionFrames':pred,'solves':len(r['solves']),'solvesOutOfBounds':len(bad),'assertViolations':len(r['violations'])})
    return out
ms=[metrics(d) for d in sys.argv[2:]]
print('dirs',[m['dir'] for m in ms]);print('identical',[m['identical'] for m in ms],[m['hash'] for m in ms],'console',[m['console'] for m in ms])
print('\ncontact error m (delta vs baseline)')
for i,c in enumerate(ms[0]['contacts']):
    line=f"{c['shot']:10s} {c['clip']:18s} t{c['tick']:5d} p{c['player']}  {c['error']:.4f}"
    for m in ms[1:]:
        y=m['contacts'][i];assert y['tick']==c['tick'] and y['shot']==c['shot']
        line+=f" | {y['clip']:17s} {y['error']:.4f} ({y['error']-c['error']:+.4f})"
    print(line)
print('\nshoulder->target / extension / horizontal root offset / rise at contact')
for i,c in enumerate(ms[0]['contacts']):
    print(f"{c['shot']:10s} t{c['tick']:5d} "+' | '.join(f"{m['contacts'][i]['shoulderToTarget']:.3f}/{m['contacts'][i]['extension']:.3f}/{m['contacts'][i]['rootOffset']:.3f}/{m['contacts'][i]['rise']:+.3f}" for m in ms))
for k in ['all','sameState','rootRelative']: print('racketMax',k,' | '.join(f"{m['racketMax'][k][0]:.4f} {m['racketMax'][k][1]}" for m in ms))
print('same-state racket jumps >0.3m',[m['bigJumps'] for m in ms])
for k in NAMES: print('angMax',k,' | '.join(f"{m['jointMax'][k][0]:.4f} {m['jointMax'][k][1][:2]}" for m in ms))
print('floorMin',[ (round(m['floorMin'][0],4),m['floorMin'][1]) for m in ms])
print('rootOffsetMax',[(round(m['rootOffsetMax'][0],3),m['rootOffsetMax'][1]) for m in ms])
print('rootOffsetRateMax m/s',[(round(m['rootOffsetRateMax'][0],2),m['rootOffsetRateMax'][1]) for m in ms])
print('riseRateMax m/s',[(round(m['riseRateMax'][0],2),m['riseRateMax'][1]) for m in ms])
print('predictionFrames',[m['predictionFrames'] for m in ms],'solves',[m['solves'] for m in ms],'OOB',[m['solvesOutOfBounds'] for m in ms],'assert',[m['assertViolations'] for m in ms])
(ROOT/sys.argv[1]).write_text(json.dumps(ms,indent=1))
