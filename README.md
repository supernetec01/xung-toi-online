# Giáo Xứ An Hòa V4

Game 2D tiếng Việt, tiếp tục renderer/gameplay hiện hành. Bản **demo online** dùng Node.js 24 + PostgreSQL 16, có tài khoản, Admin/MFA/RBAC, CMS, kinh tế server, chat kiểm duyệt, NPC cư dân, LIVE Simulator và Noel cộng đồng. Cổng game nội bộ cố định **5001**.

Giao diện **V8 2.5D** cho gian chính, tiền sảnh, ca đoàn, vườn, nhà xứ và trang phục: [báo cáo, ảnh so sánh và rollback](docs/V8_IMPLEMENTATION.md). Kiến trúc, sàn, đồ vật, avatar và HUD tách lớp; tiếp tục dùng tài khoản/dữ liệu V4.

Bản sửa bố cục nhà thờ, camera hai trục và NPC ngồi ghế: [docs/WORLD_UPGRADE.md](docs/WORLD_UPGRADE.md), ảnh trước bàn giao trong `artifacts/world-upgrade/`.

## Cài trên máy của bạn

Hướng dẫn từng bước, gồm Windows/WSL2, tạo tài khoản Admin và xử lý lỗi: **[docs/INSTALL_AND_RUN.md](docs/INSTALL_AND_RUN.md)**. Máy clone mới sẽ tạo database và Admin riêng; dữ liệu/credentials cloud không nằm trên GitHub.

```sh
git clone --branch main https://github.com/supernetec01/xung-toi-online.git
cd xung-toi-online
npm ci
npm run db:start
npm run db:migrate
npm run admin:bootstrap
npm start
```

## Chạy trong workspace hiện tại

```sh
cd /workspace/xung-toi-online
npm ci
npm run db:start
npm run db:migrate
npm run admin:bootstrap
npm start
```

`db:start` dùng Docker context trên máy cá nhân hoặc daemon `/var/run/docker.sock` trong cloud, tự tạo thư mục dữ liệu và kiểm tra PostgreSQL sẵn sàng; chỉ mở DB trên `127.0.0.1:55432`. Dữ liệu nằm ở `.local/pgdata`, cấu hình kết nối riêng tại `.local/database.json`. Lệnh lặp lại giữ nguyên DB và thông tin operator. Nếu dùng PostgreSQL ngoài, cung cấp biến môi trường `DATABASE_URL` rồi bỏ bước `db:start`. Các lệnh đọc biến môi trường của process; **không tự đọc `.env`**.

`npm start` phục vụ game tại `/`, tài khoản tại `/account`, quản trị tại `/admin`, chính sách tại `/privacy`. Health check: `GET /healthz` trả `status: ok`, `mode: online-demo`. Muốn dùng tên miền/forwarding HTTPS, đặt `PUBLIC_ORIGIN` đúng origin được truy cập để qua kiểm tra Origin/CSRF.

Trong workspace hiện tại đã có Super Admin; máy clone mới tạo Admin bằng `npm run admin:bootstrap`. Lấy tên đăng nhập, mật khẩu ngẫu nhiên và khóa Authenticator trong **`.local/operator.json`** (quyền 600); thêm khóa vào ứng dụng TOTP rồi đăng nhập `/admin`. Không đăng file này lên Git hoặc gửi vào chat. Sau đăng nhập có thể đổi mật khẩu ở `/account`. Cấp quyền yêu cầu MFA trong 5 phút gần nhất và đối tượng đã bật MFA; vai trò thay đổi sẽ thu hồi phiên cũ. CLI bootstrap chỉ dùng khi khởi tạo, không là đường tự nâng quyền.

## Chơi và lưu dữ liệu

- Khách chưa đăng nhập tiếp tục dùng demo local cũ. Sau đăng nhập, server xác nhận nhiệm vụ, vị trí tương tác, mua/mặc đồ, Xu, thời gian hành động và cooldown. Reload giữa hành động tiếp tục execution đã lưu.
- Tài khoản mới có 150 Xu demo. Mua/claim/đóng góp có transaction, receipt và ledger; nhiều tab không trừ/thưởng lặp. Dữ liệu tài khoản không ghi đè key localStorage cũ.
- `/account` có nút nhập demo **một lần**, chỉ ở development/test; kiểm tra shape/ID/số dư, tối đa 100.000 Xu, không nhập danh tính hoặc quyền. Bản local gốc được giữ. `DEMO_IMPORT_ENABLED=false` hoặc production sẽ chặn importer.
- Save local lỗi bị chặn ghi; menu **Khác → Tải bản sao dữ liệu demo local** giữ nguyên byte. Chỉ reset sau xác nhận và đã tạo bản backup trong trình duyệt. ID item chưa nhận diện được giữ lại để mapping, không lọc mất sở hữu.
- Nhiệm vụ đã nhận giữ bản định nghĩa và thưởng tại thời điểm nhận. CMS đổi nội dung dành cho lượt nhận sau; active action giữ reward/cooldown riêng.

## Quản trị

Admin: dashboard riêng, tìm/phân trang người chơi, ví/ledger chỉ đọc, cấm chat hoặc khóa tài khoản riêng, thu hồi phiên, điều chỉnh Xu có giới hạn/MFA/audit. Editor chỉ lưu draft; Admin mới publish/rollback. Super Admin mới cấp role.

Shop/CMS có preview nam/nữ, bốn hướng, 17 tư thế; upload PNG/WebP được giải mã và chuẩn hóa, URL theo hash; hỗ trợ atlas từng dáng và fallback SVG. Xem [docs/WARDROBE_AUTHORING.md](docs/WARDROBE_AUTHORING.md). Archive/rollback giữ item và quyền đã mua. NPC, nhiệm vụ, hành động, lịch sự kiện đều có draft/version. Cập nhật catalog được gửi tới các tab game đang mở.

Chat toàn giáo xứ/khu vực dùng WS có auth, lịch sử có seq, lọc tiếng Việt/liên kết/thông tin cá nhân, báo cáo, cấm chat, khiếu nại và thông báo hệ thống. Quy tắc vận hành: [docs/MODERATION_RULES.md](docs/MODERATION_RULES.md). NPC mô phỏng không chat giả. Chỉ ADMIN/SUPER_ADMIN được xem số liệu hiện diện; API/WS công khai không gửi các bộ đếm đó.

LIVE Studio hiện dùng **MOCK**: một từ khóa, một động tác/khách, lọc tên, giới hạn 20 khách/100 hàng chờ, chống trùng/cooldown, xem trước 9:16 và dừng khẩn cấp. Simulator không cấp tài khoản, đồ hay Xu. TikTok thật và QR tiền thật chưa bật.

## Kiểm thử

Giữ server 5001 chạy, dùng DB demo/test riêng khi kiểm thử. Suite tạo tài khoản và nội dung QA có chủ đích, không chạy trên dữ liệu production.

```sh
npm run verify
npm run format:check
npm run audit:m0
# Cài nếu máy chưa có Chromium: npx playwright install chromium
CHROMIUM_PATH=/usr/bin/chromium npm test
CHROMIUM_PATH=/usr/bin/chromium npm run test:online
```

`npm test`: hồi quy local, 11 nhiệm vụ/14 hoạt động/11 NPC gốc, save và giao dịch nhiều tab. `test:online`: API/auth, nội dung động, WS/presence/ghế, 500 bình luận, atlas/hai tab thật, 11 nhiệm vụ online, save recovery, sáu viewport và ma trận 136 rig. Bỏ `CHROMIUM_PATH` nếu dùng browser Playwright đã cài. CI có PostgreSQL service; cấu hình ở `.github/workflows/verify.yml` (chưa xác nhận chạy trên GitHub).

Ảnh và log hiện tại ở `artifacts/online/`; M0 lịch sử ở `artifacts/m0/`. Kết quả, giới hạn và trạng thái task: [docs/milestones/V4_DEMO_REPORT.md](docs/milestones/V4_DEMO_REPORT.md), [tasks.json](tasks.json), [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

## Backup và cập nhật sau

```sh
npm run db:backup
npm run db:restore-drill
```

Backup riêng tại `.local/backups/` chứa PostgreSQL dump, khóa mã hóa MFA, uploads và cấu hình private operator/database; không phục vụ HTTP/commit Git. Restore drill tạo DB tạm, so tài khoản/ledger rồi xóa **DB tạm**, giữ DB chính. Hướng dẫn rollback/cập nhật ở [MIGRATION_PLAN.md](MIGRATION_PLAN.md). Khóa `.local/encryption.key` phải đi cùng DB để tiếp tục giải mã MFA.

Đây là lưu trữ trong workspace hiện tại, chưa có backup ngoài máy hoặc deployment production. Giữ `.local/` khi cập nhật; không xóa volume, reset DB, thay khóa mã hóa hoặc giải nén ZIP V3 đè source. [docs/HANDOFF_NEXT_SESSION.md](docs/HANDOFF_NEXT_SESSION.md) ghi điểm tiếp tục.

Production yêu cầu DB riêng, HTTPS `PUBLIC_ORIGIN`, `DATA_ENCRYPTION_KEY` 32 byte hex và bật riêng `FEATURE_ADMIN=true`, `FEATURE_CHAT=true`, `FEATURE_AMBIENT_NPC=true`; mặc định các module mới này tắt ở production. Mock LIVE/import demo luôn tắt ở production. Các gate thiết bị thật, soak 30 phút và staging/canary chưa hoàn tất.
