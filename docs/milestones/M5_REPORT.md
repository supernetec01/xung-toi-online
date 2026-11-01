# M5 — LIVE Simulator và Studio

**Ngày:** 01/11/2026. **Phạm vi:** demo local/online cổng 5001; không là chứng nhận production.

## Code và hành vi

MOCK admin-only, keyword, event dedup, viewer cooldown, queue≤100/guest≤20, một động tác/guest, tên đã lọc. Không tạo wallet/account/chat. Studio có preview scene/actors 9:16, simulator và kill switch riêng không bị chặn bởi quota bình luận. Production không mở mock.

Files: `server/live.cjs`, `server/world.cjs`, `server/main.cjs`, `public/admin/app.js`, `game_v3/src/online.js`, `game_v3/src/style.css`.

## Kiểm chứng

Logs: [api-tests.txt](../../artifacts/online/api-tests.txt), [realtime-tests.txt](../../artifacts/online/realtime-tests.txt), [live-ui-tests.txt](../../artifacts/online/live-ui-tests.txt).

Ảnh: [admin-live-running.png](../../artifacts/online/admin-live-running.png), [live-guest-world.png](../../artifacts/online/live-guest-world.png), [live-camera-mobile.png](../../artifacts/online/live-camera-mobile.png).

## Còn lại

V4-017 Blocked: không có provider TikTok thật đã được cấp quyền. Queue/coordinator một process, pending guest bị hủy khi restart; lifetime/cooldown hiện là preset cố định.

## Rollback

Dừng khẩn cấp xóa khách/queue; restart cũng dừng phiên. Dedup/progress/audit vẫn trong DB, không ảnh hưởng Xu người chơi. Chi tiết tại [MIGRATION_PLAN.md](../../MIGRATION_PLAN.md).
