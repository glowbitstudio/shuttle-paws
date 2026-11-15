"""Fixed-step production animation replay. Test hook injected only into browser response."""
from pathlib import Path
import hashlib, json
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'matrix-artifacts'
OUT.mkdir(exist_ok=False)  # immutable run: refuse overwrite
source = (ROOT / 'game.js').read_text(encoding='utf-8')
(OUT / 'game.js.snapshot').write_text(source, encoding='utf-8')
fixture = {'dt': 1/120, 'frames': 240, 'hitFrame': 48, 'shot': 'drop', 'target': [-0.4, 1.5, 2.6], 'character': 'cat', 'hand': 'L'}
(OUT / 'input.json').write_text(json.dumps(fixture, indent=2))
hook = '''window.__fixedReplay = function(f) {
  startLocal({diff:1,mode:'1v1',points:11,venue:0});
  const m=session.m, a=m.athletes[0], md=session.models[0];
  a.team=f.team;a.x=0;a.z=f.team?-3:3;a.vx=0;a.vz=0;a.jumpY=0;a.vy=0;a.diveT=-1;a.recoverT=0;a.splitT=0;a.mood=0;a.emote=0;
  m.state='rally';m.shuttle.held=false;m.shuttle.netted=false;
  const rows=[];
  for(let i=0;i<f.frames;i++) {
    m.clock=i*f.dt; a.swingT=i>=f.hitFrame && i<f.hitFrame+48 ? (i-f.hitFrame)*f.dt : -1;
    Object.assign(m.shuttle.p,{x:f.target[0],y:f.target[1],z:f.target[2]});
    Object.assign(m.shuttle.v,{x:0,y:0,z:0});
    m.shuttle.live=i<f.hitFrame+60;m.shuttle.lastTeam=i<f.hitFrame?1-f.team:f.team;
    if(i===f.hitFrame)handleEvent({type:'hit',i:0,shot:f.shot,x:f.target[0],y:f.target[1],z:f.target[2],q:1,speed:15});
    animateAthlete(a,md,f.dt,m.clock,m);
    md.model.root.updateMatrixWorld(true);
    const tip=md.model.wrist.localToWorld(new THREE.Vector3(0,-0.71,0));
    const nodes=[md.model.root,md.model.body,md.model.rig.chest,md.model.arm,md.model.armEl,md.model.wrist];
    rows.push({frame:i,player:0,dt:f.dt,reset:i===0,event:i===f.hitFrame?'hit':null,
      phase:i<f.hitFrame?'preparation':i===f.hitFrame?'contact':md.stroke?'recovery':'idle',
      clip:md.matchClip||null,strokeTime:md.stroke?md.stroke.elapsed:null,
      target:f.target,tip:tip.toArray(),floorMin:Math.min(...[[0,-0.34],[0,-0.53],[0,-0.71],[0,-0.87],[0.12,-0.71],[-0.12,-0.71]].map(([x,y])=>md.model.wrist.localToWorld(new THREE.Vector3(x,y,0)).y)),quaternions:nodes.map(n=>n.quaternion.toArray()),
      positions:nodes.map(n=>n.position.toArray()),contactError:i===f.hitFrame?tip.distanceTo(new THREE.Vector3(...f.target)):null});
  }
  return rows;
};
'''

import math,itertools
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
 for char,hand,team in itertools.product(['cat','frog','bear'],['R','L'],[0,1]):
  context=browser.new_context()
  context.add_init_script("let seed=12345;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);localStorage.setItem('sp.settings',JSON.stringify({hand:'"+hand+"',helpN:99,gfx:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Replay',char:'"+char+"'}));")
  page=context.new_page();page.route('**/game.js',lambda route:route.fulfill(status=200,content_type='application/javascript',body=source.replace('window.__spDebug = {',hook+'window.__spDebug = {',1)))
  page.goto('http://127.0.0.1:3061/?matchClips=1',wait_until='domcontentloaded');page.wait_for_function('typeof window.__fixedReplay === "function"')
  for shot,height in [('serveHigh',.56),('serveShort',.56),('drive',1.1),('clear',1.65),('drop',1.6),('net',.8),('lift',.65),('smash',1.85)]:
   f=dict(fixture,frames=180,team=team,character=char,hand=hand,shot=shot,target=[(.4 if hand=='L' else -.4)*(1 if team==0 else -1),height,(-2.6 if team else 2.6)])
   rows=page.evaluate('(f)=>__fixedReplay(f)',f)
   # Each fixture starts a fresh model/session; no production ticks run during synchronous replay.
   largest=max(((math.dist(a['tip'],b['tip']),a['frame'],b['frame'],a['phase'],b['phase']) for a,b in zip(rows,rows[1:])),key=lambda x:x[0])
   result={'input':f,'contact':rows[48]['contactError'],'floor':min(x['floorMin'] for x in rows),'largest':largest}
   results.append(result)
   (OUT/(char+'-'+hand+'-'+str(team)+'-'+shot+'.json')).write_text(json.dumps({'input':f,'rows':rows}))
  context.close()
 browser.close()
summary={'sourceRawSHA256':hashlib.sha256((ROOT/'game.js').read_bytes()).hexdigest(),'cases':results,'worstContact':sorted(results,key=lambda x:x['contact'],reverse=True)[:5],'worstDiscontinuity':sorted(results,key=lambda x:x['largest'][0],reverse=True)[:5]}
(OUT/'matrix-summary.json').write_text(json.dumps(summary,indent=2));print(json.dumps({'count':len(results),'worstContact':summary['worstContact'],'worstDiscontinuity':summary['worstDiscontinuity']},indent=2))
