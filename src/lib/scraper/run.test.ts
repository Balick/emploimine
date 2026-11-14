import { describe, expect, it } from "vitest";
import { runSources } from "./run";
import { fixtureContext } from "./testing";
import { defineSource, type ScrapedJob } from "./types";

const job = (overrides: Partial<ScrapedJob> = {}): ScrapedJob => ({
  externalId: "1",
  title: "Ingénieur des mines",
  company: "Exemple SA",
  url: "https://example.com/jobs/1",
  ...overrides,
});

const source = (id: string, scrape: () => Promise<ScrapedJob[]>) =>
  defineSource({ id, name: id, website: "https://example.com", kind: "employer", scrape });

describe("runSources", () => {
  const { http } = fixtureContext([]);
  const options = { http, log: () => {} };

  it("isolates a failing source from the others", async () => {
    const [broken, working] = await runSources(
      [
        source("broken", async () => {
          throw new Error("structure changed");
        }),
        source("working", async () => [job()]),
      ],
      options
    );

    expect(broken).toMatchObject({ ok: false, error: "structure changed", jobs: [] });
    expect(working).toMatchObject({ ok: true, jobs: [expect.objectContaining({ title: "Ingénieur des mines" })] });
  });

  it("rejects invalid offers with a reason and keeps the valid ones", async () => {
    const [result] = await runSources(
      [
        source("mixed", async () => [
          job({ externalId: "ok" }),
          job({ externalId: "bad-url", url: "not a url" }),
          job({ externalId: "bad-date", closesAt: "14/11/2026" }),
        ]),
      ],
      options
    );

    expect(result.jobs.map((j) => j.externalId)).toEqual(["ok"]);
    expect(result.rejected).toHaveLength(2);
    expect(result.rejected[0].reason).toMatch(/^url:/);
    expect(result.rejected[1].reason).toMatch(/^closesAt:/);
  });

  it("sanitizes descriptions and drops duplicates", async () => {
    const [result] = await runSources(
      [
        source("html", async () => [
          job({
            descriptionHtml:
              '<h1>Poste</h1><p onclick="steal()">Texte <a href="javascript:alert(1)">x</a></p><script>alert(1)</script><img src=x onerror=alert(1)>',
          }),
          job(), // same externalId
        ]),
      ],
      options
    );

    expect(result.jobs).toHaveLength(1);
    const html = result.jobs[0].descriptionHtml!;
    expect(html).toContain("<h2>Poste</h2>");
    expect(html).not.toMatch(/script|onclick|onerror|javascript:|<img/);
  });

  it("fails a source that exceeds its time budget", async () => {
    const [result] = await runSources(
      [{ ...source("slow", () => new Promise(() => {})), timeoutMs: 50 }],
      options
    );
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/timed out/) });
  });
});
