# Usage: lobby-over-shot.py <port> <out dir>  -- screenshots of the lobby and of the end-of-match screen (a whole match against the
# challenger with the human standing still, time sped up), desktop and phone. ONE headless browser.
from pathlib import Path
import sys,json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2];OUT.mkdir(exist_ok=True)
HOOK="window.__st=()=>session?session.m.state:'none';\n"
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    for name,vp in (('desktop',{'width':1280,'height':720}),('phone',{'width':390,'height':780})):
        ctx=b.new_context(viewport=vp,is_mobile=name=='phone',has_touch=name=='phone');pg=ctx.new_page();pg.set_default_timeout(300000)
        ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:1,gfxV:1,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));")
        pg.on('pageerror',lambda e:errs.append(name+' '+str(e)[:200]));pg.route('https://**/*',lambda r:r.abort())
        pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(3000)
        pg.screenshot(path=str(OUT/f'{name}-lobby.png'))
        pg.evaluate("()=>{__spDebug.speed(6);__spDebug.startLocal({diff:4,mode:'1v1',points:11,venue:0});}")
        pg.wait_for_function("__st()==='over'",timeout=280000);pg.evaluate("()=>__spDebug.speed(1)");pg.wait_for_timeout(3500);pg.screenshot(path=str(OUT/f'{name}-over.png'))
        ctx.close()
    b.close()
print(json.dumps({'errors':errs}))
