import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { createManualServer } from "../server.mjs";

let server, base;
before(async () => {
  server = createManualServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  base = "http://127.0.0.1:" + server.address().port;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });

test("serves the complete manual and all required assets", async () => {
  for (const path of ["/", "/style.css", "/app.js", "/content.js", "/icon.svg"]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.ok((await response.text()).length > 0);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  }
});
test("handles health, HEAD, missing paths, and unsupported methods", async () => {
  assert.equal(await (await fetch(base + "/healthz")).text(), "ok");
  const head = await fetch(base + "/", { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  for (const path of ["/missing", "/server.mjs", "/package.json", "/.openai/hosting.json", "/%2e%2e%2fserver.mjs"]) {
    assert.equal((await fetch(base + path)).status, 404, path);
  }
  assert.equal((await fetch(base + "/", {method:"POST"})).status, 405);
});
test("all manual links resolve to existing chapters and sections", async () => {
  const source = await readFile(new URL("../dist/content.js", import.meta.url), "utf8");
  const context = vm.createContext({});
  const chapters = vm.runInContext(source + "\nchapters", context);
  assert.equal(chapters.length, 12);
  assert.equal(new Set(chapters.map(chapter => chapter.id)).size, 12);
  for (const chapter of chapters) {
    assert.ok(chapter.sections.length >= 3);
    assert.equal(new Set(chapter.sections.map(section => section.id)).size, chapter.sections.length);
    const html = chapter.sections.map(section => section.html).join("");
    for (const match of html.matchAll(/href="#([^"]+)"/g)) {
      const [id, section] = match[1].split("~");
      const target = chapters.find(chapter => chapter.id === id);
      assert.ok(target, "Unknown chapter: " + id);
      if (section) assert.ok(target.sections.some(s => s.id === section));
    }
  }
});
