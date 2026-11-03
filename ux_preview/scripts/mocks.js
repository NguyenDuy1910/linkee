/* Detailed stand-ins for everything that happens OUTSIDE Linkee: Meta OAuth consent screens,
   Instagram / Facebook post views, the /go/<id> redirect and the OS file picker. Each is labeled
   "Simulated" so reviewers never confuse it with Linkee UI. */
(function () {
  const L = window.L;
  const { esc, icon } = L;

  // ── Mock browser chrome (signals "you left Linkee") ──────────────────────
  const chrome = (url, { secure = true } = {}) =>
    `<div class="lk-mockbar" aria-hidden="true"><span class="lk-mockbar__dots"><i></i><i></i><i></i></span><span class="lk-mockbar__url">${secure ? icon("lock") : ""}<span data-mock-url>${esc(url)}</span></span>${L.chip("Simulated", "warning")}</div>`;
  L.mockChrome = chrome;

  // ── Meta OAuth consent ────────────────────────────────────────────────────
  // Resolves to { ok: true, pages? } | { ok: false, reason: "cancelled" | "personal" }.
  L.consent = function (provider, { reconnect } = {}) {
    const ig = provider === "INSTAGRAM";
    const s = L.state;
    return new Promise((resolve) => {
      let account = "pro"; // pro | personal
      const handle = ig ? (s.accounts.find((a) => a.provider === "INSTAGRAM")?.handle || `${s.user.slug || "you"}.studio`) : null;
      const pages = [
        { id: "p1", name: s.user.name ? `${s.user.name.split(" ")[0]}'s Studio` : "Your Studio", meta: "Artist · 2.1K followers", on: true },
        { id: "p2", name: "Studio Classes PDX", meta: "Education · 640 followers", on: false },
      ];
      if (s.persona !== "new") pages[0].name = "Maya Rivers Ceramics";
      const igBody = () => `${chrome("instagram.com/oauth/authorize?client_id=linkee&scope=instagram_business_basic,…")}
        <div class="lk-consent">
          <div class="lk-consent__brand lk-net-ig">${icon("logo-instagram", "lk-icon--xl")}</div>
          <div class="lk-consent__title">Log in to continue to <strong>Linkee</strong></div>
          <div class="lk-consent__acct" data-consent-acct>
            ${L.avatar(account === "pro" ? s.user.name || "You" : "Personal", { size: 40, img: account === "pro" ? s.page.avatar : null })}
            <div class="lk-grow"><div style="font-weight:600">@${esc(account === "pro" ? handle : (s.user.slug || "you") + ".personal")}</div><div class="lk-xs lk-muted">${account === "pro" ? "Professional account · Creator" : "Personal account"}</div></div>
            <button type="button" class="lk-textlink lk-xs" data-consent="switch">${account === "pro" ? "Not you?" : "Use professional"}</button>
          </div>
          <div class="lk-consent__perm"><div class="lk-xs lk-muted" style="margin-bottom:8px">Linkee is requesting permission to:</div>
            ${["Access your profile name and photo", "Read and reply to comments on your posts", "Publish posts to your account"].map((t) => `<div class="lk-row lk-small" style="gap:10px;padding:4px 0">${icon("check")}${t}</div>`).join("")}</div>
          <div class="lk-consent__actions"><button type="button" class="lk-consent__allow" data-consent="allow">Allow</button><button type="button" class="lk-consent__cancel" data-consent="cancel">Cancel</button></div>
          <p class="lk-xs lk-muted" style="margin:0;text-align:center">This screen belongs to Instagram. Linkee never sees your password.</p>
        </div>`;
      const fbBody = () => `${chrome("facebook.com/v21.0/dialog/oauth?client_id=linkee&scope=pages_show_list,pages_manage_posts,…")}
        <div class="lk-consent">
          <div class="lk-consent__brand lk-net-fb">${icon("logo-facebook", "lk-icon--xl")}</div>
          <div class="lk-consent__title">Choose the Pages <strong>Linkee</strong> can post to</div>
          <div class="lk-stack lk-stack--sm" style="width:100%">${pages.map((p) => `<button type="button" class="lk-consent__page" data-page="${p.id}" aria-pressed="${p.on}">${L.avatar(p.name, { size: 36 })}<span class="lk-grow" style="text-align:left"><span style="display:block;font-weight:600;font-size:14px">${esc(p.name)}</span><span class="lk-xs lk-muted">${esc(p.meta)}</span></span><span class="lk-dest__check">${icon("check")}</span></button>`).join("")}</div>
          <div class="lk-consent__perm"><div class="lk-xs lk-muted" style="margin-bottom:8px">Linkee will be able to:</div>
            ${["See the Pages you manage", "Create posts on the Pages you choose", "Upload videos to those Pages"].map((t) => `<div class="lk-row lk-small" style="gap:10px;padding:4px 0">${icon("check")}${t}</div>`).join("")}</div>
          <div class="lk-consent__actions"><button type="button" class="lk-consent__allow lk-consent__allow--fb" data-consent="allow">Continue</button><button type="button" class="lk-consent__cancel" data-consent="cancel">Cancel</button></div>
          <p class="lk-xs lk-muted" style="margin:0;text-align:center">This screen belongs to Facebook. You can change Page access later in Facebook settings.</p>
        </div>`;
      let settled = false;
      const m = L.modal({
        title: reconnect ? `Reconnect ${ig ? "Instagram" : "Facebook"}` : ig ? "Instagram" : "Facebook",
        size: "md",
        body: `<div data-consent-root>${ig ? igBody() : fbBody()}</div>`,
        onMount(dialog, api) {
          dialog.classList.add("lk-consent-dialog");
          dialog.addEventListener("click", (e) => {
            const b = e.target.closest("[data-consent], [data-page]");
            if (!b) return;
            if (b.dataset.page) {
              const p = pages.find((x) => x.id === b.dataset.page);
              p.on = !p.on;
              b.setAttribute("aria-pressed", p.on);
              L.$('[data-consent="allow"]', dialog).disabled = !pages.some((x) => x.on);
              return;
            }
            const a = b.dataset.consent;
            if (a === "switch") { account = account === "pro" ? "personal" : "pro"; L.$("[data-consent-root]", dialog).innerHTML = igBody(); return; }
            settled = true;
            api.close();
            if (a === "cancel") resolve({ ok: false, reason: "cancelled" });
            else if (ig && account === "personal") resolve({ ok: false, reason: "personal" });
            else resolve({ ok: true, pages: pages.filter((x) => x.on) });
          });
        },
      });
      // Closing the window (×, Esc, click outside) = the user abandoned the provider screen.
      const close = m.close;
      m.close = (immediate) => { close(immediate); if (!settled) { settled = true; resolve({ ok: false, reason: "cancelled" }); } };
    });
  };

  // ── Instagram post view ───────────────────────────────────────────────────
  L.igPostViewer = function ({ art, caption, handle, highlight, comments = [], likes = 248, when = "2h" }) {
    const s = L.state;
    const list = comments.map((c) => `<div class="lk-igc ${c.id === highlight ? "lk-igc--hl" : ""}">${L.avatar(c.user, { size: 28 })}<div class="lk-grow"><div><strong>${esc(c.user)}</strong> ${esc(c.text)}</div><div class="lk-xs lk-muted">${esc(c.age)} · Reply</div>
      ${c.reply ? `<div class="lk-igc lk-igc--reply">${L.avatar(s.user.name, { size: 24, img: s.page.avatar })}<div><div><strong>${esc(handle)}</strong> ${esc(c.reply.text)}</div><div class="lk-xs lk-muted">${esc(c.reply.when || "1h")}</div></div></div>` : ""}</div></div>`).join("");
    L.modal({
      title: "Instagram",
      size: "md",
      body: `${chrome(`instagram.com/p/${art}${Math.abs([...caption].reduce((a, c) => a + c.charCodeAt(0), 0)) % 9000}`)}
        <div class="lk-igpost">
          <div class="lk-pv__head" style="padding:10px 0">${L.avatar(s.user.name, { size: 30, img: s.page.avatar })}<strong style="font-size:13px">${esc(handle)}</strong><span class="lk-xs lk-muted">· ${esc(when)}</span></div>
          <img src="${L.art(art)}" alt="" class="lk-igpost__img">
          <div class="lk-pv__icons" style="padding:10px 0 4px">${icon("heart", "lk-icon--lg")}${icon("comment", "lk-icon--lg")}${icon("paper-plane", "lk-icon--lg")}<span style="margin-left:auto">${icon("bookmark", "lk-icon--lg")}</span></div>
          <div class="lk-small" style="font-weight:600">${L.fmt(likes)} likes</div>
          <div class="lk-small" style="margin-top:4px"><strong>${esc(handle)}</strong> ${esc(caption)}</div>
          ${list ? `<div class="lk-igcomments">${list}</div>` : ""}
        </div>`,
      buttons: [{ label: "Close", variant: "tertiary" }],
    });
  };
  L.igProfileViewer = function ({ handle, highlightArt, onDecision }) {
    const s = L.state;
    const arts = [highlightArt, "plates", "kiln", "jar", "mugs", "vase", "bowl", "studio", "tiles"].filter((v, i, a) => a.indexOf(v) === i).slice(0, 9);
    L.modal({
      title: "Instagram",
      size: "md",
      body: `${chrome(`instagram.com/${handle}`)}
        <div class="lk-row" style="gap:16px;padding:12px 0">${L.avatar(s.user.name, { size: 56, img: s.page.avatar })}<div><div style="font-weight:600">${esc(handle)}</div><div class="lk-xs lk-muted">128 posts · 18.4K followers</div><div class="lk-small" style="margin-top:4px">${esc(s.page.bio)}</div></div></div>
        <div class="lk-iggrid">${arts.map((a, i) => `<div class="lk-iggrid__tile ${i === 0 ? "lk-iggrid__tile--hl" : ""}"><img src="${L.art(a)}" alt="">${i === 0 ? `<span>${icon("clock")}Oct 24</span>` : ""}</div>`).join("")}</div>
        <p class="lk-small" style="margin:12px 0 0">The newest post on the profile is the glaze-tiles post — Instagram published it even though it didn't confirm back to Linkee.</p>`,
      buttons: [{ label: "Close" }, { label: "It's there — mark as published", variant: "primary", icon: "circle-check", onClick: () => onDecision?.("published") }],
    });
  };
  L.fbPostViewer = function ({ art, caption, page }) {
    L.modal({
      title: "Facebook",
      size: "md",
      body: `${chrome("facebook.com/" + page.toLowerCase().replace(/\s+/g, ""))}
        <div class="lk-pv lk-pv--fb" style="border:0">
          <div class="lk-pv__head" style="padding:12px 0">${L.avatar(page, { size: 36 })}<div><strong style="font-size:14px">${esc(page)}</strong><div class="lk-xs lk-muted lk-row" style="gap:4px">Just now · ${icon("globe", "lk-icon--xs")}</div></div></div>
          <div class="lk-pv__caption" style="padding:0 0 12px">${esc(caption)}</div>
          ${art ? `<img src="${L.art(art)}" alt="" class="lk-igpost__img">` : ""}
          <div class="lk-pv__icons lk-small lk-muted" style="justify-content:space-around;border-top:1px solid var(--separator);padding:10px 0;margin-top:8px"><span class="lk-row" style="gap:6px">${icon("heart")}Like</span><span class="lk-row" style="gap:6px">${icon("comment")}Comment</span><span class="lk-row" style="gap:6px">${icon("arrow-shape-turn-up-right")}Share</span></div>
        </div>`,
      buttons: [{ label: "Close", variant: "tertiary" }],
    });
  };

  // ── Visitor taps a link: /go/<id> → 302 → destination ────────────────────
  L.redirectViewer = function ({ link, slug, before }) {
    const m = L.modal({
      title: "What the visitor sees",
      size: "md",
      body: `${chrome(`linkee.bio/go/${link.id}`)}
        <div class="lk-redirect" data-redirect>
          <div class="lk-redirect__step" data-rs="1">${L.spinner()}<span><strong>linkee.bio/go/${esc(link.id)}</strong> — counting the click</span></div>
          <div class="lk-redirect__step" data-rs="2" hidden>${icon("check")}<span>Click recorded: <span class="lk-num">${L.fmt(before)}</span> → <strong class="lk-num">${L.fmt(before + 1)}</strong></span></div>
          <div class="lk-redirect__step" data-rs="3" hidden>${icon("arrow-right")}<span>302 redirect to <strong>https://${esc(link.url)}</strong></span></div>
          <div class="lk-redirect__site" data-rs="4" hidden><div class="lk-xs lk-muted">${esc(link.url.split("/")[0])}</div><div class="lk-h3" style="margin-top:4px">${esc(link.title)}</div><div class="lk-small lk-muted" style="margin-top:4px">The creator's own website. Visitors leave Linkee here.</div></div>
        </div>`,
      buttons: [{ label: `Back to linkee.bio/${slug}`, variant: "tertiary" }],
    });
    const show = (n) => { const el = L.$(`[data-rs="${n}"]`, m.el); if (el) el.hidden = false; };
    setTimeout(() => { show(2); }, 500);
    setTimeout(() => { show(3); const u = L.$("[data-mock-url]", m.el); if (u) u.textContent = link.url; const sp = L.$('[data-rs="1"] svg', m.el); if (sp) sp.outerHTML = icon("check"); }, 950);
    setTimeout(() => show(4), 1300);
  };

  // ── OS file picker (stand-in) ─────────────────────────────────────────────
  const MB = 1024 * 1024;
  L.FILES = [
    { id: "f1", name: "moon-jar.jpg", art: "jar", kind: "IMAGE", mime: "image/jpeg", size: 2.4 * MB, w: 1080, h: 1080 },
    { id: "f2", name: "spring-plates.jpg", art: "plates", kind: "IMAGE", mime: "image/jpeg", size: 3.1 * MB, w: 1080, h: 1350 },
    { id: "f3", name: "mugs-morning.jpg", art: "mugs", kind: "IMAGE", mime: "image/jpeg", size: 1.9 * MB, w: 1080, h: 1080 },
    { id: "f4", name: "blue-vase.png", art: "vase", kind: "IMAGE", mime: "image/png", size: 3.4 * MB, w: 1080, h: 1080 },
    { id: "f5", name: "bowl-detail.webp", art: "bowl", kind: "IMAGE", mime: "image/webp", size: 1.2 * MB, w: 1080, h: 1080 },
    { id: "f6", name: "kiln-opening.mp4", art: "kiln", kind: "VIDEO", mime: "video/mp4", size: 48 * MB, w: 1080, h: 1920, dur: "0:32" },
    { id: "f7", name: "story-screenshot.png", art: "tiles", kind: "IMAGE", mime: "image/png", size: 1.8 * MB, w: 1080, h: 1920 },
    { id: "f8", name: "studio-tour.mov", art: "studio", kind: "VIDEO", mime: "video/quicktime", size: 1240 * MB, w: 1920, h: 1080, dur: "8:12" },
    { id: "f9", name: "panorama.jpg", art: "studio", kind: "IMAGE", mime: "image/jpeg", size: 9.6 * MB, w: 4000, h: 1200 },
    { id: "f10", name: "price-list.pdf", art: null, kind: "FILE", mime: "application/pdf", size: 0.3 * MB },
  ];
  const fmtSize = (b) => (b >= 1024 * MB ? `${(b / 1024 / MB).toFixed(1)} GB` : b >= MB ? `${(b / MB).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);
  L.fmtSize = fmtSize;
  /** Mirrors UPLOAD_RULES in lib/publishing-rules.ts (what the upload endpoint rejects). */
  L.uploadError = (f) => {
    if (!["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"].includes(f.mime)) return "isn't a supported file. Use JPG, PNG, WEBP, MP4 or MOV.";
    if (f.kind === "IMAGE" && f.size > 8 * MB) return "is larger than 8 MB.";
    if (f.kind === "VIDEO" && f.size > 100 * MB) return "is larger than 100 MB.";
    return null;
  };
  L.filePicker = function ({ onPick, preselect = [] }) {
    const picked = new Set(preselect);
    L.modal({
      title: "Choose photos or a video",
      description: "Your device's file picker opens here. Pick up to 10.",
      size: "lg",
      body: `<div class="lk-picker" role="listbox" aria-multiselectable="true">${L.FILES.map((f) => `<button type="button" class="lk-picker__file" role="option" aria-selected="${picked.has(f.id)}" data-file="${f.id}">
          <span class="lk-picker__thumb">${f.art ? `<img src="${L.art(f.art)}" alt="">` : icon("tray", "lk-icon--xl")}${f.kind === "VIDEO" ? `<span class="lk-picker__dur">${icon("circle-play")}${f.dur}</span>` : ""}<span class="lk-picker__check">${icon("check")}</span></span>
          <span class="lk-picker__name lk-ellipsis">${esc(f.name)}</span>
          <span class="lk-picker__meta">${fmtSize(f.size)}${f.w ? ` · ${f.w}×${f.h}` : ""}</span></button>`).join("")}</div>`,
      buttons: [{ label: "Cancel" }, { label: "Add", variant: "primary", onClick: () => { onPick(L.FILES.filter((f) => picked.has(f.id))); } }],
      onMount(dialog) {
        const addBtn = L.$('[data-modal-btn="1"]', dialog);
        addBtn.dataset.pickerAdd = "";
        const sync = () => { addBtn.disabled = !picked.size; addBtn.querySelector("span").textContent = picked.size ? `Add ${picked.size} ${picked.size === 1 ? "file" : "files"}` : "Add"; };
        sync();
        dialog.addEventListener("click", (e) => {
          const f = e.target.closest("[data-file]");
          if (!f) return;
          const id = f.dataset.file;
          if (picked.has(id)) picked.delete(id); else picked.add(id);
          f.setAttribute("aria-selected", picked.has(id));
          sync();
        });
      },
    });
  };
})();
