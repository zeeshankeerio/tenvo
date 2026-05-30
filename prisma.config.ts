import { defineConfig } from "prisma/config";
import dotenv from "dotenv";
import path from "node:path";
import { existsSync } from "node:fs";

const root = process.cwd();
function loadEnv() {
  const envPath = path.join(root, ".env");
  const localPath = path.join(root, ".env.local");
  if (existsSync(envPath)) dotenv.config({ path: envPath });
  if (existsSync(localPath)) dotenv.config({ path: localPath, override: true });
}

loadEnv();

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        // Migrations need a reachable Postgres URL. Prefer direct (non-pooler) for DDL;
        // fall back to DATABASE_URL so `migrate deploy` works when only DATABASE_URL is set.
        url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
    },
});
