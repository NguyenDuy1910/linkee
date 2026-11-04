/* Linkee UX preview — UI kit. Each helper emits HeroUI v3 markup (class names and data-* state
   attributes from @heroui/styles) so the prototype maps 1:1 onto @heroui/react components. */
(function () {
  const L = window.L;

  // ── Basics ────────────────────────────────────────────────────────────────
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  L.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
  L.icon = (name, cls = "") => `<svg class="lk-icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  L.fmt = (n) => Number(n).toLocaleString("en-US");
  L.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  L.uid = () => Math.random().toString(36).slice(2, 9);
  L.clone = (v) => JSON.parse(JSON.stringify(v));
  L.$ = (sel, root = document) => root.querySelector(sel);
  L.$$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  L.initials = (name) =>
    (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  const PALETTE = ["#6d5bd0", "#d0644a", "#3a8f6e", "#c08a1e", "#3f7fd0", "#b0507e", "#4b8a9a", "#7c6f5c"];
  L.colorFor = (s) => PALETTE[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
  L.spinner = (cls = "") =>
    `<svg class="spinner spinner--sm lk-spin ${cls}" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-opacity=".2" stroke-width="1.5"/><path d="M14.25 8A6.25 6.25 0 0 0 8 1.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  L.attrs = (o = {}) =>
    Object.entries(o)
      .filter(([, v]) => v !== false && v != null)
      .map(([k, v]) => (v === true ? k : `${k}="${L.esc(v)}"`))
      .join(" ");

  // ── HeroUI Button ─────────────────────────────────────────────────────────
  // variant: primary | secondary | tertiary | outline | ghost | danger ; size: sm | md | lg
  L.btn = function ({ label = "", variant = "tertiary", size = "md", icon, iconRight, action, iconOnly, aria, full, disabled, attrs = {}, type = "button", cls = "" } = {}) {
    const c = ["button", `button--${variant}`, `button--${size}`, iconOnly && "button--icon", full && "button--full-width", cls].filter(Boolean).join(" ");
    const a = L.attrs({ type, class: c, "data-action": action, "aria-label": aria || (iconOnly ? label : null), disabled, ...attrs });
    const inner = iconOnly ? L.icon(icon) : `${icon ? L.icon(icon) : ""}${label ? `<span>${L.esc(label)}</span>` : ""}${iconRight ? L.icon(iconRight) : ""}`;
    return `<button ${a}>${inner}</button>`;
  };
  L.linkBtn = (href, opts) => L.btn(opts).replace("<button", `<a href="${href}"`).replace(/<\/button>$/, "</a>").replace(' type="button"', "");

  // Put a button into HeroUI's pending state while `fn` runs.
  L.pending = async function (button, text, fn) {
    if (!button) return fn();
    const html = button.innerHTML;
    const width = button.getBoundingClientRect().width;
    button.dataset.pending = "true";
    button.setAttribute("aria-busy", "true");
    button.style.minWidth = width + "px";
    button.innerHTML = `${L.spinner("spinner--current")}${text ? `<span>${L.esc(text)}</span>` : ""}`;
    try {
      return await fn();
    } finally {
      if (button.isConnected) {
        button.innerHTML = html;
        delete button.dataset.pending;
        button.removeAttribute("aria-busy");
        button.style.minWidth = "";
      }
    }
  };

  // ── HeroUI Chip / Avatar / Kbd ────────────────────────────────────────────
  // color: default | accent | success | warning | danger
  L.chip = (label, color = "default", { dot, icon, variant = "soft", size = "sm" } = {}) =>
    `<span class="chip chip--${size} chip--${variant} chip--${color}">${dot ? '<span class="lk-dot"></span>' : ""}${icon ? L.icon(icon) : ""}<span class="chip__label">${L.esc(label)}</span></span>`;
  L.avatar = (name, { size = 32, img, color } = {}) =>
    img
      ? `<span class="lk-avatar" style="width:${size}px;height:${size}px"><img src="${img}" alt="" width="${size}" height="${size}" style="width:100%;height:100%;object-fit:cover"></span>`
      : `<span class="lk-avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.38)}px;background:${color || L.colorFor(name)}" aria-hidden="true">${L.esc(L.initials(name))}</span>`;
  L.kbd = (k) => `<kbd class="kbd"><span class="kbd__content">${L.esc(k)}</span></kbd>`;
  L.netLogo = (provider, size = 15) =>
    `<span class="lk-dest__net ${provider === "INSTAGRAM" ? "lk-net-ig" : "lk-net-fb"}" style="width:${size}px;height:${size}px">${L.icon(provider === "INSTAGRAM" ? "logo-instagram" : "logo-facebook")}</span>`;

  // ── HeroUI TextField (Label + Input/TextArea + Description/FieldError) ────
  L.field = function ({ id, label, value = "", placeholder = "", type = "text", description, error, max, multiline, prefix, required, autocomplete, rows = 3, attrs = {}, hideLabel } = {}) {
    const invalid = error ? 'data-invalid="true" aria-invalid="true"' : "";
    const desc = error
      ? `<span class="field-error" data-visible="true" role="alert" id="${id}-err">${L.icon("circle-exclamation")}${L.esc(error)}</span>`
      : description
        ? `<span class="description" id="${id}-desc">${description}</span>`
        : "";
    const count = max ? `<span class="lk-field__count" data-count-for="${id}" ${String(value).length > max ? 'data-over="true"' : ""}>${String(value).length}/${max}</span>` : "";
    const a = L.attrs({ id, name: id, placeholder, autocomplete, required, "aria-describedby": error ? `${id}-err` : description ? `${id}-desc` : null, ...attrs });
    let control;
    if (multiline) control = `<textarea class="textarea textarea--secondary" rows="${rows}" ${a} ${invalid}>${L.esc(value)}</textarea>`;
    else if (prefix) control = `<div class="input-group input-group--secondary"><span class="input-group__prefix">${L.esc(prefix)}</span><input class="input-group__input" type="${type}" value="${L.esc(value)}" ${a} ${invalid}></div>`;
    else control = `<input class="input input--secondary" type="${type}" value="${L.esc(value)}" ${a} ${invalid}>`;
    // The counter sits on the label row (right-aligned) so it never adds an empty line under the field.
    const head = label && !hideLabel
      ? `<div class="lk-field__head"><label class="label" for="${id}">${L.esc(label)}</label>${count}</div>`
      : `${label ? `<label class="label lk-sr" for="${id}">${L.esc(label)}</label>` : ""}`;
    const meta = desc || (count && !(label && !hideLabel)) ? `<div class="lk-field__meta">${desc}${label && !hideLabel ? "" : count}</div>` : "";
    return `<div class="lk-field" data-field="${id}">${head}${control}${meta}</div>`;
  };
  // Re-render only the error/description line of a field (keeps focus while typing).
  L.setFieldError = function (root, id, error, description) {
    const wrap = L.$(`[data-field="${id}"]`, root);
    if (!wrap) return;
    const ctrl = L.$(`#${CSS.escape(id)}`, wrap);
    const target = ctrl.closest(".input-group") || ctrl;
    if (error) { ctrl.setAttribute("data-invalid", "true"); ctrl.setAttribute("aria-invalid", "true"); target.setAttribute("data-invalid", "true"); }
    else { ctrl.removeAttribute("data-invalid"); ctrl.removeAttribute("aria-invalid"); target.removeAttribute("data-invalid"); }
    let meta = L.$(".lk-field__meta", wrap);
    if (!meta) { meta = document.createElement("div"); meta.className = "lk-field__meta"; wrap.appendChild(meta); }
    const count = L.$(".lk-field__count", meta);
    meta.innerHTML = error
      ? `<span class="field-error" data-visible="true" role="alert" id="${id}-err">${L.icon("circle-exclamation")}${L.esc(error)}</span>`
      : description ? `<span class="description" id="${id}-desc">${description}</span>` : "";
    if (count) meta.appendChild(count);
    ctrl.setAttribute("aria-describedby", error ? `${id}-err` : `${id}-desc`);
  };
  L.updateCount = function (root, id, len, max) {
    const el = L.$(`[data-count-for="${id}"]`, root);
    if (!el) return;
    el.textContent = `${L.fmt(len)}/${L.fmt(max)}`;
    if (len > max) el.dataset.over = "true"; else delete el.dataset.over;
  };

  // ── HeroUI Tabs used as a segmented radio group ───────────────────────────
  L.seg = function (name, options, value, { size, full, label } = {}) {
    const tabs = options
      .map((o) => {
        const sel = o.id === value;
        return `<button type="button" class="tabs__tab" role="radio" aria-checked="${sel}" ${sel ? 'data-selected="true"' : ""} data-seg="${name}" data-value="${L.esc(o.id)}" tabindex="${sel ? 0 : -1}">${sel ? '<span class="tabs__indicator"></span>' : ""}${o.icon ? L.icon(o.icon) : ""}${L.esc(o.label)}${o.count != null ? `<span class="lk-count">${o.count}</span>` : ""}</button>`;
      })
      .join("");
    return `<div class="tabs lk-seg ${size === "sm" ? "lk-seg--sm" : ""} ${full ? "lk-seg--full" : ""}" data-orientation="horizontal"><div class="tabs__list-container"><div class="tabs__list" role="radiogroup" aria-label="${L.esc(label || name)}" data-orientation="horizontal">${tabs}</div></div></div>`;
  };
  // Wire every segmented control inside `root`; onChange(name, value).
  L.wireSeg = function (root, onChange) {
    root.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-seg]");
      if (!tab || !root.contains(tab)) return;
      selectSeg(tab);
      onChange(tab.dataset.seg, tab.dataset.value);
    });
    root.addEventListener("keydown", (e) => {
      const tab = e.target.closest("[data-seg]");
      if (!tab || !["ArrowLeft", "ArrowRight"].includes(e.key)) return;
      const all = L.$$(`[data-seg="${tab.dataset.seg}"]`, tab.parentElement);
      const next = all[(all.indexOf(tab) + (e.key === "ArrowRight" ? 1 : all.length - 1)) % all.length];
      e.preventDefault();
      selectSeg(next);
      next.focus();
      onChange(next.dataset.seg, next.dataset.value);
    });
  };
  function selectSeg(tab) {
    L.$$(`[data-seg="${tab.dataset.seg}"]`, tab.parentElement).forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-checked", on);
      t.tabIndex = on ? 0 : -1;
      if (on) t.dataset.selected = "true"; else delete t.dataset.selected;
      const ind = L.$(".tabs__indicator", t);
      if (on && !ind) t.insertAdjacentHTML("afterbegin", '<span class="tabs__indicator"></span>');
      if (!on && ind) ind.remove();
    });
  }

  // ── HeroUI Switch ─────────────────────────────────────────────────────────
  L.switch = ({ id, checked, label, size = "md", aria, action, disabled } = {}) =>
    `<button type="button" role="switch" class="switch switch--${size}" id="${id || ""}" aria-checked="${!!checked}" ${checked ? 'data-selected="true"' : ""} ${action ? `data-action="${action}"` : ""} ${aria ? `aria-label="${L.esc(aria)}"` : ""} ${disabled ? 'aria-disabled="true" data-disabled="true"' : ""} style="background:none;border:0;padding:0;font:inherit"><span class="switch__content"><span class="switch__control"><span class="switch__thumb"></span></span>${label ? `<span>${L.esc(label)}</span>` : ""}</span></button>`;
  L.setSwitch = (el, on) => {
    el.setAttribute("aria-checked", on);
    if (on) el.dataset.selected = "true"; else delete el.dataset.selected;
  };

  // ── HeroUI Alert ──────────────────────────────────────────────────────────
  L.alert = ({ tone = "default", title, description, icon, action } = {}) => {
    const ic = icon || { warning: "triangle-exclamation", danger: "circle-exclamation", success: "circle-check", accent: "circle-info", default: "circle-info" }[tone];
    return `<div class="alert alert--${tone}" role="${tone === "danger" ? "alert" : "status"}" style="align-items:center"><div class="alert__indicator">${L.icon(ic)}</div><div class="alert__content"><div class="alert__title">${L.esc(title)}</div>${description ? `<div class="alert__description">${description}</div>` : ""}</div>${action || ""}</div>`;
  };

  // ── Toasts (HeroUI Toast anatomy) ─────────────────────────────────────────
  L.toast = function (title, { description, tone = "default", action, duration = 4200 } = {}) {
    const region = L.$(".lk-toasts");
    const ic = { success: "circle-check-fill", danger: "circle-exclamation-fill", warning: "triangle-exclamation", default: "circle-info", accent: "sparkles" }[tone];
    const el = document.createElement("div");
    el.className = `toast toast--${tone} toast--bottom`;
    el.setAttribute("role", tone === "danger" ? "alert" : "status");
    el.dataset.frontmost = "true";
    el.innerHTML = `<div class="toast__indicator">${L.icon(ic, "lk-icon--lg")}</div><div class="toast__content"><div class="toast__title">${L.esc(title)}</div>${description ? `<div class="toast__description">${L.esc(description)}</div>` : ""}</div>${action ? `<button type="button" class="button button--secondary button--sm toast__action">${L.esc(action.label)}</button>` : `<button type="button" class="close-button close-button--default" aria-label="Dismiss">${L.icon("xmark")}</button>`}`;
    const close = () => {
      if (!el.isConnected || el.dataset.exiting) return;
      el.dataset.exiting = "true";
      setTimeout(() => el.remove(), 200);
    };
    el.querySelector("button").addEventListener("click", () => {
      if (action) action.onClick();
      close();
    });
    while (region.children.length >= 3) region.firstElementChild.remove();
    region.appendChild(el);
    if (duration) setTimeout(close, action ? duration + 2000 : duration);
    return close;
  };

  L.copy = function (text, label = "Link copied") {
    try { navigator.clipboard?.writeText(text); } catch { /* file:// may block clipboard; feedback still shows */ }
    L.toast(label, { description: text, tone: "success", duration: 2600 });
  };

  // ── Modal (HeroUI Modal / AlertDialog anatomy) ────────────────────────────
  // Confirmations, outside-world handoffs, and My Page's editing sheets (cls "lk-sheet": a centered
  // dialog on desktop, a bottom sheet on phones). `onClose` runs however it closes (button, Esc, backdrop).
  let openModal = null;
  L.closeModal = () => { if (openModal) openModal.close(true); };
  L.modal = function ({ title, description, body = "", icon, tone = "accent", size = "sm", buttons = [], onMount, onClose, cls = "", closeButton = true, dismissable = true } = {}) {
    if (openModal) openModal.close(true);
    const prevFocus = document.activeElement;
    const backdrop = document.createElement("div");
    backdrop.className = `modal__backdrop modal__backdrop--blur ${cls ? cls.split(" ")[0] + "-backdrop" : ""}`;
    backdrop.dataset.entering = "true";
    const titleId = "m-" + L.uid();
    backdrop.innerHTML = `<div class="modal__container" data-placement="center"><section class="modal__dialog modal__dialog--${size} ${cls}" role="dialog" aria-modal="true" aria-labelledby="${titleId}" tabindex="-1">
      ${dismissable && closeButton ? `<button type="button" class="close-button close-button--default modal__close-trigger" aria-label="Close" data-modal-close>${L.icon("xmark")}</button>` : ""}
      <header class="modal__header">${icon ? `<div class="lk-modal-icon lk-modal-icon--${tone}">${L.icon(icon, "lk-icon--lg")}</div>` : ""}<h2 class="modal__heading" id="${titleId}">${L.esc(title)}</h2>${description ? `<p class="lk-sub" style="margin:0">${description}</p>` : ""}</header>
      ${body ? `<div class="modal__body">${body}</div>` : ""}
      ${buttons.length ? `<footer class="modal__footer">${buttons.map((b, i) => L.btn({ label: b.label, variant: b.variant || "tertiary", icon: b.icon, iconRight: b.iconRight, cls: b.cls, attrs: { "data-modal-btn": i, ...(b.attrs || {}) } })).join("")}</footer>` : ""}
    </section></div>`;
    document.body.appendChild(backdrop);
    document.body.style.overflow = "hidden";
    const dialog = L.$(".modal__dialog", backdrop);
    requestAnimationFrame(() => delete backdrop.dataset.entering);
    const api = {
      el: dialog,
      close(immediate) {
        if (!backdrop.isConnected) return;
        document.removeEventListener("keydown", onKey, true);
        onClose?.();
        const done = () => { backdrop.remove(); if (openModal === api) openModal = null; if (!openModal) document.body.style.overflow = ""; };
        if (immediate) done();
        else { backdrop.dataset.exiting = "true"; dialog.dataset.exiting = "true"; setTimeout(done, 160); }
        if (prevFocus && prevFocus.isConnected) prevFocus.focus({ preventScroll: true });
      },
    };
    const onKey = (e) => {
      if (e.key === "Escape" && dismissable) { e.stopPropagation(); api.close(); }
      if (e.key === "Tab") {
        const f = L.$$('button:not([disabled]), [href], input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])', dialog).filter((x) => x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey, true);
    backdrop.addEventListener("mousedown", (e) => { if (dismissable && (e.target === backdrop || e.target.classList.contains("modal__container"))) api.close(); });
    L.$$("[data-modal-close]", dialog).forEach((b) => b.addEventListener("click", () => api.close()));
    L.$$("[data-modal-btn]", dialog).forEach((b) =>
      b.addEventListener("click", async () => {
        const spec = buttons[Number(b.dataset.modalBtn)];
        if (!spec.onClick) return api.close();
        const keepOpen = await spec.onClick(api, b);
        if (keepOpen !== true) api.close();
      }),
    );
    openModal = api;
    if (onMount) onMount(dialog, api);
    const auto = L.$("[autofocus]", dialog) || L.$$("[data-modal-btn]", dialog).pop() || dialog;
    setTimeout(() => auto.focus(), 30);
    return api;
  };

  // ── Dropdown menu (HeroUI Dropdown → Popover + Menu + MenuItem) ───────────
  let openMenu = null;
  L.closeMenu = () => { if (openMenu) openMenu.close(); };
  L.menu = function (trigger, items, { header, align = "end" } = {}) {
    if (openMenu) { const same = openMenu.trigger === trigger; openMenu.close(); if (same) return; }
    const pop = document.createElement("div");
    pop.className = "lk-pop dropdown__popover";
    pop.innerHTML = `${header ? `<div class="lk-pop__header">${header}</div><div class="lk-pop__sep"></div>` : ""}<div class="menu" role="menu">${items
      .map((it, i) => (it.sep ? '<div class="lk-pop__sep" role="separator"></div>' : `<button type="button" role="${it.checked != null ? "menuitemradio" : "menuitem"}" class="menu-item ${it.danger ? "menu-item--danger" : ""}" data-i="${i}" tabindex="-1" ${it.checked != null ? `aria-checked="${!!it.checked}"` : ""} ${it.disabled ? 'aria-disabled="true" data-disabled="true"' : ""}>${it.icon ? L.icon(it.icon) : ""}<span data-slot="label">${L.esc(it.label)}${it.description ? `<small class="lk-pop__desc">${L.esc(it.description)}</small>` : ""}</span>${it.hint ? `<span class="lk-kbd-hint">${L.esc(it.hint)}</span>` : ""}${it.checked ? `<span class="lk-pop__check">${L.icon("check")}</span>` : ""}</button>`))
      .join("")}</div>`;
    document.body.appendChild(pop);
    const r = trigger.getBoundingClientRect();
    const w = pop.offsetWidth, h = pop.offsetHeight;
    let left = align === "end" ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, innerWidth - w - 8));
    let top = r.bottom + 6;
    if (top + h > innerHeight - 8) { top = r.top - h - 6; pop.style.transformOrigin = "bottom right"; }
    pop.style.left = left + "px";
    pop.style.top = top + "px";
    trigger.setAttribute("aria-expanded", "true");
    const btns = L.$$(".menu-item", pop);
    const close = () => {
      pop.remove();
      trigger.setAttribute("aria-expanded", "false");
      document.removeEventListener("mousedown", outside, true);
      document.removeEventListener("keydown", key, true);
      removeEventListener("scroll", close, true);
      openMenu = null;
    };
    // Clicks on the Action Explorer's player controls must not dismiss a menu it is demonstrating.
    const outside = (e) => { if (!pop.contains(e.target) && !trigger.contains(e.target) && !e.target.closest?.(".lk-tour")) close(); };
    const key = (e) => {
      const i = btns.indexOf(document.activeElement);
      if (e.key === "Escape") { e.preventDefault(); close(); trigger.focus(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); btns[(i + 1) % btns.length].focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); btns[(i - 1 + btns.length) % btns.length].focus(); }
      else if (e.key === "Tab") close();
    };
    pop.addEventListener("click", (e) => {
      const b = e.target.closest(".menu-item");
      if (!b || b.dataset.disabled) return;
      close();
      trigger.focus({ preventScroll: true });
      items[Number(b.dataset.i)].onClick?.();
    });
    document.addEventListener("mousedown", outside, true);
    document.addEventListener("keydown", key, true);
    addEventListener("scroll", close, { capture: true, once: true });
    btns[0]?.focus({ preventScroll: true });
    openMenu = { trigger, close };
  };

  // ── Bio page renderer (mirrors lib/bio.ts resolveTheme + BioPageView) ─────
  function hexLum(hex) {
    const n = parseInt(hex.slice(1), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }
  L.resolveTheme = function (theme) {
    const p = L.THEMES.find((t) => t.id === theme.preset) || L.THEMES[0];
    // A gradient background reads its first stop as the base color (contrast, status bar tint).
    const base = theme.background ? (theme.background.match(/#[0-9a-f]{6}/i) || [p.base])[0] : p.base;
    const background = theme.background || p.background;
    let text = theme.text || p.text;
    if (!theme.text && theme.background) text = hexLum(base) < 0.35 ? "#f8fafc" : "#18181b";
    const muted = theme.text || text !== p.text ? `color-mix(in srgb, ${text} 72%, ${base})` : p.muted;
    const accent = theme.accent || (text !== p.text ? text : p.accent);
    const accentText = theme.accent || accent !== p.accent ? (hexLum(accent) < 0.35 ? "#ffffff" : "#18181b") : p.accentText;
    const radius = (L.SHAPES.find((s) => s.id === theme.buttonShape) || L.SHAPES[0]).radius;
    const button =
      theme.buttonFill === "outline" ? { bg: "transparent", fg: text, border: accent }
      : theme.buttonFill === "soft" ? { bg: `color-mix(in srgb, ${accent} 14%, transparent)`, fg: text, border: "transparent" }
      : { bg: accent, fg: accentText, border: accent };
    const font = (L.FONTS.find((f) => f.id === theme.font) || L.FONTS[0]).stack;
    return { background, base, text, muted, radius, button, font };
  };
  // mode: "public" (the live page) · "preview" (inside a phone frame) · "edit" (My Page canvas: the page
  // is the editor — every part is a tap target with a pencil, and tapping opens its editing sheet).
  L.bioHTML = function (page, { mode = "preview", flashId, canAdd = true } = {}) {
    const t = L.resolveTheme(page.theme);
    const style = `--bio-bg:${t.background};--bio-base:${t.base};--bio-text:${t.text};--bio-muted:${t.muted};--bio-radius:${t.radius};--bio-btn-bg:${t.button.bg};--bio-btn-text:${t.button.fg};--bio-btn-border:${t.button.border};--bio-font:${t.font}`;
    const edit = mode === "edit";
    const pen = `<span class="lk-pen" aria-hidden="true">${L.icon("pencil")}</span>`;
    const name = page.displayName.trim() || "Your name";
    const visible = page.links.filter((l) => (edit || l.visible) && l.title.trim());
    const socialIcons = page.socials
      .filter((s) => s.url.trim())
      .map((s) => {
        const meta = L.SOCIALS.find((x) => x.id === s.platform);
        return edit
          ? `<span class="lk-bio__social">${L.icon(meta.icon)}</span>`
          : `<a class="lk-bio__social" href="#" data-bio-social="${s.platform}" aria-label="${L.esc(meta.label)}">${L.icon(meta.icon)}</a>`;
      })
      .join("");
    const socials = edit
      ? socialIcons
        ? `<button type="button" class="lk-bio__socials lk-bio__editable" data-edit="socials" aria-label="Edit social icons">${socialIcons}${pen}</button>`
        : `<button type="button" class="lk-bio__ghost" data-edit="socials">${L.icon("plus")}Social icons</button>`
      : socialIcons ? `<div class="lk-bio__socials">${socialIcons}</div>` : "";
    const linkHTML = (l) => edit
      ? `<button type="button" class="lk-bio__link lk-bio__editable" data-edit-link="${l.id}" ${l.visible ? "" : 'data-hidden="true"'} ${l.id === flashId ? 'data-new="true"' : ""} aria-label="Edit ${L.esc(l.title)}${l.visible ? "" : " (hidden)"}" aria-describedby="reorder-hint">${l.visible ? "" : `<span class="lk-bio__hidden">${L.icon("eye-slash")}<span>Hidden</span></span>`}<span>${L.esc(l.title)}</span>${pen}</button>`
      : `<a class="lk-bio__link" href="#" data-bio-link="${l.id}" ${l.id === flashId ? 'data-new="true"' : ""}>${L.esc(l.title)}</a>`;
    const add = edit && canAdd ? `<button type="button" class="lk-bio__add" data-edit="add">${L.icon("plus")}Add</button>` : "";
    const links = visible.length || add
      ? `<${edit ? "div" : "nav"} class="lk-bio__links" ${edit ? "data-links" : 'aria-label="Links"'}>${visible.map(linkHTML).join("")}${add}</${edit ? "div" : "nav"}>`
      : mode === "preview" ? '<div class="lk-bio__empty">Your links will appear here</div>' : "";
    // Inside a phone frame the page gets an iOS-style status bar that stays pinned (content scrolls under it).
    const status = mode === "preview"
      ? `<div class="lk-bio__status" aria-hidden="true"><span>9:41</span><span class="lk-bio__status-icons"><svg viewBox="0 0 18 12" width="17" height="11"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg><svg viewBox="0 0 16 12" width="15" height="11"><path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0L8 11.5Zm-4.2-4.3L2.3 5.7a8 8 0 0 1 11.4 0l-1.5 1.5a5.9 5.9 0 0 0-8.4 0ZM.4 3.9-.4 3.1a11 11 0 0 1 16.8 0l-.8.8-.7.7a9.9 9.9 0 0 0-13.8 0l-.7-.7Z"/></svg><svg viewBox="0 0 27 12" width="25" height="12"><rect x=".5" y=".5" width="22" height="11" rx="3.2" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="16" height="8" rx="2"/><path d="M24 4v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2Z" opacity=".45"/></svg></span></div>`
      : "";
    const face = `<span class="lk-bio__avatar">${page.avatar ? `<img src="${page.avatar}" alt="">` : L.esc(L.initials(name))}</span>`;
    const head = edit
      ? `<div class="lk-bio__head">
          <button type="button" class="lk-bio__avatar-wrap" data-edit="profile" data-focus="photo" aria-label="Edit photo, name and bio">${face}${pen}</button>
          <button type="button" class="lk-bio__name lk-bio__tap" data-edit="profile" data-focus="pf-name">${page.displayName.trim() ? L.esc(name) : '<span class="lk-bio__placeholder">Your name</span>'}</button>
          <button type="button" class="lk-bio__text lk-bio__tap" data-edit="profile" data-focus="pf-bio">${page.bio.trim() ? L.esc(page.bio) : '<span class="lk-bio__placeholder">Add a short bio</span>'}</button></div>`
      : `${face}<h1 class="lk-bio__name">${L.esc(name)}</h1>${page.bio.trim() ? `<p class="lk-bio__text">${L.esc(page.bio)}</p>` : ""}`;
    // The footer doubles as the invitation: "Get yours like <name>".
    const badgeInner = `<span class="lk-bio__badge-mark">L</span><span>Get yours like <b>${L.esc(name)}</b></span>`;
    const badge = edit ? `<span class="lk-bio__badge">${badgeInner}</span>` : `<a class="lk-bio__badge" href="#/" data-bio-badge>${badgeInner}</a>`;
    return `<div class="lk-bio ${mode === "public" ? "lk-bio--page" : mode === "edit" ? "lk-bio--edit" : "lk-bio--phone"}" style="${L.esc(style)}">${status}<div class="lk-bio__inner">
      ${head}
      ${links}
      ${socials}
      <div class="lk-bio__foot">${badge}</div>
    </div></div>`;
  };
  L.phone = (inner, cls = "") => `<div class="lk-phone ${cls}"><div class="lk-phone__screen" data-phone-screen>${inner}</div><span class="lk-phone__home" aria-hidden="true"></span></div>`;

  // ── Validation helpers (mirror production rules) ──────────────────────────
  L.normalizeUrl = (raw) => {
    const v = raw.trim();
    if (!v) return { error: "Add a URL" };
    if (/^mailto:|@/.test(v) && !/\//.test(v)) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.replace(/^mailto:/, "")) ? { url: v } : { error: "That email doesn't look right" };
    const withProto = /^https?:\/\//i.test(v) ? v : "https://" + v;
    try {
      const u = new URL(withProto);
      if (!u.hostname.includes(".") || /\s/.test(v)) return { error: "Enter a full address, like yoursite.com" };
      return { url: v.replace(/^https?:\/\//i, "").replace(/\/$/, "") };
    } catch { return { error: "Enter a full address, like yoursite.com" }; }
  };
  L.titleFromUrl = (url) => {
    const host = url.replace(/^https?:\/\//, "").split(/[/?#]/)[0].replace(/^www\./, "");
    const known = { "youtube.com": "YouTube", "youtu.be": "YouTube", "instagram.com": "Instagram", "tiktok.com": "TikTok", "substack.com": "Newsletter", "spotify.com": "Spotify", "etsy.com": "Etsy shop", "patreon.com": "Patreon" };
    for (const [k, v] of Object.entries(known)) if (host.endsWith(k)) return v;
    const word = host.split(".").slice(-2, -1)[0] || host;
    return word.charAt(0).toUpperCase() + word.slice(1);
  };
  L.checkSlug = (slug, current) => {
    const s = slug.trim().toLowerCase();
    if (!s) return { error: "Choose a username" };
    if (s.length < 3) return { error: "Use at least 3 characters" };
    if (s.length > L.LIMITS.slugMax) return { error: `Use at most ${L.LIMITS.slugMax} characters` };
    if (!/^[a-z0-9](?:[a-z0-9_.-]*[a-z0-9])?$/.test(s)) return { error: "Use letters, numbers, dots, dashes or underscores" };
    if (s === current) return { ok: "This is your current address" };
    if (L.RESERVED.includes(s)) return { error: "That username is reserved" };
    if (L.TAKEN.includes(s)) return { error: `linkee.bio/${s} is taken`, suggest: `${s}.studio` };
    return { ok: `linkee.bio/${s} is available` };
  };
})();
