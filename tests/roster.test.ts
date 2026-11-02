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
