import test from 'node:test';
import assert from 'node:assert/strict';
import {FURNITURE,COLLIDERS,isWalkable,nearestWalkable,findPath,clearSegment,createMovementController,nextPoseForDirection} from '../src/geometry.mjs';
test('ghế theo đúng 4 hàng mỗi bên và không tự đè lên nhau',()=>{
 assert.equal(FURNITURE.benches.length,8);assert.equal(FURNITURE.seats.length,24);
 for(let i=0;i<4;i++)for(const side of ['left','right']){
  let b=FURNITURE.benches.find(b=>b.row===i&&b.side===side);
  assert.ok(b.w>0&&b.h>0);
 }
 for(const a of FURNITURE.benches)for(const b of FURNITURE.benches){
  if(a.id===b.id||a.side!==b.side)continue;
  assert.ok(a.y+a.h < b.y-8 || b.y+b.h < a.y-8,`overlap ${a.id},${b.id}`);
 }
});
test('chân không thể đi xuyên hay đứng vào các hàng ghế',()=>{
 for(const b of FURNITURE.benches){assert.equal(isWalkable(b.x+b.w/2,b.y+b.h/2),false,b.id);}
 assert.equal(isWalkable(836,790),true);
 assert.equal(isWalkable(835,365),false);
});
test('mọi điểm tiếp cận ghế nằm trên lối đi',()=>{
 for(const s of FURNITURE.seats)assert.equal(isWalkable(s.approachX,s.approachY),true,s.id);
});
test('đổi lệnh di chuyển liên tục chỉ giữ đích mới',()=>{
 const c=createMovementController();
 assert.equal(c.command({x:820,y:620}),true);
 const first=c.getState();assert.ok(first.path.length>0);
 assert.equal(c.command({x:840,y:880}),true);
 const second=c.getState();assert.ok(second.commandId>first.commandId);
 for(let i=0;i<80;i++)c.tick(16.66);
 let p=c.getState();assert.ok(isWalkable(p.x,p.y));
});
test('khi ngồi dùng pose cố định và hướng north',()=>{
 const c=createMovementController(),seat=FURNITURE.seats[0];c.sit(seat);
 assert.equal(c.getState().heading,'north');assert.equal(c.getState().pose,'sit_back');
 c.tick(100);assert.equal(c.getState().pose,'sit_back');
 c.stand({x:seat.approachX,y:seat.approachY});assert.ok(isWalkable(c.getState().x,c.getState().y));
});
test('không xoay tự do đầu/actor khi đổi hướng',()=>{
 assert.equal(nextPoseForDirection(1,0),'east');
 assert.equal(nextPoseForDirection(-1,0),'west');
 assert.equal(nextPoseForDirection(0,-1),'north');
 assert.equal(nextPoseForDirection(0,1),'south');
});
test('đường đi từ giữa nhà thờ đến cửa và các ghế hợp lệ',()=>{
 const start={x:836,y:826};
 for(const s of FURNITURE.seats){
  const end={x:s.approachX,y:s.approachY};
  const path=findPath(start,end);
  assert.ok(path.length>0,s.id);
  let cur=start;
  for(const step of path){assert.ok(clearSegment(cur,step),`segment invalid ${s.id}`);cur=step;}
 }
});
