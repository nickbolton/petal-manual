(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const content = $("chapter-content");
  const dialog = $("search-dialog");
  let current = "";
  let animation = 0;
  let observer;
  let lastSearchFocus;
  const plain = (html) => { const el = document.createElement("div"); el.innerHTML = html; return el.textContent || ""; };
  const escape = (str) => String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const routeFor = (id, section) => "#" + id + (section ? "~" + section : "");
  function closeMenu() {
    document.body.classList.remove("menu-open");
    $("menu-toggle").setAttribute("aria-expanded", "false");
  }
  let group = "";
  $("chapter-nav").innerHTML = chapters.map((chapter, index) => {
    let heading = "";
    if (group !== chapter.group) { group = chapter.group; heading = '<div class="nav-group">' + escape(group) + '</div>'; }
    return heading + '<a class="chapter-link" href="#' + chapter.id + '" data-chapter="' + chapter.id + '"><span class="num">' + String(index + 1).padStart(2, "0") + '</span><span>' + escape(chapter.title) + '</span></a>';
  }).join("");
  function hero() {
    return '<div class="hero-console"><div class="console-top"><span>A SONG IN MOTION</span><b>● ILLUSTRATIVE TIMELINE</b></div><div class="console-title"><h3>Midnight Drive</h3><span>120 BPM &nbsp;/&nbsp; 4/4</span></div><div class="timeline-demo"><div class="measure-numbers"><span>01</span><span>02</span><span>03</span><span>04</span><span>05</span><span>06</span><span>07</span><span>08</span></div><div class="tracks"><div class="track">INTRO</div><div class="track">VERSE</div><div class="track">CHORUS</div></div><div class="event-dots"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="playhead" id="demo-head"></div></div><div class="console-bottom"><span id="demo-position">BAR 01 / 08</span><button class="demo-play" id="demo-play" aria-pressed="false">▶ Play illustration</button></div></div><span class="figure-label">FIG. 01 &nbsp; A musical map of your MIDI changes. Illustration only; no MIDI or audio is sent.</span>';
  }
  function attachDemo() {
    const button = $("demo-play");
    if (!button) return;
    let playing = false, started = 0, elapsed = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function frame(time) {
      if (!playing) return;
      if (!started) started = time - elapsed;
      elapsed = (time - started) % 16000;
      const progress = elapsed / 16000;
      $("demo-head").style.left = (3 + progress * 94) + "%";
      $("demo-position").textContent = "BAR " + String(Math.floor(progress * 8) + 1).padStart(2, "0") + " / 08";
      animation = requestAnimationFrame(frame);
    }
    button.addEventListener("click", () => {
      if (reduced) {
        elapsed = (elapsed + 2000) % 16000;
        $("demo-head").style.left = (3 + elapsed / 16000 * 94) + "%";
        $("demo-position").textContent = "BAR " + String(Math.floor(elapsed / 2000) + 1).padStart(2, "0") + " / 08";
        button.textContent = "→ Next illustrated bar";
        return;
      }
      playing = !playing;
      button.setAttribute("aria-pressed", String(playing));
      button.textContent = playing ? "Ⅱ Pause illustration" : "▶ Play illustration";
      if (playing) { started = 0; animation = requestAnimationFrame(frame); }
      else cancelAnimationFrame(animation);
    });
  }
  function render() {
    if (location.hash === "#main" && current) { $("main").focus(); return; }
    const parts = location.hash.slice(1).split("~");
    let chapter = chapters.find(c => c.id === parts[0]);
    if (!chapter) chapter = chapters[0];
    const sectionId = parts[1];
    closeMenu();
    if (current !== chapter.id) {
      current = chapter.id;
      cancelAnimationFrame(animation);
      const index = chapters.indexOf(chapter);
      document.title = chapter.title + " — Petal field guide";
      $("breadcrumb").textContent = chapter.group.toUpperCase() + " / " + String(index + 1).padStart(2, "0");
      content.innerHTML = '<header class="chapter-head"><div class="eyebrow">' + chapter.kicker + '</div><h1>' + chapter.headline + '</h1><p class="lede">' + chapter.intro + '</p><div class="chapter-tags">' + chapter.tags.map(t => '<span>' + escape(t) + '</span>').join("") + '</div></header>' + (index === 0 || chapter.id === "timeline" ? hero() : "") + chapter.sections.map((section, i) => '<section class="section" id="' + chapter.id + "-" + section.id + '"><div class="section-title"><span class="section-number">' + String(i + 1).padStart(2, "0") + '</span><h2>' + section.title + '</h2></div>' + section.html + '</section>').join("");
      $("toc").innerHTML = chapter.sections.map(s => '<a href="' + routeFor(chapter.id, s.id) + '" data-section="' + chapter.id + "-" + s.id + '">' + s.title + '</a>').join("");
      $("pagination").innerHTML = (index ? '<a href="#' + chapters[index - 1].id + '"><small>← PREVIOUS CHAPTER</small><strong>' + chapters[index - 1].title + '</strong></a>' : '<span class="empty"></span>') + (index < chapters.length - 1 ? '<a href="#' + chapters[index + 1].id + '"><small>NEXT CHAPTER →</small><strong>' + chapters[index + 1].title + '</strong></a>' : '<a href="#overview"><small>BACK TO THE BEGINNING ↗</small><strong>Meet Petal</strong></a>');
      document.querySelectorAll(".chapter-link").forEach(link => {
        const active = link.dataset.chapter === chapter.id;
        link.classList.toggle("active", active);
        if (active) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
      });
      if (observer) observer.disconnect();
      observer = new IntersectionObserver(entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length) document.querySelectorAll("#toc a").forEach(link => link.classList.toggle("active", link.dataset.section === visible[0].target.id));
      }, { rootMargin: "-100px 0px -55% 0px" });
      document.querySelectorAll(".section").forEach(section => observer.observe(section));
      attachDemo();
      if (!sectionId) window.scrollTo({top:0, behavior:"instant"});
    }
    if (sectionId) {
      const target = document.getElementById(chapter.id + "-" + sectionId);
      if (target) target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }
    updateProgress();
  }
  function updateProgress() {
    const end = document.documentElement.scrollHeight - innerHeight;
    $("progress").style.width = (end > 0 ? Math.min(100, scrollY / end * 100) : 100) + "%";
  }
  let scrollQueued = false;
  window.addEventListener("scroll", () => {
    if (!scrollQueued) {
      scrollQueued = true;
      requestAnimationFrame(() => { updateProgress(); scrollQueued = false; });
    }
  }, {passive:true});
  window.addEventListener("resize", updateProgress);
  window.addEventListener("hashchange", render);
  $("menu-toggle").addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    $("menu-toggle").setAttribute("aria-expanded", String(open));
  });
  $("mobile-shade").addEventListener("click", closeMenu);
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeMenu(); });
  const searchIndex = chapters.flatMap(chapter => [{ chapter, title: chapter.title, section: "", text: plain(chapter.intro) }].concat(chapter.sections.map(s => ({chapter, title:s.title, section:s.id, text:plain(s.html)}))));
  function search() {
    const query = $("search-input").value.trim().toLowerCase();
    const words = query.split(/s+/).filter(Boolean);
    const results = searchIndex.filter(row => words.every(word => (row.chapter.title + " " + row.title + " " + row.text).toLowerCase().includes(word))).slice(0, 14);
    $("search-results").innerHTML = results.length ? results.map(row => {
      let start = query ? row.text.toLowerCase().indexOf(words[0]) : 0;
      start = Math.max(0, start - 40);
      const excerpt = (start ? "…" : "") + row.text.slice(start, start + 145) + (row.text.length > start + 145 ? "…" : "");
      return '<a class="search-result" href="' + routeFor(row.chapter.id, row.section) + '"><small>' + row.chapter.group + " / " + row.chapter.title + '</small><strong>' + escape(row.title) + '</strong><p>' + escape(excerpt) + '</p></a>';
    }).join("") : '<p class="search-empty">No matches yet. Try a shorter phrase, such as “channel”, “save”, or “pair”.</p>';
  }
  function openSearch() { lastSearchFocus = document.activeElement; dialog.showModal(); search(); $("search-input").focus(); }
  function closeSearch() { dialog.close(); if (lastSearchFocus) lastSearchFocus.focus(); }
  $("open-search").addEventListener("click", openSearch);
  $("close-search").addEventListener("click", closeSearch);
  $("search-input").addEventListener("input", search);
  $("search-results").addEventListener("click", event => {
    if (event.target.closest("a")) { closeSearch(); $("main").focus({preventScroll:true}); }
  });
  dialog.addEventListener("click", event => {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeSearch();
  });
  dialog.addEventListener("keydown", event => {
    if (!["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) return;
    const links = Array.from(document.querySelectorAll(".search-result"));
    const index = links.indexOf(document.activeElement);
    if (event.key === "Enter" && document.activeElement === $("search-input") && links[0]) { event.preventDefault(); links[0].click(); }
    if (event.key === "ArrowDown" && links.length) { event.preventDefault(); links[(index + 1) % links.length].focus(); }
    if (event.key === "ArrowUp" && links.length) { event.preventDefault(); links[(index - 1 + links.length) % links.length].focus(); }
  });
  document.addEventListener("keydown", event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); if (!dialog.open) openSearch(); else closeSearch(); }
  });
  function setTheme(dark) {
    document.body.classList.toggle("dark", dark);
    $("theme-toggle").setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    document.querySelector('meta[name="theme-color"]').content = dark ? "#111c21" : "#f7f6f2";
    try { localStorage.setItem("petal-manual-theme", dark ? "dark" : "light"); } catch {}
  }
  try { setTheme(localStorage.getItem("petal-manual-theme") === "dark"); } catch {}
  $("theme-toggle").addEventListener("click", () => setTheme(!document.body.classList.contains("dark")));
  $("print").addEventListener("click", () => window.print());
  let printedDetails = [];
  window.addEventListener("beforeprint", () => { printedDetails = Array.from(document.querySelectorAll("details:not([open])")); printedDetails.forEach(el => el.open = true); });
  window.addEventListener("afterprint", () => printedDetails.forEach(el => el.open = false));
  render();
})();
