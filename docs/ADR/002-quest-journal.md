# ADR 002 — Nhật ký gameplay và giao dịch local

Giữ các ID catalog V3. Tách quy tắc trạng thái vào `rules.js`; renderer/hội thoại gọi cùng quy tắc thay vì tự cộng Xu hoặc sửa tiến độ theo từng cửa sổ. `gameplay.js` khai báo người giao nhiệm vụ, nơi cần đến, điểm tiếp cận và vùng cản. Không thêm engine đồ họa.

Mọi ghi dữ liệu đọc bản lưu mới nhất dưới cùng Web Lock, xử lý đồng bộ, ghi một lần rồi cập nhật UI. Khi ghi thất bại, khôi phục state trước giao dịch và báo lỗi. Quyền sở hữu/trang phục thật tách khỏi bản thử. Action execution và đóng góp có ID, nhận thưởng quest dùng claimed ID; retry không thưởng/trừ lần nữa.

Nhật ký lưu event + target ID ngay khi khám phá, kể cả trước khi nhận nhiệm vụ. Khi nhận nhiệm vụ, tính tiến độ từ nhật ký; mỗi luống hoa/điểm trang trí chỉ tính một lần. Giữ progress legacy và khôi phục các trạng thái vật thể đã có, không cộng lại Xu từ save cũ. Trả sách ghi nhận vĩnh viễn để không kẹt nếu chưa nhận nhiệm vụ.

Điều hướng tìm đường trên lưới 2% và rút gọn các đoạn có đường nhìn hợp lệ; clamp vào vùng đi được, chặn bàn/cung thánh/ghế/bồn cây. Điểm ghế là ngoại lệ snap có chủ đích sau khi chọn chỗ. Chỉ chạy callback tương tác khi đã đến nơi; đổi menu/cảnh hủy callback đang chờ. Đây là mô hình một người chơi; ghế không có lease multiplayer.

Web Locks/journal không chống người dùng sửa dữ liệu local hoặc đồng hồ. Server authoritative/auth/PostgreSQL vẫn là công việc riêng trước phát hành online.
