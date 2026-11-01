# Audit hiện hành — V4 demo online

**01/11/2026.** Đã mở rộng game hiện tại bằng Node/PostgreSQL và các luồng demo M1–M6. Renderer SVG, bản đồ, stable IDs, 11 nhiệm vụ/14 hoạt động/11 NPC gốc được tái sử dụng; không giải nén V3 đè source, không reset dữ liệu người chơi. Cổng **5001**.

Audit M0 gốc (khi chưa có backend) được giữ nguyên ở `references/m0-reports/IMPLEMENTATION_AUDIT.md`, cùng `docs/milestones/M0_REPORT.md`, `artifacts/m0` và 10 file runtime lịch sử trong `references/m0-runtime`. Không coi các phát hiện Missing ở thời điểm M0 là trạng thái hiện tại.

| Chức năng | Hiện trạng có thể kiểm chứng | Evidence |
|---|---|---|
| Gameplay/guide/minigame cũ | Giữ luồng local và nối server authoritative khi đăng nhập; 11 quest online qua UI | `regression-tests.txt`, `browser-tests.txt` |
| Auth/Admin/RBAC/MFA | Đã enforce HTTP/WS và cookie/CSRF, Super Admin CLI, phân quyền staff, metrics riêng | `api-tests.txt`, `update-tests.txt`, ảnh Admin |
| Database/Xu/action/quest | PostgreSQL migrations 001–005, atomic ledger/state/receipt, server clock, quest snapshot | `update-tests.txt`, `persistence.json`, `restore-drill.json` |
| Shop/tủ đồ/CMS/atlas | Draft/validate/publish/rollback/live update; rig compatibility; hai tab một debit; archive giữ đồ | `wardrobe-tests.txt`, `atlas-*.png`, `avatar-pose-matrix.png` |
| NPC/quest/action/event động | Spawn/guidance, graph validation, cooldown/range, version và lịch sự kiện | `update-tests.txt` |
| Save cũ/unknown item | Giữ inventory ID, chặn save lỗi/version lạ, export nguyên byte, backup trước reset | `recovery-tests.txt`, `recovery-protected.png` |
| Chat/moderation | Auth WS/REST, plain text, cursor/reconnect/rate-limit, mute/report/appeal/system notice | `api-tests.txt`, `realtime-tests.txt`, `browser-tests.txt` |
| Presence/NPC/ghế | Unique user/multi-tab/primary, heartbeat/TTL/seat lease, NPC tự giảm, fixed NPC giữ | `realtime-tests.txt`, `admin-world.png` |
| Public population stats | Không có aggregates trong public API/WS; chỉ ADMIN/SUPER_ADMIN có metrics | `api-tests.txt`, `realtime-tests.txt` |
| LIVE Mock/Studio | Dùng được simulator, keyword/dedup/capacity, guest một động tác, preview/kill switch | `realtime-metrics.json`, `live-ui-tests.txt` |
| TikTok thật | BLOCKED theo V4-017; không có quyền/provider xác nhận | `KNOWN_ISSUES.md` |
| Noel/shared décor/album/daily | Đã có server state/stages/claims/lịch, tách hoàn toàn tiền thật | `update-tests.txt`, `realtime-tests.txt` |
| QA/release | Chromium, viewport/rig/load/security/recovery, backup/restore/restart có evidence; thiết bị thật/staging còn gate | V4-019/020 Partial |

Evidence ở `artifacts/online/`. Cấu trúc mới: `server/*.cjs`, `db/migrations`, `public/admin`, `public/shared`, `game_v3/src/online.js`, `wardrobe.js`, tests và scripts vận hành. `config/rbac.json` thực sự enforce; hợp đồng M0 `config/v4-boundaries.json` giữ nguyên để tra cứu.

Dữ liệu persistent nằm trong `.local/`, không phải source/ZIP, không được phục vụ HTTP hoặc đưa lên Git. Cấu hình Docker/local DB, backup và startup đã có hướng dẫn lặp lại. Backend hiện thiết kế một Node instance; chưa giả định Redis, provider thật, staging, production hay backup ngoài máy đã có.

Tất cả dữ liệu hiện tại được chủ dự án xác nhận demo. Importer một lần chỉ dành development và không nhập danh tính/quyền; online account state tách save local. Các giới hạn, mỹ thuật prototype và bước tiếp tục được ghi tại `KNOWN_ISSUES.md`, `tasks.json`, báo cáo từng phase và `docs/HANDOFF_NEXT_SESSION.md`.
