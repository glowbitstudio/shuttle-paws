# Usage: acceptance.py <comparison.json written by analyze-input.py: [baseline, candidate]> [...]
# Applies the acceptance rule to each baseline/candidate pair (candidate = LAST entry of the file):
# (rule revised 2026-11-13: "looks like the racket hits the shuttle")
#   two identical runs; (a) every clip contact <= 5.0 cm OR not worse than baseline by > 1.5 cm; (b) mean contact error
#   below baseline and no contact above 10 cm unless out of physical reach (shoulder->target > shoulder->head extension:
#   listed, not failed); (c) same-state racket jump frames (> 0.3 m) not above baseline; (d) chest/arm/elbow/wrist/body
#   per-frame angular maxima not worse by > 10 % (body: +0.05 rad allowance); (e) root rise rate <= 1.3 x baseline;
#   (f) zero out-of-bounds solver returns and zero bound asserts.
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[1]
allok=True
for f in sys.argv[1:]:
    ms=json.loads((ROOT/f).read_text());b,c=ms[0],ms[-1];fails=[];notes=[]
    print(f"== {c['dir']} vs {b['dir']}")
    if not (b['identical'] is True and c['identical'] is True): fails.append(f"determinism baseline={b['identical']} candidate={c['identical']}")
    print('  contact error cm: shot/clip/tick/player  baseline -> candidate (delta)')
    for x,y in zip(b['contacts'],c['contacts']):
        d=(y['error']-x['error'])*100;bad=d>1.5 and y['error']>0.05;reach=y['shoulderToTarget']>y['extension']+0.005
        if y['error']>0.10 and not bad: (fails.append if not reach else notes.append)(f"above 10 cm: {x['shot']} {y['clip']} t{x['tick']} p{x['player']} {y['error']*100:.1f} cm (shoulder->target {y['shoulderToTarget']:.2f} m, extension {y['extension']:.2f} m)")
        if bad: fails.append(f"{x['shot']} {y['clip']} t{x['tick']} p{x['player']} {x['error']*100:.1f} -> {y['error']*100:.1f} cm")
        print(f"   {x['shot']:10s} {y['clip']:17s} t{x['tick']:5d} p{x['player']}  {x['error']*100:5.1f} -> {y['error']*100:5.1f}  ({d:+5.1f}){'  FAIL' if bad else ''}")
    n=len(b['contacts'])
    if 'approach' in c['contacts'][0]:
        print('  racket head to contact point before contact, cm: t-3 / t-2 / t-1 (frames within 10 cm)   baseline | candidate')
        fam={}
        for x,y in zip(b['contacts'],c['contacts']):
            f=lambda z:' / '.join(f"{v*100:5.1f}" for v in reversed(z.get('approach',[])))+f" ({z.get('within10','?'):>2})"
            late=y['approach'] and max(y['approach'])>0.15
            print(f"   {x['shot']:10s} t{x['tick']:5d} p{x['player']}  {f(x)} | {f(y)}{'  LATE (>15 cm in last 3)' if late else ''}")
            k='serve' if x['shot'].startswith('serve') else x['shot'];fam.setdefault(k,[]).append((x,y))
        for k,v in fam.items():
            print(f"   family {k:6s} n={len(v)}  t-1 mean {sum(x['approach'][0] for x,_ in v)/len(v)*100:5.1f} -> {sum(y['approach'][0] for _,y in v)/len(v)*100:5.1f} cm; worst of last 3 {max(max(x['approach']) for x,_ in v)*100:5.1f} -> {max(max(y['approach']) for _,y in v)*100:5.1f} cm; frames within 10 cm (min) {min(x['within10'] for x,_ in v)} -> {min(y['within10'] for _,y in v)}")
        late=[f"{x['shot']} t{x['tick']}" for x,y in zip(b['contacts'],c['contacts']) if max(y['approach'])>0.15]
        print(f"  arrival target (<= 15 cm on each of the last 3 frames): {len(c['contacts'])-len(late)}/{len(c['contacts'])} contacts; late: {late}")
    if sum(x['error'] for x in c['contacts'])>=sum(x['error'] for x in b['contacts']): fails.append('mean contact error not below baseline')
    print(f"  mean contact error {sum(x['error'] for x in b['contacts'])/n*100:.1f} -> {sum(x['error'] for x in c['contacts'])/n*100:.1f} cm; max {max(x['error'] for x in b['contacts'])*100:.1f} -> {max(x['error'] for x in c['contacts'])*100:.1f} cm")
    print(f"  jump frames >0.3 m      {b['bigJumps']} -> {c['bigJumps']}")
    if c['bigJumps']>b['bigJumps']: fails.append(f"jump frames {b['bigJumps']} -> {c['bigJumps']}")
    print(f"  racket max per frame m  same-state {b['racketMax']['sameState'][0]:.3f} -> {c['racketMax']['sameState'][0]:.3f}; all {b['racketMax']['all'][0]:.3f} -> {c['racketMax']['all'][0]:.3f}")
    for k in ['chest','arm','elbow','wrist','body']:
        x,y=b['jointMax'][k][0],c['jointMax'][k][0];bad=y>max(x*1.10,x+0.05 if k=='body' else 0)
        if bad: fails.append(f"{k} max {x:.3f} -> {y:.3f} rad ({(y/x-1)*100:+.0f}%) at {c['jointMax'][k][1][:2]}")
        print(f"  {k:6s} max rad/frame    {x:.3f} -> {y:.3f} ({(y/x-1)*100:+.0f}%){'  FAIL' if bad else ''}")
    x,y=b['riseRateMax'][0],c['riseRateMax'][0]
    print(f"  rise rate max m/s       {x:.2f} -> {y:.2f} ({y/x:.2f}x)")
    if y>1.3*x: fails.append(f"rise rate {x:.2f} -> {y:.2f} m/s at {c['riseRateMax'][1][:2]}")
    print(f"  floor clearance min m   {b['floorMin'][0]:.3f} -> {c['floorMin'][0]:.3f}")
    print(f"  out-of-bounds returns   {b['solvesOutOfBounds']}/{b['solves']} -> {c['solvesOutOfBounds']}/{c['solves']}; asserts {c['assertViolations']}; console {c['console']}")
    if c['solvesOutOfBounds'] or c['assertViolations']: fails.append('out-of-bounds solver returns')
    for nline in notes: print('  NOTE (out of physical reach):',nline)
    print('  VERDICT:','PASS' if not fails else 'FAIL: '+'; '.join(fails));allok=allok and not fails
print('ALL INPUTS PASS' if allok else 'NOT ACCEPTED')
