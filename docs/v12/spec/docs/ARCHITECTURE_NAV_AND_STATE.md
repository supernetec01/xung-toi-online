# ARCHITECTURE — DI CHUYỂN, SCENE VÀ ĐỒNG BỘ

## Kiến trúc cần hướng tới
`UI HUD` ↔ `Scene Manager` ↔ `World Renderer` + `Navigation/Collision` + `Entity/Avatar` + `Interactions` ↔ `Existing backend` ↔ `Existing PostgreSQL`.
Tất cả UI là overlay riêng; không nhúng nút bấm vào ảnh cảnh.

## Scene JSON tối thiểu
```json
{
  "sceneId":"church_main",
  "camera":{"mode":"perspective2d","minScale":0.75,"maxScale":1.3},
  "spawnPoints":[{"id":"from_foyer","x":500,"y":920}],
  "walkablePolygons":[],
  "colliderPolygons":[],
  "entities":[{"id":"bench-L1","assetId":"church_pew","anchor":{"x":200,"y":580},"collisionId":"c1","depthMode":"footY"}],
  "interactions":[{"id":"seat-L1-1","type":"sit","accessPoint":{"x":240,"y":605},"seatAnchor":{"x":225,"y":577},"range":56}],
  "portals":[{"id":"to_foyer","destinationSceneId":"front_hall","triggerPolygon":[]}]
}
```

## Nav/collision
1. Tách art bounds và collision shape. Không lấy viền ảnh làm collider.
2. Check character footprint (feet box/capsule nhỏ), không lấy full sprite head/arms. Sweep/substep chuyển động để tránh tunnelling khi frame drop.
3. Chỉ đi khi footprint nằm hoàn toàn trong walkable surface và không chạm collider. Tìm đường qua navmesh hoặc grid A*; chặn chéo cắt góc qua collider.
4. Click mới phải **abort path/tween cũ**, cập nhật `commandId`, tính path mới và di chuyển tiếp không kẹt; cancel pending interaction bị thay thế.
5. Click vào vật cản: chọn nearest reachable access point hoặc hiện thông báo không đến được; không cho xuyên qua.
6. Depth sorting theo tọa độ chân/anchor, với đồ vật lớn tách `back/foreground` nếu cần.
7. Spawn/checkpoint phải kiểm tra hợp lệ; nếu spawn bị chặn tìm gần nhất hợp lệ, có log.

## Ghế
- Mỗi ghế là một object và collider riêng, render back/seat/front theo lớp phù hợp.
- `approachPoint` ở lối đi, `seatAnchor` ở vị trí ngồi, `facing` = `toward_altar`.
- Sequence: user chọn → tìm đường → server reserve (nếu multiplayer) → animation ngồi → `sit_back` → đứng dậy → release.
- Client timeout/reconnect phải release reservation đúng, ngăn hai người cùng ghế.

## Xu, quest, cooldown
- Client gửi action intent; server xác thực quyền, gần NPC, cooldown, state, số dư, sau đó xử lý trong transaction; frontend chỉ render kết quả.
- Không nhập chung tiền thật bán vé Noel với Xu ảo. Entitlement thật chỉ do server xác thực từ payment provider webhook.

## Migration
- Đọc schema hiện tại, dùng additive migration, backup, rollback script. Không chạy destructive migration trên dữ liệu thật.
- Chỉ tạo các bảng mới khi thiếu dữ liệu cần lưu. Scene art data nên nằm asset manifest; player state và action log trong DB hiện tại.
