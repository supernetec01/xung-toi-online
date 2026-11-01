# M4 — Presence, ghế và NPC cư dân

**Ngày:** 01/11/2026. **Phạm vi:** demo local/online cổng 5001; không là chứng nhận production.

## Code và hành vi

Một user nhiều socket chỉ một presence/avatar, primary tab điều khiển, heartbeat 15s/TTL45s, ghế unique/lease. NPC nền scripted/schedule/waypoint/pathfinding, rút dần khi có người thật hoặc guest; fixed NPC được giữ. Config version/If-Match/history rollback; public snapshot không có aggregates.

Files: `server/world.cjs`, `server/game.cjs`, `server/main.cjs`, `game_v3/src/online.js`, `game_v3/src/style.css`.

## Kiểm chứng

Logs: [realtime-tests.txt](../../artifacts/online/realtime-tests.txt), [browser-tests.txt](../../artifacts/online/browser-tests.txt), [performance-tests.txt](../../artifacts/online/performance-tests.txt).

Ảnh: [admin-world.png](../../artifacts/online/admin-world.png), [world-390x844.png](../../artifacts/online/world-390x844.png), [player-world.png](../../artifacts/online/player-world.png).

## Còn lại

Coordinator/rate-limit trong một process, NPC nền không chiếm ghế của người thật; geometry đơn giản. Chưa benchmark phân tán hoặc thiết bị thật.

## Rollback

FEATURE_AMBIENT_NPC=false, restart; hoặc rollback config trong Admin. Fixed NPC/nhiệm vụ và player state không bị xóa. Chi tiết tại [MIGRATION_PLAN.md](../../MIGRATION_PLAN.md).
