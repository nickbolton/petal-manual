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
        const expected = timeline.stickyOffset(scroll, 640, index * 992, 990, [140, 150, 180][index]);
        assert.equal(frame.transform, "translate3d(" + expected + "px,0,0)");
      }
    }
  }
  const frameLoop = source.slice(source.indexOf("  function frame() {"), source.indexOf("  function start() {"));
  assert.ok(!frameLoop.includes(".style."));
  assert.ok(!frameLoop.includes("clientWidth"));
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
  let screenFrameWidth=640;
  let resizeCallback: (()=>void) | undefined;
  let clock=1000;
  const nativePerformance=globalThis.performance;
  set("performance",new Proxy(nativePerformance,{get(target,key){if(key==="now")return ()=>clock;const value=Reflect.get(target,key,target);return typeof value==="function"?value.bind(target):value;}}));
  const setCapture=()=>{};
  Object.defineProperty(windows.HTMLElement.prototype,"clientWidth",{get(){return this.classList.contains("petal-screen-frame")?screenFrameWidth:640;}});
  Object.defineProperty(windows.HTMLElement.prototype,"offsetWidth",{get(){return this.classList.contains("petal-screen")?640:140;}});
  windows.HTMLElement.prototype.getBoundingClientRect=function(){const width=(this.classList.contains("petal-scrubber")||this.classList.contains("petal-viewport"))?screenFrameWidth:640;return {left:0,width,top:0,right:width,bottom:260,height:260,x:0,y:0,toJSON(){}};};
  windows.HTMLElement.prototype.setPointerCapture=setCapture;
  windows.HTMLElement.prototype.animate=function(){const a={currentTime:0,cancel(){this.cancelled=true;}};animations.push(a);return a as unknown as Animation;};
  Object.defineProperty(windows.document,"timeline",{value:{currentTime:100}});
  Object.defineProperty(windows.document,"fonts",{value:{ready:Promise.resolve()}});
  set("window",windows);set("document",windows.document);set("HTMLElement",windows.HTMLElement);set("IS_REACT_ACT_ENVIRONMENT",true);
  set("matchMedia",()=>reducedMotion);set("requestAnimationFrame",(callback:FrameRequestCallback)=>{frames.set(++frame,callback);return frame;});set("cancelAnimationFrame",(id:number)=>frames.delete(id));
  set("ResizeObserver",class{constructor(callback:()=>void){resizeCallback=callback;}observe(){}disconnect(){}});
  set("IntersectionObserver",class{entry:{callback:IntersectionObserverCallback;disconnected?:boolean};constructor(callback:IntersectionObserverCallback){this.entry={callback};observers.push(this.entry);}observe(){}disconnect(){this.entry.disconnected=true;}});
  const root=createRoot(windows.document.getElementById("root")!);
  try {
    await act(async()=>root.render(<StrictMode><Timeline/></StrictMode>));
    assert.equal(observers.length,2);
    assert.equal(observers[0].disconnected,true);
    const viewport=windows.document.getElementById("demo-viewport")!;
    const play=windows.document.getElementById("demo-play")!;
    const mini=windows.document.getElementById("demo-mini-head")!.parentElement!;
    const pointer=(target:Element,type:string,x:number,time:number,y=100,properties:Record<string,unknown>={})=>{
      const event=new windows.Event(type,{bubbles:true,cancelable:true});
      Object.assign(event,{button:0,pointerId:1,clientX:x,clientY:y,isPrimary:true,pointerType:"mouse",...properties});Object.defineProperty(event,"timeStamp",{value:time});target.dispatchEvent(event);
    };
    play.click();assert.equal(play.getAttribute("aria-pressed"),"true");assert.equal(animations.length,5);
    play.click();assert.equal(play.getAttribute("aria-pressed"),"false");
    reducedMotion.matches=true;
    observers.at(-1)!.callback([{isIntersecting:true,intersectionRatio:.5} as IntersectionObserverEntry], {} as IntersectionObserver);
    assert.equal(play.getAttribute("aria-pressed"),"false");
    play.click();assert.match(windows.document.getElementById("demo-position")!.textContent!,/Bar 2/);
    assert.equal(animations.length,5);
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
    // Half-size rendering preserves logical song geometry and pointer accuracy.
    screenFrameWidth=320;resizeCallback!();
    assert.equal(windows.document.querySelector<HTMLElement>(".petal-screen-frame")!.style.getPropertyValue("--petal-screen-scale"),"0.5");
    pointer(viewport,"pointerdown",300,90,100,{pointerType:"touch"});pointer(viewport,"pointermove",200,110,100,{pointerType:"touch"});
    assert.equal(windows.document.getElementById("demo-world")!.style.transform,"translate3d(-200px,0,0)");
    // On touch devices, implicit capture belongs to the touched child. Moving
    // capture to the viewport emits a bubbling loss on that child, not a release.
    pointer(viewport.querySelector(".petal-event")!,"lostpointercapture",200,111,100,{pointerType:"touch"});
    assert.equal(windows.document.body.classList.contains("petal-timeline-dragging"),true);
    pointer(viewport,"pointermove",190,114,100,{pointerType:"touch"});
    assert.equal(windows.document.getElementById("demo-world")!.style.transform,"translate3d(-220px,0,0)");
    pointer(viewport,"pointerdown",250,115,100,{pointerId:2,isPrimary:false,pointerType:"touch"});
    pointer(viewport,"pointerup",250,117,100,{pointerId:2,isPrimary:false,pointerType:"touch"});
    assert.equal(windows.document.body.classList.contains("petal-timeline-dragging"),true);
    pointer(viewport,"pointerup",180,120,100,{pointerType:"touch"});
    assert.equal(windows.document.getElementById("demo-world")!.style.transform,"translate3d(-240px,0,0)");
    windows.document.getElementById("demo-stop")!.click();
    mini.querySelectorAll<HTMLButtonElement>("button")[1].click();
    pointer(mini,"pointerdown",100,130,100,{pointerType:"touch"});
    const headDown=Number.parseFloat(windows.document.getElementById("demo-mini-head")!.style.transform.slice(12));
    assert.ok(Math.abs((headDown+1)*.5-100)<1e-8);
    pointer(mini,"pointermove",103,135,100,{pointerType:"touch"});
    const smallMove=Number.parseFloat(windows.document.getElementById("demo-mini-head")!.style.transform.slice(12));
    assert.ok(Math.abs((smallMove+1)*.5-103)<1e-8);
    pointer(mini,"pointermove",160,150,100,{pointerType:"touch"});
    assert.match(windows.document.getElementById("demo-position")!.textContent!,/Verse · Bar 7/);
    const headAfter=Number.parseFloat(windows.document.getElementById("demo-mini-head")!.style.transform.slice(12));
    assert.ok(Math.abs((headAfter+1)*.5-160)<1e-8);
    pointer(mini.querySelector("button span")!,"lostpointercapture",160,151,100,{pointerType:"touch"});
    assert.equal(windows.document.body.classList.contains("petal-timeline-dragging"),true);
    pointer(mini,"pointermove",180,155,100,{pointerType:"touch"});
    const nextHead=Number.parseFloat(windows.document.getElementById("demo-mini-head")!.style.transform.slice(12));
    assert.ok(Math.abs((nextHead+1)*.5-180)<1e-8);
    // Losing capture on the surface itself still terminates the gesture.
    pointer(mini,"lostpointercapture",180,160,100,{pointerType:"touch"});
    assert.equal(windows.document.body.classList.contains("petal-timeline-dragging"),false);
    windows.document.getElementById("demo-stop")!.click();
    screenFrameWidth=640;resizeCallback!();
    assert.equal(windows.document.querySelector<HTMLElement>(".petal-screen-frame")!.style.getPropertyValue("--petal-screen-scale"),"1");
    // Vertical wheel gestures can begin outside the illustration, then drift
    // diagonally over it during momentum without seeking or cancelling playback.
    play.click();
    let playingAnimationCount=animations.length;
    const playingPosition=windows.document.getElementById("demo-position")!.textContent;
    const wheel=(target:EventTarget,x:number,y:number,options:WheelEventInit={})=>{
      const event=new windows.WheelEvent("wheel",{bubbles:true,cancelable:true,deltaX:x,deltaY:y,...options});target.dispatchEvent(event);return event;
    };
    wheel(windows.document.body,2,50);
    assert.equal(wheel(viewport,12,1).defaultPrevented,false);
    assert.equal(play.getAttribute("aria-pressed"),"true");
    assert.equal(windows.document.getElementById("demo-position")!.textContent,playingPosition);
    pointer(viewport,"pointerdown",100,110);pointer(viewport,"pointermove",160,130);
    assert.equal(play.getAttribute("aria-pressed"),"true");
    assert.equal(windows.document.body.classList.contains("petal-timeline-dragging"),false);
    // Once page scrolling settles, both a mouse press and touch-down pause
    // immediately, without waiting for a drag. Vertical motion remains native.
    clock+=250;
    pointer(viewport,"pointerdown",100,140);
    assert.equal(play.getAttribute("aria-pressed"),"false");
    pointer(viewport,"pointerup",100,145);
    play.click();
    pointer(viewport,"pointerdown",100,150,100,{pointerType:"touch"});
    assert.equal(play.getAttribute("aria-pressed"),"false");
    pointer(viewport,"pointermove",102,160,180,{pointerType:"touch"});
    assert.equal(windows.document.body.classList.contains("petal-timeline-dragging"),false);
    play.click();
    playingAnimationCount=animations.length;
    windows.dispatchEvent(new windows.Event("scroll"));
    pointer(mini,"pointerdown",100,170);pointer(mini,"pointermove",102,190,180);
    assert.equal(play.getAttribute("aria-pressed"),"true");
    section.dispatchEvent(new windows.MouseEvent("click",{bubbles:true,cancelable:true,detail:1}));
    assert.equal(play.getAttribute("aria-pressed"),"true");
    // Actual page scrolling also suppresses interactions without requiring wheel
    // events (touchscreen scrolling and its momentum use this path).
    windows.dispatchEvent(new windows.Event("scroll"));
    pointer(mini,"pointerdown",100,200);pointer(mini,"pointermove",400,220);
    assert.equal(play.getAttribute("aria-pressed"),"true");
    clock+=250;
    assert.equal(wheel(viewport,30,1).defaultPrevented,true);
    assert.equal(play.getAttribute("aria-pressed"),"false");
    assert.equal(animations.length,playingAnimationCount);
    // Pinch gestures must never be treated as timeline wheel scrubbing.
    play.click();
    assert.equal(wheel(viewport,15,1,{ctrlKey:true}).defaultPrevented,false);
    assert.equal(play.getAttribute("aria-pressed"),"true");
    assert.equal(wheel(viewport,0,25,{shiftKey:true}).defaultPrevented,true);
    assert.equal(play.getAttribute("aria-pressed"),"false");
    clock+=250;
    pointer(mini,"pointerdown",100,230);pointer(mini,"pointermove",400,250);
    const finalAnimationCount=animations.length;
    await act(async()=>root.unmount());
    assert.equal(windows.document.body.classList.contains("petal-timeline-dragging"),false);
    assert.equal(frames.size,0);assert.ok(observers.every(observer=>observer.disconnected));
    play.click();assert.equal(animations.length,finalAnimationCount);
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


test("mobile screen scale preserves the composition aspect ratio",async()=>{
  for(const width of [274,329,344,384,714]){
    const scale=timeline.screenScale(width,720);
    assert.equal(720*scale,width);
    assert.ok(Math.abs(width/(400*scale)-720/400)<1e-9);
  }
  assert.equal(timeline.screenScale(900,720),1);
  assert.equal(timeline.screenScale(0,720),1);
  const document=new JSDOM(renderToStaticMarkup(<Timeline/>)).window.document;
  assert.ok(document.querySelector(".petal-screen-frame>.petal-screen .petal-scrubber"));
});


test("timeline drags remain relative while scrubber seeks align with absolute touch positions",()=>{
  for(const scale of [.38,.4777777778,.75,1]){
    for(const delta of [-60,-20,0,20,60]){
      const start=1000;
      const scroll=timeline.dragScroll(start,120,120+delta,scale);
      assert.ok(Math.abs((start-scroll)*scale-delta)<1e-8);
    }
    const width=600;
    for(const x of [10,30,60,100]){
      const beat=timeline.scrubberBeatAtX(x,width,scale);
      const headCenter=(timeline.scrubberHeadX(beat,width)+1)*scale;
      assert.ok(Math.abs(headCenter-x)<1e-8);
    }
    assert.equal(timeline.scrubberBeatAtX(-100,width,scale),0);
    assert.equal(timeline.scrubberBeatAtX(10000,width,scale),48);
  }
});
