# Giáo Xứ An Hòa V3 — prototype tương tác (Web / mobile)

## Chơi
- Mở `Giao_Xu_An_Hoa_Choi_Thu_V3.html` bằng trình duyệt (single HTML offline), hoặc host `index.html` qua một web server tĩnh.
- Tạo nhân vật; chạm `🙌 Hành động` hoặc `🙌 Hành động tại đây`; nhấn `Thực hiện +Xu` và quan sát avatar diễn hoạt; sau khi hoàn thành, nút hiện `⏳ mm:ss` với thời gian hồi 1–10 phút.
- `Shop` để mua áo, quần/váy, tóc, giày và phụ kiện, không cần Level.
- `Khác → Hòm ủng hộ` để phân biệt **Xu xây dựng (ảo)** và **Ủng hộ thật**; bản demo **không có QR ngân hàng thật**, trạng thái ghi rõ chưa cấu hình. Bảng tri ân demo dùng tên giả để thử UI, không phát hiện thanh toán.

## Giới hạn hiện tại
- Chưa có auth, Postgres server, bank webhook, QR thật, multiplayer, pathfinding hay animation rig phức tạp; client localStorage và animation SVG/CSS chỉ để chơi thử.
- Chế độ `Duyệt DEMO` trong tab bảng tri ân cho **kiểm thử giao diện**; khi deploy phải xóa khỏi client public và thay bằng admin RBAC / xác minh giao dịch thật.
- Đồng hồ hồi offline dùng thời gian trên thiết bị: có thể bị thao túng, do đó **không dùng làm nền tảng kinh tế game online**.

## Handoff Codex
- `docs/CODEX_V3_IMPLEMENTATION.md`: UX, gameplay, 14 action, cooldowns, animation, API, moderation, bảo mật.
- `docs/schema_v3.sql`: Postgres schema tham khảo cho bản production.
- `docs/CODEX_PROMPT_V3.md`: yêu cầu triển khai viết sẵn.
- `src/{data,activities,art,game}.js`, `src/style.css` là nguồn mã và catalog đã chạy offline; `assets/` là reference từ dự án V2.
