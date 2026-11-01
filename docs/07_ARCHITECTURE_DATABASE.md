# 07 — KIẾN TRÚC & DATABASE (SERVER LÀ NGUỒN CHUẨN)

## Kiến trúc module

```text
Browser Game (2D renderer + HUD)        Admin Console (/admin)
                | HTTPS/WSS                  | HTTPS/WSS + MFA
                +--------------+-------------+
                               |
                       API + Auth + RBAC
                               |
       +------------+----------+----------+----------------+
       |            |          |          |                |
    Game Core    Content CMS  Chat     Presence/NPC     Live Adapter
   wallet/quests  publish    moderation + world        + queue
       |            |          |          |                |
       +------------+----------+----------+----------------+
                               |
                   PostgreSQL + Redis (ephemeral)
                               |
                 Object storage/CDN (assets)
```

Bắt đầu từ repo Codex đang chạy; có thể dùng monolith modular trước, không tự chia 6 microservice cho dự án nhỏ. PostgreSQL cho dữ liệu bền; Redis có thể dùng presence, rate limits, fanout/cooldown queue khi đạt tải; không dùng Redis làm nguồn chuẩn của coin/inventory. Thời gian Asia/Ho_Chi_Minh dùng cho reset ngày, server timestamps TIMESTAMPTZ UTC.

## Mô hình dữ liệu cần có

- **Auth/role:** `game_users`, `user_sessions`, `user_roles`, `admin_audit_events`, `role_grants`.
- **Player game:** `player_appearance`, `game_wallets`, `coin_ledger`, `player_inventory`, `player_equipment`, `player_quests`, `action_executions`, `player_action_states`, `seat_presence`.
- **CMS:** `catalog_drafts`, `catalog_publications`, `shop_items` (versioned), `item_asset_variants`, `npc_definitions`, `npc_schedules`, `scene_configs`, `quest_definitions`, `action_definitions`, `event_campaigns`, `virtual_projects`, `feature_flags`.
- **Chat:** `chat_rooms`, `chat_messages`, `chat_reports`, `chat_sanctions`, `chat_moderation_actions`, `chat_filter_rules`.
- **Presence/NPC:** `ambient_actor_presets`, `ambient_spawn_templates` bền trong DB; `presence_leases`, `active_ambient_actors` có thể nằm Redis/memory server, không phải game_users.
- **LIVE:** `live_sessions`, `live_events`, `live_campaigns`, `live_campaign_progress`, `live_guest_appearances`, `live_moderation_rules`, event outbox.
- **Donation real** nếu bật: dùng `donation_*` riêng như V3, no link to coin purchases.

## Quan hệ cấp cao

`game_users 1--N user_roles`; `game_users 1--N chat_messages, chat_sanctions, player_inventory, player_quests, coin_ledger`; `shop_items 1--N item_asset_variants`; `catalog_publications -> catalog_drafts`; `live_sessions 1--N live_events`; `live_events 0..1 -> live_guest_appearances`; `scene_configs -> ambient spawn config`; `npc_definitions (FIXED_NPC) -> quests`.

## Giao dịch Xu và content

- Mỗi Xu credit/debit phải thông qua ledger append-only, unique idempotencyKey + source; transaction với lock ví.
- Admin không được `UPDATE game_wallets SET coins=...` tùy tiện. Chức năng đền bù `POST admin/coins/adjustments` tạo event riêng (reason, ticket, oldBalance, delta, approvedBy, receipt) và hard limits; số tiền lớn cần phê duyệt thứ hai nếu triển khai.
- Quests không hardcode reward client; admin publish reward chỉ áp dụng execution mới, snapshot giá/thưởng khi thực hiện để tránh thay reward giữa chừng.
- `catalog_drafts` -> validate -> `catalog_publications` version pin -> clients nhận `catalog.version`; server giữ version đọc được cho đến khi clients reload; rollback không tước inventory.
- Khi Admin đổi item asset/path, `item_id` và `inventory` không đổi. Không cascade delete dữ liệu người chơi khi archive.

## Presence và consistency

`player_session_lease` TTL, DB account auth, heartbeat WSS; player state official saved DB, NPC ambient ephemeral, guest ephemeral. Room state stream uses monotonically increasing `roomSeq`; on reconnect client requests snapshot+delta. Không gửi admin counts cho player rooms. Spawn NPC được tính server-side, guest impact counted separately.

## Ghi chú migration

`db/001_v4_additive_reference.sql` là **mẫu schema bổ sung tham khảo**, KHÔNG chạy trực tiếp production chưa mapping tables đang tồn tại + migrations tool hiện hành. Codex phải tạo migration thật có idempotent code, rollback plan, backfill, dual-read/write nếu cần. Kiểm tra database thật trước khi tạo bảng dùng chung như users/wallets.

## Bộ chỉ số vận hành

Error rate REST/WS, chat delivery p95, queue depth, presence TTL, spawn/despawn, asset load, coin ledger invariant, scene FPS. Chỉ admin có dashboard real/NPC/guest. Player có thể thấy tên/nhân vật trong scene, nhưng không thống kê tổng số.
