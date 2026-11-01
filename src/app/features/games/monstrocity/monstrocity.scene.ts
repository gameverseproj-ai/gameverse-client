import { createCitizen } from './monstrocity-citizen';
import { residentPose, residentRoute } from './monstrocity-residents';
import { worldInput } from './monstrocity.input';
import { createExplorer } from './monstrocity-explorer';
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BUILDINGS, mapFor } from './monstrocity.map';
import { Snapshot } from './monstrocity.types';
/** Authored modular courtyard. Static geometry is batched by material; no other world's art is reused. */
export class MonstrocityScene {
    private world = new T.Scene();
    private camera = new T.OrthographicCamera(-15, 15, 10, -10, .1, 150);
    private followCamera = new T.PerspectiveCamera(58, 1, .1, 150);
    private cameraMode: 'overhead' | 'follow' = 'overhead';
    private followYaw = Math.PI;
    private followYawGoal = Math.PI;
    private followViewYaw?: number;
    private followHeight = 4.2;
    private followPosition = new T.Vector3();
    private followReady = false;
    private cameraRay = new T.Raycaster();
    private cameraObstacles: T.Mesh[] = [];
    private fightCamera = new T.PerspectiveCamera(55, 1, .1, 120);
    private renderer: T.WebGLRenderer;
    private materials = new Map<string, T.MeshStandardMaterial>();
    private staticMeshes: T.Mesh[] = [];
    private interiors: {building:typeof BUILDINGS[number];roof:T.Group;walls:T.Group}[] = [];
    private player = new T.Group();
    private limbs: T.Group[] = [];
    private npcs: T.Group[] = [];
    private npcTime=0;
    private npcRun='';
    private lights: T.Mesh[] = [];
    private markers: T.Group[] = [];
    private lootCrates = new Map<string,{outline:T.LineSegments;lid:T.Group}>();
    private searched = new Set<string>();
    private lootRun = '';
    private clock = 0;
    private walked = 0;
    private strideWeight = 0;
    private movementStart = new T.Vector3();
    private movementTime = 1;
    private movementDuration = .25;
    private snapshotTime = 0;
    private playerMarker = new T.Group();
    private target = new T.Vector3();
    private look = new T.Vector3();
    private pan = new T.Vector2();
    private panGoal = new T.Vector2();
    private panReleased = 0;
    private sun = new T.DirectionalLight(0xffe2ac, 3);
    private ambient = new T.HemisphereLight(0xc5d7dc, 0x675345, 2.2);
    private monster: T.Sprite;
    private textures: T.Texture[] = [];
    private first = true;
    private disposed = false;
    private frameSample = 0;
    private sampleTime = 0;
    private warmup = 0;
    private map;
    constructor(canvas: HTMLCanvasElement, readonly mapVersion='courtyard-v1') {
        this.map=mapFor(mapVersion);
        this.renderer = new T.WebGLRenderer({ canvas, antialias: window.devicePixelRatio < 2, alpha: false, powerPreference: 'high-performance' });
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        this.renderer.setClearColor(0x9ba8a7);
        this.renderer.outputColorSpace = T.SRGBColorSpace;
        this.renderer.toneMapping = T.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.12;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = T.PCFSoftShadowMap;
        this.world.fog = new T.FogExp2(0x9ba8a7, .013);
        this.world.add(this.ambient, this.sun, this.sun.target);
        this.sun.position.set(-12, 25, 10);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(1024, 1024);
        Object.assign(this.sun.shadow.camera, { left: -23, right: 23, top: 23, bottom: -23, near: 1, far: 70 });
        this.sun.shadow.bias = -.001;
        const ground = this.mat(0xffffff);
        ground.map = new T.TextureLoader().load('/assets/monstrocity/cobblestone.png');
        ground.map.colorSpace = T.SRGBColorSpace;
        ground.map.wrapS = ground.map.wrapT = T.RepeatWrapping;
        ground.map.repeat.set(this.map.extent/1.4, this.map.extent/1.4);
        ground.map.anisotropy = 4;
        ground.bumpMap = ground.map;
        ground.bumpScale = .12;
        this.textures.push(ground.map);
        this.box(this.map.extent*2+12, .3, this.map.extent*2+12, 0, -.22, 0, ground);
        for (let i = -this.map.extent+1; i <= this.map.extent-1; i += 4) {
            for (const side of [-1, 1]) {
                this.box(.12, 1, .12, i, .5, side * (this.map.extent+1), 0x576456);
                this.box(4, .07, .09, i, .9, side * (this.map.extent+1), 0x576456);
                this.box(.12, 1, .12, side * (this.map.extent+1), .5, i, 0x576456);
                this.box(.09, .07, 4, side * (this.map.extent+1), .9, i, 0x576456);
            }
        }
        for (const b of this.map.buildings)
            this.building(b);
        for (const x of [-24, -16, -8, 0, 8, 16, 24]) {
            this.tree(x, -this.map.extent-5);
            this.tree(x, this.map.extent+5);
        }
        if(this.map.extent>17){
            const plaza=this.mat(0xbcb69d);plaza.map=ground.map.clone();plaza.map.repeat.set(5,5);this.textures.push(plaza.map);
            // Broad boulevards connect the nine authored neighbourhoods.
            for(const axis of this.map.roads){
                this.box(this.map.extent===77?2.8:5,.025,this.map.extent*2,axis,-.04,0,0x7b8077);
                this.box(this.map.extent*2,.025,this.map.extent===77?2.8:5,0,-.04,axis,0x7b8077);
            }
            for(const q of this.map.districts.slice(1)){
                this.box(this.map.extent===77?9:15,.06,this.map.extent===77?11:16,q.x,-.025,q.z, q.park?0x8c9978:plaza);
                for(const dx of (this.map.extent===77?[-4.4,4.4]:[-7,7])){this.lamp(q.x+dx,q.z-1);this.bench(q.x+dx,q.z+5.5);}
                for(const dx of (this.map.extent===77?[-12,12]:[-16,16]))for(const dz of [-3,3])this.tree(q.x+dx,q.z+dz);
                if(q.park){for(const dx of [-9,0,9])this.tree(q.x+dx,q.z+11);}
            }
        }
        this.fountain();
        for (const [x, z] of [[-5, 1], [5, 1], [-4, 6], [7, -4], [-16, -8], [15, 8]])
            this.tree(x, z);
        for (const [x, z] of [[-5, -4], [5, 5], [-7, 6], [6, -7]])
            this.lamp(x, z);
        for (const [x, z] of [[-2, 3], [3, -1]])
            this.bench(x, z);
        for (const p of this.map.containers)
            this.crate(p.x, p.z, p.id);
        for (const p of this.map.shelters) {
            const marker = new T.Group();
            const ring = new T.Mesh(new T.RingGeometry(.7, .85, 40), new T.MeshBasicMaterial({ color: 0xe4bd68, side: T.DoubleSide, transparent: true, opacity: .65 }));
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = .07;
            marker.add(ring);
            marker.position.set(p.x, 0, p.z);
            this.world.add(marker);
            this.markers.push(marker);
        }
        this.bus(15, -7);
        this.batch();
        this.player = this.human(false);
        this.world.add(this.player);
        const ring = new T.Mesh(new T.RingGeometry(.37, .43, 32), new T.MeshBasicMaterial({color:0xf0d494,transparent:true,opacity:.7,depthWrite:false}));
        ring.rotation.x=-Math.PI/2; ring.position.y=.02; this.playerMarker.add(ring);
        const arrowShape=new T.Shape();arrowShape.moveTo(-.13,.48);arrowShape.lineTo(0,.74);arrowShape.lineTo(.13,.48);arrowShape.closePath();
        const arrow=new T.Mesh(new T.ShapeGeometry(arrowShape),new T.MeshBasicMaterial({color:0xf0d494,side:T.DoubleSide}));arrow.rotation.x=Math.PI/2;arrow.position.y=.03;this.playerMarker.add(arrow);this.world.add(this.playerMarker);
        this.limbs = this.player.children.filter(c => c.name === 'limb') as T.Group[];
        for (let i = 0; i < this.map.residents.length; i++) {
            const person = createCitizen(i,color=>this.mat(color));
            person.scale.multiplyScalar(.94);
            this.world.add(person);
            this.npcs.push(person);
        }
        const tex = new T.TextureLoader().load('/assets/monstrocity/mossback.png');
        tex.colorSpace = T.SRGBColorSpace;
        this.textures.push(tex);
        this.monster = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
        this.monster.scale.set(2.6, 2.6, 1);
        this.monster.visible = false;
        this.world.add(this.monster);
    }
    private mat(color: number) { const key = String(color); let m = this.materials.get(key); if (!m) {
        m = new T.MeshStandardMaterial({ color, roughness: .9 });
        this.materials.set(key, m);
    } return m; }
    private mesh(geometry: T.BufferGeometry, material: T.Material, parent?: T.Group) { const m = new T.Mesh(geometry, material); m.castShadow = true; m.receiveShadow = true; (parent ?? this.world).add(m); if (!parent)
        this.staticMeshes.push(m); return m; }
    private box(w: number, h: number, d: number, x: number, y: number, z: number, color: number | T.Material, parent?: T.Group, rounded = false) { const m = this.mesh(rounded ? new RoundedBoxGeometry(w, h, d, 2, .09) : new T.BoxGeometry(w, h, d), typeof color === 'number' ? this.mat(color) : color, parent); m.position.set(x, y, z); return m; }
    private sphere(x: number, y: number, z: number, sx: number, sy: number, sz: number, color: number, parent?: T.Group) { const m = this.mesh(new T.SphereGeometry(1, 10, 8), this.mat(color), parent); m.position.set(x, y, z); m.scale.set(sx, sy, sz); return m; }
    private cylinder(r: number, h: number, x: number, y: number, z: number, color: number, parent?: T.Group) { const m = this.mesh(new T.CylinderGeometry(r, r * .9, h, 9), this.mat(color), parent); m.position.set(x, y, z); return m; }
    private texture(kind: 'stone' | 'plaster') {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 256;
        const c = canvas.getContext('2d')!;
        c.fillStyle = kind === 'stone' ? '#69685d' : '#b9ad92';
        c.fillRect(0, 0, 256, 256);
        let seed = 41;
        const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        if (kind === 'stone')
            for (let y = 0; y < 256; y += 24)
                for (let x = -24; x < 256; x += 48) {
                    const xx = x + (Math.floor(y / 24) % 2) * 24;
                    const k = 140 + rand() * 36;
                    c.fillStyle = `rgb(${k + 12},${k + 7},${k})`;
                    c.beginPath();
                    c.roundRect(xx + 2, y + 2, 44, 20, 3);
                    c.fill();
                    c.strokeStyle = '#ddd0ac66';
                    c.stroke();
                }
        for (let i = 0; i < 5000; i++) {
            const k = rand() > .5 ? '#fff' : '#000';
            c.globalAlpha = rand() * .13;
            c.fillStyle = k;
            c.fillRect(rand() * 256, rand() * 256, rand() * 3, rand() * 3);
        }
        c.globalAlpha = 1;
        const t = new T.CanvasTexture(canvas);
        t.colorSpace = T.SRGBColorSpace;
        t.wrapS = t.wrapT = T.RepeatWrapping;
        t.anisotropy = 4;
        this.textures.push(t);
        return t;
    }
    private building(b: typeof BUILDINGS[number]) {
        const roomWalls=new T.Group(),roomRoof=new T.Group();
        if(b.interior)this.interiors.push({building:b,roof:roomRoof,walls:roomWalls});
        const firstMesh=this.staticMeshes.length;
        const { x, z, w, d, h } = b;
        const wall = this.mat(b.color);
        if (!wall.map)
            wall.map = this.texture('plaster');
        if (b.interior) {
            this.world.add(roomWalls, roomRoof);
            this.box(w, .16, d, x, .06, z, 0x81735d);
            const wm = wall.clone();
            wm.transparent = true;
            this.box(.3, h, d, x - w / 2, h / 2, z, wm, roomWalls);
            this.box(.3, h, d, x + w / 2, h / 2, z, wm, roomWalls);
            this.box(w, h, .3, x, h / 2, z + d / 2, wm, roomWalls);
            this.box((w - 2) / 2, h, .3, x - (w + 2) / 4, h / 2, z - d / 2, wm, roomWalls);
            this.box((w - 2) / 2, h, .3, x + (w + 2) / 4, h / 2, z - d / 2, wm, roomWalls);
            this.box(2, 1, .3, x, h - .5, z - d / 2, wm, roomWalls);
            this.box(3, .8, 1.1, x - 1, .5, z + 1.5, 0x6e523b);
            this.box(1.5, 1.8, .5, x + 2, 1, z + 2, 0x675b43);
        }
        else
            this.box(w, h, d, x, h / 2, z, wall);
        // Stone plinth, cornice, timber trim and chimney silhouette.
        if(!b.interior)this.box(w + .15,.4,d + .15,x,.2,z,0x8d8876);
        else {
            this.box(.32,.3,d,x-w/2,.15,z,0x8d8876,roomWalls);this.box(.32,.3,d,x+w/2,.15,z,0x8d8876,roomWalls);
            const trim=this.mat(0xead3a0);trim.emissive.setHex(0x8a6a29);trim.emissiveIntensity=.2;
            for(const dx of [-1.05,1.05])this.box(.12,2.1,.2,x+dx,1.05,z-d/2-.04,trim,roomWalls);
        }
        this.box(w + .4, .2, d + .4, x, h - .12, z, 0xd0c1a0, b.interior ? roomRoof : undefined);
        const roofGroup = b.interior ? roomRoof : undefined;
        const roofMat = this.mat(0x805a45).clone();
        roofMat.transparent = !!b.interior;
        const roof = this.box(w + .65, .22, d / 2 + .5, x, h + .6, z - d / 4, roofMat, roofGroup);
        roof.rotation.x = -.24;
        const roof2 = this.box(w + .65, .22, d / 2 + .5, x, h + .6, z + d / 4, roofMat, roofGroup);
        roof2.rotation.x = .24;
        for (let i = -w / 2; !b.id.startsWith('city-') && i <= w / 2; i += .48)
            for (const side of [-1, 1])
                for (let row = 0; row < Math.ceil(d / 2 / .55); row++) {
                    const offset = .25 + row * .55;
                    const material = this.mat([0x986f50, 0x8b6148, 0xa17a58][(row + Math.round(i * 10) + 100) % 3]);
                    const tile = this.mesh(new T.CylinderGeometry(.14, .16, .61, 7, 1, true, -Math.PI / 2, Math.PI), material, roofGroup);
                    tile.rotation.x = -Math.PI / 2 - side * .24;
                    tile.position.set(x + i, h + .77 + d * .06 - offset * .24, z + side * offset);
                }
        this.box(.65, 1.3, .7, x + w / 3, h + 1.1, z - .5, 0x9a8671, roofGroup);
        for (let level = 0; level < Math.floor(h / 2.7); level++)
            for (let k = 0; k < Math.floor(w / 2); k++) {
                const wx = x - w / 2 + 1.1 + k * 2, wy = 1.5 + level * 2.7;
                const light = this.mat(0xe8be72);
                light.emissive.setHex(0xc77f31);
                light.emissiveIntensity = .5;
                const pane = this.box(.85, 1.25, .06, wx, wy, z + d / 2 + .03, light, b.interior ? roomWalls : undefined);
                this.lights.push(pane);
                this.box(1.12, .12, .24, wx, wy - .7, z + d / 2 + .1, 0xd5c6a7, b.interior ? roomWalls : undefined);
                for (const side of [-1, 1]) {
                    this.box(.32, 1.35, .13, wx + side * .63, wy, z + d / 2 + .13, 0x526455, b.interior ? roomWalls : undefined);
                    for (let row = 0; row < 5; row++)
                        this.box(.3, .035, .05, wx + side * .63, wy - .5 + row * .23, z + d / 2 + .21, 0x697461, b.interior ? roomWalls : undefined);
                }
                this.box(.06, 1.25, .09, wx, wy, z + d / 2 + .09, 0x534634, b.interior ? roomWalls : undefined);
                this.box(.9, .06, .09, wx, wy, z + d / 2 + .09, 0x534634, b.interior ? roomWalls : undefined);
            }
        if (!b.interior) {
            for (const side of [-1, 1])
                for (let level = 0; level < Math.floor(h / 2.7); level++) {
                    const pane = this.mat(0xe8be72);
                    this.box(.07, 1.2, .8, x + side * (w / 2 + .04), 1.5 + level * 2.7, z, pane);
                    this.box(.25, .12, 1.1, x + side * (w / 2 + .12), .8 + level * 2.7, z, 0xd5c6a7);
                    for (const dz of [-.62, .62])
                        this.box(.12, 1.3, .3, x + side * (w / 2 + .1), 1.5 + level * 2.7, z + dz, 0x526455);
                }
            for (let row = 0; row < Math.floor(h / .5); row++)
                for (const side of [-1, 1])
                    this.box(.4, .25, .14, x + side * (w / 2 - .22), .4 + row * .5, z + d / 2 + .06, 0xa89b80);
            this.box(1.1, 2.1, .1, x, .98, z + d / 2 + .05, 0x4d574b);
            this.box(.12, .25, .13, x + .35, 1, z + d / 2 + .15, 0xc3a666);
        }
        if (b.id === 'bakery') {
            for (let i = 0; i < 9; i++) {
                const awning = this.box(.6, .09, 1.8, x - 2.4 + i * .6, 2.4, z + d / 2 + .75, i % 2 ? 0xd6bc88 : 0x8b5e48);
                awning.rotation.x = .18;
            }
            this.box(4, .8, 1, x, .4, z + d / 2 + 1.2, 0x776143);
            for (let i = 0; i < 8; i++)
                this.sphere(x - 1.6 + i * .45, .98, z + d / 2 + 1.2, .2, .12, .14, 0xcba264);
        }
        for (const dx of [-w / 2 + .4, w / 2 - .4]) {
            this.cylinder(.28, .45, x + dx, .22, z + d / 2 + .7, 0x956e50);
            this.sphere(x + dx, .65, z + d / 2 + .7, .36, .42, .36, 0x63764b);
        }
        for(const mesh of this.staticMeshes.slice(firstMesh))mesh.userData['cameraBuilding']=b.id;
    }
    private fountain() { this.cylinder(1.45, .45, 0, .2, 0, 0x8b8a79); this.cylinder(1.25, .1, 0, .47, 0, 0x547f7e); this.cylinder(.35, 1.3, 0, 1, 0, 0xb2aa8d); this.cylinder(.8, .17, 0, 1.55, 0, 0xc0b597); }
    private tree(x: number, z: number) {
        this.cylinder(.17, 2.7, x, 1.3, z, 0x66543f);
        for (let i = 0; i < 23; i++) {
            const angle = i * 2.399;
            const spread = .6 + Math.sin(i * 7) * .35;
            this.sphere(x + Math.sin(angle) * spread, 2.6 + (i % 5) * .17, z + Math.cos(angle) * spread, .55, .42, .55, [0x667a45, 0x7d884d, 0x526c3f][i % 3]);
        }
        for (let i = 0; i < 45; i++) {
            const angle = i * 2.399, spread = .5 + (i % 4) * .25;
            const leaf = this.mesh(new T.SphereGeometry(1, 5, 3), this.mat([0x73894c, 0x899955, 0x587340][i % 3]));
            leaf.position.set(x + Math.sin(angle) * spread, 2.7 + (i % 6) * .15, z + Math.cos(angle) * spread);
            leaf.scale.set(.19, .035, .34);
            leaf.rotation.set(Math.sin(i) * .8, angle, Math.cos(i) * .6);
        }
        this.box(1.8, .2, 1.8, x, .1, z, 0x99937c);
    }
    private bench(x: number, z: number) { for (let i = 0; i < 4; i++)
        this.box(2.1, .1, .18, x, .6, z + i * .2, 0x897250); this.box(2.1, .6, .1, x, .95, z + .65, 0x786246); for (const dx of [-.8, .8])
        this.box(.12, .6, .7, x + dx, .3, z + .3, 0x454f46); }
    private lamp(x: number, z: number) { this.cylinder(.06, 3.6, x, 1.8, z, 0x48554f); this.box(.5, .7, .5, x, 3.6, z, 0x554d3c); const mat = new T.MeshStandardMaterial({ color: 0xffd391, emissive: 0xffb750, emissiveIntensity: 1.5 }); this.box(.34, .5, .52, x, 3.62, z, mat); this.box(.6, .09, .6, x, 4, z, 0x475047); }
    private crate(x: number, z: number, id:string) { this.box(.8, .7, .65, x, .35, z, 0x826b49); for (const dx of [-.32, .32])
        this.box(.08, .76, .72, x + dx, .38, z, 0xb19467); for (let i = 0; i < 3; i++)
        this.box(.78, .035, .04, x, .12 + i * .22, z + .34, 0x4c4736);
        const shape=new T.BoxGeometry(.84,.74,.70);
        const outline=new T.LineSegments(new T.EdgesGeometry(shape),new T.LineBasicMaterial({color:0xe6c88c,transparent:true,opacity:.22,depthWrite:false}));shape.dispose();
        outline.position.set(x,.37,z);this.world.add(outline);
        const lid=new T.Group();lid.position.set(x,.73,z-.33);
        this.box(.85,.075,.72,0,0,.33,0x9a8055,lid);
        for(const dx of [-.32,.32])this.box(.07,.085,.74,dx,0,.33,0xb69b6d,lid);
        this.world.add(lid);this.lootCrates.set(id,{outline,lid});
    }
    private bus(x: number, z: number) { this.box(2.2, 2.2, 5.2, x, 1.25, z, 0x778a80, undefined, true); this.box(2.24, .65, 5.23, x, .6, z, 0x98866b); for (let i = 0; i < 4; i++)
        for (const side of [-1, 1])
            this.box(.04, .75, .85, x + side * 1.12, 1.8, z - 1.7 + i * 1.05, 0x344f58); for (const dz of [-1.7, 1.7])
        for (const dx of [-1, 1])
            this.sphere(x + dx, .42, z + dz, .28, .43, .43, 0x3d423e); this.box(1.8, .75, .06, x, 1.8, z + 2.63, 0x48646c); }
    private human(female: boolean) { return createExplorer(female, color => this.mat(color)); }
    private batch() {
        const groups = new Map<T.Material, T.BufferGeometry[]>();
        const buildingMaterials=new Map<string,T.Material>();
        const materialBuildings=new Map<T.Material,string>();
        for (const mesh of this.staticMeshes) {
            mesh.updateMatrix();
            const g = mesh.geometry.clone().applyMatrix4(mesh.matrix);
            let mat = mesh.material as T.Material;
            const building=mesh.userData['cameraBuilding'] as string|undefined;
            if(building){const key=building+mat.uuid;let own=buildingMaterials.get(key);if(!own){own=mat.clone();own.transparent=true;buildingMaterials.set(key,own);materialBuildings.set(own,building);}mat=own;}
            const list = groups.get(mat) ?? [];
            list.push(g);
            groups.set(mat, list);
            this.world.remove(mesh);
            mesh.geometry.dispose();
        }
        for (const [mat, geoms] of groups) {
            const merged = mergeGeometries(geoms);
            if (merged) {
                const mesh = new T.Mesh(merged, mat);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                this.world.add(mesh);
                if(materialBuildings.has(mat)){mesh.userData['cameraBuilding']=materialBuildings.get(mat);this.cameraObstacles.push(mesh);}
            }
            geoms.forEach(g => g.dispose());
        }
        this.staticMeshes = [];
    }
    resize(w: number, h: number) { this.renderer.setSize(w, h, false); const half = 11; this.camera.left = -half * w / h; this.camera.right = half * w / h; this.camera.top = half; this.camera.bottom = -half; this.camera.updateProjectionMatrix(); this.followCamera.aspect = w / Math.max(1,h); this.followCamera.updateProjectionMatrix(); this.fightCamera.aspect = w / h; this.fightCamera.updateProjectionMatrix(); }
    setCameraMode(mode: 'overhead' | 'follow') {
        this.cameraMode=mode;this.followReady=false;
        this.followYaw=this.followYawGoal=this.player.rotation.y;this.followViewYaw=undefined;
        this.pan.set(0,0);this.panGoal.set(0,0);
    }
    movementInput(x:number,y:number) {
        if(this.cameraMode==='overhead')return worldInput(x,y);
        const length=Math.max(1,Math.hypot(x,y)),yaw=this.followViewYaw ?? this.followYaw;
        return {moveX:(-Math.cos(yaw)*x-Math.sin(yaw)*y)/length,moveZ:(Math.sin(yaw)*x-Math.cos(yaw)*y)/length};
    }
    panBy(x: number, y: number) {
        if(this.cameraMode==='follow'){this.followYawGoal-=x*.006;this.followHeight=T.MathUtils.clamp(this.followHeight+y*.015,2.5,5.5);return;}
 this.panGoal.set(T.MathUtils.clamp(this.panGoal.x - x * .025, -5, 5), T.MathUtils.clamp(this.panGoal.y - y * .025, -5, 5)); this.panReleased = Infinity; }
    releasePan() { this.panReleased = this.clock; }
    render(s: Snapshot | null, dt: number, paused: boolean) {
        if (this.disposed)
            return;
        this.clock += dt;
        const r = s?.run;
        if (r) {
            if(this.lootRun!==r.id){this.lootRun=r.id;this.searched.clear();}
            for(const resource of r.nearby)if(resource.state==='searched')this.searched.add(resource.id);
            for(const [id,crate] of this.lootCrates){
                const distance=Math.hypot(crate.outline.position.x-r.position.x,crate.outline.position.z-r.position.z);
                const active=r.search?.targetId===id;
                crate.outline.visible=!r.combat&&!this.searched.has(id)&&distance<11;
                const proximity=1-T.MathUtils.clamp((distance-1.5)/9.5,0,1);
                (crate.outline.material as T.LineBasicMaterial).opacity=(.10+proximity*.42)*(1+.10*Math.sin(this.clock*(active?5:1.8)));
                const opening=active?-.85+(!paused?Math.sin(this.clock*5)*.035:0):this.searched.has(id)?-.28:0;
                crate.lid.rotation.x=T.MathUtils.lerp(crate.lid.rotation.x,opening,1-Math.exp(-dt*8));
            }
            const next = new T.Vector3(r.position.x, 0, r.position.z);
            if (this.first) {
                this.player.position.copy(next); this.target.copy(next); this.movementStart.copy(next);
                this.look.copy(next); this.first = false; this.snapshotTime = this.clock;
            }
            if (!next.equals(this.target)) {
                this.movementStart.copy(this.player.position); this.movementStart.y=0;
                this.movementDuration=T.MathUtils.clamp(this.clock-this.snapshotTime,.1,.4);
                this.snapshotTime=this.clock;this.target.copy(next);this.movementTime=0;
            }
            const previous=this.player.position.clone();previous.y=0;
            if(!paused)this.movementTime+=dt;
            this.player.position.lerpVectors(this.movementStart,this.target,Math.min(1,this.movementTime/this.movementDuration));
            const delta=this.player.position.clone().sub(previous);delta.y=0;
            const moving=delta.length()>.001 && !paused && !r.combat;
            this.strideWeight=T.MathUtils.lerp(this.strideWeight,moving?1:0,1-Math.exp(-dt*14));
            if(moving) {
                const facing=Math.atan2(delta.x,delta.z);
                const turn=Math.atan2(Math.sin(facing-this.player.rotation.y),Math.cos(facing-this.player.rotation.y));
                this.player.rotation.y+=turn*(1-Math.exp(-dt*15));
                this.walked+=delta.length()*5;
            }
            this.player.position.y=Math.abs(Math.sin(this.walked))*.045*this.strideWeight;
            this.limbs.forEach((limb,i)=>{const stride=Math.sin(this.walked+(i===0||i===3?0:Math.PI));limb.rotation.x=stride*.55*this.strideWeight;const knee=limb.getObjectByName('knee');if(knee)knee.rotation.x=Math.max(0,-stride)*.65*this.strideWeight;});
            const searching=r.search && r.nearby.find(p=>p.id===r.search!.targetId);
            this.player.rotation.x=T.MathUtils.lerp(this.player.rotation.x,searching ? .12:0,1-Math.exp(-dt*9));
            if(searching){
                this.player.rotation.y=Math.atan2(searching.position.x-r.position.x,searching.position.z-r.position.z);
                this.limbs.forEach((limb,i)=>{if(i%2===0)limb.rotation.x=-.7+(!paused?Math.sin(this.clock*6+i)*.14:0);});
            }
            this.playerMarker.position.set(this.player.position.x,0,this.player.position.z);
            this.playerMarker.rotation.y=this.player.rotation.y;
            this.playerMarker.visible=!r.combat;
            for(const interior of this.interiors){
                const b=interior.building,inRoom=Math.abs(r.position.x-b.x)<b.w/2 && Math.abs(r.position.z-b.z)<b.d/2;
                const close=Math.hypot(b.x-r.position.x,b.z-r.position.z)<58;
                interior.roof.visible=!inRoom&&close;interior.walls.visible=close;
                interior.walls.traverse(o=>{if(o instanceof T.Mesh){const mat=o.material as T.MeshStandardMaterial;if(mat.transparent){mat.opacity=inRoom?.18:1;mat.depthWrite=!inRoom;}}});
            }
            const insideKnown = new Set(r.knownShelters.map(x => x.id));
            this.markers.forEach((m, i) => m.visible = insideKnown.has('shelter-' + i));
            const night = r.phase === 'night', evening = r.phase === 'evening';
            this.sun.intensity = T.MathUtils.lerp(this.sun.intensity, night ? .35 : evening ? 1.6 : 3, dt * 2);
            this.ambient.intensity = T.MathUtils.lerp(this.ambient.intensity, night ? 1 : 2, dt * 2);
            (this.world.fog as T.FogExp2).density = T.MathUtils.lerp((this.world.fog as T.FogExp2).density, r.fogRemainingActiveMs > 0 ? .055 : .013, dt);
            this.monster.visible = !!r.notice;
            if (r.notice)
                this.monster.position.set(r.notice.position.x, 1.3, r.notice.position.z);
            this.player.visible = !r.combat;
        }
        if(this.map.extent>17){const x=Math.round(this.player.position.x/4)*4,z=Math.round(this.player.position.z/4)*4;this.sun.position.set(x-12,25,z+10);this.sun.target.position.set(x,0,z);}
        if(r && this.npcRun!==r.id){this.npcRun=r.id;this.npcTime=r.activeElapsedMs/1000;}
        if(r && !paused && !r.combat)this.npcTime+=dt;
        if(r && Math.abs(this.npcTime-r.activeElapsedMs/1000)>.6)this.npcTime=r.activeElapsedMs/1000;
        this.npcs.forEach((npc,i)=>{
            npc.visible=!r?.combat && Math.hypot(npc.position.x-this.player.position.x,npc.position.z-this.player.position.z)<48;const p=this.map.residents[i],pose=residentPose(residentRoute(p,this.map),this.npcTime);
            const near=r?.nearby.find(n=>n.kind==='resident' && n.id===p.id);
            // Authoritative interaction snapshots win over the ambient route.
            const position=near?.position ?? pose;
            const goal=new T.Vector3(position.x,0,position.z);
            if(!npc.userData['placed']){npc.position.copy(goal);npc.userData['placed']=true;}
            const before=npc.position.clone();if(!paused)npc.position.lerp(goal,1-Math.exp(-dt*14));
            const delta=npc.position.clone().sub(before),running=delta.length()>.004 && !paused;
            if(running)npc.rotation.y=Math.atan2(delta.x,delta.z);
            npc.rotation.x=running?.08:0;
            npc.position.y=running?Math.abs(Math.sin(pose.stride))*.065:0;
            for(const [j,limb] of npc.children.filter(c=>c.name==='limb').entries()){
                const stride=Math.sin(pose.stride+(j===0||j===3?0:Math.PI));limb.rotation.x=running?stride*.85:0;
                const knee=limb.getObjectByName('knee');if(knee)knee.rotation.x=running?Math.max(0,-stride)*.95:0;
            }
        });
        if (this.clock - this.panReleased > .65)
            this.panGoal.multiplyScalar(Math.exp(-dt * 3));
        this.pan.lerp(this.panGoal, 1 - Math.exp(-dt * 7));
        this.look.lerp(new T.Vector3(T.MathUtils.clamp(this.player.position.x, -this.map.extent+9, this.map.extent-9), 0, T.MathUtils.clamp(this.player.position.z, -this.map.extent+9, this.map.extent-9)), 1 - Math.exp(-dt * 5));
        const panX = (this.pan.x + this.pan.y) * .707, panZ = (-this.pan.x + this.pan.y) * .707;
        this.camera.position.set(this.look.x + panX + 15, 24, this.look.z + panZ + 19);
        this.camera.lookAt(this.look.x + panX, 0, this.look.z + panZ);
        for(const mesh of this.cameraObstacles){const mat=mesh.material as T.Material;mat.opacity=1;mat.depthWrite=true;}
        if (r?.combat) {
            // Stage the encounter in a clear lane, keeping props out of the aiming silhouette.
            this.fightCamera.position.set(-5, 1.6, -6);
            this.fightCamera.lookAt(-5, 1.4, -16);
            this.renderer.render(this.world, this.fightCamera);
        }
        else if(this.cameraMode==='follow') {
            this.followYaw+=Math.atan2(Math.sin(this.followYawGoal-this.followYaw),Math.cos(this.followYawGoal-this.followYaw))*(1-Math.exp(-dt*9));
            const forward=new T.Vector3(Math.sin(this.followYaw),0,Math.cos(this.followYaw));
            const anchor=this.player.position.clone();anchor.y=1.2;
            // Look ahead, placing the explorer below centre and keeping the street visible.
            const focus=anchor.clone();
            const desired=anchor.clone().addScaledVector(forward,-7.5);desired.y+=this.followHeight;
            if(!this.followReady){this.followPosition.copy(desired);this.followReady=true;}
            else this.followPosition.lerp(desired,1-Math.exp(-dt*6));
            // Keep the camera behind at a shallow angle. Fade only obstructing buildings;
            // never orbit to the front or fall back to a vertical view.
            this.followCamera.position.copy(this.followPosition);
            this.followViewYaw=this.followYaw;
            const obstructing=new Set<string>();
            for(const height of [.15,1.4]) {
                const body=this.player.position.clone();body.y=height;
                const direction=body.clone().sub(this.followPosition),distance=direction.length();
                this.cameraRay.set(this.followPosition,direction.normalize());this.cameraRay.near=.1;this.cameraRay.far=distance;
                for(const hit of this.cameraRay.intersectObjects(this.cameraObstacles,false))obstructing.add(hit.object.userData['cameraBuilding']);
                this.cameraRay.set(body,direction.negate());
                for(const hit of this.cameraRay.intersectObjects(this.cameraObstacles,false))obstructing.add(hit.object.userData['cameraBuilding']);
            }
            for(const mesh of this.cameraObstacles)if(obstructing.has(mesh.userData['cameraBuilding'])){const mat=mesh.material as T.Material;mat.opacity=.08;mat.depthWrite=false;}
            focus.addScaledVector(forward,2);
            this.followCamera.lookAt(focus);
            this.renderer.render(this.world,this.followCamera);
        } else this.renderer.render(this.world, this.camera);
        this.warmup += dt;
        if (this.warmup > 5) {
            this.frameSample++;
            this.sampleTime += dt;
            if (this.sampleTime > 3) {
                if (this.frameSample / this.sampleTime < 35 && this.renderer.getPixelRatio() > .8)
                    this.renderer.setPixelRatio(Math.max(.8, this.renderer.getPixelRatio() * .8));
                this.frameSample = 0;
                this.sampleTime = 0;
            }
        }
    }
    setCharacter(female: boolean) { const old = this.player; this.player = this.human(female); this.player.position.copy(old.position); this.world.remove(old); old.traverse(o => { if (o instanceof T.Mesh)
        o.geometry.dispose(); }); this.world.add(this.player); this.limbs = this.player.children.filter(c => c.name === 'limb') as T.Group[]; this.first = true; }
    destroy() { this.disposed = true; const mats = new Set<T.Material>(); this.world.traverse(o => { if (o instanceof T.Mesh || o instanceof T.LineSegments) {
        o.geometry.dispose();
        for (const m of (Array.isArray(o.material) ? o.material : [o.material]))
            mats.add(m);
    } if (o instanceof T.Sprite)
        mats.add(o.material); }); mats.forEach(m => m.dispose()); this.textures.forEach(t => t.dispose()); this.sun.shadow.dispose(); this.renderer.dispose(); }
}
