import app from "./app";
import { logger } from "./lib/logger";
import net from "node:net";

const rawPort = process.env["PORT"] ?? "5000";
const requestedPort = Number(rawPort);

if (Number.isNaN(requestedPort) || requestedPort <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

function listenOnFreePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        void listenOnFreePort(startPort + 1).then(resolve, reject);
        return;
      }

      reject(error);
    });

    server.listen(startPort, () => {
      server.close(() => resolve(startPort));
    });
  });
}

const port = await listenOnFreePort(requestedPort);

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
