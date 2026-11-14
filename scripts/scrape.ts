/**
 * Scrape job sources and (unless --dry-run) store the results in Supabase,
 * then email the new offers to newsletter subscribers.
 *
 *   npm run scrape                          # all sources, store + notify
 *   npm run scrape -- --dry-run             # all sources, print only
 *   npm run scrape -- --source=kobold-metals --dry-run --json
 *
 * Exit code is 1 when a source, the storage of a source or the newsletter
 * failed, so CI surfaces breakages; everything that could be done is done.
 */
import { parseArgs } from "node:util";
import { runSources } from "@/lib/scraper/run";
import { sources as registry } from "@/lib/scraper/sources";
import type { Source } from "@/lib/scraper/types";

const { values } = parseArgs({
  options: {
    source: { type: "string", short: "s" },
    "dry-run": { type: "boolean", default: false },
    json: { type: "boolean", default: false },
    "no-email": { type: "boolean", default: false },
  },
});

async function loadSources(ids: string[] | undefined): Promise<Source[]> {
  if (!ids) return registry;
  return Promise.all(
    ids.map(async (id) => {
      const registered = registry.find((source) => source.id === id);
      if (registered) return registered;
      // Not registered yet: load the file directly, handy while developing.
      const mod = await import(`../src/lib/scraper/sources/${id}.ts`);
      const source: Source | undefined = mod.default;
      if (!source) throw new Error(`src/lib/scraper/sources/${id}.ts has no default export`);
      return source;
    })
  );
}

async function main() {
  const ids = values.source?.split(",").map((id) => id.trim()).filter(Boolean);
  const selected = await loadSources(ids);
  const log = values.json ? (m: string) => console.error(m) : console.log;

  log(`Scraping ${selected.length} source(s)…`);
  const results = await runSources(selected, { log });

  if (values.json) {
    console.log(JSON.stringify(results.flatMap((r) => r.jobs.map((job) => ({ source: r.source.id, ...job }))), null, 2));
  }

  console.error(
    "\n" +
      results
        .map((r) => {
          const status = r.ok ? "✔" : "✘";
          const extra = r.ok
            ? `${r.jobs.length} offre(s)${r.rejected.length ? `, ${r.rejected.length} rejetée(s)` : ""}`
            : r.error;
          return `${status} ${r.source.id.padEnd(22)} ${String(r.durationMs).padStart(6)} ms  ${extra}`;
        })
        .join("\n")
  );
  for (const r of results) {
    for (const rejected of r.rejected) console.error(`  ↳ [${r.source.id}] rejetée « ${rejected.title} » : ${rejected.reason}`);
  }

  let failed = results.some((r) => !r.ok);

  if (!values["dry-run"]) {
    const { storeResults } = await import("@/lib/scraper/store");
    const summaries = await storeResults(results);
    const inserted = summaries.reduce((sum, s) => sum + s.inserted, 0);
    console.error(`\n${inserted} nouvelle(s) offre(s) enregistrée(s).`);
    if (summaries.some((s) => s.error)) failed = true;

    // Sends every offer not notified yet, including those of a previous run
    // whose digest failed. With --no-email they simply stay pending.
    if (!values["no-email"]) {
      const { sendPendingOffers } = await import("@/lib/newsletter");
      try {
        await sendPendingOffers();
      } catch (error) {
        console.error("Newsletter :", error);
        failed = true;
      }
    }
  }

  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
