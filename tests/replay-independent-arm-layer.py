from pathlib import Path
import json,hashlib
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'authoritative-replay-artifacts'
source=(ROOT/'independent-arm-layer.snapshot').read_text(encoding='utf-8')
INPUT=OUT
data=json.loads((INPUT/'authoritative.json').read_text())
OUT=ROOT/'independent-arm-layer-artifacts'
OUT.mkdir(exist_ok=False)
(OUT/'game.js.snapshot').write_text(source,encoding='utf-8')
hook='''window.__authoritativeReplay=function(input){
 const options=JSON.parse(JSON.stringify(input.options));
 beginSession('local',S.createMatch(options),0,{localOpts:{diff:2,mode:'1v1',points:21,venue:0},snapCam:true});
 const rows=[];window.__matchClipHits=[];
 for(const frame of input.frames){
  session.m=JSON.parse(JSON.stringify(frame.state));
  // Presentation events may mutate the client match; restore authoritative state afterwards.
  frame.events.forEach(e=>handleEvent(JSON.parse(JSON.stringify(e))));
  session.m=JSON.parse(JSON.stringify(frame.state));
  const m=session.m;
  for(let i=0;i<m.athletes.length;i++){
   const md=session.models[i],a=m.athletes[i];
   animateAthlete(a,md,input.dt,frame.tick*input.dt,m);
   md.model.root.updateMatrixWorld(true);
   const nodes=[md.model.root,md.model.body,md.model.rig.chest,md.model.arm,md.model.armEl,md.model.wrist];
   rows.push({tick:frame.tick,player:i,state:m.state,clip:md.matchClip||null,
     tip:md.model.wrist.localToWorld(new THREE.Vector3(0,-0.71,0)).toArray(),
     quaternions:nodes.map(n=>n.quaternion.toArray()),positions:nodes.map(n=>n.position.toArray()),
     prediction:md.pred?{...md.pred}:null});
  }
 }
 return {rows,hits:window.__matchClipHits};
};
'''
runs=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
 for i in range(2):
  context=browser.new_context()
  context.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({hand:'L',helpN:99,gfx:0}));")
  page=context.new_page()
  page.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=source.replace('window.__spDebug = {',hook+'window.__spDebug = {',1)))
  page.goto('http://127.0.0.1:3061/?matchClips=1',wait_until='domcontentloaded')
  page.wait_for_function('typeof __authoritativeReplay === "function"')
  result=page.evaluate('(input)=>__authoritativeReplay(input)',data)
  runs.append(result);(OUT/f'presentation-{i}.json').write_text(json.dumps(result))
  context.close()
 browser.close()
canonical=lambda x:json.dumps(x,sort_keys=True,separators=(',',':')).encode()
hashof=lambda x:hashlib.sha256(canonical(x)).hexdigest()
differences=[]
for a,b in zip(runs[0]['rows'],runs[1]['rows']):
 if a!=b:
  differences.append({'tick':a['tick'],'player':a['player'],'keys':[k for k in a if a[k]!=b[k]]})
  break
summary={'inputRawSHA256':hashlib.sha256((INPUT/'authoritative.json').read_bytes()).hexdigest(),'stateSHA256':hashof([f['state']for f in data['frames']]),'eventSHA256':hashof([f['events']for f in data['frames']]),'traceHashes':[hashof(r)for r in runs],'identical':runs[0]==runs[1],'frames':len(data['frames']),'samples':len(runs[0]['rows']),'firstDivergence':differences}
(OUT/'reproducibility.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary,indent=2))
