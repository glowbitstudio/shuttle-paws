# Usage: icon-zoom-shot.py <port> <out dir>  -- zoomed (3x) shots of small controls: the settings button on the home screen, the bot setup
# screen (start button against the venue picker), the round buttons during a match. Also prints how far each icon sits from the centre of
# its button. ONE headless browser.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2];OUT.mkdir(exist_ok=True);errs=[];out={}
OFF="""(sel)=>[...document.querySelectorAll(sel)].filter(b=>b.offsetParent).map(b=>{const i=b.querySelector('svg,.ico');if(!i)return null;const r=b.getBoundingClientRect(),q=i.getBoundingClientRect();
 return {id:b.id||b.getAttribute('aria-label')||b.className,btn:[Math.round(r.width),Math.round(r.height)],ico:[+q.width.toFixed(1),+q.height.toFixed(1)],dx:+((q.left+q.width/2)-(r.left+r.width/2)).toFixed(1),dy:+((q.top+q.height/2)-(r.top+r.height/2)).toFixed(1)};})"""
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader']);ctx=b.new_context(viewport={'width':1280,'height':720},device_scale_factor=3);pg=ctx.new_page();pg.set_default_timeout(120000)
    ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,gfxV:1,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));")
    pg.on('pageerror',lambda e:errs.append(str(e)[:200]));pg.route('https://**/*',lambda r:r.abort())
    pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(2500)
    pg.locator('.lobby-cash').screenshot(path=str(OUT/'home-cash.png'));out['home']=pg.evaluate(OFF,'.round-btn')
    pg.evaluate("()=>document.querySelector('.profile-chip[data-go]').click()");pg.wait_for_timeout(1200);out['profile']=pg.evaluate("()=>({shown:!document.getElementById('s-profile').classList.contains('hidden'),name:document.getElementById('nameInput').value,stats:document.querySelectorAll('#pfStats .stat').length,nameInSettings:!!document.querySelector('#s-settings #nameInput')})");pg.screenshot(path=str(OUT/'profile.png'),clip={'x':240,'y':0,'width':800,'height':720})
    pg.evaluate("()=>document.querySelector('#s-profile .back').click()");pg.wait_for_timeout(500)
    pg.evaluate("()=>document.querySelector('[data-go=\"bot\"]').click()");pg.wait_for_timeout(900)
    pg.evaluate("()=>{const p=document.querySelector('#s-bot .panel');p.scrollTop=p.scrollHeight;}");pg.wait_for_timeout(300)
    pg.screenshot(path=str(OUT/'bot.png'),clip={'x':240,'y':300,'width':800,'height':420})
    pg.evaluate("()=>__spDebug.startLocal({diff:1,mode:'1v1',points:11,venue:0})");pg.wait_for_timeout(5000)
    pg.screenshot(path=str(OUT/'match-top.png'),clip={'x':880,'y':0,'width':400,'height':130});out['match']=pg.evaluate(OFF,'#hud .round, #hud button')
    b.close()
print(json.dumps({'results':out,'errors':errs}))
