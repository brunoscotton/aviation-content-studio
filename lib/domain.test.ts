import { describe, expect, it } from "vitest";
import { approveProjectVersion, canTransition, demoProjects, ResearchRequestSchema, ScriptSchema, transitionStatus } from "@/lib/domain";

describe("research input schema", () => {
  it("accepts a topic with editorial defaults", () => {
    expect(ResearchRequestSchema.parse({ topic: "Por que as asas geram sustentação?" })).toMatchObject({ category: "Aviação geral", format: "Reels" });
  });
  it("rejects short and overlong topics", () => {
    expect(ResearchRequestSchema.safeParse({ topic: "avi" }).success).toBe(false);
    expect(ResearchRequestSchema.safeParse({ topic: "a".repeat(181) }).success).toBe(false);
  });
});

describe("version approval", () => {
  it("approves the requested version and preserves older approved content", () => {
    const sample = demoProjects.find((project) => project.id === "demo-3")!;
    const prior = { ...sample.versions[0], id: "v-old", approved: true };
    const current = { ...sample, status: "script_review" as const, versions: [{ ...sample.versions[0], id: "v-new" }, prior] };
    const approved = approveProjectVersion(current, "v-new", "Agora");
    expect(approved.status).toBe("approved");
    expect(approved.versions.map((version) => version.approved)).toEqual([true, true]);
    expect(current.versions[0].approved).toBe(false);
  });
  it("does not approve a missing version", () => {
    const sample = demoProjects.find((project) => project.id === "demo-3")!;
    expect(() => approveProjectVersion(sample, "missing", "Agora")).toThrow("Versão não encontrada");
  });
});

describe("workflow transitions", () => {
  it("allows a human-approved research stage to move into drafting", () => {
    expect(canTransition("research_review", "drafting")).toBe(true);
    expect(transitionStatus("research_review", "drafting")).toBe("drafting");
  });
  it("rejects direct approval from an idea", () => {
    expect(canTransition("idea", "approved")).toBe(false);
    expect(() => transitionStatus("idea", "approved")).toThrow("Transição inválida");
  });
  it("preserves the approved version workflow when reopened for revision", () => {
    expect(transitionStatus("approved", "drafting")).toBe("drafting");
    expect(transitionStatus("drafting", "script_review")).toBe("script_review");
  });
});

describe("script validation", () => {
  it("requires a complete structured script and valid source URLs", () => {
    expect(ScriptSchema.safeParse({ hook: "Gancho", development: [{ title: "Contexto", text: "Explicação", scene: "Diagrama" }], analogies: [], examples: [], ending: "Fim", estimatedSeconds: 40, sourceUrls: ["https://anac.gov.br"] }).success).toBe(true);
    expect(ScriptSchema.safeParse({ hook: "", development: [], analogies: [], examples: [], ending: "", estimatedSeconds: 0, sourceUrls: ["not-a-url"] }).success).toBe(false);
  });
});
