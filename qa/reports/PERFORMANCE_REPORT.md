# Performance — Chromium cloud, 01/11/2026

Đã chạy soak 10 phút với **30 actor hiển thị**, sau **100 lần chuyển scene**. Trong phạm vi phép đo này, heap sau GC ổn định và không ghi nhận pageerror. Chưa đo điện thoại vật lý hoặc thiết bị yếu.

| Phép đo | Kết quả |
| --- | --- |
| Thời gian soak | 601.529 giây; 11 mẫu, khoảng cách 60 giây |
| Actor mỗi mẫu | 30/30 ở tất cả mẫu |
| rAF trung bình mỗi cửa sổ lấy mẫu | 58.98–60.62 callback/s |
| Khoảng cách frame p95 | 16.7–16.8ms |
| JS heap sau forced GC, đầu/cuối soak | 2,677,872 → 2,657,736 byte |
| DOM node mỗi mẫu soak | 1,195–1,434 |
| Page errors ghi nhận | 0 |
| Frame-rate simulation 20/30/60 | Đi cùng đường: 1029.9 / 871.4 / 781.1ms; tỷ lệ lớn nhất/nhỏ nhất 1.319 |
| Mạng giả lập trễ location | 300ms; đi dài và giữ WASD đồng bộ đến đích, không lỗi console ghi nhận |

Source phép đo: [soak.cjs](../tests/soak.cjs), [fps.cjs](../tests/fps.cjs), [online-movement.cjs](../tests/online-movement.cjs). Raw evidence: [soak-results.json](../evidence/soak-results.json), [frame-rate.json](../evidence/frame-rate.json), [online-movement.json](../evidence/online-movement.json), [performance.json](../evidence/performance.json). [Ảnh đầu](../evidence/soak-0.jpg), [ảnh cuối](../evidence/soak-10.jpg).

Renderer giữ số lượng actor theo cap; sprite/scene layers có sẵn được tái sử dụng. Sửa movement giữ tính theo elapsed time, bỏ hành vi lowMotion tăng tốc/teleport; stream vị trí giới hạn khoảng 4Hz và queue tuần tự. Khi mạng chậm, catch-up theo bước có thể làm thao tác cuối chờ server; chưa đánh giá mọi điều kiện mạng di động.

Đo controls/overflow tại 320, 375, 390, 768, 1024, 1366, 1920px: account và game HUD đạt trong các màn được đo. D-pad tăng từ 36 lên 44px; link đăng nhập tablet từ 40 lên 44px. [Before](../evidence/game-touch-before.json), [after](../evidence/game-touch-after.json).

Giới hạn: rAF cloud không thay GPU-present FPS; JS heap sau GC không phải RAM toàn tiến trình. Mẫu không tăng không chứng minh không có mọi memory leak/listener leak. Lần thử đầu chỉ có 16 actor do config DB chưa reload được lưu riêng trong `soak-16-results.json`; lượt 30 actor dùng Admin API để config có hiệu lực. Soak hoàn tất trước các thay đổi cuối riêng MFA/session, error scroll và touch hit-area; các nhánh đó có regression riêng. Chưa có phiên console liên tục 15 phút, CPU/battery profile, pinch/zoom vật lý, iOS/Safari/Firefox hoặc 5→15 người chơi thật trên nhiều thiết bị. Các mục tương ứng giữ NOT_RUN/BLOCKED trong matrix.
