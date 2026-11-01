# Tiếp tục cập nhật V4 demo

Workspace `/workspace/xung-toi-online`, Node 24, cổng **5001**. Đọc `README.md`, `tasks.json`, `docs/milestones/V4_DEMO_REPORT.md`, `KNOWN_ISSUES.md`. Dùng checkout hiện tại, không giải nén ZIP V3 lên source hoặc tạo worktree khi không được yêu cầu.

## Giữ nguyên

- Dữ liệu PostgreSQL local: `.local/pgdata`; kết nối ở `.local/database.json`; operator và MFA riêng ở `.local/operator.json`, `.local/encryption.key`.
- Uploads và backup ở `.local/uploads`, `.local/backups`. Không in credentials ra tool/log, không commit `.local/` hoặc copy vào web assets.
- Stable IDs, key save V3/V2, inventory unknown ID, item archived, wallet/ledger, claimed quests và active executions. Schema mở rộng; không chỉnh file migration 001–005 đã áp dụng.
- Dữ liệu hiện tại được chủ dự án xác nhận demo. Importer vẫn development-only, một lần/account; production luôn chặn.

## Khởi động lại

```sh
npm run db:start
npm run db:migrate
npm run admin:bootstrap
npm start
```

Các lệnh idempotent; CLI không đặt lại password/role. Docker helper dùng daemon local, không dùng DOCKER_HOST remote. Kiểm tra `/healthz` thật sự trả online-demo, đăng nhập/đọc state trước khi nói đã sẵn sàng. Có thể chạy static `npm run start:demo` khi cố ý kiểm thử riêng local, nhưng không chạy hai server cùng cổng.

## Trạng thái

Các chức năng demo M1–M6 đã có code/test/ảnh; task board giữ Done/Partial/Blocked theo evidence. V4-017 chờ provider TikTok được cấp quyền. V4-019 còn thiết bị/soak dài, V4-020 còn staging/canary/backup ngoài máy. Không coi GitHub Actions đã chạy chỉ vì có workflow.

Backend: `server/*.cjs`; migrations thật `db/migrations/`; frontend cũ được nối qua `game_v3/src/online.js`, rig/atlas `art.js` + `wardrobe.js`; Admin và account tại `public/`. `config/rbac.json` thực sự enforce; `config/v4-boundaries.json` là quyết định M0 lịch sử. Chỉ Admin đọc stats. Đừng đưa các bộ đếm vào public JSON, DOM, JS hoặc WS.

Chạy `npm test`, `npm run test:online`, `format:check`, `audit:m0` trước cập nhật; bộ online tạo QA records trong DB nên dùng DB test riêng khi có dữ liệu thật. Xem `MIGRATION_PLAN.md` để backup/restore/rollback. Server/presence/rate-limit/LIVE coordinator hiện chỉ một process; không tự nhân replica.
