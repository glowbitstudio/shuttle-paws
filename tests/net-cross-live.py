# Usage: net-cross-live.py <port> [char ids...]
# Real local matches: the human serves, runs to the net and dives toward it again and again. Every rendered frame the body of each
# athlete (head, torso, legs, free arm; not the racket arm) is measured against the net plane (z = 0): how far any vertex is on the
# opponent's side. Prints per character the worst crossing for the head and for the rest, and the athlete state at that moment.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];CH=sys.argv[2:] or ['cat','bunny','bear','unicorn']
HOOK='''window.__nc={};window.__setChar=(c)=>{profile.char=c;};
(function(){const V=new THREE.Vector3();const tick=()=>{requestAnimationFrame(tick);if(!session||!session.m)return;
 session.models.forEach((md,i)=>{const a=session.m.athletes[i],mdl=md.model;if(!a||Math.abs(a.z)>1.6)return;const sg=S.sgn(a.team);
  mdl.root.updateMatrixWorld(true);const far={head:-9,body:-9};
  mdl.body.traverse(o=>{if(!o.isMesh||o.userData.isOutline)return;let part='body';
   for(let q=o;q&&q!==mdl.body;q=q.parent){if(q===mdl.head){part='head';break;}if(q===mdl.arm){part=null;break;}}
   if(!part)return;const p=o.geometry.attributes.position;for(let k=0;k<p.count;k+=2){V.fromBufferAttribute(p,k).applyMatrix4(o.matrixWorld);const c=-sg*V.z;if(c>far[part])far[part]=c;}});
  const id=(a.ctrl==='bot'?'bot:':'me:')+a.char;const r=window.__nc[id]||(window.__nc[id]={n:0,head:-9,body:-9,over:0});
  r.n++;if(far.head>0.01||far.body>0.01)r.over++;
  if(far.head>r.head){r.head=far.head;r.headAt={z:+Math.abs(a.z).toFixed(2),dive:+a.diveT.toFixed(2),rec:+a.recoverT.toFixed(2),swing:+a.swingT.toFixed(2),jump:+a.jumpY.toFixed(2),tilt:+mdl.body.rotation.x.toFixed(2)};}
  if(far.body>r.body){r.body=far.body;r.bodyAt={z:+Math.abs(a.z).toFixed(2),dive:+a.diveT.toFixed(2),rec:+a.recoverT.toFixed(2),swing:+a.swingT.toFixed(2)};}});};
 requestAnimationFrame(tick);})();
'''
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader']);errs=[]
    for c in CH:
        ctx=b.new_context(viewport={'width':640,'height':400});pg=ctx.new_page();pg.set_default_timeout(600000)
        ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,gfxV:1,vol:0}));")
        pg.on('pageerror',lambda e:errs.append(str(e)[:300]));pg.route('https://**/*',lambda r:r.abort())
        pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"')
        pg.evaluate("(c)=>{__setChar(c);__spDebug.speed(0.3);__spDebug.startLocal({diff:2,mode:'1v1',points:11,venue:0});}",c)
        for i in range(10):
            pg.keyboard.press('l');pg.wait_for_timeout(500)
            pg.keyboard.down('w');pg.wait_for_timeout(2200);pg.keyboard.press('Shift');pg.wait_for_timeout(1500);pg.keyboard.press('k');pg.wait_for_timeout(1200);pg.keyboard.up('w')
        res=pg.evaluate('()=>__nc');ctx.close()
        for k,r in res.items(): print(k,json.dumps({a:(round(v,3) if isinstance(v,float) else v) for a,v in r.items()}))
    b.close()
print('errors',errs)
