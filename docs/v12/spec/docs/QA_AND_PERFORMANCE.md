# QA, Performance & Acceptance Gates

## P0 blockers — bắt buộc PASS
- Không đi xuyên nhà thờ/tường/bồn hoa/ghế/gốc cây/quầy/sân khấu.
- Click 10 lần liên tiếp mỗi 200ms không bị kẹt; lệnh mới điều hướng đúng; không teleport qua collider.
- Khi ngồi ghế: nhìn cung thánh, không xoay đầu; ghế không chồng nhau, không hai avatar trùng chỗ.
- Di chuyển giữa 11 map vẫn giữ appearance, Xu, quest, inventory, chat session; không rớt quyền vé.
- Server từ chối cộng Xu/cấp item/cấp vé trái phép hoặc double claim.
- Không lộ dữ liệu Admin/NPC count qua API public, không cho user thường dùng Admin endpoint.
- Chat bị mute/banned không gửi được qua WebSocket; output escape HTML tránh XSS.

## Visual acceptance
- Các scene phải trông thống nhất với hình approved, có 3+ lớp chiều sâu, shadow nhẹ, occlusion đúng, không chỉ là nền ảnh cũ + NPC chồng lên.
- Không có NPC, đồ vật, label chồng lên HUD cố định.
- Nơi click được có affordance rõ; ngoài tầm chỉ hiện một nút tới gần/đi đến.

## Tối ưu
- Test Desktop 1920x1080 và 1366x768; Mobile 390x844, 360x800 và 9:16 LIVE preview.
- FPS mục tiêu: 60 desktop và >=30 trên thiết bị mobile mục tiêu; khi không đạt: cắt particle, giảm NPC nền, dùng atlas và texture compression, giữ collision đơn giản.
- Thử 20–30 NPC nền, 10 người chơi thật, và 100 events queue giả lập để đánh giá baseline.
- Chuyển scene liên tiếp 30 lần không leak tài nguyên/GPU, không nhân đôi WebSocket listeners.

## Kịch bản kiểm thử
- Login/logout/reload, import demo an toàn, refresh đang làm nhiệm vụ, đổi avatar giữa scene, mua đồ 2 tab, chat spam, Admin update outfit, portal có vé và không vé, mất kết nối.
- Mỗi task cần: screenshot before/after, test command + log, thực thi trên thiết bị/breakpoint; nếu thiếu môi trường phải ghi `BLOCKED`, không ghi `PASS`.
