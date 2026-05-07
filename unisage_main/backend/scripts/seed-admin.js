/**
 * Seed script — create an admin user for the UniSage admin dashboard.
 * Usage: node scripts/seed-admin.js
 */

require("dotenv").config();
const bcrypt = require("bcrypt");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ADMIN_EMAIL = "admin@unisage.com";
const ADMIN_PASSWORD = "Admin@123";
const ADMIN_NAME = "Admin";

async function seedAdmin() {
  console.log("🔧 Seeding admin user...\n");

  // Check if admin already exists
  const { data: existing, error: existingErr } = await supabase
    .from("users")
    .select("id, email, role")
    .eq("email", ADMIN_EMAIL)
    .single();

  if (existingErr && existingErr.code !== "PGRST116") {
    if (existingErr.code === "PGRST205") {
      console.error("❌ Database schema not initialized.");
      console.error(
        "   Run backend/database/schema.sql in Supabase SQL Editor, then retry this script."
      );
      console.error("   Details:", existingErr.message);
      process.exit(1);
    }

    console.error(
      "❌ Failed while checking existing admin:",
      existingErr.message
    );
    console.error("   Details:", existingErr);
    process.exit(1);
  }

  if (existing) {
    if (existing.role === "admin") {
      console.log("✅ Admin user already exists.");
    } else {
      // Promote to admin
      const { error } = await supabase
        .from("users")
        .update({ role: "admin" })
        .eq("id", existing.id);

      if (error) {
        console.error("❌ Failed to promote user to admin:", error.message);
        process.exit(1);
      }
      console.log("✅ Existing user promoted to admin.");
    }
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    process.exit(0);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  // Insert admin user (without college/branch — admin doesn't need them)
  const { data: user, error } = await supabase
    .from("users")
    .insert({
      email: ADMIN_EMAIL,
      password_hash: passwordHash,
      full_name: ADMIN_NAME,
      role: "admin",
      year: 1,
    })
    .select("id, email, role")
    .single();

  if (error) {
    if (error.code === "PGRST205") {
      console.error("❌ Database schema not initialized.");
      console.error(
        "   Run backend/database/schema.sql in Supabase SQL Editor, then retry this script."
      );
      console.error("   Details:", error.message);
      process.exit(1);
    }

    console.error("❌ Failed to create admin user:", error.message);
    console.error("   Details:", error);
    process.exit(1);
  }

  console.log("✅ Admin user created successfully!");
  console.log(`   ID:       ${user.id}`);
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   Role:     ${user.role}`);
}

seedAdmin().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});
