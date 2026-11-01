# NO-GO — phát hành đầy đủ / thanh toán thật

Ngày 01/11/2026, baseline `be6f694`, nhánh QC `qa/bugfix-20261101`.

**122 testcase: 97 PASS, 0 FAIL còn tái hiện trong phạm vi đã chạy, 12 BLOCKED, 13 NOT_RUN.** Các P0/P1 đã xác nhận ở luồng đã kiểm thử được sửa và hồi quy đạt. Số FAIL bằng 0 không có nghĩa toàn bộ game đã nghiệm thu.

Chặn nghiệm thu đầy đủ:

- Vé Noel/checkout/provider sandbox/webhook/refund/entitlement chưa triển khai; 9 ticket case và paid gate bị chặn. Route thử trả 404, chưa bật tiền thật.
- Chưa có staging HTTPS để kiểm cookie Secure/rotation thật; LIVE mới MOCK, chưa có reconnect provider thật.
- Chưa kiểm đầy đủ 13 trường hợp còn lại và thiết bị di động yếu/cross-browser. Danh sách trong [audit](QA_AUDIT_20261101.md) và [matrix](TEST_MATRIX.csv).
- QC-009 còn mở: artwork/scale giữa các phòng chưa đạt nghiệm thu theo hình đã duyệt. Bản QC không tự miễn trừ yêu cầu thẩm mỹ này.

Bản vá có thể chạy để tiếp tục kiểm tra demo nội bộ tại port 5001. Không chuyển kết quả này thành phê duyệt phát hành production, bật cổng trả phí hay kết nối thanh toán thật. Mở lại release review sau khi có môi trường/provider phù hợp, chạy các case còn thiếu và chủ dự án review phần hình ảnh.

Rollback không cần đảo migration. Giữ dữ liệu/khóa mã hóa, ưu tiên revert phạm vi UI hoặc movement có kiểm thử; giữ các vá MFA/import. Xem hướng dẫn cập nhật và rollback cụ thể trong [audit](QA_AUDIT_20261101.md).
