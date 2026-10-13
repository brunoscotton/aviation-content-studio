import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeRequest } from "@/lib/server/auth";
import { createClient } from "@/lib/supabase/server";
import { ProjectSchema } from "@/lib/domain";

const SyncSchema = z.object({ projects: z.array(ProjectSchema).max(500) });

export async function GET() {
  const auth = await authorizeRequest();
  if (!auth.ok) return NextResponse.json({ error: "Faça login." }, { status: 401 });
  if (auth.userId === "local-demo") return NextResponse.json({ projects: [] });
  const supabase = await createClient();
  const { data: rows, error } = await supabase.from("content_projects").select("*").order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Não foi possível carregar os projetos." }, { status: 500 });
  const projectIds = (rows ?? []).map((row) => row.id);
  if (!projectIds.length) return NextResponse.json({ projects: [] });
  const [sources, versions, events] = await Promise.all([
    supabase.from("research_sources").select("*").in("project_id", projectIds).order("accessed_at", { ascending: false }),
    supabase.from("script_versions").select("*").in("project_id", projectIds).order("version_number", { ascending: false }),
    supabase.from("workflow_events").select("*").in("project_id", projectIds).order("created_at", { ascending: false }),
  ]);
  if (sources.error || versions.error || events.error) return NextResponse.json({ error: "Não foi possível carregar o histórico dos projetos." }, { status: 500 });
  const projects = (rows ?? []).map((row) => {
    const research = row.research_summary as { summary?: string; verifiedPoints?: string[]; divergences?: string[]; gaps?: string[] };
    return {
      id: row.id, title: row.title, category: row.category, audience: row.audience, format: row.format,
      status: row.workflow_status, updatedAt: new Date(row.updated_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
      researchSummary: research.summary ?? "Pesquisa ainda não iniciada.", verifiedPoints: research.verifiedPoints ?? [], divergences: research.divergences ?? [], gaps: research.gaps ?? [],
      sources: (sources.data ?? []).filter((s) => s.project_id === row.id).map((s) => ({ title: s.title, url: s.url, evidence: s.evidence, accessedAt: s.accessed_at })),
      versions: (versions.data ?? []).filter((v) => v.project_id === row.id).map((v) => ({ id: v.id, createdAt: new Date(v.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }), content: v.content, note: v.change_note, approved: v.is_approved })),
      events: (events.data ?? []).filter((e) => e.project_id === row.id).map((e) => ({ label: e.event_type, at: new Date(e.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) })),
    };
  });
  return NextResponse.json({ projects });
}

export async function PUT(request: Request) {
  const auth = await authorizeRequest();
  if (!auth.ok || auth.userId === "local-demo") return NextResponse.json({ error: "Autenticação Supabase necessária." }, { status: 401 });
  let raw: unknown; try { raw = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  const parsed = SyncSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Dados de projeto inválidos.", details: parsed.error.flatten() }, { status: 400 });
  const supabase = await createClient();
  for (const project of parsed.data.projects) {
    const { data: existing } = await supabase.from("content_projects").select("workflow_status").eq("id", project.id).maybeSingle();
    if (existing?.workflow_status === "approved" && project.status === "script_review") {
      const { error: reopenError } = await supabase.from("content_projects").update({ workflow_status: "drafting" }).eq("id", project.id);
      if (reopenError) return NextResponse.json({ error: "Não foi possível reabrir o roteiro aprovado para revisão." }, { status: 400 });
    }
    const { error: projectError } = await supabase.from("content_projects").upsert({ id: project.id, owner_id: auth.userId, title: project.title, category: project.category, audience: project.audience, format: project.format, workflow_status: project.status, research_summary: { summary: project.researchSummary, verifiedPoints: project.verifiedPoints, divergences: project.divergences, gaps: project.gaps } }, { onConflict: "id" });
    if (projectError) return NextResponse.json({ error: `Não foi possível salvar “${project.title}”. Confira as transições de status e sua migração.` }, { status: 400 });
    await supabase.from("research_sources").delete().eq("project_id", project.id);
    if (project.sources.length) {
      const { error } = await supabase.from("research_sources").insert(project.sources.map((s) => ({ owner_id: auth.userId, project_id: project.id, title: s.title, url: s.url, evidence: s.evidence, accessed_at: Number.isNaN(Date.parse(s.accessedAt)) ? new Date().toISOString() : new Date(s.accessedAt).toISOString() })));
      if (error) return NextResponse.json({ error: "Falha ao salvar fontes do projeto." }, { status: 400 });
    }
    if (project.versions.length) {
      const stored = await supabase.from("script_versions").select("id,version_number").eq("project_id", project.id);
      if (stored.error) return NextResponse.json({ error: "Falha ao verificar versões anteriores." }, { status: 400 });
      const existingNumbers = new Map((stored.data ?? []).map((row) => [row.id, row.version_number]));
      let nextNumber = Math.max(0, ...(stored.data ?? []).map((row) => row.version_number)) + 1;
      const numbers = new Map<string, number>();
      const versionIds = new Map(project.versions.map((version) => [version.id, z.string().uuid().safeParse(version.id).success ? version.id : crypto.randomUUID()]));
      for (const version of [...project.versions].reverse()) {
        const key = versionIds.get(version.id)!;
        numbers.set(version.id, existingNumbers.get(key) ?? nextNumber++);
      }
      const records = project.versions.map((v) => ({ id: versionIds.get(v.id)!, owner_id: auth.userId, project_id: project.id, version_number: numbers.get(v.id)!, content: v.content, change_note: v.note, is_approved: v.approved }));
      const { error } = await supabase.from("script_versions").upsert(records, { onConflict: "id" });
      if (error) return NextResponse.json({ error: "Falha ao salvar versões do roteiro." }, { status: 400 });
    }
    await supabase.from("workflow_events").delete().eq("project_id", project.id);
    if (project.events.length) {
      const events = project.events.map((event) => ({ owner_id: auth.userId, project_id: project.id, to_status: project.status, event_type: event.label, metadata: { occurredAtLabel: event.at } }));
      const { error } = await supabase.from("workflow_events").insert(events);
      if (error) return NextResponse.json({ error: "Falha ao salvar eventos do projeto." }, { status: 400 });
    }
  }
  return NextResponse.json({ ok: true });
}
