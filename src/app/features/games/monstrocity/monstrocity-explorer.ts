import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Authored expedition outfit. Rigid details are batched; limb/knee pivots stay articulated. */
export function createExplorer(female: boolean, material: (color: number) => T.MeshStandardMaterial) {
    const root = new T.Group();
    const skin = 0xc99472, skinLight = 0xe0b18c, hair = female ? 0x513329 : 0x342a24;
    const coat = female ? 0x6d8175 : 0x405963, seam = female ? 0x9da991 : 0x7c9296;
    const leather = 0x4a3329, brass = 0xbba06a, pants = 0x38434a;
    const mesh = (g:T.BufferGeometry,x:number,y:number,z:number,c:number,p:T.Group=root) => {
        const m=new T.Mesh(g,material(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;p.add(m);return m;
    };
    const oval=(x:number,y:number,z:number,a:number,b:number,c:number,color:number,p=root)=>{const m=mesh(new T.SphereGeometry(1,20,14),x,y,z,color,p);m.scale.set(a,b,c);return m;};
    const box=(x:number,y:number,z:number,w:number,h:number,d:number,c:number,p=root,r=.025)=>mesh(new RoundedBoxGeometry(w,h,d,3,r),x,y,z,c,p);
    const line=(points:number[][],radius:number,c:number,p=root)=>mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(a=>new T.Vector3(...a))),12,radius,6,false),0,0,0,c,p);
    // Tailored silhouettes: a continuous elliptical surface instead of a rectangular torso.
    const form=(rings:number[][],depth:number,x:number,y:number,z:number,c:number,p=root)=>{
        const m=mesh(new T.LatheGeometry(rings.map(([r,h])=>new T.Vector2(r,h)),24),x,y,z,c,p);m.scale.z=depth;return m;
    };
    form(female ? [[0,0],[.19,.015],[.215,.08],[.18,.25],[.195,.43],[.21,.52],[.15,.59],[.08,.63],[0,.63]]:[[0,0],[.22,.015],[.25,.08],[.205,.25],[.25,.43],[.28,.52],[.19,.59],[.09,.63],[0,.63]],.64,0,.78,0,coat);
    oval(0,.79,0,.205,.14,.14,pants);
    // Shirt, neck, turned collar and ochre scarf.
    oval(0,1.44,0,female ? .066:.085,female ? .095:.12,female ? .063:.078,skin);
    box(0,1.31,.13,.16,.19,.045,0xcbbd9e);
    for(const s of [-1,1]){
        const collar=box(s*.11,1.36,.13,.115,.18,.045,seam);collar.rotation.z=s*.5;
    }
    oval(0,1.4,.075,female?.13:.115,.045,.09,female?0xb99251:0x727e7b);
    if(female){
        const scarf=box(.095,1.23,.205,.105,.29,.045,0xc2a064);scarf.rotation.z=-.22;
        line([[.07,1.33,.235],[.08,1.23,.236],[.11,1.13,.235]],.006,0xe0c18b);
    }else{
        box(0,1.30,.16,.14,.11,.03,0xadb6b1);
        for(const side of [-1,1]){box(side*.14,1.16,.16,.135,.12,.03,coat);box(side*.14,1.22,.18,.14,.025,.02,seam);}
    }
    // Placket, seams, pockets and a leather utility belt.
    line([[0,.87,.145],[0,1.1,.15],[0,1.28,.16]],.009,0x283e38);
    for(const y of [.94,1.05,1.16])oval(.025,y,.165,.012,.012,.008,brass);
    for(const s of [-1,1]){
        const pocket=box(s*.148,.98,.148,.13,.15,.035,coat);pocket.rotation.z=s*.06;
        box(s*.148,1.047,.171,.145,.045,.02,seam);
        oval(s*.148,1.035,.187,.01,.01,.008,brass);
        line([[s*.22,.87,.06],[s*.215,1.05,.09],[s*.24,1.23,.08]],.006,seam);
    }
    form([[.23,0],[.232,.055]],.68,0,.825,0,leather);
    box(0,.854,.166,.075,.052,.018,brass,root,.008);
    box(0,.854,.179,.043,.028,.012,leather,root,.005);
    box(.245,.79,.035,.1,.16,.12,leather);
    // Face: jaw, cheeks, nose, eyelids, irises, brows and a restrained smile.
    const head=new T.Group();head.name='head';head.position.set(0,1.69,0);root.add(head);
    if(female){
        // A single tapered face avoids the bulbous cheeks and protruding doll eyes.
        const face=new T.SphereGeometry(1,28,22);
        const positions=face.attributes['position'];
        for(let i=0;i<positions.count;i++){const y=positions.getY(i);const taper=y<-.15?1+(y+.15)*.24:1;positions.setX(i,positions.getX(i)*taper);}
        face.computeVertexNormals();const faceMesh=mesh(face,0,0,0,skin,head);faceMesh.scale.set(.153,.19,.137);
        for(const side of [-1,1]){
            oval(side*.153,-.005,-.012,.023,.043,.023,skin,head);
            // Soft almond-shaped eyes sit within the face rather than on top of it.
            oval(side*.059,.018,.122,.033,.014,.008,0xe1d5bc,head);
            oval(side*.059,.018,.130,.011,.012,.003,0x536b5b,head);
            oval(side*.059,.018,.133,.0055,.009,.002,0x28322f,head);
            line([[side*.09,.024,.127],[side*.060,.033,.133],[side*.027,.024,.128]],.0045,0x644c40,head);
            line([[side*.09,.060,.115],[side*.060,.065,.126],[side*.032,.058,.122]],.006,0x4e382d,head);
        }
        oval(0,-.015,.128,.017,.040,.020,0xd2a184,head);
        oval(0,-.043,.143,.021,.015,.018,skinLight,head);
        line([[-.034,-.085,.118],[0,-.090,.132],[.034,-.083,.118]],.0045,0x925e51,head);
        // Continuous swept hair, a defined part and a tapered tied ponytail.
        const cap=mesh(new T.SphereGeometry(1,28,18,0,Math.PI*2,0,Math.PI*.51),0,.035,-.015,0x49352d,head);cap.scale.set(.162,.185,.150);
        for(const side of [-1,1]){const lock=oval(side*.132,.020,-.015,.028,.115,.114,0x49352d,head);lock.rotation.z=side*.12;}
        line([[-.12,.132,.069],[-.064,.190,.035],[.02,.201,.012],[.117,.127,.080]],.012,0x594135,head);
        line([[.015,.198,.007],[.045,.177,.077],[.126,.102,.105]],.006,0x755440,head);
        line([[0,.02,-.13],[.026,-.065,-.174],[.04,-.21,-.173],[.025,-.32,-.149]],.035,0x49352d,head);
        oval(.025,-.285,-.155,.029,.058,.028,0x49352d,head);
        oval(.022,-.052,-.164,.044,.013,.038,0xa59c78,head);
        head.scale.setScalar(.94);
    }else{
        // Broader, flatter jaw and restrained features give the male explorer his own face.
        const face=new T.SphereGeometry(1,28,22),positions=face.attributes['position'];
        for(let i=0;i<positions.count;i++){
            const y=positions.getY(i),x=positions.getX(i);
            const jaw=y<-.15?1+(y+.15)*.10:1;
            positions.setX(i,x*jaw);
            if(y<-.78)positions.setY(i,-.78+(y+.78)*.65);
        }
        face.computeVertexNormals();const faceMesh=mesh(face,0,0,0,skin,head);faceMesh.scale.set(.162,.205,.145);
        for(const side of [-1,1]){
            oval(side*.160,-.004,-.009,.025,.046,.025,skin,head);
            oval(side*.061,.026,.137,.034,.014,.007,0xdfd4bf,head);
            oval(side*.061,.026,.145,.011,.012,.003,0x62746a,head);
            oval(side*.061,.026,.148,.0055,.008,.002,0x273431,head);
            line([[side*.096,.034,.132],[side*.063,.041,.143],[side*.028,.033,.137]],.005,0x655044,head);
            line([[side*.098,.069,.120],[side*.065,.078,.131],[side*.030,.070,.128]],.008,0x3d3029,head);
        }
        oval(0,-.012,.140,.019,.048,.022,0xd3a182,head);
        oval(0,-.050,.157,.025,.019,.020,skinLight,head);
        line([[-.040,-.099,.128],[0,-.104,.140],[.040,-.098,.128]],.004,0x805a49,head);
        // Cropped hair follows the skull, with an open forehead and a short side part.
        const hairGeometry=new T.SphereGeometry(1,28,18,0,Math.PI*2,0,Math.PI*.61),hairPoints=hairGeometry.attributes['position'];
        for(let i=0;i<hairPoints.count;i++)if(hairPoints.getZ(i)>.15 && hairPoints.getY(i)<.32)hairPoints.setY(i,.32);
        hairGeometry.computeVertexNormals();const crop=mesh(hairGeometry,0,.025,-.018,0x352e29,head);crop.scale.set(.17,.198,.154);
        line([[-.105,.15,.065],[-.045,.211,.034],[.03,.220,.003],[.12,.141,.073]],.008,0x514237,head);
        line([[.047,.213,.015],[.077,.179,.064],[.12,.115,.098]],.005,0x6a5140,head);
    }
    // Canvas backpack, flap, buckles, rolled blanket and shoulder webbing.
    box(0,1.105,-.225,.38,.43,.2,0x877653,root,.055);
    box(0,1.27,-.258,.4,.16,.21,0xa18c65,root,.045);
    box(0,1.01,-.343,.25,.16,.055,0x706044);
    for(const s of [-1,1]){
        box(s*.105,1.11,-.363,.035,.26,.025,leather,root,.008);
        box(s*.105,1.13,-.381,.055,.05,.012,brass,root,.006);
        line([[s*.18,.9,-.19],[s*.23,1.2,-.1],[s*.21,1.37,.035],[s*.18,1.24,.178],[s*.19,1.04,.18]],.025,leather);
        line([[s*.18,1.04,.204],[s*.18,1.24,.204]],.005,brass);
    }
    const roll=mesh(new T.CylinderGeometry(.09,.09,.44,20),0,.88,-.3,0x667c76);roll.rotation.z=Math.PI/2;
    for(const s of [-1,1]){const tie=mesh(new T.TorusGeometry(.091,.012,6,20),s*.14,.88,-.3,leather);tie.rotation.y=Math.PI/2;}
    // Retain the city's interleaved arm/leg ordering and named knee pivots.
    for(const s of [-1,1]){
        const arm=new T.Group();arm.name='limb';arm.position.set(s*(female ? .215:.265),1.31,0);root.add(arm);
        if(female){
            form([[0,-.36],[.036,-.36],[.054,-.345],[.060,-.25],[.064,-.12],[.065,-.03],[.058,.015],[.038,.055],[0,.07]],1,s*.012,0,.008,coat,arm);
        }else{
            form([[0,-.36],[.055,-.355],[.072,-.33],[.082,-.19],[.091,-.04],[.085,.02],[.055,.075],[0,.095]],1,s*.02,0,.01,coat,arm);
        }
        form([[.075,0],[.078,.045]],1,s*.04,-.36,.027,seam,arm);
        oval(s*.04,-.405,.032,female ? .049:.059,.075,female ? .041:.047,skinLight,arm);
        oval(s*-.005,-.4,.062,.025,.045,.026,skin,arm);
        line([[s*.02,-.443,.071],[s*.05,-.447,.071]],.004,0x9e6c51,arm);
        const leg=new T.Group();leg.name='limb';leg.position.set(s*.125,.79,0);root.add(leg);
        if(female)form([[0,-.34],[.073,-.33],[.087,-.24],[.094,-.08],[.075,.025],[0,.035]],1,0,0,0,pants,leg);
        else form([[0,-.34],[.081,-.33],[.097,-.23],[.103,-.06],[.08,.03],[0,.04]],1,0,0,0,pants,leg);
        line([[s*.08,-.04,.025],[s*.085,-.25,.026]],.005,0x657071,leg);
        const knee=new T.Group();knee.name='knee';knee.position.y=-.34;leg.add(knee);
        if(female)form([[0,-.24],[.063,-.23],[.073,-.10],[.077,.015],[0,.025]],1,0,0,0,pants,knee);
        else form([[0,-.25],[.071,-.24],[.080,-.10],[.085,.02],[0,.03]],1,0,0,0,pants,knee);
        form([[.09,0],[.095,.06],[.08,.2],[.09,.235]],.93,0,-.32,.005,leather,knee);
        box(0,-.335,.055,female ? .173:.197,.14,female ? .28:.31,leather,knee,.045);
        box(0,-.395,.06,female ? .183:.207,.045,female ? .295:.325,0x292c29,knee,.015);
        for(let i=0;i<3;i++)line([[-.047,-.23-i*.032,.093],[.047,-.245-i*.032,.095]],.006,0xa99672,knee);
        line([[-.075,-.34,.183],[0,-.35,.2],[.075,-.34,.183]],.005,0x8a735a,knee);
    }
    // Merge rigid pieces per material at each pivot to keep this practical in the city.
    batchRigidParts(root);
    if(!female)root.scale.y=1.035;
    return root;
}

/** Share geometry within a pose pivot; the skeleton remains articulated. */
export function batchRigidParts(group:T.Group){
        for(const child of [...group.children])if(child instanceof T.Group)batchRigidParts(child);
        const buckets=new Map<T.Material,T.Mesh[]>();
        for(const child of group.children)if(child instanceof T.Mesh){const m=child.material as T.Material;const list=buckets.get(m)??[];list.push(child);buckets.set(m,list);}
        for(const [mat,parts] of buckets){if(parts.length<2)continue;const gs=parts.map(p=>{p.updateMatrix();const g=p.geometry.index?p.geometry.toNonIndexed():p.geometry.clone();return g.applyMatrix4(p.matrix);});const merged=mergeGeometries(gs);gs.forEach(g=>g.dispose());if(!merged)continue;parts.forEach(p=>{group.remove(p);p.geometry.dispose();});const m=new T.Mesh(merged,mat);m.castShadow=true;m.receiveShadow=true;group.add(m);}
}
