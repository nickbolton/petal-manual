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
    return '<figure class="petal-demo"><div class="petal-figure-heading"><span>A SONG IN MOTION</span><span>INTERACTIVE APP ILLUSTRATION</span></div><div class="petal-screen"><div class="petal-toolbar"><div class="petal-toolbar-left"><button id="demo-play" class="petal-control" aria-label="Play illustration" aria-pressed="false">' + icon("play") + '</button><button id="demo-stop" class="petal-control" aria-label="Stop and rewind illustration">' + icon("stop") + '</button></div><div class="petal-song-title"><strong>Midnight Drive <i aria-hidden="true"></i></strong><span>4/4 Time • 120 bpm</span></div><div class="petal-toolbar-balance" aria-hidden="true"></div></div><div class="petal-stage"><div id="demo-viewport" class="petal-viewport" tabindex="0" role="region" aria-label="Song timeline. Scroll horizontally or use left and right arrows to scrub."><div id="demo-world" class="petal-world"></div></div><div id="demo-ripples" class="petal-ripples" aria-hidden="true"></div><div class="petal-fixed-playhead" aria-hidden="true"></div></div><div class="petal-scrubber" role="group" aria-label="Jump to a song section">' + sections.map(s => '<button class="petal-mini-section" data-beat="' + s.start + '" aria-label="Jump to ' + s.name + '" style="--section-color:' + s.color + '"><span></span></button>').join("") + '<span id="demo-mini-head" class="petal-mini-playhead" aria-hidden="true"></span></div></div><figcaption class="petal-caption"><span>FIG. 01 &nbsp; The playhead stays still. Your song moves.</span><span id="demo-position">Intro · Bar 1 of 12</span></figcaption><p class="petal-demo-help">Press Play, drag the timeline, or tap a section in the overview. Section titles stick at the leading edge until the next section takes over. Illustration only; no MIDI or audio is sent.</p></figure>';
  }
  function attach() {
    const viewport = document.getElementById("demo-viewport");
    if (!viewport) return null;
    const world = document.getElementById("demo-world");
    const play = document.getElementById("demo-play");
    const stop = document.getElementById("demo-stop");
    const mini = document.getElementById("demo-mini-head");
    const rippleLayer = document.getElementById("demo-ripples");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let beat = 0, playing = false, frameID = 0, startTime = null, lastBeat = -1;
    let pointer = null, labels = [], labelWidths = [], destroyed = false;
    let previousWidth = 0;
    function buildWorld() {
      const width = viewport.clientWidth;
      if (width === previousWidth) return;
      previousWidth = width;
      world.style.width = (totalBeats * beatWidth + width) + "px";
      world.innerHTML = sections.map(s => '<div class="petal-song-section" style="left:' + (width / 2 + s.start * beatWidth) + 'px;width:' + (s.beats * beatWidth - 2) + 'px;--section-color:' + s.color + '"><div class="petal-section-label"><strong>' + s.name + '</strong><span>4.0</span></div><div class="petal-beat-strip"></div></div>').join("") + Array.from({length:12}, (_, i) => '<div class="petal-measure" style="left:' + (width / 2 + i * 4 * beatWidth) + 'px"><strong>' + (i + 1) + '</strong><div><span>1</span><span>2</span><span>3</span><span>4</span></div></div>').join("") + events.map(b => '<span class="petal-event" style="left:' + (width / 2 + b * beatWidth - 8) + 'px"></span>').join("");
      labels = Array.from(world.querySelectorAll(".petal-section-label"));
      labelWidths = labels.map(label => label.offsetWidth);
      update();
    }
    function update() {
      const p = position(beat);
      // Move one compositor layer at an exact, linear subpixel offset. Native
      // scroll positions can round or apply browser scroll animation behavior.
      world.style.transform = "translate3d(" + (-p.scrollLeft) + "px,0,0)";
      labels.forEach((label, index) => {
        const s = sections[index];
        const offset = stickyOffset(p.scrollLeft, previousWidth, s.start * beatWidth, s.beats * beatWidth - 2, labelWidths[index]);
        label.style.transform = "translateX(" + offset + "px)";
      });
      mini.style.left = (p.beat / totalBeats * 100) + "%";
      const caption = document.getElementById("demo-position");
      const text = p.section + " · Bar " + p.bar + " of 12";
      if (caption.textContent !== text) caption.textContent = text;
      rippleLayer.querySelectorAll(".petal-ripple").forEach(ring => {
        ring.style.left = (viewport.clientWidth / 2 + (Number(ring.dataset.beat) - beat) * beatWidth) + "px";
      });
    }
    function setPlaying(value) {
      playing = value;
      play.setAttribute("aria-pressed", String(value));
      play.setAttribute("aria-label", value ? "Pause illustration" : "Play illustration");
      play.innerHTML = icon(value ? "pause" : "play");
      if (!value) { cancelAnimationFrame(frameID); startTime = null; }
    }
    function seek(value) {
      beat = position(value).beat;
      lastBeat = beat;
      rippleLayer.replaceChildren();
      update();
    }
    function emit(eventBeat) {
      if (reduced.matches || rippleLayer.childElementCount >= 12) return;
      const ring = document.createElement("span");
      ring.className = "petal-ripple";
      ring.dataset.beat = eventBeat;
      ring.addEventListener("animationend", () => ring.remove(), {once:true});
      rippleLayer.append(ring);
    }
    function frame(time) {
      if (!playing || destroyed) return;
      if (startTime === null) startTime = time - beat * 500;
      beat = Math.min(totalBeats, (time - startTime) / 500);
      if (beat - lastBeat < 2) events.filter(b => b > lastBeat && b <= beat).forEach(emit);
      lastBeat = beat;
      update();
      if (beat >= totalBeats) { setPlaying(false); return; }
      frameID = requestAnimationFrame(frame);
    }
    play.addEventListener("click", () => {
      if (reduced.matches) { setPlaying(false); seek(beat >= totalBeats ? 0 : Math.min(totalBeats, (Math.floor(beat / 4) + 1) * 4)); return; }
      if (playing) setPlaying(false);
      else { if (beat >= totalBeats) seek(0); setPlaying(true); startTime = null; frameID = requestAnimationFrame(frame); }
    });
    stop.addEventListener("click", () => { setPlaying(false); seek(0); });
    viewport.addEventListener("wheel", event => {
      // Preserve vertical page scrolling; consume only horizontal/shift-wheel scrubbing.
      const delta = event.shiftKey ? event.deltaY : event.deltaX;
      if (!delta || (!event.shiftKey && Math.abs(event.deltaX) < Math.abs(event.deltaY))) return;
      event.preventDefault();
      setPlaying(false);
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? previousWidth : 1;
      seek(beat + delta * unit / beatWidth);
    }, {passive:false});
    viewport.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      setPlaying(false);
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
      event.preventDefault(); setPlaying(false);
      seek(event.key === "Home" ? 0 : event.key === "End" ? totalBeats : beat + (event.key === "ArrowRight" ? 1 : -1));
    });
    document.querySelectorAll(".petal-mini-section").forEach(button => button.addEventListener("click", () => {
      setPlaying(false); seek(Number(button.dataset.beat));
    }));
    const resize = new ResizeObserver(buildWorld);
    resize.observe(viewport);
    buildWorld();
    document.fonts.ready.then(() => { if (!destroyed) { labelWidths = labels.map(label => label.offsetWidth); update(); } });
    if (reduced.matches) { play.setAttribute("aria-label", "Advance illustration by one bar"); }
    return {destroy() { destroyed = true; setPlaying(false); resize.disconnect(); }};
  }
  return {markup, attach, stickyOffset, position};
})();
