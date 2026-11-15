# Usage: online-rally-check.py <port> <game.js file to serve> <new out dir> [seconds, default 240]
# Online rallies with match clips on: two real clients (two contexts of ONE headless browser) play each other through the
# real server, a third context spectates. Both players are driven by a small script inside the page (runs toward the
# predicted landing point, presses PHONG / DAP / BO NHO in turn while the shuttle is incoming, serves) - inputs go through
# the normal input path and the network protocol is untouched.
# Per client and per clip contact: racket-head-to-contact error on the first drawn stroke frame, the head-to-contact
# distance on the 3 drawn frames before it (arrival), the frame interval, and per-frame joint jumps (pops). A screenshot is
# saved on each client at a few contacts.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];GAME=ROOT/sys.argv[2];OUT=ROOT/sys.argv[3];OUT.mkdir(exist_ok=False)
SECONDS=int(sys.argv[4]) if len(sys.argv)>4 else 240
URL=f'http://127.0.0.1:{PORT}/'
HOOK='''window.__on=(function(){
 const rec={contacts:[],frames:0,dtSum:0,dtMax:0,pops:[],lastT:0};let presses=0,lastPress=0,hist=[];
 const q=(a,b)=>2*Math.acos(Math.min(1,Math.abs(a.dot(b))));let prevQ=null;
 function tick(now){
  if(!session||!session.models.length)return;
  const m=session.m,me=session.me;
  if(me>=0&&!session.over){const a=m.athletes[me],s=m.shuttle,sg=S.sgn(a.team);
   const inc=s.live&&!s.netted&&s.lastTeam!==a.team;
   if(inc&&s.pred){const dx=(s.pred.x-a.x)*sg,dz=(s.pred.z-a.z)*sg,l=Math.hypot(dx,dz);touchVec.x=l>0.25?dx/l:0;touchVec.y=l>0.25?dz/l:0;}else{touchVec.x=0;touchVec.y=0;}
   if(m.state==='serve'&&m.serverIdx===me&&m.stateT>1.2&&now-lastPress>900){pressShot(presses%2?'drop':'hit');lastPress=now;presses++;}
   else if(m.state==='rally'&&inc&&s.p.z*sg>0.05&&now-lastPress>450){pressShot(['hit','hit','smash','drop'][presses%4]);lastPress=now;presses++;}
  }
  // after this frame is drawn: record racket heads and joint jumps
  const dt=rec.lastT?(now-rec.lastT)/1000:0;rec.lastT=now;rec.frames++;rec.dtSum+=dt;rec.dtMax=Math.max(rec.dtMax,dt);
  const tips=session.models.map(md=>md.model.wrist.localToWorld(new THREE.Vector3(0,-0.71,0)).toArray());
  const qs=session.models.map(md=>[md.model.arm.quaternion.clone(),md.model.armEl.quaternion.clone(),md.model.wrist.quaternion.clone(),md.model.rig.chest.quaternion.clone(),md.model.body.quaternion.clone()]);
  if(prevQ&&prevQ.length===qs.length&&dt<0.2)qs.forEach((arr,i)=>arr.forEach((x,j)=>{const d=q(x,prevQ[i][j]);if(d>1.6)rec.pops.push({athlete:i,joint:['arm','elbow','wrist','chest','body'][j],rad:+d.toFixed(2),dt:+dt.toFixed(3),clip:session.models[i].matchClip||null,stroke:!!session.models[i].stroke,state:m.state});}));
  prevQ=qs;hist.push({tips,dt});if(hist.length>5)hist.shift();
  const hits=window.__matchClipHits||[];
  while(rec.contacts.length<hits.length){const h=hits[rec.contacts.length];const tg=h.target;
   const idx=m.athletes.findIndex(x=>x.team===h.team&&Math.abs(x.x-h.athleteAtRender[0])<0.05&&Math.abs(x.z-h.athleteAtRender[1])<0.05);
   const before=idx>=0?hist.slice(0,-1).slice(-3).map(f=>+Math.hypot(f.tips[idx][0]-tg[0],f.tips[idx][1]-tg[1],f.tips[idx][2]-tg[2]).toFixed(3)):[];
   rec.contacts.push({shot:h.shot,clip:h.clip,team:h.team,athlete:idx,error:+h.error.toFixed(3),before,frameDt:+dt.toFixed(3),hitterMoved:+Math.hypot(h.athleteAtRender[0]-h.athleteAtEvent[0],h.athleteAtRender[1]-h.athleteAtEvent[1]).toFixed(3),prepClip:null});}
 }
 const raf=window.requestAnimationFrame.bind(window);
 (function loop(now){raf(loop);try{tick(now);}catch(e){rec.err=String(e);}})(performance.now());
 return {rec,state:()=>({session:!!session,kind:session&&session.kind,me:session?session.me:null,score:session?session.m.score.slice():null,contacts:rec.contacts.length,rally:rec.contacts.filter(c=>!c.shot.startsWith('serve')).length,over:session?!!session.over:null,err:rec.err||null})};})();
'''
def new_ctx(b,errs):
    ctx=b.new_context(viewport={'width':420,'height':270})
    ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,vol:0,assist:1}));")
    pg=ctx.new_page();pg.set_default_timeout(600000)
    pg.on('pageerror',lambda e:errs.append('PAGEERROR '+str(e)[:300]))
    pg.on('console',lambda m:errs.append('CONSOLE '+m.text[:200]) if m.type=='error' and 'ERR_FAILED' not in m.text and 'favicon' not in m.text else None)
    pg.route('https://**/*',lambda r:r.abort())
    pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=GAME.read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
    pg.goto(URL,wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"')
    return ctx,pg
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    ea,eb,ec=[],[],[];ca,pa=new_ctx(b,ea);cb,pb=new_ctx(b,eb);cc,pc=new_ctx(b,ec)
    for pg in (pa,pb,pc): pg.evaluate("()=>{__spDebug.go('online'); if(!__spDebug.Net.ws) __spDebug.Net.connect();}")
    for pg in (pa,pb,pc): pg.wait_for_function('()=>__spDebug.Net.ok')
    def start_match():
        pa.evaluate("()=>__spDebug.Net.send({t:'createRoom',open:true})");pa.wait_for_function('()=>__spDebug.Net.room&&__spDebug.Net.room.code')
        code=pa.evaluate('()=>__spDebug.Net.room.code')
        pb.evaluate("(c)=>__spDebug.Net.send({t:'joinRoom',code:c})",code);pb.wait_for_function('()=>__spDebug.Net.room&&__spDebug.Net.room.code')
        pa.evaluate("()=>__spDebug.Net.send({t:'start'})")
        pa.wait_for_function('()=>__on.state().session');pb.wait_for_function('()=>__on.state().session')
        pc.evaluate("()=>__spDebug.Net.send({t:'lobby'})");pc.wait_for_function('()=>__spDebug.Net.lobby&&__spDebug.Net.lobby.matches&&__spDebug.Net.lobby.matches.length>0')
        mid=pc.evaluate('()=>__spDebug.Net.lobby.matches[0].id');pc.evaluate("(id)=>__spDebug.Net.send({t:'spectate',id})",mid);pc.wait_for_function('()=>__on.state().session')
    start_match()
    shots=0;last=0;log=[]
    for sec in range(0,SECONDS,3):
        pa.wait_for_timeout(3000);st=pa.evaluate('()=>__on.state()')
        if st['contacts']>last and shots<8:
            for nm,pg in (('A',pa),('B',pb),('S',pc)): pg.screenshot(path=str(OUT/f'contact{shots:02d}-{nm}.png'))
            shots+=1
        last=st['contacts'];log.append((sec,st['score'],st['contacts'],st['rally']))
        if st['over'] or not st['session']: break
    res={}
    for nm,pg,errs in (('playerA',pa,ea),('playerB',pb,eb),('spectator',pc,ec)):
        r=pg.evaluate('()=>({rec:__on.rec,state:__on.state()})');r['errors']=errs;res[nm]=r
    ca.close();cb.close();cc.close();b.close()
(OUT/'results.json').write_text(json.dumps(res,indent=1))
print('progress (s, score, contacts, rally contacts) on player A:',log[-6:])
for nm,r in res.items():
    c=[x for x in r['rec']['contacts'] if not x['shot'].startswith('serve')];s=[x for x in r['rec']['contacts'] if x['shot'].startswith('serve')]
    fam={}
    for x in c: fam.setdefault(x['shot'],[]).append(x)
    fps=r['rec']['frames']/max(1e-9,r['rec']['dtSum'])
    print(f"== {nm}: kind {r['state']['kind']} score {r['state']['score']} frames {r['rec']['frames']} avg {fps:.1f} fps (max frame {r['rec']['dtMax']*1000:.0f} ms) serves {len(s)} rally contacts {len(c)} page errors {r['errors'][:3]} script error {r['state']['err']}")
    for k,v in fam.items():
        e=[x['error'] for x in v];arr=[x for x in v if x['before'] and max(x['before'])<=0.15]
        print(f"   {k:6s} n={len(v):2d} error mean {sum(e)/len(e)*100:5.1f} cm max {max(e)*100:5.1f} cm | arrival ok (<=15 cm on the 3 frames before) {len(arr)}/{len(v)} | mean frame {sum(x['frameDt'] for x in v)/len(v)*1000:.0f} ms, hitter moved since hit {sum(x['hitterMoved'] for x in v)/len(v)*100:.0f} cm")
    print('   pops (>1.6 rad in one frame):',len(r['rec']['pops']),r['rec']['pops'][:6])
