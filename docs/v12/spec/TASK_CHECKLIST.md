# Task Board cho Codex (thực thi theo thứ tự phụ thuộc)

> Không đánh dấu [x] nếu chưa code và kiểm thử.

- [ ] **T00** Audit repo & chạy baseline · P0
  - Phụ thuộc: không
  - Công việc: Inventory stack + data/API + current scene files; build/test baseline
  - Nghiệm thu: Có bảng file thật, lỗi hiện tại, commit baseline, screenshot và test logs

- [ ] **T01** Chuẩn hóa art pipeline & scene contracts · P0
  - Phụ thuộc: T00
  - Công việc: Scene manifest, art/ground/occlusion/collision/interactions/spawn/portals; asset loader
  - Nghiệm thu: Có schema validated; một scene demo tách lớp, debug overlays

- [ ] **T02** Navigation & collision robust · P0
  - Phụ thuộc: T01
  - Công việc: Feet colliders, swept movement, A*, click replacement, desktop + mobile input
  - Nghiệm thu: Không đi xuyên object; 10 click liên tiếp không kẹt; test corners

- [ ] **T03** Chung Avatar/V10 tích hợp nguồn V4 · P0
  - Phụ thuộc: T00
  - Công việc: Avatar rig 4 hướng/poses, equip item, camera scale, UI studio
  - Nghiệm thu: Male/female, outfit, reload, scene transition, không xoay đầu 360

- [ ] **T04** Ghế ngồi + animation + depth · P0
  - Phụ thuộc: T02, T03
  - Công việc: SeatId, approach point, occupancy, sit_back, occlusion
  - Nghiệm thu: Ghế không chồng, không ngồi sai hướng, không double occupied

- [ ] **MAP-01** Dựng lại Sân giáo xứ · P0
  - Phụ thuộc: T01, T02, T03
  - Công việc: Art: Đường đá, nhà thờ kiến trúc Gothic, vườn hoa, bảng tin, NPC. Tương tác: Cổng nhà thờ; quét sân; đón khách; đi đến nhà xứ/lớp giáo lý. Collider, spawn, NPC, UI, zone & camera.
  - Nghiệm thu: Screenshot bám ref, interaction hoạt động, nav/test/desktop-mobile pass.

- [ ] **MAP-02** Dựng lại Gian chính nhà thờ · P0
  - Phụ thuộc: T01, T02, T03, T04
  - Công việc: Art: Cung thánh xa, hai dãy ghế phối cảnh, hành lang giữa, kính màu. Tương tác: Chọn ghế, quỳ/chắp tay, đọc thông tin, NPC. Collider, spawn, NPC, UI, zone & camera.
  - Nghiệm thu: Screenshot bám ref, interaction hoạt động, nav/test/desktop-mobile pass.

- [ ] **MAP-03** Dựng lại Lớp giáo lý · P0
  - Phụ thuộc: T01, T02, T03
  - Công việc: Art: Bàn học, bảng, kệ sách, góc quiz. Tương tác: 3 câu trắc nghiệm, xếp sách, trò chuyện với Sơ. Collider, spawn, NPC, UI, zone & camera.
  - Nghiệm thu: Screenshot bám ref, interaction hoạt động, nav/test/desktop-mobile pass.

- [ ] **MAP-04** Dựng lại Khu giếng Rửa Tội · P0
  - Phụ thuộc: T01, T02, T03
  - Công việc: Art: Giếng, kính màu, bảng thuyết minh, hoa, nến. Tương tác: Đọc bảng, gặp Chị Hạnh, tìm hiểu biểu tượng. Collider, spawn, NPC, UI, zone & camera.
  - Nghiệm thu: Screenshot bám ref, interaction hoạt động, nav/test/desktop-mobile pass.

- [ ] **MAP-05** Dựng lại Góc Hòa Giải · P0
  - Phụ thuộc: T01, T02, T03
  - Công việc: Art: Tòa giải tội, ghế chờ, ánh sáng dịu. Tương tác: Đọc kiến thức, hướng dẫn xét mình, NPC. Collider, spawn, NPC, UI, zone & camera.
  - Nghiệm thu: Screenshot bám ref, interaction hoạt động, nav/test/desktop-mobile pass.

- [ ] **MAP-06** Dựng lại Tiền sảnh · P1
  - Phụ thuộc: T01, T02, T03
  - Công việc: Art: Cửa gỗ, bảng lịch lễ, ghế, quầy đón khách. Tương tác: Xem lịch, hướng dẫn, portal vào gian chính. Collider, spawn, NPC, UI, zone & camera.
  - Nghiệm thu: Screenshot bám ref, interaction hoạt động, nav/test/desktop-mobile pass.

- [ ] **MAP-07** Dựng lại Phòng ca đoàn · P1
  - Phụ thuộc: T01, T02, T03
  - Công việc: Art: Organ, giá nhạc, ghế, kệ bài hát. Tương tác: Bài tập nhịp, sắp bản nhạc, NPC trưởng ca đoàn. Collider, spawn, NPC, UI, zone & camera.
  - Nghiệm thu: Screenshot bám ref, interaction hoạt động, nav/test/desktop-mobile pass.

- [ ] **MAP-08** Dựng lại Vườn cộng đồng · P1
  - Phụ thuộc: T01, T02, T03
  - Công việc: Art: Bồn hoa, lối đá, vòi nước, dụng cụ. Tương tác: Tưới hoa, nhặt lá, trồng hoa. Collider, spawn, NPC, UI, zone & camera.
  - Nghiệm thu: Screenshot bám ref, interaction hoạt động, nav/test/desktop-mobile pass.

- [ ] **MAP-09** Dựng lại Nhà xứ · P1
  - Phụ thuộc: T01, T02, T03
  - Công việc: Art: Bàn làm việc, tủ sách, góc tiếp khách, quà. Tương tác: Gặp cha, nhận nhiệm vụ bác ái, gói quà. Collider, spawn, NPC, UI, zone & camera.
  - Nghiệm thu: Screenshot bám ref, interaction hoạt động, nav/test/desktop-mobile pass.

- [ ] **MAP-10** Dựng lại Gian trang phục · P1
  - Phụ thuộc: T01, T02, T03
  - Công việc: Art: Tủ áo, gương, mannequin, góc thử đồ. Tương tác: Thử đồ, mua, mặc, lưu preset. Collider, spawn, NPC, UI, zone & camera.
  - Nghiệm thu: Screenshot bám ref, interaction hoạt động, nav/test/desktop-mobile pass.

- [ ] **MAP-11** Dựng lại Quảng trường Giáng sinh · P1
  - Phụ thuộc: T01, T02, T03
  - Công việc: Art: Cây thông, gian hàng, hang đá, sân khấu nhẹ. Tương tác: Trang trí, góc checkin, event tracking. Collider, spawn, NPC, UI, zone & camera.
  - Nghiệm thu: Screenshot bám ref, interaction hoạt động, nav/test/desktop-mobile pass.

- [ ] **T20** Tích hợp Shop & avatar persistence · P1
  - Phụ thuộc: T03
  - Công việc: Item ownership/equip consistency, previews, admin shop item updates
  - Nghiệm thu: Không mất Xu/item trùng, inventory server authoritative

- [ ] **T21** NPC & người chơi thật + chat · P1
  - Phụ thuộc: T00, T01
  - Công việc: Replace ambient NPC gradually; preserve functional NPC, chat moderation
  - Nghiệm thu: Số NPC/real users admin only; muted user cannot send

- [ ] **T22** Noel tickets & entitlements integration · P1
  - Phụ thuộc: MAP-11
  - Công việc: Use existing ticket grants/entitlements, not client flag
  - Nghiệm thu: No ticket blocked; paid ticket opens; no fake payment

- [ ] **T23** Admin CMS cho map & costume · P1
  - Phụ thuộc: T20, T21
  - Công việc: Edit/update content with roles/audit logs, preview/test before publish
  - Nghiệm thu: Non-admin denied, admin changes reflected, rollback possible

- [ ] **T24** Performance & mobile render · P1
  - Phụ thuộc: MAP-01, MAP-02, MAP-03, MAP-04, MAP-05, MAP-06, MAP-07, MAP-08, MAP-09, MAP-10, MAP-11
  - Công việc: Sprite atlas, cull offscreen, 30fps mobile target; UI safe area
  - Nghiệm thu: Performance report desktop/mobile, no leak after repeated scene changes

- [ ] **T25** Regression E2E & handoff report · P0
  - Phụ thuộc: T20, T21, T22, T23, T24
  - Công việc: Run end-to-end tests, screenshot diffs, source docs, release checklist
  - Nghiệm thu: No open P0/P1; report PASS/FAIL/BLOCKED with evidence