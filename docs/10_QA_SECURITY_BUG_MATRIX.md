# 10 — QA, BUG RISKS & RELEASE GATES

## Nguyên tắc nghiệm thu

Mỗi feature phải có automated tests (unit + integration hoặc E2E), screenshot desktop/mobile trước/sau, báo cáo lỗi/giới hạn. Không hứa không bug; chặn phát hành nếu còn lỗi nghiêm trọng ảnh hưởng quyền Admin, Xu, chat hoặc mất dữ liệu. Dùng test accounts và mock LIVE; không test bằng tiền thật.

## Checklist kiểm thử critical

### Auth và Roles
- [ ] Không đăng nhập gọi `/admin` / API admin: 401/403; người chơi tự gán role trong payload: 403.
- [ ] MODERATOR có thể hide message/mute giới hạn nhưng không gọi được `/api/admin/presence/summary` hoặc Shop publish.
- [ ] CONTENT_EDITOR tạo draft nhưng không Publish; SUPER_ADMIN grant role yêu cầu MFA; audit đúng actor/reason.
- [ ] Sau logout/ban/rotate session, WebSocket cũ không còn chat hay đọc admin stream.
- [ ] Admin API response public không leak email/token/real-online counts.

### Người chơi + NPC
- [ ] Một user 3 tab -> 1 nhân vật thực, 1 lượt presence; snapshot/resume không double actor.
- [ ] 0 real players -> các NPC nền hoạt động scripted + fixed NPC vẫn giao quest.
- [ ] Từ 0→5→12→20 real players -> NPC nền rút êm trong 5–10s, không đột ngột, không biến mất NPC quest.
- [ ] Mất mạng/refresh trong lúc ngồi ghế -> seat lease giải phóng; không hai actor cùng ghế.
- [ ] 50 actors trên mobile giả lập -> không crash; culling/LOD/appearance fallback.
- [ ] Public game không chứa nội dung `realOnlineUnique`, `ambientNpcActive` ở WS payload/DOM/endpoint.

### Chat & moderation
- [ ] Tin bình thường nhận ACK, xuất hiện đúng 1 lần ở room, reconnect không lặp.
- [ ] HTML `<img onerror=...>` / URL script / Unicode combining -> chỉ hiện text, không chạy JS.
- [ ] Tiếng Việt không dấu, viết cách, l3etspeak, emoji thay chữ -> lọc ở nhiều mức; không chặn nhầm quá nhiều, có appeal.
- [ ] 50 tin spam/giây từ 1 account -> rate limit, không overload room.
- [ ] 1 account mute 24h không gửi được qua WS/REST, nhưng vẫn mua đồ/làm quest.
- [ ] Nhiều report một tin -> không auto ban user nếu chưa qua rule; reviewer history audit.
- [ ] Ban đã hết hạn -> không bị kẹt; WS live push cập nhật rule.
- [ ] Moderator cố mute admin -> 403.

### Shop, Xu, quest và CMS
- [ ] 2 tab mua item một lúc -> 1 debit, 1 inventory, không negative wallet.
- [ ] Preview outfit và bấm cancel -> không trừ Xu, không mất outfit gốc.
- [ ] Admin archive item đã mua -> player vẫn mặc được.
- [ ] Giá editor đổi giữa hai giao dịch -> dùng price snapshot server và catalogVersion; không lệch ledger.
- [ ] Admin publish bản đồ/spritesheet bị thiếu pose -> fail validate, không làm sập scene.
- [ ] Hai admin cùng sửa draft cũ -> 409 conflict, không ghi đè.
- [ ] Cooldown action 60–600s hiển thị trong button, reload/đổi tab/đổi giờ máy không giúp farm.
- [ ] Quest 3 luống hoa khác nhau, nhấp cùng 1 luống nhiều lần không tăng lố; claim 1 lần.
- [ ] CMS rollback restore version content cũ, không rollback coin ledger.

### LIVE & event
- [ ] 100 sự kiện `VÀO` cùng lúc -> queue giới hạn, không freeze game.
- [ ] 1 viewer 30 bình luận trong 60s -> 1 guest, không double tiến độ.
- [ ] LIVE_GUEST chỉ animation duy nhất, không chat, wallet, shop; không đi vào cung thánh.
- [ ] Provider unavailable -> app web chơi bình thường, Admin có cảnh báo.
- [ ] XSS trong TikTok displayName không chạy JS, filter/escape hiệu quả.
- [ ] Tắt live -> cleanup queue + guest, stop all new events.
- [ ] Mock endpoint blocked trong production.

### UX, A11y & performance
- [ ] Viewports 360×800, 390×844, 768×1024, 1366×768, 1920×1080.
- [ ] Keyboard bật khi mở chat mobile không che input/send; chat đóng không giữ focus trap.
- [ ] 1 popup cùng lúc, ESC/Back đóng đúng, back không thoát game ngoài ý muốn.
- [ ] 30fps trở lên (mục tiêu đo trên mobile phổ thông), assets lazy-load; memory leak test 30 phút đổi scene/chat/Shop liên tục.
- [ ] Reduced motion hợp lệ; bàn thờ không bị ghế/actor che sai layer.

## Threat model và ngăn lỗi

| Nguy cơ | Ngăn chặn |
|---|---|
| Fake Admin | server RBAC + MFA + audit, không tin frontend role |
| Xu double-spend | DB transaction + row lock + unique source receipt |
| Chat XSS | plain text escape, CSP, no innerHTML |
| WS hijack | WSS, origin allowlist, auth per socket, reauth/expiration, rate limit |
| Spam | per-user/session/IP limits, queue, backpressure |
| NPC/guest gây lag | culling + pooling + maxVisible + hysteresis |
| Content publish lỗi | draft/validate/preview/version/rollback |
| Leak online metrics | ADMIN endpoint only, no public aggregate payload |
| User bị ban oan | moderation appeal, audit, expiration |
| LIVE connector bị khóa | adapter mock/fallback, không phụ thuộc live để chơi |
| Xóa item cũ làm mất đồ | soft archive, stable IDs, compatible snapshot |
| Live displayName lộ dữ liệu | sanitization/redaction/crop, privacy controls |
| QR sai nhận đóng góp | disabled by default, verified beneficiary/bank ledger, explicit consent |

## SLO mẫu có thể điều chỉnh

REST gameplay p95 < 300ms tại môi trường mục tiêu, chat published p95 < 1s trong cùng region, actor sync drift < 500ms, reconnect < 10s khi mạng phục hồi, render 30fps trên mobile phổ thông. Đây là **targets** cần đo trong staging, không phải kết quả đã đạt.

## Chính sách phát hành

- Canary nội bộ 5–10 user -> nhóm 20–50 -> rộng hơn; kiểm thử gấp đôi peak. Rollback bằng version switch cho CMS, DB expand/contract migrations. Theo dõi alert `coin ledger invariant`, `chat reject anomalies`, `WS disconnect spike`, `LIVE queue > threshold`, `FPS p50/p95`.
- Giữ QR tiền thật OFF cho đến khi độc lập xác minh giao dịch, chính sách và quyền riêng tư đầy đủ.
