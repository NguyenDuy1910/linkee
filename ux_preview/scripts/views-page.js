/* My Page — the workspace home. Edit links, profile, social icons and look; live preview; explicit save. */
(function () {
  const L = window.L;
  const { esc, icon, btn } = L;

  let ui = { adding: false, editing: null, colorsOpen: false, mobile: "edit", flash: null };
  const dirty = (s) => JSON.stringify(strip(s.page)) !== JSON.stringify(strip(s.saved));
  const strip = (p) => ({ ...p, links: p.links.map((l) => ({ ...l, clicks: 0 })) }); // clicks are server data, not edits

  // ── Setup checklist (only until done or dismissed) ────────────────────────
  function setupItems(s) {
    const t = s.page.theme;
    return [
      { id: "link", title: "Add your first link", desc: "Shop, video, newsletter…", done: s.page.links.length > 0 },
      { id: "look", title: "Choose a look", desc: "Pick a theme and font", done: !!s.setup.themed || t.preset !== "minimal" || t.font !== "sans" },
      { id: "ig", title: "Connect Instagram", desc: "Bring comments to your Inbox", done: s.accounts.some((a) => a.provider === "INSTAGRAM") },
      { id: "share", title: "Share your link", desc: "Copy it into your bio", done: !!s.setup.copied },
    ];
  }
  function setupHTML(s) {
    if (s.setup.dismissed) return "";
    const items = setupItems(s);
    const done = items.filter((i) => i.done).length;
    const all = done === items.length;
    return `<section class="card lk-card lk-setup" data-setup aria-labelledby="setup-title" style="margin-bottom:24px">
      <div class="lk-setup__head"><div class="lk-ring" style="--p:${(done / items.length) * 100}" data-label="${done}/${items.length}" aria-hidden="true"></div>
        <div class="lk-grow"><h2 class="lk-h3" id="setup-title">${all ? "You're all set" : "Finish setting up your page"}</h2><p class="lk-sub" style="margin-top:0">${all ? "Your page is ready to share. Nice work." : "A few quick steps to get the most out of Linkee."}</p></div>
        ${btn({ label: all ? "Done" : "Hide", variant: all ? "primary" : "ghost", size: "sm", action: "setup-hide" })}</div>
      <div class="lk-setup__items">${items.map((i) => `<button type="button" class="lk-setup__item" data-setup-item="${i.id}" data-done="${i.done}"><span class="lk-setup__check">${icon("check")}</span><span><div class="lk-setup__title">${i.title}</div><div class="lk-setup__desc">${i.desc}</div></span></button>`).join("")}</div>
    </section>`;
  }

  // ── Links ─────────────────────────────────────────────────────────────────
  function linksHTML(s) {
    const links = s.page.links;
    const full = links.length >= L.LIMITS.maxLinks;
    const head = `<div class="lk-card__head lk-card__head--pad"><div><h2 class="lk-h3" id="links-title">Links</h2><p class="lk-sub" style="margin-top:2px">${links.length ? "Drag to reorder. Hidden links stay saved but don't show on your page." : "The buttons visitors tap on your page."}</p></div>
      ${links.length && !ui.adding ? btn({ label: "Add link", icon: "plus", variant: "primary", size: "sm", action: "add", disabled: full }) : ""}</div>`;
    // Prefill: the next sample link that isn't on the page yet, so "Add link" works in one click.
    const sample = L.prefill ? L.SAMPLES.links.find((x) => !links.some((l) => l.url === x.url)) : null;
    const add = ui.adding ? `<form class="lk-addlink" data-addform novalidate>
        <div class="lk-field-row">${L.field({ id: "new-url", label: "URL", value: sample ? sample.url : "", placeholder: "yourwebsite.com/shop", attrs: { inputmode: "url", autocapitalize: "none", spellcheck: "false" } })}${L.field({ id: "new-title", label: "Title", value: sample ? sample.title : "", placeholder: "Shown on the button", max: L.LIMITS.linkTitleMax })}</div>
        <div class="lk-row" style="justify-content:flex-end">${btn({ label: "Cancel", variant: "ghost", size: "sm", action: "add-cancel" })}${btn({ label: "Add link", variant: "primary", size: "sm", type: "submit" })}</div></form>` : "";
    const empty = !links.length && !ui.adding ? `<div class="lk-empty" style="padding:32px 24px 40px"><div class="lk-empty__icon lk-empty__icon--accent">${icon("link", "lk-icon--lg")}</div><h2>Add your first link</h2><p>Point visitors to your shop, latest video or newsletter.</p>${btn({ label: "Add link", icon: "plus", variant: "primary", action: "add" })}</div>` : "";
    const rows = links.map(rowHTML).join("");
    return `${head}${add}${empty}${links.length ? `<div class="lk-links" role="list" aria-labelledby="links-title" data-list>${rows}</div>` : ""}${full ? `<div style="padding:12px 20px" class="lk-xs lk-muted">You've reached ${L.LIMITS.maxLinks} links. Hide or delete one to add more.</div>` : ""}`;
  }
  function rowHTML(l) {
    if (ui.editing === l.id)
      return `<div class="lk-link" role="listitem" data-id="${l.id}"><div class="lk-link__edit" data-editform>
        <div class="lk-field-row">${L.field({ id: `e-title-${l.id}`, label: "Title", value: l.title, max: L.LIMITS.linkTitleMax })}${L.field({ id: `e-url-${l.id}`, label: "URL", value: l.url, attrs: { inputmode: "url", autocapitalize: "none", spellcheck: "false" } })}</div>
        <div class="lk-link__edit-actions">${btn({ label: "Delete", icon: "trash-bin", variant: "ghost", size: "sm", action: "delete", cls: "lk-danger-text" })}<span class="lk-grow"></span>${btn({ label: "Done", variant: "primary", size: "sm", action: "edit-done" })}</div></div></div>`;
    return `<div class="lk-link" role="listitem" data-id="${l.id}" data-hidden="${!l.visible}" ${ui.flash === l.id ? 'data-flash="true"' : ""}>
      <button type="button" class="lk-link__grip" data-grip aria-label="Reorder ${esc(l.title)}. Use arrow keys to move." aria-describedby="reorder-hint">${icon("grip")}</button>
      <button type="button" class="lk-link__body" data-action="edit" aria-label="Edit ${esc(l.title)}"><div class="lk-link__title lk-ellipsis">${esc(l.title)}</div><div class="lk-link__url lk-ellipsis">${esc(l.url)}</div></button>
      ${!l.visible ? L.chip("Hidden", "default") : `<span class="lk-link__clicks" title="Clicks all time">${icon("chart-column")}${L.fmt(l.clicks)}<span class="lk-sr"> clicks</span></span>`}
      ${L.switch({ checked: l.visible, size: "sm", aria: `Show ${l.title} on your page`, action: "visible" })}
      ${btn({ label: `More actions for ${l.title}`, iconOnly: true, icon: "ellipsis", variant: "ghost", size: "sm", action: "row-menu", attrs: { "aria-haspopup": "menu" } })}
    </div>`;
  }

  // ── Profile, socials, appearance ──────────────────────────────────────────
  function profileHTML(s) {
    const p = s.page;
    return `<div class="lk-card__head"><div><h2 class="lk-h3">Profile</h2><p class="lk-sub" style="margin-top:2px">Your photo, name and a line about you.</p></div></div>
      <div class="lk-avatar-picker"><div data-av>${L.avatar(p.displayName || "You", { size: 64, img: p.avatar })}</div><div class="lk-row">${btn({ label: p.avatar ? "Change photo" : "Add photo", icon: "picture", variant: "tertiary", size: "sm", action: "photo" })}${p.avatar ? btn({ label: "Remove", variant: "ghost", size: "sm", action: "photo-remove" }) : ""}</div></div>
      ${L.field({ id: "displayName", label: "Name", value: p.displayName, max: L.LIMITS.nameMax })}
      ${L.field({ id: "bio", label: "Bio", value: p.bio, multiline: true, rows: 2, max: L.LIMITS.bioMax, placeholder: "What you make, in one line." })}`;
  }
  function socialsHTML(s) {
    const used = s.page.socials.map((x) => x.platform);
    return `<div class="lk-card__head"><div><h2 class="lk-h3">Social icons</h2><p class="lk-sub" style="margin-top:2px">Small icons under your bio.</p></div>${used.length < L.SOCIALS.length && used.length < L.LIMITS.maxSocials ? btn({ label: "Add icon", icon: "plus", variant: "tertiary", size: "sm", action: "social-add", attrs: { "aria-haspopup": "menu" } }) : ""}</div>
      ${s.page.socials.length ? `<div class="lk-socials">${s.page.socials.map((x, i) => { const m = L.SOCIALS.find((k) => k.id === x.platform); return `<div class="lk-social-row" data-social="${i}"><span class="lk-social-row__icon" title="${m.label}">${icon(m.icon)}</span>${L.field({ id: `soc-${x.platform}`, label: m.label, hideLabel: true, value: x.url, placeholder: m.placeholder, attrs: { autocapitalize: "none", spellcheck: "false", "data-soc": i } })}${btn({ label: `Remove ${m.label}`, iconOnly: true, icon: "xmark", variant: "ghost", size: "sm", action: "social-remove" })}</div>`; }).join("")}</div>` : `<p class="lk-small lk-muted" style="margin:0">No icons yet. Add Instagram, TikTok, YouTube and more.</p>`}`;
  }
  function appearanceHTML(s) {
    const t = s.page.theme;
    const custom = t.background || t.text || t.accent;
    const r = L.resolveTheme(t);
    const hex = (v, fb) => (v && v.startsWith("#") ? v : fb);
    return `<div class="lk-card__head"><div><h2 class="lk-h3" id="appearance">Appearance</h2><p class="lk-sub" style="margin-top:2px">Pick a theme, then adjust the details.</p></div></div>
      ${L.themePicker(t.preset)}
      <div class="lk-field"><span class="label">Font</span>${L.seg("font", L.FONTS, t.font, { label: "Font" })}</div>
      <div class="lk-field-row"><div class="lk-field"><span class="label">Button shape</span>${L.seg("buttonShape", L.SHAPES, t.buttonShape, { label: "Button shape", full: true })}</div>
      <div class="lk-field"><span class="label">Button style</span>${L.seg("buttonFill", L.FILLS, t.buttonFill, { label: "Button style", full: true })}</div></div>
      <div>${btn({ label: ui.colorsOpen ? "Hide custom colors" : "Custom colors", icon: "palette", iconRight: ui.colorsOpen ? "chevron-down" : "chevron-right", variant: "ghost", size: "sm", action: "colors", attrs: { "aria-expanded": ui.colorsOpen } })}${custom ? ` ${L.chip("Custom", "accent")}` : ""}</div>
      ${ui.colorsOpen ? `<div class="lk-stack lk-stack--sm"><div class="lk-colors">
        ${[["background", "Background", hex(t.background, L.THEMES.find((x) => x.id === t.preset).base)], ["text", "Text", hex(t.text, r.text)], ["accent", "Buttons", hex(t.accent, r.button.border.startsWith("#") ? r.button.border : "#18181b")]].map(([k, label, v]) => `<label class="lk-color"><input type="color" value="${v}" data-color="${k}" aria-label="${label} color"><span>${label}</span><span class="lk-mono lk-muted" style="margin-left:auto" data-hex="${k}">${t[k] || "Theme"}</span></label>`).join("")}
      </div>${custom ? `<div>${btn({ label: "Reset to theme colors", variant: "ghost", size: "sm", icon: "arrow-rotate-left", action: "colors-reset" })}</div>` : ""}<p class="description" style="margin:0">Text color adjusts automatically for readability unless you set it.</p></div>` : ""}`;
  }

  // ── View ──────────────────────────────────────────────────────────────────
  L.views.page = {
    title: "My Page — Linkee",
    enter() { ui = { adding: false, editing: null, colorsOpen: false, mobile: "edit", flash: null }; },
    render(s) {
      const live = s.saved.links.filter((l) => l.visible).length;
      const clicks = s.page.links.reduce((a, l) => a + l.clicks, 0);
      return `<div class="lk-pagehead"><div><h1 class="lk-h1">My Page</h1>
          <div class="lk-statline" style="margin-top:6px">${s.user.published === false ? `<a href="#/app/settings" style="text-decoration:none">${L.chip("Page hidden", "warning", { icon: "eye-slash" })}</a>` : ""}<span>${s.saved.links.length ? `<strong>${live}</strong> ${live === 1 ? "link" : "links"} live` : "Not shared yet"}</span>${clicks ? `<span><strong>${L.fmt(clicks)}</strong> link clicks</span>` : ""}</div></div>
          <div class="lk-row">${btn({ label: "View page", icon: "arrow-up-right-from-square", variant: "tertiary", action: "view" })}</div></div>
        <div data-setup-host>${setupHTML(s)}</div>
        <div class="lk-editor" data-editor data-mobile-view="${ui.mobile}">
          <div class="lk-editor__mobile-toggle">${L.seg("mobile", [{ id: "edit", label: "Edit", icon: "pencil" }, { id: "preview", label: "Preview", icon: "eye" }], ui.mobile, { full: true, label: "Editor view" })}</div>
          <div class="lk-editor__form lk-stack lk-stack--lg">
            <section class="card lk-card lk-card--flush" data-links aria-labelledby="links-title">${linksHTML(s)}</section>
            <section class="card lk-card" data-profile>${profileHTML(s)}</section>
            <section class="card lk-card" data-socials>${socialsHTML(s)}</section>
            <section class="card lk-card" data-appearance>${appearanceHTML(s)}</section>
          </div>
          <aside class="lk-editor__preview" aria-label="Live preview">${L.phone(L.bioHTML(s.page, { flashId: ui.flash }))}<div class="lk-editor__caption" data-caption>${icon("eye")}Live preview</div></aside>
        </div>
        <span id="reorder-hint" class="lk-sr">Press up or down arrow to move the link.</span>
        <div class="lk-savebar" data-savebar data-open="${dirty(s)}" role="region" aria-label="Unsaved changes"><span class="lk-savebar__dot"></span><span class="lk-savebar__text">Unsaved changes</span>${btn({ label: "Discard", variant: "ghost", size: "sm", action: "discard" })}${btn({ label: "Save", variant: "primary", size: "sm", action: "save", attrs: { "aria-keyshortcuts": "Meta+S" } })}</div>`;
    },
    mount(root, s) {
      const p = s.page;
      const $ = (sel) => L.$(sel, root);
      const refreshPreview = () => { const scr = $("[data-phone-screen]"); const top = scr.scrollTop; scr.innerHTML = L.bioHTML(p, { flashId: ui.flash }); scr.scrollTop = top; };
      const refreshBar = () => { const d = dirty(s); $("[data-savebar]").dataset.open = d; $("[data-caption]").innerHTML = `${icon("eye")}Live preview${d ? " · not saved yet" : ""}`; };
      const changed = () => { refreshPreview(); refreshBar(); };
      const paint = (sel, html) => { $(sel).innerHTML = html; };
      const repaintLinks = () => { paint("[data-links]", linksHTML(s)); changed(); };
      L.refreshSetup = () => { const host = $("[data-setup-host]"); if (host) host.innerHTML = setupHTML(s); };
      L.onLeave(() => (L.refreshSetup = null));
      const save = async (button) => {
        await L.pending(button, "Saving…", () => L.sleep(600));
        s.saved = L.clone(p);
        refreshBar();
        L.refreshSetup();
        L.toast("Saved", { description: `linkee.bio/${s.user.slug} is up to date.`, tone: "success", duration: 2400 });
      };
      const flash = (id) => { ui.flash = id; setTimeout(() => { ui.flash = null; }, 1500); };

      // Keyboard: ⌘/Ctrl+S saves
      const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); if (dirty(s)) save($('[data-action="save"]')); } };
      document.addEventListener("keydown", onKey);
      L.onLeave(() => document.removeEventListener("keydown", onKey));

      L.wireSeg(root, (name, v) => {
        if (name === "mobile") { ui.mobile = v; $("[data-editor]").dataset.mobileView = v; return; }
        p.theme[name] = v;
        changed(); L.refreshSetup();
      });

      root.addEventListener("input", (e) => {
        const t = e.target;
        if (t.id === "displayName") { p.displayName = t.value; L.updateCount(root, t.id, t.value.length, L.LIMITS.nameMax); paint("[data-av]", L.avatar(t.value || "You", { size: 64, img: p.avatar })); }
        else if (t.id === "bio") { p.bio = t.value; L.updateCount(root, t.id, t.value.length, L.LIMITS.bioMax); }
        else if (t.dataset.soc != null) p.socials[Number(t.dataset.soc)].url = t.value;
        else if (t.dataset.color) { p.theme[t.dataset.color] = t.value; $(`[data-hex="${t.dataset.color}"]`).textContent = t.value; }
        else if (t.id.startsWith("e-title-") || t.id.startsWith("e-url-")) {
          const id = t.id.replace(/^e-(title|url)-/, ""), l = p.links.find((x) => x.id === id);
          if (t.id.startsWith("e-title-")) { l.title = t.value; L.updateCount(root, t.id, t.value.length, L.LIMITS.linkTitleMax); } else l.url = t.value;
        } else if (t.id === "new-url") {
          const title = $("#new-title");
          if (!title.dataset.touched) { const n = L.normalizeUrl(t.value); title.value = n.url ? L.titleFromUrl(n.url) : ""; L.updateCount(root, "new-title", title.value.length, L.LIMITS.linkTitleMax); }
          L.setFieldError(root, "new-url", null);
          return;
        } else if (t.id === "new-title") { t.dataset.touched = "1"; L.updateCount(root, "new-title", t.value.length, L.LIMITS.linkTitleMax); return; }
        else return;
        changed();
      });
      root.addEventListener("change", (e) => { if (e.target.dataset.color) { paint("[data-appearance]", appearanceHTML(s)); changed(); } });

      root.addEventListener("submit", (e) => {
        if (!e.target.matches("[data-addform]")) return;
        e.preventDefault();
        const urlEl = $("#new-url"), titleEl = $("#new-title");
        const n = L.normalizeUrl(urlEl.value);
        if (n.error) { L.setFieldError(root, "new-url", n.error); return urlEl.focus(); }
        const title = titleEl.value.trim() || L.titleFromUrl(n.url);
        if (title.length > L.LIMITS.linkTitleMax) { L.setFieldError(root, "new-title", `Keep titles under ${L.LIMITS.linkTitleMax} characters`); return titleEl.focus(); }
        const link = { id: "l" + L.uid(), title, url: n.url, visible: true, clicks: 0 };
        p.links.unshift(link);
        ui.adding = false;
        flash(link.id);
        repaintLinks(); L.refreshSetup();
        L.toast("Link added", { description: "Save when you're ready to publish it.", tone: "success", duration: 2200 });
        $('[data-action="add"]')?.focus();
      });

      root.addEventListener("click", (e) => {
        const theme = e.target.closest("[data-theme]");
        if (theme) {
          p.theme.preset = theme.dataset.theme; s.setup.themed = true;
          L.$$("[data-theme]", root).forEach((x) => x.setAttribute("aria-checked", x === theme));
          changed(); L.refreshSetup(); return;
        }
        const item = e.target.closest("[data-setup-item]");
        if (item) return setupAction(item.dataset.setupItem);
        const a = e.target.closest("[data-action]");
        if (!a || !root.contains(a)) return;
        const row = a.closest("[data-id]");
        const link = row && p.links.find((x) => x.id === row.dataset.id);
        switch (a.dataset.action) {
          case "view": return L.go(`#/${s.user.slug}`);
          case "save": return save(a);
          case "discard": {
            const before = L.clone(p);
            s.page = L.clone(s.saved);
            s.page.links.forEach((l) => { const cur = before.links.find((x) => x.id === l.id); if (cur) l.clicks = cur.clicks; });
            ui.adding = false; ui.editing = null;
            L.render();
            L.toast("Changes discarded", { action: { label: "Undo", onClick: () => { L.state.page = before; L.render(); } } });
            return;
          }
          case "setup-hide": s.setup.dismissed = true; return L.refreshSetup();
          case "add": ui.adding = true; ui.editing = null; paint("[data-links]", linksHTML(s)); return $("#new-url").focus();
          case "add-cancel": ui.adding = false; paint("[data-links]", linksHTML(s)); return $('[data-action="add"]')?.focus();
          case "edit": ui.editing = link.id; ui.adding = false; paint("[data-links]", linksHTML(s)); return $(`#e-title-${link.id}`).focus();
          case "edit-done": {
            const n = L.normalizeUrl(link.url);
            if (!link.title.trim()) { L.setFieldError(root, `e-title-${link.id}`, "Add a title"); return $(`#e-title-${link.id}`).focus(); }
            if (n.error) { L.setFieldError(root, `e-url-${link.id}`, n.error); return $(`#e-url-${link.id}`).focus(); }
            link.url = n.url; ui.editing = null; repaintLinks();
            return $(`[data-id="${link.id}"] [data-action="edit"]`)?.focus();
          }
          case "visible": link.visible = !link.visible; return repaintLinks();
          case "delete": return removeLink(link);
          case "row-menu": {
            const i = p.links.indexOf(link);
            return L.menu(a, [
              { label: "Edit", icon: "pencil", onClick: () => { ui.editing = link.id; paint("[data-links]", linksHTML(s)); $(`#e-title-${link.id}`).focus(); } },
              ...(i > 0 ? [{ label: "Move up", icon: "arrow-up", onClick: () => move(link, -1) }] : []),
              ...(i < p.links.length - 1 ? [{ label: "Move down", icon: "arrow-down", onClick: () => move(link, 1) }] : []),
              { label: "Open link", icon: "arrow-up-right-from-square", onClick: () => L.toast(`Opens ${link.url}`, { duration: 1800 }) },
              { sep: true },
              { label: "Delete", icon: "trash-bin", danger: true, onClick: () => removeLink(link) },
            ]);
          }
          case "photo": p.avatar = p.avatar === L.AVATAR_MAYA || !p.avatar ? L.portrait(p.displayName) : L.AVATAR_MAYA; paint("[data-profile]", profileHTML(s)); return changed();
          case "photo-remove": p.avatar = null; paint("[data-profile]", profileHTML(s)); changed(); return $('[data-action="photo"]').focus();
          case "social-add": {
            const used = p.socials.map((x) => x.platform);
            return L.menu(a, L.SOCIALS.filter((x) => !used.includes(x.id)).map((x) => ({ label: x.label, icon: x.icon, onClick: () => { p.socials.push({ platform: x.id, url: L.prefill ? L.SAMPLES.socials[x.id] || "" : "" }); paint("[data-socials]", socialsHTML(s)); changed(); $(`#soc-${x.id}`).focus(); } })));
          }
          case "social-remove": { const i = Number(a.closest("[data-social]").dataset.social); p.socials.splice(i, 1); paint("[data-socials]", socialsHTML(s)); return changed(); }
          case "colors": ui.colorsOpen = !ui.colorsOpen; paint("[data-appearance]", appearanceHTML(s)); return $('[data-action="colors"]').focus();
          case "colors-reset": Object.assign(p.theme, { background: null, text: null, accent: null }); paint("[data-appearance]", appearanceHTML(s)); return changed();
        }
      });

      function setupAction(id) {
        if (id === "link") { ui.adding = true; paint("[data-links]", linksHTML(s)); $("[data-links]").scrollIntoView({ behavior: "smooth", block: "center" }); return $("#new-url").focus({ preventScroll: true }); }
        if (id === "look") return $("[data-appearance]").scrollIntoView({ behavior: "smooth", block: "start" });
        if (id === "ig") return s.accounts.some((a) => a.provider === "INSTAGRAM") ? L.go("#/app/inbox") : L.connectFlow("INSTAGRAM");
        if (id === "share") { s.setup.copied = true; L.copy(`https://linkee.bio/${s.user.slug}`); L.refreshSetup(); }
      }
      function removeLink(link) {
        const i = p.links.indexOf(link);
        p.links.splice(i, 1);
        ui.editing = null;
        repaintLinks(); L.refreshSetup();
        L.toast(`“${link.title}” deleted`, { action: { label: "Undo", onClick: () => { p.links.splice(i, 0, link); repaintLinks(); L.refreshSetup(); } } });
      }
      function move(link, d) {
        const i = p.links.indexOf(link), j = i + d;
        if (j < 0 || j >= p.links.length) return;
        p.links.splice(i, 1); p.links.splice(j, 0, link);
        repaintLinks();
        const g = $(`[data-id="${link.id}"] [data-grip]`); g?.focus();
        L.$("#reorder-hint").textContent = `Moved to position ${j + 1} of ${p.links.length}.`;
      }

      // Keyboard reorder on the grip
      root.addEventListener("keydown", (e) => {
        const g = e.target.closest("[data-grip]");
        if (!g || !["ArrowUp", "ArrowDown"].includes(e.key)) return;
        e.preventDefault();
        move(p.links.find((x) => x.id === g.closest("[data-id]").dataset.id), e.key === "ArrowUp" ? -1 : 1);
      });
      // Pointer drag-and-drop reorder (grip starts the drag)
      let dragId = null;
      root.addEventListener("pointerdown", (e) => { const g = e.target.closest("[data-grip]"); if (g) g.closest("[data-id]").draggable = true; });
      root.addEventListener("dragstart", (e) => { const r = e.target.closest("[data-id]"); if (!r) return; dragId = r.dataset.id; r.dataset.dragging = "true"; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", dragId); });
      root.addEventListener("dragover", (e) => {
        const r = e.target.closest("[data-list] [data-id]"); if (!r || !dragId) return;
        e.preventDefault();
        L.$$("[data-drop]", root).forEach((x) => x !== r && delete x.dataset.drop);
        const rect = r.getBoundingClientRect();
        r.dataset.drop = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
      });
      root.addEventListener("drop", (e) => {
        const r = e.target.closest("[data-list] [data-id]"); if (!r || !dragId) return;
        e.preventDefault();
        const link = p.links.find((x) => x.id === dragId);
        p.links.splice(p.links.indexOf(link), 1);
        let j = p.links.findIndex((x) => x.id === r.dataset.id);
        if (j === -1) j = p.links.length; else if (r.dataset.drop === "after") j++;
        p.links.splice(j, 0, link);
        dragId = null;
        repaintLinks();
      });
      root.addEventListener("dragend", () => { dragId = null; L.$$("[data-id]", root).forEach((x) => { x.draggable = false; delete x.dataset.drop; delete x.dataset.dragging; }); });
    },
  };
})();
