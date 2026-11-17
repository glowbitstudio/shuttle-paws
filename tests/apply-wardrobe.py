# One-off patch: wardrobe (wear what you own, slot tiles round the character, compare) and a separate shop; item icons rendered from the 3D model.
def load(p): return open(p,encoding='utf-8',newline='').read()
def save(p,s): open(p,'w',encoding='utf-8',newline='').write(s)
def fix(s,t): return t.replace('\n','\r\n') if '\r\n' in s else t
def rep(s,a,b):
    a=fix(s,a); b=fix(s,b); assert s.count(a)==1,(a[:90],s.count(a)); return s.replace(a,b)
def between(s,a,b,new):
    i=s.index(fix(s,a)); j=s.index(fix(s,b),i); return s[:i]+fix(s,new)+s[j:]
g=load('game.js')
# ---- icons
g=rep(g,"// ================================================================ audio\n","""// ---- gear icons: the item worn by the player's own character, framed on the part of the body it belongs to (cached as data URLs)
const gearIconCache = new Map(), gearIconQueue = [];
function renderGearIcon(key) {
  const [id, ch] = key.split('@'), it = S.gearById(id), slot = it.slot;
  if (!portraitR) renderPortrait('cat');     // sets up the shared little renderer
  const mdl = buildCharacter(charById(ch), 0xff7a59, 1, 'R', [id]);
  scene.remove(mdl.root); portraitScene.add(mdl.root);
  if (slot !== 'racket') mdl.wrist.visible = false;
  mdl.root.rotation.y = slot === 'back' ? Math.PI - 0.5 : slot === 'racket' ? 0.15 : slot === 'wrist' ? -0.5 : 0.42;
  mdl.root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const parts = slot === 'racket' ? [mdl.wrist] : slot === 'shoes' ? mdl.feet : slot === 'shirt' ? [mdl.gear.torso, mdl.arm, mdl.free] : slot === 'shorts' ? [mdl.gear.shorts] : slot === 'wrist' ? [mdl.gear.wristGear[0]]
    : slot === 'head' ? [mdl.head] : slot === 'neck' ? [mdl.gear.neck] : [mdl.gear.back, mdl.gear.torso];
  for (const p of parts) box.expandByObject(p);
  if (slot === 'shorts') box.min.y -= 0.2;
  if (slot === 'neck') { box.min.y -= 0.06; box.max.y += 0.06; }
  if (slot === 'wrist') box.expandByScalar(0.07);
  const c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3()), r = Math.max(0.12, Math.max(sz.x, sz.y) * 0.56);
  const dist = r / Math.tan(THREE.MathUtils.degToRad(12));
  portraitCam.up.set(0, slot === 'racket' ? -1 : 1, 0);            // the racket hangs head down in the rest pose: show it head up
  portraitCam.position.set(c.x + dist * 0.1, c.y + dist * (slot === 'shoes' ? 0.3 : 0.12), c.z + dist); portraitCam.lookAt(c);
  portraitR.render(portraitScene, portraitCam);
  const url = portraitR.domElement.toDataURL('image/png');
  portraitCam.up.set(0, 1, 0);
  portraitScene.remove(mdl.root); disposeTree(mdl.root);
  return url;
}
function drainGearIcons() {
  const key = gearIconQueue[0]; if (!key) return;
  let url = '';
  try { url = renderGearIcon(key); } catch (e) { console.warn('gear icon', key, e); }
  gearIconCache.set(key, url); gearIconQueue.shift();
  document.querySelectorAll(`img[data-gi="${key}"]`).forEach((im) => { im.src = url || BLANK_IMG; });
  if (gearIconQueue.length) setTimeout(drainGearIcons, 0);
}
const gearIconImg = (id) => {
  const key = id + '@' + profile.char, u = gearIconCache.get(key);
  if (u === undefined && !gearIconQueue.includes(key)) { gearIconQueue.push(key); if (gearIconQueue.length === 1) setTimeout(drainGearIcons, 0); }
  return `<img class="gi-ic" data-gi="${key}" alt="" src="${u || BLANK_IMG}">`;
};

// ================================================================ audio
""")
# ---- wardrobe + shop
g=between(g,"function renderGear() {\n","// ================================================================ economy","""const gearModChips = (mods) => Object.entries(mods).filter(([, v]) => Math.abs(v) > 1e-9).map(([k, v]) => `<em class="${v > 0 ? 'up' : 'dn'}">${v > 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100) / 100} ${STAT_NAMES[k]}</em>`).join('');
function renderGearStats(c, shown) {
  const eff = S.effStats(c.id, shown);
  $('gearStats').innerHTML = Object.keys(STAT_NAMES).map((k) => {
    const d = Math.round((eff[k] - c.stats[k]) * 100) / 100;
    return `<span>${STAT_NAMES[k]}</span><div class="bar"><i style="width:${Math.min(100, eff[k] / 7 * 100)}%"></i></div><b class="${d > 0 ? 'up' : d < 0 ? 'dn' : ''}">${d > 0 ? '+' + d : d < 0 ? '−' + Math.abs(d) : ''}</b>`;
  }).join('');
}
// Wardrobe: wear what you already own. Slot tiles stand round the character; the panel lists the owned items of the chosen slot
// and compares the picked one with what is worn now.
function renderGear() {
  const c = charById(profile.char), worn = myGear(), set = S.gearSet(worn), shown = previewGear(), items = (wallet && wallet.items) || [];
  const slotName = (S.GEAR_SLOTS.find((s) => s[0] === gearSlot) || ['', ''])[1], cur = set[gearSlot] || null;
  $('wdSlots').innerHTML = S.GEAR_SLOTS.map(([k, n]) => { const it = set[k]; return `<button class="wd-slot${k === gearSlot ? ' on' : ''}${it ? ' r' + it.rar : ' empty'}" data-slot="${k}">${it ? gearIconImg(it.id) : '<i>+</i>'}<span>${n}</span></button>`; }).join('');
  const own = S.GEAR.filter((it) => it.slot === gearSlot && items.includes(it.id));
  $('wdSlotName').textContent = slotName; $('wdCount').textContent = wallet ? `${own.length}/${S.GEAR.filter((it) => it.slot === gearSlot).length} món đã có` : '';
  $('wdInv').innerHTML = !wallet ? '<p class="tiny">Đang kết nối máy chủ… Trang bị cần có mạng.</p>'
    : own.length ? own.map((it) => `<button class="wd-item r${it.rar}${cur && cur.id === it.id ? ' worn' : ''}${gearTry === it.id ? ' on' : ''}" data-item="${it.id}">${gearIconImg(it.id)}<span>${esc(it.name)}</span>${cur && cur.id === it.id ? '<em>Đang mặc</em>' : ''}</button>`).join('')
    : `<div class="wd-none"><p>Bạn chưa có món nào cho ô <b>${esc(slotName)}</b>.</p><button class="pill buy" id="wdToShop">Đến cửa hàng</button></div>`;
  const pick = gearTry && S.gearById(gearTry).slot === gearSlot ? S.gearById(gearTry) : cur;
  if (!pick) $('wdDetail').innerHTML = '';
  else {
    const isWorn = !!cur && cur.id === pick.id;
    let cmp = '';
    if (!isWorn && cur) {
      const diff = {}; for (const k of Object.keys(STAT_NAMES)) { const d = (pick.mods[k] || 0) - (cur.mods[k] || 0); if (Math.abs(d) > 1e-9) diff[k] = d; }
      cmp = `<div class="wd-cmp"><small>So với <b>${esc(cur.name)}</b> đang mặc:</small><div class="mods">${gearModChips(diff) || '<em>Như nhau</em>'}</div></div>`;
    } else if (!isWorn) cmp = '<div class="wd-cmp"><small>Ô này đang trống — mặc vào là được cộng nguyên chỉ số của món.</small></div>';
    $('wdDetail').innerHTML = `<div class="wd-card r${pick.rar}"><div class="wd-big">${gearIconImg(pick.id)}</div><div class="gi"><b>${esc(pick.name)}</b><span class="rar">${S.GEAR_RARITY[pick.rar]}</span>` +
      `<div class="mods">${gearModChips(pick.mods)}</div><small>${esc(pick.desc)}</small></div></div>${cmp}` +
      `<button class="cta" id="wdAct" data-act="${isWorn ? 'off' : 'on'}">${isWorn ? 'Tháo ra' : 'Mặc vào'}</button>`;
    $('wdAct').onclick = () => { Sound.boop(); Net.send({ t: 'equip', slot: pick.slot, id: isWorn ? null : pick.id }); gearTry = null; };
  }
  renderGearStats(c, shown);
  const trying = pick && !(cur && cur.id === pick.id);
  $('stageName').innerHTML = `${esc(c.name)}<small>Sức mạnh ${S.powerOf(c.id, shown)}${trying ? ' · đang thử ' + esc(pick.name) : ''}</small>`;
  $('wdPower').textContent = 'Sức mạnh ' + S.powerOf(c.id, shown);
  $('wdSlots').querySelectorAll('button').forEach((b) => { b.onclick = () => { gearSlot = b.dataset.slot; gearTry = null; Sound.boop(); showPreview(true); renderGear(); }; });
  $('wdInv').querySelectorAll('.wd-item').forEach((b) => {
    const id = b.dataset.item;
    b.onclick = () => { gearTry = id; Sound.boop(); showPreview(true); renderGear(); };
    b.ondblclick = () => { Sound.boop(); gearTry = null; Net.send({ t: 'equip', slot: gearSlot, id }); };
  });
  if ($('wdToShop')) $('wdToShop').onclick = () => { Sound.boop(); const s = gearSlot; go('shop'); gearSlot = s; renderShop(); showPreview(true); };
}
// Shop: buy new items (they can be tried on first). Wearing and taking off happens in the wardrobe.
function renderShop() {
  const c = charById(profile.char), shown = previewGear(), set = S.gearSet(myGear());
  const gold = wallet ? wallet.gold : 0, items = (wallet && wallet.items) || [];
  $('gearGold').textContent = wallet ? wallet.gold : '…';
  $('gearTabs').innerHTML = S.GEAR_SLOTS.map(([k, n]) => `<button data-slot="${k}" class="${k === gearSlot ? 'on' : ''}">${n}</button>`).join('');
  $('gearList').innerHTML = !wallet ? '<p class="tiny">Đang kết nối máy chủ… Cửa hàng cần có mạng.</p>' : S.GEAR.filter((it) => it.slot === gearSlot).map((it) => {
    const own = items.includes(it.id), on = set[it.slot] && set[it.slot].id === it.id;
    const btn = own ? `<span class="own">${on ? 'Đang mặc' : 'Đã có'}</span>` : `<button class="pill buy" data-act="buy" ${gold >= it.price ? '' : 'disabled'}><i class="coin"></i>${it.price}</button>`;
    return `<div class="gear-item r${it.rar}${gearTry === it.id ? ' try' : ''}" data-item="${it.id}"><span class="ic">${gearIconImg(it.id)}</span>` +
      `<div class="gi"><b>${esc(it.name)}</b><span class="rar">${S.GEAR_RARITY[it.rar]}</span><div class="mods">${gearModChips(it.mods)}</div><small>${esc(it.desc)}</small></div>${btn}</div>`;
  }).join('');
  const tryIt = gearTry && S.gearById(gearTry);
  $('stageName').innerHTML = `${esc(c.name)}<small>Sức mạnh ${S.powerOf(c.id, shown)}${tryIt ? ' · đang thử ' + esc(tryIt.name) : ''}</small>`;
  $('gearTabs').querySelectorAll('button').forEach((b) => { b.onclick = () => { gearSlot = b.dataset.slot; gearTry = null; Sound.boop(); showPreview(true); renderShop(); }; });
  $('gearList').querySelectorAll('.gear-item').forEach((row) => {
    const id = row.dataset.item;
    row.onclick = () => { gearTry = id; Sound.boop(); showPreview(true); renderShop(); };
    const b = row.querySelector('button');
    if (b) b.onclick = (ev) => { ev.stopPropagation(); Sound.boop(); gearTry = null; Net.send({ t: 'buyGear', id }); };
  });
}

""")
g=rep(g,"  if (screen === 'gear') { renderGear(); showPreview(true); }","  if (screen === 'gear') { renderGear(); showPreview(true); }\n  if (screen === 'shop') { renderShop(); showPreview(true); }")
g=rep(g,"const SCREENS = ['home', 'bot', 'tour', 'chars', 'gear', 'rewards',","const SCREENS = ['home', 'bot', 'tour', 'chars', 'gear', 'shop', 'rewards',")
g=rep(g,"  $('stageName').classList.toggle('hidden', name !== 'chars' && name !== 'gear');","  $('stageName').classList.toggle('hidden', name !== 'chars' && name !== 'gear' && name !== 'shop'); $('stageName').classList.toggle('wd', name === 'gear');\n  $('wdSlots').classList.toggle('hidden', name !== 'gear');")
g=rep(g,"$('stageName').classList.add('hidden'); showPreview(false); }","$('stageName').classList.add('hidden'); $('wdSlots').classList.add('hidden'); showPreview(false); }")
g=rep(g,"gear: renderGear, rewards: renderRewards,","gear: renderGear, shop: renderShop, rewards: renderRewards,")
g=rep(g,"screen === 'gear' ? previewGear() : id === profile.char ? myGear() : []);","screen === 'gear' || screen === 'shop' ? previewGear() : id === profile.char ? myGear() : []);")
# camera: wardrobe / shop move in on the part being dressed
g=rep(g,"  if (!session && (screen === 'chars' || screen === 'gear' || screen === 'home')) {","  if (!session && (screen === 'chars' || screen === 'gear' || screen === 'shop' || screen === 'home')) {")
g=rep(g,"lx = side; ly = lob ? 0.35 : portrait ? -1.0 : 1.2; lz = 3.2;\n","""lx = side; ly = lob ? 0.35 : portrait ? -1.0 : 1.2; lz = 3.2;
    if (screen === 'gear' || screen === 'shop') {   // dressing room: move in on the part of the body being dressed ([look height, distance])
      const f = gearSlot === 'head' ? [1.72, 3.5] : gearSlot === 'shoes' ? [0.62, 3.5] : gearSlot === 'racket' ? [1.4, 5.2] : gearSlot === 'shorts' ? [0.95, 3.7] : gearSlot === 'wrist' ? [1.1, 3.6] : [1.25, 3.9];
      const d = f[1] * (portrait ? 1.5 : 1);
      tz = 3.2 + d; ty = f[0] + 0.4; ly = f[0] - (portrait ? 0.3 * d : 0); tx = lx = portrait ? 0 : 1.35 * d / 5.6;
    }
""")
save('game.js',g)
h=load('index.html')
h=between(h,'  <section id="s-gear" class="screen stage hidden">','  <section id="s-rewards"','''  <section id="s-gear" class="screen stage hidden">
    <div class="panel side wd">
      <header><button class="back" data-go="home">‹</button><h2>Trang bị</h2><button class="pill buy" data-go="shop">Cửa hàng</button></header>
      <div class="wd-title"><b id="wdSlotName"></b><small id="wdCount"></small><span id="wdPower"></span></div>
      <div id="wdInv" class="wd-inv"></div>
      <div id="wdDetail"></div>
      <div class="char-info"><div class="bars" id="gearStats"></div></div>
    </div>
  </section>
  <div id="wdSlots" class="wd-slots hidden"></div>

  <section id="s-shop" class="screen stage hidden">
    <div class="panel side">
      <header><button class="back" data-go="home">‹</button><h2>Cửa hàng</h2><span class="gold-chip"><i class="coin"></i><b id="gearGold">…</b></span></header>
      <p class="tiny shop-hint">Bấm một món để thử lên nhân vật. Mua xong vào <b>Trang bị</b> để mặc hoặc đổi.</p>
      <div id="gearTabs"></div>
      <div id="gearList"></div>
    </div>
  </section>

''')
h=rep(h,'''      <button data-go="gear"><i><svg class="ico" aria-hidden="true"><use href="#i-shirt"/></svg></i>Trang bị</button>
''','''      <button data-go="gear"><i><svg class="ico" aria-hidden="true"><use href="#i-shirt"/></svg></i>Trang bị</button>
      <button data-go="shop"><i class="coin"></i>Cửa hàng</button>
''')
save('index.html',h)
c=load('style.css')
css='''
/* ---- wardrobe: slot tiles round the character, owned items, compare card; shop cards with item pictures */
.gi-ic{display:block;width:100%;height:100%;object-fit:contain}
.r0{--rar:#8fa0e8;--rar-bg:linear-gradient(180deg,#56639f,#333a70)}
.r1{--rar:#63b4ff;--rar-bg:linear-gradient(180deg,#3a86d8,#27479a)}
.r2{--rar:#d79bff;--rar-bg:linear-gradient(180deg,#a45fe0,#5d2ea3)}
.wd-slots{position:fixed;left:0;width:calc(100% - 500px);top:50%;transform:translateY(-52%);display:grid;grid-template-columns:auto auto;justify-content:space-between;gap:12px;padding:0 max(18px,3vw);pointer-events:none;z-index:5}
.wd-slot{pointer-events:auto;position:relative;width:86px;height:98px;padding:5px 4px 3px;border-radius:18px;border:3px solid var(--rar,rgba(255,255,255,.3));background:var(--rar-bg,linear-gradient(180deg,rgba(40,44,120,.9),rgba(24,26,80,.9)));color:#fff;
  display:flex;flex-direction:column;align-items:center;justify-content:space-between;cursor:pointer;font-family:var(--display);font-size:12px;font-weight:800;box-shadow:0 5px 0 rgba(0,0,0,.35),0 10px 20px rgba(0,0,0,.25);transition:transform .12s}
.wd-slot img{width:64px;height:64px;filter:drop-shadow(0 3px 2px rgba(0,0,0,.35))}
.wd-slot i{font-style:normal;font-size:32px;line-height:64px;opacity:.4}
.wd-slot.empty{border-style:dashed}
.wd-slot.on{border-color:#ffd76a;transform:scale(1.08);box-shadow:0 0 0 3px rgba(255,215,106,.35),0 0 22px rgba(255,200,61,.65),0 5px 0 rgba(0,0,0,.35)}
.wd-title{display:flex;align-items:baseline;gap:8px;margin:0 0 8px}.wd-title b{font-family:var(--display);font-size:19px}.wd-title small{opacity:.75;font-size:12px}
#wdPower{margin-left:auto;font-family:var(--display);font-weight:900;font-size:14px;color:#ffd76a}
.wd-inv{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}
.wd-item{position:relative;border:3px solid var(--rar);border-radius:16px;background:var(--rar-bg);color:#fff;padding:6px 4px 5px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;font-family:var(--display);font-size:12px;font-weight:800;line-height:1.15;box-shadow:0 4px 0 rgba(0,0,0,.3)}
.wd-item img{width:74px;height:74px;filter:drop-shadow(0 3px 2px rgba(0,0,0,.35))}
.wd-item.on{border-color:#fff;box-shadow:0 0 0 3px rgba(255,255,255,.3),0 4px 0 rgba(0,0,0,.3)}
.wd-item em{position:absolute;top:-8px;right:-4px;font-style:normal;font-size:10px;background:#3ecf7a;color:#053d1c;border-radius:999px;padding:2px 7px;box-shadow:0 2px 0 rgba(0,0,0,.25)}
.wd-none{grid-column:1/-1;text-align:center;padding:14px 8px;border-radius:14px;border:2px dashed rgba(255,255,255,.25)}.wd-none p{margin:0 0 10px}
.wd-card{display:flex;gap:10px;align-items:center;padding:9px;border-radius:16px;border:2px solid var(--rar);background:rgba(255,255,255,.07)}
.wd-big{flex:none;width:92px;height:92px;border-radius:14px;background:var(--rar-bg);padding:4px}
.wd-card .gi b{font-family:var(--display);font-size:17px}.wd-card .rar,.gear-item .rar{margin-left:7px;font-size:11px;font-weight:800;color:var(--rar)}
.wd-card small{display:block;opacity:.8;font-size:12px;line-height:1.25;margin-top:3px}
.wd-card .mods,.wd-cmp .mods{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.wd-card .mods em,.wd-cmp .mods em{font-style:normal;font-size:12px;font-weight:800;padding:1px 7px;border-radius:999px}
.wd-cmp{margin:8px 0 0;padding:8px 10px;border-radius:12px;background:rgba(0,0,0,.22)}.wd-cmp small{opacity:.85;font-size:12px}
.panel.wd #wdAct{font-size:19px;padding:10px;margin:10px 0 6px}
.gear-item .ic{flex:none;width:62px;height:62px;border-radius:12px;background:var(--rar-bg);border:2px solid var(--rar);padding:2px}
.gear-item .own{flex:none;font-size:12px;font-weight:800;color:#7ff0a8;white-space:nowrap}
#gearTabs{grid-template-columns:repeat(4,1fr)}
.shop-hint{margin:0 0 8px;color:#fff;opacity:.8}
.lobby-char button .coin{width:17px;height:17px;margin:0}
@media (max-width:820px), (orientation:portrait){
  .wd-slots{width:100%;top:auto;transform:none;bottom:calc(52vh + 20px);grid-template-columns:repeat(8,1fr);gap:4px;padding:0 8px;justify-content:stretch}
  .wd-slot{width:auto;height:52px;border-radius:12px;border-width:2px;padding:2px;justify-content:center}
  .wd-slot img{width:38px;height:38px}.wd-slot i{font-size:22px;line-height:38px}.wd-slot span{display:none}
  body .stage-name.wd{display:none}
  .wd-item img{width:62px;height:62px}
  .lobby-char{gap:6px}.lobby-char button{padding:8px 12px;font-size:14px}
}
@media (orientation:landscape) and (max-height:480px){
  .wd-slots{width:calc(100% - min(400px,52vw));top:50%;bottom:auto;transform:translateY(-50%);grid-template-columns:auto auto;justify-content:space-between;gap:5px;padding:0 10px}
  .wd-slot{width:60px;height:62px;border-radius:12px;border-width:2px;padding:2px}.wd-slot img{width:42px;height:42px}.wd-slot i{line-height:42px;font-size:24px}.wd-slot span{display:block;font-size:10px}
  body .stage-name.wd{display:none}
}
'''
save('style.css',c+fix(c,css))
print('ok')
