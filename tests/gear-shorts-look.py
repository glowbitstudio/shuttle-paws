# Usage: gear-shorts-look.py <port> <out dir>  -- screenshots of each free character trying on shorts (visual read). ONE headless browser.
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2];OUT.mkdir(exist_ok=True)
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    for ch,item in (("cat","t_cool"),("bear","t_pro"),("panda","t_comp"),("bunny","p_light")):
        ctx=b.new_context(viewport={'width':1100,'height':700});pg=ctx.new_page();pg.set_default_timeout(120000)
        ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'%s',id:null,secret:null,named:true}));"%ch)
        pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
        pg.route('https://**/*',lambda r:r.abort())
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(1500)
        pg.evaluate("()=>__spDebug.go('gear')");pg.wait_for_timeout(1500)
        pg.screenshot(path=str(OUT/f'{ch}-default.png'),clip={'x':100,'y':120,'width':460,'height':440})
        pg.click('#gearTabs button[data-slot="'+("shirt" if item[0]=="t" else "shorts")+'"]');pg.wait_for_timeout(400);pg.click(f'.gear-item[data-item="{item}"]');pg.wait_for_timeout(1800)
        pg.screenshot(path=str(OUT/f'{ch}-{item}.png'),clip={'x':100,'y':120,'width':460,'height':440})
        ctx.close()
    b.close()
print('errors',errs)
