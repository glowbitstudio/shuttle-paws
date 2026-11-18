# Usage: cam-compare.py <port> <out png>  -- the same moment of a match seen with the current camera and two lower ones, on two maps.
# ONE headless browser.
from pathlib import Path
import sys,io
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2]
CAMS=[('Hien tai',None),('Ha thap vua',{'ty':8.0,'tz':16.0,'lz':-0.5}),('Ha thap nhieu',{'ty':5.6,'tz':17.5,'lz':-2.5})]
tiles=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    for venue in (0,12):
        ctx=b.new_context(viewport={'width':960,'height':540});pg=ctx.new_page();pg.set_default_timeout(120000)
        ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:1,gfxV:1,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));")
        pg.route('https://**/*',lambda r:r.abort())
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(800)
        pg.evaluate("(v)=>{__spDebug.speed(0.02);__spDebug.startLocal({diff:1,mode:'1v1',points:11,venue:v});}",venue);pg.wait_for_timeout(3000)
        for name,cam in CAMS:
            pg.evaluate("(c)=>__spDebug.setCam(c)",cam);pg.wait_for_timeout(2500)
            im=Image.open(io.BytesIO(pg.screenshot())).resize((640,360));ImageDraw.Draw(im).rectangle((0,330,640,360),fill=(0,0,0));ImageDraw.Draw(im).text((10,338),name,fill=(255,255,255));tiles.append(im)
        ctx.close()
    b.close()
sheet=Image.new('RGB',(3*640,2*360),'white')
for k,t in enumerate(tiles): sheet.paste(t,((k%3)*640,(k//3)*360))
sheet.save(OUT);print('saved',OUT)
