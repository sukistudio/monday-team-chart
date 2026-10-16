import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const html = readFileSync(join(import.meta.dir, "..", "index.html"), "utf8");
// Same exact-token SHA-256 denylist as the existing public page gate; never publish its plaintext names.
const PRIVATE_HASHES = new Set([
  "7181ed0d47571d6d8cfa85f93abd8939ee3469f3603f05d32b8aa9a25b8d0edd",
  "b7a60bac5549a408695854117de062c2fcafb2d7055c19d2f6bd4d50a113d998",
  "403f2f9b96261aebc325877315a39c127d1a3bc3fbe9415f2e78a6bf3eddbeb7",
  "eab762a03fd979a04cc4706e6536d382bc89d2d1356afcd054a16b2235ecd471",
  "5d80eed613abf33369c695bcb3fe3635bd30d963503a3bbdd435e9be295d9c13",
  "354d3c7ffe81b7ec4bbdbc166ad4ac37baf6aff03c11264c452f52fb8c76997a",
  "99ff997a6c74d704f9f37b7549dc163accf82efe9006a590986b4466305ccef2",
  "a956e148ba69a3772614e0dd04eb154ec55ac820ccd841711a95f229f4694a3e",
  "e2a530e251d3675034d23f5c5f87f54ec3182a088ba7d13350824794f8e6b76e",
  "a14d73c2de3bffcbd6318b14760d5cc02446f0cc6d89dfc2dde0823de5f84c88",
  "09c13a4d12d43f8b4a4e2ffdf7739fc92d78040a096e32c1557590e21cbbf2af",
  "b3f9e547145ee2aff20f9fab0cedb8a07af9618bbe6592a22cf6a87ff4b5134a",
  "ed14aed3b55faf7e8fdcb927985ac0808962ad424fea2575da0afb9f6ff7e8ab",
  "868feee14793bee387410a89931665c6a0d55d98f6165552b749489736cb8842",
  "66f62d1807d3821a3865f2573b69c74be033f1341240ac861fefc6d430bff5e0",
  "0f6fa4978068dcb8dddddbdd8f3a13ce301e64fba27d7abc873870712a552d13",
  "c2333a7e3a607935c67c1e6f6810395decc9f66f592b812aaada7db94ba215d6",
]);
const privateHits = (text: string, hashes = PRIVATE_HASHES) => [...text.matchAll(/[A-Za-z0-9_-]+/g)].filter(([token]) => hashes.has(createHash("sha256").update(token).digest("hex"))).length;
const cards = [...html.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/g)].map(([card]) => card);
const agents = cards.filter((card) => !/class="[^"]*p-human/.test(card));

describe("public page gate", () => {
  test("no machine paths, account details, forbidden project word or private tokens anywhere in HTML", () => {
    expect(html).not.toMatch(/\/Users\/|SUKISTUDIO_OS|(?:\/home\/|[A-Z]:\\Users\\)|\baccount\b|บัญชี\s*ChatGPT|เลขบัญชี|lunatlas/i);
    expect(privateHits(html)).toBe(0);
  });
  test("hash gate detects whole tokens without publishing real blocked names", () => {
    const hashes = new Set([createHash("sha256").update("zz-private-example").digest("hex")]);
    expect(privateHits("<p>zz-private-example</p>", hashes)).toBe(1);
    expect(privateHits("<p>prefix-zz-private-example zz-private-example-oracle ZZ-private-example</p>", hashes)).toBe(0);
  });
});

describe("roster cards", () => {
  test("every agent has its unique session, engine row and exactly one matching badge; human has neither", () => {
    const sessions = agents.map((card) => {
      const id = card.match(/data-session="([^"]+)"/)?.[1];
      expect(id).toBeDefined();
      expect(card).toContain(`<dt>session</dt><dd><code>${id}</code></dd>`);
      expect(card).not.toContain("<dt>model</dt>");
      expect(card.match(/class="eng eng-/g)?.length).toBe(1);
      if (id!.endsWith("-omx")) {
        expect(card).toContain('class="eng eng-codex">Codex</span>');
        expect(card).toContain("<dt>engine</dt><dd>Codex (OMX)</dd>");
        expect(card).not.toContain("<dt>repo</dt>");
        expect(card).toContain("<dt>เกิด</dt><dd>2026-10-16</dd>");
      } else {
        expect(card).toContain('class="eng eng-claude">Claude</span>');
        expect(card).toContain("<dt>engine</dt><dd>Claude · ");
      }
      return id;
    });
    expect(new Set(sessions).size).toBe(agents.length);
    const human = cards.find((card) => /class="[^"]*p-human/.test(card))!;
    expect(human).not.toMatch(/data-session|<dt>engine|class="eng /);
  });
  test("new OMX members follow the correct teammate with expected emoji, color and role", () => {
    for (const [previous, id, name, emoji, color, role] of [
      ["113-shore", "114-eddy-omx", "Eddy", "🌀", "water", "dev OMX/Codex"],
      ["123-pulse", "124-halo-omx", "Halo", "🌙", "gold", "ผู้ผลิตชิ้นงาน OMX"],
      ["143-sextant", "144-buoy-omx", "Buoy", "🛟", "dawn", "script/parser OMX"],
    ]) {
      const index = agents.findIndex((card) => card.includes(`data-session="${previous}"`));
      const card = agents[index + 1];
      expect(card).toContain(`data-session="${id}"`);
      expect(card).toContain(`class="card p-${color}"`);
      expect(card).toContain(`<span class="emo">${emoji}</span>${name}`);
      expect(card).toContain(`<p class="role">${role}</p>`);
    }
  });
  test("Chart is born; unknown peer model stays explicit; workflow note appears once", () => {
    const chart = agents.find((card) => card.includes('data-session="142-chart"'))!;
    expect(chart).not.toContain("planned");
    expect(chart).toContain("เกิด 2026-10-16");
    const peer = agents.find((card) => card.includes('data-session="00-sunny"'))!;
    expect(peer).toContain("Claude · ไม่ระบุรุ่น");
    expect(html.split("Claude คิด/ตรวจ · Codex ลงมือ — OMX (Codex) ทำงานใน worktree ของ repo งาน เปิด PR ให้ Claude review/QA ก่อน merge เสมอ").length).toBe(2);
  });
});
