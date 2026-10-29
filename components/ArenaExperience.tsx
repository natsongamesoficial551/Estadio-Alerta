"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useState } from "react";
import { ArrowUpRight, CircleHelp, Eye, Focus, Layers3, Maximize2, Moon, MousePointer2, Pause, Play, RotateCcw, RotateCw, Shield, SlidersHorizontal, Sun, Users, X } from "lucide-react";
import { incidentSteps } from "./IncidentSimulation";
import type { ArenaView } from "./StadiumScene";

const StadiumScene = dynamic(() => import("./StadiumScene"), { ssr: false });

const views: { id: ArenaView; name: string; detail: string; number: string }[] = [
  { id: "overview", name: "Visão geral", detail: "Toda a arquitetura da arena", number: "01" },
  { id: "stands", name: "Arquibancadas", detail: "Perto de quem faz a festa", number: "02" },
  { id: "pitch", name: "À beira do campo", detail: "O jogo em outra perspectiva", number: "03" },
  { id: "city", name: "Arena e cidade", detail: "O estádio no seu entorno", number: "04" },
  { id: "security", name: "Segurança", detail: "Câmeras, botões e equipes nos setores", number: "05" },
];

class SceneBoundary extends Component<{children:React.ReactNode;onError:()=>void},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){this.props.onError();}
  render(){return this.state.failed?null:this.props.children;}
}

export default function ArenaExperience() {
  const [incidentPhase, setIncidentPhase] = useState(0);
  const [incidentTime, setIncidentTime] = useState(0);
  const [incidentPaused, setIncidentPaused] = useState(false);
  const advanceIncident = () => { setIncidentTime(0); setIncidentPhase(p => Math.min(6,p+1)); };
  useEffect(() => {
    if (!incidentPhase || incidentPhase>=6 || incidentPhase===4 || incidentPaused) return;
    const interval = window.setInterval(() => setIncidentTime(t => t+.1), 100);
    return () => window.clearInterval(interval);
  }, [incidentPhase, incidentPaused]);
  useEffect(() => {
    if (incidentTime >= (incidentPhase===5?8:6)) { setIncidentTime(0); setIncidentPhase(p => Math.min(6,p+1)); }
  }, [incidentTime,incidentPhase]);
  const startIncident = () => { setIncidentPhase(1); setIncidentTime(0); setIncidentPaused(false); setView("incident"); setReset(n=>n+1); setRotating(false); setCrowd(true); setSettings(false); setHelp(false); };
  const closeIncident = () => { setIncidentPhase(0); setIncidentTime(0); setView("overview"); setReset(n=>n+1); };
  const [preview, setPreview] = useState(false);
  const [view, setView] = useState<ArenaView>("overview");
  const [night, setNight] = useState(false);
  const [roof, setRoof] = useState(true);
  const [crowd, setCrowd] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [failed, setFailed] = useState(false);
  const handleError = useCallback(() => setFailed(true), []);
  const handleReady = useCallback(() => setReady(true), []);
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(false);
  const [help, setHelp] = useState(false);
  const [reset, setReset] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const probe = document.createElement("canvas");
    const context = probe.getContext("webgl2");
    if (!context) setFailed(true);
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  }, []);
  useEffect(() => {
    const syncFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreview(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);
  const enterPreview = () => { setSettings(false); setHelp(false); setPreview(true); };
  const currentView = views.find((item) => item.id === view) ?? {name:"Setor B12"};

  const resetCamera = () => { setView("overview"); setReset((n) => n + 1); setRotating(false); };
  const toggleFullscreen = async () => {
    if (document.fullscreenElement) { await document.exitFullscreen(); setFullscreen(false); }
    else { await document.documentElement.requestFullscreen?.(); setFullscreen(true); }
  };

  return <main className={`experience ${preview ? "is-preview" : ""} ${incidentPhase ? "has-incident" : ""}`} onDoubleClick={() => { if (preview) setPreview(false); }}>
    <div className="scene" aria-label="Maquete interativa 3D da Arena CVG">
      <SceneBoundary onError={handleError}><StadiumScene view={view} night={night} roof={roof} crowd={crowd} playing={playing} rotating={rotating} reset={reset} onReady={handleReady} onError={handleError} incidentPhase={incidentPhase} incidentProgress={incidentTime/8} incidentPaused={incidentPaused} /></SceneBoundary>
    </div>
    <div className="scene-vignette" />

    <header className="topbar">
      <a className="brand" href="/" aria-label="Estádio Alerta, início">
        <span className="brand-symbol"><Shield size={23} strokeWidth={1.8} /><span /></span>
        <span>estádio<span className="brand-light">alerta</span><small>LABORATÓRIO DE FUTUROS</small></span>
      </a>
      <div className="project-pill"><span className="status-dot" /> Maquete digital <span className="pill-line" /> ODS 9</div>
      <div className="topbar-actions">
        <button className="outline-button preview-button" onClick={enterPreview} title="Ver somente o 3D. Para voltar, pressione Esc ou dê dois cliques na cena." aria-label="Modo preview"><Eye size={16} /><span>Modo preview</span></button>
        <span className="version">ESTUDO 001 <span>·</span> V.01</span>
        <button className="icon-button help-button" onClick={() => setHelp(true)} title="Como explorar" aria-label="Como explorar"><CircleHelp size={19} /></button>
        <button className="outline-button" aria-label={fullscreen ? "Sair da tela cheia" : "Tela cheia"} onClick={toggleFullscreen}><Maximize2 size={15} /><span>{fullscreen ? "Sair da tela cheia" : "Tela cheia"}</span></button>
      </div>
    </header>

    <section className="intro"><h1>Arena CVG</h1></section>

    {!incidentPhase && <button className="simulation-launch" onClick={startIncident}><Shield size={17}/> Simular ocorrência <ArrowUpRight size={15}/></button>}
    {incidentPhase>0 && <section className="simulation-panel" aria-label="Simulação de segurança">
      <div className="simulation-heading"><span>ESTÁDIO ALERTA · DEMONSTRAÇÃO</span><button onClick={closeIncident} aria-label="Encerrar simulação"><X size={18}/></button></div>
      <p className="simulation-location">SETOR B12 · CÂMERA C-12 · BOTÃO E-12</p>
      <ol className="simulation-steps">{incidentSteps.map((step,i)=><li key={step.title} className={incidentPhase===i+1?"current":incidentPhase>i+1?"complete":""}><span>{incidentPhase>i+1?"✓":String(i+1).padStart(2,"0")}</span>{step.title}</li>)}</ol>
      <div className="simulation-explanation" aria-live="polite"><h2>{incidentSteps[incidentPhase-1].title}</h2><p>{incidentSteps[incidentPhase-1].text}</p></div>
      {incidentPhase===4 ? <button className="primary-button" onClick={()=>{setIncidentPaused(false);advanceIncident();}}>Confirmar e enviar equipe <Shield size={16}/></button> : incidentPhase===6 ? <button className="primary-button" onClick={startIncident}>Reiniciar demonstração <RotateCcw size={16}/></button> : <div className="simulation-actions"><button onClick={()=>setIncidentPaused(p=>!p)}>{incidentPaused?<Play size={15}/>:<Pause size={15}/>} {incidentPaused?"Continuar":"Pausar"}</button>{incidentPhase!==5&&<button onClick={advanceIncident}>Próxima etapa <ArrowUpRight size={15}/></button>}</div>}
      <small>Cena ilustrativa com tempos acelerados. A detecção por IA e o envio de alertas são simulados.</small>
    </section>}
    <aside className="explorer" aria-label="Perspectivas da arena">
      <div className="explorer-heading"><span>EXPLORE A ARENA</span><span className="tiny-dot" /></div>
      <div className="view-options">{views.map((item) => <button key={item.id} className={`view-option ${view === item.id ? "active" : ""}`} onClick={() => { setView(item.id); setReset((n) => n + 1); setRotating(false); }} aria-pressed={view === item.id}>
        <span className="view-number">{item.number}</span><span className="view-text"><strong>{item.name}</strong><small>{item.detail}</small></span><ArrowUpRight size={17} />
      </button>)}</div>
      <div className="explorer-footer"><MousePointer2 size={14} /><span>Arraste para descobrir outros ângulos</span></div>
    </aside>

    <div className="scene-caption"><span className="caption-mark" /><span>ARENA CVG <span className="caption-separator">/</span> ESTÁDIO FICTÍCIO</span></div>

    <div className="bottom-ui">
      <div className="information-row">
        <div className="arena-facts"><span><Users size={15} /><strong>48.000</strong> lugares projetados</span><span className="fact-divider" /><span><span className="grass-icon" /><strong>105 × 68 m</strong> campo</span></div>
      </div>
      <div className="controlbar">
        <div className="view-label"><Focus size={19} /><div><span>PERSPECTIVA ATUAL</span><strong>{currentView.name}</strong></div></div>
        <div className="controlbar-center">
          <div className="segmented" aria-label="Iluminação"><button onClick={() => setNight(false)} className={!night ? "selected" : ""} aria-pressed={!night}><Sun size={15} /><span>Fim de tarde</span></button><button onClick={() => setNight(true)} className={night ? "selected" : ""} aria-pressed={night}><Moon size={15} /><span>Noite</span></button></div>
          <span className="control-divider" />
          <button className={`tool-button ${rotating ? "is-on" : ""}`} onClick={() => setRotating(!rotating)} aria-pressed={rotating} title="Girar câmera"><RotateCw size={17} /><span>Girar</span></button>
          <button className={`tool-button ${!roof ? "is-on" : ""}`} onClick={() => setRoof(!roof)} aria-pressed={!roof} title="Alternar cobertura"><Layers3 size={17} /><span>Cobertura</span></button>
          <button className="tool-button icon-only" onClick={() => setPlaying(!playing)} title={playing ? "Pausar animações" : "Retomar animações"} aria-label={playing ? "Pausar animações" : "Retomar animações"}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
        </div>
        <div className="controlbar-right"><button className="icon-button" onClick={resetCamera} aria-label="Restaurar câmera" title="Restaurar câmera"><RotateCcw size={17} /></button><button className={`icon-button ${settings ? "is-on" : ""}`} onClick={() => setSettings(!settings)} aria-label="Configurações da cena" title="Configurações da cena"><SlidersHorizontal size={18} /></button></div>
      </div>
      <div className="footer-hints"><span><MousePointer2 size={12} /> Arraste para orbitar <span>·</span> Role para aproximar</span><span>ARQUITETURA + INOVAÇÃO + INFRAESTRUTURA <ArrowUpRight size={12} /></span></div>
    </div>

    {settings && <section className="settings-panel"><div className="panel-heading"><strong>Ambiente da arena</strong><button onClick={() => setSettings(false)} aria-label="Fechar configurações"><X size={17} /></button></div><button className="toggle-row" aria-pressed={crowd} onClick={() => setCrowd(!crowd)}><span>Torcedores nas arquibancadas</span><span className={`switch ${crowd ? "on" : ""}`}><i /></span></button><button className="toggle-row" aria-pressed={playing} onClick={() => setPlaying(!playing)}><span>Movimento da cena</span><span className={`switch ${playing ? "on" : ""}`}><i /></span></button><p>Modelo conceitual com demonstração de segurança. Use “Simular ocorrência” para acompanhar o atendimento.</p></section>}

    {!ready && !failed && <div className="loading-scene"><span className="loading-ring" /><strong>Preparando a Arena CVG</strong><span>Construindo uma nova perspectiva.</span></div>}
    {failed && <div className="loading-scene" role="alert"><strong>A cena 3D não pôde ser aberta.</strong><span>Use um navegador com WebGL 2 e aceleração gráfica ativada.</span><button className="outline-button" onClick={() => window.location.reload()}>Tentar novamente</button></div>}
    {help && <div className="modal-backdrop" onClick={() => setHelp(false)}><section className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={(e) => e.stopPropagation()}><button className="modal-close icon-button" onClick={() => setHelp(false)} aria-label="Fechar ajuda"><X size={20} /></button><span className="modal-icon"><MousePointer2 size={26} /></span><p className="eyebrow">SEU PONTO DE VISTA</p><h2 id="help-title">Entre no jogo.</h2><p>Arraste a cena para girar a câmera. Use a roda do mouse ou o gesto de pinça para se aproximar. No celular, use um dedo para girar e dois para aproximar. O modo preview esconde a interface. Para voltar, pressione Esc ou dê dois cliques ou toques na cena.</p><div className="help-shortcuts"><span><Eye size={18} /> Quatro perspectivas prontas</span><span><Sun size={18} /> Dois ambientes de luz</span><span><Layers3 size={18} /> Cobertura removível</span></div><button className="primary-button" onClick={() => setHelp(false)}>Explorar a arena <ArrowUpRight size={17} /></button></section></div>}
  </main>;
}
