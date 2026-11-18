# Usage: umpire-chair-shot.py <port> <out png>  -- close-ups of the umpire's chair in a match from four sides. ONE headless browser.
from pathlib import Path
import sys,io
from playwright.sync_api import sync_playwright
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2]
tiles=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader']);ctx=b.new_context(viewport={'width':520,'height':520});pg=ctx.new_page();pg.set_default_timeout(120000)
    ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:1,gfxV:1,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));")
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:200]));pg.route('https://**/*',lambda r:r.abort())
    pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(800)
    pg.evaluate("()=>{__spDebug.speed(0.02);__spDebug.startLocal({diff:1,mode:'1v1',points:11,venue:12});}");pg.wait_for_timeout(3000)
    pg.add_style_tag(content='#hud,#touch,.hud,#score,#tmeter,#hint{display:none!important}')
    for pos in ([4.35,1.6,4.2],[8.6,1.8,0.0],[4.35,1.6,-4.2],[1.2,2.0,2.6]):
        pg.evaluate("(q)=>__spDebug.lab.setFree({pos:q,look:[4.35,1.25,0],fov:34})",pos);pg.wait_for_timeout(1800)
        tiles.append(Image.open(io.BytesIO(pg.screenshot())).resize((400,400)))
    b.close()
sheet=Image.new('RGB',(1600,400),'white')
for k,t in enumerate(tiles): sheet.paste(t,(k*400,0))
sheet.save(OUT);print('saved',OUT,errs)
