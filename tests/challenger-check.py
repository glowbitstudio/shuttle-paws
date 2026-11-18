# Usage: challenger-check.py <port>  -- a match against the challenger bot (level 5): its outfit is a whole epic or legendary set,
# the player has no auto-run / auto-save / auto-hit even with the "easy" assist chosen; a master-level match keeps the assists.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1]
HOOK="window.__m=()=>{const m=session.m,b=m.athletes[1],ids=(b.gear||[]);return {diff:b.diff,name:S.DIFF[b.diff].name,gear:ids.length,rar:[...new Set(ids.map(i=>S.gearById(i).rar))],sets:[...new Set(ids.map(i=>S.gearById(i).set))],moveAssist:m.opts.moveAssist,autoSave:m.opts.autoSave,humanAssist:m.athletes[0].assist,learn:b.learn?{front:b.learn.front,T:b.learn.T}:null,homeZ:+Math.abs(b.home.z).toFixed(2)};};\n"
r={};errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    for diff in (4,4,3):
        ctx=b.new_context(viewport={'width':800,'height':450});pg=ctx.new_page();pg.set_default_timeout(120000)
        ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,gfxV:1,vol:0,assist:2}));localStorage.setItem('sp.dareG',JSON.stringify({n:9,front:1,bad:{smash:2,drop:1},T:{'c|2111|smash':[10,0],'r|2111|smash':[5,0,0]}}));localStorage.setItem('sp.dare',JSON.stringify({front:0.2,bad:{smash:1},T:{'c|2111|smash':[2,1],'y|2111|smash':[2,0,0,0,0]}}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));")
        pg.on('pageerror',lambda e:errs.append(str(e)[:200]));pg.route('https://**/*',lambda r:r.abort())
        pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(800)
        pg.evaluate("(d)=>__spDebug.startLocal({diff:d,mode:'1v1',points:11,venue:0})",diff);pg.wait_for_timeout(4000)
        r.setdefault('diff%d'%diff,[]).append(pg.evaluate('()=>__m()'));ctx.close()
    b.close()
print(json.dumps({'results':r,'errors':errs},ensure_ascii=False))
