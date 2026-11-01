# GIÁO XỨ AN HÒA — V8 VISUAL SCENE HANDOFF

## VÌ SAO CÓ GÓI NÀY?
Source V4/V6/V7 hiện tại cho hình khối phẳng. Chủ dự án đã DUYỆT phong cách ảnh tham chiếu đẹp hơn cho 5 phòng/cảnh, yêu cầu Codex làm thật giống ảnh, đồng thời nhân vật đi lại và tương tác ổn định, không đè lên kiến trúc, không giật lag.

**Ưu tiên số 1: ĐÚNG HÌNH.** Xem `/gallery.html` để đối chiếu ảnh cũ và hình thiết kế duyệt. **Ưu tiên số 2: ĐÚNG HÀNH VI.** Xem `index.html` (hoặc bản HTML một file) để hiểu vùng đi, lệnh di chuyển liên tiếp, ghế quay mặt, NPC, hoạt động.

## 3 FILE MỞ ĐẦU
1. `V8_Xem_Thu_Mot_File.html` — mở file trực tiếp bằng trình duyệt, có ảnh cảnh, điểm tương tác, di chuyển, màn hình bản đồ.
2. `gallery.html` — 7 cảnh mục tiêu, 5 ảnh **BEFORE** do người dùng cung cấp; là tiêu chuẩn nghiệm thu thị giác.
3. `docs/CODEX_MASTER_PROMPT.md` — phạm vi triển khai và thứ tự làm.

## CẤU TRÚC
- `index.html`, `styles.css`, `src/prototype.js`, `src/scene-data.js`: prototype có thể mở bằng trình duyệt (trực tiếp, không cần build).
- `assets/*.webp`: 7 ảnh mẫu đã duyệt tối ưu để xem nhanh. Đây là **visual reference**, chưa phải texture production có thể di chuyển tự nhiên.
- `data/scenes.json`: scene definitions, walk polygons, blocker rectangles, NPC/hotspot approach, seat anchors (1672 x 941).
- `references/BEFORE_*.png`: 5 ảnh giao diện Codex làm chưa đạt do người dùng gửi.
- `docs/SCENE_ART_AND_CAMERA.md`: cách dựng 2.5D, tách layer và nhân vật.
- `docs/INTEGRATION_AND_DATA_FLOW.md`: nối V4 avatar, inventory, server movement, missions.
- `docs/QA_AND_BUGS.md`: tiêu chí test, hiệu năng.
- `tests/validate_scenes.py`: static validation.

## GIỚI HẠN PHẢI HIỂU RÕ
Ảnh thiết kế hình ảnh còn có NPC, avatar, chữ và HUD được VẼ SẴN TRONG ẢNH. **KHÔNG dùng nguyên tấm ảnh làm production background.** Khi triển khai hãy tái tạo đồ họa thành các lớp (backwall / midground props / walkable floor / foreground occluders), cắt bỏ NPC và HUD khỏi texture, dùng sprite avatar và NPC thực từ V4. Mẫu HTML V8 dùng ảnh này để chốt đúng cảm giác mỹ thuật; collision là khoảng tham khảo phải được vẽ lại và test theo asset cuối.

Bản V8 không chứa backend thanh toán, đăng ký, multiplayer hay server chat; phải dùng source V4/V5, không tự tạo hệ thống thứ hai.
