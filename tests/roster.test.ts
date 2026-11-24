import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadRoster, rosterErrors } from "../scripts/check-roster";

const html = readFileSync(join(import.meta.dir, "..", "index.html"), "utf8");
const roster = await loadRoster();

describe("data/roster.json is the single source of engine/model", () => {
  test("every card and model table row matches the roster", () => {
    expect(rosterErrors(html, roster)).toEqual([]);
  });

  test("OMX members carry the models decided in tide-36", () => {
    const omx = roster.filter((m) => m.engine === "codex").map(({ name, model, effort }) => [name, model, effort]);
    expect(omx).toEqual([
      ["Eddy", "gpt-6.1-sol", "medium"],
      ["Halo", "gpt-6.1-sol", "medium"],
      ["Buoy", "gpt-6-luna", "medium"],
    ]);
  });

  test("tide-63: Sonar is the Grok member with model and effort", () => {
    const grok = roster.filter((m) => m.engine === "grok").map(({ session, name, team, model, effort }) => [session, name, team, model, effort]);
    expect(grok).toEqual([["115-sonar-grok", "Sonar", "software", "grok-4.7-build", "high"]]);
  });

  test("tide-63: grok needs model + effort; wrong badge, card or table engine fails the check", () => {
    const noEffort = roster.map((m) => (m.session === "115-sonar-grok" ? { ...m, effort: undefined } : m));
    expect(rosterErrors(html, noEffort).join("\n")).toContain("115-sonar-grok: grok member needs model and effort");
    const unknown = roster.map((m) => (m.session === "115-sonar-grok" ? { ...m, engine: "gpt" as never } : m));
    expect(rosterErrors(html, unknown).join("\n")).toContain("115-sonar-grok: unknown engine gpt");
    for (const [mutate, want] of [
      [(s: string) => s.replace('class="eng eng-grok">Grok</span>', 'class="eng eng-claude">Claude</span>'), "115-sonar-grok: badge is not Grok"],
      [(s: string) => s.replace("<dd>Grok Build · grok-4.7-build</dd>", "<dd>Grok Build</dd>"), "115-sonar-grok: card engine"],
      [(s: string) => s.replace('<td>Grok Build · <span class="m">grok-4.7-build</span>', '<td class="m">grok-4.7-build'), "115-sonar-grok: model table engine is not grok"],
      [(s: string) => s.replace('<td>Grok Build · <span class="m">grok-4.7-build</span>', "<td>Grok Build</td><td>"), "without a model"],
    ] as const) {
      const drifted = mutate(html);
      expect(drifted).not.toBe(html);
      expect(rosterErrors(drifted, roster).join("\n")).toContain(want);
    }
  });

  test("effort lives in the roster only; the page shows no effort, plan or quota", () => {
    expect(html).not.toMatch(/\beffort\b|\bquota\b|\bplan\s*(?:Plus|Pro|Team)\b/i);
  });

  // Each mutation is one kind of drift; the check must name the member it hits.
  test.each([
    ["card model", (s: string) => s.replace("Codex (OMX) · gpt-6-luna</dd>", "Codex (OMX) · gpt-6.1-sol</dd>"), "144-buoy-omx"],
    ["card model dropped", (s: string) => s.replace("Codex (OMX) · gpt-6.1-sol</dd>", "Codex (OMX)</dd>"), "114-eddy-omx"],
    ["table model", (s: string) => s.replace('<code>124-halo-omx</code></td><td>Codex (OMX) · <span class="m">gpt-6.1-sol', '<code>124-halo-omx</code></td><td>Codex (OMX) · <span class="m">gpt-6-luna'), "124-halo-omx"],
    ["table row removed", (s: string) => s.replace(/ *<tr><td>[^\n]*<code>153-plumb<\/code>[^\n]*\n/, ""), "153-plumb"],
    ["Claude model", (s: string) => s.replace('<dt>engine</dt><dd>Claude · Sonnet 5.5</dd>\n                <dt>repo</dt><dd class="mono">sukistudio/shore-oracle', '<dt>engine</dt><dd>Claude · Opus 5.5</dd>\n                <dt>repo</dt><dd class="mono">sukistudio/shore-oracle'), "113-shore"],
    ["Claude table model", (s: string) => s.replace('<code>15-atlas</code></td><td class="m">Fable 5.1', '<code>15-atlas</code></td><td class="m">Fable 5.10'), "15-atlas"],
  ])("drift in %s fails the check", (_, mutate, session) => {
    const drifted = mutate(html);
    expect(drifted).not.toBe(html);
    expect(rosterErrors(drifted, roster).join("\n")).toContain(session);
  });

  test("a model table row under the wrong team group fails the check", () => {
    const row = html.match(/ *<tr><td>[^\n]*<code>144-buoy-omx<\/code>[^\n]*\n/)![0];
    const moved = html.replace(row, "").replace('<tr class="group software">', row + '        <tr class="group software">');
    expect(rosterErrors(moved, roster).join("\n")).toContain("144-buoy-omx: model table row sits under root, roster says research");
  });

  test("an old engine-only Codex row fails the check", () => {
    const drifted = html.replace("</tbody>", "<tr><td>Eddy · Halo · Buoy</td><td>Codex (OMX)</td><td>x</td></tr></tbody>");
    expect(rosterErrors(drifted, roster).join("\n")).toContain("without a model");
  });

  test("a card absent from the roster, or a member moved to another team, fails the check", () => {
    expect(rosterErrors(html, roster.filter((m) => m.session !== "121-glow")).join("\n")).toContain("121-glow: card not in roster");
    const moved = roster.map((m) => (m.session === "144-buoy-omx" ? { ...m, team: "finance" as const } : m));
    expect(rosterErrors(html, moved).join("\n")).toContain("144-buoy-omx: card sits in research, roster says finance");
  });
});
