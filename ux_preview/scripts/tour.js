/* Action Explorer — prototype tooling. A catalog of every product action (scripts/tour-catalog.js)
   that can be played as a guided demo (spotlight + captions + autoplay) or tried by hand.
   The demo drives the real prototype UI: it clicks, types and presses keys like a user would. */
(function () {
  const L = window.L;
  const { esc, icon, btn } = L;
  L.CATALOG = L.CATALOG || [];
  const CANCEL = Symbol("cancel");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  let P = null; // active player: { action, mode, i, auto, alive, gate, queue, el }

  // ── Driver: what a demo step can do ──────────────────────────────────────
  const T = (L.T = {});
  const alive = () => { if (!P || !P.alive) throw CANCEL; };
  const visible = (el) => el && el.isConnected && (el.offsetParent !== null || getComputedStyle(el).position === "fixed") && el.getClientRects().length > 0;
  T.wait = async (ms) => { await sleep(ms); alive(); };
  T.$ = async (sel, timeout = 5000) => {
    const end = Date.now() + timeout;
    for (;;) {
      alive();
      const el = typeof sel === "function" ? sel() : L.$$(sel).find(visible);
      if (visible(el)) return el;
      if (Date.now() > end) throw new Error(`Couldn't find ${typeof sel === "string" ? sel : "the target"}`);
      await sleep(60);
    }
  };
  T.byText = (sel, text) => () => L.$$(sel).find((el) => visible(el) && el.textContent.trim().includes(text));
  const reveal = async (el) => {
    const r = el.getBoundingClientRect();
    if (r.top < 70 || r.bottom > innerHeight - 20) { el.scrollIntoView({ block: "center" }); await T.wait(220); }
  };
  T.click = async (sel) => { const el = await T.$(sel); await reveal(el); await T.wait(160); el.click(); await T.wait(260); };
  T.type = async (sel, text, { clear = true, delay = 24 } = {}) => {
    const el = await T.$(sel);
    await reveal(el);
    el.focus();
    const fire = () => el.dispatchEvent(new Event("input", { bubbles: true }));
    if (clear && el.value) { el.value = ""; fire(); }
    for (const ch of text) { alive(); el.value += ch; fire(); await sleep(delay); }
    await T.wait(200);
  };
  T.set = async (sel, value) => { const el = await T.$(sel); el.value = value; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); await T.wait(250); };
  T.key = async (key, { meta, target } = {}) => {
    const el = target ? await T.$(target) : document.activeElement || document.body;
    el.dispatchEvent(new KeyboardEvent("keydown", { key, metaKey: !!meta, ctrlKey: false, bubbles: true, cancelable: true }));
    await T.wait(280);
  };
  T.submit = async (formSel) => { const f = await T.$(formSel); f.requestSubmit(); await T.wait(300); };
  T.until = async (fn, timeout = 6000) => { const end = Date.now() + timeout; while (!fn()) { alive(); if (Date.now() > end) throw new Error("Timed out waiting"); await sleep(80); } };
  /** Fresh scenario. persona: maya | free | reconnect | new (signed out) | newUser (just signed up). */
  T.scene = async (persona, route, mutate) => {
    L.closeModal(); L.closeMenu();
    L.$(".lk-toasts").innerHTML = "";
    L.state = L.makeState(persona === "newUser" ? "new" : persona);
    if (persona === "newUser") {
      Object.assign(L.state.user, { name: "Alex Kim", email: "alex@example.com", slug: "alexkim" });
      L.state.page.displayName = "Alex Kim";
      L.state.saved = L.clone(L.state.page);
      L.state.signedIn = true;
    }
    L.state.sim = { aiFails: false, publishFails: false };
    mutate?.(L.state);
    L.go(route, { fresh: true });
    scrollTo(0, 0);
    await T.wait(420);
  };

  // ── Spotlight + caption card ──────────────────────────────────────────────
  let host, spot, card, raf;
  function ensureHost() {
    if (host) return;
    host = document.createElement("div");
    host.className = "lk-tour";
    host.innerHTML = `<div class="lk-tour__spot" hidden></div><section class="lk-tour__card" role="region" aria-label="Action demo" aria-live="polite"></section>`;
    document.body.appendChild(host);
    spot = L.$(".lk-tour__spot", host);
    card = L.$(".lk-tour__card", host);
    card.addEventListener("click", onCardClick);
  }
  function follow() {
    cancelAnimationFrame(raf);
    const tick = () => {
      const el = P && P.el;
      if (el && visible(el)) {
        const r = el.getBoundingClientRect(), pad = 6;
        spot.hidden = false;
        Object.assign(spot.style, { left: r.left - pad + "px", top: r.top - pad + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px" });
      } else spot.hidden = true;
      raf = requestAnimationFrame(tick);
    };
    tick();
  }
  const groupLabel = (id) => (L.CATALOG_GROUPS.find((g) => g.id === id) || { label: id }).label;
  function renderCard(extra = {}) {
    const a = P.action, n = a.steps.length;
    const step = a.steps[P.i];
    const pct = P.mode === "try" ? 100 : P.done ? 100 : Math.max(0, (P.i / n) * 100);
    const head = `<div class="lk-tour__head"><span class="lk-tour__group">${esc(groupLabel(a.group))}</span><button type="button" class="close-button close-button--default" data-t="exit" aria-label="Close demo">${icon("xmark")}</button></div>
      <div class="lk-tour__title">${esc(a.title)}</div><div class="lk-tour__bar"><i style="width:${pct}%"></i></div>`;
    let body, ctrl;
    if (extra.error) {
      body = `<div class="lk-tour__text lk-tour__text--error">${icon("triangle-exclamation")}<span>${esc(extra.error)}</span></div>`;
      ctrl = `${btn({ label: "Restart", icon: "arrow-rotate-left", variant: "tertiary", size: "sm", attrs: { "data-t": "restart" } })}${btn({ label: "All actions", variant: "ghost", size: "sm", attrs: { "data-t": "list" } })}`;
    } else if (P.mode === "try") {
      body = `<div class="lk-tour__text"><span class="lk-tour__num ${P.tried ? "lk-tour__num--ok" : ""}">${icon(P.tried ? "check" : "person")}</span><span>${P.tried ? `<strong>Nice — that's it.</strong> ${esc(a.outcome || "")}` : `<strong>Your turn.</strong> ${esc(a.try.text)}`}</span></div>`;
      ctrl = `${btn({ label: "Show me", icon: "circle-play", variant: "tertiary", size: "sm", attrs: { "data-t": "demo" } })}${btn({ label: "Done", variant: "primary", size: "sm", attrs: { "data-t": "exit" } })}`;
    } else if (P.done) {
      const next = P.queue.length ? P.queue[0] : null;
      body = `<div class="lk-tour__text"><span class="lk-tour__num lk-tour__num--ok">${icon("check")}</span><span><strong>Done.</strong> ${esc(a.outcome || "")}</span></div>`;
      ctrl = `${btn({ label: "Replay", icon: "arrow-rotate-left", variant: "ghost", size: "sm", attrs: { "data-t": "restart" } })}${a.try ? btn({ label: "Try it yourself", variant: "tertiary", size: "sm", attrs: { "data-t": "try" } }) : ""}${next ? btn({ label: "Next action", iconRight: "arrow-right", variant: "primary", size: "sm", attrs: { "data-t": "next-action" } }) : btn({ label: "All actions", variant: "primary", size: "sm", attrs: { "data-t": "list" } })}`;
      if (next) body += `<div class="lk-tour__upnext">Up next: ${esc(next.title)}${P.auto ? " · starting…" : ""}</div>`;
    } else {
      body = step
        ? `<div class="lk-tour__text"><span class="lk-tour__num">${P.i + 1}/${n}</span><span>${esc(step.text)}</span></div>${P.busy ? `<div class="lk-tour__busy">${L.spinner()}${esc(step.doing || "Doing it…")}</div>` : ""}`
        : `<div class="lk-tour__text"><span class="lk-tour__num">${L.spinner()}</span><span>Setting up: ${esc(a.scene || "scenario")}…</span></div>`;
      ctrl = `${btn({ label: "Restart", iconOnly: true, icon: "arrow-rotate-left", variant: "ghost", size: "sm", attrs: { "data-t": "restart" } })}${btn({ label: P.auto ? "Pause" : "Auto-play", icon: P.auto ? "clock" : "circle-play", variant: "ghost", size: "sm", attrs: { "data-t": "auto" } })}<span class="lk-grow"></span>${btn({ label: step && step.run ? (step.cta || "Do it") : "Next", iconRight: "arrow-right", variant: "primary", size: "sm", disabled: !step || P.busy, attrs: { "data-t": "next" } })}`;
    }
    card.innerHTML = `${head}${body}<div class="lk-tour__ctrl">${ctrl}</div>`;
    card.hidden = false;
  }
  function onCardClick(e) {
    const b = e.target.closest("[data-t]");
    if (!b || !P) return;
    const t = b.dataset.t;
    if (t === "exit") return stop();
    if (t === "list") { const id = P.action.id; stop(); return L.explorer.open(id); }
    if (t === "restart") return play(P.action, { queue: P.queue });
    if (t === "try") return play(P.action, { mode: "try" });
    if (t === "demo") return play(P.action);
    if (t === "next-action") { const [next, ...rest] = P.queue; return play(next, { queue: rest }); }
    if (t === "auto") { P.auto = !P.auto; renderCard(); if (P.auto && P.gate) P.gate.arm(); return; }
    if (t === "next" && P.gate) P.gate.open();
  }
  // Reading time per step; `L.tour.speed` (default 1) shortens it, e.g. 2 = twice as fast.
  const readTime = (text) => Math.min(6500, Math.max(2300, 1500 + text.length * 30)) / (L.tour.speed || 1);
  function gate(ms) {
    return new Promise((resolve) => {
      let timer;
      P.gate = {
        open() { clearTimeout(timer); P.gate = null; resolve(); },
        arm() { clearTimeout(timer); timer = setTimeout(() => this.open(), ms); },
      };
      if (P.auto) P.gate.arm();
    });
  }

  // ── Player ────────────────────────────────────────────────────────────────
  function stop() {
    if (P) { P.alive = false; P.gate?.open(); clearInterval(P.poll); }
    P = null;
    L.prefill = true; // demos run on empty forms; normal clicking gets sample data back
    cancelAnimationFrame(raf);
    if (host) { spot.hidden = true; card.hidden = true; host.dataset.active = "false"; }
    document.removeEventListener("keydown", onKey, true);
  }
  function onKey(e) {
    if (!P) return;
    if (e.key === "Escape" && !document.querySelector(".modal__backdrop, .lk-pop")) { e.preventDefault(); stop(); }
    if (e.key === "ArrowRight" && e.altKey && P.gate) { e.preventDefault(); P.gate.open(); }
  }
  async function play(action, { mode = "demo", queue = [] } = {}) {
    stop();
    L.explorer.close();
    ensureHost();
    const me = (P = { action, mode, i: -1, auto: mode === "demo", alive: true, queue, el: null, done: false, busy: false });
    L.prefill = mode !== "demo"; // scripted demos show validation on empty forms; "Try it yourself" keeps sample data
    host.dataset.active = "true";
    document.addEventListener("keydown", onKey, true);
    follow();
    renderCard();
    try {
      await action.setup(T);
      if (mode === "try") {
        P.el = await T.$(action.try.target).catch(() => null);
        renderCard();
        if (action.try.done) P.poll = setInterval(() => { if (P === me && !P.tried && action.try.done()) { P.tried = true; P.el = null; renderCard(); } }, 300);
        return;
      }
      for (let i = 0; i < action.steps.length; i++) {
        alive();
        const st = action.steps[i];
        P.i = i;
        P.el = st.target ? await T.$(st.target).catch(() => null) : null;
        if (P.el) await reveal(P.el);
        renderCard();
        await gate(readTime(st.text));
        alive();
        if (st.run) {
          P.busy = true; renderCard();
          await st.run(T);
          P.busy = false;
          await T.wait(350);
        }
      }
      P.done = true; P.el = null; P.i = action.steps.length;
      renderCard();
      if (P.auto && P.queue.length) {
        await T.wait(1600);
        const [next, ...rest] = P.queue;
        play(next, { queue: rest });
      }
    } catch (err) {
      if (err === CANCEL || P !== me) return;
      console.warn("[tour]", action.id, err);
      P.busy = false; P.el = null;
      P.error = `${err.message || err}`;
      renderCard({ error: `${P.error}. The screen may have changed — restart the demo.` });
    }
  }
  L.tour = {
    play,
    stop,
    speed: 1,
    get active() { return !!P; },
    get status() { return P ? { id: P.action.id, step: P.i, done: P.done, error: P.error || null } : null; },
  };

  // ── Explorer drawer ───────────────────────────────────────────────────────
  let drawer, view = { id: null, q: "" };
  function renderList() {
    const q = view.q.trim().toLowerCase();
    const match = (a) => !q || [a.title, a.summary, ...(a.states || []), groupLabel(a.group)].join(" ").toLowerCase().includes(q);
    const groups = L.CATALOG_GROUPS.map((g) => ({ g, items: L.CATALOG.filter((a) => a.group === g.id && match(a)) })).filter((x) => x.items.length);
    const total = L.CATALOG.length;
    return `<div class="lk-explorer__head"><div><div class="lk-explorer__title">Action explorer</div><div class="lk-xs lk-muted">${total} actions · pick one to watch it, or try it yourself</div></div>${btn({ label: "Close", iconOnly: true, icon: "xmark", variant: "ghost", size: "sm", attrs: { "data-x": "close" } })}</div>
      <div class="lk-explorer__search"><span class="lk-explorer__searchicon">${icon("magnifier")}</span><input class="input input--secondary" type="search" placeholder="Search actions, e.g. “retry” or “undo”" value="${esc(view.q)}" data-x-search aria-label="Search actions"></div>
      <div class="lk-explorer__all">${btn({ label: `Play everything (${total})`, icon: "circle-play", variant: "tertiary", size: "sm", full: true, attrs: { "data-x": "all" } })}</div>
      <div class="lk-explorer__list">${groups.length ? groups.map(({ g, items }) => `<section class="lk-explorer__group"><div class="lk-explorer__ghead"><span>${icon(g.icon)}${esc(g.label)} <span class="lk-muted lk-num">${items.length}</span></span><button type="button" class="lk-textlink lk-xs" data-x="group" data-g="${g.id}">Play all</button></div>
        ${items.map((a) => `<button type="button" class="lk-explorer__item" data-x="open" data-id="${a.id}"><span class="lk-explorer__itemtitle">${esc(a.title)}</span><span class="lk-explorer__itemsum">${esc(a.summary)}</span></button>`).join("")}</section>`).join("") : `<div class="lk-empty" style="padding:40px 16px"><h2>No actions match</h2><p>Try another word.</p></div>`}</div>`;
  }
  function renderDetail(a) {
    const idx = L.CATALOG.indexOf(a);
    return `<div class="lk-explorer__head"><div class="lk-row" style="gap:4px">${btn({ label: "All actions", icon: "chevron-left", variant: "ghost", size: "sm", attrs: { "data-x": "back" } })}</div>${btn({ label: "Close", iconOnly: true, icon: "xmark", variant: "ghost", size: "sm", attrs: { "data-x": "close" } })}</div>
      <div class="lk-explorer__detail">
        <div class="lk-row" style="gap:6px">${L.chip(groupLabel(a.group), "accent")}${a.scene ? L.chip(a.scene, "default") : ""}</div>
        <h2 class="lk-h2" style="margin-top:10px">${esc(a.title)}</h2>
        <p class="lk-sub">${esc(a.summary)}</p>
        <div class="lk-row" style="margin-top:16px">${btn({ label: "Play demo", icon: "circle-play", variant: "primary", attrs: { "data-x": "play", "data-id": a.id } })}${a.try ? btn({ label: "Try it yourself", variant: "tertiary", attrs: { "data-x": "try", "data-id": a.id } }) : ""}</div>
        <h3 class="lk-explorer__h">What happens</h3>
        <ol class="lk-explorer__steps">${a.steps.map((s) => `<li>${esc(s.text)}</li>`).join("")}</ol>
        ${a.what && a.what.length ? `<h3 class="lk-explorer__h">Why it's designed this way</h3><ul class="lk-explorer__why">${a.what.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>` : ""}
        ${a.states && a.states.length ? `<h3 class="lk-explorer__h">States you'll see</h3><div class="lk-row lk-row--wrap" style="gap:6px">${a.states.map((s) => L.chip(s, "default")).join("")}</div>` : ""}
        <h3 class="lk-explorer__h">Implementation</h3>
        <dl class="lk-explorer__meta"><dt>HeroUI</dt><dd>${esc(a.ui || "—")}</dd><dt>Production</dt><dd class="lk-mono">${esc(a.prod || "—")}</dd></dl>
        <div class="lk-explorer__nav">${idx > 0 ? btn({ label: L.CATALOG[idx - 1].title, icon: "chevron-left", variant: "ghost", size: "sm", attrs: { "data-x": "open", "data-id": L.CATALOG[idx - 1].id } }) : "<span></span>"}${idx < L.CATALOG.length - 1 ? btn({ label: L.CATALOG[idx + 1].title, iconRight: "chevron-right", variant: "ghost", size: "sm", attrs: { "data-x": "open", "data-id": L.CATALOG[idx + 1].id } }) : ""}</div>
      </div>`;
  }
  function paint() {
    const a = view.id && L.CATALOG.find((x) => x.id === view.id);
    drawer.innerHTML = a ? renderDetail(a) : renderList();
    if (!a) {
      const input = L.$("[data-x-search]", drawer);
      input.addEventListener("input", () => { view.q = input.value; const pos = input.selectionStart; paint(); const i2 = L.$("[data-x-search]", drawer); i2.focus(); i2.setSelectionRange(pos, pos); });
    }
  }
  L.explorer = {
    open(id) {
      if (!drawer) {
        drawer = document.createElement("aside");
        drawer.className = "lk-explorer lk-tour";
        drawer.setAttribute("role", "dialog");
        drawer.setAttribute("aria-label", "Action explorer");
        document.body.appendChild(drawer);
        drawer.addEventListener("click", (e) => {
          const b = e.target.closest("[data-x]");
          if (!b) return;
          const x = b.dataset.x;
          const a = b.dataset.id && L.CATALOG.find((c) => c.id === b.dataset.id);
          if (x === "close") return L.explorer.close();
          if (x === "back") { view.id = null; return paint(); }
          if (x === "open") { view.id = a.id; paint(); drawer.scrollTop = 0; return L.$("[data-x=play]", drawer)?.focus(); }
          if (x === "play") return play(a);
          if (x === "try") return play(a, { mode: "try" });
          if (x === "all") { const [first, ...rest] = L.CATALOG; return play(first, { queue: rest }); }
          if (x === "group") { const [first, ...rest] = L.CATALOG.filter((c) => c.group === b.dataset.g); return play(first, { queue: rest }); }
        });
        drawer.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); L.explorer.close(); } });
      }
      if (L.tour.active) stop();
      view.id = id || null;
      paint();
      drawer.dataset.open = "true";
      setTimeout(() => (L.$("[data-x=play]", drawer) || L.$("[data-x-search]", drawer))?.focus(), 50);
    },
    close() { if (drawer) drawer.dataset.open = "false"; },
    get isOpen() { return drawer?.dataset.open === "true"; },
  };

  // "?" opens the explorer (when not typing)
  document.addEventListener("keydown", (e) => {
    if (e.key !== "?" || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || document.querySelector(".modal__backdrop")) return;
    e.preventDefault();
    if (L.explorer.isOpen) L.explorer.close();
    else L.explorer.open();
  });
})();
