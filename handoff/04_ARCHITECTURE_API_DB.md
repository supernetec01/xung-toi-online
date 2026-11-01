# KIẾN TRÚC, DATABASE, API, EVENT & TÍNH ĐÚNG ĐẮN

## 1. Chọn kiến trúc theo giai đoạn, tránh rewrite một lần

**Giai đoạn prototype (hiện tại):** HTML/CSS/JS + SVG, localStorage, không yêu cầu kết nối. `game_v3/src/data.js` + `activities.js` là catalog. Hoàn thiện UX và bug fixes tại đây trước.

**Giai đoạn online production đề xuất:** Vite + TypeScript + 2D renderer (Phaser cho va chạm/camera/sprite nếu thực sự cần; không cài thêm engine chỉ để vẽ modal) + DOM HUD, Node.js API + PostgreSQL, Redis tùy tải và WebSocket chỉ nếu quyết định multiplayer. Giữ các id data khi migrate. Không phụ thuộc trình duyệt làm nguồn chuẩn cho Xu/cooldown.

**Modules rõ ràng:** `world/scenes`, `world/navigation`, `world/actors`, `world/animations`, `ui/hud`, `ui/modalManager`, `features/npc`, `features/quests`, `features/actions`, `features/shop`, `features/donations`, `api/client`; server `auth`, `catalog`, `wallet`, `actions`, `quests`, `inventory`, `donations`, `admin`.

## 2. Dữ liệu cần chuẩn hóa

| Domain | Tables (mục tiêu) | Constraints / Index quan trọng |
|---|---|---|
| Users | `game_users`, `user_sessions`, `player_appearance` | `auth_subject UNIQUE`; username giới hạn, không trùng session ID |
| World | `scene_definitions`, `npc_definitions`, `npc_schedules`, `scene_hotspots`, `scene_seats`, `seat_presence` | unique `scene_id + hotspot_id`, seat TTL; scene version |
| Action | `action_definitions`, `player_action_states`, `action_executions` | chỉ 1 active action/user; `user_id + idempotency_key` unique; reward cap/ngày |
| Quest | `quest_definitions`, `quest_step_definitions`, `player_quests`, `quest_event_receipts` | version + period_key; distinct target IDs khi cần; trạng thái chuyển hợp lệ |
| Wallet | `game_wallets`, `coin_ledger` | balance >= 0, `UNIQUE(user_id,source_type,source_ref)`; ledger append-only |
| Shop | `shop_items`, `player_inventory`, `player_equipment` | inventory PK `(user_id,item_id)`, slot/compatible validate, price server |
| Virtual project | `virtual_projects`, `virtual_contributions` | amount > 0, transaction debit+project increment đồng thời |
| Real donation | `donation_beneficiaries`, `donation_intents`, `verified_bank_transfers` | provider reference unique, state transitions, no coin coupling |
| Donor wall | `donor_publications`, `admin_user_roles`, `admin_audit_events` | consent + confirmed + approved + not hidden |

**Cơ sở tham khảo:** `game_v3/docs/schema_v3.sql`. Đây là **schema gợi ý**, chưa có migrations, RLS/GRANT, seeds, SQL test và server. Không chạy trực tiếp lên database sản xuất trước khi review & test.

## 3. Luồng xử lý action/cooldown theo transaction

```text
POST /api/actions/{actionId}/start   Idempotency-Key: UUID
  Auth → validate action/scene/interact anchor → lock player action state →
  if now < ready_at return HTTP 409 + {readyAt,serverNow} →
  create action_execution: started, complete_after = now + animationSeconds →
  return {executionId, completeAfter, serverNow}.

POST /api/actions/executions/{executionId}/complete   Idempotency-Key: UUID
  Auth → lock execution + player_action_state + wallet row →
  if already completed return *same prior receipt* (NO extra credit) →
  if now < complete_after return 425/409 (too early) →
  verify legitimate state/scene/limits → coin_ledger credit source_ref=executionId →
  update wallet balance + performed_count + ready_at=now+cooldown →
  set execution completed → commit once → return balance, receipt, readyAt, serverNow.
```

Đặt `Idempotency-Key` riêng theo intent; retry cùng key trả cùng kết quả. Nếu mạng mất sau commit, GET execution khôi phục receipt thay vì phát thưởng lại. Không nhận `coinReward` hoặc `readyAt` tùy ý từ client. Không tính thưởng trên `animationend` frontend; event đó chỉ là gợi ý gửi complete.

**Lưu ý tranh chấp:** Unique index `ux_single_live_action` chỉ cho 1 started action/user; cần TTL/expiration job để tránh người chơi kẹt khi đóng tab giữa animation. Thao tác bị ngắt: cho resume hoặc hủy sau timeout đã định và xóa started độc lập, đảm bảo không phát thưởng hai lần. Thời gian cooldown từ server; `serverNow` dùng để hiệu chỉnh timer hiện thị.

## 4. API contracts tối thiểu

```http
GET  /api/me
GET  /api/catalog?version=3
GET  /api/world/scenes/{sceneId}
POST /api/player/location             {sceneId, x, y, sceneVersion}
GET  /api/actions?sceneId=nave
POST /api/actions/{actionId}/start     {requestId, sceneId}
POST /api/actions/executions/{id}/complete  {requestId}
GET  /api/actions/executions/{id}
GET  /api/quests
POST /api/quests/{id}/accept          {requestId}
POST /api/quests/{id}/claim           {requestId}
GET  /api/shop/items
POST /api/shop/purchase               {itemId, requestId}
PUT  /api/player/equipment            {slot, itemId}
POST /api/virtual-projects/{id}/contribute {coins, requestId}
GET  /api/donations/beneficiary       # only if feature enabled
POST /api/donations/intents           {publicName?, consent?, amount?}
GET  /api/donations/intents/{id}
GET  /api/donor-wall                  # only consent+confirmed+moderated
POST /api/donor-wall/{id}/hide        # owner or moderator
```

`400` invalid payload; `401` unauthed; `403` forbidden; `404` no record; `409` conflict/cooldown/replayed with different payload; `422` rule violation; `429` rate limit; `500` generic error with server trace id (never expose raw SQL). Response có `{requestId, serverNow, stateVersion}`; dùng structured validation cho mọi request.

### JSON mẫu complete action

```json
{
  "executionId": "uuid",
  "actionId": "sweep",
  "status": "completed",
  "reward": {"coins": 7},
  "balanceCoins": 257,
  "readyAt": "2026-11-01T07:30:00Z",
  "serverNow": "2026-11-01T07:28:00Z"
}
```

## 5. Quest event xử lý trên server

Chuẩn hóa event `{eventId, actorId, questEventType, targetId?, sourceReceiptId, occurredAt}`. Server kiểm tra source event đáng tin (nói chuyện NPC hợp lệ, interact target, action complete, quiz verified), unique `(user_id, event_id)` hoặc `(quest_id, step_id, target_id)` khi đếm target khác nhau. Không cho client POST `questProgress = 100%`. Claim quest là transaction wallet+ledger và status=claimed, idempotent. `repeat_rule=once/daily/weekly` phải có period_key theo múi giờ cấu hình; không claim lặp qua hai tab.

**Migration V2→V3:** `reward=[xp,coins,kindness]` chuyển thành `rewardCoins=coins+kindness` **một lần**, giữ log migration, truy vết số dư cũ; không tự cộng lại quà đã claim. Trường level và XP cũ có thể để deprecated trong local demo, nhưng server production không dùng cho điều kiện khóa đồ.

## 6. Giao dịch Shop

`BEGIN; SELECT wallet FOR UPDATE; SELECT item.price FROM server catalog; ensure item available, not owned, compatible; INSERT inventory ON CONFLICT DO NOTHING; IF newly inserted debit coins and append ledger with unique purchaseId; COMMIT.` Trường hợp hai tab mua cùng một item: chỉ một purchase/one debit; tab còn lại trả `alreadyOwned`. Trang bị chỉ sở hữu mới được đặt `equipped`, slot hợp lệ; bán chỉ Xu ảo.

## 7. Khôi phục & đồng bộ

- Auth-backed profile là nguồn chuẩn online; cache local chỉ giữ camera, volume, preference, optimistic UI có rollback.
- GET `/api/me` trả wallet snapshot, inventory, equipped, active quests, cooldowns, scene. Mỗi mutation trả `stateVersion`; bỏ event cũ không còn hợp lệ.
- Tab focus reconnect → GET delta, không phát lại sự kiện claim từ local cache. Offline tạm dùng local nhưng phải thông báo chưa đồng bộ.
- Có `schema_migrations`, seed catalog stable IDs và rollback migration. Không dùng `DROP TABLE` trong migration tự động.

## 8. Cấu trúc thư mục mục tiêu (đề xuất, không bắt buộc làm một lần)

```text
apps/web/{src/game,src/ui,src/features,public/assets}
apps/api/{src/modules,src/routes,src/auth,src/jobs}
packages/shared/{catalog,schemas,types}
db/{migrations,seeds,tests}
tests/{unit,integration,e2e,visual}
docs/{ADR,runbook,QA}
```
