import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const directory = resolve(dirname(fileURLToPath(import.meta.url)), "dist");
const files = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/style.css", ["style.css", "text/css; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/content.js", ["content.js", "text/javascript; charset=utf-8"]],
  ["/icon.svg", ["icon.svg", "image/svg+xml"]],
  ["/timeline.js", ["timeline.js", "text/javascript; charset=utf-8"]],
  ["/timeline.css", ["timeline.css", "text/css; charset=utf-8"]],
  ["/assets/play.png", ["assets/play.png", "image/png"]],
  ["/assets/pause.png", ["assets/pause.png", "image/png"]],
  ["/assets/stop.png", ["assets/stop.png", "image/png"]],
]);

export function createManualServer() {
  return http.createServer(async (request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { Allow: "GET, HEAD", "Content-Type": "text/plain" });
      response.end("Method not allowed");
      return;
    }
    let pathname;
    try { pathname = new URL(request.url, "http://localhost").pathname; }
    catch { response.writeHead(400); response.end("Bad request"); return; }
    if (pathname === "/healthz") {
      response.writeHead(200, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
      response.end(request.method === "HEAD" ? undefined : "ok");
      return;
    }
    const entry = files.get(pathname);
    if (!entry) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(request.method === "HEAD" ? undefined : "Page not found");
      return;
    }
    try {
      const data = await readFile(resolve(directory, entry[0]));
      response.writeHead(200, {
        "Content-Type": entry[1],
        "Content-Length": data.length,
        "Cache-Control": "no-cache",
      });
      response.end(request.method === "HEAD" ? undefined : data);
    } catch (error) {
      console.error("Unable to serve manual asset:", error.code);
      response.writeHead(500, { "Content-Type": "text/plain" });
      response.end("Unable to load the manual");
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createManualServer();
  server.listen(Number(process.env.PORT) || 3000, "0.0.0.0", () => {
    console.log("Petal manual is listening on port " + server.address().port);
  });
  process.on("SIGTERM", () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 9000).unref();
  });
}
