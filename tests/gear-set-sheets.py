# Usage: gear-set-sheets.py <port> <out dir>  -- every gear set worn in full, on four body shapes (rows) from four angles (columns:
# front, 45 degrees, side, back). One PNG per set, for looking over. ONE headless browser.
from pathlib import Path
import sys,io,base64,json
from playwright.sync_api import sync_playwright
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=Path(sys.argv[2]);OUT.mkdir(parents=True,exist_ok=True)
CH=['cat','bear','hamster','unicorn'];YAW=[0,0.8,1.57,3.14];T=256
HOOK="""window.__view=(ch,ids,yaw)=>{ if(!portraitR)renderPortrait('cat'); const mdl=buildCharacter(charById(ch),0xff7a59,1,'R',ids); scene.remove(mdl.root); portraitScene.add(mdl.root); mdl.wrist.visible=!!window.__racket; mdl.root.rotation.y=yaw; mdl.root.updateMatrixWorld(true);
 const box=new THREE.Box3().expandByObject(mdl.head); if(!window.__headOnly)box.expandByObject(mdl.gear.torso); if(window.__full)box.expandByObject(mdl.root); else { box.expandByObject(mdl.gear.headGear); if(!window.__headOnly)box.expandByObject(mdl.gear.back); } const c=box.getCenter(new THREE.Vector3()),sz=box.getSize(new THREE.Vector3()),r=Math.max(sz.x,sz.y)*0.6,dist=r/Math.tan(THREE.MathUtils.degToRad(12));
 portraitCam.position.set(c.x,c.y+dist*0.12,c.z+dist); portraitCam.lookAt(c); portraitR.render(portraitScene,portraitCam); const u=portraitR.domElement.toDataURL('image/png'); portraitScene.remove(mdl.root); disposeTree(mdl.root); return u; };\n"""
HOOK+="window.__sets=()=>S.GEAR_SETS.map(s=>({id:s.id,name:s.name,ids:S.GEAR.filter(g=>g.set===s.id).map(g=>g.id)}));"
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader']);ctx=b.new_context(viewport={'width':800,'height':500});pg=ctx.new_page();pg.set_default_timeout(120000)
    ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,gfxV:1,vol:0}));")
    pg.on('pageerror',lambda e:errs.append(str(e)[:300]));pg.route('https://**/*',lambda r:r.abort())
    pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
    pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(800)
    pg.evaluate('()=>{window.__headOnly=false;window.__full=true;window.__racket=true}')
    sets=pg.evaluate('()=>__sets()')
    for st in sets:
        sheet=Image.new('RGB',(len(YAW)*T,len(CH)*T),'#39407a')
        for r,ch in enumerate(CH):
            for k,y in enumerate(YAW):
                u=pg.evaluate("([c,i,y])=>__view(c,i,y)",[ch,st['ids'],y]);im=Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGBA').resize((T,T))
                sheet.paste(im,(k*T,r*T),im)
        sheet.save(OUT/(st['id']+'.png'))
    b.close()
(OUT/'sets.json').write_text(json.dumps(sets,ensure_ascii=False,indent=1),encoding='utf-8')
print('sets',len(sets),'errors',errs)
