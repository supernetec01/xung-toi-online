# 09 — UI/UX V4: GAME FULL SCREEN, CHAT, ADMIN, NPC, LIVE

## Website Game full screen

Màn hình bình thường không hiện tất cả menu. Scene 2D chiếm 85–95% diện tích; góc trái trên avatar + Xu, góc phải dock icon gọn `Bản đồ / Nhiệm vụ / Nhân vật / Shop / Chat / Khác`; dưới một nút `Tương tác` theo hotspot. Khi bấm icon chỉ mở **một** dialog (mobile bottom sheet, desktop panel có backdrop), không render panels hàng loạt. Tuyệt đối không show dashboard counts trên client.

### Desktop 16:9 — sketch

```text
+--------------------------------------------------------------------------+
| [Avatar - Tên]   [🪙 1.250]      (SCENE 2D CÓ CHIỀU SÂU)  [Map Quest Shop] |
|                                                                          |
|                    Cột vòm / tranh kính / bàn thờ                       |
|                       NPC     [điểm tương tác]                           |
|                    Ghế và lối đi / avatar player                         |
|                                                                          |
| [Nhiệm vụ gợi ý + thu gọn]                        [Chat ●] [🙌 tương tác] |
+--------------------------------------------------------------------------+
     Chọn Shop => modal giữa, click ngoài/ESC đóng, scene dim nhưng không hitbox.
```

### Mobile portrait 9:16 — sketch

```text
+-----------------------------+
| Avatar 🪙       [☰] [Chat]   |
|                             |
|       Cảnh 2D cắt camera    |
|          avatar player      |
|                             |
|    [Quest gợi ý thu gọn]    |
|                   [Tương tác]|
| [D-pad/joystick ẩn tùy chọn] |
+-----------------------------+
  Shop -> bottom sheet có scroll riêng và nút X nằm trên safe-area.
```

Canvas không được render toàn bộ 11 khu cùng lúc, dùng scene transition và texture unload, culling theo camera. Layer: background → kiến trúc xa → props xa → actors theo Y → props gần → effects có giới hạn → HUD DOM. Cho giảm hiệu ứng ở máy yếu, tuân thủ prefers-reduced-motion; target 30fps mobile tầm trung có benchmark.

## Panel Chat

- Desktop: panel rộng ~320px đóng mặc định, tabs `Khu vực/Toàn giáo xứ/Thông báo`, message list scroll (virtualize >100 dòng), thanh nhập, tooltip rule, nút báo cáo trên mỗi tin.
- Mobile: bottom-sheet cao <65vh, input bám safe area và bàn phím, game không nhận chạm khi overlay mở; đóng chat phải khôi phục camera/joystick.
- Khi user bị mute: thay input bằng `Bạn không thể chat đến HH:mm DD/MM. Lý do...` và `Khiếu nại`; không tự cấm đi lại, Shop hoặc làm nhiệm vụ.
- Tên người chơi có màu trung tính; không tạo icon “admin” cho account không có role thật. Chat public chỉ chứa tin của user thật và system notices xác thực.

## Card NPC resident

Ambient NPC có tên ngắn, khi chạm: `Cư dân giáo xứ` + câu nói/script + `Chào / Đóng`; không có profile account, friend request hay quyền xem inventory. FIXED_NPC card: name, vai trò, quest marker, `Trò chuyện`, `Nhận nhiệm vụ`, `Đóng`. LIVE_GUEST label tên TikTok đã lọc, icon khách LIVE và animation; không cần card chat.

## Trang Admin

```
+-------------------------------------------------------------------------------------+
| ADMIN / STAGING              Search ...             Role: ADMIN  Avatar  Logout       |
+-------------------+-----------------------------------------------------------------+
| Tổng quan         |  Real Players: 3 | NPC nền: 13 | NPC cố định: 11 | Guest: 4     |
| Người chơi        |  Recent actions / chat reports / failed operations              |
| Chat & Vi phạm    |  Table filter: search / status / scene / datetime               |
| Shop & Tủ đồ      |  Rows ........   [Xem] [Sửa nháp] [Preview] [Publish]          |
| NPC & Khu vực     |  Drawer: item fields + asset pose preview (male/female)         |
| Nhiệm vụ          |                                                                 |
| Sự kiện Noel      |  [VALIDATE] [SAVE DRAFT] [PUBLISH] [ROLLBACK]                   |
| TikTok LIVE       |                                                                 |
| Nhật ký           |                                                                 |
+-------------------+-----------------------------------------------------------------+
```

Public game không được thấy menu này dù query permission sai; server trả 403 và frontend điều hướng. Có bảng chức năng riêng cho Chat Reports, LIVE Studio và Upload Assets.

## Cảnh trang phục

`Shop` modal có trái danh mục, giữa lưới item, phải avatar preview nếu desktop; mobile xếp avatar preview trên hoặc panel chuyển tab `Thử đồ`. Avatar chỉ đổi lớp phù hợp, gắn anchor chính xác theo pose; item hết bán có label `Đã ngừng bán` chứ không xóa khỏi tủ đã mua.

## UX trạng thái và lỗi

Loading skeleton/no jank; offline indicator; network reconnect banner; scene click disabled khi modal; button cooldown `⏳ 01:45` update không gây re-render toàn scene; hệ thống có snackbar Xu nhận và balance snapshot, nhưng không spam màn hình. Touch target >=44px, hỗ trợ keyboard, aria labels; không cần animation phức tạp cho overlay.
