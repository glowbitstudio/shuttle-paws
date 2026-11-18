# Usage: maps-sheet.py <port> <out png> [gfx]  -- one in-match screenshot of every map on a contact sheet (5 per row), page errors listed per map.
# ONE headless browser, one page per map.
from pathlib import Path
import sys,io,json
from playwright.sync_api import sync_playwright
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2];GFX=int(sys.argv[3]) if len(sys.argv)>3 else 1
HOOK="window.__vn=()=>S.VENUES.map(v=>v.id);window.__ri=()=>({calls:renderer.info.render.calls,tris:renderer.info.render.triangles});\n"
tiles=[];info={}
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader']);ids=None;i=0
    while ids is None or i<len(ids):
        ctx=b.new_context(viewport={'width':768,'height':432});pg=ctx.new_page();pg.set_default_timeout(120000);errs=[]
        ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:%d,gfxV:1,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));"%GFX)
        pg.on('pageerror',lambda e:errs.append(str(e)[:200]));pg.route('https://**/*',lambda r:r.abort())
        pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(800)
        if ids is None: ids=pg.evaluate('()=>__vn()')
        pg.evaluate("(v)=>__spDebug.startLocal({diff:1,mode:'1v1',points:11,venue:v})",i);pg.wait_for_timeout(4500)
        info[ids[i]]=dict(pg.evaluate('()=>__ri()'),errors=errs)
        tiles.append(Image.open(io.BytesIO(pg.screenshot())).resize((512,288)));ctx.close();i+=1
    b.close()
cols=5;rows=(len(tiles)+cols-1)//cols;sheet=Image.new('RGB',(cols*512,rows*288),'white')
for k,t in enumerate(tiles): sheet.paste(t,((k%cols)*512,(k//cols)*288))
sheet.save(OUT);print(json.dumps(info))
