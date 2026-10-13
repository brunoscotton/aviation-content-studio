"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Airplay, Archive, ArrowDownToLine, ArrowLeft, ArrowRight, Bell, BookOpen, Check, CheckCheck, ChevronDown,
  CircleHelp, Clock3, FilePlus2, FileText, FolderKanban, Gauge, History, Menu, MessageSquareText, Moon,
  MoreHorizontal, PencilLine, Plane, Plus, Search, Send, Settings2, ShieldCheck, Sparkles, Sun, X,
} from "lucide-react";
import { demoProjects, type Project, type Script, type Source, type Version, canTransition, transitionStatus } from "@/lib/domain";

type Tab = "Visão geral" | "Descobrir pautas" | "Biblioteca" | "Preferências";
const statusLabels: Record<Project["status"], string> = { idea: "Ideia", researching: "Pesquisando", research_review: "Pesquisa em revisão", drafting: "Em produção", script_review: "Roteiro em revisão", approved: "Aprovado", archived: "Arquivado" };
const statusTone: Record<Project["status"], string> = { idea: "neutral", researching: "blue", research_review: "amber", drafting: "blue", script_review: "violet", approved: "green", archived: "neutral" };
const blankScript: Script = { hook: "", development: [{ title: "", text: "", scene: "" }], analogies: [], examples: [], ending: "", estimatedSeconds: 45, sourceUrls: [] };
const id = () => Math.random().toString(36).slice(2, 10);

function timeLabel() { return new Date().toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
function prettyStatus(status: Project["status"]) { return statusLabels[status]; }

export default function Studio({ demo }: { demo: boolean }) {
  const [projects, setProjects] = useState<Project[]>(demoProjects);
  const [activeTab, setActiveTab] = useState<Tab>("Visão geral");
  const [selected, setSelected] = useState<string | null>(null);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [dark, setDark] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("Aviação geral");
  const [audience, setAudience] = useState("Curiosos por aviação");
  const [format, setFormat] = useState<"Reels" | "Carrossel">("Reels");
  const [period, setPeriod] = useState("30 dias");
  const [newTitle, setNewTitle] = useState("");
  const [newFormat, setNewFormat] = useState<"Reels" | "Carrossel">("Reels");
  const [draft, setDraft] = useState<Script>(blankScript);
  const [instruction, setInstruction] = useState("");
  const [message, setMessage] = useState("");
  const [activeVersion, setActiveVersion] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("aviation-studio-projects-v1");
    if (saved) { try { setProjects(JSON.parse(saved) as Project[]); } catch { localStorage.removeItem("aviation-studio-projects-v1"); } }
    const pref = localStorage.getItem("aviation-studio-theme");
    if (pref === "dark") setDark(true);
  }, []);
  useEffect(() => { localStorage.setItem("aviation-studio-projects-v1", JSON.stringify(projects)); }, [projects]);
  useEffect(() => { localStorage.setItem("aviation-studio-theme", dark ? "dark" : "light"); }, [dark]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 3200); return () => clearTimeout(timer); }, [toast]);

  const project = projects.find((item) => item.id === selected) ?? null;
  const filtered = useMemo(() => projects.filter((p) => p.title.toLowerCase().includes(query.toLowerCase())), [projects, query]);
  const counts = useMemo(() => ({ total: projects.filter((p) => p.status !== "archived").length, review: projects.filter((p) => p.status === "research_review" || p.status === "script_review").length, approved: projects.filter((p) => p.status === "approved").length }), [projects]);

  function updateProject(idToUpdate: string, update: (current: Project) => Project) {
    setProjects((items) => items.map((item) => item.id === idToUpdate ? update(item) : item));
  }
  function changeStatus(target: Project, next: Project["status"], label: string) {
    try {
      const status = transitionStatus(target.status, next);
      updateProject(target.id, (current) => ({ ...current, status, updatedAt: timeLabel(), events: [{ label, at: timeLabel() }, ...current.events] }));
      setToast(label);
    } catch (error) { setToast(error instanceof Error ? error.message : "Não foi possível atualizar o projeto."); }
  }
  function createIdea() {
    if (!newTitle.trim()) return setToast("Informe um título para a pauta.");
    const item: Project = { id: id(), title: newTitle.trim(), category, format: newFormat, audience, status: "idea", updatedAt: timeLabel(), researchSummary: "Pesquisa ainda não iniciada.", verifiedPoints: [], divergences: [], gaps: ["Pesquisa ainda não iniciada."], sources: [], versions: [], events: [{ label: "Ideia criada", at: timeLabel() }] };
    setProjects((items) => [item, ...items]); setNewTitle(""); setShowNew(false); setSelected(item.id); setToast("Ideia adicionada à biblioteca.");
  }
  async function runResearch() {
    if (topic.trim().length < 4) return setToast("Escreva um tema com pelo menos 4 caracteres.");
    setBusy(true);
    try {
      const res = await fetch("/api/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, category, audience, format, period }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao pesquisar.");
      const sources: Source[] = data.sources.map((source: { title: string; url: string }) => ({ ...source, accessedAt: new Date().toISOString(), evidence: data.summary.slice(0, 200) }));
      const item: Project = { id: id(), title: topic.trim(), category, format, audience, status: "research_review", updatedAt: timeLabel(), researchSummary: data.summary, verifiedPoints: data.verifiedPoints, divergences: data.divergences, gaps: data.gaps, sources, versions: [], events: [{ label: "Pesquisa concluída · revisão humana pendente", at: timeLabel() }] };
      setProjects((items) => [item, ...items]); setTopic(""); setShowDiscovery(false); setSelected(item.id); setToast("Pesquisa salva. Revise as fontes antes da aprovação.");
    } catch (error) { setToast(error instanceof Error ? error.message : "Não foi possível concluir a pesquisa."); }
    finally { setBusy(false); }
  }
  async function generateScript(revise = false) {
    if (!project) return;
    if (revise && instruction.trim().length < 4) return setToast("Descreva a revisão que deseja fazer.");
    if (!revise && project.status !== "research_review") return setToast("Aprove a pesquisa antes de gerar o roteiro.");
    setBusy(true);
    try {
      const res = await fetch("/api/script", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: revise ? "revise" : "draft", title: project.title, research: project.researchSummary, verifiedPoints: project.verifiedPoints, sources: project.sources, currentScript: revise ? draft : null, instruction: revise ? instruction : "" }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error ?? "Falha ao gerar roteiro.");
      const parsed = data.script as Script; setDraft(parsed); setActiveVersion("");
      const version: Version = { id: id(), createdAt: timeLabel(), content: parsed, note: revise ? `Revisão: ${instruction}` : "Primeiro rascunho", approved: false };
      updateProject(project.id, (current) => ({ ...current, status: "script_review", updatedAt: timeLabel(), versions: [version, ...current.versions], events: [{ label: revise ? "Nova versão de revisão criada" : "Roteiro gerado · revisão humana pendente", at: timeLabel() }, ...current.events] }));
      setInstruction(""); setToast("Nova versão criada para revisão.");
    } catch (error) { setToast(error instanceof Error ? error.message : "Não foi possível gerar o roteiro."); }
    finally { setBusy(false); }
  }
  function saveManualEdit() {
    if (!project) return;
    const version: Version = { id: id(), createdAt: timeLabel(), content: draft, note: "Edição manual", approved: false };
    updateProject(project.id, (current) => ({ ...current, status: "script_review", versions: [version, ...current.versions], updatedAt: timeLabel(), events: [{ label: "Edição manual salva em nova versão", at: timeLabel() }, ...current.events] }));
    setToast("Nova versão salva.");
  }
  function exportScript(type: "md" | "txt") {
    if (!project) return;
    const script = draft; const body = `${project.title}\n\nGANCHO\n${script.hook}\n\n${script.development.map((p) => `${p.title}\n${p.text}\nCena: ${p.scene}`).join("\n\n")}\n\nANALOGIAS\n${script.analogies.map((x) => `- ${x}`).join("\n")}\n\nEXEMPLOS\n${script.examples.map((x) => `- ${x}`).join("\n")}\n\nENCERRAMENTO\n${script.ending}\n\nDuração estimada: ${script.estimatedSeconds}s\n\nFONTES\n${script.sourceUrls.join("\n")}`;
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${type}`; link.click(); URL.revokeObjectURL(url); setToast("Arquivo exportado.");
  }
  function sendMessage() { if (!message.trim()) return; if (!project) return; updateProject(project.id, (current) => ({ ...current, events: [{ label: `Nota editorial: ${message.trim()}`, at: timeLabel() }, ...current.events] })); setMessage(""); setToast("Nota adicionada ao histórico do projeto."); }
  function savePreference(key: string, value: string) { localStorage.setItem(`aviation-pref-${key}`, value); setToast("Preferência salva neste dispositivo."); }

  const navItems: { label: Tab; icon: typeof Gauge }[] = [{ label: "Visão geral", icon: Gauge }, { label: "Descobrir pautas", icon: Sparkles }, { label: "Biblioteca", icon: FolderKanban }, { label: "Preferências", icon: Settings2 }];
  function goTo(tab: Tab) { setActiveTab(tab); setSelected(null); setMobileNav(false); if (tab === "Descobrir pautas") setShowDiscovery(true); }
  function badge(status: Project["status"]) { return <span className={`status-badge ${statusTone[status]}`}><i />{prettyStatus(status)}</span>; }

  return <main className={`studio ${dark ? "dark-mode" : ""}`}>
    <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
      <div className="brand"><div className="brand-mark"><Plane size={20} fill="currentColor" /></div><div><strong>Aviation<span>Studio</span></strong><small>CONTENT WORKSPACE</small></div><button className="icon-button sidebar-close" onClick={() => setMobileNav(false)} aria-label="Fechar menu"><X size={18}/></button></div>
      <div className="workspace-pill"><div className="workspace-avatar">{demo ? "D" : "A"}</div><div className="workspace-name"><b>{demo ? "Workspace demo" : "Workspace privado"}</b><small>{demo ? "Acesso local" : "Área editorial"}</small></div><ChevronDown size={14}/></div>
      <div className="nav-caption">WORKSPACE</div><nav className="main-nav">{navItems.map(({ label, icon: Icon }) => <button key={label} onClick={() => goTo(label)} className={activeTab === label && !selected ? "nav-item active" : "nav-item"}><Icon size={17}/><span>{label}</span>{label === "Biblioteca" && <span className="nav-count">{projects.length}</span>}</button>)}</nav>
      <div className="nav-caption recent-caption">RECENTES <button aria-label="Mais opções"><MoreHorizontal size={15}/></button></div><div className="recent-list">{projects.slice(0, 4).map((p) => <button key={p.id} className={selected === p.id ? "recent-item active" : "recent-item"} onClick={() => { setSelected(p.id); setMobileNav(false); }}><span className={`recent-dot ${statusTone[p.status]}`}/><span>{p.title}</span></button>)}</div>
      <div className="sidebar-bottom"><div className="sidebar-hint"><div className="hint-icon"><ShieldCheck size={17}/></div><div><b>Editorial first</b><p>Fontes claras. Aprovação humana.</p></div></div><button className="profile-row" onClick={() => goTo("Preferências")}><div className="profile-avatar">BS</div><div className="profile-name"><b>{demo ? "Bruno (demo)" : "Editor"}</b><small>Diretor editorial</small></div><MoreHorizontal size={17}/></button></div>
    </aside>
    {mobileNav && <button className="mobile-overlay" onClick={() => setMobileNav(false)} aria-label="Fechar navegação"/>}
    <section className="main-column">
      <header className="topbar"><div className="topbar-left"><button className="icon-button menu-toggle" onClick={() => setMobileNav(true)} aria-label="Abrir menu"><Menu size={19}/></button><div className="breadcrumb">Workspace <span>/</span> <b>{project ? "Editor de projeto" : activeTab}</b></div></div><div className="topbar-actions"><div className="search-box"><Search size={15}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar projetos..." aria-label="Buscar projetos"/><kbd>⌘ K</kbd></div><button className="icon-button" onClick={() => setDark(!dark)} aria-label="Alternar tema">{dark ? <Sun size={17}/> : <Moon size={17}/>}</button><button className="icon-button notification" aria-label="Notificações"><Bell size={17}/><i/></button><div className="top-avatar">BS</div></div></header>
      {demo && <div className="demo-banner"><span><CircleHelp size={15}/><b>Modo demonstração</b> · exemplos fictícios; nenhuma pesquisa real foi executada.</span><a href="/README.md" target="_blank">Configurar integrações <ArrowRight size={13}/></a></div>}
      <div className="page-scroll">
        {project ? <ProjectEditor project={project} draft={draft} setDraft={setDraft} activeVersion={activeVersion} setActiveVersion={setActiveVersion} busy={busy} instruction={instruction} setInstruction={setInstruction} message={message} setMessage={setMessage} onBack={() => { setSelected(null); setActiveTab("Biblioteca"); }} onApproveResearch={() => changeStatus(project, "drafting", "Pesquisa aprovada pelo editor")} onGenerate={() => generateScript()} onRevise={() => generateScript(true)} onSave={saveManualEdit} onApprove={() => { const v = project.versions[0]; updateProject(project.id, (current) => ({ ...current, status: "approved", versions: current.versions.map((item) => item.id === v?.id ? { ...item, approved: true } : item), events: [{ label: "Roteiro aprovado pelo editor", at: timeLabel() }, ...current.events] })); setToast("Roteiro aprovado."); }} onExport={exportScript} onMessage={sendMessage} onRestore={(version) => { setDraft(version.content); setToast("Versão carregada no editor. Salve para criar uma nova versão."); }} badge={badge}/>
        : activeTab === "Visão geral" ? <Dashboard projects={projects} counts={counts} badge={badge} onSelect={(id) => setSelected(id)} onDiscover={() => setShowDiscovery(true)} onNew={() => setShowNew(true)} onTab={setActiveTab}/>
        : activeTab === "Biblioteca" ? <Library projects={filtered} query={query} badge={badge} onSelect={setSelected} onNew={() => setShowNew(true)}/>
        : activeTab === "Preferências" ? <Preferences onSave={savePreference}/>
        : <DiscoveryIntro onStart={() => setShowDiscovery(true)} onNew={() => setShowNew(true)}/>}
      </div>
    </section>
    {showDiscovery && <Modal title="Descobrir novas pautas" eyebrow="RESEARCH DESK" onClose={() => setShowDiscovery(false)}><p className="modal-lead">Pesquise fontes atuais para encontrar ângulos editoriais com rastreabilidade. Os resultados precisam de aprovação humana.</p><div className="field"><label htmlFor="topic">Tema ou pergunta</label><input id="topic" autoFocus value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex.: como os aviões evitam colisões no ar?" maxLength={180}/></div><div className="field-grid"><div className="field"><label htmlFor="category">Categoria</label><select id="category" value={category} onChange={(e) => setCategory(e.target.value)}><option>Aviação geral</option><option>Ciência & aviação</option><option>Segurança & operações</option><option>História da aviação</option><option>Tecnologia aeronáutica</option><option>Viagem & experiência</option></select></div><div className="field"><label htmlFor="audience">Público</label><select id="audience" value={audience} onChange={(e) => setAudience(e.target.value)}><option>Curiosos por aviação</option><option>Avgeeks iniciantes</option><option>Público geral</option><option>Estudantes de aviação</option></select></div></div><div className="field-grid"><div className="field"><label>Formato</label><div className="choice-row"><button className={format === "Reels" ? "choice selected" : "choice"} onClick={() => setFormat("Reels")}><Airplay size={15}/> Reels</button><button className={format === "Carrossel" ? "choice selected" : "choice"} onClick={() => setFormat("Carrossel")}><FileText size={15}/> Carrossel</button></div></div><div className="field"><label htmlFor="period">Período de interesse</label><select id="period" value={period} onChange={(e) => setPeriod(e.target.value)}><option>7 dias</option><option>30 dias</option><option>90 dias</option><option>Sem período</option></select></div></div><div className="source-note"><ShieldCheck size={16}/><span>Prioridade para fontes oficiais como ANAC, DECEA, FAA, EASA e fabricantes. Conteúdo externo será tratado como dado, não como instrução.</span></div><div className="modal-footer"><button className="button secondary" onClick={() => setShowDiscovery(false)}>Cancelar</button><button className="button primary" onClick={runResearch} disabled={busy}>{busy ? <><span className="spinner"/> Pesquisando...</> : <><Search size={15}/> Pesquisar com fontes</>}</button></div></Modal>}
    {showNew && <Modal title="Nova pauta" eyebrow="BIBLIOTECA EDITORIAL" onClose={() => setShowNew(false)}><p className="modal-lead">Adicione uma ideia manualmente. Ela começa sem pesquisa e sem fontes.</p><div className="field"><label htmlFor="new-title">Título da pauta</label><input autoFocus id="new-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Uma pergunta que seu público faria" maxLength={180}/></div><div className="field-grid"><div className="field"><label>Categoria</label><select value={category} onChange={(e) => setCategory(e.target.value)}><option>Aviação geral</option><option>Ciência & aviação</option><option>Segurança & operações</option><option>História da aviação</option><option>Tecnologia aeronáutica</option></select></div><div className="field"><label>Formato</label><select value={newFormat} onChange={(e) => setNewFormat(e.target.value as "Reels" | "Carrossel")}><option>Reels</option><option>Carrossel</option></select></div></div><div className="modal-footer"><button className="button secondary" onClick={() => setShowNew(false)}>Cancelar</button><button className="button primary" onClick={createIdea}><Plus size={15}/> Criar ideia</button></div></Modal>}
    {toast && <div className="toast"><Check size={16}/>{toast}</div>}
  </main>;
}

function Dashboard({ projects, counts, badge, onSelect, onDiscover, onNew, onTab }: { projects: Project[]; counts: { total: number; review: number; approved: number }; badge: (s: Project["status"]) => React.ReactNode; onSelect: (id: string) => void; onDiscover: () => void; onNew: () => void; onTab: (tab: Tab) => void }) {
  const inbox = projects.filter((p) => p.status === "research_review" || p.status === "script_review").slice(0, 3);
  return <div className="page-content"><div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot"/> SEGUNDA-FEIRA, 12 DE OUTUBRO</div><h1>Bom dia, Bruno <span className="wave">✳</span></h1><p className="page-subtitle">Um bom conteúdo começa com uma boa pergunta.</p></div><button className="button primary" onClick={onDiscover}><Sparkles size={16}/> Descobrir pautas</button></div>
    <div className="stats-grid"><StatCard icon={<FolderKanban size={17}/>} label="Projetos ativos" value={counts.total.toString()} detail="em todos os estágios" tone="blue"/><StatCard icon={<Clock3 size={17}/>} label="Aguardando revisão" value={counts.review.toString()} detail="pesquisa ou roteiro" tone="amber"/><StatCard icon={<CheckCheck size={17}/>} label="Conteúdos aprovados" value={counts.approved.toString()} detail="prontos para exportar" tone="green"/><div className="stat-card usage-card"><div className="stat-top"><span className="stat-icon purple"><Gauge size={17}/></span><span className="stat-label">Uso deste mês</span><button aria-label="Mais informações"><CircleHelp size={14}/></button></div><div className="usage-line"><b>Demo</b><span>chaves de API não configuradas</span></div><div className="progress-track"><i style={{ width: "8%" }}/></div><small>Sem chamadas de pesquisa simuladas</small></div></div>
    <div className="dashboard-grid"><section className="panel inbox-panel"><div className="panel-header"><div><h2>Precisa da sua atenção</h2><p>Decisões editoriais pendentes</p></div><button className="text-button" onClick={() => onTab("Biblioteca")}>Ver biblioteca <ArrowRight size={14}/></button></div>{inbox.length ? <div className="inbox-list">{inbox.map((p) => <button className="inbox-row" key={p.id} onClick={() => onSelect(p.id)}><div className="inbox-type">{p.status === "research_review" ? <BookOpen size={16}/> : <PencilLine size={16}/>}</div><div className="inbox-info"><div><b>{p.title}</b>{badge(p.status)}</div><p>{p.status === "research_review" ? "Revise as evidências e aprove a pesquisa para continuar." : "O rascunho está pronto para revisão editorial."}</p><small>{p.category} <span>·</span> {p.format}</small></div><ArrowRight className="inbox-arrow" size={17}/></button>)}</div> : <EmptyState icon={<CheckCheck size={20}/>} title="Tudo em dia" text="Quando um conteúdo precisar de revisão, ele aparece aqui."/>}<div className="inbox-footer"><ShieldCheck size={14}/> Nenhum conteúdo é aprovado automaticamente.</div></section>
      <section className="panel quick-panel"><div className="panel-header"><div><h2>Comece por aqui</h2><p>Transforme uma ideia em conteúdo</p></div></div><button className="quick-action" onClick={onDiscover}><div className="quick-icon purple"><Sparkles size={18}/></div><div><b>Pesquisar uma pauta</b><small>Encontre ângulos e fontes atuais</small></div><ArrowRight size={16}/></button><button className="quick-action" onClick={onNew}><div className="quick-icon blue"><FilePlus2 size={18}/></div><div><b>Adicionar uma ideia</b><small>Comece uma pauta manualmente</small></div><ArrowRight size={16}/></button><div className="editorial-tip"><div><Sparkles size={15}/><b>Dica editorial</b></div><p>Uma boa pauta responde a uma pergunta real, explica o contexto e mostra de onde veio cada informação.</p></div></section></div>
    <section className="panel recent-projects"><div className="panel-header"><div><h2>Projetos recentes</h2><p>Acompanhe o que está em andamento</p></div><button className="text-button" onClick={() => onTab("Biblioteca")}>Todos os projetos <ArrowRight size={14}/></button></div><div className="project-table"><div className="table-head"><span>PROJETO</span><span>FORMATO</span><span>STATUS</span><span>ATUALIZADO</span><span/></div>{projects.slice(0, 4).map((p) => <button className="table-row" key={p.id} onClick={() => onSelect(p.id)}><div className="table-title"><div className="project-file"><FileText size={15}/></div><span><b>{p.title}</b><small>{p.category}</small></span></div><span className="format-cell">{p.format === "Reels" ? <Airplay size={14}/> : <FileText size={14}/>} {p.format}</span><span>{badge(p.status)}</span><span className="date-cell">{p.updatedAt}</span><ArrowRight className="row-arrow" size={15}/></button>)}</div></section>
    <footer className="page-foot"><span>AVIATION CONTENT STUDIO <span>·</span> MVP 0.1</span><span>Conteúdo aeronáutico responsável <Plane size={13}/></span></footer>
  </div>;
}
function StatCard({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: string }) { return <div className="stat-card"><div className="stat-top"><span className={`stat-icon ${tone}`}>{icon}</span><span className="stat-label">{label}</span></div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div></div>; }
function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="empty-state"><div>{icon}</div><b>{title}</b><p>{text}</p></div>; }

function Library({ projects, query, badge, onSelect, onNew }: { projects: Project[]; query: string; badge: (s: Project["status"]) => React.ReactNode; onSelect: (id: string) => void; onNew: () => void }) {
  return <div className="page-content"><div className="section-heading"><div><div className="eyebrow">SEU ACERVO EDITORIAL</div><h1>Biblioteca de projetos</h1><p className="page-subtitle">Ideias, pesquisas e roteiros em um só lugar.</p></div><button className="button primary" onClick={onNew}><Plus size={16}/> Nova pauta</button></div><div className="library-toolbar"><div className="filter-pill active">Todos <span>{projects.length}</span></div><div className="filter-pill">Em andamento</div><div className="filter-pill">Aprovados</div><div className="toolbar-spacer"/><span className="result-count">{projects.length} projetos{query && ` para “${query}”`}</span></div>{projects.length ? <div className="library-grid">{projects.map((p) => <button className="library-card" key={p.id} onClick={() => onSelect(p.id)}><div className="library-card-top"><div className="project-file large"><FileText size={17}/></div>{badge(p.status)}<MoreHorizontal size={18}/></div><h3>{p.title}</h3><p>{p.researchSummary.slice(0, 95)}{p.researchSummary.length > 95 ? "…" : ""}</p><div className="library-card-meta"><span>{p.category}</span><span>·</span><span>{p.format}</span></div><div className="library-card-bottom"><span><Clock3 size={13}/>{p.updatedAt}</span><span>{p.sources.length} fontes <ArrowRight size={13}/></span></div></button>)}</div> : <EmptyState icon={<Search size={20}/>} title="Nenhum projeto encontrado" text="Tente outra busca ou crie uma nova pauta."/>}</div>;
}
function DiscoveryIntro({ onStart, onNew }: { onStart: () => void; onNew: () => void }) { return <div className="page-content discovery-landing"><div className="discovery-hero"><div className="hero-orbit"><div className="orbit-ring"/><div className="orbit-plane"><Plane size={29}/></div><span className="orbit-star star-one">✦</span><span className="orbit-star star-two">✧</span><span className="orbit-star star-three">✦</span></div><div className="eyebrow">RESEARCH DESK</div><h1>Do céu aberto<br/>à sua próxima pauta.</h1><p>Pesquise fontes atuais, encontre ângulos para o seu público e decida o que merece virar conteúdo.</p><div className="hero-buttons"><button className="button primary" onClick={onStart}><Sparkles size={16}/> Pesquisar uma pauta</button><button className="button secondary" onClick={onNew}><Plus size={16}/> Adicionar uma ideia</button></div><div className="hero-trust"><ShieldCheck size={14}/> Pesquisa rastreável <span>·</span> Aprovação editorial</div></div><div className="source-strip"><div><b>FONTES PRIORITÁRIAS</b><span>ANAC</span><span>DECEA</span><span>FAA</span><span>EASA</span><span>Fabricantes</span></div><p>Fontes serão exibidas com links, data de consulta e evidências.</p></div></div>; }

function Preferences({ onSave }: { onSave: (key: string, value: string) => void }) { const [tone, setTone] = useState("Curioso e didático"); const [audience, setAudience] = useState("Público geral interessado em aviação"); const [length, setLength] = useState("45–60 segundos"); return <div className="page-content"><div className="section-heading"><div><div className="eyebrow">CONFIGURAÇÃO DO WORKSPACE</div><h1>Preferências editoriais</h1><p className="page-subtitle">Defina padrões para pautas e roteiros.</p></div></div><div className="settings-layout"><div className="settings-nav"><button className="settings-nav-item active"><PencilLine size={16}/> Diretrizes editoriais</button><button className="settings-nav-item"><ShieldCheck size={16}/> Fontes & rigor</button><button className="settings-nav-item"><Bell size={16}/> Notificações</button></div><section className="panel settings-panel"><div className="settings-title"><div><h2>Voz e público</h2><p>Estes padrões orientam suas próximas pautas e roteiros.</p></div><div className="settings-symbol"><PencilLine size={17}/></div></div><div className="field"><label htmlFor="tone">Tom de voz</label><select id="tone" value={tone} onChange={(e) => setTone(e.target.value)}><option>Curioso e didático</option><option>Jornalístico e objetivo</option><option>Leve e bem-humorado</option><option>Técnico e detalhado</option></select><small>Natural em português brasileiro, sem jargão desnecessário.</small></div><div className="field"><label htmlFor="pref-audience">Público principal</label><input id="pref-audience" value={audience} onChange={(e) => setAudience(e.target.value)}/></div><div className="field"><label htmlFor="length">Duração padrão de Reels</label><select id="length" value={length} onChange={(e) => setLength(e.target.value)}><option>30–45 segundos</option><option>45–60 segundos</option><option>60–90 segundos</option></select></div><div className="settings-check"><div><b>Rigor técnico</b><p>Exigir fonte para alegações técnicas e diferenciar fatos de exemplos.</p></div><span className="toggle on"><i/></span></div><div className="settings-check"><div><b>Aprovação humana</b><p>Manter revisão obrigatória antes de aprovar roteiro.</p></div><span className="toggle on"><i/></span></div><div className="settings-footer"><span>Preferências ficam neste dispositivo neste modo.</span><button className="button primary" onClick={() => { onSave("editorial", JSON.stringify({ tone, audience, length })); }}>Salvar preferências</button></div></section></div></div>; }

function Modal({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode }) { return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-header"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={18}/></button></div>{children}</section></div>; }

