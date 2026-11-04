/* My Page — the page is the editor. Every part of it shows a pencil; tapping opens one small sheet for
   that part (a dialog on desktop, a bottom sheet on phones): photo + name + bio, a link, + Add, social
   icons, and Design. Edits show on the page at once and stay a draft until Publish, which sits right
   under the page. Drag links (or Alt+↑/↓) to reorder; the link sheet also has ↑/↓. */
(function () {
  const L = window.L;
  const { esc, icon, btn } = L;

  let flash = null; // link id to highlight once after it's added
  let sheet = null; // the open sheet: { kind, id?, api }

  const linkClicks = (s) => s.page.links.reduce((a, l) => a + l.clicks, 0);
  const canAdd = (s) => s.page.links.length < L.LIMITS.maxLinks;
  // Click counts change on their own (visitors), so they never count as an unpublished edit.
  const comparable = (p) => JSON.stringify({ ...p, links: p.links.map(({ clicks, ...l }) => l) });
  const dirty = (s) => comparable(s.page) !== comparable(s.saved);

  function noteHTML(s) {
    const parts = [];
    const clicks = linkClicks(s);
    if (clicks) parts.push(`${L.fmt(clicks)} link clicks so far`);
    parts.push(canAdd(s) ? "Tap anything with a pencil to edit it" : `You've reached ${L.LIMITS.maxLinks} links`);
    if (s.page.links.length > 1) parts.push("drag links to reorder");
    return parts.join(" · ");
  }
  const publishHTML = (s) => dirty(s)
    ? `<span class="lk-publish__state" data-state="draft">Unpublished changes</span>${btn({ label: "Discard", variant: "ghost", size: "sm", action: "discard" })}${btn({ label: "Publish", iconRight: "paper-plane", variant: "primary", action: "publish", cls: "lk-publish__btn" })}`
    : `<span class="lk-publish__state">${icon("circle-check")}Everything is live</span>${btn({ label: "Publish", iconRight: "paper-plane", variant: "primary", action: "publish", cls: "lk-publish__btn", disabled: true })}`;

  // ── Design choices ─────────────────────────────────────────────────────────
  const SOLID = ["#ffffff", "#f4f4f5", "#f3ece1", "#fef3c7", "#fde2e4", "#fbcfe8", "#ede9fe", "#dbeafe", "#dcfce7", "#ccfbf1", "#18181b", "#1e293b", "#16302b", "#3b0764", "#7c2d12"];
  const GRADIENT = [
    "linear-gradient(160deg, #ffb88c 0%, #de6fa1 100%)", "linear-gradient(180deg, #f3efff 0%, #e6defc 100%)",
    "linear-gradient(160deg, #a1c4fd 0%, #c2e9fb 100%)", "linear-gradient(160deg, #d4fc79 0%, #96e6a1 100%)",
    "linear-gradient(160deg, #f6d365 0%, #fda085 100%)", "linear-gradient(160deg, #fbc2eb 0%, #a6c1ee 100%)",
    "linear-gradient(180deg, #0b1020 0%, #151b33 100%)", "linear-gradient(160deg, #434343 0%, #000000 100%)",
  ];

  // ── View ──────────────────────────────────────────────────────────────────
  L.views.page = {
    title: "My Page — Linkee",
    enter() { flash = null; sheet?.api.close(true); sheet = null; },
    render(s) {
      const slug = s.user.slug;
      const hidden = s.user.published === false;
      return `<h1 class="lk-sr">My Page</h1>
        ${s.setup.welcome ? `<div class="lk-welcome" data-welcome role="status">${icon("circle-check")}<span class="lk-grow">Your page is live. Add it to your Instagram bio.</span>${btn({ label: "Copy link", variant: "primary", size: "sm", action: "copy" })}${btn({ label: "Dismiss", iconOnly: true, icon: "xmark", variant: "ghost", size: "sm", action: "welcome-close" })}</div>` : ""}
        <div class="lk-editor">
          <div class="lk-editor__bar">
            <div class="lk-address">
              <a class="lk-address__link" href="#/${esc(slug)}" title="Open your page">${icon("globe")}<span class="lk-ellipsis">linkee.bio/<strong>${esc(slug)}</strong></span></a>
              ${btn({ label: "Copy page link", iconOnly: true, icon: "copy", variant: "ghost", size: "sm", action: "copy" })}
              ${hidden ? `<a href="#/app/settings" class="lk-address__chip">${L.chip("Hidden", "warning", { icon: "eye-slash" })}</a>` : ""}
            </div>
            ${btn({ label: "Design", icon: "palette", variant: "tertiary", size: "sm", action: "design" })}
          </div>
          <div class="lk-canvas" data-canvas>${L.bioHTML(s.page, { mode: "edit", flashId: flash, canAdd: canAdd(s) })}</div>
          <div class="lk-publish" data-publish aria-live="polite">${publishHTML(s)}</div>
          <p class="lk-editor__note" data-note>${noteHTML(s)}</p>
        </div>
        <span id="reorder-hint" class="lk-sr">Opens the link editor. To reorder, drag it, or press Alt with the up or down arrow.</span>
        <span class="lk-sr" aria-live="polite" data-reorder-status></span>`;
    },
    mount(root, s) {
      const $ = (sel) => L.$(sel, root);
      const paint = () => {
        const c = $("[data-canvas]");
        if (!c) return;
        c.innerHTML = L.bioHTML(s.page, { mode: "edit", flashId: flash, canAdd: canAdd(s) });
        $("[data-publish]").innerHTML = publishHTML(s);
        $("[data-note]").innerHTML = noteHTML(s);
      };
      const focusSoon = (sel, scope = root) => setTimeout(() => L.$(sel, scope)?.focus({ preventScroll: true }), 0);
      L.onLeave(() => { sheet?.api.close(true); sheet = null; });

      // ── Sheets ─────────────────────────────────────────────────────────────
      // One helper for every editing sheet: the body re-renders from state, so buttons inside can
      // change things (move ↑/↓, add a network) and the sheet always shows the truth.
      function openSheet({ kind, id, title, description, body, buttons, onMount, onClose, size = "sm", refocus, focus }) {
        const me = { kind, id, rerender: () => {} };
        sheet = me;
        me.api = L.modal({
          title, description, size, cls: `lk-sheet lk-sheet--${kind}`, closeButton: false,
          body: `<div data-sheet-body>${body()}</div>`,
          buttons,
          onMount: (dialog) => {
            me.rerender = (focusSel) => { L.$("[data-sheet-body]", dialog).innerHTML = body(); if (focusSel) focusSoon(focusSel, dialog); };
            // L.modal focuses [autofocus] first, so mark where typing should start.
            if (focus) L.$(focus, dialog)?.setAttribute("autofocus", "");
            onMount?.(dialog, me.rerender);
            dialog.addEventListener("keydown", (e) => {
              if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type !== "color") { e.preventDefault(); L.$("[data-modal-btn].button--primary", dialog)?.click(); }
            });
          },
          onClose: () => {
            onClose?.();
            if (sheet === me) sheet = null;
            paint();
            if (refocus) setTimeout(() => L.$(typeof refocus === "function" ? refocus() : refocus, root)?.focus({ preventScroll: true }), 180);
          },
        });
        return me.api;
      }

      function profileSheet(focus) {
        const p = s.page;
        openSheet({
          kind: "profile", title: "Profile", refocus: '[data-edit="profile"][data-focus="photo"]', focus: focus === "photo" || !focus ? '[data-sh="photo"]' : `#${focus}`,
          body: () => `<div class="lk-sheet__photo">
              <span class="lk-sheet__avatar">${p.avatar ? `<img src="${p.avatar}" alt="">` : esc(L.initials(p.displayName || "You"))}</span>
              <div class="lk-row">${btn({ label: p.avatar ? "Change photo" : "Add photo", icon: "picture", variant: "tertiary", size: "sm", attrs: { "data-sh": "photo" } })}${p.avatar ? btn({ label: "Remove", variant: "ghost", size: "sm", cls: "lk-danger-text", attrs: { "data-sh": "photo-remove" } }) : ""}</div>
            </div>
            ${L.field({ id: "pf-name", label: "Name", value: p.displayName, placeholder: "Your name", max: L.LIMITS.nameMax, attrs: { maxlength: L.LIMITS.nameMax, autocomplete: "off" } })}
            ${L.field({ id: "pf-bio", label: "Bio", value: p.bio, placeholder: "A line about you", multiline: true, rows: 3, max: L.LIMITS.bioMax, attrs: { maxlength: L.LIMITS.bioMax } })}`,
          buttons: [{ label: "Done", variant: "primary", cls: "lk-sheet__done" }],
          onMount: (dialog, rerender) => {
            dialog.addEventListener("input", (e) => {
              if (e.target.id === "pf-name") { p.displayName = e.target.value; L.updateCount(dialog, "pf-name", e.target.value.length, L.LIMITS.nameMax); }
              if (e.target.id === "pf-bio") { p.bio = e.target.value; L.updateCount(dialog, "pf-bio", e.target.value.length, L.LIMITS.bioMax); }
              paint();
            });
            dialog.addEventListener("click", (e) => {
              const b = e.target.closest("[data-sh]");
              if (!b) return;
              if (b.dataset.sh === "photo") { p.avatar = p.avatar === L.AVATAR_MAYA || !p.avatar ? L.portrait(p.displayName) : L.AVATAR_MAYA; paint(); rerender('[data-sh="photo"]'); }
              if (b.dataset.sh === "photo-remove") {
                const was = p.avatar;
                p.avatar = null; paint(); rerender('[data-sh="photo"]');
                L.toast("Photo removed", { action: { label: "Undo", onClick: () => { p.avatar = was; paint(); sheet?.kind === "profile" && sheet.rerender(); } } });
              }
            });
          },
        });
      }

      function linkSheet(id) {
        const link = s.page.links.find((l) => l.id === id);
        const before = { url: link.url };
        let url = link.url;
        openSheet({
          kind: "link", id, title: "Edit link", focus: "#lk-title", refocus: () => (s.page.links.some((l) => l.id === id) ? `[data-edit-link="${id}"]` : '[data-edit="add"]'),
          body: () => {
            const i = s.page.links.indexOf(link), n = s.page.links.length;
            return `${L.field({ id: "lk-title", label: "Title", value: link.title, placeholder: "Button text", max: L.LIMITS.linkTitleMax, attrs: { maxlength: L.LIMITS.linkTitleMax, autocomplete: "off" } })}
              ${L.field({ id: "lk-url", label: "URL", value: url, placeholder: "yoursite.com/shop", attrs: { inputmode: "url", autocapitalize: "none", spellcheck: "false", autocomplete: "off" } })}
              <div class="lk-sheet__row"><span>Show on page</span>${L.switch({ checked: link.visible, aria: "Show on page" }).replace("<button", '<button data-sh="visible"')}</div>
              <div class="lk-sheet__row"><span>Position ${i + 1} of ${n}<span class="lk-muted"> · ${L.fmt(link.clicks)} ${link.clicks === 1 ? "click" : "clicks"}</span></span>
                <span class="lk-row">${btn({ label: "Move up", iconOnly: true, icon: "arrow-up", variant: "ghost", size: "sm", disabled: i === 0, attrs: { "data-sh": "up" } })}${btn({ label: "Move down", iconOnly: true, icon: "arrow-down", variant: "ghost", size: "sm", disabled: i === n - 1, attrs: { "data-sh": "down" } })}</span></div>
              ${btn({ label: "Delete link", icon: "trash-bin", variant: "ghost", size: "sm", cls: "lk-danger-text lk-sheet__delete", attrs: { "data-sh": "delete" } })}`;
          },
          buttons: [{ label: "Done", variant: "primary", cls: "lk-sheet__done", onClick: (api) => {
            const n = L.normalizeUrl(url);
            if (n.error) { L.setFieldError(api.el, "lk-url", n.error); L.$("#lk-url", api.el).focus(); return true; }
            link.url = n.url;
            if (!link.title.trim()) link.title = L.titleFromUrl(n.url);
          } }],
          onClose: () => { if (L.normalizeUrl(link.url).error) link.url = before.url; if (!link.title.trim()) link.title = L.titleFromUrl(link.url); },
          onMount: (dialog, rerender) => {
            dialog.addEventListener("input", (e) => {
              if (e.target.id === "lk-title") { link.title = e.target.value; L.updateCount(dialog, "lk-title", e.target.value.length, L.LIMITS.linkTitleMax); paint(); }
              if (e.target.id === "lk-url") { url = e.target.value; L.setFieldError(dialog, "lk-url", null); }
            });
            dialog.addEventListener("click", (e) => {
              const b = e.target.closest("[data-sh]");
              if (!b || b.disabled) return;
              const i = s.page.links.indexOf(link);
              if (b.dataset.sh === "visible") { link.visible = !link.visible; paint(); rerender('[data-sh="visible"]'); }
              if (b.dataset.sh === "up" || b.dataset.sh === "down") { moveLink(link.id, i + (b.dataset.sh === "up" ? -1 : 1)); rerender(`[data-sh="${b.dataset.sh}"]:not([disabled]), [data-sh="${b.dataset.sh === "up" ? "down" : "up"}"]`); }
              if (b.dataset.sh === "delete") { sheet.api.close(); removeLink(link.id); }
            });
          },
        });
      }

      function addSheet() {
        const sample = L.prefill ? L.SAMPLES.links.find((x) => !s.page.links.some((l) => l.url === x.url)) : null;
        const d = { url: sample ? sample.url : "", title: sample ? sample.title : "", titleTouched: false };
        let added = null;
        openSheet({
          kind: "add", title: "Add link", focus: "#lk-url", refocus: () => (added ? `[data-edit-link="${added}"]` : '[data-edit="add"]'),
          body: () => `${L.field({ id: "lk-url", label: "URL", value: d.url, placeholder: "Paste a link, like yoursite.com/shop", attrs: { inputmode: "url", autocapitalize: "none", spellcheck: "false", autocomplete: "off" } })}
            ${L.field({ id: "lk-title", label: "Title", value: d.title, placeholder: "Filled in from the link", max: L.LIMITS.linkTitleMax, attrs: { maxlength: L.LIMITS.linkTitleMax, autocomplete: "off" } })}`,
          buttons: [{ label: "Add link", variant: "primary", cls: "lk-sheet__done", onClick: (api) => {
            const n = L.normalizeUrl(d.url);
            if (n.error) { L.setFieldError(api.el, "lk-url", n.error); L.$("#lk-url", api.el).focus(); return true; }
            const link = { id: "l" + L.uid(), title: d.title.trim() || L.titleFromUrl(n.url), url: n.url, visible: true, clicks: 0 };
            s.page.links.push(link);
            added = flash = link.id;
            setTimeout(() => { flash = null; }, 1500);
          } }],
          onClose: () => { if (added) setTimeout(() => $(`[data-edit-link="${added}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 0); },
          onMount: (dialog) => {
            dialog.addEventListener("input", (e) => {
              if (e.target.id === "lk-url") {
                d.url = e.target.value;
                L.setFieldError(dialog, "lk-url", null);
                if (!d.titleTouched) {
                  const n = L.normalizeUrl(d.url);
                  d.title = n.url ? L.titleFromUrl(n.url) : "";
                  L.$("#lk-title", dialog).value = d.title;
                  L.updateCount(dialog, "lk-title", d.title.length, L.LIMITS.linkTitleMax);
                }
              }
              if (e.target.id === "lk-title") { d.titleTouched = true; d.title = e.target.value; L.updateCount(dialog, "lk-title", d.title.length, L.LIMITS.linkTitleMax); }
            });
          },
        });
      }

      function socialsSheet() {
        const list = s.page.socials;
        openSheet({
          kind: "socials", title: "Social icons", description: "Shown as icons under your links.", focus: "[data-sheet-body] input, [data-soc-add]", refocus: '[data-edit="socials"]',
          body: () => {
            const rows = list.map((x, i) => {
              const m = L.SOCIALS.find((k) => k.id === x.platform);
              return `<div class="lk-listrow" data-social="${i}"><span class="lk-listrow__icon" title="${m.label}">${icon(m.icon)}</span>
                ${L.field({ id: `soc-${x.platform}`, label: m.label, hideLabel: true, value: x.url, placeholder: m.placeholder, attrs: { autocapitalize: "none", spellcheck: "false", autocomplete: "off", "data-soc": i } })}
                ${btn({ label: `Move ${m.label} up`, iconOnly: true, icon: "arrow-up", variant: "ghost", size: "sm", disabled: i === 0, attrs: { "data-sh": "up" } })}${btn({ label: `Move ${m.label} down`, iconOnly: true, icon: "arrow-down", variant: "ghost", size: "sm", disabled: i === list.length - 1, attrs: { "data-sh": "down" } })}${btn({ label: `Remove ${m.label}`, iconOnly: true, icon: "xmark", variant: "ghost", size: "sm", attrs: { "data-sh": "remove" } })}</div>`;
            }).join("");
            const used = list.map((x) => x.platform);
            const left = list.length < L.LIMITS.maxSocials ? L.SOCIALS.filter((x) => !used.includes(x.id)) : [];
            const add = left.length ? `<div class="lk-addbox" role="group" aria-label="Add an icon">${icon("plus")}<span>Add</span>${left.map((x) => `<button type="button" class="lk-addbox__btn" data-soc-add="${x.id}" aria-label="Add ${x.label}" title="Add ${x.label}">${icon(x.icon)}</button>`).join("")}</div>` : "";
            return `${rows ? `<div class="lk-list">${rows}</div>` : ""}${add}`;
          },
          buttons: [{ label: "Done", variant: "primary", cls: "lk-sheet__done" }],
          onClose: () => { s.page.socials = list.filter((x) => x.url.trim()); },
          onMount: (dialog, rerender) => {
            dialog.addEventListener("input", (e) => { const i = e.target.dataset.soc; if (i != null) { list[+i].url = e.target.value; paint(); } });
            dialog.addEventListener("click", (e) => {
              const a = e.target.closest("[data-soc-add]");
              if (a) { const id = a.dataset.socAdd; list.push({ platform: id, url: L.prefill ? L.SAMPLES.socials[id] || "" : "" }); paint(); return rerender(`#soc-${id}`); }
              const b = e.target.closest("[data-sh]");
              if (!b || b.disabled) return;
              const i = +b.closest("[data-social]").dataset.social;
              if (b.dataset.sh === "remove") { list.splice(i, 1); paint(); return rerender("[data-sheet-body] input, [data-soc-add]"); }
              const j = i + (b.dataset.sh === "up" ? -1 : 1);
              [list[i], list[j]] = [list[j], list[i]];
              paint(); rerender(`[data-social="${j}"] [data-sh="${b.dataset.sh}"]:not([disabled]), [data-social="${j}"] input`);
            });
          },
        });
      }

      function designSheet() {
        const t = s.page.theme;
        const before = L.clone(t);
        let bgMode = t.background?.startsWith("linear") ? "gradient" : "solid";
        let saved = false;
        const cardHTML = (th) => {
          const look = { ...t, preset: th.id, ...(th.id === t.preset ? {} : { background: null, text: null, accent: null }) };
          const r = L.resolveTheme(look);
          const on = th.id === t.preset;
          return `<button type="button" class="lk-tpl" data-theme="${th.id}" role="radio" aria-checked="${on}" aria-label="${th.label}" style="--bio-bg:${r.background};--bio-text:${r.text};--bio-muted:${r.muted};--bio-btn-bg:${r.button.bg};--bio-btn-text:${r.button.fg};--bio-btn-border:${r.button.border};--bio-radius:${r.radius};font-family:${esc(r.font)}">
            <span class="lk-tpl__avatar">${s.page.avatar ? `<img src="${s.page.avatar}" alt="">` : ""}</span><b>${esc(s.page.displayName || "Your name")}</b><small>${esc(s.page.bio.split("\n")[0].slice(0, 40))}</small><i></i><i></i><em>${th.label}</em></button>`;
        };
        const idx = () => L.THEMES.findIndex((x) => x.id === t.preset);
        const swatch = (v) => `<button type="button" class="lk-swatch" data-bg="${esc(v)}" style="background:${v}" aria-label="${v.startsWith("linear") ? "Gradient" : v}" aria-pressed="${t.background === v}"></button>`;
        openSheet({
          kind: "design", title: "Design", size: "md", focus: '.lk-tpl[aria-checked="true"]', refocus: '[data-action="design"]',
          body: () => `<section class="lk-dsec"><h3>Template</h3>
              <div class="lk-tpls" role="radiogroup" aria-label="Template" data-tpls>${L.THEMES.map(cardHTML).join("")}</div>
              <div class="lk-tpls__nav">${btn({ label: "Previous template", iconOnly: true, icon: "chevron-left", variant: "tertiary", size: "sm", attrs: { "data-sh": "prev" } })}<span>${idx() + 1} / ${L.THEMES.length}</span>${btn({ label: "Next template", iconOnly: true, icon: "chevron-right", variant: "tertiary", size: "sm", attrs: { "data-sh": "next" } })}</div></section>
            <section class="lk-dsec"><h3>Font</h3><div class="lk-fonts">${L.FONTS.map((f) => `<button type="button" class="lk-font" data-font="${f.id}" aria-pressed="${t.font === f.id}" aria-label="${f.label}" style="font-family:${esc(f.stack)}">${esc(s.page.displayName || "Your name")}</button>`).join("")}</div></section>
            <section class="lk-dsec"><h3>Buttons</h3><div class="lk-dsec__pair">${L.seg("buttonShape", L.SHAPES, t.buttonShape, { label: "Button shape", full: true, size: "sm" })}${L.seg("buttonFill", L.FILLS, t.buttonFill, { label: "Button style", full: true, size: "sm" })}</div></section>
            <section class="lk-dsec"><div class="lk-dsec__head"><h3>Background</h3>${L.seg("bgMode", [{ id: "solid", label: "Solid" }, { id: "gradient", label: "Gradient" }], bgMode, { label: "Background type", size: "sm" })}</div>
              <div class="lk-swatches">
                <button type="button" class="lk-swatch lk-swatch--default" data-bg="" style="background:${L.THEMES[idx()].background}" aria-label="Template default" title="Template default" aria-pressed="${!t.background}"></button>
                ${(bgMode === "solid" ? SOLID : GRADIENT).map(swatch).join("")}
                ${bgMode === "solid" ? `<label class="lk-swatch lk-swatch--custom" title="Custom color">${icon("plus")}<input type="color" data-bg-custom value="${t.background && !t.background.startsWith("linear") ? t.background : "#ffffff"}" aria-label="Custom background color"></label>` : ""}
              </div></section>`,
          buttons: [{ label: "Cancel", cls: "lk-sheet__cancel" }, { label: "Save", variant: "primary", cls: "lk-sheet__done", onClick: () => { saved = true; } }],
          onClose: () => { if (!saved) s.page.theme = before; },
          onMount: (dialog, rerender) => {
            const centerSel = () => setTimeout(() => L.$('.lk-tpl[aria-checked="true"]', dialog)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }), 0);
            const again = (focusSel) => { paint(); rerender(focusSel); centerSel(); };
            centerSel();
            const pick = (id) => { Object.assign(t, { preset: id, background: null, text: null, accent: null }); };
            dialog.addEventListener("click", (e) => {
              const tpl = e.target.closest("[data-theme]");
              if (tpl) { pick(tpl.dataset.theme); return again(`[data-theme="${tpl.dataset.theme}"]`); }
              const f = e.target.closest("[data-font]");
              if (f) { t.font = f.dataset.font; return again(`[data-font="${f.dataset.font}"]`); }
              const bg = e.target.closest("[data-bg]");
              if (bg) { Object.assign(t, { background: bg.dataset.bg || null, text: null, accent: null }); return again(`[data-bg="${CSS.escape(bg.dataset.bg)}"]`); }
              const b = e.target.closest("[data-sh]");
              if (b) { const n = L.THEMES.length; pick(L.THEMES[(idx() + (b.dataset.sh === "next" ? 1 : n - 1)) % n].id); again(`[data-sh="${b.dataset.sh}"]`); }
            });
            dialog.addEventListener("input", (e) => {
              if (e.target.dataset.bgCustom != null) { Object.assign(t, { background: e.target.value, text: null, accent: null }); paint(); }
            });
            dialog.addEventListener("change", (e) => { if (e.target.dataset.bgCustom != null) again("[data-bg-custom]"); });
            L.wireSeg(dialog, (name, v) => {
              if (name === "bgMode") { bgMode = v; return rerender(`[data-seg="bgMode"][data-value="${v}"]`); }
              t[name] = v; again(`[data-seg="${name}"][data-value="${v}"]`);
            });
          },
        });
      }

      // ── Page actions ───────────────────────────────────────────────────────
      function removeLink(id) {
        const i = s.page.links.findIndex((l) => l.id === id);
        const [gone] = s.page.links.splice(i, 1);
        paint(); focusSoon("[data-edit='add']");
        L.toast(`“${gone.title}” removed`, { action: { label: "Undo", onClick: () => { s.page.links.splice(i, 0, gone); paint(); } } });
      }
      function moveLink(id, to) {
        const links = s.page.links;
        const from = links.findIndex((l) => l.id === id);
        if (from === -1 || to === from || to < 0 || to >= links.length) return false;
        const before = links.map((l) => l.id);
        const [l] = links.splice(from, 1);
        links.splice(to, 0, l);
        paint();
        return before;
      }
      const undoOrder = (before) => { s.page.links.sort((a, b) => before.indexOf(a.id) - before.indexOf(b.id)); paint(); };
      async function publish(b) {
        await L.pending(b, "Publishing…", () => L.sleep(700));
        s.saved = L.clone(s.page);
        paint();
        focusSoon("[data-action='design']");
        L.toast("Your page is updated", { tone: "success", description: `linkee.bio/${s.user.slug}`, action: { label: "View", onClick: () => L.go(`#/${s.user.slug}`) } });
      }
      function discard() {
        const draft = L.clone(s.page);
        s.page = L.clone(s.saved);
        paint();
        L.toast("Changes discarded", { action: { label: "Undo", onClick: () => { s.page = draft; paint(); } } });
      }

      let drag;
      root.addEventListener("click", (e) => {
        if (drag.suppressClick) { drag.suppressClick = false; e.preventDefault(); return; }
        const a = e.target.closest("[data-action]");
        if (a && root.contains(a)) {
          switch (a.dataset.action) {
            case "copy":
              L.copy(`https://linkee.bio/${s.user.slug}`);
              if (s.setup.welcome) { s.setup.welcome = false; $("[data-welcome]")?.remove(); }
              return;
            case "welcome-close": s.setup.welcome = false; return $("[data-welcome]")?.remove();
            case "design": return designSheet();
            case "publish": return a.disabled ? null : publish(a);
            case "discard": return discard();
          }
          return;
        }
        const linkEl = e.target.closest("[data-edit-link]");
        if (linkEl) return linkSheet(linkEl.dataset.editLink);
        const edEl = e.target.closest("[data-edit]");
        if (!edEl) return;
        if (edEl.dataset.edit === "add") return addSheet();
        if (edEl.dataset.edit === "socials") return socialsSheet();
        if (edEl.dataset.edit === "profile") return profileSheet(edEl.dataset.focus);
      });

      // Keyboard reorder: Alt+↑/↓ on a link, announced and undoable like a drag.
      root.addEventListener("keydown", (e) => {
        const el = e.target.closest("[data-edit-link]");
        if (!el || !e.altKey || !["ArrowUp", "ArrowDown"].includes(e.key)) return;
        e.preventDefault();
        const id = el.dataset.editLink;
        const i = s.page.links.findIndex((l) => l.id === id);
        const before = moveLink(id, i + (e.key === "ArrowUp" ? -1 : 1));
        if (!before) return;
        L.$(`[data-edit-link="${id}"]`, root).focus();
        $("[data-reorder-status]").textContent = `Moved to position ${s.page.links.findIndex((l) => l.id === id) + 1} of ${s.page.links.length}.`;
        L.toast("Link moved", { duration: 2400, action: { label: "Undo", onClick: () => undoOrder(before) } });
      });

      // ── Reorder: drag a link (mouse: just drag · touch: press and hold) ──────
      drag = { st: null, suppressClick: false };
      root.addEventListener("pointerdown", (e) => {
        const el = e.target.closest("[data-edit-link]");
        if (!el || !el.isConnected || e.button !== 0) return;
        drag.st = { el, id: el.dataset.editLink, x: e.clientX, y: e.clientY, pid: e.pointerId, mouse: e.pointerType === "mouse", active: false };
        if (!drag.st.mouse) drag.st.timer = setTimeout(() => start(drag.st), 350);
      });
      function start(st) {
        if (!st || drag.st !== st) return;
        st.active = true;
        st.items = L.$$("[data-edit-link]", root);
        st.rects = st.items.map((x) => x.getBoundingClientRect());
        st.from = st.items.indexOf(st.el);
        st.el.dataset.dragging = "true";
        try { st.el.setPointerCapture(st.pid); } catch { /* pointer already released */ }
      }
      root.addEventListener("pointermove", (e) => {
        const st = drag.st;
        if (!st || e.pointerId !== st.pid) return;
        const dy = e.clientY - st.y;
        if (!st.active) {
          if (st.mouse && Math.abs(dy) > 5) start(st);
          else if (!st.mouse && Math.hypot(e.clientX - st.x, dy) > 8) { clearTimeout(st.timer); drag.st = null; } // a scroll, not a drag
          if (!st.active) return;
        }
        st.el.style.transform = `translateY(${dy}px)`;
        // Slide the other links out of the way so the drop position is obvious.
        const h = st.rects[st.from].height + 10;
        const center = st.rects[st.from].top + st.rects[st.from].height / 2 + dy;
        st.to = st.from;
        st.items.forEach((x, i) => {
          if (i === st.from) return;
          const mid = st.rects[i].top + st.rects[i].height / 2;
          let shift = 0;
          if (i > st.from && center > mid) { shift = -h; st.to = Math.max(st.to, i); }
          if (i < st.from && center < mid) { shift = h; st.to = Math.min(st.to, i); }
          x.style.transform = shift ? `translateY(${shift}px)` : "";
        });
      });
      const end = (e) => {
        const st = drag.st;
        if (!st || e.pointerId !== st.pid) return;
        clearTimeout(st.timer);
        drag.st = null;
        if (!st.active) return;
        drag.suppressClick = true;
        setTimeout(() => { drag.suppressClick = false; }, 0);
        st.items.forEach((x) => { x.style.transform = ""; });
        delete st.el.dataset.dragging;
        const before = st.to != null && moveLink(st.id, st.to);
        if (before) L.toast("Link moved", { duration: 2400, action: { label: "Undo", onClick: () => undoOrder(before) } });
      };
      root.addEventListener("pointerup", end);
      root.addEventListener("pointercancel", end);
      // While a touch drag is active, the finger moves the link instead of scrolling the page.
      root.addEventListener("touchmove", (e) => { if (drag.st?.active) e.preventDefault(); }, { passive: false });
      root.addEventListener("contextmenu", (e) => { if (e.target.closest("[data-edit-link]") && !drag.st?.mouse) e.preventDefault(); });
    },
  };
})();
