"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import CityTraffic from "./CityTraffic";
import { BoxGeometry, BufferGeometry, CanvasTexture, Color, CylinderGeometry, IcosahedronGeometry, InstancedMesh, Object3D, SRGBColorSpace } from "three";

type Item = { x:number; y:number; z:number; sx:number; sy:number; sz:number; color?:string; angle?:number };
const noise = (n:number) => { const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x); };
const TAU=Math.PI*2;

// Cada conjunto reutiliza uma geometria e um material para toda a cidade.
function Instances({items,geometry,map,emissiveMap,night=false,color="#ffffff"}:{items:Item[];geometry:BufferGeometry;map?:CanvasTexture;emissiveMap?:CanvasTexture;night?:boolean;color?:string}){
  const ref=useRef<InstancedMesh>(null);
  useLayoutEffect(()=>{
    const object=new Object3D();
    items.forEach((item,i)=>{
      object.position.set(item.x,item.y,item.z);object.scale.set(item.sx,item.sy,item.sz);object.rotation.set(0,item.angle??0,0);object.updateMatrix();
      ref.current!.setMatrixAt(i,object.matrix);ref.current!.setColorAt(i,new Color(item.color??"#ffffff"));
    });
    ref.current!.instanceMatrix.needsUpdate=true;
    if(ref.current!.instanceColor)ref.current!.instanceColor.needsUpdate=true;
    ref.current!.computeBoundingSphere();
  },[items]);
  return <instancedMesh ref={ref} args={[geometry,undefined,items.length]}>
    <meshStandardMaterial color={color} map={map} roughness={map?.72:.88} metalness={map?.12:0} emissiveMap={emissiveMap} emissive={night&&emissiveMap?"#ffdca0":"#000000"} emissiveIntensity={night?1.25:0}/>
  </instancedMesh>;
}

function facade(style:number){
  const canvas=document.createElement("canvas"),light=document.createElement("canvas");canvas.width=light.width=512;canvas.height=light.height=128;
  const ctx=canvas.getContext("2d")!,glow=light.getContext("2d")!;
  ctx.fillStyle=["#c7c9c4","#aebac0","#d6c8b4"][style];ctx.fillRect(0,0,512,128);glow.fillStyle="#000";glow.fillRect(0,0,512,128);
  ctx.fillStyle="#849293";ctx.fillRect(0,122,512,6);ctx.fillStyle="#e3e5de";ctx.fillRect(0,0,512,5);
  for(let i=0;i<8;i++){
    const x=i*64+9,w=style===1?49:39;
    ctx.fillStyle="#707b7e";ctx.fillRect(x-3,18,w+6,83);
    ctx.fillStyle=["#3d5866","#536c79","#425864"][style];ctx.fillRect(x,21,w,74);
    ctx.fillStyle="#78909b";ctx.fillRect(x+3,24,w-6,28);
    ctx.fillStyle="#a6b2b3";ctx.fillRect(x+w/2,21,2,74);ctx.fillRect(x,60,w,2);
    ctx.fillStyle="#dee0d7";ctx.fillRect(x-4,98,w+8,5);
    if(noise(i+style*29)>.4){glow.fillStyle=noise(i+81)>.5?"#ffe5b4":"#c9d9e2";glow.fillRect(x,21,w,74);}
  }
  const map=new CanvasTexture(canvas),emissive=new CanvasTexture(light);map.colorSpace=emissive.colorSpace=SRGBColorSpace;map.anisotropy=8;
  return {map,emissive};
}

function cityPlan(){
  const floors:Item[][]=[[],[],[]],roofs:Item[]=[],equipment:Item[]=[],trees:Item[]=[],trunks:Item[]=[],cars:Item[]=[],glass:Item[]=[],wheels:Item[]=[],lamps:Item[]=[],bulbs:Item[]=[];
  const footprints:{x:number;z:number;w:number;d:number}[]=[];
  const addTree=(x:number,z:number,seed:number)=>{
    const s=2.2+noise(seed)*1.5;
    trees.push({x,y:s+2,z,sx:s,sy:s*1.25,sz:s,color:["#49634a","#54754f","#3b5c45"][seed%3]});
    trunks.push({x,y:1.3,z,sx:.25,sy:3.5,sz:.25,color:"#655b4c"});
  };
  let seed=0;
  for(let bx=-6;bx<=5;bx++)for(let bz=-6;bz<=5;bz++){
    const cx=bx*120+60,cz=bz*120+60;
    if(cx > -225 && cx < 465 && Math.abs(cz)<225)continue;
    const park=noise(bx*36+bz+700)>.87;
    for(let k=0;k<4;k++){
      seed++;const x=cx+(k%2?23:-23),z=cz+(k>1?23:-23);
      if(park){for(let t=0;t<5;t++)addTree(x+(noise(seed+t)*25-12),z+(noise(seed+t+38)*25-12),seed+t);continue;}
      const w=23+noise(seed+3)*15,d=21+noise(seed+8)*16;
      // Prédios mais baixos perto da arena preservam a vista do estádio.
      const count=Math.floor(3+noise(seed+41)*(Math.hypot(cx,cz)<420?7:20));
      const style=seed%3;
      for(let f=0;f<count;f++)floors[style].push({x,y:1.5+f*3.6,z,sx:w,sy:3.6,sz:d,color:["#e2e2da","#cad4d6","#e3d5c4","#aebfc7"][seed%4]});
      const top=count*3.6-.3;
      roofs.push({x,y:top+.45,z,sx:w+1.3,sy:.9,sz:d+1.3,color:"#849192"});
      equipment.push({x:x+3,y:top+1.6,z:z-2,sx:w*.27,sy:2,sz:d*.23,color:"#b9c0bb"});
      if(count>10){roofs.push({x,y:top+3,z,sx:w*.55,sy:5,sz:d*.55,color:"#7c8c92"});}
      footprints.push({x,z,w,d});
    }
    for(let t=0;t<6;t++){addTree(cx-44+t*17.5,cz-46,seed+t+100);addTree(cx-44+t*17.5,cz+46,seed+t+200);}
  }
  for(let i=0;i<112;i++){const a=i/112*TAU,r=145+noise(i)*20;addTree(Math.cos(a)*r,Math.sin(a)*r*.86,i);}
  // Vagas alinhadas à mesma planta usada na textura do estacionamento.
  for(const side of [-1,1])for(let pair=0;pair<7;pair++)for(let row=0;row<2;row++)for(let col=0;col<62;col++){
    const x=219+col*3.3,z=side*(37+pair*22+row*5.5);
    if((pair===0 && col<5)||noise(pair*301+row*73+col+side*2000)>.58)continue;
    const color=["#deded4","#606b73","#a94c3c","#345e75","#b6ab90","#252e34"][col%6];
    cars.push({x,y:.1,z,sx:1.9,sy:.95,sz:4.3,color});
    glass.push({x,y:.76,z,sx:1.65,sy:.65,sz:2.2,color:"#405865"});
    for(const edge of [-1,1])for(const end of [-1,1])wheels.push({x:x+edge*.94,y:-.25,z:z+end*1.35,sx:.3,sy:.64,sz:.64,color:"#263035"});
  }
  for(let i=0;i<48;i++){
    const a=i/48*TAU,x=Math.cos(a)*172,z=Math.sin(a)*172;
    lamps.push({x,y:3.9,z,sx:.13,sy:9,sz:.13,color:"#53616a"});
    bulbs.push({x,y:8.4,z,sx:1.2,sy:.2,sz:.65});
  }
  for(const x of [209,325,441])for(const z of [-188,-22,22,188]){
    lamps.push({x,y:4.1,z,sx:.14,sy:9.5,sz:.14,color:"#526069"});
    bulbs.push({x,y:8.9,z,sx:2.8,sy:.22,sz:.7});
  }
  return {floors,roofs,equipment,trees,trunks,cars,glass,wheels,lamps,bulbs,footprints};
}

function groundTexture(footprints:{x:number;z:number;w:number;d:number}[]){
  const c=document.createElement("canvas");c.width=c.height=2048;const ctx=c.getContext("2d")!,scale=2048/1800;
  ctx.fillStyle="#737f71";ctx.fillRect(0,0,2048,2048);
  const rect=(x:number,z:number,w:number,d:number,color:string)=>{ctx.fillStyle=color;ctx.fillRect((x-w/2+900)*scale,(z-d/2+900)*scale,w*scale,d*scale);};
  // Calçadas primeiro; asfalto depois. Nenhuma calçada atravessa os cruzamentos.
  for(let r=-840;r<=840;r+=120){rect(r,0,30,1800,"#a9aaa0");rect(0,r,1800,30,"#a9aaa0");}
  for(let r=-840;r<=840;r+=120){rect(r,0,20,1800,"#444d50");rect(0,r,1800,20,"#444d50");}
  for(let r=-840;r<=840;r+=120)for(let t=-885;t<900;t+=12){
    const crossing=Math.abs(((t+60)%120+120)%120-60)<23;
    if(!crossing){rect(r,t,.4,5,"#c8bd92");rect(t,r,5,.4,"#c8bd92");}
  }
  for(let x=-840;x<=840;x+=120)for(let z=-840;z<=840;z+=120){
    rect(x,z,20,20,"#444d50");
    for(const sign of [-1,1])for(let stripe=0;stripe<7;stripe++){
      rect(x-6+stripe*2,z+sign*15,1,4,"#d4d4c4");rect(x+sign*15,z-6+stripe*2,4,1,"#d4d4c4");
    }
  }
  // Uma superquadra contínua reserva a arena e o estacionamento.
  rect(120,0,690,450,"#7f8b72");
  ctx.fillStyle="#a7aca2";ctx.beginPath();ctx.arc(900*scale,900*scale,164*scale,0,TAU);ctx.fill();
  for(const [x,z,w,d] of [[-196,0,88,18],[320,0,320,18],[0,-202,18,84],[0,202,18,84]])rect(x,z,w,d,"#444d50");
  for(const side of [-1,1]){
    rect(184,side*22,44,5,"#afb1a5");
    rect(-198,side*12,80,4,"#b5b8a9");rect(320,side*12,320,4,"#b5b8a9");
    rect(side*12,-202,4,80,"#b5b8a9");rect(side*12,202,4,80,"#b5b8a9");
  }
  // Entradas sem degraus e sem faixas de calçada sobre o asfalto.
  for(const side of [-1,1]){
    rect(198,side*110,14,202,"#444d50");rect(449,side*110,14,202,"#444d50");
    rect(323,side*204,265,14,"#444d50");
  }
  for(const b of footprints){rect(b.x+3,b.z+5,b.w+9,b.d+10,"#505a53");rect(b.x,b.z,b.w+5,b.d+5,"#b6b4a7");}
  for(let i=0;i<65000;i++){ctx.fillStyle=noise(i)>.5?"#ffffff08":"#0000000b";ctx.fillRect(noise(i+71)*2048,noise(i+701)*2048,1,1);}
  const texture=new CanvasTexture(c);texture.colorSpace=SRGBColorSpace;texture.anisotropy=8;return texture;
}

function parkingTexture(){
  const c=document.createElement("canvas");c.width=1024;c.height=1536;const ctx=c.getContext("2d")!;
  const sx=1024/250,sz=1536/380;
  ctx.fillStyle="#444d50";ctx.fillRect(0,0,1024,1536);
  const rect=(x:number,z:number,w:number,d:number,color:string)=>{ctx.fillStyle=color;ctx.fillRect((x-200-w/2)*sx,(z+190-d/2)*sz,w*sx,d*sz);};
  const label=(text:string,x:number,z:number,size=3)=>{ctx.fillStyle="#ecebd7";ctx.font=`bold ${size*sz}px sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(text,(x-200)*sx,(z+190)*sz);};
  for(const side of [-1,1])for(let pair=0;pair<7;pair++)for(let row=0;row<2;row++){
    const z=side*(37+pair*22+row*5.5);
    for(let col=0;col<=62;col++)rect(217.35+col*3.3,z,.12,5.5,"#dcded3");
    rect(319.65,z+side*(row===0?2.75:-2.75),204.6,.12,"#dcded3");
    if(pair===0){for(let col=0;col<5;col++){rect(219+col*3.3,z,3,5.2,"#375e87");label("♿",219+col*3.3,z,2.4);}}
    if(row===0){label(`${side<0?"A":"B"}${pair+1}`,208,z+side*9,3);label("→",300,z+side*10,4);label("←",365,z+side*10,4);}
  }
  // Ilhas de pedestres separam as duas áreas e deixam o acesso central aberto.
  for(const side of [-1,1]){
    rect(325,side*22,232,5,"#afb1a5");
    for(let x=216;x<432;x+=25){rect(x,side*22,6,4,"#667957");}
    for(let stripe=0;stripe<8;stripe++)rect(444,side*(12+stripe*1.6),7,.7,"#e0e2d6");
  }
  label("ESTACIONAMENTO A",320,-185,4);label("ESTACIONAMENTO B",320,185,4);
  label("ENTRADA  ←",386,0,4);label("20",240,0,4);
  const texture=new CanvasTexture(c);texture.colorSpace=SRGBColorSpace;texture.anisotropy=8;return texture;
}

export default function CityEnvironment({night,playing}:{night:boolean;playing:boolean}){
  const plan=useMemo(cityPlan,[]);
  const assets=useMemo(()=>({facades:[0,1,2].map(facade),ground:groundTexture(plan.footprints),parking:parkingTexture(),box:new BoxGeometry(1,1,1),tree:new IcosahedronGeometry(1,1),trunk:new CylinderGeometry(1,1,1,5)}),[plan]);
  useEffect(()=>()=>{assets.facades.forEach(f=>{f.map.dispose();f.emissive.dispose();});assets.ground.dispose();assets.parking.dispose();assets.box.dispose();assets.tree.dispose();assets.trunk.dispose();},[assets]);
  return <group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-3,0]} receiveShadow><planeGeometry args={[5000,5000]}/><meshStandardMaterial color="#778073" roughness={1}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.8,0]} receiveShadow><planeGeometry args={[1800,1800]}/><meshStandardMaterial map={assets.ground} roughness={1}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[325,-.65,0]} receiveShadow><planeGeometry args={[250,380]}/><meshStandardMaterial map={assets.parking} roughness={.96}/></mesh>
    <CityTraffic playing={playing} night={night}/>
    {/* Guarita e cancelas na entrada leste, fora da faixa de circulação. */}
    <mesh position={[461,.85,13]}><boxGeometry args={[4,3.3,4]}/><meshStandardMaterial color="#d2d3c8"/></mesh>
    <mesh position={[461,1.2,10.96]}><boxGeometry args={[3,1.3,.06]}/><meshStandardMaterial color="#3e6576" roughness={.25} metalness={.3}/></mesh>
    {[-1,1].map(side=><group key={side} position={[455,0,side*6]}><mesh><boxGeometry args={[.6,1.5,.6]}/><meshStandardMaterial color="#d2a34c"/></mesh><mesh position={[0,1.7,1.8]} rotation={[.75,0,0]}><boxGeometry args={[.18,.18,4]}/><meshStandardMaterial color="#e1dfce"/></mesh></group>)}
    {/* Guias ficam nas bordas dos lotes; o corredor central permanece livre. */}
    {[-1,1].map(side=><group key={`parking-detail${side}`}>
      <mesh position={[325,-.43,side*190]}><boxGeometry args={[242,.45,.35]}/><meshStandardMaterial color="#c6c8b9"/></mesh>
      {[216,241,266,291,316,341,366,391,416].map(x=><group key={x} position={[x,-.4,side*22]}>
        <mesh><boxGeometry args={[6,.5,4]}/><meshStandardMaterial color="#9ba58c"/></mesh>
        <mesh position={[0,.25,0]}><boxGeometry args={[5.5,.08,3.5]}/><meshStandardMaterial color="#68815a"/></mesh>
      </group>)}
      {[219,225.6].map(x=><mesh key={x} position={[x,.45,side*26]}><boxGeometry args={[.7,2.4,.6]}/><meshStandardMaterial color="#548477" roughness={.5}/></mesh>)}
    </group>)}
    {Array.from({length:28},(_,i)=>-155+i*11.5).filter(z=>Math.abs(z)>18).map(z=><mesh key={`bollard${z}`} position={[178,-.1,z]}><cylinderGeometry args={[.15,.19,1.3,6]}/><meshStandardMaterial color="#abb1a4" metalness={.45}/></mesh>)}
    {plan.floors.map((items,i)=><Instances key={i} items={items} geometry={assets.box} map={assets.facades[i].map} emissiveMap={assets.facades[i].emissive} night={night}/>)}
    <Instances items={plan.roofs} geometry={assets.box}/><Instances items={plan.equipment} geometry={assets.box}/>
    <Instances items={plan.trees} geometry={assets.tree}/><Instances items={plan.trunks} geometry={assets.trunk}/>
    <Instances items={plan.cars} geometry={assets.box}/><Instances items={plan.glass} geometry={assets.box}/><Instances items={plan.wheels} geometry={assets.box}/>
    <Instances items={plan.lamps} geometry={assets.box}/>
    {night&&<instancedMesh args={[assets.box,undefined,plan.bulbs.length]} onUpdate={mesh=>{const o=new Object3D();plan.bulbs.forEach((b,i)=>{o.position.set(b.x,b.y,b.z);o.scale.set(b.sx,b.sy,b.sz);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}}><meshBasicMaterial color="#ffdb9a"/></instancedMesh>}
  </group>;
}
