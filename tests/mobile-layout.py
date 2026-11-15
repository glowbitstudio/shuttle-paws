# Usage: mobile-layout.py <new output dir name> [port, default 3062]
# ONE headless browser, sequential mobile-emulated contexts (touch, deviceScaleFactor 2). For each viewport it starts a local
# match, saves a screenshot and records: canvas CSS size vs drawing-buffer size (stretch), camera aspect, the DOM rect of
# every touch control and HUD element, and control/HUD overlaps. Then: rotate portrait<->landscape without reload (aspect
# must follow), and a real multi-touch test through CDP (hold the stick + tap each button; the sim input must see both).
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/sys.argv[1];OUT.mkdir(exist_ok=False)
PORT=sys.argv[2] if len(sys.argv)>2 else '3062'
SIZES=[('portrait-360x740',360,740,None),('portrait-390x844',390,844,None),('portrait-412x915',412,915,None),
       ('landscape-740x360',740,360,None),('landscape-844x390',844,390,None),('landscape-915x412',915,412,None),
       ('landscape-844x340-urlbar',844,340,None),('landscape-844x390-notch',844,390,{'top':0,'left':47,'right':47,'bottom':21}),
       ('portrait-390x844-notch',390,844,{'top':47,'left':0,'right':0,'bottom':34})]
HOOK='''window.__presses=[];{const o=pressShot;pressShot=function(k){window.__presses.push(k);return o(k);};}
window.__mob={camera,touchVec,edges};
'''
PROBE='''()=>{
 const R=e=>{if(!e)return null;const r=e.getBoundingClientRect();const cs=getComputedStyle(e);return {x:+r.left.toFixed(1),y:+r.top.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),shown:cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&+cs.opacity>0.05};};
 const c=document.getElementById('c');const out={vw:innerWidth,vh:innerHeight,dpr:devicePixelRatio,vv:window.visualViewport?[visualViewport.width,visualViewport.height]:null,
  canvasCss:[c.clientWidth,c.clientHeight],canvasBuf:[c.width,c.height],camAspect:__mob.camera.aspect,camFov:+__mob.camera.fov.toFixed(1),touchui:document.body.classList.contains('touchui'),controls:{},hud:{}};
 document.querySelectorAll('#tbtns .tb').forEach(b=>out.controls[b.dataset.k]=R(b));
 out.controls.stick=R(document.getElementById('stick'));out.controls.stickZone=R(document.getElementById('stickZone'));
 for(const id of ['score','wind','topBtns','hint','tmeter','serveClock','ctrlHelp','staA','staB']) out.hud[id]=R(document.getElementById(id));
 // court landmarks in CSS pixels: 4 singles corners, net ends, both baseline centres (must stay visible)
 const P=(x,y,z)=>{const v=new THREE.Vector3(x,y,z).project(__mob.camera);return [+((v.x+1)/2*c.clientWidth).toFixed(1),+((1-v.y)/2*c.clientHeight).toFixed(1)];};
 out.court={nearL:P(-2.59,0,6.7),nearR:P(2.59,0,6.7),farL:P(-2.59,0,-6.7),farR:P(2.59,0,-6.7),netL:P(-2.59,1.55,0),netR:P(2.59,1.55,0),nearMid:P(0,0,6.7),farMid:P(0,0,-6.7),me:P(0,1,4)};
 return out;}'''
def overlaps(a,b):
    return a and b and a['shown'] and b['shown'] and a['x']<b['x']+b['w'] and b['x']<a['x']+a['w'] and a['y']<b['y']+b['h'] and b['y']<a['y']+a['h']
def analyse(d):
    cw,ch=d['canvasCss'];bw,bh=d['canvasBuf']
    d['stretch']=round((bw/bh)/(cw/ch),4) if bh and ch else None           # 1.0 = no distortion
    d['aspectErr']=round(d['camAspect']/(cw/ch),4) if ch else None
    btn={k:v for k,v in d['controls'].items() if k not in('stick','stickZone') and v and v['shown']}
    d['overlap']=[f"{k}~{h}" for k,v in btn.items() for h,hv in d['hud'].items() if h!='ctrlHelp' and overlaps(v,hv)]
    def gap(a,b):   # the buttons are circles: edge-to-edge distance between two discs
        return (((a['x']+a['w']/2)-(b['x']+b['w']/2))**2+((a['y']+a['h']/2)-(b['y']+b['h']/2))**2)**.5-a['w']/2-b['w']/2
    ks=list(btn);d['buttonOverlap']=[f"{a}~{b}" for i,a in enumerate(ks) for b in ks[i+1:] if gap(btn[a],btn[b])<0]
    d['offscreen']=[k for k,v in btn.items() if v['x']<0 or v['y']<0 or v['x']+v['w']>d['vw']+0.5 or v['y']+v['h']>d['vh']+0.5]
    d['minGap']=round(min([gap(btn[a],btn[b]) for i,a in enumerate(ks) for b in ks[i+1:]] or [0]),1)
    d['sizes']={k:[v['w'],v['h']] for k,v in btn.items()}
    return d
results={'sizes':[],'errors':[]}
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    def open_ctx(w,h,insets=None):
        ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=2,is_mobile=True,has_touch=True)
        ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('sp.settings')||'{}'),{helpN:99,gfx:0,vol:0})));")
        page=ctx.new_page();page.set_default_timeout(120000)
        page.on('pageerror',lambda e:results['errors'].append(str(e)))
        page.route('https://**/*',lambda r:r.abort())
        page.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
        cdp=ctx.new_cdp_session(page)
        if insets:
            try: cdp.send('Emulation.setSafeAreaInsetsOverride',{'insets':insets})
            except Exception as e: results['errors'].append('safe-area override unavailable: '+str(e)[:80])
        page.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded')
        page.wait_for_function('typeof __spDebug === "object"')
        page.evaluate("()=>{__spDebug.startLocal({diff:1,mode:'1v1',points:11,venue:0});}")
        page.wait_for_timeout(2500)
        return ctx,page,cdp
    for name,w,h,ins in SIZES:
        ctx,page,cdp=open_ctx(w,h,ins)
        d=analyse(page.evaluate(PROBE));d['name']=name;d['insets']=ins
        page.screenshot(path=str(OUT/(name+'.png')))
        results['sizes'].append(d);ctx.close()
    # rotation without reload
    ctx,page,cdp=open_ctx(390,844)
    rot=[]
    for w,h in [(844,390),(390,844),(844,340)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(900)
        d=analyse(page.evaluate(PROBE));rot.append({'to':[w,h],'canvasCss':d['canvasCss'],'canvasBuf':d['canvasBuf'],'stretch':d['stretch'],'aspectErr':d['aspectErr'],'offscreen':d['offscreen'],'overlap':d['overlap']})
        page.screenshot(path=str(OUT/f'rotated-to-{w}x{h}.png'))
    results['rotation']=rot;ctx.close()
    # multi-touch: hold the stick, tap every button while holding
    mt={}
    for name,w,h in [('portrait',390,844),('landscape',844,390)]:
        ctx,page,cdp=open_ctx(w,h)
        d=page.evaluate(PROBE);z=d['controls']['stickZone'];sx,sy=z['x']+z['w']*0.45,z['y']+z['h']*0.6
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':sx,'y':sy,'id':1}]})
        cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':sx+45,'y':sy-10,'id':1}]})
        page.wait_for_timeout(120)
        res={'stickWhileHeld':page.evaluate('()=>[+__mob.touchVec.x.toFixed(2),+__mob.touchVec.y.toFixed(2)]'),'taps':{}}
        for k in ['hit','smash','drop','jump','dive']:
            b=d['controls'][k]
            if not b or not b['shown']: res['taps'][k]='not shown';continue
            before=page.evaluate("(k)=>({n:window.__presses.filter(x=>x===k).length,edge:!!__mob.edges[k]})",k)
            bx,by=b['x']+b['w']/2,b['y']+b['h']/2
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':sx+45,'y':sy-10,'id':1},{'x':bx,'y':by,'id':2}]})
            after=page.evaluate("(k)=>({n:window.__presses.filter(x=>x===k).length,edge:!!__mob.edges[k],down:document.querySelector('.tb[data-k=\"'+k+'\"]').classList.contains('down'),stick:[+__mob.touchVec.x.toFixed(2),+__mob.touchVec.y.toFixed(2)]})",k)
            # CDP can only lift all fingers at once: release everything, then put the stick finger back for the next button
            cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(60)
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':sx,'y':sy,'id':1}]})
            cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':sx+45,'y':sy-10,'id':1}]})
            page.wait_for_timeout(80)
            res['taps'][k]={'registered':after['n']>before['n'] or (after['edge'] and not before['edge']) or after['down'],'pressedClass':after['down'],'stickStillHeld':after['stick']}
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        page.wait_for_timeout(80);res['stickAfterRelease']=page.evaluate('()=>[__mob.touchVec.x,__mob.touchVec.y]')
        res['scroll']=page.evaluate('()=>[scrollX,scrollY,document.documentElement.scrollHeight-innerHeight]')
        mt[name]=res;ctx.close()
    results['multitouch']=mt
    # desktop: no touch UI
    ctx=browser.new_context(viewport={'width':1280,'height':720});page=ctx.new_page();page.set_default_timeout(120000)
    page.route('https://**/*',lambda r:r.abort())
    page.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
    page.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');page.wait_for_function('typeof __spDebug === "object"')
    page.evaluate("()=>{__spDebug.startLocal({diff:1,mode:'1v1',points:11,venue:0});}");page.wait_for_timeout(2000)
    dd=analyse(page.evaluate(PROBE));results['desktop']={'touchui':dd['touchui'],'touchHidden':page.evaluate("()=>document.getElementById('touch').classList.contains('hidden')"),'stretch':dd['stretch']}
    page.screenshot(path=str(OUT/'desktop-1280x720.png'));ctx.close();browser.close()
(OUT/'layout.json').write_text(json.dumps(results,indent=1))
print('name                          stretch aspect  buttons(w x h)                                              minGap offscreen overlapHUD overlapBtn')
for d in results['sizes']:
    print(f"{d['name']:29s} {d['stretch']:<7} {d['aspectErr']:<7} "+' '.join(f"{k}:{int(v[0])}x{int(v[1])}" for k,v in d['sizes'].items()).ljust(60)+f" {d['minGap']:<6} {d['offscreen']} {d['overlap']} {d['buttonOverlap']}")
print('rotation',json.dumps(results['rotation']))
print('multitouch',json.dumps(results['multitouch']))
print('desktop',results['desktop'],'errors',results['errors'][:5])
