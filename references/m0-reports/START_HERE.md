# Giáo Xứ An Hòa — triển khai V4 trên game hiện tại

**Hiện trạng:** M0 audit/freeze baseline; game vẫn là bản local, cổng **5001**. Không xem đặc tả là chức năng đã triển khai.

1. Đọc [CODEX_MASTER_PROMPT.md](CODEX_MASTER_PROMPT.md) và toàn bộ [docs/00_SCOPE_RULES.md](docs/00_SCOPE_RULES.md) đến [docs/12_PUBLIC_SAFETY_AND_SOURCES.md](docs/12_PUBLIC_SAFETY_AND_SOURCES.md).
2. Đọc kết quả đối chiếu source: [IMPLEMENTATION_AUDIT.md](IMPLEMENTATION_AUDIT.md), [MIGRATION_PLAN.md](MIGRATION_PLAN.md), [KNOWN_ISSUES.md](KNOWN_ISSUES.md).
3. Theo [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md), [tasks.json](tasks.json) và các báo cáo trong `docs/milestones/`; chỉ đánh dấu Done sau kiểm thử.
4. Chạy theo [README.md](README.md): `npm ci`, `npm start` ở root. Cổng local cố định `5001`; không chạy các HTML snapshot cũ để nghiệm thu.

## Bảo vệ phiên bản hiện hành

- `game_v3/src/` và `game_v3/index.html` là source **đã nâng cấp trong repo hiện hành**, không phải source nguyên gốc trong ZIP V3.
- `references/BASELINE_V3_REFERENCE_ONLY.zip` chỉ để tra cứu. **Không giải nén đè lên source hiện hành.**
- Giữ key lưu `giao-xu-an-hoa-2d-v3`, fallback `giao-xu-an-hoa-2d-v2`, stable IDs và dữ liệu người chơi. M0 không import dữ liệu lên server, không chạy migration SQL.
- `db/001_v4_additive_reference.sql` là SQL tham khảo, **không phải migration chạy được**. Hiện không có database runtime để backup; xem kế hoạch mở rộng và rollback trước M1.
- Quyết định role/actor ở [docs/ADR/003-v4-boundaries.md](docs/ADR/003-v4-boundaries.md). Admin/chat/LIVE chưa có, không cho frontend hoặc localStorage tự cấp quyền.
- Bản entry point V3 trước M0 và manifest bộ đặc tả gốc được giữ trong `references/v4/`.
