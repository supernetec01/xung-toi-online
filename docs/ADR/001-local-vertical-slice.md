# ADR 001 — Giữ SVG V3, làm vòng chơi local trước

Giữ source hiện có và catalog ID ổn định. Không thêm engine khi chưa đo hiệu năng. Mỗi quest dùng rewardCoins, item dùng price Xu; giá kindnessPrice cũ chuyển thành 2× giá theo hành vi V3, không thay ID/quyền sở hữu.

Dùng Node static server cố định cổng 5001. Các HTML snapshot offline không phục vụ trên web để tránh chạy nhầm bản có nút duyệt donor demo.

Web Locks serialize mutation ví trong cùng origin, execution lưu trước animation và complete đọc lại storage trong lock. Đây là giải pháp demo có thể kiểm thử, không ngăn người chơi sửa clock/storage. Backend và PostgreSQL là milestone riêng trước public launch.
