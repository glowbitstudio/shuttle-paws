# Usage: match-frames.py <port> <out dir>  -- frames of a real match for looking over the play: the player on "Dễ" assist (the game
# hits by itself) against a medium bot. Phone landscape, phone portrait and desktop, one frame every 0.45 s. ONE headless browser.
from pathlib import Path
import sys,json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2];OUT.mkdir(parents=True,exist_ok=True);errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    for name,vp,mob,n,venue in (('land',{'width':780,'height':390},True,44,0),('port',{'width':390,'height':780},True,24,3),('desk',{'width':1280,'height':720},False,24,7)):
        ctx=b.new_context(viewport=vp,device_scale_factor=1,is_mobile=mob,has_touch=mob);pg=ctx.new_page();pg.set_default_timeout(120000)
        ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:1,gfxV:1,vol:0,assist:2}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));")
        pg.on('pageerror',lambda e:errs.append(name+' '+str(e)[:200]));pg.route('https://**/*',lambda r:r.abort())
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(2500)
        pg.evaluate("(v)=>__spDebug.startLocal({diff:2,mode:'1v1',points:11,venue:v,anyVenue:true})",venue);pg.wait_for_timeout(3500)
        for i in range(n):
            pg.screenshot(path=str(OUT/f'{name}-{i:02d}.png'));pg.wait_for_timeout(450)
        ctx.close()
    b.close()
print(json.dumps({'errors':errs}))
