# DIAGNOSTIC variant (extra per-row body-placement fields; traces are NOT comparable by hash with replay-input.py)
# Usage: SP_REPLAY_INPUT=<input dir> replay-input.py <source file> <new output dir name> [runs]
# (generalised copy of replay-projected-warm-start.py: input dir from env, small viewport, long timeouts, ONE browser)
# Replays the immutable authoritative input twice in fresh contexts against the given source (served via route, disk untouched).
from pathlib import Path
import json,hashlib,sys,os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
INPUT=ROOT/os.environ['SP_REPLAY_INPUT']
raw=(ROOT/sys.argv[1]).read_bytes();source=raw.decode('utf-8')
data=json.loads((INPUT/'authoritative.json').read_text())
OUT=ROOT/sys.argv[2];OUT.mkdir(exist_ok=False)
(OUT/'game.js.snapshot').write_bytes(raw)
hook='''window.__authoritativeReplay=function(input){
 const options=JSON.parse(JSON.stringify(input.options));
 const LIM=[['arm','x',-3.2,1.5],['arm','z',-1.6,1.6],['armEl','x',-2.6,0.05],['armEl','z',-0.6,0.6],['wrist','x',-1.5,1.5],['wrist','y',-1.2,1.2],['chest','y',-0.45,0.45],['chest','x',-0.22,0.22]];
 const solves=[],fits=[];let tick=-1;
 const original=fitMatchRacket;
 fitMatchRacket=function(mdl,target,weight){
  const d=original(mdl,target,weight);
  const nodes={arm:mdl.arm,armEl:mdl.armEl,wrist:mdl.wrist,chest:mdl.rig.chest};
  const bad=LIM.filter(([n,k,lo,hi])=>!(nodes[n].rotation[k]>=lo&&nodes[n].rotation[k]<=hi)).map(([n,k,lo,hi])=>({joint:n+'.'+k,value:nodes[n].rotation[k],lo,hi}));
  solves.push({tick,distance:d,bad,free:[mdl.arm.rotation.y,mdl.armEl.rotation.y,mdl.wrist.rotation.z,mdl.rig.chest.rotation.z]});
  return d;
 };
 window.__matchFitTrace=x=>fits.push({tick,...x});
 beginSession('local',S.createMatch(options),0,{localOpts:{diff:2,mode:'1v1',points:21,venue:0},snapCam:true});
 const rows=[];window.__matchClipHits=[];
 for(const frame of input.frames){
  tick=frame.tick;
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
   rows.push({tick:frame.tick,player:i,state:m.state,clip:md.matchClip||null,stroke:md.stroke?md.stroke.clip:null,
     tip:md.model.wrist.localToWorld(new THREE.Vector3(0,-0.71,0)).toArray(),
     shoulder:md.model.arm.getWorldPosition(new THREE.Vector3()).toArray(),
     eulers:nodes.map(n=>n.rotation.toArray()),floor:Math.min(...[[0,-0.34],[0,-0.53],[0,-0.71],[0,-0.87],[0.12,-0.71],[-0.12,-0.71]].map(([x,y])=>md.model.wrist.localToWorld(new THREE.Vector3(x,y,0)).y)),quaternions:nodes.map(n=>n.quaternion.toArray()),positions:nodes.map(n=>n.position.toArray()),
     prediction:md.pred?{...md.pred}:null,
     diag:{rise:md.rise,lunge:md.lunge,crouch:md.crouch,tipLocal:md.model.root.worldToLocal(md.model.wrist.localToWorld(new THREE.Vector3(0,-0.71,0))).toArray(),bodyRot:md.model.body.rotation.toArray().slice(0,3),bodyY:md.model.body.position.y,chest:md.model.rig.chest.rotation.toArray().slice(0,3)}});
  }
 }
 return {heads:session.models.map(md=>({headLocal:md.headLocal,clipHead:md.clipHead||null})),rows,hits:window.__matchClipHits,solves,fits,violations:window.__matchFitBoundViolations||[]};
};
'''
assert source.count('window.__spDebug = {')>=1
runs=[];console=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
 for i in range(int(sys.argv[3]) if len(sys.argv)>3 else 2):
  context=browser.new_context(viewport={'width':320,'height':240})
  context.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({hand:'L',helpN:99,gfx:0}));")
  page=context.new_page();page.set_default_timeout(600000)
  page.on('console',lambda msg:console.append(msg.text) if msg.type in('error','assert') else None)
  page.on('pageerror',lambda e:console.append('PAGEERROR '+str(e)))
  page.route('https://**/*',lambda r:r.abort())
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
for a,b in zip(runs[0]['rows'],runs[-1]['rows']):
 if a!=b:
  differences.append({'tick':a['tick'],'player':a['player'],'keys':[k for k in a if a[k]!=b[k]]})
  break
summary={'input':os.environ['SP_REPLAY_INPUT'],'sourceRawSHA256':hashlib.sha256(raw).hexdigest(),'inputRawSHA256':hashlib.sha256((INPUT/'authoritative.json').read_bytes()).hexdigest(),'stateSHA256':hashof([f['state']for f in data['frames']]),'eventSHA256':hashof([f['events']for f in data['frames']]),'traceHashes':[hashof(r)for r in runs],'identical':(runs[0]==runs[-1]) if len(runs)>1 else None,'frames':len(data['frames']),'samples':len(runs[0]['rows']),'firstDivergence':differences,'consoleErrors':console[:20]}
(OUT/'reproducibility.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary,indent=2))
