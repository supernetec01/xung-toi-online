# 11 — ROADMAP CODEX & DEFINITION OF DONE

## M0 — Audit repo hiện hành (bắt buộc)

- [ ] Xác nhận branch/commit, tech stack, seed, migrations, API, tests, kiến trúc deploy.
- [ ] Chạy dev/test/build, tạo `IMPLEMENTATION_AUDIT.md`: Existing/Partial/Missing/Bug đối chiếu V4.
- [ ] Backup DB hiện hành + snapshot nếu có; không ghi đè V3 bản cũ.
- [ ] Chốt RBAC và định nghĩa user real/NPC/guest.

**DoD:** bản game cũ không lỗi sau audit, CI snapshot pass; kế hoạch migration an toàn có thể review.

## M1 — Admin nền tảng

- [ ] Route `/admin`, auth RBAC, dashboard scope ADMIN, audit, user list pagination.
- [ ] SUPER_ADMIN cấp role an toàn, anti-self-escalation.
- [ ] Admin case: search user, xem ví read-only, mute/suspend user với reason/expiry.

**DoD:** kiểm thử 401/403, audit, screenshot desktop/mobile.

## M2 — CMS Shop + Tủ đồ + NPC/quest

- [ ] Draft item upload thumbnail/atlas, validate rig nam/nữ, preview outfit, publish, archive/rollback.
- [ ] Config NPC/quest/action và thời gian hồi với validation, publish version.
- [ ] Đang mua/item thay đổi từ admin -> server transaction, catalogVersion.

**DoD:** tạo áo mới Admin -> Shop public -> user mua/mặc -> archive vẫn sở hữu; test 2 tab.

## M3 — Chat + moderation

- [ ] Chat global/zone realtime, DB history/seq, reconnect, rate limit, XSS proof.
- [ ] Lọc ngôn ngữ/abuse, report, mute/ban chat, appeal, Admin review.
- [ ] Mobile chat sheet, keyboard avoidance, reporting UI.

**DoD:** user chat bình thường; vi phạm bị chặn/mute; không chặn di chuyển; moderation audit.

## M4 — Presence + NPC cư dân tự điều tiết

- [ ] Unified actor types FIXED_NPC/AMBIENT_NPC/PLAYER/LIVE_GUEST; heartbeat online 1 user=1 active actor.
- [ ] NPC nền schedules/pathfinding/smooth removal; không remove quest NPC.
- [ ] Internal ADMIN metrics; không hiển thị/leak public counts.

**DoD:** 0→20 real players trơn tru, NPC tự giảm, no double seats, 403 khi public đọc stats.

## M5 — LIVE Simulator trước TikTok thật

- [ ] LiveStudio admin, MockLiveProvider, queue, duplicate filter, keyword selection, one-action guest.
- [ ] Live snapshot/cleanup, camera 9:16, displayName filter.
- [ ] Chỉ khi được phép, thêm adapter provider thật với health/reconnect.

**DoD:** mock 100–500 comments trong test tải, không double guest, không farm Xu, cảnh game không lag.

## M6 — Retention + Noel + Release

- [ ] Seasonal campaign, Xu virtual shared décor, album bưu thiếp, daily quests nhẹ.
- [ ] QA mobile 5 viewports, load/perf/security, ops dashboard, backup/rollback.
- [ ] User privacy page và moderator rules; chỉ bật QR thật nếu quy trình hợp lệ hoàn tất.

**DoD:** đủ acceptance critical, deployment staging được review, production rollout có rollback.

## Definition of Done cho mọi ticket

1. Có code, test mới, screenshot/video nếu UI, log manual test và không có regression critical.
2. Không đổi stable IDs/migrations trái kế hoạch; không hardcode secrets.
3. Có trạng thái Done/Partial/Blocked và ghi rõ lý do, file changed, test commands + results.
4. Không lén thay behavior game liên quan tiền ảo/tiền thật trong PR giao diện.
