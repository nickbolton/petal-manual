const PetalTimeline = (() => {
  const beatWidth = 62;
  const totalBeats = 48;
  const sections = [
    { name: "Intro", start: 0, beats: 16, color: "#3194FA" },
    { name: "Verse", start: 16, beats: 16, color: "#66BD48" },
    { name: "Chorus", start: 32, beats: 16, color: "#8A49A8" },
  ];
  const events = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44];
  function stickyOffset(scrollLeft, viewportWidth, start, width, labelWidth) {
    const desired = scrollLeft + 59 - viewportWidth / 2 - start;
    return Math.min(Math.max(desired, 0), Math.max(0, width - 62 - labelWidth));
  }
  function position(beat) {
    const clamped = Math.max(0, Math.min(totalBeats, beat));
    return { beat: clamped, scrollLeft: clamped * beatWidth, bar: Math.min(12, Math.floor(clamped / 4) + 1), section: sections.findLast(s => clamped >= s.start).name };
  }
  function icon(name, extra = "") {
    return '<span class="petal-icon petal-icon-' + name + ' ' + extra + '" aria-hidden="true"></span>';
  }
  function markup() {
    return '<figure class="petal-demo"><div class="petal-figure-heading"><span>A SONG IN MOTION</span><span>INTERACTIVE APP ILLUSTRATION</span></div><div class="petal-screen"><div class="petal-toolbar"><div class="petal-toolbar-left"><button id="demo-play" class="petal-control" aria-label="Play illustration" aria-pressed="false">' + icon("play") + '</button><button id="demo-stop" class="petal-control" aria-label="Stop and rewind illustration">' + icon("stop") + '</button></div><div class="petal-song-title"><strong>Midnight Drive <i aria-hidden="true"></i></strong><span>4/4 Time • 120 bpm</span></div><div class="petal-toolbar-balance" aria-hidden="true"></div></div><div class="petal-stage"><div id="demo-viewport" class="petal-viewport" tabindex="0" role="region" aria-label="Song timeline. Scroll horizontally or use left and right arrows to scrub."><div id="demo-world" class="petal-world"></div></div><div id="demo-ripples" class="petal-ripples" aria-hidden="true"></div><div class="petal-fixed-playhead" aria-hidden="true"></div></div><div class="petal-scrubber" role="group" aria-label="Jump to a song section">' + sections.map(s => '<button class="petal-mini-section" data-beat="' + s.start + '" aria-label="Jump to ' + s.name + '" style="--section-color:' + s.color + '"><span></span></button>').join("") + '<span id="demo-mini-head" class="petal-mini-playhead" aria-hidden="true"></span></div></div><figcaption class="petal-caption"><span>FIG. 01 &nbsp; The playhead stays still. Your song moves.</span><span id="demo-position">Intro · Bar 1 of 12</span></figcaption><p class="petal-demo-help">The illustration plays when it comes into view. Pause it, drag the timeline, or tap a section in the overview. Section titles stick at the leading edge until the next section takes over. Illustration only; no MIDI or audio is sent.</p></figure>';
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
    return {
      duration: (totalBeats - position(fromBeat).beat) * 500,
      world: [{transform:translation(-start)}, {transform:translation(-end)}],
      labels: labelFrames,
      mini: [{transform:translation(position(fromBeat).beat / totalBeats * scrubberWidth - 1)}, {transform:translation(scrubberWidth - 1)}],
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
      world.style.transform = "translate3d(" + (-p.scrollLeft) + "px,0,0)";
      labels.forEach((label, index) => {
        const s = sections[index];
        const offset = stickyOffset(p.scrollLeft, previousWidth, s.start * beatWidth, s.beats * beatWidth - 2, labelWidths[index]);
        label.style.transform = "translate3d(" + offset + "px,0,0)";
      });
      mini.style.transform = "translate3d(" + (p.beat / totalBeats * scrubberWidth - 1) + "px,0,0)";
      metadata();
    }
    function cancelMotion() {
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
    function emit(eventBeat) {
      if (reduced.matches || rippleLayer.childElementCount >= 12) return;
      const carrier = document.createElement("span");
      carrier.className = "petal-ripple-carrier";
      const ring = document.createElement("span");
      ring.className = "petal-ripple";
      carrier.append(ring);
      ring.addEventListener("animationend", () => carrier.remove(), {once:true});
      rippleLayer.append(carrier);
      const startX = previousWidth / 2 + (eventBeat - beat) * beatWidth;
      carrier.animate([
        {transform:"translate3d(" + startX + "px,0,0)"},
        {transform:"translate3d(" + (startX - 124 * .58) + "px,0,0)"},
      ], {duration:580, easing:"linear", fill:"forwards"});
    }
    function frame() {
      if (!playing || destroyed) return;
      beat = currentBeat();
      if (beat - lastBeat < 2) events.filter(b => b > lastBeat && b <= beat).forEach(emit);
      lastBeat = beat;
      // No geometry reads or motion-style writes in this loop. Only the caption
      // and occasional event notification depend on main-thread frame delivery.
      metadata();
      if (beat < totalBeats) frameID = requestAnimationFrame(frame);
    }
    function start() {
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
      pause();
      pointer = {id:event.pointerId, x:event.clientX, scroll:beat * beatWidth};
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add("is-scrubbing");
    });
    viewport.addEventListener("pointermove", event => {
      if (!pointer || event.pointerId !== pointer.id) return;
      seek((pointer.scroll - (event.clientX - pointer.x)) / beatWidth);
    });
    const endDrag = () => { pointer = null; viewport.classList.remove("is-scrubbing"); };
    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);
    viewport.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault(); pause();
      seek(event.key === "Home" ? 0 : event.key === "End" ? totalBeats : beat + (event.key === "ArrowRight" ? 1 : -1));
    });
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
    return {destroy() { destroyed = true; cancelMotion(); resize.disconnect(); visibility.disconnect(); }};
  }
  return {markup, attach, stickyOffset, position, motionPlan};
})();
