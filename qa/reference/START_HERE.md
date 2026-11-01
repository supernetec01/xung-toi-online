# GIÁO XỨ AN HÒA — BỘ NHIỆM VỤ QC & BUG FIX CHO CODEX

**Mục đích:** giao một vòng kiểm thử hồi quy và sửa lỗi có bằng chứng trên **repository V4–V9 đang hoạt động**, không tạo game mới.

## Thứ tự bắt đầu
1. Mở `reference/auth_account_current.png`, đọc `docs/01_SCREENSHOT_FIRST_PASS.md`.
2. Đọc `docs/02_CODEX_QC_MASTER_PROMPT.md` và `docs/03_QA_TEST_STRATEGY.md`.
3. Chạy source trong môi trường staging/local có DB thử nghiệm. **Không sửa dữ liệu production hoặc dùng tiền thật.**
4. Lập `QA_REPORT.md` trong repository hiện tại: commit, stack, env, những lệnh chạy được/không chạy được, màn hình/phần còn chưa có quyền truy cập.
5. Lấy `TEST_MATRIX.csv` làm bộ testcase, đánh dấu PASS/FAIL/BLOCKED/NOT_RUN, và tạo issue với `templates/BUG_REPORT_TEMPLATE.md`.
6. Sửa theo P0 → P1 → P2 → P3, chạy regression, cung cấp ảnh/video before/after, báo cáo kết quả từng chặng.
7. Chỉ ghi PASS khi thực sự chạy testcase; `skip` hoặc `test.fixme` KHÔNG được tính PASS.

## Tệp chính
- `docs/02_CODEX_QC_MASTER_PROMPT.md`: copy gửi thẳng Codex.
- `TEST_MATRIX.csv`: test cases chi tiết có ID, module, severity, steps, expected, test type.
- `BUG_REGISTER_SEED.csv`: các nghi vấn từ ảnh và lịch sử lỗi; trạng thái `NEEDS_REPRO`, chưa kết luận backend.
- `docs/04_ACCEPTANCE_AND_RELEASE_GATES.md`: tiêu chuẩn đóng issue và phát hành.
- `docs/05_DB_API_SECURITY_CHECKS.md`: invariant backend và tiền/điểm.
- `docs/06_UX_REVIEW.md`: các thiết kế khó dùng cần cải thiện.
- `docs/07_AUTOMATION_GUIDE.md`: cách chạy mẫu Playwright.
- `tests/smoke.spec.ts`, `playwright.config.ts`: bộ khung smoke test **chỉ dùng sau khi cấu hình app**.
- `templates/BUG_REPORT_TEMPLATE.md` và `templates/QA_EXECUTION_REPORT.md`: mẫu bắt buộc.

## Ràng buộc
- Không thay source V4/V5/V6/V7/V8/V9 bằng bản demo cũ; chỉ tái sử dụng có chọn lọc.
- Không tự nhận "đã sửa" nếu chưa chạy trên source game thật.
- Không chỉnh sơ đồ DB trực tiếp nếu chưa backup/migration và kiểm tra tương thích.
- Không kích hoạt thanh toán thật/LIVE thật trong quá trình QC; dùng sandbox/mock.
- Giữ nguyên avatar, inventory, quest, cooldown, quyền vé, chat, NPC và dữ liệu người chơi.

**Ảnh đính kèm** là màn hình tài khoản đang đăng nhập với Antony, dùng làm bằng chứng review UI/UX, không phải bằng chứng tồn tại lỗ hổng bảo mật.
