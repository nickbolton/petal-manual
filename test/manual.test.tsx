import React from "react";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement, StrictMode, act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { createManualServer } from "../server.mjs";
import * as timeline from "../app/timeline/controller";
import { ThemeProvider, useTheme, themeBootstrap } from "../app/components/Theme";
import { Timeline } from "../app/timeline/Timeline";
import { chapters, chapterPath } from "../app/content";

let server: ReturnType<typeof createManualServer>, base: string;
before(async () => {server=createManualServer();await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));base="http://127.0.0.1:"+(server.address() as {port:number}).port;});
after(async () => {await new Promise<void>(resolve=>server.close(()=>resolve()));});

test("every chapter is pre-rendered, directly addressable, and has valid links", async () => {
  assert.equal(chapters.length,12);
  for (const chapter of chapters) {
    const path=chapterPath(chapter.id);
    const response=await fetch(base+path);
    assert.equal(response.status,200,path);
    const html=await response.text();
    const document=new JSDOM(html).window.document;
    assert.equal(document.title,chapter.title+" — Petal field guide");
    assert.ok(document.querySelector('link[rel="canonical"]')?.getAttribute("href")?.endsWith(path));
    assert.ok(document.querySelector("h1")?.textContent);
    assert.equal(document.querySelectorAll("section.section").length,chapter.sections.length);
    for(const link of document.querySelectorAll<HTMLAnchorElement>('a[href]')) {
      const href=link.getAttribute("href")!;
      if(!href.startsWith("/") && !href.startsWith("#")) continue;
      const [route,fragment]=href.split("#");
      const target=route ? chapters.find(item=>chapterPath(item.id)===route) : chapter;
      assert.ok(target,href);
      if(fragment && fragment!=="main") assert.ok(target.sections.some(section=>target.id+"-"+section.id===fragment),href);
      assert.ok(!href.includes("~"));
    }
    for(const asset of document.querySelectorAll('script[src],link[rel="stylesheet"]')) {
      const url=asset.getAttribute("src")||asset.getAttribute("href");
      assert.equal((await fetch(base+url)).status,200,url!);
    }
    assert.match(response.headers.get("content-security-policy")!,/sha256-/);
    assert.ok(!response.headers.get("content-security-policy")!.includes("script-src 'self' 'unsafe-inline'"));
  }
});
test("health, HEAD, assets, 404s, and source privacy",async()=>{
  assert.equal(await (await fetch(base+"/healthz")).text(),"ok");
  const head=await fetch(base+"/timeline",{method:"HEAD"});assert.equal(head.status,200);assert.equal(await head.text(),"");
  for(const path of ["/icon.svg","/assets/play.png","/assets/pause.png","/assets/stop.png"]) assert.equal((await fetch(base+path)).status,200);
  for(const path of ["/missing","/server.mjs","/package.json","/app/content.ts","/.openai/hosting.json","/%2e%2e%2fserver.mjs","/__spa-fallback.html"]) assert.equal((await fetch(base+path)).status,404,path);
  assert.equal((await fetch(base+"/",{method:"POST"})).status,405);
});

test("sticky section headers match the iOS leading and trailing limits", async () => {
  const source = await readFile(new URL("../app/timeline/controller.ts", import.meta.url), "utf8");
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
  const source = await readFile(new URL("../app/timeline/controller.ts", import.meta.url), "utf8");
  const html = renderToStaticMarkup(<Timeline/>);
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
  const source = await readFile(new URL("../app/timeline/controller.ts", import.meta.url), "utf8");
  const sample = Array.from({length: 121}, (_, frame) => timeline.position(frame / 60 * 2).scrollLeft);
  for (let index = 1; index < sample.length; index++) {
    assert.ok(Math.abs(sample[index] - sample[index - 1] - 124 / 60) < 1e-9);
  }
  assert.ok(source.includes('world.style.transform = "translate3d("'));
  assert.ok(!source.includes("viewport.scrollLeft"));
});


test("Safari compositor motion shares a linear clock across timeline, labels, and overview", async () => {
  const source = await readFile(new URL("../app/timeline/controller.ts", import.meta.url), "utf8");
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
        const expected = 320 + index * 992 - scroll + timeline.stickyOffset(scroll, 640, index * 992, 990, [140, 150, 180][index]);
        assert.equal(frame.transform, "translate3d(" + expected + "px,0,0)");
      }
    }
  }
  const playback = source.slice(source.indexOf("  function scheduleRipples("), source.indexOf("  function buildWorld()"));
  assert.ok(!playback.includes("requestAnimationFrame"));
  assert.ok(!playback.includes("createElement"));
  assert.ok(!playback.includes(".style."));
  const document = new JSDOM(renderToStaticMarkup(<Timeline/>)).window.document;
  assert.equal(document.querySelector(".petal-world .petal-section-label"),null);
  assert.equal(document.querySelectorAll(".petal-headers>.petal-section-label").length,3);
  assert.equal(document.querySelectorAll(".petal-ripple-carrier").length,12);
  assert.ok(source.includes("animation.startTime = origin"));
});

test("scrubber event dots use native half-point positions and align with its playhead", async () => {
  const source = await readFile(new URL("../app/timeline/controller.ts", import.meta.url), "utf8");
  assert.equal([...renderToStaticMarkup(<Timeline/>).matchAll(/class="petal-mini-event"/g)].length,7);
  for (const width of [280,520,640]) {
    const unit = (width - 4) / 48;
    for (const beat of [0,4,16,32,44]) {
      assert.equal(timeline.scrubberEventX(beat,width), Math.round((beat * unit - 3) * 2) / 2);
      assert.equal(timeline.scrubberHeadX(beat,width), Math.max(0,beat * unit - 2));
    }
  }
});


test("fixed sparse events, random section counts, and continuous drag deceleration", async () => {
  const source = await readFile(new URL("../app/timeline/controller.ts", import.meta.url), "utf8");
  assert.equal(renderToStaticMarkup(<Timeline/>), renderToStaticMarkup(<Timeline/>));
  assert.equal(timeline.sectionEventCount(() => 0), 1);
  assert.equal(timeline.sectionEventCount(() => .5), 2);
  assert.equal(timeline.sectionEventCount(() => .99999), 3);
  assert.equal(timeline.dragDistance(1, 0), 0);
  assert.ok(timeline.dragDistance(1, 100) > 90);
  assert.ok(timeline.dragDistance(1, 200) - timeline.dragDistance(1, 100) < timeline.dragDistance(1, 100));
  assert.equal(timeline.dragDistance(-1, 100), -timeline.dragDistance(1, 100));
});


test("rubber band resists both ends and spring returns to the boundary", async () => {
  const source = await readFile(new URL("../app/timeline/controller.ts", import.meta.url), "utf8");
  assert.equal(timeline.rubberBand(1000, 640), 1000);
  for (const pull of [10, 100, 500, 2000]) {
    const left = timeline.rubberBand(-pull, 640);
    const right = timeline.rubberBand(2976 + pull, 640) - 2976;
    assert.ok(left < 0 && left > -pull);
    assert.ok(Math.abs(left + right) < 1e-9);
    assert.ok(Math.abs(left) < 640);
  }
  for (const displacement of [-150, 150]) {
    assert.equal(timeline.springOffset(displacement, 0, 0), displacement);
    assert.ok(Math.abs(timeline.springOffset(displacement, 0, 800)) < .01);
    assert.ok(Math.abs(timeline.springOffset(displacement, 0, 100)) < Math.abs(displacement));
  }
});


test("React Strict Mode remounts without duplicate timeline handlers; gestures and cleanup work",async()=>{
  const dom=new JSDOM('<div id="root"></div>',{url:"http://localhost/",pretendToBeVisual:true});
  const previous=new Map<string,PropertyDescriptor|undefined>();
  const set=(key:string,value:unknown)=>{previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});};
  const windows=dom.window;
  const observers: {callback:IntersectionObserverCallback; disconnected?:boolean}[]=[];
  const animations: {currentTime:number;cancelled?:boolean;cancel():void}[]=[];
  const frames=new Map<number,FrameRequestCallback>();let frame=0;
  const reducedMotion={matches:false};
  const setCapture=()=>{};
  Object.defineProperty(windows.HTMLElement.prototype,"clientWidth",{get:()=>640});
  Object.defineProperty(windows.HTMLElement.prototype,"offsetWidth",{get:()=>140});
  windows.HTMLElement.prototype.getBoundingClientRect=()=>({left:0,width:640,top:0,right:640,bottom:260,height:260,x:0,y:0,toJSON(){}});
  windows.HTMLElement.prototype.setPointerCapture=setCapture;
  windows.HTMLElement.prototype.animate=function(){const a={currentTime:0,cancel(){this.cancelled=true;}};animations.push(a);return a as unknown as Animation;};
  Object.defineProperty(windows.document,"timeline",{value:{currentTime:100}});
  Object.defineProperty(windows.document,"fonts",{value:{ready:Promise.resolve()}});
  set("window",windows);set("document",windows.document);set("HTMLElement",windows.HTMLElement);set("IS_REACT_ACT_ENVIRONMENT",true);
  set("matchMedia",()=>reducedMotion);set("requestAnimationFrame",(callback:FrameRequestCallback)=>{frames.set(++frame,callback);return frame;});set("cancelAnimationFrame",(id:number)=>frames.delete(id));
  set("ResizeObserver",class{observe(){}disconnect(){}});
  set("IntersectionObserver",class{entry:{callback:IntersectionObserverCallback;disconnected?:boolean};constructor(callback:IntersectionObserverCallback){this.entry={callback};observers.push(this.entry);}observe(){}disconnect(){this.entry.disconnected=true;}});
  const root=createRoot(windows.document.getElementById("root")!);
  try {
    await act(async()=>root.render(<StrictMode><Timeline/></StrictMode>));
    assert.equal(observers.length,2);
    assert.equal(observers[0].disconnected,true);
    const viewport=windows.document.getElementById("demo-viewport")!;
    const play=windows.document.getElementById("demo-play")!;
    const mini=windows.document.getElementById("demo-mini-head")!.parentElement!;
    const pointer=(target:Element,type:string,x:number,time:number)=>{
      const event=new windows.Event(type,{bubbles:true,cancelable:true});
      Object.assign(event,{button:0,pointerId:1,clientX:x});Object.defineProperty(event,"timeStamp",{value:time});target.dispatchEvent(event);
    };
    play.click();assert.equal(play.getAttribute("aria-pressed"),"true");
    const playbackAnimationCount=animations.length;
    assert.ok(playbackAnimationCount>=25 && playbackAnimationCount<=37);
    assert.equal(frames.size,0);
    play.click();assert.equal(play.getAttribute("aria-pressed"),"false");
    reducedMotion.matches=true;
    observers.at(-1)!.callback([{isIntersecting:true,intersectionRatio:.5} as IntersectionObserverEntry], {} as IntersectionObserver);
    assert.equal(play.getAttribute("aria-pressed"),"false");
    play.click();assert.match(windows.document.getElementById("demo-position")!.textContent!,/Bar 2/);
    assert.equal(animations.length,playbackAnimationCount);
    reducedMotion.matches=false;
    windows.document.getElementById("demo-stop")!.click();
    pointer(viewport,"pointerdown",200,0);pointer(viewport,"pointermove",350,20);
    assert.ok(viewport.querySelector<HTMLElement>(".petal-world")!.style.transform.includes("translate3d("));
    assert.equal(windows.document.body.classList.contains("petal-timeline-dragging"),true);
    pointer(viewport,"pointerup",350,30);assert.equal(windows.document.body.classList.contains("petal-timeline-dragging"),false);
    pointer(mini,"pointerdown",100,40);pointer(mini,"pointermove",400,60);
    assert.match(windows.document.getElementById("demo-position")!.textContent!,/Verse/);
    pointer(mini,"pointerup",1000,70);assert.match(windows.document.getElementById("demo-position")!.textContent!,/Bar 12/);
    const section=mini.querySelector<HTMLButtonElement>("button")!;section.click();assert.match(windows.document.getElementById("demo-position")!.textContent!,/Bar 1/);
    pointer(mini,"pointerdown",100,80);pointer(mini,"pointermove",400,100);
    await act(async()=>root.unmount());
    assert.equal(windows.document.body.classList.contains("petal-timeline-dragging"),false);
    assert.equal(frames.size,0);assert.ok(observers.every(observer=>observer.disconnected));
    play.click();assert.equal(animations.length,playbackAnimationCount);
  } finally {
    for(const [key,descriptor] of previous) {if(descriptor) Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}
    windows.close();
  }
});


test("theme preference survives remounts and bootstraps before hydration",async()=>{
  const dom=new JSDOM('<meta name="theme-color" content="#f7f6f2"><body><div id="root"></div></body>',{url:"http://localhost/",runScripts:"outside-only"});
  const old=new Map<string,PropertyDescriptor|undefined>();
  for(const [key,value] of Object.entries({window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,IS_REACT_ACT_ENVIRONMENT:true})) {
    old.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  }
  function Toggle(){const {dark,toggleTheme}=useTheme();return <button onClick={toggleTheme}>{dark?"dark":"light"}</button>;}
  let root=createRoot(dom.window.document.getElementById("root")!);
  try{
    dom.window.localStorage.setItem("petal-manual-theme","dark");dom.window.eval(themeBootstrap);
    assert.equal(dom.window.document.body.classList.contains("dark"),true);
    await act(async()=>root.render(<StrictMode><ThemeProvider><Toggle/></ThemeProvider></StrictMode>));
    assert.equal(dom.window.document.querySelector("button")!.textContent,"dark");
    await act(async()=>dom.window.document.querySelector<HTMLButtonElement>("button")!.click());
    assert.equal(dom.window.localStorage.getItem("petal-manual-theme"),"light");
    assert.equal(dom.window.document.body.classList.contains("dark"),false);
    await act(async()=>root.unmount());
    root=createRoot(dom.window.document.getElementById("root")!);
    dom.window.eval(themeBootstrap);
    await act(async()=>root.render(<ThemeProvider><Toggle/></ThemeProvider>));
    assert.equal(dom.window.document.querySelector("button")!.textContent,"light");
    await act(async()=>dom.window.document.querySelector<HTMLButtonElement>("button")!.click());
    assert.equal(dom.window.localStorage.getItem("petal-manual-theme"),"dark");
    assert.equal(dom.window.document.querySelector('meta[name="theme-color"]')!.getAttribute("content"),"#111c21");
    await act(async()=>root.unmount());
  }finally{
    for(const [key,descriptor] of old){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}dom.window.close();
  }
});


test("pooled ripples share playback timing and slots never overlap",()=>{
  for(const start of [0,3.25,16,31.9,48]) {
    const schedule=timeline.rippleSchedule(start,()=>.999);
    assert.equal(schedule.filter(event=>event.beat===16).length,start<=16?3:0);
    assert.ok(schedule.every(event=>event.beat>=start && event.slot<12));
    for(const event of schedule) {
      assert.equal(event.delay,(event.beat-start)*500);
      assert.equal(event.duration,event.stagger+580);
      for(const other of schedule) {
        if(event===other || event.slot!==other.slot) continue;
        assert.ok(event.delay+event.duration<=other.delay || other.delay+other.duration<=event.delay);
      }
    }
  }
});
