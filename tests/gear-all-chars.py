# Usage: gear-all-chars.py <port> <out prefix> [char ids...]   (an out prefix containing 'sets' shows the six outfit sets, front and back)  -- head / face / neck / back items on every character (clipping check).
# Six tiles per character (4 front outfits, 2 back views), four characters per sheet. ONE headless browser.
from pathlib import Path
import sys,io,os
from playwright.sync_api import sync_playwright
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];PORT=sys.argv[1];OUT=sys.argv[2]
HOOK="window.__look=(ch,ids,slot)=>{profile.char=ch;window.__ids2=ids;gearSlot=slot;showPreview(true);previewSwing=-9;};previewGear=()=>window.__ids2||[];window.__chars=()=>S.CHARS.map(c=>c.id);\n"
LOOKS=[(['h_band','e_sport','n_bell','t_cool'],'face'),(['h_focus','e_shade','n_bow'],'face'),(['h_pro','e_pro','n_pearl'],'face'),(['e_shade','n_chain','t_pro'],'neck'),(['b_pack','h_band','e_sport'],'back'),(['b_wings','h_pro','e_pro'],'back')]
SETS=(os.environ.get('SETS') or 'bc,nj,pr,as,ry,hr').split(',')
if 'sets' in OUT: LOOKS=[([f'{k}_head',f'{k}_shirt',f'{k}_pants',f'{k}_shoes',f'{k}_back'],'sets') for k in SETS]+[([f'{k}_head',f'{k}_shirt',f'{k}_pants',f'{k}_shoes',f'{k}_back'],'back') for k in SETS]
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader']);ctx=b.new_context(viewport={'width':1000,'height':640});pg=ctx.new_page();pg.set_default_timeout(120000)
    ctx.add_init_script("localStorage.setItem('sp.settings',JSON.stringify({helpN:99,gfx:1,gfxV:1,vol:0}));localStorage.setItem('sp.profile',JSON.stringify({name:'Thu',char:'cat',id:null,secret:null,named:true}));")
    pg.on('pageerror',lambda e:errs.append(str(e)[:300]));pg.route('https://**/*',lambda r:r.abort())
    pg.route('**/game.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=(ROOT/'game.js').read_bytes().decode('utf-8').replace('window.__spDebug = {',HOOK+'window.__spDebug = {',1)))
    pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded');pg.wait_for_function('typeof __spDebug === "object"');pg.wait_for_timeout(1500)
    pg.evaluate("()=>__spDebug.go('gear')");pg.add_style_tag(content='#wdSlots{display:none!important}');pg.wait_for_timeout(1200)
    chars=sys.argv[3:] or pg.evaluate("()=>__chars()");tiles=[];last=None
    for ch in chars:
        for ids,slot in LOOKS:
            pg.evaluate("([c,i,s])=>__look(c,i,s)",[ch,ids,slot]);pg.wait_for_timeout(2600 if slot!=last else 1100);last=slot
            tiles.append(Image.open(io.BytesIO(pg.screenshot(clip={'x':95,'y':90,'width':330,'height':440}))).resize((248,330)))
    b.close()
per=4*len(LOOKS)
for n in range(0,len(tiles),per):
    part=tiles[n:n+per];sheet=Image.new('RGB',(len(LOOKS)*248,((len(part)+len(LOOKS)-1)//len(LOOKS))*330),'white')
    for k,t in enumerate(part): sheet.paste(t,((k%len(LOOKS))*248,(k//len(LOOKS))*330))
    f=ROOT/f'{OUT}-{n//per+1}.png';sheet.save(f);print('saved',f,chars[n//len(LOOKS):n//len(LOOKS)+4])
print('errors',errs)
