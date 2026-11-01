# V9 — ghế, hướng avatar và điều khiển nhà thờ

Đã tích hợp bộ V9 vào game V4/V8 hiện tại, không thay backend hoặc thay các phòng khác. Nhánh `fix/v9-church`; source trước thay đổi là `3938037`. Đã sao lưu DB riêng trước migration.

## Kiểm kê và quyết định

Đã đọc START_HERE, master prompt, geometry, churchScene, app, tài liệu tích hợp và QA của ZIP. Đã mở HTML V9 qua HTTP trong Chromium và chạy 7/7 bài logic gốc. Source/thử nghiệm gốc được giữ tại `references/v9`, không nhập wallet/coins/NPC giả từ app mẫu.

Nền production `assets/v8/nave.webp` là kiến trúc sạch, không chứa ghế/NPC. Lỗi thực tế là sprite ghế V8 quá cao so với khoảng cách hàng và chỉ có một lớp che nhân vật. Vì vậy giữ kiến trúc có chi tiết, thay riêng ghế bằng SVG V9 tách lớp; không dùng ảnh mẫu có ghế làm nền.

## Đã sửa

- Dùng bốn hàng trái/phải của V9, đổi sang tọa độ phần trăm của mặt sàn đang có. Tám hàng và 24 vị trí ngồi; ID `seat_a`, `seat_b`, các ID còn lại và lease server giữ nguyên.
- Mỗi ghế có back/front riêng, sắp thứ tự theo chân người ngồi. Phần trước che chân; người đi phía trước ghế vẫn hiện phía trước. Bổ sung viền gỗ, panel và họa tiết thánh giá; bỏ sprite ghế nghiêng cũ và offset ngồi -26px.
- Avatar giữ factory/trang phục V4. `sit_back` ánh xạ sang atlas `sit`/hướng `up`; không tạo thêm pose atlas bắt buộc. Hướng đi là bốn trạng thái; bỏ rotate toàn sprite khi bước đi, chỉ tay/chân có animation.
- Lệnh mới tăng token trước khi tìm đường, hủy route/callback cũ cả khi đích mới không có đường. Thời gian mỗi frame giới hạn 50 ms để tránh nhảy xa khi tab trở lại.
- Collision/pathfinding tiếp tục dùng dữ liệu chung với server và kiểm tra từng đoạn, không sao chép nguyên A\* demo vốn dùng hệ tọa độ khác. Ngồi/đứng dùng điểm tiếp cận hợp lệ.
- UI chỉ báo ngồi thành công sau khi lưu/giữ ghế thành công. Server vẫn có unique lease/TTL, nhường ghế NPC, release khi rời cảnh. Đọc player state đang ngồi sẽ quy chiếu ID sang tọa độ catalog hiện tại, tránh tọa độ cũ sau cập nhật/rollback.
- Migrations `008_v9_church_seating.sql` và `009_v9_choir_approach.sql` chỉ xuất bản geometry nhà thờ và lối tiếp cận cửa ca đoàn. Không reset account, ví, inventory, quest hay lease; giữ custom NPC/hotspot.

## Bằng chứng

- `npm run verify`, `npm run format:check`.
- `npm run test:v9`: 7 bài gốc và kiểm thử renderer/geometry thật; 8 cặp back/front, 24 chỗ, không chồng phần ghế nhìn thấy, va chạm, 10 click liên tiếp trong dưới 2 giây, ghế quay lên, đứng dậy ra lối đi, giữ WASD, bảo toàn ví/inventory.
- Bốn viewport: 1366×768, 1920×1080, 390×844, 375×667. [Kết quả](../artifacts/v9/results.json), [desktop](../artifacts/v9/nave-1366x768.jpg), [mobile](../artifacts/v9/nave-390x844.jpg), [ngồi](../artifacts/v9/nave-seated.jpg), [video thao tác](../artifacts/v9/church-interactions.webm).
- Hồi quy: 40 luồng gameplay local (11 quest/14 hoạt động/11 NPC), 24 kiểm tra browser online, 78 API/bảo mật và 79 realtime/chat/privacy/ghế, cùng suite NPC nhường ghế thật. Không chỉ chạy các bài logic của ZIP.

Chưa tuyên bố artwork ghế đạt đúng độ tinh xảo ảnh duyệt: ghế hiện là SVG có thể chỉnh sửa, chi tiết chạm gỗ còn đơn giản hơn ảnh mẫu. Kiến trúc V8 được giữ. Mobile là Chromium giả lập kích thước/cảm ứng, chưa nghiệm thu điện thoại thật/Safari; chưa chạy soak CPU/memory liên tục 10 phút. Các giới hạn này không được coi là đã hoàn tất mỹ thuật sản xuất.

## Cập nhật

Dừng Node (Ctrl+C), giữ Docker/data hiện tại rồi:

```powershell
git pull --ff-only origin main
npm.cmd ci
npm.cmd run db:backup
npm.cmd run db:migrate
npm.cmd start
```

Nếu Docker/DB đã dừng, chạy `npm.cmd run db:start` trước backup. Mở `http://localhost:5001`, Ctrl+F5. Admin/tài khoản cũ tiếp tục dùng được.

## Rollback

Dừng Node. Dry run và quay riêng bố cục nhà thờ về V8 đã lưu, giữ dữ liệu tài khoản:

```powershell
npm.cmd run scene:layout -- v8
npm.cmd run scene:layout -- v8 --apply
npm.cmd start
```

Trở lại V9: cùng lệnh với `v9`. Không xóa migration hoặc restore DB cũ đè tiến độ mới. CLI giữ business content, validate geometry; NPC cố định ở vị trí cũ bị chặn được đưa ra điểm hợp lệ. Demo local không đọc catalog DB; rollback bản demo bằng source commit trước và giữ localStorage.
