/* Publishing, inside the Inbox. Three pieces share the Inbox's right pane so nothing switches pages:
   New post (the preview is the editor), the post header above its comments (where it's live, with
   inline fixes) and the rail rows. Rules mirror lib/publishing-rules.ts. */
(function () {
  const L = window.L;
  const { esc, icon, btn } = L;
  let pv = "INSTAGRAM"; // which network look the new post shows
  let touched = false;
  let savedAt = null;
  let owner = null; // module state belongs to one session state; a new scenario starts clean

  const connected = (s) => s.accounts.filter((a) => a.status === "CONNECTED");
  const acct = (s, id) => s.accounts.find((a) => a.id === id);
  const netName = (a) => (a?.provider === "FACEBOOK" ? "Facebook" : "Instagram");
  const reset = (s) => { if (owner !== s) { owner = s; touched = false; savedAt = null; } };

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
  const publishLabel = (v) => (v.sel.length > 1 ? `Publish to ${v.sel.length} places` : v.sel.length === 1 ? `Publish to ${netName(v.sel[0])}` : "Publish");

  // ── New post: the preview is the editor ──────────────────────────────────
  const destBtn = (a, on) => `<button type="button" class="lk-dest__btn" aria-pressed="${on}" data-dest="${a.id}"><span class="lk-dest__avatar">${L.avatar(a.name, { size: 28, img: a.provider === "INSTAGRAM" ? L.state.page.avatar : null })}${L.netLogo(a.provider)}</span><span>${a.provider === "INSTAGRAM" ? "@" + esc(a.handle) : esc(a.name)}</span><span class="lk-dest__check">${icon("check")}</span></button>`;
  // Media lives inside the preview: a swipeable carousel (next slide peeks), tools on each slide, "+" at the end.
  function mediaHTML(s) {
    const m = s.draft.media;
    if (!m.length)
      return `<button type="button" class="lk-pved__drop" data-action="add-photo" data-drop>${icon("cloud-arrow-up-in", "lk-icon--lg")}<span style="font-weight:500;font-size:14px">Add photos or a video</span><span class="lk-xs lk-muted">Drop files here or click to choose · up to 10</span></button>`;
    return `<div class="lk-pved__media" data-drop>${m.map((x, i) => `<div class="lk-pved__slide" data-media="${x.id}" ${x.progress < 100 ? 'data-uploading="true"' : ""}>
        <img src="${L.art(x.art)}" alt="${x.kind === "VIDEO" ? "Video" : "Photo"} ${i + 1}">
        <span class="lk-pved__idx">${x.kind === "VIDEO" ? icon("circle-play") : `${i + 1}/${m.length}`}</span>
        ${x.progress < 100 ? `<span class="lk-media__bar" role="progressbar" aria-label="Uploading" aria-valuenow="${x.progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${x.progress}%"></i></span>` : `<span class="lk-pved__tools">${i > 0 ? `<button type="button" class="lk-pved__tool" data-action="media-left" aria-label="Move earlier">${icon("chevron-left")}</button>` : ""}<button type="button" class="lk-pved__tool" data-action="media-remove" aria-label="Remove ${x.kind === "VIDEO" ? "video" : "photo"} ${i + 1}">${icon("xmark")}</button></span>`}
      </div>`).join("")}${m.length < L.LIMITS.maxMedia ? `<button type="button" class="lk-pved__slide lk-pved__more" data-action="add-photo" aria-label="Add another photo">${icon("plus", "lk-icon--lg")}<span>Add more</span></button>` : ""}</div>`;
  }
  // Only problems are listed; the Publish button already says where the post will go.
  function checksHTML(s) {
    const v = validate(s);
    if (!touched && !s.draft.media.length && !s.draft.caption) return "";
    const rows = v.out.map((c) => `<div class="lk-check lk-check--${c.level === "pending" ? "warning" : c.level}">${c.level === "pending" ? L.spinner() : icon(c.level === "error" ? "circle-exclamation" : "triangle-exclamation")}<span>${c.net ? `<strong style="font-weight:500">${c.net === "INSTAGRAM" ? "Instagram" : "Facebook"}:</strong> ` : ""}${esc(c.text)}</span></div>`);
    return rows.length ? `<div class="lk-checks" aria-live="polite">${rows.join("")}</div>` : "";
  }
  const captionHTML = (s, max, ph) => `<label class="lk-sr" for="caption">Caption</label><textarea class="lk-pved__text" id="caption" rows="2" placeholder="${ph}">${esc(s.draft.caption)}</textarea>
    <span class="lk-pved__count" data-count-for="caption" ${s.draft.caption.length > max ? 'data-over="true"' : ""}>${L.fmt(s.draft.caption.length)}/${L.fmt(max)}</span>`;
  function editorHTML(s, v) {
    const nets = [...new Set(v.sel.map((a) => a.provider))];
    if (!nets.length) return `<div class="lk-pv lk-pved lk-pved--empty"><p class="lk-small lk-muted" style="margin:0">Choose where to post to start.</p></div>`;
    if (!nets.includes(pv)) pv = nets[0];
    const max = nets.includes("INSTAGRAM") ? L.LIMITS.captionIG : L.LIMITS.captionFB;
    const tabs = nets.length > 1 ? L.seg("pv", [{ id: "INSTAGRAM", label: "Instagram", icon: "logo-instagram" }, { id: "FACEBOOK", label: "Facebook", icon: "logo-facebook" }], pv, { full: true, size: "sm", label: "Show as" }) : "";
    const ig = v.sel.find((a) => a.provider === "INSTAGRAM"), fb = v.sel.find((a) => a.provider === "FACEBOOK");
    const media = `<div data-media-host>${mediaHTML(s)}</div>`;
    const card = pv === "INSTAGRAM"
      ? `<div class="lk-pv lk-pved"><div class="lk-pv__head">${L.avatar(ig.name, { size: 30, img: s.page.avatar })}<strong style="font-size:13px">${esc(ig.handle)}</strong></div>${media}
        <div class="lk-pv__icons">${icon("heart", "lk-icon--lg")}${icon("comment", "lk-icon--lg")}${icon("paper-plane", "lk-icon--lg")}<span style="margin-left:auto">${icon("bookmark", "lk-icon--lg")}</span></div>
        <div class="lk-pved__cap"><strong>${esc(ig.handle)}</strong>${captionHTML(s, max, "Write a caption…")}</div></div>`
      : `<div class="lk-pv lk-pv--fb lk-pved"><div class="lk-pv__head">${L.avatar(fb.name, { size: 30 })}<div><strong style="font-size:13px">${esc(fb.name)}</strong><div class="lk-xs lk-muted lk-row" style="gap:4px">Just now · ${icon("globe", "lk-icon--xs")}</div></div></div>
        <div class="lk-pved__cap lk-pved__cap--fb">${captionHTML(s, max, "What's on your mind?")}</div>${media}
        <div class="lk-pv__icons lk-small lk-muted" style="justify-content:space-around;border-top:1px solid var(--separator);padding:8px 12px"><span class="lk-row" style="gap:6px">${icon("heart")}Like</span><span class="lk-row" style="gap:6px">${icon("comment")}Comment</span><span class="lk-row" style="gap:6px">${icon("arrow-shape-turn-up-right")}Share</span></div></div>`;
    return `${tabs}${card}`;
  }
  /** Right pane: New post. Same anatomy as a conversation — head, scrolling body, one action bar at the bottom. */
  function newHTML(s, back) {
    const v = validate(s);
    return `<div class="lk-inbox__detailhead">${back}<div class="lk-grow"><div style="font-weight:600;font-size:14px">New post</div><div class="lk-xs lk-muted" data-sub>Instagram and Facebook at once</div></div></div>
      <div class="lk-inbox__thread lk-pubpane" data-pub="new" aria-label="New post">
        <div class="lk-dest" role="group" aria-label="Post to">
          ${s.accounts.map((a) => (a.status === "CONNECTED" ? destBtn(a, s.draft.destinations.includes(a.id)) : `<span class="lk-dest__btn" aria-disabled="true" style="cursor:default;opacity:.8"><span class="lk-dest__avatar">${L.avatar(a.name, { size: 28 })}${L.netLogo(a.provider)}</span>${a.provider === "INSTAGRAM" ? "@" + esc(a.handle) : esc(a.name)} ${btn({ label: "Reconnect", variant: "ghost", size: "sm", action: "reconnect", attrs: { "data-provider": a.provider } })}</span>`)).join("")}
        </div>
        <div class="lk-pub__editor" data-editor-host>${editorHTML(s, v)}</div>
        <div data-upload-errors></div>
        <div data-checks>${checksHTML(s)}</div>
      </div>
      <div class="lk-composer lk-pubbar" data-pub="new"><span class="lk-composer-foot__status" data-saved aria-live="polite">${savedAt ? `${icon("check")}Draft saved` : ""}</span>
        ${btn({ label: publishLabel(v), icon: "paper-plane", variant: "primary", size: "sm", action: "publish", disabled: !v.ok })}</div>`;
  }

  // ── A published post: the header of its comments ────────────────────────
  const igLive = (s, h) => h.targets.some((t) => t.status === "PUBLISHED" && acct(s, t.account)?.provider === "INSTAGRAM");
  // Where it's live, in one quiet line. Problems carry their fix right next to them.
  function targetsHTML(s, h) {
    return h.targets.map((t, i) => {
      const a = acct(s, t.account) || { provider: "INSTAGRAM" };
      const at = { "data-i": i };
      const net = netName(a);
      if (t.status === "PUBLISHED") return `<span class="lk-hist__ok">${icon("check")}${net}</span>`;
      if (t.status === "PUBLISHING" || t.status === "PENDING") return `<span class="lk-hist__ok">${L.spinner()}${net} · ${t.status === "PENDING" ? "waiting" : "publishing…"}</span>`;
      const fix = t.status === "FAILED" ? btn({ label: "Retry", variant: "ghost", size: "sm", action: "retry-hist", attrs: at })
        : `${btn({ label: "Check profile", variant: "ghost", size: "sm", action: "unc-check", attrs: at })}${btn({ label: "It's there", variant: "ghost", size: "sm", action: "unc-ok", attrs: at })}${btn({ label: "Publish again", variant: "ghost", size: "sm", action: "unc-again", attrs: at })}`;
      return `<span class="lk-target-issue" data-target="${i}" title="${esc(t.error || "")}">${L.chip(t.status === "FAILED" ? `${net} failed` : `${net}: check first`, t.status === "FAILED" ? "danger" : "warning", { dot: true })}${fix}</span>`;
    }).join("");
  }
  /** The post at the top of its comments: what it is and where it's live. */
  function postHeadHTML(s, h) {
    const handle = s.accounts.find((a) => a.provider === "INSTAGRAM")?.handle || s.user.slug;
    return `<div class="lk-posthead" data-pub="post" data-post-id="${h.id}">
      <button type="button" class="lk-posthead__img" data-action="pub-view" aria-label="View post on Instagram" ${igLive(s, h) ? "" : "disabled"}><img src="${L.art(h.art)}" alt=""></button>
      <div class="lk-posthead__body">
        <div class="lk-posthead__who">${L.avatar(s.user.name, { size: 28, img: s.page.avatar })}<strong>${esc(handle)}</strong><span class="lk-muted">· ${esc(h.when)}</span></div>
        <p class="lk-posthead__cap">${esc(h.caption)}</p>
        <div class="lk-posthead__meta">${targetsHTML(s, h)}</div></div>
    </div>`;
  }
  // Rail rows: the post and how many people are waiting on it — nothing else.
  function railRowHTML(s, h, sel) {
    const todo = s.convos.filter((c) => c.post === h.id && c.status === "TODO").length;
    const issue = h.targets.find((x) => x.status === "FAILED" || x.status === "UNCONFIRMED");
    const busy = h.targets.some((x) => x.status === "PUBLISHING" || x.status === "PENDING");
    const meta = busy ? `<span class="lk-cat">${L.spinner()}Publishing…</span>`
      : issue ? `<span class="lk-cat lk-cat--warn">${icon("triangle-exclamation")}${netName(acct(s, issue.account))} needs a look</span>`
      : todo ? `<span class="lk-cat lk-cat--todo">${todo} waiting</span>`
      : `<span class="lk-cat">${h.when}</span>`;
    return `<button type="button" class="lk-railrow" data-post="${h.id}" aria-current="${sel}">
      <span class="lk-railrow__img"><img src="${L.art(h.art)}" alt="">${todo ? `<span class="lk-railrow__n">${todo}</span>` : ""}</span>
      <span class="lk-railrow__body"><span class="lk-railrow__cap">${esc(h.caption)}</span>${meta}</span>
    </button>`;
  }

  // ── Behavior (delegated on the Inbox root, scoped to [data-pub]) ─────────
  function mount(root, s, api) {
    reset(s);
    const $ = (sel) => L.$(sel, root);
    const d = () => s.draft;
    const autosize = () => { const t = $("#caption"); if (t) { t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; } };
    // `full` re-renders the post itself (destination or network changed); typing only updates counts and checks.
    const refresh = ({ full } = {}) => {
      if (!$('[data-pub="new"]')) return;
      const v = validate(s);
      if (full) {
        $("[data-editor-host]").innerHTML = editorHTML(s, v);
        autosize();
      }
      $("[data-checks]").innerHTML = checksHTML(s);
      const pub = $('[data-action="publish"]');
      if (pub) { pub.disabled = !v.ok; pub.querySelector("span").textContent = publishLabel(v); }
      L.updateCount(root, "caption", d().caption.length, v.sel.some((a) => a.provider === "INSTAGRAM") ? L.LIMITS.captionIG : L.LIMITS.captionFB);
    };
    api.onPaint(autosize);
    const paintMedia = () => { const host = $("[data-media-host]"); if (host) host.innerHTML = mediaHTML(s); refresh(); };
    // Files from the picker (or a drop) → upload rules → per-file progress.
    const addFiles = (files) => {
      const rejected = [];
      files.forEach((f) => {
        const err = L.uploadError(f) || (d().media.length >= L.LIMITS.maxMedia ? `wasn't added — a post can have up to ${L.LIMITS.maxMedia} items.` : null);
        if (err) return rejected.push(`<li><strong>${esc(f.name)}</strong> ${esc(err)}</li>`);
        const item = { id: L.uid(), art: f.art, kind: f.kind, name: f.name, w: f.w, h: f.h, progress: 4 };
        d().media.push(item);
        const t = setInterval(() => {
          item.progress = Math.min(100, item.progress + (f.kind === "VIDEO" ? 7 : 22));
          const bar = L.$(`[data-media="${item.id}"] .lk-media__bar i`, root);
          if (bar) bar.style.width = item.progress + "%";
          if (item.progress >= 100) { clearInterval(t); if (root.isConnected) paintMedia(); }
        }, 160);
        L.onLeave(() => { clearInterval(t); item.progress = 100; });
      });
      touched = true;
      paintMedia();
      autosave();
      const errs = $("[data-upload-errors]");
      if (errs) errs.innerHTML = rejected.length ? L.alert({ tone: "danger", title: `${rejected.length === 1 ? "1 file wasn't" : rejected.length + " files weren't"} added`, description: `<ul class="lk-rejects">${rejected.join("")}</ul>` }) : "";
    };
    // Prefill: two valid feed photos not already in the post are preselected.
    const fits = (f) => f.kind === "IMAGE" && !L.uploadError(f) && f.w / f.h >= 0.8 && f.w / f.h <= 1.91 && !d().media.some((m) => m.name === f.name);
    const openPicker = () => L.filePicker({ onPick: addFiles, preselect: L.prefill ? L.FILES.filter(fits).slice(0, 2).map((f) => f.id) : [] });

    L.wireSeg(root, (name, v) => { if (name === "pv") { pv = v; refresh({ full: true }); } });
    // Drafts save themselves: a quiet "Draft saved" appears once typing pauses.
    let saveTimer = null;
    const autosave = () => {
      clearTimeout(saveTimer);
      savedAt = null;
      const st = $("[data-saved]");
      if (st) st.innerHTML = "";
      saveTimer = setTimeout(() => { savedAt = Date.now(); const el = $("[data-saved]"); if (el) el.innerHTML = `${icon("check")}Draft saved`; }, 800);
    };
    L.onLeave(() => clearTimeout(saveTimer));
    const postOf = (el) => s.history.find((x) => x.id === el.closest("[data-post-id]")?.dataset.postId);

    root.addEventListener("input", (e) => {
      const t = e.target;
      if (!t.closest("[data-pub]")) return;
      if (t.id === "caption") { d().caption = t.value; touched = true; autosave(); autosize(); return refresh(); }
    });
    root.addEventListener("dragover", (e) => { const z = e.target.closest("[data-drop]"); if (z) { e.preventDefault(); z.dataset.over = "true"; } });
    root.addEventListener("dragleave", (e) => { const z = e.target.closest("[data-drop]"); if (z) delete z.dataset.over; });
    root.addEventListener("drop", (e) => {
      const z = e.target.closest("[data-drop]");
      if (!z) return;
      e.preventDefault();
      delete z.dataset.over;
      const n = Math.max(1, e.dataTransfer.files.length);
      addFiles(L.FILES.filter((f) => f.kind === "IMAGE" && !L.uploadError(f) && !d().media.some((m) => m.name === f.name)).slice(0, n));
    });

    root.addEventListener("click", async (e) => {
      if (!e.target.closest("[data-pub]")) return;
      const dest = e.target.closest("[data-dest]");
      if (dest) {
        const id = dest.dataset.dest, on = d().destinations.includes(id);
        d().destinations = on ? d().destinations.filter((x) => x !== id) : [...d().destinations, id];
        touched = true;
        dest.setAttribute("aria-pressed", !on);
        return refresh({ full: true });
      }
      const a = e.target.closest("[data-action]");
      if (!a) return;
      const h = postOf(a);
      switch (a.dataset.action) {
        case "reconnect": return L.connectFlow(a.dataset.provider, { reconnect: true });
        case "add-photo": return openPicker();
        case "media-remove": { const id = a.closest("[data-media]").dataset.media; const i = d().media.findIndex((m) => m.id === id); const [m] = d().media.splice(i, 1); paintMedia(); autosave(); return L.toast("Removed", { action: { label: "Undo", onClick: () => { d().media.splice(i, 0, m); paintMedia(); } }, duration: 3000 }); }
        case "media-left": { const id = a.closest("[data-media]").dataset.media; const i = d().media.findIndex((m) => m.id === id); [d().media[i - 1], d().media[i]] = [d().media[i], d().media[i - 1]]; paintMedia(); return autosave(); }
        case "publish": return publish();
        case "pub-view": return L.igPostViewer({ art: h.art, caption: h.caption, handle: s.accounts.find((x) => x.provider === "INSTAGRAM")?.handle || "", when: h.when, comments: commentsOf(h) });
        case "retry-hist": {
          const t = h.targets[Number(a.dataset.i)];
          t.status = "PUBLISHING"; delete t.error; api.paint();
          await L.sleep(1100);
          if (L.state !== s) return;
          t.status = "PUBLISHED"; api.paint();
          return L.toast(`Published to ${netName(acct(s, t.account))}`, { tone: "success" });
        }
        case "unc-check": case "unc-ok": case "unc-again": {
          const t = h.targets[Number(a.dataset.i)];
          const ok = (msg) => { t.status = "PUBLISHED"; delete t.error; api.paint(); L.toast(msg, { tone: "success" }); };
          if (a.dataset.action === "unc-ok") return ok("Marked as published");
          if (a.dataset.action === "unc-check") return L.igProfileViewer({ handle: acct(s, t.account)?.handle || "maya.makes", highlightArt: h.art, onDecision: () => ok("Marked as published") });
          // Publishing twice is the one real risk here, so it keeps its confirmation.
          return L.modal({ title: "Publish to Instagram again?", icon: "triangle-exclamation", tone: "warning", description: "Only do this if the post isn't on your profile. Otherwise it will appear twice.", buttons: [{ label: "Cancel" }, { label: "Publish again", variant: "primary", onClick: async (m, b) => { await L.pending(b, "Publishing…", () => L.sleep(1200)); ok("Published to Instagram"); } }] });
        }
      }
    });

    function commentsOf(h) {
      return s.convos.filter((x) => x.post === h.id).map((x) => {
        const f = x.events.find((e) => e.type === "COMMENT");
        const r = x.events.find((e) => e.type === "REPLY" || e.type === "AUTO_REPLY");
        return f && { id: x.id, user: x.user, text: f.text, age: f.age, reply: r && { text: r.text, when: r.age } };
      }).filter(Boolean);
    }
    // Publishing creates the post right away and opens it: progress, results and retries live on the post.
    async function publish() {
      const v = validate(s);
      if (!v.ok) return;
      const dr = d();
      const h = { id: "h" + L.uid(), art: dr.media[0]?.art || "studio", caption: dr.caption || "(No caption)", when: "Just now",
        targets: v.sel.map((x) => ({ account: x.id, status: "PENDING" })) };
      s.history.unshift(h);
      s.draft = nextDraft(s);
      touched = false; savedAt = null;
      api.openPost(h.id);
      for (const t of h.targets) {
        t.status = "PUBLISHING"; api.paint();
        await L.sleep(acct(s, t.account).provider === "INSTAGRAM" ? 1500 : 1000);
        if (L.state !== s) return; // switched scenario mid-publish
        if (s.sim.publishFails && acct(s, t.account).provider === "FACEBOOK") { t.status = "FAILED"; t.error = "Facebook is limiting how often this Page can post. Try again in a few minutes."; }
        else t.status = "PUBLISHED";
        api.paint();
      }
      const failed = h.targets.some((t) => t.status === "FAILED");
      L.toast(failed ? "Published, with one issue" : "Your post is live", { description: failed ? "Facebook didn't accept it yet. Retry is on the post." : `Posted to ${h.targets.length === 1 ? "1 place" : h.targets.length + " places"}.`, tone: failed ? "warning" : "success" });
    }
    // After a post, the composer starts again — with the next sample draft when prefill is on.
    function nextDraft(st) {
      const dest = st.draft.destinations.length ? st.draft.destinations : connected(st).map((x) => x.id);
      if (!L.prefill) return { destinations: dest, media: [], caption: "" };
      return { ...L.sampleDraft(st, (st.draft.sample ?? 0) + 1), destinations: dest };
    }
  }

  L.pub = { newHTML, postHeadHTML, railRowHTML, mount, reset };
})();
