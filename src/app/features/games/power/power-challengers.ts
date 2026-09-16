export type ChallengerKind='goose'|'sahur'|'crocodile'|'tree'|'shark'|'ballerina'|'banana'|'cactus'|'ninja'|'saturn'|'meter';
export const CHALLENGERS: {kind:ChallengerKind;name:string;quote:string}[] = [
 {kind:'goose',name:'Bombombini Gusini',quote:'“Flight delayed. Fists expected.”'},
 {kind:'sahur',name:'Tung Tung Tung Sahur',quote:'“Knock, knock, knock.”'},
 {kind:'crocodile',name:'Bombardiro Crocodilo',quote:'“Ready for takeoff?”'},
 {kind:'tree',name:'Brr Brr Patapim',quote:'“Try moving this tree.”'},
 {kind:'shark',name:'Tralalero Tralala',quote:'“Fresh shoes. Tough skin.”'},
 {kind:'ballerina',name:'Ballerina Cappuccina',quote:'“One more pirouette.”'},
 {kind:'banana',name:'Chimpanzini Bananini',quote:'“Absolutely bananas.”'},
 {kind:'cactus',name:'Lirilì Larilà',quote:'“Careful. I am prickly.”'},
 {kind:'ninja',name:'Cappuccino Assassino',quote:'“Espresso. No mercy.”'},
 {kind:'saturn',name:'La Vaca Saturno Saturnita',quote:'“Out of this world.”'},
];
/** Padded boxing-dummy interpretations, all sharing the head/body hit silhouette. */
export function drawChallenger(c:CanvasRenderingContext2D,kind:ChallengerKind,hurt=false):void{
 const ellipse=(x:number,y:number,rx:number,ry:number,color:string|CanvasGradient)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();};
 const line=(points:number[][],color:string,width=3)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();};
 const path=(points:number[][],color:string)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();};
 const box=(x:number,y:number,w:number,h:number,r:number,color:string|CanvasGradient)=>{c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();};
 const shade=(light:string,dark:string)=>{const g=c.createLinearGradient(-65,-110,65,85);g.addColorStop(0,light);g.addColorStop(1,dark);return g;};
 const wood=shade('#e8b877','#89512c'),green=shade('#a9d578','#426c46'),cream=shade('#fffbed','#cbbda3');
 c.save();
 // Accessories remain behind the padded target and do not count as hits.
 if(kind==='goose'||kind==='crocodile'){
  path([[-42,-5],[-113,40],[-109,54],[-27,30]],'#819497');path([[42,-5],[113,40],[109,54],[27,30]],'#aab9b8');
  for(const x of [-79,79]){box(x-10,23,20,40,8,'#455d62');ellipse(x,58,8,5,'#f79b50');line([[x-10,30],[x+10,30]],'#c6d8ce',2);}
 }
 if(kind==='tree'){
  for(const x of [-1,1]){line([[x*44,-33],[x*72,-73],[x*61,-108]],'#6d5034',13);ellipse(x*55,-116,39,27,'#4d754a');ellipse(x*29,-133,29,22,'#7fa45a');}
 }
 if(kind==='shark')path([[38,-76],[84,-38],[52,-18]],'#729ca8');
 if(kind==='sahur'){line([[78,82],[86,-2]],'#8c5936',13);line([[83,39],[88,-4]],'#bf8c52',19);}
 if(kind==='cactus')for(const sign of [-1,1])line([[sign*48,28],[sign*80,28],[sign*80,-12]],'#689263',20);
 const bodyColor=kind==='sahur'||kind==='tree'?wood:kind==='banana'?shade('#ffea79','#d3a839'):kind==='cactus'||kind==='crocodile'?green:kind==='shark'?shade('#accbd2','#557f92'):kind==='ninja'?shade('#514c58','#222c36'):cream;
 ellipse(0,33,68,77,bodyColor);
 if(kind==='sahur'||kind==='tree'){
  box(-45,-119,90,210,25,wood);ellipse(0,-111,43,12,'#dfb07b');ellipse(0,-111,28,7,'#bc8656');
  for(const x of [-32,-18,11,29])line([[x,-94],[x-3,-20],[x+2,18],[x-2,77]],'#704c333d',2);
  ellipse(-24,35,5,12,'#80533166');
 }else if(kind==='crocodile'){
  ellipse(0,-68,50,55,green);box(-50,-72,100,43,18,green);line([[-39,-41],[39,-41]],'#35513a',3);
  for(let x=-32;x<=32;x+=16)path([[x,-41],[x+5,-32],[x+9,-41]],'#fff1cd');
  for(const x of [-32,-10,12,34])path([[x,-111],[x+7,-127],[x+14,-108]],'#476846');
  ellipse(-31,-62,4,3,'#3c5637');ellipse(31,-62,4,3,'#3c5637');
 }else if(kind==='goose'){
  ellipse(0,-65,48,58,cream);ellipse(-27,-69,11,20,'#fffdf3');ellipse(27,-69,11,20,'#fffdf3');
  ellipse(0,-41,34,13,'#e8a347');path([[-28,-43],[0,-23],[28,-43]],'#edb75e');line([[-25,-40],[24,-40]],'#a46c2d',2);
  for(const sign of [-1,1]){ellipse(sign*34,36,21,44,'#e8e4d8');line([[sign*37,8],[sign*45,48]],'#b2b8ae',2);}
 }else if(kind==='ballerina'||kind==='ninja'){
  ellipse(53,-66,17,25,'#dacbb4');ellipse(54,-67,10,15,'#263b3d');
  box(-46,-115,92,103,20,cream);ellipse(0,-110,45,13,'#eee6d6');ellipse(0,-110,37,9,'#946445');
  line([[-17,-111],[-5,-116],[6,-109],[17,-115]],'#f3ddae',3);
  if(kind==='ballerina'){box(-39,3,78,52,15,'#eeb0ca');path([[-36,31],[-86,70],[0,85],[86,70],[36,31]],'#eab1cf');for(const x of [-50,-25,0,25,50])line([[x*.5,39],[x,72]],'#c678a6',2);}
  else{box(-47,-88,94,31,5,'#343944');path([[44,-75],[85,-88],[68,-58]],'#a35654');}
 }else if(kind==='banana'){
  ellipse(0,-67,49,53,'#78533c');ellipse(-43,-65,15,20,'#ad7950');ellipse(43,-65,15,20,'#ad7950');ellipse(0,-63,35,40,'#d7ad7f');
  path([[-36,12],[-58,-30],[-59,-61],[-37,-27],[-18,-6],[0,0],[18,-6],[37,-27],[59,-61],[58,-30],[36,12]],'#ffe88a');
  line([[-19,16],[-24,63],[0,91]],'#bf9239',2);
 }else if(kind==='cactus'){
  ellipse(0,-67,49,54,green);ellipse(-42,-62,21,35,'#7da779');ellipse(42,-62,21,35,'#7da779');line([[0,-45],[2,-12],[21,-9]],'#547e58',19);
  for(const x of [-36,-17,18,36])for(const y of [5,35,63]){line([[x,y],[x-4,y-5]],'#d6dfaa',2);line([[x,y],[x+4,y-4]],'#d6dfaa',2);}
 }else if(kind==='saturn'){
  ellipse(0,-65,49,54,cream);ellipse(-31,-104,13,16,'#5e5049');ellipse(29,-67,17,24,'#554943');ellipse(-24,22,20,28,'#63564d');ellipse(26,63,17,20,'#63564d');
  path([[-35,-104],[-46,-133],[-19,-113]],'#e5c899');path([[35,-104],[46,-133],[19,-113]],'#e5c899');ellipse(0,-36,30,18,'#e3aca7');
  c.save();c.rotate(-.22);c.beginPath();c.ellipse(0,41,96,26,0,0,Math.PI);c.strokeStyle='#d5bb81';c.lineWidth=11;c.stroke();c.restore();
 }else if(kind==='shark'){
  ellipse(0,-65,49,55,bodyColor);ellipse(0,-30,32,16,'#344957');for(let x=-24;x<=20;x+=11)path([[x,-39],[x+5,-27],[x+10,-39]],'#f7f5df');
  for(const sign of [-1,1]){box(sign*34-21,79,42,23,10,'#458cdb');line([[sign*34-13,97],[sign*34+13,97]],'#d3e7f0',4);}
 }else{ellipse(0,-67,51,58,shade('#e89366','#a75245'));}
 // Eyes remain geometric and legible at mobile sizes.
 for(const sign of [-1,1]){
  const x=sign*19,y=-79;
  if(hurt){line([[x-6,y-6],[x+6,y+6]],'#332e29',3);line([[x+6,y-6],[x-6,y+6]],'#332e29',3);}
  else{ellipse(x,y,10,12,'#fff9e9');ellipse(x+sign*1,y+1,4.5,7,'#2d3432');ellipse(x+2,y-2,1.8,2,'#fff');}
 }
 if(['sahur','tree','banana','ballerina','ninja','meter'].includes(kind)){
  if(hurt)ellipse(0,-42,8,11,'#513b31');else{c.beginPath();c.arc(0,-52,17,.15*Math.PI,.85*Math.PI);c.strokeStyle='#654837';c.lineWidth=3;c.stroke();}
 }
 // A stitched lower seam identifies the figures as training equipment.
 c.setLineDash([3,5]);c.beginPath();c.ellipse(0,34,59,65,0,.08*Math.PI,.92*Math.PI);c.strokeStyle='#302d292a';c.lineWidth=1.5;c.stroke();c.setLineDash([]);
 c.restore();
}
