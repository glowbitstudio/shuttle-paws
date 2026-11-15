# Usage: roster-ingame-shots.py <port> <out dir> <game snapshot> <sim snapshot>  -> grid.png (character select, portraits), match.png (2v2 match)
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2];OUT.mkdir(exist_ok=True)
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader']);ctx=b.new_context(viewport={'width':1100,'height':700});pg=ctx.new_page();pg.set_default_timeout(600000);errs=[]
    ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:1,vol:0}));")
    pg.on('pageerror',lambda e:errs.append(str(e)));pg.route('https://**/*',lambda r:r.abort())
    pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/sys.argv[3]).read_bytes().decode('utf-8')))
    pg.route('**/sim.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/sys.argv[4]).read_bytes().decode('utf-8')))
    pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"')
    pg.evaluate("()=>__spDebug.go('chars')");pg.wait_for_timeout(20000);pg.screenshot(path=str(OUT/'grid.png'))
    pg.evaluate("()=>__spDebug.startLocal({diff:1,mode:'2v2',points:11,venue:0})");pg.wait_for_timeout(6000);pg.screenshot(path=str(OUT/'match.png'))
    ctx.close();b.close()
print('errors',errs)
