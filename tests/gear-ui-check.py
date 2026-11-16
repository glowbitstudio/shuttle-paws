# Usage: gear-ui-check.py <port> <out dir>  -- gear / shop end to end on a running server. ONE headless browser.
# Buys an affordable item through the UI, checks it is worn (stats, power, model colour), takes it off, tries an item it
# cannot afford (try-on only), then plays the start of a local match to confirm the gear reaches the simulation.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2];OUT.mkdir(exist_ok=True)
HOOK="window.__w=()=>wallet;window.__ses=()=>session&&{gear:session.m.athletes[session.me].gear,speed:session.m.athletes[session.me].st.speed,opp:session.m.athletes[1].st.speed};window.__frame=()=>{let c=null;preview.root.traverse(o=>{if(o.isMesh&&o.geometry.type==='TorusGeometry'&&o.geometry.parameters.tube===0.016)c=o.material.color.getHex();});return c;};\n"
res={};errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    for name,vp in (('desktop',{'width':1100,'height':700}),('phone',{'width':390,'height':780})):
        ctx=b.new_context(viewport=vp,is_mobile=name=='phone',has_touch=name=='phone');pg=ctx.new_page();pg.set_default_timeout(120000)
        ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));")
        pg.on('pageerror',lambda e:errs.append(str(e)[:300]));pg.on('console',lambda m:errs.append('CONSOLE '+m.text[:200]) if m.type=='error' and 'ERR_FAILED' not in m.text and 'favicon' not in m.text else None)
        pg.route('https://**/*',lambda r:r.abort())
        pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object" && __w() && __w().login')
        r={}
        pg.evaluate("()=>__spDebug.Net.send({t:'claimLogin'})");pg.wait_for_function('__w().gold>=250')           # 250 gold: no item affordable yet
        pg.evaluate("()=>__spDebug.Net.send({t:'localResult',win:true,diff:3,dur:120})");pg.wait_for_function('__w().gold>=310')
        pg.evaluate("()=>__spDebug.go('gear')");pg.wait_for_timeout(2500);pg.screenshot(path=str(OUT/f'{name}-gear.png'))
        r['frameBefore']=pg.evaluate('()=>__frame()')
        # try on the epic racket (cannot afford): preview changes, nothing is owned
        pg.click('.gear-item[data-item="r_pro"]');pg.wait_for_timeout(1500);r['tryFrame']=pg.evaluate('()=>__frame()');r['tryBuyDisabled']=pg.evaluate("()=>document.querySelector('.gear-item[data-item=\"r_pro\"] button').disabled")
        r['stageWhileTry']=pg.evaluate("()=>document.getElementById('stageName').innerText.split(String.fromCharCode(10)).join(' | ')");pg.screenshot(path=str(OUT/f'{name}-gear-try.png'))
        # buy the common racket through the button
        pg.click('.gear-item[data-item="r_light"] button');pg.wait_for_function("__w().items.includes('r_light')");pg.wait_for_timeout(1500)
        r['afterBuy']=pg.evaluate("()=>({gold:__w().gold,equip:__w().equip,frame:__frame(),stage:document.getElementById('stageName').innerText.split(String.fromCharCode(10)).join(' | ')})")
        pg.screenshot(path=str(OUT/f'{name}-gear-bought.png'))
        # shoes tab, then a local match: the gear is on the athlete and only on mine
        pg.click('#gearTabs button[data-slot="shoes"]');pg.wait_for_timeout(600);r['shoesTabItems']=pg.evaluate("()=>[...document.querySelectorAll('.gear-item b')].map(e=>e.textContent)")
        pg.evaluate("()=>__spDebug.go('home')");pg.wait_for_timeout(600);r['homeChar']=pg.evaluate("()=>document.getElementById('homeChar').textContent")
        pg.evaluate("()=>__spDebug.startLocal({diff:1,mode:'1v1',points:11,venue:0})");pg.wait_for_function('__ses()');r['inMatch']=pg.evaluate('()=>__ses()')
        pg.wait_for_timeout(2500);pg.screenshot(path=str(OUT/f'{name}-match.png'))
        res[name]=r;ctx.close()
    b.close()
print(json.dumps({'results':res,'errors':errs},ensure_ascii=False,indent=1))
