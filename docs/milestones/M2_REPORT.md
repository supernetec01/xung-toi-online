# M2 — CMS, Shop, atlas và nội dung động

**Ngày:** 01/11/2026. **Phạm vi:** demo local/online cổng 5001; không là chứng nhận production.

## Code và hành vi

Transaction/idempotency cho Xu, mua/mặc/claim/action/đóng góp. Draft/version/publish/rollback, immutable ID/slot, thumbnail/atlas giải mã an toàn. Kiểm tra đủ pose/hướng/dimensions/rig, fallback SVG, CMS live update. NPC mới có spawn/guidance; quest graph/cooldown validate; quest đã nhận và active action có snapshot.

Files: `server/catalog.cjs`, `server/admin.cjs`, `server/game.cjs`, `db/migrations/005_quest_snapshots.sql`, `game_v3/src/wardrobe.js`, `game_v3/src/art.js`, `game_v3/src/online.js`, `public/admin/app.js`.

## Kiểm chứng

Logs: [api-tests.txt](../../artifacts/online/api-tests.txt), [update-tests.txt](../../artifacts/online/update-tests.txt), [wardrobe-tests.txt](../../artifacts/online/wardrobe-tests.txt), [performance-tests.txt](../../artifacts/online/performance-tests.txt), [recovery-tests.txt](../../artifacts/online/recovery-tests.txt).

Ảnh: [admin-catalog.png](../../artifacts/online/admin-catalog.png), [admin-wardrobe-form.png](../../artifacts/online/admin-wardrobe-form.png), [atlas-shop.png](../../artifacts/online/atlas-shop.png), [atlas-equipped.png](../../artifacts/online/atlas-equipped.png), [avatar-pose-matrix.png](../../artifacts/online/avatar-pose-matrix.png).

## Còn lại

Mỹ thuật prototype, atlas 1–2 frame/pose và anchor cố định; chưa editor kéo thả hoặc atlas dài. Xem WARDROBE_AUTHORING.md.

## Rollback

Rollback publication bằng UI tạo version mới, giữ archive/tombstone/asset và inventory. Giữ quest pins, executions và ledger; không restore số dư cũ. Chi tiết tại [MIGRATION_PLAN.md](../../MIGRATION_PLAN.md).
