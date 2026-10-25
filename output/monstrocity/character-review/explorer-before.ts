import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Authored expedition outfit. Rigid details are batched; limb/knee pivots stay articulated. */
export function createExplorer(female: boolean, material: (color: number) => T.MeshStandardMaterial, npc = false) {
    const root = new T.Group();
    const skin = 0xc99472, skinLight = 0xe0b18c, hair = female ? 0x513329 : 0x342a24;
    const coat = female ? 0x805044 : 0x3c625b, seam = female ? 0xb87f60 : 0x719184;
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
    form([[0,0],[.22,.015],[.25,.08],[.205,.25],[.25,.43],[.28,.52],[.19,.59],[.09,.63],[0,.63]],.64,0,.78,0,coat);
    oval(0,.79,0,.205,.14,.14,pants);
    // Shirt, neck, turned collar and ochre scarf.
    oval(0,1.44,0,.085,.12,.078,skin);
    box(0,1.31,.13,.16,.19,.045,0xcbbd9e);
    for(const s of [-1,1]){
        const collar=box(s*.11,1.36,.13,.115,.18,.045,seam);collar.rotation.z=s*.5;
    }
    oval(0,1.4,.075,.13,.055,.1,0xb99251);
    const scarf=box(.095,1.23,.205,.105,.29,.045,0xc2a064);scarf.rotation.z=-.22;
    line([[.07,1.33,.235],[.08,1.23,.236],[.11,1.13,.235]],.006,0xe0c18b);
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
    const head=new T.Group();head.position.set(0,1.69,0);root.add(head);
    oval(0,0,0,.185,.235,.165,skin,head);
    oval(0,-.115,.035,.132,.118,.125,skin,head);
    for(const s of [-1,1]){
        oval(s*.18,-.012,0,.033,.065,.035,skin,head);
        oval(s*.193,-.015,.014,.014,.038,.018,0xad745b,head);
        oval(s*.1,-.055,.112,.069,.053,.043,skinLight,head);
        oval(s*.073,.025,.147,.057,.038,.026,0x6c4b3a,head);
        oval(s*.073,.024,.159,.047,.027,.018,0xf0e4ca,head);
        oval(s*.07,.024,.176,.021,.023,.009,female?0x5c785e:0x6f7757,head);
        oval(s*.07,.024,.182,.011,.016,.006,0x242b28,head);
        oval(s*.063,.033,.188,.006,.007,.003,0xffffff,head);
        line([[s*.12,.078,.143],[s*.077,.091,.16],[s*.037,.078,.154]],.011,hair,head);
        line([[s*.118,.043,.156],[s*.076,.055,.176],[s*.031,.038,.16]],.006,0x684637,head);
    }
    oval(0,-.018,.153,.027,.063,.033,skinLight,head);
    oval(0,-.055,.182,.037,.028,.035,skinLight,head);
    line([[-.047,-.112,.147],[0,-.12,.159],[.047,-.108,.147]],.006,0x89584a,head);
    oval(0,-.13,.15,.035,.009,.009,0xc68c71,head);
    // Sculpted swept locks, with a clear hairline rather than a sphere cap.
    oval(0,.143,-.04,.194,.125,.163,hair,head);
    for(let i=0;i<7;i++){
        const x=-.15+i*.047;
        const lock=oval(x,.163-Math.abs(x)*.16,.073,.061,.083,.115,i%2?hair: female?0x664133:0x49372c,head);
        lock.rotation.z=-.45;lock.rotation.x=-.2;
    }
    for(const s of [-1,1])oval(s*.16,.045,-.027,.038,.12,.11,hair,head);
    if(female){
        oval(0,.025,-.14,.175,.17,.065,hair,head);
        // Tied braid follows the back, with alternating locks and a fabric tie.
        for(let i=0;i<6;i++)oval((i%2?.025:-.025),-.065-i*.055,-.18,.064-i*.005,.05,.057,hair,head);
        oval(0,-.31,-.18,.045,.018,.04,0xb99251,head);
    }else{
        for(const s of [-1,1])line([[s*.153,-.06,.06],[s*.13,-.125,.085],[s*.085,-.16,.1]],.012,0x795744,head);
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
        const arm=new T.Group();arm.name='limb';arm.position.set(s*.28,1.31,0);root.add(arm);
        oval(s*.018,-.075,0,.102,.145,.104,coat,arm);
        const sleeve=oval(s*.035,-.225,.018,.079,.15,.085,coat,arm);sleeve.rotation.z=s*.08;
        form([[.075,0],[.078,.045]],1,s*.04,-.36,.027,seam,arm);
        oval(s*.04,-.405,.032,.059,.08,.047,skinLight,arm);
        oval(s*-.005,-.4,.062,.025,.045,.026,skin,arm);
        line([[s*.02,-.443,.071],[s*.05,-.447,.071]],.004,0x9e6c51,arm);
        const leg=new T.Group();leg.name='limb';leg.position.set(s*.125,.79,0);root.add(leg);
        oval(0,-.145,0,.103,.205,.106,pants,leg);
        line([[s*.08,-.04,.025],[s*.085,-.25,.026]],.005,0x657071,leg);
        const knee=new T.Group();knee.name='knee';knee.position.y=-.34;leg.add(knee);
        oval(0,-.105,0,.083,.15,.087,pants,knee);
        form([[.09,0],[.095,.06],[.08,.2],[.09,.235]],.93,0,-.32,.005,leather,knee);
        box(0,-.335,.055,.197,.14,.31,leather,knee,.05);
        box(0,-.395,.06,.207,.045,.325,0x292c29,knee,.015);
        for(let i=0;i<3;i++)line([[-.047,-.23-i*.032,.093],[.047,-.245-i*.032,.095]],.006,0xa99672,knee);
        line([[-.075,-.34,.183],[0,-.35,.2],[.075,-.34,.183]],.005,0x8a735a,knee);
    }
    // Merge rigid pieces per material at each pivot to keep this practical in the city.
    const batch=(group:T.Group)=>{
        for(const child of [...group.children])if(child instanceof T.Group)batch(child);
        const buckets=new Map<T.Material,T.Mesh[]>();
        for(const child of group.children)if(child instanceof T.Mesh){const m=child.material as T.Material;const list=buckets.get(m)??[];list.push(child);buckets.set(m,list);}
        for(const [mat,parts] of buckets){if(parts.length<2)continue;const gs=parts.map(p=>{p.updateMatrix();const g=p.geometry.index?p.geometry.toNonIndexed():p.geometry.clone();return g.applyMatrix4(p.matrix);});const merged=mergeGeometries(gs);gs.forEach(g=>g.dispose());if(!merged)continue;parts.forEach(p=>{group.remove(p);p.geometry.dispose();});const m=new T.Mesh(merged,mat);m.castShadow=true;m.receiveShadow=true;group.add(m);}
    };
    batch(root);
    if(npc)root.rotation.y=Math.PI*.7;
    return root;
}
