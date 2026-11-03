/* Inbox — Instagram comments. Reply yourself or with an AI suggestion you approve. */
(function () {
  const L = window.L;
  const { esc, icon, btn } = L;
  let pane = "list"; // mobile only
  let draft = {}; // commentId → { text, ai }
  let gen = null; // commentId currently generating
  let refreshed = false;
  let owner = null; // drafts belong to one session state; a new scenario starts clean

  const ig = (s) => s.accounts.find((a) => a.provider === "INSTAGRAM");
  const todo = (s) => s.comments.filter((c) => c.status === "NEW");
  const done = (s) => s.comments.filter((c) => c.status !== "NEW");
  const visible = (s) => (s.inbox.tab === "todo" ? todo(s) : done(s));

  function rowHTML(c, sel) {
    const post = L.IG_POSTS[c.post];
    const meta = c.status === "REPLIED" ? L.chip(c.reply.by === "AUTO" ? "Auto-replied" : "Replied", "success", { dot: true }) : c.status === "SKIPPED" ? L.chip("Skipped", "default") : "";
    return `<button type="button" class="lk-cmt" data-cmt="${c.id}" aria-current="${sel}" role="option" aria-selected="${sel}">
      ${c.unread ? '<span class="lk-cmt__unread" aria-label="New"></span>' : ""}${L.avatar(c.user, { size: 32 })}
      <span class="lk-grow"><span class="lk-cmt__top"><span class="lk-cmt__user">${esc(c.user)}</span><span class="lk-cmt__time">${esc(c.age)}</span></span><span class="lk-cmt__text">${esc(c.text)}</span>${meta ? `<span class="lk-cmt__meta">${meta}</span>` : ""}</span>
      <img class="lk-thumb" src="${L.art(post.art)}" width="40" height="40" alt="" style="border-radius:8px">
    </button>`;
  }
  function listHTML(s) {
    const items = visible(s);
    const sel = s.inbox.selected;
    if (!items.length)
      return s.inbox.tab === "todo"
        ? `<div class="lk-empty"><div class="lk-empty__icon" style="background:var(--success-soft);color:var(--success-soft-foreground)">${icon("circle-check", "lk-icon--lg")}</div><h2>You're all caught up</h2><p>New comments on your recent posts will show up here.</p></div>`
        : `<div class="lk-empty"><div class="lk-empty__icon">${icon("tray", "lk-icon--lg")}</div><h2>Nothing here yet</h2><p>Comments you reply to or skip will be listed here.</p></div>`;
    return `<div role="listbox" aria-label="${s.inbox.tab === "todo" ? "Comments to reply" : "Handled comments"}">${items.map((c) => rowHTML(c, c.id === sel)).join("")}</div>`;
  }

  function detailHTML(s) {
    const c = s.comments.find((x) => x.id === s.inbox.selected);
    if (!c) return `<div class="lk-empty"><div class="lk-empty__icon">${icon("comment", "lk-icon--lg")}</div><h2>Select a comment</h2><p>Pick a comment on the left to read it and reply.</p></div>`;
    const post = L.IG_POSTS[c.post];
    const account = ig(s);
    const broken = account.status !== "CONNECTED";
    const head = `<div class="lk-inbox__detailhead">${btn({ label: "Back to comments", iconOnly: true, icon: "arrow-left", variant: "ghost", size: "sm", action: "back", cls: "lk-back-mobile" })}
      ${L.avatar(c.user, { size: 32 })}<div class="lk-grow"><div style="font-weight:600;font-size:14px">${esc(c.user)}</div><div class="lk-xs lk-muted">Commented ${esc(c.age)} ago</div></div>
      ${btn({ label: "Open on Instagram", iconOnly: true, icon: "arrow-up-right-from-square", variant: "ghost", size: "sm", action: "open-ig" })}</div>`;
    const thread = `<div class="lk-inbox__thread" data-thread>
      <div class="lk-postctx"><img class="lk-thumb" src="${L.art(post.art)}" width="44" height="44" alt=""><div class="lk-grow"><div class="lk-xs lk-muted">On your post</div><div class="lk-small lk-ellipsis">${esc(post.caption)}</div></div></div>
      <div class="lk-bubble">${L.avatar(c.user, { size: 32 })}<div class="lk-bubble__body"><strong style="font-size:14px">${esc(c.user)}</strong><div>${esc(c.text)}</div></div></div>
      ${c.status === "REPLIED" ? `<div class="lk-bubble lk-bubble--reply">${L.avatar(s.user.name, { size: 32, img: s.page.avatar })}<div><div class="lk-bubble__body">${esc(c.reply.text)}</div><div class="lk-row" style="margin-top:6px">${c.reply.by === "AUTO" ? L.chip("Auto-reply", "accent", { icon: "sparkles" }) : c.reply.ai ? L.chip("AI-assisted", "accent", { icon: "sparkles" }) : L.chip("Written by you", "default")}<span class="lk-xs lk-muted">${c.reply.when || ""}</span></div></div></div>` : ""}
      ${c.status === "SKIPPED" ? L.alert({ tone: "default", title: "Skipped", description: esc(c.skipReason || "You chose not to reply."), action: btn({ label: "Move back to inbox", variant: "tertiary", size: "sm", action: "unskip" }) }) : ""}
    </div>`;
    if (c.status !== "NEW") return head + thread;

    const d = draft[c.id] || { text: "", ai: false };
    const pro = L.isPro();
    const left = Math.max(0, L.PLANS.PRO.suggestionsPerDay - s.ai.usage.suggestions);
    const generating = gen === c.id;
    const composer = `<form class="lk-composer" data-composer novalidate>
      <label class="lk-sr" for="reply">Reply to ${esc(c.user)}</label>
      <div data-ai-error></div>
      ${generating ? `<div class="textarea textarea--secondary" style="display:flex;flex-direction:column;gap:10px;justify-content:center" aria-live="polite"><span class="lk-ai-note">${icon("sparkles")}Writing a suggestion <span class="lk-typing"><i></i><i></i><i></i></span></span><div class="lk-shimmer" style="width:82%"></div><div class="lk-shimmer" style="width:56%"></div></div>`
        : `<textarea class="textarea textarea--secondary" id="reply" rows="3" placeholder="Write a reply…" ${broken ? "disabled" : ""}>${esc(d.text)}</textarea>`}
      <div class="lk-composer__bar">
        ${pro ? btn({ label: d.ai ? "Regenerate" : "Suggest reply", icon: d.ai ? "arrows-rotate-right" : "sparkles", variant: d.ai ? "ghost" : "tertiary", size: "sm", action: "suggest", disabled: broken || generating || left === 0, attrs: { title: `${left} of ${L.PLANS.PRO.suggestionsPerDay} suggestions left today` } })
          : btn({ label: "Suggest reply", icon: "lock", variant: "tertiary", size: "sm", action: "upgrade" })}
        ${d.ai && !generating ? `<span class="lk-ai-note">${icon("sparkles")}AI suggestion — edit freely before sending</span>` : ""}
        <span class="lk-grow"></span>
        ${btn({ label: "Skip", variant: "ghost", size: "sm", action: "skip", disabled: generating })}
        ${btn({ label: "Send reply", icon: "paper-plane", variant: "primary", size: "sm", type: "submit", disabled: broken || generating || !d.text.trim(), attrs: { "aria-keyshortcuts": "Meta+Enter" } })}
      </div>
      ${broken ? `<div class="lk-xs lk-muted lk-row">${icon("triangle-exclamation")}Reconnect Instagram to reply.</div>` : `<div class="lk-xs lk-muted lk-row lk-kbd-row">${L.kbd("⌘")}${L.kbd("↵")} to send · ${L.kbd("J")}${L.kbd("K")} to move between comments</div>`}
    </form>`;
    return head + thread + composer;
  }

  L.views.inbox = {
    title: "Inbox — Linkee",
    enter(s) {
      pane = "list";
      if (owner !== s) { owner = s; draft = {}; gen = null; refreshed = false; }
      if (!s.comments.find((c) => c.id === s.inbox.selected && (s.inbox.tab === "todo" ? c.status === "NEW" : c.status !== "NEW"))) s.inbox.selected = visible(s)[0]?.id || null;
      const open = s.comments.find((c) => c.id === s.inbox.selected);
      if (open && innerWidth > 900) open.unread = false; // desktop opens the first comment immediately
    },
    render(s) {
      const account = ig(s);
      if (!account)
        return `<div class="lk-pagehead"><div><h1 class="lk-h1">Inbox</h1><p class="lk-sub">Every comment on your Instagram posts, in one calm place.</p></div></div>
          <section class="card lk-card"><div class="lk-empty"><div class="lk-empty__icon lk-empty__icon--accent">${icon("logo-instagram", "lk-icon--lg")}</div><h2>Connect Instagram to see your comments</h2>
          <p>Reply to everyone from one list${L.isPro() ? ", with AI suggestions in your tone" : ""}. Linkee never posts a reply without you — unless you turn on auto-reply.</p>${btn({ label: "Connect Instagram", icon: "logo-instagram", variant: "primary", action: "connect" })}
          <p class="lk-xs lk-muted" style="margin-top:4px">Works with Instagram professional accounts (Business or Creator).</p></div></section>`;
      const n = todo(s).length;
      const broken = account.status !== "CONNECTED";
      const auto = s.ai.autoReply && L.isPro();
      return `<div class="lk-pagehead"><div><h1 class="lk-h1">Inbox</h1><p class="lk-sub">Comments on <strong style="color:var(--foreground);font-weight:500">@${esc(account.handle)}</strong> posts</p></div>
        <div class="lk-row">${L.linkBtn("#/app/settings?section=ai", { label: auto ? "Auto-reply on" : "Auto-reply off", variant: "ghost", size: "sm", icon: auto ? "thunderbolt" : "circle-xmark", cls: auto ? "lk-auto-on" : "" })}
        ${btn({ label: "Refresh", icon: "arrows-rotate-right", variant: "tertiary", size: "sm", action: "refresh", disabled: broken })}</div></div>
        ${broken ? `<div style="margin-bottom:16px">${L.alert({ tone: "warning", title: "Instagram stopped accepting this connection", description: "This happens when a password changes or access expires. Reconnect to keep replying — nothing is lost.", action: btn({ label: "Reconnect", variant: "primary", size: "sm", action: "reconnect" }) })}</div>` : ""}
        <section class="card lk-card lk-card--flush lk-inbox" data-inbox data-pane="${pane}">
          <div class="lk-inbox__list"><div class="lk-inbox__listhead">${L.seg("tab", [{ id: "todo", label: "To reply", count: n }, { id: "done", label: "Done" }], s.inbox.tab, { full: true, size: "sm", label: "Filter comments" })}</div>
            <div class="lk-inbox__scroll" data-list>${listHTML(s)}</div></div>
          <div class="lk-inbox__detail" data-detail>${detailHTML(s)}</div>
        </section>`;
    },
    mount(root, s) {
      const $ = (sel) => L.$(sel, root);
      const paint = () => {
        if (!$("[data-list]")) return;
        $("[data-list]").innerHTML = listHTML(s);
        $("[data-detail]").innerHTML = detailHTML(s);
        const tab = L.$('[data-seg="tab"][data-value="todo"] .lk-count', root);
        if (tab) tab.textContent = todo(s).length;
        $("[data-inbox]").dataset.pane = pane;
        L.updateInboxBadge();
      };
      const select = (id, { focusReply } = {}) => {
        s.inbox.selected = id;
        const c = s.comments.find((x) => x.id === id);
        if (c) c.unread = false;
        pane = "detail";
        paint();
        L.$(`[data-cmt="${id}"]`, root)?.scrollIntoView({ block: "nearest" });
        if (focusReply) $("#reply")?.focus({ preventScroll: true });
      };
      const advance = (fromIndex) => {
        const list = visible(s);
        const next = list[Math.min(fromIndex, list.length - 1)];
        s.inbox.selected = next?.id || null;
        if (!next) pane = "list";
        paint();
        if (next) $("#reply")?.focus({ preventScroll: true });
      };

      L.wireSeg(root, (name, v) => {
        if (name !== "tab") return;
        s.inbox.tab = v;
        s.inbox.selected = visible(s)[0]?.id || null;
        paint();
      });
      root.addEventListener("input", (e) => {
        if (e.target.id !== "reply") return;
        const id = s.inbox.selected;
        draft[id] = { text: e.target.value, ai: draft[id]?.ai || false };
        const send = L.$('[data-composer] [type="submit"]', root);
        if (send) send.disabled = !e.target.value.trim();
      });
      root.addEventListener("submit", (e) => { if (e.target.matches("[data-composer]")) { e.preventDefault(); send(); } });
      root.addEventListener("click", async (e) => {
        const row = e.target.closest("[data-cmt]");
        if (row) return select(row.dataset.cmt);
        const a = e.target.closest("[data-action]");
        if (!a) return;
        const c = s.comments.find((x) => x.id === s.inbox.selected);
        switch (a.dataset.action) {
          case "connect": return L.connectFlow("INSTAGRAM");
          case "reconnect": return L.connectFlow("INSTAGRAM", { reconnect: true });
          case "upgrade": return L.upgradeModal("AI reply suggestions");
          case "back": pane = "list"; return paint();
          case "open-ig": {
            const post = L.IG_POSTS[c.post];
            return L.igPostViewer({ art: post.art, caption: post.caption, handle: ig(s).handle, highlight: c.id, comments: s.comments.filter((x) => x.post === c.post) });
          }
          case "refresh": {
            await L.pending(a, "Refreshing…", () => L.sleep(900));
            if (!refreshed && s.persona !== "new") {
              refreshed = true;
              s.comments.unshift({ id: "c" + L.uid(), user: "rosa.lane", text: "Just ordered the speckled bowl! Does it come gift wrapped?", post: "p2", age: "now", status: "NEW", unread: true });
              if (s.inbox.tab === "todo" && !s.inbox.selected) s.inbox.selected = s.comments[0].id;
              paint();
              return L.toast("1 new comment", { tone: "default" });
            }
            return L.toast("You're up to date", { description: "No new comments since the last check.", duration: 2200 });
          }
          case "suggest": return suggest(c);
          case "skip": {
            const i = visible(s).indexOf(c);
            c.status = "SKIPPED"; c.skipReason = "You chose not to reply.";
            advance(i);
            return L.toast("Comment skipped", { action: { label: "Undo", onClick: () => { c.status = "NEW"; s.inbox.selected = c.id; paint(); } } });
          }
          case "unskip": c.status = "NEW"; s.inbox.tab = "todo"; L.render(); return L.toast("Moved back to inbox");
        }
      });

      async function suggest(c) {
        gen = c.id;
        paint();
        await L.sleep(1100);
        gen = null;
        if (s.sim.aiFails) {
          paint();
          L.$("[data-ai-error]", root).innerHTML = L.alert({ tone: "danger", title: "Couldn't write a suggestion", description: "The AI service didn't respond. Try again, or write your own reply." });
          return;
        }
        s.ai.usage.suggestions++;
        const full = L.SUGGESTIONS[c.id] || `Thank you so much, ${c.user.split(/[._]/)[0]}! 🤍`;
        draft[c.id] = { text: "", ai: true };
        paint();
        const ta = L.$("#reply", root);
        ta.focus();
        // Stream the text in, like the model does.
        for (let i = 1; i <= full.length; i += 3) {
          if (!ta.isConnected) break;
          ta.value = full.slice(0, i);
          await L.sleep(12);
        }
        if (ta.isConnected) { ta.value = full; ta.setSelectionRange(full.length, full.length); }
        draft[c.id].text = full;
        const sendBtn = L.$('[data-composer] [type="submit"]', root);
        if (sendBtn) sendBtn.disabled = false;
      }
      async function send() {
        const c = s.comments.find((x) => x.id === s.inbox.selected);
        const d = draft[c.id];
        if (!d || !d.text.trim()) return;
        const b = L.$('[data-composer] [type="submit"]', root);
        await L.pending(b, "Sending…", () => L.sleep(800));
        const i = visible(s).indexOf(c);
        c.status = "REPLIED"; c.unread = false;
        c.reply = { by: "YOU", ai: d.ai, text: d.text.trim(), when: "Just now" };
        delete draft[c.id];
        advance(i);
        L.toast("Reply sent", { description: `Posted under ${c.user}'s comment on Instagram.`, tone: "success", duration: 2600 });
      }

      // Keyboard: J/K moves, ⌘/Ctrl+Enter sends
      const onKey = (e) => {
        if (document.querySelector(".modal__backdrop, .lk-pop")) return;
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && e.target.id === "reply") { e.preventDefault(); return send(); }
        if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName) || e.metaKey || e.ctrlKey) return;
        const k = e.key.toLowerCase();
        if (k !== "j" && k !== "k") return;
        const list = visible(s);
        const i = list.findIndex((x) => x.id === s.inbox.selected);
        const next = list[Math.max(0, Math.min(list.length - 1, i + (k === "j" ? 1 : -1)))];
        if (next) { e.preventDefault(); select(next.id); L.$(`[data-cmt="${next.id}"]`, root)?.focus({ preventScroll: true }); }
      };
      document.addEventListener("keydown", onKey);
      L.onLeave(() => document.removeEventListener("keydown", onKey));
    },
  };
})();
