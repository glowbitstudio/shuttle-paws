# One-off: gear on the model (colours per slot) + the gear / shop screen. Asserts every anchor occurs exactly once.
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def patch(name,reps,append=None):
    p=ROOT/name;s=p.read_bytes().decode('utf-8');nl='\r\n' if '\r\n' in s else '\n'
    for a,b in reps:
        a=a.replace('\n',nl);b=b.replace('\n',nl);assert s.count(a)==1,(name,s.count(a),a[:90]);s=s.replace(a,b)
    if append: s=s.rstrip()+nl+append.replace('\n',nl)+nl
    p.write_bytes(s.encode('utf-8'))
UI='''// ================================================================ gear / shop (the server owns items and gold; this shows them and sends requests)
const myGear = () => (wallet && wallet.equip && wallet.items ? Object.values(wallet.equip).filter((id) => wallet.items.includes(id)) : []);
let gearSlot = 'racket', gearTry = null;
// what the stage character wears: my gear, with the item being looked at swapped into its slot
function previewGear() {
  const worn = myGear(), g = gearTry && S.gearById(gearTry);
  return g ? worn.filter((id) => S.gearById(id).slot !== g.slot).concat(g.id) : worn;
}
const STAT_NAMES = { spd: 'Tốc độ', jmp: 'Bật nhảy', pow: 'Lực đập', rch: 'Tầm với', ctl: 'Khéo léo', sta: 'Thể lực' };
function renderGear() {
  const c = charById(profile.char), worn = myGear(), set = S.gearSet(worn), shown = previewGear();
  const gold = wallet ? wallet.gold : 0, items = (wallet && wallet.items) || [];
  $('gearGold').textContent = wallet ? wallet.gold : '…';
  $('gearTabs').innerHTML = S.GEAR_SLOTS.map(([k, n]) => `<button data-slot="${k}" class="${k === gearSlot ? 'on' : ''}">${n}${set[k] ? '<i class="has"></i>' : ''}</button>`).join('');
  const mods = (g) => Object.entries(g.mods).map(([k, v]) => `<em class="${v > 0 ? 'up' : 'dn'}">${v > 0 ? '+' : '−'}${Math.abs(v)} ${STAT_NAMES[k]}</em>`).join('');
  $('gearList').innerHTML = !wallet ? '<p class="tiny">Đang kết nối máy chủ… Trang bị cần có mạng.</p>' : S.GEAR.filter((g) => g.slot === gearSlot).map((g) => {
    const own = items.includes(g.id), on = set[g.slot] && set[g.slot].id === g.id;
    const btn = own ? `<button class="pill" data-act="${on ? 'off' : 'on'}">${on ? 'Tháo' : 'Mặc'}</button>` : `<button class="pill buy" data-act="buy" ${gold >= g.price ? '' : 'disabled'}><i class="coin"></i>${g.price}</button>`;
    return `<div class="gear-item r${g.rar}${on ? ' worn' : ''}${gearTry === g.id ? ' try' : ''}" data-item="${g.id}"><i class="sw" style="background:#${g.col.toString(16).padStart(6, '0')}"></i>` +
      `<div class="gi"><b>${esc(g.name)}</b><span class="rar">${S.GEAR_RARITY[g.rar]}${on ? ' · đang mặc' : own ? ' · đã có' : ''}</span><div class="mods">${mods(g)}</div><small>${esc(g.desc)}</small></div>${btn}</div>`;
  }).join('');
  const eff = S.effStats(c.id, shown);
  $('gearStats').innerHTML = Object.keys(STAT_NAMES).map((k) => {
    const d = Math.round((eff[k] - c.stats[k]) * 100) / 100;
    return `<span>${STAT_NAMES[k]}</span><div class="bar"><i style="width:${Math.min(100, eff[k] / 7 * 100)}%"></i></div><b class="${d > 0 ? 'up' : d < 0 ? 'dn' : ''}">${d > 0 ? '+' + d : d < 0 ? '−' + Math.abs(d) : ''}</b>`;
  }).join('');
  const trying = gearTry && !(set[S.gearById(gearTry).slot] && set[S.gearById(gearTry).slot].id === gearTry);
  $('stageName').innerHTML = `${esc(c.name)}<small>Sức mạnh ${S.powerOf(c.id, shown)}${trying ? ' · đang thử ' + esc(S.gearById(gearTry).name) : ''}</small>`;
  $('gearTabs').querySelectorAll('button').forEach((b) => { b.onclick = () => { gearSlot = b.dataset.slot; gearTry = null; Sound.boop(); showPreview(true); renderGear(); }; });
  $('gearList').querySelectorAll('.gear-item').forEach((row) => {
    const id = row.dataset.item, g = S.gearById(id);
    row.onclick = () => { gearTry = id; Sound.boop(); showPreview(true); renderGear(); };
    const b = row.querySelector('button');
    b.onclick = (ev) => {
      ev.stopPropagation(); Sound.boop(); gearTry = null;
      if (b.dataset.act === 'buy') Net.send({ t: 'buyGear', id }); else Net.send({ t: 'equip', slot: g.slot, id: b.dataset.act === 'on' ? id : null });
    };
  });
}

'''
CSS='''
/* ---- gear / shop */
.menu-row{grid-template-columns:repeat(6,1fr)}
@media (max-width:640px){.menu-row{grid-template-columns:repeat(3,1fr)}}
.gear-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:2px 0 8px}
#gearTabs{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin-bottom:10px}
#gearTabs button{position:relative;border:0;border-radius:12px;padding:8px 2px;font-family:var(--display);font-weight:800;font-size:13px;color:#fff;background:rgba(255,255,255,.1);cursor:pointer}
#gearTabs button.on{background:linear-gradient(180deg,#ffd76a,#ffb531);color:#3b2a00}
#gearTabs .has{position:absolute;top:4px;right:5px;width:7px;height:7px;border-radius:50%;background:#5fe08a}
.gear-item{display:flex;align-items:center;gap:10px;padding:9px 10px;margin-bottom:7px;border-radius:14px;background:var(--card,rgba(255,255,255,.08));border:2px solid transparent;cursor:pointer}
.gear-item.try{border-color:rgba(255,255,255,.55)}.gear-item.worn{border-color:#5fe08a}
.gear-item .sw{flex:none;width:30px;height:30px;border-radius:9px;border:2px solid rgba(255,255,255,.6);box-shadow:inset 0 -4px 0 rgba(0,0,0,.18)}
.gear-item .gi{flex:1;min-width:0}.gear-item .gi small{display:block;opacity:.8;font-size:12px;line-height:1.25;margin-top:2px}
.gear-item .rar{margin-left:7px;font-size:11px;font-weight:800;opacity:.9}
.gear-item.r0 .rar{color:#cfd3ff}.gear-item.r1 .rar{color:#7fc4ff}.gear-item.r2 .rar{color:#e3a3ff}
.gear-item .mods{display:flex;flex-wrap:wrap;gap:4px;margin-top:3px}
.gear-item .mods em{font-style:normal;font-size:12px;font-weight:800;padding:1px 7px;border-radius:999px}
.mods .up,.bars b.up{color:#7ff0a8}.mods .dn,.bars b.dn{color:#ff9c9c}
.mods .up{background:rgba(95,224,138,.16)}.mods .dn{background:rgba(255,120,120,.16)}
.gear-item .pill{flex:none}.gear-item .pill.buy{background:linear-gradient(180deg,#ffe08a,#ffb531);color:#3b2a00}
#gearStats{grid-template-columns:auto 1fr 44px}#gearStats b{font-size:12px;text-align:right}
.slot .pw{margin-left:8px;font-size:11px;font-weight:800;opacity:.75}
'''
patch('game.js',[
 # ---- model
 ("function buildCharacter(c, teamColor, scale, hand) {", "function buildCharacter(c, teamColor, scale, hand, gearIds) {\n  const GL = {}; { const set = S.gearSet(gearIds); for (const k in set) GL[k] = set[k].col; }   // worn gear: one colour per slot"),
 ("  const mJersey = toon(teamColor), mTrim = toon(0xffffff), mShorts = toon(shadeHex(teamColor, -0.62)), mKit = toon(V.accent);",
  "  const mJersey = toon(teamColor), mTrim = toon(0xffffff), mShorts = toon(GL.shorts !== undefined ? GL.shorts : shadeHex(teamColor, -0.62)), mKit = toon(GL.shirt !== undefined ? GL.shirt : V.accent);\n  const mShoe = GL.shoes !== undefined ? toon(GL.shoes) : mTrim, mWristG = GL.wrist !== undefined ? toon(GL.wrist) : null;"),
 ("      const shoe = add(new THREE.SphereGeometry(0.1, 18, 12), mTrim, 0, -0.02, fz, ankle);", "      const shoe = add(new THREE.SphereGeometry(0.1, 18, 12), mShoe, 0, -0.02, fz, ankle);"),
 ("      const toe = add(new THREE.SphereGeometry(0.06, 10, 8), mTrim, 0, -0.035, fz + 0.1 * P.foot, ankle);", "      const toe = add(new THREE.SphereGeometry(0.06, 10, 8), mShoe, 0, -0.035, fz + 0.1 * P.foot, ankle);"),
 ("noOL(add(new THREE.CylinderGeometry(0.05, 0.05, 0.016, 14), mKit, 0, y, 0, wg));", "noOL(add(new THREE.CylinderGeometry(0.05, 0.05, 0.016, 14), mWristG || mKit, 0, y, 0, wg));"),
 ("V.wrist === 'tape' ? 0.06 : 0.04, 14), V.wrist === 'tape' ? mTrim : mKit, 0,", "V.wrist === 'tape' ? 0.06 : 0.04, 14), mWristG || (V.wrist === 'tape' ? mTrim : mKit), 0,"),
 ("  const frame = add(new THREE.TorusGeometry(0.15, 0.016, 8, 32), toon(0x2f2f3a), 0, -0.71, 0, wrist);", "  const frame = add(new THREE.TorusGeometry(0.15, 0.016, 8, 32), toon(GL.racket !== undefined ? GL.racket : 0x2f2f3a), 0, -0.71, 0, wrist);"),
 ("  const headGear = buildHeadGear(V.gear, teamColor, V.accent, P, fy, V.gearAt);", "  const headGear = GL.head !== undefined ? buildHeadGear(V.gear === 'none' ? 'band' : V.gear, GL.head, GL.head, P, fy, V.gearAt) : buildHeadGear(V.gear, teamColor, V.accent, P, fy, V.gearAt);"),
 # ---- matches
 ("    const model = buildCharacter(charById(a.char), mates.has(a.i) ? 0xff7a59 : 0x6b8cff, PLAYER_SCALE, a.hand);", "    const model = buildCharacter(charById(a.char), mates.has(a.i) ? 0xff7a59 : 0x6b8cff, PLAYER_SCALE, a.hand, a.gear);"),
 ("name: s.name, char: s.char, hand: s.hand, ctrl: s.ctrl, st: S.charStats(s.char),", "name: s.name, char: s.char, hand: s.hand, ctrl: s.ctrl, st: S.charStats(s.char, s.gear), gear: s.gear || [],"),
 ("  const slots = [{ name: profile.name, char: profile.char, ctrl: 'human', assist: settings.assist, hand: settings.hand }];", "  const slots = [{ name: profile.name, char: profile.char, ctrl: 'human', assist: settings.assist, hand: settings.hand, gear: myGear() }];"),
 # ---- preview + screens
 ("    preview = buildCharacter(charById(id), 0xff7a59, 1.35, settings.hand);", "    preview = buildCharacter(charById(id), 0xff7a59, 1.35, settings.hand, screen === 'gear' ? previewGear() : id === profile.char ? myGear() : []);"),
 ("const SCREENS = ['home', 'bot', 'tour', 'chars', 'rewards',", "const SCREENS = ['home', 'bot', 'tour', 'chars', 'gear', 'rewards',"),
 ("ach: renderAch, rewards: renderRewards,", "ach: renderAch, gear: renderGear, rewards: renderRewards,"),
 ("  screen = name; renderRejoin();", "  screen = name; gearTry = null; renderRejoin();"),
 ("// ================================================================ economy (the server owns every number", UI+"// ================================================================ economy (the server owns every number"),
 ("  wallet = { gold: msg.gold, owned: msg.owned, prices: msg.prices, login: msg.login, quests: msg.quests, localLeft: msg.localLeft };", "  wallet = { gold: msg.gold, owned: msg.owned, prices: msg.prices, login: msg.login, quests: msg.quests, localLeft: msg.localLeft, items: msg.items || [], equip: msg.equip || {} };"),
 ("  else if (b) toast(b.why, '', 'lock');\n", "  else if (b) toast(b.why, '', 'lock');\n  const bg = msg.boughtGear;\n  if (bg && bg.ok) { Sound.ach(); toast(bg.why, '−' + bg.spent + ' vàng · đã mặc', 'check'); } else if (bg) toast(bg.why, '', 'lock');\n"),
 ("  if (screen === 'chars') renderChars();\n}", "  if (screen === 'chars') renderChars();\n  if (screen === 'gear') { renderGear(); showPreview(true); }\n  if (screen === 'home') { const c = charById(profile.char); $('homeChar').textContent = c.name + ' · ' + c.kind + ' · Sức mạnh ' + S.powerOf(c.id, myGear()); }\n}"),
 ("${esc(s.name)}${mine ? ' (bạn)<span class=\"chg\">đổi</span>' : ''}", "${esc(s.name)}${mine ? ' (bạn)<span class=\"chg\">đổi</span>' : ''}${s.power ? `<span class=\"pw\">${s.power}</span>` : ''}"),
])
patch('index.html',[
 ("        <button class=\"mini-btn\" data-go=\"ach\">", "        <button class=\"mini-btn\" data-go=\"gear\"><i><svg class=\"ico\" aria-hidden=\"true\"><use href=\"#i-shirt\"/></svg></i><span>Trang bị</span></button>\n        <button class=\"mini-btn\" data-go=\"ach\">"),
 ("  <section id=\"s-rewards\" class=\"screen hidden\">", "  <section id=\"s-gear\" class=\"screen stage hidden\">\n    <div class=\"panel side\">\n      <header><button class=\"back\" data-go=\"home\">‹</button><h2>Trang bị</h2></header>\n      <div class=\"gear-head\"><span class=\"gold-chip\"><i class=\"coin\"></i><b id=\"gearGold\">…</b></span><small class=\"tiny\">Bấm một món để thử lên nhân vật</small></div>\n      <div id=\"gearTabs\"></div>\n      <div id=\"gearList\"></div>\n      <div class=\"char-info\"><div class=\"bars\" id=\"gearStats\"></div></div>\n    </div>\n  </section>\n\n  <section id=\"s-rewards\" class=\"screen hidden\">"),
])
patch('style.css',[],append=CSS)
print('gear client ok')
