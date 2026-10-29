"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { BoxGeometry, CanvasTexture, Color, InstancedMesh, Matrix4, Object3D, SphereGeometry, SRGBColorSpace } from "three";

type Part = { matrix: Matrix4; color: string };
type Sector = { index: number; x: number; z: number; rotation: number; team: string };
const sectors: Sector[] = Array.from({ length: 16 }, (_, index) => {
  const angle = Math.PI / 2 + (index - 11) * Math.PI / 8;
  return { index, x: Math.cos(angle) * 89.8, z: Math.sin(angle) * 67, rotation: Math.PI / 2 - angle, team: String((index + 7) % 16 + 1).padStart(2, "0") };
});

function SectorSign({ sector }: { sector: Sector }) {
  const map = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const code = String(sector.index + 1).padStart(2, "0");
    ctx.fillStyle = "#17333c"; ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = "#83c6be"; ctx.lineWidth = 8; ctx.strokeRect(4, 4, 504, 248);
    ctx.textAlign = "center";
    ctx.fillStyle = "#eaf4e9"; ctx.font = "bold 48px sans-serif"; ctx.fillText(`SETOR B${code}`, 256, 62);
    ctx.font = "30px sans-serif"; ctx.fillStyle = "#9cd0cc"; ctx.fillText(`CÂMERA C-${code} · EQUIPE S-${sector.team}`, 256, 119);
    ctx.fillStyle = "#edb38b"; ctx.font = "bold 32px sans-serif"; ctx.fillText(`EMERGÊNCIA · E-${code}`, 256, 177);
    ctx.fillStyle = "#b9ccc8"; ctx.font = "23px sans-serif"; ctx.fillText("BOTÃO VERMELHO ABAIXO", 256, 223);
    const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
    return texture;
  }, [sector]);
  useEffect(() => () => map.dispose(), [map]);
  return <group position={[sector.x, 14.8, sector.z]} rotation={[0, sector.rotation, 0]}>
    <mesh position={[-4, 3.1, -.22]} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[3.4, 1.7]} /><meshBasicMaterial map={map} />
    </mesh>
  </group>;
}

function Instances({ parts, round = false }: { parts: Part[]; round?: boolean }) {
  const ref = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => round ? new SphereGeometry(1, 10, 8) : new BoxGeometry(1, 1, 1), [round]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useLayoutEffect(() => {
    const mesh = ref.current!;
    parts.forEach((part, i) => { mesh.setMatrixAt(i, part.matrix); mesh.setColorAt(i, new Color(part.color)); });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [parts]);
  return <instancedMesh ref={ref} args={[geometry, undefined, parts.length]}>
    <meshStandardMaterial roughness={.65} metalness={.12} />
  </instancedMesh>;
}

/** Equipamentos permanentes; o B12 é substituído pelos atores durante a ocorrência. */
export default function StadiumSecurity({ incident }: { incident: boolean }) {
  const activeSectors = useMemo(() => sectors.filter(s => !incident || s.index !== 11), [incident]);
  const { boxes, heads } = useMemo(() => {
    const boxes: Part[] = [], heads: Part[] = [];
    const parent = new Object3D(), item = new Object3D();
    for (const sector of activeSectors) {
      parent.position.set(sector.x, 14.8, sector.z); parent.rotation.set(0, sector.rotation, 0); parent.updateMatrix();
      const add = (x: number, y: number, z: number, w: number, h: number, d: number, color: string, round = false, tilt = 0) => {
        item.position.set(x, y, z); item.rotation.set(tilt, 0, 0); item.scale.set(w, h, d); item.updateMatrix();
        (round ? heads : boxes).push({ matrix: parent.matrix.clone().multiply(item.matrix), color });
      };
      // Câmera com suporte, lente escura, cobertura e indicador de operação.
      add(8, 1.15, .25, .12, 2.3, .12, "#657c85");
      add(8, 2.25, -.1, .14, .14, .8, "#657c85");
      add(8, 2.35, -.55, 1.15, .55, .7, "#e0e6df", false, .3);
      add(8, 2.23, -.94, .4, .31, .13, "#193f52", false, .3);
      add(8.38, 2.18, -.93, .09, .09, .04, "#86d6ab");
      // Totem de emergência: base, suporte, caixa e botão voltados ao corredor.
      add(-4, .06, 0, .85, .12, .7, "#445d66");
      add(-4, 1.5, .1, .16, 3, .16, "#71868a");
      add(-4, 1.55, 0, .65, .85, .35, "#bf4b42");
      add(-4, 1.58, -.22, .26, .26, .14, "#f1d59a", true);
      add(-4, 3.1, -.12, 3.5, 1.8, .16, "#23404a");
      // Dois agentes em cada posto, fora das cadeiras e dos acessos radiais.
      for (let agent = 0; agent < 2; agent++) {
        const x = 12 + agent * 1.2;
        add(x, 1.22, 0, .47, .65, .38, "#409eac");
        add(x, 1.78, 0, .18, .18, .18, agent ? "#936746" : "#bb8a66", true);
        add(x, 1.94, 0, .4, .1, .36, "#1c4353");
        for (const side of [-1, 1]) {
          add(x + side * .12, .48, 0, .17, .9, .22, "#263b49");
          add(x + side * .3, 1.12, 0, .14, .7, .16, "#409eac");
          add(x + side * .12, .07, -.07, .2, .14, .34, "#203039");
        }
        add(x, 1.37, -.21, .3, .16, .04, "#cce6a7");
        add(x + .25, 1.47, -.21, .09, .18, .08, "#1e3039");
      }
    }
    return { boxes, heads };
  }, [activeSectors]);
  return <group><Instances parts={boxes} /><Instances parts={heads} round />{activeSectors.map(sector => <SectorSign key={sector.index} sector={sector} />)}</group>;
}
