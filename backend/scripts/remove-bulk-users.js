#!/usr/bin/env node
/*
  remove-bulk-users.js

  Usage examples:
    # Dry run with domain filter
    node remove-bulk-users.js --domain=stu.upes.ac.in

    # Inspect users created after a date
    node remove-bulk-users.js --created-after=2026-05-01 --dry-run

    # Actually delete (requires interactive confirm)
    node remove-bulk-users.js --domain=stu.upes.ac.in --execute

  The script supports combination of filters and deletes in batches.
*/

const { supabase } = require("../src/config/database");
const readline = require("readline");

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  args.forEach((a) => {
    const [k, v] = a.split("=");
    const key = k.replace(/^--/, "");
    opts[key] = v === undefined ? true : v;
  });
  return opts;
}

function isoOrNull(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

async function confirmPrompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase());
    })
  );
}

async function run() {
  const opts = parseArgs();

  const dryRun = opts["dry-run"] !== undefined || opts.dry === undefined && !opts.execute;
  const execute = opts.execute !== undefined;
  const domain = opts.domain || null;
  const createdAfter = isoOrNull(opts["created-after"] || opts.after);
  const createdBefore = isoOrNull(opts["created-before"] || opts.before);
  const minNameLength = opts["min-name-length"] ? parseInt(opts["min-name-length"], 10) : null;
  const pattern = opts.pattern ? new RegExp(opts.pattern) : null;
  const batchSize = Math.min(parseInt(opts["batch-size"] || "500", 10), 1000);
  const limit = parseInt(opts.limit || "0", 10) || 0;

  console.log("Running remove-bulk-users with options:", {
    dryRun: !execute,
    execute: !!execute,
    domain,
    createdAfter,
    createdBefore,
    minNameLength,
    pattern: opts.pattern || null,
    batchSize,
    limit: limit || 'unlimited',
  });

  let offset = 0;
  let totalMatched = 0;
  const idsToDelete = [];

  while (true) {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, full_name, created_at", { count: "exact" })
      .order("created_at", { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error("Failed to fetch users:", error);
      process.exit(1);
    }

    if (!data || data.length === 0) break;

    for (const u of data) {
      if (limit && totalMatched >= limit) break;

      if (domain && !(u.email || "").toLowerCase().endsWith("@" + domain.toLowerCase())) continue;
      if (createdAfter && new Date(u.created_at) < new Date(createdAfter)) continue;
      if (createdBefore && new Date(u.created_at) > new Date(createdBefore)) continue;
      if (minNameLength && (!u.full_name || String(u.full_name).length < minNameLength)) continue;
      if (pattern && !(pattern.test(u.full_name || u.email || ""))) continue;

      idsToDelete.push(u.id);
      totalMatched += 1;
    }

    if (limit && totalMatched >= limit) break;
    offset += batchSize;
  }

  console.log(`Matched ${idsToDelete.length} users for deletion.`);

  if (idsToDelete.length === 0) {
    console.log("Nothing to delete. Exiting.");
    process.exit(0);
  }

  if (!execute) {
    console.log("Dry run mode — sample matches:");
    const sample = idsToDelete.slice(0, 20);
    const { data: sampleData } = await supabase
      .from("users")
      .select("id, email, full_name, created_at")
      .in("id", sample)
      .limit(20);

    console.table(
      (sampleData || []).map((r) => ({ id: r.id, email: r.email, full_name: r.full_name, created_at: r.created_at }))
    );
    console.log("No changes made. Rerun with --execute to perform deletion.");
    process.exit(0);
  }

  // Ask for confirmation
  const answer = await confirmPrompt(
    `This will permanently delete ${idsToDelete.length} users. Type 'yes' to confirm: `
  );
  if (answer !== "yes") {
    console.log("Aborted by user.");
    process.exit(0);
  }

  // Delete in chunks
  let deleted = 0;
  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const chunk = idsToDelete.slice(i, i + batchSize);
    const { error: delError } = await supabase.from("users").delete().in("id", chunk);
    if (delError) {
      console.error("Failed to delete chunk:", delError);
      process.exit(1);
    }
    deleted += chunk.length;
    console.log(`Deleted ${deleted}/${idsToDelete.length}`);
  }

  console.log(`Completed deletion of ${deleted} users.`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
