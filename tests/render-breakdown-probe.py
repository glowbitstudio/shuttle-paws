# Usage: render-breakdown-probe.py <port> [gfx]  -- which parts of the scene cost the most in a 1v1 match: meshes / triangles / materials per scene branch.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];GFX=int(sys.argv[2]) if len(sys.argv)>2 else 0
HOOK="""window.__bd=()=>{const tri=(g)=>g.index?g.index.count/3:(g.attributes.position?g.attributes.position.count/3:0);
 const stat=(o)=>{let n=0,t=0,vis=0;const mats=new Set(),geos=new Set();o.traverse(c=>{if(c.isMesh){n++;t+=tri(c.geometry)*(c.isInstancedMesh?c.count:1);mats.add(c.material.uuid);geos.add(c.geometry.uuid);}});return {meshes:n,tris:Math.round(t),mats:mats.size,geos:geos.size};};
 const out=[];scene.children.forEach((c,i)=>{const s=stat(c);if(!s.meshes)return;s.name=(c.name||c.type)+'#'+i;out.push(s);if(s.meshes>60)c.children.forEach((d,j)=>{const q=stat(d);if(q.meshes>15){q.name='  '+(d.name||d.type)+'#'+i+'.'+j;out.push(q);if(q.meshes>120)d.children.slice(0,400).forEach((e,k)=>{const w=stat(e);if(w.meshes>25){w.name='    '+(e.name||e.type)+'#'+k;out.push(w);}});}});});return out;};\n"""
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader']);ctx=b.new_context(viewport={'width':800,'height':450});pg=ctx.new_page();pg.set_default_timeout(120000)
    ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:%d,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));"%GFX)
    pg.route('https://**/*',lambda r:r.abort())
    pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
    pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(1500)
    pg.evaluate("()=>__spDebug.startLocal({diff:1,mode:'1v1',points:11,venue:0})");pg.wait_for_timeout(4000)
    for r in pg.evaluate("()=>__bd()"): print(f"{r['name']:<34} meshes {r['meshes']:>4}  tris {r['tris']:>7}  materials {r['mats']:>3}  geometries {r['geos']:>3}")
    b.close()
