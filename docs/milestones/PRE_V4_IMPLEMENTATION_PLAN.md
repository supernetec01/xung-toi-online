# Tiến độ triển khai

## Đã triển khai và kiểm thử ở bản local

- 11 khu vực, 11 NPC, 11 nhiệm vụ, 21 vật phẩm và 14 hoạt động, giữ ID của V3.
- Tạo nhân vật nam/nữ, tên hợp lệ; popup ẩn khi chơi, chỉ một popup; focus/ESC, mobile bottom-sheet và reduced motion.
- NPC hiển thị toàn bộ nhiệm vụ liên quan: khóa, có thể nhận, đang làm, có quà, đã hoàn thành. Hội thoại bà Anna thay đổi theo sách; Shop/bản đồ mở từ NPC phù hợp.
- Sổ nhiệm vụ có tiến độ từng bước, điều kiện mở, theo dõi, Đến mục tiêu, nhận quà một lần và thông báo hoàn thành 11/11.
- Nhật ký khám phá ghi nhận công việc làm trước khi nhận quest, kể cả trả sách. Tưới/trang trí tính theo ID khác nhau, không đếm thao tác lặp trên một điểm.
- Quiz có đúng/sai, trò nhớ nhịp làm lại được; gói quà lưu từng món qua đóng popup/reload. Tiến độ hoa và Noel có dấu trong cảnh.
- Tìm đường tránh vật cản, điểm tiếp cận NPC/hotspot/action, bảo vệ cung thánh; tám hàng ghế × ba vị trí trong bản một người chơi.
- 14 activity: đến điểm tương tác → animation/đạo cụ → đúng Xu → cooldown riêng trong nút; resume sau reload; khóa chạy đồng thời.
- Shop thử không trừ Xu, mua xác nhận, mặc/túi đồ, lưu quyền sở hữu; góp Xu có xác nhận và receipt chống submit trùng.
- Mọi ghi local dùng cùng Web Lock; claim/shop/action được kiểm thử nhiều tab. Lưu thất bại rollback giao dịch, có cảnh báo.
- Server Node cổng 5001, lockfile, formatter, CI cấu hình và test tự động; tiền thật và duyệt donor vẫn tắt.

Bằng chứng thực thi và phạm vi browser ở `docs/QA.md`, log/ảnh ở `artifacts/current`.

## Chưa phải phạm vi hoàn tất

- Backend tài khoản, PostgreSQL, wallet ledger và đồng hồ server; chống sửa clock/storage; multiplayer và ghế có lease.
- Avatar 4 hướng/rig và asset chất lượng cuối cùng; kiểm thử mọi pose/thiết bị thật và đo FPS lâu dài.
- Tiền thật, ngân hàng, QR, admin phân quyền, donor verification/consent/moderation.
- Monitoring, backup/restore, rollout/rollback và nghiệm thu Safari/iOS/Edge. CI chưa chạy trên GitHub.

Không đánh dấu toàn bộ P0–P5 là hoàn thành; không công bố bản local là production-ready.
