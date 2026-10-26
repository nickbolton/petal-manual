import React from "react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { chapters, chapterPath, type Chapter } from "../content";
import { Timeline } from "../timeline/Timeline";
import { useTheme } from "./Theme";
import { SearchDialog } from "./SearchDialog";

export function Manual({chapter}: {chapter:Chapter}) {
  const {dark,toggleTheme} = useTheme();
  const [menuOpen,setMenuOpen] = useState(false);
  const [searchOpen,setSearchOpen] = useState(false);
  const [activeSection,setActiveSection] = useState("");
  const progress = useRef<HTMLSpanElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const index = chapters.indexOf(chapter);
  useEffect(() => {document.body.classList.toggle("menu-open",menuOpen);return () => document.body.classList.remove("menu-open");}, [menuOpen]);
  useEffect(() => {
    const key = (event:KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {event.preventDefault();setSearchOpen(open => !open);}
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown",key);
    let printed: HTMLDetailsElement[] = [];
    const before = () => {printed=Array.from(document.querySelectorAll<HTMLDetailsElement>("details:not([open])"));printed.forEach(item => item.open=true);};
    const after = () => printed.forEach(item => item.open=false);
    window.addEventListener("beforeprint",before);window.addEventListener("afterprint",after);
    return () => {document.removeEventListener("keydown",key);window.removeEventListener("beforeprint",before);window.removeEventListener("afterprint",after);};
  }, []);
  useEffect(() => {
    setMenuOpen(false);setActiveSection("");
    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"});
    const observer = new IntersectionObserver(entries => {
      const visible=entries.filter(entry => entry.isIntersecting).sort((a,b) => a.boundingClientRect.top-b.boundingClientRect.top);
      if (visible.length) setActiveSection(visible[0].target.id);
    }, {rootMargin:"-100px 0px -55% 0px"});
    document.querySelectorAll(".section").forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, [location.pathname,location.hash]);
  useEffect(() => {
    let frame=0;
    const update=() => {frame=0;const end=document.documentElement.scrollHeight-innerHeight;if(progress.current) progress.current.style.width=(end>0 ? Math.min(100,scrollY/end*100) : 100)+"%";};
    const queue=() => {if(!frame) frame=requestAnimationFrame(update);};
    window.addEventListener("scroll",queue,{passive:true});window.addEventListener("resize",queue);update();
    return () => {cancelAnimationFrame(frame);window.removeEventListener("scroll",queue);window.removeEventListener("resize",queue);};
  }, [chapter.id]);
  return <>
    <a className="skip" href="#main">Skip to content</a>
    <header className="topbar"><Link className="brand" to="/" aria-label="Petal manual home"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 16C-2 14 6-5 16 7c10-12 18 7 0 9Zm0 0c18 2 10 21 0 9C6 37-2 18 16 16Z" fill="currentColor"/></svg><span>Petal<span className="brand-dot">.</span></span></Link>
      <span className="edition">THE FIELD GUIDE <span>/</span> iOS APP</span>
      <div className="top-actions"><button className="search-trigger" aria-label="Search the field guide" aria-haspopup="dialog" onClick={()=>setSearchOpen(true)}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><span>Find your way</span><kbd>⌘ K</kbd></button><button className="icon-button" aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} title="Change theme" onClick={toggleTheme}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M12 4a8 8 0 0 0 0 16Z" fill="currentColor"/></svg></button><button className="icon-button menu-toggle" aria-expanded={menuOpen} aria-controls="sidebar" aria-label="Open chapters" onClick={()=>setMenuOpen(!menuOpen)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button></div>
    </header>
    <div className="layout"><aside className="sidebar" id="sidebar"><div className="side-label">USER MANUAL</div><nav id="chapter-nav" aria-label="Manual chapters">{chapters.map((item,i) => <ChapterNav key={item.id} chapter={item} index={i} active={item.id===chapter.id}/>)}</nav><div className="side-note"><span className="status-dot"/> Made for the stage.<br/><span>Written for the current Petal app.</span></div><Link className="side-help" to="/troubleshooting">Something not working? <span>↗</span></Link></aside>
      <main id="main" tabIndex={-1}><div className="reading-progress" aria-hidden="true"><span ref={progress}/></div><div className="page-meta"><span>{chapter.group.toUpperCase()} / {String(index+1).padStart(2,"0")}</span><button className="text-button" onClick={()=>window.print()}>Print chapter <span>↗</span></button></div>
        <div id="chapter-content" onClick={event => {
          const anchor=(event.target as Element).closest<HTMLAnchorElement>("a[href]");
          if (!anchor || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || anchor.target || anchor.hasAttribute("download")) return;
          const url=new URL(anchor.href);if(url.origin!==window.location.origin) return;
          event.preventDefault();navigate(url.pathname+url.search+url.hash);
        }}>
          <header className="chapter-head"><div className="eyebrow">{chapter.kicker}</div><h1 dangerouslySetInnerHTML={{__html:chapter.headline}}/><p className="lede" dangerouslySetInnerHTML={{__html:chapter.intro}}/><div className="chapter-tags">{chapter.tags.map(tag=><span key={tag}>{tag}</span>)}</div></header>
          {(index===0 || chapter.id==="timeline") && <Timeline key={chapter.id}/>}
          {chapter.sections.map((section,i)=><section className="section" key={section.id} id={chapter.id+"-"+section.id}><div className="section-title"><span className="section-number">{String(i+1).padStart(2,"0")}</span><h2>{section.title}</h2></div><div dangerouslySetInnerHTML={{__html:section.html}}/></section>)}
        </div>
        <nav className="chapter-pagination" aria-label="Previous and next chapters">{index>0 && <Link to={chapterPath(chapters[index-1].id)}><small>← PREVIOUS CHAPTER</small><strong>{chapters[index-1].title}</strong></Link>}{index<chapters.length-1 ? <Link to={chapterPath(chapters[index+1].id)}><small>NEXT CHAPTER →</small><strong>{chapters[index+1].title}</strong></Link> : <Link to="/"><small>BACK TO THE BEGINNING ↗</small><strong>Meet Petal</strong></Link>}</nav>
        <footer className="footer"><Link className="footer-logo" to="/">Petal.</Link><span>Your music. Your cues. Your moment.</span><span>Guide edition · October 2026</span></footer>
      </main>
      <aside className="toc" aria-label="On this page"><div className="side-label">ON THIS PAGE</div><nav id="toc">{chapter.sections.map(section=><Link key={section.id} to={chapterPath(chapter.id)+"#"+chapter.id+"-"+section.id} className={activeSection===chapter.id+"-"+section.id ? "active" : undefined}>{section.title}</Link>)}</nav><div className="toc-tip"><span>✳</span><p>A little preparation.<br/>A lot more presence.</p></div></aside>
    </div>
    <SearchDialog open={searchOpen} onClose={()=>setSearchOpen(false)}/><div className="mobile-shade" onClick={()=>setMenuOpen(false)}/>
  </>;
}
function ChapterNav({chapter,index,active}: {chapter:Chapter;index:number;active:boolean}) {
  return <>{(index===0 || chapter.group!==chapters[index-1].group) && <div className="nav-group">{chapter.group}</div>}<Link className={"chapter-link"+(active ? " active" : "")} to={chapterPath(chapter.id)} aria-current={active ? "page" : undefined}><span className="num">{String(index+1).padStart(2,"0")}</span><span>{chapter.title}</span></Link></>;
}
