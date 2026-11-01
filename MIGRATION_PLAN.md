# Lưu dữ liệu, cập nhật và rollback

## Dữ liệu hiện hành

PostgreSQL 16 là nguồn cho tài khoản, sessions, JSONB player state, wallet, ledger, CMS drafts/publications, sanctions, chat/report/appeal, settings/history, ghế, sự kiện LIVE và dự án Xu cộng đồng. Source V3/renderer và stable IDs được giữ. Migrations thực nằm ở `db/migrations/001`–`010`, chỉ mở rộng; runner lưu SHA-256, chặn sửa migration đã áp dụng, dùng transaction/advisory lock.

`.local/database.json` giữ kết nối DB local; `.local/pgdata` là dữ liệu Docker bind; `.local/encryption.key` giải mã MFA; `.local/uploads` giữ ảnh theo hash. Tất cả riêng, gitignored, không phục vụ HTTP. `.local/operator.json` là thông tin operator ban đầu; không seed lại hay tự thay quyền khi startup.

Player state dùng version tăng dần. Mutations khóa theo account, đọc DB/catalog hiện hành, validate, ghi wallet + ledger + state + receipt nguyên tử. Ledger/audit append-only qua trigger. Cooldown/action clock ở server; nhiệm vụ nhận lưu snapshot các bước và reward. Migration 005 backfill snapshot cho account trước khi mở cơ chế pin, giữ reward đã lưu riêng.

## Save local và demo import

Key localStorage vẫn `giao-xu-an-hoa-2d-v3`, fallback `giao-xu-an-hoa-2d-v2`. Không đổi origin/cổng 5001 tùy tiện. Inventory unknown ID giữ lại; chỉ equipment không có asset hợp lệ dùng outfit mặc định. Save hỏng không tự ghi defaults: cho export nguyên bản; reset sau xác nhận và bản backup trình duyệt.

Theo xác nhận **mọi dữ liệu hiện tại là demo**, importer development cho phép một lần/account, tối đa 100.000 Xu, chỉ dữ liệu gameplay đã validate. Không copy identity, role, session, donor approval hoặc ledger client. Import ghi receipt và delta vào ledger, giữ file/save local gốc; retry không nhập lặp. ID không nhận diện làm BLOCKED để mapping, không tự xóa item. `DEMO_IMPORT_ENABLED=false` hoặc production luôn chặn endpoint. `inspect:save` vẫn chỉ là dry-run độc lập, không tự gọi importer.

## Trước mỗi cập nhật

1. Chạy `npm run db:backup`; giữ bundle `.local/backups/<timestamp>.tar.gz` và metadata SHA-256 riêng. Bundle có dump, khóa MFA, uploads và cấu hình private operator/database; phải hạn chế truy cập.
2. Chạy `npm run db:restore-drill`. Lệnh restore vào DB tên tạm, so số account và tổng ledger/wallet rồi xóa DB tạm; không sửa DB chính.
3. Giữ thêm snapshot source ngoài checkout, loại `node_modules`, `.local` và secrets. Backup DB và snapshot source là hai phần khác nhau.
4. Chỉ thêm migration mới; không sửa checksum cũ, không DROP/TRUNCATE hoặc thay stable IDs. Chạy `db:migrate`, regression và test:online trên DB demo/test riêng.
5. Khởi động lại Node; kiểm tra health, đăng nhập, account state và ledger. Giữ lại khóa mã hóa; không tạo key mới cho DB cũ.

Đã thử app restart giữ nguyên fingerprint wallet/state và restore dump vào DB tạm. Evidence: `artifacts/online/persistence.json`, `restore-drill.json`. Đây là local restore, chưa xác nhận khôi phục ngoài máy.

## Rollback theo module

| Module | Thao tác rollback đã có | Dữ liệu giữ lại |
|---|---|---|
| Admin/auth | `FEATURE_ADMIN=false`, restart Node; sử dụng bản source tương thích trước nếu cần | Users, hash mật khẩu, MFA, sessions/audit; không tự cấp role lại |
| CMS | Admin → publication → rollback có reason; tạo **version mới** từ bản cũ, không giảm sequence | Item thêm sau giữ archive, quyền đã mua, quest pin, active action, ledger |
| Chat | Admin tạm tắt gửi hoặc `FEATURE_CHAT=false`, restart; giữ moderation/history theo retention | Report/appeal/audit, sanctions và expiry |
| NPC | `FEATURE_AMBIENT_NPC=false`, restart; hoặc rollback config version | Fixed NPC, nhiệm vụ, người thật; ghế/presence là lease tạm |
| LIVE | Dừng khẩn cấp trong Studio; restart cũng dừng phiên và hủy khách/hàng chờ cũ | Event dedup/progress/audit; không đụng ví |
| Noel | Publish `event.enabled=false` hoặc lịch đóng; rollback publication để mở lại | Tổng Xu đã góp, receipts, album, daily ledger |

Dừng module có thể làm chức năng đó tạm không truy cập được; không khôi phục dump cũ đè DB đang có giao dịch mới. Chuyển source về version tương thích schema mở rộng; không down migration xóa dữ liệu. Chỉ restore DB thật vào **database mới**, đối chiếu dữ liệu phát sinh rồi chuyển connection có kiểm soát. Chưa tự động chuyển production database.

## Baseline M0

Snapshot trước M0: `/workspace/backups/xung-toi-online/pre-v4-m0-20261101T080734Z.tar.gz`; checksum ở `artifacts/m0-baseline.json`. Snapshot trước online: `/workspace/backups/xung-toi-online/pre-online-20261101T082816Z.tar.gz`. Luôn kiểm checksum, giải nén vào thư mục khác để so sánh; không đè checkout hoặc `.local`. Báo cáo M0 gốc ở `references/m0-reports/MIGRATION_PLAN.md`, runtime gốc ở `references/m0-runtime`.

## Quảng trường Noel 02/11/2026

Migration 010 chỉ xuất bản layout/art và anchor Noel, giữ bảng người chơi/kinh tế. Hướng dẫn rollback riêng cảnh và bằng chứng bảo toàn dữ liệu: [CHRISTMAS_PLAZA_20261102.md](docs/CHRISTMAS_PLAZA_20261102.md).
