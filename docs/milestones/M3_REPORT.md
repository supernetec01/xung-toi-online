# M3 — Chat, kiểm duyệt và khiếu nại

**Ngày:** 01/11/2026. **Phạm vi:** demo local/online cổng 5001; không là chứng nhận production.

## Code và hành vi

Chat auth global/scene, ACK/seq/history/cursor, reconnect, textContent, bộ lọc tiếng Việt/PII/link, rate-limit. Moderator approve/hide, report, mute expiry, gỡ mute cập nhật ngay qua WS, appeal reversal; user vẫn chơi khi bị mute. Admin tắt gửi/đăng thông báo; lịch sử có retention.

Files: `server/chat.cjs`, `server/main.cjs`, `server/world.cjs`, `db/migrations/003_settings_history.sql`, `db/migrations/004_system_notices.sql`, `game_v3/src/online.js`, `public/admin/app.js`, `public/shared/privacy.html`.

## Kiểm chứng

Logs: [live-ui-tests.txt](../../artifacts/online/live-ui-tests.txt), [api-tests.txt](../../artifacts/online/api-tests.txt), [update-tests.txt](../../artifacts/online/update-tests.txt), [realtime-tests.txt](../../artifacts/online/realtime-tests.txt), [browser-tests.txt](../../artifacts/online/browser-tests.txt).

Ảnh: [admin-chat.png](../../artifacts/online/admin-chat.png), [player-chat.png](../../artifacts/online/player-chat.png), [mobile-chat.png](../../artifacts/online/mobile-chat.png).

## Còn lại

Bộ lọc regex có thể sai; chưa thay cho người kiểm duyệt. Bàn phím ảo thiết bị thật và retention report dài hạn cần nghiệm thu.

## Rollback

Tắt gửi trong Admin hoặc FEATURE_CHAT=false; giữ sanctions, expiry, report/appeal/audit; không xóa history để rollback. Chi tiết tại [MIGRATION_PLAN.md](../../MIGRATION_PLAN.md).
