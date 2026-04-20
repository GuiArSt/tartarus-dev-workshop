/**
 * Next.js Instrumentation — runs once on server startup
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * Uses HTTP fetch (not direct module import) so the Edge runtime bundler
 * doesn't try to analyze Node.js-only modules (better-sqlite3, fs, etc.)
 * that live deep in the sync → drizzle chain.
 */

let autoSyncStarted = false;

export async function register() {
  // Skip if Linear isn't configured
  if (!process.env.LINEAR_API_KEY) return;

  // Prevent double-registration (HMR re-runs register() in dev)
  if (autoSyncStarted) return;
  autoSyncStarted = true;

  // Only proceed in Node.js runtime — Edge functions are stateless, setInterval won't persist
  if (process.env.NEXT_RUNTIME === "edge") return;

  const INTERVAL_MS = 30 * 60 * 1_000; // 30 minutes
  // sync.ts defaults to localhost:3000 but this app runs on 3005
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";

  async function runSync(label: string) {
    try {
      console.log(`[Linear Auto-Sync] ${label} starting...`);
      const res = await fetch(`${appUrl}/api/integrations/linear/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.warn(`[Linear Auto-Sync] ${label} failed — HTTP ${res.status}: ${text.slice(0, 200)}`);
        return;
      }

      const data = await res.json();
      console.log(`[Linear Auto-Sync] ${label} done — ${data.message}`);
    } catch (err) {
      // Non-fatal — cache stays stale, user can manual-sync from UI
      console.warn("[Linear Auto-Sync] Failed:", err instanceof Error ? err.message : String(err));
    }
  }

  // Delay so the server finishes booting before we hit the sync endpoint
  setTimeout(() => {
    runSync("startup");
    setInterval(() => runSync("periodic"), INTERVAL_MS);
  }, 10_000);
}
