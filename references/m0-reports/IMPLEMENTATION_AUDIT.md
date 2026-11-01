# IMPLEMENTATION AUDIT — V4 / M0

**Ngày:** 01/11/2026. **Kết luận:** có game local hoạt động; chưa có hệ thống online/Admin V4. M0 chỉ khảo sát, khóa baseline, thêm tooling kiểm chứng và kế hoạch; không thay source runtime hoặc dữ liệu người chơi.

## 1. Repo thực tế và baseline

| Hạng mục | Quan sát |
|---|---|
| Checkout | `/workspace/xung-toi-online`, origin `github.com/supernetec01/xung-toi-online` |
| Git | branch `work`, symbolic HEAD hợp lệ nhưng chưa có commit/ref; toàn bộ source hiện là untracked. Không có SHA để `git reset` |
| Stack | HTML/CSS/JS thuần; SVG vẽ nhiều lớp, DOM HUD; CommonJS Node static server |
| Toolchain đã chạy | Node `v24.19.0`, npm `11.9.0`; Playwright `1.56.1`, Prettier `3.6.2` |
| Khởi động | root `npm start` / `npm run dev`; `scripts/serve.cjs` cố định `0.0.0.0:5001` |
| Build | Không có compiler/bundler hoặc lệnh `build`. Không tạo một build giả: kiểm tra cú pháp, catalog, HTTP asset loading và browser thực tế thay cho bước không áp dụng |
| Backend/API | Chỉ static HTTP và `GET /healthz`; `/api/me`, `/api/catalog`, `/api/admin/*`, `/admin`, `/ws` chưa tồn tại |
| Database | Không có driver, migration runner, database runtime, seed DB, Redis hoặc deployment manifest. Ba SQL V1/V2/V3 và SQL V4 mới đều là tham khảo |
| State | localStorage key `giao-xu-an-hoa-2d-v3`, fallback `giao-xu-an-hoa-2d-v2`; cùng-origin Web Locks |
| Deploy hiện có | CI test trên GitHub Actions đã cấu hình, chưa có bằng chứng chạy remote. Không staging/production deployment đã xác minh |
| Snapshot | 116 file trước V4, có Git metadata, config, source, tests, ảnh; loại `node_modules`, có thể cài lại theo lockfile. SHA/path ở `artifacts/m0-baseline.json` |

`artifacts/m0/catalog-baseline.json` liệt kê nguyên các stable IDs; `artifacts/m0-baseline.json` khóa SHA-256 của **10 file runtime** (HTML, 8 module nguồn/CSS, server). Bộ V4 gốc được kiểm tra đủ 23 hash từ manifest trước khi nhập; bản V3 ZIP tham khảo không được giải nén lên source.

## 2. Mapping chức năng với đặc tả

Existing = đã có và kiểm thử ở local; Partial = có nền nhưng thiếu tiêu chuẩn online/V4; Missing = chưa triển khai; Bug = hành vi cụ thể cần xử lý.

| Chức năng V4 | Trạng thái | Source/evidence hiện tại | Còn thiếu / hành động |
|---|---|---|---|
| 11 scene/11 NPC/11 quest/14 activity | Existing local | `game_v3/src/data.js`, `activities.js`, `gameplay.js`; tests/gameplay.cjs đi hết UI | Giữ ID, luồng chơi và nội dung |
| Hội thoại, nhận/claim, guide, quiz, sách, hoa, quà, nhịp, Noel | Existing local | `game.js`, `rules.js`; 40 kiểm tra gameplay | Trước online phải xác minh event trên server |
| Tủ đồ/Shop 21 món, preview, confirm, equip | Existing local / Partial V4 | `rules.js` purchase, `game.js` preview; kiểm thử nhiều tab | Chưa CMS, archive/version, 4 hướng/atlas đầy đủ |
| Xu/cooldown/execution/receipt | Partial | Web Locks, activeAction, claimed, contributions; reload và race tests | Không server time/ledger/row lock; local history có giới hạn, không phải immutable ledger |
| Lưu dữ liệu/migration V2→V3 | Partial / Bug | `rules.js:migrate`, `game.js:readState` | Xem M0-DATA-001/002; không dùng trực tiếp làm importer server |
| Pathfinding/ghế | Existing local / Partial | `navigation.js`, geometry `gameplay.js`, 24 lựa chọn ghế | Geometry đơn giản, chưa occupancy/lease multiplayer |
| 2D/mobile/a11y | Partial | SVG, bottom-sheet, một modal, ESC/focus, reduced motion; 5 viewport | Back hệ thống, full pose matrix và đo thiết bị thật chưa xong |
| Accounts/auth/sessions/MFA | Missing | Không thư viện/endpoint/schema auth chạy | M1; local nickname không phải tài khoản |
| `/admin`, RBAC, quản lý user, audit | Missing | M0 chỉ có hợp đồng thiết kế `config/v4-boundaries.json` | Không có màn hình/admin seed hay role runtime; 401/403/MFA chưa kiểm thử được |
| CMS Shop/NPC/quest/action/event | Missing | Catalog JS giữ nguyên | M2, draft/validate/publish/version/rollback, không xóa inventory |
| Chat, moderation/report/mute/appeal | Missing | Không chat UI/WS/DB | M3; chat-only sanctions tách account lock |
| Real player presence/multi-tab avatar/seat leases | Missing | Các tab dùng chung save local, không có realtime identity | M4; không coi Web Locks là presence |
| AMBIENT_NPC mật độ/schedule/rút êm | Missing | Chỉ 11 NPC chức năng, không NPC nền hay chat giả | M4, fixed NPC không bị density xóa |
| Metrics ADMIN-only | Missing service; public surface closed | Health chỉ `{status,mode}`; public DOM không chứa aggregate field | Public API không có số liệu; chưa có endpoint protected hoặc thống kê thật để Admin xem |
| TikTok Mock/Studio/guest/queue | Missing | Không provider thật hoặc mock runtime | M5 mock trước; connector thật phải có quyền hợp lệ |
| Noel/community projects/album/daily | Partial | Quest và Xu góp trên máy này | M6; chưa shared goals, season/daily/album |
| QR/donor verification | Disabled/unimplemented | Placeholder, không create/approve donor, HTML snapshot cũ không được server phục vụ | Giữ OFF, không nối ngân hàng trong M0 |
| CI/rollback/performance | Partial | Test local hiện có + tooling M0, snapshot archive | Chưa remote CI, DB restore, load 100–500 guests, canary |

**Sửa nhận định trong tài liệu đầu vào:** `docs/08_API_WEBSOCKET_CONTRACTS.md` gọi một số API là “đã có từ V3”. Đó là hợp đồng đích của bộ đặc tả; source thực tế chỉ có static server. Không được xem các API ấy là backward-compatible endpoints đang chạy.

## 3. Phần tái sử dụng

- `data.js` + `activities.js`: ID, giá và reward hiện tại làm seed từ **một** catalog; không seed từ JSON snapshot lịch sử.
- `rules.js`: semantics quest/progress/idempotency/cooldown làm oracle cho test server; cần adapter, validation và transaction server trước khi gọi trong backend.
- `gameplay.js` + `navigation.js`: hotspot, guide, geometry và đường đi; giữ fixed NPC và điểm tiếp cận.
- `art.js`, `style.css`, `index.html`: renderer SVG, avatar layer, HUD và overlay; thêm Admin layout riêng, không rewrite engine.
- Các suite `rules`, `e2e`, `gameplay`, `concurrency`: regression gate trước từng milestone. Seed test là dữ liệu tổng hợp, không dùng profile thật.
- `scripts/serve.cjs`: tiếp tục phục vụ game cổng 5001; chỉ mở route V4 khi server module đã có kiểm tra quyền.

## 4. Lỗi và rủi ro cụ thể

- **M0-DATA-001 (P1, M2 gate):** `R.migrate` lọc inventory bằng catalog hiện hành. Nếu ID đã mua bị xóa khỏi catalog, lần chuẩn hóa tiếp theo loại ID khỏi save. Công cụ `inspect-legacy-save.cjs` chặn dữ liệu unknown/archived, không ghi save. Runtime chưa sửa trong M0; archive/tombstone phải có trước CMS publish.
- **M0-DATA-002 (P1):** `readState` catch lỗi JSON/shape rồi trả defaults; giao dịch tiếp theo có thể ghi save mới đè dữ liệu lỗi. M1/M2 cần quarantine/export, schema validation, recovery; không tự “sửa” profile bằng reset.
- **M0-SEC-001 (release blocker online):** sửa clock/localStorage có thể thay Xu/claim/cooldown. Không có auth, server economy hoặc RBAC; bản local không đủ điều kiện public online multiplayer.
- **M0-OPS-001 (P1):** chưa commit; rollback Git không khả dụng. Snapshot có hash và restore drill thay thế cho baseline M0, chưa thay remote version control/deploy history.
- **M0-UX-001 (P2):** Back mobile, avatar 4 hướng/pose chất lượng cuối và benchmark thiết bị thật chưa có.

Danh sách đầy đủ và cách tái hiện ở `KNOWN_ISSUES.md`. M0 không phát sinh rewrite hoặc tự nhận các lỗi này đã được sửa.

## 5. Minh chứng

- Existing tests mới chạy: **59 kiểm tra browser + 5 nhóm domain**; log `artifacts/m0/existing-tests.txt`.
- M0 tests/ảnh/performance/closed surfaces/restore: `docs/milestones/M0_REPORT.md`, `artifacts/m0/`.
- Runtime fingerprints phải không đổi sau M0. Không đọc hay xóa profile browser thật; test state chỉ nằm trong context tổng hợp tạm thời.
