// Non-destructive runtime exports. Source sculpt GLBs remain in docs/art.
import fs from 'node:fs';
import path from 'node:path';
import { MeshoptSimplifier } from 'meshoptimizer';
await MeshoptSimplifier.ready;
const source = 'docs/art/assets/models/gelly';
for (const category of ['buildings', 'accessories']) {
 for (const file of fs.readdirSync(`${source}/${category}`).filter(x=>x.endsWith('.glb'))) {
  const input=fs.readFileSync(`${source}/${category}/${file}`);
  const jsonLength=input.readUInt32LE(12), doc=JSON.parse(input.subarray(20,20+jsonLength));
  const bin=input.subarray(28+jsonLength);
  const read=(id)=>{const a=doc.accessors[id],v=doc.bufferViews[a.bufferView],n=a.type==='VEC3'?3:1,C=a.componentType===5126?Float32Array:Uint32Array;return new C(bin.buffer,bin.byteOffset+(v.byteOffset||0)+(a.byteOffset||0),a.count*n).slice()};
  const primitive=doc.meshes[0].primitives[0],positions=read(primitive.attributes.POSITION),normals=read(primitive.attributes.NORMAL),original=read(primitive.indices);
  const target=category==='buildings'?24000:5000;
  const [indices,error]=MeshoptSimplifier.simplify(original,positions,3,target*3,0.02);
  const [remap,count]=MeshoptSimplifier.compactMesh(indices);
  const p=new Float32Array(count*3),n=new Float32Array(count*3);
  for(let i=0;i<remap.length;i++)if(remap[i]!==0xffffffff){p.set(positions.subarray(i*3,i*3+3),remap[i]*3);n.set(normals.subarray(i*3,i*3+3),remap[i]*3)}
  const arrays=[p,n,indices],chunks=arrays.map(a=>Buffer.from(a.buffer));
  let offset=0;doc.bufferViews=chunks.map(b=>{const v={buffer:0,byteOffset:offset,byteLength:b.length};offset+=b.length;return v});
  doc.accessors=[{bufferView:0,componentType:5126,count,type:'VEC3',min:doc.accessors[0].min,max:doc.accessors[0].max},{bufferView:1,componentType:5126,count,type:'VEC3'},{bufferView:2,componentType:5125,count:indices.length,type:'SCALAR'}];
  primitive.attributes={POSITION:0,NORMAL:1};primitive.indices=2;doc.buffers=[{byteLength:offset}];
  let j=Buffer.from(JSON.stringify(doc));j=Buffer.concat([j,Buffer.alloc((4-j.length%4)%4,32)]);
  const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+j.length+offset,8);header.writeUInt32LE(j.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const bh=Buffer.alloc(8);bh.writeUInt32LE(offset);bh.writeUInt32LE(0x004e4942,4);
  fs.writeFileSync(`public/assets/gelly/${file}`,Buffer.concat([header,j,bh,...chunks]));
  console.log(`${file}: ${original.length/3} → ${indices.length/3} triangles; ${(offset/1e6).toFixed(2)} MB; error ${error.toFixed(4)}`);
 }
}
