# Usage: name-flow-check.py <port> <out dir>  -- first launch asks for a name once; Settings changes it; the character
# select screen no longer has a name field. ONE headless browser, phone-sized page.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2];OUT.mkdir(exist_ok=True)
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader']);errs=[];r={}
    ctx=b.new_context(viewport={'width':390,'height':780},is_mobile=True,has_touch=True);pg=ctx.new_page();pg.set_default_timeout(60000)
    pg.on('pageerror',lambda e:errs.append(str(e)[:300]));pg.route('https://**/*',lambda q:q.abort())
    pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"')
    r['askShown']=pg.evaluate("()=>!document.getElementById('nameAsk').classList.contains('hidden')");pg.wait_for_timeout(1200);pg.screenshot(path=str(OUT/'first-launch.png'))
    pg.fill('#firstName','Bé Na');pg.click('#firstOk');pg.wait_for_timeout(300)
    r['askHidden']=pg.evaluate("()=>document.getElementById('nameAsk').classList.contains('hidden')");r['homeName']=pg.evaluate("()=>document.getElementById('homeName').textContent")
    pg.evaluate("()=>__spDebug.go('chars')");pg.wait_for_timeout(2500);r['charsHasNameField']=pg.evaluate("()=>!!document.querySelector('#s-chars input')");pg.screenshot(path=str(OUT/'chars.png'))
    pg.evaluate("()=>__spDebug.go('settings')");pg.wait_for_timeout(300);r['settingsValue']=pg.input_value('#nameInput')
    pg.fill('#nameInput','Na Na');pg.dispatch_event('#nameInput','change');pg.evaluate("()=>__spDebug.go('home')");r['renamed']=pg.evaluate("()=>document.getElementById('homeName').textContent")
    pg.reload(wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(300)
    r['askAgainAfterReload']=pg.evaluate("()=>!document.getElementById('nameAsk').classList.contains('hidden')");r['nameAfterReload']=pg.evaluate("()=>document.getElementById('homeName').textContent")
    b.close()
print(json.dumps({'results':r,'errors':errs},ensure_ascii=False))
