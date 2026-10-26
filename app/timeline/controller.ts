
export const beatWidth = 62;
export const totalBeats = 48;
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
      transform: translation(viewportWidth / 2 + sectionStart - offset + stickyOffset(offset, viewportWidth, sectionStart, sectionWidth, labelWidth)),
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
export const rippleLimit = 12;
export function rippleSchedule(fromBeat: number, random = Math.random) {
  const start = position(fromBeat).beat;
  const entries = events.filter(beat => beat >= start).map(beat => ({beat, index:0}));
  sections.filter(section => section.start >= start).forEach(section => {
    const count = sectionEventCount(random);
    for (let index = 0; index < count; index++) entries.push({beat:section.start, index});
  });
  entries.sort((a,b) => a.beat-b.beat || a.index-b.index);
  const available = Array<number>(rippleLimit).fill(0);
  return entries.flatMap(event => {
    const delay = (event.beat - start) * 500;
    const slot = available.findIndex(end => end <= delay);
    if (slot < 0) return [];
    const stagger = event.index * 70;
    const duration = 580 + stagger;
    available[slot] = delay + duration;
    return [{...event, slot, delay, stagger, duration}];
  });
}
export function attach(root: HTMLElement) {
  const find = (id: string) => root.querySelector<HTMLElement>("#" + id)!;
  const viewport = find("demo-viewport");
  const cleanup: (() => void)[] = [];
  function listen<K extends keyof HTMLElementEventMap>(target: HTMLElement, name: K, handler: (event: HTMLElementEventMap[K]) => void, options?: boolean | AddEventListenerOptions) {
    target.addEventListener(name, handler, options);
    cleanup.push(() => target.removeEventListener(name, handler, options));
  }
  const world = find("demo-world");
  const play = find("demo-play");
  const stop = find("demo-stop");
  const mini = find("demo-mini-head");
  const caption = find("demo-position");
  const rippleLayer = find("demo-ripples");
  const rippleSlots = Array.from(rippleLayer.querySelectorAll<HTMLElement>(".petal-ripple-carrier")).map(carrier => ({carrier, ring:carrier.querySelector<HTMLElement>(".petal-ripple")!}));
  const scrubber = mini.parentElement!;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let beat = 0, playing = false, playbackStartBeat = 0;
  let captionTimer: ReturnType<typeof setTimeout> | undefined;
  let coastID = 0, visualScroll: number | null = null;
  let scrubPointer: {id:number; x:number; left:number; width:number; dragging:boolean} | null = null, suppressSectionClick = false;
  let pointer: {id:number; x:number; scroll:number; lastX:number; lastTime:number; velocity:number} | null = null;
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
      const offset = previousWidth / 2 + s.start * beatWidth - scroll + stickyOffset(scroll, previousWidth, s.start * beatWidth, s.beats * beatWidth - 2, labelWidths[index]);
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
    clearTimeout(captionTimer);
    captionTimer = undefined;
    animations.forEach(animation => animation.cancel());
    animations = [];
    worldAnimation = null;
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
    update();
    updateButton();
  }
  function scheduleRipples(origin: number) {
    for (const event of rippleSchedule(playbackStartBeat)) {
      const {carrier, ring} = rippleSlots[event.slot];
      const x = previousWidth / 2;
      const motion = carrier.animate([
        {transform:`translate3d(${x}px,0,0)`},
        {transform:`translate3d(${x - 124 * event.duration / 1000}px,0,0)`},
      ], {delay:event.delay, duration:event.duration, easing:"linear", fill:"none"});
      const expansion = ring.animate([
        {offset:0, transform:"scale(.05)", opacity:0},
        {offset:.1, opacity:.65},
        {offset:1, transform:"scale(1)", opacity:0},
      ], {delay:event.delay + event.stagger, duration:580, easing:"ease-out", fill:"none"});
      motion.startTime = expansion.startTime = origin;
      animations.push(motion, expansion);
    }
  }
  function scheduleCaption() {
    if (!playing || destroyed) return;
    beat = currentBeat();
    metadata();
    // The caption changes once per bar, not once per display frame.
    if (beat < totalBeats) captionTimer = setTimeout(scheduleCaption, Math.max(16, (4 - beat % 4) * 500));
  }
  function start() {
    cancelCoast();
    if (beat >= totalBeats) seek(0);
    const plan = motionPlan(beat, previousWidth, labelWidths, scrubberWidth);
    if (plan.duration <= 0) return;
    playbackStartBeat = beat;
    const options: KeyframeAnimationOptions = {duration:plan.duration, easing:"linear", fill:"forwards"};
    worldAnimation = world.animate(plan.world, options);
    animations = [worldAnimation, ...labels.map((label,index) => label.animate(plan.labels[index], options)), mini.animate(plan.mini, options)];
    // One timeline origin keeps the independent track, headers, and overview
    // exactly in phase, including Safari's compositor-only animation frames.
    const origin = document.timeline.currentTime as number;
    animations.forEach(animation => { animation.startTime = origin; });
    scheduleRipples(origin);
    playing = true;
    scheduleCaption();
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

  }
  function buildWorld() {
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
    labels = Array.from(root.querySelectorAll<HTMLElement>(".petal-section-label"));
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
  listen(viewport, "wheel", event => {
    const delta = event.shiftKey ? event.deltaY : event.deltaX;
    if (!delta || (!event.shiftKey && Math.abs(event.deltaX) < Math.abs(event.deltaY))) return;
    event.preventDefault(); pause();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? previousWidth : 1;
    seek(beat + delta * unit / beatWidth);
  }, {passive:false});
  listen(viewport, "pointerdown", event => {
    if (event.button !== 0) return;
    event.preventDefault();
    viewport.focus({preventScroll:true});
    document.getSelection?.()?.removeAllRanges();
    document.body.classList.add("petal-timeline-dragging");
    pause();
    pointer = {id:event.pointerId, x:event.clientX, scroll:beat * beatWidth, lastX:event.clientX, lastTime:event.timeStamp, velocity:0};
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add("is-scrubbing");
  });
  listen(viewport, "pointermove", event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const elapsed = event.timeStamp - pointer.lastTime;
    if (elapsed > 0) pointer.velocity = (pointer.lastX - event.clientX) / elapsed;
    pointer.lastX = event.clientX;
    pointer.lastTime = event.timeStamp;
    const rawScroll = pointer.scroll - (event.clientX - pointer.x);
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
    if (!released || destroyed) return;
    if (visualScroll !== null && (visualScroll < 0 || visualScroll > totalBeats * beatWidth)) springBack();
    else {
      visualScroll = null;
      if (event?.type === "pointerup" && event.timeStamp - released.lastTime < 100) coast(released.velocity);
    }
  };
  const preventSelection = (event: Event) => { if (pointer || scrubPointer) event.preventDefault(); };
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
    const x = clientX - scrubPointer.left;
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
    suppressSectionClick = false;
    const bounds = scrubber.getBoundingClientRect();
    scrubPointer = {id:event.pointerId, x:event.clientX, left:bounds.left, width:bounds.width, dragging:false};
  });
  listen(scrubber, "pointermove", event => {
    if (!scrubPointer || scrubPointer.id !== event.pointerId) return;
    if (!scrubPointer.dragging && Math.abs(event.clientX - scrubPointer.x) <= 1) return;
    if (!scrubPointer.dragging) {
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
    if (suppressSectionClick && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); }
  }, true);
  root.querySelectorAll<HTMLElement>(".petal-mini-section").forEach(button => listen(button, "click", () => { pause(); seek(Number(button.dataset.beat)); }));
  const resize = new ResizeObserver(buildWorld);
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
