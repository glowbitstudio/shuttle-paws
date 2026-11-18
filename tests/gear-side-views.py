# Usage: gear-side-views.py <port> <out prefix> <chars comma> <items comma> [yaws comma]  -- items seen from the side: one sheet per character,
# one column per item, one row per yaw (radians; 0 = front, 1.57 = side). Rendered off-screen with the icon renderer. ONE headless browser.
from pathlib import Path
import sys,io,base64
from playwright.sync_api import sync_playwright
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=sys.argv[2];CH=sys.argv[3].split(',');IDS=sys.argv[4].split(',');YAW=[float(x) for x in (sys.argv[5] if len(sys.argv)>5 else '0.8,1.57').split(',')]
HOOK="""window.__view=(ch,ids,yaw)=>{ if(!portraitR)renderPortrait('cat'); const mdl=buildCharacter(charById(ch),0xff7a59,1,'R',ids); scene.remove(mdl.root); portraitScene.add(mdl.root); mdl.wrist.visible=false; mdl.root.rotation.y=yaw; mdl.root.updateMatrixWorld(true);
 const box=new THREE.Box3().expandByObject(mdl.head); box.expandByObject(mdl.gear.torso); const c=box.getCenter(new THREE.Vector3()),sz=box.getSize(new THREE.Vector3()),r=Math.max(sz.x,sz.y)*0.6,dist=r/Math.tan(THREE.MathUtils.degToRad(12));
 portraitCam.position.set(c.x,c.y+dist*0.12,c.z+dist); portraitCam.lookAt(c); portraitR.render(portraitScene,portraitCam); const u=portraitR.domElement.toDataURL('image/png'); portraitScene.remove(mdl.root); disposeTree(mdl.root); return u; };\n"""
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader']);ctx=b.new_context(viewport={'width':800,'height':500});pg=ctx.new_page();pg.set_default_timeout(120000)
    ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,gfxV:1,vol:0}));")
    pg.on('pageerror',lambda e:errs.append(str(e)[:300]));pg.route('https://**/*',lambda r:r.abort())
    pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
    pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(800)
    T=230
    for ch in CH:
        sheet=Image.new('RGB',(len(IDS)*T,len(YAW)*T),'#39407a')
        for r,y in enumerate(YAW):
            for k,i in enumerate(IDS):
                u=pg.evaluate("([c,i,y])=>__view(c,i?i.split('+'):[],y)",[ch,i,y]);im=Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGBA').resize((T,T))
                sheet.paste(im,(k*T,r*T),im)
        f=ROOT/f'{OUT}-{ch}.png';sheet.save(f);print('saved',f)
    b.close()
print('items',IDS,'errors',errs)
