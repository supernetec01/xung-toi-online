# GAMEPLAY — NPC, NHIỆM VỤ, HÀNH ĐỘNG, PHẦN THƯỞNG

## 1. Vòng lặp chính (30–120 giây/lần chơi)

`Mở game → xuất hiện ở scene đã lưu → nhìn 1 nhiệm vụ gợi ý → chạm NPC/hotspot → nhân vật đi đến điểm → mở hội thoại/bảng hành động → thực hiện → hoạt ảnh → cộng Xu → khóa cooldown nếu lặp → mở Shop hoặc tiếp tục khám phá.`

Không dùng Level. Mục tiêu ngắn hạn là hoàn thành nhiệm vụ, mua quần áo, trồng/chăm vườn, trang trí chung và khám phá giáo xứ; không có xếp hạng thánh thiện.

## 2. Danh sách NPC hiện hữu (11 nhân vật, ID phải giữ ổn định)

| ID | NPC | Vai trò | Scene tiêu biểu | Tương tác gợi ý |
|---|---|---|---|---|
| lucia | Lucia | Tình nguyện viên | Sân, Noel | Hướng dẫn, nhiệm vụ chào mừng |
| guard | Ông Giuse | Đón khách | Sân, tiền sảnh | Nội quy, vị trí lễ, chỉ đường |
| father | Cha Minh | Cha xứ NPC | Gian chính, nhà xứ | Giới thiệu giáo xứ, học hỏi nghi thức; không nghe xưng tội thật |
| sister | Sơ Maria | Hướng dẫn giáo lý | Gian chính, lớp học | Đọc kinh, câu hỏi giáo lý |
| catechist | Chị Hạnh | Giáo lý viên | Giếng Rửa Tội | Bài học biểu tượng nước và Thánh Tẩy |
| child | Bé An | Thiếu nhi | Lớp học, Noel | Trang trí, tìm sách |
| anna | Bà Anna | Cư dân lớn tuổi | Vườn | Nhặt và trả sách |
| gardener | Bác Phêrô | Chăm vườn | Vườn | Tưới 3 luống, nhổ cỏ (về sau) |
| volunteer | Chị Hương | Phụ trách sẻ chia | Nhà xứ | Gói quà, giúp người cần hỗ trợ |
| choirmaster | Anh Gioan | Trưởng ca đoàn | Phòng ca đoàn | Trò chơi nhịp điệu nhạc gốc |
| shopkeeper | Cô Têrêsa | Shop | Gian trang phục | Thử, mua và mặc đồ |

Mỗi NPC dữ liệu mong muốn: `id`, `name`, `role`, `sceneId`, `spawn`, `interactionAnchor`, `idleAnimation`, `schedule`, `dialogueNodes`, `questIds`, `interactionRadius`, `blockingGeometry`; không hardcode nội dung NPC vào renderer.

## 3. Catalog nhiệm vụ có sẵn trong source

| Quest ID | Tên | Trigger / tiến độ | Phụ thuộc | Thưởng Xu theo demo V3 |
|---|---|---|---|---:|
| q_welcome | Một người bạn mới | nói chuyện Lucia 1 lần | — | 70 |
| q_pew | Chỗ ngồi đầu tiên | vào nhà thờ + ngồi ghế | q_welcome | 35 |
| q_father | Gặp cha xứ | nói chuyện cha Minh | q_welcome | 35 |
| q_baptism | Giọt nước khởi đầu | học giếng Rửa Tội + quiz | q_pew | 35 |
| q_confession | Ý nghĩa của Hòa Giải | đọc thông tin | q_pew | 20 |
| q_book | Cuốn sách của bà Anna | nhặt sách + trả Anna | q_welcome | 80 |
| q_garden | Ba luống hoa | tưới đủ 3 luống KHÁC NHAU | q_welcome | 65 |
| q_choir | Nhịp chuông vui | vượt trò chơi nhịp | q_pew | 50 |
| q_gift | Hộp quà sẻ chia | gói đủ quà | q_father | 80 |
| q_noel | Ánh sáng đêm Noel | trang trí đủ 3 vị trí khác nhau | q_welcome | 100 |
| q_class | Lớp học nhỏ | quiz giáo lý | q_welcome | 25 |

**Chú ý migration:** mã V2 dùng reward tuple `[XP, coin, kindness]`; UI V3 cộng `coin + kindness` nên cột thưởng Xu là tổng hai thành phần cuối. Khi xóa Level, chuyển sang object `{coins: n}` một lần qua migration có test snapshot, tránh mất/nhân đôi phần thưởng; không đọc reward[0] làm Xu.

## 4. Danh sách 14 hành động lặp, thời gian hồi độc lập

| ID | Scene | Hành động / animation chính | Cooldown | Xu |
|---|---|---|---:|---:|
| sign_cross | nave | tay phải làm dấu Thánh giá / `sign_cross` | 1:00 | 2 |
| bow | nave | cúi mình / `bow` | 1:30 | 2 |
| genuflect | nave | bái gối / `genuflect` | 2:00 | 2 |
| quiet | nave | ngồi yên/tĩnh tâm / `pray` | 3:00 | 3 |
| prayer | nave | đọc kinh / `pray` | 4:00 | 4 |
| candle | nave | thắp nến ở góc được phép / `candle` | 5:00 | 4 |
| pew_clean | nave | lau ghế khi không có lễ / `wipe` | 4:00 | 8 |
| sweep | courtyard | quét sân / `sweep` | 2:00 | 7 |
| welcome | foyer | chào khách / `wave` | 3:00 | 6 |
| water | garden | tưới cây / `water` | 3:00 | 8 |
| books | classroom | sắp sách / `stack_books` | 3:00 | 8 |
| gifts | office | chuẩn bị hộp quà / `carry` | 5:00 | 12 |
| choir | choir | luyện tập nhịp / `sing` | 5:00 | 7 |
| noel | christmas | trang trí Noel / `decorate` | 10:00 | 15 |

### Phân biệt hai loại hoạt động

- **Repeatable action** ở bảng trên: chơi lại sau thời gian chờ, mỗi lần hoàn thành có `action_execution_id` và Xu; việc quét sân 2 phút có thể lặp, chứ không bắt chơi đủ 2 phút.
- **Quest step**: ví dụ tưới đủ ba luống khác nhau; cần `unique_target_id` cho mỗi luống; hoàn tất và claim một lần. Không cộng quest 3 lần nếu chỉ tưới cùng một luống.

### Cách timer xuất hiện ngay trong nút

| State | Nút | Tương tác |
|---|---|---|
| `available` | `Thực hiện · +8 Xu` | bật được |
| `walking` | `Đang đi tới...` | tạm khóa |
| `performing` | `Đang thực hiện...` | khóa / animation |
| `claiming` | `Đang xác nhận...` | khóa để tránh double submit |
| `cooldown` | `⏳ 02:59` | disabled, ARIA mô tả còn 2m59s |
| `error` | `Thử lại` | hỏi lại trạng thái server trước khi gửi lại |

Thời gian hồi bắt đầu theo `ready_at` do **server** trả về; client chỉ render mỗi giây dựa trên `serverNow`. Khi hết giờ, gọi API refresh/chờ lần action tiếp theo; không dùng `Date.now()` cục bộ để quyết định trả Xu.

## 5. State machine nhân vật và cử chỉ

```text
IDLE -> WALKING -> AT_ANCHOR -> PERFORMING -> COMPLETING -> IDLE
  |                     |                                ^
  +------> SITTING -----+------> STANDING ----------------+
  +------> KNEELING (chỉ ở vị trí hợp lệ) -> STANDING ----+
```

Animation tối thiểu: `idle`, `walk_up/down/left/right`, `sit`, `stand`, `kneel`, `genuflect`, `bow`, `sign_cross`, `pray`, `sweep`, `water`, `wipe`, `carry`, `sing`, `decorate`, `wave`, `read`. Không cho hai pose tranh rig; khi interrupt có cleanup, tránh nhân vật đứng với tay ở tư thế lỗi.

## 6. Mẫu 3 luồng tương tác

**A. Gặp Lucia:** Player click NPC → route tới vị trí tương tác → dialogue → chạm `Nhận nhiệm vụ` → server tạo player_quest (nếu đã nhận, trả trạng thái cũ) → NPC icon đổi → hoàn thành bước `talk_lucia` duy nhất → nút `Nhận 70 Xu` → transaction ledger → cập nhật HUD.

**B. Quét sân:** Chọn Sân → hotspot `🙌` → menu `Phục vụ` → `Quét sân +7 Xu` → nếu chưa cooldown, đi tới anchor chổi → animation 3 giây → server complete → wallet +7, cooldown 120 giây → nút thành `⏳ 02:00` → refresh còn thời gian tương ứng.

**C. Mua áo:** Shop → tab Áo → lựa món → `Thử` thay bộ đồ tạm **không ghi inventory** → `Mua 110 Xu` → server khóa wallet, đảm bảo chưa sở hữu, trừ 110 vào ledger, tạo inventory record → mặc ngay nếu người chơi chọn → cả HUD/scene/avatar update từ snapshot mới.

## 7. Nội dung Công giáo và giới hạn

Không thu thập lời xưng tội, ý chỉ cầu nguyện riêng tư. Rửa Tội/Hòa Giải là các tuyến bài học, không phát bí tích ảo hoặc biểu thị ơn tha tội thật. Không biến ân xá hay công phúc thành đơn vị tiền tệ; không phát thưởng tùy số lần người chơi làm việc đạo đức để đánh giá phẩm hạnh. Các hành động ngắn chỉ phục vụ cơ chế giải trí, có hạn mức nhận Xu/ngày nếu cần để tránh cày điểm không lành mạnh. Phẩm phục linh mục/sơ chỉ dành cho NPC trong ngữ cảnh phù hợp.
