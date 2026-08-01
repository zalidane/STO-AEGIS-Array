import type { Pool, PoolClient } from "pg";

/**
 * Prisma adapter-pg can issue concurrent queries on a single transaction
 * PoolClient (query interpreter Array.map). pg@8 warns; pg@9 will throw.
 * Serialize query() on clients checked out via pool.connect().
 */
export function installSerializedPoolClients(pool: Pool): void {
  const originalConnect = pool.connect.bind(pool) as {
    (): Promise<PoolClient>;
    (
      callback: (
        err: Error | undefined,
        client: PoolClient | undefined,
        done: (release?: unknown) => void,
      ) => void,
    ): void;
  };

  function wrapClient(client: PoolClient): PoolClient {
    serializeClientQueries(client);
    return client;
  }

  (pool as any).connect = (...args: unknown[]) => {
    if (typeof args[0] === "function") {
      const callback = args[0] as (
        err: Error | undefined,
        client: PoolClient | undefined,
        done: (release?: unknown) => void,
      ) => void;
      return originalConnect((err, client, done) => {
        if (client) wrapClient(client);
        callback(err, client, done);
      });
    }

    return originalConnect().then(wrapClient);
  };
}

function serializeClientQueries(client: PoolClient): void {
  const marked = client as PoolClient & { __querySerialized?: boolean };
  if (marked.__querySerialized) return;
  marked.__querySerialized = true;

  const originalQuery = client.query.bind(client) as (
    ...args: unknown[]
  ) => Promise<unknown> | void;
  let gate: Promise<unknown> = Promise.resolve();

  (client as any).query = (...args: unknown[]) => {
    const run = gate.then(() => originalQuery(...args));
    gate = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
}
