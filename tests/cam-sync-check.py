# Usage: cam-sync-check.py <port>  -- the camera choice in Settings and the C key / camera button in a match are one setting:
# picking a view in Settings is what the match uses, C walks through all five views, and the Settings row follows it.
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1]
HOOK="window.__c=()=>({cam:settings.cam,on:(document.querySelector('#setCam button.on')||{dataset:{}}).dataset.v,btn:document.getElementById('camBtn').textContent,camY:+camera.position.y.toFixed(1)});\n"
r={};errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader']);ctx=b.new_context(viewport={'width':960,'height':540});pg=ctx.new_page();pg.set_default_timeout(120000)
    ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:0,gfxV:1,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));")
    pg.on('pageerror',lambda e:errs.append(str(e)[:200]));pg.route('https://**/*',lambda r:r.abort())
    pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
    pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(800)
    pg.evaluate("()=>__spDebug.go('settings')");pg.wait_for_timeout(600);pg.click('#setCam button[data-v="full"]');pg.wait_for_timeout(300);r['afterSettingsFull']=pg.evaluate('()=>__c()')
    pg.evaluate("()=>{__spDebug.startLocal({diff:1,mode:'1v1',points:11,venue:0});}");pg.wait_for_timeout(4000);r['inMatchFull']=pg.evaluate('()=>__c()')
    seq=[]
    for i in range(5):
        pg.keyboard.press('c');pg.wait_for_timeout(2200);c=pg.evaluate('()=>__c()');seq.append([c['cam'],c['on'],c['camY']])
    r['pressC']=seq
    pg.evaluate("()=>document.querySelector('#setCam button[data-v=\"low\"]').click()");pg.wait_for_timeout(2200);r['settingsLowDuringMatch']=pg.evaluate('()=>__c()')
    b.close()
print(json.dumps({'results':r,'errors':errs},ensure_ascii=False))
