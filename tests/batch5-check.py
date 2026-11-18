# Usage: batch5-check.py <port> <out dir>  -- one pass over the menu changes (server started with RICH_XP so free chests and a level exist):
# back buttons return to the previous screen, the phone top bar fits, venues lock by level, the free chest button, the profile page,
# a locked character in the dock, pinned title bars. ONE headless browser.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2];OUT.mkdir(exist_ok=True);out={};errs=[]
CUR="()=>[...document.querySelectorAll('section.screen')].filter(s=>!s.classList.contains('hidden')).map(s=>s.id.slice(2)).join(',')"
def click(pg,sel): pg.evaluate("(s)=>{const b=document.querySelector(s);if(b)b.click();else throw new Error('no '+s)}",sel);pg.wait_for_timeout(700)
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    for name,vp in (('desktop',{'width':1280,'height':720}),('phone',{'width':390,'height':780})):
        ctx=b.new_context(viewport=vp,device_scale_factor=2,is_mobile=name=='phone',has_touch=name=='phone');pg=ctx.new_page();pg.set_default_timeout(120000)
        ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,gfxV:1,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));localStorage.setItem('sp.history',JSON.stringify([{won:true,s:[11,7],opp:'Bot',kind:'local',diff:3},{won:false,s:[9,11],opp:'Bot',kind:'local',diff:4}]));")
        pg.on('pageerror',lambda e:errs.append(name+' '+str(e)[:200]));pg.route('https://**/*',lambda r:r.abort())
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(3000)
        r={}
        r['topbar']=pg.evaluate("()=>{const q=(s)=>{const e=document.querySelector(s).getBoundingClientRect();return [Math.round(e.left),Math.round(e.right)];};return {vw:innerWidth,chip:q('.lobby-top .profile-chip'),cash:q('.lobby-cash'),gear:q('.lobby-cash .round-btn')};}")
        pg.screenshot(path=str(OUT/f'{name}-home.png'),clip={'x':0,'y':0,'width':vp['width'],'height':90})
        # back paths
        path=[]
        click(pg,'.profile-chip[data-go]');path.append(pg.evaluate(CUR));pg.screenshot(path=str(OUT/f'{name}-profile.png'))
        click(pg,'#s-profile [data-go="gear"]');path.append(pg.evaluate(CUR))
        click(pg,'#s-gear [data-go="shop"]');path.append(pg.evaluate(CUR))
        click(pg,'#s-shop .back');path.append(pg.evaluate(CUR));click(pg,'#s-gear .back');path.append(pg.evaluate(CUR))
        click(pg,'#s-profile [data-go="stats"]');path.append(pg.evaluate(CUR));click(pg,'#s-stats .back');path.append(pg.evaluate(CUR))
        click(pg,'#s-profile [data-go="chars"]');path.append(pg.evaluate(CUR))
        # a locked character in the dock
        pg.evaluate("()=>{const l=document.querySelector('#charGrid .char.locked');if(l)l.click();}");pg.wait_for_timeout(900);pg.screenshot(path=str(OUT/f'{name}-chars-locked.png'))
        r['dock']=pg.evaluate("()=>{const d=document.querySelector('.char-dock-in').getBoundingClientRect(),p=document.querySelector('#s-chars .panel').getBoundingClientRect();return {dock:[Math.round(d.left),Math.round(d.top),Math.round(d.right),Math.round(d.bottom)],panel:[Math.round(p.left),Math.round(p.top),Math.round(p.right),Math.round(p.bottom)],vh:innerHeight,pickDisabled:document.getElementById('charsDone').disabled};}")
        click(pg,'#charsBack');path.append(pg.evaluate(CUR));click(pg,'#s-profile .back');path.append(pg.evaluate(CUR))
        click(pg,'[data-go="shop"]');path.append(pg.evaluate(CUR));click(pg,'#s-shop .back');path.append(pg.evaluate(CUR));r['path']=path
        # free chests
        click(pg,'[data-go="shop"]');click(pg,'#gearTabs [data-slot="chests"]');pg.wait_for_timeout(500);pg.screenshot(path=str(OUT/f'{name}-chests.png'))
        r['free']=pg.evaluate("()=>[...document.querySelectorAll('.freeb')].map(b=>b.textContent)")
        if name=='desktop':
            click(pg,'.chest-row[data-chest="c1"] .freeb');pg.wait_for_timeout(1500);r['opened']=pg.evaluate("()=>({pop:!!document.querySelector('#chestPop .cp-card'),left:[...document.querySelectorAll('.freeb')].map(b=>b.textContent)})");pg.screenshot(path=str(OUT/f'{name}-chest-open.png'))
            pg.evaluate("()=>{const c=document.getElementById('cpClose');if(c)c.click();}");pg.wait_for_timeout(400)
        click(pg,'#s-shop .back')
        # venues by level + pinned title bars
        click(pg,'[data-go="bot"]');r['venues']=pg.evaluate("()=>({all:document.querySelectorAll('#botVenues .venue').length,locked:[...document.querySelectorAll('#botVenues .venue.locked .vlock')].map(e=>e.textContent)})")
        pg.evaluate("()=>{const p=document.querySelector('#s-bot .panel');p.scrollTop=p.scrollHeight;}");pg.wait_for_timeout(300);pg.screenshot(path=str(OUT/f'{name}-bot.png'))
        pin={}
        for scr in ('bot','tour','online','rewards'):
            if scr!='bot': click(pg,f'[data-go="{scr}"]')
            pin[scr]=pg.evaluate("(sel)=>{const p=document.querySelector(sel),h=p&&p.querySelector(':scope > header');if(!h)return 'no header';if(p.scrollHeight<=p.clientHeight+2)return 'no scroll';p.scrollTop=200;const a=p.getBoundingClientRect(),c=h.getBoundingClientRect();return Math.round(c.top-a.top);}",f'#s-{scr} .panel')
            if scr=='rewards': pg.evaluate("()=>{document.querySelector('#s-rewards .panel').scrollTop=0;}");pg.wait_for_timeout(200);pg.screenshot(path=str(OUT/f'{name}-rewards.png'))
            pg.evaluate("()=>{const b=document.querySelector('.screen:not(.hidden) .back');if(b)b.click();}");pg.wait_for_timeout(600)
        r['pinned']=pin;out[name]=r;ctx.close()
    b.close()
print(json.dumps({'results':out,'errors':errs}))
