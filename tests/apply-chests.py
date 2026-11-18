# One-off patch: diamonds (second currency) and chests that drop a random gear item the player does not own yet.
from pathlib import Path
import os; os.chdir(Path(__file__).resolve().parents[1])
def patch(name, pairs):
    s = open(name, encoding='utf-8', newline='').read()
    for old, new in pairs:
        for eol in ('\n', '\r\n'):
            o = old.replace('\n', eol)
            if s.count(o) == 1: s = s.replace(o, new.replace('\n', eol)); break
        else: raise AssertionError((name, old[:80]))
    open(name, 'w', encoding='utf-8', newline='').write(s)
patch('economy.js', [
 ("const QUESTS = [", "// diamonds: the second currency. Earned by winning online (verified), winning the tournament (once a day) and the 7th login day.\n"
  "const GEM_ONLINE_WIN = 1, GEM_CHAMP = 10, GEM_STREAK7 = 5;\n"
  "// chests: a random item the player does not own yet; odds = chance in % of a common / rare / epic item. gold or gems 0 = cannot be paid that way.\n"
  "const CHESTS = [\n  { id: 'c0', name: 'Rương Thường', gold: 250, gems: 0, odds: [78, 20, 2] },\n  { id: 'c1', name: 'Rương Hiếm', gold: 900, gems: 10, odds: [0, 78, 22] },\n  { id: 'c2', name: 'Rương Sử thi', gold: 0, gems: 30, odds: [0, 0, 100] },\n];\n"
  "function openChest(p, id, pay, now, rnd) {\n  const e = ensure(p, now), c = CHESTS.find((x) => x.id === id), gems = pay === 'gems', R = rnd || Math.random;\n"
  "  const price = c ? (gems ? c.gems : c.gold) : 0;\n  if (!c || !price) return { ok: false, why: 'Không mở được rương này' };\n"
  "  if ((gems ? e.gems : e.gold) < price) return { ok: false, why: gems ? 'Chưa đủ kim cương (thiếu ' + (price - e.gems) + ')' : 'Chưa đủ vàng (thiếu ' + (price - e.gold) + ')' };\n"
  "  const left = Sim.GEAR.filter((g) => !e.items.includes(g.id));\n  if (!left.length) return { ok: false, why: 'Bạn đã có đủ mọi món đồ rồi' };\n"
  "  const r = R() * 100, rar = r < c.odds[0] ? 0 : r < c.odds[0] + c.odds[1] ? 1 : 2;\n"
  "  let pool = []; for (const k of [rar, 2, 1, 0]) { pool = left.filter((g) => g.rar === k); if (pool.length) break; }   // that rarity is complete: the next better one, then lower\n"
  "  const g = pool[Math.min(pool.length - 1, Math.floor(R() * pool.length))];\n"
  "  if (gems) e.gems -= price; else e.gold -= price; e.items.push(g.id);\n"
  "  return { ok: true, chest: c.id, item: g.id, rar: g.rar, spent: price, pay: gems ? 'gems' : 'gold' };\n}\n"
  "const QUESTS = ["),
 ("  if (!e.items) e.items = [];\n", "  if (!e.items) e.items = [];\n  if (typeof e.gems !== 'number') e.gems = 0;\n"),
 ("    t: 'wallet', gold: e.gold,", "    t: 'wallet', gold: e.gold, gems: e.gems, chests: CHESTS, gemRules: { online: GEM_ONLINE_WIN, champ: GEM_CHAMP, streak7: GEM_STREAK7 },"),
 ("  e.gold += gold; progress(e, win, true);\n  return { gold, why:", "  e.gold += gold; progress(e, win, true); const gems = win ? GEM_ONLINE_WIN : 0; e.gems += gems;\n  return { gold, gems, why:"),
 ("  e.local.gold += gold; e.gold += gold;\n  return { gold, why:", "  e.local.gold += gold; e.gold += gold;\n  let gems = 0; if (msg.champ && win && e.champDay !== dayOf(now)) { e.champDay = dayOf(now); gems = GEM_CHAMP; e.gems += gems; }   // tournament title: once a day\n  return { gold, gems, why:"),
 ("  const gold = LOGIN_REWARDS[streak - 1]; e.gold += gold;\n  return { gold, why:", "  const gold = LOGIN_REWARDS[streak - 1]; e.gold += gold; const gems = streak === 7 ? GEM_STREAK7 : 0; e.gems += gems;\n  return { gold, gems, why:"),
 ("module.exports = { buyGear,", "module.exports = { openChest, CHESTS, GEM_ONLINE_WIN, GEM_CHAMP, GEM_STREAK7, buyGear,"),
])
patch('server.js', [
 ("  buyGear(c, msg) {", "  openChest(c, msg) { const p = data.players[c.id], chest = Eco.openChest(p, clean(msg.id, 4), msg.pay === 'gems' ? 'gems' : 'gold', Date.now()); save(); send(c, Object.assign(Eco.view(p, Date.now()), { chest })); },\n  buyGear(c, msg) {"),
])
SHOPC = r"""  if (gearSlot === 'chests') {   // chests: a random item you do not own yet
    const gems = wallet ? wallet.gems || 0 : 0, tot = S.GEAR.length, have = items.length, gr = (wallet && wallet.gemRules) || {};
    $('gearList').innerHTML = !wallet ? '<p class="tiny">Đang kết nối máy chủ… Cửa hàng cần có mạng.</p>' : (wallet.chests || []).map((ch, i) => {
      const od = ch.odds.map((o, k) => o ? `<em class="r${k}">${S.GEAR_RARITY[k]} ${o}%</em>` : '').join('');
      return `<div class="gear-item chest-row r${i}" data-chest="${ch.id}"><span class="chest t${i}"><i></i></span><div class="gi"><b>${esc(ch.name)}</b><div class="mods">${od}</div><small>Ra một món bạn chưa có.</small></div><div class="chest-pay">` +
        (ch.gold ? `<button class="pill buy" data-pay="gold" ${gold >= ch.gold ? '' : 'disabled'}><i class="coin"></i>${ch.gold}</button>` : '') +
        (ch.gems ? `<button class="pill buy gem" data-pay="gems" ${gems >= ch.gems ? '' : 'disabled'}><i class="gem"></i>${ch.gems}</button>` : '') + '</div></div>';
    }).join('') + `<p class="tiny shop-hint">Bạn đang có ${have}/${tot} món. Kim cương: thắng online +${gr.online || 1}, vô địch Giải đấu +${gr.champ || 10} (mỗi ngày một lần), đăng nhập ngày thứ 7 +${gr.streak7 || 5}.</p>`;
    $('stageName').innerHTML = `${esc(c.name)}<small>Sức mạnh ${S.powerOf(c.id, shown)}</small>`;
    $('gearList').querySelectorAll('.chest-row button').forEach((b) => { b.onclick = () => { Sound.boop(); Net.send({ t: 'openChest', id: b.closest('.chest-row').dataset.chest, pay: b.dataset.pay }); }; });
    return;
  }
"""
POP = r"""// chest opened: show what came out, with a button to wear it at once
function chestPop(ch) {
  const it = S.gearById(ch.item); if (!it) return;
  let el = $('chestPop'); if (!el) { el = document.createElement('div'); el.id = 'chestPop'; document.body.appendChild(el); }
  el.className = 'chest-pop r' + it.rar;
  el.innerHTML = `<div class="cp-card"><small>Bạn nhận được</small><div class="cp-ic">${gearIconImg(it.id)}</div><b>${esc(it.name)}</b><span class="rar">${S.GEAR_RARITY[it.rar]}</span><div class="mods">${gearModChips(it.mods)}</div>` +
    `<div class="cp-btn"><button class="cta" id="cpWear">Mặc ngay</button><button class="pill" id="cpClose">Đóng</button></div></div>`;
  const close = () => { el.className = 'chest-pop hidden'; };
  $('cpClose').onclick = () => { Sound.boop(); close(); };
  $('cpWear').onclick = () => { Sound.boop(); Net.send({ t: 'equip', slot: it.slot, id: it.id }); close(); };
}
"""
patch('game.js', [
 ("localLeft: msg.localLeft, items: msg.items || [], equip: msg.equip || {} };", "localLeft: msg.localLeft, items: msg.items || [], equip: msg.equip || {}, gems: msg.gems || 0, chests: msg.chests || [], gemRules: msg.gemRules || {} };\n  document.querySelectorAll('.gemN').forEach((b) => { b.textContent = wallet.gems; });"),
 ("  const b = msg.bought;\n", "  if (g && g.gems > 0) { if (!$('over').classList.contains('hidden')) $('overAch').insertAdjacentHTML('afterbegin', `<div class=\"toast\"><i class=\"gem\"></i>+${g.gems} kim cương</div>`); else toast('+' + g.gems + ' kim cương', g.why, 'star'); }\n"
  "  const ch = msg.chest; if (ch && ch.ok) { Sound.ach(); chestPop(ch); } else if (ch) toast(ch.why, '', 'lock');\n  const b = msg.bought;\n"),
 ("function onWallet(msg) {\n", POP + "function onWallet(msg) {\n"),
 ("Net.send({ t: 'localResult', win: won, diff: session.localOpts ? session.localOpts.diff : 0, dur: Math.round(m.clock || 0) });", "Net.send({ t: 'localResult', win: won, champ: !!champ, diff: session.localOpts ? session.localOpts.diff : 0, dur: Math.round(m.clock || 0) });"),
 ("  $('gearTabs').innerHTML = [['sets', 'Bộ đồ']].concat(S.GEAR_SLOTS)", "  $('gearTabs').innerHTML = [['chests', 'Rương'], ['sets', 'Bộ đồ']].concat(S.GEAR_SLOTS)"),
 ("  if (gearSlot === 'sets') {   // outfit sets:", SHOPC + "  if (gearSlot === 'sets') {   // outfit sets:"),
 ("  if (gearSlot === 'sets') gearSlot = 'head';\n", "  if (gearSlot === 'sets' || gearSlot === 'chests') gearSlot = 'head';\n"),
 ("gearSlot === 'sets' ? [1.05, 5.3] :", "gearSlot === 'sets' || gearSlot === 'chests' ? [1.05, 5.3] :"),
])
patch('index.html', [
 ('<span class="gold-chip"><i class="coin"></i><b id="homeGold">…</b></span>', '<span class="gold-chip"><i class="coin"></i><b id="homeGold">…</b></span><span class="gold-chip gem-chip"><i class="gem"></i><b class="gemN">0</b></span>'),
 ('<span class="gold-chip"><i class="coin"></i><b id="gearGold">…</b></span>', '<span class="gold-chip"><i class="coin"></i><b id="gearGold">…</b></span><span class="gold-chip gem-chip"><i class="gem"></i><b class="gemN">0</b></span>'),
])
patch('style.css', [
 ("#gearTabs{grid-template-columns:repeat(5,1fr)}\n", "#gearTabs{grid-template-columns:repeat(6,1fr)}#gearTabs button{font-size:12px;padding:8px 1px}\n"
  ".gem{display:inline-block;width:14px;height:14px;margin-right:5px;vertical-align:-2px;transform:rotate(45deg);border-radius:3px;background:linear-gradient(135deg,#d6fbff,#4fd6ff 45%,#2a7fe0);box-shadow:inset -2px -2px 0 rgba(0,0,0,.18)}\n"
  ".gem-chip{margin-left:6px}.pill.buy.gem{background:linear-gradient(180deg,#7fe3ff,#2f8fe8);color:#04233f}\n"
  ".chest{flex:none;position:relative;width:66px;height:54px;border-radius:9px 9px 7px 7px;border:3px solid #2a1d18;background:linear-gradient(180deg,var(--c1) 0 40%,#2a1d18 40% 46%,var(--c2) 46%);box-shadow:0 4px 0 rgba(0,0,0,.3)}\n"
  ".chest:before,.chest:after{content:'';position:absolute;top:0;bottom:0;width:7px;background:var(--c3)}.chest:before{left:8px}.chest:after{right:8px}\n"
  ".chest i{position:absolute;left:50%;top:34%;width:14px;height:17px;margin-left:-7px;border-radius:3px;background:var(--c3);border:2px solid #2a1d18;z-index:1}\n"
  ".chest.t0{--c1:#b9824a;--c2:#8a5a2b;--c3:#c9d2e0}.chest.t1{--c1:#4f9bff;--c2:#2a5fc4;--c3:#ffd76a}.chest.t2{--c1:#c77dff;--c2:#7a35c9;--c3:#ffd76a;box-shadow:0 0 16px rgba(199,125,255,.8),0 4px 0 rgba(0,0,0,.3)}\n"
  ".chest-row{align-items:center}.chest-row .mods em{font-style:normal;font-size:11px;font-weight:800;padding:1px 6px;border-radius:999px;background:rgba(0,0,0,.25);color:var(--rar)}.chest-pay{display:flex;flex-direction:column;gap:5px;flex:none}\n"
  ".chest-pop{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(8,10,40,.72)}.chest-pop.hidden{display:none}\n"
  ".cp-card{width:min(320px,86vw);padding:18px 16px 14px;border-radius:22px;border:3px solid var(--rar);background:linear-gradient(180deg,#2c3186,#1b1d5c);color:#fff;text-align:center;box-shadow:0 0 40px var(--rar),0 16px 40px rgba(0,0,0,.5);animation:cpIn .35s cubic-bezier(.2,1.5,.4,1)}\n"
  ".cp-ic{width:150px;height:150px;margin:8px auto;border-radius:20px;background:var(--rar-bg);border:3px solid var(--rar);padding:6px}.cp-card b{display:block;font-family:var(--display);font-size:22px}.cp-card .rar{color:var(--rar);font-weight:800;font-size:13px}\n"
  ".cp-card .mods{display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin:8px 0}.cp-card .mods em{font-style:normal;font-size:12px;font-weight:800;padding:1px 7px;border-radius:999px}.cp-btn{display:flex;gap:8px;align-items:center;margin-top:10px}.cp-btn .cta{flex:1;margin:0;font-size:18px;padding:10px}\n"
  "@keyframes cpIn{from{transform:scale(.6);opacity:0}}\n"),
])
print('ok')
