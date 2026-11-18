# Usage: match-gear-probe.py <port> <out dir>  -- a local 1v1 at gfx 0 and 1, the player with no gear and then in a full outfit set + glasses + neck + wrist + racket:
# renderer draw calls / triangles, meshes per athlete, and screenshots during play (serve, run, jump, dive). ONE headless browser.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2];OUT.mkdir(exist_ok=True)
HOOK="""window.__setG=(ids)=>{wallet=Object.assign({},wallet||{},{items:ids,equip:Object.fromEntries(ids.map(i=>[S.gearById(i).slot,i]))});};window.__ri=()=>{const r=renderer.info;const a=session.models.map(md=>{let n=0;md.model.root.traverse(o=>{if(o.isMesh)n++;});return n;});return {calls:r.render.calls,tris:r.render.triangles,athleteMeshes:a};};\n"""
FULL=['dm_head','dm_shirt','dm_pants','dm_shoes','dm_back','dm_racket','id_face','ic_neck','bx_wrist']
out={};errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    for gfx in (1,):
        for name,ids in (('none',[]),('full',FULL)):
            ctx=b.new_context(viewport={'width':960,'height':540});pg=ctx.new_page();pg.set_default_timeout(120000)
            ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:%d,gfxV:1,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));"%gfx)
            pg.on('pageerror',lambda e:errs.append(str(e)[:200]));pg.route('https://**/*',lambda r:r.abort())
            pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
            pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(1200)
            pg.evaluate("(i)=>{__setG(i);__spDebug.speed(0.4);__spDebug.startLocal({diff:1,mode:'1v1',points:11,venue:0});}",ids);pg.wait_for_timeout(5000)
            out[f'gfx{gfx}-{name}']=pg.evaluate("()=>__ri()")
            if gfx==1 and name=='full':
                pg.screenshot(path=str(OUT/'match-1-ready.png'));pg.keyboard.press('l');pg.wait_for_timeout(900);pg.screenshot(path=str(OUT/'match-2-serve.png'))
                pg.keyboard.down('w');pg.wait_for_timeout(1500);pg.screenshot(path=str(OUT/'match-3-run.png'));pg.keyboard.press('k');pg.wait_for_timeout(700);pg.screenshot(path=str(OUT/'match-4-jump.png'))
                pg.keyboard.press('Shift');pg.wait_for_timeout(900);pg.screenshot(path=str(OUT/'match-5-dive.png'));pg.keyboard.up('w')
            ctx.close()
    b.close()
print(json.dumps(out),'errors',errs)
