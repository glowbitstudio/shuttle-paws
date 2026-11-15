# Usage: SP_REPLAY_INPUT=<input dir> contact-strips.py <source file> <output dir (created if missing)> <name:tick:player> [...]
# Replays the immutable input once (ONE browser, one context) with ?matchClips=1 and, for every requested clip contact,
# saves one PNG strip of 4 frames: contact-3, contact-2, contact-1, contact (left to right). The camera stands on the net
# side of the hitter, on the side the contact point is on, so the racket arm faces it. A small magenta ball marks the
# authoritative contact point on every frame; the shuttle is drawn at its simulated position for that frame.
from pathlib import Path
import json,sys,os,base64
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
INPUT=ROOT/os.environ['SP_REPLAY_INPUT']
source=(ROOT/sys.argv[1]).read_bytes().decode('utf-8')
data=json.loads((INPUT/'authoritative.json').read_text())
OUT=ROOT/sys.argv[2];OUT.mkdir(exist_ok=True)
shots=[]
for spec in sys.argv[3:]:
    name,tick,player=spec.split(':');tick=int(tick);player=int(player)
    e=[e for e in data['frames'][tick]['events'] if e['type']=='hit' and e['i']==player]
    assert e,('no hit by that player on that tick',spec)
    assert not (OUT/(name+'.png')).exists(),name
    shots.append({'name':name,'tick':tick,'player':player,'shot':e[0]['shot'],'target':[e[0]['x'],e[0]['y'],e[0]['z']]})
hook='''window.__contactStrips=function(input,shots){
 const options=JSON.parse(JSON.stringify(input.options));
 beginSession('local',S.createMatch(options),0,{localOpts:{diff:2,mode:'1v1',points:21,venue:0},snapCam:true});
 const last=Math.max(...shots.map(s=>s.tick));window.__matchClipHits=[];
 const W=renderer.domElement.width,H=renderer.domElement.height;
 const mark=new THREE.Mesh(new THREE.SphereGeometry(0.03,10,8),new THREE.MeshBasicMaterial({color:0xff00ff}));scene.add(mark);
 for(const s of shots){s.canvas=document.createElement('canvas');s.canvas.width=W*4;s.canvas.height=H;s.frames=[];}
 for(const frame of input.frames){
  if(frame.tick>last)break;
  session.m=JSON.parse(JSON.stringify(frame.state));
  frame.events.forEach(e=>handleEvent(JSON.parse(JSON.stringify(e))));
  session.m=JSON.parse(JSON.stringify(frame.state));
  const m=session.m;
  for(let i=0;i<m.athletes.length;i++){animateAthlete(m.athletes[i],session.models[i],input.dt,frame.tick*input.dt,m);session.models[i].model.root.updateMatrixWorld(true);}
  for(const s of shots){
   const k=frame.tick-(s.tick-3); if(k<0||k>3) continue;
   const a=m.athletes[s.player],md=session.models[s.player],sg=Math.sign(a.z)||1;
   // the simulated shuttle for this frame; on the contact frame the state is already one step after the hit, so show it at the contact point
   const sp=k===3?{x:s.target[0],y:s.target[1],z:s.target[2]}:(m.shuttle.held?null:m.shuttle.p);
   if(sp){shuttleMesh.visible=true;shuttleMesh.position.set(sp.x,sp.y,sp.z);}
   mark.position.set(s.target[0],s.target[1],s.target[2]);
   const mid=new THREE.Vector3((a.x+s.target[0])/2,(1.0+a.jumpY+s.target[1])/2,(a.z+s.target[2])/2);
   const side=(s.target[0]-a.x)>=0?1:-1;
   camera.position.set(mid.x+side*1.9,mid.y+0.45,mid.z-sg*2.5);camera.lookAt(mid);camera.updateMatrixWorld(true);
   renderer.render(scene,camera);
   s.canvas.getContext('2d').drawImage(renderer.domElement,k*W,0);
   const tip=md.model.wrist.localToWorld(new THREE.Vector3(0,-0.71,0));
   s.frames.push({tick:frame.tick,clip:md.matchClip||null,stroke:md.stroke?md.stroke.clip:null,headToContactPoint:tip.distanceTo(new THREE.Vector3(...s.target)),headToShuttle:sp?tip.distanceTo(new THREE.Vector3(sp.x,sp.y,sp.z)):null});
  }
 }
 return shots.map(s=>({name:s.name,shot:s.shot,tick:s.tick,player:s.player,hand:session.models[s.player].model.h,character:session.m.athletes[s.player].char,frames:s.frames,png:s.canvas.toDataURL('image/png')}));
};
'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
 context=browser.new_context(viewport={'width':400,'height':300})
 context.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({hand:'L',helpN:99,gfx:0}));")
 page=context.new_page();page.set_default_timeout(600000)
 errors=[]
 page.on('pageerror',lambda e:errors.append('PAGEERROR '+str(e)))
 page.route('https://**/*',lambda r:r.abort())
 page.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=source.replace('window.__spDebug = {',hook+'window.__spDebug = {',1)))
 page.goto('http://127.0.0.1:'+os.environ.get('SP_PORT','3062')+'/?matchClips=1',wait_until='domcontentloaded')
 page.wait_for_function('typeof __contactStrips === "function"')
 result=page.evaluate('([input,shots])=>__contactStrips(input,shots)',[data,shots])
 context.close();browser.close()
summary=[]
for r in result:
    (OUT/(r['name']+'.png')).write_bytes(base64.b64decode(r.pop('png').split(',',1)[1]));r['input']=os.environ['SP_REPLAY_INPUT'];r['source']=sys.argv[1];summary.append(r)
log=OUT/'summary.json'
prev=json.loads(log.read_text()) if log.exists() else []
log.write_text(json.dumps(prev+summary,indent=1))
for r in summary: print(r['name'],r['shot'],'hand',r['hand'],r['character'],[(f['tick'],f['clip'],round(f['headToContactPoint'],3)) for f in r['frames']])
print('errors',errors)
