import { spawnSync } from "node:child_process";

const pnpmPath = process.env.npm_execpath;

if (!pnpmPath) {
  console.error("Missing npm_execpath; cannot launch pnpm from dev script.");
  process.exit(1);
}

const env = {
  ...process.env,
  NODE_ENV: "development",
};

const build = spawnSync(process.execPath, [pnpmPath, "run", "build"], {
  stdio: "inherit",
  env,
});

if (build.error) {
  console.error(build.error);
  process.exit(1);
}

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const start = spawnSync(process.execPath, [pnpmPath, "run", "start"], {
  stdio: "inherit",
  env,
});

if (start.error) {
  console.error(start.error);
  process.exit(1);
}

process.exit(start.status ?? 1);