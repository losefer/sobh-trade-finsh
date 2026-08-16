import net from "node:net";
import { spawn } from "node:child_process";
import process from "node:process";

const pnpmExecutable = process.env.npm_execpath;

if (!pnpmExecutable) {
  throw new Error("npm_execpath was not provided by pnpm.");
}

function runPnpm(args, envOverrides = {}) {
  return spawn(process.execPath, [pnpmExecutable, ...args], {
    stdio: "inherit",
    env: {
      ...process.env,
      ...envOverrides,
    },
  });
}

function runNode(filePath, options = {}) {
  return spawn(process.execPath, [filePath], {
    stdio: "inherit",
    cwd: options.cwd,
    env: {
      ...process.env,
      ...options.env,
    },
  });
}

function waitForFreePort(startPort) {
  return new Promise((resolve) => {
    const attempt = (port) => {
      const server = net.createServer();

      server.unref();
      server.once("error", () => attempt(port + 1));
      server.listen({ port, host: "127.0.0.1" }, () => {
        server.close(() => resolve(port));
      });
    };

    attempt(startPort);
  });
}

async function main() {
  const apiPort = await waitForFreePort(5000);
  const webPort = await waitForFreePort(4173);

  const buildSteps = [
    ["--filter", "@workspace/api-server", "run", "build"],
    ["--filter", "@workspace/attendance", "run", "build"],
  ];

  for (const args of buildSteps) {
    await new Promise((resolve, reject) => {
      const child = runPnpm(args);
      child.on("exit", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pnpm ${args.join(" ")} failed with code ${code}`));
        }
      });
    });
  }

  const apiProcess = runNode("./dist/index.mjs", {
    cwd: "./artifacts/api-server",
    env: {
      PORT: String(apiPort),
    },
  });

  const webProcess = runPnpm(["--filter", "@workspace/attendance", "run", "serve"], {
    PORT: String(webPort),
    BASE_PATH: "/",
    VITE_API_BASE_URL: `http://127.0.0.1:${apiPort}`,
  });

  const cleanup = () => {
    apiProcess.kill();
    webProcess.kill();
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  webProcess.on("exit", (code) => {
    cleanup();
    process.exit(code ?? 1);
  });

  apiProcess.on("exit", (code) => {
    cleanup();
    process.exit(code ?? 1);
  });

  const targetUrl = `http://127.0.0.1:${webPort}/`;
  spawn("cmd", ["/c", "start", "", targetUrl], {
    detached: true,
    stdio: "ignore",
  }).unref();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});