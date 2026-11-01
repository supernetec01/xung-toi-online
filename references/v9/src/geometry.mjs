// Shared, UI-independent navigation + seating geometry.
// World coordinates represent character FEET, not head or sprite bounding box.
export const WORLD = Object.freeze({ width:1672, height:941, altarY:392, aisleCenter:836 });
export const ROWS = Object.freeze([
  { y:476, left:[417,712], right:[960,1255], thickness:44 },
  { y:548, left:[334,682], right:[990,1338], thickness:51 },
  { y:634, left:[238,648], right:[1024,1434], thickness:61 },
  { y:750, left:[125,600], right:[1072,1547], thickness:73 },
]);
export function aisleHalfWidth(y){return 93 + Math.max(0,y-440)*0.30;}
export function buildBenches(){
 const benches=[],seats=[];
 ROWS.forEach((row,r)=>{
   for(const side of ['left','right']){
     const [x1,x2]=row[side],w=x2-x1,h=row.thickness;
     // Backrest extends above the seat; collision occupies only the floor footprint.
     const bench={id:`${side}-${r+1}`,side,row:r,x:x1,y:row.y,w,h,collision:{x:x1+3,y:row.y-9,w:w-6,h:h+15}};
     benches.push(bench);
     const number=3;
     for(let i=0;i<number;i++){
       const x=x1+(i+0.5)*w/number;
       const footY=row.y+4;
       // Reach chair from nearest aisle and then snap (not from the top of another bench).
       const approachX=side==='left'?x2+34:x1-34;
       const approachY=row.y+h*0.40;
       seats.push({id:`${bench.id}-seat-${i+1}`,benchId:bench.id,side,row:r,index:i,
         x,y:footY,approachX,approachY,heading:'north',pose:'sit_back'});
     }
   }
 });
 return {benches,seats};
}
const fixtures=[
 {id:'altar',x:575,y:300,w:520,h:92},
 {id:'front-left-planter',x:542,y:344,w:112,h:64},
 {id:'front-right-planter',x:1015,y:344,w:112,h:64},
 {id:'side-left',x:0,y:360,w:86,h:581},
 {id:'side-right',x:1586,y:360,w:86,h:581},
];
export const FURNITURE = buildBenches();
export const COLLIDERS = Object.freeze([...fixtures,...FURNITURE.benches.map(b=>({id:b.id,...b.collision}))]);
export function collisionAt(x,y,radius=12){
 return COLLIDERS.find(o=>x+radius>o.x&&x-radius<o.x+o.w&&y+radius>o.y&&y-radius<o.y+o.h)??null;
}
export function isWalkable(x,y){
 if(!Number.isFinite(x)||!Number.isFinite(y))return false;
 if(x<95||x>1577||y<408||y>914)return false;
 return !collisionAt(x,y,12);
}
export function nearestWalkable(x,y){
 if(isWalkable(x,y))return {x,y};
 let result=null,score=Infinity;
 for(let ring=16;ring<=320;ring+=16){
   for(let a=0;a<360;a+=15){
      const rad=a*Math.PI/180,xx=x+ring*Math.cos(rad),yy=y+ring*Math.sin(rad);
      if(!isWalkable(xx,yy))continue;
      const d=Math.hypot(xx-x,yy-y);
      if(d<score){score=d;result={x:xx,y:yy};}
   }
   if(result)return result;
 }
 return {x:WORLD.aisleCenter,y:820};
}
export function clearSegment(a,b){
 const len=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(1,Math.ceil(len/7));
 for(let i=0;i<=steps;i++){
   const t=i/steps;
   if(!isWalkable(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t))return false;
 }
 return true;
}
export function findPath(from,to){
 const target=nearestWalkable(to.x,to.y);
 if(clearSegment(from,target))return [target];
 // Sparse A* grid (24px); 8 directions, no cutting across blocked corners.
 const cell=24, s={x:Math.round(from.x/cell),y:Math.round(from.y/cell)};
 const t={x:Math.round(target.x/cell),y:Math.round(target.y/cell)};
 const token=p=>`${p.x},${p.y}`,start=token(s),goal=token(t),open=[{...s,f:0}],scores=new Map([[start,0]]),previous=new Map(),closed=new Set();
 const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
 let found=null,count=0;
 while(open.length&&count++<6000){
   let best=0;for(let i=1;i<open.length;i++)if(open[i].f<open[best].f)best=i;
   const cur=open.splice(best,1)[0],ck=token(cur);
   if(closed.has(ck))continue;
   closed.add(ck);
   if(Math.abs(cur.x-t.x)<=1 && Math.abs(cur.y-t.y)<=1){found=ck;break;}
   for(const [dx,dy]of dirs){
     const p={x:cur.x+dx,y:cur.y+dy},pk=token(p),wx=p.x*cell,wy=p.y*cell;
     if(closed.has(pk)||!isWalkable(wx,wy))continue;
     if(dx&&dy&&(!isWalkable((cur.x+dx)*cell,cur.y*cell)||!isWalkable(cur.x*cell,(cur.y+dy)*cell)))continue;
     const nextScore=scores.get(ck)+Math.hypot(dx,dy);
     if(nextScore>=(scores.get(pk)??Infinity))continue;
     scores.set(pk,nextScore);previous.set(pk,ck);
     open.push({...p,f:nextScore+Math.hypot(t.x-p.x,t.y-p.y)});
   }
 }
 if(!found)return [];
 const reversed=[];
 for(let current=found;current&&current!==start;current=previous.get(current)){
   const [x,y]=current.split(',').map(Number);reversed.push({x:x*cell,y:y*cell});
 }
 reversed.reverse();
 // The start may be off-grid; if first grid cell is not directly accessible, return no path.
 if(reversed.length&&!clearSegment(from,reversed[0]))return [];
 let simplified=[];
 for(let i=0;i<reversed.length;){
   let j=reversed.length-1;
   while(j>i&&!clearSegment(simplified.at(-1)||from,reversed[j]))j--;
   simplified.push(reversed[j]);i=j+1;
 }
 if(clearSegment(simplified.at(-1)||from,target))simplified.push(target);
 return simplified;
}
export function nextPoseForDirection(dx,dy,previous='north'){
 if(Math.hypot(dx,dy)<0.01)return previous;
 // Four discrete sprites (not CSS rotate!). Hysteresis avoids flicker at diagonals.
 if(previous==='north'&&dy<0&&Math.abs(dy)>Math.abs(dx)*0.65)return 'north';
 if(previous==='south'&&dy>0&&Math.abs(dy)>Math.abs(dx)*0.65)return 'south';
 if(Math.abs(dx)>Math.abs(dy)*1.20)return dx>0?'east':'west';
 return dy>0?'south':'north';
}
export function createMovementController(start={x:836,y:834}){
 let state={x:start.x,y:start.y,heading:'north',pose:'idle',seatId:null,path:[],commandId:0,onArrive:null};
 return {
   getState:()=>({...state,path:[...state.path]}),
   command(target,after=null){
     // New command ALWAYS replaces previous route and callback atomically.
     state.commandId++;
     state.seatId=null;
     state.pose='walk';
     state.path=findPath({x:state.x,y:state.y},target);
     state.onArrive=after;
     if(!state.path.length){state.pose='idle';state.onArrive=null;return false;}
     return true;
   },
   sit(seat){state.commandId++;state.x=seat.x;state.y=seat.y;state.pose='sit_back';state.heading='north';state.seatId=seat.id;state.path=[];state.onArrive=null;},
   stand(exit=null){state.commandId++;if(exit){state.x=exit.x;state.y=exit.y;}state.pose='idle';state.heading='north';state.seatId=null;state.path=[];state.onArrive=null;},
   drive(dx,dy,deltaMs){
     if(state.seatId)return false;
     const len=Math.hypot(dx,dy);if(len<0.1)return false;
     state.commandId++;state.path=[];state.onArrive=null;state.pose='walk';
     const step=Math.min(50,Math.max(0,deltaMs))/1000*225;
     const nextX=state.x+dx/len*step,nextY=state.y+dy/len*step;
     if(isWalkable(nextX,state.y))state.x=nextX;
     if(isWalkable(state.x,nextY))state.y=nextY;
     state.heading=nextPoseForDirection(dx,dy,state.heading);
     return true;
   },
   tick(deltaMs){
     if(state.pose==='sit_back')return;
     const dt=Math.min(Math.max(deltaMs,0),50)/1000,speed=225*dt;
     if(!state.path.length){if(state.pose==='walk')state.pose='idle';return;}
     const target=state.path[0],vx=target.x-state.x,vy=target.y-state.y,d=Math.hypot(vx,vy);
     if(d<=speed){state.x=target.x;state.y=target.y;state.path.shift();}
     else {const x=state.x+vx/d*speed,y=state.y+vy/d*speed;
       if(clearSegment({x:state.x,y:state.y},{x,y})){state.x=x;state.y=y;}
       else {state.path=[];state.pose='idle';state.onArrive=null;return;}
     }
     state.heading=nextPoseForDirection(vx,vy,state.heading);
     if(!state.path.length){state.pose='idle';const cb=state.onArrive;state.onArrive=null;if(cb)cb();}
   }
 };
}
