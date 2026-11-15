# Usage: roster-rig-regression.py <port> <candidate game snapshot> <candidate sim snapshot>
# The 95 clips drive joints, not surface parts: for every character x every clip x 5 sample times the world positions of
# head, shoulders, elbows, wrists, racket tip, hips, knees, feet must be identical between the current build and the
# candidate. ONE browser, two page loads in sequence.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1]
JS='''()=>{const L=__spDebug.lab,THREE=L.THREE,out={},names=Object.keys(SPAnim.CLIPS);let nan=0;
 for(const c of L.chars){const mdl=L.buildCharacter(L.charById(c.id),0xff7a59,1,'R');const rows=[];
  for(const n of names){const len=SPAnim.clipLength(n);for(let i=0;i<5;i++){SPAnim.apply(mdl,SPAnim.sample(n,len*i/4),{});mdl.root.updateMatrixWorld(true);
   const P=o=>o.getWorldPosition(new THREE.Vector3()).toArray();const v=[P(mdl.head),P(mdl.arm),P(mdl.armEl),P(mdl.wrist),mdl.wrist.localToWorld(new THREE.Vector3(0,-0.71,0)).toArray(),P(mdl.free),P(mdl.freeEl),P(mdl.rig.hips),P(mdl.rig.chest),...mdl.feet.map(P),...mdl.rig.legs.map(l=>P(l.knee))].flat();
   if(v.some(x=>!isFinite(x)))nan++;rows.push(v.map(x=>+x.toFixed(5)));}}
  out[c.id]=rows;L.scene.remove(mdl.root);L.disposeTree(mdl.root);}
 return {clips:names.length,nan,out};}'''
res=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    for game,sim in [('game.js','sim.js'),(sys.argv[2],sys.argv[3])]:
        ctx=b.new_context(viewport={'width':320,'height':240});pg=ctx.new_page();pg.set_default_timeout(600000);errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)));pg.route('https://**/*',lambda r:r.abort())
        pg.route('**/game.js',lambda r,_q=None,g=game:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/g).read_bytes().decode('utf-8')))
        pg.route('**/sim.js',lambda r,_q=None,s=sim:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/s).read_bytes().decode('utf-8')))
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"')
        r=pg.evaluate(JS);r['errors']=errs;res.append(r);ctx.close()
    b.close()
a,c=res;worst=0;bad=[]
NAMES=['head','arm','armEl','wrist','racketTip','free','freeEl','hips','chest','footL','footR','kneeL','kneeR']
detail={}
for cid in a['out']:
    for i,(ra,rc) in enumerate(zip(a['out'][cid],c['out'][cid])):
        for j,(x,y) in enumerate(zip(ra,rc)):
            if abs(x-y)>1e-4: detail.setdefault(cid,{}).setdefault(NAMES[j//3],[0,0]);detail[cid][NAMES[j//3]][0]+=1;detail[cid][NAMES[j//3]][1]=max(detail[cid][NAMES[j//3]][1],round(abs(x-y),4))
print('differing joints {char: {joint: [samples x axes, max m]}}',detail)
for cid in a['out']:
    d=max(abs(x-y) for ra,rc in zip(a['out'][cid],c['out'][cid]) for x,y in zip(ra,rc));worst=max(worst,d)
    if d>1e-4: bad.append((cid,round(d,4)))
print('clips',a['clips'],c['clips'],'samples/char',len(a['out']['cat']),'non-finite',a['nan'],c['nan'],'max joint difference m',worst,'characters differing',bad,'page errors',a['errors'],c['errors'])
print('PASS' if not bad and not c['nan'] and not c['errors'] else 'FAIL')
