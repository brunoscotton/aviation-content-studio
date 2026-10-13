import { z } from "zod";

export const workflow = ["idea", "researching", "research_review", "drafting", "script_review", "approved", "archived"] as const;
export const WorkflowSchema = z.enum(workflow);
export type WorkflowStatus = z.infer<typeof WorkflowSchema>;

export const ResearchRequestSchema = z.object({
  topic: z.string().trim().min(4).max(180),
  category: z.string().max(80).default("Aviação geral"),
  audience: z.string().max(100).default("Curiosos por aviação"),
  format: z.enum(["Reels", "Carrossel"]).default("Reels"),
  period: z.enum(["7 dias", "30 dias", "90 dias", "Sem período"]).default("30 dias"),
});

export const ScriptSchema = z.object({
  hook: z.string(),
  development: z.array(z.object({ title: z.string(), text: z.string(), scene: z.string() })).min(1),
  analogies: z.array(z.string()),
  examples: z.array(z.string()),
  ending: z.string(),
  estimatedSeconds: z.number().int().positive(),
  sourceUrls: z.array(z.string().url()),
});
export type Script = z.infer<typeof ScriptSchema>;

export const validTransitions: Record<WorkflowStatus, WorkflowStatus[]> = {
  idea: ["researching", "archived"], researching: ["research_review", "idea", "archived"],
  research_review: ["drafting", "researching", "archived"], drafting: ["script_review", "research_review", "archived"],
  script_review: ["drafting", "approved", "archived"], approved: ["drafting", "archived"], archived: ["idea"],
};

export function canTransition(from: WorkflowStatus, to: WorkflowStatus) {
  return validTransitions[from].includes(to);
}

export function transitionStatus(from: WorkflowStatus, to: WorkflowStatus) {
  if (!canTransition(from, to)) throw new Error(`Transição inválida: ${from} → ${to}`);
  return to;
}

export type Source = { title: string; url: string; accessedAt: string; evidence: string };
export type Version = { id: string; createdAt: string; content: Script; note: string; approved: boolean };
export type Project = {
  id: string; title: string; category: string; format: "Reels" | "Carrossel"; audience: string;
  status: WorkflowStatus; updatedAt: string; researchSummary: string; verifiedPoints: string[];
  divergences: string[]; gaps: string[]; sources: Source[]; versions: Version[]; events: { label: string; at: string }[];
};

export function approveProjectVersion(project: Project, versionId: string, at: string) {
  if (project.status !== "script_review") throw new Error("Somente um roteiro em revisão pode ser aprovado.");
  if (!project.versions.some((version) => version.id === versionId)) throw new Error("Versão não encontrada.");
  return {
    ...project,
    status: transitionStatus(project.status, "approved"),
    versions: project.versions.map((version) => version.id === versionId ? { ...version, approved: true } : version),
    updatedAt: at,
    events: [{ label: "Roteiro aprovado pelo editor", at }, ...project.events],
  };
}

export const demoProjects: Project[] = [
  {
    id: "demo-1", title: "Por que os aviões deixam rastros no céu?", category: "Ciência & aviação", format: "Reels", audience: "Curiosos por aviação",
    status: "research_review", updatedAt: "Hoje, 10:42", researchSummary: "Projeto de demonstração. Esta ficha é fictícia e não representa pesquisa de fontes reais. Pesquise uma pauta com sua chave da OpenAI para reunir evidências verificáveis.",
    verifiedPoints: ["Nenhuma evidência foi verificada neste projeto de demonstração."], divergences: [], gaps: ["Adicionar pesquisa com fontes antes de aprovar."], sources: [], versions: [], events: [{ label: "Projeto fictício de demonstração criado", at: "Hoje, 10:42" }],
  },
  {
    id: "demo-2", title: "Como funciona a pressurização da cabine", category: "Como funciona", format: "Carrossel", audience: "Público geral",
    status: "idea", updatedAt: "Ontem", researchSummary: "Ideia de demonstração sem pesquisa nem fontes. Use para explorar as ações do fluxo.",
    verifiedPoints: [], divergences: [], gaps: ["Pesquisa ainda não iniciada."], sources: [], versions: [], events: [{ label: "Ideia criada", at: "Ontem" }],
  },
  {
    id: "demo-3", title: "O que significa turbulência de esteira?", category: "Segurança & operações", format: "Reels", audience: "Avgeeks iniciantes",
    status: "script_review", updatedAt: "10 out", researchSummary: "Conteúdo fictício para pré-visualizar a revisão de roteiro. A pesquisa não foi feita e não deve ser usada para publicação.",
    verifiedPoints: ["Exemplo fictício: o conteúdo precisa ser confirmado em documentação oficial."], divergences: ["Sem fontes vinculadas — verificar antes de qualquer uso."], gaps: [], sources: [],
    versions: [{ id: "v1", createdAt: "10 out · 15:12", note: "Rascunho de demonstração", approved: false, content: { hook: "Você sabia que um avião pode encontrar turbulência mesmo com o céu limpo?", development: [{ title: "O que é", text: "Este texto é apenas um exemplo fictício. Substitua por conteúdo apoiado em fontes verificadas antes de qualquer publicação.", scene: "Animação ilustrativa, identificar como exemplo." }], analogies: ["Analogia de demonstração — valide antes de usar."], examples: ["Exemplo fictício, requer apuração."], ending: "Consulte fontes oficiais e aprove o roteiro antes de publicar.", estimatedSeconds: 45, sourceUrls: [] } }], events: [{ label: "Versão de demonstração criada", at: "10 out · 15:12" }],
  },
];

export const ProjectSchema = z.object({
  id: z.string().min(1).max(80), title: z.string().trim().min(1).max(180), category: z.string().max(80), audience: z.string().max(100),
  format: z.enum(["Reels", "Carrossel"]), status: WorkflowSchema, updatedAt: z.string().max(80),
  researchSummary: z.string().max(20_000), verifiedPoints: z.array(z.string().max(1000)).max(100), divergences: z.array(z.string().max(1000)).max(100), gaps: z.array(z.string().max(1000)).max(100),
  sources: z.array(z.object({ title: z.string().max(500), url: z.string().url(), accessedAt: z.string(), evidence: z.string().max(1000) })).max(100),
  versions: z.array(z.object({ id: z.string().max(80), createdAt: z.string().max(80), content: ScriptSchema, note: z.string().max(1000), approved: z.boolean() })).max(100),
  events: z.array(z.object({ label: z.string().max(2000), at: z.string().max(80) })).max(500),
});

