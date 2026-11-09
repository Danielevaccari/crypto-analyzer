export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Public endpoints are rate limited per IP; cap concurrent requests per host.
const MAX_CONCURRENT = 4;
const active = new Map<string, number>();
const waiting = new Map<string, (() => void)[]>();

async function acquire(host: string) {
  if ((active.get(host) ?? 0) >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => {
      const q = waiting.get(host) ?? [];
      q.push(resolve);
      waiting.set(host, q);
    });
  }
  active.set(host, (active.get(host) ?? 0) + 1);
}

function release(host: string) {
  active.set(host, (active.get(host) ?? 1) - 1);
  waiting.get(host)?.shift()?.();
}

export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const host = new URL(url).host;
  for (let attempt = 0; ; attempt += 1) {
    await acquire(host);
    let res: Response;
    try {
      res = await fetch(url, { signal });
    } catch (err) {
      if (signal?.aborted) throw err;
      throw new Error(`${host} is unreachable`, { cause: err });
    } finally {
      release(host);
    }
    if (res.ok) return (await res.json()) as T;
    if (res.status === 429 && attempt < 3) {
      await sleep(800 * (attempt + 1));
      continue;
    }
    throw new HttpError(res.status, res.status === 429 ? `${host} rate limit reached` : `${host} returned ${res.status}`);
  }
}
