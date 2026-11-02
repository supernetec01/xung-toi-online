# V12 — phạm vi kiểm thử P0

Đối chiếu `QA_MATRIX.csv` với source và log thật ngày 02/11/2026. PASS chỉ áp dụng cho phạm vi ghi ở đây; không tương đương nghiệm thu toàn bộ V12. Mobile là viewport/touch giả lập Chromium. Các lần fail ban đầu và chẩn đoán được giữ trong `artifacts/v12/failures/`; log `regression-*.txt` là lượt cuối sau sửa.

| QA | Trạng thái | Phạm vi/bằng chứng |
| --- | --- | --- |
| 001–002 | PASS | V9 click thật liên tiếp qua phép đổi camera; lệnh cuối thắng, không deadlock. `regression-test-v9.txt`. |
| 003–005 | PASS | Năm map P0: kiểm mọi solid/access/NPC; foot box/A*/sweep unit gồm tường mỏng và đoạn bước dài; click tường thật giữ vị trí. Không phải thử trên thiết bị có frame stall thật. |
| 006 | PASS | Tám hàng ghế trái/phải, đúng seat anchor, `sit_back`/north, avatar giữa back/front; V9 kiểm đứng ra lối đi. `p0-scenes.json`. |
| 007 | PASS | Hai người tranh cùng ghế: một 200, một 409; rời map release. `regression-test-online.txt`. |
| 008 | PASS | Reload còn lease giữ ghế; hết lease trở lại lối đi hợp lệ. `p0-scenes.json`. |
| 009–012 | PASS | Nam/nữ, bốn hướng/tư thế, preview không mất Xu, mua trùng/ownership, reload/đổi map/peer. `t03-avatar.json`, wardrobe regression. |
| 013 | PASS | Registry đủ 11 ID/cổng hợp lệ; route/spawn cho năm map mới và các map cũ qua V8/Noel; test cổng sân đi vào tiền sảnh bằng input thật. Không khẳng định mọi cổng đã được bấm trên điện thoại thật. |
| 014 | PARTIAL | Năm map P0 đã dựng/chụp lại; sáu map P1 còn dùng artwork/layers cũ, chưa nghiệm thu mỹ thuật V12 cho toàn bộ 11 map. |
| 015 | PARTIAL | Modal đơn, ESC, cancel pending navigation có regression; chưa xác nhận nút Back trên thiết bị thật. |
| 016 | PARTIAL | 20 ảnh P0 tại 1366/1920/390/360, player không bị dock che, không overflow. Một số marker cố định còn có thể đè actor/props trên màn hình hẹp; chờ polish. |
| 017 | PASS | Transaction/idempotency claim nhiều lần chỉ một phần thưởng, local và online. `regression-test.txt`, `regression-test-online.txt`. |
| 018 | PARTIAL | Server chặn hoàn thành sớm/cooldown; chưa chạy ca thay đồng hồ hệ điều hành trên thiết bị thật. Không coi clock của demo offline là server time. |
| 019–020 | PASS | Mute WS/REST, player/editor/moderator bị chặn stats/Admin, MFA và thu hồi phiên; debug cũng chỉ Admin. Online regression và `t01-debug.json`. |
| 021 | BLOCKED | Repo chưa có hệ vé/entitlement/provider; không lấy 404 hay cờ client làm bằng chứng đã chặn vé đúng. T22 còn chờ. |
| 022 | PARTIAL | 30 lần đổi map online không tích lũy player/props/wall/floor. Chưa có heap/listener profiler/soak dài để kết luận không rò rỉ bộ nhớ. |
| 023 | NOT_RUN | Chưa có vườn V12/điện thoại thật với 30 NPC. FPS cloud hiện có chỉ mô tả benchmark giả lập. |
| 024–025 | PASS | Luồng kiến thức/quest Rửa Tội không cấp bí tích; Hòa Giải read-only, không có input riêng tư. Full quest UI và P0 info tests. |
| 026 | PASS | Noel cũ: trang trí, lưu offline/online, phần thưởng/album và UI; `regression-test-christmas.txt` (51 checks) và online regression. Artwork V12 MAP-11 vẫn chưa triển khai. |
| 027 | PASS | CMS/atlas validation, ownership, audit và client update hiện có; `regression-test-online.txt`. UI authoring mới T23 vẫn trong backlog. |
| 028 | PARTIAL | Reload/peer/lease và DB persistence đã kiểm; chưa fault-inject restart toàn bộ server giữa một phiên để nghiệm thu ca này. |

P0 còn cần duyệt hình của chủ dự án. T25 không thể đóng khi dependency P1 và các mục PARTIAL/BLOCKED/NOT_RUN ở trên chưa hoàn tất.
