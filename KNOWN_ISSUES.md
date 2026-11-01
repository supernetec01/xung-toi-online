# Vấn đề còn lại — V4 demo

## Đã xử lý

- **M0-DATA-001:** `R.migrate` giữ ID inventory chưa nhận diện; archive/rollback CMS giữ tombstone, asset và quyền đã mua. Kiểm thử API, atlas hai tab và recovery có evidence.
- **M0-DATA-002:** save hỏng JSON/shape/version bị chặn ghi, gồm trường hợp hỏng giữa hai lần mutate; export nguyên byte, reset cần xác nhận và backup trước. Không thể tự khôi phục thông tin đã mất từ trước.
- **M0-SEC-001 / AUD-004/009:** đã có auth, MFA, RBAC, PostgreSQL migrations, wallet/ledger server, idempotency và kiểm tra thời gian/tương tác. Local demo vẫn có thể sửa bằng DevTools; không được coi demo là chống gian lận.
- Phiên bản nhiệm vụ/thưởng đã nhận và active action được giữ khi CMS thay đổi. Catalog live update, upload atlas/thumbnail, kiểm tra rig/pose và fallback đã có.
- Chat-only mute không khóa gameplay. Account suspend, thu hồi session và đổi mật khẩu chấm dứt quyền HTTP/WS. Public API/WS không có aggregate hiện diện.

## Gate còn mở

| ID | Trạng thái / ảnh hưởng | Điểm tiếp tục |
|---|---|---|
| V4-017 | BLOCKED: chưa có nguồn TikTok LIVE được cấp quyền; chỉ MOCK, production không mở mock | Adapter theo quyền được cung cấp, health/reconnect thật; không dùng cookie hoặc scraper vượt giới hạn |
| V4-019 | PARTIAL: Chromium + viewport giả lập đã kiểm tra; chưa iOS/Safari/Android thật, bàn phím ảo thật, soak 30 phút, tải nhiều máy/phân vùng mạng | Chạy ma trận thiết bị/staging và kiểm tra độ ổn định dài hạn; số đo cloud không là FPS điện thoại |
| V4-020 | PARTIAL: backup/restore local, startup lặp lại và flags production có code; chưa staging/canary, remote CI, alerting hoặc backup ngoài máy | Cấu hình môi trường triển khai rồi nghiệm thu rollout/restore ngoài máy |
| ART-001 | Rig SVG và atlas 1–2 frame/pose đã chạy; mỹ thuật vẫn là prototype, vài tư thế gần nhau, chưa bộ atlas vẽ tay chất lượng phát hành | Biên tập asset/anchors theo `docs/WARDROBE_AUTHORING.md`, visual review trên thiết bị |
| OPS-001 | Presence/coordinator, rate limiter và hàng chờ LIVE chạy một process | Chỉ chạy một Node instance; trước scale-out cần shared coordinator/Redis + durable outbox |
| LIVE-001 | Khách một động tác 3s, rời cảnh sau 6s; queue đang chờ bị hủy khi restart/stop, receipt/progress vẫn giữ trong DB | Thêm TTL/lifetime/public-name controls và outbox cho provider thật; không replay event cũ |
| CHAT-001 | Bộ lọc từ/regex tiếng Việt có thể nhầm hoặc bỏ sót, chưa là bộ phát hiện abuse hoàn chỉnh | Moderator review + khiếu nại; bổ sung tập mẫu và cấu hình ngưỡng; giữ quy tắc cộng đồng |
| UX-001 | ESC/nút đóng/focus đã có; Back hệ thống chưa có lịch sử modal riêng | Nghiệm thu Back/keyboard và cử chỉ trên thiết bị thật |
| GEO-001 | Pathfinding dùng geometry lưới đơn giản của game cũ | Chưa phải navmesh chính xác theo mọi nét mỹ thuật; giữ regression khi đổi cảnh |

Atlas tùy biến phải có đủ 17 pose × 4 hướng cho mỗi dáng được hỗ trợ; chưa hỗ trợ AVIF, atlas nhiều hơn 2 frame/pose hoặc editor kéo thả anchor. Nếu ảnh không tải, rig/palette SVG vẫn hiện. Cấm xóa uploads còn được catalog lịch sử/inventory dùng.

Importer demo là công cụ phát triển do chủ dự án xác nhận dữ liệu hiện tại là demo: đăng nhập, một lần/account, kiểm tra shape/ID, giới hạn Xu. Không dùng như bằng chứng sở hữu hoặc chuyển sang production.

QR/VND, xác minh ngân hàng và bảng donor thật chưa triển khai. Trang `/privacy` đang mô tả dữ liệu demo; cần kênh hỗ trợ, chính sách retention báo cáo và vận hành tài khoản đầy đủ trước public launch. Báo cáo M0 gốc được giữ tại `references/m0-reports/KNOWN_ISSUES.md`.
