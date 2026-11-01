# Bắt đầu — Giáo Xứ An Hòa V4 demo online

Đã triển khai nền Admin/auth/PostgreSQL và các luồng demo M1–M6 trên renderer/gameplay hiện hành. Cổng nội bộ **5001**. Thống kê người thật/NPC/guest chỉ có trên Admin được phân quyền. TikTok thật và tiền thật chưa bật.

1. Đọc [README.md](README.md) để khởi động và lấy thông tin operator riêng; không tạo lại DB.
2. Xem [IMPLEMENTATION_AUDIT.md](IMPLEMENTATION_AUDIT.md), [tasks.json](tasks.json), [docs/milestones/V4_DEMO_REPORT.md](docs/milestones/V4_DEMO_REPORT.md) để phân biệt code đã kiểm thử với gate còn mở.
3. Đọc [MIGRATION_PLAN.md](MIGRATION_PLAN.md) và [docs/HANDOFF_NEXT_SESSION.md](docs/HANDOFF_NEXT_SESSION.md) trước cập nhật dữ liệu.
4. Bộ đặc tả gốc: `CODEX_MASTER_PROMPT.md`, `docs/00_SCOPE_RULES.md` đến `docs/12_PUBLIC_SAFETY_AND_SOURCES.md`. Các checkbox trong đặc tả là yêu cầu, không tự chứng minh đã triển khai; trạng thái có evidence ở task board.

Source hiện hành nằm tại `game_v3/src`, `server`, `public`, migrations thật ở `db/migrations`. Không thay source bằng `references/BASELINE_V3_REFERENCE_ONLY.zip`. `db/001_v4_additive_reference.sql` vẫn chỉ là tham khảo.

M0 được giữ tại `references/m0-runtime`, `references/m0-reports` và `artifacts/m0`. `audit:m0` kiểm tra các bản sao lịch sử cùng stable IDs, không yêu cầu source V4 hiện tại giống byte với M0.

Dữ liệu runtime trong `.local/`, không nằm trong Git; không được HTTP phục vụ. Save demo local giữ key `giao-xu-an-hoa-2d-v3` và fallback V2. Không reset dữ liệu để làm test xanh. Tất cả dữ liệu hiện tại được chủ dự án xác nhận là demo; điều này không cho phép importer demo hoạt động trong production.
