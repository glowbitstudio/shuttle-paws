# Usage: floor-sink-live.py <port> [char ids...]  -- real local matches; the human runs, jumps, swings and dives again and again.
# Every rendered frame the lowest point of each athlete's body (all meshes except outlines and the racket) is measured: how far it is
# below the court surface. Prints per athlete the worst depth, how many frames were more than 2 cm under, and the state at the worst frame.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];CH=sys.argv[2:] or ['penguin','duck','cat']
HOOK='''window.__fs={};window.__setChar=(c)=>{profile.char=c;};
(function(){const V=new THREE.Vector3();const tick=()=>{requestAnimationFrame(tick);if(!session||!session.m)return;
 session.models.forEach((md,i)=>{const a=session.m.athletes[i],mdl=md.model;if(!a)return;mdl.root.updateMatrixWorld(true);let low=9,part='';
  mdl.body.traverse(o=>{if(!o.isMesh||o.userData.isOutline||!o.geometry.attributes.position)return;let rk=false,nm='body';
   for(let q=o;q&&q!==mdl.body;q=q.parent){if(q===mdl.wrist){rk=true;break;}if(q===mdl.head)nm='head';else if(mdl.feet&&mdl.feet.includes(q))nm='foot';else if(q===mdl.arm||q===mdl.free)nm='arm';}
   if(rk)return;const p=o.geometry.attributes.position;for(let k=0;k<p.count;k+=2){V.fromBufferAttribute(p,k).applyMatrix4(o.matrixWorld);if(V.y<low){low=V.y;part=nm;}}});
  const id=(a.ctrl==='bot'?'bot:':'me:')+a.char;const r=window.__fs[id]||(window.__fs[id]={n:0,under:0,worst:0});r.n++;
  const d=0.02-low;if(low<0.0)r.under++;
  if(-low>r.worst){r.worst=-low;r.at={part,dive:+a.diveT.toFixed(2),rec:+a.recoverT.toFixed(2),swing:+a.swingT.toFixed(2),jump:+a.jumpY.toFixed(2),tilt:+mdl.body.rotation.x.toFixed(2),clip:md.matchClip||null};}});};
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
        pg.evaluate("(c)=>{__setChar(c);__spDebug.speed(0.3);__spDebug.startLocal({diff:2,mode:'1v1',points:21,venue:0,opp:c});}",c)
        for i in range(8):
            pg.keyboard.press('l');pg.wait_for_timeout(500)
            for key in ('a','d','w','s'):
                pg.keyboard.down(key);pg.wait_for_timeout(700);pg.keyboard.press('Shift');pg.wait_for_timeout(1300);pg.keyboard.press('k');pg.wait_for_timeout(500);pg.keyboard.press(' ');pg.wait_for_timeout(500);pg.keyboard.up(key)
        res=pg.evaluate('()=>__fs');ctx.close()
        for k,r in res.items(): print(k,json.dumps({a:(round(v,3) if isinstance(v,float) else v) for a,v in r.items()}))
    b.close()
print('errors',errs)
