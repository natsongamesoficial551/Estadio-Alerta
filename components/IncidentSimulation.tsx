"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Line } from "@react-three/drei";
import { CanvasTexture, Group, Mesh, SRGBColorSpace } from "three";

export const incidentSteps = [
  {title:"Princípio de conflito",text:"Dois torcedores começam uma discussão no setor B12. A equipe ainda não recebeu um chamado."},
  {title:"Câmera sinaliza suspeita",text:"A IA aponta movimentos que podem indicar agressão. É um alerta para análise, não uma conclusão automática."},
  {title:"Torcedor pede ajuda",text:"Um torcedor aciona o botão E-12. A localização do setor acompanha o chamado e reforça o alerta da câmera."},
  {title:"Confirmação humana",text:"A central cruza o chamado com as imagens e pede confirmação à equipe próxima. Confirme abaixo para autorizar o atendimento."},
  {title:"Equipe em deslocamento",text:"Dois agentes seguem pelo corredor e pela escada de acesso ao setor. O chamado permanece acompanhado pela central."},
  {title:"Ocorrência atendida",text:"A equipe chega, separa os envolvidos e orienta os torcedores. A central registra o atendimento e encerra o alerta."},
];

function Label({position,text}:{position:[number,number,number];text:string}){
  const asset=useMemo(()=>{const c=document.createElement("canvas"),ctx=c.getContext("2d")!;ctx.font="bold 48px sans-serif";c.width=Math.ceil(ctx.measureText(text).width)+48;c.height=80;ctx.fillStyle="#17323bee";ctx.fillRect(0,0,c.width,80);ctx.strokeStyle="#83b3b3";ctx.lineWidth=2;ctx.strokeRect(1,1,c.width-2,78);ctx.fillStyle="#eff8f1";ctx.font="bold 48px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(text,c.width/2,40);const map=new CanvasTexture(c);map.colorSpace=SRGBColorSpace;return {map,width:c.width/80*1.05};},[text]);
  useEffect(()=>()=>asset.map.dispose(),[asset]);
  return <Billboard position={position}><mesh renderOrder={20}><planeGeometry args={[asset.width,1.05]}/><meshBasicMaterial map={asset.map} transparent depthTest={false} depthWrite={false}/></mesh></Billboard>;
}

function Person({color,gesture=false,walking=false,phase=0}:{color:string;gesture?:boolean;walking?:boolean;phase?:number}){
  const left=useRef<Group>(null),right=useRef<Group>(null),time=useRef(0);
  useFrame((_,dt)=>{time.current+=Math.min(dt,.05);const motion=gesture?Math.sin(time.current*5+phase)*.6:walking?Math.sin(time.current*6+phase)*.45:0;if(left.current)left.current.rotation.x=motion;if(right.current)right.current.rotation.x=-motion;});
  return <group>
    <mesh position={[0,1.22,0]}><cylinderGeometry args={[.23,.25,.65,8]}/><meshStandardMaterial color={color}/></mesh>
    <mesh position={[0,1.78,0]}><sphereGeometry args={[.18,12,8]}/><meshStandardMaterial color="#bb8a66"/></mesh>
    {[-1,1].map(side=><mesh key={side} position={[side*.12,.48,0]}><boxGeometry args={[.17,.9,.22]}/><meshStandardMaterial color="#263b49"/></mesh>)}
    {[-1,1].map((side,i)=><group key={side} ref={i?right:left} position={[side*.3,1.48,0]} rotation={[0,0,gesture?side*.75:side*.12]}><mesh position={[0,-.34,0]}><boxGeometry args={[.14,.7,.16]}/><meshStandardMaterial color={color}/></mesh></group>)}
  </group>;
}

export default function IncidentSimulation({phase,progress,paused}:{phase:number;progress:number;paused:boolean}){
  const pulse=useRef<Mesh>(null);
  useFrame(({clock})=>{if(pulse.current){const size=1+Math.sin(clock.elapsedTime*3)*.035;pulse.current.scale.setScalar(size);}});
  const alert=phase>=6?"#8ac8a6":phase>=2?"#ffb25d":"#e37762";
  const route:[[number,number,number],[number,number,number],[number,number,number],[number,number,number]]=[[12,14.8,67],[0,14.8,67],[0,11.5,63.5],[0,8.1,60]];
  const p=phase===6?1:phase===5?Math.min(progress,1):0;
  const segment=Math.min(2,Math.floor(p*3)),fraction=Math.min(1,p*3-segment);
  const a=route[segment],b=route[segment+1];
  const guard=[a[0]+(b[0]-a[0])*fraction,a[1]+(b[1]-a[1])*fraction,a[2]+(b[2]-a[2])*fraction];
  return <group>
    <group position={[phase>=6?-2.5:-1.25,8.1,60]} rotation={[0,Math.PI/2,0]}><Person color="#b94c3d" gesture={phase<5&&!paused}/></group>
    <group position={[phase>=6?2.5:1.25,8.1,60]} rotation={[0,-Math.PI/2,0]}><Person color="#e5c77e" gesture={phase<5&&!paused} phase={2}/></group>
    <mesh ref={pulse} rotation={[-Math.PI/2,0,0]} position={[0,8.13,60]}><ringGeometry args={[3.2,3.35,64]}/><meshBasicMaterial color={alert} transparent opacity={.8} depthTest={false}/></mesh>
    <Label position={[0,11.3,60]} text={phase>=6?"SETOR B12 · ATENDIDO":"SETOR B12 · ALERTA"}/>
    <group position={[8,17,67]} rotation={[.35,.6,0]}><mesh><boxGeometry args={[1.15,.55,.6]}/><meshStandardMaterial color="#d7dedb"/></mesh><mesh position={[0,0,-.34]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.19,.19,.2,12]}/><meshStandardMaterial color="#254658" emissive={phase>=2?"#ffb25d":"#000000"}/></mesh></group>
    {phase>=2&&phase<6&&<Line points={[[8,17,67],[0,10,60]]} color="#f5b56c" dashed dashSize={.45} gapSize={.3} lineWidth={1.4}/>}
    <Label position={[8,18,67]} text="CÂMERA C-12"/>
    <group position={[-4,14.8,67]}><mesh position={[0,.75,0]}><boxGeometry args={[.28,1.5,.28]}/><meshStandardMaterial color="#6c7e83"/></mesh><mesh position={[0,1.55,0]}><boxGeometry args={[.65,.85,.35]}/><meshStandardMaterial color="#bf4b42"/></mesh><mesh position={[0,1.58,-.2]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.15,.15,.12,16]}/><meshStandardMaterial color="#f1d59a" emissive={phase>=3?"#ffbd58":"#000000"} emissiveIntensity={1}/></mesh></group>
    <group position={[-4.6,14.8,65.9]} rotation={[0,Math.PI,0]}><Person color="#83a0ad" gesture={phase===3&&!paused}/></group>
    <Label position={[-4,17.6,67]} text={phase>=3?"BOTÃO E-12 · ACIONADO":"BOTÃO E-12"}/>
    {phase>=5&&<Line points={route} color="#83cbca" dashed dashSize={.6} gapSize={.35} lineWidth={2}/>}
    {[0,1].map(i=><group key={i} position={[guard[0]+i*1.2,guard[1],guard[2]+i*.7]} rotation={[0,phase>=6?-Math.PI/2:Math.atan2(b[0]-a[0],b[2]-a[2]),0]}><Person color="#409eac" walking={phase===5&&!paused} phase={i*2}/><mesh position={[0,1.37,-.25]}><boxGeometry args={[.3,.16,.04]}/><meshBasicMaterial color="#cce6a7"/></mesh></group>)}
    <Label position={[guard[0],guard[1]+4.7,guard[2]]} text={phase<5?"EQUIPE S-03 · DISPONÍVEL":"EQUIPE S-03"}/>
  </group>;
}
