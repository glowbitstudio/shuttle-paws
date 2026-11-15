# One-shot patch: touch controls v2 + viewport sizing (2026-11-13). Applies to index.html, style.css, game.js in place
# (asserts every anchor exactly once; refuses to run twice). Independent of the ?matchClips work.
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def patch(name,reps,append=None):
    p=ROOT/name;s=p.read_bytes().decode('utf-8');crlf='\r\n' in s
    assert 'touch controls v2' not in s,name+' already patched'
    for old,new in reps:
        if crlf: old=old.replace('\n','\r\n');new=new.replace('\n','\r\n')
        assert s.count(old)==1,(name,s.count(old),old[:70])
        s=s.replace(old,new)
    if append: s=s.rstrip('\r\n')+('\r\n' if crlf else '\n')+(append.replace('\n','\r\n') if crlf else append)
    p.write_bytes(s.encode('utf-8'))
IC=lambda d:'<svg class="ti" viewBox="0 0 24 24" aria-hidden="true"><path d="'+d+'"/></svg>'
patch('index.html',[
('''  <div id="tbtns">
    <button data-k="jump" class="tb shot jump"><span>NHẢY</span></button>
    <button data-k="smash" class="tb shot smash"><span>ĐẬP</span></button>
    <button data-k="hit" class="tb big" id="hitBtn"><span>PHÔNG</span><small id="hitSub">đánh cao</small></button>
    <button data-k="drop" class="tb shot drop"><span>BỎ NHỎ</span></button>
    <button data-k="dive" class="tb shot dive"><span>LAO</span></button>
  </div>
''','''  <!-- touch controls v2: buttons are placed on an arc around the thumb (style.css, end of file) -->
  <div id="tbtns">
    <button data-k="hit" class="tb big" id="hitBtn">'''+IC('M4 19C7 8 15 5 20 9M20 9l-5-.6M20 9l-1.6 4.6')+'''<span>PHÔNG</span><small id="hitSub">đánh cao</small></button>
    <button data-k="smash" class="tb shot smash">'''+IC('M5 4l13 13M18 17v-6M18 17h-6')+'''<span>ĐẬP</span></button>
    <button data-k="drop" class="tb shot drop">'''+IC('M4 15c3-8 9-8 12-1M16 14l-4.4-.3M16 14l.4-4.4')+'''<span>BỎ NHỎ</span></button>
    <button data-k="jump" class="tb shot jump">'''+IC('M12 20V6M12 6l-6 6M12 6l6 6')+'''<span>NHẢY</span></button>
    <button data-k="dive" class="tb shot dive">'''+IC('M4 12h15M19 12l-6-6M19 12l-6 6')+'''<span>LAO</span></button>
  </div>
'''),
('''        <label class="set">Cỡ nút cảm ứng <input type="range" id="setTouch" min="0.7" max="1.4" step="0.05"></label>
''','''        <div class="set">Cỡ nút cảm ứng <small>Kéo thanh bên dưới để chỉnh mịn hơn</small><div class="seg sm" id="setTouchSize"><button data-v="0.85">Nhỏ</button><button data-v="1">Vừa</button><button data-v="1.2">Lớn</button></div></div>
        <label class="set">Cỡ nút (chỉnh mịn) <input type="range" id="setTouch" min="0.7" max="1.4" step="0.05"></label>
        <label class="set">Đổi bên nút cảm ứng <small>Cần di chuyển bên phải, nút đánh bên trái</small><input type="checkbox" id="setTouchSwap"></label>
'''),
])
patch('style.css',[],append='''
/* ================= touch controls v2 (2026-11-13) =================
   Sizing: the canvas, HUD and touch layer follow the DYNAMIC viewport (URL bar shown/hidden, rotation); game.js sizes the
   drawing buffer from the canvas's real CSS box, so the picture can never be stretched.
   Layout: left thumb = floating stick anywhere in the left 45 %; right thumb = shot buttons on an arc around PHONG in the
   bottom corner (offsets --dx / --dy from the corner, diameter --d, all scaled by --tscale). .tswap mirrors the sides. */
#c,#hud,#touch{inset:auto;top:0;left:0;width:100%;height:100%;height:100dvh}
body.touchui{overscroll-behavior:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#touch{touch-action:none;-webkit-user-select:none;user-select:none}
#stickZone{left:env(safe-area-inset-left);right:auto;top:calc(72px + env(safe-area-inset-top));bottom:0;height:auto;width:calc(45% - env(safe-area-inset-left))}
#stick{left:calc(22px + env(safe-area-inset-left));right:auto;bottom:calc(22px + env(safe-area-inset-bottom));width:calc(124px*var(--tscale));height:calc(124px*var(--tscale));opacity:.38}
#stick.active{opacity:.9}
#knob{width:calc(54px*var(--tscale));height:calc(54px*var(--tscale));margin:calc(-27px*var(--tscale)) 0 0 calc(-27px*var(--tscale))}
#tbtns{position:absolute;inset:0;right:0;bottom:0;display:block;pointer-events:none}
#tbtns .tb{position:absolute;pointer-events:auto;margin:0;padding:0;opacity:.88;grid-column:auto;grid-row:auto;
  width:calc(var(--d)*var(--tscale));height:calc(var(--d)*var(--tscale));
  right:calc(max(14px,env(safe-area-inset-right)) + (var(--dx) - var(--d)/2)*var(--tscale));
  bottom:calc(max(14px,env(safe-area-inset-bottom)) + (var(--dy) - var(--d)/2)*var(--tscale));
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;line-height:1.02;text-align:center;
  font-size:calc(12.5px*var(--tscale));-webkit-user-select:none;user-select:none;touch-action:none}
#tbtns .tb .pad{position:absolute;inset:-6px;border-radius:50%;z-index:3}          /* hit area larger than the drawing */
#tbtns .tb .ti{width:calc(20px*var(--tscale));height:calc(20px*var(--tscale));fill:none;stroke:#fff;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;position:relative;z-index:1;filter:drop-shadow(0 1px 0 rgba(0,0,0,.35))}
#tbtns .tb span,#tbtns .tb small{position:relative;z-index:1}
#tbtns #hitBtn{--d:88px;--dx:56px;--dy:52px;font-size:calc(16px*var(--tscale))}
#tbtns #hitBtn .ti{width:calc(24px*var(--tscale));height:calc(24px*var(--tscale))}
#tbtns #hitBtn small{font-size:calc(10px*var(--tscale))}
#tbtns .tb.drop{--d:72px;--dx:154px;--dy:50px}
#tbtns .tb.smash{--d:72px;--dx:119px;--dy:127px}
#tbtns .tb.jump{--d:66px;--dx:43px;--dy:150px}
#tbtns .tb.dive{--d:54px;--dx:112px;--dy:206px;font-size:calc(11px*var(--tscale))}
#tbtns .tb.dive .ti{width:calc(16px*var(--tscale));height:calc(16px*var(--tscale))}
#tbtns .tb.down{transform:scale(.92);filter:brightness(1.18);opacity:1;box-shadow:0 0 0 4px rgba(255,255,255,.85),0 2px 8px rgba(0,0,0,.35)}
/* left-handed / swapped layout */
body.tswap #tbtns .tb{right:auto;left:calc(max(14px,env(safe-area-inset-left)) + (var(--dx) - var(--d)/2)*var(--tscale))}
body.tswap #stickZone{left:auto;right:env(safe-area-inset-right);width:calc(45% - env(safe-area-inset-right))}
body.tswap #stick{left:auto;right:calc(22px + env(safe-area-inset-right))}
/* short landscape screens: the dive button moves beside BO NHO so the cluster stays low */
@media (orientation:landscape) and (max-height:480px){
  #tbtns .tb.dive{--dx:222px;--dy:38px}
  .touchui #hint{top:calc(60px + env(safe-area-inset-top));font-size:13px;padding:5px 14px;max-width:44vw}
  body.touchui #tmeter{top:calc(60px + env(safe-area-inset-top));bottom:auto;width:min(300px,38vw)}
  body.touchui #tmeter .tm-hint{font-size:11px;margin-bottom:3px}
  .touchui #serveClock{top:calc(96px + env(safe-area-inset-top))}
  #score{top:max(6px,env(safe-area-inset-top))} #score b{font-size:24px} #score{padding:4px 6px}
  #topBtns{top:max(8px,env(safe-area-inset-top))}
}
/* portrait: the timing meter sits just above the buttons, court above it */
@media (orientation:portrait){
  body.touchui #tmeter{top:auto;bottom:calc(max(14px,env(safe-area-inset-bottom)) + 246px*var(--tscale));width:min(420px,84vw)}
}
''')
patch('game.js',[
# 1. drawing buffer follows the canvas's real CSS box; every way a phone changes that box triggers a resize
('''function resize() {
  const w = innerWidth, h = innerHeight;
''','''// touch controls v2: size from the canvas's real CSS box (dynamic viewport), never from innerWidth/innerHeight, which
// on phones can disagree with the box while the URL bar animates or right after a rotation (stretched picture).
var viewW = innerWidth, viewH = innerHeight;   // var: read by HUD helpers defined earlier in the file
function resize() {
  const w = Math.max(1, canvas.clientWidth || innerWidth), h = Math.max(1, canvas.clientHeight || innerHeight);
  viewW = w; viewH = h;
'''),
('''addEventListener('resize', resize);
''','''addEventListener('resize', resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
if (window.visualViewport) visualViewport.addEventListener('resize', resize);
addEventListener('orientationchange', () => { resize(); setTimeout(resize, 120); setTimeout(resize, 500); });
'''),
('''  let x = innerWidth / 2, y = innerHeight * 0.36;
  if (pos) { tmpV.set(pos.x, pos.y, pos.z).project(camera); x = (tmpV.x + 1) / 2 * innerWidth; y = (1 - tmpV.y) / 2 * innerHeight; }
  el.style.left = clamp(x, 60, innerWidth - 60) + 'px'; el.style.top = clamp(y, 60, innerHeight - 60) + 'px';
''','''  let x = viewW / 2, y = viewH * 0.36;
  if (pos) { tmpV.set(pos.x, pos.y, pos.z).project(camera); x = (tmpV.x + 1) / 2 * viewW; y = (1 - tmpV.y) / 2 * viewH; }
  el.style.left = clamp(x, 60, viewW - 60) + 'px'; el.style.top = clamp(y, 60, viewH - 60) + 'px';
'''),
('''  bar.style.left = ((tmpV.x + 1) / 2 * innerWidth) + 'px'; bar.style.top = ((1 - tmpV.y) / 2 * innerHeight) + 'px';
''','''  bar.style.left = ((tmpV.x + 1) / 2 * viewW) + 'px'; bar.style.top = ((1 - tmpV.y) / 2 * viewH) + 'px';
'''),
('''  const portrait = innerHeight > innerWidth;
  let tx, ty, tz, lx, ly, lz;
''','''  const portrait = viewH > viewW;
  let tx, ty, tz, lx, ly, lz;
'''),
('''  const portrait2 = innerHeight > innerWidth;
''','''  const portrait2 = viewH > viewW;
'''),
# 2. touch UI only where the primary pointer is not a mouse
('''const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
''','''const isTouch = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && !(window.matchMedia && matchMedia('(pointer:fine)').matches);
'''),
# 3. stick: floating origin, radial dead zone, works mirrored
('''    stick.style.left = (cx - half) + 'px'; stick.style.top = (cy - half) + 'px'; stick.style.bottom = 'auto';
''','''    stick.style.left = (cx - half) + 'px'; stick.style.top = (cy - half) + 'px'; stick.style.bottom = 'auto'; stick.style.right = 'auto';
'''),
('''stick.classList.remove('active'); stick.style.left = ''; stick.style.top = ''; stick.style.bottom = ''; };
''','''stick.classList.remove('active'); stick.style.left = ''; stick.style.top = ''; stick.style.bottom = ''; stick.style.right = ''; };
'''),
('''    const R = 50 * settings.touch;
    let dx = e.clientX - cx, dy = e.clientY - cy; const l = Math.hypot(dx, dy);
    if (l > R) { dx *= R / l; dy *= R / l; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    touchVec.x = Math.abs(dx) > 8 ? dx / R : 0; touchVec.y = Math.abs(dy) > 8 ? dy / R : 0;
  }
''','''    const R = 56 * settings.touch, dead = 0.14 * R;     // generous radius, radial dead zone, full speed at the rim
    let dx = e.clientX - cx, dy = e.clientY - cy; const l = Math.hypot(dx, dy);
    if (l > R) { dx *= R / l; dy *= R / l; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    const m = Math.min(l, R), k = m > dead ? (m - dead) / (R - dead) / m : 0;
    touchVec.x = dx * k; touchVec.y = dy * k;
  }
  const buzz = () => { try { if (navigator.vibrate) navigator.vibrate(10); } catch (err) { /* not allowed: ignore */ } };
'''),
('''  document.querySelectorAll('.tb').forEach((b) => {
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault(); b.setPointerCapture(e.pointerId); const k = b.dataset.k;
''','''  document.querySelectorAll('.tb').forEach((b) => {
    const pad = document.createElement('i'); pad.className = 'pad'; b.appendChild(pad);   // invisible padding: bigger target than drawing
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ } const k = b.dataset.k; buzz();
'''),
('''    b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
  });
''','''    b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
  });
  // the touch layer never scrolls, zooms, selects or opens a context menu
  const layer = $('touch');
  for (const type of ['contextmenu', 'selectstart', 'dblclick', 'gesturestart', 'gesturechange']) layer.addEventListener(type, (e) => e.preventDefault());
  layer.addEventListener('touchmove', (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  if (isTouch) for (const type of ['gesturestart', 'gesturechange']) document.addEventListener(type, (e) => e.preventDefault());
'''),
# 4. settings: size presets + swapped layout
('''  $('setTouch').value = settings.touch; $('setServer').value = settings.server;
''','''  $('setTouch').value = settings.touch; $('setServer').value = settings.server; $('setTouchSwap').checked = !!settings.touchSwap;
  seg('setTouchSize', () => String(settings.touch), (v) => { settings.touch = +v; $('setTouch').value = settings.touch; document.documentElement.style.setProperty('--tscale', settings.touch); saveAll(); });
'''),
('''$('setTouch').oninput = (e) => { settings.touch = +e.target.value; document.documentElement.style.setProperty('--tscale', settings.touch); saveAll(); };
''','''$('setTouch').oninput = (e) => { settings.touch = +e.target.value; document.documentElement.style.setProperty('--tscale', settings.touch); saveAll(); };
$('setTouchSwap').onchange = (e) => { settings.touchSwap = e.target.checked; document.body.classList.toggle('tswap', settings.touchSwap); saveAll(); };
'''),
('''if (isTouch) document.body.classList.add('touchui');
''','''if (isTouch) document.body.classList.add('touchui');
document.body.classList.toggle('tswap', !!settings.touchSwap);   // touch controls v2: mirrored layout
'''),
])
print('patched index.html, style.css, game.js')
