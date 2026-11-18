# Usage: wardrobe-ui-check.py <port> <out dir>  -- shop + wardrobe end to end on a running server. ONE headless browser (desktop, then phone).
# Buys an item in the shop, checks the wardrobe lists only owned items, wears / takes off through the card, and the compare line.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2];OUT.mkdir(exist_ok=True)
HOOK="window.__w=()=>wallet;\n"
res={};errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    for name,vp in (('desktop',{'width':1280,'height':720}),('phone',{'width':390,'height':780})):
        ctx=b.new_context(viewport=vp,is_mobile=name=='phone',has_touch=name=='phone');pg=ctx.new_page();pg.set_default_timeout(120000)
        ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:1,gfxV:1,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));")
        pg.on('pageerror',lambda e:errs.append(name+' '+str(e)[:300]));pg.route('https://**/*',lambda r:r.abort())
        pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object" && __w() && __w().login')
        r={}
        pg.evaluate("()=>__spDebug.Net.send({t:'claimLogin'})");pg.wait_for_function('__w().gold>=250')
        for i in range(8):
            pg.evaluate("()=>__spDebug.Net.send({t:'localResult',win:true,diff:3,dur:120})");pg.wait_for_timeout(250)
        pg.wait_for_timeout(1500);pg.screenshot(path=str(OUT/f'{name}-home.png'))
        pg.click('.lobby-char button[data-go="shop"]');pg.wait_for_timeout(2500);pg.screenshot(path=str(OUT/f'{name}-shop.png'))
        r['shopTabs']=pg.evaluate("()=>document.querySelectorAll('#gearTabs button').length")
        pg.click('#gearTabs button[data-slot="head"]');pg.wait_for_timeout(600);pg.click('.gear-item[data-item="h_pro"]');pg.wait_for_timeout(2500);pg.screenshot(path=str(OUT/f'{name}-shop-try-crown.png'))
        pg.click('.gear-item[data-item="h_band"] button');pg.wait_for_function("__w().items.includes('h_band')");r['goldAfterBuy']=pg.evaluate('()=>__w().gold')
        pg.evaluate("()=>__spDebug.go('gear')");pg.wait_for_timeout(2500)
        r['slots']=pg.evaluate("()=>document.querySelectorAll('#wdSlots .wd-slot').length")
        pg.click('#wdSlots .wd-slot[data-slot="head"]');pg.wait_for_timeout(2500)
        r['ownedShown']=pg.evaluate("()=>[...document.querySelectorAll('#wdInv .wd-item')].map(e=>e.dataset.item)")
        r['wornAfterBuy']=pg.evaluate("()=>__w().equip.head");pg.screenshot(path=str(OUT/f'{name}-wardrobe-head.png'))
        pg.click('#wdInv .wd-item[data-item="h_band"]');pg.wait_for_timeout(500);r['actLabel']=pg.evaluate("()=>document.getElementById('wdAct').textContent")
        pg.click('#wdAct');pg.wait_for_function("!__w().equip.head");pg.wait_for_timeout(800);r['afterOff']=pg.evaluate("()=>({equip:__w().equip.head||null,emptyTile:document.querySelector('#wdSlots .wd-slot[data-slot=\"head\"]').classList.contains('empty')})")
        pg.click('#wdInv .wd-item[data-item="h_band"]');pg.wait_for_timeout(600);r['cmpEmpty']=pg.evaluate("()=>(document.querySelector('.wd-cmp')||{}).innerText||''");pg.click('#wdAct');pg.wait_for_function("__w().equip.head==='h_band'")
        pg.click('#wdSlots .wd-slot[data-slot="back"]');pg.wait_for_timeout(2500);r['noneText']=pg.evaluate("()=>(document.querySelector('.wd-none')||{}).innerText||''");pg.screenshot(path=str(OUT/f'{name}-wardrobe-back-empty.png'))
        # drag and drop: worn tile -> panel takes it off; owned item -> character puts it on
        def drag(sel,tx,ty):
            bb=pg.locator(sel).first.bounding_box();x=bb['x']+bb['width']/2;y=bb['y']+bb['height']/2
            pg.mouse.move(x,y);pg.mouse.down();pg.mouse.move(x+6,y+14,steps=3);pg.mouse.move(tx,ty,steps=8);pg.wait_for_timeout(300);pg.screenshot(path=str(OUT/f'{name}-drag.png'));pg.mouse.up()
        pg.click('#wdSlots .wd-slot[data-slot="head"]');pg.wait_for_timeout(1500)
        pb=pg.locator('#wdDetail').bounding_box();drag('#wdSlots .wd-slot[data-slot="head"]',pb['x']+pb['width']/2,pb['y']+20)
        try: pg.wait_for_function("!__w().equip.head",timeout=8000);r['dragOff']=True
        except Exception: r['dragOff']=False
        pg.wait_for_timeout(600);cv=pg.viewport_size
        drag('#wdInv .wd-item[data-item="h_band"]',cv['width']*(0.3 if name=='desktop' else 0.5),cv['height']*(0.5 if name=='desktop' else 0.25))
        try: pg.wait_for_function("__w().equip.head==='h_band'",timeout=8000);r['dragOn']=True
        except Exception: r['dragOn']=False
        # outfit sets in the shop
        pg.evaluate("()=>__spDebug.go('shop')");pg.wait_for_timeout(1200);pg.click('#gearTabs button[data-slot="sets"]');pg.wait_for_timeout(600)
        r['setRows']=pg.evaluate("()=>document.querySelectorAll('.set-row').length");pg.click('.set-row[data-set="ninja"]');pg.wait_for_timeout(3000);pg.screenshot(path=str(OUT/f'{name}-shop-set.png'))
        r['goldBeforeSet']=pg.evaluate('()=>__w().gold');b2=pg.locator('.set-row[data-set="beach"] button')
        if b2.count() and b2.is_enabled():
            b2.click();pg.wait_for_function("__w().items.includes('bc_back')");pg.wait_for_timeout(800)
            r['setBought']=pg.evaluate("()=>({gold:__w().gold,worn:Object.values(__w().equip).filter(i=>i.startsWith('bc_')).length})")
            pg.evaluate("()=>__spDebug.go('gear')");pg.wait_for_timeout(2500);r['setLine']=pg.evaluate("()=>(document.querySelector('.wd-set')||{}).innerText||''");pg.screenshot(path=str(OUT/f'{name}-wardrobe-set.png'))
        res[name]=r;ctx.close()
    b.close()
print(json.dumps({'results':res,'errors':errs},ensure_ascii=False,indent=1))
