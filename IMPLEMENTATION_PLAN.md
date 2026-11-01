# V4 — tiến độ M0–M6

Bản hiện tại là demo online trên game hiện hành, cổng **5001**, PostgreSQL bền trong workspace. Không thay engine hoặc reset người chơi. Trạng thái chi tiết và evidence trong `tasks.json`, báo cáo ở `docs/milestones/`.

| Giai đoạn | Kết quả hiện tại | Rollback |
|---|---|---|
| M0 | Audit/freeze, snapshot, stable IDs, phát hiện nguy cơ mất item/save | Giữ nguyên baseline trong `references/m0-runtime` và báo cáo gốc |
| M1 | Auth/sessions/MFA/RBAC/Admin, user search, sanctions/revoke/audit, metrics private | Tắt FEATURE_ADMIN, source tương thích, giữ DB |
| M2 | Transaction server; CMS/atlas/rig/Shop; NPC/quest/action/event; pin accepted quest/active action | Publication rollback tạo version mới, giữ archive/ownership/ledger |
| M3 | Auth WS, history/cursor, bộ lọc/rate-limit, reports/appeals, mute riêng, thông báo | Tắt gửi chat; giữ moderation/audit/history |
| M4 | Presence unique/multi-tab/ghế lease, NPC tự giảm/schedule/config version | Tắt FEATURE_AMBIENT_NPC hoặc rollback config; giữ fixed NPC |
| M5 | Mock LIVE, queue/dedup/cooldown, một động tác, Studio/camera/kill switch | Dừng và dọn guest/queue; giữ receipts/progress; provider thật chưa bật |
| M6 | Noel cộng đồng/album/daily, recovery, viewport/perf/security, backup/restore, production flags | Đóng lịch event, giữ dữ liệu; còn gate thiết bị và staging |

M1–M4 và phần mock M5 có luồng chạy/kiểm thử. M6 có code demo, còn V4-019/020 Partial: chưa nghiệm thu thiết bị thật/soak 30 phút hoặc staging/canary. V4-017 Blocked do chưa có nguồn TikTok được cấp quyền. Xem `KNOWN_ISSUES.md`; không gọi các gate này đã hoàn tất.

Mỗi lần bổ sung: backup DB + snapshot source → migration additive mới → test trên DB demo/test riêng → ảnh và báo cáo → startup/restore kiểm chứng → cập nhật task/evidence. Không rollback ledger bằng dump cũ, không xóa ID đã mua hoặc đổi khóa MFA. Các quyết định trước V4/M0 được giữ tại `docs/milestones/PRE_V4_IMPLEMENTATION_PLAN.md` và `references/m0-reports`.
