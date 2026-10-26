
export const beatWidth = 62;
export const totalBeats = 48;
export function screenScale(availableWidth: number, layoutWidth: number) {
  return availableWidth > 0 && layoutWidth > 0 ? Math.min(1, availableWidth / layoutWidth) : 1;
}
export const sections = [
  { name: "Intro", start: 0, beats: 16, color: "#3194FA" },
  { name: "Verse", start: 16, beats: 16, color: "#66BD48" },
  { name: "Chorus", start: 32, beats: 16, color: "#8A49A8" },
];
export const events = [3, 9.5, 14, 21, 27.5, 35, 43];
export const sectionEventCount = (random = Math.random) => 1 + Math.min(2, Math.floor(random() * 3));
// UIScrollView normal deceleration: velocity retains 0.998 per millisecond.
export function dragDistance(velocity: number, elapsed: number) {
  return velocity * (1 - Math.pow(.998, elapsed)) / -Math.log(.998);
}
export function rubberBand(scroll: number, width: number) {
  const boundary = Math.max(0, Math.min(totalBeats * beatWidth, scroll));
  const excess = scroll - boundary;
  const dimension = Math.max(1, width);
  return boundary + Math.sign(excess) * dimension * .55 * Math.abs(excess) / (dimension + .55 * Math.abs(excess));
}
export function springOffset(displacement: number, velocity: number, elapsed: number) {
  const damping = .018;
  return (displacement + (velocity + damping * displacement) * elapsed) * Math.exp(-damping * elapsed);
}
export function stickyOffset(scrollLeft: number, viewportWidth: number, start: number, width: number, labelWidth: number) {
  const desired = scrollLeft + 59 - viewportWidth / 2 - start;
  return Math.min(Math.max(desired, 0), Math.max(0, width - 62 - labelWidth));
}
export function position(beat: number) {
  const clamped = Math.max(0, Math.min(totalBeats, beat));
  return { beat: clamped, scrollLeft: clamped * beatWidth, bar: Math.min(12, Math.floor(clamped / 4) + 1), section: sections.findLast(s => clamped >= s.start)!.name };
}
function scrubberBeatWidth(width: number) {
  return Math.max(0, width - (sections.length - 1) * 2) / totalBeats;
}
export function scrubberEventX(beat: number, width: number) {
  return Math.round((beat * scrubberBeatWidth(width) - 3) * 2) / 2;
}
export function scrubberHeadX(beat: number, width: number) {
  return Math.max(0, position(beat).beat * scrubberBeatWidth(width) - 2);
}
export function motionPlan(fromBeat: number, viewportWidth: number, labelWidths: number[], scrubberWidth: number) {
  const start = position(fromBeat).scrollLeft;
  const end = totalBeats * beatWidth;
  const span = end - start;
  const translation = (value: number) => "translate3d(" + value + "px,0,0)";
  const labelFrames = sections.map((s, index) => {
    const sectionStart = s.start * beatWidth;
    const sectionWidth = s.beats * beatWidth - 2;
    const labelWidth = labelWidths[index];
    const pinStart = viewportWidth / 2 + sectionStart - 59;
    const pinEnd = pinStart + Math.max(0, sectionWidth - 62 - labelWidth);
    const stops = Array.from(new Set([start, pinStart, pinEnd, end].filter(x => x >= start && x <= end))).sort((a,b) => a-b);
    return stops.map(offset => ({
      offset: span ? (offset - start) / span : 0,
      transform: translation(stickyOffset(offset, viewportWidth, sectionStart, sectionWidth, labelWidth)),
    }));
  });
  const miniStart = position(fromBeat).beat;
  const miniThreshold = 2 / scrubberBeatWidth(scrubberWidth);
  const miniStops = [miniStart, miniThreshold, totalBeats].filter((value, index, values) =>
    value >= miniStart && value <= totalBeats && values.indexOf(value) === index).sort((a,b) => a-b);
  return {
    duration: (totalBeats - position(fromBeat).beat) * 500,
    world: [{transform:translation(-start)}, {transform:translation(-end)}],
    labels: labelFrames,
    mini: miniStops.map(value => ({offset:(value - miniStart) / (totalBeats - miniStart || 1), transform:translation(scrubberHeadX(value, scrubberWidth))})),
  };
}
export function attach(root: HTMLElement) {
  const find = (id: string) => root.querySelector<HTMLElement>("#" + id)!;
  const viewport = find("demo-viewport");
  const cleanup: (() => void)[] = [];
  function listen<K extends keyof HTMLElementEventMap>(target: HTMLElement, name: K, handler: (event: HTMLElementEventMap[K]) => void, options?: boolean | AddEventListenerOptions) {
    target.addEventListener(name, handler, options);
    cleanup.push(() => target.removeEventListener(name, handler, options));
  }
  const screenFrame = root.querySelector<HTMLElement>(".petal-screen-frame")!;
  const screen = root.querySelector<HTMLElement>(".petal-screen")!;
  let interactionScale = 1;
  const world = find("demo-world");
  const play = find("demo-play");
  const stop = find("demo-stop");
  const mini = find("demo-mini-head");
  const caption = find("demo-position");
  const rippleLayer = find("demo-ripples");
  const scrubber = mini.parentElement!;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let beat = 0, playing = false, frameID = 0, lastBeat = -1, playbackStartBeat = 0;
  let coastID = 0, visualScroll: number | null = null;
  let scrubPointer: {id:number; x:number; y:number; left:number; width:number; scale:number; dragging:boolean} | null = null, suppressSectionClick = false;
  let pointer: {id:number; x:number; y:number; dragging:boolean; scroll:number; lastX:number; lastTime:number; velocity:number} | null = null;
  let labels: HTMLElement[] = [], labelWidths: number[] = [], destroyed = false;
  let previousWidth = 0, scrubberWidth = 0, animations: Animation[] = [], worldAnimation: Animation | null = null;

  function currentBeat() {
    return playing && worldAnimation ? Math.min(totalBeats, playbackStartBeat + Number(worldAnimation.currentTime || 0) / 500) : beat;
  }
  function metadata() {
    const p = position(beat);
    const text = p.section + " · Bar " + p.bar + " of 12";
    if (caption.textContent !== text) caption.textContent = text;
  }
  function update() {
    // Used only while paused/seeking. Playback is entirely compositor-driven.
    const p = position(beat);
    const scroll = visualScroll ?? p.scrollLeft;
    world.style.transform = "translate3d(" + (-scroll) + "px,0,0)";
    labels.forEach((label, index) => {
      const s = sections[index];
      const offset = stickyOffset(scroll, previousWidth, s.start * beatWidth, s.beats * beatWidth - 2, labelWidths[index]);
      label.style.transform = "translate3d(" + offset + "px,0,0)";
    });
    mini.style.transform = "translate3d(" + scrubberHeadX(p.beat, scrubberWidth) + "px,0,0)";
    metadata();
  }
  function cancelCoast() {
    cancelAnimationFrame(coastID);
    coastID = 0;
    visualScroll = null;
  }
  function cancelMotion() {
    cancelCoast();
    beat = currentBeat();
    playing = false;
    cancelAnimationFrame(frameID);
    animations.forEach(animation => animation.cancel());
    animations = [];
    worldAnimation = null;
    rippleLayer.replaceChildren();
  }
  function updateButton() {
    play.setAttribute("aria-pressed", String(playing));
    play.setAttribute("aria-label", reduced.matches ? "Advance illustration by one bar" : playing ? "Pause illustration" : "Play illustration");
    play.querySelector("span")!.className = "petal-icon petal-icon-" + (playing ? "pause" : "play");
  }
  function pause() {
    cancelMotion();
    update();
    updateButton();
  }
  function seek(value: number) {
    if (playing) cancelMotion();
    beat = position(value).beat;
    lastBeat = beat;
    rippleLayer.replaceChildren();
    update();
    updateButton();
  }
  function emit(eventBeat: number, burstIndex = 0) {
    if (reduced.matches || rippleLayer.childElementCount >= 12) return;
    const carrier = document.createElement("span");
    carrier.className = "petal-ripple-carrier";
    const ring = document.createElement("span");
    ring.className = "petal-ripple";
    if (rippleLayer.childElementCount >= 3) {
      rippleLayer.querySelectorAll(".petal-ripple").forEach(active => active.classList.add("is-burst"));
      ring.classList.add("is-burst");
    }
    // A small visual stagger makes simultaneous section events readable.
    const duration = 580 + burstIndex * 70;
    ring.style.animationDelay = (burstIndex * 70) + "ms";
    carrier.append(ring);
    ring.addEventListener("animationend", () => carrier.remove(), {once:true});
    rippleLayer.append(carrier);
    const startX = previousWidth / 2 + (eventBeat - beat) * beatWidth;
    carrier.animate([
      {transform:"translate3d(" + startX + "px,0,0)"},
      {transform:"translate3d(" + (startX - 124 * duration / 1000) + "px,0,0)"},
    ], {duration, easing:"linear", fill:"forwards"});
  }
  function frame() {
    if (!playing || destroyed) return;
    beat = currentBeat();
    if (beat - lastBeat < 2) {
      events.filter(b => b > lastBeat && b <= beat).forEach(eventBeat => emit(eventBeat));
      sections.filter(section => section.start > lastBeat && section.start <= beat).forEach(section => {
        const count = sectionEventCount();
        for (let index = 0; index < count; index++) emit(section.start, index);
      });
    }
    lastBeat = beat;
    // No geometry reads or motion-style writes in this loop. Only the caption
    // and occasional event notification depend on main-thread frame delivery.
    metadata();
    if (beat < totalBeats) frameID = requestAnimationFrame(frame);
  }
  function start() {
    cancelCoast();
    if (beat >= totalBeats) seek(0);
    const plan = motionPlan(beat, previousWidth, labelWidths, scrubberWidth);
    if (plan.duration <= 0) return;
    playbackStartBeat = beat;
    lastBeat = beat - .001;
    const options: KeyframeAnimationOptions = {duration:plan.duration, easing:"linear", fill:"forwards"};
    worldAnimation = world.animate(plan.world, options);
    animations = [worldAnimation, ...labels.map((label,index) => label.animate(plan.labels[index], options)), mini.animate(plan.mini, options)];
    // One timeline origin keeps the counter-moving sticky headers and overview
    // exactly in phase, including Safari's compositor-only animation frames.
    const origin = document.timeline.currentTime as number;
    animations.forEach(animation => { animation.startTime = origin; });
    playing = true;
    updateButton();
    const activeAnimation = worldAnimation;
    activeAnimation.onfinish = () => {
      if (worldAnimation !== activeAnimation || destroyed) return;
      beat = totalBeats;
      cancelMotion();
      beat = totalBeats;
      update();
      updateButton();
    };
    frameID = requestAnimationFrame(frame);
  }
  function buildWorld() {
    // client/offset dimensions stay in the desktop canvas coordinate space.
    // Only the outer screen is scaled; playback keeps its existing clock/layers.
    const scale = screenScale(screenFrame.clientWidth, screen.offsetWidth);
    if (scale !== interactionScale || !screenFrame.style.getPropertyValue("--petal-screen-scale")) {
      interactionScale = scale;
      screenFrame.style.setProperty("--petal-screen-scale", String(scale));
    }
    const width = viewport.clientWidth;
    const overviewWidth = scrubber.clientWidth;
    if (width === previousWidth && overviewWidth === scrubberWidth) return;
    const wasPlaying = playing;
    if (playing) cancelMotion();
    previousWidth = width;
    scrubberWidth = overviewWidth;
    world.style.width = (totalBeats * beatWidth + width) + "px";
    root.querySelectorAll<HTMLElement>("[data-world-beat]").forEach(element => {
      element.style.left = (width / 2 + Number(element.dataset.worldBeat) * beatWidth - Number(element.dataset.inset || 0)) + "px";
    });
    labels = Array.from(world.querySelectorAll<HTMLElement>(".petal-section-label"));
    labelWidths = labels.map(label => label.offsetWidth);
    const overviewBeatWidth = scrubberBeatWidth(scrubberWidth);
    scrubber.querySelectorAll<HTMLElement>(".petal-mini-section").forEach((button, index) => {
      button.style.left = (sections[index].start * overviewBeatWidth) + "px";
      button.style.width = Math.max(0, sections[index].beats * overviewBeatWidth - 2) + "px";
    });
    scrubber.querySelectorAll<HTMLElement>(".petal-mini-event").forEach(dot => {
      dot.style.left = scrubberEventX(Number(dot.dataset.beat), scrubberWidth) + "px";
    });
    update();
    if (wasPlaying) start();
  }
  listen(play, "click", () => {
    if (reduced.matches) { pause(); seek(beat >= totalBeats ? 0 : Math.min(totalBeats, (Math.floor(beat / 4) + 1) * 4)); return; }
    if (playing) pause(); else start();
  });
  listen(stop, "click", () => { pause(); seek(0); });
  // Lock the axis for a wheel gesture, including its momentum tail. Observe the
  // whole page so a vertical gesture stays vertical when crossing the timeline.
  const scrollIdleMs = 200;
  let wheelAxis: "horizontal" | "vertical" | null = null;
  let lastWheelAt = -Infinity, lastPageScrollAt = -Infinity;
  const pageIsScrolling = () => performance.now() - lastPageScrollAt < scrollIdleMs;
  const observeWheel = (event: WheelEvent) => {
    if (event.ctrlKey || (!event.deltaX && !event.deltaY)) return;
    const now = performance.now();
    if (now - lastWheelAt > scrollIdleMs) wheelAxis = null;
    if (event.shiftKey) wheelAxis = "horizontal";
    else if (Math.abs(event.deltaY) >= Math.abs(event.deltaX)) wheelAxis = "vertical";
    wheelAxis ??= Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? "vertical" : "horizontal";
    lastWheelAt = now;
    if (wheelAxis === "vertical") lastPageScrollAt = now;
  };
  const observePageScroll = () => { lastPageScrollAt = performance.now(); };
  document.addEventListener("wheel", observeWheel, {capture:true, passive:true});
  window.addEventListener("scroll", observePageScroll, {passive:true});
  cleanup.push(() => document.removeEventListener("wheel", observeWheel, true));
  cleanup.push(() => window.removeEventListener("scroll", observePageScroll));
  listen(viewport, "wheel", event => {
    if (event.ctrlKey || wheelAxis !== "horizontal" || (pageIsScrolling() && !event.shiftKey)) return;
    const delta = event.shiftKey ? event.deltaY || event.deltaX : event.deltaX;
    if (!delta) return;
    event.preventDefault(); pause();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? previousWidth : 1 / interactionScale;
    seek(beat + delta * unit / beatWidth);
  }, {passive:false});
  listen(viewport, "pointerdown", event => {
    if (event.button !== 0 || pageIsScrolling()) return;
    // Do not pause or capture until a deliberate horizontal drag is established.
    pointer = {id:event.pointerId, x:event.clientX, y:event.clientY, dragging:false, scroll:0, lastX:event.clientX, lastTime:event.timeStamp, velocity:0};
  });
  listen(viewport, "pointermove", event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    if (!pointer.dragging) {
      if (pageIsScrolling() || (Math.abs(dy) > 6 && Math.abs(dy) >= Math.abs(dx))) { pointer = null; return; }
      if (Math.abs(dx) <= 6 || Math.abs(dx) <= Math.abs(dy)) return;
      pause();
      pointer.scroll = beat * beatWidth;
      pointer.dragging = true;
      viewport.focus({preventScroll:true});
      document.getSelection?.()?.removeAllRanges();
      document.body.classList.add("petal-timeline-dragging");
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add("is-scrubbing");
    }
    event.preventDefault();
    const elapsed = event.timeStamp - pointer.lastTime;
    if (elapsed > 0) pointer.velocity = (pointer.lastX - event.clientX) / elapsed / interactionScale;
    pointer.lastX = event.clientX;
    pointer.lastTime = event.timeStamp;
    const rawScroll = pointer.scroll - dx / interactionScale;
    visualScroll = rubberBand(rawScroll, previousWidth);
    seek(rawScroll / beatWidth);
  });
  function springBack(velocity = 0) {
    const from = visualScroll ?? beat * beatWidth;
    const boundary = position(from / beatWidth).scrollLeft;
    const displacement = from - boundary;
    if (reduced.matches || Math.abs(displacement) < .1) {
      visualScroll = null; seek(boundary / beatWidth); return;
    }
    let origin: number | undefined;
    const tick = (now: number) => {
      if (destroyed) return;
      origin ??= now;
      const elapsed = now - origin;
      const offset = springOffset(displacement, velocity, elapsed);
      visualScroll = boundary + offset;
      seek(boundary / beatWidth);
      if (elapsed < 800 && Math.abs(offset) > .1) coastID = requestAnimationFrame(tick);
      else { coastID = 0; visualScroll = null; update(); }
    };
    coastID = requestAnimationFrame(tick);
  }
  function coast(velocity: number) {
    visualScroll = null;
    if (reduced.matches || Math.abs(velocity) < .02) return;
    const startBeat = beat;
    let origin: number | undefined;
    const tick = (now: number) => {
      if (destroyed) return;
      origin ??= now;
      const elapsed = now - origin;
      const target = startBeat + dragDistance(velocity, elapsed) / beatWidth;
      if (target < 0 || target > totalBeats) {
        visualScroll = rubberBand(target * beatWidth, previousWidth);
        seek(target);
        springBack(velocity * Math.pow(.998, elapsed));
        return;
      }
      seek(target);
      if (target > 0 && target < totalBeats && Math.abs(velocity * Math.pow(.998, elapsed)) > .02) {
        coastID = requestAnimationFrame(tick);
      } else coastID = 0;
    };
    coastID = requestAnimationFrame(tick);
  }
  const endDrag = (event?: PointerEvent) => {
    const released = pointer;
    pointer = null;
    viewport.classList.remove("is-scrubbing");
    document.body.classList.remove("petal-timeline-dragging");
    if (!released?.dragging || destroyed) return;
    if (visualScroll !== null && (visualScroll < 0 || visualScroll > totalBeats * beatWidth)) springBack();
    else {
      visualScroll = null;
      if (event?.type === "pointerup" && event.timeStamp - released.lastTime < 100) coast(released.velocity);
    }
  };
  const preventSelection = (event: Event) => { if (pointer?.dragging || scrubPointer?.dragging) event.preventDefault(); };
  document.addEventListener("selectstart", preventSelection);
  listen(viewport, "dragstart", event => event.preventDefault());
  listen(viewport, "lostpointercapture", endDrag);
  listen(viewport, "pointerup", endDrag);
  listen(viewport, "pointercancel", endDrag);
  listen(viewport, "keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault(); pause();
    seek(event.key === "Home" ? 0 : event.key === "End" ? totalBeats : beat + (event.key === "ArrowRight" ? 1 : -1));
  });
  const scrubToPointer = (clientX: number) => {
    if (!scrubPointer || scrubPointer.width <= 0) return;
    const x = (clientX - scrubPointer.left) / scrubPointer.scale;
    const unit = scrubberBeatWidth(scrubPointer.width);
    const section = sections.find(s => x >= s.start * unit && x <= (s.start + s.beats) * unit - 2);
    // Native scrubber maps within the section's visible strip, including its gaps.
    const target = section
      ? section.start + Math.max(0, Math.min(1, (x - section.start * unit) / (section.beats * unit - 2))) * section.beats
      : x / scrubPointer.width * totalBeats;
    seek(target);
  };
  listen(scrubber, "pointerdown", event => {
    if (event.button !== 0) return;
    suppressSectionClick = pageIsScrolling();
    if (suppressSectionClick) return;
    const bounds = scrubber.getBoundingClientRect();
    scrubPointer = {id:event.pointerId, x:event.clientX, y:event.clientY, left:bounds.left, width:scrubber.clientWidth, scale:bounds.width / scrubber.clientWidth || 1, dragging:false};
  });
  listen(scrubber, "pointermove", event => {
    if (!scrubPointer || scrubPointer.id !== event.pointerId) return;
    if (!scrubPointer.dragging) {
      const dx = Math.abs(event.clientX - scrubPointer.x), dy = Math.abs(event.clientY - scrubPointer.y);
      if (pageIsScrolling() || (dy > 6 && dy >= dx)) { scrubPointer = null; suppressSectionClick = true; return; }
      if (dx <= 6 || dx <= dy) return;
      pause();
      scrubber.setPointerCapture(event.pointerId);
      scrubPointer.dragging = true;
      suppressSectionClick = true;
      document.getSelection?.()?.removeAllRanges();
      document.body.classList.add("petal-timeline-dragging");
    }
    event.preventDefault();
    scrubToPointer(event.clientX);
  });
  const endScrub = (event?: PointerEvent) => {
    if (!scrubPointer) return;
    if (event?.type === "pointerup" && scrubPointer.dragging) scrubToPointer(event.clientX);
    scrubPointer = null;
    document.body.classList.remove("petal-timeline-dragging");
  };
  listen(scrubber, "pointerup", endScrub);
  listen(scrubber, "pointercancel", endScrub);
  listen(scrubber, "lostpointercapture", endScrub);
  listen(scrubber, "dragstart", event => event.preventDefault());
  listen(scrubber, "click", event => {
    if ((suppressSectionClick || pageIsScrolling()) && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); }
  }, true);
  root.querySelectorAll<HTMLElement>(".petal-mini-section").forEach(button => listen(button, "click", () => { pause(); seek(Number(button.dataset.beat)); }));
  const resize = new ResizeObserver(buildWorld);
  resize.observe(screenFrame);
  resize.observe(viewport);
  resize.observe(scrubber);
  buildWorld();
  document.fonts.ready.then(() => {
    if (destroyed) return;
    const wasPlaying = playing;
    if (playing) cancelMotion();
    labelWidths = labels.map(label => label.offsetWidth);
    update();
    if (wasPlaying) start();
  });
  let appeared = false;
  const visibility = new IntersectionObserver(entries => {
    if (destroyed) return;
    const entry = entries[entries.length - 1];
    const visible = entry.isIntersecting && entry.intersectionRatio >= .15;
    if (visible === appeared) return;
    appeared = visible;
    if (reduced.matches) return;
    if (visible) { if (!playing) start(); }
    else pause();
  }, {threshold:[0, .15]});
  visibility.observe(viewport.closest(".petal-screen")!);
  updateButton();
  return {destroy() {
    destroyed = true;
    endScrub();
    endDrag();
    cleanup.forEach(remove => remove());
    document.removeEventListener("selectstart", preventSelection);
    cancelMotion(); resize.disconnect(); visibility.disconnect();
  }};
}
