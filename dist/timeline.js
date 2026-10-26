const PetalTimeline = (() => {
  const beatWidth = 62;
  const totalBeats = 48;
  const sections = [
    { name: "Intro", start: 0, beats: 16, color: "#3194FA" },
    { name: "Verse", start: 16, beats: 16, color: "#66BD48" },
    { name: "Chorus", start: 32, beats: 16, color: "#8A49A8" },
  ];
  const events = [3, 9.5, 14, 21, 27.5, 35, 43];
  const sectionEventCount = (random = Math.random) => 1 + Math.min(2, Math.floor(random() * 3));
  // UIScrollView normal deceleration: velocity retains 0.998 per millisecond.
  function dragDistance(velocity, elapsed) {
    return velocity * (1 - Math.pow(.998, elapsed)) / -Math.log(.998);
  }
  function rubberBand(scroll, width) {
    const boundary = Math.max(0, Math.min(totalBeats * beatWidth, scroll));
    const excess = scroll - boundary;
    const dimension = Math.max(1, width);
    return boundary + Math.sign(excess) * dimension * .55 * Math.abs(excess) / (dimension + .55 * Math.abs(excess));
  }
  function springOffset(displacement, velocity, elapsed) {
    const damping = .018;
    return (displacement + (velocity + damping * displacement) * elapsed) * Math.exp(-damping * elapsed);
  }
  function stickyOffset(scrollLeft, viewportWidth, start, width, labelWidth) {
    const desired = scrollLeft + 59 - viewportWidth / 2 - start;
    return Math.min(Math.max(desired, 0), Math.max(0, width - 62 - labelWidth));
  }
  function position(beat) {
    const clamped = Math.max(0, Math.min(totalBeats, beat));
    return { beat: clamped, scrollLeft: clamped * beatWidth, bar: Math.min(12, Math.floor(clamped / 4) + 1), section: sections.findLast(s => clamped >= s.start).name };
  }
  function scrubberBeatWidth(width) {
    return Math.max(0, width - (sections.length - 1) * 2) / totalBeats;
  }
  function scrubberEventX(beat, width) {
    return Math.round((beat * scrubberBeatWidth(width) - 3) * 2) / 2;
  }
  function scrubberHeadX(beat, width) {
    return Math.max(0, position(beat).beat * scrubberBeatWidth(width) - 2);
  }
  function icon(name, extra = "") {
    return '<span class="petal-icon petal-icon-' + name + ' ' + extra + '" aria-hidden="true"></span>';
  }
  function markup() {
    return '<figure class="petal-demo"><div class="petal-figure-heading"><span>A SONG IN MOTION</span><span>INTERACTIVE APP ILLUSTRATION</span></div><div class="petal-screen"><div class="petal-toolbar"><div class="petal-toolbar-left"><button id="demo-play" class="petal-control" aria-label="Play illustration" aria-pressed="false">' + icon("play") + '</button><button id="demo-stop" class="petal-control" aria-label="Stop and rewind illustration">' + icon("stop") + '</button></div><div class="petal-song-title"><strong>Midnight Drive <i aria-hidden="true"></i></strong><span>4/4 Time • 120 bpm</span></div><div class="petal-toolbar-balance" aria-hidden="true"></div></div><div class="petal-stage"><div id="demo-viewport" class="petal-viewport" tabindex="0" role="region" aria-label="Song timeline. Scroll horizontally or use left and right arrows to scrub."><div id="demo-world" class="petal-world"></div></div><div id="demo-ripples" class="petal-ripples" aria-hidden="true"></div><div class="petal-fixed-playhead" aria-hidden="true"></div></div><div class="petal-scrubber" role="group" aria-label="Jump to a song section">' + sections.map(s => '<button class="petal-mini-section" data-beat="' + s.start + '" aria-label="Jump to ' + s.name + '" style="--section-color:' + s.color + '"><span></span></button>').join("") + events.map(b => '<span class="petal-mini-event" data-beat="' + b + '" aria-hidden="true"></span>').join("") + '<span id="demo-mini-head" class="petal-mini-playhead" aria-hidden="true"></span></div></div><figcaption class="petal-caption"><span>FIG. 01 &nbsp; The playhead stays still. Your song moves.</span><span id="demo-position">Intro · Bar 1 of 12</span></figcaption><p class="petal-demo-help">The illustration plays when it comes into view. Pause it, drag the timeline, or tap a section in the overview. Section titles stick at the leading edge until the next section takes over. Illustration only; no MIDI or audio is sent.</p></figure>';
  }
  function motionPlan(fromBeat, viewportWidth, labelWidths, scrubberWidth) {
    const start = position(fromBeat).scrollLeft;
    const end = totalBeats * beatWidth;
    const span = end - start;
    const translation = value => "translate3d(" + value + "px,0,0)";
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
  function attach() {
    const viewport = document.getElementById("demo-viewport");
    if (!viewport) return null;
    const world = document.getElementById("demo-world");
    const play = document.getElementById("demo-play");
    const stop = document.getElementById("demo-stop");
    const mini = document.getElementById("demo-mini-head");
    const caption = document.getElementById("demo-position");
    const rippleLayer = document.getElementById("demo-ripples");
    const scrubber = mini.parentElement;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let beat = 0, playing = false, frameID = 0, lastBeat = -1, playbackStartBeat = 0;
    let coastID = 0, visualScroll = null;
    let scrubPointer = null, suppressSectionClick = false;
    let pointer = null, labels = [], labelWidths = [], destroyed = false;
    let previousWidth = 0, scrubberWidth = 0, animations = [], worldAnimation = null;

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
      play.innerHTML = icon(playing ? "pause" : "play");
    }
    function pause() {
      cancelMotion();
      update();
      updateButton();
    }
    function seek(value) {
      if (playing) cancelMotion();
      beat = position(value).beat;
      lastBeat = beat;
      rippleLayer.replaceChildren();
      update();
      updateButton();
    }
    function emit(eventBeat, burstIndex = 0) {
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
      const options = {duration:plan.duration, easing:"linear", fill:"forwards"};
      worldAnimation = world.animate(plan.world, options);
      animations = [worldAnimation, ...labels.map((label,index) => label.animate(plan.labels[index], options)), mini.animate(plan.mini, options)];
      // One timeline origin keeps the counter-moving sticky headers and overview
      // exactly in phase, including Safari's compositor-only animation frames.
      const origin = document.timeline.currentTime;
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
      const width = viewport.clientWidth;
      const overviewWidth = scrubber.clientWidth;
      if (width === previousWidth && overviewWidth === scrubberWidth) return;
      const wasPlaying = playing;
      if (playing) cancelMotion();
      previousWidth = width;
      scrubberWidth = overviewWidth;
      world.style.width = (totalBeats * beatWidth + width) + "px";
      world.innerHTML = sections.map(s => '<div class="petal-song-section" style="left:' + (width / 2 + s.start * beatWidth) + 'px;width:' + (s.beats * beatWidth - 2) + 'px;--section-color:' + s.color + '"><div class="petal-section-label"><strong>' + s.name + '</strong><span>4.0</span></div><div class="petal-beat-strip"></div></div>').join("") + Array.from({length:12}, (_, i) => '<div class="petal-measure" style="left:' + (width / 2 + i * 4 * beatWidth) + 'px"><strong>' + (i + 1) + '</strong><div><span>1</span><span>2</span><span>3</span><span>4</span></div></div>').join("") + events.map(b => '<span class="petal-event" style="left:' + (width / 2 + b * beatWidth - 8) + 'px"></span>').join("");
      labels = Array.from(world.querySelectorAll(".petal-section-label"));
      labelWidths = labels.map(label => label.offsetWidth);
      const overviewBeatWidth = scrubberBeatWidth(scrubberWidth);
      scrubber.querySelectorAll(".petal-mini-section").forEach((button, index) => {
        button.style.left = (sections[index].start * overviewBeatWidth) + "px";
        button.style.width = Math.max(0, sections[index].beats * overviewBeatWidth - 2) + "px";
      });
      scrubber.querySelectorAll(".petal-mini-event").forEach(dot => {
        dot.style.left = scrubberEventX(Number(dot.dataset.beat), scrubberWidth) + "px";
      });
      update();
      if (wasPlaying) start();
    }
    play.addEventListener("click", () => {
      if (reduced.matches) { pause(); seek(beat >= totalBeats ? 0 : Math.min(totalBeats, (Math.floor(beat / 4) + 1) * 4)); return; }
      if (playing) pause(); else start();
    });
    stop.addEventListener("click", () => { pause(); seek(0); });
    viewport.addEventListener("wheel", event => {
      const delta = event.shiftKey ? event.deltaY : event.deltaX;
      if (!delta || (!event.shiftKey && Math.abs(event.deltaX) < Math.abs(event.deltaY))) return;
      event.preventDefault(); pause();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? previousWidth : 1;
      seek(beat + delta * unit / beatWidth);
    }, {passive:false});
    viewport.addEventListener("pointerdown", event => {
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
    viewport.addEventListener("pointermove", event => {
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
      let origin;
      const tick = now => {
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
    function coast(velocity) {
      visualScroll = null;
      if (reduced.matches || Math.abs(velocity) < .02) return;
      const startBeat = beat;
      let origin;
      const tick = now => {
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
    const endDrag = event => {
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
    const preventSelection = event => { if (pointer || scrubPointer) event.preventDefault(); };
    document.addEventListener("selectstart", preventSelection);
    viewport.addEventListener("dragstart", event => event.preventDefault());
    viewport.addEventListener("lostpointercapture", endDrag);
    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);
    viewport.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault(); pause();
      seek(event.key === "Home" ? 0 : event.key === "End" ? totalBeats : beat + (event.key === "ArrowRight" ? 1 : -1));
    });
    const scrubToPointer = clientX => {
      const x = clientX - scrubPointer.left;
      const unit = scrubberBeatWidth(scrubPointer.width);
      const section = sections.find(s => x >= s.start * unit && x <= (s.start + s.beats) * unit - 2);
      // Native scrubber maps within the section's visible strip, including its gaps.
      const target = section
        ? section.start + Math.max(0, Math.min(1, (x - section.start * unit) / (section.beats * unit - 2))) * section.beats
        : x / scrubPointer.width * totalBeats;
      seek(target);
    };
    scrubber.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      suppressSectionClick = false;
      const bounds = scrubber.getBoundingClientRect();
      scrubPointer = {id:event.pointerId, x:event.clientX, left:bounds.left, width:bounds.width, dragging:false};
    });
    scrubber.addEventListener("pointermove", event => {
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
    const endScrub = event => {
      if (!scrubPointer) return;
      if (event?.type === "pointerup" && scrubPointer.dragging) scrubToPointer(event.clientX);
      scrubPointer = null;
      document.body.classList.remove("petal-timeline-dragging");
    };
    scrubber.addEventListener("pointerup", endScrub);
    scrubber.addEventListener("pointercancel", endScrub);
    scrubber.addEventListener("lostpointercapture", endScrub);
    scrubber.addEventListener("dragstart", event => event.preventDefault());
    scrubber.addEventListener("click", event => {
      if (suppressSectionClick) { event.preventDefault(); event.stopPropagation(); }
    }, true);
    document.querySelectorAll(".petal-mini-section").forEach(button => button.addEventListener("click", () => { pause(); seek(Number(button.dataset.beat)); }));
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
    visibility.observe(viewport.closest(".petal-screen"));
    updateButton();
    return {destroy() {
      destroyed = true;
      endScrub();
      endDrag();
      document.removeEventListener("selectstart", preventSelection);
      cancelMotion(); resize.disconnect(); visibility.disconnect();
    }};
  }
  return {markup, attach, stickyOffset, position, motionPlan, scrubberEventX, scrubberHeadX, sectionEventCount, dragDistance, rubberBand, springOffset};
})();
