# Shuttle Paws V2 — việc ghi lại để làm sau (người dùng yêu cầu 2026-11-13)

Thứ tự người dùng đặt: **trước tiên làm tiếp phần V2 đang dở** (khớp vợt–cầu, động tác trong trận), các mục dưới đây ghi lại để làm sau.

## 0. LÀM TIẾP KHI NGƯỜI DÙNG NHẮN (tạm dừng 2026-11-13 đêm) — động tác trong trận
Trạng thái lúc dừng: bản `combined-14` đã áp dụng vào `game.js` (bật bằng `?matchClips=1`), sai lệch vợt–cầu trung bình 1–4 cm trên 4 trận mẫu; khoảng 18/95 động tác đang dùng trong trận; các cú đánh mới điều khiển tay + thân trên. Công cụ đo: `tests/acceptance.py`, 4 bộ dữ liệu `authoritative-replay-partA-*`, ảnh `tests/contact-strips.py`. Việc dở của bước 1 (nếu có) nằm trong các file `combined-15*`/`partA-*` mới nhất, chưa áp dụng.
1. Sửa "vợt tới muộn" ở đập, lốp, đánh lưới (dự đoán đúng thời điểm bot/người thật sự đánh; cú đập có hỗ trợ của người chơi còn ngoài tầm với).
2. Nối động tác chân và toàn thân cho các cú đã có (đứng yên dùng trọn động tác, đang chạy giữ kiểu chạy; chân không trượt, không lún).
3. Nối dần các động tác còn lại: di chuyển, cứu cầu, lao người, giao/nhận giao, ăn mừng. Ghi danh sách vào `CLIPS-IN-MATCH.md`.
4. Khi ổn thì bật mặc định, bỏ đuôi `?matchClips=1` (hỏi người dùng trước khi đổi; thử online 2 máy, xem trận, mọi sân, đồ họa thấp).
Quy tắc CPU khi làm tiếp: một trình duyệt ẩn, ghim 2 nhân, không chạy song song (xem script cpu-guard).

## 0b. Nâng cấp GAMEPLAY trong trận cho thật cuốn (người dùng nhắc lại 2026-11-15: mục này bị ghi thiếu)
Yêu cầu gốc của người dùng (11-12/13): game phải "cực kì căng, cuốn hút", có hiệu ứng cho 3 loại cú đánh, nhảy…, phong cách chơi riêng, không lag.
Chưa có gì trong mục này được làm, trừ lớp hiệu ứng `fx.js` làm dở (nằm ở `D:/Game/game-v1-chibi/fx.js.wip`, chưa đo, chưa bật).
Ý tưởng để bàn khi bắt đầu (đề xuất của Claude, chưa duyệt):
- **Cảm giác cú đánh:** hiệu ứng riêng cho phông / đập / bỏ nhỏ / nhảy / lao người (hoàn thiện `fx.js`), âm thanh theo lực và độ chuẩn, rung máy, khựng hình ngắn và rung camera ở cú đập mạnh, vệt cầu.
- **Chiều sâu kỹ thuật:** thêm lựa chọn cú đánh có rủi ro–phần thưởng (đập chéo/đập thẳng, bỏ nhỏ cắt, tạt nhanh, giả động tác), cú Perfect có lợi rõ hơn, chuỗi Perfect/combo tạo "đà".
- **Khoảnh khắc căng:** điểm quyết định (game point/match point) có nhịp chậm, camera gần, khán giả phản ứng; rally dài tăng dần độ căng (nhạc, khán giả); pha cứu cầu được nhấn mạnh; phát lại chậm cú ăn điểm đẹp.
- **Phong cách chơi riêng:** mỗi nhân vật có lối đánh nhận ra được (gắn với mục kỹ năng), bot có "tính cách" (thủ lì, tấn công, bỏ nhỏ nhiều).
- **Phản hồi tiến bộ trong trận:** thống kê cuối trận, điểm phong cách, danh hiệu trận (cú đập nhanh nhất, rally dài nhất).
- Ràng buộc: không tụt khung hình trên điện thoại; mọi thứ chạy giống nhau khi chơi online; không che sân (bài học từ HUD điện thoại).

## 1. Giao diện chọn nhân vật
- Nhiều nhân vật lên thì lưới bị lỗi/xấu → thiết kế lại cho đẹp và gọn (nhóm, lọc, tìm, cuộn mượt, ô đều nhau).
- Tính tới màn hình điện thoại.

## 2. Cơ chế kiểu game mobile để "cuốn"
- **Shop**: mua bán vật phẩm bằng tiền trong game.
- **Trang bị cho nhân vật**: áo, quần, giày, vợt, băng đeo… có **tăng chỉ số**.
- **Kỹ năng** cho nhân vật.
- **Màn chơi / chiến dịch** và **thử thách** (nhiệm vụ, mục tiêu, phần thưởng).
- Hình ảnh minh hoạ cơ chế/hướng dẫn chơi kiểu mobile.
- Mục tiêu chung: cảm giác như một game hoàn chỉnh "để bán", không nhàm.

## Quyết định thiết kế của người dùng (2026-11-13, tối)
- "Cân bằng tuyệt đối" chỉ là của V1. **V2 là bản kinh doanh**: trang bị được phép làm nhân vật mạnh lên, kể cả khi chơi online.
- Mỗi người chơi có **chỉ số sức mạnh** (power) = chỉ số nhân vật + trang bị đang mặc.
- **Tìm trận nhanh ghép người có sức mạnh ngang nhau** (matchmaking theo power).
- **Mặc đồ = tăng sức mạnh + đổi ngoại hình** nhân vật (áo, quần, giày, vợt, băng đeo hiện trên model).

## Còn cần chốt khi bắt đầu
- Công thức power và biên độ ghép trận (chênh bao nhiêu thì vẫn ghép; chờ lâu thì nới dần).
- Trần sức mạnh của trang bị so với kỹ năng (để người không nạp vẫn thắng được người nạp nếu chơi giỏi hơn).
- Phòng tự tạo (mời bạn): dùng chỉ số thật hay có tuỳ chọn "chỉ số chuẩn".
- Tiền trong game kiếm từ đâu (thắng trận, thử thách, điểm danh), có nạp tiền thật hay không, cổng thanh toán.
- Kỹ năng: bị động hay chủ động (nút riêng).
- Tài khoản và lưu trữ: hiện server lưu data.json theo id trình duyệt; shop/đồ/tiền cần tài khoản bền và chống gian lận phía server (power và đồ phải do server xác nhận, không tin client).

## Bổ sung của người dùng (2026-11-13, tối) — kinh tế trong game
- Có **nạp tiền thật** để mua tiền cao cấp (vàng/ngọc); người không nạp thì **cày chay** được.
- Nguồn thưởng miễn phí: **xem video quảng cáo nhận thưởng**, **thưởng đăng nhập hằng ngày**, **nhiệm vụ (quest)**.
- **Nhân vật phải mua hoặc mở bằng nhiệm vụ** (không mở sẵn hết).
- Người dùng chưa biết con số cụ thể; yêu cầu duy nhất: **cân đối, trang bị không làm sức mạnh vượt quá xa**.

## Quyết định thêm của người dùng (2026-11-13, tối)
- **Phát hành Android trước** (web/iOS sau). Kéo theo: đóng gói game web thành app Android (WebView/TWA/Capacitor hoặc tương đương), thanh toán qua Google Play Billing, quảng cáo thưởng qua AdMob (hoặc tương đương), tuân thủ chính sách Play (kể cả phần dữ liệu người dùng, quảng cáo, mua trong ứng dụng).
- **Trang bị KHÔNG mặc định là buff.** Mỗi món có điểm cộng và có thể có **điểm trừ hợp logic** (đánh đổi). Ví dụ định hướng: giày nặng bền hơn nhưng chậm; vợt nặng đập mạnh nhưng kém kiểm soát/tốn sức; áo giáp dày tăng thể lực nhưng giảm bật nhảy; băng đeo nặng tăng lực nhưng giảm tốc tay. Đồ hiếm hơn = đánh đổi có lợi hơn hoặc ít điểm trừ hơn, không phải cộng thuần.
- Hệ quả cho thiết kế: power không thể chỉ là "tổng điểm cộng"; cần tính cả điểm trừ (power = giá trị ròng), và ghép trận theo giá trị ròng đó.

## Đề xuất mặc định của Claude (chưa được duyệt — để bàn khi bắt đầu)
- **Hai loại tiền:** Vàng (kiếm từ trận, nhiệm vụ, đăng nhập, xem quảng cáo) và Ngọc (nạp tiền; cũng rơi ít từ nhiệm vụ lớn/thành tựu).
- **6 ô trang bị (người dùng chốt: băng tay và đồ đội đầu là hai ô riêng):** vợt, giày, áo, quần, **băng tay** (cổ tay), **đầu** (băng đầu / mũ). Mỗi món đổi ngoại hình ô đó và có bộ chỉ số riêng gồm cả cộng và trừ (xem quyết định ở trên: không buff thuần).
- **4 bậc hiếm:** Thường / Hiếm / Sử thi / Huyền thoại; có thể nâng cấp vài cấp bằng Vàng.
- **Trần sức mạnh:** tổng cộng thêm từ trang bị tối đa khoảng +4 đến +5 điểm chỉ số trên nền 18 (≈ +25%), mỗi chỉ số không vượt 5 + 2. Theo số đo ở V1, mỗi điểm chỉ số ≈ 3–5 điểm phần trăm tỉ lệ thắng, nên đồ tốt nhất cho lợi thế khoảng 15–20 điểm phần trăm trước người cùng trình mặc đồ thường — đáng kể nhưng kỹ năng vẫn thắng được.
- **Sức mạnh (power)** = tổng điểm chỉ số hiệu dụng × 100 (nền 1800, tối đa ≈ 2300). Ghép nhanh: chênh ≤ 100 lúc đầu, nới +50 mỗi 5 giây chờ, tối đa 400; quá thì ghép bot ngang sức.
- **Nhân vật:** 3–4 con mở sẵn, còn lại mua bằng Vàng (cày được) hoặc Ngọc, vài con chỉ mở bằng chuỗi nhiệm vụ/thành tựu.
- **Quảng cáo thưởng:** giới hạn số lần/ngày; **đăng nhập:** chuỗi 7 ngày; **nhiệm vụ:** hằng ngày + tuần + thành tựu.
- **Bắt buộc về kỹ thuật:** tài khoản thật, mọi tiền/đồ/power do server giữ và xác nhận; thanh toán và quảng cáo cần tích hợp SDK của nền tảng phát hành (web/Android/iOS khác nhau).

## 3. Nhân vật mới tự thiết kế (người dùng đồng ý 2026-11-13, làm sau khi phần động tác xong)
- Thêm nhân vật theo loài/phong cách được ưa chuộng nhưng **thiết kế riêng** (không sao chép nhân vật có chủ như Quby, Capoo, Doraemon, các bộ sticker Shiba): ví dụ một chú Shiba, một mèo xanh tròn, một nhân vật trắng mũm mĩm.
- Dùng chung khung xương và 95 động tác của V2; mỗi con cần: mục trong danh sách nhân vật (chỉ số nền), bộ tham số hình dáng (đầu, tai, đuôi, màu), ảnh đại diện, và chạy lại bài kiểm tra động tác trong lab cho dáng người mới.

## 4. Hệ thống giải đấu giống thế giới thật (người dùng yêu cầu 2026-11-13)
- Giải đấu trong game mô phỏng **cấu trúc cầu lông thế giới hiện tại**: có những hạng giải nào, lịch trong năm, mỗi giải có các vòng nào, điểm xếp hạng.
- Tham chiếu cấu trúc thật (kiểm tra lại số liệu khi làm): hệ thống tour nhiều hạng (cấp 1000 / 750 / 500 / 300 / 100) với điểm xếp hạng giảm dần theo hạng và theo vòng; giải chung kết năm cho nhóm đứng đầu (vòng bảng rồi bán kết, chung kết); giải vô địch thế giới; giải đồng đội (nam, nữ, hỗn hợp); đại hội thể thao 4 năm một lần; các nội dung đơn nam/nữ, đôi nam/nữ, đôi nam nữ. Vòng đấu loại trực tiếp: vòng 32 → vòng 16 → tứ kết → bán kết → chung kết; hạt giống; bảng xếp hạng thế giới tính theo số giải tốt nhất trong 52 tuần.
- Luật thi đấu thật: ván 21 điểm, thắng 2/3 ván, đổi sân, nghỉ giữa ván (game đã có 21 điểm và 3 ván).
- **Lưu ý bản quyền/thương hiệu:** cấu trúc và luật thì dùng tự do; **tên giải thật, logo, tên liên đoàn, tên/hình vận động viên thật là thương hiệu có chủ** (đặc biệt tên và biểu tượng Olympic được bảo vệ rất chặt). Dùng tên riêng của game cho từng hạng giải (ví dụ "Paws Tour 1000", "Cúp Thế Giới Shuttle Paws") nhưng giữ đúng cấu trúc, số vòng và cách tính điểm.
- Gắn với kinh tế game: phần thưởng theo vòng, điều kiện tham gia theo xếp hạng/sức mạnh, mùa giải theo lịch thật.

## Nguồn hình ảnh (người dùng, 2026-11-13)
- Tên giải, logo, biểu tượng, hình minh hoạ… đều **tự thiết kế**. Khi tới bước đó người dùng sẽ **cấp thông tin model sinh ảnh** để Claude tạo hình (logo giải, icon vật phẩm, ảnh shop, hình hướng dẫn…). Chưa có thông tin model; hỏi lại người dùng khi bắt đầu.

## Lưu ý phạm vi
- V2 chỉ dùng 16 nhân vật gốc + khung xương/động tác tự làm. Model chibi LoL (tài sản Riot) chỉ nằm ở V1 riêng (`D:/Game/game-v1-chibi`), không đưa sang V2.
- Lớp hiệu ứng cú đánh (`fx.js`, làm dở, đang ở V1 riêng dưới tên `fx.js.wip`) có thể dùng lại cho V2.
