# KẾT QUẢ KIỂM TRA TẠI THỜI ĐIỂM BÀN GIAO

**Đã chạy và đạt (01/11/2026):** `cd game_v3 && npm run verify`, gồm `node --check` cho 4 file JS, validator catalog đã sửa, và `tests/validate_v3.cjs`.

- Catalog đọc trực tiếp từ `src/data.js` + `src/activities.js`: **11 scene / 11 NPC / 11 quest / 21 item / 14 action**.
- 8 action hub hợp lệ; cooldown nằm trong 60–600 giây; ID không trùng; quest graph không chu trình; đường đi liên scene tham chiếu hợp lệ ở mức dữ liệu.
- `CODEX_V3_IMPLEMENTATION.md` và `schema_v3.sql` là tài liệu gợi ý, **chưa test schema trên PostgreSQL thực tế**.

**Chưa được xác nhận trong môi trường bàn giao:** kiểm thử browser E2E mới. Playwright Chromium bị policy của môi trường chặn cả `file://` và localhost (`ERR_BLOCKED_BY_ADMINISTRATOR`), nên **không được đánh dấu PASS**. Cần Codex chạy browser tests trên máy riêng, đính kèm screenshot và console logs.

**Chưa có:** server login, database/migrations chạy thật, kiểm tra concurrency, webhooks ngân hàng, QR nhận tiền thật, hệ thống tri ân production, multiplayer, animation sprite chất lượng cuối cùng. Không bật thanh toán thực khi chưa có những phần trên.

**Lỗi di sản đã phát hiện:** xem `05_TEST_RISK_REGISTER.md`, đặc biệt AUD-002/003/004/005.
