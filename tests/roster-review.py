# Usage: roster-review.py [port] [out dir] [game.js snapshot] [sim.js snapshot]  -> <out>/<id>.png (front | 3/4 | face), _sheet.jpg, _faces.jpg, shapes.json, stats.json
# stats.json: per character triangle / mesh counts and a rig fingerprint (world positions of the joints the clips drive).
# Reference renders of the 16 characters as V2 builds them now (read-only: nothing in the game is changed).
# ONE headless browser. Each character is built with the game's own buildCharacter, moved into a private scene with a plain
# grey background and the portrait lighting, racket hidden, arms relaxed, and rendered from three cameras.
from pathlib import Path
import json,sys,base64,io,re
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
PORT=sys.argv[1] if len(sys.argv)>1 else '3062'
OUT=ROOT/(sys.argv[2] if len(sys.argv)>2 else 'roster-review');OUT.mkdir(exist_ok=True)
GAME=ROOT/(sys.argv[3] if len(sys.argv)>3 else 'game.js');SIM=ROOT/(sys.argv[4] if len(sys.argv)>4 else 'sim.js')
JS='''async ()=>{
 const L=__spDebug.lab,THREE=L.THREE,S=512;
 const r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setPixelRatio(1);r.setSize(S,S,false);
 const sc=new THREE.Scene();sc.background=new THREE.Color(0xf2f2f2);
 sc.add(new THREE.HemisphereLight(0xfff7ee,0x8a7a90,1.05));const key=new THREE.DirectionalLight(0xffffff,0.85);key.position.set(-2,3,4);sc.add(key);sc.add(new THREE.AmbientLight(0xffffff,0.12));
 const cam=new THREE.PerspectiveCamera(24,1,0.1,50),out=[];
 const strip=document.createElement('canvas');strip.width=S*3;strip.height=S;const g=strip.getContext('2d');
 for(const c of L.chars){
  const mdl=L.buildCharacter(L.charById(c.id),0xff7a59,1,'R');
  L.scene.remove(mdl.root);sc.add(mdl.root);
  mdl.wrist.visible=false;                                   // racket hidden
  for(const n of [mdl.arm,mdl.free]){n.rotation.set(0.15,0,0);} mdl.armEl.rotation.set(-0.25,0,0);mdl.freeEl.rotation.set(-0.25,0,0);
  mdl.arm.rotation.z=-0.22*mdl.h;mdl.free.rotation.z=0.22*mdl.h;
  mdl.root.position.set(0,0,0);mdl.root.rotation.set(0,0,0);mdl.root.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(mdl.root),size=box.getSize(new THREE.Vector3()),mid=box.getCenter(new THREE.Vector3());
  const hp=mdl.head.getWorldPosition(new THREE.Vector3());
  const shot=(i,yaw,look,dist)=>{mdl.root.rotation.y=yaw;mdl.root.updateMatrixWorld(true);cam.position.set(look.x,look.y+dist*0.06,look.z+dist);cam.lookAt(look);r.render(sc,cam);g.drawImage(r.domElement,i*S,0);};
  const full=Math.max(size.y,size.x)*0.5/Math.tan(THREE.MathUtils.degToRad(12))*1.12;
  shot(0,0,mid,full);shot(1,0.65,mid,full);
  shot(2,0.25,new THREE.Vector3(hp.x,hp.y+0.02,hp.z),0.52/Math.tan(THREE.MathUtils.degToRad(12)));
  let tris=0,meshes=0;mdl.root.traverse(o=>{if(o.isMesh&&o.visible&&!o.userData.isOutline){let v=true;for(let q=o;q;q=q.parent)if(!q.visible)v=false;if(!v)return;meshes++;const ge=o.geometry;tris+=(ge.index?ge.index.count:ge.attributes.position.count)/3;}});
  mdl.root.rotation.y=0;mdl.root.updateMatrixWorld(true);
  const wp=o=>o.getWorldPosition(new THREE.Vector3()).toArray().map(v=>+v.toFixed(5));
  const rig={head:wp(mdl.head),arm:wp(mdl.arm),armEl:wp(mdl.armEl),wrist:wp(mdl.wrist),free:wp(mdl.free),freeEl:wp(mdl.freeEl),hips:wp(mdl.rig.hips),chest:wp(mdl.rig.chest),feet:mdl.feet.map(wp),knees:mdl.rig.legs.map(l=>wp(l.knee))};
  out.push({id:c.id,name:c.name,kind:c.kind,height:+size.y.toFixed(3),tris,meshes,rig,gear:mdl.gear?{headGear:mdl.gear.headGear.children.length,wristGear:mdl.gear.wristGear.length,shoes:mdl.gear.shoes.length}:null,png:strip.toDataURL('image/png')});
  sc.remove(mdl.root);L.disposeTree(mdl.root);
 }
 r.dispose();return out;}'''
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader']);ctx=b.new_context(viewport={'width':640,'height':480});pg=ctx.new_page();pg.set_default_timeout(600000);errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)));pg.route('https://**/*',lambda r:r.abort())
    pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=GAME.read_bytes().decode('utf-8')))
    pg.route('**/sim.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=SIM.read_bytes().decode('utf-8')))
    pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"')
    res=pg.evaluate(JS);ctx.close();b.close()
try: font=ImageFont.truetype('arial.ttf',22)
except Exception: font=ImageFont.load_default()
S=512;sheet=Image.new('RGB',(S*4,(S+40)*4),(217,217,217));faces=Image.new('RGB',(S*4,(S+40)*4),(217,217,217))
for i,r in enumerate(res):
    im=Image.open(io.BytesIO(base64.b64decode(r['png'].split(',',1)[1]))).convert('RGB');im.save(OUT/(r['id']+'.png'))
    x,y=(i%4)*S,(i//4)*(S+40)
    for canvas,k in ((sheet,0),(faces,2)):
        canvas.paste(im.crop((k*S,0,(k+1)*S,S)),(x,y));ImageDraw.Draw(canvas).text((x+12,y+S+6),f"{r['id']} - {r['name']} ({r['kind']})",fill=(20,20,20),font=font)
sheet.save(OUT/'_sheet.jpg',quality=88);faces.save(OUT/'_faces.jpg',quality=88)
# construction parameters straight from the sources
(OUT/'stats.json').write_text(json.dumps([{k:v for k,v in r.items() if k!='png'} for r in res],indent=1),encoding='utf-8')
import subprocess
node=r'''const S=require(process.argv[2]);const fs=require('fs');const g=fs.readFileSync(process.argv[1],'utf8');
const a=g.indexOf('const SHAPES = {'),b=g.indexOf('};',a);const SHAPES=eval('('+g.slice(a+15,b+1)+')');
const hex=v=>typeof v==='number'?'#'+v.toString(16).padStart(6,'0'):v;
console.log(JSON.stringify(S.CHARS.map(c=>({id:c.id,name:c.name,kind:c.kind,colours:{body:hex(c.body),belly:hex(c.belly),earInner:hex(c.earIn),earOuter:c.earCol!==undefined?hex(c.earCol):'(body)'},ear:c.ear,tail:c.tail,markings:{patches:!!c.patches,stripes:!!c.stripes},shape:Object.fromEntries(Object.entries(SHAPES[c.id]).map(([k,v])=>[k,k==='darkPaws'?hex(v):v]))})),null,1));'''
import shutil,tempfile
tmp=Path(tempfile.mkdtemp());shutil.copy(SIM,tmp/'sim.js')
js=subprocess.run(['node','-e',node,str(GAME),str(tmp/'sim.js')],cwd=ROOT,capture_output=True,text=True,encoding='utf-8')
(OUT/'shapes.json').write_text(js.stdout if js.returncode==0 else json.dumps({'error':js.stderr[:400]}),encoding='utf-8')
print([ (r['id'],r['height'],int(r['tris']),r['meshes']) for r in res]);print('errors',errs,'shapes ok',js.returncode==0)
