# Usage: chars-buy-check.py <port> <out dir>  -- character screen: a locked character turns the pick button into the buy button, gold and
# diamonds sit in the title bar, nothing is drawn in front of the character; buying works; the settings icon is centred in its button.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2];OUT.mkdir(exist_ok=True);out={};errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    for name,vp,mob in (('port',{'width':390,'height':780},True),('desk',{'width':1280,'height':720},False)):
        ctx=b.new_context(viewport=vp,device_scale_factor=2,is_mobile=mob,has_touch=mob);pg=ctx.new_page();pg.set_default_timeout(120000)
        ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,gfxV:1,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));")
        pg.on('pageerror',lambda e:errs.append(name+' '+str(e)[:200]));pg.route('https://**/*',lambda r:r.abort())
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(3000)
        r={}
        r['cog']=pg.evaluate("()=>{const bt=document.querySelector('.lobby-cash .round-btn').getBoundingClientRect(),ic=document.querySelector('.lobby-cash .round-btn .ico').getBoundingClientRect();return {dx:+((ic.left+ic.width/2)-(bt.left+bt.width/2)).toFixed(2),dy:+((ic.top+ic.height/2)-(bt.top+bt.height/2)).toFixed(2),btn:[bt.width,bt.height],ico:[ic.width,ic.height]};}")
        r['homeGold']=pg.evaluate("()=>document.getElementById('homeGold').textContent")
        pg.screenshot(path=str(OUT/f'{name}-top.png'),clip={'x':vp['width']-200,'y':0,'width':200,'height':90})
        pg.evaluate("()=>__spDebug.go('chars')");pg.wait_for_timeout(900)
        pg.evaluate("()=>{const l=document.querySelector('#charGrid .char.locked');if(l)l.click();}");pg.wait_for_timeout(900);pg.screenshot(path=str(OUT/f'{name}-locked.png'))
        r['locked']=pg.evaluate("()=>({btn:document.getElementById('charsDone').textContent,disabled:document.getElementById('charsDone').disabled,stage:document.getElementById('stageName').textContent,gold:document.querySelector('#s-chars .goldN').textContent,gems:document.querySelector('#s-chars .gemN').textContent,nLocked:document.querySelectorAll('#charGrid .char.locked').length})")
        pg.evaluate("()=>document.getElementById('charsDone').click()");pg.wait_for_timeout(1500);pg.screenshot(path=str(OUT/f'{name}-bought.png'))
        r['after']=pg.evaluate("()=>({btn:document.getElementById('charsDone').textContent,gold:document.querySelector('#s-chars .goldN').textContent,nLocked:document.querySelectorAll('#charGrid .char.locked').length,screen:[...document.querySelectorAll('section.screen')].filter(s=>!s.classList.contains('hidden')).map(s=>s.id).join(',')})")
        out[name]=r;ctx.close()
    b.close()
out['errors']=errs;print(json.dumps(out,ensure_ascii=False,indent=1))
