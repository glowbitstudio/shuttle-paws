# Usage: chest-ui-check.py <port> <out dir>  -- needs a server started with tests/rich-preload.js. Shop -> "Rương" tab, open a chest with gold,
# the reveal card, wear the item from it; desktop then phone. ONE headless browser.
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
        r={};pg.wait_for_timeout(1200);pg.screenshot(path=str(OUT/f'{name}-home.png'))
        pg.evaluate("()=>__spDebug.go('shop')");pg.wait_for_timeout(1500);pg.click('#gearTabs button[data-slot="chests"]');pg.wait_for_timeout(800)
        r['tabs']=pg.evaluate("()=>document.querySelectorAll('#gearTabs button').length");r['rows']=pg.evaluate("()=>document.querySelectorAll('.chest-row').length")
        r['gemButtonsEnabled']=pg.evaluate("()=>[...document.querySelectorAll('.chest-row button[data-pay=gems]')].map(b=>!b.disabled)")
        pg.screenshot(path=str(OUT/f'{name}-chests.png'));g0=pg.evaluate('()=>__w().gold')
        pg.click('.chest-row[data-chest="c1"] button[data-pay="gold"]');pg.wait_for_function("__w().items.length===1");pg.wait_for_timeout(2500)
        r['spent']=g0-pg.evaluate('()=>__w().gold');r['item']=pg.evaluate('()=>__w().items[0]');r['popShown']=pg.evaluate("()=>!!document.querySelector('#chestPop:not(.hidden) .cp-card')")
        pg.screenshot(path=str(OUT/f'{name}-chest-open.png'));pg.click('#cpWear');pg.wait_for_function("Object.values(__w().equip).length===1");pg.wait_for_timeout(600)
        r['wornAfter']=pg.evaluate("()=>Object.values(__w().equip)[0]");r['popClosed']=pg.evaluate("()=>document.getElementById('chestPop').classList.contains('hidden')")
        g1=pg.evaluate('()=>({g:__w().gems,n:__w().items.length,s:__w().shards})');pg.click('.chest-row[data-chest="c3"] button[data-pay="gems"]');pg.wait_for_function(f"__w().gems==={g1['g']}-90");pg.wait_for_timeout(2000)
        g2=pg.evaluate('()=>({n:__w().items.length,s:__w().shards})');r['legendChest']={'gems':90,'newItem':g2['n']-g1['n'],'shards':g2['s']-g1['s'],'rar':pg.evaluate("()=>document.querySelector('#chestPop .rar').textContent")}
        pg.screenshot(path=str(OUT/f'{name}-chest-legend.png'))
        res[name]=r;ctx.close()
    b.close()
print(json.dumps({'results':res,'errors':errs},ensure_ascii=False,indent=1))
