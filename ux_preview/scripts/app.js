/* Router, app shell and the prototype review panel. */
(function () {
  const L = window.L;
  const { esc, icon, btn } = L;
  const STORE = "linkee-ux-preview-v6";

  // ── State (kept for the browser session so reloads don't lose the review) ─
  try { L.state = JSON.parse(sessionStorage.getItem(STORE)); } catch { L.state = null; }
  if (!L.state || !L.state.persona) L.state = L.makeState("maya"); // open with a populated account
  const persist = () => { try { sessionStorage.setItem(STORE, JSON.stringify(L.state)); } catch { /* quota: ignore */ } };
  addEventListener("pagehide", persist);
  setInterval(persist, 3000);

  // ── Navigation ────────────────────────────────────────────────────────────
  const NAV = [
    { id: "page", label: "My Page", icon: "person", href: "#/app/page" },
    { id: "inbox", label: "Inbox", icon: "comments", href: "#/app/inbox" },
    { id: "settings", label: "Settings", icon: "gear", href: "#/app/settings" },
  ];
  // `fresh` re-runs the view's enter() hook even when the route is unchanged (state was replaced).
  L.go = (hash, { fresh } = {}) => { if (fresh) lastKey = null; if (location.hash === hash) L.render(); else location.hash = hash; };
  let leaveFns = [];
  L.onLeave = (fn) => leaveFns.push(fn);

  function parse() {
    const raw = location.hash.replace(/^#\/?/, "");
    const [path, qs] = raw.split("?");
    const parts = path.split("/").filter(Boolean);
    return { parts, q: new URLSearchParams(qs || ""), key: path };
  }
  function resolve({ parts }) {
    const [a, b] = parts;
    if (!a) return { view: "landing" };
    if (a === "signup" || a === "login") return { view: a };
    if (a === "welcome") return { view: "welcome" };
    if (L.LEGAL_DOCS.includes(a)) return { view: "legal", param: a };
    if (a === "app" && b === "post") return { redirect: "#/app/inbox?new=1" }; // Publishing now lives in the Inbox
    if (a === "app") return { view: NAV.some((n) => n.id === b) ? b : "page", shell: true };
    return { view: "public", param: decodeURIComponent(a).toLowerCase() };
  }

  let lastKey = null;
  L.render = function () {
    leaveFns.forEach((f) => f()); leaveFns = [];
    const route = parse();
    const r = resolve(route);
    if (r.redirect) { lastKey = null; return location.replace(r.redirect); }
    const view = L.views[r.view];
    const s = L.state;
    if ((r.shell || view.guard === "auth") && !s.signedIn) {
      location.replace("#/login");
      return;
    }
    const changed = lastKey !== route.key;
    if (changed && view.enter) view.enter(s, route.q);
    const app = L.$("#app");
    const inner = view.render(s, route.q, r.param);
    app.innerHTML = r.shell ? shell(r.view, inner) : inner;
    const root = app.firstElementChild;
    if (r.shell) mountShell(root);
    view.mount?.(r.shell ? L.$("[data-view-root]", root) : root, s, route.q, r.param);
    if (view.title) document.title = typeof view.title === "function" ? view.title(s) : view.title;
    if (changed) {
      if (!route.q.get("section")) scrollTo(0, 0);
      const h = L.$("h1", root);
      if (h && lastKey !== null) { h.tabIndex = -1; h.focus({ preventScroll: true }); h.style.outline = "none"; }
    }
    lastKey = route.key;
    L.renderReview();
  };
  addEventListener("hashchange", L.render);

  // ── App shell ─────────────────────────────────────────────────────────────
  L.newCount = () => L.state.convos.filter((c) => c.status === "TODO").length;
  function shell(active, inner) {
    const s = L.state;
    const count = s.accounts.some((a) => a.provider === "INSTAGRAM") ? L.newCount() : 0;
    const badge = (n) => (n ? `<span class="lk-nav__badge" data-inbox-badge aria-label="${n} to reply">${n}</span>` : `<span data-inbox-badge hidden></span>`);
    const items = (cls) => NAV.map((n) => `<a class="${cls}" href="${n.href}" ${n.id === active ? 'aria-current="page"' : ""}>${icon(n.icon)}<span>${n.label}</span>${n.id === "inbox" ? badge(count) : ""}</a>`).join("");
    // The page address lives on My Page (with Copy) — the top bar only navigates.
    return `<div class="lk-view">
      <header class="lk-topbar"><div class="lk-topbar__inner">
        <a class="lk-logo" href="#/app/page" aria-label="Linkee — My Page"><span class="lk-logo__mark">L</span><span>Linkee</span></a>
        <nav class="lk-nav" aria-label="Main">${items("lk-nav__item")}</nav>
        <div class="lk-topbar__end">
          <button type="button" class="lk-avatar-btn" data-shell="menu" aria-haspopup="menu" aria-expanded="false" aria-label="Account menu">${L.avatar(s.user.name || "You", { size: 32, img: s.saved.avatar })}</button>
        </div>
      </div></header>
      <main id="main" class="lk-main" data-view-root>${inner}</main>
      <nav class="lk-tabbar" aria-label="Main">${items("lk-tabbar__item")}</nav>
    </div>`;
  }
  function mountShell(root) {
    root.addEventListener("click", (e) => {
      const a = e.target.closest("[data-shell]");
      if (!a) return;
      const s = L.state;
      if (a.dataset.shell === "menu")
        L.menu(a, [
          { label: "Log out", icon: "arrow-right-from-square", onClick: () => { s.signedIn = false; L.go("#/"); L.toast("You're logged out"); } },
        ], { header: `<div class="lk-row">${L.avatar(s.user.name || "You", { size: 36, img: s.saved.avatar })}<div class="lk-grow"><div class="lk-ellipsis" style="font-weight:500;font-size:14px">${esc(s.user.name)}</div><div class="lk-ellipsis lk-xs lk-muted">${esc(s.user.email)}</div></div>${L.chip(L.PLANS[s.user.plan].label, s.user.plan === "PRO" ? "accent" : "default")}</div>` });
    });
  }
  L.updateInboxBadge = () => {
    const n = L.newCount();
    L.$$("[data-inbox-badge]").forEach((b) => {
      if (n) { b.hidden = false; b.className = "lk-nav__badge"; b.textContent = n; b.setAttribute("aria-label", `${n} to reply`); }
      else { b.hidden = true; b.textContent = ""; }
    });
  };

  // Shared: plan gate + connect flow (used by Inbox, Publish, Settings)
  L.isPro = () => L.state.user.plan === "PRO";
  L.upgradeModal = (feature) =>
    L.modal({
      title: "Upgrade to Linkee Pro",
      icon: "sparkles",
      description: `${esc(feature)} ${feature.endsWith("s") ? "are" : "is"} included in Pro. Here's everything you get:`,
      body: `<ul class="lk-checklist">${["200 AI reply suggestions a day", "Careful auto-reply for simple comments", "Post to Instagram and Facebook at once", "Up to 10 connected accounts"].map((t) => `<li>${icon("check")}<span>${t}</span></li>`).join("")}</ul>
        <p class="lk-small lk-muted" style="margin:16px 0 0">Online checkout isn't available yet. Send us a note and we'll switch your account to Pro.</p>`,
      buttons: [{ label: "Not now" }, { label: "Contact us to upgrade", variant: "primary", icon: "envelope", onClick: () => { L.copy("hello@linkee.bio", "Email address copied"); } }],
    });
  L.connectFlow = function (provider, { reconnect } = {}) {
    const ig = provider === "INSTAGRAM";
    const s = L.state;
    const limit = L.PLANS[s.user.plan].maxAccounts;
    if (!reconnect && s.accounts.length >= limit) {
      return L.modal({ title: "Account limit reached", icon: "plug-connection", tone: "warning", description: `Your ${L.PLANS[s.user.plan].label} plan includes ${limit} connected accounts. Disconnect one, or upgrade for more.`, buttons: [{ label: "OK", variant: "primary" }] });
    }
    L.modal({
      title: reconnect ? "Reconnect Instagram" : ig ? "Connect Instagram" : "Connect a Facebook Page",
      description: ig ? "You'll log in on Instagram and choose what Linkee can do. You can disconnect anytime." : "You'll log in with Facebook and pick the Pages Linkee can post to.",
      body: `<div class="lk-oauth" aria-hidden="true"><span class="lk-oauth__app" style="background:var(--accent)">${icon("link", "lk-icon--lg")}</span><span class="lk-oauth__line"></span><span class="lk-oauth__app ${ig ? "lk-net-ig" : "lk-net-fb"}">${icon(ig ? "logo-instagram" : "logo-facebook", "lk-icon--xl")}</span></div>
        <div class="lk-small" style="font-weight:500">Linkee will be able to:</div>
        <ul class="lk-checklist lk-small">${(ig ? ["Read your profile name and photo", "Read and reply to comments on your posts", "Publish posts you create in Linkee"] : ["See the Pages you manage", "Publish posts you create in Linkee to those Pages"]).map((t) => `<li>${icon("check")}<span>${t}</span></li>`).join("")}</ul>
        <p class="lk-xs lk-muted" style="margin:14px 0 0">${ig ? "Requires an Instagram professional account (Business or Creator)." : "Only Pages where you have permission to post can be connected."}</p>`,
      buttons: [{ label: "Cancel" }, {
        label: `Continue to ${ig ? "Instagram" : "Facebook"}`, variant: "primary", iconRight: "arrow-up-right-from-square",
        onClick: async () => {
          const r = await L.consent(provider, { reconnect });
          const name = ig ? "Instagram" : "Facebook";
          if (!r.ok) {
            if (r.reason === "personal")
              return L.toast(`Couldn't connect ${name}`, { description: `@${s.user.slug || "you"}.personal is a personal account. Switch it to a Professional (Creator or Business) account in the Instagram app, then connect again.`, tone: "danger", duration: 8000 });
            return L.toast(`${name} connection was cancelled. Nothing was connected.`, { tone: "default" });
          }
          const done = L.toast(`Finishing ${name} connection…`, { tone: "default", duration: 0 });
          await L.sleep(900);
          done();
          if (reconnect) s.accounts.forEach((a) => { if (a.provider === provider) a.status = "CONNECTED"; });
          else if (ig) {
            s.accounts.push({ id: "ig" + L.uid(), provider, name: s.user.name || "You", handle: (s.user.slug || "you") + ".studio", status: "CONNECTED", connectedAt: "Connected just now" });
            if (!s.convos.length) seedInbox(s);
          } else {
            // Each Facebook Page becomes its own connection (as in production).
            r.pages.forEach((p) => { if (!s.accounts.some((a) => a.name === p.name)) s.accounts.push({ id: "fb" + L.uid(), provider, name: p.name, handle: "Facebook Page", status: "CONNECTED", connectedAt: "Connected just now" }); });
          }
          if (!reconnect) s.draft.destinations = s.accounts.filter((a) => a.status === "CONNECTED").map((a) => a.id);
          const pagesLabel = !ig && r.pages.length > 1 ? `${r.pages.length} Facebook Pages connected` : null;
          L.toast(reconnect ? `${name} reconnected` : ig ? "Instagram connected" : pagesLabel || "Facebook Page connected", { description: ig ? "New comments will show up in your Inbox." : "You can now publish to " + (r.pages.length > 1 ? "these Pages." : "this Page."), tone: "success" });
          L.render();
        },
      }],
    });
  };
  // A brand-new account's latest Instagram post and its first two comments.
  function seedInbox(s) {
    const igId = s.accounts.find((a) => a.provider === "INSTAGRAM").id;
    if (!s.history.some((p) => p.id === "n-p1")) s.history.push({ id: "n-p1", art: "bowl", caption: "First batch of bowls out of the kiln.", when: "2 days ago", targets: [{ account: igId, status: "PUBLISHED" }] });
    s.convos = [
      L.makeConvo("n1", "jules.k", "n-p1", [{ type: "COMMENT", text: "Love this! Where can I buy one?", age: "6m" }], { unread: true }),
      L.makeConvo("n2", "andrea_m", "n-p1", [{ type: "COMMENT", text: "Such a calm feed, made my morning ✨", age: "25m" }], { unread: true }),
    ];
  }

  // ── Review panel (prototype tooling, visually distinct from product UI) ───
  // One small dashed button keeps tooling out of the product's way; the panel holds everything else.
  const SCREENS = [
    ["Landing", "#/"], ["Sign up", "#/signup"], ["Log in", "#/login"], ["Onboarding", "#/welcome"],
    ["My Page", "#/app/page"], ["Inbox", "#/app/inbox"], ["New post", "#/app/inbox?new=1"], ["Settings", "#/app/settings"],
    ["Public page", null], ["Unclaimed page", "#/newcreator"],
  ];
  let reviewOpen = false;
  // Audience simulator: stands in for Instagram's webhook so reviewers can see comments arrive,
  // get classified and reopen handled conversations without a backend.
  const sim = { from: "new", post: "p1", text: "Is this still available?" };
  const NEW_PEOPLE = ["noah.makes", "ava.lin", "kenji_t", "sofia.clay", "liam.r", "zoe.paints", "ines.k", "omar.studio"];
  const igPosts = (s) => s.history.filter((p) => p.targets.some((t) => t.status === "PUBLISHED" && s.accounts.find((a) => a.id === t.account)?.provider === "INSTAGRAM"));
  L.simulateComment = function ({ from = sim.from, post = sim.post, text = sim.text } = {}) {
    const s = L.state;
    const known = s.convos.find((c) => c.user === from);
    const user = from === "new" || from === "new-closed" ? NEW_PEOPLE.find((u) => !s.convos.some((c) => c.user === u)) || "guest" + L.uid().slice(0, 3) : from;
    const c = L.engage.receive(s, { user, post, text, dm: from === "new-closed" ? false : known ? known.dm : true });
    L.toast(`New comment from ${user}`, { description: `“${text}”`, duration: 3200, action: { label: "Open", onClick: () => {
      Object.assign(s.inbox, { view: "post", post: c.post, cat: "ALL", active: c.id });
      c.unread = false;
      L.go("#/app/inbox", { fresh: true });
    } } });
    return c;
  };
  function simHTML(s) {
    const ig = s.accounts.find((a) => a.provider === "INSTAGRAM");
    if (!ig || !s.signedIn) return "";
    if (ig.status !== "CONNECTED") return `<div><h4>Simulate a comment</h4><p class="lk-xs lk-muted" style="margin:0">Reconnect Instagram first — Linkee can't receive comments while the connection is expired.</p></div>`;
    const posts = igPosts(s);
    if (!posts.some((p) => p.id === sim.post)) sim.post = posts[0]?.id;
    const people = [...new Set(s.convos.map((c) => c.user))];
    const opt = (v, label, cur) => `<option value="${esc(v)}" ${v === cur ? "selected" : ""}>${esc(label)}</option>`;
    return `<div><h4>Simulate a comment</h4><form class="lk-simform" data-sim-form>
      <select class="lk-simform__sel" data-sim="from" aria-label="From">${opt("new", "New person", sim.from)}${opt("new-closed", "New person · messages off", sim.from)}${people.map((u) => opt(u, u, sim.from)).join("")}</select>
      <select class="lk-simform__sel" data-sim="post" aria-label="On post">${posts.map((p) => opt(p.id, `${p.caption.slice(0, 40)}…`, sim.post)).join("")}</select>
      <div class="lk-row" style="gap:6px"><input class="input input--secondary lk-grow" data-sim="text" value="${esc(sim.text)}" aria-label="Comment text" style="min-width:0">${btn({ label: "Comment", variant: "tertiary", size: "sm", type: "submit" })}</div>
    </form></div>`;
  }
  L.renderReview = function () {
    let host = L.$("#lk-review-host");
    if (!host) { host = document.createElement("div"); host.id = "lk-review-host"; document.body.appendChild(host); wireReview(host); }
    const s = L.state;
    const cur = location.hash || "#/";
    host.innerHTML = `<div class="lk-fabs"><button type="button" class="lk-review-fab" data-r="toggle" aria-expanded="${reviewOpen}" aria-controls="lk-review">${icon("eye")}<span>Prototype</span></button></div>
    ${reviewOpen ? `<section class="lk-review" id="lk-review" aria-label="Prototype review controls">
      <div class="lk-row lk-row--between"><strong style="font-size:14px">Prototype controls</strong>${L.chip("Not product UI", "warning")}</div>
      ${btn({ label: `Explore all ${L.CATALOG.length} actions`, icon: "circle-play", variant: "primary", size: "sm", full: true, attrs: { "data-r": "actions", "aria-keyshortcuts": "Shift+?" } })}
      <div><h4>Scenario</h4><div class="lk-review__persona">${Object.entries(L.PERSONAS).map(([k, v]) => `<button type="button" class="lk-review__btn" data-r="persona" data-v="${k}" aria-pressed="${s.persona === k}">${v.label}<small>${v.hint}</small></button>`).join("")}</div></div>
      <div><h4>Jump to screen</h4><div class="lk-review__grid">${SCREENS.map(([label, href]) => { const h = href || `#/${s.user.slug || "maya"}`; return `<button type="button" class="lk-review__btn" data-r="go" data-v="${h}" aria-pressed="${cur.split("?")[0] === h}">${label}</button>`; }).join("")}</div></div>
      <div><h4>Simulate errors</h4><div class="lk-stack lk-stack--sm">
        ${L.switch({ id: "sim-ai", checked: s.sim.aiFails, label: "AI suggestion fails", size: "sm", action: "sim-ai" })}
        ${L.switch({ id: "sim-pub", checked: s.sim.publishFails, label: "Facebook publish fails", size: "sm", action: "sim-pub" })}
      </div></div>
      ${simHTML(s)}
      <div class="lk-row lk-row--between"><span class="lk-xs lk-muted">Log in password “wrong” shows the error state.</span>${btn({ label: "Reset", variant: "ghost", size: "sm", icon: "arrow-rotate-left", attrs: { "data-r": "reset" } })}</div>
    </section>` : ""}`;
  };
  function wireReview(host) {
    host.addEventListener("click", (e) => {
      const b = e.target.closest("[data-r], [data-action]");
      if (!b) return;
      const r = b.dataset.r || b.dataset.action;
      const s = L.state;
      if (r === "toggle") { reviewOpen = !reviewOpen; L.renderReview(); return; }
      if (r === "actions") { reviewOpen = false; L.renderReview(); return L.explorer.isOpen ? L.explorer.close() : L.explorer.open(); }
      if (r === "persona") {
        const keep = s.sim;
        L.state = L.makeState(b.dataset.v);
        L.state.sim = keep;
        const app = location.hash.startsWith("#/app/");
        L.go(b.dataset.v === "new" ? "#/" : app ? location.hash : "#/app/page", { fresh: true });
        L.toast(`Scenario: ${L.PERSONAS[b.dataset.v].label}`, { duration: 1800 });
      }
      if (r === "go") {
        const h = b.dataset.v;
        if ((h.startsWith("#/app") || h === "#/welcome") && !s.signedIn) {
          const keep = s.sim;
          L.state = L.makeState(h === "#/welcome" ? "new" : "maya");
          L.state.sim = keep;
          if (h === "#/welcome") {
            Object.assign(L.state.user, { name: "Alex Kim", email: "alex@example.com", slug: "alexkim" });
            L.state.page.displayName = "Alex Kim";
            L.state.saved = L.clone(L.state.page);
            L.state.signedIn = true;
          }
        }
        L.go(h, { fresh: true });
      }
      if (r === "sim-ai") { s.sim.aiFails = !s.sim.aiFails; L.setSwitch(b, s.sim.aiFails); }
      if (r === "sim-pub") { s.sim.publishFails = !s.sim.publishFails; L.setSwitch(b, s.sim.publishFails); }
      if (r === "reset") { sessionStorage.removeItem(STORE); L.state = L.makeState("maya"); L.go("#/", { fresh: true }); }
    });
    host.addEventListener("change", (e) => {
      const k = e.target.dataset.sim;
      if (!k) return;
      sim[k] = e.target.value;
      // Picking someone you already talk to picks their post, so a reply reopens the same conversation.
      const c = k === "from" && L.state.convos.find((x) => x.user === sim.from);
      if (c) { sim.post = c.post; L.renderReview(); }
    });
    host.addEventListener("input", (e) => { if (e.target.dataset.sim === "text") sim.text = e.target.value; });
    host.addEventListener("submit", (e) => {
      if (!e.target.matches("[data-sim-form]")) return;
      e.preventDefault();
      if (!sim.text.trim()) return;
      L.simulateComment();
      L.renderReview();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && reviewOpen && !document.querySelector(".modal__backdrop, .lk-pop")) { reviewOpen = false; L.renderReview(); } });
  }

  L.render();
})();
