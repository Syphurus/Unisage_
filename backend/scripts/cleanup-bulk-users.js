#!/usr/bin/env node
/**
 * Cleanup script for accidentally bulk-created users.
 *
 * Usage examples:
 *   node scripts/cleanup-bulk-users.js --email-domain=stu.upes.ac.in --created-after=2026-05-12T00:00:00Z
 *   node scripts/cleanup-bulk-users.js --email-domain=stu.upes.ac.in --created-after=2026-05-12T00:00:00Z --execute
 *
 * Notes:
 * - Runs in dry-run mode by default.
 * - Pass --execute to actually delete users.
 * - At least one filter is required to prevent accidental wide deletes.
 */

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

function parseArgs(argv) {
  const out = {
    role: "student",
    emailDomain: "",
    createdAfter: "",
    createdBefore: "",
    nameContains: "",
    execute: false,
  };

  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    if (arg === "--execute") {
      out.execute = true;
      continue;
    }

    const [rawKey, ...rest] = arg.slice(2).split("=");
    const value = rest.join("=").trim();

    switch (rawKey) {
      case "role":
        out.role = value || out.role;
        break;
      case "email-domain":
        out.emailDomain = value.toLowerCase();
        break;
      case "created-after":
        out.createdAfter = value;
        break;
      case "created-before":
        out.createdBefore = value;
        break;
      case "name-contains":
        out.nameContains = value;
        break;
      default:
        break;
    }
  }

  return out;
}

function toIsoOrNull(input, label) {
  if (!input) return null;
  const asDate = new Date(input);
  if (Number.isNaN(asDate.getTime())) {
    throw new Error(`Invalid ${label}: ${input}`);
  }
  return asDate.toISOString();
}

function hasAnyFilter(opts) {
  return Boolean(
    opts.emailDomain ||
      opts.createdAfter ||
      opts.createdBefore ||
      opts.nameContains
  );
}

async function fetchMatchingUsers(opts) {
  const pageSize = 1000;
  let page = 0;
  const all = [];

  while (true) {
    let query = supabase
      .from("users")
      .select("id, email, full_name, role, created_at", { count: "exact" })
      .eq("role", opts.role)
      .order("created_at", { ascending: true })
      .range(page * pageSize, page * pageSize + pageSize - 1);

    if (opts.emailDomain) {
      query = query.ilike("email", `%@${opts.emailDomain}`);
    }
    if (opts.createdAfter) {
      query = query.gte("created_at", opts.createdAfter);
    }
    if (opts.createdBefore) {
      query = query.lte("created_at", opts.createdBefore);
    }
    if (opts.nameContains) {
      query = query.ilike("full_name", `%${opts.nameContains}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch users: ${error.message}`);

    if (!data || data.length === 0) break;
    all.push(...data);

    if (data.length < pageSize) break;
    page += 1;
  }

  return all;
}

async function deleteByIds(ids) {
  const chunkSize = 200;
  let deleted = 0;

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { error } = await supabase.from("users").delete().in("id", chunk);

    if (error) {
      throw new Error(
        `Delete failed for chunk ${Math.floor(i / chunkSize) + 1}: ${error.message}`
      );
    }

    deleted += chunk.length;
    console.log(`Deleted ${deleted}/${ids.length}`);
  }

  return deleted;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!["student", "admin"].includes(options.role)) {
    throw new Error("--role must be either 'student' or 'admin'");
  }

  options.createdAfter = toIsoOrNull(options.createdAfter, "created-after");
  options.createdBefore = toIsoOrNull(options.createdBefore, "created-before");

  if (!hasAnyFilter(options)) {
    throw new Error(
      "At least one filter is required (--email-domain, --created-after, --created-before, --name-contains)"
    );
  }

  console.log("Finding matching users with filters:");
  console.log({
    role: options.role,
    emailDomain: options.emailDomain || "(none)",
    createdAfter: options.createdAfter || "(none)",
    createdBefore: options.createdBefore || "(none)",
    nameContains: options.nameContains || "(none)",
    mode: options.execute ? "execute" : "dry-run",
  });

  const users = await fetchMatchingUsers(options);
  console.log(`Matched users: ${users.length}`);

  if (users.length === 0) {
    console.log("Nothing to delete.");
    return;
  }

  console.log("Sample matches:");
  users.slice(0, 10).forEach((u) => {
    console.log(`- ${u.id} | ${u.email} | ${u.full_name} | ${u.created_at}`);
  });

  if (!options.execute) {
    console.log("\nDry run complete. Re-run with --execute to delete matched users.");
    return;
  }

  const deleted = await deleteByIds(users.map((u) => u.id));
  console.log(`\nDone. Deleted ${deleted} users.`);
}

main().catch((err) => {
  console.error("Cleanup failed:", err.message || err);
  process.exit(1);
});
