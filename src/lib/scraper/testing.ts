import { readFileSync } from "node:fs";
import path from "node:path";
import type { Http, RequestOptions } from "./http";
import type { ScrapeContext } from "./types";

type Route = {
  /** Substring or pattern matched against the requested URL. */
  match: string | RegExp;
  /** Optional check on the request (e.g. the JSON body of a POST). */
  when?: (options: RequestOptions | undefined) => boolean;
  /** Fixture file (relative to `__fixtures__/`) or inline body. */
  file?: string;
  body?: string | object;
};

const FIXTURES_DIR = path.join(import.meta.dirname, "sources", "__fixtures__");

/**
 * Fake HTTP client for offline tests: each request is answered from a saved
 * fixture. Unknown URLs throw, so a test fails loudly when a source starts
 * requesting something new.
 */
export function fixtureContext(routes: Route[]): ScrapeContext & { requests: string[] } {
  const requests: string[] = [];

  const resolve = (url: string, options?: RequestOptions): string => {
    requests.push(url);
    const route = routes.find(
      (r) =>
        (typeof r.match === "string" ? url.includes(r.match) : r.match.test(url)) &&
        (!r.when || r.when(options))
    );
    if (!route) throw new Error(`No fixture for ${url}`);
    if (route.file) return readFileSync(path.join(FIXTURES_DIR, route.file), "utf8");
    return typeof route.body === "string" ? route.body : JSON.stringify(route.body);
  };

  const http: Http = {
    async text(url, options) {
      return resolve(url, options);
    },
    async json(url, options) {
      return JSON.parse(resolve(url, options));
    },
  };

  return { http, log: () => {}, requests };
}
