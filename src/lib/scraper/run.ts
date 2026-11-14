import pLimit from "p-limit";
import { createHttp, type Http } from "./http";
import { sanitizeDescription } from "./sanitize";
import { scrapedJobSchema, type NormalizedJob, type Source } from "./types";

export type SourceResult = {
  source: Source;
  ok: boolean;
  jobs: NormalizedJob[];
  /** Offers rejected by validation, with the reason. */
  rejected: { externalId: string | null; title: string; reason: string }[];
  error?: string;
  durationMs: number;
};

type RunOptions = {
  http?: Http;
  /** Maximum number of sources scraped at the same time. */
  concurrency?: number;
  /** A source taking longer than this is considered failed. */
  timeoutMs?: number;
  log?: (message: string) => void;
};

/** robots.txt `Crawl-delay` values we must honour, per host. */
const HOST_DELAYS_MS: Record<string, number> = {
  "www.mediacongo.net": 10_000,
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

export async function runSource(
  source: Source,
  { http = createHttp({ hostDelaysMs: HOST_DELAYS_MS }), timeoutMs, log = console.log }: RunOptions = {}
): Promise<SourceResult> {
  timeoutMs ??= source.timeoutMs ?? 5 * 60_000;
  const startedAt = performance.now();
  const result: SourceResult = { source, ok: false, jobs: [], rejected: [], durationMs: 0 };

  try {
    const raw = await withTimeout(
      source.scrape({ http, log: (message) => log(`[${source.id}] ${message}`) }),
      timeoutMs,
      source.id
    );

    const seen = new Set<string>();
    for (const job of raw) {
      const parsed = scrapedJobSchema.safeParse(job);
      if (!parsed.success) {
        // Keep the id: the offer is still listed, it must not be marked removed.
        const externalId = typeof job?.externalId === "string" && job.externalId.trim() ? job.externalId.trim() : null;
        result.rejected.push({
          externalId,
          title: String(job?.title ?? "(sans titre)"),
          reason: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
        });
        continue;
      }
      if (seen.has(parsed.data.externalId)) continue;
      seen.add(parsed.data.externalId);
      result.jobs.push({
        ...parsed.data,
        descriptionHtml: sanitizeDescription(parsed.data.descriptionHtml),
      });
    }
    result.ok = true;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  result.durationMs = Math.round(performance.now() - startedAt);
  return result;
}

/** Scrape several sources concurrently; a failing source never stops the others. */
export async function runSources(sources: Source[], options: RunOptions = {}) {
  const http = options.http ?? createHttp({ hostDelaysMs: HOST_DELAYS_MS });
  const limit = pLimit(options.concurrency ?? 4);
  return Promise.all(sources.map((source) => limit(() => runSource(source, { ...options, http }))));
}
