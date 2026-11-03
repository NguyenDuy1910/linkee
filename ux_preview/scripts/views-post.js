/* Publish — Post to All. One caption + media → Instagram and Facebook Pages, status per destination. */
(function () {
  const L = window.L;
  const { esc, icon, btn } = L;
  let pv = "INSTAGRAM"; // preview tab
  let run = null; // { caption, media, targets: [{account, status, error}] } while/after publishing
  let touched = false;
  let savedAt = null;
  let owner = null; // the run panel belongs to one session state; a new scenario starts clean

  const connected = (s) => s.accounts.filter((a) => a.status === "CONNECTED");
  const acct = (s, id) => s.accounts.find((a) => a.id === id);

  // ── Rules (mirror lib/publishing-rules.ts) ────────────────────────────────
  function validate(s) {
    const d = s.draft;
    const sel = d.destinations.map((id) => acct(s, id)).filter((a) => a && a.status === "CONNECTED");
    const media = d.media;
    const videos = media.filter((m) => m.kind === "VIDEO").length;
    const out = [];
    if (!sel.length) out.push({ net: null, level: "error", text: "Select at least one destination." });
    if (sel.some((a) => a.provider === "INSTAGRAM")) {
      const e = [], w = [];
      const count = (re) => (d.caption.match(re) || []).length;
      const hashtags = count(/(^|\s)#[\p{L}\p{N}_]+/gu), mentions = count(/(^|\s)@[A-Za-z0-9._]+/g);
      if (!media.length) e.push("Instagram needs at least one photo or video.");
      if (media.length > L.LIMITS.maxMedia) e.push(`Instagram carousels can include up to ${L.LIMITS.maxMedia} photos or videos.`);
      if (d.caption.length > L.LIMITS.captionIG) e.push(`Caption is ${L.fmt(d.caption.length)} characters; Instagram allows ${L.fmt(L.LIMITS.captionIG)}.`);
      if (hashtags > 30) e.push(`Instagram allows up to 30 hashtags; this caption has ${hashtags}.`);
      if (mentions > 20) e.push(`Instagram allows up to 20 @mentions; this caption has ${mentions}.`);
      media.forEach((m, i) => {
        if (m.kind !== "IMAGE" || !m.w) return;
        const r = m.w / m.h, label = `Photo ${i + 1}`, shown = `${r.toFixed(2)}:1`;
        if (r < 0.8 - 0.005) e.push(`${label} is too tall (${shown}). Instagram feed photos must be between 4:5 and 1.91:1.`);
        else if (r > 1.91 + 0.005) e.push(`${label} is too wide (${shown}). Instagram feed photos must be between 4:5 and 1.91:1.`);
      });
      if (media.length === 1 && videos === 1) w.push("This video will be published as a Reel.");
      const ratios = new Set(media.filter((m) => m.kind === "IMAGE" && m.w).map((m) => (m.w / m.h).toFixed(2)));
      if (media.length > 1 && ratios.size > 1) w.push("Instagram crops every carousel item to the shape of the first one.");
      e.forEach((t) => out.push({ net: "INSTAGRAM", level: "error", text: t }));
      w.forEach((t) => out.push({ net: "INSTAGRAM", level: "warning", text: t }));
    }
    if (sel.some((a) => a.provider === "FACEBOOK")) {
      if (!media.length && !d.caption.trim()) out.push({ net: "FACEBOOK", level: "error", text: "Add text, photos or a video to post on Facebook." });
      if (videos && videos < media.length) out.push({ net: "FACEBOOK", level: "error", text: "Facebook posts can't mix photos and videos. Use photos only, or a single video." });
      else if (videos > 1) out.push({ net: "FACEBOOK", level: "error", text: "Facebook Pages can publish one video per post." });
    }
    if (media.some((m) => m.progress < 100)) out.push({ net: null, level: "pending", text: "Waiting for uploads to finish…" });
    return { sel, out, ok: sel.length > 0 && !out.some((x) => x.level === "error" || x.level === "pending") };
  }

  // ── Pieces ────────────────────────────────────────────────────────────────
  const destBtn = (a, on) => `<button type="button" class="lk-dest__btn" aria-pressed="${on}" data-dest="${a.id}"><span class="lk-dest__avatar">${L.avatar(a.name, { size: 28, img: a.provider === "INSTAGRAM" ? L.state.page.avatar : null })}${L.netLogo(a.provider)}</span><span>${a.provider === "INSTAGRAM" ? "@" + esc(a.handle) : esc(a.name)}</span><span class="lk-dest__check">${icon("check")}</span></button>`;
  function mediaHTML(s) {
    const m = s.draft.media;
    if (!m.length)
      return `<button type="button" class="lk-drop" data-action="add-photo" data-drop><span class="lk-empty__icon" style="margin:0">${icon("cloud-arrow-up-in", "lk-icon--lg")}</span><span style="font-weight:500;font-size:14px">Add photos or a video</span><span class="lk-xs lk-muted">Drag files here or click to choose · up to 10</span><span class="lk-xs lk-muted">JPG, PNG, WEBP up to 8 MB · MP4, MOV up to 100 MB</span></button>`;
    return `<div class="lk-media" data-drop>${m.map((x, i) => `<div class="lk-media__item" data-media="${x.id}" ${x.progress < 100 ? 'data-uploading="true"' : ""}>
        <img src="${L.art(x.art)}" alt="${x.kind === "VIDEO" ? "Video" : "Photo"} ${i + 1}">
        <span class="lk-media__idx">${x.kind === "VIDEO" ? icon("circle-play") : i + 1}</span>
        ${x.progress < 100 ? `<span class="lk-media__bar" role="progressbar" aria-label="Uploading" aria-valuenow="${x.progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${x.progress}%"></i></span>` : `<span class="lk-media__tools">${i > 0 ? `<button type="button" class="lk-media__tool" data-action="media-left" aria-label="Move earlier">${icon("chevron-left")}</button>` : ""}<button type="button" class="lk-media__tool" data-action="media-remove" aria-label="Remove ${x.kind === "VIDEO" ? "video" : "photo"} ${i + 1}">${icon("xmark")}</button></span>`}
      </div>`).join("")}${m.length < L.LIMITS.maxMedia ? `<button type="button" class="lk-media__add" data-action="add-photo" aria-label="Add another photo">${icon("plus", "lk-icon--lg")}</button>` : ""}</div>`;
  }
  function checksHTML(s) {
    const v = validate(s);
    if (!touched && !s.draft.media.length && !s.draft.caption) return "";
    const rows = v.out.map((c) => `<div class="lk-check lk-check--${c.level === "pending" ? "warning" : c.level}">${c.level === "pending" ? L.spinner() : icon(c.level === "error" ? "circle-exclamation" : "triangle-exclamation")}<span>${c.net ? `<strong style="font-weight:500">${c.net === "INSTAGRAM" ? "Instagram" : "Facebook"}:</strong> ` : ""}${esc(c.text)}</span></div>`);
    if (v.ok) rows.unshift(`<div class="lk-check lk-check--ok">${icon("circle-check")}<span>Ready to publish to ${v.sel.length === 1 ? "1 place" : v.sel.length + " places"}.</span></div>`);
    return `<div class="lk-checks" aria-live="polite">${rows.join("")}</div>`;
  }
  const highlight = (t) => esc(t).replace(/(^|\s)([#@][\p{L}\p{N}_.]+)/gu, '$1<span class="lk-tag">$2</span>');
  function previewHTML(s) {
    const v = validate(s);
    const nets = [...new Set(v.sel.map((a) => a.provider))];
    if (!nets.length) return `<div class="lk-pv" style="padding:32px 20px;text-align:center"><p class="lk-small lk-muted" style="margin:0">Select a destination to see a preview.</p></div>`;
    if (!nets.includes(pv)) pv = nets[0];
    const d = s.draft;
    const first = d.media[0];
    const tabs = nets.length > 1 ? L.seg("pv", [{ id: "INSTAGRAM", label: "Instagram", icon: "logo-instagram" }, { id: "FACEBOOK", label: "Facebook", icon: "logo-facebook" }], pv, { full: true, size: "sm", label: "Preview" }) : "";
    const media = first ? `<div class="lk-pv__media"><img src="${L.art(first.art)}" alt="">${first.kind === "VIDEO" ? `<span class="lk-pv__count">${pv === "INSTAGRAM" && d.media.length === 1 ? "Reel" : "Video"}</span>` : ""}${d.media.length > 1 ? (pv === "INSTAGRAM" ? `<span class="lk-pv__count">1/${d.media.length}</span><span class="lk-pv__dots">${d.media.map(() => "<i></i>").join("")}</span>` : `<span class="lk-pv__count">+${d.media.length - 1}</span>`) : ""}</div>` : `<div class="lk-pv__media">${icon("picture", "lk-icon--xl")}</div>`;
    const capIG = d.caption.length > 125 ? `${highlight(d.caption.slice(0, 125))}<span class="lk-pv__more">… more</span>` : highlight(d.caption);
    const ig = v.sel.find((a) => a.provider === "INSTAGRAM"), fb = v.sel.find((a) => a.provider === "FACEBOOK");
    const body = pv === "INSTAGRAM"
      ? `<div class="lk-pv"><div class="lk-pv__head">${L.avatar(ig.name, { size: 30, img: s.page.avatar })}<strong style="font-size:13px">${esc(ig.handle)}</strong><span style="margin-left:auto" class="lk-muted">${icon("ellipsis")}</span></div>${media}
        <div class="lk-pv__icons">${icon("heart", "lk-icon--lg")}${icon("comment", "lk-icon--lg")}${icon("paper-plane", "lk-icon--lg")}<span style="margin-left:auto">${icon("bookmark", "lk-icon--lg")}</span></div>
        <div class="lk-pv__caption">${d.caption ? `<strong>${esc(ig.handle)}</strong> ${capIG}` : '<span class="lk-muted">Your caption will appear here.</span>'}</div></div>`
      : `<div class="lk-pv lk-pv--fb"><div class="lk-pv__head">${L.avatar(fb.name, { size: 30 })}<div><strong style="font-size:13px">${esc(fb.name)}</strong><div class="lk-xs lk-muted lk-row" style="gap:4px">Just now · ${icon("globe", "lk-icon--xs")}</div></div></div>
        <div class="lk-pv__caption">${d.caption ? highlight(d.caption) : '<span class="lk-muted">Your post text will appear here.</span>'}</div>${d.media.length ? media : ""}
        <div class="lk-pv__icons lk-small lk-muted" style="justify-content:space-around;border-top:1px solid var(--separator);padding:8px 12px"><span class="lk-row" style="gap:6px">${icon("heart")}Like</span><span class="lk-row" style="gap:6px">${icon("comment")}Comment</span><span class="lk-row" style="gap:6px">${icon("arrow-shape-turn-up-right")}Share</span></div></div>`;
    return `${tabs}${body}`;
  }
  function composerHTML(s) {
    const v = validate(s);
    const accts = s.accounts;
    const ig = v.sel.some((a) => a.provider === "INSTAGRAM");
    const max = ig ? L.LIMITS.captionIG : L.LIMITS.captionFB;
    return `<section class="card lk-card" data-composer aria-label="New post">
      <div class="lk-field"><span class="label" id="dest-label">Post to</span><div class="lk-dest" role="group" aria-labelledby="dest-label">
        ${accts.map((a) => (a.status === "CONNECTED" ? destBtn(a, s.draft.destinations.includes(a.id)) : `<span class="lk-dest__btn" aria-disabled="true" style="cursor:default;opacity:.8"><span class="lk-dest__avatar">${L.avatar(a.name, { size: 28 })}${L.netLogo(a.provider)}</span>${a.provider === "INSTAGRAM" ? "@" + esc(a.handle) : esc(a.name)} ${btn({ label: "Reconnect", variant: "ghost", size: "sm", action: "reconnect", attrs: { "data-provider": a.provider } })}</span>`)).join("")}
        ${btn({ label: "Add account", icon: "plus", variant: "ghost", size: "sm", action: "add-account", attrs: { "aria-haspopup": "menu" } })}
      </div></div>
      <div class="lk-field"><span class="label">Photos & video</span><div data-media-host>${mediaHTML(s)}</div><div data-upload-errors></div></div>
      <div class="lk-field" data-field="caption"><label class="label" for="caption">Caption</label>
        <textarea class="textarea textarea--secondary" id="caption" rows="5" placeholder="What do you want to share?">${esc(s.draft.caption)}</textarea>
        <div class="lk-field__meta"><span class="description">Hashtags and @mentions work on both networks.</span><span class="lk-field__count" data-count-for="caption" ${s.draft.caption.length > max ? 'data-over="true"' : ""}>${L.fmt(s.draft.caption.length)}/${L.fmt(max)}</span></div></div>
      <div data-checks>${checksHTML(s)}</div>
      <div class="lk-composer-foot"><span class="lk-composer-foot__status" data-saved>${savedAt ? `${icon("check")}Draft saved` : ""}</span>
        ${btn({ label: "Save draft", variant: "ghost", action: "save-draft" })}
        ${btn({ label: publishLabel(v), icon: "paper-plane", variant: "primary", action: "publish", disabled: !v.ok })}</div>
    </section>`;
  }
  const publishLabel = (v) => (v.sel.length > 1 ? `Publish to ${v.sel.length} places` : v.sel.length === 1 ? `Publish to ${v.sel[0].provider === "INSTAGRAM" ? "Instagram" : "Facebook"}` : "Publish");

  const STATUS = {
    PENDING: () => L.chip("Waiting", "default"),
    PUBLISHING: () => `<span class="chip chip--sm chip--soft chip--accent">${L.spinner()}<span class="chip__label">Publishing</span></span>`,
    PUBLISHED: () => L.chip("Published", "success", { dot: true }),
    FAILED: () => L.chip("Failed", "danger", { dot: true }),
    UNCONFIRMED: () => L.chip("Check before retrying", "warning", { dot: true }),
  };
  function resultsHTML(s) {
    const finished = run.targets.every((t) => ["PUBLISHED", "FAILED", "UNCONFIRMED"].includes(t.status));
    const failed = run.targets.filter((t) => t.status === "FAILED").length;
    const title = !finished ? "Publishing your post…" : failed ? `Published with ${failed === 1 ? "1 issue" : failed + " issues"}` : "Your post is live";
    return `<section class="card lk-card" data-results aria-live="polite">
      <div class="lk-row" style="gap:14px"><img class="lk-thumb" src="${L.art(run.media[0]?.art || "studio")}" width="56" height="56" alt=""><div class="lk-grow"><h2 class="lk-h3">${title}</h2><p class="lk-sub lk-ellipsis" style="margin-top:2px">${esc(run.caption || "No caption")}</p></div></div>
      <div class="lk-results">${run.targets.map((t, i) => { const a = acct(s, t.account); return `<div class="lk-result" data-target="${i}"><span class="lk-dest__avatar">${L.avatar(a.name, { size: 28, img: a.provider === "INSTAGRAM" ? s.page.avatar : null })}${L.netLogo(a.provider)}</span>
        <div><div style="font-size:14px;font-weight:500">${a.provider === "INSTAGRAM" ? "Instagram · @" + esc(a.handle) : "Facebook · " + esc(a.name)}</div>${t.error ? `<div class="lk-result__msg lk-result__msg--error">${esc(t.error)}</div>` : t.status === "PUBLISHED" ? '<div class="lk-result__msg">Published just now</div>' : ""}</div>
        <div class="lk-row">${STATUS[t.status]()}${t.status === "FAILED" ? btn({ label: "Retry", icon: "arrows-rotate-right", variant: "tertiary", size: "sm", action: "retry-run", attrs: { "data-i": i } }) : ""}${t.status === "PUBLISHED" ? btn({ label: "View post", iconOnly: true, icon: "arrow-up-right-from-square", variant: "ghost", size: "sm", action: "view-post" }) : ""}</div></div>`; }).join("")}</div>
      ${finished ? `<div class="lk-row" style="justify-content:flex-end">${btn({ label: "Create another post", icon: "plus", variant: finished && !failed ? "primary" : "tertiary", action: "new-post" })}</div>` : ""}
    </section>`;
  }
  function historyHTML(s) {
    if (!s.history.length) return "";
    return `<section class="card lk-card lk-card--flush" style="margin-top:24px" aria-labelledby="recent-title"><div class="lk-card__head lk-card__head--pad"><div><h2 class="lk-h3" id="recent-title">Recent posts</h2><p class="lk-sub" style="margin-top:2px">Each destination keeps its own status.</p></div></div>
      <div class="lk-history">${s.history.map((h) => `<div class="lk-hist" data-hist="${h.id}"><img class="lk-hist__thumb" src="${L.art(h.art)}" alt="">
        <div style="min-width:0"><div class="lk-hist__caption lk-ellipsis">${esc(h.caption)}</div><div class="lk-xs lk-muted" style="margin-top:2px">${esc(h.when)}</div>
          <div class="lk-hist__targets">${h.targets.map((t, i) => { const a = acct(s, t.account) || { provider: "INSTAGRAM", name: "Removed account" }; const net = a.provider === "INSTAGRAM" ? "Instagram" : "Facebook"; return `<span class="lk-row" style="gap:4px" ${t.error ? `title="${esc(t.error)}"` : ""}>${t.status === "PUBLISHED" ? L.chip(net, "success", { dot: true }) : t.status === "FAILED" ? L.chip(`${net} failed`, "danger", { dot: true }) : t.status === "UNCONFIRMED" ? L.chip(`${net}: check first`, "warning", { dot: true }) : STATUS[t.status]()}${t.status === "FAILED" ? btn({ label: "Retry", variant: "ghost", size: "sm", action: "retry-hist", attrs: { "data-i": i } }) : ""}${t.status === "UNCONFIRMED" ? btn({ label: "Options", iconOnly: true, icon: "ellipsis", variant: "ghost", size: "sm", action: "unconfirmed", attrs: { "data-i": i, "aria-haspopup": "menu" } }) : ""}</span>`; }).join("")}</div>
          ${h.targets.some((t) => t.error) ? `<div class="lk-xs" style="margin-top:6px;color:var(--muted)">${esc(h.targets.find((t) => t.error).error)}</div>` : ""}</div>
      </div>`).join("")}</div></section>`;
  }

  L.views.post = {
    title: "Publish — Linkee",
    enter(s) { touched = false; if (owner !== s) { owner = s; run = null; savedAt = null; } },
    render(s) {
      const head = `<div class="lk-pagehead"><div><h1 class="lk-h1">Publish</h1><p class="lk-sub">Write once and post to Instagram and Facebook together.</p></div></div>`;
      if (!L.isPro())
        return `${head}<section class="card lk-card lk-gate"><div class="lk-stack"><div>${L.chip("Pro", "accent", { icon: "sparkles" })}</div><h2 class="lk-h2">Post to Instagram and Facebook at once</h2>
          <p class="lk-sub" style="margin:0">One caption, one set of photos, every place you post. If one network has a problem, retry just that one.</p>
          <ul class="lk-checklist lk-small" style="margin:0">${["Instagram posts, carousels and Reels", "Facebook Page posts with photos or video", "Status per destination, with retry"].map((t) => `<li>${icon("check")}<span>${t}</span></li>`).join("")}</ul>
          <div>${btn({ label: "Upgrade to Pro", variant: "primary", action: "upgrade" })}</div></div>
          <div class="lk-gate__art" aria-hidden="true"><div class="lk-dest">${destBtn({ id: "x", provider: "INSTAGRAM", name: s.user.name, handle: "maya.makes" }, true)}${destBtn({ id: "y", provider: "FACEBOOK", name: "Maya Rivers Ceramics" }, true)}</div>
          <div class="lk-media" style="grid-template-columns:repeat(3,1fr)">${["plates", "jar", "mugs"].map((a) => `<div class="lk-media__item"><img src="${L.art(a)}" alt=""></div>`).join("")}</div><div class="lk-shimmer" style="width:80%;animation:none"></div><div class="lk-shimmer" style="width:50%;animation:none"></div></div></section>`;
      if (!s.accounts.length)
        return `${head}<section class="card lk-card"><div class="lk-empty"><div class="lk-empty__icon lk-empty__icon--accent">${icon("paper-plane", "lk-icon--lg")}</div><h2>Connect where you post</h2><p>Add your Instagram professional account, a Facebook Page, or both. You'll pick destinations for each post.</p>
          <div class="lk-row lk-row--wrap" style="justify-content:center">${btn({ label: "Connect Instagram", icon: "logo-instagram", variant: "primary", action: "connect-ig" })}${btn({ label: "Connect a Facebook Page", icon: "logo-facebook", variant: "tertiary", action: "connect-fb" })}</div></div></section>`;
      return `${head}<div class="lk-post"><div>${run ? resultsHTML(s) : composerHTML(s)}${historyHTML(s)}</div>
        <aside class="lk-post__aside" aria-label="Preview"><div class="lk-eyebrow">Preview</div><div data-preview>${previewHTML(s)}</div></aside></div>`;
    },
    mount(root, s) {
      const $ = (sel) => L.$(sel, root);
      const d = s.draft;
      const refresh = () => {
        const v = validate(s);
        if ($("[data-checks]")) $("[data-checks]").innerHTML = checksHTML(s);
        const pub = $('[data-action="publish"]');
        if (pub) { pub.disabled = !v.ok; pub.querySelector("span").textContent = publishLabel(v); }
        if ($("[data-preview]")) $("[data-preview]").innerHTML = previewHTML(s);
        const ig = v.sel.some((a) => a.provider === "INSTAGRAM");
        L.updateCount(root, "caption", d.caption.length, ig ? L.LIMITS.captionIG : L.LIMITS.captionFB);
      };
      const paintMedia = () => { $("[data-media-host]").innerHTML = mediaHTML(s); refresh(); };
      // Files from the picker (or a drop) → upload rules → per-file progress.
      const addFiles = (files) => {
        const rejected = [];
        files.forEach((f) => {
          const err = L.uploadError(f) || (d.media.length >= L.LIMITS.maxMedia ? `wasn't added — a post can have up to ${L.LIMITS.maxMedia} items.` : null);
          if (err) return rejected.push(`<li><strong>${esc(f.name)}</strong> ${esc(err)}</li>`);
          const item = { id: L.uid(), art: f.art, kind: f.kind, name: f.name, w: f.w, h: f.h, progress: 4 };
          d.media.push(item);
          const t = setInterval(() => {
            item.progress = Math.min(100, item.progress + (f.kind === "VIDEO" ? 7 : 22));
            const bar = L.$(`[data-media="${item.id}"] .lk-media__bar i`, root);
            if (bar) bar.style.width = item.progress + "%";
            if (item.progress >= 100) { clearInterval(t); if (root.isConnected && $("[data-media-host]")) paintMedia(); }
          }, 160);
          L.onLeave(() => { clearInterval(t); item.progress = 100; });
        });
        touched = true;
        paintMedia();
        $("[data-upload-errors]").innerHTML = rejected.length
          ? `<div style="margin-top:10px">${L.alert({ tone: "danger", title: `${rejected.length === 1 ? "1 file wasn't" : rejected.length + " files weren't"} added`, description: `<ul class="lk-rejects">${rejected.join("")}</ul>` })}</div>`
          : "";
      };
      // Prefill: two valid feed photos not already in the post are preselected.
      const fits = (f) => f.kind === "IMAGE" && !L.uploadError(f) && f.w / f.h >= 0.8 && f.w / f.h <= 1.91 && !d.media.some((m) => m.name === f.name);
      const openPicker = () => L.filePicker({ onPick: addFiles, preselect: L.prefill ? L.FILES.filter(fits).slice(0, 2).map((f) => f.id) : [] });

      L.wireSeg(root, (name, v) => { if (name === "pv") { pv = v; $("[data-preview]").innerHTML = previewHTML(s); } });
      root.addEventListener("input", (e) => { if (e.target.id === "caption") { d.caption = e.target.value; touched = true; savedAt = null; const st = $("[data-saved]"); if (st) st.innerHTML = ""; refresh(); } });
      // Drag & drop onto the media area (any file → photo in the prototype)
      root.addEventListener("dragover", (e) => { const z = e.target.closest("[data-drop]"); if (z) { e.preventDefault(); z.dataset.over = "true"; } });
      root.addEventListener("dragleave", (e) => { const z = e.target.closest("[data-drop]"); if (z) delete z.dataset.over; });
      root.addEventListener("drop", (e) => {
        const z = e.target.closest("[data-drop]");
        if (!z) return;
        e.preventDefault();
        delete z.dataset.over;
        const n = Math.max(1, e.dataTransfer.files.length);
        addFiles(L.FILES.filter((f) => f.kind === "IMAGE" && !L.uploadError(f) && !d.media.some((m) => m.name === f.name)).slice(0, n));
      });

      root.addEventListener("click", async (e) => {
        const dest = e.target.closest("[data-dest]");
        if (dest && root.contains(dest) && !dest.closest(".lk-gate__art")) {
          const id = dest.dataset.dest, on = d.destinations.includes(id);
          d.destinations = on ? d.destinations.filter((x) => x !== id) : [...d.destinations, id];
          dest.setAttribute("aria-pressed", !on);
          touched = true;
          return refresh();
        }
        const a = e.target.closest("[data-action]");
        if (!a) return;
        switch (a.dataset.action) {
          case "upgrade": return L.upgradeModal("Post to All");
          case "connect-ig": return L.connectFlow("INSTAGRAM");
          case "connect-fb": return L.connectFlow("FACEBOOK");
          case "reconnect": return L.connectFlow(a.dataset.provider, { reconnect: true });
          case "add-account": return L.menu(a, [{ label: "Instagram account", icon: "logo-instagram", onClick: () => L.connectFlow("INSTAGRAM") }, { label: "Facebook Page", icon: "logo-facebook", onClick: () => L.connectFlow("FACEBOOK") }]);
          case "add-photo": return openPicker();
          case "media-remove": { const id = a.closest("[data-media]").dataset.media; const i = d.media.findIndex((m) => m.id === id); const [m] = d.media.splice(i, 1); paintMedia(); return L.toast("Removed", { action: { label: "Undo", onClick: () => { d.media.splice(i, 0, m); paintMedia(); } }, duration: 3000 }); }
          case "media-left": { const id = a.closest("[data-media]").dataset.media; const i = d.media.findIndex((m) => m.id === id); [d.media[i - 1], d.media[i]] = [d.media[i], d.media[i - 1]]; return paintMedia(); }
          case "save-draft": await L.pending(a, "Saving…", () => L.sleep(500)); savedAt = Date.now(); $("[data-saved]").innerHTML = `${icon("check")}Draft saved`; return L.toast("Draft saved", { tone: "success", duration: 1800 });
          case "publish": return publish();
          case "retry-run": return retryRun(Number(a.dataset.i));
          case "view-post": {
            const t = run.targets[Number(a.closest("[data-target]").dataset.target)];
            const acc = acct(s, t.account);
            return acc.provider === "INSTAGRAM"
              ? L.igPostViewer({ art: run.media[0]?.art || "studio", caption: run.caption, handle: acc.handle, likes: 0, when: "Just now" })
              : L.fbPostViewer({ art: run.media[0]?.art, caption: run.caption, page: acc.name });
          }
          case "new-post": run = null; s.draft = nextDraft(s); touched = false; savedAt = null; L.render(); return $("#caption")?.focus();
          case "retry-hist": {
            const h = s.history.find((x) => x.id === a.closest("[data-hist]").dataset.hist);
            const t = h.targets[Number(a.dataset.i)];
            await L.pending(a, "", () => L.sleep(1100));
            t.status = "PUBLISHED"; delete t.error;
            L.render();
            return L.toast("Published to Facebook", { tone: "success" });
          }
          case "unconfirmed": {
            const h = s.history.find((x) => x.id === a.closest("[data-hist]").dataset.hist);
            const t = h.targets[Number(a.dataset.i)];
            return L.menu(a, [
              { label: "Open Instagram profile", icon: "arrow-up-right-from-square", onClick: () => L.igProfileViewer({ handle: acct(s, t.account)?.handle || "maya.makes", highlightArt: h.art, onDecision: () => { t.status = "PUBLISHED"; delete t.error; L.render(); L.toast("Marked as published", { tone: "success" }); } }) },
              { label: "It's there — mark as published", icon: "circle-check", onClick: () => { t.status = "PUBLISHED"; delete t.error; L.render(); L.toast("Marked as published", { tone: "success" }); } },
              { sep: true },
              { label: "Not there — publish again", icon: "arrows-rotate-right", onClick: () => L.modal({ title: "Publish to Instagram again?", icon: "triangle-exclamation", tone: "warning", description: "Only do this if the post isn't on your profile. Otherwise it will appear twice.", buttons: [{ label: "Cancel" }, { label: "Publish again", variant: "primary", onClick: async (m, b) => { await L.pending(b, "Publishing…", () => L.sleep(1200)); t.status = "PUBLISHED"; delete t.error; L.render(); L.toast("Published to Instagram", { tone: "success" }); } }] }) },
            ]);
          }
        }
      });

      async function publish() {
        const v = validate(s);
        const mine = (run = { caption: d.caption, media: L.clone(d.media), targets: v.sel.map((x) => ({ account: x.id, status: "PENDING" })) });
        L.render();
        for (const t of mine.targets) {
          t.status = "PUBLISHING"; paintRun();
          await L.sleep(acct(s, t.account).provider === "INSTAGRAM" ? 1500 : 1000);
          if (run !== mine || L.state !== s) return; // left the screen or switched scenario mid-publish
          if (s.sim.publishFails && acct(s, t.account).provider === "FACEBOOK") { t.status = "FAILED"; t.error = "Facebook is limiting how often this Page can post. Try again in a few minutes."; }
          else t.status = "PUBLISHED";
          paintRun();
        }
        run.historyId = "h" + L.uid();
        s.history.unshift({ id: run.historyId, art: run.media[0]?.art || "studio", caption: run.caption || "(No caption)", when: "Just now", targets: run.targets.map((t) => ({ ...t })) });
        s.draft = nextDraft(s);
        const failed = run.targets.some((t) => t.status === "FAILED");
        L.toast(failed ? "Published, with one issue" : "Your post is live", { description: failed ? "Facebook didn't accept it yet. You can retry." : `Posted to ${run.targets.length === 1 ? "1 place" : run.targets.length + " places"}.`, tone: failed ? "warning" : "success" });
        L.render();
      }
      // After a post, the composer starts again — with the next sample draft when prefill is on.
      function nextDraft(st) {
        const dest = st.draft.destinations.length ? st.draft.destinations : connected(st).map((x) => x.id);
        if (!L.prefill) return { destinations: dest, media: [], caption: "" };
        return { ...L.sampleDraft(st, (st.draft.sample ?? 0) + 1), destinations: dest };
      }
      function paintRun() { const r = L.$("[data-results]", root.isConnected ? root : document); if (r) r.outerHTML = resultsHTML(s); }
      async function retryRun(i) {
        const mine = run, t = mine.targets[i];
        t.status = "PUBLISHING"; delete t.error; paintRun();
        await L.sleep(1200);
        if (run !== mine || L.state !== s) return;
        t.status = "PUBLISHED";
        const h = run.historyId && s.history.find((x) => x.id === run.historyId); // still in flight → recorded when the run finishes
        if (h) h.targets[i] = { ...t };
        L.render();
        L.toast("Published to Facebook", { tone: "success" });
      }
    },
  };
})();
