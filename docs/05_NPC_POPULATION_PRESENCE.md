# 05 — NGƯỜI CHƠI THẬT + NPC DÂN CƯ NỀN, KHÔNG HIỂN THỊ COUNTS PUBLIC

## 1. Ba loại actor thật rõ

`PLAYER`: có userId, tài khoản, ví Xu, chat, nhiệm vụ, di chuyển. `FIXED_NPC`: 11 NPC có quest/hội thoại/Shop; luôn sẵn sàng nếu scene được bật. `AMBIENT_NPC`: cư dân nền mô phỏng, chỉ đi/chào/ngồi/đọc sách/quét sân theo scripted schedule, không ví Xu, không tài khoản, không chat như player, có thể fade out khi cần chỗ. `LIVE_GUEST`: guest tạm từ LIVE, xem docs/06.

Tuy người dùng không muốn lộ **số lượng** real/NPC, các NPC vẫn nên được thể hiện trung thực là “Cư dân” khi mở profile, không dùng thông báo “người chơi này đang online” hoặc tin nhắn giả do bot gửi. Số liệu chi tiết chỉ hiển thị ADMIN/SUPER_ADMIN, không trả trong public payload.

## 2. Presence: định nghĩa online thật

- Trình duyệt player đã auth mở WebSocket. Heartbeat mỗi 15s. TTL online 45s sau heartbeat gần nhất (thông số đề xuất).
- Nếu một user mở 2 tab, realOnlineUnique chỉ đếm userId 1 lần; server quyết định primary controllable avatar/session (lease) để tránh hai nhân vật trùng hoặc một account chiếm hai ghế.
- Chuyển scene atomically: cập nhật presence scene, release seat cũ, spawn/new position, event `actor.leave` và `actor.join` idempotent; sau mất mạng reconnect với resume token ngắn hạn, không nhân đôi sprite.
- Người chơi có thể tắt hiển thị công khai presence nếu pháp lý/UX cần, nhưng khi ở trong cảnh họ vẫn hiện avatar để có thể tương tác; không công bố tổng số online.
- TTL/expires của ghost và player khác nhau; không lưu ambient npc như game_users.

## 3. Thuật toán mật độ cư dân (mỗi scene)

Ví dụ mục tiêu 16 actor nhìn thấy trong sân, fixedNPC=2, realPlayers=3 thì ambientNPC mục tiêu ≈ `max(ambientMin, min(ambientMax, sceneTarget - fixedNPC - min(realPlayers, sceneCapacity)))`, giới hạn tổng sprite + culling.

```ts
function desiredAmbient({sceneTarget, fixedCount, realCount, guestCount, minAmbient, maxAmbient, renderCap}) {
  const slotsLeft = Math.max(0, Math.min(sceneTarget, renderCap) - fixedCount - realCount - guestCount);
  return Math.max(0, Math.min(maxAmbient, slotsLeft)); // minAmbient là mục tiêu mềm, KHÔNG vượt renderCap
}
```

Quy tắc cụ thể:
- Khi real vào, không xóa NPC sát cạnh người; đợi NPC nền kết thúc động tác / rời qua cửa / khuất camera rồi despawn để tự nhiên.
- Hysteresis 3–5 giây, chỉ cập nhật target population mỗi 5–10 giây, chỉ spawn/despawn theo batch nhỏ (1–3 actor/s), tránh nhấp nháy khi player reconnect.
- `renderCap` ví dụ 32 actor tổng trong cảnh mobile, thực tế benchmark rồi cấu hình. Nếu realCount vượt cap, luôn ưu tiên actor gần camera/người đang chơi; các actor xa được cull/LOD, không đá user khỏi game.
- Ambient NPC không sử dụng ghế đã được đặt chỗ bởi player; khi player chọn ghế NPC đang ngồi, NPC có thể lịch sự rời ghế sau 1 transition, không teleport.
- Cả `sceneTarget`, `ambientMin`, `ambientMax`, `renderCap`, `spawnRate`, `schedules`, `allowedWaypoints` có thể cấu hình trong Admin với validation.

## 4. Thời khóa biểu NPC nền

Ví dụ 09:00–11:00 một số dân tưới hoa/đi dạo, 16:00–18:00 dọn sân/chào khách, tối xuất hiện dưới đèn sân; nhà thờ có cảnh ngồi yên. Random deterministic theo `worldSeed + sceneId + timeBucket` để nhiều client nhìn thấy cùng nội dung; server phát spawn events của ambient NPC để đồng bộ khi multiplayer. Không tạo quest per ambient NPC trừ khi cấu hình thành FIXED_NPC một cách rõ ràng.

## 5. Khi số lượng người thật tăng

Trạng thái ví dụ target 20 actors, 2 FIXED_NPC:

| Người thật | NPC nền mong muốn (guest=0) | Tổng visual |
|---:|---:|---:|
| 0 | 18 | 20 |
| 5 | 13 | 20 |
| 12 | 6 | 20 |
| 18 | 0 | 20 |
| 25 | 0 | 27 (tùy cap/culling) |

Không dùng 0 người thật để nói rằng “có 20 người chơi”. Giao diện công khai không có nhãn "online" hoặc loại actor; tại profile NPC ghi "Cư dân giáo xứ" thay vì giả danh user.

## 6. Data contract và privacy

`public actor`: `entityId`, `displayName`, `visual`, `pose`, `position`, `publicKind='resident'|'player'|'live_guest'` nếu UI cần; **không có** `accountEmail`, `sessionCount`, `aggregateOnline`, `fakeOnline`. UI ẩn tổng số; service nội bộ có `presence_metrics` ADMIN only.

`internal stats`: `realOnlineUnique`, `realConnections`, `ambientNpcActive`, `fixedNpcActive`, `guestVisible`, `countsByScene`; chỉ trả từ `/api/admin/presence/summary` với RBAC. Không gửi các con số ấy trong public WS envelope, hydration JSON hay source map. Log người dùng phải hạn chế PII.

## 7. Lỗi cần test

- 1 tài khoản 3 tab -> 1 real player; không render ba avatar.
- 10 người cùng join -> NPC rời tự nhiên, không chiếm chỗ/hitbox.
- Quest giver không biến mất khi full scene.
- Player đóng tab mà không logout -> TTL dọn sau 45–60s, NPC bổ sung sau hysteresis.
- Mất mạng 5 giây reconnect -> không double actor, không teleport vô cớ.
- Player unprivileged `GET /api/admin/presence/summary` -> 403.
- Inspect websocket public / JS bundle / local storage -> không có metrics aggregate real/NPC.
