# PROMPT GỬI CODEX — NÂNG CẤP GAME GIÁO XỨ AN HÒA V2

Bạn là senior game engineer chuyên Phaser 3/TypeScript, UX game mobile, 2D art pipeline và PostgreSQL. Tôi cung cấp **code prototype chạy được** trong thư mục này. Hãy đọc lần lượt `README.md`, `docs/CODEX_GAME_SPEC.md`, `src/data.js`, `src/art.js`, `src/game.js`, `docs/schema.sql` và chạy thử `index.html` trước khi sửa.

**Mục tiêu:** biến prototype thành game 2D hoạt hình có chiều sâu, chạy mượt trên desktop/mobile web (mobile ưu tiên landscape). Đừng tạo dashboard hay game 3D. Giữ căn nhà thờ mẫu: vòm Gothic trắng, tranh màu xanh phía trên bàn thờ, tượng chịu nạn, kính màu, hai dãy ghế gỗ và lối đi trung tâm, phối cảnh có chiều sâu, 2D layered artwork. Nhân vật là avatar chibi 2D ghép bộ phận (đầu, thân, tay, chân, tóc, áo, quần/váy, giày, phụ kiện), có chọn nam/nữ, mua đồ và thay ngay. NPC phải tương tác với người chơi; 11 scene và 11 quest đã cung cấp là baseline.

**BẮT BUỘC GIỮ:** gameplay vòng lặp `NPC → nhận quest → thực hiện tương tác 1–3 bước → claim XP/Xu/Điểm sẻ chia → Shop/Túi đồ`, map và chức năng khác **ẩn mặc định**, chỉ mở 1 modal overlay khi bấm icon. Các quest rất đơn giản: chào Lucia, thăm và ngồi ghế, gặp cha, tìm sách trả bà Anna, tưới 3 luống, quiz Rửa Tội/Hòa Giải, tập nhịp 3 nốt, gói quà 3 món, trang trí Noel 3 vị trí. Không cho các bí tích/vấn đề tâm linh trở thành điểm cày, không lưu confession data.

**Cách thực hiện:**
1. **Audit & baseline tests:** chạy prototype, ghi nhận hoạt động hiện tại, sửa lỗi không làm hỏng chức năng. Viết E2E smoke tests.
2. **UI/2D art:** tối ưu nhà thờ và các scene thành nhiều layer parallax; sprite nhân vật paper-doll với idle/walk/sit/interact, z-sort theo chân, vật thể tạo occlusion; dùng asset atlas nhỏ, không dựng WebGL 3D.
3. **Engine:** chuyển dần sang Vite + TypeScript + Phaser 3 để xử lý camera, hitbox, A* navigation, transitions; phần UI HUD/modal dùng React/Preact nếu hữu ích; scene content lấy từ JSON thay vì hardcode.
4. **Quest & inventory:** giữ ID định danh, data-driven actions, unique object_id, progress, transaction nhận thưởng một lần, pricing item Xu/Điểm sẻ chia; không cho spam quest để kiếm điểm.
5. **Responsive:** fullscreen, desktop + mobile landscape + portrait pan; tab dạng popover/drawer, 44px touch targets, safe areas, modal cuộn riêng; fallback chế độ giảm hiệu ứng.
6. **Backend:** sau khi gameplay client ổn, triển khai API Postgres từ `docs/schema.sql`; server-authoritative XP/currency. Không hứa multiplayer nếu chưa thực hiện.
7. **QA:** kiểm tra onboarding, đi các scene, quest, tab Shop, nam/nữ, thay đủ slot, reward, persistence, responsive; ghi rõ kết quả có bằng chứng.

**Đầu ra mong muốn:** code đầy đủ có thể chạy `npm install && npm run dev`, `npm run build`, hướng dẫn README, unit + E2E tests, ảnh chụp các màn hình desktop/mobile; bản MVP chạy thực tế trước rồi mới thêm tính năng lớn. Không thay đổi phương hướng UI full-screen tối giản, không mở đồng thời các bảng điều khiển che scene. Chỉ dùng hình/nhạc tự tạo hoặc có giấy phép phù hợp.
