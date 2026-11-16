# Usage: render-load-probe.py <port>  -- how much the game draws per frame in a match vs bots, per graphics level and mode.
# Reads the renderer's own counters (draw calls, triangles) plus mesh counts by owner (athletes / venue). ONE headless browser, one page per case.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1]
HOOK="""window.__ri=()=>{const r=renderer.info;let meshes=0,vis=0,outl=0,shadow=0;scene.traverse(o=>{if(o.isMesh){meshes++;if(o.userData.isOutline)outl++;if(o.castShadow)shadow++;}});
 let ath=0;const seen=new Set();for(const k in (session||{})){const v=session[k];if(Array.isArray(v))for(const md of v)if(md&&md.root&&md.root.traverse&&!seen.has(md)){seen.add(md);md.root.traverse(o=>{if(o.isMesh)ath++;});}}
 return {calls:r.render.calls,tris:r.render.triangles,geometries:r.memory.geometries,textures:r.memory.textures,meshes,outlineMeshes:outl,shadowCasters:shadow,athleteMeshes:ath,pixelRatio:renderer.getPixelRatio(),shadows:renderer.shadowMap.enabled};};
window.__sk=()=>Object.keys(session||{});\n"""
out={}
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    for gfx in (0,1):
        for mode in ('1v1','2v2'):
            ctx=b.new_context(viewport={'width':800,'height':450});pg=ctx.new_page();pg.set_default_timeout(120000)
            ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:%d,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));"%gfx)
            errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
            pg.route('https://**/*',lambda r:r.abort())
            pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
            pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(1500)
            pg.evaluate("(m)=>__spDebug.startLocal({diff:1,mode:m,points:11,venue:0})",mode);pg.wait_for_timeout(5000)
            r=pg.evaluate("()=>__ri()");r['sessionKeys']=pg.evaluate("()=>__sk()")[:40] if gfx==0 and mode=='1v1' else None;r['errors']=errs
            out[f'gfx{gfx}-{mode}']=r;ctx.close()
    b.close()
print(json.dumps(out,indent=1))
