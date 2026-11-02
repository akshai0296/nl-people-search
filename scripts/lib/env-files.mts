// Loads .env.local and .env (like Next.js does) without overriding variables already set.
import { existsSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}
