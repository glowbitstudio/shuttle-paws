# Usage: gear-sheet.py <port> <out png> [char]  -- contact sheet: every gear item tried on in the wardrobe preview (one tile per item). ONE headless browser.
from pathlib import Path
import sys,io
from playwright.sync_api import sync_playwright
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2];CH=sys.argv[3] if len(sys.argv)>3 else 'cat'
HOOK="window.__try=(id)=>{gearTry=id;gearSlot=id?S.gearById(id).slot:'racket';showPreview(true);previewSwing=-9;};window.__ids=()=>S.GEAR.map(g=>g.id);\n"
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader']);ctx=b.new_context(viewport={'width':1000,'height':640});pg=ctx.new_page();pg.set_default_timeout(120000)
    ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:1,gfxV:1,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'%s',id:null,secret:null,named:true}));"%CH)
    pg.on('pageerror',lambda e:errs.append(str(e)[:300]));pg.route('https://**/*',lambda r:r.abort())
    pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
    pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(1500)
    pg.evaluate("()=>__spDebug.go('gear')");pg.wait_for_timeout(1200)
    ids=[None]+pg.evaluate("()=>__ids()");tiles=[]
    for i in ids:
        pg.evaluate("(i)=>__try(i)",i);pg.wait_for_timeout(1700 if i and i[0]=='b' else 900)
        tiles.append(Image.open(io.BytesIO(pg.screenshot(clip={'x':95,'y':110,'width':330,'height':400}))).resize((231,280)))
    b.close()
cols=5;rows=(len(tiles)+cols-1)//cols;sheet=Image.new('RGB',(cols*231,rows*280),'white')
for k,t in enumerate(tiles): sheet.paste(t,((k%cols)*231,(k//cols)*280))
sheet.save(OUT);print('tiles',len(tiles),'order',ids,'errors',errs)
