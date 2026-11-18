# Usage: cam-options-check.py <port> <out png>  -- the 'mid' and 'low' camera options in a real match: serve high, shoot while the shuttle is up,
# on a desktop screen and a phone held upright; reports page errors and whether the shuttle and the player stayed inside the picture.
from pathlib import Path
import sys,io,json
from playwright.sync_api import sync_playwright
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2]
HOOK="window.__in=()=>{const v=new THREE.Vector3(),m=session.m,s=m.shuttle.p,a=m.athletes[session.me];const f=(x,y,z)=>{v.set(x,y,z).project(camera);return Math.abs(v.x)<=1&&Math.abs(v.y)<=1;};return {shuttle:f(s.x,s.y,s.z),me:f(a.x,0.5,a.z),sy:+s.y.toFixed(1)};};\n"
tiles=[];res={};errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    for cam in ('mid','low'):
        for name,vp in (('desktop',{'width':960,'height':540}),('phone',{'width':390,'height':780})):
            ctx=b.new_context(viewport=vp,is_mobile=name=='phone',has_touch=name=='phone');pg=ctx.new_page();pg.set_default_timeout(120000)
            ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,gfxV:1,vol:0,cam:'%s'}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));"%cam)
            pg.on('pageerror',lambda e:errs.append(cam+' '+name+' '+str(e)[:200]));pg.route('https://**/*',lambda r:r.abort())
            pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
            pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(800)
            pg.evaluate("()=>{__spDebug.speed(0.25);__spDebug.startLocal({diff:1,mode:'1v1',points:11,venue:0});}");pg.wait_for_timeout(3000)
            seen=[];out=0
            for k in range(3):
                pg.keyboard.press('j')
                for q in range(10):
                    pg.wait_for_timeout(450);r=pg.evaluate('()=>__in()');seen.append(r['sy'])
                    if not r['shuttle'] or not r['me']: out+=1
                    if k==0 and q==3: tiles.append(Image.open(io.BytesIO(pg.screenshot())).resize((480,270) if name=='desktop' else (135,270)))
            res[cam+'-'+name]={'samples':len(seen),'outOfFrame':out,'maxShuttleY':max(seen)};ctx.close()
    b.close()
sheet=Image.new('RGB',(sum(t.width for t in tiles),270),'white');x=0
for t in tiles: sheet.paste(t,(x,0));x+=t.width
sheet.save(OUT);print(json.dumps({'results':res,'errors':errs}))
