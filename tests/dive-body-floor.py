# Usage: dive-body-floor.py [port] [game.js snapshot] [sim.js snapshot]
# Every character is built with the game's own buildCharacter and put in the lying dive pose the game uses
# (body.rotation.x = 1.25, body.position.y = 0.13, arms in POSE.dive / FREE.dive). Prints, per character, the lowest
# vertex of every visible non-outline mesh and which top-level part it belongs to. Nothing in the game is changed.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
PORT=sys.argv[1] if len(sys.argv)>1 else '3063'
GAME=ROOT/(sys.argv[2] if len(sys.argv)>2 else 'game.js');SIM=ROOT/(sys.argv[3] if len(sys.argv)>3 else 'sim.js')
JS='''()=>{
 const L=__spDebug.lab,THREE=L.THREE,out=[],v=new THREE.Vector3();
 for(const c of L.chars){
  const mdl=L.buildCharacter(L.charById(c.id),0xff7a59,1,'R');
  mdl.root.position.set(0,0,0);mdl.root.rotation.set(0,0,0);
  mdl.body.rotation.x=1.25;mdl.body.position.y=0.13+(mdl.diveLift||0);
  mdl.arm.rotation.set(-2.9,0,0.3*mdl.h);mdl.armEl.rotation.set(-0.05,0,0);
  mdl.free.rotation.set(-2.7,0,-0.35*mdl.h);mdl.freeEl.rotation.set(-0.1,0,0);
  const parts={};
  for(const hx of [mdl.diveHeadX||0, mdl.diveHeadX===undefined?-0.375:mdl.diveHeadX]){mdl.head.rotation.x=hx;mdl.root.updateMatrixWorld(true);
  mdl.root.traverse(o=>{
   if(!o.isMesh||o.userData.isOutline)return;
   let vis=true,part='other';
   for(let q=o;q;q=q.parent){if(!q.visible)vis=false;if(q===mdl.head)part='head';else if(q===mdl.arm||q===mdl.free)part='arm';else if(mdl.rig&&mdl.rig.legs.some(l=>l.thigh===q))part='leg';else if(q===mdl.wrist)part='racket';}
   if(!vis||part==='leg')return;
   if(part==='other'){let inBody=false;for(let q=o;q;q=q.parent)if(q===mdl.body)inBody=true;part=inBody?'torso':'outside-body';}
   const p=o.geometry.attributes.position;let lo=1e9;
   for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);if(v.y<lo)lo=v.y;}
   if(!(part in parts)||lo<parts[part])parts[part]=+lo.toFixed(3);
  });}
  out.push({id:c.id,parts,lift:mdl.diveLift,hx:mdl.diveHeadX});
  L.scene.remove(mdl.root);L.disposeTree(mdl.root);
 }
 return out;}'''
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader']);ctx=b.new_context(viewport={'width':640,'height':480});pg=ctx.new_page();pg.set_default_timeout(600000);errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)));pg.route('https://**/*',lambda r:r.abort())
    pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=GAME.read_bytes().decode('utf-8')))
    pg.route('**/sim.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=SIM.read_bytes().decode('utf-8')))
    pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"')
    res=pg.evaluate(JS);ctx.close();b.close()
for r in res: print(f"{r['id']:10s}",'lift',r.get('lift'),'headX',r.get('hx'),' '.join(f"{k} {v:+.3f}" for k,v in sorted(r['parts'].items())))
print('errors',errs)
