# Usage: phone-probe.py <port> <out dir>  -- phone portrait and landscape: scrolled panels (title bar, scroll indicator), the power bar
# in a match, the camera button, and the end-of-match screen. ONE headless browser.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2];OUT.mkdir(exist_ok=True);out={};errs=[]
HOOK="window.__h={hold,fin:()=>finishMatch({winner:session.myTeam,score:[11,7],games:[1,0],gameScores:[[11,7]],stats:session.m.athletes.map(a=>a.stats),longest:9})};\n"
SCR="""(name)=>{const s=document.querySelector('#s-'+name)||document.querySelector('#'+name);const res=[];
 for(const e of [s,...s.querySelectorAll('*')]){const cs=getComputedStyle(e);if(/(auto|scroll)/.test(cs.overflowY)&&e.scrollHeight>e.clientHeight+2){res.push({tag:e.tagName+'.'+e.className,sh:e.scrollHeight,ch:e.clientHeight});}}
 return res;}"""
MOVE="""(a)=>{const [name,f]=a;const s=document.querySelector('#s-'+name);let best=null;for(const e of [s,...s.querySelectorAll('*')]){const cs=getComputedStyle(e);if(/(auto|scroll)/.test(cs.overflowY)&&e.scrollHeight>e.clientHeight+2&&(!best||e.scrollHeight-e.clientHeight>best.scrollHeight-best.clientHeight))best=e;}
 if(!best)return null;best.scrollTop=(best.scrollHeight-best.clientHeight)*f;return best.className;}"""
RECT="""(name)=>{const q=(e)=>{if(!e)return null;const r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.right),Math.round(r.bottom)];};const s=document.querySelector('#s-'+name);
 return {vw:innerWidth,vh:innerHeight,panel:q(s.querySelector('.panel')),header:q(s.querySelector('.panel>header')),tip:q(document.getElementById('scrollTip')),tipOn:!!document.querySelector('#scrollTip.on')};}"""
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    for name,vp in (('port',{'width':390,'height':780}),('land',{'width':780,'height':390})):
        ctx=b.new_context(viewport=vp,device_scale_factor=2,is_mobile=True,has_touch=True);pg=ctx.new_page();pg.set_default_timeout(120000)
        ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,gfxV:1,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'hamster',id:null,secret:null,named:true}));")
        pg.on('pageerror',lambda e:errs.append(name+' '+str(e)[:200]));pg.route('https://**/*',lambda r:r.abort())
        pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(3000)
        r={};pg.screenshot(path=str(OUT/f'{name}-home.png'))
        for scr in ('shop','rewards','guide','settings','bot','online','profile','chars','gear','stats','ach','tour'):
            pg.evaluate("(s)=>__spDebug.go(s)",scr);pg.wait_for_timeout(900)
            r[scr]={'scrollers':pg.evaluate(SCR,scr)}
            for f,tag in ((0.5,'mid'),(1,'end')):
                pg.evaluate(MOVE,[scr,f]);pg.wait_for_timeout(250);r[scr][tag]=pg.evaluate(RECT,scr);pg.screenshot(path=str(OUT/f'{name}-{scr}-{tag}.png'))
        # a real finger drag on the rewards screen
        pg.evaluate("(s)=>__spDebug.go(s)",'rewards');pg.wait_for_timeout(700)
        cdp=ctx.new_cdp_session(pg);x=vp['width']//2;y0=int(vp['height']*0.75);y1=int(vp['height']*0.2)
        for _ in range(3): cdp.send('Input.synthesizeScrollGesture',{'x':x,'y':y0,'yDistance':y1-y0,'speed':1800,'gestureSourceType':'touch'})
        pg.wait_for_timeout(200);r['drag']=pg.evaluate(RECT,'rewards');r['drag']['page']=pg.evaluate("()=>[scrollY,document.documentElement.scrollTop,document.body.scrollTop,visualViewport.pageTop]");pg.screenshot(path=str(OUT/f'{name}-drag.png'))
        pg.evaluate("(s)=>__spDebug.go(s)",'home');pg.wait_for_timeout(500)
        # match: power bar and top buttons
        pg.evaluate("()=>__spDebug.startLocal({diff:1,mode:'1v1',points:11,venue:0,anyVenue:true})");pg.wait_for_timeout(4500)
        pg.screenshot(path=str(OUT/f'{name}-match.png'))
        for v,tag in ((0.2,'lo'),(0.9,'hi')):
            pg.evaluate("(v)=>{__h.hold.on=false;__h.hold.last=v;__h.hold.shownUntil=performance.now()+5000;}",v);pg.wait_for_timeout(350);pg.screenshot(path=str(OUT/f'{name}-power-{tag}.png'))
        r['top']=pg.evaluate("()=>[...document.querySelectorAll('#topBtns .round')].filter(e=>e.offsetParent).map(e=>{const q=e.getBoundingClientRect();return [e.id,Math.round(q.left),Math.round(q.top),Math.round(q.right),Math.round(q.bottom)];})")
        if pg.evaluate("()=>!!document.getElementById('camQuick')"):
            pg.evaluate("()=>document.getElementById('camQuick').click()");pg.wait_for_timeout(1200);pg.screenshot(path=str(OUT/f'{name}-cam2.png'));r['cam']=pg.evaluate("()=>JSON.parse(localStorage.getItem('sp.settings')).cam")
        pg.evaluate("()=>__h.fin()");pg.wait_for_timeout(600);pg.screenshot(path=str(OUT/f'{name}-over-0.png'));pg.wait_for_timeout(3000);pg.screenshot(path=str(OUT/f'{name}-over-3.png'))
        r['overVisible']=pg.evaluate("()=>[...document.body.children].filter(e=>e.offsetParent!==null||getComputedStyle(e).position==='fixed').filter(e=>{const q=e.getBoundingClientRect();return q.width>0&&q.height>0&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none';}).map(e=>e.tagName+'#'+e.id+'.'+e.className)")
        out[name]=r;ctx.close()
    b.close()
out['errors']=errs;print(json.dumps(out,ensure_ascii=False,indent=1))
