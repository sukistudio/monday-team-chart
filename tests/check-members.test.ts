import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  DEFAULT_INDEX_PATH,
  checkMembers,
  runCli,
} from "../scripts/check-members";

const fixtures = join(import.meta.dir, "fixtures");
const completeFeed = join(fixtures, "member-feed-complete.json");
const unknownFeed = join(fixtures, "member-feed-unknown.json");
const tempPaths: string[] = [];

const chart = (...ids: string[]) =>
  ids.map((id) => `<article class="card" data-session="${id}"></article>`).join("\n");
const v3Feed = (...ids: string[]) => ({
  schemaVersion: 3,
  members: ids.map((id) => ({ id })),
});

async function fixtureIds(path = completeFeed): Promise<string[]> {
  const feed = (await Bun.file(path).json()) as { members: Array<{ id: string }> };
  return feed.members.map(({ id }) => id);
}

async function tempFile(contents: string): Promise<string> {
  const path = join(import.meta.dir, `.check-members-${crypto.randomUUID()}.html`);
  await Bun.write(path, contents);
  tempPaths.push(path);
  return path;
}

afterEach(async () => {
  await Promise.all(tempPaths.splice(0).map((path) => Bun.file(path).delete()));
});

describe("checkMembers", () => {
  test("accepts every feed ID represented by a chart article", async () => {
    const feed = await Bun.file(completeFeed).json();
    const result = checkMembers(chart(...(await fixtureIds())), feed);

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  test("fails and lists IDs known only to the feed", async () => {
    const feed = await Bun.file(unknownFeed).json();
    const result = checkMembers(chart(...(await fixtureIds())), feed);

    expect(result.errors).toContain("feed IDs missing from chart: member-unknown");
  });

  test("warns but passes when the chart has extra IDs", async () => {
    const feed = await Bun.file(completeFeed).json();
    const result = checkMembers(
      chart(...(await fixtureIds()), "member-chart-only"),
      feed,
    );

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual(["chart IDs absent from feed: member-chart-only"]);
  });

  test("reads data-session from actual article start tags", () => {
    const html = [
      "<div data-session=\"not-a-member\"></div>",
      "<article data-note=\"x\" data-session='member-alpha' class=\"card\"></article>",
    ].join("\n");
    const result = checkMembers(html, v3Feed("member-alpha"));

    expect(result.errors).toEqual([]);
    expect(result.chartIds).toEqual(["member-alpha"]);
  });

  test.each([
    ["null feed", null],
    ["missing members", {}],
    ["empty members", { schemaVersion: 3, members: [] }],
    ["invalid member", { schemaVersion: 3, members: [{}] }],
    ["blank member ID", { schemaVersion: 3, members: [{ id: " " }] }],
  ])("rejects malformed schema: %s", (_label, feed) => {
    const result = checkMembers(chart("member-alpha"), feed);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("rejects duplicate feed IDs", () => {
    const result = checkMembers(chart("member-alpha"), {
      schemaVersion: 3,
      members: [{ id: "member-alpha" }, { id: "member-alpha" }],
    });
    expect(result.errors).toContain("duplicate feed IDs: member-alpha");
  });

  test("rejects duplicate chart IDs", () => {
    const result = checkMembers(
      chart("member-alpha", "member-alpha"),
      v3Feed("member-alpha"),
    );
    expect(result.errors).toContain("duplicate chart IDs: member-alpha");
  });

  test("rejects articles without a session ID", () => {
    const result = checkMembers(
      "<article class=\"card\"></article>",
      v3Feed("member-alpha"),
    );
    expect(result.errors).toContain("article 1 is missing data-session");
  });

  test("allows the human card to omit a session ID", () => {
    const html = [
      '<article class="card node p-human"></article>',
      chart("member-alpha"),
    ].join("\n");
    const result = checkMembers(html, v3Feed("member-alpha"));

    expect(result.errors).toEqual([]);
  });

  test("still requires at least one member session", () => {
    const result = checkMembers(
      '<article class="card p-human"></article>',
      v3Feed("member-alpha"),
    );
    expect(result.errors).toContain("chart contains no member session IDs");
  });

  test("ignores article tags inside HTML comments", () => {
    const result = checkMembers(
      '<!-- <article data-session="member-alpha"></article> -->',
      v3Feed("member-alpha"),
    );
    expect(result.errors).toContain("chart contains no <article> elements");
  });

  test("rejects a chart with no articles", () => {
    const result = checkMembers("<main></main>", v3Feed("member-alpha"));
    expect(result.errors).toContain("chart contains no <article> elements");
  });

  test.each([undefined, 2, 4, "3"])("rejects schemaVersion %p", (schemaVersion) => {
    const result = checkMembers(chart("member-alpha"), {
      schemaVersion,
      members: [{ id: "member-alpha" }],
    });
    expect(result.errors).toContain("feed schemaVersion must be 3");
  });
});

describe("runCli", () => {
  test("uses the repository index path independent of cwd", () => {
    expect(DEFAULT_INDEX_PATH).toBe(join(import.meta.dir, "..", "index.html"));
  });

  test("passes with a complete offline feed without using fetch", async () => {
    const indexPath = await tempFile(chart(...(await fixtureIds())));
    let fetched = false;
    const output: string[] = [];
    const exitCode = await runCli(["--offline", completeFeed], {
      indexPath,
      fetchFeed: async () => {
        fetched = true;
        throw new Error("network must not be used");
      },
      stdout: (message) => output.push(message),
    });

    expect(exitCode).toBe(0);
    expect(fetched).toBe(false);
    expect(output.at(-1)).toContain("Member check passed");
  });

  test("returns 1 for an unknown feed member", async () => {
    const indexPath = await tempFile(chart(...(await fixtureIds())));
    const errors: string[] = [];
    const exitCode = await runCli(["--offline", unknownFeed], {
      indexPath,
      stderr: (message) => errors.push(message),
    });

    expect(exitCode).toBe(1);
    expect(errors.join("\n")).toContain("member-unknown");
  });

  test("returns 1 when an offline file cannot be read", async () => {
    const indexPath = await tempFile(chart("member-alpha"));
    const errors: string[] = [];
    const exitCode = await runCli(["--offline", join(fixtures, "missing.json")], {
      indexPath,
      stderr: (message) => errors.push(message),
    });

    expect(exitCode).toBe(1);
    expect(errors[0]).toContain("could not run");
  });

  test.each([
    [
      "HTTP error",
      async () => new Response("unavailable", { status: 503, statusText: "Unavailable" }),
    ],
    [
      "invalid JSON",
      async () => new Response("not-json", { status: 200 }),
    ],
    [
      "request failure",
      async () => {
        throw new DOMException("timed out", "AbortError");
      },
    ],
  ])("fails closed on an online %s", async (_label, fetchFeed) => {
    const indexPath = await tempFile(chart("member-alpha"));
    const errors: string[] = [];
    const exitCode = await runCli([], {
      indexPath,
      fetchFeed,
      stderr: (message) => errors.push(message),
    });

    expect(exitCode).toBe(1);
    expect(errors[0]).toContain("could not run");
  });

  test("rejects invalid CLI arguments before any network request", async () => {
    const indexPath = await tempFile(chart("member-alpha"));
    let fetched = false;
    const exitCode = await runCli(["--offline"], {
      indexPath,
      fetchFeed: async () => {
        fetched = true;
        throw new Error("network must not be used");
      },
      stderr: () => {},
    });

    expect(exitCode).toBe(1);
    expect(fetched).toBe(false);
  });
});
