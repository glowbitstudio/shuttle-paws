# Usage: default-on-check.py <port> <game.js file to serve> <new out dir>
# Step 2b verification: match clips ON (served file decides the default; the page is opened WITHOUT ?matchClips=...).
# ONE headless browser; contexts are opened one after another, except the online test which needs two (+1 spectator)
# contexts of the same browser at once. Each scenario: run real time for a few seconds, collect page errors / console
# errors, sample which athletes are clip-driven, check for NaN transforms, save a screenshot.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];GAME=ROOT/sys.argv[2];OUT=ROOT/sys.argv[3];OUT.mkdir(exist_ok=False)
URL=f'http://127.0.0.1:{PORT}/'
HOOK='''window.__chk=()=>{const out={enabled:matchClipsEnabled,session:!!session,kind:session&&session.kind,state:session&&session.m.state,score:session&&session.m.score.slice(),clips:session?session.models.map(md=>md.matchClip||null):[],nan:0,n:session?session.models.length:0,hits:(window.__matchClipHits||[]).length,worstHit:Math.max(0,...(window.__matchClipHits||[]).map(h=>h.error))};
 if(session)for(const md of session.models){md.model.root.updateMatrixWorld(true);md.model.root.traverse(o=>{const e=o.matrixWorld.elements;for(let i=0;i<16;i++)if(!isFinite(e[i])){out.nan++;break;}});}
 return out;};
'''
results=[]
def new_ctx(b,w,h,mobile=False,gfx=1,errs=None):
    ctx=b.new_context(viewport={'width':w,'height':h},device_scale_factor=2 if mobile else 1,is_mobile=mobile,has_touch=mobile)
    ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('sp.settings')||'{}'),{helpN:99,gfx:%d,vol:0})));"%gfx)
    pg=ctx.new_page();pg.set_default_timeout(180000)
    pg.on('pageerror',lambda e:errs.append('PAGEERROR '+str(e)[:300]))
    pg.on('console',lambda m:errs.append('CONSOLE '+m.text[:200]) if m.type=='error' and 'ERR_FAILED' not in m.text and 'favicon' not in m.text else None)
    pg.route('https://**/*',lambda r:r.abort())
    pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=GAME.read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
    pg.goto(URL,wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"')
    return ctx,pg
def watch(pg,name,seconds,errs,extra=None):
    seen=set();st=None;nan=0
    for i in range(seconds):
        pg.wait_for_timeout(1000);st=pg.evaluate('()=>__chk()');nan+=st['nan']
        for c in st['clips']:
            if c: seen.add(c)
    pg.screenshot(path=str(OUT/(name+'.png')))
    r={'name':name,'enabled':st['enabled'],'kind':st['kind'],'athletes':st['n'],'state':st['state'],'score':st['score'],'clipsSeen':sorted(seen),'clipHits':st['hits'],'worstHitErr':round(st['worstHit'],3),'nanTransforms':nan,'errors':list(errs)}
    if extra: r.update(extra)
    results.append(r);print(json.dumps(r,ensure_ascii=False)[:420]);return r
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    # local: all venues (1v1, medium gfx), then low gfx, 2v2, phone portrait / landscape
    nv=None
    for v in range(8):
        if nv is not None and v>=nv: break
        errs=[];ctx,pg=new_ctx(b,900,560,errs=errs)
        nv=pg.evaluate('()=>__spDebug.lab ? SPSim.VENUES.length : 6')
        pg.evaluate("(v)=>__spDebug.startLocal({diff:2,mode:'1v1',points:11,venue:v})",v)
        watch(pg,f'local-venue{v}',14,errs);ctx.close()
    for name,w,h,mob,gfx,mode in [('local-lowgfx',900,560,False,0,'1v1'),('local-2v2',900,560,False,1,'2v2'),('phone-portrait',390,844,True,1,'1v1'),('phone-landscape',844,390,True,1,'1v1')]:
        errs=[];ctx,pg=new_ctx(b,w,h,mobile=mob,gfx=gfx,errs=errs)
        pg.evaluate("(m)=>__spDebug.startLocal({diff:2,mode:m,points:11,venue:0})",mode)
        watch(pg,name,14,errs);ctx.close()
    # opt-out still works
    errs=[];ctx,pg=new_ctx(b,900,560,errs=errs);pg.goto(URL+'?matchClips=0',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"')
    pg.evaluate("()=>__spDebug.startLocal({diff:2,mode:'1v1',points:11,venue:0})");watch(pg,'optout-matchClips0',8,errs);ctx.close()
    # online: two players + one spectator, three contexts of this one browser
    ea,eb,ec=[],[],[]
    ca,pa=new_ctx(b,800,500,errs=ea);cb,pb=new_ctx(b,800,500,errs=eb);cc,pc=new_ctx(b,800,500,errs=ec)
    for pg in (pa,pb,pc): pg.evaluate("()=>{__spDebug.go('online');}");
    for pg in (pa,pb,pc): pg.wait_for_function('()=>__spDebug.Net.ok',timeout=60000)
    pa.evaluate("()=>__spDebug.Net.send({t:'createRoom',open:true})");pa.wait_for_function('()=>__spDebug.Net.room&&__spDebug.Net.room.code')
    code=pa.evaluate('()=>__spDebug.Net.room.code')
    pb.evaluate("(c)=>__spDebug.Net.send({t:'joinRoom',code:c})",code);pb.wait_for_function('()=>__spDebug.Net.room&&__spDebug.Net.room.code')
    pa.evaluate("()=>__spDebug.Net.send({t:'start'})")
    pa.wait_for_function('()=>__chk().session',timeout=60000);pb.wait_for_function('()=>__chk().session',timeout=60000)
    pc.evaluate("()=>__spDebug.Net.send({t:'lobby'})");pc.wait_for_function('()=>__spDebug.Net.lobby&&__spDebug.Net.lobby.matches&&__spDebug.Net.lobby.matches.length>0',timeout=60000)
    mid=pc.evaluate('()=>__spDebug.Net.lobby.matches[0].id');pc.evaluate("(id)=>__spDebug.Net.send({t:'spectate',id})",mid);pc.wait_for_function('()=>__chk().session',timeout=60000)
    # both players serve / swing now and then so there are real strokes
    for i in range(16):
        for pg in (pa,pb):
            pg.keyboard.press('j');
        pa.wait_for_timeout(1000)
    watch(pa,'online-playerA',3,ea);watch(pb,'online-playerB',3,eb);watch(pc,'online-spectator',3,ec)
    ca.close();cb.close();cc.close();b.close()
(OUT/'results.json').write_text(json.dumps(results,indent=1,ensure_ascii=False),encoding='utf-8')
bad=[r['name'] for r in results if r['errors'] or r['nanTransforms'] or (r['name']!='optout-matchClips0' and not r['enabled']) or (r['name']=='optout-matchClips0' and (r['enabled'] or r['clipsSeen']))]
print('SCENARIOS',len(results),'FAILING',bad)
