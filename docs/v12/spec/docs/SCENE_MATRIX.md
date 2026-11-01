# SCENE REDESIGN — yêu cầu chi tiết theo từng khu vực

**Định hướng chung:** 2.5D nhẹ, chibi, góc camera nhìn từ cửa vào phía trong, nền và vật thể có chiều sâu với perspective/occlusion thật. Dùng ảnh `references/approved` làm chuẩn ánh sáng, bố cục và bầu không khí. Chỉ dùng ảnh đó làm nền nếu đã tách đồ vật/người/UI ra để tạo thực thể độc lập; không double-render ghế/NPC.

| Scene ID | Không gian cần dựng | Vùng va chạm / đi lại | Tương tác & nhiệm vụ đơn giản | NPC & UI |
|---|---|---|---|---|
| `parish_yard` | Quảng trường sân nhà thờ có lối đá, cây, hoa, đèn | Nhà thờ, bậc thềm/lan can, cây, bồn hoa cản; chỉ vào bằng cổng/portal | Chào khách, xem bảng tin, quét sân, mở cổng vào nhà thờ | Lucia, ông Giuse; nút tương tác chỉ hiện khi gần |
| `church_main` | Trục giữa nhìn cung thánh; kính màu, hàng ghế hai bên rõ | Đường giữa + lối dọc hai bên, ghế/col/altar blocked | Chọn ghế trống → đi đến access point → sit_back; chắp tay/cầu nguyện, xem giới thiệu | Cha xứ/sơ; tooltip ghế, icon yên tĩnh |
| `front_hall` | Sảnh đón tiếp, cửa gỗ lớn, bảng lịch lễ, ghế chờ | Chặn bàn, cột, cửa đóng | Đọc lịch lễ, nhận hướng dẫn, chuyển vào gian chính | Người đón tiếp; modal lịch, bản đồ |
| `catechism_class` | Bảng xanh, bàn ghế 2 dãy, kệ sách, cửa sổ, ánh sáng | Colliders cho bàn/ghế; lối tới cô/sơ, kệ, quiz | Đọc sách, sắp sách, quiz 3 câu, xem lại kiến thức, nhận quà hoàn thành | Sơ Maria, Bé An; tab kiến thức + quiz |
| `choir_room` | Bàn organ, giá nhạc, sân tập nhỏ, ghế ca đoàn | Chặn giá, đàn, ghế; lối tới bảng và NPC | Chọn nhịp, sắp bản nhạc, tập hát dạng mini-game không phát nhạc có bản quyền | Anh Gioan; popup tập hát |
| `community_garden` | Bồn hoa nhiều lớp, đường đá, cây bụi, vòi nước | Bồn hoa/cây/gốc/đá không đi đè; lối giữa luống đủ rộng | Tưới 3 luống, nhặt lá, trồng hoa, đổi trạng thái cây | Bà Anna, Bác Phêrô; progress cây |
| `rectory` | Nhà xứ thật: quầy tiếp khách, kệ sách, bàn làm việc, quà | Chặn quầy, bàn/ghế, chỉ đi trên sàn | Gặp cha xứ, nhận nhiệm vụ cộng đồng, đóng gói quà | Cha/Chị Hương; modal nhiệm vụ |
| `wardrobe_room` | Phòng thử trang phục với gương, giá áo, tủ kính | Chặn kệ, gương, bục; có điểm đứng thử | Thử outfit không mất Xu, mua qua Shop đã có, lưu outfit | Cô Têrêsa; panel Studio/V10 |
| `christmas_square` | Cây thông trung tâm, hang đá, quầy lễ hội, đèn | Quầy/gốc thông/sân khấu cản; có chỗ đứng tương tác | Trang trí 3 vị trí, sưu tập tem, sự kiện cộng đồng | Lucia + tình nguyện viên; progress event |
| `baptism_area` | Giếng Rửa Tội, tranh/cửa kính, bảng giải thích, nến | Giếng + bậc + bệ là collider; chỉ đi quanh giếng | Tìm hiểu ý nghĩa, đọc bảng, trao đổi với chị Hạnh | Chị Hạnh; mini bài học, không giả lập bí tích thật |
| `reconciliation_corner` | Góc yên tĩnh, tòa giải tội, đèn ấm, ghế chờ | Tòa giải tội/ghế/cột cản; giữ hành lang thông suốt | Đọc giải thích, hướng dẫn xét mình, không thu thập chuyện xưng tội riêng tư | NPC hướng dẫn; modal thông tin kín đáo |

## Quy tắc tương tác toàn map
- Chạm object/NPC → nếu ngoài tầm: tìm đường đến access point hợp lệ → đứng đúng vị trí → mở modal; nếu không có đường: phản hồi lịch sự, không teleport.
- Button mở mini-game có trạng thái `available / running / cooldown / claimed`. Time cooldown từ server; overlay trong nút đếm `mm:ss`.
- Chỉ có một modal chính tại một thời điểm. `ESC`/Back đóng; mất focus vẫn không mất trạng thái nhiệm vụ.
- NPC nền có thể thay đổi theo mật độ người thật nhưng NPC chức năng không được biến mất. Public UI không hiển thị số player/NPC; thống kê nằm ở Admin.
- Scene portal vào/ra phải đặt điểm spawn rõ và an toàn, không spawn trong collider; giữ nguyên avatar outfit, XP nếu còn, Xu, quest, session.
