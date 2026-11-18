# Usage: neck-closeup.py <port> <out png> [chars...]  -- every neck item, close on the chest, front and three-quarter view. ONE headless browser.
from pathlib import Path
import sys,io
from playwright.sync_api import sync_playwright
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2];CH=sys.argv[3:] or ['cat','bear']
HOOK="window.__look=(ch,ids,slot)=>{profile.char=ch;window.__ids2=ids;gearSlot=slot;showPreview(true);previewSwing=-9;};previewGear=()=>window.__ids2||[];window.__neck=()=>S.GEAR.filter(g=>g.slot==='neck').map(g=>g.id);\n"
errs=[];tiles=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader']);ctx=b.new_context(viewport={'width':1000,'height':640});pg=ctx.new_page();pg.set_default_timeout(120000)
    ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:1,gfxV:1,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));")
    pg.on('pageerror',lambda e:errs.append(str(e)[:300]));pg.route('https://**/*',lambda r:r.abort())
    pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
    pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(1500)
    pg.evaluate("()=>__spDebug.go('gear')");pg.add_style_tag(content='#wdSlots{display:none!important}');pg.wait_for_timeout(1200)
    ids=pg.evaluate("()=>__neck()")
    for ch in CH:
        for i in ids:
            pg.evaluate("([c,i])=>__look(c,[i],'neck')",[ch,i]);pg.wait_for_timeout(2200)
            tiles.append(Image.open(io.BytesIO(pg.screenshot(clip={'x':60,'y':60,'width':420,'height':500}))).resize((294,350)))
    b.close()
sheet=Image.new('RGB',(len(ids)*294,len(CH)*350),'white')
for k,t in enumerate(tiles): sheet.paste(t,((k%len(ids))*294,(k//len(ids))*350))
sheet.save(OUT);print(ids,errs)
