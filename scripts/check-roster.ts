import { join } from "node:path";

export const ROSTER_PATH = join(import.meta.dir, "..", "data", "roster.json");

export type Team = "root" | "peer" | "software" | "marketing" | "finance" | "research" | "estate";

export interface Member {
  session: string;
  name: string;
  team: Team;
  engine: "claude" | "codex";
  model: string | null;
  effort?: string;
}

// Team panels in page order; each panel runs until the next marker.
const PANELS: [Team, string][] = [
  ["software", "<!-- Software -->"],
  ["marketing", "<!-- Marketing -->"],
  ["finance", "<!-- Finance -->"],
  ["research", "<!-- Research -->"],
  ["estate", "<!-- Real Estate -->"],
];
const PANELS_END = "<!-- end Atlas -->";
const TEAMS = new Set<string>(["root", "peer", ...PANELS.map(([team]) => team)]);

export async function loadRoster(path = ROSTER_PATH): Promise<Member[]> {
  return ((await Bun.file(path).json()) as { members: Member[] }).members;
}

// "Fable 5.1" matches "Fable 5.1" and "Fable 5.1 → Opus 5.5", not "Fable 5.10".
const showsModel = (text: string, model: string) => text === model || text.startsWith(`${model} `);

export function rosterErrors(html: string, roster: Member[]): string[] {
  const errors: string[] = [];

  const seen = new Set<string>();
  for (const m of roster) {
    if (seen.has(m.session)) errors.push(`${m.session}: duplicate roster session`);
    seen.add(m.session);
    if (!TEAMS.has(m.team)) errors.push(`${m.session}: unknown team ${m.team}`);
    if (m.engine !== "claude" && m.engine !== "codex") errors.push(`${m.session}: unknown engine ${m.engine}`);
    if (m.engine === "codex" && (!m.model || !m.effort)) errors.push(`${m.session}: codex member needs model and effort`);
  }

  const cards = new Map<string, { body: string; at: number }>();
  for (const match of html.matchAll(/<article\b[^>]*data-session="([^"]+)"[^>]*>[\s\S]*?<\/article>/g)) {
    cards.set(match[1]!, { body: match[0], at: match.index! });
  }
  for (const id of cards.keys()) if (!seen.has(id)) errors.push(`${id}: card not in roster`);

  const bounds = PANELS.map(([team, marker], i) => ({
    team,
    start: html.indexOf(marker),
    end: html.indexOf(i + 1 < PANELS.length ? PANELS[i + 1]![1] : PANELS_END),
  }));
  const panelOf = (at: number) => bounds.find(({ start, end }) => start <= at && at < end)?.team;

  const table = html.split('<table class="models">')[1]?.split("</table>")[0] ?? "";
  // Group header rows ("group software", "group team-marketing", …) set the team of the rows below them.
  const rows: { row: string; team: string }[] = [];
  let group = "root";
  for (const [row, cls] of table.matchAll(/<tr(?: class="([^"]*)")?>[\s\S]*?<\/tr>/g)) {
    if (cls?.startsWith("group")) group = cls.replace(/^group ?(?:team-)?/, "") || "all";
    else rows.push({ row, team: group });
  }
  for (const { row } of rows) {
    const id = row.match(/<code>([^<]+)<\/code>/)?.[1];
    if (id && !seen.has(id)) errors.push(`${id}: model table row not in roster`);
    if (row.includes("Codex (OMX)") && !/Codex \(OMX\) · <span class="m">[^<]+<\/span>/.test(row)) {
      errors.push(`model table row shows Codex (OMX) without a model: ${row.replace(/<[^>]+>/g, " ").trim()}`);
    }
  }

  for (const m of roster) {
    const card = cards.get(m.session);
    if (!card) {
      errors.push(`${m.session}: roster member has no card`);
      continue;
    }
    if (!card.body.includes(`</span>${m.name} `)) errors.push(`${m.session}: card name is not ${m.name}`);
    const team = panelOf(card.at) ?? (m.team === "root" || m.team === "peer" ? m.team : undefined);
    if (team !== m.team) errors.push(`${m.session}: card sits in ${team ?? "no team"}, roster says ${m.team}`);

    const badge = m.engine === "codex" ? "Codex" : "Claude";
    if (!card.body.includes(`class="eng eng-${m.engine}">${badge}</span>`)) errors.push(`${m.session}: badge is not ${badge}`);

    const engine = card.body.match(/<dt>engine<\/dt><dd>([^<]*)<\/dd>/)?.[1] ?? "";
    if (m.engine === "codex") {
      if (engine !== `Codex (OMX) · ${m.model}`) errors.push(`${m.session}: card engine "${engine}" ≠ Codex (OMX) · ${m.model}`);
    } else if (m.model === null) {
      if (engine !== "Claude · ไม่ระบุรุ่น") errors.push(`${m.session}: card engine "${engine}" ≠ Claude · ไม่ระบุรุ่น`);
    } else if (!engine.startsWith("Claude · ") || !showsModel(engine.slice("Claude · ".length), m.model)) {
      errors.push(`${m.session}: card engine "${engine}" ≠ Claude · ${m.model}`);
    }

    const mine = rows.filter(({ row }) => row.includes(`<code>${m.session}</code>`));
    if (m.model === null) {
      if (mine.length) errors.push(`${m.session}: no model, but has a model table row`);
      continue;
    }
    if (mine.length !== 1) {
      errors.push(`${m.session}: ${mine.length} model table rows (want 1)`);
      continue;
    }
    const { row, team: tableTeam } = mine[0]!;
    if (tableTeam !== (m.team === "peer" ? "root" : m.team)) errors.push(`${m.session}: model table row sits under ${tableTeam}, roster says ${m.team}`);
    const shown = row.match(/class="m">([^<]*)</)?.[1] ?? "";
    if (!showsModel(shown, m.model)) errors.push(`${m.session}: model table shows "${shown}", roster says ${m.model}`);
    if ((m.engine === "codex") !== row.includes("Codex (OMX) · ")) errors.push(`${m.session}: model table engine is not ${m.engine}`);
  }

  return errors;
}
