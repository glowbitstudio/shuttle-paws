# Usage: dive-live-floor.py <port> [game.js file] [sim.js file] [char ids...]
# Real local matches, the human dives repeatedly. Every rendered frame in which an athlete is diving or getting up,
# the lowest vertex of its head and torso meshes is measured. Prints per character: frames sampled, lowest point, frames below floor.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1]
GAME=ROOT/(sys.argv[2] if len(sys.argv)>2 else 'game.js');SIM=ROOT/(sys.argv[3] if len(sys.argv)>3 else 'sim.js')
CH=sys.argv[4:] or ['fox','hamster','panda','koala']
HOOK='''window.__dv={};window.__setChar=(c)=>{profile.char=c;};
(function(){const V=new THREE.Vector3();const tick=()=>{requestAnimationFrame(tick);if(!session||!session.m)return;
 session.models.forEach((md,i)=>{const a=session.m.athletes[i],mdl=md.model;if(!a||!(a.diveT>=0||a.recoverT>0||md.lie>0||mdl.body.rotation.x>0.5))return;
  mdl.root.updateMatrixWorld(true);let lo={head:1e9,torso:1e9};
  mdl.body.traverse(o=>{if(!o.isMesh||o.userData.isOutline)return;let part='torso';
   for(let q=o;q&&q!==mdl.body;q=q.parent){if(q===mdl.head){part='head';break;}if(q===mdl.arm||q===mdl.free||mdl.rig.legs.some(l=>l.thigh===q)){part=null;break;}}
   if(!part)return;const p=o.geometry.attributes.position;for(let k=0;k<p.count;k++){V.fromBufferAttribute(p,k).applyMatrix4(o.matrixWorld);if(V.y<lo[part])lo[part]=V.y;}});
  const id=session.m.athletes[i].char||(''+i);const r=window.__dv[id]||(window.__dv[id]={n:0,head:1e9,torso:1e9,below:0});
  r.n++;r.head=Math.min(r.head,lo.head);r.torso=Math.min(r.torso,lo.torso);if(Math.min(lo.head,lo.torso)<-0.005)r.below++;if(Math.min(lo.head,lo.torso)<(r.w||0)){r.w=Math.min(lo.head,lo.torso);r.at=[+a.diveT.toFixed(2),+a.recoverT.toFixed(2),+mdl.body.rotation.x.toFixed(2),+mdl.head.rotation.x.toFixed(2),+mdl.body.position.y.toFixed(2),session.m.state];}});};
 requestAnimationFrame(tick);})();
'''
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader']);errs=[]
    for c in CH:
        ctx=b.new_context(viewport={'width':640,'height':400});pg=ctx.new_page();pg.set_default_timeout(600000)
        ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,vol:0}));")
        pg.on('pageerror',lambda e:errs.append(str(e)[:300]));pg.route('https://**/*',lambda r:r.abort())
        pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=GAME.read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
        pg.route('**/sim.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=SIM.read_bytes().decode('utf-8')))
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"')
        pg.evaluate("(c)=>{__setChar(c);__spDebug.speed(0.3);__spDebug.startLocal({diff:2,mode:'1v1',points:11,venue:0});}",c)
        for i in range(16):
            pg.keyboard.press('j');pg.wait_for_timeout(600)
            k=['d','a','w','s'][i%4];pg.keyboard.down(k);pg.wait_for_timeout(150);pg.keyboard.press('Shift');pg.wait_for_timeout(2600);pg.keyboard.up(k)
        res=pg.evaluate('()=>__dv');ctx.close()
        print(c,json.dumps({k:{a:(round(v,3) if isinstance(v,float) else v) for a,v in r.items()} for k,r in res.items()}))
    b.close()
print('errors',errs)
