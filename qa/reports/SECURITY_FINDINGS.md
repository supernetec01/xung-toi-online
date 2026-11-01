# Security findings — QC 01/11/2026

Hai lỗi P0 xác nhận trên fixture đã được sửa: import demo ghi đè inventory/tiến độ, và PLAYER bật MFA vẫn đăng nhập password-only. Không phát hiện bypass còn tái hiện trong các bài đã chạy; đây là kiểm thử có giới hạn, không phải pentest toàn diện.

## Đã sửa và chứng minh

1. **Import demo — QC-003.** Trước: áo đã mua biến mất và số dư 40 thành 200. Sau: tài khoản đã có mutation/ledger ngoài welcome bị 409, ví và áo giữ nguyên. Preview không mutate; If-Match từ chối preview cũ; transaction/advisory lock + receipts + one-time import chặn 10 request cùng key hoặc khác key. Response bị mất được retry cùng key, ledger không nhân đôi. Payload demo không quyết định identity/role. Import vẫn tắt ở production và có feature flag tắt riêng.
2. **MFA PLAYER — QC-020.** Trước: hai lần password-only trả 200 dù đã có secret. Sau: 401 nếu thiếu OTP; OTP hợp lệ được chấp nhận, counter chống replay. Session không có dấu chứng thực MFA bị từ chối khi tài khoản đã có MFA, đóng cả phiên tạo từ đường bypass cũ. [Before](../evidence/mfa-player-before.json), [after](../evidence/mfa-player-after.json); test valid OTP/stale session trong 61 update checks.
3. **Movement — QC-014.** Server kiểm cả route hợp lệ lẫn độ dài theo đồng hồ server. Token bucket 50 logical units/s, tối đa 16 units burst. Client không gửi timestamp để tự cấp credit. Request đi 34 units ngay lập tức bị 422; test đi thật và trễ 300ms đạt. Đây là giới hạn vận tốc với dung sai mạng, không phải server simulation toàn bộ chuyển động hay loại bỏ mọi hình thức gian lận. Endpoint travel giữ hành vi chọn map hiện có.
4. **Seat ownership — QC-015.** State chỉ seated khi lease còn hạn và đúng user/seat. Heartbeat không hồi sinh lease đã hết hạn; tick sửa ghost presence. Ghế mới không bị state cũ chiếm trên giao diện.
5. **Dependency — QC-017.** sharp 0.34.5 → 0.35.5, ws 8.18.3 → 8.22.1. npm audit: hai package high → 0 tại thời điểm chạy. Upload/encode/atlas/WebSocket hồi quy đạt. Khóa phiên bản trong package-lock.

## Các kiểm tra bảo mật đã chạy

- Guest/expired session bị 401; CSRF/origin, password change và session revoke có regression.
- PLAYER/MODERATOR/CONTENT_EDITOR không đọc dashboard Admin (403); ADMIN/SUPER_ADMIN đọc được (200). Publish/role/MFA/audit/last-super guards chạy trong suite online.
- Chat text XSS, throttle, report, ban REST/WS và thời hạn sanction chạy trên tài khoản tổng hợp.
- Player/public API/WebSocket được kiểm payload privacy; số real/NPC vẫn chỉ Admin. Static boundary không phục vụ `.local/`, private source hoặc historical docs.
- `/account` và HTML Admin được phép đọc trả `X-Robots-Tag: noindex, nofollow`. Robots chỉ là chỉ dẫn máy tìm kiếm, không thay auth.
- `/api/payments/webhook`, `/api/payments/checkout`, `/api/tickets/checkout` trả 404. Không có tiền thật trong lần kiểm thử. LIVE chỉ MOCK, guest không được cấp ví hay quyền tài khoản.

Evidence: [security-extra.json](../evidence/security-extra.json), [online.txt](../evidence/runs/online.txt), [audit trước](../evidence/dependency-audit-before.json), [audit sau](../evidence/dependency-audit-after.json).

## Chưa nghiệm thu

Cookie Secure/rotation trên HTTPS thật, tắt/cross-target MFA theo matrix, provider signature/refund/chargeback/entitlement và reconnect TikTok thật chưa được kiểm thử. Không bật thanh toán/vé trả phí dựa trên kết quả simulator. Trước production cần staging TLS, provider sandbox, các case BLOCKED/NOT_RUN liên quan và đánh giá bảo mật độc lập phù hợp quy mô phát hành.

Không đưa token, mật khẩu fixture, TOTP secret, DATABASE_URL, dump hoặc encryption key vào evidence. Database QC trống riêng và instance handshake chặn runner nhầm server. Toàn bộ test ghi dữ liệu phải chạy bằng runner trên môi trường QC.
