# Usage: analyze-projected-warm-start.py <baseline dir> <candidate dir> [out json]
from pathlib import Path
import json,math,sys
ROOT=Path(__file__).resolve().parents[1]
NAMES=['root','body','chest','arm','elbow','wrist']
def qangle(a,b):
    d=abs(sum(x*y for x,y in zip(a,b)));return 2*math.acos(min(1,d))
def metrics(dirname):
    r=json.loads((ROOT/dirname/'presentation-0.json').read_text())
    rep=json.loads((ROOT/dirname/'reproducibility.json').read_text())
    prev={};rmax={'all':(0,None),'sameState':(0,None),'rootRelative':(0,None)};jmax=[(0,None)]*6;floor=(9,None)
    for row in r['rows']:
        p=prev.get(row['player'])
        if row['floor']<floor[0]: floor=(row['floor'],(row['tick'],row['player'],row['clip']))
        if p:
            tag=(row['tick'],row['player'],p['clip'],row['clip'],p['state'],row['state'])
            d=math.dist(row['tip'],p['tip'])
            rel=math.dist([a-b for a,b in zip(row['tip'],row['positions'][0])],[a-b for a,b in zip(p['tip'],p['positions'][0])])
            if d>rmax['all'][0]: rmax['all']=(d,tag)
            if row['state']==p['state'] and d>rmax['sameState'][0]: rmax['sameState']=(d,tag)
            if rel>rmax['rootRelative'][0]: rmax['rootRelative']=(rel,tag)
            for i in range(6):
                ang=qangle(row['quaternions'][i],p['quaternions'][i])
                if ang>jmax[i][0]: jmax[i]=(ang,tag)
        prev[row['player']]=row
    bad=[s for s in r['solves'] if s['bad']]
    return {'dir':dirname,'identical':rep['identical'],'traceHash':rep['traceHashes'],'source':rep['sourceRawSHA256'],'console':rep['consoleErrors'],
      'contacts':[{'shot':h['shot'],'clip':h['clip'],'team':h['team'],'hand':h['hand'],'clock':h['renderClock'],'tick':round(h['renderClock']*120)-1,'error':h['error'],'postGuard':h.get('postGuardError')} for h in r['hits']],
      'racketMax':rmax,'jointMax':dict(zip(NAMES,jmax)),'floorMin':floor,'solves':len(r['solves']),'solvesOutOfBounds':len(bad),'firstOutOfBounds':bad[:3],
      'codeAssertViolations':len(r['violations']),
      'freeAxisMaxAbs':[max((abs(s['free'][i]) for s in r['solves']),default=0) for i in range(4)],
      'fits':r['fits']}
b,c=metrics(sys.argv[1]),metrics(sys.argv[2])
print('reproducible  baseline',b['identical'],b['traceHash'][0][:12],' candidate',c['identical'],c['traceHash'][0][:12])
print('console errors',b['console'],c['console'])
print('\ncontact error (m)   shot/clip/team/tick   baseline  candidate  delta')
for x,y in zip(b['contacts'],c['contacts']):
    assert x['shot']==y['shot'] and x['tick']==y['tick']
    print(f"{x['shot']:10s} {x['clip']:18s} team{x['team']} tick{x['tick']:5d}  {x['error']:.4f}  {y['error']:.4f}  {y['error']-x['error']:+.4f}   postGuard {x['postGuard']:.4f} {y['postGuard']:.4f}")
print('\nmax per-frame racket displacement (m)')
for k in b['racketMax']: print(f"  {k:13s} {b['racketMax'][k][0]:.4f} {b['racketMax'][k][1]}  ->  {c['racketMax'][k][0]:.4f} {c['racketMax'][k][1]}")
print('max per-frame angular change (rad)')
for k in NAMES: print(f"  {k:6s} {b['jointMax'][k][0]:.4f} {b['jointMax'][k][1]}  ->  {c['jointMax'][k][0]:.4f} {c['jointMax'][k][1]}")
print('floor min',b['floorMin'],'->',c['floorMin'])
print('solves',b['solves'],c['solves'],'out-of-bounds returns',b['solvesOutOfBounds'],c['solvesOutOfBounds'],'code assert',b['codeAssertViolations'],c['codeAssertViolations'])
print('first OOB baseline',json.dumps(b['firstOutOfBounds'])[:600])
print('first OOB candidate',json.dumps(c['firstOutOfBounds'])[:600])
print('free-axis |max| at solver return [arm.y, elbow.y, wrist.z, chest.z]',b['freeAxisMaxAbs'],c['freeAxisMaxAbs'])
f=c['fits'];print('candidate start choice: frames',len(f),'warm wins',sum(1 for x in f if x['warm']<=x['clean']),'clean wins',sum(1 for x in f if x['warm']>x['clean']))
for x in f:
    if x['first']: print('  contact frame',x['tick'],x['clip'],'clean %.4f warm %.4f'%(x['clean'],x['warm']))
if len(sys.argv)>3: (ROOT/sys.argv[3]).write_text(json.dumps({'baseline':b,'candidate':c},indent=1))
