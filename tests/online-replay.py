# Usage: online-replay.py <game.js file> <recorded stream json> <out json> [views, default me,watch] [strip:<name>:<n>]
# Deterministic replay of a RECORDED online message stream (tests/record-online-stream.js) through the page's real online
# code path (Net.onMsg -> snapshots -> frameOnline -> handleEvent -> animateAthlete). No server and no real time: the page
# is served from disk by the script, performance.now() is virtual, requestAnimationFrame is captured and driven at a fixed
# 60 fps, and each recorded message is delivered at its recorded arrival time. Same input -> same result, so candidates
# can be compared contact by contact.
#   view 'me'    : the recording player's own view (own athlete + opponent)
#   view 'watch' : a spectator's view of the same match (start message with you = -1)
# Per clip contact: racket-head-to-contact error on the first stroke frame; head-to-contact distance on the 3 frames before
# (16.7 ms apart); and every one-frame joint jump above 1.6 rad ("pops") with its context.
# Optional strip:<name>:<n>: save a PNG strip (4 frames: contact-3 .. contact) of the n-th rally contact at 900x560.
from pathlib import Path
import json,sys,base64
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];GAME=ROOT/sys.argv[1];STREAM=json.loads((ROOT/sys.argv[2]).read_text());OUT=ROOT/sys.argv[3]
VIEWS=(sys.argv[4] if len(sys.argv)>4 and not sys.argv[4].startswith('strip:') else 'me,watch').split(',')
STRIPS=[a.split(':')[1:] for a in sys.argv[4:] if a.startswith('strip:')]
HOOK='''window.__rp=(function(){
 const rec={contacts:[],pops:[],frames:0};let hist=[],prevQ=null;
 const q=(a,b)=>2*Math.acos(Math.min(1,Math.abs(a.dot(b))));
 const realRender=renderer.render.bind(renderer);let draw=false;renderer.render=function(sc,cam){if(sc!==scene||draw)realRender(sc,cam);};
 function run(stream,view,strips){
  const start=JSON.parse(JSON.stringify(stream.start));if(view==='watch')start.you=-1;
  __spDebug.Net.onMsg(start);
  let i=0,vt=window.__vt;const t0=vt+50,end=stream.msgs[stream.msgs.length-1].t+400;window.__matchClipHits=[];
  const W=renderer.domElement.width,H=renderer.domElement.height;const canv={};for(const [name,n] of strips){const c=document.createElement('canvas');c.width=W*4;c.height=H;canv[n]={name,c,imgs:[]};}
  let ring=[];
  for(let t=0;t<end;t+=1000/60){
   vt=t0+t;window.__vt=vt;
   while(i<stream.msgs.length&&stream.msgs[i].t<=t){__spDebug.Net.onMsg(stream.msgs[i].m);i++;}
   draw=strips.length>0;window.__raf(vt);draw=false;
   if(!session)break;
   const m=session.m;rec.frames++;
   if(strips.length){const img=document.createElement('canvas');img.width=W;img.height=H;img.getContext('2d').drawImage(renderer.domElement,0,0);ring.push(img);if(ring.length>4)ring.shift();}
   const tips=session.models.map(md=>md.model.wrist.localToWorld(new THREE.Vector3(0,-0.71,0)).toArray());
   const qs=session.models.map(md=>[md.model.arm.quaternion.clone(),md.model.armEl.quaternion.clone(),md.model.wrist.quaternion.clone(),md.model.rig.chest.quaternion.clone(),md.model.body.quaternion.clone()]);
   if(prevQ)qs.forEach((arr,a)=>arr.forEach((x,j)=>{const d=q(x,prevQ[a][j]);if(d>1.6){const md=session.models[a];rec.pops.push({t:Math.round(t),athlete:a,own:a===session.me,joint:['arm','elbow','wrist','chest','body'][j],rad:+d.toFixed(2),clip:md.matchClip||null,stroke:!!md.stroke,pred:md.pred?+md.pred.t.toFixed(3):null,state:m.state});}}));
   prevQ=qs;hist.push(tips);if(hist.length>5)hist.shift();
   const hits=window.__matchClipHits;
   while(rec.contacts.length<hits.length){const h=hits[rec.contacts.length],tg=h.target;
    const idx=m.athletes.findIndex(x=>x.team===h.team);
    const before=hist.slice(0,-1).slice(-3).map(f=>+Math.hypot(f[idx][0]-tg[0],f[idx][1]-tg[1],f[idx][2]-tg[2]).toFixed(3));
    const rally=!h.shot.startsWith('serve');
    rec.contacts.push({t:Math.round(t),shot:h.shot,clip:h.clip,athlete:idx,own:idx===session.me,error:+h.error.toFixed(3),before});
    if(rally){const n=rec.contacts.filter(c=>!c.shot.startsWith('serve')).length;for(const k in canv)if(+k===n&&ring.length===4){const g=canv[k].c.getContext('2d');ring.forEach((im,j)=>g.drawImage(im,j*W,0));canv[k].done=true;}}
   }
   if(strips.length&&Object.values(canv).every(c=>c.done))break;   // strip runs stop once the pictures are taken
  }
  try{endSession();}catch(e){}
  return {rec,me:start.you,strips:Object.values(canv).filter(c=>c.done).map(c=>({name:c.name,png:c.c.toDataURL('image/png')}))};
 }
 return {run};})();
'''
INDEX=(ROOT/'index.html').read_bytes()
def serve(route):
    u=route.request.url.split('?')[0];name=u.split('/',3)[3] if u.count('/')>=3 else ''
    if name in('','index.html'): return route.fulfill(status=200,content_type='text/html; charset=utf-8',body=INDEX)
    if name=='game.js': return route.fulfill(status=200,content_type='application/javascript',body=GAME.read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1))
    f=ROOT/name
    if f.is_file() and f.suffix in('.js','.css','.svg','.webmanifest'): return route.fulfill(status=200,content_type={'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'}[f.suffix],body=f.read_bytes())
    return route.abort()
res={}
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    for view in VIEWS:
        strips=[s for s in STRIPS if s[0].startswith(view)]
        ctx=b.new_context(viewport={'width':900,'height':560} if strips else {'width':320,'height':200});errs=[]
        ctx.add_init_script("window.__vt=performance.now();performance.now=()=>window.__vt;window.requestAnimationFrame=(fn)=>{window.__raf=fn;return 0;};localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,vol:0,assist:1}));")
        pg=ctx.new_page();pg.set_default_timeout(1800000);pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
        pg.route('**/*',serve)
        pg.goto('http://sp.test/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object" && typeof __raf === "function"')
        r=pg.evaluate('([s,v,st])=>__rp.run(s,v,st)',[STREAM,view,strips]);r['errors']=errs
        for s in r.pop('strips'): (OUT.parent/(OUT.stem+'-'+s['name']+'.png')).write_bytes(base64.b64decode(s['png'].split(',',1)[1]))
        res[view]=r;ctx.close()
    b.close()
OUT.write_text(json.dumps(res,indent=1))
import collections
for view,r in res.items():
    c=[x for x in r['rec']['contacts'] if not x['shot'].startswith('serve')]
    print(f"== {view}: frames {r['rec']['frames']} rally contacts {len(c)} page errors {r['errors'][:2]}")
    groups=[('own athlete',[x for x in c if x['own']]),('opponent',[x for x in c if not x['own']])] if view=='me' else [('both athletes',c)]
    for name,v in groups:
        if not v: continue
        e=sorted(x['error'] for x in v);wb=[x for x in v if len(x['before'])==3]
        print(f"   {name:13s} n={len(v):2d} stroke-frame error median {e[len(e)//2]*100:4.1f} mean {sum(e)/len(e)*100:4.1f} max {e[-1]*100:5.1f} cm; over 10 cm: {sum(1 for x in e if x>0.10)}; over 5 cm: {sum(1 for x in e if x>0.05)} | racket within 15 cm on the last frame before the hit {sum(1 for x in wb if x['before'][-1]<=0.15)}/{len(wb)}, on all 3 frames {sum(1 for x in wb if max(x['before'])<=0.15)}/{len(wb)} (mean last frame {sum(x['before'][-1] for x in wb)/max(1,len(wb))*100:.1f} cm)")
    pops=r['rec']['pops'];print(f"   pops >1.6 rad in one frame: {len(pops)}",collections.Counter((p['joint'],str(p['clip']),'stroke' if p['stroke'] else 'prep/none','own' if p['own'] else 'other') for p in pops).most_common(8))
