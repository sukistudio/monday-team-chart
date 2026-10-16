import { isAbsolute, join, resolve } from "node:path";

export const PUBLIC_FEED_URL =
  "https://raw.githubusercontent.com/sukistudio/monday-office-feed/main/feed.json";
export const DEFAULT_INDEX_PATH = join(import.meta.dir, "..", "index.html");

const REQUEST_TIMEOUT_MS = 15_000;

export interface MemberCheckResult {
  chartIds: string[];
  feedIds: string[];
  errors: string[];
  warnings: string[];
}

interface CliOptions {
  indexPath?: string;
  fetchFeed?: (url: string, init: RequestInit) => Promise<Response>;
  stdout?: (message: string) => void;
  stderr?: (message: string) => void;
}

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) repeated.add(id);
    seen.add(id);
  }

  return [...repeated].sort();
}

function parseChartIds(html: string, errors: string[]): string[] {
  const uncommentedHtml = html.replace(/<!--[\s\S]*?-->/g, "");
  const articles = uncommentedHtml.match(/<article\b[^>]*>/gi) ?? [];
  if (articles.length === 0) {
    errors.push("chart contains no <article> elements");
    return [];
  }

  const ids: string[] = [];
  articles.forEach((article, index) => {
    const match = article.match(/\bdata-session\s*=\s*(["'])(.*?)\1/i);
    const id = match?.[2]?.trim();
    if (!id) {
      if (/\bclass\s*=\s*(["'])[^"']*\bp-human\b[^"']*\1/i.test(article)) return;
      errors.push(`article ${index + 1} is missing data-session`);
      return;
    }
    ids.push(id);
  });

  if (ids.length === 0) {
    errors.push("chart contains no member session IDs");
  }

  const repeated = duplicates(ids);
  if (repeated.length > 0) {
    errors.push(`duplicate chart IDs: ${repeated.join(", ")}`);
  }

  return ids;
}

function parseFeedIds(feed: unknown, errors: string[]): string[] {
  if (typeof feed !== "object" || feed === null) {
    errors.push("feed schema requires an object");
    return [];
  }

  if (!("schemaVersion" in feed) || feed.schemaVersion !== 3) {
    errors.push("feed schemaVersion must be 3");
  }

  if (!("members" in feed) || !Array.isArray(feed.members) || feed.members.length === 0) {
    errors.push("feed schema requires a non-empty members array");
    return [];
  }

  const ids: string[] = [];
  feed.members.forEach((member, index) => {
    if (
      typeof member !== "object" ||
      member === null ||
      !("id" in member) ||
      typeof member.id !== "string" ||
      member.id.trim() === ""
    ) {
      errors.push(`feed member ${index + 1} requires a non-empty string id`);
      return;
    }
    ids.push(member.id.trim());
  });

  const repeated = duplicates(ids);
  if (repeated.length > 0) {
    errors.push(`duplicate feed IDs: ${repeated.join(", ")}`);
  }

  return ids;
}

export function checkMembers(html: string, feed: unknown): MemberCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const chartIds = parseChartIds(html, errors);
  const feedIds = parseFeedIds(feed, errors);

  const chartSet = new Set(chartIds);
  const feedSet = new Set(feedIds);
  const feedOnly = [...feedSet].filter((id) => !chartSet.has(id)).sort();
  const chartOnly = [...chartSet].filter((id) => !feedSet.has(id)).sort();

  if (feedOnly.length > 0) {
    errors.push(`feed IDs missing from chart: ${feedOnly.join(", ")}`);
  }
  if (chartOnly.length > 0) {
    warnings.push(`chart IDs absent from feed: ${chartOnly.join(", ")}`);
  }

  return { chartIds, feedIds, errors, warnings };
}

async function readFeed(
  offlinePath: string | undefined,
  fetchFeed: NonNullable<CliOptions["fetchFeed"]>,
): Promise<unknown> {
  if (offlinePath) {
    const path = isAbsolute(offlinePath) ? offlinePath : resolve(offlinePath);
    return JSON.parse(await Bun.file(path).text());
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchFeed(PUBLIC_FEED_URL, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function offlineArgument(args: string[]): string | undefined {
  if (args.length === 0) return undefined;
  if (args.length === 2 && args[0] === "--offline" && args[1]) return args[1];
  throw new Error("usage: bun scripts/check-members.ts [--offline <feed.json>]");
}

export async function runCli(args: string[], options: CliOptions = {}): Promise<number> {
  const stdout = options.stdout ?? console.log;
  const stderr = options.stderr ?? console.error;

  try {
    const offlinePath = offlineArgument(args);
    const html = await Bun.file(options.indexPath ?? DEFAULT_INDEX_PATH).text();
    const feed = await readFeed(offlinePath, options.fetchFeed ?? fetch);
    const result = checkMembers(html, feed);

    for (const warning of result.warnings) stdout(`WARNING: ${warning}`);
    for (const error of result.errors) stderr(`ERROR: ${error}`);

    if (result.errors.length > 0) return 1;
    stdout(
      `Member check passed: ${result.chartIds.length} chart IDs, ${result.feedIds.length} feed IDs`,
    );
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stderr(`ERROR: member check could not run: ${message}`);
    return 1;
  }
}

if (import.meta.main) {
  process.exitCode = await runCli(Bun.argv.slice(2));
}
