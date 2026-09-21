import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Purpose-built architecture: distinct materials, rounded masonry, readable icons.
const rounded = new RoundedBoxGeometry(1, 1, 1, 2, .09);
const sphere = new THREE.SphereGeometry(1, 24, 16);
const materials = new Map<number, THREE.MeshStandardMaterial>();
function material(color: number): THREE.MeshStandardMaterial {
  if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .32, metalness: .02 }));
  return materials.get(color)!;
}
function mesh(g: THREE.Object3D, geometry: THREE.BufferGeometry, mat: THREE.Material, pos: number[], scale = [1, 1, 1]): THREE.Mesh {
  const m = new THREE.Mesh(geometry, mat);
  m.position.fromArray(pos); m.scale.fromArray(scale); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
}
function box(g: THREE.Object3D, color: number, pos: number[], size: number[]): THREE.Mesh { return mesh(g, rounded, material(color), pos, size); }
function ball(g: THREE.Object3D, color: number, pos: number[], size: number[]): THREE.Mesh { return mesh(g, sphere, material(color), pos, size); }
function cylinder(g: THREE.Object3D, color: number, pos: number[], radius: number, height: number): THREE.Mesh {
  return mesh(g, new THREE.CylinderGeometry(radius, radius, height, 32), material(color), pos);
}
function glow(color: number, strength = 1.7): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: strength, roughness: .24 });
}
function tube(g: THREE.Object3D, points: THREE.Vector3[], radius: number, mat: THREE.Material): THREE.Mesh {
  return mesh(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(24, points.length * 5), radius, 10, false), mat, [0, 0, 0]);
}
function plaque(g: THREE.Group, text: string, width: number, y: number, z: number, trim: number): void {
  box(g, trim, [0, y, z], [width + .3, 1.9, .32]);
  box(g, 0x342437, [0, y, z + .18], [width, 1.65, .18]);
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sign = mesh(g, new THREE.PlaneGeometry(width - .25, 1.5), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }), [0, y, z + .29]);
  const redraw = (translate: (value: string) => string, rtl = false) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff0ba'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.direction = rtl ? 'rtl' : 'ltr'; ctx.font = '900 88px Arial, sans-serif';
    const original = text.replace(/\s+/g, ' ').trim();
    const localized = translate(original);
    const lines = localized === original ? text.split('\n') : [localized];
    lines.forEach((line, i) => ctx.fillText(line, 384, lines.length === 1 ? 128 : 74 + i * 108, 710));
    texture.needsUpdate = true;
  };
  sign.userData['localize'] = redraw;
  redraw(value => value);
  for (const x of [-width / 2 + .2, width / 2 - .2]) ball(g, trim, [x, y, z + .31], [.09, .09, .06]);
}
function portal(g: THREE.Group, z: number, color: number, stone: number): void {
  const shape = new THREE.Shape(); shape.moveTo(-1.2, .2); shape.lineTo(-1.2, 2.4);
  shape.absarc(0, 2.4, 1.2, Math.PI, 0, true); shape.lineTo(1.2, .2); shape.closePath();
  const energy = new THREE.ShaderMaterial({
    uniforms:{t:{value:0},color:{value:new THREE.Color(color)}},side:THREE.DoubleSide,
    vertexShader:`varying vec2 p; void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float t;uniform vec3 color;varying vec2 p;
      void main(){vec2 q=(p-vec2(0.,1.65))/vec2(1.2,1.9);float r=length(q);
      float rings=.5+.5*sin(r*24.-t*1.8);float core=exp(-r*r*3.);
      gl_FragColor=vec4(color*(.48+.25*rings+.55*core)+vec3(.16,.14,.10)*core,1.);}`,
  });
  const surface=mesh(g,new THREE.ShapeGeometry(shape),energy,[0,0,z]);surface.userData['portalSurface']=true;
  for (const x of [-1.5, 1.5]) for (let i = 0; i < 3; i++) box(g, stone, [x, .6 + i * .72, z + .03], [.56, .67, .7]);
  for (let i = 0; i <= 8; i++) {
    const a = i / 8 * Math.PI;
    const b = box(g, stone, [Math.cos(a) * 1.5, 2.4 + Math.sin(a) * 1.5, z], [.6, .6, .7]); b.rotation.z = a;
  }
  const points = [new THREE.Vector3(-1.2, .15, z + .4), new THREE.Vector3(-1.2, 2.4, z + .4)];
  for (let i = 0; i <= 16; i++) { const a = Math.PI - i / 16 * Math.PI; points.push(new THREE.Vector3(Math.cos(a) * 1.2, 2.4 + Math.sin(a) * 1.2, z + .4)); }
  points.push(new THREE.Vector3(1.2, .15, z + .4)); tube(g, points, .065, glow(color, 2.4));
  for (let i = 0; i < 3; i++) box(g, stone, [0, .12 + i * .08, z + 1.2 - i * .35], [3.6 - i * .3, .18, .7]);
  const light = new THREE.PointLight(color, 9, 8); light.position.set(0, 2, z + 1); g.add(light);
}
function window(g: THREE.Group, x: number, y: number, z: number, trim: number): void {
  box(g, trim, [x, y, z], [.65, 1, .28]);
  mesh(g, rounded, glow(0xffb43c, 1.1), [x, y, z + .17], [.32, .65, .08]);
}
function lantern(g:THREE.Group,x:number,y:number,z:number,trim:number):void {
  box(g,trim,[x,y-.45,z],[.64,.16,.6]);box(g,trim,[x,y+.45,z],[.72,.16,.65]);
  mesh(g,rounded,glow(0xffca62,.9),[x,y,z],[.43,.72,.4]);
  for(const side of [-1,1])box(g,trim,[x+side*.25,y,z+.21],[.06,.84,.06]);
}
function jewel(g:THREE.Group,x:number,y:number,z:number,color:number):void {
  const frame=box(g,0xd9bf68,[x,y,z],[.8,.8,.25]);frame.rotation.z=Math.PI/4;
  const gem=mesh(g,new THREE.OctahedronGeometry(.42),glow(color,.65),[x,y,z+.22],[1,1.15,.45]);
  gem.rotation.z=Math.PI/2;
}
function walls(g: THREE.Group, w: number, h: number, d: number, y: number, palette: number[], door = false): void {
  box(g, palette[0], [0, y + h / 2, 0], [w - .15, h, d - .15]);
  const rows = Math.round(h / .85), cols = Math.ceil(w / 1.3), bw = w / cols;
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const x = -w / 2 + bw * (col + .5), by = y + (row + .5) * h / rows;
    const color = palette[(row * 7 + col * 3) % palette.length];
    if (!(door && Math.abs(x) < 1.75 && by < 4)) box(g, color, [x, by, d / 2], [bw - .055, h / rows - .06, .36]);
    box(g, palette[(row + col) % palette.length], [x, by, -d / 2], [bw - .055, h / rows - .06, .36]);
  }
  const depthCols = Math.ceil(d / 1.3), bd = d / depthCols;
  for (const side of [-1, 1]) for (let row = 0; row < rows; row++) for (let col = 0; col < depthCols; col++) {
    box(g, palette[(row * 3 + col) % palette.length], [side * w / 2, y + (row + .5) * h / rows, -d / 2 + (col + .5) * bd], [.36, h / rows - .06, bd - .06]);
  }
  box(g, palette[1], [0, y + h, 0], [w + .45, .28, d + .45]);
}

export function buildSnakeHall(): THREE.Group {
  const g = new THREE.Group();
  cylinder(g, 0x275c42, [0, .25, 0], 4.8, .5);
  cylinder(g, 0x286c43, [0, 3.3, 0], 3.6, 6);
  const stones = [0x397b6d, 0x4c8a73, 0x618d70, 0x326354];
  for (let row = 0; row < 7; row++) for (let i = 0; i < 20; i++) {
    const a = (i + (row % 2) * .5) / 20 * Math.PI * 2;
    if (Math.cos(a) > .9 && row < 4) continue;
    const b = box(g, stones[(i + row * 3) % 4], [Math.sin(a) * 3.6, .8 + row * .8, Math.cos(a) * 3.6], [1.07, .74, .4]); b.rotation.y = a;
  }
  ball(g, 0x5c9f39, [0, 6.5, 0], [3.5, 2, 3.5]);
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 100; i++) {
    const a = i / 100 * Math.PI * 4.8 + .9;
    points.push(new THREE.Vector3(Math.sin(a) * 3.8, 2.9 + i / 100 * 5, Math.cos(a) * 3.8));
  }
  tube(g, points, .82, material(0x80c743));
  tube(g,points.map(p=>p.clone().add(new THREE.Vector3(0,-.48,.03))),.17,material(0xd2df85));
  for (let i = 0; i < 18; i++) {
    const t = i / 18, a = t * Math.PI * 4.8 + .9;
    ball(g, 0xc5d659, [Math.sin(a) * 3.91, 2.9 + t * 5 - .13, Math.cos(a) * 3.91], [.33, .26, .33]);
  }
  // Broad friendly head, cream muzzle, expressive golden eyes and tongue.
  ball(g, 0x73ae35, [0, 9.4, .1], [1.3, 2.1, 1.2]);
  ball(g, 0x91d447, [0, 10.65, .95], [1.9, 1.25, 1.55]);
  ball(g, 0xd6dc70, [0, 10.12, 1.8], [1.62, .52, 1.14]);
  for (const side of [-1, 1]) {
    ball(g, 0xf0f3c2, [side * 1.05, 11.08, 1.95], [.61, .68, .32]);
    ball(g, 0x172e31, [side * 1.05, 11.07, 2.23], [.41, .5, .17]);
    ball(g, 0xffffff, [side * 1.05 - .12, 11.27, 2.4], [.14, .17, .05]);
    ball(g, 0x3f6831, [side * .57, 10.56, 2.36], [.11, .085, .08]);
  }
  tube(g, [new THREE.Vector3(0, 9.94, 2.7), new THREE.Vector3(0, 9.8, 3.1), new THREE.Vector3(.18, 9.7, 3.3)], .055, material(0xf27876));
  ball(g,0x352437,[0,10.05,2.49],[.93,.48,.28]);
  ball(g,0xf895aa,[0,9.86,2.66],[.52,.14,.12]);
  for(const side of [-1,1]){mesh(g,new THREE.ConeGeometry(.16,.38,12),material(0xfff2ce),[side*.65,10.2,2.65]).rotation.z=Math.PI;
    lantern(g,side*2.7,1.8,4.05,0xc7b969);window(g,side*2.2,6.1,2.95,0xc7b969);}
  jewel(g,0,7.1,3.8,0x88f276);
  portal(g, 4.42, 0x8fff42, 0x81aa39); plaque(g, 'SNAKE HALL', 4.7, 5.15, 4.45, 0xd4cb75);
  return g;
}

export function buildTemple(): THREE.Group {
  const g = new THREE.Group();
  const colors = [0xac5d22, 0xdf9133, 0xc77726, 0xefb34e, 0xb96b2c];
  walls(g, 11, 4.5, 8, .25, colors, true);
  walls(g, 8, 2.3, 5.8, 4.85, colors);
  walls(g, 5.1, 2, 3.9, 7.25, colors);
  box(g, 0xf0bf52, [0, 9.55, 0], [3.4, .45, 3.1]);
  for(const [width,y,depth] of [[11.7,.25,8.4],[11.7,4.8,8.4],[8.7,7.2,6.2],[5.8,9.35,4.3]]){
    box(g,0xf1bf65,[0,y,0],[width,.45,depth]);
    for(const x of [-width/2+.6,width/2-.6])lantern(g,x,y+.65,depth/2-.5,0xd69741);
  }
  for(const side of [-1,1]){window(g,side*3.4,2.2,4.25,0xf2c571);jewel(g,side*4.2,3.6,4.23,0x63b7ad);}

  for (const x of [-4.7, 4.7]) { cylinder(g, 0xce913b, [x, 2.75, 3.9], .48, 5); ball(g, 0xf4c95c, [x, 5.5, 3.9], [.55, .4, .55]); }
  for (const [w, y, z] of [[8, 6.15, 3.08], [5.1, 8.25, 2.16]]) for (const x of [-w * .32, 0, w * .32]) window(g, x, y, z, 0xffc453);
  const crystal = mesh(g, new THREE.OctahedronGeometry(1.1), glow(0xffa92f, .65), [0, 11.35, 0], [.85, 1.65, .85]);
  crystal.userData['spin'] = .5; crystal.userData['floatY'] = 11.35;
  const halo = mesh(g, new THREE.TorusGeometry(1.45, .035, 6, 48), glow(0xffdc6a), [0, 10.15, 0]); halo.rotation.x = Math.PI / 2;
  portal(g, 4.28, 0xffb82e, 0xf4bd4b); plaque(g, '2048\nTEMPLE', 3.8, 5.2, 4.53, 0xfbd473);
  return g;
}

export function buildFactory(): THREE.Group {
  const g = new THREE.Group();
  const colors = [0x612e94, 0x8940bd, 0x7135aa, 0xa04ac7, 0x54267f];
  walls(g, 9.5, 6.3, 6.8, .3, colors, true);
  const candy = [0xee68be, 0x35bad7, 0x92cd45, 0xf6a83f];
  for (let i = 0; i < 2; i++) {
    const tower = new THREE.Group(); tower.position.set((i ? 1 : -1) * 3.25, 0, -.8); g.add(tower);
    const h = [4.7, 5.4][i]; walls(tower, 1.55, h, 1.7, 6.6, colors);
    cylinder(tower, 0xb44bb3, [0, 6.8 + h, 0], 1.05, .45);
    const piece = new THREE.Group(); piece.position.set(0, 8.15 + h, 0); piece.userData['floatY'] = piece.position.y; piece.userData['spin'] = .12; tower.add(piece);
    for (const [x, y] of [[0, 0], [1, 0], [0, 1], [i % 2 ? 1 : -1, 1]]) box(piece, candy[i], [(x - .4) * .8, y * .8, 0], [.78, .78, .78]);
  }
  // Uneven block shoulders and floating tetromino silhouettes from the art sheet.
  for(const side of [-1,1])for(let row=0;row<4;row++)for(let col=0;col<2;col++){
    box(g,colors[(row+col)%colors.length],[side*(4.2+col*.55),.9+row*1.05,2.5-col],[1,1,1.1]);
  }
  for(const [x,y,color] of [[-4.2,8.1,0x61d8e9],[3.7,8.8,0x79cce9],[.1,11.2,0xa7e260]]){
    const piece=new THREE.Group();piece.position.set(x,y,0);piece.userData['floatY']=y;piece.userData['spin']=.1;g.add(piece);
    for(const [bx,by] of [[0,0],[1,0],[1,1],[2,1]])box(piece,color,[(bx-1)*.82,by*.82,0],[.8,.8,.8]);
  }
  for (let row = 0; row < 5; row++) for (const side of [-1, 1]) {
    const b = box(g, candy[(row + (side + 1)) % 4], [side * (3.5 + (row % 2) * .65), 1 + row * 1.15, 3.65], [.86, .86, .6]); b.rotation.z = .035 * side;
  }
  for (const x of [-3.1, 3.1]) for (const y of [2.4, 4.8]) window(g, x, y, 3.65, 0xa15abd);
  portal(g, 3.75, 0xe868ff, 0xa55bd6); plaque(g, 'TETRIS\nFACTORY', 4.4, 5.5, 4, 0xd570d7);
  return g;
}

export function buildGym(): THREE.Group {
  const g = new THREE.Group();
  walls(g, 9.3, 6.6, 6.5, .3, [0x8d3034, 0xc34b38, 0xaa3536, 0xda6540], true);
  cylinder(g, 0xb74530, [0, 7.05, 0], 3.65, .65);
  cylinder(g, 0xf6ab3b, [0, 7.45, 0], 2.65, .25);
  // Golden clenched fist: palm, four knuckles, folded fingers and thumb.
  const fist = new THREE.Group(); fist.position.set(0, 8, 0); fist.rotation.z = -.12; g.add(fist);
  box(fist, 0xffad22, [0, 1.4, 0], [3.45, 2.35, 1.65]);
  box(fist, 0xe98b1c, [0, -.15, 0], [2, 1.1, 1.5]);
  for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * .85, y = 2.62 + Math.sin(i / 3 * Math.PI) * .2;
    box(fist, 0xffbf30, [x, y, -.12], [.8, 1.7, 1.5]);
    box(fist, 0xffc941, [x, 1.95, .9], [.79, .82, .74]);
  }
  const thumb = box(fist, 0xffcf4b, [-1.17, .98, 1.1], [1.75, .85, .9]); thumb.rotation.z = -.48;
  // Rounded knuckles make the roof icon read as a plush fist rather than blocks.
  for(let i=0;i<4;i++)ball(fist,0xffc247,[(i-1.5)*.85,2.9+Math.sin(i/3*Math.PI)*.2,.5],[.46,.65,.55]);
  ball(fist,0xffd363,[-.65,1.25,1.15],[1.1,.58,.48]);
  for(const side of [-1,1]){lantern(g,side*2.85,2.15,3.55,0xf2a24d);window(g,side*3.45,5.1,3.52,0xf2a24d);}
  const bar = cylinder(g, 0xa8acc4, [0, 4.4, 0], .19, 14); bar.rotation.z = Math.PI / 2;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const plate = cylinder(g, i === 1 ? 0x615174 : 0x352e4d, [side * (5.1 + i * .52), 4.4, 0], 1.55 - Math.abs(i - 1) * .15, .42); plate.rotation.z = Math.PI / 2;
    }
    const pipe = [new THREE.Vector3(side * 4.1, .5, 3.45), new THREE.Vector3(side * 4.1, 5.8, 3.45), new THREE.Vector3(side * 2.8, 6.7, 3.45)]; tube(g, pipe, .16, material(0xe88f3b));
    for (let y = 1; y < 6; y += 1.3) mesh(g, rounded, glow(0xff8832, .6), [side * 4.1, y, 3.63], [.2, .36, .13]);
    cylinder(g, 0xd65332, [side * 6.3, 1.65, 2.8], .55, 1.75);
    tube(g, [new THREE.Vector3(side * 6.3, 2.55, 2.8), new THREE.Vector3(side * 6.3, 4.1, 2.8)], .035, material(0xd6a257));
    box(g, 0xffc248, [side * 6.3, 1.7, 3.31], [.42, .5, .08]);
  }
  portal(g, 3.6, 0xff7629, 0xe49539); plaque(g, 'POWER\nGYM', 4.1, 5.55, 3.85, 0xffc359);
  return g;
}

/** Batch repeated masonry per local group, preserving animated parent transforms. */
export function batchHall(root: THREE.Group): void {
  const groups: THREE.Object3D[] = [];
  root.traverse(object => { if (object instanceof THREE.Group) groups.push(object); });
  for (const group of groups) {
    const batches = new Map<string, THREE.Mesh[]>();
    for (const child of group.children) {
      if (!(child instanceof THREE.Mesh) || Array.isArray(child.material) || child.material.transparent || child.userData['spin'] !== undefined) continue;
      const key = `${child.geometry.uuid}/${child.material.uuid}`;
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key)!.push(child);
    }
    for (const meshes of batches.values()) {
      if (meshes.length < 3) continue;
      const instanced = new THREE.InstancedMesh(meshes[0].geometry, meshes[0].material, meshes.length);
      meshes.forEach((part, index) => { part.updateMatrix(); instanced.setMatrixAt(index, part.matrix); group.remove(part); });
      instanced.castShadow = true; instanced.receiveShadow = true;
      instanced.computeBoundingSphere(); group.add(instanced);
    }
  }
}
