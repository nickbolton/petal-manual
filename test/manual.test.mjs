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


test("Safari compositor motion shares a linear clock across timeline, labels, and overview", async () => {
  const source = await readFile(new URL("../dist/timeline.js", import.meta.url), "utf8");
  const timeline = vm.runInContext(source + "\nPetalTimeline", vm.createContext({}));
  for (const beat of [0, 3.25, 16, 39.5]) {
    const plan = timeline.motionPlan(beat, 640, [140, 150, 180], 520);
    assert.equal(plan.duration, (48 - beat) * 500);
    assert.equal(plan.world[0].transform, "translate3d(" + (-beat * 62) + "px,0,0)");
    assert.equal(plan.world[1].transform, "translate3d(-2976px,0,0)");
    for (const [index, frames] of plan.labels.entries()) {
      assert.equal(frames[0].offset, 0);
      assert.equal(frames.at(-1).offset, 1);
      for (const frame of frames) {
        const scroll = beat * 62 + frame.offset * (48 - beat) * 62;
        const expected = timeline.stickyOffset(scroll, 640, index * 992, 990, [140, 150, 180][index]);
        assert.equal(frame.transform, "translate3d(" + expected + "px,0,0)");
      }
    }
  }
  const frameLoop = source.slice(source.indexOf("    function frame() {"), source.indexOf("    function start() {"));
  assert.ok(!frameLoop.includes(".style."));
  assert.ok(!frameLoop.includes("clientWidth"));
  assert.ok(source.includes("animation.startTime = origin"));
});

test("appearance starts playback, preserves manual pause, and cleans up observers", async () => {
  const source = await readFile(new URL("../dist/timeline.js", import.meta.url), "utf8");
  for (const reduceMotion of [false, true]) {
    const elements = new Map();
    const createdAnimations = [];
    let visibility;
    function element() {
      return {
        style:{}, clientWidth:640, offsetWidth:140, textContent:"", innerHTML:"", attributes:{}, handlers:{},
        classList:{add(){},remove(){}}, childElementCount:0,
        addEventListener(name, handler) { this.handlers[name] = handler; },
        setAttribute(name,value) { this.attributes[name] = value; },
        replaceChildren(){}, closest() { return this; },
        animate() {
          const animation = {currentTime:0, cancel(){this.cancelled=true;}};
          createdAnimations.push(animation); return animation;
        },
      };
    }
    for (const id of ["demo-viewport","demo-world","demo-play","demo-stop","demo-mini-head","demo-position","demo-ripples"]) elements.set(id,element());
    elements.get("demo-mini-head").parentElement = element();
    elements.get("demo-world").querySelectorAll = () => [element(),element(),element()];
    const context = vm.createContext({
      document:{getElementById:id=>elements.get(id),querySelectorAll:()=>[],timeline:{currentTime:100},fonts:{ready:Promise.resolve()}},
      matchMedia:()=>({matches:reduceMotion}),requestAnimationFrame:()=>1,cancelAnimationFrame(){},
      ResizeObserver:class{observe(){} disconnect(){}},
      IntersectionObserver:class{
        constructor(callback) { this.callback=callback;visibility=this; }
        observe(){} disconnect(){this.disconnected=true;}
      },
    });
    const timeline = vm.runInContext(source + "\nPetalTimeline", context);
    const controller = timeline.attach();
    await Promise.resolve();
    assert.equal(createdAnimations.length,0);
    const show = () => visibility.callback([{isIntersecting:true,intersectionRatio:.5}]);
    const hide = () => visibility.callback([{isIntersecting:false,intersectionRatio:0}]);
    show();
    const play = elements.get("demo-play");
    assert.equal(play.attributes["aria-pressed"],String(!reduceMotion));
    if (!reduceMotion) {
      assert.equal(createdAnimations.length,5);
      play.handlers.click();
      assert.equal(play.attributes["aria-pressed"],"false");
      show();
      assert.equal(play.attributes["aria-pressed"],"false");
      hide();show();
      assert.equal(play.attributes["aria-pressed"],"true");
    } else {
      assert.equal(createdAnimations.length,0);
      play.handlers.click();
      assert.ok(elements.get("demo-position").textContent.includes("Bar 2"));
    }
    controller.destroy();
    assert.equal(visibility.disconnected,true);
    const count = createdAnimations.length;
    show();
    assert.equal(createdAnimations.length,count);
  }
});
