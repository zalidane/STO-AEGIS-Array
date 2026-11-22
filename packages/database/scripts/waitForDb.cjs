/**
 * Wait until DATABASE_URL accepts connections (Railway pre-deploy).
 * The private network can take a moment to resolve postgres.railway.internal
 * when a container starts, so retry before `prisma migrate deploy` runs.
 *
 * Prints only the host, never the URL (it contains the password).
 *
 * Env: DATABASE_URL (required), DB_WAIT_ATTEMPTS (default 15),
 *      DB_WAIT_INTERVAL_MS (default 2000)
 */
const { Client } = require("pg");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("waitForDb: DATABASE_URL is not set.");
  process.exit(1);
}

let host = "(unparsed)";
try {
  host = new URL(url).host;
} catch {
  // Keep the placeholder; never echo the raw value.
}

const attempts = Number(process.env.DB_WAIT_ATTEMPTS ?? 15);
const intervalMs = Number(process.env.DB_WAIT_INTERVAL_MS ?? 2000);

async function tryOnce() {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    await client.query("SELECT 1");
  } finally {
    await client.end().catch(() => {});
  }
}

(async () => {
  for (let i = 1; i <= attempts; i++) {
    try {
      await tryOnce();
      console.log(`waitForDb: ${host} is ready (attempt ${i}).`);
      return;
    } catch (error) {
      const code = error && error.code ? error.code : "error";
      console.log(`waitForDb: ${host} not ready (${code}), attempt ${i}/${attempts}`);
      if (i === attempts) {
        console.error("waitForDb: giving up.");
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
})();
