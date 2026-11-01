# Giới hạn và vấn đề còn lại

## Gameplay local đã sửa

- AUD-002/003: catalog chỉ dùng Xu; preview độc lập, mua xác nhận, save giữ đồ/claimed và số dư.
- AUD-005: bản server không phục vụ HTML lịch sử có nút duyệt donor demo; giao diện hiện tại không tạo/duyệt thanh toán hay công khai donor local.
- AUD-006/007: đã có điều hướng lưới tránh vùng cản, điểm tiếp cận và 24 lựa chọn ghế. Bản một người chơi, không có seat occupancy giữa người chơi online.
- AUD-008: execution local resume sau reload, retry khi lưu lỗi, không cộng thưởng lại.
- Trả sách trước nhận quest, làm vườn/Noel sớm, vào nhà thờ/gặp NPC trước nhận quest đều có nhật ký phục hồi tiến độ.
- NPC có nhiều nhiệm vụ không còn chỉ đưa nhiệm vụ đầu; marker cập nhật sau thay đổi tiến độ.
- Đóng góp Xu có receipt; Hòm Xu mở đúng tab mặc định. Mở menu hủy tương tác NPC đang đi tới, không bị popup đến muộn thay thế.

## Còn mở

- AUD-004: localStorage và đồng hồ máy có thể sửa; cần backend authoritative trước public launch. Chưa auth/API/PostgreSQL.
- AUD-009: SQL bàn giao chỉ tham khảo, chưa có migrations/test database chạy thật.
- Web Locks cần localhost hoặc HTTPS và trình duyệt hỗ trợ. Giao dịch báo không khả dụng nếu thiếu Web Locks.
- Save lỗi có cảnh báo/rollback, nhưng chưa có export/import hay phục hồi file save bị hỏng. Không khôi phục được sự kiện chưa từng được lưu ở các bản prototype cũ.
- Geometry dùng vùng cản đơn giản, chưa phải navmesh/polygon chính xác theo mọi chi tiết mỹ thuật. Nhân vật/asset vẫn theo phong cách SVG prototype; chưa avatar 4 hướng đầy đủ.
- Chưa đo hiệu năng trên máy yếu, chưa Safari/iOS/Edge thật, chưa full avatar pose matrix. ESC/nút đóng đã có; phím Back hệ thống trên mobile chưa được triển khai riêng.
- Tiền thật, QR, bảng tri ân được xác minh và mục tiêu chung multiplayer chưa được bật. Đóng góp hiện là Xu ảo trên máy này.

## Audit V4 / M0 — phát hiện cần xử lý trước online/CMS

| ID | Ưu tiên | Tái hiện / kết quả quan sát | Phase xử lý |
|---|---|---|---|
| M0-DATA-001 | P1 (gate CMS) | Trong test thuần, thêm `archived_item_from_future` vào inventory rồi gọi `R.migrate`; ID bị lọc bởi catalog hiện hành. Dry-run M0 trả BLOCKED thay vì ghi save | M2 archive/tombstone/asset retention và mapping; chưa sửa runtime M0 |
| M0-DATA-002 | P1 | `readState` trả defaults khi JSON/shape lỗi; lần mutate tiếp theo có thể ghi đè save lỗi. Hiện chưa quarantine/export | M1/M2 validation/recovery; không reset dữ liệu tự động |
| M0-SEC-001 | Chặn public online | State/time/claim ở browser và không có account/auth/RBAC/ledger server. Các API/admin/WS đều chưa tồn tại, không được xem 404 là kiểm thử 401/403 đạt | M1 nền, M2 server economy, M3/M4 auth WS |
| M0-OPS-001 | P1 | HEAD `work` unborn, source untracked. `git reset/clean` không là rollback an toàn | Snapshot/hash M0 đã làm; release Git/deploy history còn thiếu |
| M0-SPEC-001 | P2 | V4 docs/08 gọi gameplay API là “đã có từ V3”; repo thực tế chỉ static `/healthz` | Audit mapping xác nhận Missing; thực hiện trong M1/M2 |

Chưa có Admin, RBAC enforce, CMS, moderation/chat, ambient presence hoặc TikTok simulator để nghiệm thu. `config/v4-boundaries.json` chỉ là hợp đồng thiết kế có unit test; không có role hoặc feature flag server đang chạy từ file này. Chi tiết và evidence ở `IMPLEMENTATION_AUDIT.md`, `docs/milestones/M0_REPORT.md`.
