# THIẾT KẾ UI/UX — 2D CÓ CHIỀU SÂU & AVATAR THAY ĐỒ

## 1. Phong cách mỹ thuật

- **2D hoạt hình ấm áp, phối cảnh chiều sâu giả 2.5D**; màu kem/trắng đá, nâu gỗ, xanh kính màu, vàng nến. Không dùng game 3D nặng, không dùng ảnh chụp nhà thờ làm nền tĩnh toàn cảnh.
- Dựa vào `game_v3/assets/reference_church_photo.png`: nhìn từ cửa chính đến cung thánh, trần vòm cao trắng, cây thánh giá ở trung tâm, tranh màu xanh phía sau, hàng ghế gỗ hai bên, lối giữa, cửa sổ kính màu, sàn gạch.
- Dựa vào `game_v3/assets/reference_approved_ui.png`: định hướng nút, avatar và Shop đẹp, nhưng **không đặt tất cả tab/dashboards ở cạnh scene**; popover ẩn đến lúc gọi.
- Z-index world: `background < rear architecture < fixtures < sorted actors by feetY < foreground occluders < hints < HUD < modal < toast`.
- Tách 2 phần: game world render bằng SVG cache/sprite atlas/canvas engine; UI overlay DOM chuẩn HTML, hỗ trợ bàn phím/screen reader. Dùng hiệu ứng parallax ít và kiểm soát GPU memory.

## 2. Screen & HUD

**Desktop fullscreen**: world chiếm 100vw×100dvh; top-left avatar + tên; top-right ví Xu; tên scene trong góc; một hộp nhiệm vụ ngắn gọn (có thể thu gọn); dock 6 icon ở dưới. Không hiện tab content trên world. Không có Level, kim cương hoặc hệ tiền khác trừ khi chủ dự án duyệt lại.

**Mobile**: hỗ trợ viewport 360×800 trở lên, safe-area notch, keyboard; canvas có camera follow/drag; dock compact theo chiều ngang dưới đáy; click Shop/Quest/Avatar → modal bottom-sheet, không che kín nhân vật khi chọn đồ; landscape giữ HUD cố định theo chiều ngang. Thao tác chạm nền di chuyển không kích hoạt khi đã mở popup.

**Tab điều hướng (ẩn mặc định):**
- `Bản đồ`: 11 khu, hiện vị trí, thumbnail và nút Đến; không bắt người chơi cuộn qua 11 tab.
- `Hành động`: lọc `Tại đây / Tất cả / Cầu nguyện / Phục vụ / Sinh hoạt`; trong danh sách có icon, Xu, thời gian hồi và nút.
- `Nhiệm vụ`: `Đang làm / Có thể nhận / Đã hoàn thành`; mục tiêu, tiến độ, thưởng, nút theo dõi/nhận quà.
- `Nhân vật`: chọn nam/nữ, xem avatar nhiều lớp, tủ đồ; thay sau mua.
- `Shop`: tabs Áo, Quần/Váy, Giày, Tóc, Phụ kiện; preview, giá, xác nhận mua, đã sở hữu, trang bị.
- `Khác`: Túi đồ, Noel, Hòm ủng hộ, Bảng tri ân, Cài đặt, tắt chuyển động.

Modal chỉ được mở 1 cái cùng lúc; ESC đóng, focus trap, khôi phục focus nút đã mở; không cuộn body phía sau. Nút touch đạt ≥44px, có contrast, tải chậm hiển thị loading phù hợp.

## 3. Thiết kế 11 khu vực (hiện có trong src/data.js)

| scene_id | Hình ảnh, đối tượng cần vẽ | Tương tác chính | Lưu ý collision |
|---|---|---|---|
| `courtyard` | cổng, mặt tiền nhà thờ 2 tháp, đường đá, bồn hoa, ghế ngoài sân | Lucia, Giuse, quét sân, đi sang các khu | lối đi thông thoáng; không xuyên bụi cây |
| `nave` | trần vòm, tranh màu xanh, bàn thờ, ghế gỗ 2 bên, lối đi trung tâm | cha xứ, sơ, ngồi ghế, làm dấu, cầu nguyện, lau ghế, vào phòng khác | **không cho player lên cung thánh**; seat anchors riêng |
| `foyer` | cửa gỗ vòm, bình nước thánh, bảng tin | đón khách, thông báo giờ lễ hư cấu | tránh chặn cửa ra vào |
| `baptistry` | giếng Rửa Tội, tranh nước, bàn giới thiệu | học ý nghĩa Thánh Tẩy, quiz | không cử hành bí tích như giao dịch game |
| `confession` | góc Hòa Giải kín đáo, bảng thông tin | đọc giới thiệu | không hỏi/ghi lời xưng tội |
| `classroom` | bàn học, kệ sách, bảng | sơ/giáo lý viên, xếp sách, nhặt sách, quiz | sách chọn đúng vị trí |
| `garden` | 3 luống hoa, chậu tưới, lối đi | Anna, Phêrô, tưới 3 luống | 3 anchor/id duy nhất |
| `office` | phòng sinh hoạt nhà xứ, bàn quà, kệ | gặp cha, chuẩn bị quà | không ngồi lên bàn |
| `choir` | bục nhạc, ghế, sách hát | tập nhịp, ca đoàn | nút âm thanh phải có mute |
| `christmas` | hang đá, cây thông, dãy đèn và quà | trang trí 3 vị trí, sự kiện Noel | tắt sự kiện không phá scene |
| `shoproom` | gian thử đồ, gương, kệ áo | Cô Têrêsa, mở shop | cửa sổ Shop che phù hợp không khoá world |

### Nhà thờ: sơ đồ đi lại & chỗ ngồi

- Cung thánh/bàn thờ ở phía sâu; lối giữa rộng từ cửa vào, không đặt NPC/hotspot chặn giữa.
- Dãy ghế trái/phải: mỗi hàng gồm 3–6 slot logic; player bấm ghế → chọn slot trống → navigate theo lối phụ → animation ngồi. V3 hiện chỉ có `seat_a`, `seat_b` đại diện: Codex mở rộng thành **seat slots** có occupancy và TTL khi online.
- Vùng `altar` chỉ mở UI học ý nghĩa; vùng cung thánh không walkable; nếu Mass demo đang chạy, chỉ động tác phù hợp được bật.
- Đối tượng có `anchor_world`, `interaction_radius`, `hit_polygon`, `navmesh_blocker`, `occlusion_layer`, `is_enabled`.

## 4. Nhân vật nam/nữ ghép lớp

**Rig layers** theo thứ tự và anchor: `legs_back, shoes, torso, skirt_or_trousers, arms_back, shirt/top, neck, head, face, hair_back, hair_front, arms_front, accessory`. Điều chỉnh thứ tự theo pose, không hardcode toàn bộ vào 1 hình.

**Dữ liệu item**: `itemId`, `category/slot`, `displayName`, `genderCompatibility` (male/female/all), `priceCoins`, `assetId`, `palette`, `size`, `rigAnchors`, `previewAsset`, `icon`, `availability`. Giới tính là lựa chọn dáng thiết kế, không khóa bừa quần áo trừ khi asset không hỗ trợ.

**Animation pose**: `idle`, `walk_{up,down,left,right}`, `sit`, `stand`, `bow`, `genuflect`, `kneel`, `sign_cross`, `pray`, `sweep`, `wipe`, `water`, `carry`, `wave`, `sing`, `decorate`. Mỗi clip 6–12 fps sprite hoặc tween rig nhẹ tùy thiết bị, có exit pose/reset.

**Mua/mặc**: `PreviewState` riêng với `EquippedState` thực, nút `Thử` không trừ Xu, `Mua` transaction atomic, `Mặc` chỉ item đã sở hữu, `Đang mặc` không thu tiền; update đồng bộ HUD/nave/NPC preview. Không sửa luôn appearance server khi người dùng chỉ bấm thử.

## 5. Hiệu năng và kiểm thử hình ảnh

- Dùng game world **logical 1280×720** (hoặc chuẩn phối cảnh tương đương), responsive cover/contain có giới hạn không cắt hotspot quan trọng; world coords và screen coords có helper duy nhất.
- Tối ưu sprite atlas/WebP; preload scene hiện tại + scene kế tiếp, lazy-load item Shop; hạn chế SVG filters và DOM thay nguyên world mỗi 1 giây.
- Đồng hồ cooldown cập nhật **chỉ nhãn nút**; không gọi `renderScene` mỗi tick; tránh layout thrashing.
- Paused animation khi tab background; delta-time clamp khi quay lại; không set nhiều interval trùng.
- Pointer/touch hit testing phải chuyển camera transform đúng, tránh lệch sau scroll/pinch.
- Hệ số depth dùng feetY, nhưng occlusion cây/cột phải được tách foreground mask, không dựa duy nhất `zIndex = y`.
- Test độ rõ chữ/UX ở 360×800, 390×844, 768×1024, 1366×768, 1920×1080, và máy thật; screenshot diffs từ các trạng thái UI chính.

## 6. Accessibility

Hỗ trợ keyboard Tab/Enter/Escape cho UI, nhãn cho NPC/hotspots, `aria-live` khi cộng Xu, reduced motion, không chỉ dùng màu để thông báo cooldown hoặc quest. Tránh nhấp nháy mạnh, hiệu ứng quá sáng và âm thanh tự phát. Cho phép người chơi không thực hiện pose quỳ vì lý do vận động nhưng vẫn hoàn thành tuyến học hỏi.
