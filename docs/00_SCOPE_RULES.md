# 00 — Product rules, nguyên tắc & phạm vi

## Các nhóm sử dụng

- **Khách vãng lai web**: trang giới thiệu + xem cảnh công khai nếu được bật; muốn điều khiển nhân vật, chat hay dùng ví Xu phải đăng ký.
- **PLAYER**: nhân vật chính thức; di chuyển, chat, nhiệm vụ, shop, trang phục, góp Xu ảo.
- **NPC chức năng (FIXED_NPC)**: vai trò gameplay; hướng dẫn, trả quest, bán trang phục; tồn tại độc lập lưu lượng người thật.
- **NPC cư dân nền (AMBIENT_NPC)**: đi lại, ngồi ghế, vẫy tay, tưới hoa; tạo không khí; được điều chỉnh mật độ theo người chơi thật; phải nhận diện được là nhân vật mô phỏng khi kiểm tra thông tin, **không giả làm người chơi online**.
- **LIVE_GUEST**: hình chiếu tạm thời từ bình luận TikTok LIVE; chỉ một animation; không đăng ký, không được chat in-game/nhận Xu/mua sắm.
- **MODERATOR**: xem hàng đợi kiểm duyệt, ẩn tin/mute/ban chat và xử lý báo cáo; không thấy dashboard phân tích số lượng người chơi thật/NPC.
- **CONTENT_EDITOR**: tạo bản nháp nội dung, quần áo, NPC, quest; không xuất bản nếu thiếu quyền.
- **ADMIN/SUPER_ADMIN**: kiểm soát nội dung/game, thống kê thực tế, config, publish, xử lý user; SUPER_ADMIN quản lý cấp quyền và những thao tác nhạy cảm.

## Vòng lặp chơi chính (không Level)

Đăng nhập → nhân vật đứng trong scene đã lưu → 1 gợi ý nhiệm vụ → đi đến NPC/hotspot → tương tác → animation 2–5 giây → nhận Xu xác thực qua server → nút cooldown mm:ss → làm nhiệm vụ khác / mua trang phục / chat / đóng góp Xu ảo → quay lại theo sự kiện. Tối ưu nhiệm vụ 30 giây–3 phút; các hành động riêng có cooldown 1–10 phút; không buộc online liên tục.

## Mô hình tăng gắn kết lành mạnh

- Nhiệm vụ hằng ngày nhẹ, không phạt khi nghỉ; 3–5 lựa chọn linh hoạt thay vì ép lặp một nghi thức.
- Công trình cộng đồng cho thấy thay đổi đồ họa qua các mốc, không phải thước đo đạo đức.
- Tên NPC mô phỏng không xuất hiện như một thành viên chat thật, không sinh “chat giả” đánh lừa người chơi.
- Rửa Tội/Hòa Giải chỉ là nội dung tìm hiểu; không bán bí tích, ân xá, công phúc; không lưu lời xưng tội hoặc ý chỉ nhạy cảm.
- Không cấp chức danh linh mục/tu sĩ chỉ bằng mua trang phục; phẩm phục chức thánh chỉ dùng với NPC bối cảnh phù hợp.
- Với QR: ghi rõ đóng góp cho **dự án trò chơi** nếu thực tế là hỗ trợ admin game; không gọi là tiền xin lễ nếu không liên quan giáo xứ có thẩm quyền.

## Phân tách module

`apps/web-game` (renderer, HUD, avatar, world, chat, shop), `apps/admin` (dashboard/forms), `apps/api` (auth, ledger, content, chat, NPC, live), `packages/shared` (types/schema/contracts), `db` (migrations/seeds/tests), `worker` (presence + lifecycle + publish scheduler), `tests` (unit/integration/e2e/load).

Các quyết định framework nên tuân theo repo hiện có. Chỉ dùng Phaser/Pixi/Canvas nếu giúp render 2D có hiệu quả hơn SVG hiện hành; HTML/CSS cho modal, chat, admin. Không ép một lần rewrite engine.
