/* Settings — one column, four short sections: Account, Connections, AI replies, Plan. */
(function () {
  const L = window.L;
  const { esc, icon, btn } = L;
  let aiDraft = null;
  let accDraft = null;

  const section = (id, title, body, aside = "") => `<section id="${id}" class="lk-settings__section" aria-labelledby="${id}-title"><div class="lk-settings__sechead"><h2 class="lk-h3" id="${id}-title">${title}</h2>${aside}</div>${body}</section>`;
  const row = (title, desc, control = "") => `<div class="lk-setrow"><div><div class="lk-setrow__title">${title}</div>${desc ? `<div class="lk-setrow__desc">${desc}</div>` : ""}</div>${control}</div>`;

  function accountHTML(s) {
    const live = s.user.published !== false;
    return section("account", "Account", `<div class="card lk-card lk-card--flush">
        <form class="lk-setrow lk-setrow--stack" data-account-form novalidate>
          ${L.field({ id: "acc-slug", label: "Page address", value: accDraft.slug, prefix: "linkee.bio/", attrs: { autocapitalize: "none", spellcheck: "false" }, description: "Changing it breaks links you've already shared." })}
          <div class="lk-row" style="justify-content:flex-end" data-acc-actions hidden>${btn({ label: "Save address", variant: "primary", size: "sm", type: "submit" })}</div>
        </form>
        ${row(`Page is ${live ? "public" : "hidden"}`, live ? "Anyone with your link can see it." : "Visitors see “This page isn't available”. Your links and stats are kept.", L.switch({ id: "published", checked: live, aria: "Page is public", action: "published" }))}
        ${row("Email", `${esc(s.user.email)} · used to log in`)}
      </div>`);
  }
  function connectionsHTML(s) {
    const limit = L.PLANS[s.user.plan].maxAccounts;
    const rows = s.accounts.map((a) => {
      const ig = a.provider === "INSTAGRAM";
      const ok = a.status === "CONNECTED";
      return `<div class="lk-conn" data-acct="${a.id}"><span class="lk-conn__logo ${ig ? "lk-net-ig" : "lk-net-fb"}">${icon(ig ? "logo-instagram" : "logo-facebook")}</span>
        <div style="min-width:0"><div class="lk-ellipsis" style="font-weight:500;font-size:14px">${ig ? "@" + esc(a.handle) : esc(a.name)}</div>
        <div class="lk-xs ${ok ? "lk-muted" : "lk-warn-text"}" style="margin-top:2px">${ok ? `${ig ? "Instagram · comments and posting" : "Facebook Page · posting"}` : "Needs reconnecting"}</div></div>
        <div class="lk-conn__actions">${ok ? "" : btn({ label: "Reconnect", variant: "primary", size: "sm", action: "reconnect" })}${btn({ label: "Disconnect", variant: "ghost", size: "sm", action: "disconnect", attrs: { "aria-label": `Disconnect ${ig ? "@" + a.handle : a.name}` } })}</div></div>`;
    }).join("");
    const add = `<div class="lk-conn-add">${btn({ label: "Instagram", icon: "logo-instagram", variant: "tertiary", size: "sm", action: "connect-ig", attrs: { "aria-label": "Connect Instagram" } })}${btn({ label: "Facebook Page", icon: "logo-facebook", variant: "tertiary", size: "sm", action: "connect-fb", attrs: { "aria-label": "Connect a Facebook Page" } })}</div>`;
    return section("connections", "Connections", `<div class="card lk-card lk-card--flush">${rows || row("No accounts yet", "Connect Instagram for your Inbox, and Instagram or a Facebook Page to publish.")}</div>
      <p class="lk-xs lk-muted" style="margin:8px 0 0">${s.accounts.length} of ${limit} accounts on ${L.PLANS[s.user.plan].label}</p>`, add);
  }
  function aiHTML(s) {
    if (!L.isPro())
      return section("ai", "AI replies", `<div class="card lk-card lk-card--flush">${row("Reply faster with AI", "A suggested reply in your tone for any comment, and careful auto-reply for simple ones. Included in Pro.", btn({ label: "Upgrade", variant: "primary", size: "sm", action: "upgrade" }))}</div>`);
    const a = aiDraft;
    const p = L.PLANS.PRO;
    const igAcct = s.accounts.find((x) => x.provider === "INSTAGRAM");
    const meter = (label, used, max) => `<div class="lk-meter"><div class="lk-row lk-row--between lk-small"><span>${label}</span><span class="lk-num lk-muted">${used} / ${max}</span></div><div class="lk-meter__track" role="progressbar" aria-label="${label}" aria-valuenow="${used}" aria-valuemax="${max}"><div class="lk-meter__fill" style="width:${(used / max) * 100}%"></div></div></div>`;
    const toneDesc = L.TONES.find((t) => t.id === a.tone).description;
    return section("ai", "AI replies", `<div class="card lk-card lk-card--flush" style="margin-bottom:12px">
        ${row("Auto-reply", a.autoReply ? "On. Linkee answers simple comments in your tone." : "Off. Nothing is posted unless you press Send.", L.switch({ id: "auto", checked: a.autoReply, aria: "Auto-reply", action: "auto", disabled: !igAcct || igAcct.status !== "CONNECTED" }))}
        <div class="lk-setrow" style="display:block"><div class="lk-usage">${meter("Suggestions today", s.ai.usage.suggestions, p.suggestionsPerDay)}${meter("Auto-replies today", s.ai.usage.autoReplies, p.autoRepliesPerDay)}</div></div>
      </div>
      <form class="card lk-card" data-ai-form novalidate>
        <div class="lk-field"><span class="label">Tone</span>${L.seg("tone", L.TONES, a.tone, { label: "Tone", full: true })}<span class="description" data-tone-desc>${toneDesc}</span></div>
        <div class="lk-field"><label class="label" for="ai-lang">Reply language</label><select class="input input--secondary" id="ai-lang">${L.LANGUAGES.map(([v, l]) => `<option value="${v}" ${a.language === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
        ${L.field({ id: "ai-brand", label: "About you", value: a.brandContext, multiline: true, rows: 4, max: L.LIMITS.brandMax, placeholder: "What you make, when drops happen, how shipping and bookings work…", description: "Facts replies can use." })}
        <div class="lk-field"><label class="label" for="ai-skip">Words to skip</label><div class="lk-tags" data-tags>${a.skipWords.map((w, i) => `<span class="lk-tag-chip">${esc(w)}<button type="button" data-untag="${i}" aria-label="Remove ${esc(w)}">${icon("xmark")}</button></span>`).join("")}<input id="ai-skip" placeholder="${a.skipWords.length ? "Add another…" : "Type a word and press Enter"}" aria-describedby="skip-desc"></div><span class="description" id="skip-desc">Auto-reply leaves comments with these words for you.</span></div>
        <div class="lk-row" style="justify-content:flex-end">${btn({ label: "Save", variant: "primary", size: "sm", type: "submit", disabled: true, attrs: { "data-ai-save": "" } })}</div>
      </form>`);
  }
  function planHTML() {
    const pro = L.isPro();
    return section("plan", "Plan", `<div class="card lk-card lk-card--flush">${pro
      ? row("Linkee Pro", "AI replies, auto-reply, publishing and up to 10 accounts.", btn({ label: "Contact support", variant: "tertiary", size: "sm", action: "support" }))
      : row("Linkee Free", "Your page, click counts and the comment inbox. Pro adds AI replies and publishing.", btn({ label: "Upgrade to Pro", variant: "primary", size: "sm", action: "upgrade" }))}</div>`);
  }

  L.views.settings = {
    title: "Settings — Linkee",
    enter(s) { aiDraft = L.clone(s.ai); accDraft = { slug: s.user.slug }; },
    render(s) {
      if (!aiDraft) this.enter(s);
      return `<div class="lk-settings"><div class="lk-pagehead"><div><h1 class="lk-h1">Settings</h1></div></div>
        ${accountHTML(s)}${connectionsHTML(s)}${aiHTML(s)}${planHTML()}</div>`;
    },
    mount(root, s, q) {
      const $ = (sel) => L.$(sel, root);
      if (q.get("section")) setTimeout(() => L.$("#" + q.get("section"), root)?.scrollIntoView({ block: "start" }), 30);

      // Account form: "Save address" appears only once the address changes.
      const accSave = () => { $("[data-acc-actions]").hidden = accDraft.slug === s.user.slug; };
      root.addEventListener("input", (e) => {
        const t = e.target;
        if (t.id === "acc-slug") {
          t.value = t.value.toLowerCase().replace(/\s/g, ""); accDraft.slug = t.value;
          const r = L.checkSlug(t.value, s.user.slug);
          L.setFieldError(root, "acc-slug", r.error, t.value === s.user.slug ? "Changing it breaks links you've already shared." : `<span style="color:var(--success-soft-foreground)">${esc(r.ok || "")}</span> · Your old link will stop working.`);
        }
        if (t.id.startsWith("acc-")) return accSave();
        if (t.id === "ai-brand") { aiDraft.brandContext = t.value; L.updateCount(root, t.id, t.value.length, L.LIMITS.brandMax); aiDirty(); }
      });
      root.addEventListener("change", (e) => { if (e.target.id === "ai-lang") { aiDraft.language = e.target.value; aiDirty(); } });
      $("[data-account-form]").addEventListener("submit", async (e) => {
        e.preventDefault();
        const r = L.checkSlug(accDraft.slug, s.user.slug);
        if (r.error) { L.setFieldError(root, "acc-slug", r.error); return $("#acc-slug").focus(); }
        const commit = async (b) => { await L.pending(b, "Saving…", () => L.sleep(600)); s.user.slug = accDraft.slug; L.render(); L.toast("Page address updated", { description: `Your page now lives at linkee.bio/${s.user.slug}.`, tone: "success" }); };
        if (accDraft.slug !== s.user.slug)
          return L.modal({ title: `Move your page to linkee.bio/${accDraft.slug}?`, icon: "triangle-exclamation", tone: "warning", description: `linkee.bio/${esc(s.user.slug)} will stop working right away. Update the link in your bios after this.`, buttons: [{ label: "Cancel" }, { label: "Change address", variant: "primary", onClick: (m, b) => commit(b) }] });
      });

      // AI form
      const aiDirty = () => { const b = $("[data-ai-save]"); if (b) b.disabled = JSON.stringify({ ...aiDraft, autoReply: 0, usage: 0 }) === JSON.stringify({ ...s.ai, autoReply: 0, usage: 0 }); };
      const paintTags = () => { const input = $("#ai-skip"); L.$$(".lk-tag-chip", root).forEach((c) => c.remove()); input.insertAdjacentHTML("beforebegin", aiDraft.skipWords.map((w, i) => `<span class="lk-tag-chip">${esc(w)}<button type="button" data-untag="${i}" aria-label="Remove ${esc(w)}">${icon("xmark")}</button></span>`).join("")); input.placeholder = aiDraft.skipWords.length ? "Add another…" : "Type a word and press Enter"; aiDirty(); };
      root.addEventListener("keydown", (e) => {
        if (e.target.id !== "ai-skip") return;
        const v = e.target.value.trim();
        if ((e.key === "Enter" || e.key === ",") && v) { e.preventDefault(); if (!aiDraft.skipWords.includes(v.toLowerCase())) aiDraft.skipWords.push(v.toLowerCase()); e.target.value = ""; paintTags(); }
        else if (e.key === "Enter") e.preventDefault();
        if (e.key === "Backspace" && !e.target.value && aiDraft.skipWords.length) { aiDraft.skipWords.pop(); paintTags(); }
      });
      $("[data-ai-form]")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (aiDraft.brandContext.length > L.LIMITS.brandMax) { L.setFieldError(root, "ai-brand", `Keep this under ${L.LIMITS.brandMax} characters`); return $("#ai-brand").focus(); }
        await L.pending(e.submitter, "Saving…", () => L.sleep(500));
        Object.assign(s.ai, { tone: aiDraft.tone, language: aiDraft.language, brandContext: aiDraft.brandContext, skipWords: [...aiDraft.skipWords] });
        aiDirty();
        L.toast("AI settings saved", { description: "New suggestions will use them.", tone: "success" });
      });

      L.wireSeg(root, (name, v) => {
        if (name !== "tone") return;
        aiDraft.tone = v;
        $("[data-tone-desc]").textContent = L.TONES.find((t) => t.id === v).description;
        aiDirty();
      });
      root.addEventListener("click", (e) => {
        const untag = e.target.closest("[data-untag]");
        if (untag) { aiDraft.skipWords.splice(Number(untag.dataset.untag), 1); paintTags(); return $("#ai-skip").focus(); }
        const a = e.target.closest("[data-action]");
        if (!a) return;
        const row = a.closest("[data-acct]");
        const acct = row && s.accounts.find((x) => x.id === row.dataset.acct);
        switch (a.dataset.action) {
          case "published": {
            const on = s.user.published === false;
            s.user.published = on;
            L.render();
            return L.toast(on ? "Your page is public" : "Your page is hidden", { description: on ? `linkee.bio/${s.user.slug} is visible again.` : "Turn it back on anytime." });
          }
          case "connect-ig": return L.connectFlow("INSTAGRAM");
          case "connect-fb": return L.connectFlow("FACEBOOK");
          case "reconnect": return L.connectFlow(acct.provider, { reconnect: true });
          case "disconnect": return disconnect(acct);
          case "upgrade": return L.upgradeModal("AI replies");
          case "support": return L.copy("hello@linkee.bio", "Support email copied");
          case "auto": {
            if (a.getAttribute("aria-disabled") === "true") return L.toast("Reconnect Instagram first", { tone: "warning" });
            if (s.ai.autoReply) { s.ai.autoReply = aiDraft.autoReply = false; L.render(); return L.toast("Auto-reply is off", { description: "Nothing is posted unless you press Send." }); }
            return L.modal({
              title: "Turn on auto-reply?",
              icon: "thunderbolt",
              description: "Linkee will answer new comments on your behalf, in your tone, using what you wrote in About you.",
              body: `<div class="lk-small" style="font-weight:500;margin-top:4px">It always leaves these for you:</div>
                <ul class="lk-checklist lk-small">${["Comments older than 24 hours, and replies inside threads", "Comments with links, 3 or more @mentions, or only emoji", "Comments with your words to skip", "Anything the AI isn't sure how to answer"].map((t) => `<li>${icon("check")}<span>${t}</span></li>`).join("")}</ul>
                <p class="lk-small lk-muted" style="margin:14px 0 0">Up to ${L.PLANS.PRO.autoRepliesPerDay} replies a day. Every auto-reply is labeled in your Inbox, and you can turn this off anytime.</p>`,
              buttons: [{ label: "Cancel" }, { label: "Turn on", variant: "primary", onClick: () => { s.ai.autoReply = aiDraft.autoReply = true; L.render(); L.toast("Auto-reply is on", { tone: "success", description: "You'll see each one in your Inbox, labeled Auto-reply." }); } }],
            });
          }
        }
      });

      function disconnect(acct) {
        const ig = acct.provider === "INSTAGRAM";
        L.modal({
          title: `Disconnect ${ig ? "@" + acct.handle : acct.name}?`,
          icon: "plug-connection", tone: "danger",
          description: ig ? "Comments stop syncing, auto-reply turns off, and you can't publish to this account. Your page and past replies stay." : "You won't be able to publish to this Page from Linkee. Past posts stay on Facebook.",
          buttons: [{ label: "Cancel" }, { label: "Disconnect", variant: "danger", onClick: async (m, b) => {
            await L.pending(b, "Disconnecting…", () => L.sleep(600));
            s.accounts = s.accounts.filter((x) => x !== acct);
            s.draft.destinations = s.draft.destinations.filter((x) => x !== acct.id);
            if (ig) { s.ai.autoReply = false; aiDraft.autoReply = false; s.convos = []; }
            L.render();
            L.toast(`${ig ? "Instagram" : "Facebook Page"} disconnected`);
          } }],
        });
      }
    },
  };
})();
