/**
 * @fileoverview Supabase client configuration.
 * Creates two clients:
 *  - supabase       → Uses service role key (bypasses RLS, for backend operations)
 *  - supabasePublic → Uses anon key (respects RLS, for client-facing queries)
 */

const { createClient } = require("@supabase/supabase-js");
const env = require("./env");

/**
 * Admin Supabase client — uses the service role key.
 * Bypasses Row Level Security. Use for all backend CRUD operations.
 * NEVER expose the service key to the client.
 */
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  // Connection pooling-friendly settings for Railway's 512 MB limit
  db: {
    schema: "public",
  },
});

/**
 * Public Supabase client — uses the anonymous key.
 * Respects Row Level Security policies.
 */
const supabasePublic = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

module.exports = { supabase, supabasePublic };
