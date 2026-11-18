# Usage: dare-roundtrip-check.py <port>  -- a whole challenger match in the browser (the human stands still, time sped up), then the server
# is asked what it has learned: the report sent at the end of the match must have arrived.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1]
HOOK="window.__st=()=>({state:session?session.m.state:'none',clock:session?Math.round(session.m.clock):0,score:session?session.m.score:null,net:!!(Net.ok),dareG:(g=>g&&{n:g.n,cells:Object.keys(g.T||{}).length,sample:Object.entries(g.T||{}).slice(0,3)})(store.get('sp.dareG',null)),dare:(d=>d&&{cells:Object.keys(d.T||{}).length})(store.get('sp.dare',null)),ticket:(store.get('sp.dareT',null)||'').length,mem:((store.get('sp.dareG',null)||{}).mem||[]).length});\n"
errs=[];out={}
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    for k in (1,2):
        ctx=b.new_context(viewport={'width':640,'height':360});pg=ctx.new_page();pg.set_default_timeout(300000)
        ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,gfxV:1,vol:0}));")
        if k==2: ctx.add_init_script("localStorage.setItem('sp.dare',JSON.stringify({front:0,bad:{}}));")   # a device that has met the challenger before: it fetches the shared memory
        pg.on('pageerror',lambda e:errs.append(str(e)[:200]));pg.route('https://**/*',lambda r:r.abort())
        pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(2500)
        out['start%d'%k]=pg.evaluate('()=>__st()')
        if k==1:
            pg.evaluate("()=>{__spDebug.speed(6);__spDebug.startLocal({diff:4,mode:'1v1',points:11,venue:0});}")
            pg.wait_for_function("__st().state==='over'",timeout=280000);pg.wait_for_timeout(2500);out['end']=pg.evaluate('()=>__st()')
        ctx.close()
    b.close()
print(json.dumps({'results':out,'errors':errs},ensure_ascii=False))
