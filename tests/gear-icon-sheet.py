# Usage: gear-icon-sheet.py <port> <out png> [char]  -- all 24 item icons (as the wardrobe / shop show them) on one sheet. ONE headless browser.
from pathlib import Path
import sys,io,base64
from playwright.sync_api import sync_playwright
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2];CH=sys.argv[3] if len(sys.argv)>3 else 'cat'
HOOK="window.__icon=(id,ch)=>renderGearIcon(id+'@'+ch);window.__ids=()=>S.GEAR.map(g=>g.id);\n"
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader']);ctx=b.new_context(viewport={'width':640,'height':400});pg=ctx.new_page();pg.set_default_timeout(120000)
    ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,gfxV:1,vol:0}));")
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:300]));pg.route('https://**/*',lambda r:r.abort())
    pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
    pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(1000)
    ids=pg.evaluate("()=>__ids()");tiles=[]
    for i in ids:
        u=pg.evaluate("([i,c])=>__icon(i,c)",[i,CH]);im=Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGBA')
        bg=Image.new('RGBA',im.size,(58,64,128,255));bg.alpha_composite(im);tiles.append(bg.convert('RGB'))
    b.close()
cols=6;rows=(len(tiles)+cols-1)//cols;sheet=Image.new('RGB',(cols*180,rows*180),'white')
for k,t in enumerate(tiles): sheet.paste(t,((k%cols)*180+2,(k//cols)*180+2))
sheet.save(OUT);print('icons',len(tiles),'errors',errs)
