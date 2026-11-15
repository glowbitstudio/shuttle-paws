# Usage: SP_REPLAY_INPUT=<input dir> contact-screenshots.py <source file> <new output dir name>
# Replays the immutable input once (ONE browser, one context) with ?matchClips=1 and saves a PNG at the contact frame of
# the first serve, smash, lift, net, drop and clear clip contacts (plus one frame before each), camera placed beside the
# hitter. A small magenta ball marks the authoritative contact point so racket-vs-shuttle can be judged by eye.
from pathlib import Path
import json,sys,os,base64
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
INPUT=ROOT/os.environ['SP_REPLAY_INPUT']
source=(ROOT/sys.argv[1]).read_bytes().decode('utf-8')
data=json.loads((INPUT/'authoritative.json').read_text())
OUT=ROOT/sys.argv[2];OUT.mkdir(exist_ok=False)
want={};
for f in data['frames']:
    for e in f['events']:
        if e['type']=='hit':
            fam='serve' if e['shot'].startswith('serve') else e['shot']
            if fam in('serve','smash','lift','net','drop','clear') and fam not in want and f['state']['athletes'][e['i']]['diveT']<0:
                want[fam]={'tick':f['tick'],'player':e['i'],'shot':e['shot'],'target':[e['x'],e['y'],e['z']]}
shots=[]
for fam,w in want.items():
    shots.append({**w,'name':f"{fam}-t{w['tick']}-contact"})
    shots.append({**w,'tick':w['tick']-6,'name':f"{fam}-t{w['tick']}-minus6"})
hook='''window.__contactShots=function(input,shots){
 const options=JSON.parse(JSON.stringify(input.options));
 beginSession('local',S.createMatch(options),0,{localOpts:{diff:2,mode:'1v1',points:21,venue:0},snapCam:true});
 const out=[],last=Math.max(...shots.map(s=>s.tick));window.__matchClipHits=[];
 const mark=new THREE.Mesh(new THREE.SphereGeometry(0.03,10,8),new THREE.MeshBasicMaterial({color:0xff00ff}));scene.add(mark);
 for(const frame of input.frames){
  if(frame.tick>last)break;
  session.m=JSON.parse(JSON.stringify(frame.state));
  frame.events.forEach(e=>handleEvent(JSON.parse(JSON.stringify(e))));
  session.m=JSON.parse(JSON.stringify(frame.state));
  const m=session.m;
  for(let i=0;i<m.athletes.length;i++){animateAthlete(m.athletes[i],session.models[i],input.dt,frame.tick*input.dt,m);session.models[i].model.root.updateMatrixWorld(true);}
  for(const s of shots.filter(s=>s.tick===frame.tick)){
   const a=m.athletes[s.player],md=session.models[s.player],sg=Math.sign(a.z)||1;
   const sp=m.shuttle.p;shuttleMesh.visible=true;shuttleMesh.position.set(sp.x,sp.y,sp.z);
   mark.position.set(s.target[0],s.target[1],s.target[2]);mark.visible=s.name.endsWith('contact');
   const mid=new THREE.Vector3((a.x+s.target[0])/2,(1.0+a.jumpY+s.target[1])/2,(a.z+s.target[2])/2);
   const side=(s.target[0]-a.x)>=0?1:-1;
   camera.position.set(mid.x+side*2.3,mid.y+0.5,mid.z+sg*2.3);camera.lookAt(mid);camera.updateMatrixWorld(true);
   renderer.render(scene,camera);
   const tip=md.model.wrist.localToWorld(new THREE.Vector3(0,-0.71,0));
   out.push({name:s.name,shot:s.shot,tick:frame.tick,player:s.player,clip:md.matchClip||null,stroke:md.stroke?md.stroke.clip:null,
     tipToTarget:tip.distanceTo(new THREE.Vector3(...s.target)),tipToShuttle:tip.distanceTo(new THREE.Vector3(sp.x,sp.y,sp.z)),png:renderer.domElement.toDataURL('image/png')});
  }
 }
 return out;
};
'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
 context=browser.new_context(viewport={'width':560,'height':420})
 context.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({hand:'L',helpN:99,gfx:0}));")
 page=context.new_page();page.set_default_timeout(600000)
 errors=[]
 page.on('pageerror',lambda e:errors.append('PAGEERROR '+str(e)))
 page.route('https://**/*',lambda r:r.abort())
 page.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=source.replace('window.__spDebug = {',hook+'window.__spDebug = {',1)))
 page.goto('http://127.0.0.1:3061/?matchClips=1',wait_until='domcontentloaded')
 page.wait_for_function('typeof __contactShots === "function"')
 result=page.evaluate('([input,shots])=>__contactShots(input,shots)',[data,shots])
 context.close();browser.close()
summary=[]
for r in result:
    (OUT/(r['name']+'.png')).write_bytes(base64.b64decode(r.pop('png').split(',',1)[1]));summary.append(r)
(OUT/'summary.json').write_text(json.dumps({'source':sys.argv[1],'input':os.environ['SP_REPLAY_INPUT'],'errors':errors,'shots':summary},indent=1))
print(json.dumps(summary,indent=1));print(errors)
