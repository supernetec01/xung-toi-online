# V4 — kế hoạch M0–M6

Thực hiện từng phase trên source hiện hành; không rewrite renderer hoặc reset save. Trạng thái ticket có trong `tasks.json`, bằng chứng riêng từng phase trong `docs/milestones/`. Phạm vi lượt này là **M0**, chưa mở Admin/chat/online/LIVE.

| Phase | Ticket | Code/đầu ra có thể kiểm chứng | Điều kiện chuyển phase | Rollback |
|---|---|---|---|---|
| M0 | V4-001/002 | Audit, stable ID + runtime hashes, 7 test M0, ảnh baseline, dry-run save, snapshot/restore, RBAC/actor design | Game hiện hành pass; migration plan và lỗi có evidence | Snapshot ngoài checkout, giữ save/origin/5001 |
| M1 | V4-003/004/005 | Modular Node API + PostgreSQL nền, sessions/MFA/RBAC, Admin layout, user search/read-only ledger, sanctions/revoke/audit | 401/403, chống grant role giả, last-SuperAdmin, moderator không metrics, desktop/mobile | Feature OFF, additive schema tương thích, không xóa giao dịch |
| M2 | V4-006/007/008 | Server economy/action/quest/inventory, CMS item/NPC/quest/action draft/validate/publish/rollback, upload an toàn, version pin | Hai tab một debit; archive giữ đồ/asset; migration unknown IDs an toàn; đủ pose | Catalog publication pointer; ledger/ownership giữ nguyên |
| M3 | V4-009/010/011 | Auth WS global/scene, moderation/rate-limit/report/mute/appeal và panel mobile | XSS/reconnect/ban-WS/revocation; CHAT ban không khóa gameplay | Tắt chat/new writes, giữ audit/message theo retention |
| M4 | V4-012/013/014 | Presence TTL/primary lease/seat lease, ambient NPC schedules và density/culling | Một user nhiều tab một avatar; 0→20 real không mất fixed NPC; không public aggregates | Dừng population coordinator, giải phóng lease đúng, giữ quest NPC |
| M5 | V4-015/016/017 | Mock provider, Admin Studio, queue/keyword/dedup/one-action guest, kill switch, 9:16 | 100–500 mock events không double guest/Xu, source unavailable không sập core | Kill switch, cleanup queue/guest; provider thật OFF |
| M6 | V4-018/019/020 | Shared Noel/daily/album, load/security/mobile, privacy/monitoring/backup/canary | Critical gates pass, restore thử và staging được review | Version/flag rollback, không destructive down migration |

## Quyết định phụ thuộc

- M1 bắt đầu bằng auth/schema users/roles/audit, rồi schema wallet/ledger nền để Admin đọc user đúng; không dựng dashboard có số giả, không đọc localStorage để cấp quyền.
- M2 phải hoàn thiện transaction server trước khi CMS đổi giá/thưởng của giao dịch đang chạy. Quota hành động/ngày sẽ cấu hình trên server, chưa tự thay rule local 14 action ở M0.
- M3/M4 dùng identity/session revocation M1; không mở public WS hoặc gắn nickname local thành account thật.
- M5 làm mock trước. V4-017 chỉ được triển khai adapter thật sau khi xác minh quyền nguồn sự kiện; không cần TikTok credentials trong M0.
- Có thể giữ static server/demo riêng trong transition; khi server-authoritative bật phải phân biệt rõ mode và giữ save cũ. Không import coin từ browser một cách mù quáng.

## Cách làm mỗi phase

1. Snapshot + regression trước thay đổi; giữ baseline M0 lịch sử. Khi runtime cần đổi có chủ đích ở M1/M2, tạo approved milestone fingerprint/gate mới và test tương thích dữ liệu; không ghi đè fingerprint M0 để làm test xanh.
2. Triển khai module nhỏ, validate lỗi và đường đi âm, không lấy demo/mock làm bằng chứng production.
3. Chạy test thực, lưu ảnh/UI + log + giới hạn + Changed Files + rollback. Chỉ Done khi đủ tiêu chí ticket.
4. Preserve IDs/ownership, QR OFF, không đẩy metrics ra public, không tự publish/deploy.

Kế hoạch trước V4 lưu tại `docs/milestones/PRE_V4_IMPLEMENTATION_PLAN.md`; đó là lịch sử phần gameplay local đã hoàn thiện, không phải trạng thái Admin V4.
