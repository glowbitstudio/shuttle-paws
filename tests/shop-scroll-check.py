# Usage: shop-scroll-check.py <port> <out dir>  -- the shop's header and tab bar must stay visible and clickable after the list is scrolled.
# Desktop then phone. ONE headless browser.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2];OUT.mkdir(exist_ok=True)
HOOK="window.__w=()=>wallet;window.__slot=()=>gearSlot;\n"
res={};errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    for name,vp in (('desktop',{'width':1280,'height':720}),('phone',{'width':390,'height':780})):
        ctx=b.new_context(viewport=vp,is_mobile=name=='phone',has_touch=name=='phone');pg=ctx.new_page();pg.set_default_timeout(120000)
        ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:1,gfxV:1,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));")
        pg.on('pageerror',lambda e:errs.append(name+' '+str(e)[:300]));pg.route('https://**/*',lambda r:r.abort())
        pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object" && __w() && __w().login')
        pg.evaluate("()=>__spDebug.go('shop')");pg.wait_for_timeout(1500);pg.click('#gearTabs button[data-slot="head"]');pg.wait_for_timeout(1500)
        r={'scrollable':pg.evaluate("()=>{const p=document.querySelector('#s-shop .panel');return p.scrollHeight-p.clientHeight}")}
        pg.evaluate("()=>{const p=document.querySelector('#s-shop .panel');p.scrollTop=p.scrollHeight}");pg.wait_for_timeout(700)
        r['afterScroll']=pg.evaluate("()=>{const p=document.querySelector('#s-shop .panel').getBoundingClientRect(),t=document.getElementById('gearTabs').getBoundingClientRect(),h=document.querySelector('#s-shop header').getBoundingClientRect();return {tabsTop:Math.round(t.top-p.top),tabsBottom:Math.round(t.bottom-p.top),headerTop:Math.round(h.top-p.top),headerH:Math.round(h.height),panelH:Math.round(p.height)}}")
        pg.screenshot(path=str(OUT/f'{name}-scrolled.png'))
        pg.click('#gearTabs button[data-slot="back"]');pg.wait_for_timeout(700);r['tabClickAfterScroll']=pg.evaluate('()=>__slot()')
        pg.evaluate("()=>{const p=document.querySelector('#s-shop .panel');p.scrollTop=p.scrollHeight}");pg.wait_for_timeout(500);pg.click('#s-shop header .back');pg.wait_for_timeout(700);r['backWorks']=pg.evaluate("()=>document.getElementById('s-shop').classList.contains('hidden')")
        res[name]=r;ctx.close()
    b.close()
print(json.dumps({'results':res,'errors':errs},ensure_ascii=False,indent=1))
