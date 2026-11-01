# Chạy lại QC trên database riêng

Các suite tạo người chơi, thay catalog, cấp Xu và cấu hình thế giới để test. Chỉ dùng database trống QC; không chạy chúng trên database đang có dữ liệu thật. Runner dưới đây dành cho môi trường Node 24/PostgreSQL local của repo; `.local/database.json` phải được tạo bởi `npm run db:start`. Chromium cloud đang ở `/usr/bin/chromium`; máy khác đặt `CHROMIUM_PATH` trỏ browser đã cài.

1. Dừng server hiện tại ở port 5001. Giữ nguyên `.local/` và PostgreSQL chính.
2. Chạy `node qa/tools/env.cjs init` **một lần** để tạo database trống riêng. Lần sau dùng profile cũ; script từ chối thay thế profile đã tồn tại.
3. Chạy `node qa/tools/env.cjs run node scripts/migrate.cjs`.
4. Terminal thứ nhất: `node qa/tools/env.cjs run node server/main.cjs`.
5. Terminal thứ hai chạy các suite bên dưới. Handshake `/healthz` phải khớp instance QC; nhầm server thường thì test bị từ chối.

```bash
node qa/tools/env.cjs run npm test
node qa/tools/env.cjs run npm run test:online
node qa/tools/env.cjs run npm run test:v8
node qa/tools/env.cjs run npm run test:v9
node qa/tools/env.cjs run node qa/tests/account.cjs
node qa/tools/env.cjs run node qa/tests/account-flows.cjs
node qa/tools/env.cjs run node qa/tests/security-extra.cjs
node qa/tools/env.cjs run node qa/tests/mfa-player.cjs
node qa/tools/env.cjs run node qa/tests/input.cjs
node qa/tools/env.cjs run node qa/tests/online-movement.cjs
node qa/tools/env.cjs run node qa/tests/seat-recovery.cjs
node qa/tools/env.cjs run node qa/tests/scenes.cjs
node qa/tools/env.cjs run node qa/tests/fps.cjs
node qa/tools/env.cjs run node qa/tests/touch.cjs
node qa/tools/env.cjs run node qa/tests/soak.cjs
npm run verify
npm run format:check
```

PowerShell dùng `npm.cmd` thay `npm` ở cả lệnh trực tiếp và đối số sau `run` nếu execution policy chặn npm.ps1. `soak.cjs` mất hơn 10 phút và cố ý thay cấu hình NPC trong DB QC. Chạy browser suite tuần tự để tránh nhiễu phép đo. Các test cũ có thể ghi lại `artifacts/`; QC test ghi `qa/evidence/`. Tài khoản test phát sinh được giữ trong DB QC để điều tra; không dùng làm tài khoản Admin thật.

`--baseline` là chế độ thu thập evidence trên source tương ứng, không tự nạp toàn bộ code server cũ. Muốn so sánh trước/sau, checkout baseline `be6f694` trong worktree riêng, gắn **database QC khác**, mang test runner sang rồi chạy; không rollback source đang phục vụ dữ liệu người chơi. Riêng `before-errors.cjs` lấy ba view cũ bằng `git show` và chỉ fulfill trong browser context, không thay server/source.

`python3 qa/tools/coverage.py` dựng lại CSV từ 122 case gốc và mapping thực thi đã review; script này không chạy test. Chỉ cập nhật mapping khi có evidence mới. Logs được lưu đuôi `.txt` trong `evidence/runs/` vì repo bỏ qua `*.log`.

Sau QC, dừng server test rồi `npm.cmd start`/`npm start` để chạy lại DB chính theo cấu hình thường. Không copy database QC đè lên database chính. Giữ profile/secret `.local/` riêng, không commit hoặc chia sẻ.
