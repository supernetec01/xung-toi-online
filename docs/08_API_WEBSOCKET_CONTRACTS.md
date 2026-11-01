# 08 — API + WEBSOCKET CONTRACTS V4

**Tất cả endpoint ví dụ; Codex điều chỉnh prefix theo repo hiện tại.** Yêu cầu HTTPS, secure session cookies + CSRF hoặc scoped bearer token theo kiến trúc hiện tại. Với websocket phải auth, origin allowlist, per-message authz, maximum payload, heartbeat, backpressure. ID UUID, server timestamps ISO-8601 UTC, error `{code,message,requestId,serverNow}`; không gửi stack trace cho client.

## Public game API đã có từ V3 — giữ tương thích

`GET /api/me`, `GET /api/catalog`, `GET /api/quests`, `POST /api/actions/:id/start`, `POST /api/actions/executions/:id/complete`, `POST /api/shop/purchase`, `PUT /api/player/equipment`, `POST /api/virtual-projects/:id/contribute`. Phải giữ receipts idempotent, Xu server authoritative. Các ID mới stable, không đổi migration legacy vô ý.

## Admin dashboard + Users

| Method | Path | Role | Nội dung |
|---|---|---|---|
| GET | `/api/admin/dashboard` | ADMIN+ | KPI real/NPC/guest; totals only here |
| GET | `/api/admin/presence/summary` | ADMIN+ | countsByScene, unique users, conn count, active ambient |
| GET | `/api/admin/users?search=&status=&cursor=` | ADMIN+ | cursor page, masked PII |
| GET | `/api/admin/users/:id` | ADMIN+ | account, inventory, wallet, sanctions, audits |
| POST | `/api/admin/users/:id/sessions/revoke` | ADMIN+ | expire all sessions |
| POST | `/api/admin/users/:id/sanctions` | ADMIN+/MODERATOR scoped | ban/mute/lock reason+until |
| DELETE | `/api/admin/sanctions/:id` | ADMIN+/MODERATOR scoped | revoke sanction with reason |
| POST | `/api/admin/coin-adjustments` | ADMIN+ | compensating ledger transaction, audited |
| POST | `/api/admin/users/:id/roles` | SUPER_ADMIN MFA | grant limited role; can't self-promote |

Role ADMIN+ means ADMIN or SUPER_ADMIN. `GET /api/admin/dashboard` trả 403 cho MODERATOR/EDITOR/PLAYER/guest, không prefetch trong frontend public; không leak qua WS, DOM hoặc source.

## CMS: wardrobe/quest/NPC/event/config

| Method | Path | Role |
|---|---|---|
| GET | `/api/admin/catalog/drafts` | EDITOR+ |
| POST | `/api/admin/catalog/drafts` | EDITOR+ |
| PATCH | `/api/admin/catalog/drafts/:id` (`If-Match: version`) | EDITOR+ |
| POST | `/api/admin/assets/upload-intent` | EDITOR+ |
| POST | `/api/admin/catalog/drafts/:id/validate` | EDITOR+ |
| POST | `/api/admin/catalog/drafts/:id/publish` | ADMIN+ |
| POST | `/api/admin/catalog/publications/:id/rollback` | ADMIN+ |
| GET/POST/PATCH | `/api/admin/ambient-configs` | ADMIN+ hoặc editor draft |
| GET/POST/PATCH | `/api/admin/feature-flags` | ADMIN+ |
| GET | `/api/shop/items?version=` | PLAYER/public read-safe |

CMS update chỉ publish sau khi kiểm `assets`, `avatar poses`, `item slot`, `cooldown`, `quest graph`, `scene hotspot`. Mọi lần publish -> `contentVersion`, audit, invalidate CDN/cache, notify clients to reload catalog at safe transition.

## Chat

HTTP: `GET /api/chat/rooms`, `GET /api/chat/rooms/:id/messages?beforeSeq=&limit=`, `POST /api/chat/messages/:id/report`, `GET /api/me/chat-sanctions`, `POST /api/me/chat-appeals`; admin `GET /api/admin/chat/reports`, `POST /api/admin/chat/messages/:id/hide`, `POST /api/admin/chat/reports/:id/resolve`, `POST /api/admin/chat/rules/publish`.

WebSocket namespace `chat`:

```json
{"type":"chat.send","requestId":"uuid","roomId":"global","body":"Xin chào mọi người"}
{"type":"chat.ack","requestId":"uuid","status":"published","messageId":"uuid","seq":101,"serverNow":"2026-11-01T07:00:00Z"}
{"type":"chat.message","roomId":"global","messageId":"uuid","seq":101,"author":{"id":"uuid","displayName":"Minh"},"body":"Xin chào mọi người","sentAt":"2026-11-01T07:00:00Z"}
{"type":"chat.reject","requestId":"uuid","code":"RATE_LIMITED","retryAfterSeconds":3}
{"type":"chat.sanction_updated","scope":"CHAT","active":true,"until":"2026-11-02T07:00:00Z"}
```

Server phải từ chối `chat.send` từ guest/ambient NPC/ban user, không dựa vào `isAdmin:true` trong payload. Nội dung plain text only. Message retrieval chỉ published/visible hoặc quyền moderator.

## Presence/Actor events

`presence.join` player, `presence.move` throttled, `presence.leave`, `actor.spawn` NPC, `actor.pose`, `actor.despawn`, `room.snapshot`, `room.resync`. Envelope: `{type, roomId, roomSeq, entityId, actorKind, occurredAt, data}`. Field actorKind public có thể phân biệt resident/player/guest cho truthful UI nhưng không có counts.

```json
{"type":"actor.spawn","roomId":"courtyard","roomSeq":502,"entityId":"ambient:visitor:42","actorKind":"resident","data":{"name":"Cư dân An Hòa","spriteId":"npc_resident_07","x":350,"y":440,"pose":"walk"}}
```

**Không** `event: onlineCount` trong public WS. Admin room riêng `admin.presence_snapshot` có count qua authorize per subscribe AND per event.

## LIVE

Admin endpoints: `POST /api/admin/live/sessions`, `POST /api/admin/live/sessions/:id/start`, `POST /api/admin/live/sessions/:id/stop`, `POST /api/admin/live/simulate-comment` (DEV/STAGING only), `PATCH /api/admin/live/settings`, `GET /api/admin/live/health`, `GET /api/admin/live/queue`. Events `live.guest_spawn`, `live.guest_action`, `live.guest_despawn`, `live.campaign_progress` (public safe) và `admin.live_health` (protected). Idempotency `(provider,sessionId,eventId)`.

## Error semantics & event sequencing

HTTP 400 invalid, 401 unauthenticated, 403 no permission, 404 unknown, 409 conflict/If-Match version, 422 content policy, 429 rate limited, 500 generic. `Idempotency-Key`/requestId enforced for purchases, receipt, contribution, admin coin adjustments. WS `seq` monotonic; client receives ack or resync snapshot; duplicates by eventId cannot cause repeat ledger/guest spawn. Admin mutation requires reason and audit entry.
