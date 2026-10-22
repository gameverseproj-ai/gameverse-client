import * as T from 'three';

/** A separate articulated root guardian, with curved grain and a hollow amber heart. */
export function buildTwigwalker(body:T.Group, head:T.Group, arms:T.Group[], legs:T.Group[], knees:T.Group[], materials:T.Material[]) {
    const bark = new T.MeshStandardMaterial({color:0x79634b,roughness:.95});
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=512;
    const ctx=canvas.getContext('2d')!, pixels=ctx.createImageData(256,512);
    for(let y=0;y<512;y++)for(let x=0;x<256;x++) {
        const wave=x+3*Math.sin(y*.032)+2*Math.sin(y*.071+x*.04);
        const fissure=Math.pow(.5+.5*Math.sin(wave*.48),16);
        const fine=Math.sin(x*1.7+y*.09)*7+Math.sin(x*4.3+y*2.7)*4;
        const shade=95+Math.sin(wave*.1)*17-fissure*47+fine;
        const i=(y*256+x)*4;pixels.data[i]=shade*1.15;pixels.data[i+1]=shade*.91;pixels.data[i+2]=shade*.65;pixels.data[i+3]=255;
    }
    ctx.putImageData(pixels,0,0);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;
    bark.map=texture;bark.bumpMap=texture;bark.bumpScale=.018;bark.color.set(0xe7cba8);
    const grain = new T.MeshStandardMaterial({color:0x3d342a,roughness:1});
    const cut = new T.MeshStandardMaterial({color:0xaa8a59,roughness:.9});
    const moss = new T.MeshStandardMaterial({color:0x526a3d,roughness:1});
    const amber = new T.MeshStandardMaterial({color:0xffd98c,emissive:0xffa635,emissiveIntensity:1.5,roughness:.4});
    cut.map=texture;cut.bumpMap=texture;cut.bumpScale=.014;
    moss.map=texture;moss.bumpMap=texture;moss.bumpScale=.02;
    materials.push(bark,grain,cut,moss,amber);
    const branch=(parent:T.Group, points:number[][], radius:number, material:T.Material=bark)=>{
        const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p as [number,number,number])));
        const geometry=new T.TubeGeometry(curve,16,radius,9,false);
        const uv=geometry.getAttribute('uv');
        for(let i=0;i<uv.count;i++){const u=uv.getX(i),v=uv.getY(i);uv.setXY(i,v,u)}
        geometry.computeVertexNormals();const mesh=new T.Mesh(geometry,material);parent.add(mesh);return mesh;
    };
    const knot=(parent:T.Group,x:number,y:number,z:number,rx:number,ry:number,rz:number,material:T.Material=bark)=>{
        const mesh=new T.Mesh(new T.IcosahedronGeometry(1,2),material);mesh.position.set(x,y,z);mesh.scale.set(rx,ry,rz);parent.add(mesh);return mesh;
    };
    // Interleaved trunk ribs leave an actual dark cavity between them.
    knot(body,0,1.95,0,.48,.76,.31,grain);
    knot(body,0,2.02,.31,.14,.23,.07,amber);
    for(let i=0;i<9;i++) {
        const a=i/9*Math.PI*2, x=Math.cos(a),z=Math.sin(a);
        branch(body,[[x*.27,1.12,z*.19],[x*.52,1.65,z*.34],[x*.48,2.19,z*.37],[x*.24,2.62,z*.23]],.105,i%3===0?cut:bark);
        branch(body,[[x*.3,1.25,z*.23],[x*.55,1.8,z*.38],[x*.48,2.4,z*.34]],.018,grain);
    }
    for(const side of [-1,1]) {
        const arm=new T.Group();arm.position.set(side*.61,2.43,0);body.add(arm);arms.push(arm);
        knot(arm,0,0,0,.27,.25,.25,moss);
        branch(arm,[[0,0,0],[side*.18,-.37,0],[side*.24,-.72,.06],[side*.15,-1.13,.13]],.12);
        branch(arm,[[side*.08,-.1,.1],[side*.3,-.51,.13],[side*.21,-1.1,.25]],.043,cut);
        knot(arm,side*.23,-.65,.06,.17,.18,.16,grain);
        knot(arm,side*.15,-1.15,.13,.19,.18,.15);
        for(let finger=0;finger<4;finger++) {
            const x=side*.15+(finger-1.5)*.09;
            branch(arm,[[x,-1.22,.16],[x+side*.035,-1.4,.18],[x+side*.05,-1.46,.27]],.035);
        }
        const hip=new T.Group();hip.position.set(side*.28,1.2,0);body.add(hip);legs.push(hip);
        branch(hip,[[0,0,0],[side*.09,-.27,0],[0,-.55,.04]],.16);
        const knee=new T.Group();knee.position.y=-.55;hip.add(knee);knees.push(knee);
        knot(knee,0,0,.03,.18,.17,.16,moss);
        branch(knee,[[0,0,0],[-side*.06,-.23,.02],[side*.02,-.48,.13]],.125);
        for(let toe=0;toe<3;toe++) branch(knee,[[0,-.43,.1],[(toe-1)*.12,-.54,.28],[(toe-1)*.18,-.56,.45]],.065);
        // Shoulder saplings, asymmetric branches and small leaf clusters.
        for(let j=0;j<3;j++) {
            const x=side*(.43+j*.12),y=2.48+j*.045;
            branch(body,[[x,y,-.13],[x+side*.13,y+.24,-.18],[x+side*(.25+j*.05),y+.38,-.12]],.035);
            knot(body,x+side*.18,y+.3,-.14,.12,.065,.07,moss);
        }
    }
    head.position.set(0,2.7,.12);body.add(head);
    knot(head,0,.02,0,.33,.38,.25,grain);
    // Wooden mask with deep eye sockets; amber eyes are inset beneath brows.
    for(const side of [-1,1]) {
        branch(head,[[side*.08,-.29,.18],[side*.28,-.1,.23],[side*.3,.21,.17],[side*.1,.36,.1]],.085,cut);
        branch(head,[[side*.025,.09,.24],[side*.13,.15,.28],[side*.27,.13,.22]],.055,bark);
        knot(head,side*.13,.035,.245,.07,.04,.025,amber);
        branch(head,[[side*.2,.26,0],[side*.35,.5,-.04],[side*.43,.77,0]],.045);
        branch(head,[[side*.35,.49,-.04],[side*.54,.57,-.04],[side*.65,.68,0]],.026);
    }
    branch(head,[[0,-.28,.16],[.02,-.15,.27],[0,.01,.29]],.05,bark);
    for(let i=0;i<15;i++) {
        const a=i*2.399;
        knot(body,Math.sin(a)*.48,1.5+(i%6)*.17,Math.cos(a)*.35,.09,.055,.08,moss);
    }
}
