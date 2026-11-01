# M6 — Noel, daily, QA và lưu dữ liệu

**Ngày:** 01/11/2026. **Phạm vi:** demo local/online cổng 5001; không là chứng nhận production.

## Code và hành vi

Dự án Xu ảo chung đạt mốc 25/50/75/100, trang trí/album, daily 3 việc phục vụ +10 Xu một lần/ngày Asia/Ho_Chi_Minh. CMS lịch đóng/mở thực sự chặn góp/claim mới, giữ album. Đã có backup/restore drill, restart fingerprints, auth fuzz, load 500 mock comments, viewport/rig/recovery và flags production.

Files: `server/game.cjs`, `server/main.cjs`, `server/features.cjs`, `scripts/backup-db.cjs`, `scripts/restore-drill.cjs`, `scripts/persistence-check.cjs`, `tests`, `public/shared/privacy.html`, `.github/workflows/verify.yml`.

## Kiểm chứng

Logs: [update-tests.txt](../../artifacts/online/update-tests.txt), [realtime-tests.txt](../../artifacts/online/realtime-tests.txt), [performance-tests.txt](../../artifacts/online/performance-tests.txt), [recovery-tests.txt](../../artifacts/online/recovery-tests.txt), [regression-tests.txt](../../artifacts/online/regression-tests.txt), [persistence-log.txt](../../artifacts/online/persistence-log.txt), [restore-log.txt](../../artifacts/online/restore-log.txt).

Ảnh: [player-quests.png](../../artifacts/online/player-quests.png), [avatar-pose-matrix.png](../../artifacts/online/avatar-pose-matrix.png), [recovery-protected.png](../../artifacts/online/recovery-protected.png), [shop-390x844.png](../../artifacts/online/shop-390x844.png), [chat-390x844.png](../../artifacts/online/chat-390x844.png).

## Còn lại

V4-019/020 Partial: chưa soak 30 phút, thiết bị thật, staging/canary, remote CI, alerting hoặc backup ngoài máy. Tiền thật/QR không bật.

## Rollback

Đóng event hoặc rollback catalog/flags; giữ ledger/daily/album/contributions. Backup restore vào DB mới để đối chiếu trước chuyển connection; không đè DB chính có giao dịch mới. Chi tiết tại [MIGRATION_PLAN.md](../../MIGRATION_PLAN.md).
