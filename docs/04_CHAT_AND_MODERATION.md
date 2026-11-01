# 04 — CHAT NGƯỜI CHƠI, LỌC NỘI DUNG & XỬ LÝ VI PHẠM

## Trải nghiệm người chơi

- Nút `Chat` gọn ở HUD, mặc định **đóng**. Khi mở desktop là panel phải dưới (không che trung tâm game), mobile bottom-sheet có keyboard avoidance, auto-scroll chỉ khi user đang đọc dòng cuối.
- Tabs v1: `Khu vực` (room_id=scene), `Toàn giáo xứ` (global), `Thông báo` (read-only hệ thống). **Không triển khai DM riêng ở v1** để giảm quấy rối, dữ liệu cá nhân và công cụ moderation.
- Chỉ account đã xác thực được gửi; người xem LIVE không được gửi vào chat game; NPC không gửi chat giả thay user.
- Message max đề xuất 160 ký tự hiển thị (grapheme), tối đa 1 tin/3 giây và 5 tin/30 giây; limit server theo user, IP, device signals; cấm link/phone/email trong chat v1 hoặc tự redaction; cho phép emoji hợp lý.
- Bong bóng chat trên đầu avatar tối đa 1–2 dòng, tự ẩn sau 3–5s. Người chơi có setting tắt bong bóng, tắt chat, ẩn từng user, báo cáo tin.

## Pipeline kiểm duyệt trước khi phát

`WS chat.send -> auth -> hasChatPermission -> length/rate limits -> normalize text (unicode NFKC, case-fold, bỏ dấu để phát hiện biến thể nhưng giữ bản gốc) -> detect obfuscation/leetspeak -> links/personal-info policy -> rule classifier -> allow / soft_warn / hold / reject -> persist with status -> broadcast ONLY allowed.`

Không chỉ dùng danh sách từ cấm một cách tuyệt đối: từ ngữ có ngữ cảnh, tiếng Việt có dấu/không dấu, viết tắt, chèn dấu/khoảng trắng. Từ cấm không cần lộ toàn bộ danh sách cho frontend. Có cơ chế false positive review. Khuyến cáo không lưu bản gốc lời chat bị từ chối quá thời hạn cần thiết; dùng hash và bằng chứng tối thiểu cho khiếu nại.

Mức xử lý đề xuất (cấu hình qua Admin, không mặc định autoban vĩnh viễn):

| Tình huống | Hệ thống | UI người chơi | Admin |
|---|---|---|---|
| Từ không phù hợp mức nhẹ | reject/soft warn, không phát | `Nội dung chưa phù hợp, hãy chỉnh lại` | log count, có thể review |
| Spam/lặp quá nhanh | 429, slow mode 30–60s | hiển thị thời gian chờ ngay nút Gửi | metrics/rule |
| Lăng mạ nhắm cá nhân hoặc quấy rối lặp | giữ/ẩn message + mute tạm theo chính sách | lý do + thời hạn + appeal | review queue |
| Đe dọa, thù ghét, dữ liệu riêng tư | không broadcast, escalation | thông báo trung lập | alert MODERATOR/ADMIN |
| Vi phạm nhiều lần | mute 10m→1h→24h→7d theo rule | thấy thời hạn & cách khiếu nại | chỉnh/sửa/hủy sanction |
| Ban vĩnh viễn chat | chỉ sau review của người có quyền (ngoại trừ emergency containment) | lý do, kênh appeal | audit bắt buộc |

Mute chat **không đồng nghĩa khóa game**; nếu user banned account do abuse nghiêm trọng thì là sanction khác và quyền cao hơn. Các quyết định tự động cần có cách khôi phục; tránh áp dụng vô hạn vì từ nhầm.

## Chat message state + sự kiện

`pending -> published / rejected / held -> hidden` và `deleted` logic soft delete; UI receiving `chat.message`, `chat.message_hidden`, `chat.sanction_updated`. `messageId` UUID, `seq` server tăng trong room, `sentAt`, `roomId`, `sender={id,displayName,avatarStyle}`, `bodySafeText` (plain text), `status`. ACK để client xóa trạng thái gửi; reconnect lấy lastSeq + pagination, không replay duplicate. Escape HTML và chỉ dùng textContent/render escaped text, tuyệt đối không innerHTML user content.

## Quy trình Report & Appeal

- Player báo cáo một tin `reason=spam, harassment, profanity, privacy, other`; server ghi reporter, msgId, timestamp, status, không tự xóa khi chỉ 1 report.
- Moderator mở report xem context hạn chế của chuỗi hội thoại, chọn `dismiss`, `hide`, `warn`, `mute` (trong mức hạn), hoặc `escalate`.
- User bị mute có `chatSuspendedUntil`, `sanctionReasonCode`, link gửi kháng nghị (form hỗ trợ); ADMIN đọc và ghi quyết định, tránh tự động từ chối tất cả.
- Không cho tự báo cáo chính mình, chặn spam report bằng quota; report không làm lộ nickname người báo cáo.

## Các quy tắc lưu trữ

Minh bạch trong chính sách quyền riêng tư: tin nhắn công khai khu vực có thể hiện cho người cùng khu, có thể lưu 30 ngày theo quyết định vận hành; hồ sơ moderation cần thời hạn riêng (ví dụ 90 ngày nếu phù hợp nghĩa vụ pháp lý). Cho phép yêu cầu xóa/lấy dữ liệu theo pháp luật áp dụng. Log bảo mật không chứa toàn văn chat nếu không cần. Không thu lời xưng tội hoặc dữ liệu riêng tư từ trò chuyện với NPC.

## Chức năng admin chat

`/admin/chat`: realtime feed, tìm `userId`, messageId, room, status, ruleId, reports; config `globalChatEnabled`, `zoneChatEnabled`, `slowMode`, `profanityRulesVersion`, `blockedLinks`, `sanctionPolicy`; có “Chế độ duyệt test” và khôi phục false positive. Mọi lệnh mute/unmute/ban phải ghi `admin_audit_events` actor + reason + old/new + timestamp; nếu bị mute giữa kết nối WS, server push trạng thái và từ chối lần gửi tiếp theo.
