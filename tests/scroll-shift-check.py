# Usage: scroll-shift-check.py <port>  -- on each scrollable menu screen the content must sit centred in its panel (same gap left and right):
# a native scrollbar that takes room would push it to one side. Also scrolls the shop list and checks the floating indicator shows up,
# and screenshots the home menu icons. ONE headless browser.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];out={};errs=[]
JS="""(sel)=>{const p=document.querySelector(sel);if(!p)return null;const r=p.getBoundingClientRect();const cs=getComputedStyle(p);
 return {scrolls:p.scrollHeight>p.clientHeight+2,bar:p.offsetWidth-p.clientWidth-parseFloat(cs.borderLeftWidth)-parseFloat(cs.borderRightWidth),w:Math.round(r.width)};}"""
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader']);ctx=b.new_context(viewport={'width':1280,'height':720});pg=ctx.new_page();pg.set_default_timeout(120000)
    ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,gfxV:1,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));")
    pg.on('pageerror',lambda e:errs.append(str(e)[:200]));pg.route('https://**/*',lambda r:r.abort())
    pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(2500)
    pg.locator('.lobby-char').screenshot(path=str(ROOT/'shots_icons.png'))
    for scr in ('shop','gear','rewards','ach','stats','guide','settings'):
        pg.evaluate("(s)=>{const b=document.querySelector('[data-go=\"'+s+'\"]');if(b)b.click();}",scr);pg.wait_for_timeout(900)
        out[scr]=pg.evaluate(JS,f'#s-{scr} .panel')
        if scr=='shop':
            pg.evaluate("()=>{const p=document.querySelector('#s-shop .panel');p.scrollTop=300;}");pg.wait_for_timeout(250)
            out['tip']=pg.evaluate("()=>{const t=document.getElementById('scrollTip');if(!t)return null;const r=t.getBoundingClientRect(),p=document.querySelector('#s-shop .panel').getBoundingClientRect();const hd=[...document.querySelectorAll('#s-shop .panel > *, #s-shop .panel > * > *')].filter(e=>getComputedStyle(e).position==='sticky').reduce((m,e)=>Math.max(m,e.getBoundingClientRect().bottom),p.top);return {belowPinned:Math.round(r.top-hd),pinnedH:Math.round(hd-p.top),on:t.classList.contains('on'),h:Math.round(r.height),fromRight:Math.round(p.right-r.right),insideY:r.top>=p.top&&r.bottom<=p.bottom};}")
            pg.screenshot(path=str(ROOT/'shots_scroll.png'))
        out[scr]['pinned']=pg.evaluate("(sel)=>{const p=document.querySelector(sel),h=p.querySelector(':scope > header');if(!h||p.scrollHeight<=p.clientHeight+2)return null;p.scrollTop=220;const a=p.getBoundingClientRect(),b=h.getBoundingClientRect();return Math.round(b.top-a.top);}",f'#s-{scr} .panel')
        if scr=='rewards': pg.wait_for_timeout(200);pg.screenshot(path=str(ROOT/'shots_scroll2.png'))
        pg.evaluate("()=>{const b=document.querySelector('.screen:not(.hidden) .back');if(b)b.click();}");pg.wait_for_timeout(500)
    b.close()
print(json.dumps({'results':out,'errors':errs}))
