import { rmSync } from "node:fs";

const userAgent = process.env.npm_config_user_agent ?? "";

if (!userAgent.startsWith("pnpm/")) {
  console.error("Use pnpm instead");
  process.exit(1);
}

for (const filePath of ["package-lock.json", "yarn.lock"]) {
  try {
    rmSync(filePath, { force: true });
  } catch {
    // Ignore lockfiles that are already gone.
  }
}