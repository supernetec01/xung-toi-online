"""Manual execution mapping. Unmapped cases stay NOT_RUN; no source-only PASS."""
import csv,json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
rows=list(csv.DictReader((root/'qa/reference/TEST_MATRIX_ORIGINAL.csv').open(encoding='utf-8-sig')))
coverage={}
def group(module,ids,evidence,actual):
 for i in ids: coverage[f'{module}-{i:03}']={'status':'PASS','evidence':evidence,'actual':actual}
def limited(case,status,reason): coverage[case]={'status':status,'evidence':'QA_AUDIT_20261101.md','actual':reason}
group('AUTH',range(1,9),'../evidence/runs/online.txt;../evidence/account-flows.json;../evidence/security-extra.json','Đã chạy auth/API/UI; expired session, password change và session revoke được kiểm tra trên fixture QC.')
group('AUTH',[12],'../evidence/account-flows.json','Đã abort login trước khi gửi, retry sau khi nối lại; kiểm tra auth/me lỗi và logout hai tab.')
limited('AUTH-009','NOT_RUN','Bật/rotate MFA và login PLAYER/Admin đã test; chưa có luồng tắt MFA để chạy đầy đủ testcase bật/tắt.')
limited('AUTH-010','NOT_RUN','API MFA chỉ thao tác session hiện tại; chưa chạy riêng kịch bản cross-target theo mã 403 của matrix.')
limited('AUTH-011','BLOCKED','HTTP localhost; chưa có staging HTTPS để kiểm tra cookie Secure và rotation trên TLS thật.')
group('AUTHUI',range(1,10),'../evidence/account-flows.json;../evidence/account-after.json','Đã chạy UI khách/đăng nhập, 7 chiều rộng, focus, lỗi cài đặt, preview và mất phản hồi import rồi retry.')
group('MOVE',range(1,12),'../evidence/runs/v8.txt;../evidence/runs/v9.txt;../evidence/input-after.json;../evidence/frame-rate.json;../evidence/security-extra.json','Đã chạy collision, 10 click, camera, phím giữ, 20/30/60 FPS; forged teleport bị từ chối, đường đi hợp lệ được đồng bộ theo bước.')
limited('MOVE-012','NOT_RUN','Chưa tạo riêng tình huống NPC đứng chặn đường rồi kiểm tra avoidance; avatar hiện không phải rigid-body collider.')
group('SEAT',range(1,9),'../evidence/scenes.json;../evidence/seat-recovery-after.json;../evidence/runs/online.txt','8 hàng ghế qua UI, 24 metadata hướng; ghế đồng thời, lease hết hạn và NPC nhường ghế đã chạy.')
group('SCENE',[1,2,3,4,5,6,9,10],'../evidence/game/;../evidence/scenes.json;../evidence/asset-fallback.png','Đã mở/tương tác các phòng, thực hiện quest/action; thiếu artwork có fallback. Chênh lệch ảnh duyệt ghi tại audit.')
limited('SCENE-007','BLOCKED','Khu Noel public đã chạy; khu có vé/payment entitlement chưa triển khai nên không thể nghiệm thu paid gate.')
limited('SCENE-008','NOT_RUN','Có bằng chứng depth ghế/props V8; chưa kiểm tra mọi cây/cột/cửa ở cả 5 cảnh legacy.')
group('NPC',[1,4,5,7],'../evidence/runs/online.txt;../evidence/soak-results.json','Đã kiểm tra fixed NPC trong population, public payload, nhiều socket/presence và nhiệm vụ NPC.')
limited('NPC-002','NOT_RUN','Đã chạy unit density và presence nhiều tab; chưa kết nối đúng 5 rồi 15 người chơi thật theo bước matrix.')
limited('NPC-003','NOT_RUN','Nguồn actor và guard tài khoản đã kiểm tra; chưa thực hiện đầy đủ thao tác resident dialog/chat riêng.')
limited('NPC-006','NOT_RUN','Đã kiểm tra các spawn/đường đi trong regression; chưa lấy mẫu runtime mọi NPC trong mọi map khi tăng population.')
group('QUEST',[1,2,3,4,6,9,10],'../evidence/runs/local.txt;../evidence/runs/online.txt','11 quest, 14 action, cooldown/replay/claim và số dư; snapshot sau reload/scene change đã chạy.')
limited('QUEST-005','NOT_RUN','Đã chạy claim nhiều tab và 10 import cùng key; chưa gửi riêng đúng 10 quest/action grant cùng key theo bước testcase.')
limited('QUEST-007','NOT_RUN','Daily claim một lần/timezone có regression; chưa mô phỏng DB/server qua đúng 00:00 Asia/Ho_Chi_Minh.')
limited('QUEST-008','NOT_RUN','Đã test CMS validation; chưa có thao tác đổi collider/hotspot qua Admin để chạy đúng kịch bản unreachable target.')
group('SHOP',range(1,8),'../evidence/runs/online.txt;../evidence/performance.json','Mua/thử/đổi đồ, hai tab, rig nam/nữ, archive ownership và giá server đã kiểm thử.')
limited('SHOP-008','NOT_RUN','Đã thử lỗi artwork scene; chưa abort riêng atlas trang phục sở hữu để nghiệm thu đầy đủ trường hợp này.')
group('CHAT',range(1,10),'../evidence/runs/online.txt','REST/WS send, XSS text, throttle, ban/expiry/report/appeal/role và payload đã được thực thi.')
group('ADMIN',range(1,11),'../evidence/runs/online.txt;../evidence/security-extra.json;../evidence/admin-dashboard.png','Đã chạy role fixtures, publish/archive/conflict, audit, grant Xu, pagination, last-super guard và boundary leak checks.')
for i in range(1,10): limited(f'TICKET-{i:03}','BLOCKED','Chưa có checkout/provider sandbox/webhook/paid entitlement; các route thử đều 404. Không thử tiền thật.')
group('LIVE',[1,2,3,5,6,7,8],'../evidence/runs/online.txt','Chỉ MOCK: keyword, dedupe, 500 comment queue, guest không wallet, sanitization và kill switch đã chạy.')
limited('LIVE-004','BLOCKED','MOCK có dedupe event; chưa có kết nối provider thật để ngắt/reconnect/replay batch theo testcase.')
group('NFR',[1,2],'../evidence/account-flows.json;../evidence/game-touch-after.json','Đã đo controls/overflow tại 320/375/390/768/1024/1366/1920; mobile emulation, không thay thế pinch/device thật.')
group('NFR',[3,4],'../evidence/soak-results.json','10 phút với 30 actor và 100 scene transitions; rAF/heap sau GC/DOM được ghi trên Chromium cloud.')
group('NFR',[5],'../evidence/scenes.json;../evidence/asset-fallback.png','Đã abort WebP, giữ controls/collision và hiển thị fallback; reload là phương án thử lại.')
group('NFR',[6],'../evidence/security-extra.json','Account có robots meta; static HTML trả X-Robots-Tag noindex/nofollow; private API vẫn auth.')
limited('NFR-007','NOT_RUN','Copy tài khoản đã Việt hóa; chưa review mọi date/currency/error string ở toàn bộ app.')
group('NFR',[8],'../evidence/account-flows.json','Tab/Enter/Escape trên account và modal regression; không có keyboard trap trong các luồng đã chạy.')
limited('NFR-009','NOT_RUN','Soak 10 phút sạch console; chưa có một phiên liên tục đủ 15 phút theo testcase này.')
group('NFR',[10],'../evidence/security-extra.json','Database QC trống riêng, fixture tổng hợp, payment routes disabled và LIVE MOCK; không dùng tiền thật.')
for r in rows:
 r.update(coverage.get(r['id'],{'status':'NOT_RUN','evidence':'','actual':'Chưa có bằng chứng thực thi.'}))
 if r['id']=='AUTHUI-001':r['bug_id']='QC-001'
 if r['id']=='AUTHUI-002':r['bug_id']='QC-002'
 if r['id'] in ['AUTHUI-005','AUTHUI-006']:r['bug_id']='QC-003'
 if r['id']=='MOVE-005':r['bug_id']='QC-013'
 if r['id']=='MOVE-011':r['bug_id']='QC-014'
 if r['id']=='SEAT-007':r['bug_id']='QC-015'
 if r['id']=='AUTHUI-009':r['bug_id']='QC-016'
 if r['id']=='NFR-002':r['bug_id']='QC-019'
with (root/'qa/reports/TEST_MATRIX.csv').open('w',encoding='utf-8',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]),lineterminator="\n");w.writeheader();w.writerows(rows)
counts={s:sum(r['status']==s for r in rows) for s in ['PASS','FAIL','BLOCKED','NOT_RUN']}
(root/'qa/reports/coverage-summary.json').write_text(json.dumps({'total':len(rows),'counts':counts,'manualMapping':True,'physicalDevicesTested':False},indent=2)+'\n')
print(counts)
