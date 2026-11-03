/* Router, app shell and the prototype review panel. */
(function () {
  const L = window.L;
  const { esc, icon, btn } = L;
  const STORE = "linkee-ux-preview-v2";

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
    { id: "post", label: "Publish", icon: "paper-plane", href: "#/app/post" },
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
    if (a === "app") return { view: NAV.some((n) => n.id === b) ? b : "page", shell: true };
    return { view: "public", param: decodeURIComponent(a).toLowerCase() };
  }

  let lastKey = null;
  L.render = function () {
    leaveFns.forEach((f) => f()); leaveFns = [];
    const route = parse();
    const r = resolve(route);
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
  L.newCount = () => L.state.comments.filter((c) => c.status === "NEW").length;
  function shell(active, inner) {
    const s = L.state;
    const count = s.accounts.some((a) => a.provider === "INSTAGRAM") ? L.newCount() : 0;
    const badge = (n) => (n ? `<span class="lk-nav__badge" data-inbox-badge aria-label="${n} to reply">${n}</span>` : `<span data-inbox-badge hidden></span>`);
    const items = (cls) => NAV.map((n) => `<a class="${cls}" href="${n.href}" ${n.id === active ? 'aria-current="page"' : ""}>${icon(n.icon)}<span>${n.label}</span>${n.id === "inbox" ? badge(count) : ""}</a>`).join("");
    const url = `linkee.bio/${s.user.slug}`;
    return `<div class="lk-view">
      <header class="lk-topbar"><div class="lk-topbar__inner">
        <a class="lk-logo" href="#/app/page" aria-label="Linkee — My Page"><span class="lk-logo__mark">L</span><span>Linkee</span></a>
        <nav class="lk-nav" aria-label="Main">${items("lk-nav__item")}</nav>
        <div class="lk-topbar__end">
          <button type="button" class="lk-urlpill" data-shell="copy" aria-label="Copy your page link ${esc(url)}"><span class="lk-urlpill__text">${esc(url)}</span><span class="lk-urlpill__copy">${icon("copy")}</span></button>
          <button type="button" class="lk-avatar-btn" data-shell="menu" aria-haspopup="menu" aria-expanded="false" aria-label="Account menu">${L.avatar(s.user.name || "You", { size: 32, img: s.page.avatar })}</button>
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
      if (a.dataset.shell === "copy") { s.setup.copied = true; L.copy(`https://linkee.bio/${s.user.slug}`); L.refreshSetup?.(); }
      if (a.dataset.shell === "menu")
        L.menu(a, [
          { label: "View my page", icon: "arrow-up-right-from-square", onClick: () => L.go(`#/${s.user.slug}`) },
          { label: "Copy page link", icon: "copy", onClick: () => { s.setup.copied = true; L.copy(`https://linkee.bio/${s.user.slug}`); L.refreshSetup?.(); } },
          { label: "Settings", icon: "gear", onClick: () => L.go("#/app/settings") },
          { sep: true },
          { label: "Log out", icon: "arrow-right-from-square", onClick: () => { s.signedIn = false; L.go("#/"); L.toast("You're logged out"); } },
        ], { header: `<div class="lk-row">${L.avatar(s.user.name || "You", { size: 36, img: s.page.avatar })}<div class="lk-grow"><div class="lk-ellipsis" style="font-weight:500;font-size:14px">${esc(s.user.name)}</div><div class="lk-ellipsis lk-xs lk-muted">${esc(s.user.email)}</div></div>${L.chip(L.PLANS[s.user.plan].label, s.user.plan === "PRO" ? "accent" : "default")}</div>` });
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
            if (!s.comments.length) s.comments = demoComments();
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
  function demoComments() {
    return [
      { id: "n1", user: "jules.k", text: "Love this! Where can I buy one?", post: "p2", age: "6m", status: "NEW", unread: true },
      { id: "n2", user: "andrea_m", text: "Such a calm feed, made my morning ✨", post: "p3", age: "25m", status: "NEW", unread: true },
    ];
  }

  // ── Review panel (prototype tooling, visually distinct from product UI) ───
  const SCREENS = [
    ["Landing", "#/"], ["Sign up", "#/signup"], ["Log in", "#/login"], ["Onboarding", "#/welcome"],
    ["My Page", "#/app/page"], ["Inbox", "#/app/inbox"], ["Publish", "#/app/post"], ["Settings", "#/app/settings"],
    ["Public page", null], ["Unclaimed page", "#/newcreator"],
  ];
  let reviewOpen = false;
  L.renderReview = function () {
    let host = L.$("#lk-review-host");
    if (!host) { host = document.createElement("div"); host.id = "lk-review-host"; document.body.appendChild(host); wireReview(host); }
    const s = L.state;
    const cur = location.hash || "#/";
    host.innerHTML = `<div class="lk-fabs"><button type="button" class="lk-review-fab lk-actions-fab" data-r="actions" aria-keyshortcuts="Shift+?">${icon("circle-play")}<span>Actions <span class="lk-actions-fab__count">${L.CATALOG.length}</span></span></button><button type="button" class="lk-review-fab" data-r="toggle" aria-expanded="${reviewOpen}" aria-controls="lk-review">${icon("eye")}<span>Review</span></button></div>
    ${reviewOpen ? `<section class="lk-review" id="lk-review" aria-label="Prototype review controls">
      <div class="lk-row lk-row--between"><strong style="font-size:14px">Prototype controls</strong>${L.chip("Not product UI", "warning")}</div>
      ${btn({ label: `Explore all ${L.CATALOG.length} actions`, icon: "circle-play", variant: "primary", size: "sm", full: true, attrs: { "data-r": "actions" } })}
      <div><h4>Scenario</h4><div class="lk-review__persona">${Object.entries(L.PERSONAS).map(([k, v]) => `<button type="button" class="lk-review__btn" data-r="persona" data-v="${k}" aria-pressed="${s.persona === k}">${v.label}<small>${v.hint}</small></button>`).join("")}</div></div>
      <div><h4>Jump to screen</h4><div class="lk-review__grid">${SCREENS.map(([label, href]) => { const h = href || `#/${s.user.slug || "maya"}`; return `<button type="button" class="lk-review__btn" data-r="go" data-v="${h}" aria-pressed="${cur.split("?")[0] === h}">${label}</button>`; }).join("")}</div></div>
      <div><h4>Simulate errors</h4><div class="lk-stack lk-stack--sm">
        ${L.switch({ id: "sim-ai", checked: s.sim.aiFails, label: "AI suggestion fails", size: "sm", action: "sim-ai" })}
        ${L.switch({ id: "sim-pub", checked: s.sim.publishFails, label: "Facebook publish fails", size: "sm", action: "sim-pub" })}
      </div></div>
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
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && reviewOpen && !document.querySelector(".modal__backdrop, .lk-pop")) { reviewOpen = false; L.renderReview(); } });
  }

  L.render();
})();
