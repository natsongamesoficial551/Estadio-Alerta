"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Sky, Line } from "@react-three/drei";
import { ACESFilmicToneMapping, BoxGeometry, BufferGeometry, CanvasTexture, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, InstancedMesh, MathUtils, Mesh, Object3D, Quaternion, RepeatWrapping, SphereGeometry, SRGBColorSpace, Vector3 } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import IncidentSimulation from "./IncidentSimulation";
import StadiumSecurity from "./StadiumSecurity";
import CityEnvironment from "./CityEnvironment";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";

export type ArenaView = "overview" | "stands" | "pitch" | "city" | "security" | "incident";
type Props = { view: ArenaView; night: boolean; roof: boolean; crowd: boolean; playing: boolean; rotating: boolean; reset: number; onReady: () => void; onError: () => void; incidentPhase:number; incidentProgress:number; incidentPaused:boolean };
const TAU = Math.PI * 2;

function random(seed: number) { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); }

function ellipseRing(innerX: number, innerZ: number, outerX: number, outerZ: number, innerY: number, outerY = innerY, segments = 192) {
  const positions: number[] = [], uv: number[] = [], indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = i / segments * TAU;
    positions.push(Math.cos(angle) * innerX, innerY, Math.sin(angle) * innerZ, Math.cos(angle) * outerX, outerY, Math.sin(angle) * outerZ);
    uv.push(i/segments*24, 0, i/segments*24, 1);
    if(i<segments){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

function ellipseWall(rx: number, rz: number, low: number, high: number, segments=192) {
  const points:number[]=[], indexes:number[]=[];
  for(let i=0;i<=segments;i++){
    const a=i/segments*TAU;points.push(Math.cos(a)*rx,low,Math.sin(a)*rz,Math.cos(a)*rx,high,Math.sin(a)*rz);
    if(i<segments){const k=i*2;indexes.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  const g=new BufferGeometry();g.setAttribute("position",new Float32BufferAttribute(points,3));g.setIndex(indexes);g.computeVertexNormals();return g;
}

function Beam({ start, end, radius=.12, color="#bcc7c8", emissive, castShadow=true }: { start:number[]; end:number[]; radius?:number; color?:string; emissive?:string; castShadow?:boolean }) {
  const { middle, quaternion, length } = useMemo(()=>{
    const a=new Vector3(...start), b=new Vector3(...end), direction=b.clone().sub(a);
    return {middle:a.add(b).multiplyScalar(.5),length:direction.length(),quaternion:new Quaternion().setFromUnitVectors(new Vector3(0,1,0),direction.normalize())};
  },[start,end]);
  return <mesh position={middle} quaternion={quaternion} castShadow={castShadow}><cylinderGeometry args={[radius,radius,length,6]}/><meshStandardMaterial color={color} roughness={.48} metalness={.6} emissive={emissive} emissiveIntensity={emissive?1:0}/></mesh>;
}

function RingLine({rx,rz,y,color,width=.12}:{rx:number;rz:number;y:number;color:string;width?:number}){
  const points = useMemo(()=>Array.from({length:193},(_,i)=>new Vector3(Math.cos(i/192*TAU)*rx,y,Math.sin(i/192*TAU)*rz)),[rx,rz,y]);
  return <Line points={points} color={color} lineWidth={width*8} />;
}

function makeGrass(){
  const canvas=document.createElement("canvas"); canvas.width=1024; canvas.height=1024;
  const ctx=canvas.getContext("2d")!;
  ctx.fillStyle="#467339";ctx.fillRect(0,0,1024,1024);
  for(let i=0;i<200000;i++){
    const value=random(i+3);ctx.fillStyle=`rgba(${value>.5?"165,181,84":"20,49,18"},${.07+random(i+6)*.24})`;
    const x=random(i*2+7)*1024,y=random(i*2+9)*1024;ctx.fillRect(x,y,.5+value,2+value*2);
  }
  const texture=new CanvasTexture(canvas);texture.wrapS=texture.wrapT=RepeatWrapping;texture.repeat.set(5,3.2);texture.colorSpace=SRGBColorSpace;texture.anisotropy=8;return texture;
}

function Field(){
  const grass=useMemo(makeGrass,[]);
  useEffect(()=>()=>grass.dispose(),[grass]);
  const white="#edf0d9";
  const line=(points:[number,number,number][], key:string)=> <Line key={key} points={points} color={white} lineWidth={1.5}/>;
  const rect=(cx:number,cz:number,w:number,d:number,key:string)=>line([[cx-w/2,.08,cz-d/2],[cx+w/2,.08,cz-d/2],[cx+w/2,.08,cz+d/2],[cx-w/2,.08,cz+d/2],[cx-w/2,.08,cz-d/2]],key);
  return <group position={[0,.12,0]}>
    <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[122,83]}/><meshStandardMaterial map={grass} color="#637d48" roughness={1}/></mesh>
    {Array.from({length:20},(_,i)=><mesh key={i} rotation={[-Math.PI/2,0,0]} position={[-49.875+i*5.25,.015,0]} receiveShadow><planeGeometry args={[5.25,68]}/><meshStandardMaterial map={grass} color={i%2?"#7b9759":"#5c824a"} roughness={.98}/></mesh>)}
    {rect(0,0,105,68,"boundary")}
    {line([[0,.08,-34],[0,.08,34]],"half")}
    <Line points={Array.from({length:81},(_,i)=>[Math.cos(i/80*TAU)*9.15,.08,Math.sin(i/80*TAU)*9.15] as [number,number,number])} color={white} lineWidth={1.5}/>
    {[-1,1].map(side=><group key={side}>
      {rect(side*(52.5-8.25),0,16.5,40.32,`penalty${side}`)}
      {rect(side*(52.5-2.75),0,5.5,18.32,`six${side}`)}
      <mesh rotation={[-Math.PI/2,0,0]} position={[side*41.5,.08,0]}><circleGeometry args={[.16,12]}/><meshBasicMaterial color={white}/></mesh>
      <Line points={Array.from({length:41},(_,i)=>{const a=-.925+i/40*1.85;return [side*(41.5-Math.cos(a)*9.15),.08,Math.sin(a)*9.15] as [number,number,number];})} color={white} lineWidth={1.5}/>
      <Goal side={side}/>
    </group>)}
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.08,0]}><circleGeometry args={[.16,12]}/><meshBasicMaterial color={white}/></mesh>
    {[-1,1].flatMap(x=>[-1,1].map(z=><group key={`${x},${z}`} position={[x*52.5,0,z*34]}><mesh position={[0,.7,0]}><cylinderGeometry args={[.025,.025,1.4,6]}/><meshStandardMaterial color="#f0f0d5"/></mesh><mesh position={[.18,1.27,0]}><boxGeometry args={[.35,.26,.025]}/><meshStandardMaterial color="#edb84b" side={DoubleSide}/></mesh></group>))}
    <Advertising />
    <group position={[6,.1,39]}>
      <mesh position={[0,.3,0]}><boxGeometry args={[16,.15,3]}/><meshStandardMaterial color="#374952"/></mesh>
      <mesh position={[0,2,1]} rotation={[.5,0,0]}><boxGeometry args={[16,2.5,.12]}/><meshPhysicalMaterial color="#b2c8d2" transparent opacity={.35} roughness={.2}/></mesh>
      {Array.from({length:13},(_,i)=><mesh key={i} position={[-7+i*1.15,.8,0]}><boxGeometry args={[.7,.8,.7]}/><meshStandardMaterial color="#203f57"/></mesh>)}
    </group>
  </group>;
}

function Goal({side}:{side:number}){
  const x=side*52.5,back=x+side*2.2;
  return <group>
    <Beam start={[x,0,-3.66]} end={[x,2.44,-3.66]} radius={.065} color="#f0f1e4"/>
    <Beam start={[x,0,3.66]} end={[x,2.44,3.66]} radius={.065} color="#f0f1e4"/>
    <Beam start={[x,2.44,-3.66]} end={[x,2.44,3.66]} radius={.065} color="#f0f1e4"/>
    {Array.from({length:30},(_,i)=>{const z=-3.66+i/29*7.32;return <Line key={`v${i}`} points={[[x,2.44,z],[back,2.1,z],[back,0,z]]} color="#d2d6c5" lineWidth={.45} transparent opacity={.65}/>;})}
    {Array.from({length:11},(_,i)=>{const y=i/10*2.1;return <Line key={`h${i}`} points={[[x,y,-3.66],[back,y,-3.66],[back,y,3.66],[x,y,3.66]]} color="#d2d6c5" lineWidth={.45} transparent opacity={.65}/>;})}
  </group>;
}

function makeBanner(){
  const c=document.createElement("canvas");c.width=2048;c.height=128;const ctx=c.getContext("2d")!;
  ctx.fillStyle="#193f45";ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle="#e5eadc";ctx.font="bold 44px sans-serif";ctx.textBaseline="middle";
  [50,740,1430].forEach(x=>{ctx.fillText("ARENA CVG",x,64);ctx.fillStyle="#ffaf6b";ctx.fillRect(x+390,39,4,50);ctx.fillStyle="#e5eadc";ctx.font="30px sans-serif";ctx.fillText("O FUTURO ENTRA EM CAMPO",x+430,64);ctx.font="bold 44px sans-serif";});
  const map=new CanvasTexture(c);map.colorSpace=SRGBColorSpace;return map;
}

function Advertising(){
  const map=useMemo(makeBanner,[]);useEffect(()=>()=>map.dispose(),[map]);
  return <group>{[-1,1].map(side=><mesh key={side} position={[0,.6,side*37.5]} rotation={[0,side===1?Math.PI:0,0]}><boxGeometry args={[113,1.05,.25]}/><meshStandardMaterial map={map} emissive="#86bd9a" emissiveMap={map} emissiveIntensity={.35} roughness={.4}/></mesh>)}{[-1,1].map(side=><mesh key={side} position={[side*57,.6,0]} rotation={[0,Math.PI/2,0]}><boxGeometry args={[74,1.05,.25]}/><meshStandardMaterial map={map} emissive="#86bd9a" emissiveMap={map} emissiveIntensity={.35}/></mesh>)}</group>;
}

function Bowl({crowd,incident}:{crowd:boolean;incident:boolean}){
  const rings=useMemo(()=>{
    const result:{geometry:BufferGeometry;color:string}[]=[];
    for(let row=0;row<15;row++) result.push({geometry:ellipseRing(74+row*.98,52+row*.98,75.03+row*.98,53.03+row*.98,2.1+row*.68),color:row%2?"#9aa3a1":"#8d9999"});
    for(let row=0;row<19;row++) result.push({geometry:ellipseRing(90+row*.91,68+row*.91,90.96+row*.91,68.96+row*.91,15.1+row*.72),color:row%2?"#929e9e":"#839192"});
    return result;
  },[]);
  const walls=useMemo(()=>[
    {g:ellipseWall(89,67,1.3,14.8),c:"#c6cdca"},
    {g:ellipseWall(109,87,1,30),c:"#aebcbd"},
    {g:ellipseWall(74,52,.5,2.2),c:"#748583"},
    {g:ellipseWall(89.1,67.1,12.5,14.5),c:"#17434a"},
    {g:ellipseWall(108,86,29,30.8),c:"#173b46"},
  ],[]);
  return <group>
    {rings.map((r,i)=><mesh key={i} geometry={r.geometry} receiveShadow><meshStandardMaterial color={r.color} roughness={.9} side={DoubleSide}/></mesh>)}
    {walls.map((r,i)=><mesh key={i} geometry={r.g} receiveShadow><meshStandardMaterial color={r.c} roughness={.7} side={DoubleSide} emissive={i===3?"#255a62":"#000000"} emissiveIntensity={.25}/></mesh>)}
    <mesh geometry={useMemo(()=>ellipseRing(88.7,66.7,91,69,14.7),[])} receiveShadow><meshStandardMaterial color="#b6bfbb"/></mesh>
    <RingLine rx={74} rz={52} y={2.7} color="#d5d9cd" width={.12}/>
    <RingLine rx={90} rz={68} y={15.9} color="#bec7c4" width={.13}/>
    <SeatsAndSpectators crowd={crowd} incident={incident}/>
    {Array.from({length:32},(_,i)=>{const a=i/32*TAU;return <group key={i} position={[Math.cos(a)*89.7,13.5,Math.sin(a)*67.7]} rotation={[0,Math.PI/2-a,0]}><mesh><boxGeometry args={[2.4,2.7,1.2]}/><meshStandardMaterial color="#132d35"/></mesh><mesh position={[0,.9,-.66]}><boxGeometry args={[1.4,.3,.1]}/><meshStandardMaterial color="#9bb6aa" emissive="#80bf95" emissiveIntensity={.4}/></mesh></group>;})}
    {[-1,1].map(side=><Scoreboard key={side} side={side}/>)}
  </group>;
}

function Scoreboard({side}:{side:number}){
  const map=useMemo(()=>{
    const canvas=document.createElement("canvas");canvas.width=1024;canvas.height=400;
    const ctx=canvas.getContext("2d")!;ctx.fillStyle="#173c49";ctx.fillRect(0,0,1024,400);
    ctx.textAlign="center";ctx.fillStyle="#e9be81";ctx.font="32px sans-serif";ctx.fillText("ARENA CVG",512,76);
    ctx.fillStyle="#eff5ee";ctx.font="bold 120px sans-serif";ctx.fillText("01 : 00",512,235);
    ctx.font="24px sans-serif";ctx.fillText("JOGO DEMONSTRATIVO  •  67:24",512,330);
    const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;return texture;
  },[]);
  useEffect(()=>()=>map.dispose(),[map]);
  return <group position={[side*97,22,0]} rotation={[0,side===1?-Math.PI/2:Math.PI/2,0]}>
    <mesh><boxGeometry args={[20,8,.5]}/><meshStandardMaterial color="#10202c" metalness={.3} roughness={.5}/></mesh>
    <mesh position={[0,0,.3]}><planeGeometry args={[19,7.3]}/><meshBasicMaterial map={map}/></mesh>
  </group>;
}

function SeatsAndSpectators({crowd,incident}:{crowd:boolean;incident:boolean}){
  const seats=useRef<InstancedMesh>(null),bodies=useRef<InstancedMesh>(null),heads=useRef<InstancedMesh>(null),legs=useRef<InstancedMesh>(null);
  const {positions,people}=useMemo(()=>{
    const positions:{x:number;y:number;z:number;r:number;color:string}[]=[],people:{x:number;y:number;z:number;r:number;color:string;skin:string;scale:number}[]=[];
    let seed=0;
    for(let tier=0;tier<2;tier++) for(let row=0;row<(tier?19:15);row++){
      const rx=tier?90.5+row*.91:74.5+row*.98,rz=tier?68.5+row*.91:52.5+row*.98,y=tier?15.1+row*.72:2.1+row*.68;
      const count=Math.floor(TAU*Math.sqrt((rx*rx+rz*rz)/2)/.85);
      for(let i=0;i<count;i++){
        const a=i/count*TAU;seed++;
        // Os vãos radiais representam escadas e acessos entre os blocos.
        const aisle=((a/TAU*32+.5)%1)-.5;if(Math.abs(aisle)<.055)continue;
        const x=Math.cos(a)*rx,z=Math.sin(a)*rz,r=Math.PI/2-a;
        positions.push({x,y,z,r,color:Math.floor(a/TAU*8)%2?"#d7ded7":"#537c83"});
        if(random(seed)>.18 && !(incident && Math.abs(x)<4.5 && z>57 && z<64.5)){const palette=["#e1e2d0","#bb5d43","#344e64","#ce7952","#e9cc89","#789191","#e3e9df","#152f43"];
          people.push({x,y,z,r,color:palette[Math.floor(random(seed+7)*palette.length)],skin:["#c28e6a","#87573d","#ddb08a","#604536"][Math.floor(random(seed+14)*4)],scale:.87+random(seed+19)*.2});}
      }
    }
    return {positions,people};
  },[incident]);
  const geometries=useMemo(()=>{
    const seatBase=new BoxGeometry(.48,.12,.49).translate(0,.38,0),back=new BoxGeometry(.48,.49,.1).translate(0,.65,.22);
    const torso=new CylinderGeometry(.19,.24,.57,6).translate(0,.91,-.04),arm1=new BoxGeometry(.13,.47,.14).translate(-.26,.87,-.06),arm2=new BoxGeometry(.13,.47,.14).translate(.26,.87,-.06);
    const thigh=new BoxGeometry(.36,.18,.45).translate(0,.53,-.15),leg1=new BoxGeometry(.14,.39,.15).translate(-.12,.24,-.32),leg2=new BoxGeometry(.14,.39,.15).translate(.12,.24,-.32);
    return {seat:mergeGeometries([seatBase,back])!,body:mergeGeometries([torso,arm1,arm2])!,head:new SphereGeometry(.155,7,5).translate(0,1.36,-.04),legs:mergeGeometries([thigh,leg1,leg2])!};
  },[]);
  useLayoutEffect(()=>{
    const object=new Object3D();
    positions.forEach((p,i)=>{object.position.set(p.x,p.y,p.z);object.rotation.set(0,p.r,0);object.scale.setScalar(1);object.updateMatrix();seats.current!.setMatrixAt(i,object.matrix);seats.current!.setColorAt(i,new Color(p.color));});
    if(seats.current){seats.current.instanceMatrix.needsUpdate=true;if(seats.current.instanceColor)seats.current.instanceColor.needsUpdate=true;}
    people.forEach((p,i)=>{object.position.set(p.x,p.y,p.z);object.rotation.set(0,p.r,0);object.scale.setScalar(p.scale);object.updateMatrix();[bodies,heads,legs].forEach(ref=>ref.current!.setMatrixAt(i,object.matrix));bodies.current!.setColorAt(i,new Color(p.color));heads.current!.setColorAt(i,new Color(p.skin));});
    [bodies,heads,legs].forEach(ref=>{ref.current!.instanceMatrix.needsUpdate=true;if(ref.current!.instanceColor)ref.current!.instanceColor.needsUpdate=true;});
  },[positions,people]);
  return <group>
    <instancedMesh ref={seats} args={[geometries.seat,undefined,positions.length]} frustumCulled={false}><meshStandardMaterial roughness={.7}/></instancedMesh>
    <group visible={crowd}>
      <instancedMesh ref={bodies} args={[geometries.body,undefined,people.length]} frustumCulled={false}><meshStandardMaterial roughness={.95}/></instancedMesh>
      <instancedMesh ref={heads} args={[geometries.head,undefined,people.length]} frustumCulled={false}><meshStandardMaterial roughness={.9}/></instancedMesh>
      <instancedMesh ref={legs} args={[geometries.legs,undefined,people.length]} frustumCulled={false}><meshStandardMaterial color="#32424a" roughness={.9}/></instancedMesh>
    </group>
  </group>;
}

function Roof({visible,night}:{visible:boolean;night:boolean}){
  const surface=useMemo(()=>ellipseRing(82,60,115,93,34.2,37.5),[]);
  const bottom=useMemo(()=>ellipseRing(82,60,115,93,33.8,36.8),[]);
  return <group visible={visible}>
    <mesh geometry={surface} castShadow receiveShadow><meshStandardMaterial color={night?"#a9bdc9":"#deded3"} metalness={.28} roughness={.48} side={DoubleSide}/></mesh>
    <mesh geometry={bottom}><meshStandardMaterial color="#8a9c9f" metalness={.3} roughness={.6} side={DoubleSide}/></mesh>
    {Array.from({length:96},(_,i)=>{const a=i/96*TAU;return <Beam key={`rib${i}`} castShadow={false} start={[Math.cos(a)*82,34.35,Math.sin(a)*60]} end={[Math.cos(a)*115,37.65,Math.sin(a)*93]} radius={.065} color="#a6b4b3"/>;})}
    {[.25,.5,.75].map(t=><RingLine key={t} rx={82+33*t} rz={60+33*t} y={34.35+3.3*t} color="#b5c0bd" width={.045}/>)}
    <RingLine rx={82} rz={60} y={34.3} color="#c2d0c8" width={.2}/>
    <RingLine rx={115} rz={93} y={37.6} color="#e3e5d8" width={.2}/>
    {Array.from({length:48},(_,i)=>{const a=i/48*TAU,cos=Math.cos(a),sin=Math.sin(a);return <group key={i}>
      <Beam start={[cos*82,33.5,sin*60]} end={[cos*115,37,sin*93]} radius={.14} color="#526b73"/>
      <Beam start={[cos*82,33.5,sin*60]} end={[cos*110,31.5,sin*88]} radius={.11} color="#526b73"/>
      <Beam start={[cos*110,31.5,sin*88]} end={[cos*115,37,sin*93]} radius={.12} color="#526b73"/>
      {i%2===0&&<Beam start={[cos*112,1,sin*90]} end={[cos*112,37,sin*90]} radius={.4} color="#abbabc"/>}
      <Beam start={[cos*94,34.8,sin*72]} end={[cos*94,32.7,sin*72]} radius={.1} color="#6b8086"/>
      {i%2===0&&<group position={[cos*83,33,sin*61]} rotation={[0,-a+Math.PI/2,Math.PI*.12]}><mesh><boxGeometry args={[3.6,.5,1]}/><meshStandardMaterial color="#e0e7df" emissive="#e5f3ff" emissiveIntensity={night?4:.7}/></mesh></group>}
    </group>;})}
  </group>;
}

function Facade({night}:{night:boolean}){
  const skirt=useMemo(()=>ellipseWall(112,90,1,30.8),[]);
  return <group>
    <mesh geometry={skirt}><meshStandardMaterial color="#586b70" roughness={.6} metalness={.45} transparent opacity={.22} side={DoubleSide}/></mesh>
    {Array.from({length:112},(_,i)=>{const a=i/112*TAU;return <group key={i} position={[Math.cos(a)*112.4,15.5,Math.sin(a)*90.4]} rotation={[0,Math.PI/2-a,.09*Math.sin(a*3)]}><mesh castShadow><boxGeometry args={[.55,29,1.2]}/><meshStandardMaterial color={i%7===0?"#c1976b":"#bac6c7"} roughness={.4} metalness={.45}/></mesh>{night&&i%4===0&&<mesh position={[.1,0,-.8]}><boxGeometry args={[.14,26,.1]}/><meshStandardMaterial color="#eca568" emissive="#e6a36b" emissiveIntensity={2.5}/></mesh>}</group>;})}
    <RingLine rx={112.8} rz={90.8} y={8} color="#68888a" width={.2}/>
    <RingLine rx={112.8} rz={90.8} y={30} color="#9bb4b3" width={.2}/>
    {Array.from({length:16},(_,i)=>{const a=i/16*TAU;return <group key={i} position={[Math.cos(a)*113,2.8,Math.sin(a)*91]} rotation={[0,Math.PI/2-a,0]}><mesh><boxGeometry args={[5.5,5.5,2]}/><meshStandardMaterial color="#273f49"/></mesh><mesh position={[0,1.6,1.1]}><boxGeometry args={[4.8,.6,.1]}/><meshStandardMaterial color="#e7b475" emissive="#e3ad61" emissiveIntensity={night?1.2:.15}/></mesh></group>;})}
  </group>;
}

function Player({position,color,number,playing,goalkeeper=false}:{position:[number,number,number];color:string;number:number;playing:boolean;goalkeeper?:boolean}){
  const group=useRef<Group>(null),leftLeg=useRef<Group>(null),rightLeg=useRef<Group>(null),leftArm=useRef<Group>(null),rightArm=useRef<Group>(null);
  const phase=number*1.6;
  const elapsed=useRef(0);
  useFrame((_,delta)=>{
    if(!playing||!group.current)return;elapsed.current+=Math.min(delta,.05);
    const t=elapsed.current;
    group.current.position.x=position[0]+Math.sin(t*.22+phase)*(goalkeeper?1.1:2.8);
    group.current.position.z=position[2]+Math.sin(t*.31+phase)*1.8;
    group.current.rotation.y=Math.atan2(Math.cos(t*.22+phase)*.62,Math.cos(t*.31+phase)*.56);
    const swing=Math.sin(t*4+phase)*.4;
    if(leftLeg.current)leftLeg.current.rotation.x=swing;
    if(rightLeg.current)rightLeg.current.rotation.x=-swing;
    if(leftArm.current)leftArm.current.rotation.x=-swing*.7;
    if(rightArm.current)rightArm.current.rotation.x=swing*.7;
    group.current.position.y=.2+Math.abs(Math.sin(t*4+phase))*.035;
  });
  const skin=["#ac7754","#d9a57f","#6d4836","#bc8c65"][number%4];
  return <group ref={group} position={position}>
    <mesh position={[0,1.24,0]} castShadow><cylinderGeometry args={[.24,.2,.6,10]}/><meshStandardMaterial color={color} roughness={.8}/></mesh>
    <mesh position={[0,.9,0]} castShadow><boxGeometry args={[.42,.28,.26]}/><meshStandardMaterial color={color==="#eee5ce"?"#1f3b51":"#e3e4d8"}/></mesh>
    <mesh position={[0,1.78,0]} castShadow><sphereGeometry args={[.17,12,10]}/><meshStandardMaterial color={skin}/></mesh>
    <mesh position={[0,1.89,.02]}><sphereGeometry args={[.165,10,8,0,TAU,0,Math.PI*.5]}/><meshStandardMaterial color="#302923"/></mesh>
    {[[-1,leftLeg],[1,rightLeg]].map(([side,ref],i)=><group key={i} ref={ref as React.RefObject<Group>} position={[(side as number)*.12,.84,0]}><mesh position={[0,-.22,0]} castShadow><cylinderGeometry args={[.085,.07,.44,8]}/><meshStandardMaterial color={skin}/></mesh><mesh position={[0,-.56,.025]} castShadow><cylinderGeometry args={[.075,.065,.3,8]}/><meshStandardMaterial color={color}/></mesh><mesh position={[0,-.74,-.08]} castShadow><boxGeometry args={[.15,.12,.3]}/><meshStandardMaterial color={number%3?"#ecac57":"#26333a"}/></mesh></group>)}
    {[[-1,leftArm],[1,rightArm]].map(([side,ref],i)=><group key={i} ref={ref as React.RefObject<Group>} position={[(side as number)*.29,1.45,0]} rotation={[0,0,(side as number)*.12]}><mesh position={[0,-.1,0]} castShadow><cylinderGeometry args={[.09,.08,.25,8]}/><meshStandardMaterial color={color}/></mesh><mesh position={[0,-.36,0]} castShadow><cylinderGeometry args={[.075,.06,.3,8]}/><meshStandardMaterial color={skin}/></mesh></group>)}
  </group>;
}

function Match({playing}:{playing:boolean}){
  const positions:[number,number,number][]=[[-49,.2,0],[-33,.2,-21],[-34,.2,-7],[-32,.2,10],[-30,.2,23],[-15,.2,-19],[-12,.2,-2],[-13,.2,17],[6,.2,-18],[11,.2,3],[7,.2,21]];
  const ball=useRef<Mesh>(null),time=useRef(0);
  useFrame((_,delta)=>{if(playing&&ball.current){time.current+=Math.min(delta,.05);ball.current.position.set(5+Math.sin(time.current*.32)*5,.38,Math.cos(time.current*.4)*4);ball.current.rotation.x+=delta*2;}});
  return <group>
    {positions.map((p,i)=><Player key={`a${i}`} position={p} color={i===0?"#ddb44e":"#b84538"} number={i} playing={playing} goalkeeper={i===0}/>)}
    {positions.map((p,i)=><Player key={`b${i}`} position={[-p[0],.2,-p[2]+(i?3:0)]} color={i===0?"#6d9d85":"#eee5ce"} number={i+11} playing={playing} goalkeeper={i===0}/>)}
    <Player position={[1,.2,-9]} color="#e5b441" number={25} playing={playing}/>
    <mesh ref={ball} position={[5,.38,0]} castShadow><icosahedronGeometry args={[.22,1]}/><meshStandardMaterial color="#f0e8d8" roughness={.6} wireframe={false}/></mesh>
  </group>;
}

const perspectives:Record<ArenaView,{position:[number,number,number];target:[number,number,number];fov:number}>={
  security:{position:[16,26,28],target:[2,13,64],fov:55},
  incident:{position:[16,26,28],target:[2,11,64],fov:55},
  overview:{position:[205,210,252],target:[-2,2,0],fov:47},
  stands:{position:[35,26,61],target:[-6,5,-2],fov:59},
  pitch:{position:[-39,3.4,29],target:[8,5,-5],fov:63},
  city:{position:[350,275,430],target:[72,3,0],fov:51},
};

function CameraRig({view,rotating,reset,onReady}:{view:ArenaView;rotating:boolean;reset:number;onReady:()=>void}){
  const controls=useRef<OrbitControlsType>(null),transition=useRef(true),sent=useRef(false);
  const camera=useThree(s=>s.camera);
  useEffect(()=>{transition.current=true;if(controls.current)controls.current.enableDamping=false;},[view,reset]);
  useFrame((state,delta)=>{
    if(!sent.current){sent.current=true;onReady();}
    if(!transition.current||!controls.current)return;
    const config=perspectives[view];const target=new Vector3(...config.target);const position=new Vector3(...config.position);
    if(state.size.width<700&&view==="overview")position.multiplyScalar(1.3);
    if(state.size.width<700&&view==="city")position.multiplyScalar(1.2);
    const amount=1-Math.exp(-delta*3.2);
    camera.position.lerp(position,amount);controls.current.target.lerp(target,amount);
    if("fov" in camera){camera.fov=MathUtils.lerp(camera.fov as number,config.fov,amount);camera.updateProjectionMatrix();}
    controls.current.update();
    if(camera.position.distanceTo(position)<.15){camera.position.copy(position);controls.current.target.copy(target);controls.current.enableDamping=true;controls.current.update();transition.current=false;}
  });
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={.07} minDistance={10} maxDistance={650} minPolarAngle={.12} maxPolarAngle={Math.PI/2-.018} autoRotate={rotating} autoRotateSpeed={.5} enablePan={false} onStart={()=>{transition.current=false;}}/>;
}

function Lighting({night}:{night:boolean}){
  return <>
    <color attach="background" args={[night?"#101f33":"#8fa1aa"]}/>
    <fog attach="fog" args={[night?"#152b3d":"#a8b4b6",night?320:350,night?1400:1350]}/>
    {!night&&<Sky distance={4500} sunPosition={[-250,130,-300]} turbidity={6} rayleigh={.75} mieCoefficient={.008} mieDirectionalG={.8}/>}
    <ambientLight intensity={night?.42:.75} color={night?"#95b5dc":"#fff1d6"}/>
    <hemisphereLight args={[night?"#b1c5ec":"#c8e0f0",night?"#263c31":"#72745b",night?.8:1.5]}/>
    <directionalLight position={[-120,180,-100]} intensity={night?.25:2.7} color={night?"#aac6ee":"#ffe0ac"} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-160} shadow-camera-right={160} shadow-camera-top={150} shadow-camera-bottom={-150} shadow-camera-near={1} shadow-camera-far={650} shadow-normalBias={.18} shadow-bias={-.0002}/>
    {night&&<>
      <directionalLight position={[50,45,30]} intensity={2.7} color="#e0ecff" castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-75} shadow-camera-right={75} shadow-camera-top={65} shadow-camera-bottom={-65} shadow-camera-far={180} shadow-normalBias={.12}/>
      <directionalLight position={[-60,45,-30]} intensity={1.8} color="#d9eaff"/>
      <pointLight position={[0,25,0]} intensity={1400} distance={150} decay={1.7} color="#d7eaff"/>
    </>}
  </>;
}

export default function StadiumScene(props:Props){
  return <Canvas shadows="percentage" dpr={[1,1.5]} camera={{position:[205,210,252],fov:47,near:.3,far:5000}} gl={{antialias:true,alpha:false,powerPreference:"high-performance",toneMapping:ACESFilmicToneMapping,toneMappingExposure:1.12}} fallback={<p>Seu navegador precisa oferecer suporte a WebGL 2 para abrir esta cena.</p>}>
    <Suspense fallback={null}>
      <Lighting night={props.night}/>
      <CityEnvironment night={props.night} playing={props.playing}/>
      <group><Facade night={props.night}/><Bowl crowd={props.crowd} incident={props.incidentPhase>0}/><Field/><Match playing={props.playing}/><Roof visible={props.roof} night={props.night}/></group>
      <StadiumSecurity incident={props.incidentPhase>0}/>
      {props.incidentPhase>0&&<IncidentSimulation phase={props.incidentPhase} progress={props.incidentProgress} paused={props.incidentPaused}/>}
      <CameraRig view={props.view} rotating={props.rotating} reset={props.reset} onReady={props.onReady}/>
    </Suspense>
  </Canvas>;
}
