"""Fixed-step production animation replay. Test hook injected only into browser response."""
from pathlib import Path
import hashlib, json
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'natural-arm-ownership-01'
OUT.mkdir(exist_ok=False)  # immutable run: refuse overwrite
source = (ROOT / 'game.js').read_text(encoding='utf-8')
(OUT / 'game.js.snapshot').write_text(source, encoding='utf-8')
fixture = {'dt': 1/120, 'frames': 240, 'hitFrame': 48, 'shot': 'drop', 'target': [-0.4, 1.5, 2.6], 'character': 'cat', 'hand': 'L'}
(OUT / 'input.json').write_text(json.dumps(fixture, indent=2))
hook = """window.__naturalReplay=function(){
 let seed=89123;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 startLocal({diff:2,mode:'1v1',points:21,venue:0,opp:'frog'});
 const m=session.m;
 m.athletes.forEach(a=>{a.ctrl='bot';a.diff=2;});
 const rows=[],events=[],dt=1/120;
 for(let frame=0;frame<1800;frame++){
  S.step(m,dt);
  const ev=m.events.splice(0);ev.forEach(e=>{events.push({frame,event:e});handleEvent(e)});
  for(let i=0;i<m.athletes.length;i++){
   const a=m.athletes[i],md=session.models[i],before=md.continuity&&md.continuity.tip.clone();
   animateAthlete(a,md,dt,frame*dt,m);
   md.model.root.updateMatrixWorld(true);const tip=md.model.wrist.localToWorld(new THREE.Vector3(0,-0.71,0));
   rows.push({frame,player:i,state:m.state,hand:md.model.h,clip:md.matchClip||null,
    pred:md.pred?{...md.pred}:null,stroke:md.stroke?{clip:md.stroke.clip,elapsed:md.stroke.elapsed}:null,
    tip:tip.toArray(),delta:before?tip.distanceTo(before):0,
    athlete:{x:a.x,z:a.z,jumpY:a.jumpY},shuttle:{...m.shuttle.p},
    hit:ev.find(e=>e.type==='hit'&&e.i===i)||null,
    reach:S.inReachAt(a,m.shuttle.p),held:m.shuttle.held});
  }
 }
 return {rows,events,hits:window.__matchClipHits||[]};
};
"""

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
 runs=[]
 for k in range(2):
  context=browser.new_context();context.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({hand:'L',helpN:99,gfx:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Test',char:'cat'}));")
  page=context.new_page();page.route('**/game.js',lambda route:route.fulfill(status=200,content_type='application/javascript',body=source.replace('window.__spDebug = {',hook+'window.__spDebug = {',1)))
  page.goto('http://127.0.0.1:3061/?matchClips=1',wait_until='domcontentloaded');page.wait_for_function('typeof window.__naturalReplay === "function"')
  result=page.evaluate('__naturalReplay()');runs.append(result);(OUT/('run-'+str(k)+'.json')).write_text(json.dumps(result));context.close()
 browser.close()
summary={'identical':runs[0]==runs[1],'ticks':1800,'events':len(runs[0]['events']),'hits':runs[0]['hits'],'heldFrames':sum(bool(r['held']) for r in runs[0]['rows'])}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary,indent=2))
