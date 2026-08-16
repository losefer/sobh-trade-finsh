import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname);
const apiDist = path.resolve(rootDir, "artifacts", "api-server", "dist", "index.mjs");
const publicDir = path.resolve(rootDir, "artifacts", "attendance", "dist", "public");
const apiPort = 5000;
const webPort = 4173;

if (!existsSync(apiDist)) {
  console.error("ERROR: لم يتم العثور على الخادم المبني.");
  console.error(`تأكد من وجود الملف: ${apiDist}`);
  process.exit(1);
}

if (!existsSync(publicDir)) {
  console.error("ERROR: لم يتم العثور على ملفات الواجهة المبنية.");
  console.error(`تأكد من وجود المجلد: ${publicDir}`);
  process.exit(1);
}

const apiProcess = spawn(process.execPath, [apiDist], {
  cwd: path.dirname(apiDist),
  env: {
    ...process.env,
    PORT: String(apiPort),
  },
  stdio: ["ignore", "inherit", "inherit"],
});

apiProcess.on("exit", (code) => {
  console.error(`API process exited with code ${code}`);
  process.exit(code === null ? 1 : code);
});

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html": return "text/html; charset=utf-8";
    case ".js": return "application/javascript; charset=utf-8";
    case ".css": return "text/css; charset=utf-8";
    case ".json": return "application/json; charset=utf-8";
    case ".svg": return "image/svg+xml";
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".webp": return "image/webp";
    case ".woff": return "font/woff";
    case ".woff2": return "font/woff2";
    case ".ico": return "image/x-icon";
    default: return "application/octet-stream";
  }
}

const server = createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url ?? "", `http://127.0.0.1:${webPort}`);
    let pathname = reqUrl.pathname.replace(/\/+/g, "/");
    if (pathname === "/") {
      pathname = "/index.html";
    }
    const filePath = path.resolve(publicDir, `.${pathname}`);
    if (!filePath.startsWith(publicDir)) {
      res.writeHead(400);
      return res.end("Invalid request");
    }
    const exists = existsSync(filePath);
    if (!exists) {
      const spaIndex = path.join(publicDir, "index.html");
      const data = await readFile(spaIndex, "utf8");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(data);
    }
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": getContentType(filePath) });
    res.end(data);
  } catch (error) {
    console.error(error);
    res.writeHead(500);
    res.end("Server error");
  }
});

server.listen(webPort, "127.0.0.1", () => {
  console.log(`واجهة التطبيق جاهزة على http://127.0.0.1:${webPort}`);
  console.log(`خادم API جاهز على http://127.0.0.1:${apiPort}`);
  spawn("cmd", ["/c", "start", "", `http://127.0.0.1:${webPort}`], {
    detached: true,
    stdio: "ignore",
  }).unref();
});

function cleanup() {
  apiProcess.kill();
  server.close(() => process.exit(0));
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("uncaughtException", (err) => {
  console.error(err);
  cleanup();
});
