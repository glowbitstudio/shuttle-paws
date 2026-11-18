# Usage: btn-zoom.py <port> <out png> <css selector> [pad]  -- 4x zoom of one control on the home screen with room around it, plus the
# boxes and overflow of its ancestors (to spot anything that clips it). ONE headless browser.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2];SEL=sys.argv[3];PAD=int(sys.argv[4]) if len(sys.argv)>4 else 14
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    for name,vp in (('desktop',{'width':1280,'height':720}),('phone',{'width':390,'height':780}),('land',{'width':800,'height':380})):
        ctx=b.new_context(viewport=vp,device_scale_factor=4);pg=ctx.new_page();pg.set_default_timeout(120000)
        ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,gfxV:1,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));")
        pg.route('https://**/*',lambda r:r.abort());pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(2500)
        info=pg.evaluate("""(sel)=>{const e=document.querySelector(sel),r=e.getBoundingClientRect(),cs=getComputedStyle(e);const up=[];for(let q=e.parentElement;q&&q!==document.body;q=q.parentElement){const c=getComputedStyle(q),k=q.getBoundingClientRect();up.push({tag:q.tagName+'.'+q.className.toString().slice(0,30),ov:c.overflow,box:[Math.round(k.left),Math.round(k.top),Math.round(k.right),Math.round(k.bottom)]});}
          return {box:[+r.left.toFixed(1),+r.top.toFixed(1),+r.right.toFixed(1),+r.bottom.toFixed(1)],vw:innerWidth,shadow:cs.boxShadow,border:cs.border,up};}""",SEL)
        x0,y0,x1,y1=info['box'];clip={'x':max(0,x0-PAD),'y':max(0,y0-PAD),'width':min(vp['width'],x1+PAD)-max(0,x0-PAD),'height':min(vp['height'],y1+PAD+6)-max(0,y0-PAD)}
        print(name,json.dumps(info)[:230])
        if clip['width']>0 and clip['height']>0: pg.screenshot(path=str(OUT.with_name(OUT.stem+'-'+name+'.png')),clip=clip)
        pg.screenshot(path=str(OUT.with_name(OUT.stem+'-'+name+'-full.png')));ctx.close()
    b.close()
