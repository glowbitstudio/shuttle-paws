# Usage: venue-shots.py <port> <out dir> [head]  -- one match screenshot per venue (gfx 1) + draw counters. "head" serves game.js from git HEAD (before).
from pathlib import Path
import json,sys,subprocess
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2];OUT.mkdir(exist_ok=True)
SRC=subprocess.run(['git','show','HEAD:game.js'],cwd=ROOT,capture_output=True).stdout.decode('utf-8') if len(sys.argv)>3 else (ROOT/'game.js').read_bytes().decode('utf-8')
HOOK="window.__ri=()=>({calls:renderer.info.render.calls,tris:renderer.info.render.triangles});\n"
res={};errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    for v in range(6):
        ctx=b.new_context(viewport={'width':800,'height':450});pg=ctx.new_page();pg.set_default_timeout(120000)
        ctx.add_init_script("Math.random=(()=>{let s=12345;return()=>{s=(s*16807)%2147483647;return s/2147483647;};})();localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:1,gfxV:1,vol:0,cam:'full'}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));")
        pg.on('pageerror',lambda e:errs.append(str(v)+' '+str(e)[:200]))
        pg.route('https://**/*',lambda r:r.abort())
        pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=SRC.replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(1200)
        pg.evaluate("(v)=>__spDebug.startLocal({diff:1,mode:'1v1',points:11,venue:v})",v);pg.wait_for_timeout(4500)
        res[v]=pg.evaluate("()=>__ri()");pg.screenshot(path=str(OUT/f'venue{v}.png'));ctx.close()
    b.close()
print(json.dumps({'counters':res,'errors':errs}))
