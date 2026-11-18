# Usage: venue-ui-shot.py <port> <out dir>  -- the venue cards on the bot screen, the venue button and chooser when creating an online room,
# desktop and phone. ONE headless browser.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2];OUT.mkdir(exist_ok=True);out={};errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    for name,vp in (('desktop',{'width':1280,'height':720}),('phone',{'width':390,'height':780})):
        ctx=b.new_context(viewport=vp,is_mobile=name=='phone',has_touch=name=='phone');pg=ctx.new_page();pg.set_default_timeout(120000)
        ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,gfxV:1,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));")
        pg.on('pageerror',lambda e:errs.append(name+' '+str(e)[:200]));pg.route('https://**/*',lambda r:r.abort())
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(3000)
        pg.evaluate("()=>document.querySelector('[data-go=\"bot\"]').click()");pg.wait_for_timeout(800)
        pg.evaluate("()=>{const p=document.querySelector('#s-bot .panel'),v=document.getElementById('botVenues');p.scrollTop=v.offsetTop-80;}");pg.wait_for_timeout(400);pg.screenshot(path=str(OUT/f'{name}-bot-venues.png'))
        pg.evaluate("()=>document.querySelector('#s-bot .back').click()");pg.wait_for_timeout(500)
        pg.evaluate("()=>document.querySelector('[data-go=\"online\"]').click()");pg.wait_for_timeout(1200)
        r={'btn':pg.evaluate("()=>{const b=document.getElementById('crVenueBtn');return b&&b.offsetParent?b.textContent:null;}")}
        pg.evaluate("()=>{const b=document.getElementById('crVenueBtn');if(b)b.scrollIntoView({block:'center'});}");pg.wait_for_timeout(300);pg.screenshot(path=str(OUT/f'{name}-online.png'))
        pg.evaluate("()=>document.getElementById('crVenueBtn').click()");pg.wait_for_timeout(600);pg.screenshot(path=str(OUT/f'{name}-sheet.png'))
        pg.evaluate("()=>document.querySelectorAll('#venueSheetList .venue:not(.locked)')[3].click()");pg.wait_for_timeout(500)
        r['after']=pg.evaluate("()=>({btn:document.getElementById('crVenueBtn').textContent,sel:document.getElementById('crVenue').value,sheetHidden:document.getElementById('venueSheet').classList.contains('hidden')})")
        out[name]=r;ctx.close()
    b.close()
print(json.dumps({'results':out,'errors':errs}))
