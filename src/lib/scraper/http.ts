/**
 * Small, polite HTTP client used by every source.
 *
 * - identifies itself with a bot User-Agent that links back to the project;
 * - times out and retries transient failures (network errors, 429, 5xx);
 * - waits between two requests to the same host (configurable per host,
 *   e.g. to honour a robots.txt `Crawl-delay`).
 */

export const USER_AGENT =
  "Mozilla/5.0 (compatible; EmploiMineBot/1.0; +https://github.com/Balick/emploimine)";

export type RequestOptions = {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  /** JSON body; sets `content-type: application/json`. */
  json?: unknown;
  /** Form body; sets `content-type: application/x-www-form-urlencoded`. */
  form?: Record<string, string>;
  timeoutMs?: number;
};

export interface Http {
  text(url: string, options?: RequestOptions): Promise<string>;
  json<T = unknown>(url: string, options?: RequestOptions): Promise<T>;
}

export class HttpError extends Error {
  constructor(
    readonly url: string,
    readonly status: number,
    readonly body: string
  ) {
    super(`HTTP ${status} for ${url}`);
    this.name = "HttpError";
  }
}

type HttpConfig = {
  /** Minimum delay between two requests to the same host. Default 1 s. */
  defaultDelayMs?: number;
  /** Per-host delays, e.g. `{ "www.mediacongo.net": 10_000 }`. */
  hostDelaysMs?: Record<string, number>;
  retries?: number;
  timeoutMs?: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createHttp(config: HttpConfig = {}): Http {
  const {
    defaultDelayMs = 1_000,
    hostDelaysMs = {},
    retries = 2,
    timeoutMs = 30_000,
  } = config;

  // Serialises requests per host so that the delay is respected even when a
  // source fires requests concurrently.
  const hostQueues = new Map<string, Promise<void>>();

  async function throttle(host: string) {
    const delay = hostDelaysMs[host] ?? defaultDelayMs;
    const previous = hostQueues.get(host) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => (release = resolve));
    hostQueues.set(
      host,
      previous.then(() => current)
    );
    await previous;
    setTimeout(release, delay);
  }

  async function request(url: string, options: RequestOptions = {}) {
    const headers: Record<string, string> = {
      "user-agent": USER_AGENT,
      "accept-language": "fr-FR,fr;q=0.9,en;q=0.8",
      ...options.headers,
    };
    let body: string | undefined;
    if (options.json !== undefined) {
      body = JSON.stringify(options.json);
      headers["content-type"] ??= "application/json";
    } else if (options.form) {
      body = new URLSearchParams(options.form).toString();
      headers["content-type"] ??= "application/x-www-form-urlencoded";
    }

    const host = new URL(url).host;
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) await sleep(1_000 * 2 ** attempt);
      await throttle(host);
      try {
        const response = await fetch(url, {
          method: options.method ?? (body ? "POST" : "GET"),
          headers,
          body,
          redirect: "follow",
          signal: AbortSignal.timeout(options.timeoutMs ?? timeoutMs),
        });
        if (response.ok) return response;

        const text = await response.text().catch(() => "");
        const error = new HttpError(url, response.status, text.slice(0, 500));
        if (response.status !== 429 && response.status < 500) throw error;
        lastError = error;
      } catch (error) {
        if (error instanceof HttpError && error.status < 500 && error.status !== 429) {
          throw error;
        }
        lastError = error;
      }
    }
    throw lastError;
  }

  return {
    async text(url, options) {
      return (await request(url, options)).text();
    },
    async json(url, options) {
      const response = await request(url, {
        ...options,
        headers: { accept: "application/json", ...options?.headers },
      });
      return response.json();
    },
  };
}
