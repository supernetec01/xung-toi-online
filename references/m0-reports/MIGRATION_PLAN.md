# MIGRATION PLAN — mở rộng V4 không mất dữ liệu

## M0 hiện tại: chỉ freeze và dry-run

Không có database runtime để backup/migrate. Không chạy bất kỳ SQL mẫu nào, không tạo tài khoản Admin hay copy source từ V3 tham khảo. Snapshot trước thay đổi gồm checkout và Git metadata; dependencies được tái tạo từ lockfile. Runtime/key lưu/cổng 5001 giữ nguyên. Thông tin snapshot ở `artifacts/m0-baseline.json`, restore drill ở `artifacts/m0/rollback-drill.json`.

`npm run inspect:save -- tests/fixtures/m0/legacy-save.json` chỉ kiểm tra **file offline tổng hợp** và in báo cáo không có tên/số dư. Không sửa input, không ghi localStorage, không tạo wallet/account và không thực hiện import. Unknown/archived IDs, số dư sai kiểu, key nguy hiểm hoặc version không hỗ trợ làm lệnh dừng BLOCKED. Không yêu cầu người chơi gửi save cá nhân qua chat.

## Các ID và state phải giữ

- Catalog hiện tại: `artifacts/m0/catalog-baseline.json`; không thay primary keys bằng dữ liệu ZIP cũ.
- Origin/port và localStorage: `giao-xu-an-hoa-2d-v3`, fallback `giao-xu-an-hoa-2d-v2`; **không** đổi key thành V4 hay `clear()`.
- Preserve inventory/equipment/claimed/progress/achievements, cooldown deadlines, execution chưa xong, vật thể sách/quà/hoa/Noel và preferences. Không cộng lại quest đã claim.
- Item/nghiệp vụ không nhận diện: giữ raw snapshot có quyền truy cập hạn chế và đưa vào hàng chờ mapping; không xóa. Archive không làm mất item và asset cũ.
- Không import `role`, `isAdmin`, session, danh tính, donor approvals, wallet history giả hoặc ownership từ client như bằng chứng tin cậy.

## M1: nền tảng server, auth và schema gốc

1. Dùng modular monolith Node bên cạnh renderer hiện hành, PostgreSQL làm nguồn bền. Chưa cần microservices hoặc Redis để mở Admin.
2. Chọn và pin migration runner; `db/001_v4_additive_reference.sql` vẫn ngoài migrations, chưa tương thích DB trống vì tham chiếu `game_users/shop_items` chưa có. Chuyển thành các migration thật có schema permissions/test DB riêng.
3. Expand: users/sessions, canonical role grants, audit append-only, catalog IDs; wallet/ledger/inventory nền cho màn hình user read-only. Unique/idempotency, balance >=0, không UPDATE số dư trực tiếp.
4. Bootstrap SUPER_ADMIN bằng CLI server có quyền vận hành, không mật khẩu seed mặc định/URL query/localStorage; role grant cần MFA gần đây, reason/audit và bảo vệ Super Admin cuối.
5. API + cookies HttpOnly/SameSite/Secure production, CSRF/origin policy; rotate/revoke session, authz mỗi HTTP/WS message sau này. Moderator không có metrics/publish/user export.
6. Staging: database riêng, test account riêng, snapshot `pg_dump` theo chính sách operator, checksum/restore vào DB riêng rồi mới cho migrate. Không chạy lệnh dump/SQL production trong M0.

## Import người chơi local là bước riêng, chưa tự động mở

Chỉ sau đăng nhập server và có chính sách kiểm chứng quyền sở hữu mới đề xuất import. Local nickname/Xu/items có thể sửa, nên **không tự mint Xu hoặc cấp đồ/quyền theo payload browser**. Chọn chính sách với chủ sản phẩm trước khi bật importer: giữ demo riêng và khởi tạo account sạch, hoặc bồi hoàn đã duyệt qua ledger/audit. Trong cả hai trường hợp không xóa save local gốc.

- Dry-run chỉ mô tả preservation, không đồng nghĩa server chấp nhận số dư.
- Nếu sau này có importer: ID receipt duy nhất `(accountId, legacySaveFingerprint, importVersion)`; atomic apply, retry receipt cũ; không trả raw save/PII trong response/log.
- Raw legacy snapshot lưu tách và có quyền truy cập/retention; không đưa vào Git, HTTP static assets hoặc test artifacts.
- Role/finance/donor data không có đường import từ browser.

## M2–M6: expand trước, contract sau

- **M2:** versioned CMS, archive/tombstone giữ item/asset cũ; wallet/action/quest/shop/contribution server-authoritative. Đóng băng giá/thưởng trong execution/receipt, backfill có checkpoint và thử trên staging. Catalog rollback không rollback ledger/inventory.
- **M3:** chat schema, message seq/outbox, filter/sanctions/appeals; CHAT tách ACCOUNT; retention được công bố. Không chat guest/NPC.
- **M4:** server presence lease, một user nhiều socket một avatar; seat lease; ambient configs/schedules; fixed NPC không bị xóa. Metrics route/stream chỉ ADMIN/SUPER_ADMIN, không gửi aggregates/hydration ra public.
- **M5:** mock provider và queue có cap, idempotency; LIVE_GUEST một action, không wallet/account/chat. Provider thật giữ OFF đến khi có quyền tích hợp.
- **M6:** shared decor/daily Asia/Ho_Chi_Minh/album, load/ops/backup/canary. QR thật OFF đến khi quy trình xác minh độc lập hoàn tất.

## Rollback M0 cụ thể

1. Dừng **server của project này** nếu đang chạy. Không chạm process của task khác.
2. Xem path/SHA trong `artifacts/m0-baseline.json`. Snapshot gốc hiện ở `/workspace/backups/xung-toi-online/pre-v4-m0-20261101T080734Z.tar.gz`, SHA-256 `6ee9caa97c0dd9418f8cd46669d3a49fa33ccbe54c5251af46f5f5c5944ee4b9`.
3. Kiểm tra SHA trước giải nén. Giải nén vào **thư mục mới ngoài checkout**, không `tar` đè lên user files. Giữ nguyên checkout hiện hành; so diff và chỉ copy lại file cần phục hồi sau review.
4. Chạy `npm ci`, `npm run verify` tại bản khôi phục và kiểm tra 10 runtime hashes. Restore drill M0 đã làm trên thư mục tạm, không trên checkout/browser gốc.
5. Khi cần chuyển sang bản cũ, chỉ thay source đã xác minh; giữ origin cũ cổng 5001 để save trình duyệt còn truy cập được. Không xóa localStorage và không đổi account/coin data khi rollback giao diện.
6. Do chưa có commit, **không dùng** `git reset --hard`, `git clean` hoặc checkout V3 tham khảo. Sau khi có release commits, dùng version rollback đã kiểm thử; snapshot M0 không thay backup DB/user data.

## Rollback các phase online sau này

Tắt feature flag module mới, dừng phát event mới, chuyển server/catalog về version tương thích; giữ dữ liệu/ledger mới đã ghi. DB expand migrations phải backward-compatible. Không down migration xóa bảng có dữ liệu hoặc restore DB cũ làm mất giao dịch mới. Chỉ contract sau backfill, kiểm tra và đủ thời gian rollback. Mỗi phase cần restore drill và báo cáo riêng, chưa được đánh dấu đã làm ở M0.
