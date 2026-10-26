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
  for (const path of ["/", "/style.css", "/app.js", "/content.js", "/icon.svg", "/timeline.js", "/timeline.css", "/assets/play.png", "/assets/pause.png", "/assets/stop.png"]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.ok((await response.arrayBuffer()).byteLength > 0);
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


test("sticky section headers match the iOS leading and trailing limits", async () => {
  const source = await readFile(new URL("../dist/timeline.js", import.meta.url), "utf8");
  const timeline = vm.runInContext(source + "\nPetalTimeline", vm.createContext({}));
  assert.equal(timeline.stickyOffset(0, 640, 0, 990, 140), 0);
  assert.equal(timeline.stickyOffset(500, 640, 0, 990, 140), 239);
  // Its onscreen x is 320 - 500 + 239, exactly the native 59-point inset.
  assert.equal(320 - 500 + timeline.stickyOffset(500, 640, 0, 990, 140), 59);
  assert.equal(timeline.stickyOffset(1200, 640, 0, 990, 140), 788);
  assert.equal(timeline.stickyOffset(500, 640, 992, 990, 140), 0);
  assert.equal(timeline.position(16).section, "Verse");
  assert.equal(timeline.position(32).section, "Chorus");
  assert.equal(timeline.position(48).bar, 12);
  assert.equal(timeline.position(-1).beat, 0);
});


test("the illustration exposes only controls connected to an action", async () => {
  const source = await readFile(new URL("../dist/timeline.js", import.meta.url), "utf8");
  const timeline = vm.runInContext(source + "\nPetalTimeline", vm.createContext({}));
  const html = timeline.markup();
  assert.equal([...html.matchAll(/<button\b/g)].length, 5);
  assert.ok(html.includes('id="demo-play"'));
  assert.ok(html.includes('id="demo-stop"'));
  for (const name of ["list", "settings", "previous", "next"]) {
    assert.ok(!html.includes("petal-icon-" + name));
  }
  assert.ok(!html.includes("Preload"));
  assert.ok(!html.includes(">Edit<"));
});


test("timeline motion stays linear at sub-beat positions", async () => {
  const source = await readFile(new URL("../dist/timeline.js", import.meta.url), "utf8");
  const timeline = vm.runInContext(source + "\nPetalTimeline", vm.createContext({}));
  const sample = Array.from({length: 121}, (_, frame) => timeline.position(frame / 60 * 2).scrollLeft);
  for (let index = 1; index < sample.length; index++) {
    assert.ok(Math.abs(sample[index] - sample[index - 1] - 124 / 60) < 1e-9);
  }
  assert.ok(source.includes('world.style.transform = "translate3d("'));
  assert.ok(!source.includes("viewport.scrollLeft"));
});
