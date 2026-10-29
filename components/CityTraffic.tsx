"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, Color, CylinderGeometry, InstancedMesh, Object3D, Path } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

function route(x0:number,z0:number,x1:number,z1:number){
  const r=8,p=new Path();
  p.moveTo(x0+r,z0);p.lineTo(x1-r,z0);p.quadraticCurveTo(x1,z0,x1,z0+r);
  p.lineTo(x1,z1-r);p.quadraticCurveTo(x1,z1,x1-r,z1);
  p.lineTo(x0+r,z1);p.quadraticCurveTo(x0,z1,x0,z1-r);
  p.lineTo(x0,z0+r);p.quadraticCurveTo(x0,z0,x0+r,z0);
  return p;
}

export default function CityTraffic({playing,night}:{playing:boolean;night:boolean}){
  const body=useRef<InstancedMesh>(null),cabins=useRef<InstancedMesh>(null),wheels=useRef<InstancedMesh>(null),front=useRef<InstancedMesh>(null),back=useRef<InstancedMesh>(null);
  const elapsed=useRef(0);
  const assets=useMemo(()=>{
    const routes=[route(-240,-240,480,240),route(-600,-600,720,600),route(-120,-480,360,-360)];
    const counts=[18,22,7],speeds=[9,12,8];
    const vehicles=routes.flatMap((path,r)=>[-1,1].flatMap(direction=>Array.from({length:counts[r]},(_,i)=>({path,direction,offset:(i+.25)/counts[r],speed:speeds[r],length:path.getLength(),color:["#deded8","#314b5d","#a4483a","#858c88","#c1ad80","#293337","#e0d1bb"][i%7]}))));
    const wheelParts=[];
    for(const side of [-1,1])for(const end of [-1,1])wheelParts.push(new CylinderGeometry(.34,.34,.22,8).rotateZ(Math.PI/2).translate(side*.94,-.18,end*1.32));
    const wheel=mergeGeometries(wheelParts)!;wheelParts.forEach(g=>g.dispose());
    const body=new BoxGeometry(1.85,.75,4.25),cabin=new BoxGeometry(1.6,.65,2.1).translate(0,.64,-.08);
    const headlights=mergeGeometries([new BoxGeometry(.47,.18,.06).translate(-.59,.1,2.14),new BoxGeometry(.47,.18,.06).translate(.59,.1,2.14)])!;
    const taillights=mergeGeometries([new BoxGeometry(.48,.18,.06).translate(-.59,.1,-2.14),new BoxGeometry(.48,.18,.06).translate(.59,.1,-2.14)])!;
    return {vehicles,body,cabin,wheel,headlights,taillights,object:new Object3D()};
  },[]);
  useEffect(()=>()=>{assets.body.dispose();assets.cabin.dispose();assets.wheel.dispose();assets.headlights.dispose();assets.taillights.dispose();},[assets]);
  useLayoutEffect(()=>{
    assets.vehicles.forEach((vehicle,i)=>body.current!.setColorAt(i,new Color(vehicle.color)));
    body.current!.instanceColor!.needsUpdate=true;
  },[assets]);
  useFrame((_,delta)=>{
    if(playing)elapsed.current+=Math.min(delta,.05);
    assets.vehicles.forEach((v,i)=>{
      const t=((v.offset+v.direction*elapsed.current*v.speed/v.length)%1+1)%1;
      const point=v.path.getPointAt(t),tangent=v.path.getTangentAt(t).multiplyScalar(v.direction);
      // As duas direções usam faixas distintas, sem saltos no fim do percurso.
      assets.object.position.set(point.x-tangent.y*3.5,-.03,point.y+tangent.x*3.5);
      assets.object.rotation.set(0,Math.atan2(tangent.x,tangent.y),0);assets.object.updateMatrix();
      [body,cabins,wheels,front,back].forEach(ref=>ref.current!.setMatrixAt(i,assets.object.matrix));
    });
    [body,cabins,wheels,front,back].forEach(ref=>{ref.current!.instanceMatrix.needsUpdate=true;});
  });
  const count=assets.vehicles.length;
  return <group>
    <instancedMesh ref={body} args={[assets.body,undefined,count]} frustumCulled={false}><meshStandardMaterial roughness={.4} metalness={.35}/></instancedMesh>
    <instancedMesh ref={cabins} args={[assets.cabin,undefined,count]} frustumCulled={false}><meshStandardMaterial color="#354e5c" roughness={.25} metalness={.45}/></instancedMesh>
    <instancedMesh ref={wheels} args={[assets.wheel,undefined,count]} frustumCulled={false}><meshStandardMaterial color="#20282c" roughness={.95}/></instancedMesh>
    <instancedMesh ref={front} args={[assets.headlights,undefined,count]} frustumCulled={false}><meshStandardMaterial color="#e5e4cf" emissive="#ffe2ae" emissiveIntensity={night?2:.05}/></instancedMesh>
    <instancedMesh ref={back} args={[assets.taillights,undefined,count]} frustumCulled={false}><meshStandardMaterial color="#ad352d" emissive="#ff3624" emissiveIntensity={night?1.4:0}/></instancedMesh>
  </group>;
}
