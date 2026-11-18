# Pawminton — Cầu lông 3D

Game cầu lông 3D dễ thương chạy trên trình duyệt: đấu bot (1v1 / 2v2) và chơi online (ghép trận, phòng bạn bè, xem trận, bảng xếp hạng).

## Chạy

```bash
npm install        # cài ws (sau proxy công ty: thêm --proxy http://proxybsh.bkav.com:3128)
npm start          # = node server.js
```

Mở http://localhost:3040. Người khác trong mạng LAN mở `http://<IP-máy-bạn>:3040`.
Chỉ chơi với bot thì mở thẳng `index.html` cũng được (không cần server).

Đổi cổng: `PORT=8080 npm start`. Dữ liệu bảng xếp hạng lưu ở `data.json`.

## Chơi

- **Chế độ**: Đấu với Bot (1v1 / 2v2, 1 ván hoặc 3 ván), **Giải đấu** (5 vòng loại trực tiếp, thua là đấu lại từ đầu), Online.
- **Điều khiển (mặc định "3 nút")**: `WASD` chạy · `J`/chuột trái = phông cầu · `K`/chuột phải = đập/tạt · `L`/chuột giữa = bỏ nhỏ · `Space` nhảy · `Shift` lao người · `C` đổi góc nhìn.
  Bấm sớm cũng được, cầu tới vợt là tự vung; bấm sát lúc chạm vợt để được Perfect.
  Kiểu cũ (giữ nút nạp lực) vẫn có trong Cài đặt → Kiểu đánh.
- Hỗ trợ "Thường": đứng yên thì tự chạy tới cầu, tự về giữa sân sau khi đánh, bỏ qua cầu bay ra ngoài.

## Cấu trúc

| File | Vai trò |
|---|---|
| `sim.js` | Toàn bộ luật chơi + vật lý cầu (lực cản, gió), AI bot, nhân vật, sân. Dùng chung cho trình duyệt và server |
| `game.js` | Đồ hoạ Three.js (6 sân, 16 nhân vật), giao diện, điều khiển, chế độ online |
| `server.js` | Server tĩnh + WebSocket: ghép trận, phòng, chat, xem trận, xếp hạng. Server chạy mô phỏng (chống gian lận) |
| `index.html`, `style.css` | Giao diện |
