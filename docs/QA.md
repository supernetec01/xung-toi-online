# QA gameplay local — 01/11/2026

## Lệnh nghiệm thu

```sh
npm run format:check
CHROMIUM_PATH=/usr/bin/chromium npm test
```

Server `npm start` cổng **5001** đang chạy trong terminal riêng. Log: `artifacts/current/test-log.txt`. Chromium chạy trên môi trường Linux; không thay thế kiểm thử điện thoại thật/Safari/Edge.

## Kết quả lượt cuối

`npm test` hoàn tất với exit code **0**: 5 nhóm domain, 16 kịch bản hồi quy, 40 kiểm tra gameplay và 3 tình huống concurrency/lưu lỗi đều đạt (**59 kiểm tra browser**). `npm run format:check` đạt.

## Phạm vi kiểm thử

### Quy tắc và dữ liệu

- Catalog: 11 scene, 11 NPC, 11 quest, 21 item, 14 activity; IDs, graph, NPC giao việc, route tới mục tiêu, quiz answer đều hợp lệ.
- 5 nhóm regression domain: mọi hotspot/NPC/action có đường đi không cắt vùng cản; 11 quest và nhận đúng tổng 595 Xu; 14 action với scene/early-complete/cooldown/replay; công việc trước acceptance; toàn bộ 21 item và receipt đóng góp.
- Cung thánh/bàn có vùng cấm; tám hàng ghế và ba lựa chọn mỗi hàng dành cho một người chơi.

### Trình duyệt

- 16 kịch bản hồi quy: tạo nhân vật, Lucia, sweep và reload giữa action, cooldown, scene travel, preview, mua/mặc/reload, thiếu Xu, hai tab mua/start, save V2 và 5 viewport.
- 40 kiểm tra vòng chơi đầy đủ: trả sách trước khi nhận quest; hoàn thành/claim lần lượt **11/11 nhiệm vụ** từ UI; Sơ Maria hiển thị cả hai nhiệm vụ; gặp **11/11 NPC**; chạy **14/14 hoạt động** tại đúng cảnh; kiểm tra số Xu từng lần, đạo cụ và timer; góp Xu double-click; dẫn tới NPC/nhận quà trên mobile.
- Quiz sai không tăng tiến độ; bài nhịp sai bắt đầu lại. Gói quà reload giữa chừng vẫn giữ món đã chọn. Guide tự chọn luống/vị trí Noel chưa hoàn thành.
- 3 tình huống lỗi/concurrency: hai tab claim cùng quest chỉ một thưởng, storage quota lỗi rollback mua, mở Shop hủy callback NPC đang đi tới.
- Không có uncaught pageerror trong các suite đạt. Bài quota chủ động tạo lỗi lưu và kiểm tra thông báo, không coi lỗi được mô phỏng này là lỗi runtime ngoài dự kiến.
- Browser clock được tua ở bài action/cooldown để tránh chờ nhiều phút; không phải bằng chứng chống sửa giờ máy.

## Ảnh đã lưu

`artifacts/current/all-quests-completed.png`, `garden-completed.png`, `christmas-completed.png`, `mobile-npc-quests.png`; world/Shop ở 360×800, 390×844, 768×1024, 1920×1080, 844×390 và desktop 1366×768. Baseline V3 ở `artifacts/baseline`.

## Chưa nghiệm thu

Thiết bị thật/Safari/iOS/Edge, đo FPS/bộ nhớ lâu dài, mọi pose avatar, backend/API/PostgreSQL, chống chỉnh dữ liệu máy, multiplayer, ngân hàng/QR, backup/restore. CI đã cấu hình nhưng chưa có lần chạy GitHub. Mỹ thuật/rig còn là SVG prototype, chưa đạt chi tiết ảnh tham chiếu cuối cùng.
