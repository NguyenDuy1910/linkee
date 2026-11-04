/* Public views: landing, sign up, log in, onboarding (welcome), public bio page, not found. */
(function () {
  const L = window.L;
  const { esc, icon, btn } = L;
  L.views = L.views || {};

  // ── Landing ───────────────────────────────────────────────────────────────
  // One promise, one button, and real pages made with Linkee. The FAQ answers the rest.
  const DEMOS = () => [
    {
      slug: "maya.makes",
      page: {
        displayName: "Maya Rivers", bio: "Ceramics, slow mornings & studio notes. New pieces every first Friday.", avatar: L.AVATAR_MAYA,
        theme: { preset: "sand", font: "serif", buttonShape: "pill", buttonFill: "solid" },
        socials: [{ platform: "instagram", url: "x" }, { platform: "tiktok", url: "x" }, { platform: "youtube", url: "x" }],
        links: [["Shop the spring collection"], ["Studio notes — monthly newsletter"], ["Watch: throwing a moon jar"], ["Book a wheel class in Portland"]],
      },
    },
    {
      slug: "socalfoodie",
      page: {
        displayName: "SoCal Foodie", bio: "Honest food reviews · IE / SGV / OC. 159K views in 30 days.", avatar: L.portrait("SoCal Foodie"),
        theme: { preset: "lavender", font: "rounded", buttonShape: "rounded", buttonFill: "solid" },
        socials: [{ platform: "tiktok", url: "x" }, { platform: "instagram", url: "x" }, { platform: "youtube", url: "x" }],
        links: [["Collabs: DM or email"], ["118K views on a collab video"], ["Package 1 · Review reel · $150"], ["Package 2 · Food showcase reel · $100"], ["Package 3 · Photos + review · $50"]],
      },
    },
    {
      slug: "kai.after.dark",
      page: {
        displayName: "Kai Okafor", bio: "House & disco. Friday residency at Lowlight.", avatar: L.portrait("Kai Okafor"),
        theme: { preset: "midnight", font: "sans", buttonShape: "pill", buttonFill: "outline" },
        socials: [{ platform: "instagram", url: "x" }, { platform: "youtube", url: "x" }],
        links: [["New mix: Lowlight Sessions 07"], ["Tickets — Friday at Lowlight"], ["Booking inquiries"]],
      },
    },
  ].map((d) => ({ ...d, page: { ...d.page, links: d.page.links.map(([title], i) => ({ id: `${d.slug}-${i}`, title, visible: true })) } }));

  const CONTACT = "hello@linkee.bio";
  const FAQ = [
    ["get", "How do I get my page?", `<a href="#/signup">Create your page</a> with your email — pick a username and it's live right away. Or message us on <a href="https://instagram.com/linkee.bio" target="_blank" rel="noopener">Instagram</a> and we'll help you set it up.`],
    ["who", "Who is Linkee.bio for?", "Creators and small businesses who sell, book or share from Instagram. Your page is free. Pro ($12/month) adds AI reply drafts for your Instagram comments and posting to Instagram and Facebook at once."],
    ["edit", "Can I change my page after it's published?", "Anytime. Tap anything on your page to edit it, then press Publish — your link never changes."],
    ["delete", "How do I delete my data?", `Disconnect Instagram or Facebook in Settings to remove their posts and comments from Linkee right away. To delete your whole account, email <a href="mailto:${CONTACT}">${CONTACT}</a> from your account email — everything is gone within 30 days. <a href="#/data-deletion">Full details</a>.`],
  ];
  const FOOT_LINKS = [["Contact", `mailto:${CONTACT}`], ["Terms", "#/terms"], ["Privacy", "#/privacy"], ["Delete your data", "#/data-deletion"], ["Instagram", "https://instagram.com/linkee.bio"]];

  L.mktNav = (s) => `<header class="lk-mkt-nav" data-mkt-nav><div class="lk-mkt-nav__inner">
    <a class="lk-logo" href="#/" aria-label="Linkee home"><span class="lk-logo__mark">L</span>Linkee.bio</a>
    ${s.signedIn ? L.linkBtn("#/app/page", { label: "Dashboard", variant: "primary", size: "sm", cls: "lk-mkt-nav__cta" }) : L.linkBtn("#/login", { label: "Log in", variant: "primary", size: "sm", cls: "lk-mkt-nav__cta" })}
  </div></header>`;
  L.mktFooter = () => `<footer class="lk-footer"><div class="lk-footer__inner">
    <a class="lk-logo" href="#/"><span class="lk-logo__mark">L</span>Linkee.bio</a>
    <nav class="lk-footer__links" aria-label="Footer">${FOOT_LINKS.map(([t, h]) => `<a href="${h}"${h.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${t}</a>`).join("")}</nav>
    <span>© 2026 Linkee.bio</span>
  </div></footer>`;

  L.views.landing = {
    title: "Linkee.bio — one link. All of you.",
    render(s) {
      const demos = DEMOS();
      return `<div class="lk-view lk-mktpage">
      ${L.mktNav(s)}
      <main id="main" class="lk-mkt">
        <section class="lk-hero">
          <div class="lk-hero__copy">
            <h1 class="lk-hero__title">One link.<br>All of you.</h1>
            ${L.linkBtn(s.signedIn ? "#/app/page" : "#/signup", { label: "Go to your page", variant: "primary", size: "lg", iconRight: "arrow-right", cls: "lk-hero__cta" })}
          </div>
          <div class="lk-stage" data-stage aria-roledescription="carousel" aria-label="Pages made with Linkee">
            <div class="lk-stage__url" aria-live="polite"><i aria-hidden="true"></i>linkee.bio/<b data-stage-url>${demos[0].slug}</b><span class="lk-stage__caret" aria-hidden="true"></span></div>
            <div class="lk-stage__phones">${demos.map((d, i) => `<button type="button" class="lk-stage__phone" data-demo="${i}" data-pos="${i === 0 ? "center" : i === 1 ? "right" : "left"}" aria-label="Show linkee.bio/${d.slug}" tabindex="-1">${L.phone(L.bioHTML(d.page, { mode: "preview" }), "lk-phone--sm")}</button>`).join("")}</div>
            <div class="lk-stage__dots" role="tablist" aria-label="Choose an example">${demos.map((d, i) => `<button type="button" role="tab" class="lk-stage__dot" data-demo="${i}" aria-selected="${i === 0}" aria-label="linkee.bio/${d.slug}"></button>`).join("")}</div>
          </div>
        </section>
        <section class="lk-faq" aria-labelledby="faq-title">
          <h2 class="lk-faq__title" id="faq-title">Questions, answered.</h2>
          ${FAQ.map(([id, q, a], i) => `<details class="lk-faq__item" data-faq="${id}"${i === 0 ? " open" : ""}><summary>${q}<span class="lk-faq__icon" aria-hidden="true">${icon("plus")}</span></summary><p>${a}</p></details>`).join("")}
        </section>
      </main>
      ${L.mktFooter()}
      </div>`;
    },
    mount(root) {
      const nav = L.$("[data-mkt-nav]", root);
      const onScroll = () => (nav.dataset.scrolled = scrollY > 8);
      addEventListener("scroll", onScroll, { passive: true });
      L.onLeave(() => removeEventListener("scroll", onScroll));

      // Example pages: the centre one is "live"; the dots (or a side phone) bring another forward.
      const stage = L.$("[data-stage]", root);
      const demos = DEMOS();
      const urlEl = L.$("[data-stage-url]", stage);
      const phones = L.$$(".lk-stage__phone", stage), dots = L.$$(".lk-stage__dot", stage);
      const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
      let cur = 0, typing = 0, timer = 0, paused = false;
      const typeSlug = (slug) => {
        clearInterval(typing);
        if (still) return void (urlEl.textContent = slug);
        let n = 0;
        urlEl.textContent = "";
        typing = setInterval(() => { urlEl.textContent = slug.slice(0, ++n); if (n >= slug.length) clearInterval(typing); }, 55);
      };
      const show = (i) => {
        cur = (i + demos.length) % demos.length;
        phones.forEach((p, k) => { const d = (k - cur + demos.length) % demos.length; p.dataset.pos = d === 0 ? "center" : d === 1 ? "right" : "left"; });
        dots.forEach((d, k) => d.setAttribute("aria-selected", String(k === cur)));
        typeSlug(demos[cur].slug);
      };
      const tick = () => { clearInterval(timer); if (!still) timer = setInterval(() => { if (!paused && !document.hidden) show(cur + 1); }, 4500); };
      stage.addEventListener("click", (e) => {
        const b = e.target.closest("[data-demo]");
        if (!b) return;
        e.preventDefault();
        show(+b.dataset.demo);
        tick();
      });
      stage.addEventListener("pointerenter", () => (paused = true));
      stage.addEventListener("pointerleave", () => (paused = false));
      stage.addEventListener("focusin", () => (paused = true));
      stage.addEventListener("focusout", () => (paused = false));
      tick();
      L.onLeave(() => { clearInterval(timer); clearInterval(typing); });
    },
  };

  // ── Terms, Privacy, Data deletion (short, plain pages linked from the footer) ──
  const LEGAL = {
    terms: ["Terms", [
      ["Your page", "You own what you put on your page. Don't use Linkee for anything illegal, deceptive or harmful; we may remove pages that do."],
      ["Your accounts", "When you connect Instagram or Facebook, Linkee acts only on what you ask: reading comments on your posts, posting the replies you send and publishing the posts you create."],
      ["Plans", "Free stays free. Pro is billed monthly and you can cancel anytime; it runs until the end of the period you paid for."],
    ]],
    privacy: ["Privacy", [
      ["What we collect", "Your name, email and page content. If you connect Instagram or Facebook: your account name, your recent posts and the comments on them."],
      ["How we use it", "To show your page, count link clicks, and let you read and answer comments. AI drafts are written from the comment and your post — nothing is posted without you, unless you turn on auto-reply."],
      ["What we don't do", "We don't sell your data or show ads. Tokens for connected accounts are encrypted."],
    ]],
    "data-deletion": ["Delete your data", [
      ["Connected accounts", "Settings → Connected accounts → Disconnect removes that account's posts and comments from Linkee right away and revokes our access."],
      ["Your whole account", `Email <a href="mailto:${CONTACT}">${CONTACT}</a> from your account email. We delete your page, links, comments and connected accounts within 30 days and confirm by email.`],
      ["From Instagram or Facebook", "Removing Linkee under Settings → Apps and websites on Instagram or Facebook sends us a deletion request; we handle it the same way."],
    ]],
  };
  L.views.legal = {
    render(s, q, doc) {
      const [title, parts] = LEGAL[doc];
      document.title = `${title} — Linkee.bio`;
      return `<div class="lk-view lk-mktpage">${L.mktNav(s)}
        <main id="main" class="lk-mkt lk-legal"><h1 class="lk-legal__title">${title}</h1>
          ${parts.map(([h, p]) => `<section><h2>${h}</h2><p>${p}</p></section>`).join("")}
          <p class="lk-muted lk-xs">Last updated November 4, 2026 · Questions? <a href="mailto:${CONTACT}">${CONTACT}</a></p>
        </main>${L.mktFooter()}</div>`;
    },
  };
  L.LEGAL_DOCS = Object.keys(LEGAL);

  // ── Auth shell ────────────────────────────────────────────────────────────
  const authShell = (inner, foot) => `<div class="lk-view lk-auth">
    <div class="lk-auth__top"><a class="lk-logo" href="#/"><span class="lk-logo__mark">L</span>Linkee</a></div>
    <main id="main" class="lk-auth__body">${inner}</main>
    <div class="lk-auth__foot">${foot}</div></div>`;
  const pwField = (id, label, autocomplete, withHint, value = "") => `<div class="lk-field" data-field="${id}"><label class="label" for="${id}">${label}</label>
    <div class="lk-pw"><input class="input input--secondary" type="password" id="${id}" name="${id}" value="${esc(value)}" autocomplete="${autocomplete}" ${withHint ? 'aria-describedby="pw-desc"' : ""}>${btn({ label: "Show password", iconOnly: true, icon: "eye", variant: "ghost", size: "sm", cls: "lk-pw__toggle", attrs: { "data-pw-toggle": id } })}</div>
    <div class="lk-field__meta">${withHint ? '<span class="description" id="pw-desc">At least 8 characters.</span>' : ""}</div></div>`;
  function wirePw(root) {
    L.$$("[data-pw-toggle]", root).forEach((b) => b.addEventListener("click", () => {
      const inp = L.$("#" + b.dataset.pwToggle, root);
      const show = inp.type === "password";
      inp.type = show ? "text" : "password";
      b.innerHTML = icon(show ? "eye-slash" : "eye");
      b.setAttribute("aria-label", show ? "Hide password" : "Show password");
    }));
  }

  L.views.signup = {
    title: "Create your page — Linkee",
    render(s, q) {
      return authShell(`<form class="lk-auth__card" novalidate data-form>
        <div><h1 class="lk-h1">Create your page</h1><p class="lk-sub">Free forever. Takes about a minute.</p></div>
        <div class="lk-stack">
          ${L.field({ id: "slug", label: "Username", value: q.get("u") || (L.prefill ? L.SAMPLES.signup.slug : ""), prefix: "linkee.bio/", placeholder: "yourname", autocomplete: "username", attrs: { autocapitalize: "none", spellcheck: "false" } })}
          ${L.field({ id: "name", label: "Name", value: L.prefill ? L.SAMPLES.signup.name : "", placeholder: "Maya Rivers", autocomplete: "name" })}
          ${L.field({ id: "email", label: "Email", type: "email", value: L.prefill ? L.SAMPLES.signup.email : "", placeholder: "you@example.com", autocomplete: "email" })}
          ${pwField("password", "Password", "new-password", true, L.prefill ? L.SAMPLES.signup.password : "")}
        </div>
        ${btn({ label: "Create my page", variant: "primary", size: "lg", full: true, type: "submit" })}
        <p class="lk-xs lk-muted" style="margin:0;text-align:center">By continuing you agree to the Terms and Privacy Policy.</p>
      </form>`, `Already have an account? <a href="#/login">Log in</a>`);
    },
    mount(root) {
      wirePw(root);
      const form = L.$("[data-form]", root);
      const slug = L.$("#slug", root), pw = L.$("#password", root);
      const checkSlug = () => {
        const r = L.checkSlug(slug.value);
        if (!slug.value) return L.setFieldError(root, "slug", null), r;
        L.setFieldError(root, "slug", r.error, r.ok ? `<span style="color:var(--success-soft-foreground);display:inline-flex;gap:4px;align-items:center">${icon("circle-check")}${esc(r.ok)}</span>` : null);
        if (r.suggest) L.$('[data-field="slug"] .field-error', root).insertAdjacentHTML("beforeend", ` · <button type="button" class="lk-textlink" data-suggest="${esc(r.suggest)}">Try ${esc(r.suggest)}</button>`);
        return r;
      };
      root.addEventListener("click", (e) => { const b = e.target.closest("[data-suggest]"); if (b) { slug.value = b.dataset.suggest; checkSlug(); slug.focus(); } });
      slug.addEventListener("input", () => { slug.value = slug.value.toLowerCase().replace(/\s/g, ""); checkSlug(); });
      pw.addEventListener("input", () => { if (pw.value.length >= 8) L.setFieldError(root, "password", null, "At least 8 characters."); });
      if (slug.value) checkSlug();
      // With sample data in place, focus the primary action; otherwise the first empty field.
      setTimeout(() => (L.$("#name", root).value ? L.$('[type="submit"]', form) : slug.value ? L.$("#name", root) : slug).focus(), 50);
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const v = Object.fromEntries(new FormData(form));
        const errs = {};
        const sr = L.checkSlug(v.slug || "");
        if (sr.error) errs.slug = sr.error;
        if (!v.name.trim()) errs.name = "Add your name";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) errs.email = v.email ? "That email doesn't look right" : "Add your email";
        if ((v.password || "").length < 8) errs.password = "Use at least 8 characters";
        ["name", "email", "password"].forEach((k) => L.setFieldError(root, k, errs[k], k === "password" && !errs[k] ? "At least 8 characters." : null));
        checkSlug();
        const first = Object.keys(errs)[0];
        if (first) return L.$("#" + first, root).focus();
        const submit = L.$('[type="submit"]', form);
        const taken = v.email.toLowerCase() === "maya@mayarivers.studio";
        await L.pending(submit, "Creating your page…", () => L.sleep(900));
        if (taken) {
          L.setFieldError(root, "email", "An account with this email already exists.");
          L.$("#email", root).focus();
          L.toast("You already have an account", { description: "Log in instead — your page is waiting.", tone: "warning", action: { label: "Log in", onClick: () => L.go("#/login") } });
          return;
        }
        L.state = L.makeState("new");
        Object.assign(L.state.user, { name: v.name.trim(), email: v.email, slug: v.slug.trim().toLowerCase() });
        L.state.page.displayName = v.name.trim();
        L.state.saved = L.clone(L.state.page);
        L.state.signedIn = true;
        L.go("#/welcome");
      });
    },
  };

  L.views.login = {
    title: "Log in — Linkee",
    render() {
      return authShell(`<form class="lk-auth__card" novalidate data-form>
        <div><h1 class="lk-h1">Welcome back</h1><p class="lk-sub">Log in to edit your page and answer comments.</p></div>
        <div data-form-error></div>
        <div class="lk-stack">
          ${L.field({ id: "email", label: "Email", type: "email", value: L.SAMPLES.login.email, autocomplete: "email" })}
          ${pwField("password", "Password", "current-password", false, L.prefill ? L.SAMPLES.login.password : "")}
        </div>
        ${btn({ label: "Log in", variant: "primary", size: "lg", full: true, type: "submit" })}
      </form>`, `New to Linkee? <a href="#/signup">Create your page</a>`);
    },
    mount(root) {
      wirePw(root);
      const form = L.$("[data-form]", root);
      setTimeout(() => L.$("#password", root).focus(), 50);
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const v = Object.fromEntries(new FormData(form));
        const box = L.$("[data-form-error]", root);
        box.innerHTML = "";
        if (!v.email || !v.password) {
          L.setFieldError(root, "email", v.email ? null : "Add your email");
          L.setFieldError(root, "password", v.password ? null : "Add your password");
          return L.$(v.email ? "#password" : "#email", root).focus();
        }
        L.setFieldError(root, "email", null); L.setFieldError(root, "password", null);
        await L.pending(L.$('[type="submit"]', form), "Logging in…", () => L.sleep(700));
        if (v.password.toLowerCase() === "wrong") {
          box.innerHTML = L.alert({ tone: "danger", title: "That email and password don't match.", description: "Check for typos and try again." });
          L.$("#password", root).select();
          return;
        }
        const keep = L.state.sim;
        L.state = L.makeState("maya");
        L.state.sim = keep;
        L.go("#/app/page");
        L.toast("Welcome back, Maya", { description: "3 new comments since your last visit.", tone: "default" });
      });
    },
  };

  // ── Onboarding ────────────────────────────────────────────────────────────
  let step = 1;
  L.views.welcome = {
    title: "Set up your page — Linkee",
    guard: "auth",
    enter(s) {
      step = 1;
      // Prefill: a first link is ready, so both steps can be clicked through.
      if (L.prefill && s && !s.page.links.length) {
        const o = L.SAMPLES.onboarding;
        s.page.links = [{ id: "first", title: o.title, url: o.url, visible: true, clicks: 0 }];
      }
    },
    // Two steps: the look, then the first link. Photo and bio are added later right on the page,
    // whose empty spots say what to do. Finishing lands on My Page with "Your page is live".
    render(s) {
      const p = s.page;
      const bar = [1, 2].map((i) => `<span data-state="${i <= step ? "done" : "todo"}"></span>`).join("");
      const body = step === 1
        ? `<div><span class="lk-eyebrow">Step 1 of 2</span><h1 class="lk-h1" style="margin-top:6px">Pick a look</h1><p class="lk-sub">You can change it anytime.</p></div>
          ${themePicker(p.theme.preset)}
          <div class="lk-field"><span class="label">Font</span>${L.seg("font", L.FONTS, p.theme.font, { label: "Font", full: true })}</div>`
        : `<div><span class="lk-eyebrow">Step 2 of 2</span><h1 class="lk-h1" style="margin-top:6px">Add your first link</h1><p class="lk-sub">Your shop, latest video or newsletter.</p></div>
          ${L.field({ id: "url", label: "URL", placeholder: "yourwebsite.com/shop", value: p.links[0]?.url || "", attrs: { inputmode: "url", autocapitalize: "none", spellcheck: "false" } })}
          ${L.field({ id: "title", label: "Title", placeholder: "Shop my latest work", value: p.links[0]?.title || "", max: L.LIMITS.linkTitleMax })}`;
      return `<div class="lk-view lk-onb"><main id="main" class="lk-onb__main"><div class="lk-row lk-row--between"><a class="lk-logo" href="#/"><span class="lk-logo__mark">L</span>Linkee</a>${btn({ label: "Skip for now", variant: "ghost", size: "sm", action: "skip" })}</div>
        <div class="lk-onb__progress" aria-label="Step ${step} of 2">${bar}</div>
        <form class="lk-onb__form" novalidate data-form>${body}
        <div class="lk-onb__actions">${step > 1 ? btn({ label: "Back", variant: "ghost", action: "back", icon: "arrow-left" }) : ""}<span class="lk-grow"></span>${btn({ label: step === 2 ? "Finish" : "Continue", variant: "primary", type: "submit", iconRight: step === 2 ? null : "arrow-right" })}</div></form>
      </main><aside class="lk-onb__aside" aria-label="Live preview">${L.phone(L.bioHTML(p))}</aside></div>`;
    },
    mount(root, s) {
      const p = s.page;
      const refresh = () => { const scr = L.$("[data-phone-screen]", root); if (scr) scr.innerHTML = L.bioHTML(p); };
      root.addEventListener("input", (e) => {
        const t = e.target;
        if (t.id !== "url" && t.id !== "title") return;
        const url = L.$("#url", root).value, titleEl = L.$("#title", root);
        if (t.id === "url" && !titleEl.dataset.touched) { const n = L.normalizeUrl(url); titleEl.value = n.url ? L.titleFromUrl(n.url) : ""; }
        if (t.id === "title") titleEl.dataset.touched = "1";
        if (t.id === "url") L.setFieldError(root, "url", null);
        L.updateCount(root, "title", titleEl.value.length, L.LIMITS.linkTitleMax);
        p.links = url.trim() ? [{ id: "first", title: titleEl.value || "My link", url, visible: true, clicks: 0 }] : [];
        refresh();
      });
      L.wireSeg(root, (name, v) => { p.theme[name] = v; refresh(); });
      root.addEventListener("click", (e) => {
        const th = e.target.closest("[data-theme]");
        if (th) { p.theme.preset = th.dataset.theme; L.$$("[data-theme]", root).forEach((x) => x.setAttribute("aria-checked", x === th)); refresh(); return; }
        const a = e.target.closest("[data-action]")?.dataset.action;
        if (a === "back") { step--; L.render(); }
        // Skipping keeps the look you picked; a link you didn't confirm isn't published.
        if (a === "skip") finish(s, { keepLink: false });
      });
      L.$("[data-form]", root).addEventListener("submit", (e) => {
        e.preventDefault();
        if (step === 1) { step = 2; return L.render(); }
        const url = L.$("#url", root).value, title = L.$("#title", root).value.trim();
        if (url.trim()) {
          const n = L.normalizeUrl(url);
          if (n.error) { L.setFieldError(root, "url", n.error); return L.$("#url", root).focus(); }
          p.links = [{ id: "first", title: title || L.titleFromUrl(n.url), url: n.url, visible: true, clicks: 0 }];
        } else p.links = [];
        finish(s);
      });
      (L.$("#url", root) || L.$('[data-theme][aria-checked="true"]', root))?.focus();
    },
  };
  function finish(s, { keepLink = true } = {}) {
    if (!keepLink) s.page.links = [];
    s.saved = L.clone(s.page);
    s.setup.welcome = true;
    step = 1;
    L.go("#/app/page");
  }
  function themePicker(current) {
    return `<div class="lk-themes" role="radiogroup" aria-label="Theme">${L.THEMES.map((t) => `<button type="button" class="lk-theme" role="radio" aria-checked="${t.id === current}" data-theme="${t.id}"><span class="lk-theme__swatch" style="background:${t.background}"><b style="background:${t.text}"></b><i style="background:${t.text}"></i><i style="background:${t.accent}"></i><i style="background:${t.accent}"></i><i style="background:${t.accent}"></i></span>${t.label}</button>`).join("")}</div>`;
  }
  L.themePicker = themePicker;
  L.portrait = (name) => {
    const c = L.colorFor(name || "x");
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#e9e2d7"/><circle cx="100" cy="86" r="34" fill="#e2bf9c"/><path d="M64 80c2-26 22-40 40-38s34 14 34 36c-12-10-24-14-38-14s-26 6-36 16z" fill="#3f2f26"/><path d="M38 200c6-44 32-66 62-66s56 22 62 66z" fill="${c}"/></svg>`);
  };

  // ── Public page + not found ───────────────────────────────────────────────
  L.views.public = {
    render(s, q, slug) {
      const own = s.user.slug && slug === s.user.slug;
      const hidden = own && s.user.published === false;
      if (hidden && !s.signedIn)
        return `<div class="lk-view lk-notfound"><main id="main" class="lk-empty"><div class="lk-empty__icon">${icon("eye-slash", "lk-icon--lg")}</div><h1 class="lk-h2">This page isn't available</h1><p>Check the link and try again.</p>${L.linkBtn("#/", { label: "Go to Linkee", variant: "tertiary" })}</main></div>`;
      if (!own) {
        const r = L.checkSlug(slug);
        const free = !r.error;
        return `<div class="lk-view lk-notfound"><main id="main" class="lk-empty"><div class="lk-empty__icon">${icon("link", "lk-icon--lg")}</div>
          <h1 class="lk-h2">${free ? `linkee.bio/${esc(slug)} isn't taken yet` : "This page isn't available"}</h1>
          <p>${free ? "It could be yours. Claim it in a minute — it's free." : "Check the link and try again."}</p>
          ${free ? L.linkBtn(`#/signup?u=${encodeURIComponent(slug)}`, { label: `Claim linkee.bio/${slug}`, variant: "primary" }) : L.linkBtn("#/", { label: "Go to Linkee", variant: "tertiary" })}</main></div>`;
      }
      document.title = `${s.page.displayName || s.user.slug} | Linkee`;
      return `<div class="lk-view lk-public"><main id="main">${L.bioHTML(s.saved, { mode: "public" })}</main>
        ${s.signedIn ? `<div style="position:fixed;top:12px;right:12px;z-index:5;display:flex;gap:8px;align-items:center">${hidden ? L.chip("Hidden — only you can see this", "warning", { icon: "eye-slash" }) : ""}${L.linkBtn("#/app/page", { label: "Edit page", icon: "pencil", variant: "tertiary", size: "sm" })}</div>` : ""}</div>`;
    },
    mount(root, s) {
      root.addEventListener("click", (e) => {
        const l = e.target.closest("[data-bio-link]");
        if (l) {
          e.preventDefault();
          const link = s.page.links.find((x) => x.id === l.dataset.bioLink);
          if (!link) return;
          const before = link.clicks;
          link.clicks++;
          const sv = s.saved.links.find((x) => x.id === link.id);
          if (sv) sv.clicks = link.clicks;
          L.redirectViewer({ link, slug: s.user.slug, before });
        }
        const so = e.target.closest("[data-bio-social]");
        if (so) {
          e.preventDefault();
          const entry = s.saved.socials.find((x) => x.platform === so.dataset.bioSocial);
          L.toast(`Opens ${entry ? entry.url : "the profile"}`, { description: "Social icons link straight out — they aren't counted as link clicks.", duration: 3000 });
        }
      });
    },
  };
})();
