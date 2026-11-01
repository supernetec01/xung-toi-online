# Giáo Xứ An Hòa V4 — bản demo online

**Ngày 01/11/2026.** Game hiện hành đã có Admin/auth/PostgreSQL và các luồng demo M1–M6, vẫn chạy cổng **5001**. Dữ liệu được giữ cho lần cập nhật sau; không xóa save local, đổi stable IDs hoặc thay toàn bộ engine.

## Kết quả

- Admin có MFA/RBAC, dashboard riêng, tìm/phân trang người chơi, read-only ví/ledger, sanctions/revoke/audit và cấp quyền có bảo vệ.
- Shop/CMS/atlas có draft/publish/version/rollback, kiểm tra đầy đủ rig/pose/dimensions, preview và cập nhật tới game đang mở. Mua/claim/action là giao dịch server; archive giữ sở hữu; nhiệm vụ đã nhận giữ định nghĩa/thưởng cũ.
- Chat global/scene có auth, history/cursor, lọc/rate-limit, moderation/report/mute/appeal/thông báo hệ thống; cấm chat không khóa gameplay.
- Một user nhiều tab chỉ một avatar; ghế có lease; NPC nền có schedule/pathfinding và tự giảm, không loại NPC nhiệm vụ. Không gửi aggregate người thật/NPC/guest qua API/WS công khai.
- LIVE Simulator có từ khóa, dedup/cooldown/capacity, một động tác/guest, không wallet/account/chat, camera 9:16 và kill switch. **Chưa kết nối TikTok thật.**
- Noel Xu ảo cộng đồng có 4 mốc, trang trí, album và daily. Lịch đóng/mở được server kiểm tra; không trộn VND/QR.

## Báo cáo từng giai đoạn

[M1](M1_REPORT.md), [M2](M2_REPORT.md), [M3](M3_REPORT.md), [M4](M4_REPORT.md), [M5](M5_REPORT.md), [M6](M6_REPORT.md) có files, test/log, ảnh, giới hạn và rollback. [tasks.json](../../tasks.json) là trạng thái từng ticket.

## Kiểm thử thực tế

| Suite | Evidence | Phạm vi |
|---|---|---|
| Static isolation | `artifacts/online/static-tests.txt` | Chặn đường dẫn mã hóa vượt thư mục src/assets, không phục vụ file private/lịch sử |
| API PostgreSQL | `artifacts/online/api-tests.txt` | Auth/MFA/RBAC/CSRF, giao dịch cạnh tranh, CMS/archive/rollback, sanctions, ledger |
| Updates | `artifacts/online/update-tests.txt` | MFA grant/replay, image decode, quest pin khi CMS đổi bước/thưởng, NPC mới, daily, import, appeal, event schedule |
| Realtime | `artifacts/online/realtime-tests.txt` | Multi-tab, WS auth/mute/expiry, ghế tranh chấp, 20 user thêm vào, fixed NPC, no public stats, 500 mock comments |
| Wardrobe UI | `artifacts/online/wardrobe-tests.txt` | Atlas thiếu pose/mismatch bị chặn; live publish → hai tab thật mua một debit → mặc/archive/đổi dáng/fallback |
| Game online UI | `artifacts/online/browser-tests.txt` | 11 nhiệm vụ đầy đủ, Shop/reload/action resume, text chat, Admin desktop/mobile |
| Recovery | `artifacts/online/recovery-tests.txt` | Raw JSON/shape lỗi và empty bytes giữ nguyên, export, backup-reset, late corruption, unknown item |
| Viewport/rig | `artifacts/online/performance-tests.txt`, `performance.json` | Kích thước desktop/mobile/tablet/landscape, frame/DOM samples và 136 tổ hợp rig |
| LIVE Studio UI | `artifacts/online/live-ui-tests.txt` | Bấm start/simulate, guest hiện trong game/camera, stop, Admin mobile thật và gỡ mute cập nhật UI ngay |
| Gameplay hồi quy | `artifacts/online/regression-tests.txt` | 59 browser checks local, 5 domain groups, M0 lịch sử; 11 quest/14 activity gốc |
| Operations | `startup.txt`, `persistence.json`, `restore-drill.json` trong `artifacts/online` | Startup lặp lại không seed/reset, restart giữ fingerprints, restore vào DB mới và ledger reconcile |

Số liệu đo headless trong cloud, không là chứng nhận FPS điện thoại. Ảnh Admin mobile trước đã được phát hiện dùng nhầm viewport desktop; test được sửa đặt viewport thật và kiểm tra `innerWidth === 390`, ảnh được chụp lại.

## Giữ dữ liệu và cập nhật

PostgreSQL bind `.local/pgdata`, uploads/key/operator trong `.local`. Backup dump + khóa MFA + uploads ở `.local/backups`, được giữ riêng và không commit/public HTTP. `npm run db:backup`, `npm run db:restore-drill`, hướng dẫn tại [MIGRATION_PLAN.md](../../MIGRATION_PLAN.md). Fingerprint kiểm tra wallets/states/ledger/catalog/projects trước/sau restart. Snapshot source khác với backup DB; phải giữ cả hai.

Save local lỗi không bị ghi defaults; có export nguyên byte và explicit reset có backup. Import demo một lần chỉ dành development theo xác nhận dữ liệu demo của chủ dự án, không nhập roles/identity. Production chặn importer/mock, và Admin/chat/NPC mới cần bật cờ riêng.

## Gate còn lại

V4-017 **Blocked**: provider TikTok được cấp quyền chưa có. V4-019 **Partial**: thiết bị thật, IME/Back và soak 30 phút chưa nghiệm thu. V4-020 **Partial**: chưa staging/canary, remote CI, alerting hoặc backup ngoài máy. Coordinator/presence/queue hiện một process. Mỹ thuật prototype và atlas giới hạn 1–2 frame/pose; còn cần biên tập trực tiếp trước phát hành.

Đây là code demo có kiểm thử, không phải xác nhận M1–M6 đã sẵn sàng production. Không publish/triển khai production trong lượt này. Chi tiết ở [KNOWN_ISSUES.md](../../KNOWN_ISSUES.md).
