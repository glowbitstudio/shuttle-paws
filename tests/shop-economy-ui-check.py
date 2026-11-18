# Usage: shop-economy-ui-check.py <port> <out dir>  -- needs a server started with tests/rich-preload.js (gold, diamonds and shards to spend).
# Buys a whole set with diamonds, crafts a set piece from shards, upgrades an item in the wardrobe, shows the duplicate card. Desktop then phone. ONE headless browser.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2];OUT.mkdir(exist_ok=True)
HOOK="window.__w=()=>wallet;window.__dup=()=>chestPop({item:'nj_head',dup:true,shards:15,rar:1});\n"
res={};errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    for name,vp in (('desktop',{'width':1280,'height':720}),('phone',{'width':390,'height':780})):
        ctx=b.new_context(viewport=vp,is_mobile=name=='phone',has_touch=name=='phone');pg=ctx.new_page();pg.set_default_timeout(120000)
        ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:1,gfxV:1,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));")
        pg.on('pageerror',lambda e:errs.append(name+' '+str(e)[:300]));pg.route('https://**/*',lambda r:r.abort())
        pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object" && __w() && __w().login')
        r={};w0=pg.evaluate('()=>({gems:__w().gems,shards:__w().shards})')
        pg.evaluate("()=>__spDebug.go('shop')");pg.wait_for_timeout(1500);pg.click('#gearTabs button[data-slot="sets"]');pg.wait_for_timeout(700);pg.screenshot(path=str(OUT/f'{name}-sets.png'))
        pg.click('.set-row[data-set="ninja"] button');pg.wait_for_function("__w().items.includes('nj_back')");r['setGems']=w0['gems']-pg.evaluate('()=>__w().gems');r['setWorn']=pg.evaluate("()=>Object.values(__w().equip).filter(i=>i.startsWith('nj_')).length")
        pg.click('#gearTabs button[data-slot="head"]');pg.wait_for_timeout(700);pg.screenshot(path=str(OUT/f'{name}-shop-head.png'))
        r['setPieceButton']=pg.evaluate("()=>document.querySelector('.gear-item[data-item=\"cb_head\"] button').dataset.act")
        pg.click('.gear-item[data-item="cb_head"] button');pg.wait_for_function("__w().items.includes('cb_head')");r['craftShards']=w0['shards']-pg.evaluate('()=>__w().shards')
        pg.click('#gearTabs button[data-slot="chests"]');pg.wait_for_timeout(700);pg.screenshot(path=str(OUT/f'{name}-chests.png'));r['packs']=pg.evaluate("()=>document.querySelectorAll('.pack-row').length")
        s1=pg.evaluate('()=>__w().shards');pg.click('.pack-row[data-pack="s1"] button');pg.wait_for_function(f"__w().shards==={s1}+25");r['packOk']=True
        pg.evaluate("()=>__spDebug.go('gear')");pg.wait_for_timeout(2000);pg.click('#wdSlots .wd-slot[data-slot="head"]');pg.wait_for_timeout(1500);pg.click('#wdInv .wd-item[data-item="nj_head"]');pg.wait_for_timeout(600)
        pg.click('#wdUp');pg.wait_for_function("(__w().lv||{}).nj_head===1");pg.wait_for_timeout(800);r['upText']=pg.evaluate("()=>document.querySelector('.wd-up span').innerText");pg.screenshot(path=str(OUT/f'{name}-wardrobe-up.png'))
        pg.evaluate('()=>__dup()');pg.wait_for_timeout(1500);pg.screenshot(path=str(OUT/f'{name}-dup.png'));r['dupText']=pg.evaluate("()=>(document.querySelector('.cp-dup')||{}).innerText||''")
        res[name]=r;ctx.close()
    b.close()
print(json.dumps({'results':res,'errors':errs},ensure_ascii=False,indent=1))
