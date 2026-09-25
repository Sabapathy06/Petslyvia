#!/usr/bin/env node
/**
 * Petslyvia Multiplayer Load Test
 * ─────────────────────────────────────────────────────────────────────────────
 * Simulates N concurrent players using Supabase Realtime Presence + Broadcast.
 * Requires @supabase/supabase-js ≥ 2.x (already in package.json).
 *
 * Usage:
 *   node tests/loadtest/simulateMultiplayer.mjs [NUM_USERS] [SUPABASE_URL] [SUPABASE_ANON_KEY]
 *
 * Defaults:
 *   NUM_USERS = 10
 *   SUPABASE_URL     from env VITE_SUPABASE_URL
 *   SUPABASE_ANON_KEY from env VITE_SUPABASE_ANON_KEY
 *
 * What this test does:
 *   1. Creates NUM_USERS virtual Supabase clients (using anon key — no login needed for channel test)
 *   2. Each client joins the arena:lobby presence channel
 *   3. Each client publishes its presence (userId, username, petType, status, level)
 *   4. Every 5s each client updates its progress (simulates playing)
 *   5. After 30s all clients leave — final metrics are printed
 *
 * Metrics collected:
 *   - Join latency per client (ms)
 *   - Presence sync events received
 *   - Broadcast events received
 *   - Errors
 *   - Peak concurrent connections
 */

import { createClient } from "@supabase/supabase-js";

// ── Config ────────────────────────────────────────────────────────────────────
const NUM_USERS        = parseInt(process.argv[2] ?? "10");
const SUPABASE_URL     = process.argv[3] ?? process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.argv[4] ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";
const TEST_DURATION_MS = 30_000;   // 30 seconds
const PROGRESS_INTERVAL_MS = 5_000;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌  SUPABASE_URL and SUPABASE_ANON_KEY are required.");
  console.error("    Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env vars, or pass as args.");
  process.exit(1);
}

// ── Metrics ──────────────────────────────────────────────────────────────────
const metrics = {
  joined:       0,
  errors:       0,
  presenceEvents: 0,
  broadcastEvents: 0,
  joinLatencies: [],
  peakConnected: 0,
};

const PET_TYPES   = ["cat","dog","bunny","fox","panda","koala","hamster","penguin"];
const PET_STAGES  = ["infant","child","teen","adult"];
const MISSIONS    = ["Debug the Loop","Fix the Condition","Sort the Array","Parse the Tree","Graph Traversal"];

// ── Simulate one player ───────────────────────────────────────────────────────
async function simulatePlayer(index) {
  const userId   = `sim_${index}_${Date.now()}`;
  const username = `SimBot${index}`;
  const petType  = PET_TYPES[index % PET_TYPES.length];
  const petStage = PET_STAGES[index % PET_STAGES.length];
  const level    = (index % 10) + 1;
  const mission  = MISSIONS[index % MISSIONS.length];

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { params: { eventsPerSecond: 2 } },
  });

  const start = Date.now();

  return new Promise((resolve) => {
    let progressInterval = null;
    let progress = 0;

    const channel = client.channel("arena:lobby", {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => { metrics.presenceEvents++; })
      .on("presence", { event: "join" }, () => { metrics.presenceEvents++; })
      .on("presence", { event: "leave" }, () => { metrics.presenceEvents++; })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const latency = Date.now() - start;
          metrics.joinLatencies.push(latency);
          metrics.joined++;
          metrics.peakConnected = Math.max(metrics.peakConnected, metrics.joined);

          await channel.track({
            userId, username, petType, petStage,
            status: "playing", level, missionId: mission, progress: 0,
            joinedAt: new Date().toISOString(),
          });

          // Simulate progress updates every 5s
          progressInterval = setInterval(async () => {
            progress = Math.min(100, progress + Math.floor(Math.random() * 20) + 5);
            await channel.track({
              userId, username, petType, petStage,
              status: progress >= 100 ? "finished" : "playing",
              level, missionId: mission, progress,
              joinedAt: new Date().toISOString(),
            });
            // Simulate wall_broken broadcast
            if (Math.random() > 0.5) {
              await channel.send({
                type: "broadcast",
                event: "wall_broken",
                payload: { type: "wall_broken", userId, payload: { username, xpAwarded: 15 + level * 5 }, ts: Date.now() },
              });
              metrics.broadcastEvents++;
            }
          }, PROGRESS_INTERVAL_MS);

        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          metrics.errors++;
        }
      });

    // Cleanup after test duration
    setTimeout(async () => {
      if (progressInterval) clearInterval(progressInterval);
      await channel.untrack();
      await client.removeChannel(channel);
      metrics.joined--;
      resolve();
    }, TEST_DURATION_MS);
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log(`\n🚀  Petslyvia Multiplayer Load Test`);
console.log(`    Simulating ${NUM_USERS} concurrent players for ${TEST_DURATION_MS / 1000}s\n`);
console.log(`    URL: ${SUPABASE_URL}`);
console.log(`    Key: ${SUPABASE_ANON_KEY.slice(0, 20)}…\n`);

const startAll = Date.now();

// Stagger joins by 100ms to avoid thundering herd
const promises = Array.from({ length: NUM_USERS }, (_, i) =>
  new Promise((resolve) => setTimeout(() => simulatePlayer(i).then(resolve), i * 100))
);

// Progress reporter
const reporter = setInterval(() => {
  const elapsed = Math.round((Date.now() - startAll) / 1000);
  const avgLatency = metrics.joinLatencies.length > 0
    ? Math.round(metrics.joinLatencies.reduce((a, b) => a + b, 0) / metrics.joinLatencies.length)
    : 0;
  process.stdout.write(
    `\r  ⏱  ${elapsed}s  |  Connected: ${metrics.joined}/${NUM_USERS}  |  Errors: ${metrics.errors}  |  Avg Join Latency: ${avgLatency}ms  |  Presence Events: ${metrics.presenceEvents}  `
  );
}, 1000);

await Promise.all(promises);
clearInterval(reporter);

// ── Report ────────────────────────────────────────────────────────────────────
const totalTime = Date.now() - startAll;
const avgLatency = metrics.joinLatencies.length > 0
  ? Math.round(metrics.joinLatencies.reduce((a, b) => a + b, 0) / metrics.joinLatencies.length)
  : 0;
const maxLatency = metrics.joinLatencies.length > 0 ? Math.max(...metrics.joinLatencies) : 0;
const minLatency = metrics.joinLatencies.length > 0 ? Math.min(...metrics.joinLatencies) : 0;

console.log(`\n\n${"─".repeat(60)}`);
console.log(`  ✅  Load Test Complete`);
console.log(`${"─".repeat(60)}`);
console.log(`  Total time:          ${Math.round(totalTime / 1000)}s`);
console.log(`  Users simulated:     ${NUM_USERS}`);
console.log(`  Successfully joined: ${metrics.joinLatencies.length}`);
console.log(`  Errors:              ${metrics.errors}`);
console.log(`  Peak connected:      ${metrics.peakConnected}`);
console.log(`  Presence events:     ${metrics.presenceEvents}`);
console.log(`  Broadcast events:    ${metrics.broadcastEvents}`);
console.log(`  Avg join latency:    ${avgLatency}ms`);
console.log(`  Min join latency:    ${minLatency}ms`);
console.log(`  Max join latency:    ${maxLatency}ms`);
console.log(`${"─".repeat(60)}`);
console.log(`\n  🎯  Supabase Free Tier: ~500 connection limit`);
console.log(`      ${NUM_USERS} users = ${Math.round(NUM_USERS / 5)}% of capacity`);
if (metrics.errors > 0) {
  console.log(`\n  ⚠️   ${metrics.errors} errors encountered — check Supabase logs.`);
} else {
  console.log(`\n  🟢  All connections successful — system is healthy.`);
}
console.log();
