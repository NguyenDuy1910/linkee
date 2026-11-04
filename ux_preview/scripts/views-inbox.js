/* Inbox — built around posts. Pick a post on the left; on the right is the post and everyone who
   commented: what they said, what they want, and a reply box with an AI draft already written.
   "Reply to all" writes a personal draft for every waiting comment and sends them together. */
(function () {
  const L = window.L;
  const { esc, icon, btn } = L;
  let drafts = {}; // convoId → { mode: "public"|"private", public: {text, ai, edited, autoTried}, private: {…}, tries }
  let gen = new Set(); // convoIds currently being drafted
  let confirmFor = null; // convoId showing "Replace your draft?"
  let catEdit = null; // convoId whose category is being changed
  let batch = null; // { post, skip: Set<convoId>, failed } while replying to everyone on a post
  let owner = null; // module state belongs to one session state; a new scenario starts clean
  let live = null; // repaint hook while the Inbox is on screen

  const ig = (s) => s.accounts.find((a) => a.provider === "INSTAGRAM");
  const postOf = (s, id) => s.history.find((p) => p.id === id) || { art: "studio", caption: "", targets: [] };
  const catOf = (id) => L.CATS.find((x) => x.id === id) || L.CATS[3];
  const isIn = (e) => e.type === "COMMENT" || e.type === "DM_IN";
  const canPublish = (s) => L.isPro() && s.accounts.some((a) => a.status === "CONNECTED");
  const connected = (s) => ig(s)?.status === "CONNECTED";
  const draftOf = (id) => (drafts[id] ||= { mode: "public", public: { text: "", ai: false }, private: { text: "", ai: false } });
  const waiting = (s, postId) => s.convos.filter((c) => c.post === postId && c.status === "TODO");
  // People waiting come first; everyone else keeps the order Instagram shows (newest first).
  const ofPost = (s) => {
    const all = s.convos.filter((c) => c.post === s.inbox.post);
    return [...all.filter((c) => c.status === "TODO"), ...all.filter((c) => c.status !== "TODO")];
  };
  const visible = (s) => ofPost(s).filter((c) => s.inbox.cat === "ALL" || c.cat === s.inbox.cat);
  const visibleWaiting = (s) => visible(s).filter((c) => c.status === "TODO");
  const igOnPost = (s, h) => h.targets.some((t) => s.accounts.find((a) => a.id === t.account)?.provider === "INSTAGRAM");
  const inBatch = (s) => batch && batch.post === s.inbox.post;
  const batchItems = (s) => (inBatch(s) ? visibleWaiting(s) : []);
  const batchReady = (s) => batchItems(s).filter((c) => !batch.skip.has(c.id) && draftOf(c.id).public.text.trim());

  // ── Engine (simulated backend): receive → classify → set attention ──────
  L.engage = {
    receive(s, { user, post, text, dm = true }) {
      const ev = { id: L.eid(), type: "COMMENT", text, age: "now" };
      let c = s.convos.find((x) => x.user === user && x.post === post);
      if (c) {
        c.events.push(ev);
        c.status = "TODO"; // a new message after a reply always needs a look
        s.convos.splice(s.convos.indexOf(c), 1);
      } else c = { id: "k" + L.uid(), user, post, cat: L.classify(text), catBy: "AUTO", status: "TODO", dm, events: [ev] };
      c.unread = true;
      s.convos.unshift(c);
      if (live) live(c); else L.updateInboxBadge();
      return c;
    },
  };

  // ── Pieces ────────────────────────────────────────────────────────────────
  function railHTML(s) {
    if (!s.history.length) return `<p class="lk-hub__railempty">Posts you publish show up here.</p>`;
    return s.history.map((h) => L.pub.railRowHTML(s, h, s.inbox.view === "post" && h.id === s.inbox.post)).join("");
  }
  function chipsHTML(s) {
    const pool = ofPost(s);
    const n = (id) => pool.filter((x) => id === "ALL" || x.cat === id).length;
    return [{ id: "ALL", label: "All" }, ...L.CATS].filter((o) => o.id === "ALL" || o.id === s.inbox.cat || n(o.id))
      .map((o) => `<button type="button" class="lk-catchip" role="radio" aria-checked="${s.inbox.cat === o.id}" data-filter="${o.id}" ${o.id !== "ALL" ? `data-cat="${o.id}"` : ""}>${o.label}<span class="lk-catchip__n">${n(o.id)}</span></button>`).join("");
  }
  // Replies nest under the comment, the way Instagram shows them.
  function followHTML(s, c, e) {
    if (isIn(e)) return `<div class="lk-c__sub">${L.avatar(c.user, { size: 24 })}<div><div><strong>${esc(c.user)}</strong> ${esc(e.text)}</div><div class="lk-c__meta">${e.type === "DM_IN" ? "Private · " : ""}${esc(e.age)}</div></div></div>`;
    const label = e.type === "AUTO_REPLY" ? "Auto-reply" : e.type === "DM_OUT" ? "Sent privately" : "";
    return `<div class="lk-c__sub lk-c__sub--you ${e.type === "DM_OUT" ? "lk-c__sub--private" : ""}">${L.avatar(s.user.name, { size: 24, img: s.page.avatar })}<div><div><strong>${esc(ig(s)?.handle || "you")}</strong> ${esc(e.text)}</div>
      <div class="lk-c__meta">${e.type === "DM_OUT" ? icon("envelope") : e.type === "AUTO_REPLY" ? icon("sparkles") : ""}${[label, e.ai ? "AI-assisted" : "", e.age].filter(Boolean).join(" · ")}</div></div></div>`;
  }
  const you = (s) => L.avatar(s.user.name, { size: 28, img: s.page.avatar });
  const writing = (label) => `<span class="lk-ig__writing" aria-live="polite">${icon("sparkles")}${label}<span class="lk-typing"><i></i><i></i><i></i></span></span>`;
  /** The one reply box, pinned under the comments like Instagram's "Add a comment…" bar. */
  function composerHTML(s) {
    const c = s.convos.find((x) => x.id === s.inbox.active);
    if (!c || inBatch(s)) return "";
    const broken = !connected(s);
    const d = draftOf(c.id);
    const priv = d.mode === "private";
    const cur = d[d.mode];
    const pro = L.isPro();
    const left = Math.max(0, L.PLANS.PRO.suggestionsPerDay - s.ai.usage.suggestions);
    const generating = gen.has(c.id);
    const who = esc(c.user);
    // Where the reply goes, in words — with the other option as a plain link.
    const to = priv
      ? `Messaging <strong>${who}</strong> privately · <button type="button" class="lk-ig__link" data-replyas="public">Reply publicly instead</button>`
      : `Replying to <strong>${who}</strong>${c.dm && !broken ? ` · <button type="button" class="lk-ig__link" data-replyas="private">Message privately</button>` : ""}`;
    return `<form class="lk-ig__composer" data-composer data-mode="${d.mode}" novalidate>
      <div class="lk-ig__to">${to}${cur.ai && !generating ? `<span class="lk-ig__ai" title="Written by AI — edit before sending">${icon("sparkles")}AI draft</span>` : ""}<span class="lk-grow"></span>
        <button type="button" class="lk-ig__x" data-action="close-reply" aria-label="Stop replying to ${who}">${icon("xmark")}</button></div>
      <div data-ai-error></div>
      ${confirmFor === c.id ? `<div class="lk-composer__confirm" role="alert"><span>Replace your draft with a suggestion?</span><span class="lk-grow"></span>${btn({ label: "Keep mine", variant: "ghost", size: "sm", action: "keep" })}${btn({ label: "Replace", variant: "tertiary", size: "sm", action: "replace" })}</div>` : ""}
      <div class="lk-ig__row">${you(s)}
        <label class="lk-sr" for="reply">${priv ? "Private message to" : "Reply to"} ${who}</label>
        <div class="lk-ig__field">${generating ? writing("Writing a reply") : `<textarea id="reply" rows="1" maxlength="${priv ? L.LIMITS.privateMessageMax : 2200}" placeholder="${priv ? `Message ${who}…` : "Add a reply…"}" ${broken ? "disabled" : ""}>${esc(cur.text)}</textarea>`}</div>
        ${pro ? `<button type="button" class="lk-ig__icon" data-action="suggest" aria-label="${cur.ai && !cur.edited ? "Try another AI reply" : "Write with AI"}" title="${cur.ai && !cur.edited ? "Try another" : "Write with AI"} · ${left} left today" ${broken || generating || left === 0 ? "disabled" : ""}>${icon(cur.ai && !cur.edited ? "arrows-rotate-right" : "sparkles")}</button>`
          : `<button type="button" class="lk-ig__icon" data-action="upgrade" aria-label="Write with AI (Pro)" title="Write with AI — Pro">${icon("lock")}</button>`}
        <button type="submit" class="lk-ig__post" ${broken || generating || !cur.text.trim() ? "disabled" : ""} aria-keyshortcuts="Meta+Enter" title="${priv ? "Send" : "Post"} (⌘↵)">${priv ? "Send" : "Post"}</button>
      </div>
      ${broken ? `<div class="lk-xs lk-muted lk-row">${icon("triangle-exclamation")}Reconnect Instagram to reply.</div>` : ""}
    </form>`;
  }
  // Reply to all: your draft sits under each comment as a reply-to-be, like Instagram nests replies.
  function batchSlotHTML(s, c) {
    if (gen.has(c.id)) return `<div class="lk-c__sub lk-c__sub--you lk-c__sub--draft">${you(s)}<div>${writing("Writing")}</div></div>`;
    const skip = batch.skip.has(c.id);
    const d = draftOf(c.id).public;
    return `<div class="lk-c__sub lk-c__sub--you lk-c__sub--draft ${skip ? "lk-c__sub--out" : ""}">${you(s)}
      <div class="lk-grow"><label class="lk-sr" for="b-${c.id}">Reply to ${esc(c.user)}</label>
        <textarea class="lk-ig__inline" id="b-${c.id}" data-batch="${c.id}" rows="1" maxlength="2200" placeholder="Reply to ${esc(c.user)}…" ${skip ? "disabled" : ""}>${esc(d.text)}</textarea>
        <div class="lk-c__acts"><button type="button" class="lk-c__act" data-skip="${c.id}" aria-pressed="${skip}">${skip ? "Include" : "Leave out"}</button></div></div>
    </div>`;
  }
  function commentHTML(s, c) {
    const inB = inBatch(s) && c.status === "TODO";
    const active = !inBatch(s) && c.id === s.inbox.active;
    const first = c.events.find(isIn) || c.events[0];
    const rest = c.events.filter((e) => e !== first);
    const replied = c.events.some((e) => !isIn(e));
    // Like Instagram's "2h  Reply": time, then text actions. The category is one of them — tap to correct it.
    const cat = catEdit === c.id
      ? `<span class="lk-catpick" role="radiogroup" aria-label="Category">${L.CATS.map((o) => `<button type="button" role="radio" aria-checked="${c.cat === o.id}" data-setcat="${o.id}" data-for="${c.id}" data-cat="${o.id}">${o.one}</button>`).join("")}</span>`
      : `<button type="button" class="lk-c__act lk-c__cat" data-catedit="${c.id}" data-cat="${c.cat}" title="Change category"><i></i>${esc(catOf(c.cat).one)}</button>`;
    const acts = inB ? "" : c.status === "TODO"
      ? `${active ? `<span class="lk-c__act lk-c__act--on">Replying</span>` : `<button type="button" class="lk-c__act lk-c__act--reply" data-reply="${c.id}">Reply</button>`}<button type="button" class="lk-c__act" data-action="done" data-id="${c.id}" title="No reply needed">Skip</button>`
      : `${!replied ? `<span class="lk-c__note">Skipped</span>` : ""}${active ? `<span class="lk-c__act lk-c__act--on">Replying</span>` : `<button type="button" class="lk-c__act" data-reply="${c.id}">Reply</button>`}`;
    return `<article class="lk-c" data-cmt="${c.id}" data-active="${active}" data-todo="${c.status === "TODO"}">
      ${c.status === "TODO" ? '<span class="lk-c__dot" title="Waiting for a reply"></span>' : ""}${L.avatar(c.user, { size: 32 })}
      <div class="lk-c__body">
        <div class="lk-c__text"><strong>${esc(c.user)}</strong> ${esc(first?.text || "")}</div>
        <div class="lk-c__meta"><span>${esc(first?.age || "")}</span>${cat}${acts}</div>
        ${rest.length ? `<div class="lk-c__subs">${rest.map((e) => followHTML(s, c, e)).join("")}</div>` : ""}
        ${inB ? `<div class="lk-c__subs" data-batch-slot="${c.id}">${batchSlotHTML(s, c)}</div>` : ""}
      </div>
    </article>`;
  }
  function commentsHTML(s) {
    const h = postOf(s, s.inbox.post);
    if (!igOnPost(s, h)) return `<p class="lk-hub__note">This post is only on Facebook. Linkee shows Instagram comments.</p>`;
    const all = ofPost(s);
    if (!all.length) return `<p class="lk-hub__note">No comments yet. They show up here as they come in.</p>`;
    const list = visible(s);
    // Finished this post? Point at the next one that needs you, right here.
    const next = !waiting(s, h.id).length && s.history.find((p) => waiting(s, p.id).length);
    const caught = next ? `<div class="lk-hub__next">${icon("circle-check")}<span class="lk-grow">All caught up on this post.</span><button type="button" class="lk-hub__nextbtn" data-post="${next.id}"><img src="${L.art(next.art)}" alt="">${waiting(s, next.id).length} waiting on the next post${icon("arrow-right")}</button></div>` : "";
    return `${caught}${list.length ? list.map((c) => commentHTML(s, c)).join("") : `<p class="lk-hub__note">No ${esc(catOf(s.inbox.cat).label.toLowerCase())} on this post. <button type="button" class="lk-ig__link" data-action="clear-filter">Show all</button></p>`}`;
  }
  function batchBarHTML(s) {
    if (!inBatch(s)) return "";
    const items = batchItems(s);
    const busy = items.some((c) => gen.has(c.id));
    const ready = batchReady(s).length;
    const out = items.filter((c) => batch.skip.has(c.id)).length;
    const msg = batch.failed ? `${icon("triangle-exclamation")}AI didn't respond. Write them yourself, or <button type="button" class="lk-ig__link" data-action="batch-retry">try again</button>.`
      : busy ? `${L.spinner()}Writing ${items.length} replies…`
      : `${icon("sparkles")}${ready} ${ready === 1 ? "reply" : "replies"} ready${out ? ` · ${out} left out` : ""} · edit any above`;
    return `<div class="lk-ig__composer lk-batchbar" data-batchbar role="region" aria-label="Reply to all">
      <span class="lk-batchbar__msg" aria-live="polite">${msg}</span><span class="lk-grow"></span>
      <button type="button" class="lk-ig__link lk-ig__link--muted" data-action="batch-cancel">Cancel</button>
      <button type="button" class="lk-ig__post" data-action="batch-send" ${busy || !ready ? "disabled" : ""}>${ready ? `Post ${ready} ${ready === 1 ? "reply" : "replies"}` : "Post"}</button>
    </div>`;
  }
  function mainHTML(s) {
    if (s.inbox.view === "new") return L.pub.newHTML(s, btn({ label: "Close new post", iconOnly: true, icon: "xmark", variant: "ghost", size: "sm", action: "close-new" }));
    const h = s.history.find((p) => p.id === s.inbox.post);
    if (!h) return `<div class="lk-empty"><div class="lk-empty__icon">${icon("paper-plane", "lk-icon--lg")}</div><h2>No posts yet</h2><p>Publish from here and its comments will collect under it.</p>${canPublish(s) ? btn({ label: "New post", icon: "plus", variant: "primary", size: "sm", action: "new-post" }) : ""}</div>`;
    return `<div class="lk-hub__scroll" data-main-scroll>
      ${L.pub.postHeadHTML(s, h)}
      <div class="lk-hub__bar" data-bar>${barHTML(s)}</div>
      <div class="lk-comments" data-comments>${commentsHTML(s)}</div>
    </div>
    <div class="lk-ig__dock" data-dock>${dockHTML(s)}</div>`;
  }
  const dockHTML = (s) => batchBarHTML(s) || composerHTML(s);
  // Comment count, the waiting count, quiet category tabs, and the one bulk action.
  function barHTML(s) {
    const h = postOf(s, s.inbox.post);
    const w = waiting(s, h.id).length;
    const n = visibleWaiting(s).length;
    const all = igOnPost(s, h) && ofPost(s).length;
    const bulk = inBatch(s) || n < 2 || !connected(s) ? ""
      : L.isPro() ? `<button type="button" class="lk-ig__bulk" data-action="batch" title="AI writes a personal reply for each person. Review, then post them together.">${icon("sparkles")}Reply to all ${n}</button>`
      : `<button type="button" class="lk-ig__bulk" data-action="upgrade" title="Pro">${icon("lock")}Reply to all ${n}</button>`;
    return `<div class="lk-hub__barrow"><h2 class="lk-hub__title">Comments${w ? ` <span class="lk-hub__wait">${w} waiting</span>` : ""}</h2><span class="lk-grow"></span>${bulk}</div>
      ${all ? `<div class="lk-catchips" role="radiogroup" aria-label="Filter by category" data-cats>${chipsHTML(s)}</div>` : ""}`;
  }
  // Open on the post that needs you most recently (otherwise the newest), with its first waiting comment.
  function settle(s) {
    const ib = s.inbox;
    if (!s.history.some((h) => h.id === ib.post)) { ib.post = (s.history.find((h) => waiting(s, h.id).length) || s.history[0])?.id || null; ib.active = null; }
    const act = s.convos.find((c) => c.id === ib.active);
    if (!act || act.post !== ib.post) ib.active = visibleWaiting(s)[0]?.id || null;
    if (batch && batch.post !== ib.post) batch = null;
  }
  const subline = (s) => {
    const a = ig(s);
    const total = s.convos.filter((c) => c.status === "TODO").length;
    return `${a ? `@${esc(a.handle)} · ` : ""}${total ? `${total} waiting across your posts` : "You're all caught up"}${a ? ` · <a class="lk-sublink" href="#/app/settings?section=ai">${s.ai.autoReply && L.isPro() ? "Auto-reply on" : "Auto-reply off"}</a>` : ""}`;
  };

  L.views.inbox = {
    title: "Inbox — Linkee",
    enter(s, q) {
      if (owner !== s) { owner = s; drafts = {}; gen = new Set(); confirmFor = null; catEdit = null; batch = null; }
      L.pub.reset(s);
      const ib = s.inbox;
      if (q?.get("new") && canPublish(s)) ib.view = "new";
      else if (q?.get("post") && s.history.some((h) => h.id === q.get("post"))) Object.assign(ib, { view: "post", post: q.get("post"), active: null });
      if (ib.view === "new" && !canPublish(s)) ib.view = "post";
      ib.view ||= "post";
      settle(s);
    },
    render(s) {
      settle(s); // e.g. Instagram just connected: its first post becomes the open one
      const account = ig(s);
      if (!s.accounts.length)
        return `<div class="lk-pagehead"><div><h1 class="lk-h1">Inbox</h1></div></div>
          <section class="card lk-card"><div class="lk-empty"><div class="lk-empty__icon lk-empty__icon--accent">${icon("comments", "lk-icon--lg")}</div><h2>Your posts and their comments, together</h2>
          <p>Connect Instagram to answer comments, and Instagram or a Facebook Page to publish. Nothing is posted without you.</p>
          <div class="lk-row lk-row--wrap" style="justify-content:center">${btn({ label: "Connect Instagram", icon: "logo-instagram", variant: "primary", action: "connect" })}${btn({ label: "Connect a Facebook Page", icon: "logo-facebook", variant: "tertiary", action: "connect-fb" })}</div>
          <p class="lk-xs lk-muted" style="margin-top:4px">Instagram needs a professional account (Business or Creator).</p></div></section>`;
      const broken = account && account.status !== "CONNECTED";
      const newPost = L.isPro()
        ? btn({ label: "New post", icon: "plus", variant: "primary", size: "sm", action: "new-post", disabled: !canPublish(s), attrs: { "aria-pressed": s.inbox.view === "new" } })
        : btn({ label: "New post", icon: "lock", variant: "tertiary", size: "sm", action: "upgrade-post" });
      return `<div class="lk-pagehead"><div><h1 class="lk-h1">Inbox</h1><p class="lk-sub" data-total>${subline(s)}</p></div>
        <div class="lk-row">${btn({ label: "Check for new comments", iconOnly: true, icon: "arrows-rotate-right", variant: "ghost", action: "refresh", disabled: !account || broken, attrs: { title: "Check for new comments" } })}${newPost}</div></div>
        ${broken ? `<div style="margin-bottom:16px">${L.alert({ tone: "warning", title: "Instagram stopped accepting this connection", description: "This happens when a password changes or access expires. Reconnect to keep replying — nothing is lost.", action: btn({ label: "Reconnect", variant: "primary", size: "sm", action: "reconnect" }) })}</div>` : ""}
        <section class="card lk-card lk-card--flush lk-hub" data-inbox>
          <nav class="lk-hub__rail" aria-label="Posts" data-rail>${railHTML(s)}</nav>
          <div class="lk-hub__main" data-main>${mainHTML(s)}</div>
        </section>`;
    },
    mount(root, s) {
      const $ = (sel) => L.$(sel, root);
      const cur = () => s.convos.find((x) => x.id === s.inbox.active);
      const paintTop = () => {
        const sub = $("[data-total]");
        if (sub) sub.innerHTML = subline(s);
        $("[data-rail]").innerHTML = railHTML(s);
        L.updateInboxBadge();
      };
      // Keeps the cursor where it was when something repaints while the creator is typing.
      const keepFocus = (fn) => {
        const el = document.activeElement;
        const id = el && root.contains(el) && el.id;
        const sel = id && "selectionStart" in el ? [el.selectionStart, el.selectionEnd] : null;
        fn();
        const again = id && root.querySelector("#" + CSS.escape(id));
        if (again && again !== el) { again.focus({ preventScroll: true }); if (sel && "setSelectionRange" in again) again.setSelectionRange(...sel); }
      };
      const afterPaint = [];
      const paintMain = () => {
        const sc = $("[data-main-scroll]")?.scrollTop || 0;
        keepFocus(() => { $("[data-main]").innerHTML = mainHTML(s); });
        if ($("[data-main-scroll]")) $("[data-main-scroll]").scrollTop = sc;
        afterPaint.forEach((f) => f());
      };
      // The bottom dock: the reply box for the comment you're on, or the Reply to all bar.
      const paintDock = () => { const h = $("[data-dock]"); if (h) keepFocus(() => { h.innerHTML = dockHTML(s); }); };
      // Comments only — leaves the post header alone.
      const paintComments = () => {
        if (s.inbox.view !== "post") return; // New post is open; nothing to repaint behind it
        if (!$("[data-comments]")) return paintMain();
        keepFocus(() => {
          $("[data-comments]").innerHTML = commentsHTML(s);
          $("[data-bar]").innerHTML = barHTML(s);
        });
        paintDock();
      };
      const paint = () => { if (!$("[data-main]")) return; paintTop(); paintMain(); };
      live = (c) => {
        if (!$("[data-main]")) return L.updateInboxBadge();
        paintTop();
        if (s.inbox.view === "post" && (!c || c.post === s.inbox.post)) paintComments();
      };
      L.onLeave(() => { live = null; });
      const openPost = (id) => {
        Object.assign(s.inbox, { view: "post", post: id, cat: "ALL", active: null });
        batch = null;
        s.inbox.active = visibleWaiting(s)[0]?.id || null;
        paint();
        L.$(`[data-post="${id}"]`, root)?.scrollIntoView({ block: "nearest", inline: "nearest" });
        autoDraft();
      };
      L.pub.mount(root, s, { paint, openPost, onPaint: (f) => afterPaint.push(f) });

      // AI writes one draft. Shared by the single reply box and Reply to all.
      async function write(c, mode) {
        gen.add(c.id);
        await L.sleep(1100);
        gen.delete(c.id);
        if (L.state !== s || s.sim.aiFails) return null;
        s.ai.usage.suggestions++;
        const d = draftOf(c.id);
        const attempt = (d.tries = (d.tries || 0) + 1) - 1;
        const text = L.suggestFor(s, c, mode, attempt);
        d[mode] = { text, ai: true, edited: false, autoTried: true };
        return text;
      }
      // The comment you're on gets an AI draft right away (Pro), so a reply is one press of Send.
      const autoDraft = () => {
        const c = cur();
        if (!c || inBatch(s) || s.inbox.view !== "post" || c.status !== "TODO" || !L.isPro() || !connected(s)) return;
        const m = draftOf(c.id)[draftOf(c.id).mode];
        if (m.autoTried || m.text.trim() || gen.has(c.id)) return; // once per mode; never over the creator's words
        m.autoTried = true;
        suggest(c);
      };
      const activate = (id, { focus = true } = {}) => {
        if (s.inbox.active === id || inBatch(s)) return;
        s.inbox.active = id;
        confirmFor = null;
        const c = cur();
        if (c) c.unread = false;
        paintComments();
        paintTop();
        L.$(`[data-cmt="${id}"]`, root)?.scrollIntoView({ block: "nearest" });
        if (focus) $("#reply")?.focus({ preventScroll: true });
        autoDraft();
      };
      // After a reply: the next person waiting on this post, if any.
      const next = () => {
        const n = visibleWaiting(s)[0];
        s.inbox.active = null;
        if (n) return activate(n.id);
        paintComments();
        paintTop();
      };
      const setSend = () => {
        const c = cur();
        const b = L.$('[data-composer] [type="submit"]', root);
        if (b && c) b.disabled = !draftOf(c.id)[draftOf(c.id).mode].text.trim();
      };

      // ── Reply to all ──
      async function startBatch() {
        batch = { post: s.inbox.post, skip: new Set(), failed: false };
        s.inbox.active = null;
        confirmFor = null;
        // Drafts already written (or typed) are kept; everyone else gets one.
        const todo = batchItems(s).filter((c) => !draftOf(c.id).public.text.trim());
        todo.forEach((c) => gen.add(c.id));
        paintComments();
        // One by one, so each person's reply appears as it's written.
        for (const c of todo) {
          if (!inBatch(s) || L.state !== s) return;
          const text = await write(c, "public");
          if (!inBatch(s)) return;
          if (text === null) { batch.failed = true; todo.forEach((x) => gen.delete(x.id)); paintComments(); return; }
          const slot = $(`[data-batch-slot="${c.id}"]`);
          if (slot) keepFocus(() => { slot.innerHTML = batchSlotHTML(s, c); });
          paintDock();
        }
        $(`[data-batch]`)?.focus({ preventScroll: true });
      }
      async function sendBatch(b) {
        const list = batchReady(s);
        if (!list.length) return;
        await L.pending(b, "Sending…", () => L.sleep(1000));
        if (L.state !== s) return;
        list.forEach((c) => {
          const d = draftOf(c.id).public;
          c.events.push({ id: L.eid(), type: "REPLY", text: d.text.trim(), ai: !!d.ai, age: "now" });
          c.status = "DONE"; c.unread = false;
          draftOf(c.id).public = { text: "", ai: false };
        });
        batch = null;
        s.inbox.active = visibleWaiting(s)[0]?.id || null;
        paintComments();
        paintTop();
        L.toast(`${list.length} ${list.length === 1 ? "reply" : "replies"} posted`, { description: "Each one is under that person's comment on Instagram.", tone: "success", duration: 2800 });
        autoDraft();
      }

      root.addEventListener("input", (e) => {
        const t = e.target;
        if (t.dataset.batch) {
          const d = draftOf(t.dataset.batch).public;
          d.text = t.value;
          if (!d.text.trim()) { d.ai = false; d.edited = false; } else if (d.ai) d.edited = true;
          return paintDock();
        }
        if (t.id !== "reply") return;
        const d = draftOf(s.inbox.active);
        const m = d[d.mode];
        m.text = t.value;
        // Cleared the draft? What comes next is the creator's own words, not AI-assisted.
        if (!m.text.trim()) { m.ai = false; m.edited = false; } else if (m.ai) m.edited = true;
        setSend();
      });
      root.addEventListener("submit", (e) => { if (e.target.matches("[data-composer]")) { e.preventDefault(); send(); } });
      root.addEventListener("click", async (e) => {
        const prow = e.target.closest("[data-post]");
        if (prow) return openPost(prow.dataset.post);
        if (e.target.closest("[data-pub]")) return; // the publishing module handles its own controls
        const f = e.target.closest("[data-filter]");
        if (f) {
          s.inbox.cat = f.dataset.filter;
          batch = null;
          if (!visible(s).some((x) => x.id === s.inbox.active)) s.inbox.active = visibleWaiting(s)[0]?.id || null;
          paintComments();
          return autoDraft();
        }
        const skip = e.target.closest("[data-skip]");
        if (skip) {
          const id = skip.dataset.skip;
          batch.skip.has(id) ? batch.skip.delete(id) : batch.skip.add(id);
          $(`[data-batch-slot="${id}"]`).innerHTML = batchSlotHTML(s, s.convos.find((x) => x.id === id));
          return paintDock();
        }
        const reply = e.target.closest("[data-reply]");
        if (reply) { s.inbox.active = null; return activate(reply.dataset.reply); }
        const ce = e.target.closest("[data-catedit]");
        if (ce) { catEdit = ce.dataset.catedit; paintComments(); return L.$(`[data-for="${catEdit}"][aria-checked="true"]`, root)?.focus(); }
        const setcat = e.target.closest("[data-setcat]");
        if (setcat) { catEdit = null; return recategorize(s.convos.find((x) => x.id === setcat.dataset.for), setcat.dataset.setcat); }
        const mode = e.target.closest("[data-replyas]");
        if (mode && !mode.disabled) {
          draftOf(s.inbox.active).mode = mode.dataset.replyas;
          confirmFor = null;
          paintComments();
          $("#reply")?.focus();
          return autoDraft();
        }
        const a = e.target.closest("[data-action]");
        if (!a) return;
        const c = cur();
        switch (a.dataset.action) {
          case "connect": return L.connectFlow("INSTAGRAM");
          case "connect-fb": return L.connectFlow("FACEBOOK");
          case "reconnect": return L.connectFlow("INSTAGRAM", { reconnect: true });
          case "upgrade": return L.upgradeModal("AI reply suggestions");
          case "upgrade-post": return L.upgradeModal("Post to All");
          case "new-post": s.inbox.view = "new"; batch = null; paint(); return $("#caption")?.focus({ preventScroll: true });
          case "close-new": s.inbox.view = "post"; paint(); return autoDraft();
          case "clear-filter": s.inbox.cat = "ALL"; return paintComments();
          case "batch": return startBatch();
          case "batch-retry": return startBatch();
          case "batch-cancel": batch = null; s.inbox.active = visibleWaiting(s)[0]?.id || null; paintComments(); return autoDraft();
          case "close-reply": s.inbox.active = null; confirmFor = null; return paintComments();
          case "batch-send": return sendBatch(a);
          case "refresh": {
            await L.pending(a, "", () => L.sleep(900));
            // The prototype has one new comment to find; after that, Instagram has nothing new.
            if (s.persona !== "new" && L.state === s && !s.convos.some((x) => x.user === "rosa.lane")) {
              L.engage.receive(s, { user: "rosa.lane", post: "p2", text: "Just ordered the speckled bowl! Does it come gift wrapped?" });
              return L.toast("1 new comment", { description: "On “Spring collection drops Friday…”", action: { label: "Open", onClick: () => openPost("p2") } });
            }
            return L.toast("You're up to date", { description: "No new comments since the last check.", duration: 2200 });
          }
          case "suggest": return suggest(c);
          case "keep": confirmFor = null; paintComments(); return $("#reply")?.focus();
          case "replace": confirmFor = null; return suggest(c, { force: true });
          case "done": return markDone(s.convos.find((x) => x.id === a.dataset.id) || c);
        }
      });

      function markDone(c) {
        c.status = "DONE"; c.unread = false;
        if (c.id === s.inbox.active) next(); else { paintComments(); paintTop(); }
        L.toast("Skipped — no reply needed", { action: { label: "Undo", onClick: () => { c.status = "TODO"; paintComments(); paintTop(); } } });
      }
      function recategorize(c, cat) {
        const prev = c.cat, prevBy = c.catBy;
        if (prev === cat) return paintComments();
        c.cat = cat; c.catBy = "YOU";
        if (s.inbox.cat !== "ALL" && s.inbox.cat !== cat) {
          const wasActive = c.id === s.inbox.active;
          L.toast(`Moved to ${catOf(cat).label}`, { duration: 3000, action: { label: "Undo", onClick: () => { c.cat = prev; c.catBy = prevBy; if (wasActive) s.inbox.active = c.id; paintComments(); } } });
          if (wasActive) return next(); // it left this filter; the next person waiting here is ready
        }
        paintComments();
      }
      async function suggest(c, { force } = {}) {
        if (!c) return;
        const d = draftOf(c.id);
        const mode = d.mode;
        const m = d[mode];
        // Never overwrite words the creator typed without asking.
        if (!force && m.text.trim() && (!m.ai || m.edited)) { confirmFor = c.id; paintComments(); return L.$('[data-action="replace"]', root)?.focus(); }
        gen.add(c.id);
        paintComments();
        const full = await write(c, mode);
        if (!root.isConnected || s.inbox.active !== c.id) return;
        if (full === null) {
          paintComments();
          const box = L.$("[data-ai-error]", root);
          if (box) box.innerHTML = L.alert({ tone: "danger", title: "Couldn't write a suggestion", description: "The AI service didn't respond. Try again, or write your own reply." });
          return;
        }
        d[mode].text = "";
        paintComments();
        const ta = L.$("#reply", root);
        if (!ta) { d[mode].text = full; return; }
        ta.focus({ preventScroll: true });
        for (let i = 1; i <= full.length; i += 3) { // stream it in, like the model does
          if (!ta.isConnected) break;
          ta.value = full.slice(0, i);
          await L.sleep(12);
        }
        if (ta.isConnected) { ta.value = full; ta.setSelectionRange(full.length, full.length); }
        d[mode].text = full;
        setSend();
      }
      async function send() {
        const c = cur();
        if (!c) return;
        const d = draftOf(c.id);
        const mode = d.mode;
        const m = d[mode];
        if (!m.text.trim() || gen.has(c.id)) return;
        if (mode === "private" && !c.dm) return; // never simulate a message Instagram wouldn't deliver
        const b = L.$('[data-composer] [type="submit"]', root);
        await L.pending(b, "Sending…", () => L.sleep(800));
        if (L.state !== s) return;
        const wasTodo = c.status === "TODO";
        c.events.push({ id: L.eid(), type: mode === "private" ? "DM_OUT" : "REPLY", text: m.text.trim(), ai: !!m.ai, age: "now" });
        c.status = "DONE"; c.unread = false;
        d[mode] = { text: "", ai: false };
        if (d.mode === "private") d.mode = "public"; // a comment stays the default for the next message
        if (wasTodo) next(); else { paintComments(); paintTop(); }
        L.toast(mode === "private" ? "Message sent" : "Reply posted", { description: mode === "private" ? `Delivered to ${c.user}'s Instagram inbox.` : `Under ${c.user}'s comment on Instagram.`, tone: "success", duration: 2400 });
      }

      // Keyboard: J/K moves between comments on this post, ⌘/Ctrl+Enter sends
      const onKey = (e) => {
        if (document.querySelector(".modal__backdrop, .lk-pop")) return;
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && e.target.id === "reply") { e.preventDefault(); return send(); }
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
        const k = e.key.toLowerCase();
        if ((k !== "j" && k !== "k") || s.inbox.view !== "post" || inBatch(s)) return;
        const list = visible(s);
        const i = list.findIndex((x) => x.id === s.inbox.active);
        const n = list[Math.max(0, Math.min(list.length - 1, i + (k === "j" ? 1 : -1)))];
        if (n) { e.preventDefault(); activate(n.id, { focus: false }); L.$(`[data-cmt="${n.id}"]`, root)?.focus({ preventScroll: true }); }
      };
      document.addEventListener("keydown", onKey);
      L.onLeave(() => document.removeEventListener("keydown", onKey));
      autoDraft();
    },
  };
})();
