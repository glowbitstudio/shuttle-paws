# Usage: gear-visibility.py <port> <out json> [chars comma]  -- how much of every head / face / neck / back item is really seen on every
# character: the item is drawn alone (A pixels) and then on the character with the body hiding what it hides (B pixels); B/A is the
# share left in view. Measured from the front, 45 degrees and the side (back items: from behind, 135 degrees and the side).
# Lists every pair where the body hides most of the item. ONE headless browser.
from pathlib import Path
import sys,json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=Path(sys.argv[2])
HOOK=r"""window.__vis=(ch,id,slot,yaws)=>{ if(!portraitR)renderPortrait('cat'); const mdl=buildCharacter(charById(ch),0xff7a59,1,'R',[id]); scene.remove(mdl.root); portraitScene.add(mdl.root); mdl.wrist.visible=false;
 const grp=mdl.gear[{head:'headGear',face:'face',neck:'neck',back:'back'}[slot]], inG=new Set(); grp.traverse(o=>{if(o.isMesh)inG.add(o)});
 const M=new THREE.MeshBasicMaterial({color:0xff00ff,side:THREE.DoubleSide}), K=new THREE.MeshBasicMaterial({color:0x000000,side:THREE.DoubleSide}), body=[];
 mdl.root.traverse(o=>{ if(!o.isMesh)return; if(o.userData.isOutline||o.material===OUTLINE){o.visible=false;return;} if(inG.has(o))o.material=M; else {o.material=K;body.push(o);} });
 const cv=window.__vc||(window.__vc=document.createElement('canvas')); cv.width=cv.height=160; const cx=cv.getContext('2d',{willReadFrequently:true});
 const count=()=>{ portraitR.render(portraitScene,portraitCam); cx.clearRect(0,0,160,160); cx.drawImage(portraitR.domElement,0,0,160,160); const d=cx.getImageData(0,0,160,160).data; let n=0; for(let i=0;i<d.length;i+=4) if(d[i]>180&&d[i+2]>180&&d[i+1]<90&&d[i+3]>128) n++; return n; };
 const out=[]; for(const yaw of yaws){ mdl.root.rotation.y=yaw; mdl.root.updateMatrixWorld(true);
  const box=new THREE.Box3().expandByObject(mdl.root), c=box.getCenter(new THREE.Vector3()), sz=box.getSize(new THREE.Vector3()), r=Math.max(sz.x,sz.y)*0.6, dist=r/Math.tan(THREE.MathUtils.degToRad(12));
  portraitCam.position.set(c.x,c.y+dist*0.12,c.z+dist); portraitCam.lookAt(c);
  for(const o of body)o.visible=true; const b=count(); for(const o of body)o.visible=false; const a=count(); out.push([a,b]); }
 portraitScene.remove(mdl.root); disposeTree(mdl.root); return out; };
window.__items=()=>S.GEAR.filter(g=>['head','face','neck','back'].includes(g.slot)).map(g=>[g.id,g.slot,g.name]);
"""
res=[];errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader']);ctx=b.new_context(viewport={'width':800,'height':500});pg=ctx.new_page();pg.set_default_timeout(300000)
    ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,gfxV:1,vol:0}));")
    pg.on('pageerror',lambda e:errs.append(str(e)[:300]));pg.route('https://**/*',lambda r:r.abort())
    pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
    pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(800)
    items=pg.evaluate('()=>__items()');chars=sys.argv[3].split(',') if len(sys.argv)>3 else pg.evaluate('()=>__spDebug.lab.chars.map(c=>c.id)')
    for ch in chars:
        for iid,slot,name in items:
            yaws=[3.14,2.36,1.57] if slot=='back' else [0,0.8,1.57]
            try: v=pg.evaluate("([c,i,s,y])=>__vis(c,i,s,y)",[ch,iid,slot,yaws])
            except Exception as e: errs.append(f'{ch} {iid} {str(e)[:120]}');continue
            res.append({'ch':ch,'id':iid,'slot':slot,'name':name,'v':v})
    b.close()
OUT.write_text(json.dumps({'res':res,'errors':errs},ensure_ascii=False),encoding='utf-8');print('pairs',len(res),'errors',errs[:3])
