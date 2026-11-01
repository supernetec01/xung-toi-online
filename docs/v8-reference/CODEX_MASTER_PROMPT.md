# LỆNH GIAO CHO CODEX — V8 PHỐI CẢNH NHÀ THỜ VÀ 5 KHU ĐÃ DUYỆT

Bạn đang làm trong repo chính của game Giáo Xứ An Hòa V4/V6/V7. Đọc `START_HERE.md`, mở `gallery.html` và chạy `index.html` hoặc `V8_Xem_Thu_Mot_File.html`.

## Mục tiêu
Thay thế 5 cảnh hiện tại (phòng ca đoàn, tiền sảnh, vườn cộng đồng, nhà xứ, gian trang phục), cùng gian chính nhà thờ và mặt tiền, bằng **cảnh có chiều sâu 2.5D** CÙNG PHONG CÁCH ảnh đã duyệt: nội thất nhà thờ Gothic nhẹ, ánh vàng ấm, màu kem/đỏ gỗ, cây cối và đồ vật phong phú, perspective chính diện hướng đến điểm tụ phía xa. Bản cũ chỉ có hình khối phẳng, không được giữ nguyên thiết kế đó.

## Cách làm bắt buộc
1. INVENTORY EXISTING REPO: xác định scene manager, world state, avatar renderer, inventory, NPC, quests, shop, socket, collision, movement, persistence. Ghi file/entrypoint thực tế. Trước khi sửa, lập bản sao / nhánh Git.
2. VISUAL: xem `assets/*.webp` và `gallery.html`, dựng từng cảnh thành các object/layer có thể cập nhật riêng. Chỉ dùng ảnh tham chiếu như spec mỹ thuật; KHÔNG coi ảnh UI có chữ và avatar in sẵn là background production.
3. CAMERA: mô phỏng chiều sâu bằng camera perspective giả 2.5D, gần lớn xa nhỏ. Tầng backwall và kiến trúc không thay đổi theo player; phía trước là mặt sàn, các occluder/props ở giữa. Nếu chọn 3D, dùng **orthographic 3D/lightweight scene** và mức đồ họa thấp phù hợp mobile.
4. MOVEMENT: mọi input pointer/touch/keyboard có thể cập nhật destination NGAY; khi lệnh mới đến hủy path cũ; pathfinding phải tránh blockers, không cắt góc polygon; không click xuyên tường/sân khấu; camera coordinate conversion chính xác ở mọi kích thước.
5. SEAT: mỗi ghế có `seatId`, `approach`, `seatAnchor`, `facing='toward_altar'`; phải walk tới approach, đặt vào seat, pose `sit_back`; khi đứng dậy khôi phục player ở approach; server kiểm tra ghế chưa bị chiếm.
6. V4 INTEGRATION: nhân vật nam/nữ, đầu-thân-tay-chân, trang phục, Xu, NPC, mission, chat, admin là source of truth từ V4; KHÔNG tạo ví, nhiệm vụ hay avatar mới tự lưu localStorage.
7. HIGHLIGHT OCCLUSION: nhân vật đi sau chân cột hoặc quầy đúng cách bằng draw order hoặc split props thành back/front; gốc cây collidable, lá cây có thể che sprite; không đi lên bục cung thánh ngoài hoạt động được thiết kế.
8. INTERACTIONS: ghế, bảng thông báo, âm nhạc, NPC, tưới cây, tủ đồ, cửa ra; hotspots phải tạo vị trí tiếp cận hợp lệ. Sự kiện mốc không được kích hoạt từ bên kia tường dù click thấy icon.
9. MOBILE/LIVE: full màn hình portrait và landscape; HUD thu gọn, canvas giữ tỷ lệ đúng, camera theo người chơi, không để người chơi biến mất khỏi viewport. Tối ưu frame time, asset/webp atlases, throttling animation.
10. TEST & ROLLBACK: chạy `tests/validate_scenes.py`, test tự động và smoke test trình duyệt 390x844 và 1366x768. Mỗi cảnh chụp screenshot CHẠY THẬT, so với ảnh duyệt. Có đường rollback migration.

## Definition of Done / NGHIỆM THU
- Đồ họa của 6 cảnh chi tiết tương đương ảnh duyệt (không phải hình chữ nhật/tam giác trống);
- Nhân vật không đi xuyên bất cứ vật cản chính nào;
- Avatar từ V4 hiển thị đúng quần áo và kích thước gần/xa;
- Ghế ngồi quay về cung thánh, không đứng xuyên ghế;
- Click liên tiếp 5 lần, command cuối cùng được áp dụng;
- Trên mobile điều khiển liên tục, không che nút, không bị crop các điểm tương tác quan trọng;
- Không ảnh hưởng nền kinh tế, tài khoản, quyền vé Noel và dữ liệu V4 hiện tại;
- Nếu artwork 3D nhẹ: thiết bị mục tiêu duy trì ~30–60fps, không buộc 60fps mọi máy; fallback chất lượng thấp.

Trước khi code báo cáo danh sách file sẽ sửa; sau mỗi cảnh báo cáo screenshot trước/sau, lỗi còn lại, các bước test đã chạy. Không nói 'đã hoàn tất' khi chỉ mới có ảnh mockup.
