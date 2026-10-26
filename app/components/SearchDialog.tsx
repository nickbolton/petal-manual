import React from "react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { chapters, chapterPath } from "../content";
const plain = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const rows = chapters.flatMap(chapter => [{chapter, title:chapter.title, section:"", text:plain(chapter.intro)}, ...chapter.sections.map(section => ({chapter,title:section.title,section:section.id,text:plain(section.html)}))]);
export function SearchDialog({open, onClose}: {open:boolean; onClose:()=>void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const element = dialog.current!;
    if (!open) { if (element.open) element.close(); return; }
    const previous = document.activeElement as HTMLElement | null;
    element.showModal(); input.current?.focus();
    return () => { element.close(); previous?.focus(); };
  }, [open]);
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const results = rows.filter(row => words.every(word => (row.chapter.title + " " + row.title + " " + row.text).toLowerCase().includes(word))).slice(0,14);
  return <dialog ref={dialog} id="search-dialog" aria-labelledby="search-title" onCancel={event => {event.preventDefault();onClose();}} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
  }} onKeyDown={event => {
    const links = Array.from(dialog.current!.querySelectorAll<HTMLAnchorElement>(".search-result"));
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (event.key === "Enter" && document.activeElement === input.current && links[0]) {event.preventDefault();links[0].click();}
    if (event.key === "ArrowDown" && links.length) {event.preventDefault();links[(index+1)%links.length].focus();}
    if (event.key === "ArrowUp" && links.length) {event.preventDefault();links[(index-1+links.length)%links.length].focus();}
  }}>
    <div className="search-head"><label id="search-title" htmlFor="search-input">Search the field guide</label><button className="icon-button" aria-label="Close search" onClick={onClose}>×</button></div>
    <input ref={input} id="search-input" type="search" placeholder="Try “MIDI channel” or “Guided Access”…" autoComplete="off" value={query} onChange={event => setQuery(event.target.value)}/>
    <div id="search-results" aria-live="polite">{results.length ? results.map(row => {
      const start = Math.max(0, row.text.toLowerCase().indexOf(words[0] || "") - 40);
      const excerpt = (start ? "…" : "") + row.text.slice(start,start+145) + (row.text.length > start+145 ? "…" : "");
      return <Link key={row.chapter.id+row.section} className="search-result" to={chapterPath(row.chapter.id) + (row.section ? "#"+row.chapter.id+"-"+row.section : "")} onClick={onClose}><small>{row.chapter.group} / {row.chapter.title}</small><strong>{row.title}</strong><p>{excerpt}</p></Link>;
    }) : <p className="search-empty">No matches yet. Try a shorter phrase, such as “channel”, “save”, or “pair”.</p>}</div>
    <div className="search-footer"><span>Searches every chapter</span><kbd>ESC to close</kbd></div>
  </dialog>;
}
