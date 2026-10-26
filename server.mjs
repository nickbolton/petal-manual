import http from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve, dirname, extname, relative, sep } from "node:path";

const directory = resolve(dirname(fileURLToPath(import.meta.url)), "build/client");
const types = {".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".svg":"image/svg+xml", ".png":"image/png", ".data":"text/x-script; charset=utf-8", ".ico":"image/x-icon"};
async function publicFiles() {
  const paths = await readdir(directory, {recursive:true, withFileTypes:true});
  const files = new Map();
  for (const item of paths) {
    if (!item.isFile() || !types[extname(item.name)] || item.name.startsWith("__")) continue;
    const path = resolve(item.parentPath, item.name);
    const url = "/" + relative(directory, path).split(sep).join("/");
    files.set(url, path);
    if (url.endsWith("/index.html")) {
      const route = url.slice(0, -11) || "/";
      files.set(route, path);
      if (route !== "/") files.set(route + "/", path);
    }
  }
  return files;
}
export function createManualServer() {
  const files = publicFiles();
  return http.createServer(async (request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, {Allow:"GET, HEAD", "Content-Type":"text/plain"});response.end("Method not allowed");return;
    }
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname); }
    catch {response.writeHead(400);response.end("Bad request");return;}
    if (pathname === "/healthz") {
      response.writeHead(200, {"Content-Type":"text/plain", "Cache-Control":"no-store"});response.end(request.method === "HEAD" ? undefined : "ok");return;
    }
    try {
      const fileMap = await files;
      const path = fileMap.get(pathname);
      const data = await readFile(path || resolve(directory, "404.html"));
      const html = extname(path || "404.html") === ".html";
      // Pre-rendered React bootstrapping uses inline scripts. Authorize their
      // exact content rather than enabling arbitrary inline JavaScript.
      const hashes = html ? Array.from(data.toString().matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g), match => match[1]).filter(Boolean).map(script => "'sha256-" + createHash("sha256").update(script).digest("base64") + "'") : [];
      response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' " + hashes.join(" ") + "; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
      response.writeHead(path ? 200 : 404, {"Content-Type":types[extname(path || "404.html")], "Content-Length":data.length, "Cache-Control":pathname.startsWith("/assets/") && /-[\w-]{8,}\./.test(pathname) ? "public, max-age=31536000, immutable" : "no-cache"});
      response.end(request.method === "HEAD" ? undefined : data);
    } catch (error) {
      console.error("Unable to serve manual asset:", error.code);
      response.writeHead(500, {"Content-Type":"text/plain"});response.end("Unable to load the manual");
    }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createManualServer();
  server.listen(Number(process.env.PORT) || 3000, "0.0.0.0", () => console.log("Petal manual is listening on port " + server.address().port));
  process.on("SIGTERM", () => {server.close(() => process.exit(0));setTimeout(() => process.exit(0), 9000).unref();});
}
