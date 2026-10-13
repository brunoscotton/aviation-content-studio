import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Supabase ownership migration", () => {
  it("enables RLS and adds owner-only policies for each application table", () => {
    const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/202610120001_initial_schema.sql"), "utf8");
    for (const table of ["profiles", "content_projects", "research_topics", "research_sources", "script_versions", "project_messages", "workflow_events"]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toMatch(new RegExp(`create policy \\\"[^\\\"]+\\\" on public\\.${table} for all to authenticated using \\(.*auth\\.uid\\(\\)\\).*with check \\(.*auth\\.uid\\(\\)\\)`));
    }
  });
});
