# MASTER TASK — COPY TRỰC TIẾP VÀO CODEX

Bạn là **Lead Game Engineer + Game UX/Art Implementer + Senior QA** của Giáo Xứ An Hòa. Người dùng đã duyệt phong cách **2D/2.5D chibi có chiều sâu, nhiều lớp, đẹp và nhẹ**. Các map hiện tại còn quá phẳng, sơ sài; avatar nam/nữ khó phân biệt, di chuyển/collision/ghế có lỗi.

## Mệnh lệnh cốt lõi
**Hãy kiểm tra source code thật của repository rồi TRỰC TIẾP THỰC HIỆN CÁC TASK; không chỉ dừng ở phân tích hay dựng ảnh.**

1. Xác định stack hiện tại, routing, render engine, API, DB migrations, auth, quyền và lưu game. Chạy app, test hiện có, ghi baseline; tạo nhánh an toàn. KHÔNG tự ý migrate/xóa data production hoặc rewrite toàn bộ.
2. Lập bảng file thật sẽ sửa sau khi đã inspect; không đoán file path/stack. Dùng file trong gói này làm SPEC, không coi là code đã gắn vào repo.
3. Theo thứ tự `TASK_BOARD.json`, làm từng task nhỏ, commit có thể rollback, có test cho bug đã sửa.
4. Dựng lại scene theo ảnh `references/approved`: **phải tách lớp cảnh, vật thể, collider, hitbox, điểm tương tác, nhân vật, UI**; không được chỉ thay một ảnh nền có sẵn nhân vật/ghế để giả vờ hoàn thành.
5. Đồng bộ avatar V10 với nguồn truth V4: giới tính/kiểu body, tóc, đầu, tay/chân, áo, quần/váy, giày, phụ kiện, inventory, outfit, animation. Kết nối tương tác NPC, cooldown, nhiệm vụ.
6. Một outdoor master map với đường đi liền mạch, các cửa/portal dẫn vào room nội thất. Không tạo các map ngoại thất rời rạc hoặc cho nhân vật đi trên tường, cây, bàn ghế, mái nhà, mặt nước hay công trình.
7. Tạo debug view dành cho developer (`showWalkable`, `showColliders`, `showSeats`, `showPortals`, `showAnchors`, `showDepth`). Không công khai trong game bình thường.
8. Mobile: chạm để đi + nút tương tác; desktop: chuột/WASD. Mục tiêu 60fps desktop / >=30fps thiết bị mobile mục tiêu, có chế độ chất lượng thấp và giảm hiệu ứng.
9. Đừng biến nghi thức tôn giáo thành đồ mua bán hoặc quyền lợi thiêng liêng. Bí tích Rửa Tội và Hòa Giải có thể học/khám phá, nhưng không được mô phỏng việc lãnh nhận bí tích thật hay đổi công phúc bằng Xu.
10. Tiếp tục sửa cho tới khi các tiêu chí nghiệm thu trong `docs/QA_AND_PERFORMANCE.md` đạt hoặc ghi rõ lý do thực sự bị chặn.

## Phạm vi scene cần làm
- Gian chính nhà thờ; sân giáo xứ; tiền sảnh; lớp giáo lý; phòng ca đoàn; vườn cộng đồng; nhà xứ; gian trang phục; quảng trường Giáng sinh; khu giếng Rửa Tội; góc Hòa Giải. Xem `docs/SCENE_MATRIX.md`.

## Bắt buộc bảo toàn
- Auth/session/PostgreSQL/MFA; Shop, Xu, inventory, nhiệm vụ, NPC, chat moderation, Admin CMS, tickets/entitlement và các quy tắc cooldown trên server.
- Không cộng Xu hoặc cấp vé từ client. Không tự dùng thanh toán thật khi kiểm thử.
- Số người chơi thật/NPC nền và thông tin quản trị chỉ có ở Admin API được xác thực/phân quyền.

## Đầu ra sau mỗi task
- File/commit thay đổi; lý do thiết kế; before/after screenshot; video ngắn nếu liên quan animation; test chạy; kết quả và bug còn lại.
- Không tick `[x]` task nếu chưa có implementation + kiểm thử.

## Bắt đầu ngay
Bắt đầu từ **TASK-00 Repo audit → TASK-01 Baseline + QA → TASK-02 shared scene contract**, sau đó sửa P0 liên quan di chuyển và avatar; tiếp tục từng map. Sau khi audit, cập nhật `TASK_BOARD.json` với đường dẫn file thật trong repository và tiến độ.
