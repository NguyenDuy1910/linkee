/* Public views: landing, sign up, log in, onboarding (welcome), public bio page, not found. */
(function () {
  const L = window.L;
  const { esc, icon, btn } = L;
  L.views = L.views || {};

  // ── Landing ───────────────────────────────────────────────────────────────
  const DEMO = () => ({
    displayName: "Maya Rivers",
    bio: "Ceramics, slow mornings & studio notes. New pieces every first Friday.",
    avatar: L.AVATAR_MAYA,
    theme: { preset: "sand", font: "serif", buttonShape: "pill", buttonFill: "solid" },
    socials: [{ platform: "instagram", url: "x" }, { platform: "tiktok", url: "x" }, { platform: "youtube", url: "x" }, { platform: "email", url: "x" }],
    links: [
      { id: "d1", title: "Shop the spring collection", visible: true },
      { id: "d2", title: "Studio notes — monthly newsletter", visible: true },
      { id: "d3", title: "Watch: throwing a moon jar", visible: true },
      { id: "d4", title: "Book a wheel class in Portland", visible: true },
    ],
  });

  const claimForm = (id, value = "") => `
    <form class="lk-claim" data-claim novalidate>
      <label class="lk-claim__field" for="${id}"><span class="lk-claim__prefix">linkee.bio/</span><input class="lk-claim__input" id="${id}" name="slug" value="${esc(value)}" placeholder="yourname" autocomplete="off" autocapitalize="none" spellcheck="false" aria-describedby="${id}-hint"></label>
      ${btn({ label: "Claim your page", variant: "primary", size: "lg", type: "submit", iconRight: "arrow-right" })}
    </form>
    <div class="lk-claim__hint" id="${id}-hint" aria-live="polite">Free forever. No credit card.</div>`;

  const featureArt = {
    page: () => `<div class="lk-row" style="gap:8px;justify-content:center">${["sand", "midnight", "lavender", "forest"].map((p) => { const t = L.THEMES.find((x) => x.id === p); return `<div class="lk-theme__swatch" style="width:58px;background:${t.background};padding:12px 8px 10px"><b style="background:${t.text}"></b><i style="background:${t.text}"></i><i style="background:${t.accent}"></i><i style="background:${t.accent}"></i></div>`; }).join("")}</div>`,
    inbox: () => `<div class="lk-row" style="align-items:flex-start;gap:10px">${L.avatar("hannah.makes", { size: 26 })}<div class="lk-small"><strong>hannah.makes</strong> Is the moon jar still available??</div></div>
      <div style="margin-left:36px;padding:8px 10px;border-radius:10px;background:var(--accent-soft);font-size:12px;line-height:1.45"><span class="lk-ai-note" style="margin-bottom:2px">${icon("sparkles")} Suggested reply</span><div>It is! It goes live in Friday's drop at 10am PT 🤍</div></div>`,
    post: () => `<div class="lk-row" style="gap:12px"><img class="lk-thumb" src="${L.art("plates")}" width="56" height="56" alt=""><div class="lk-stack lk-stack--sm" style="flex:1">
      <div class="lk-row lk-small">${L.netLogo("INSTAGRAM", 16).replace("lk-dest__net", "lk-dest__net lk-static")} Instagram <span style="margin-left:auto">${L.chip("Published", "success", { dot: true })}</span></div>
      <div class="lk-row lk-small">${L.netLogo("FACEBOOK", 16).replace("lk-dest__net", "lk-dest__net lk-static")} Facebook Page <span style="margin-left:auto">${L.chip("Published", "success", { dot: true })}</span></div></div></div>`,
  };

  L.views.landing = {
    title: "Linkee — one link for everything you make",
    render(s) {
      const cta = s.signedIn ? L.linkBtn("#/app/page", { label: "Open Linkee", variant: "primary", size: "sm" }) : `${L.linkBtn("#/login", { label: "Log in", variant: "ghost", size: "sm" })}${L.linkBtn("#/signup", { label: "Get started", variant: "primary", size: "sm" })}`;
      return `<div class="lk-view">
      <header class="lk-mkt-nav" data-mkt-nav><div class="lk-mkt-nav__inner">
        <a class="lk-logo" href="#/" aria-label="Linkee home"><span class="lk-logo__mark">L</span>Linkee</a>
        <nav class="lk-mkt-nav__links" aria-label="Sections"><a href="#features" data-scroll>Features</a><a href="#how" data-scroll>How it works</a><a href="#pricing" data-scroll>Pricing</a></nav>
        <div class="lk-row" style="margin-left:auto">${cta}</div>
      </div></header>
      <main id="main" class="lk-mkt">
        <section class="lk-hero">
          <div>
            ${L.chip("New: AI replies for Instagram comments", "accent", { icon: "sparkles" })}
            <h1 class="lk-hero__title">One link for everything you make.</h1>
            <p class="lk-hero__lede">A beautiful link-in-bio page in minutes. Answer Instagram comments with replies you approve, and post to Instagram and Facebook at once.</p>
            ${claimForm("claim-hero", L.prefill ? L.SAMPLES.claim : "")}
          </div>
          <div class="lk-hero__stage" aria-hidden="true">
            ${L.phone(L.bioHTML(DEMO(), { mode: "preview" }))}
            <div class="lk-float lk-float--a">${L.avatar("hannah.makes", { size: 32 })}<div><div style="font-weight:500">hannah.makes</div><div class="lk-muted lk-xs">Is the moon jar still available??</div><div class="lk-ai-note" style="margin-top:4px">${icon("sparkles")} Reply ready to send</div></div></div>
            <div class="lk-float lk-float--b"><div class="lk-float__icon" style="background:var(--success-soft);color:var(--success-soft-foreground)">${icon("circle-check")}</div><div><div style="font-weight:500">Posted everywhere</div><div class="lk-muted lk-xs">Instagram · Facebook Page</div></div></div>
          </div>
        </section>

        <section class="lk-section" id="features">
          <div class="lk-section__head"><span class="lk-eyebrow">What you get</span><h2 class="lk-section__title">Everything your bio link needs. Nothing it doesn't.</h2></div>
          <div class="lk-features">
            ${[["page", "A page that looks like you", "Add your links, pick one of six themes, and fine-tune fonts and buttons. See every change live as you make it."],
               ["inbox", "Every comment in one calm inbox", "Comments from your Instagram posts land in one list. Ask AI for a reply in your tone, edit it, and send. Nothing is sent without you."],
               ["post", "Post once, everywhere", "Write one caption, add photos or a video, and publish to Instagram and your Facebook Pages together. If one fails, retry just that one."]]
              .map(([k, t, d]) => `<article class="card lk-card lk-feature"><div class="lk-feature__art" aria-hidden="true">${featureArt[k]()}</div><h3>${t}</h3><p>${d}</p></article>`).join("")}
          </div>
        </section>

        <section class="lk-section" id="how">
          <div class="lk-section__head"><span class="lk-eyebrow">How it works</span><h2 class="lk-section__title">Live in about a minute.</h2></div>
          <div class="lk-steps">
            <div class="lk-step"><h3>Claim your username</h3><p>Sign up with one short form. Your page is live right away at linkee.bio/you.</p></div>
            <div class="lk-step"><h3>Make it yours</h3><p>Add links, pick a theme, and connect Instagram or a Facebook Page when you're ready.</p></div>
            <div class="lk-step"><h3>Share and grow</h3><p>Put the link in your bio, answer comments faster, and post everywhere from one place.</p></div>
          </div>
        </section>

        <section class="lk-section" id="pricing">
          <div class="lk-section__head"><span class="lk-eyebrow">Pricing</span><h2 class="lk-section__title">Start free. Upgrade when you're busy.</h2></div>
          <div class="lk-pricing">
            <article class="card lk-card lk-plan">
              <div><div class="lk-h3">Free</div><p class="lk-sub">Your page, forever.</p></div>
              <div class="lk-plan__price">$0</div>
              <ul>${["Link-in-bio page with 6 themes", "Unlimited links and social icons", "Click counts on every link", "Instagram comment inbox"].map((f) => `<li>${icon("check")}${f}</li>`).join("")}</ul>
              ${L.linkBtn("#/signup", { label: "Create your page", variant: "tertiary", full: true })}
            </article>
            <article class="card lk-card lk-plan lk-plan--pro">
              <div class="lk-row lk-row--between"><div><div class="lk-h3">Pro</div><p class="lk-sub">For creators who post every week.</p></div>${L.chip("Most popular", "accent")}</div>
              <div class="lk-plan__price">$12<small> / month</small></div>
              <ul>${["Everything in Free", "AI reply suggestions (200 a day)", "Careful auto-reply, off until you turn it on", "Post to Instagram and Facebook at once", "Up to 10 connected accounts"].map((f) => `<li>${icon("check")}${f}</li>`).join("")}</ul>
              ${L.linkBtn("#/signup", { label: "Start free, upgrade anytime", variant: "primary", full: true })}
            </article>
          </div>
        </section>

        <section class="lk-cta-band">
          <h2 class="lk-section__title" style="margin:0 auto;max-width:560px">Your page is one minute away.</h2>
          <div style="display:flex;flex-direction:column;align-items:center;margin-top:8px">${claimForm("claim-foot")}</div>
        </section>
      </main>
      <footer class="lk-mkt lk-footer"><div class="lk-row lk-row--between lk-row--wrap"><a class="lk-logo" href="#/" style="font-size:15px"><span class="lk-logo__mark" style="width:22px;height:22px;font-size:12px">L</span>Linkee</a><span>© 2026 Linkee. Made for creators.</span></div></footer>
      </div>`;
    },
    mount(root) {
      const nav = L.$("[data-mkt-nav]", root);
      const onScroll = () => (nav.dataset.scrolled = scrollY > 8);
      addEventListener("scroll", onScroll, { passive: true });
      L.onLeave(() => removeEventListener("scroll", onScroll));
      L.$$("[data-scroll]", root).forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); L.$(a.getAttribute("href"), root).scrollIntoView({ behavior: "smooth" }); }));
      L.$$("[data-claim]", root).forEach((form) => {
        const input = L.$("input", form);
        const hint = L.$(`#${input.id}-hint`, root);
        const check = () => {
          const v = input.value.trim().toLowerCase();
          if (!v) { hint.textContent = "Free forever. No credit card."; delete hint.dataset.tone; return null; }
          const r = L.checkSlug(v);
          hint.dataset.tone = r.error ? "error" : "ok";
          hint.innerHTML = `${icon(r.error ? "circle-exclamation" : "circle-check")}${esc(r.error || r.ok)}${r.suggest ? ` · <button type="button" class="lk-textlink" data-suggest="${esc(r.suggest)}">Try ${esc(r.suggest)}</button>` : ""}`;
          return r;
        };
        input.addEventListener("input", () => { input.value = input.value.toLowerCase().replace(/\s/g, ""); check(); });
        hint.addEventListener("click", (e) => { const s = e.target.closest("[data-suggest]"); if (s) { input.value = s.dataset.suggest; check(); input.focus(); } });
        if (input.value) check();
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const r = check();
          if (!r) { input.focus(); hint.dataset.tone = "error"; hint.innerHTML = `${icon("circle-exclamation")}Type the username you'd like`; return; }
          if (r.error) { input.focus(); return; }
          L.go(`#/signup?u=${encodeURIComponent(input.value.trim())}`);
        });
      });
    },
  };

  // ── Auth shell ────────────────────────────────────────────────────────────
  const authShell = (inner, foot) => `<div class="lk-view lk-auth">
    <div class="lk-auth__top"><a class="lk-logo" href="#/"><span class="lk-logo__mark">L</span>Linkee</a></div>
    <main id="main" class="lk-auth__body">${inner}</main>
    <div class="lk-auth__foot">${foot}</div></div>`;
  const pwField = (id, label, autocomplete, withMeter, value = "") => `<div class="lk-field" data-field="${id}"><div class="lk-row lk-row--between"><label class="label" for="${id}">${label}</label></div>
    <div class="lk-pw"><input class="input input--secondary" type="password" id="${id}" name="${id}" value="${esc(value)}" autocomplete="${autocomplete}" ${withMeter ? 'aria-describedby="pw-desc"' : ""}>${btn({ label: "Show password", iconOnly: true, icon: "eye", variant: "ghost", size: "sm", cls: "lk-pw__toggle", attrs: { "data-pw-toggle": id } })}</div>
    ${withMeter ? '<div class="lk-strength" data-level="0" aria-hidden="true"><span></span><span></span><span></span><span></span></div>' : ""}
    <div class="lk-field__meta">${withMeter ? '<span class="description" id="pw-desc">At least 8 characters.</span>' : ""}</div></div>`;
  function wirePw(root) {
    L.$$("[data-pw-toggle]", root).forEach((b) => b.addEventListener("click", () => {
      const inp = L.$("#" + b.dataset.pwToggle, root);
      const show = inp.type === "password";
      inp.type = show ? "text" : "password";
      b.innerHTML = icon(show ? "eye-slash" : "eye");
      b.setAttribute("aria-label", show ? "Hide password" : "Show password");
    }));
  }
  const strength = (pw) => (pw.length === 0 ? 0 : pw.length < 8 ? 1 : 1 + [/[A-Z]/.test(pw) || /[^a-zA-Z0-9]/.test(pw), /\d/.test(pw), pw.length >= 12].filter(Boolean).length);

  L.views.signup = {
    title: "Create your page — Linkee",
    render(s, q) {
      return authShell(`<form class="card lk-card lk-auth__card" novalidate data-form>
        <div><h1 class="lk-h1">Create your page</h1><p class="lk-sub">Free forever. Takes about a minute.</p></div>
        <div class="lk-stack">
          ${L.field({ id: "slug", label: "Username", value: q.get("u") || (L.prefill ? L.SAMPLES.signup.slug : ""), prefix: "linkee.bio/", placeholder: "yourname", autocomplete: "username", attrs: { autocapitalize: "none", spellcheck: "false" }, description: "This is your page address. You can change it later." })}
          ${L.field({ id: "name", label: "Name", value: L.prefill ? L.SAMPLES.signup.name : "", placeholder: "Maya Rivers", autocomplete: "name", description: "Shown at the top of your page." })}
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
        if (!slug.value) return L.setFieldError(root, "slug", null, "This is your page address. You can change it later."), r;
        L.setFieldError(root, "slug", r.error, r.ok ? `<span style="color:var(--success-soft-foreground);display:inline-flex;gap:4px;align-items:center">${icon("circle-check")}${esc(r.ok)}</span>` : null);
        return r;
      };
      slug.addEventListener("input", () => { slug.value = slug.value.toLowerCase().replace(/\s/g, ""); checkSlug(); });
      pw.addEventListener("input", () => { L.$(".lk-strength", root).dataset.level = strength(pw.value); if (pw.value.length >= 8) L.setFieldError(root, "password", null, "Looks good."); });
      if (slug.value) checkSlug();
      if (pw.value) L.$(".lk-strength", root).dataset.level = strength(pw.value);
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
      return authShell(`<form class="card lk-card lk-auth__card" novalidate data-form>
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
      // Prefill: a photo, a bio and a first link are ready, so every step can be clicked through.
      if (L.prefill && s) {
        const p = s.page, o = L.SAMPLES.onboarding;
        if (!p.avatar) p.avatar = L.portrait(p.displayName);
        if (!p.bio) p.bio = o.bio;
        if (!p.links.length) p.links = [{ id: "first", title: o.title, url: o.url, visible: true, clicks: 0 }];
      }
    },
    render(s) {
      const p = s.page;
      const bar = [1, 2, 3].map((i) => `<span data-state="${i < step ? "done" : i === step ? "current" : "todo"}"></span>`).join("");
      let body;
      if (step === 1) body = `<div><span class="lk-eyebrow">Step 1 of 3</span><h1 class="lk-h1" style="margin-top:6px">Introduce yourself</h1><p class="lk-sub">This is the first thing visitors see.</p></div>
        <div class="lk-avatar-picker"><div data-av>${L.avatar(p.displayName || "You", { size: 64, img: p.avatar })}</div><div class="lk-stack lk-stack--sm">${btn({ label: p.avatar ? "Change photo" : "Add photo", icon: "picture", variant: "tertiary", size: "sm", action: "photo" })}<span class="description">Square works best. JPG or PNG.</span></div></div>
        ${L.field({ id: "displayName", label: "Name", value: p.displayName, max: L.LIMITS.nameMax })}
        ${L.field({ id: "bio", label: "Short bio", value: p.bio, multiline: true, max: L.LIMITS.bioMax, placeholder: "What you make, in one line." })}`;
      else if (step === 2) body = `<div><span class="lk-eyebrow">Step 2 of 3</span><h1 class="lk-h1" style="margin-top:6px">Pick a look</h1><p class="lk-sub">You can fine-tune colors and buttons later.</p></div>
        ${themePicker(p.theme.preset)}
        <div class="lk-field"><span class="label">Font</span>${L.seg("font", L.FONTS, p.theme.font, { label: "Font" })}</div>`;
      else if (step === 3) body = `<div><span class="lk-eyebrow">Step 3 of 3</span><h1 class="lk-h1" style="margin-top:6px">Add your first link</h1><p class="lk-sub">Your shop, latest video, newsletter — whatever matters most right now.</p></div>
        ${L.field({ id: "url", label: "Link", placeholder: "yourwebsite.com/shop", prefix: "https://", value: p.links[0]?.url || "", attrs: { inputmode: "url", autocapitalize: "none" } })}
        ${L.field({ id: "title", label: "Title", placeholder: "Shop my latest work", value: p.links[0]?.title || "", max: L.LIMITS.linkTitleMax })}`;
      else body = null;

      if (!body) {
        const url = `linkee.bio/${s.user.slug}`;
        return `<div class="lk-view lk-onb"><main id="main" class="lk-onb__main"><a class="lk-logo" href="#/"><span class="lk-logo__mark">L</span>Linkee</a>
          <div class="lk-success"><div class="lk-success__badge">${icon("circle-check", "lk-icon--xl")}</div>
          <h1 class="lk-h1">Your page is live</h1><p class="lk-sub" style="margin:0">Put this link in your Instagram and TikTok bio so people can find everything you share.</p>
          <div class="lk-copyfield"><span class="lk-grow lk-ellipsis" style="text-align:left">${esc(url)}</span>${btn({ label: "Copy", icon: "copy", variant: "primary", size: "sm", action: "copy" })}</div>
          <div class="lk-row" style="margin-top:8px">${btn({ label: "View my page", icon: "arrow-up-right-from-square", variant: "tertiary", action: "view" })}${btn({ label: "Go to My Page", variant: "primary", action: "finish", iconRight: "arrow-right" })}</div></div></main>
          <aside class="lk-onb__aside" aria-label="Preview">${L.phone(L.bioHTML(p))}</aside></div>`;
      }
      return `<div class="lk-view lk-onb"><main id="main" class="lk-onb__main"><div class="lk-row lk-row--between"><a class="lk-logo" href="#/"><span class="lk-logo__mark">L</span>Linkee</a>${btn({ label: "Skip setup", variant: "ghost", size: "sm", action: "skipall" })}</div>
        <div class="lk-onb__progress" aria-label="Step ${step} of 3">${bar}</div>
        <form class="lk-onb__form" novalidate data-form>${body}
        <div class="lk-onb__actions">${step > 1 ? btn({ label: "Back", variant: "ghost", action: "back", icon: "arrow-left" }) : ""}<span class="lk-grow"></span>${step === 3 ? btn({ label: "Skip for now", variant: "ghost", action: "skip" }) : ""}${btn({ label: step === 3 ? "Finish" : "Continue", variant: "primary", type: "submit", iconRight: step === 3 ? null : "arrow-right" })}</div></form>
      </main><aside class="lk-onb__aside" aria-label="Live preview">${L.phone(L.bioHTML(p))}<div class="lk-editor__caption" style="position:absolute;bottom:24px">${icon("eye")}Live preview</div></aside></div>`;
    },
    mount(root, s) {
      const p = s.page;
      const refresh = () => { const scr = L.$("[data-phone-screen]", root); if (scr) scr.innerHTML = L.bioHTML(p); };
      const rerender = () => { L.render(); };
      root.addEventListener("input", (e) => {
        const t = e.target;
        if (t.id === "displayName") { p.displayName = t.value; L.updateCount(root, t.id, t.value.length, L.LIMITS.nameMax); L.$("[data-av]", root).innerHTML = L.avatar(t.value || "You", { size: 64, img: p.avatar }); }
        if (t.id === "bio") { p.bio = t.value; L.updateCount(root, t.id, t.value.length, L.LIMITS.bioMax); }
        if (t.id === "url" || t.id === "title") {
          const url = L.$("#url", root).value, titleEl = L.$("#title", root);
          if (t.id === "url" && !titleEl.dataset.touched) { const n = L.normalizeUrl(url); titleEl.value = n.url ? L.titleFromUrl(n.url) : ""; }
          if (t.id === "title") titleEl.dataset.touched = "1";
          if (t.id === "url") L.setFieldError(root, "url", null);
          L.updateCount(root, "title", titleEl.value.length, L.LIMITS.linkTitleMax);
          p.links = url.trim() ? [{ id: "first", title: titleEl.value || "My link", url, visible: true, clicks: 0 }] : [];
        }
        refresh();
      });
      L.wireSeg(root, (name, v) => { p.theme[name] = v; refresh(); });
      root.addEventListener("click", async (e) => {
        const th = e.target.closest("[data-theme]");
        if (th) { p.theme.preset = th.dataset.theme; L.$$("[data-theme]", root).forEach((x) => x.setAttribute("aria-checked", x === th)); s.setup.themed = true; refresh(); return; }
        const a = e.target.closest("[data-action]")?.dataset.action;
        if (a === "photo") { p.avatar = L.portrait(p.displayName); rerender(); }
        if (a === "back") { step--; rerender(); }
        if (a === "skip") { p.links = []; step = 4; finishOnboarding(s); rerender(); }
        if (a === "skipall") { finishOnboarding(s); step = 1; L.go("#/app/page"); }
        if (a === "copy") { s.setup.copied = true; L.copy(`https://linkee.bio/${s.user.slug}`); }
        if (a === "view") L.go(`#/${s.user.slug}`);
        if (a === "finish") { step = 1; L.go("#/app/page"); }
      });
      L.$("[data-form]", root)?.addEventListener("submit", (e) => {
        e.preventDefault();
        if (step === 1 && !p.displayName.trim()) { L.setFieldError(root, "displayName", "Add the name you want on your page"); return L.$("#displayName", root).focus(); }
        if (step === 3) {
          const url = L.$("#url", root).value, title = L.$("#title", root).value.trim();
          if (url.trim()) {
            const n = L.normalizeUrl(url);
            if (n.error) { L.setFieldError(root, "url", n.error); return L.$("#url", root).focus(); }
            p.links = [{ id: "first", title: title || L.titleFromUrl(n.url), url: n.url, visible: true, clicks: 0 }];
          } else p.links = [];
        }
        if (step === 3) { finishOnboarding(s); }
        step++;
        rerender();
      });
      L.$("#displayName, #url", root)?.focus();
    },
  };
  function finishOnboarding(s) {
    s.saved = L.clone(s.page);
    s.setup.dismissed = false;
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
