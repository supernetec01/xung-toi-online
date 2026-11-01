# M1 — Admin, auth và PostgreSQL

**Ngày:** 01/11/2026. **Phạm vi:** demo local/online cổng 5001; không là chứng nhận production.

## Code và hành vi

Tài khoản/password scrypt, cookie phiên hash/CSRF/Origin, TOTP mã hóa và chống replay, RBAC deny-default, recent MFA cho cấp role/điều chỉnh Xu, audit append-only. Admin có search cursor, chi tiết ví/ledger chỉ đọc, mute/account suspend riêng, revoke và metrics thật có scope.

Files: `server/auth.cjs`, `server/security.cjs`, `server/features.cjs`, `server/admin.cjs`, `server/main.cjs`, `config/rbac.json`, `db/migrations`, `public/admin`, `public/shared`.

## Kiểm chứng

Logs: [api-tests.txt](../../artifacts/online/api-tests.txt), [update-tests.txt](../../artifacts/online/update-tests.txt), [realtime-tests.txt](../../artifacts/online/realtime-tests.txt).

Ảnh: [admin-dashboard.png](../../artifacts/online/admin-dashboard.png), [admin-users.png](../../artifacts/online/admin-users.png), [admin-mobile.png](../../artifacts/online/admin-mobile.png).

## Còn lại

Còn luồng quên mật khẩu/tài khoản hỗ trợ và hạ tầng production; credentials bootstrap riêng trong .local, không có mật khẩu Admin mặc định.

## Rollback

FEATURE_ADMIN=false và restart; giữ toàn bộ users/MFA/ledger/audit. Không bootstrap lại để sửa role. Chi tiết tại [MIGRATION_PLAN.md](../../MIGRATION_PLAN.md).
