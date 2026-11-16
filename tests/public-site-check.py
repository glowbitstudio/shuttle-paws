# Usage: public-site-check.py <https url> <out png>  -- opens the public site, waits for the game connection and the wallet. ONE headless browser.
import sys,json
from playwright.sync_api import sync_playwright
URL=sys.argv[1];errs=[]
with sync_playwright() as p:
    import os;PX=os.environ.get('SP_PROXY');b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'],proxy={'server':PX} if PX else None);ctx=b.new_context(viewport={'width':390,'height':780},is_mobile=True,has_touch=True);pg=ctx.new_page();pg.set_default_timeout(90000)
    ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Kiểm tra',char:'cat',id:null,secret:null,named:true}));")
    pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
    pg.goto(URL,wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"')
    ok=True
    try: pg.wait_for_function("document.getElementById('homeGold').textContent.trim()!=='…'",timeout=40000)
    except Exception as e: ok=False
    r=pg.evaluate("()=>({gold:document.getElementById('homeGold').textContent,net:__spDebug.Net.ok,rtt:Math.round((__spDebug.Net.rtt||0)*1000)})")
    pg.wait_for_timeout(2500);r['rttLater']=pg.evaluate("()=>Math.round((__spDebug.Net.rtt||0)*1000)")
    pg.screenshot(path=sys.argv[2]);b.close()
print(json.dumps({'walletArrived':ok,'state':r,'errors':errs},ensure_ascii=False))
