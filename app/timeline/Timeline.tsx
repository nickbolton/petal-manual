import React from "react";
import { useEffect, useRef } from "react";
import { attach, sections, events, beatWidth, rippleLimit } from "./controller";

export function Timeline() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!root.current) return;
    const controller = attach(root.current);
    return () => controller.destroy();
  }, []);
  return <figure className="petal-demo" ref={root}>
    <div className="petal-figure-heading"><span>A SONG IN MOTION</span><span>INTERACTIVE APP ILLUSTRATION</span></div>
    <div className="petal-screen">
      <div className="petal-toolbar"><div className="petal-toolbar-left">
        <button id="demo-play" className="petal-control" aria-label="Play illustration" aria-pressed="false"><span className="petal-icon petal-icon-play" aria-hidden="true"/></button>
        <button id="demo-stop" className="petal-control" aria-label="Stop and rewind illustration"><span className="petal-icon petal-icon-stop" aria-hidden="true"/></button>
      </div><div className="petal-song-title"><strong>Midnight Drive <i aria-hidden="true"/></strong><span>4/4 Time • 120 bpm</span></div><div className="petal-toolbar-balance" aria-hidden="true"/></div>
      <div className="petal-stage"><div id="demo-viewport" className="petal-viewport" tabIndex={0} role="region" aria-label="Song timeline. Scroll horizontally or use left and right arrows to scrub.">
        <div id="demo-world" className="petal-world">
          {sections.map(section => <div key={section.name} className="petal-song-section" role="group" aria-label={section.name} data-world-beat={section.start} style={{width:section.beats * beatWidth - 2, "--section-color":section.color} as React.CSSProperties}>
            <div className="petal-beat-strip"/>
          </div>)}
          {Array.from({length:12}, (_,i) => <div key={i} className="petal-measure" data-world-beat={i * 4}><strong>{i+1}</strong><div>{[1,2,3,4].map(beat => <span key={beat}>{beat}</span>)}</div></div>)}
          {events.map(beat => <span key={beat} className="petal-event" data-world-beat={beat} data-inset={8}/>)}
        </div>
      </div><div className="petal-headers" aria-hidden="true">{sections.map(section => <div key={section.name} className="petal-section-label"><strong>{section.name}</strong><span>4.0</span></div>)}</div>
      <div id="demo-ripples" className="petal-ripples" aria-hidden="true">{Array.from({length:rippleLimit},(_,index) => <span className="petal-ripple-carrier" key={index}><span className="petal-ripple"/></span>)}</div><div className="petal-fixed-playhead" aria-hidden="true"/></div>
      <div className="petal-scrubber" role="group" aria-label="Jump to a song section">
        {sections.map(section => <button key={section.name} className="petal-mini-section" data-beat={section.start} aria-label={"Jump to " + section.name} style={{"--section-color":section.color} as React.CSSProperties}><span/></button>)}
        {events.map(beat => <span key={beat} className="petal-mini-event" data-beat={beat} aria-hidden="true"/>)}
        <span id="demo-mini-head" className="petal-mini-playhead" aria-hidden="true"/>
      </div>
    </div>
    <figcaption className="petal-caption"><span>FIG. 01 &nbsp; The playhead stays still. Your song moves.</span><span id="demo-position">Intro · Bar 1 of 12</span></figcaption>
    <p className="petal-demo-help">The illustration plays when it comes into view. Pause it, drag the timeline, or pan the overview. Section titles stick at the leading edge until the next section takes over. Illustration only; no MIDI or audio is sent.</p>
  </figure>;
}
