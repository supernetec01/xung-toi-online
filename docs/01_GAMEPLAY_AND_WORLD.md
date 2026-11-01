# 01 — GAMEPLAY, CẢNH, NPC, QUEST, PHẦN THƯỞNG

## Scene hiện có (giữ ID từ repo hiện hành)

11 khu vực phiên bản V3 gồm sân, tiền sảnh, gian chính nhà thờ, khu học giáo lý, vườn, nhà xứ, ca đoàn, hang đá Noel, Shop và các vùng phụ; Codex phải inventory ID thực tế từ `src/data.js` hoặc content DB trước khi sửa, không đổi ID bằng bản ghi này. Mỗi scene có `spawn`, `navmesh`, `collision`, `seats`, `interactionHotspots`, `ambientWaypoints`, `sceneCapacity`, `noLiveSpawnZones`, `lightingProfile`.

**Nave / nhà thờ:** giữ bàn thờ, cung thánh, giảng đài, kính màu và hàng ghế. Player đi bộ trong lối đi, chọn slot ghế (đứng/ngồi/quỳ/cúi). Không cho hiệu ứng vui nhộn ở cung thánh hoặc khi cảnh Thánh lễ mô phỏng đang diễn ra. **Courtyard:** quét sân, tưới cây, chào khách, live guest event. **Office/classroom/choir:** NPC giao nhiệm vụ; cửa phòng bật overlay tương ứng.

## 14 hành động lặp (giữ rule V3)

| Mã | Hành động | Cooldown | Xu | Pose |
|---|---|---:|---:|---|
| sign_cross | Làm dấu Thánh giá | 60s | 2 | sign_cross |
| bow | Cúi mình | 90s | 2 | bow |
| genuflect | Bái gối ở vị trí phù hợp | 120s | 2 | genuflect |
| quiet | Ngồi tĩnh tâm | 180s | 3 | sit_pray |
| prayer | Đọc kinh chung | 240s | 4 | pray |
| candle | Thắp nến ở góc được bố trí | 300s | 4 | candle |
| pew_clean | Lau ghế (không trong giờ lễ) | 240s | 8 | wipe |
| sweep | Quét sân | 120s | 7 | sweep |
| welcome | Chào khách | 180s | 6 | wave |
| water | Tưới hoa | 180s | 8 | water |
| books | Sắp sách | 180s | 8 | stack_books |
| gifts | Gói quà cộng đồng | 300s | 12 | pack_gift |
| choir | Luyện tập ca đoàn (giai điệu gốc) | 300s | 7 | sing |
| noel | Trang trí Noel | 600s | 15 | decorate |

Nút các trạng thái `available -> walking -> acting -> confirming -> cooldown -> available`, hoặc `rejected/recovering`. Cooldown/server trả `readyAt`, hiển thị `mm:ss` NGAY TRONG nút, không làm mất tác vụ khác. Animation 2–5s độc lập cooldown 1–10 phút, không đợi thực sự 10 phút để quét sân. Tránh farm: quota cấu hình ví dụ 300 Xu/ngày cho hành động lặp; quest và sự kiện có hạn riêng. Không gắn số Xu với ơn thiêng liêng.

## Quest mẫu

Các quest cũ vẫn giữ: gặp Lucia, ngồi ghế, gặp cha Minh, tìm hiểu Rửa Tội, tìm hiểu Hòa Giải, trả sách bà Anna, tưới đủ ba luống KHÁC NHAU, ca đoàn, gói quà, Noel, lớp giáo lý. Với quest mới có thể thêm `q_garden_repair` (tưới→dọn→trồng), `q_welcome_week` (gặp 3 NPC riêng biệt), `q_event_prepare` (thu thập vật liệu ảo từ nhiệm vụ khác). Tiến độ dựa event chuẩn từ server có receipt id, không nhận `progress=100` do client gửi.

## Nhiệm vụ/social bổ sung

- **Nhiệm vụ nhận lời cảm ơn NPC**: hoàn thành phục vụ để mở đoạn thoại mới, không coi điểm là thiện hạnh thật.
- **Góp Xu xây cảnh**: dùng Xu game cho 4 mốc thay đổi trang trí 25/50/75/100%; công khai tiến độ dự án ảo, không công khai số người chơi online.
- **Album bưu thiếp:** mỗi dịp Noel/sự kiện mở sticker và hình nền avatar; cosmetic only.
- **Daily mission rotation:** chọn từ danh mục, tránh lặp mãi hành vi quỳ/cầu nguyện; reset theo Asia/Ho_Chi_Minh và không trùng reward.
- **Chat khu vực:** tương tác giữa player thật, không cho bot giả làm người chơi gửi tin; NPC có thoại script riêng trên bong bóng ghi “Cư dân”.

## Cơ chế NPC chức năng

NPC có ID ổn định, quest/dialogue, lịch xuất hiện; nếu NPC tạm vắng có bảng chỉ đường hoặc NPC thay thế trả nhiệm vụ, tránh dead-end. `fix_npc_spawned=true` bất biến với logic giảm NPC nền. Do admin chỉnh path/animation/dialogue qua CMS nhưng publish phải validate.
