# HÒM ỦNG HỘ, QR, BẢNG TRI ÂN — QUY TẮC AN TOÀN

## 1. Hai dòng giá trị không liên thông

**Xu ảo**: chỉ dùng trong game để mua quần áo hoặc cùng trang trí nhà thờ ảo; không quy đổi tiền mặt, không chuyển cho người khác, không mua ân xá/công phúc/bí tích. Có thể đóng 50/150/300 Xu cho dự án cảnh quan, với ledger âm và progress cộng đồng (giao dịch atomic).

**Ủng hộ VND thật**: đóng góp hoàn toàn tự nguyện để **ủng hộ người vận hành/phát triển game**, nếu đó là chủ thể thụ hưởng thực tế. Không được ghi “tiền công đức nhà thờ” hay “quỹ giáo xứ thật” trừ khi có đơn vị nhận rõ ràng và được ủy quyền. Tuyệt đối không hứa nhận lợi ích tinh thần/bí tích khi chuyển tiền, không tạo áp lực hay nâng hạng theo số tiền.

## 2. UI hòm ủng hộ

`Khác → Hòm ủng hộ → [Xu xây dựng] [Ủng hộ VND] [Bảng tri ân]`.

- Xu xây dựng: số dư Xu, ba mốc đóng góp ảo, mục tiêu được đầu tư (hoa, đèn, hang đá), tiến độ; xác nhận trừ Xu, có receipt.
- Ủng hộ VND: hiển thị **người thụ hưởng pháp lý, ngân hàng, chủ tài khoản, nội dung, mục đích** và QR chính xác nếu admin đã kích hoạt; hiển thị phí/phương thức/khiếu nại nếu có; mặc định không bật (demo placeholder).
- Tên để công khai trên bảng tri ân là **opt-in riêng biệt, mặc định OFF**. Có nút ẩn/thu hồi sau khi công khai; không buộc cho ủng hộ.
- Public wall chỉ hiển thị tên được đồng ý + đã được đối soát + moderator duyệt. Không hiển thị sao kê, số tài khoản cá nhân, mã giao dịch hoặc số tiền trừ khi có mục đích và consent riêng phù hợp.

## 3. Luồng nghiệp vụ an toàn

```text
Player click Ủng hộ VND
 -> GET beneficiary verified + clear recipient & purpose
 -> POST donation_intent (amount optional, reference unique)
 -> server trả QR đúng beneficiary/ref
 -> user tự chuyển trên app ngân hàng
 -> trạng thái PENDING (QR displayed ≠ payment received)
 -> server webhook có xác thực hoặc đối soát finance reviewer từ nguồn tin cậy
 -> unique(provider, txn_ref), verify beneficiary + amount + reference
 -> CONFIRMED / NEEDS_REVIEW / REJECTED / REFUNDED
 -> nếu opt_in=true + kiểm duyệt -> donor_publications approved
 -> public wall; user có thể yêu cầu ẩn tên.
```

**Không tin**: screenshot, ảnh chứng từ do user tải lên, query string `?paid=1`, callback JS/URL redirect, nút “tôi đã chuyển”, dữ liệu localStorage. Chỉ bank/provider data kiểm chứng và đối soát có quyền mới chuyển sang confirmed.

## 4. Bảo mật và tuân thủ cần triển khai trước bật QR

- Chỉ lưu secret/token/bank webhook trong server env/secret store, không commit `.env` và không để trong client JS/HTML. Nếu cần QR ảnh public, tạo theo beneficiary đã xác minh và reference/amount trên server.
- Admin role: `SUPERADMIN`, `FINANCE_REVIEWER`, `CONTENT_MODERATOR` và nguyên tắc quyền tối thiểu; finance reviewer không tự sửa tên beneficiary mà không có người thứ hai duyệt.
- Audit log thay đổi beneficiary, chuyển trạng thái giao dịch, publish/hide tên, approve/reject.
- Rate limit, CSRF/session security, input sanitization, anti-replay webhook, reconcile không trùng provider reference.
- Privacy: thông báo rõ tên công khai là lựa chọn, thời gian lưu, mục đích xử lý, cách rút lại consent; cung cấp cách xóa/ẩn tên và quy trình xử lý yêu cầu. Cần rà soát nghĩa vụ pháp lý thực tế tại nơi vận hành trước khi mở thanh toán.
- Không show Top 10 donor hay làm nổi bật người chi nhiều; bảng tri ân không xếp hạng và có tùy chọn ẩn danh.
- Tuyệt đối không đặt CTA xin tiền trong cảnh Thánh lễ như một hành động bắt buộc, không cho tiền thật mang lợi thế gameplay.

## 5. Bảng database có sẵn để tham khảo

`donation_beneficiaries`, `donation_intents`, `verified_bank_transfers`, `donor_publications`, `admin_user_roles`, `admin_audit_events`, view `public_donor_wall` trong `game_v3/docs/schema_v3.sql`. Đây mới là mẫu, không thay thế kiểm thử chống giả giao dịch, migration, phân quyền, mã hóa và hậu kiểm.
