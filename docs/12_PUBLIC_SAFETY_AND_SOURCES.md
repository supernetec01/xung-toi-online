# 12 — RÀNG BUỘC NỘI DUNG, PRIVACY & TÀI LIỆU THAM KHẢO

## Các nguyên tắc công khai

- Không hiển thị số lượng người chơi/NPC ngoài Admin nhưng cũng không tạo con số online giả hoặc nói NPC là người chơi thật. NPC là diễn viên bối cảnh, profile ghi “Cư dân”.
- Tránh thu dữ liệu tôn giáo nhạy cảm: không yêu cầu người dùng khai mình đã rửa tội hay kể lời xưng tội. Nội dung bài học đúng tôn trọng nghi thức; không bán sự tha tội hay ân xá.
- Chat công khai chỉ dành cho người có tài khoản. Công bố quy tắc chat, biện pháp mute/ban, thời hạn lưu tin và kênh khiếu nại.
- Tên khách TikTok lấy từ sự kiện được phép, có thể xử lý cho overlay và lưu tối thiểu; tên bị kiểm duyệt có thể thay `Khách LIVE`. Không thu cookie/token LIVE vào frontend.
- Thu hồi consent bảng tri ân phải có nút ẩn ngay; số tiền thật và Xu không được trao đổi lẫn nhau.

## Liên kết kiểm tra khi triển khai (tài liệu bên ngoài)

- TikTok Gaming — LIVE Interactive Games Partner Registration: https://cp-game.tiktok.com/interactive-game-registration (chương trình đối tác; không ngụ ý API bình luận LIVE được tự động cấp)
- TikTok Developer Guidelines: https://developers.tiktok.com/docs/en/our-guidelines-developer-guidelines (review + quyền tích hợp)
- OWASP WebSocket Security: https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html (WSS, Origin allowlist, auth, message authz, rate limits)
- OWASP Bot Management: https://cheatsheetseries.owasp.org/cheatsheets/Bot_Management_and_Anti-Automation_Cheat_Sheet.html (đa lớp chống spam và lạm dụng)

## Việc cần pháp lý/vận hành kiểm tra trước production

Chính sách chat/độ tuổi, dữ liệu cá nhân Việt Nam, retention, quyền sử dụng hình ảnh và tên giáo xứ/nhà thờ thật, ảnh mẫu, license âm nhạc, điều kiện dùng connector TikTok, xác minh thanh toán và thông báo mục đích QR. Đây là checklist pháp lý vận hành, không phải kết luận pháp lý.
