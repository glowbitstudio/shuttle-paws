# Usage: toast-shot.py <port> <out dir>  -- the notice pill (purchase, plain, two lines) and compact money in the top bar, phone and desktop.
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=ROOT/sys.argv[2];OUT.mkdir(exist_ok=True);errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader'])
    for name,vp,mob in (('port',{'width':390,'height':780},True),('desk',{'width':1280,'height':720},False)):
        ctx=b.new_context(viewport=vp,device_scale_factor=2,is_mobile=mob,has_touch=mob);pg=ctx.new_page();pg.set_default_timeout(120000)
        ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,gfxV:1,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));")
        pg.on('pageerror',lambda e:errs.append(name+' '+str(e)[:200]));pg.route('https://**/*',lambda r:r.abort())
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(3000)
        pg.evaluate("()=>{__spDebug.go('chars');__spDebug.toast('Đã mở khoá Lửa','−800 vàng','check');__spDebug.toast('Chưa đủ vàng','Còn thiếu 240 vàng','lock');__spDebug.toast('Góc nhìn: Trên cao','','camera');}")
        pg.wait_for_timeout(900);pg.screenshot(path=str(OUT/f'{name}-toast.png'),clip={'x':0,'y':0,'width':vp['width'],'height':220})
        pg.evaluate("()=>{document.querySelectorAll('.goldN,#homeGold').forEach(b=>b.textContent=__spDebug.fmtN(12345678));document.querySelectorAll('.gemN').forEach(b=>b.textContent=__spDebug.fmtN(250300));__spDebug.go('home');}")
        pg.wait_for_timeout(3500);pg.screenshot(path=str(OUT/f'{name}-money.png'),clip={'x':0,'y':0,'width':vp['width'],'height':90})
        ctx.close()
    b.close()
print('errors',errs)
