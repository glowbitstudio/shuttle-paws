# Usage: feel-check.py <port> <out dir>
# Real local match with the match-feel layer: the human swings (j/k/l), jumps and dives. Samples Feel.state(), counts the
# effects that fired per shot type, saves screenshots at smash impacts and during game point, measures the cost of Feel.tick
# under full load. ONE headless browser.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2];OUT.mkdir(exist_ok=True)
HOOK='''window.__m=()=>session.m;window.__fl={shots:{},labels:{},ev:{},maxRings:0,maxSparks:0,gp:0,slow:0,fovMin:0,snap:0};
(function(){const h=Feel.hit,o=Feel.onEvent;
 Feel.hit=function(e,m,me){__fl.shots[e.shot]=(__fl.shots[e.shot]||0)+1;if(e.label)__fl.labels[e.label]=(__fl.labels[e.label]||0)+1;const r=h.apply(this,arguments);if(e.shot==='smash')__fl.snap=1;return r;};
 Feel.onEvent=function(e){__fl.ev[e.type]=(__fl.ev[e.type]||0)+1;return o.apply(this,arguments);};
 const tick=()=>{requestAnimationFrame(tick);const s=Feel.state();__fl.maxRings=Math.max(__fl.maxRings,s.rings);__fl.maxSparks=Math.max(__fl.maxSparks,s.sparks);if(s.gp)__fl.gp=Math.max(__fl.gp,s.gp);if(s.slow)__fl.slow++;__fl.fovMin=Math.min(__fl.fovMin,s.fov);};requestAnimationFrame(tick);})();
'''
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader']);errs=[]
    ctx=b.new_context(viewport={'width':1100,'height':700});pg=ctx.new_page();pg.set_default_timeout(600000)
    ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:1,vol:0}));")
    pg.on('pageerror',lambda e:errs.append(str(e)[:300]));pg.on('console',lambda m:errs.append('CONSOLE '+m.text[:200]) if m.type=='error' and 'ERR_FAILED' not in m.text and 'favicon' not in m.text else None)
    pg.route('https://**/*',lambda r:r.abort())
    pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
    pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"')
    pg.evaluate("()=>__spDebug.startLocal({diff:1,mode:'1v1',points:11,venue:0})")
    shots=0;gpshot=False
    for i in range(int(sys.argv[3]) if len(sys.argv)>3 else 150):
        pg.keyboard.press(['j','k','l','k'][i%4])
        if i%7==3: pg.keyboard.press(' ')
        if i%11==5:
            pg.keyboard.down('d');pg.keyboard.press('Shift');pg.wait_for_timeout(120);pg.keyboard.up('d')
        pg.wait_for_timeout(330)
        st=pg.evaluate('()=>({snap:__fl.snap,gp:__fl.gp,s:__spDebug.Feel.state(),sp:__sp()})')
        if st['snap'] and shots<3:
            pg.screenshot(path=str(OUT/f'smash-{shots}.png'));shots+=1
        pg.evaluate('()=>{__fl.snap=0}')
        if st['s']['gp'] and not gpshot: pg.screenshot(path=str(OUT/'gamepoint.png'));gpshot=True
        if st['sp'] and st['sp']['over']: break
    res=pg.evaluate('()=>__fl');sp=pg.evaluate('()=>__sp()')
    # forced views: every shot type fired once at mid court, then game-point tension
    pg.evaluate("()=>{const F=__spDebug.Feel,m={shuttle:{v:{x:0,y:-3,z:9}},rally:3,athletes:[]};let x=-2.4;for(const s of ['smash','drive','clear','drop','net']){F.hit({i:9,shot:s,q:1,x:x,y:1.6,z:1.5,label:s==='clear'?'perfect':null},m,-1);x+=1.2;}}")
    pg.wait_for_timeout(60);pg.screenshot(path=str(OUT/'all-shots.png'))
    tens=pg.evaluate("()=>{const F=__spDebug.Feel,m=__m();F.onEvent({type:'point',gamePoint:0,matchPoint:true,team:0,score:[10,5]},m,0);const a=F.state();F.hit({i:0,shot:'smash',q:1,x:0,y:2,z:3},m,0);const b={ts:F.timeScale(),st:F.state()};return {afterPoint:a,afterSmash:b};}")
    pg.wait_for_timeout(1500);pg.screenshot(path=str(OUT/'matchpoint.png'))
    tens['later']=pg.evaluate("()=>({ts:__spDebug.Feel.timeScale(),st:__spDebug.Feel.state()})")
    pg.evaluate("()=>__spDebug.Feel.onEvent({type:'gameStart'},__m(),0)");tens['cleared']=pg.evaluate("()=>__spDebug.Feel.state().gp")
    cost=pg.evaluate("()=>{const F=__spDebug.Feel,m={shuttle:{v:{x:0,y:-3,z:9}},rally:3,athletes:[]};let worst=0,sum=0,n=0;for(let k=0;k<200;k++){for(const s of ['smash','drive','clear','drop'])F.hit({i:9,shot:s,q:1,x:0,y:1.6,z:1.5,label:'perfect'},m,-1);const t=performance.now();F.tick(0.016,null);const d=performance.now()-t;worst=Math.max(worst,d);sum+=d;n++;}return {avgMs:+(sum/n).toFixed(3),worstMs:+worst.toFixed(3)};}")
    ctx.close();b.close()
print(json.dumps({'fired':res,'match':sp,'tension':tens,'tickCost':cost,'errors':errs},ensure_ascii=False,indent=1))
