# Usage: ui-screens-shot.py <port> <out dir> [screens,comma]  -- one screenshot per menu screen, desktop + phone. ONE headless browser.
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2];OUT.mkdir(exist_ok=True)
SCR=(sys.argv[3].split(',') if len(sys.argv)>3 else ['home','bot','tour','chars','gear','rewards','ach','stats','settings','guide','online'])
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    for name,vp in (('desktop',{'width':1280,'height':720}),('phone',{'width':390,'height':780}),('land',{'width':800,'height':380})):
        ctx=b.new_context(viewport=vp,is_mobile=name!='desktop',has_touch=name!='desktop');pg=ctx.new_page();pg.set_default_timeout(120000)
        ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));")
        pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
        pg.route('https://**/*',lambda r:r.abort())
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(2500)
        for s in SCR:
            pg.evaluate("(s)=>__spDebug.go(s)",s);pg.wait_for_timeout(1200);pg.screenshot(path=str(OUT/f'{name}-{s}.png'))
        ctx.close()
    b.close()
print('errors',errs)
