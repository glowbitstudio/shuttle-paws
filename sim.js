/* Shuttle Paws — shared match simulation (browser + Node). Pure logic, no rendering. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SPSim = factory();
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';

const DT = 1 / 120;
// PACE speeds the shuttle up without changing the shape of its flight: speeds x PACE, gravity x PACE^2,
// wind x PACE (drag is per unit speed^2 so it scales on its own). Every shot arrives PACE times sooner.
const PACE = 1.2;
const G = 9.8 * PACE * PACE;
const DRAG = 0.125;
const NET_H = 1.55;
const HALF_L = 6.7;
const HALF_W = 2.59;
const DBL_W = 3.05;
const SHORT_LINE = 1.98;
const LONG_SERVE = 0.76;
const SERVE_CLOCK = 25;

// ------------------------------------------------------------------ data
// stats 1..5 : spd speed, jmp jump, pow smash power, rch reach, ctl control, sta stamina.
// Every character's six stats add up to 18: stats give a playstyle, never a stronger character.
const CHARS = [
  { id: 'cat',     name: 'Mướp',     kind: 'Mèo',        face: '🐱', ear: 'cat',   body: 0xa69486, belly: 0xf4ece0, earIn: 0xf0a59b, tail: 'long',  stats: { spd: 3, jmp: 3, pow: 3, rch: 3, ctl: 3, sta: 3 }, desc: 'Cân bằng mọi mặt, dễ chơi.' },
  { id: 'bunny',   name: 'Bông',     kind: 'Thỏ',        face: '🐰', ear: 'bunny', body: 0xe9d3b4, belly: 0xffffff, earIn: 0xf2b8c0, tail: 'puff',  stats: { spd: 5, jmp: 4, pow: 2, rch: 2, ctl: 2, sta: 3 }, desc: 'Chạy nhanh như gió, đập hơi nhẹ.' },
  { id: 'bear',    name: 'Ủn',       kind: 'Gấu',        face: '🐻', ear: 'round', body: 0x6f6a78, belly: 0xf0dcb4, earIn: 0xf0dcb4, tail: 'puff',  stats: { spd: 2, jmp: 2, pow: 5, rch: 4, ctl: 2, sta: 3 }, desc: 'Chậm mà chắc, đập như sấm.' },
  { id: 'panda',   name: 'Tròn',     kind: 'Gấu trúc',   face: '🐼', ear: 'round', body: 0xfafafa, belly: 0xffffff, earIn: 0x2b2b2b, earCol: 0x2b2b2b, patches: true, tail: 'puff', stats: { spd: 2, jmp: 2, pow: 2, rch: 5, ctl: 3, sta: 4 }, desc: 'Tầm với dài, phòng thủ lì.' },
  { id: 'fox',     name: 'Lửa',      kind: 'Cáo',        face: '🦊', ear: 'cat',   body: 0x9a4f30, belly: 0xfff3e4, earIn: 0xfff3e4, tail: 'fox',   stats: { spd: 4, jmp: 3, pow: 3, rch: 2, ctl: 3, sta: 3 }, desc: 'Lắt léo, thích bỏ nhỏ.' },
  { id: 'frog',    name: 'Ộp',       kind: 'Ếch',        face: '🐸', ear: 'frog',  body: 0x3fbf9f, belly: 0xf3f6c4, earIn: 0xffffff, tail: 'none',  stats: { spd: 3, jmp: 5, pow: 4, rch: 2, ctl: 2, sta: 2 }, desc: 'Bật nhảy cực cao, mê đập cầu.' },
  { id: 'penguin', name: 'Lạch Bạch',kind: 'Cánh cụt',   face: '🐧', ear: 'beak',  body: 0x2b3350, belly: 0xffffff, earIn: 0xffa94d, tail: 'none',  stats: { spd: 2, jmp: 2, pow: 3, rch: 4, ctl: 4, sta: 3 }, desc: 'Bình tĩnh, cầm vợt rất chuẩn.' },
  { id: 'duck',    name: 'Quạc',     kind: 'Vịt',        face: '🦆', ear: 'beak',  body: 0xf1e3c2, belly: 0xfbf3df, earIn: 0xff9f43, tail: 'puff',  stats: { spd: 3, jmp: 3, pow: 2, rch: 3, ctl: 4, sta: 3 }, desc: 'Khéo tay, ít khi đánh hỏng.' },
  { id: 'hamster', name: 'Hạt Dẻ',   kind: 'Chuột hamster', face: '🐹', ear: 'round', body: 0xcbbfae, belly: 0xfbf6ee, earIn: 0xe8b4a8, tail: 'none', stats: { spd: 5, jmp: 2, pow: 1, rch: 2, ctl: 3, sta: 5 }, desc: 'Chân ngắn nhưng chạy không biết mệt.', unlock: 'win1' },
  { id: 'dog',     name: 'Đốm',      kind: 'Cún',        face: '🐶', ear: 'floppy',body: 0xfaf2e6, belly: 0xffffff, earIn: 0xa5673c, earCol: 0xa5673c, tail: 'long', stats: { spd: 4, jmp: 2, pow: 3, rch: 3, ctl: 2, sta: 4 }, desc: 'Đuổi theo mọi quả cầu.', unlock: 'matches5' },
  { id: 'sheep',   name: 'Mây',      kind: 'Cừu',        face: '🐑', ear: 'sheep', body: 0xfdfbf7, belly: 0xb3a59b, earIn: 0x97877c, tail: 'puff',  stats: { spd: 3, jmp: 2, pow: 2, rch: 4, ctl: 4, sta: 3 }, desc: 'Mềm như mây, thủ chắc như đá.', unlock: 'perfect10' },
  { id: 'koala',   name: 'Ngủ Gật',  kind: 'Koala',      face: '🐨', ear: 'koala', body: 0xa4b0be, belly: 0xe7ecf1, earIn: 0xf1f2f6, tail: 'none',  stats: { spd: 2, jmp: 3, pow: 3, rch: 3, ctl: 5, sta: 2 }, desc: 'Chậm chạp nhưng không bao giờ run tay.', unlock: 'rally25' },
  { id: 'tiger',   name: 'Vằn',      kind: 'Hổ con',     face: '🐯', ear: 'round', body: 0xf7b733, belly: 0xfff4e6, earIn: 0x2b2b2b, stripes: true, tail: 'long', stats: { spd: 3, jmp: 4, pow: 5, rch: 2, ctl: 1, sta: 3 }, desc: 'Một cú đập là đối thủ chảy nước mắt.', unlock: 'smash10' },
  { id: 'otter',   name: 'Lướt',     kind: 'Rái cá',     face: '🦦', ear: 'round', body: 0x7a5a4c, belly: 0xe6d6c8, earIn: 0x6d4c41, tail: 'long',  stats: { spd: 4, jmp: 2, pow: 2, rch: 4, ctl: 3, sta: 3 }, desc: 'Cứu cầu bằng những cú lao người.', unlock: 'dive5' },
  { id: 'unicorn', name: 'Cầu Vồng', kind: 'Kỳ lân',     face: '🦄', ear: 'unicorn', body: 0xe9defa, belly: 0xffffff, earIn: 0xffa8d8, tail: 'puff', stats: { spd: 4, jmp: 5, pow: 2, rch: 2, ctl: 3, sta: 2 }, desc: 'Lướt trên sân như đang bay.', unlock: 'hardwin' },
  { id: 'dragon',  name: 'Bé Rồng',  kind: 'Rồng con',   face: '🐲', ear: 'dragon',body: 0x3f86b8, belly: 0xfde9c9, earIn: 0xff8a6b, tail: 'long',  stats: { spd: 2, jmp: 3, pow: 5, rch: 3, ctl: 2, sta: 3 }, desc: 'Nhân vật huyền thoại. Đập như phun lửa, hơi chậm chân.', unlock: 'master' },
];
// ---- gear. Every item trades something for something (no pure buffs); rarer items trade on better terms.
// mods are in character-stat points (the same 1..5 scale as CHARS.stats). Net value per item: common +0.25, rare +0.5, epic +0.75.
const GEAR_SLOTS = [['racket', 'Vợt'], ['shoes', 'Giày'], ['shirt', 'Áo'], ['shorts', 'Quần'], ['wrist', 'Băng tay'], ['head', 'Đội đầu'], ['face', 'Kính'], ['neck', 'Cổ'], ['back', 'Lưng']];
const GEAR_RARITY = ['Thường', 'Hiếm', 'Sử thi', 'Huyền thoại'];   // net value of an item: +0.25 / +0.5 / +0.75 / +1
const GEAR = [
  { id: 'r_light', slot: 'racket', rar: 0, price: 300,  col: 0x4fb8e8, name: 'Vợt nhẹ',            mods: { ctl: 0.75, pow: -0.5 }, desc: 'Vung nhanh, đặt cầu chuẩn hơn nhưng đập yếu đi.' },
  { id: 'r_heavy', slot: 'racket', rar: 1, price: 900,  col: 0xd9483b, name: 'Vợt nặng đầu',       mods: { pow: 1, sta: -0.5 }, desc: 'Đập mạnh hẳn, đổi lại tốn sức hơn.' },
  { id: 'r_pro',   slot: 'racket', rar: 2, price: 2200, col: 0xf2c230, name: 'Vợt carbon',         mods: { pow: 0.75, ctl: 0.5, sta: -0.5 }, desc: 'Mạnh và chuẩn, nhưng cứng nên mau mỏi tay.' },
  { id: 's_run',   slot: 'shoes',  rar: 0, price: 300,  col: 0x53c27a, name: 'Giày chạy',          mods: { spd: 0.75, jmp: -0.5 }, desc: 'Đế mỏng: chạy nhanh hơn, bật nhảy kém đi.' },
  { id: 's_spring',slot: 'shoes',  rar: 1, price: 900,  col: 0x8a5cf0, name: 'Giày đệm lò xo',     mods: { jmp: 1, spd: -0.5 }, desc: 'Bật cao, nhưng đế dày nên chạy chậm hơn.' },
  { id: 's_pro',   slot: 'shoes',  rar: 2, price: 2200, col: 0xf2c230, name: 'Giày thi đấu',       mods: { spd: 1, jmp: 0.25, sta: -0.5 }, desc: 'Nhanh và nảy; bó chân nên xuống sức sớm hơn.' },
  { id: 't_cool',  slot: 'shirt',  rar: 0, price: 300,  col: 0x7fd6e8, name: 'Áo lưới thoáng',     mods: { sta: 0.75, pow: -0.5 }, desc: 'Mát, đỡ mệt; vải mỏng nên thiếu lực tì.' },
  { id: 't_comp',  slot: 'shirt',  rar: 1, price: 900,  col: 0x2b2f45, name: 'Áo bó cơ',           mods: { sta: 1, jmp: -0.5 }, desc: 'Giữ sức rất tốt, hơi gò khi bật nhảy.' },
  { id: 't_pro',   slot: 'shirt',  rar: 2, price: 2200, col: 0xf2c230, name: 'Áo thi đấu',         mods: { sta: 1, spd: 0.25, pow: -0.5 }, desc: 'Bền sức và nhẹ; không hợp lối đánh lực.' },
  { id: 'p_light', slot: 'shorts', rar: 0, price: 300,  col: 0xe86a9a, name: 'Quần ngắn nhẹ',      mods: { jmp: 0.75, sta: -0.5 }, desc: 'Dễ bật nhảy, nhưng hở nên mau mất sức.' },
  { id: 'p_flex',  slot: 'shorts', rar: 1, price: 900,  col: 0x3f6fd9, name: 'Quần co giãn',       mods: { spd: 0.5, jmp: 0.5, pow: -0.5 }, desc: 'Di chuyển thoải mái, bớt lực trụ khi đập.' },
  { id: 'p_pro',   slot: 'shorts', rar: 2, price: 2200, col: 0xf2c230, name: 'Quần thi đấu',       mods: { jmp: 1, spd: 0.25, ctl: -0.5 }, desc: 'Bật rất cao; tiếp đất mạnh nên kém khéo.' },
  { id: 'w_band',  slot: 'wrist',  rar: 0, price: 300,  col: 0xffffff, name: 'Băng thấm mồ hôi',   mods: { ctl: 0.75, pow: -0.5 }, desc: 'Tay khô, cầm chắc; hơi cộm khi đập.' },
  { id: 'w_weight',slot: 'wrist',  rar: 1, price: 900,  col: 0x3a3a46, name: 'Băng tạ',            mods: { pow: 1, ctl: -0.5 }, desc: 'Nặng tay: đập mạnh, khó đánh tinh tế.' },
  { id: 'w_pro',   slot: 'wrist',  rar: 2, price: 2200, col: 0xf2c230, name: 'Bao tay thi đấu',    mods: { ctl: 1, rch: 0.25, sta: -0.5 }, desc: 'Cổ tay vững và với xa hơn; bó nên mau mỏi.' },
  { id: 'h_band',  slot: 'head',   rar: 0, price: 300,  col: 0xe8503a, name: 'Khăn buộc đầu',      mods: { sta: 0.75, ctl: -0.5 }, desc: 'Mồ hôi không vào mắt, đỡ mệt; hơi vướng tầm nhìn.' },
  { id: 'h_focus', slot: 'head',   rar: 1, price: 900,  col: 0x2f8f6a, name: 'Mũ lưỡi trai',       mods: { ctl: 1, jmp: -0.5 }, desc: 'Đánh chuẩn hơn; chặt nên ngại bật cao.' },
  { id: 'h_pro',   slot: 'head',   rar: 2, price: 2200, col: 0xf2c230, name: 'Vương miện vô địch', mods: { rch: 0.75, ctl: 0.5, spd: -0.5 }, desc: 'Đọc cầu sớm, với xa; tự tin quá nên chậm chân.' },
  { id: 'e_sport', slot: 'face',   rar: 0, price: 300,  col: 0x4fb8e8, name: 'Kính thể thao',      mods: { ctl: 0.75, rch: -0.5 }, desc: 'Nhìn cầu rõ, đánh chuẩn hơn; dây đeo vướng nên với kém.' },
  { id: 'e_shade', slot: 'face',   rar: 1, price: 900,  col: 0x23262f, name: 'Kính râm',           mods: { spd: 0.5, pow: 0.5, ctl: -0.5 }, desc: 'Ngầu nên chạy hăng, đập hăng; tối nên kém chính xác.' },
  { id: 'e_pro',   slot: 'face',   rar: 2, price: 2200, col: 0xf2c230, name: 'Kính phi công',      mods: { rch: 1, ctl: 0.25, sta: -0.5 }, desc: 'Thấy cầu từ xa, với sớm; căng mắt nên mau mệt.' },
  { id: 'n_towel', slot: 'neck',   rar: 0, price: 300,  col: 0xffffff, name: 'Khăn lau mồ hôi',    mods: { sta: 0.75, spd: -0.5 }, desc: 'Lau khô nhanh, đỡ mệt; vướng cổ nên chạy chậm hơn.' },
  { id: 'n_chain', slot: 'neck',   rar: 1, price: 900,  col: 0x4fd6e0, name: 'Dây chuyền may mắn', mods: { ctl: 0.5, rch: 0.5, pow: -0.5 }, desc: 'Bình tĩnh và với xa hơn; ngại đập hết lực.' },
  { id: 'n_medal', slot: 'neck',   rar: 2, price: 2200, col: 0xf2c230, name: 'Huy chương vàng',    mods: { pow: 1, rch: 0.25, jmp: -0.5 }, desc: 'Khí thế nhà vô địch; nặng cổ nên bật kém hơn.' },
  { id: 'n_bell',  slot: 'neck',   rar: 0, price: 300,  col: 0xe8503a, name: 'Vòng cổ chuông',     mods: { spd: 0.75, ctl: -0.5 }, desc: 'Chuông reo rộn ràng, chạy hăng; leng keng nên mất tập trung.' },
  { id: 'n_bow',   slot: 'neck',   rar: 1, price: 900,  col: 0x8a5cf0, name: 'Nơ cổ',              mods: { ctl: 0.5, jmp: 0.5, pow: -0.5 }, desc: 'Lịch lãm: khéo và nhẹ chân; ngại đập mạnh.' },
  { id: 'n_pearl', slot: 'neck',   rar: 2, price: 2200, col: 0xfff6ee, name: 'Vòng ngọc trai',     mods: { sta: 0.75, ctl: 0.5, pow: -0.5 }, desc: 'Thư thái, bền sức và khéo; quý quá nên không dám đập hết lực.' },
  { id: 'b_pack',  slot: 'back',   rar: 0, price: 300,  col: 0x2fa8a0, name: 'Balo nước',          mods: { sta: 0.75, jmp: -0.5 }, desc: 'Luôn có nước uống; đeo balo nên khó bật cao.' },
  { id: 'b_bag',   slot: 'back',   rar: 1, price: 900,  col: 0xd9483b, name: 'Túi vợt dự phòng',   mods: { pow: 1, spd: -0.5 }, desc: 'Vợt căng dây mới, đập mạnh; nặng lưng nên chậm chân.' },
  { id: 'b_wings', slot: 'back',   rar: 2, price: 2200, col: 0xfff3c4, name: 'Đôi cánh nhỏ',       mods: { jmp: 1, spd: 0.25, ctl: -0.5 }, desc: 'Bật cao như bay; đà lớn nên khó đánh tinh tế.' },
  { id: 'bc_head', slot: 'head', set: 'beach', rar: 0, price: 300, col: 0xf2d28a, name: 'Mũ rơm', mods: { sta: 0.75, jmp: -0.5 }, desc: 'Che nắng, đỡ mệt; vành rộng nên ngại bật cao.' },
  { id: 'bc_shirt', slot: 'shirt', set: 'beach', rar: 0, price: 300, col: 0x2ec4b6, name: 'Áo hoa đi biển', mods: { spd: 0.75, pow: -0.5 }, desc: 'Mát và nhẹ, chạy nhanh; vải mỏng nên thiếu lực.' },
  { id: 'bc_pants', slot: 'shorts', set: 'beach', rar: 0, price: 300, col: 0xff8a3d, name: 'Quần bơi', mods: { jmp: 0.75, ctl: -0.5 }, desc: 'Thoải mái bật nhảy; trơn nên kém khéo.' },
  { id: 'bc_shoes', slot: 'shoes', set: 'beach', rar: 0, price: 300, col: 0xffd23f, name: 'Dép quai hậu', mods: { ctl: 0.75, spd: -0.5 }, desc: 'Bám sân, đứng vững; dép nên chạy chậm.' },
  { id: 'bc_back', slot: 'back', set: 'beach', rar: 0, price: 300, col: 0xff5e7a, name: 'Phao bơi', mods: { sta: 0.75, spd: -0.5 }, desc: 'Vui là khỏe; vướng hông nên chậm chân.' },
  { id: 'nj_head', slot: 'head', set: 'ninja', rar: 1, price: 900, col: 0x2b2f45, name: 'Khăn trùm ninja', mods: { spd: 1, sta: -0.5 }, desc: 'Nhẹ đầu, lướt nhanh; bí nên mau mệt.' },
  { id: 'nj_shirt', slot: 'shirt', set: 'ninja', rar: 1, price: 900, col: 0x2b2f45, name: 'Áo ninja', mods: { ctl: 0.5, spd: 0.5, pow: -0.5 }, desc: 'Gọn gàng, nhanh và khéo; không hợp đập lực.' },
  { id: 'nj_pants', slot: 'shorts', set: 'ninja', rar: 1, price: 900, col: 0x23263a, name: 'Quần ninja', mods: { spd: 0.5, jmp: 0.5, sta: -0.5 }, desc: 'Bó gọn, nhanh và bật tốt; bó nên mau mỏi.' },
  { id: 'nj_shoes', slot: 'shoes', set: 'ninja', rar: 1, price: 900, col: 0x2b2f45, name: 'Giày ninja', mods: { spd: 1, pow: -0.5 }, desc: 'Êm như mèo, chạy rất nhanh; đế mềm nên trụ yếu.' },
  { id: 'nj_back', slot: 'back', set: 'ninja', rar: 1, price: 900, col: 0x8a2f2f, name: 'Kiếm gỗ', mods: { pow: 1, ctl: -0.5 }, desc: 'Khí thế kiếm sĩ, đập mạnh; vướng lưng nên kém khéo.' },
  { id: 'pr_head', slot: 'head', set: 'pirate', rar: 1, price: 900, col: 0x2a2430, name: 'Mũ thuyền trưởng', mods: { pow: 1, spd: -0.5 }, desc: 'Oai phong, đập mạnh; mũ to nên chậm chân.' },
  { id: 'pr_shirt', slot: 'shirt', set: 'pirate', rar: 1, price: 900, col: 0xfff6e8, name: 'Áo sọc thủy thủ', mods: { sta: 1, ctl: -0.5 }, desc: 'Dẻo dai như dân đi biển; rộng nên kém khéo.' },
  { id: 'pr_pants', slot: 'shorts', set: 'pirate', rar: 1, price: 900, col: 0x7a5230, name: 'Quần ống rộng', mods: { pow: 0.5, sta: 0.5, jmp: -0.5 }, desc: 'Trụ vững, bền sức; rộng nên khó bật.' },
  { id: 'pr_shoes', slot: 'shoes', set: 'pirate', rar: 1, price: 900, col: 0x5a3d22, name: 'Bốt da', mods: { pow: 1, jmp: -0.5 }, desc: 'Trụ chắc, đập mạnh; nặng nên bật kém.' },
  { id: 'pr_back', slot: 'back', set: 'pirate', rar: 1, price: 900, col: 0x8a5a2b, name: 'Rương kho báu', mods: { rch: 1, spd: -0.5 }, desc: 'Tham nên với rất xa; nặng lưng nên chậm chân.' },
  { id: 'as_head', slot: 'head', set: 'astro', rar: 2, price: 2200, col: 0xf4f6fa, name: 'Mũ phi hành gia', mods: { jmp: 1, rch: 0.25, ctl: -0.5 }, desc: 'Bật như không trọng lực; kính dày nên kém khéo.' },
  { id: 'as_shirt', slot: 'shirt', set: 'astro', rar: 2, price: 2200, col: 0xf4f6fa, name: 'Áo du hành', mods: { sta: 1, jmp: 0.25, pow: -0.5 }, desc: 'Có bình dưỡng khí, rất bền sức; cồng kềnh nên đập yếu.' },
  { id: 'as_pants', slot: 'shorts', set: 'astro', rar: 2, price: 2200, col: 0xf4f6fa, name: 'Quần du hành', mods: { jmp: 1, sta: 0.25, spd: -0.5 }, desc: 'Bật cao; dày nên chạy chậm.' },
  { id: 'as_shoes', slot: 'shoes', set: 'astro', rar: 2, price: 2200, col: 0xdfe5ee, name: 'Giày mặt trăng', mods: { jmp: 1, ctl: 0.25, spd: -0.5 }, desc: 'Đế nảy như trên mặt trăng; to nên chậm chân.' },
  { id: 'as_back', slot: 'back', set: 'astro', rar: 2, price: 2200, col: 0x4f8fe8, name: 'Ba lô phản lực', mods: { spd: 1, jmp: 0.25, ctl: -0.5 }, desc: 'Phóng vèo vèo; đà lớn nên khó đánh tinh tế.' },
  { id: 'ry_head', slot: 'head', set: 'royal', rar: 2, price: 2200, col: 0xf2c230, name: 'Vương miện hoàng gia', mods: { ctl: 1, rch: 0.25, spd: -0.5 }, desc: 'Điềm tĩnh, chính xác; nặng đầu nên chậm chân.' },
  { id: 'ry_shirt', slot: 'shirt', set: 'royal', rar: 2, price: 2200, col: 0x6a3fd0, name: 'Áo hoàng tộc', mods: { ctl: 1, sta: 0.25, pow: -0.5 }, desc: 'Thanh lịch, đánh rất khéo; không hợp đập lực.' },
  { id: 'ry_pants', slot: 'shorts', set: 'royal', rar: 2, price: 2200, col: 0xfff6ee, name: 'Quần hoàng tộc', mods: { sta: 1, jmp: 0.25, pow: -0.5 }, desc: 'Ung dung cả trận không mỏi; không quen dùng sức.' },
  { id: 'ry_shoes', slot: 'shoes', set: 'royal', rar: 2, price: 2200, col: 0xf2c230, name: 'Giày nạm vàng', mods: { spd: 1, ctl: 0.25, jmp: -0.5 }, desc: 'Bước đi nhẹ mà nhanh; đế cứng nên bật kém.' },
  { id: 'ry_back', slot: 'back', set: 'royal', rar: 2, price: 2200, col: 0xc22a3a, name: 'Áo choàng đỏ', mods: { rch: 1, sta: 0.25, spd: -0.5 }, desc: 'Tung áo choàng, với thật xa; vướng nên chậm chân.' },
  { id: 'hr_head', slot: 'head', set: 'hero', rar: 2, price: 2200, col: 0xe0303a, name: 'Mũ siêu nhân', mods: { pow: 1, jmp: 0.25, sta: -0.5 }, desc: 'Sức mạnh chính nghĩa; hăng quá nên mau mệt.' },
  { id: 'hr_shirt', slot: 'shirt', set: 'hero', rar: 2, price: 2200, col: 0xe0303a, name: 'Áo siêu nhân', mods: { pow: 1, sta: 0.25, ctl: -0.5 }, desc: 'Đập như sấm; mạnh tay nên kém tinh tế.' },
  { id: 'hr_pants', slot: 'shorts', set: 'hero', rar: 2, price: 2200, col: 0x2f5fd9, name: 'Quần siêu nhân', mods: { jmp: 1, pow: 0.25, sta: -0.5 }, desc: 'Bật lên như bay; tốn sức.' },
  { id: 'hr_shoes', slot: 'shoes', set: 'hero', rar: 2, price: 2200, col: 0xffd23f, name: 'Bốt siêu nhân', mods: { jmp: 1, spd: 0.25, ctl: -0.5 }, desc: 'Nảy cao, nhanh hơn một chút; đà lớn nên khó dừng chuẩn.' },
  { id: 'hr_back', slot: 'back', set: 'hero', rar: 2, price: 2200, col: 0x2f5fd9, name: 'Áo choàng xanh', mods: { pow: 1, spd: 0.25, ctl: -0.5 }, desc: 'Bay vào đập cầu; áo bay phần phật nên kém khéo.' },
  { id: 'wn_head', slot: 'head', set: 'winter', rar: 0, price: 300, col: 0xd9483b, name: 'Mũ len', mods: { ctl: 0.75, jmp: -0.5 }, desc: 'Ấm đầu, tỉnh táo; dày nên ngại bật cao.' },
  { id: 'wn_shirt', slot: 'shirt', set: 'winter', rar: 0, price: 300, col: 0x2f8f6a, name: 'Áo len', mods: { sta: 0.75, spd: -0.5 }, desc: 'Ấm người, bền sức; dày nên chạy chậm.' },
  { id: 'wn_pants', slot: 'shorts', set: 'winter', rar: 0, price: 300, col: 0x4a5578, name: 'Quần nỉ', mods: { ctl: 0.75, pow: -0.5 }, desc: 'Ôm chân, bước chuẩn; mềm nên thiếu lực trụ.' },
  { id: 'wn_shoes', slot: 'shoes', set: 'winter', rar: 0, price: 300, col: 0xffffff, name: 'Giày tuyết', mods: { jmp: 0.75, spd: -0.5 }, desc: 'Đế dày nảy tốt; nặng nên chậm chân.' },
  { id: 'wn_back', slot: 'back', set: 'winter', rar: 0, price: 300, col: 0x4fb8e8, name: 'Ván trượt tuyết', mods: { spd: 0.75, ctl: -0.5 }, desc: 'Máu tốc độ; vướng lưng nên kém khéo.' },
  { id: 'cb_head', slot: 'head', set: 'cowboy', rar: 1, price: 900, col: 0x9a6a3a, name: 'Mũ cao bồi', mods: { rch: 1, jmp: -0.5 }, desc: 'Mắt tinh, với xa; vành to nên ngại bật.' },
  { id: 'cb_shirt', slot: 'shirt', set: 'cowboy', rar: 1, price: 900, col: 0xc94f3a, name: 'Áo ghi-lê', mods: { sta: 0.5, pow: 0.5, ctl: -0.5 }, desc: 'Dẻo dai và khỏe; phóng khoáng nên kém tỉ mỉ.' },
  { id: 'cb_pants', slot: 'shorts', set: 'cowboy', rar: 1, price: 900, col: 0x3f6fd9, name: 'Quần bò', mods: { sta: 1, jmp: -0.5 }, desc: 'Bền bỉ; vải cứng nên khó bật.' },
  { id: 'cb_shoes', slot: 'shoes', set: 'cowboy', rar: 1, price: 900, col: 0x7a5230, name: 'Bốt cao bồi', mods: { pow: 1, spd: -0.5 }, desc: 'Trụ chắc, đập mạnh; gót cao nên chạy chậm.' },
  { id: 'cb_back', slot: 'back', set: 'cowboy', rar: 1, price: 900, col: 0xd9b36a, name: 'Cuộn dây thừng', mods: { rch: 1, pow: -0.5 }, desc: 'Quăng dây quen tay nên với xa; nhẹ tay khi đập.' },
  { id: 'ch_head', slot: 'head', set: 'chef', rar: 1, price: 900, col: 0xffffff, name: 'Mũ đầu bếp', mods: { ctl: 1, spd: -0.5 }, desc: 'Tỉ mỉ từng li; mũ cao nên chậm chân.' },
  { id: 'ch_shirt', slot: 'shirt', set: 'chef', rar: 1, price: 900, col: 0xffffff, name: 'Áo bếp', mods: { ctl: 0.5, sta: 0.5, pow: -0.5 }, desc: 'Khéo tay và quen đứng lâu; không quen đập mạnh.' },
  { id: 'ch_pants', slot: 'shorts', set: 'chef', rar: 1, price: 900, col: 0x3a3a46, name: 'Quần ca rô', mods: { sta: 1, jmp: -0.5 }, desc: 'Đứng bếp cả ngày không mỏi; rộng nên khó bật.' },
  { id: 'ch_shoes', slot: 'shoes', set: 'chef', rar: 1, price: 900, col: 0x2b2f45, name: 'Giày bếp', mods: { ctl: 1, jmp: -0.5 }, desc: 'Chống trượt, đứng vững; đế bẹt nên bật kém.' },
  { id: 'ch_back', slot: 'back', set: 'chef', rar: 1, price: 900, col: 0x3a3a46, name: 'Chảo rán', mods: { pow: 1, spd: -0.5 }, desc: 'Vung chảo quen tay nên đập mạnh; nặng lưng.' },
  { id: 'wz_head', slot: 'head', set: 'wizard', rar: 2, price: 2200, col: 0x4b2a9a, name: 'Mũ phù thủy', mods: { rch: 1, ctl: 0.25, jmp: -0.5 }, desc: 'Đoán trước đường cầu; mũ cao nên ngại bật.' },
  { id: 'wz_shirt', slot: 'shirt', set: 'wizard', rar: 2, price: 2200, col: 0x4b2a9a, name: 'Áo sao đêm', mods: { ctl: 1, rch: 0.25, pow: -0.5 }, desc: 'Điều cầu như có phép; không hợp đập lực.' },
  { id: 'wz_pants', slot: 'shorts', set: 'wizard', rar: 2, price: 2200, col: 0x2f2466, name: 'Quần pháp sư', mods: { sta: 1, ctl: 0.25, spd: -0.5 }, desc: 'Thong thả, bền sức; rộng nên chậm chân.' },
  { id: 'wz_shoes', slot: 'shoes', set: 'wizard', rar: 2, price: 2200, col: 0x7a4fd6, name: 'Giày mũi cong', mods: { rch: 1, jmp: 0.25, spd: -0.5 }, desc: 'Bước dài kỳ lạ; mũi cong nên chạy chậm.' },
  { id: 'wz_back', slot: 'back', set: 'wizard', rar: 2, price: 2200, col: 0x6a3fd0, name: 'Áo choàng tím', mods: { ctl: 1, sta: 0.25, jmp: -0.5 }, desc: 'Bình tĩnh tuyệt đối; áo dài nên khó bật.' },
  { id: 'dv_head', slot: 'head', set: 'diver', rar: 0, price: 300, col: 0x23b5c9, name: 'Kính lặn ống thở', mods: { sta: 0.75, ctl: -0.5 }, desc: 'Thở đều, bền sức; kính trên trán hơi vướng.' },
  { id: 'dv_shirt', slot: 'shirt', set: 'diver', rar: 0, price: 300, col: 0x1f4f6a, name: 'Áo lặn', mods: { spd: 0.75, pow: -0.5 }, desc: 'Trơn như cá, lướt nhanh; bó nên thiếu lực.' },
  { id: 'dv_pants', slot: 'shorts', set: 'diver', rar: 0, price: 300, col: 0x1f4f6a, name: 'Quần lặn', mods: { sta: 0.75, jmp: -0.5 }, desc: 'Giữ ấm cơ, đỡ mỏi; bó nên khó bật.' },
  { id: 'dv_shoes', slot: 'shoes', set: 'diver', rar: 0, price: 300, col: 0xffd23f, name: 'Giày lội nước', mods: { spd: 0.75, ctl: -0.5 }, desc: 'Lướt như cá trên sàn ướt; trơn nên kém chuẩn.' },
  { id: 'dv_back', slot: 'back', set: 'diver', rar: 0, price: 300, col: 0xffc531, name: 'Bình dưỡng khí', mods: { sta: 0.75, spd: -0.5 }, desc: 'Không bao giờ hụt hơi; nặng lưng.' },
  { id: 'rk_head', slot: 'head', set: 'rock', rar: 1, price: 900, col: 0xff3d9a, name: 'Tóc mào gà', mods: { pow: 1, ctl: -0.5 }, desc: 'Máu lửa, đập mạnh; bốc quá nên kém chuẩn.' },
  { id: 'rk_shirt', slot: 'shirt', set: 'rock', rar: 1, price: 900, col: 0x23232b, name: 'Áo da đinh tán', mods: { pow: 0.5, spd: 0.5, sta: -0.5 }, desc: 'Ngầu và khỏe; da dày nên mau nóng người.' },
  { id: 'rk_pants', slot: 'shorts', set: 'rock', rar: 1, price: 900, col: 0x2b2f45, name: 'Quần bó rách gối', mods: { spd: 1, jmp: -0.5 }, desc: 'Chạy như trên sân khấu; bó nên khó bật.' },
  { id: 'rk_shoes', slot: 'shoes', set: 'rock', rar: 1, price: 900, col: 0x23232b, name: 'Bốt đế dày', mods: { pow: 1, spd: -0.5 }, desc: 'Dậm chân là rung sân; nặng nên chậm.' },
  { id: 'rk_back', slot: 'back', set: 'rock', rar: 1, price: 900, col: 0xd9483b, name: 'Đàn ghi-ta điện', mods: { pow: 1, jmp: -0.5 }, desc: 'Vung vợt như vung đàn; vướng nên khó bật.' },
  { id: 'dt_head', slot: 'head', set: 'detective', rar: 1, price: 900, col: 0xc9a66b, name: 'Mũ thám tử', mods: { ctl: 1, pow: -0.5 }, desc: 'Quan sát tinh tường, đặt cầu chuẩn; nhẹ tay.' },
  { id: 'dt_shirt', slot: 'shirt', set: 'detective', rar: 1, price: 900, col: 0xc9a66b, name: 'Áo măng tô', mods: { rch: 0.5, ctl: 0.5, spd: -0.5 }, desc: 'Điềm đạm, với xa; áo dài nên chậm chân.' },
  { id: 'dt_pants', slot: 'shorts', set: 'detective', rar: 1, price: 900, col: 0x5a4a3a, name: 'Quần tây', mods: { ctl: 1, jmp: -0.5 }, desc: 'Bước chuẩn từng li; cứng nên khó bật.' },
  { id: 'dt_shoes', slot: 'shoes', set: 'detective', rar: 1, price: 900, col: 0x3a2a1a, name: 'Giày da êm', mods: { spd: 1, pow: -0.5 }, desc: 'Đi không tiếng động, nhanh; đế mỏng nên trụ yếu.' },
  { id: 'dt_back', slot: 'back', set: 'detective', rar: 1, price: 900, col: 0xf2c230, name: 'Kính lúp', mods: { rch: 1, sta: -0.5 }, desc: 'Soi ra đường cầu từ xa; căng mắt nên mau mệt.' },
  { id: 'rb_head', slot: 'head', set: 'robot', rar: 2, price: 2200, col: 0x9aa5b8, name: 'Mũ rô-bốt', mods: { ctl: 1, sta: 0.25, jmp: -0.5 }, desc: 'Tính toán chính xác; nặng đầu nên khó bật.' },
  { id: 'rb_shirt', slot: 'shirt', set: 'robot', rar: 2, price: 2200, col: 0x8a93a6, name: 'Giáp rô-bốt', mods: { sta: 1, pow: 0.25, spd: -0.5 }, desc: 'Pin trâu, không biết mệt; nặng nên chậm.' },
  { id: 'rb_pants', slot: 'shorts', set: 'robot', rar: 2, price: 2200, col: 0x6a7386, name: 'Chân máy', mods: { pow: 1, sta: 0.25, jmp: -0.5 }, desc: 'Trụ vững như cột thép; khớp cứng nên khó bật.' },
  { id: 'rb_shoes', slot: 'shoes', set: 'robot', rar: 2, price: 2200, col: 0x5a6478, name: 'Giày lò xo máy', mods: { jmp: 1, pow: 0.25, ctl: -0.5 }, desc: 'Bật bằng pít-tông; mạnh quá nên khó kiểm soát.' },
  { id: 'rb_back', slot: 'back', set: 'robot', rar: 2, price: 2200, col: 0x4a5568, name: 'Khối pin', mods: { sta: 1, spd: 0.25, ctl: -0.5 }, desc: 'Sạc đầy năng lượng; rung nên kém khéo.' },
  { id: 'an_head', slot: 'head', set: 'angel', rar: 3, price: 5000, col: 0xffe18a, name: 'Vòng hào quang', mods: { ctl: 1, rch: 0.5, pow: -0.5 }, desc: 'Tâm tĩnh như nước, thấy trước mọi đường cầu; không nỡ đập mạnh.' },
  { id: 'an_shirt', slot: 'shirt', set: 'angel', rar: 3, price: 5000, col: 0xfffaf0, name: 'Áo thiên sứ', mods: { sta: 1, ctl: 0.5, pow: -0.5 }, desc: 'Nhẹ như mây, không biết mệt; hiền nên đập nhẹ.' },
  { id: 'an_pants', slot: 'shorts', set: 'angel', rar: 3, price: 5000, col: 0xfffaf0, name: 'Quần mây', mods: { jmp: 1, sta: 0.5, spd: -0.5 }, desc: 'Bật lên như bay; lơ lửng nên chạy chậm.' },
  { id: 'an_shoes', slot: 'shoes', set: 'angel', rar: 3, price: 5000, col: 0xffe18a, name: 'Giày ánh sáng', mods: { spd: 1, jmp: 0.5, pow: -0.5 }, desc: 'Lướt như tia sáng; nhẹ quá nên trụ yếu.' },
  { id: 'an_back', slot: 'back', set: 'angel', rar: 3, price: 5000, col: 0xffffff, name: 'Đôi cánh thiên thần', mods: { jmp: 1, rch: 0.5, ctl: -0.5 }, desc: 'Bay lên đón cầu; sải cánh rộng nên khó tinh tế.' },
  { id: 'sm_head', slot: 'head', set: 'samurai', rar: 3, price: 5000, col: 0x8a1f2a, name: 'Mũ trụ samurai', mods: { pow: 1, ctl: 0.5, spd: -0.5 }, desc: 'Một nhát quyết định; mũ nặng nên chậm chân.' },
  { id: 'sm_shirt', slot: 'shirt', set: 'samurai', rar: 3, price: 5000, col: 0xa3242f, name: 'Giáp samurai', mods: { pow: 1, sta: 0.5, jmp: -0.5 }, desc: 'Vững như thành; giáp nặng nên khó bật.' },
  { id: 'sm_pants', slot: 'shorts', set: 'samurai', rar: 3, price: 5000, col: 0x2a2440, name: 'Quần hakama', mods: { ctl: 1, pow: 0.5, spd: -0.5 }, desc: 'Bước chân kiếm sĩ, chuẩn và chắc; rộng nên chậm.' },
  { id: 'sm_shoes', slot: 'shoes', set: 'samurai', rar: 3, price: 5000, col: 0xd9b36a, name: 'Dép rơm', mods: { spd: 1, ctl: 0.5, jmp: -0.5 }, desc: 'Áp sát cực nhanh; đế phẳng nên bật kém.' },
  { id: 'sm_back', slot: 'back', set: 'samurai', rar: 3, price: 5000, col: 0xc22a3a, name: 'Cờ hiệu', mods: { pow: 1, rch: 0.5, sta: -0.5 }, desc: 'Khí thế ra trận; vác cờ nên mau mệt.' },
  { id: 'be_head', slot: 'head', set: 'bee', rar: 0, price: 300, col: 0x23232b, name: 'Râu ong', mods: { rch: 0.75, pow: -0.5 }, desc: 'Đánh hơi đường cầu từ xa; nhỏ con nên đập nhẹ.' },
  { id: 'be_shirt', slot: 'shirt', set: 'bee', rar: 0, price: 300, col: 0xffd23f, name: 'Áo sọc ong', mods: { sta: 0.75, ctl: -0.5 }, desc: 'Chăm chỉ không biết mệt; vội nên kém khéo.' },
  { id: 'be_pants', slot: 'shorts', set: 'bee', rar: 0, price: 300, col: 0x23232b, name: 'Quần ong', mods: { jmp: 0.75, sta: -0.5 }, desc: 'Bật như cất cánh; tốn sức.' },
  { id: 'be_shoes', slot: 'shoes', set: 'bee', rar: 0, price: 300, col: 0xffd23f, name: 'Giày mật', mods: { jmp: 0.75, spd: -0.5 }, desc: 'Dính mật nên bật nảy tưng tưng; chạy hơi chậm.' },
  { id: 'be_back', slot: 'back', set: 'bee', rar: 0, price: 300, col: 0xbfeaff, name: 'Cánh ong', mods: { jmp: 0.75, ctl: -0.5 }, desc: 'Vỗ cánh bật cao; rung nên kém chính xác.' },
  { id: 'po_head', slot: 'head', set: 'police', rar: 1, price: 900, col: 0x1f3f8a, name: 'Mũ cảnh sát', mods: { ctl: 1, spd: -0.5 }, desc: 'Nghiêm túc, chuẩn xác; đứng nghiêm nên chậm.' },
  { id: 'po_shirt', slot: 'shirt', set: 'police', rar: 1, price: 900, col: 0x2f5fd9, name: 'Áo cảnh phục', mods: { sta: 0.5, ctl: 0.5, jmp: -0.5 }, desc: 'Kỷ luật và bền bỉ; áo cứng nên khó bật.' },
  { id: 'po_pants', slot: 'shorts', set: 'police', rar: 1, price: 900, col: 0x1f2f5a, name: 'Quần cảnh phục', mods: { sta: 1, spd: -0.5 }, desc: 'Tuần tra cả ngày không mỏi; không vội được.' },
  { id: 'po_shoes', slot: 'shoes', set: 'police', rar: 1, price: 900, col: 0x23232b, name: 'Giày tuần tra', mods: { spd: 1, jmp: -0.5 }, desc: 'Đuổi kịp mọi đường cầu; đế cứng nên bật kém.' },
  { id: 'po_back', slot: 'back', set: 'police', rar: 1, price: 900, col: 0x23232b, name: 'Dùi cui', mods: { pow: 1, ctl: -0.5 }, desc: 'Ra đòn dứt khoát; mạnh tay nên kém tinh tế.' },
  { id: 'pk_head', slot: 'head', set: 'pumpkin', rar: 1, price: 900, col: 0xff8a1f, name: 'Mũ bí ngô', mods: { rch: 1, spd: -0.5 }, desc: 'Dọa đối thủ, với xa; đầu to nên chậm.' },
  { id: 'pk_shirt', slot: 'shirt', set: 'pumpkin', rar: 1, price: 900, col: 0x23232b, name: 'Áo bộ xương', mods: { spd: 0.5, jmp: 0.5, pow: -0.5 }, desc: 'Nhẹ tênh, nhanh và bật tốt; toàn xương nên thiếu lực.' },
  { id: 'pk_pants', slot: 'shorts', set: 'pumpkin', rar: 1, price: 900, col: 0x23232b, name: 'Quần bộ xương', mods: { spd: 1, sta: -0.5 }, desc: 'Chạy lạch cạch rất nhanh; mau rã rời.' },
  { id: 'pk_shoes', slot: 'shoes', set: 'pumpkin', rar: 1, price: 900, col: 0xff8a1f, name: 'Giày bí ngô', mods: { jmp: 1, ctl: -0.5 }, desc: 'Nảy như quả bí lăn; khó kiểm soát.' },
  { id: 'pk_back', slot: 'back', set: 'pumpkin', rar: 1, price: 900, col: 0x9a6a3a, name: 'Chổi phù thủy', mods: { rch: 1, pow: -0.5 }, desc: 'Quét được cầu ở xa; chổi nhẹ nên đập yếu.' },
  { id: 'dn_head', slot: 'head', set: 'dino', rar: 2, price: 2200, col: 0x4caf50, name: 'Mũ khủng long', mods: { pow: 1, rch: 0.25, ctl: -0.5 }, desc: 'Gầm lên rồi đập; hung hăng nên kém khéo.' },
  { id: 'dn_shirt', slot: 'shirt', set: 'dino', rar: 2, price: 2200, col: 0x4caf50, name: 'Áo khủng long', mods: { sta: 1, pow: 0.25, spd: -0.5 }, desc: 'Da dày, lì đòn; to xác nên chậm.' },
  { id: 'dn_pants', slot: 'shorts', set: 'dino', rar: 2, price: 2200, col: 0x3d8f41, name: 'Quần khủng long', mods: { pow: 1, sta: 0.25, jmp: -0.5 }, desc: 'Chân trụ khổng lồ; nặng nên khó bật.' },
  { id: 'dn_shoes', slot: 'shoes', set: 'dino', rar: 2, price: 2200, col: 0x3d8f41, name: 'Chân khủng long', mods: { pow: 1, jmp: 0.25, spd: -0.5 }, desc: 'Dậm một cái rung sân; bước nặng nề.' },
  { id: 'dn_back', slot: 'back', set: 'dino', rar: 2, price: 2200, col: 0x4caf50, name: 'Đuôi khủng long', mods: { rch: 1, pow: 0.25, spd: -0.5 }, desc: 'Giữ thăng bằng khi với xa; đuôi dài vướng chân.' },
  { id: 'fa_head', slot: 'head', set: 'fairy', rar: 2, price: 2200, col: 0xff9fd6, name: 'Vòng hoa', mods: { ctl: 1, sta: 0.25, pow: -0.5 }, desc: 'Dịu dàng, khéo léo; không quen đập mạnh.' },
  { id: 'fa_shirt', slot: 'shirt', set: 'fairy', rar: 2, price: 2200, col: 0xff9fd6, name: 'Áo tiên hoa', mods: { jmp: 1, ctl: 0.25, pow: -0.5 }, desc: 'Nhẹ như cánh hoa; mỏng nên thiếu lực.' },
  { id: 'fa_pants', slot: 'shorts', set: 'fairy', rar: 2, price: 2200, col: 0xc59bff, name: 'Váy cánh hoa', mods: { jmp: 1, spd: 0.25, sta: -0.5 }, desc: 'Xoay và bật nhẹ nhàng; múa nhiều nên mau mệt.' },
  { id: 'fa_shoes', slot: 'shoes', set: 'fairy', rar: 2, price: 2200, col: 0xfff0a8, name: 'Giày phấn hoa', mods: { spd: 1, jmp: 0.25, pow: -0.5 }, desc: 'Lướt trên đầu ngón chân; nhẹ nên trụ yếu.' },
  { id: 'fa_back', slot: 'back', set: 'fairy', rar: 2, price: 2200, col: 0x7fe3ff, name: 'Cánh bướm', mods: { jmp: 1, rch: 0.25, ctl: -0.5 }, desc: 'Bay lên đón cầu; chao liệng nên khó chuẩn.' },
  { id: 'dm_head', slot: 'head', set: 'demon', rar: 3, price: 5000, col: 0x8a1020, name: 'Sừng ác quỷ', mods: { pow: 1, spd: 0.5, ctl: -0.5 }, desc: 'Hung hãn tột độ, đập như trời giáng; mất bình tĩnh.' },
  { id: 'dm_shirt', slot: 'shirt', set: 'demon', rar: 3, price: 5000, col: 0x5a0c18, name: 'Áo lửa địa ngục', mods: { pow: 1, sta: 0.5, jmp: -0.5 }, desc: 'Sức nóng không tắt; áo nặng nên khó bật.' },
  { id: 'dm_pants', slot: 'shorts', set: 'demon', rar: 3, price: 5000, col: 0x2a0a10, name: 'Quần bóng đêm', mods: { sta: 1, pow: 0.5, spd: -0.5 }, desc: 'Lì lợm, không biết mệt; nặng nề nên chậm chân.' },
  { id: 'dm_shoes', slot: 'shoes', set: 'demon', rar: 3, price: 5000, col: 0x8a1020, name: 'Móng quỷ', mods: { jmp: 1, spd: 0.5, ctl: -0.5 }, desc: 'Bám sân rồi bật vọt lên; khó dừng chuẩn.' },
  { id: 'dm_back', slot: 'back', set: 'demon', rar: 3, price: 5000, col: 0x5a1030, name: 'Cánh dơi', mods: { jmp: 1, pow: 0.5, sta: -0.5 }, desc: 'Vọt lên rồi bổ xuống; vỗ cánh nhiều nên mau mệt.' },
  { id: 'bc_racket', slot: 'racket', set: 'beach', rar: 0, price: 300, col: 0xff8a3d, name: 'Vợt bãi biển', mods: { ctl: 0.75, pow: -0.5 }, desc: 'Nhẹ như đánh chơi trên cát; không dùng để đập mạnh.' },
  { id: 'wn_racket', slot: 'racket', set: 'winter', rar: 0, price: 300, col: 0xd9483b, name: 'Vợt kẹo gậy', mods: { ctl: 0.75, spd: -0.5 }, desc: 'Ngọt tay, đặt cầu chuẩn; lạnh tay nên chậm.' },
  { id: 'dv_racket', slot: 'racket', set: 'diver', rar: 0, price: 300, col: 0x23b5c9, name: 'Vợt san hô', mods: { rch: 0.75, pow: -0.5 }, desc: 'Dài tay như bơi sải; mảnh nên đập nhẹ.' },
  { id: 'be_racket', slot: 'racket', set: 'bee', rar: 0, price: 300, col: 0xffd23f, name: 'Vợt tổ ong', mods: { ctl: 0.75, sta: -0.5 }, desc: 'Chích đúng chỗ hiểm; hăng nên mau mệt.' },
  { id: 'nj_racket', slot: 'racket', set: 'ninja', rar: 1, price: 900, col: 0x2b2f45, name: 'Vợt bóng đêm', mods: { ctl: 1, pow: -0.5 }, desc: 'Ra đòn không tiếng động, cực chuẩn; nhẹ nên thiếu lực.' },
  { id: 'pr_racket', slot: 'racket', set: 'pirate', rar: 1, price: 900, col: 0x7a5230, name: 'Vợt thuyền trưởng', mods: { pow: 1, ctl: -0.5 }, desc: 'Nặng như mái chèo, đập mạnh; khó tinh tế.' },
  { id: 'cb_racket', slot: 'racket', set: 'cowboy', rar: 1, price: 900, col: 0x9a6a3a, name: 'Vợt cao bồi', mods: { rch: 1, ctl: -0.5 }, desc: 'Quăng như thòng lọng, với xa; hơi ẩu.' },
  { id: 'ch_racket', slot: 'racket', set: 'chef', rar: 1, price: 900, col: 0x3a3a46, name: 'Vợt chảo gang', mods: { pow: 1, spd: -0.5 }, desc: 'Vung như lật chảo, rất lực; nặng tay.' },
  { id: 'rk_racket', slot: 'racket', set: 'rock', rar: 1, price: 900, col: 0x23232b, name: 'Vợt đinh tán', mods: { pow: 1, ctl: -0.5 }, desc: 'Quẩy tới bến; đập bừa nên kém chuẩn.' },
  { id: 'dt_racket', slot: 'racket', set: 'detective', rar: 1, price: 900, col: 0xc9a66b, name: 'Vợt suy luận', mods: { ctl: 1, pow: -0.5 }, desc: 'Tính trước từng đường cầu; không dùng sức.' },
  { id: 'po_racket', slot: 'racket', set: 'police', rar: 1, price: 900, col: 0x2f5fd9, name: 'Vợt công lý', mods: { ctl: 1, jmp: -0.5 }, desc: 'Chuẩn mực từng cú đánh; nghiêm nên ít bật.' },
  { id: 'pk_racket', slot: 'racket', set: 'pumpkin', rar: 1, price: 900, col: 0xff8a1f, name: 'Vợt bí ngô', mods: { rch: 1, sta: -0.5 }, desc: 'Dài và ma quái; cầm lâu mỏi tay.' },
  { id: 'as_racket', slot: 'racket', set: 'astro', rar: 2, price: 2200, col: 0xf4f6fa, name: 'Vợt phản lực', mods: { pow: 1, jmp: 0.25, ctl: -0.5 }, desc: 'Có động cơ đẩy sau mỗi cú đập; khó điều khiển.' },
  { id: 'ry_racket', slot: 'racket', set: 'royal', rar: 2, price: 2200, col: 0xf2c230, name: 'Quyền trượng hoàng gia', mods: { ctl: 1, rch: 0.25, spd: -0.5 }, desc: 'Uy nghi, chính xác; nặng nên chậm.' },
  { id: 'hr_racket', slot: 'racket', set: 'hero', rar: 2, price: 2200, col: 0xe0303a, name: 'Vợt sấm sét', mods: { pow: 1, spd: 0.25, ctl: -0.5 }, desc: 'Giáng xuống như sét; mạnh quá khó kiểm soát.' },
  { id: 'wz_racket', slot: 'racket', set: 'wizard', rar: 2, price: 2200, col: 0x6a3fd0, name: 'Gậy phép', mods: { ctl: 1, rch: 0.25, pow: -0.5 }, desc: 'Điều cầu bằng phép thuật; không cần sức.' },
  { id: 'rb_racket', slot: 'racket', set: 'robot', rar: 2, price: 2200, col: 0x8a93a6, name: 'Vợt cơ khí', mods: { pow: 1, sta: 0.25, jmp: -0.5 }, desc: 'Pít-tông trợ lực mỗi cú đánh; nặng nên khó bật.' },
  { id: 'dn_racket', slot: 'racket', set: 'dino', rar: 2, price: 2200, col: 0x4caf50, name: 'Vợt răng nanh', mods: { pow: 1, rch: 0.25, ctl: -0.5 }, desc: 'Ngoạm lấy cầu mà quật; thô bạo.' },
  { id: 'fa_racket', slot: 'racket', set: 'fairy', rar: 2, price: 2200, col: 0xff9fd6, name: 'Vợt cánh hoa', mods: { ctl: 1, jmp: 0.25, pow: -0.5 }, desc: 'Nhẹ như cánh hoa, rất khéo; không có lực.' },
  { id: 'an_racket', slot: 'racket', set: 'angel', rar: 3, price: 5000, col: 0xfffaf0, name: 'Vợt thiên sứ', mods: { ctl: 1, rch: 0.5, pow: -0.5 }, desc: 'Mỗi cú đánh đều được dẫn lối; không nỡ đập mạnh.' },
  { id: 'sm_racket', slot: 'racket', set: 'samurai', rar: 3, price: 5000, col: 0xa3242f, name: 'Vợt katana', mods: { pow: 1, ctl: 0.5, sta: -0.5 }, desc: 'Một nhát dứt điểm, sắc và chuẩn; dồn sức nên mau mệt.' },
  { id: 'dm_racket', slot: 'racket', set: 'demon', rar: 3, price: 5000, col: 0x8a1020, name: 'Vợt địa ngục', mods: { pow: 1, rch: 0.5, ctl: -0.5 }, desc: 'Rực lửa mỗi cú đập; hung bạo khó kiểm soát.' },
  { id: 'fb_shirt', slot: 'shirt', set: 'football', rar: 0, price: 300, col: 0x2f8f6a, name: 'Áo đấu sọc', mods: { sta: 0.75, ctl: -0.5 }, desc: 'Chạy cả trận không mỏi; vội nên kém chuẩn.' },
  { id: 'fb_pants', slot: 'shorts', set: 'football', rar: 0, price: 300, col: 0xffffff, name: 'Quần đá bóng', mods: { jmp: 0.75, sta: -0.5 }, desc: 'Bật đánh đầu rất cao; tốn sức.' },
  { id: 'fb_shoes', slot: 'shoes', set: 'football', rar: 0, price: 300, col: 0x23232b, name: 'Giày đinh', mods: { spd: 0.75, jmp: -0.5 }, desc: 'Bám sân, bứt tốc; đinh cứng nên bật kém.' },
  { id: 'st_face', slot: 'face', set: 'student', rar: 0, price: 300, col: 0x23232b, name: 'Kính cận', mods: { ctl: 0.75, rch: -0.5 }, desc: 'Nhìn rõ từng sợi lông cầu; ngại với xa.' },
  { id: 'st_shirt', slot: 'shirt', set: 'student', rar: 0, price: 300, col: 0xffffff, name: 'Áo đồng phục', mods: { sta: 0.75, pow: -0.5 }, desc: 'Gọn gàng, bền bỉ; hiền nên đập nhẹ.' },
  { id: 'st_neck', slot: 'neck', set: 'student', rar: 0, price: 300, col: 0xe0303a, name: 'Khăn quàng đỏ', mods: { spd: 0.75, pow: -0.5 }, desc: 'Tan học là chạy ùa ra sân; nhỏ con nên đập nhẹ.' },
  { id: 'st_back', slot: 'back', set: 'student', rar: 0, price: 300, col: 0x3f6fd9, name: 'Cặp sách', mods: { sta: 0.75, jmp: -0.5 }, desc: 'Đeo quen nên lưng khỏe; nặng nên khó bật.' },
  { id: 'th_face', slot: 'face', set: 'thief', rar: 1, price: 900, col: 0x23232b, name: 'Mặt nạ đạo chích', mods: { jmp: 1, ctl: -0.5 }, desc: 'Nhảy qua tường như chơi; che mắt nên kém chuẩn.' },
  { id: 'th_shirt', slot: 'shirt', set: 'thief', rar: 1, price: 900, col: 0xf4f6fa, name: 'Áo sọc kẻ trộm', mods: { spd: 0.5, jmp: 0.5, pow: -0.5 }, desc: 'Nhẹ nhàng leo trèo; không quen dùng sức.' },
  { id: 'th_back', slot: 'back', set: 'thief', rar: 1, price: 900, col: 0xc9a66b, name: 'Bao chiến lợi phẩm', mods: { rch: 1, spd: -0.5 }, desc: 'Tay dài quen với đồ; vác nặng nên chậm.' },
  { id: 'dc_head', slot: 'head', set: 'doctor', rar: 1, price: 900, col: 0xc9d2e0, name: 'Gương khám bệnh', mods: { ctl: 1, pow: -0.5 }, desc: 'Soi kỹ từng đường cầu; nhẹ tay.' },
  { id: 'dc_shirt', slot: 'shirt', set: 'doctor', rar: 1, price: 900, col: 0xffffff, name: 'Áo blouse', mods: { sta: 0.5, spd: 0.5, pow: -0.5 }, desc: 'Trực đêm quen rồi, bền và nhanh nhẹn; không dùng sức.' },
  { id: 'dc_neck', slot: 'neck', set: 'doctor', rar: 1, price: 900, col: 0x3a4254, name: 'Ống nghe', mods: { ctl: 0.5, rch: 0.5, pow: -0.5 }, desc: 'Nghe được nhịp cầu; không dùng sức.' },
  { id: 'dc_wrist', slot: 'wrist', set: 'doctor', rar: 1, price: 900, col: 0xffffff, name: 'Đồng hồ bác sĩ', mods: { ctl: 1, jmp: -0.5 }, desc: 'Đúng từng giây; cẩn thận nên ít bật.' },
  { id: 'bx_head', slot: 'head', set: 'boxer', rar: 1, price: 900, col: 0xd9483b, name: 'Mũ bảo hộ quyền anh', mods: { sta: 1, ctl: -0.5 }, desc: 'Chịu đòn tốt; che tai mắt nên kém khéo.' },
  { id: 'bx_wrist', slot: 'wrist', set: 'boxer', rar: 1, price: 900, col: 0xd9483b, name: 'Găng đấm bốc', mods: { pow: 1, ctl: -0.5 }, desc: 'Mỗi cú đập như một cú đấm; to nên vụng.' },
  { id: 'bx_pants', slot: 'shorts', set: 'boxer', rar: 1, price: 900, col: 0xd9483b, name: 'Quần đấm bốc', mods: { pow: 0.5, spd: 0.5, jmp: -0.5 }, desc: 'Di chuyển lắt léo, trụ khỏe; rộng nên khó bật.' },
  { id: 'hu_head', slot: 'head', set: 'hunter', rar: 1, price: 900, col: 0x3d7a3a, name: 'Mũ thợ săn', mods: { rch: 1, pow: -0.5 }, desc: 'Mắt tinh như cú, với xa; nhẹ tay.' },
  { id: 'hu_back', slot: 'back', set: 'hunter', rar: 1, price: 900, col: 0x7a5230, name: 'Ống tên', mods: { rch: 0.5, ctl: 0.5, spd: -0.5 }, desc: 'Ngắm là trúng; vướng lưng nên chậm.' },
  { id: 'hu_wrist', slot: 'wrist', set: 'hunter', rar: 1, price: 900, col: 0x7a5230, name: 'Bao tay da', mods: { ctl: 1, pow: -0.5 }, desc: 'Tay vững như kéo cung; không đập mạnh.' },
  { id: 'kn_head', slot: 'head', set: 'knight', rar: 2, price: 2200, col: 0x8f9bb0, name: 'Mũ giáp hiệp sĩ', mods: { sta: 1, pow: 0.25, spd: -0.5 }, desc: 'Không gì làm nao núng; nặng nên chậm.' },
  { id: 'kn_shirt', slot: 'shirt', set: 'knight', rar: 2, price: 2200, col: 0xb8c2d4, name: 'Giáp bạc', mods: { sta: 1, ctl: 0.25, jmp: -0.5 }, desc: 'Vững như thành; giáp nặng khó bật.' },
  { id: 'kn_shoes', slot: 'shoes', set: 'knight', rar: 2, price: 2200, col: 0x9aa5b8, name: 'Giày sắt', mods: { pow: 1, sta: 0.25, spd: -0.5 }, desc: 'Trụ cực chắc; bước nặng nề.' },
  { id: 'kn_back', slot: 'back', set: 'knight', rar: 2, price: 2200, col: 0x3f6fd9, name: 'Khiên tròn', mods: { sta: 1, rch: 0.25, spd: -0.5 }, desc: 'Che chắn phía sau; vác khiên nên chậm.' },
  { id: 'kn_racket', slot: 'racket', set: 'knight', rar: 2, price: 2200, col: 0xc9d2e0, name: 'Vợt kiếm bạc', mods: { pow: 1, ctl: 0.25, sta: -0.5 }, desc: 'Chém cầu như chém gió; mau mỏi tay.' },
  { id: 'tt_head', slot: 'head', set: 'tet', rar: 2, price: 2200, col: 0xc22a3a, name: 'Khăn đóng đỏ', mods: { ctl: 1, sta: 0.25, jmp: -0.5 }, desc: 'Trang trọng, điềm tĩnh; không tiện bật nhảy.' },
  { id: 'tt_shirt', slot: 'shirt', set: 'tet', rar: 2, price: 2200, col: 0xc22a3a, name: 'Áo dài gấm', mods: { ctl: 1, rch: 0.25, pow: -0.5 }, desc: 'Thướt tha mà chuẩn xác; không dùng sức.' },
  { id: 'tt_neck', slot: 'neck', set: 'tet', rar: 2, price: 2200, col: 0xc22a3a, name: 'Bao lì xì', mods: { sta: 1, ctl: 0.25, spd: -0.5 }, desc: 'Có lộc nên khỏe cả năm; giữ kỹ nên đi chậm.' },
  { id: 'tt_back', slot: 'back', set: 'tet', rar: 2, price: 2200, col: 0xff9fb8, name: 'Cành đào', mods: { jmp: 1, ctl: 0.25, pow: -0.5 }, desc: 'Xuân về, lòng nhẹ bẫng; sợ rụng hoa nên đập nhẹ.' },
  { id: 'id_face', slot: 'face', set: 'idol', rar: 2, price: 2200, col: 0xff3d9a, name: 'Kính ngôi sao', mods: { spd: 1, jmp: 0.25, ctl: -0.5 }, desc: 'Tỏa sáng trên sân; chói nên kém chuẩn.' },
  { id: 'id_neck', slot: 'neck', set: 'idol', rar: 2, price: 2200, col: 0xff3d9a, name: 'Nơ sân khấu', mods: { jmp: 1, ctl: 0.25, pow: -0.5 }, desc: 'Nhảy như trên sân khấu; không quen đập mạnh.' },
  { id: 'ic_head', slot: 'head', set: 'ice', rar: 3, price: 5000, col: 0x7fe3ff, name: 'Vương miện băng', mods: { ctl: 1, spd: 0.5, jmp: -0.5 }, desc: 'Lạnh lùng, chính xác, trượt nhanh trên băng; nặng nên bật kém.' },
  { id: 'ic_shirt', slot: 'shirt', set: 'ice', rar: 3, price: 5000, col: 0xcfeeff, name: 'Áo băng tuyết', mods: { sta: 1, spd: 0.5, pow: -0.5 }, desc: 'Không bao giờ đổ mồ hôi, lướt nhẹ; giòn nên đập nhẹ.' },
  { id: 'ic_neck', slot: 'neck', set: 'ice', rar: 3, price: 5000, col: 0xbfeaff, name: 'Mặt dây bông tuyết', mods: { rch: 1, ctl: 0.5, jmp: -0.5 }, desc: 'Đóng băng đường cầu từ xa; nặng nên bật kém.' },
  { id: 'ic_back', slot: 'back', set: 'ice', rar: 3, price: 5000, col: 0x9fe0ff, name: 'Cánh pha lê băng', mods: { jmp: 1, sta: 0.5, pow: -0.5 }, desc: 'Lướt trên gió lạnh; mỏng nên thiếu lực.' },
  { id: 'ic_racket', slot: 'racket', set: 'ice', rar: 3, price: 5000, col: 0x7fe3ff, name: 'Vợt băng', mods: { pow: 1, ctl: 0.5, sta: -0.5 }, desc: 'Sắc như băng nhọn, đập là dứt điểm; lạnh tay nên mau mỏi.' },
];
// outfit sets: wearing 3 pieces of one set adds +0.25 to the set's stat, all 5 pieces +0.5 (inside the same +-2 cap)
const GEAR_SETS = [{ id: 'beach', name: 'Mùa hè', stat: 'sta' }, { id: 'ninja', name: 'Ninja', stat: 'spd' }, { id: 'pirate', name: 'Hải tặc', stat: 'pow' },
  { id: 'astro', name: 'Phi hành gia', stat: 'jmp' }, { id: 'royal', name: 'Hoàng gia', stat: 'ctl' }, { id: 'hero', name: 'Siêu nhân', stat: 'pow' },
  { id: 'winter', name: 'Mùa đông', stat: 'ctl' }, { id: 'cowboy', name: 'Cao bồi', stat: 'rch' }, { id: 'chef', name: 'Đầu bếp', stat: 'ctl' }, { id: 'wizard', name: 'Pháp sư', stat: 'rch' },
  { id: 'diver', name: 'Thợ lặn', stat: 'sta' }, { id: 'rock', name: 'Rock', stat: 'pow' }, { id: 'detective', name: 'Thám tử', stat: 'ctl' }, { id: 'robot', name: 'Rô-bốt', stat: 'sta' },
  { id: 'angel', name: 'Thiên thần', stat: 'jmp' }, { id: 'samurai', name: 'Samurai', stat: 'pow' },
  { id: 'bee', name: 'Ong chăm chỉ', stat: 'spd' }, { id: 'police', name: 'Cảnh sát', stat: 'ctl' }, { id: 'pumpkin', name: 'Bí ngô', stat: 'rch' }, { id: 'dino', name: 'Khủng long', stat: 'pow' },
  { id: 'fairy', name: 'Tiên bướm', stat: 'jmp' }, { id: 'demon', name: 'Ác quỷ', stat: 'pow' },
  { id: 'football', name: 'Cầu thủ', stat: 'spd' }, { id: 'student', name: 'Học sinh', stat: 'ctl' }, { id: 'thief', name: 'Đạo chích', stat: 'spd' }, { id: 'doctor', name: 'Bác sĩ', stat: 'ctl' },
  { id: 'boxer', name: 'Võ sĩ', stat: 'pow' }, { id: 'hunter', name: 'Thợ săn', stat: 'rch' }, { id: 'knight', name: 'Hiệp sĩ', stat: 'sta' }, { id: 'tet', name: 'Tết', stat: 'ctl' },
  { id: 'idol', name: 'Thần tượng', stat: 'jmp' }, { id: 'ice', name: 'Băng giá', stat: 'ctl' }];
// bonus tiers by the size of the set: [pieces worn, bonus]
const SET_TIERS = { 2: [[2, 0.25]], 3: [[2, 0.25], [3, 0.5]], 4: [[2, 0.25], [4, 0.5]], 5: [[3, 0.25], [5, 0.5]], 6: [[3, 0.25], [5, 0.5], [6, 0.75]] };
const setSize = (id) => GEAR.filter((g) => g.set === id).length, setTiers = (id) => SET_TIERS[setSize(id)] || [];
function setBonus(ids) {
  const set = gearSet(ids), n = {}; for (const k in set) if (set[k].set) n[set[k].set] = (n[set[k].set] || 0) + 1;
  return GEAR_SETS.filter((s) => n[s.id]).map((s) => ({ id: s.id, name: s.name, stat: s.stat, n: n[s.id], size: setSize(s.id), bonus: setTiers(s.id).reduce((b, t) => (n[s.id] >= t[0] ? t[1] : b), 0) }));
}
const GEAR_STAT_CAP = 2;                                   // gear can move one stat by at most +-2 points in total
const STAT_KEYS = ['spd', 'jmp', 'pow', 'rch', 'ctl', 'sta'];
// a worn item may carry its upgrade level as a suffix: 'r_pro+2'
const GEAR_MAX_LV = 5, GEAR_LV_STEP = 0.1;
const gearBase = (id) => String(id == null ? '' : id).split('+')[0], gearLv = (id) => Math.max(0, Math.min(GEAR_MAX_LV, (String(id == null ? '' : id).split('+')[1] | 0)));
const gearById = (id) => { const b = gearBase(id); return GEAR.find((g) => g.id === b) || null; };
// each level adds 0.1 to the item's strongest plus
function gearAtLv(g, lv) { if (!lv) return g; let best = null; for (const k in g.mods) if (g.mods[k] > 0 && (best === null || g.mods[k] > g.mods[best])) best = k;
  const mods = Object.assign({}, g.mods); if (best) mods[best] = Math.round((mods[best] + GEAR_LV_STEP * lv) * 100) / 100; return Object.assign({}, g, { lv, mods }); }
// one item per slot (later ids win); unknown ids are ignored
function gearSet(ids) { const by = {}; for (const id of ids || []) { const g = gearById(id); if (g) by[g.slot] = gearAtLv(g, gearLv(id)); } return by; }
function gearMods(ids) {
  const out = { spd: 0, jmp: 0, pow: 0, rch: 0, ctl: 0, sta: 0 }, set = gearSet(ids);
  for (const k in set) for (const s in set[k].mods) out[s] += set[k].mods[s];
  for (const b of setBonus(ids)) out[b.stat] += b.bonus;
  for (const s of STAT_KEYS) out[s] = clamp(out[s], -GEAR_STAT_CAP, GEAR_STAT_CAP);
  return out;
}
// the character's six stats with gear applied (fractional; each stays within 0.5..7)
function effStats(id, gear) {
  const c = CHARS.find((c) => c.id === id) || CHARS[0], m = gearMods(gear), out = {};
  for (const s of STAT_KEYS) out[s] = clamp(c.stats[s] + m[s], 0.5, 7);
  return out;
}
// power rating = net stat points x 100 (1800 for any character without gear)
function powerOf(id, gear) { const e = effStats(id, gear); return Math.round(STAT_KEYS.reduce((a, s) => a + e[s], 0) * 100); }

function charStats(id, gear) {
  const s = effStats(id, gear);
  return {
    speed: 4.76 + s.spd * 0.10,
    accel: 13.01 + s.spd * 0.33,
    jumpVy: 4.34 + s.jmp * 0.20,
    power: 0.93 + s.pow * 0.04,
    reach: 1.0495 + s.rch * 0.0085,
    control: 0.91 + s.ctl * 0.03,
    endurance: 1 + (3 - s.sta) * 0.055,  // drain multiplier: 1.11 (sta 1) .. 0.89 (sta 5); recovery is divided by it
  };
}

const DIFF = [
  // miss: chance of an unforced error on any shot (more when stretched)
  { name: 'Dễ',      speed: 3.0, react: 0.36, skill: 0.52, smash: 0.2,  jump: false, judge: 0.2,  attack: 0, miss: 0.12 },
  { name: 'Vừa',     speed: 3.7, react: 0.15, skill: 0.72, smash: 0.6,  jump: true,  judge: 0.5,  attack: 2, miss: 0.04 },
  { name: 'Khó',     speed: 4.1, react: 0.08, skill: 0.84, smash: 0.7,  jump: true,  judge: 0.85, attack: 2, miss: 0.05 },
  { name: 'Cao thủ', speed: 4.5, react: 0.04, skill: 0.93, smash: 0.95, jump: true,  judge: 0.97, attack: 2, miss: 0.025 },
];

const VENUES = [
  { id: 'gym',   name: 'Nhà thi đấu Hoa Mai', desc: 'Nhà thi đấu ấm áp. Không có gió.', wind: 'none', max: 0 },
  { id: 'arena', name: 'Đấu trường Ánh Sao',  desc: 'Sân lớn dưới đèn rọi. Không có gió.', wind: 'none', max: 0 },
  { id: 'roof',  name: 'Sân thượng Hoàng Hôn', desc: 'Sân trên nóc nhà lúc chiều tà. Gió nhẹ.', wind: 'steady', max: 0.9 },
  { id: 'beach', name: 'Bờ biển Nắng Vàng',   desc: 'Sân cát cạnh biển. Gió biển thổi ngang đều.', wind: 'steady', max: 1.6 },
  { id: 'park',  name: 'Công viên Cỏ Xanh',   desc: 'Sân cỏ. Gió giật đổi chiều mỗi pha.', wind: 'gusty', max: 2.0 },
  { id: 'snow',  name: 'Đỉnh Tuyết Trắng',    desc: 'Sân trên núi tuyết. Gió lạnh thổi từ mọi phía.', wind: 'any', max: 2.4 },
];

const SHOTS = {
  smash:      { angles: [-14, -10, -7, -4, -1, 3, 7], vmax: 32, name: 'Đập' },
  drive:      { angles: [3, 6, 9, 13, 17, 22], vmax: 21, name: 'Tạt' },
  clear:      { angles: [50, 56, 44, 38], vmax: 24, name: 'Phông' },
  lift:       { angles: [52, 60, 45, 40], vmax: 24, name: 'Lốp' },
  drop:       { angles: [12, 18, 25, 32, 40], vmax: 15, name: 'Bỏ nhỏ' },
  net:        { angles: [30, 40, 50, 60, 68, 75], vmax: 11, name: 'Bỏ lưới' },
  serveHigh:  { angles: [56, 62, 50], vmax: 22, name: 'Giao cao' },
  serveShort: { angles: [24, 30, 36, 44, 52], vmax: 13.5, name: 'Giao ngắn' },
};

for (const k in SHOTS) SHOTS[k].vmax *= PACE;

// ------------------------------------------------------------------ helpers
const rand = (a, b) => a + Math.random() * (b - a);
const randn = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const sgn = (team) => (team === 0 ? 1 : -1);                 // team 0 lives on z>0
const courtX = (team, right) => sgn(team) * (right ? 1 : -1);  // x sign of a team's right/left court

function stepShuttle(p, v, dt, w) {
  v.y -= G * dt;
  const rx = v.x - (w ? w.x * PACE : 0), rz = v.z - (w ? w.z * PACE : 0), ry = v.y;
  const f = DRAG * Math.hypot(rx, ry, rz) * dt;
  v.x -= rx * f; v.y -= ry * f; v.z -= rz * f;
  p.x += v.x * dt; p.y += v.y * dt; p.z += v.z * dt;
}

// serves: the server has time to read the wind, so aim off to cancel the drift (full compensation)
function aimIntoWind(from, target, shot, w, powerMul) {
  if (!w || (!w.x && !w.z)) return solveShot(from, target, shot, w, powerMul, 1);
  const aim = { x: target.x, z: target.z };
  let v = null;
  for (let i = 0; i < 4; i++) {
    v = solveShot(from, aim, shot, w, powerMul, 1);
    const r = simLand(from, v, w);
    const ex = r.x - target.x, ez = r.z - target.z;
    if (Math.hypot(ex, ez) < 0.05) break;
    aim.x -= ex; aim.z -= ez;
  }
  return v;
}

// a smash is hit flat out: full racket speed at the steepest downward angle that still clears the net and lands
// in the court (instead of easing off to reach a set spot). Lower contact = flatter, higher/jumping = steeper.
function smashShot(m, from, target, shot, powerMul, team) {
  const dx = target.x - from.x, dz = target.z - from.z, D = Math.hypot(dx, dz) || 0.01;
  const ux = dx / D, uz = dz / D, side = -sgn(team);
  for (const k of [1, 0.9, 0.8]) for (let deg = -24; deg <= 10; deg += 2) {
    const sp = shot.vmax * (powerMul || 1) * k;
    const a = deg * Math.PI / 180, v = { x: ux * Math.cos(a) * sp, y: Math.sin(a) * sp, z: uz * Math.cos(a) * sp };
    const r = simLand(from, v, m.wind);
    const depth = r.z * side;
    if (r.crossY !== null && r.crossY > NET_H + 0.08 && depth > 1.2 && depth < HALF_L - 0.25 && Math.abs(r.x) < m.halfW - 0.1) return v;
  }
  return null;   // no flat-out line works from here: fall back to a placed shot
}

// Position where a physics step intersects the net plane, not its end-of-step position.
function netCrossing(x, y, z, p) {
  if (z === 0 || Math.sign(z) === Math.sign(p.z)) return null;
  const f = z / (z - p.z);
  return { x: lerp(x, p.x, f), y: lerp(y, p.y, f) };
}

function simLand(p0, v0, w, record, maxT) {
  const p = { x: p0.x, y: p0.y, z: p0.z }, v = { x: v0.x, y: v0.y, z: v0.z };
  let crossY = null, t = 0;
  const pts = record ? [] : null;
  const lim = maxT || 6;
  while (t < lim) {
    const px = p.x, py = p.y, pz = p.z;
    stepShuttle(p, v, DT, w); t += DT;
    if (record) pts.push({ x: p.x, y: p.y, z: p.z, t });
    const cross = crossY === null ? netCrossing(px, py, pz, p) : null;
    if (cross) crossY = cross.y;
    if (p.y <= 0) break;
  }
  return { x: p.x, z: p.z, t, crossY, pts };
}

function solveShot(from, target, shot, w, powerMul, comp) {
  const dx = target.x - from.x, dz = target.z - from.z;
  const D = Math.hypot(dx, dz) || 0.01;
  const ux = dx / D, uz = dz / D;
  const vmax = shot.vmax * (powerMul || 1);
  const k = comp === undefined ? 0.55 : comp;              // in rallies players only half-compensate the wind
  const ww = w ? { x: w.x * k, z: w.z * k } : null;
  let best = null;
  const score = (c) => Math.min(c.clear, 0.3) * 3 - Math.max(0, c.short);
  for (const deg of shot.angles) {
    const a = deg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const mk = (s) => ({ x: ux * ca * s, y: sa * s, z: uz * ca * s });
    let lo = 0.5, hi = vmax, r;
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      r = simLand(from, mk(mid), ww);
      const dist = (r.x - from.x) * ux + (r.z - from.z) * uz;
      if (dist < D) lo = mid; else hi = mid;
    }
    const v = mk(hi);
    r = simLand(from, v, ww);
    const clear = r.crossY !== null ? r.crossY - NET_H : -9;
    const dist = (r.x - from.x) * ux + (r.z - from.z) * uz;
    const cand = { v, clear, short: D - dist };
    if (clear > 0.12 && cand.short < 0.4) return v;
    if (!best || score(cand) > score(best)) best = cand;
  }
  return best.v;
}

// ------------------------------------------------------------------ stamina
// a.sta: 1 = fresh, 0 = exhausted. Below 70% fatigue gradually affects movement and shots.
const STA_FREE = 0.7;
const POINT_REST = 0.010, POINT_REST_DEEP = 0.05;   // between points: +1% of the bar, plus 5% of whatever is missing
const STA_RATE = 1;      // costs below are fractions of the full bar before endurance
const fatigue = (a) => clamp((STA_FREE - (a.sta === undefined ? 1 : a.sta)) / STA_FREE, 0, 1);
const tired = {
  move: (a) => 1 - 0.12 * fatigue(a),
  jump: (a) => 1 - 0.15 * fatigue(a),
  power: (a) => 1 - 0.15 * fatigue(a),
  control: (a) => 1 - 0.15 * fatigue(a),
};
function useStamina(m, a, amt) {
  const before = a.sta;
  a.sta = clamp(a.sta - amt * a.st.endurance * STA_RATE, 0, 1);
  if (before >= 0.3 && a.sta < 0.3) emit(m, { type: 'tired', i: a.i });
}
// deep: extra recovery per unit of missing stamina (a breather restores more the more tired you are), so long games
// settle at a tired-but-playable level instead of running everyone down to zero
function restAll(m, amt, deep) { for (const a of m.athletes) a.sta = clamp(a.sta + (amt + (deep || 0) * (1 - a.sta)) / a.st.endurance, 0, 1); }
// control: 1 at ctl 3. ctlErr scales every kind of scatter (0.77 at ctl 5 fresh .. 1.3 at ctl 1; worse when tired)
const ctlErr = (a) => 1 / (a.st.control * tired.control(a));
// a heavy smash (power stat, taken high, hitter not tired) is harder to control for whoever has to return it
const HEAVY_REF = 1.05;
function heavyOf(m, a) { const s = m.shuttle; return s.heavy && s.lastTeam !== a.team ? s.heavy : 0; }

// ------------------------------------------------------------------ match
/*
 opts: { mode:'1v1'|'2v2', points:11|21, games:1|3 (best of), venue:index, hitStop:bool,
         slots:[{ name, char, ctrl:'human'|'bot', diff }] }   (2v2: slots 0,1 = team 0; 2,3 = team 1)
*/
function createMatch(opts) {
  const doubles = opts.mode === '2v2';
  const m = {
    opts, doubles, venue: VENUES[opts.venue] || VENUES[0],
    halfW: doubles ? DBL_W : HALF_W,
    athletes: [], shuttle: null,
    state: 'serve', stateT: 0, clock: 0, hitStop: 0,
    score: [0, 0], games: [0, 0], gameNo: 1, gamesToWin: Math.ceil((opts.games || 1) / 2), gameScores: [], serverTeam: 0, serverIdx: 0, receiverIdx: 1,
    right: [0, 0], left: [0, 0],
    wind: { x: 0, z: 0 }, windBase: Math.random() * Math.PI * 2,
    rally: 0, longest: 0, serveShot: false, winner: -1, pointsLog: [],
    events: [], hist: [],
  };
  const per = doubles ? 2 : 1;
  opts.slots.forEach((s, i) => {
    const team = i < per ? 0 : 1;
    m.athletes.push({
      i, team, name: s.name || (s.ctrl === 'bot' ? 'Bot' : 'Người chơi'), char: s.char, hand: s.hand === 'L' ? 'L' : 'R', ctrl: s.ctrl, diff: s.diff || 0,
      sta: 1, reachT0: -1, hitQueue: 0, hitPower: undefined, ignoreHit: false, st: charStats(s.char, s.gear), gear: Object.values(gearSet(s.gear)).map((g) => g.id), assist: s.ctrl === 'human' ? clamp(s.assist === undefined ? 1 : s.assist | 0, 0, 2) : 0,
      x: 0, z: sgn(team) * 4, vx: 0, vz: 0, jumpY: 0, vy: 0,
      swingT: -1, swingHigh: true, swingHit: false,
      diveT: -1, diveDx: 0, diveDz: 0, recoverT: 0,
      splitT: 0, mood: 0, emote: 0, emoteT: 0, lag: 0,
      tx: 0, tz: sgn(team) * 4, jumpAt: -1, plan: null, home: { x: 0, z: sgn(team) * 3.7 },
      input: { x: 0, y: 0, hit: false, jump: false, dive: false, emote: 0, power: -1, hold: false, holdPower: 0 },
      stats: { hits: 0, perfect: 0, smash: 0, dives: 0, diveSaves: 0, winners: 0, errors: 0 },
    });
  });
  for (let t = 0; t < 2; t++) {
    const mem = m.athletes.filter((a) => a.team === t);
    m.right[t] = mem[0].i; m.left[t] = (mem[1] || mem[0]).i;
  }
  m.shuttle = { p: { x: 0, y: 1, z: 2 }, v: { x: 0, y: 0, z: 0 }, live: false, held: true, last: -1, lastTeam: -1, netted: false, landed: false, pred: null };
  m.serverTeam = Math.random() < 0.5 ? 0 : 1;
  if (opts.firstServe !== undefined) m.serverTeam = opts.firstServe;
  startServe(m);
  return m;
}

function emit(m, e) { m.events.push(e); }

function newWind(m) {
  const v = m.venue, w = m.wind;
  if (v.wind === 'none') { w.x = w.z = 0; return; }
  let ang, str;
  if (v.wind === 'steady') { ang = (Math.cos(m.windBase) >= 0 ? 0 : Math.PI) + randn() * 0.12; str = v.max * rand(0.8, 1.0); }
  else if (v.wind === 'gusty') { ang = (Math.random() < 0.5 ? 0 : Math.PI) + randn() * 0.5; str = v.max * rand(0.3, 1.0); }
  else { ang = Math.random() * Math.PI * 2; str = v.max * rand(0.3, 1.0); }
  w.x = Math.cos(ang) * str; w.z = Math.sin(ang) * str;
}

function startServe(m) {
  m.state = 'serve'; m.stateT = 0; m.rally = 0; m.serveShot = false;
  m.hist.length = 0;
  const T = m.serverTeam, R = 1 - T;
  const right = m.score[T] % 2 === 0;
  m.serverIdx = right ? m.right[T] : m.left[T];
  m.receiverIdx = right ? m.right[R] : m.left[R];
  const d = m.doubles;
  for (const a of m.athletes) {
    a.vx = a.vz = 0; a.jumpY = 0; a.vy = 0; a.swingT = -1; a.diveT = -1; a.recoverT = 0; a.jumpAt = -1; a.plan = null; a.hitQueue = 0;
    const isRight = a.i === m.right[a.team];
    const myRight = d ? isRight : right;
    if (a.i === m.serverIdx) { a.x = courtX(T, right) * 1.0; a.z = sgn(T) * (d ? 2.5 : 3.2); }
    else if (a.i === m.receiverIdx) { a.x = courtX(R, right) * 1.0; a.z = sgn(R) * (d ? 2.6 : 3.0); }
    else { a.x = courtX(a.team, !right) * 1.35; a.z = sgn(a.team) * 4.4; }
    a.home = { x: d ? courtX(a.team, myRight) * 1.3 : 0, z: sgn(a.team) * (d ? 3.4 : 3.7) };
    a.tx = a.x; a.tz = a.z;
  }
  const s = m.shuttle;
  s.live = false; s.held = true; s.last = -1; s.lastTeam = -1; s.netted = false; s.landed = false; s.pred = null; s.heavy = 0;
  holdShuttle(m);
  newWind(m);
  emit(m, { type: 'serve', server: m.serverIdx });
}

function holdShuttle(m) {
  // held in the free (non-racket) paw, raised in front: matches what the client draws
  const a = m.athletes[m.serverIdx], sg = sgn(a.team), hs = a.hand === 'L' ? -1 : 1;
  m.shuttle.p.x = a.x - sg * hs * 0.36; m.shuttle.p.y = 0.56; m.shuttle.p.z = a.z - sg * 0.19;
}

const ASSIST_REACH = [1, 1.08, 1.2];
const BOT_REACH = [1.0, 1.12, 1.14, 1.2];   // stronger bots lunge further instead of running faster
// bots run at their difficulty's pace, so foot speed is their binding limit and every bit of it decides rallies;
// a human already outruns them. Bots therefore feel only half of the speed stat's spread (same win value per point).
const BOT_SPD = 0.5;
const botPace = (a) => 1 + (a.st.speed / 5.06 - 1) * BOT_SPD;
const REACH_H = 1.8;   // top of the racket's reach standing (the models are drawn to match)
function inReachAt(a, p) {
  const dh = Math.hypot(p.x - a.x, p.z - a.z);
  const diving = a.diveT >= 0;
  const rH = (diving ? 1.75 : 1.05) * a.st.reach * (a.ctrl === 'bot' ? BOT_REACH[a.diff || 0] : ASSIST_REACH[a.assist || 0]) + (a._extra || 0);
  const yMin = diving ? 0.0 : 0.15;
  const yMax = diving ? 1.2 : (REACH_H + a.jumpY + (a.assist ? 0.12 : 0)) * (1 + (a.st.reach - 1) * 0.5);
  return { ok: dh < rH && p.y > yMin && p.y < yMax, dh, rH };
}
function inReach(m, a) { return inReachAt(a, m.shuttle.p); }

function histAt(m, t) {
  const h = m.hist;
  for (let i = h.length - 1; i >= 0; i--) if (h[i].t <= t) return h[i];
  return h[0];
}

function doHit(m, a, shotName, target, q, label, pw) {
  const s = m.shuttle, shot = SHOTS[shotName];
  if (m.doubles && m.serveShot && a.team !== s.lastTeam && a.i !== m.receiverIdx) {
    s.live = false; s.held = false; s.landed = true; s.pred = null;
    m.hist.length = 0;
    awardPoint(m, m.serverTeam, 'Sai người đỡ giao cầu');
    return;
  }
  // Rewind samples belong only to the current flight, never the incoming shot we just returned.
  m.hist.length = 0;
  if (pw !== undefined && pw > 0.92) q *= 1 - (pw - 0.92) * 0.6;
  const err = 1 - q;
  // how far off target a shot lands. Players: Perfect = exactly where aimed, Good = ~15-20 cm off,
  // poor timing = ~0.5-0.7 m off (so aiming at the lines with a poor hit is risky)
  const human = a.ctrl === 'human';
  const off = human ? (q > 0.9 ? 0 : Math.pow(err, 1.1) * 1.75 * ctlErr(a)) : err * 1.1 * ctlErr(a);   // Good ~25-30 cm, poor ~0.7-0.9 m
  const t = { x: target.x + randn() * off, z: target.z + randn() * off * (human ? 1.25 : 1.1) };
  let blunder = 0;
  if (a._blunder) {   // bot unforced error: into the net, or wide / long
    a._blunder = false;
    const kind = Math.random();
    if (kind < 0.45) blunder = 1;
    else if (kind < 0.75) t.x = (Math.sign(target.x) || 1) * (m.halfW + rand(0.2, 0.7));
    else t.z = target.z + Math.sign(target.z) * rand(1.0, 1.8);
  }
  const from = { x: s.p.x, y: s.p.y, z: s.p.z };
  const botPow = a.ctrl === 'bot' && (shotName === 'smash' || shotName === 'drive') ? [0.85, 0.92, 0.97, 1.04][a.diff] : a.ctrl === 'human' && shotName === 'smash' ? 1.12 : 1;
  useStamina(m, a, shotName === 'smash' ? 0.014 : shotName === 'serveHigh' || shotName === 'serveShort' ? 0.002 : shotName === 'drive' || shotName === 'clear' || shotName === 'lift' ? 0.004 : 0.003);
  // assisted players leap into their smashes like the bots do: the contact is taken high
  const assistedContact = 2.05 + (a.st.jumpVy - 4.94) * 0.2 + 0.30 * tired.jump(a);
  if (shotName === 'smash' && human && a.assist && from.y < assistedContact && a.sta >= 0.15) { from.y = assistedContact; s.p.y = assistedContact; if (a.jumpY === 0) { a.vy = a.st.jumpVy * 0.85; a.jumpY = 0.001; } }
  // a smash taken higher (jump) comes down harder: +/- 2.5% per 10 cm of contact height around 2.4 m
  const hf = shotName === 'smash' ? clamp(1 + (from.y - 2.4) * 0.25, 0.88, 1.1) : 1;
  const pm = botPow * hf * (shotName === 'smash' || shotName === 'drive' ? a.st.power * tired.power(a) : 1) * (pw !== undefined && (shotName === 'smash' || shotName === 'drive') ? 0.86 + 0.26 * pw : 1);
  const isServe = shotName === 'serveHigh' || shotName === 'serveShort';
  // wind: serves and Perfect hits read it fully; Good hits mostly; poor hits barely (the wind gets them)
  const comp = isServe || (human && q > 0.9) ? 1 : human ? (q > 0.62 ? 0.8 : 0.25) : 0.55;
  // the player aims off for the part of the wind they read (comp); the rest still pushes the shuttle
  const readWind = m.wind && comp < 1 ? { x: m.wind.x * comp, z: m.wind.z * comp } : m.wind;
  let v = shotName === 'smash' ? smashShot(m, from, t, shot, pm, a.team) : null;
  if (!v) v = human || isServe ? aimIntoWind(from, t, shot, readWind, pm) : solveShot(from, t, shot, m.wind, pm, comp);
  // a Perfect hit always clears the net: if this line would clip the tape, lift it a little until it doesn't
  if (human && q > 0.9 && !isServe) {
    for (let i = 0; i < 12; i++) { const r = simLand(from, v, m.wind); if (r.crossY === null || r.crossY > NET_H + 0.08) break; v.y += 0.5 * PACE; }
  }
  let mult = 1 + randn() * err * 0.07 * ctlErr(a);
  if (q < 0.22) mult *= rand(0.72, 0.9);
  if (blunder) mult *= rand(0.5, 0.65);
  s.v.x = v.x * mult; s.v.y = v.y * mult; s.v.z = v.z * mult;
  s.live = true; s.held = false; s.netted = false; s.last = a.i; s.lastTeam = a.team;
  s.heavy = shotName === 'smash' ? a.st.power * tired.power(a) * hf / HEAVY_REF - 1 : 0;
  m.serveShot = shotName === 'serveHigh' || shotName === 'serveShort';
  m.rally++;
  a.stats.hits++;
  if (a.diveT >= 0) a._diveHit = true;
  if (shotName === 'smash') a.stats.smash++;
  if (q > 0.9 && !m.serveShot) a.stats.perfect++;
  const speed = Math.hypot(s.v.x, s.v.y, s.v.z);
  if (shotName === 'smash' && q > 0.7 && m.opts.hitStop) m.hitStop = q > 0.9 ? 0.1 : 0.06;
  emit(m, { type: 'hit', i: a.i, shot: shotName, q, label: label || null, speed, x: s.p.x, y: s.p.y, z: s.p.z, pw: pw === undefined ? -1 : Math.round(pw * 100) / 100 });
  // split step for the receiving team
  for (const o of m.athletes) if (o.team !== a.team) { o.splitT = 0.28; o.swingHit = false; o.hitQueue = 0; o.ignoreHit = false; }
  // predict
  const r = simLand(s.p, s.v, m.wind, true);
  s.pred = { x: r.x, z: r.z, t: r.t, inside: Math.abs(r.x) <= m.halfW + 0.02 && Math.abs(r.z) <= HALF_L + 0.02 };
  if (m.serveShot && s.pred.inside && serveFault(m, r.x, r.z, a.team)) s.pred.inside = false;   // wrong box counts as out
  planTeam(m, 1 - a.team, r, s.pred.inside);
  coverHomes(m, a.team);
  for (const o of m.athletes) if (o.team === a.team && o.ctrl === 'bot') { o.plan = null; o.tx = o.home.x; o.tz = o.home.z; o.jumpAt = -1; }
}

function chooseTarget(m, a, shotName, aimX, pw) {
  const opps = m.athletes.filter((o) => o.team !== a.team);
  const zs = -sgn(a.team);
  const deepD = m.doubles ? [4.9, 5.9] : [5.2, 6.1];
  const k01 = (lo, hi) => clamp((pw - lo) / (hi - lo), 0, 1);
  let depth = pw !== undefined ? {
    smash: lerp(3.0, 4.6, k01(0.72, 1)), drive: lerp(4.2, m.doubles ? 5.5 : 5.9, k01(0.72, 1)),
    clear: lerp(4.3, m.doubles ? 5.8 : 6.15, k01(0.35, 0.72)), lift: lerp(4.4, m.doubles ? 5.8 : 6.1, k01(0.4, 1)),
    drop: lerp(0.8, 2.4, k01(0, 0.35)), net: lerp(0.5, 1.6, k01(0, 0.4)),
    serveHigh: m.doubles ? rand(5.1, 5.6) : rand(5.6, 6.2), serveShort: rand(2.1, 2.5),
  }[shotName] : {
    smash: rand(3.0, 5.4), drive: rand(4.0, 5.6), clear: rand(deepD[0], deepD[1]), lift: rand(5.0, 6.0),
    drop: rand(1.0, 2.3), net: rand(0.6, 1.5),
    serveHigh: m.doubles ? rand(5.1, 5.6) : rand(5.6, 6.2), serveShort: rand(2.1, 2.5),
  }[shotName];
  // drops / net shots from deep in the court need more room to clear the net
  // touch: a controlled player drops it tighter to the net (ctl 5: 20% shorter, ctl 1: 20% longer)
  if (shotName === 'drop' || shotName === 'net') depth = Math.max(depth * (2 - a.st.control), Math.abs(a.z) * 0.36 - 0.2);
  const W = m.doubles ? 2.6 : 2.2;
  // stronger bots place closer to the lines; a player's control stat does the same, gently (ctl 5: 0.36 m from the line, ctl 1: 0.44 m),
  // which is what control buys someone whose timing is already Perfect
  const edge = a.ctrl === 'bot' ? [0.6, 0.2, 0.15, 0.05][a.diff] : clamp(0.4 - (a.st.control - 1) * 0.6, 0.2, 0.6);
  let x;
  if (aimX) x = aimX * rand(W - 0.3, W + 0.05) * sgn(a.team);   // aiming goes for the lines: risky unless Perfect
  else {
    let best = -1, bx = 0;
    for (const cx of [-2.2, -1.4, -0.6, 0.6, 1.4, 2.2]) {
      const px = cx * (W - edge) / 2.2;
      let dmin = 99;
      for (const o of opps) dmin = Math.min(dmin, Math.abs(px - o.x) + Math.abs(zs * depth - o.z) * 0.3);
      const sc = dmin + Math.random() * 1.2;
      if (sc > best) { best = sc; bx = px; }
    }
    x = bx;
  }
  return { x: clamp(x, -W, W), z: zs * depth };
}

// ------------------------------------------------------------------ bots
// doubles: a bot holds the half of the court its partner is not standing in (sides are re-read on every hit)
function coverHomes(m, team) {
  if (!m.doubles) return;
  const t = m.athletes.filter((o) => o.team === team); if (t.length !== 2) return;
  const hx = Math.max(Math.abs(t[0].home.x), Math.abs(t[1].home.x), 1), side = t[0].x >= t[1].x ? 1 : -1;
  if (t[0].ctrl === 'bot') t[0].home.x = side * hx;
  if (t[1].ctrl === 'bot') t[1].home.x = -side * hx;
}
// the mate who is not taking the shuttle: opposite half, and behind a front contact / in front of a deep one
function coverSpot(b, p, sg, taker, m) {
  const az = Math.abs(p.z), hx = Math.abs(b.home.x) || 1;
  b.plan = { yield: true, to: taker.i, t0: m.clock, react: 0 };
  b.tx = Math.abs(p.x) < 0.4 ? b.home.x : (p.x > 0 ? -hx : hx) * 0.8;
  b.tz = sg * (az < 2.6 ? 4.3 : az > 4.5 ? 2.9 : Math.abs(b.home.z));
}
function planTeam(m, team, r, landIn) {
  const mates = m.athletes.filter((o) => o.team === team);
  const bots = mates.filter((o) => o.ctrl === 'bot');
  const human = mates.find((o) => o.ctrl === 'human');
  if (!bots.length) return;
  const sg = sgn(team);
  coverHomes(m, team);
  const rcv = m.doubles && m.serveShot ? m.athletes[m.receiverIdx] : null;   // doubles: only the receiver may return a serve
  const margin = m.serveShot && !landIn ? 1 : Math.max(Math.abs(r.x) - m.halfW, Math.abs(r.z) - HALF_L);
  let best = null;
  for (const b of bots) {
    b.plan = null; b.jumpAt = -1; b._cand = null;
    const d = DIFF[b.diff];
    if (rcv && b !== rcv) { b.plan = { leave: true, t0: m.clock, react: d.react }; b.tx = b.home.x; b.tz = b.home.z; continue; }
    if (!landIn && margin > 0.12 && Math.random() < d.judge) { b.plan = { leave: true, t0: m.clock, react: d.react }; b.tx = b.home.x; b.tz = b.home.z; continue; }
    const spd = d.speed * botPace(b) * tired.move(b);
    const jv = b.st.jumpVy * tired.jump(b);
    const yMax = d.jump ? REACH_H + jv * jv / 26 : REACH_H - 0.1;
    const cands = [];
    for (let i = 0; i < r.pts.length; i += 2) {
      const p = r.pts[i];
      if (p.z * sg < 0.35 || p.y < 0.3 || p.y > yMax) continue;
      const dist = Math.max(0, Math.hypot(p.x - b.x, p.z - b.z) - 0.75 * b.st.reach * BOT_REACH[b.diff || 0]);
      if (dist / spd + d.react <= p.t) cands.push(p);
    }
    let pick, slack = 0;
    if (cands.length) {
      if (d.attack === 2) pick = cands.reduce((x, y) => (y.y > x.y + 0.05 ? y : x));
      else if (d.attack === 1) pick = cands[Math.floor(cands.length * rand(0.3, 0.8))];
      else pick = cands[Math.floor(cands.length * rand(0.6, 0.95))];
      slack = cands.length;
    } else {
      const last = r.pts[r.pts.length - 1];
      pick = { x: last.x, z: last.z, y: 0.4, t: last.t, desperate: true };
    }
    const dist = Math.hypot(pick.x - b.x, pick.z - b.z);
    const cost = dist - slack * 0.002 + (cands.length ? 0 : 2.5);   // a mate who can really get there goes before one who would have to lunge
    b._cand = { pick, cost, dist, react: d.react };
    if (!best || cost < best._cand.cost) best = b;
  }
  if (!best) return;
  // with a human partner: leave shots on the human's half when they're nearby
  // with a human partner: the nearer one takes it. The human gets it when they are practically there already,
  // or when the bot could only lunge and the human is closer. The bot then covers and steps in only if the human is far off.
  if (human && best._cand && !rcv) {
    const c = best._cand, p = c.pick;
    const hd = Math.hypot(p.x - human.x, p.z - human.z);
    if ((hd < 1.4 && hd <= c.dist + 0.3) || (p.desperate && hd < c.dist)) { for (const b of bots) if (!b.plan) coverSpot(b, p, sg, human, m); return; }
  }
  for (const b of bots) {
    if (b.plan) continue;
    if (b !== best) { coverSpot(b, best._cand.pick, sg, best, m); continue; }
    const p = b._cand.pick;
    b.plan = { p, react: b._cand.react, t0: m.clock };
    b.tx = p.x - sg * 0.3; b.tz = p.z + sg * 0.25;
    b.jumpAt = p.y > REACH_H - 0.05 ? m.clock + Math.max(0, p.t - 0.38) : -1;
  }
}

function botChooseShot(m, b) {
  const d = DIFF[b.diff], s = m.shuttle.p, az = Math.abs(b.z);
  if (s.y > 1.58 && az < 5.6 && b.sta >= 0.15 && Math.random() < d.smash * clamp(b.sta / 0.6, 0.25, 1)) return 'smash';
  if (s.y < 1.05) return az < 2.6 && Math.random() < 0.55 ? 'net' : 'lift';
  const r = Math.random();
  let shot;
  if (m.doubles) shot = r < 0.3 ? 'clear' : r < 0.55 ? 'drop' : 'drive';
  else shot = r < 0.45 ? 'clear' : r < 0.75 ? 'drop' : 'drive';
  // smarter bots play away from the opponent: drop when they're deep, clear when they're up at the net
  if (d.attack >= 1 && Math.random() < 0.35 + d.attack * 0.2) {
    const opp = m.athletes.filter((o) => o.team !== b.team);
    const oz = Math.min(...opp.map((o) => Math.abs(o.z)));
    if (oz > 4.6) shot = 'drop'; else if (oz < 2.8) shot = 'clear';
  }
  // low contact: a flat shot would hit the net, so lift it or play a soft net shot
  if (shot === 'drive' && s.y < 1.5) shot = az < 3 ? 'net' : 'clear';
  if (shot === 'drop' && s.y < 1.75) shot = 'net';
  return shot;
}

function serveTarget(m, a, short, aimX) {
  const R = 1 - a.team;
  const right = m.score[a.team] % 2 === 0;
  const cx = courtX(R, right);
  const W = m.doubles ? DBL_W : HALF_W;
  // aim inside the box with a safety margin from every line (aimX nudges toward the centre or the side line)
  const x = cx * clamp(rand(0.9, 1.6) + (aimX || 0) * 0.45 * sgn(a.team) * cx, 0.5, W - 0.5);
  const z = sgn(R) * (short ? rand(2.35, 2.7) : (m.doubles ? rand(5.0, 5.5) : rand(5.6, 6.2)));
  return { x, z };
}

// ------------------------------------------------------------------ athlete tick
function moveAthlete(m, a, mx, mz, speed, dt) {
  if (a.recoverT > 0) { a.recoverT -= dt; mx = mz = 0; }
  if (a.diveT >= 0) {
    a.diveT += dt;
    const k = Math.max(0, 1 - a.diveT / 0.35);
    a.x += a.diveDx * 8.5 * dt * k; a.z += a.diveDz * 8.5 * dt * k;
    if (a.diveT > 0.35) {
      a.diveT = -1; a.recoverT = 0.55 * (1 + 0.7 * fatigue(a));
    }
    a.vx = a.vz = 0;
  } else {
    speed *= tired.move(a);
    const air = a.jumpY > 0 ? 0.6 : 1;
    const boost = a.splitT > 0 && m.opts.autoSplit !== false ? 1.08 : 1;
    const accel = a.ctrl === 'bot' ? 8 * (1 + (a.st.accel / 14 - 1) * BOT_SPD) : a.st.accel;   // bots build up speed and brake more gradually (looks like running, not sliding)
    a.vx = damp(a.vx, mx * speed * air * boost, accel, dt);
    a.vz = damp(a.vz, mz * speed * air * boost, accel, dt);
    a.x += a.vx * dt; a.z += a.vz * dt;
    if (m.state === 'rally') {
      const effort = Math.min(1, Math.hypot(a.vx, a.vz) / (a.st.speed * tired.move(a)));
      if (effort > 0.15) useStamina(m, a, effort * effort * 0.0015 * dt);   // running costs a little; no recovery during a rally
    }
  }
  if (a.jumpY > 0 || a.vy > 0) { a.vy -= 13 * dt; a.jumpY += a.vy * dt; if (a.jumpY <= 0) { a.jumpY = 0; a.vy = 0; } }
  a.x = clamp(a.x, -3.8, 3.8);
  const az = clamp(Math.abs(a.z) * (Math.sign(a.z) === sgn(a.team) ? 1 : -1), 0.45, 8.2);
  a.z = az * sgn(a.team);
  if (a.swingT >= 0) { a.swingT += dt; if (a.swingT > 0.4) a.swingT = -1; }
  if (a.splitT > 0) a.splitT -= dt;
  if (a.emoteT > 0) { a.emoteT -= dt; if (a.emoteT <= 0) a.emote = 0; }
}

// server and receiver must stay inside their diagonal service courts until the serve
function keepInServiceBox(m, a) {
  if (a.i !== m.serverIdx && a.i !== m.receiverIdx) return;
  const right = m.score[m.serverTeam] % 2 === 0;           // server's score even: right courts, odd: left courts
  const sx = courtX(a.team, right), sz = sgn(a.team);
  const W = m.doubles ? DBL_W : HALF_W, back = m.doubles ? HALF_L - LONG_SERVE : HALF_L;
  const ax = clamp(a.x * sx, 0.18, W - 0.15), az = clamp(a.z * sz, SHORT_LINE + 0.2, back - 0.15);
  if (ax !== a.x * sx) a.vx = 0;
  if (az !== a.z * sz) a.vz = 0;
  a.x = ax * sx; a.z = az * sz;
}

function startSwing(m, a) {
  if (a.swingT >= 0 && a.swingT < 0.3) return false;
  a.swingT = 0; a.swingHit = false;
  a.swingHigh = m.shuttle.p.y > 1.3 || a.jumpY > 0.2;
  emit(m, { type: 'swing', i: a.i });
  return true;
}

function humanShot(m, a, iy, pw) {
  const s = m.shuttle.p, az = Math.abs(a.z);
  if (pw !== undefined) {
    if (s.y < 1.05) return pw < 0.4 ? 'net' : 'lift';
    if (s.y > 1.45 && (a.jumpY > 0.25 || a.assist) && pw >= 0.72 && a.sta >= 0.15) return 'smash';
    if (pw < 0.35) return s.y < 1.75 ? 'net' : 'drop';   // low shuttle: lift it softly over the net
    if (pw >= 0.72 && s.y > 1.35) return 'drive';
    return 'clear';
  }
  if ((a.jumpY > 0.25 || (a.assist && s.y > 1.7)) && s.y > 1.6 && iy <= 0.4) return 'smash';
  if (s.y < 1.05) return iy < -0.4 ? 'net' : (iy > 0.4 ? 'lift' : (az < 2.6 ? 'net' : 'lift'));
  if (iy > 0.4) return s.y < 1.75 ? 'net' : 'drop';
  if (iy < -0.4) return s.y > 1.58 && az > 2.5 ? 'smash' : 'drive';
  return 'clear';
}

// the shuttle must have fully crossed to your side before you (or a bot) can play it: no reaching over or through the net
const OWN_SIDE = 0.05;
const EARLY_BUFFER = 1.0;   // seconds a 'Thường/Dễ' press is remembered before the shuttle reaches the racket
function tickHuman(m, a, dt) {
  const inp = a.input, sg = sgn(a.team);
  // screen-space input -> world (team 1 sees the court from the other end)
  // never trust the wire: a crafted client could send a longer-than-unit (or non-numeric) move vector
  let ix = +inp.x, iy = +inp.y;
  if (!Number.isFinite(ix)) ix = 0;
  if (!Number.isFinite(iy)) iy = 0;
  const il = Math.hypot(ix, iy);
  if (il > 1) { ix /= il; iy /= il; }
  const wx = ix * sg, wz = iy * sg;
  const canMove = m.state === 'rally' || m.state === 'serve';   // before the serve both server and receiver can step around their box
  if (inp.emote) { a.emote = inp.emote; a.emoteT = 2.4; emit(m, { type: 'emote', i: a.i, e: inp.emote }); inp.emote = 0; }
  if (inp.jump && a.jumpY === 0 && a.diveT < 0 && a.recoverT <= 0 && m.state === 'rally') { a.vy = a.st.jumpVy * tired.jump(a); a.jumpY = 0.001; useStamina(m, a, 0.01); emit(m, { type: 'jump', i: a.i }); }
  if (inp.dive && a.diveT < 0 && a.recoverT <= 0 && a.jumpY === 0 && canMove && m.state === 'rally') {
    let dx = wx, dz = wz;
    if (!dx && !dz && m.shuttle.pred) { dx = m.shuttle.pred.x - a.x; dz = m.shuttle.pred.z - a.z; }
    const l = Math.hypot(dx, dz) || 1; a.diveDx = dx / l; a.diveDz = dz / l;
    a.diveT = 0; a.swingT = -1; startSwing(m, a); a.swingHigh = false; a.stats.dives++;
    useStamina(m, a, 0.025); emit(m, { type: 'dive', i: a.i });
  }
  const PW = inp.power === undefined || inp.power < 0 ? undefined : clamp(inp.power, 0, 1);
  if (inp.hit && a.ignoreHit) { inp.hit = false; a.ignoreHit = false; }
  const aimDir = (x) => (x > 0.35 ? 1 : x < -0.35 ? -1 : 0);
  if (inp.hit) {
    a.hitPower = PW; a.aimX = aimDir(inp.x);
    if (m.state === 'serve' && a.i === m.serverIdx) {
      serve(m, a, PW !== undefined ? PW < 0.4 : inp.y < -0.4, inp.x);
    } else if (m.state === 'rally') {
      const sh = m.shuttle;
      const inc = sh.live && !sh.netted && sh.lastTeam !== a.team;
      let rewound = false;
      if (a.assist && inc && a.lag > 0.02 && !inReach(m, a).ok) {
        // online: the player sees the shuttle `lag` s late. If it reached the racket within that window,
        // the press was on time from their point of view: hit it from where it was (favour the player)
        for (const h of m.hist) {
          if (h.t < m.clock - a.lag - 0.04 || h.z * sgn(a.team) < OWN_SIDE) continue;
          if (inReachAt(a, h).ok) { sh.p.x = h.x; sh.p.y = h.y; sh.p.z = h.z; a.hitQueue = m.clock - 0.12; a.reachT0 = -1; rewound = true; emit(m, { type: 'swing', i: a.i }); break; }
        }
      }
      if (rewound) { /* resolved by the buffered-hit code below */ }
      // with assist, every press while the shuttle is coming (or already at the racket) goes through the
      // buffered hit, which grades timing the same way the timing meter shows it
      else if (a.assist && inc) { a.hitQueue = m.clock; emit(m, { type: 'swing', i: a.i }); }
      else startSwing(m, a);
    }
  }
  inp.hit = inp.jump = inp.dive = false;
  const s = m.shuttle;
  const incoming = m.state === 'rally' && s.live && !s.netted && s.lastTeam !== a.team;
  // you can always move: a queued hit no longer freezes you (left/right while it is queued also sets the aim)
  let mx = canMove ? wx : 0, mz = canMove ? wz : 0;
  // clearly out: the assists leave it alone (the player can still play it by pressing hit)
  const clearlyOut = !!(s.pred && Math.max(Math.abs(s.pred.x) - m.halfW, Math.abs(s.pred.z) - HALF_L) > 0.3);
  // going out (even narrowly): nothing plays it for you - no buffered press, no held button, no auto hit, no auto dive
  const goingOut = !!(s.pred && Math.max(Math.abs(s.pred.x) - m.halfW, Math.abs(s.pred.z) - HALF_L) > 0.1);
  // assist: steer toward where the shuttle comes down when the player isn't moving
  // movement assists are for games vs bots only; online PvP sets opts.moveAssist = false
  const moveAssist = a.assist >= 1 && m.opts.moveAssist !== false;
  if (moveAssist && incoming && s.pred && (!clearlyOut || a.hitQueue > 0) && Math.hypot(mx, mz) < 0.1 && a.diveT < 0) {
    const tx = s.pred.x - sg * 0.25, tz = s.pred.z + sg * 0.35;
    const dx = tx - a.x, dz = tz - a.z, l = Math.hypot(dx, dz);
    if (l > 0.25 && Math.abs(s.pred.z) < HALF_L + 0.6 && Math.abs(s.pred.x) < m.halfW + 0.6) { const k = Math.min(1, l / 0.8) * (a.assist >= 2 ? 1 : 0.85); mx = dx / l * k; mz = dz / l * k; }
  }
  // assist: after our own shot, drift back to the base position when the player isn't steering
  if (moveAssist && m.state === 'rally' && s.live && s.lastTeam === a.team && Math.hypot(mx, mz) < 0.1 && a.diveT < 0) {
    const dx = a.home.x - a.x, dz = a.home.z - a.z, l = Math.hypot(dx, dz);
    if (l > 0.3) { const k = Math.min(1, l / 1.2) * (a.assist >= 2 ? 0.9 : 0.75); mx = dx / l * k; mz = dz / l * k; }
  }
  moveAthlete(m, a, mx, mz, a.st.speed, dt);
  if (m.state === 'serve') keepInServiceBox(m, a);

  // when did the shuttle come into reach? (pressing right as it arrives counts as on time)
  if (incoming && inReach(m, a).ok) { if (a.reachT0 < 0) a.reachT0 = m.clock; } else a.reachT0 = -1;
  // buffered hit: pressed early, fires the moment the shuttle reaches the racket
  if (a.hitQueue > 0) {
    const delay = m.clock - a.hitQueue;
    // an early press is remembered for at most 1 s (EARLY_BUFFER); earlier than that it is dropped and you must press again
    if (!incoming || delay > EARLY_BUFFER) a.hitQueue = 0;
    else {
      const r = inReach(m, a);
      // a shuttle that is clearly going out is left alone by an early (buffered) press: to play it anyway,
      // press when it is actually at the racket
      if (goingOut && r.ok && delay > 0.15) a.hitQueue = 0;
      else if (r.ok && s.p.z * sg > OWN_SIDE) {
        a.hitQueue = 0; a.swingT = 0; a.swingHit = true; a.swingHigh = s.p.y > 1.3;
        const lateBy = a.reachT0 >= 0 ? Math.max(0, m.clock - a.reachT0 - (a.lag || 0)) : 0;   // how long it had been at the racket (minus online lag)
        const c = 1 / ctlErr(a);   // control widens every timing window (and fatigue narrows it)
        let q = delay < 0.04 ? (lateBy < 0.2 * c ? 1 : lateBy < 0.35 * c ? 0.84 : 0.7) : delay <= 0.38 * c ? 1 : Math.max(0.6, 1 - (delay - 0.38 * c) * 0.4);
        q *= 1 - Math.max(0, r.dh / r.rH - 0.92) * 1.5;   // only a touch worse at the very edge of your reach
        q -= Math.max(0, heavyOf(m, a)) * 0.6;            // a heavy smash is hard to place back
        q = clamp(q, 0.45, 1);
        const pw = a.hitPower;
        const shot = humanShot(m, a, inp.y, pw);
        if (shot === 'smash' && a.jumpY === 0) { a.vy = a.st.jumpVy * 0.85 * tired.jump(a); a.jumpY = 0.001; }
        const ax = aimDir(inp.x) || a.aimX || 0;
        doHit(m, a, shot, chooseTarget(m, a, shot, ax, pw), q, shot === 'smash' ? 'smash' : q > 0.9 ? 'perfect' : delay < 0.05 ? 'late' : q > 0.62 ? 'good' : 'early', pw);
        return;
      }
      // shuttle dropping just out of reach: dive for it
      if (!goingOut && s.p.y < 1.1 && s.v.y < 0 && a.diveT < 0 && a.recoverT <= 0 && a.jumpY === 0) {
        const dx = s.p.x - a.x, dz = s.p.z - a.z, dist = Math.hypot(dx, dz);
        if (dist > r.rH && dist < r.rH + 0.9) { a.diveDx = dx / dist; a.diveDz = dz / dist; a.diveT = 0; a.stats.dives++; useStamina(m, a, 0.004); emit(m, { type: 'dive', i: a.i }); }   // automatic lunge (~50 a game vs a hard bot): priced like a bot's hop, not like a chosen dive (0.025)
      }
    }
  }

  // still holding the button when the shuttle arrives: hit with the current charge
  if (incoming && inp.hold && a.assist >= 1 && !goingOut && !a.swingHit && !(a.swingT >= 0 && a.swingT <= 0.28) && s.p.z * sg > OWN_SIDE) {
    const r = inReach(m, a);
    if (r.ok && s.v.y < 0 && (r.dh < 0.65 || s.p.y < 1.25)) {
      const pw = clamp(inp.holdPower || 0, 0, 1);
      a.swingT = 0; a.swingHit = true; a.swingHigh = s.p.y > 1.3; a.ignoreHit = true;
      const shot = humanShot(m, a, inp.y, pw);
      if (shot === 'smash' && a.jumpY === 0) { a.vy = a.st.jumpVy * 0.85 * tired.jump(a); a.jumpY = 0.001; }
      const ax = aimDir(inp.x);
      doHit(m, a, shot, chooseTarget(m, a, shot, ax, pw), 0.88, shot === 'smash' ? 'smash' : 'good', pw);
      return;
    }
  }
  // auto hit: only the 'Dễ' assist (2) plays shots for you
  // auto save is an assist too: only in games vs bots (online sets opts.autoSave = false)
  if (incoming && a.assist >= 2 && m.opts.autoSave !== false && !goingOut && !a.swingHit && !(a.swingT >= 0 && a.swingT <= 0.28) && s.p.z * sg > OWN_SIDE) {
    const r = inReach(m, a);
    const leaving = s.v.y < 0 && (s.p.y < 0.55 || (a.assist >= 2 && (r.dh < 0.7 || s.p.y < 1.3)));
    if (r.ok && leaving) {
      a.swingT = 0; a.swingHit = true; a.swingHigh = s.p.y > 1.3;
      const q = a.assist >= 2 ? 0.74 : 0.5;
      const pw = a.assist >= 2 ? 0.5 : 0.45;
      const shot = humanShot(m, a, inp.y, pw);
      const ax = inp.x > 0.4 ? 1 : inp.x < -0.4 ? -1 : 0;
      doHit(m, a, shot, chooseTarget(m, a, shot, ax, pw), q, a.assist >= 2 ? 'good' : 'save', pw);
      return;
    }
  }
  const win = a.assist ? 0.3 : 0.24;
  if (incoming && a.swingT >= 0 && a.swingT <= win && !a.swingHit && s.p.z * sg > OWN_SIDE) {
    let r = inReach(m, a);
    if (!r.ok && a.lag > 0.01 && m.hist.length) { const h = histAt(m, m.clock - a.lag); if (h && h.z * sg > OWN_SIDE) { const r2 = inReachAt(a, h); if (r2.ok) r = r2; } }
    if (r.ok) {
      a.swingHit = true;
      const st = a.swingT, c = a.st.control * tired.control(a);
      const hiW = 0.15 * c * (1 + 0.3 * a.assist);
      const qt = st < 0.035 ? 0.55 + st * 6 : st <= hiW ? 1 : 1 - (st - hiW) * 4.5;
      const qd = 1 - Math.max(0, r.dh / r.rH - 0.45) * 0.6;
      let q = clamp(qt * qd - Math.max(0, heavyOf(m, a)) * 0.6, 0.1, 1);
      if (a.diveT >= 0) q = Math.min(q, 0.7);
      const pw = a.hitPower;
      const shot = humanShot(m, a, inp.y, pw);
      const ax = inp.x > 0.4 ? 1 : inp.x < -0.4 ? -1 : 0;
      const label = shot === 'smash' ? 'smash' : q > 0.9 ? 'perfect' : q > 0.62 ? 'good' : st < 0.035 ? 'late' : 'early';
      doHit(m, a, shot, chooseTarget(m, a, shot, ax, pw), q, label, pw);
    }
  }
}

function serve(m, a, short, aimX) {
  a.swingT = 0; a.swingHigh = false;
  m.state = 'rally'; m.stateT = 0;
  const q = a.ctrl === 'bot' ? clamp(DIFF[a.diff].skill + 0.25, 0, 1) : 0.96;
  doHit(m, a, short ? 'serveShort' : 'serveHigh', serveTarget(m, a, short, aimX), q, null);
}

function tickBot(m, a, dt) {
  const d = DIFF[a.diff], s = m.shuttle, sg = sgn(a.team);
  let mx = 0, mz = 0;
  if (m.state === 'serve') {
    if (a.i === m.serverIdx && m.stateT > 1.1) { serve(m, a, Math.random() < (m.doubles ? 0.7 : 0.45), 0); }
  } else if (m.state === 'rally') {
    const reacting = a.plan && m.clock - a.plan.t0 < a.plan.react;
    if (!reacting) {
      const dx = a.tx - a.x, dz = a.tz - a.z, l = Math.hypot(dx, dz);
      if (l > 0.06) { const k = Math.min(1, l / 0.5); mx = dx / l * k; mz = dz / l * k; }
    }
    if (a.jumpAt > 0 && m.clock >= a.jumpAt && a.jumpY === 0) { a.vy = a.st.jumpVy * tired.jump(a); a.jumpY = 0.001; a.jumpAt = -1; useStamina(m, a, 0.005); }   // bots' routine hops to reach high balls
    if (s.live && !s.netted && s.lastTeam !== a.team && !(a.plan && a.plan.leave) && s.p.z * sg > OWN_SIDE) {
      const desperate = a.plan && a.plan.p && a.plan.p.desperate;
      // this shuttle is the partner's: stay out of it unless the partner is nowhere near and it is about to drop
      const yl = a.plan && a.plan.yield ? m.athletes[a.plan.to] : null;
      const mine = !yl || (s.v.y < 0 && s.p.y < 1.4 && Math.hypot(s.p.x - yl.x, s.p.z - yl.z) > 1.5);
      a._extra = desperate && a.diff > 0 ? 0.35 : 0;
      const r = inReach(m, a);
      a._extra = 0;
      if (mine && r.ok && (s.v.y < 0 || r.dh < 0.55 || s.p.y < 1.2)) {
        if (desperate && r.dh > 0.9 && a.diveT < 0) { a.diveT = 0.2; a.diveDx = 0; a.diveDz = 0; a.stats.dives++; }
        a.swingT = 0; a.swingHigh = s.p.y > 1.3;
        const shot = botChooseShot(m, a);
        const heavy = heavyOf(m, a);
        let q = clamp(d.skill + randn() * 0.14 - (desperate ? 0.2 : 0) - heavy * 0.5, 0.15, 1);
        // a bot playing alongside a human is a dependable partner: far fewer unforced errors, steadier hands
        const partner = m.athletes.some((o) => o.team === a.team && o.ctrl === 'human');
        if (partner) q = clamp(q + 0.06, 0.15, 1);
        if (Math.random() < d.miss * (desperate ? 2.5 : 1) * (m.serveShot ? 0.3 : 1) * (partner ? 0.35 : m.doubles ? 1.9 : 1) * clamp(1 + (ctlErr(a) - 1) * 1.2, 0.5, 2) * clamp(1 + heavy * 2, 0.4, 2)) { q = 0.12; a._blunder = true; }
        doHit(m, a, shot, chooseTarget(m, a, shot, 0), q, shot === 'smash' ? 'smash' : null);
      }
    }
  }
  if (a.input.emote) { a.emote = a.input.emote; a.emoteT = 2.4; emit(m, { type: 'emote', i: a.i, e: a.input.emote }); a.input.emote = 0; }
  moveAthlete(m, a, mx, mz, d.speed * botPace(a), dt);
}

// ------------------------------------------------------------------ shuttle + rules
function tickShuttle(m, dt) {
  const s = m.shuttle;
  if (s.held) { holdShuttle(m); return; }
  if (!s.live && s.landed) return;
  const px = s.p.x, py = s.p.y, pz = s.p.z;
  stepShuttle(s.p, s.v, dt, s.netted ? null : m.wind);
  const cross = !s.netted ? netCrossing(px, py, pz, s.p) : null;
  const crossing = cross && Math.abs(cross.x) < DBL_W + 0.1 && cross.y < NET_H;
  if (crossing && cross.y > NET_H - 0.07 && Math.random() < 0.6) {
    // clipped the net tape but still rolls over: legal, and it dies just past the net
    m.hist.length = 0;
    s.p.x = cross.x; s.p.z = -Math.sign(pz) * 0.01;
    s.p.y = NET_H + 0.01;
    s.v.x *= 0.5; s.v.z *= 0.25; s.v.y = Math.max(0.5, Math.abs(s.v.y) * 0.3);
    emit(m, { type: 'netcord' });
    const r = simLand(s.p, s.v, m.wind, true);
    s.pred = { x: r.x, z: r.z, t: r.t, inside: Math.abs(r.x) <= m.halfW + 0.02 && Math.abs(r.z) <= HALF_L + 0.02 };
    planTeam(m, 1 - s.lastTeam, r, s.pred.inside);
  } else if (crossing) {
    m.hist.length = 0;
    s.p.x = cross.x; s.p.y = cross.y;
    s.netted = true;
    s.p.z = Math.sign(pz) * 0.04;
    s.v.x *= 0.1; s.v.z = -Math.sign(s.v.z) * 0.4; s.v.y = Math.min(0, s.v.y) * 0.2;
    emit(m, { type: 'net' });
  }
  m.hist.push({ t: m.clock, x: s.p.x, y: s.p.y, z: s.p.z });
  if (m.hist.length > 48) m.hist.shift();
  if (s.p.y <= 0) {
    s.p.y = 0; s.live = false; s.landed = true;
    const inside = Math.abs(s.p.x) <= m.halfW + 0.02 && Math.abs(s.p.z) <= HALF_L + 0.02;
    emit(m, { type: 'land', x: s.p.x, z: s.p.z, inside });
    if (m.state === 'rally') judge(m, inside);
  }
}

// a serve must land in the receiver's diagonal service court
function serveFault(m, x, z, serverTeam) {
  const R = 1 - serverTeam, right = m.score[serverTeam] % 2 === 0;
  const sx = courtX(R, right), sz = sgn(R), e = 0.02;
  const W = m.doubles ? DBL_W : HALF_W, back = m.doubles ? HALF_L - LONG_SERVE : HALF_L;
  const depth = z * sz, side = x * sx;
  if (depth < SHORT_LINE - e) return 'Giao ngắn';
  if (side < -e) return 'Giao sai ô';
  if (depth > back + e) return 'Giao dài';
  if (Math.abs(x) > W + e) return 'Giao ra ngoài';
  return null;
}

function judge(m, inside) {
  const s = m.shuttle, lt = s.lastTeam;
  let winner, why;
  if (s.netted) { winner = 1 - lt; why = 'Chạm lưới'; }
  else if (!inside) { winner = 1 - lt; why = 'Ra ngoài!'; }
  else if (m.serveShot && Math.sign(s.p.z) !== sgn(lt) && serveFault(m, s.p.x, s.p.z, lt)) { winner = 1 - lt; why = serveFault(m, s.p.x, s.p.z, lt); }
  else { winner = s.p.z > 0 ? 1 : 0; why = 'winner'; }
  const hitter = m.athletes[s.last];
  if (hitter) { if (winner === hitter.team) hitter.stats.winners++; else hitter.stats.errors++; if (hitter._diveHit && winner === hitter.team) hitter.stats.diveSaves++; }
  for (const a of m.athletes) a._diveHit = false;
  awardPoint(m, winner, why);
}

// the two ends of the court are mirror images except for the wind, so changing ends = turning the wind around
function changeEnds(m) { m.windBase += Math.PI; m.wind.x = -m.wind.x; m.wind.z = -m.wind.z; emit(m, { type: 'ends' }); }

function awardPoint(m, winner, why) {
  m.state = 'point'; m.stateT = 0;
  restAll(m, POINT_REST, POINT_REST_DEEP);  // brief point rest; cannot refund a typical rally while fresh
  const wasServing = m.serverTeam === winner;
  m.score[winner]++;
  m.longest = Math.max(m.longest, m.rally);
  m.pointsLog.push(winner);
  if (wasServing && m.doubles) { const t = m.right[winner]; m.right[winner] = m.left[winner]; m.left[winner] = t; }
  m.serverTeam = winner;
  for (const a of m.athletes) a.mood = a.team === winner ? 1 : -1;
  const P = m.opts.points, cap = P === 11 ? 15 : 30;
  const won = (a, b) => (a >= P && a - b >= 2) || a >= cap;
  const over = won(m.score[0], m.score[1]) || won(m.score[1], m.score[0]);
  const hi = Math.max(...m.score), lo = Math.min(...m.score);
  const gamePoint = !over && hi > lo && (hi >= P - 1 || hi === cap - 1) ? (m.score[0] > m.score[1] ? 0 : 1) : -1;
  // match point = game point in the deciding game (or the only game)
  const matchPoint = gamePoint >= 0 && m.games[gamePoint] + 1 >= m.gamesToWin;
  emit(m, { type: 'point', team: winner, why, rally: m.rally, score: m.score.slice(), gamePoint, matchPoint, games: m.games.slice() });
  // interval when the leader reaches 11 (6 in 11-point games); in the deciding game the players also change ends
  const mid = P === 21 ? 11 : 6;
  if (!over && !m.intervalDone && hi === mid) {
    m.intervalDone = true;
    m.stateT = -2.2;   // a longer pause before the next serve
    restAll(m, 0.12);
    const deciding = m.games[0] === m.gamesToWin - 1 && m.games[1] === m.gamesToWin - 1;
    if (deciding) changeEnds(m);
    emit(m, { type: 'interval', ends: deciding });
  }
  if (over) {
    m.games[winner]++;
    m.gameScores.push(m.score.slice());
    if (m.games[winner] >= m.gamesToWin) { m.state = 'overPending'; m.winner = winner; }
    else { m.state = 'gameBreak'; m.stateT = 0; emit(m, { type: 'game', team: winner, games: m.games.slice(), score: m.score.slice(), gameNo: m.gameNo }); }
  }
}

function step(m, dt) {
  dt = dt || DT;
  if (m.state === 'over') return;
  if (m.hitStop > 0) { m.hitStop -= dt; return; }
  m.clock += dt; m.stateT += dt;
  for (const a of m.athletes) {
    if (a.ctrl === 'bot') tickBot(m, a, dt); else tickHuman(m, a, dt);
  }
  tickShuttle(m, dt);
  // serve clock
  if (m.state === 'serve') {
    const srv = m.athletes[m.serverIdx];
    if (srv.ctrl !== 'bot' && m.stateT > SERVE_CLOCK) serve(m, srv, false, 0);
  }
  if (m.state === 'point' && m.stateT > 1.8) startServe(m);
  if (m.state === 'gameBreak' && m.stateT > 3.2) { m.score = [0, 0]; m.gameNo++; m.intervalDone = false; restAll(m, 0.28); changeEnds(m); startServe(m); emit(m, { type: 'gameStart', gameNo: m.gameNo }); }
  if (m.state === 'overPending' && m.stateT > 2.0) { m.state = 'over'; emit(m, { type: 'over', winner: m.winner, score: m.score.slice(), games: m.games.slice(), gameScores: m.gameScores.slice() }); }
}

// ------------------------------------------------------------------ network snapshot
const r2 = (v) => Math.round(v * 100) / 100;
function snapshot(m) {
  const s = m.shuttle;
  return {
    c: r2(m.clock), st: m.state, sT: r2(m.stateT), sc: m.score, g: m.games, srv: m.serverIdx, rcv: m.receiverIdx, w: [r2(m.wind.x), r2(m.wind.z)],
    sh: [r2(s.p.x), r2(s.p.y), r2(s.p.z), r2(s.v.x), r2(s.v.y), r2(s.v.z), (s.live ? 1 : 0) | (s.held ? 2 : 0) | (s.netted ? 4 : 0) | (s.landed ? 8 : 0), s.last, s.lastTeam],
    pr: s.pred ? [r2(s.pred.x), r2(s.pred.z), s.pred.inside ? 1 : 0] : null,
    a: m.athletes.map((a) => [r2(a.x), r2(a.z), r2(a.jumpY), r2(a.vx), r2(a.vz), r2(a.swingT), a.swingHigh ? 1 : 0, r2(a.diveT), r2(a.recoverT), r2(a.diveDx), r2(a.diveDz), a.mood, a.emote, r2(a.splitT), r2(a.sta)]),
  };
}
// Online, on the player's own screen: their athlete answers the stick at once instead of waiting for the server's reply.
// P = { x, z, vx, vz, t, h: [] } is the locally predicted state; `a` holds the newest server state; lagT = how far the server's
// picture of me trails my inputs (round trip + a tick). The prediction uses the same movement rule as moveAthlete and is pulled
// toward the server by the error between where I predicted I was lagT ago and where the server says I am now.
function predictSelf(P, a, ix, iy, lagT, dt, free, pull) {
  P.t += dt;
  if (!free) {
    const k = 1 - Math.exp(-20 * dt); P.x += (a.x - P.x) * k; P.z += (a.z - P.z) * k; P.vx = a.vx; P.vz = a.vz; P.h.length = 0; return P;
  }
  const sg = sgn(a.team), l = Math.hypot(ix, iy); if (l > 1) { ix /= l; iy /= l; }
  const spd = a.st.speed * tired.move(a) * (a.jumpY > 0 ? 0.6 : 1);
  P.vx = damp(P.vx, ix * sg * spd, a.st.accel, dt); P.vz = damp(P.vz, iy * sg * spd, a.st.accel, dt);
  P.x += P.vx * dt; P.z += P.vz * dt;
  P.h.push({ t: P.t, x: P.x, z: P.z });
  while (P.h.length > 2 && P.h[1].t <= P.t - lagT) P.h.shift();
  const old = P.h[0], ex = old.x - a.x, ez = old.z - a.z, e = Math.hypot(ex, ez);
  if (e > 1.5) { P.x = a.x; P.z = a.z; P.vx = a.vx; P.vz = a.vz; P.h.length = 0; return P; }
  const k = 1 - Math.exp(-(pull || 6) * dt), cx = ex * k, cz = ez * k;
  P.x -= cx; P.z -= cz; for (const q of P.h) { q.x -= cx; q.z -= cz; }
  P.x = clamp(P.x, -3.8, 3.8); P.z = clamp(Math.abs(P.z) * (Math.sign(P.z) === sg ? 1 : -1), 0.45, 8.2) * sg;
  return P;
}
function applyAthleteSnap(a, v) {
  a.x = v[0]; a.z = v[1]; a.jumpY = v[2]; a.vx = v[3]; a.vz = v[4]; a.swingT = v[5]; a.swingHigh = !!v[6];
  a.diveT = v[7]; a.recoverT = v[8]; a.diveDx = v[9]; a.diveDz = v[10]; a.mood = v[11]; a.emote = v[12]; a.splitT = v[13]; if (v[14] !== undefined) a.sta = v[14];
}

return {
  DT, G, DRAG, NET_H, HALF_L, HALF_W, DBL_W, SHORT_LINE, LONG_SERVE, SERVE_CLOCK,
  CHARS, DIFF, VENUES, SHOTS, charStats, fatigue,
  GEAR, GEAR_SLOTS, GEAR_SETS, setBonus, setTiers, setSize, GEAR_MAX_LV, gearBase, gearLv, gearAtLv, GEAR_RARITY, GEAR_STAT_CAP, gearById, gearSet, gearMods, effStats, powerOf,
  stepShuttle, simLand, solveShot, inReachAt, sgn,
  createMatch, step, snapshot, applyAthleteSnap,
  clamp, lerp, damp, rand, randn, predictSelf, moveAthlete,
};
});
