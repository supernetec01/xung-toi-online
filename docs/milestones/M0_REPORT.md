# M0 — Audit & freeze baseline V4

**Ngày:** 01/11/2026. **Phạm vi:** V4-001, V4-002. Không mở tính năng M1–M6 trong phase này.

## Kết quả

Game local hiện hành tiếp tục chạy ở cổng **5001**. Mười file runtime giữ đúng SHA-256 trước M0, cùng catalog ID và key save. Không copy V3 tham khảo lên source hiện hành, không đọc/xóa browser profile thật, không chạy SQL hoặc migration dữ liệu. PostgreSQL/Redis/auth/Admin chưa có trong app; database backup/restore là **không áp dụng ở M0**, không phải đã test DB thành công.

## Changed Files

- Nhập bộ đặc tả đã kiểm tra manifest: `CODEX_MASTER_PROMPT.md`, `docs/00..12`, `tasks.json`, `examples/`, `diagrams/`, SQL reference trong `db/`, ZIP V3 reference; nguồn gốc và bản entry point gốc ở `references/v4/`.
- Audit/kế hoạch: `IMPLEMENTATION_AUDIT.md`, `MIGRATION_PLAN.md`, `IMPLEMENTATION_PLAN.md`, `KNOWN_ISSUES.md`, `START_HERE.md`, README và `.env.example` không credentials.
- Quyết định role/actor: `config/v4-boundaries.json`, `docs/ADR/003-v4-boundaries.md`. Đây là thiết kế có test, không phải middleware RBAC hay server feature flags.
- Tooling/test: `scripts/m0-audit.cjs`, `scripts/inspect-legacy-save.cjs`, `scripts/capture-m0.cjs`, `scripts/lib/m0-project.cjs`, `tests/m0.test.cjs`, fixture tổng hợp, npm scripts/CI và fingerprint/evidence trong `artifacts/m0*`.
- **Không sửa** `game_v3/index.html`, bất kỳ `game_v3/src/*` nào hoặc `scripts/serve.cjs`. Chạy Prettier xác nhận chúng unchanged rồi kiểm tra hash lại.

## Tests Run + Results

| Kiểm tra | Kết quả và evidence |
|---|---|
| Manifest bộ bàn giao | 23/23 SHA-256 hợp lệ; `references/v4/IMPORT_RECEIPT.json` |
| Baseline `CHROMIUM_PATH=/usr/bin/chromium npm test` trước tích hợp M0 | PASS: 59 browser checks + 5 domain groups; `artifacts/m0/existing-tests.txt` |
| M0 native Node tests | PASS 7 named tests, 0 skip/fail; `artifacts/m0/unit-tests.txt`. Dùng `--test-isolation=none` để chạy trực tiếp trong process hạn chế của môi trường, vẫn dùng node:test và giữ exit status |
| `npm run audit:m0` | 10/10 runtime hash giữ nguyên, IDs không đổi, task graph 20 ticket hợp lệ; `artifacts/m0/audit.json` |
| Dry-run save tổng hợp | REVIEW_ONLY, wallet/ownership/claimed/deadlines giữ nguyên, không applied/import role/identity; unknown archived item trả BLOCKED; `save-dry-run.json` + unit tests |
| `npm run test:m0` browser capture | PASS: sáu ảnh, reload/preview không ghi đè fixture, không uncaught pageerror, không prefetch admin; `baseline-ui.json`, `capture-log.txt` |
| Public surface | `/admin`, admin stats, mock LIVE, gameplay API/WS chưa tồn tại và trả 404; docs/config/reference/private files không được server phục vụ. **Không** ghi đây là pass auth 401/403/MFA |
| Snapshot restore drill | PASS checksum + 10 restored runtime hashes + offline npm ci + npm run verify trong thư mục tạm; `rollback-drill.json/.txt` |
| Format | PASS `npm run format:check`; `format-check.txt` |

**Lượt cuối sau khi nối M0:** `npm test` kết thúc exit code **0**, gồm 59 browser checks + 5 domain groups + 7 unit M0, log `artifacts/m0/final-tests.txt`. V4-001 và V4-002 đã Done; 18 ticket còn lại TODO. Lệnh `npm run dev` cũng đã khởi động lại thực tế và GET game/healthz đạt; evidence `dev-server.txt`, `dev-smoke.json`. GitHub Actions remote, staging deployment, DB integration, role enforcement, WS security và LIVE load test **chưa chạy / chưa áp dụng cho M0**.

## Screenshots

- Desktop 1366×768: `artifacts/m0/desktop-courtyard.png`, `desktop-shop.png`, `desktop-nave.png`.
- Mobile mô phỏng 390×844: `mobile-courtyard.png`, `mobile-shop.png`, `mobile-nave.png`.

Tên/số dư hiển thị là fixture tổng hợp. Không có ảnh Admin vì Admin chưa được triển khai. Không có thay đổi UI runtime để tạo cặp before/after khác nhau; hash giữ nguyên và sáu ảnh là baseline cho M1.

## Đo hiệu năng có giới hạn

Chromium headless: 121 requestAnimationFrame callbacks/scene idle, desktop và mobile viewport đều khoảng **60 FPS**, frame p95 **16,8 ms**. Hai mươi request tuần tự `/healthz` qua loopback có p95 **10,49 ms** tại lần capture đầu. Đây là phép đo môi trường giả lập/idle và health endpoint, **không** chứng minh SLO gameplay API, tải 50 actor, điện thoại phổ thông hoặc 30 phút không memory leak. Raw samples/conditions: `baseline-ui.json`.

## Remaining Risks

- Server-authoritative economy/auth/RBAC chưa có; không phát hành local demo như V4 online.
- M0-DATA-001: client normalizer lọc unknown item; chặn CMS archive/publish đến khi giữ ownership/tombstone đúng. Dry-run M0 chặn dữ liệu ấy nhưng chưa đổi client.
- M0-DATA-002: save lỗi chưa quarantine/recover; không dùng normalizer cũ làm importer server.
- Repo chưa có commit; snapshot ngoài checkout là rollback có kiểm chứng trong workspace hiện tại, chưa lưu remote và không mặc định tồn tại ở task khác. Chưa thay release history hoặc DB backup.
- Không có provider TikTok thật, chưa ambient density/chat moderation, Back mobile/rig/perf thiết bị thật còn trong backlog.

## Rollback Steps

1. Dừng server project nếu cần restore. Xác minh SHA/path trong `artifacts/m0-baseline.json`.
2. Giải nén snapshot pre-V4 vào thư mục mới, không chép đè hoặc xóa checkout/user files. Drill đã thực hiện theo cách này và dọn thư mục tạm sau đó.
3. Cài theo lockfile, verify source và đối chiếu hash. Chỉ phục hồi những file đã review; giữ origin/cổng 5001 và mọi save local.
4. Không dùng `git reset --hard`/`git clean` khi HEAD unborn, không clear localStorage và không chạy down SQL/drop schema. Hướng dẫn chi tiết và rollback online tương lai ở `MIGRATION_PLAN.md`.

## Tiếp theo: M1

Chuẩn bị auth/session/MFA + database migrations thật trước khi mở Admin, chốt server enforcement theo ADR 003; chỉ ADMIN/SUPER_ADMIN có presence metrics. Không dựng dashboard đếm giả hoặc cấp quyền dựa trên nickname/save/header client. M1 cần báo cáo/ảnh/test/rollback riêng.
