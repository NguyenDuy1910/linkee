/* Action Explorer catalog: every user-facing action in the prototype, with a scripted demo.
   Step = { text (what the reviewer reads), target (element to spotlight), run (what the demo does) }. */
(function () {
  const L = window.L;
  L.CATALOG_GROUPS = [
    { id: "landing", label: "Landing", icon: "globe" },
    { id: "auth", label: "Sign up & log in", icon: "person-plus" },
    { id: "onboarding", label: "Onboarding", icon: "sparkles" },
    { id: "page", label: "My Page", icon: "person" },
    { id: "public", label: "Public page", icon: "link" },
    { id: "inbox", label: "Inbox", icon: "comments" },
    { id: "publish", label: "Posts", icon: "paper-plane" },
    { id: "settings", label: "Settings", icon: "gear" },
    { id: "global", label: "Navigation & account", icon: "bars" },
  ];
  const C = (L.CATALOG = []);
  const A = (a) => C.push(a);
  const S = (text, target, run, extra = {}) => ({ text, target, run, ...extra });
  const btn1 = '.modal__footer [data-modal-btn="1"]';
  // My Page sheets: one full-width primary button (Done / Add link / Save); Design also has Cancel.
  const shDone = ".lk-sheet .lk-sheet__done";
  const shCancel = ".lk-sheet .lk-sheet__cancel";
  const draftState = '[data-publish] [data-state="draft"]';
  const publishBtn = '[data-publish] [data-action="publish"]';
  const published = (T) => T.until(() => !L.$(draftState), 4000);
  const toastUndo = ".lk-toasts .toast__action";
  const toastBtn = (label) => () => L.T.byText(".lk-toasts .toast__action", label)();
  // Inbox: one post at a time; its comments are `[data-cmt]` cards, the active one holds the composer.
  const row = (id) => `[data-cmt="${id}"]`;
  const activeRow = (id) => `[data-cmt="${id}"][data-active="true"]`;
  const railPost = (id) => `[data-rail] [data-post="${id}"]`;
  const sendBtn = '[data-composer] [type="submit"]';
  /** "Reply" under a comment: makes it the one the reply bar answers. */
  const replyTo = (id) => `[data-reply="${id}"]`;
  const skipBtn = (id) => `[data-action="done"][data-id="${id}"]`;
  /** The AI draft for the active comment has finished writing into the reply bar (Post turns on). */
  const draftReady = (T) => T.until(() => { const b = L.$(sendBtn); return !L.$("[data-dock] .lk-ig__writing") && !!L.$("#reply") && !!b && !b.disabled; }, 8000);
  const openPost = (id) => async (T) => { await T.click(railPost(id)); await draftReady(T); };
  // The Prototype panel stands in for Instagram: it delivers comments the way the webhook would.
  const openReview = async (T) => { if (!L.$("#lk-review")) await T.click('[data-r="toggle"]'); };
  const closeReview = async (T) => { if (L.$("#lk-review")) await T.click('[data-r="toggle"]'); };
  const simulate = (from, post, text) => async (T) => {
    await openReview(T);
    await T.set('[data-sim="from"]', from);
    if (post) await T.set('[data-sim="post"]', post);
    await T.type('[data-sim="text"]', text);
    await T.click('[data-sim-form] [type="submit"]');
  };

  // ── Landing ─────────────────────────────────────────────────────────────
  A({
    id: "landing-hero", group: "landing", scene: "Visitor", title: "One promise, one button",
    summary: "“One link. All of you.”, a single Go to your page button, and real Linkee pages beside it.",
    what: ["Nothing competes with the one action: no feature grid, pricing table or second form.", "The examples are real pages rendered by the same renderer as My Page, so what visitors see is what they'll get."],
    states: ["Example auto-advances", "Paused on hover or focus", "Reduced motion: no typing, no auto-advance"],
    ui: "Button primary lg, carousel dots (tablist)", prod: "app/page.tsx",
    outcome: "Go to your page opens sign-up.",
    setup: (T) => T.scene("new", "#/"),
    steps: [
      S("The top bar is the logo and one button: Log in (Dashboard once signed in).", ".lk-mkt-nav"),
      S("Each dot brings another creator's page forward; the address above types itself.", ".lk-stage__dots", (T) => T.click('.lk-stage__dot[data-demo="1"]'), { cta: "Show another page" }),
      S("The address now reads linkee.bio/socalfoodie.", ".lk-stage__url"),
      S("One button starts everything.", ".lk-hero__cta", (T) => T.click(".lk-hero__cta"), { cta: "Go to your page" }),
      S("Sign-up opens with the username field first.", '[data-field="slug"]'),
    ],
    try: { text: "Pick another example with the dots, then press Go to your page.", target: ".lk-hero__cta", done: () => location.hash.startsWith("#/signup") },
  });
  A({
    id: "landing-faq", group: "landing", scene: "Visitor", title: "Questions, answered",
    summary: "Four plain questions under the hero; plans and data deletion are answered here, with short legal pages in the footer.",
    what: ["Pricing is one sentence in “Who is Linkee.bio for?” rather than a pitch.", "Privacy and Delete your data are real pages — Meta requires both before an app can go Live."],
    states: ["First answer open", "Expand / collapse", "Legal page"],
    ui: "Disclosure (details/summary), footer links", prod: "app/page.tsx · app/privacy · app/data-deletion",
    outcome: "The data deletion page explains disconnecting and full account deletion.",
    setup: (T) => T.scene("new", "#/"),
    steps: [
      S("Four questions; the first is already open.", ".lk-faq"),
      S("“How do I delete my data?” answers in place.", '[data-faq="delete"]', (T) => T.click('[data-faq="delete"] summary'), { cta: "Open it" }),
      S("The footer links to Contact, Terms, Privacy, Delete your data and Instagram.", ".lk-footer__links", (T) => T.click('.lk-footer__links a[href="#/data-deletion"]'), { cta: "Delete your data" }),
      S("A short page: disconnecting, deleting the account, and removing the app from Instagram or Facebook.", ".lk-legal"),
    ],
  });

  // ── Sign up & log in ─────────────────────────────────────────────────────
  A({
    id: "claim-taken", group: "auth", scene: "Visitor", title: "Username taken → suggestion",
    summary: "A taken name explains itself and offers a one-click alternative.",
    what: ["Dead ends on the very first field kill conversion; a suggestion keeps momentum."],
    states: ["Taken", "Suggestion", "Available"],
    ui: "TextField error description, inline text button", prod: "lib/bio.ts (slug rules) · app/signup",
    outcome: "The suggestion replaced the taken name and is available.",
    setup: (T) => T.scene("new", "#/signup"),
    steps: [
      S("Someone types a name that's already in use…", "#slug", (T) => T.type("#slug", "maya"), { cta: "Type “maya”" }),
      S("…and sees why, plus a suggested alternative right under the field.", '[data-field="slug"]', (T) => T.click("[data-suggest]"), { cta: "Use suggestion" }),
      S("One click later the field holds an available name.", '[data-field="slug"]'),
    ],
  });
  A({
    id: "claim-invalid", group: "auth", scene: "Visitor", title: "Reserved and invalid usernames",
    summary: "Reserved words and bad characters each get a specific message as you type.",
    states: ["Reserved", "Invalid characters", "Available"],
    ui: "TextField validation", prod: "lib/bio.ts RESERVED_SLUGS + slug schema",
    outcome: "Every bad input explains exactly what to change.",
    setup: (T) => T.scene("new", "#/signup"),
    steps: [
      S("Product words like “settings” are reserved so they never collide with app routes.", "#slug", (T) => T.type("#slug", "settings"), { cta: "Type “settings”" }),
      S("Only letters, numbers, dots, dashes and underscores are allowed (3–30 characters).", '[data-field="slug"]', (T) => T.type("#slug", "-maya-"), { cta: "Type “-maya-”" }),
      S("A valid, free name turns green.", '[data-field="slug"]', (T) => T.type("#slug", "alex.k"), { cta: "Type “alex.k”" }),
    ],
  });

  A({
    id: "signup-errors", group: "auth", scene: "Visitor", title: "Sign up with missing fields",
    summary: "Inline errors under each field; focus jumps to the first problem.",
    what: ["Errors sit next to the field they belong to (HeroUI FieldError), never in a banner far away."],
    states: ["Field errors", "Availability kept", "Focus on first error"],
    ui: "TextField + FieldError, Button pending", prod: "app/signup/signup-form.tsx",
    outcome: "Name, email and password show what's missing; the username stays confirmed.",
    setup: (T) => T.scene("new", "#/signup?u=alex.k"),
    steps: [
      S("The username is already filled in and confirmed available.", '[data-field="slug"]'),
      S("Submitting with empty fields…", ".lk-auth [data-form] button[type=submit]", (T) => T.click(".lk-auth [data-form] button[type=submit]"), { cta: "Submit" }),
      S("…shows a specific message under each field and moves focus to Name.", ".lk-auth [data-form] .lk-stack"),
    ],
    try: { text: "The form opens with sample data. Clear the Email field and press “Create my page”.", target: '[data-field="email"]', done: () => !!document.querySelector(".lk-auth .field-error") },
  });
  A({
    id: "signup-existing", group: "auth", scene: "Visitor", title: "Email already has an account",
    summary: "The email field explains it, and a toast offers Log in instead.",
    states: ["Pending", "Email error", "Toast with action"],
    ui: "FieldError, Toast with action", prod: "app/signup/signup-form.tsx",
    outcome: "Instead of a dead end, the person is one click from logging in.",
    setup: (T) => T.scene("new", "#/signup?u=alex.k"),
    steps: [
      S("Someone signs up with an email that already has a Linkee account.", ".lk-auth [data-form]", async (T) => { await T.type("#name", "Maya Rivers"); await T.type("#email", "maya@mayarivers.studio"); await T.type("#password", "Ceramics2026"); }, { cta: "Fill the form" }),
      S("Create my page shows a pending state while it checks.", ".lk-auth [data-form] button[type=submit]", (T) => T.click(".lk-auth [data-form] button[type=submit]"), { cta: "Submit" }),
      S("The email field says what happened, and the toast offers Log in.", '[data-field="email"]', async (T) => { await T.$(".lk-toasts .toast__action", 3000); }),
      S("“Log in” in the toast is a direct way out.", ".lk-toasts .toast"),
    ],
  });
  A({
    id: "signup-success", group: "auth", scene: "Visitor", title: "Create an account",
    summary: "One short form, then straight into a two-step setup with the page already live.",
    what: ["No password-strength meter: the 8-character rule is stated once under the field and only shown as an error if it's broken.", "The username field shows live availability and nothing else."],
    ui: "Form, password show/hide (Button icon-only), Button pending", prod: "app/signup/signup-form.tsx → /dashboard",
    outcome: "The account exists and onboarding opened at step 1 of 2.",
    setup: (T) => T.scene("new", "#/signup?u=alex.k"),
    steps: [
      S("Four fields: username (prefilled and confirmed available), name, email, password.", ".lk-auth [data-form]", async (T) => { await T.type("#name", "Alex Kim"); await T.type("#email", "alex@example.com"); await T.type("#password", "Pottery-2026"); }, { cta: "Fill the form" }),
      S("The eye button shows what you typed — handy on phones.", '[data-pw-toggle="password"]', (T) => T.click('[data-pw-toggle="password"]'), { cta: "Show password" }),
      S("Create my page.", ".lk-auth [data-form] button[type=submit]", async (T) => { await T.click(".lk-auth [data-form] button[type=submit]"); await T.$(".lk-onb", 4000); }, { cta: "Submit" }),
      S("Setup starts with the live preview on the right.", ".lk-onb__main"),
    ],
  });
  A({
    id: "login-error", group: "auth", scene: "Visitor", title: "Log in with the wrong password",
    summary: "One clear alert above the form; the password is selected so retyping is instant.",
    ui: "Alert (danger), TextField", prod: "app/login/login-form.tsx",
    outcome: "The alert doesn't say which field was wrong (for security), and the password is ready to retype.",
    setup: (T) => T.scene("new", "#/login"),
    steps: [
      S("Email is remembered; the password is wrong.", "#password", (T) => T.type("#password", "wrong"), { cta: "Type a wrong password" }),
      S("Log in…", ".lk-auth [data-form] button[type=submit]", (T) => T.click(".lk-auth [data-form] button[type=submit]"), { cta: "Log in" }),
      S("…shows a single alert. It doesn't reveal whether the email exists.", "[data-form-error]", (T) => T.$("[data-form-error] .alert", 3000)),
    ],
    try: { text: "Type “wrong” as the password and log in.", target: "#password", done: () => !!document.querySelector("[data-form-error] .alert") },
  });
  A({
    id: "login-success", group: "auth", scene: "Visitor", title: "Log in as a returning creator",
    summary: "Lands on My Page (no dashboard detour) with a welcome-back note.",
    ui: "Form, Toast", prod: "app/login/login-form.tsx → /dashboard/my-page",
    outcome: "My Page opened, and the Inbox badge shows what's waiting.",
    setup: (T) => T.scene("new", "#/login"),
    steps: [
      S("Password in, Log in.", ".lk-auth [data-form]", async (T) => { await T.type("#password", "ceramics"); await T.click(".lk-auth [data-form] button[type=submit]"); await T.$("[data-canvas]", 4000); }, { cta: "Log in" }),
      S("My Page is home. The toast says what's new since last time.", ".lk-toasts .toast"),
      S("The Inbox badge counts conversations waiting for a reply.", ".lk-nav [data-inbox-badge]"),
    ],
  });

  // ── Onboarding ───────────────────────────────────────────────────────────
  A({
    id: "onb-theme", group: "onboarding", scene: "Just signed up", title: "Step 1 of 2 — pick a look",
    summary: "Six themes and four fonts, previewed instantly.",
    what: ["Setup is two steps, not four: photo and bio moved to My Page, where the empty spots on the page itself say what to add.", "Seeing the page come alive is the moment people get Linkee; the live preview delivers it in seconds."],
    ui: "Radio cards (theme), Tabs as segmented control", prod: "components/bio/editor/appearance-section.tsx",
    outcome: "The page switched to Midnight with a serif font, and step 2 opened.",
    setup: (T) => T.scene("newUser", "#/welcome"),
    steps: [
      S("Themes are full looks — background, text and button colors together.", '[data-theme="midnight"]', (T) => T.click('[data-theme="midnight"]'), { cta: "Pick Midnight" }),
      S("Fonts are a one-click switch.", '[data-seg="font"][data-value="serif"]', (T) => T.click('[data-seg="font"][data-value="serif"]'), { cta: "Pick Serif" }),
      S("The preview shows exactly what visitors will see.", ".lk-onb__aside .lk-phone"),
      S("Continue to the last step.", ".lk-onb__form button[type=submit]", async (T) => { await T.click(".lk-onb__form button[type=submit]"); await T.$("#url", 3000); }, { cta: "Continue" }),
    ],
  });
  A({
    id: "onb-link", group: "onboarding", scene: "Just signed up", title: "Step 2 of 2 — first link, then My Page",
    summary: "Paste a URL, the title fills itself, Finish opens the live page.",
    what: ["No separate success screen: Finish lands on the real page, with one line saying it's live and a Copy link button."],
    states: ["Invalid URL", "Auto title", "My Page with “Your page is live”"],
    ui: "TextField ×2, Button primary", prod: "New in prototype",
    outcome: "My Page opened with the new link and “Your page is live”.",
    setup: async (T) => { await T.scene("newUser", "#/welcome"); await T.click(".lk-onb__form button[type=submit]"); },
    steps: [
      S("A typo is caught before the step can finish.", "#url", async (T) => { await T.type("#url", "my shop"); await T.click(".lk-onb__form button[type=submit]"); }, { cta: "Try a bad URL" }),
      S("Pasting a real address fills the title automatically (YouTube, Etsy, Substack… are recognized).", "#url", (T) => T.type("#url", "youtube.com/@alexcooks"), { cta: "Paste a URL" }),
      S("Finish.", ".lk-onb__form button[type=submit]", async (T) => { await T.click(".lk-onb__form button[type=submit]"); await T.$("[data-welcome]", 3000); }, { cta: "Finish" }),
      S("Straight to My Page. One line says the page is live, with Copy link.", "[data-welcome]"),
    ],
  });
  A({
    id: "onb-skip", group: "onboarding", scene: "Just signed up", title: "Skip for now",
    summary: "Skipping lands on My Page; the empty page shows what to add next.",
    what: ["Nothing blocks reaching the workspace. The page is already live, and its empty spots (“Add a short bio”, “+ Add link”) work as the to-do list."],
    ui: "Button ghost", prod: "New in prototype",
    outcome: "My Page opened with the look picked so far.",
    setup: (T) => T.scene("newUser", "#/welcome"),
    steps: [
      S("“Skip for now” is always in the corner.", '[data-action="skip"]', async (T) => { await T.click('[data-action="skip"]'); await T.$("[data-canvas]", 3000); }, { cta: "Skip" }),
      S("The page itself shows what's missing. Click any part to fill it in.", "[data-canvas]"),
    ],
  });

  // ── My Page ──────────────────────────────────────────────────────────────
  A({
    id: "page-welcome", group: "page", scene: "Just finished setup", title: "“Your page is live”",
    summary: "One line after setup: the page is live, copy the link for your bio.",
    what: ["Replaces the old setup checklist. The empty page already shows what to add, so a checklist only repeated it.", "Copying the link is the one next step that matters, so it's the only button."],
    states: ["Notice", "Copied → notice gone"],
    ui: "Inline status row, Button primary sm, Button icon-only", prod: "New in prototype",
    outcome: "Link copied and the notice went away.",
    setup: (T) => T.scene("newUser", "#/app/page", (s) => { s.setup.welcome = true; }),
    steps: [
      S("Right after setup, one line says the page is live.", "[data-welcome]"),
      S("Copy link is the next step; copying also clears the notice.", '[data-welcome] [data-action="copy"]', (T) => T.click('[data-welcome] [data-action="copy"]'), { cta: "Copy link" }),
      S("The address stays above the page, with its own Copy button.", ".lk-address"),
    ],
  });
  A({
    id: "page-copy", group: "page", scene: "Pro creator", title: "Open or copy your page link",
    summary: "The address above the page opens it; the button next to it copies it.",
    what: ["One home for the link instead of a URL pill on every screen. The top bar only navigates."],
    ui: "Link, Button icon-only, Toast", prod: "components/bio/copy-link-button.tsx",
    outcome: "Copied, with the address in the toast.",
    setup: (T) => T.scene("maya", "#/app/page"),
    steps: [
      S("Your address sits right above your page. Clicking it opens the public page.", ".lk-address__link"),
      S("Copy puts linkee.bio/maya on the clipboard.", '.lk-address [data-action="copy"]', (T) => T.click('.lk-address [data-action="copy"]'), { cta: "Copy" }),
      S("Copied.", ".lk-toasts .toast"),
    ],
  });
  A({
    id: "page-add-link", group: "page", scene: "Pro creator", title: "Add a link",
    summary: "The dashed “+ Add” under your links opens a small sheet: paste a URL, the title fills in, Add link.",
    what: ["One pattern for every edit: tap the thing (or its pencil), a sheet opens, one big button closes it. A dialog on desktop, a bottom sheet on phones.", "New links land at the bottom, right above “+ Add”, where you just tapped.", "Nothing is live until Publish, which sits right under the page."],
    states: ["Sheet", "Auto title", "Unpublished changes", "Highlight"],
    ui: "Modal (sheet), TextField ×2, Button primary full-width", prod: "components/bio/editor/links-section.tsx",
    outcome: "The link is on the page; Publish puts it live.",
    setup: (T) => T.scene("maya", "#/app/page"),
    steps: [
      S("“+ Add” sits under your links.", '[data-edit="add"]', (T) => T.click('[data-edit="add"]'), { cta: "Add" }),
      S("Paste the URL; the title fills itself in.", "#lk-url", (T) => T.type("#lk-url", "etsy.com/shop/mayarivers"), { cta: "Paste URL" }),
      S("Add link (or Enter) puts it on the page.", shDone, async (T) => { await T.click(shDone); await T.$(draftState, 3000); }, { cta: "Add link" }),
      S("It's on the page with a brief highlight. Under the page: “Unpublished changes” and Publish.", "[data-publish]", async (T) => { await T.click(publishBtn); await published(T); }, { cta: "Publish", doing: "Publishing…" }),
      S("Live — the toast links to the public page.", ".lk-toasts .toast"),
    ],
    try: { text: "Tap “+ Add”, paste any web address, Add link, then Publish.", target: '[data-edit="add"]', done: () => L.state.saved.links.length > 5 },
  });
  A({
    id: "page-add-invalid", group: "page", scene: "Pro creator", title: "Add a link with a bad URL",
    summary: "A malformed URL keeps the sheet open with a field error; the error clears as you fix it.",
    ui: "TextField + FieldError", prod: "lib/bio.ts normalizeUrl",
    outcome: "The sheet explains the problem; closing it leaves the page untouched.",
    setup: async (T) => { await T.scene("maya", "#/app/page"); await T.click('[data-edit="add"]'); },
    steps: [
      S("Text that isn't an address can't be added. The sheet stays open and says why.", '[data-field="lk-url"]', async (T) => { await T.type("#lk-url", "my shop"); await T.key("Enter", { target: "#lk-url" }); }, { cta: "Type “my shop” + Enter" }),
      S("Fixing it clears the error immediately.", '[data-field="lk-url"]', (T) => T.type("#lk-url", "mayarivers.studio/gift-cards"), { cta: "Fix it" }),
      S("Changed your mind? Esc (or tapping outside) closes it and nothing is added.", "[data-canvas]", async (T) => { await T.key("Escape"); await T.until(() => !L.$(".lk-sheet"), 2000); }, { cta: "Press Esc" }),
    ],
  });
  A({
    id: "page-edit-link", group: "page", scene: "Pro creator", title: "Edit a link",
    summary: "Every link shows a pencil. Tap it: title, URL, show/hide, position and Delete in one sheet.",
    what: ["Edits show on the page behind the sheet as you type.", "Everything you can do to a link is visible in its sheet — no menus."],
    ui: "Modal (sheet), TextField ×2, Switch, Button icon-only ×2", prod: "components/bio/editor/links-section.tsx",
    outcome: "The new title is on the page, waiting for Publish.",
    setup: (T) => T.scene("maya", "#/app/page"),
    steps: [
      S("Every link on the page has a pencil. Tap one.", '[data-edit-link="l2"]', (T) => T.click('[data-edit-link="l2"]'), { cta: "Tap the link" }),
      S("Rename it — the page behind updates as you type.", "#lk-title", (T) => T.type("#lk-title", "Studio notes — read the latest issue"), { cta: "Rename it" }),
      S("Enter (or Done) closes the sheet.", "#lk-title", async (T) => { await T.key("Enter", { target: "#lk-title" }); await T.until(() => !L.$(".lk-sheet"), 2000); }, { cta: "Press Enter" }),
      S("Renamed, and marked as an unpublished change.", '[data-edit-link="l2"]'),
    ],
  });
  A({
    id: "page-hide-link", group: "page", scene: "Pro creator", title: "Hide or show a link",
    summary: "Hidden links stay on your page, dimmed; the “Show on page” switch in the link's sheet toggles them.",
    what: ["Seasonal links (a market, a sale) get turned on and off more often than they get deleted."],
    ui: "Modal (sheet), Switch", prod: "components/bio/editor/links-section.tsx",
    outcome: "“Holiday market” is visible on the public page.",
    setup: (T) => T.scene("maya", "#/app/page"),
    steps: [
      S("“Holiday market” is hidden: dimmed with an eye icon here, absent for visitors.", '[data-edit-link="l5"]', (T) => T.click('[data-edit-link="l5"]'), { cta: "Tap it" }),
      S("Turn on “Show on page”.", '[data-sh="visible"]', (T) => T.click('[data-sh="visible"]'), { cta: "Show it" }),
      S("Done, then Publish.", shDone, async (T) => { await T.click(shDone); await T.until(() => !L.$(".lk-sheet"), 2000); await T.click(publishBtn); await published(T); }, { cta: "Done + Publish", doing: "Publishing…" }),
      S("It's no longer dimmed, and visitors see it.", '[data-edit-link="l5"]'),
    ],
  });
  A({
    id: "page-reorder", group: "page", scene: "Pro creator", title: "Reorder links",
    summary: "Drag a link on the page (press and hold on phones), use Alt+↑/↓, or the ↑/↓ in its sheet.",
    what: ["Every move offers Undo in a toast, so there's nothing to confirm. Keyboard moves are announced to screen readers."],
    states: ["Dragging", "Moved + Undo", "Keyboard move", "Sheet ↑/↓"],
    ui: "Draggable buttons, Toast with action, live region, Button icon-only", prod: "components/bio/editor/links-section.tsx",
    outcome: "“Book a wheel class” moved up, back, then up one with the keyboard.",
    setup: (T) => T.scene("maya", "#/app/page"),
    steps: [
      S("Drag a link to move it. “Book a wheel class” goes up two places.", '[data-edit-link="l4"]', (T) => T.drag('[data-edit-link="l4"]', '[data-edit-link="l2"]'), { cta: "Drag it up", doing: "Dragging…" }),
      S("The toast offers Undo.", toastUndo, (T) => T.click(toastUndo), { cta: "Undo" }),
      S("Back where it was. From the keyboard: focus a link and press Alt+↑.", '[data-edit-link="l4"]', async (T) => { (await T.$('[data-edit-link="l4"]')).focus(); await T.key("ArrowUp", { alt: true, target: '[data-edit-link="l4"]' }); }, { cta: "Press Alt+↑" }),
      S("Moved up one, with Undo. Screen readers hear “Moved to position 3 of 5.”", '[data-edit-link="l4"]'),
    ],
    try: { text: "Drag any link up or down on the page (on a phone, press and hold first).", target: '[data-edit-link="l4"]', done: () => L.state.page.links.map((l) => l.id).join() !== "l1,l2,l3,l4,l5" },
  });
  A({
    id: "page-delete-undo", group: "page", scene: "Pro creator", title: "Delete a link, then undo",
    summary: "“Delete link” in the link's sheet removes it at once; the toast offers Undo instead of a confirm dialog.",
    what: ["Reversible actions shouldn't interrupt. Undo is faster and safer than “Are you sure?”"],
    ui: "Modal (sheet), Button ghost (danger), Toast with action", prod: "components/bio/editor/links-section.tsx",
    outcome: "The link came back in its original position.",
    setup: (T) => T.scene("maya", "#/app/page"),
    steps: [
      S("Tap the link…", '[data-edit-link="l3"]', (T) => T.click('[data-edit-link="l3"]'), { cta: "Tap it" }),
      S("…“Delete link” is at the bottom of its sheet.", '[data-sh="delete"]', (T) => T.click('[data-sh="delete"]'), { cta: "Delete" }),
      S("Gone from the page — and the toast offers Undo.", toastUndo, (T) => T.click(toastUndo), { cta: "Undo" }),
      S("Back where it was.", '[data-edit-link="l3"]'),
    ],
  });
  A({
    id: "page-profile", group: "page", scene: "Pro creator", title: "Change photo, name or bio",
    summary: "The pencil on the photo (or tapping the name or bio) opens one Profile sheet: photo, name, bio.",
    what: ["Photo and bio are easiest to write while looking at the page they belong to — it updates behind the sheet.", "Change photo and Remove are both visible buttons; Remove has Undo."],
    states: ["Photo changed", "Photo removed + Undo", "Typing", "Unpublished changes"],
    ui: "Modal (sheet), Avatar, Button ×2, TextField, TextArea, Toast with action", prod: "components/bio/editor/profile-section.tsx",
    outcome: "The new bio is on the page, waiting for Publish.",
    setup: (T) => T.scene("maya", "#/app/page"),
    steps: [
      S("Tap the photo's pencil.", '[data-edit="profile"][data-focus="photo"]', (T) => T.click('[data-edit="profile"][data-focus="photo"]'), { cta: "Tap the photo" }),
      S("Change photo swaps it (the upload is simulated).", '[data-sh="photo"]', (T) => T.click('[data-sh="photo"]'), { cta: "Change photo" }),
      S("Remove takes it off, with Undo in the toast.", '[data-sh="photo-remove"]', async (T) => { await T.click('[data-sh="photo-remove"]'); await T.click(toastBtn("Undo")); }, { cta: "Remove + Undo" }),
      S("Rewrite the bio; the page behind follows along.", "#pf-bio", (T) => T.type("#pf-bio", "Ceramics & slow mornings. Spring drop is live — first Fridays, 10am PT."), { cta: "Edit bio" }),
      S("Done. Publish is waiting under the page.", shDone, async (T) => { await T.click(shDone); await T.$(draftState, 3000); }, { cta: "Done" }),
    ],
  });
  A({
    id: "page-cancel", group: "page", scene: "Pro creator", title: "Discard puts it back",
    summary: "Edits stay a draft until Publish. Design has Cancel; Discard under the page drops every unpublished change.",
    what: ["One page-wide draft, like production: try things freely, publish once.", "Discard has Undo, so it doesn't need a confirmation."],
    states: ["Design → Cancel", "Unpublished changes", "Discarded + Undo"],
    ui: "Modal (sheet), Button ghost, Toast with action", prod: "components/bio/editor/bio-editor.tsx",
    outcome: "The page is back to what visitors see.",
    setup: async (T) => { await T.scene("maya", "#/app/page"); await T.click('[data-action="design"]'); },
    steps: [
      S("Try a new look. The page behind changes as you pick.", '[data-theme="midnight"]', (T) => T.click('[data-theme="midnight"]'), { cta: "Pick Midnight" }),
      S("Not sure? Cancel puts the old look back.", shCancel, (T) => T.click(shCancel), { cta: "Cancel" }),
      S("Rename a link instead…", '[data-edit-link="l1"]', async (T) => { await T.click('[data-edit-link="l1"]'); await T.type("#lk-title", "Spring collection"); await T.click(shDone); await T.$(draftState, 3000); }, { cta: "Rename a link" }),
      S("…then Discard drops every unpublished change.", '[data-publish] [data-action="discard"]', (T) => T.click('[data-publish] [data-action="discard"]'), { cta: "Discard" }),
      S("Back to the live page; the toast offers Undo.", "[data-canvas]"),
    ],
  });
  A({
    id: "page-socials", group: "page", scene: "Pro creator", title: "Social icons",
    summary: "Tap the icons under your links: a sheet lists each one with ↑ ↓ ×, and a dashed Add row shows every network left.",
    what: ["The networks you can still add are all visible as buttons, not a menu."],
    ui: "Modal (sheet), list rows, icon Buttons, TextField", prod: "components/bio/editor/social-section.tsx",
    outcome: "An X icon now sits under the links.",
    setup: (T) => T.scene("maya", "#/app/page"),
    steps: [
      S("The icons under your links have a pencil.", '[data-edit="socials"]', (T) => T.click('[data-edit="socials"]'), { cta: "Tap the icons" }),
      S("Every network you haven't added is a button. Pick X.", '[data-soc-add="x"]', (T) => T.click('[data-soc-add="x"]'), { cta: "Add X" }),
      S("Paste the profile address.", "#soc-x", (T) => T.type("#soc-x", "x.com/mayamakes"), { cta: "Paste address" }),
      S("Move it to the front with ↑.", '[data-social="4"] [data-sh="up"]', async (T) => { for (let i = 4; i > 0; i--) await T.click(`[data-social="${i}"] [data-sh="up"]`); }, { cta: "Move up" }),
      S("Done. The X icon leads the row.", shDone, async (T) => { await T.click(shDone); await T.$(draftState, 3000); }, { cta: "Done" }),
    ],
  });
  A({
    id: "page-appearance", group: "page", scene: "Pro creator", title: "Design: template, font, buttons, background",
    summary: "Design opens one sheet: a template carousel, your name in each font, button shape and style, and background swatches.",
    what: ["Every option is drawn with your own name and page, so you choose by looking, not by label.", "Cancel or Save — the page behind updates live either way."],
    ui: "Modal (sheet), carousel, toggle Buttons, Tabs (segmented) ×3, swatches", prod: "components/bio/editor/appearance-section.tsx",
    outcome: "A completely different look, saved to the draft.",
    setup: (T) => T.scene("maya", "#/app/page"),
    steps: [
      S("Design is one button above the page.", '[data-action="design"]', (T) => T.click('[data-action="design"]'), { cta: "Design" }),
      S("Templates are mini versions of your page. Pick Lavender.", '[data-theme="lavender"]', (T) => T.click('[data-theme="lavender"]'), { cta: "Lavender" }),
      S("Each font shows your name. Pick Rounded.", '[data-font="rounded"]', (T) => T.click('[data-font="rounded"]'), { cta: "Rounded" }),
      S("Square buttons with an outline.", '[data-seg="buttonFill"][data-value="outline"]', async (T) => { await T.click('[data-seg="buttonShape"][data-value="square"]'); await T.click('[data-seg="buttonFill"][data-value="outline"]'); }, { cta: "Square + Outline" }),
      S("Save keeps the new look.", shDone, async (T) => { await T.click(shDone); await T.$(draftState, 3000); }, { cta: "Save" }),
    ],
  });
  A({
    id: "page-colors", group: "page", scene: "Pro creator", title: "Background color or gradient",
    summary: "Solid and Gradient swatches sit right in Design, plus “Template default” and a custom color.",
    what: ["Text and buttons pick a readable color for the background automatically."],
    ui: "Tabs (segmented), swatch Buttons, color input", prod: "components/bio/editor/appearance-section.tsx",
    outcome: "A gradient background, then back to the template's own.",
    setup: async (T) => { await T.scene("maya", "#/app/page"); await T.click('[data-action="design"]'); },
    steps: [
      S("Switch the swatches to Gradient.", '[data-seg="bgMode"][data-value="gradient"]', (T) => T.click('[data-seg="bgMode"][data-value="gradient"]'), { cta: "Gradient" }),
      S("Pick the night gradient; text turns light by itself.", ".lk-swatches", (T) => T.click('.lk-swatch[data-bg^="linear-gradient(180deg, #0b1020"]'), { cta: "Pick it" }),
      S("“Template default” (dashed) goes back to the template's own background.", ".lk-swatch--default", (T) => T.click(".lk-swatch--default"), { cta: "Template default" }),
      S("Nothing to keep, so Cancel.", shCancel, (T) => T.click(shCancel), { cta: "Cancel" }),
    ],
  });
  A({
    id: "page-publish", group: "page", scene: "Pro creator", title: "Publish",
    summary: "Publish sits right under the page. Until you press it, visitors keep seeing the last published version.",
    what: ["Edits are a draft: try things in any order, publish once.", "On phones Publish floats above the tab bar."],
    states: ["Everything is live (Publish off)", "Unpublished changes", "Publishing…", "Updated + View"],
    ui: "Button primary (pending), Toast with action", prod: "components/bio/editor/bio-editor.tsx",
    outcome: "The public page shows the new title.",
    setup: (T) => T.scene("maya", "#/app/page"),
    steps: [
      S("Nothing to publish: “Everything is live”.", "[data-publish]"),
      S("Rename a link…", '[data-edit-link="l1"]', async (T) => { await T.click('[data-edit-link="l1"]'); await T.type("#lk-title", "Spring collection — new"); await T.click(shDone); await T.$(draftState, 3000); }, { cta: "Rename a link" }),
      S("…Publish lights up.", publishBtn, async (T) => { await T.click(publishBtn); await published(T); }, { cta: "Publish", doing: "Publishing…" }),
      S("Live. View opens the public page.", ".lk-toasts .toast", async (T) => { await T.click(toastBtn("View")); await T.$(".lk-public", 3000); }, { cta: "View" }),
      S("Visitors see the new title.", ".lk-public .lk-bio__links"),
    ],
  });

  // ── Public page ──────────────────────────────────────────────────────────
  A({
    id: "public-click", group: "public", scene: "Visitor on Maya's page", title: "A visitor taps a link",
    summary: "The tap goes through /go/<id>, the click is counted, then a 302 redirect.",
    what: ["Counting happens on the server redirect, so it works without cookies or scripts on the page."],
    states: ["Counting", "Recorded +1", "Redirect", "Destination"],
    ui: "Bio page renderer (product-specific)", prod: "app/[slug]/page.tsx · app/go/[linkId]/route.ts",
    outcome: "The click was recorded — My Page shows the new total.",
    setup: (T) => T.scene("maya", "#/maya"),
    steps: [
      S("This is linkee.bio/maya as visitors see it.", ".lk-bio__inner"),
      S("A visitor taps “Shop the spring collection”.", '[data-bio-link="l1"]', (T) => T.click('[data-bio-link="l1"]'), { cta: "Tap the link" }),
      S("The redirect counts the click, then sends them to the creator's site.", ".lk-redirect", (T) => T.wait(1500)),
      S("Outside Linkee now. The creator sees +1 on that link in My Page.", ".lk-redirect__site"),
    ],
    try: { text: "Tap any link on the page.", target: ".lk-bio__links", done: () => !!document.querySelector(".lk-redirect") },
  });
  A({
    id: "public-owner", group: "public", scene: "Pro creator", title: "Owner viewing their own page",
    summary: "Signed-in owners get an Edit page shortcut; visitors don't.",
    ui: "Button secondary sm", prod: "app/[slug]/page.tsx",
    outcome: "One click back to the editor.",
    setup: (T) => T.scene("maya", "#/maya"),
    steps: [
      S("Only the owner sees Edit page in the corner.", '.lk-public a[href="#/app/page"]', async (T) => { await T.click('.lk-public a[href="#/app/page"]'); await T.$("[data-canvas]", 3000); }, { cta: "Edit page" }),
      S("Back on My Page, where the page itself is the editor.", "[data-canvas]"),
    ],
  });
  A({
    id: "public-unclaimed", group: "public", scene: "Visitor", title: "Visit an unclaimed username",
    summary: "An empty address becomes a sign-up opportunity.",
    ui: "Empty state, Button", prod: "app/[slug]/not-found.tsx",
    outcome: "Sign up opened with the visited name as the username.",
    setup: (T) => T.scene("new", "#/newcreator"),
    steps: [
      S("linkee.bio/newcreator doesn't exist yet — and says it could be yours.", ".lk-notfound .lk-empty"),
      S("Claim it goes to sign-up with the name filled in.", ".lk-notfound a.button", async (T) => { await T.click(".lk-notfound a.button"); await T.$("#slug", 3000); }, { cta: "Claim it" }),
      S("Username prefilled and available.", '[data-field="slug"]'),
    ],
  });
  A({
    id: "public-hidden", group: "public", scene: "Visitor, page hidden", title: "Visit a hidden page",
    summary: "When the creator hides their page, visitors see “This page isn't available”.",
    ui: "Empty state", prod: "Published toggle (components/bio/editor/settings-section.tsx)",
    outcome: "Nothing about the creator leaks while the page is hidden.",
    setup: (T) => T.scene("maya", "#/maya", (s) => { s.user.published = false; s.signedIn = false; }),
    steps: [S("Same address, but the creator turned the page off in Settings.", ".lk-notfound .lk-empty")],
  });

  // ── Inbox ────────────────────────────────────────────────────────────────
  A({
    id: "inbox-connect", group: "inbox", scene: "Just signed up", title: "Connect Instagram",
    summary: "A permission primer, Instagram's own screen, then comments arrive.",
    what: ["The primer explains what Linkee can do before the person leaves the app, which cuts drop-off on the provider screen.", "Linkee never sees the password — the consent screen belongs to Instagram."],
    states: ["Empty state", "Primer", "Provider consent", "Finishing…", "Connected"],
    ui: "Empty state, Modal, Toast", prod: "app/api/social/instagram/connect + callback/route.ts",
    outcome: "Instagram is connected and the first comments are in the Inbox.",
    setup: (T) => T.scene("newUser", "#/app/inbox"),
    steps: [
      S("Before connecting, the Inbox explains what it's for.", '[data-action="connect"]', (T) => T.click('[data-action="connect"]'), { cta: "Connect Instagram" }),
      S("The primer lists exactly what Linkee will be able to do.", ".modal__dialog", (T) => T.click(btn1), { cta: "Continue to Instagram" }),
      S("This is Instagram's screen (simulated): account, permissions, Allow.", ".lk-consent", (T) => T.click('[data-consent="allow"]'), { cta: "Allow" }),
      S("Back in Linkee: a short “Finishing…” then a success toast.", ".lk-toasts", (T) => T.$("[data-comments] [data-cmt]", 5000)),
      S("Your recent post opens on its own: who commented, and what they want, is right under it.", "[data-inbox]"),
    ],
  });
  A({
    id: "inbox-connect-cancel", group: "inbox", scene: "Just signed up", title: "Cancel on Instagram's screen",
    summary: "Backing out on Instagram returns to Linkee with nothing changed.",
    ui: "Toast", prod: "app/api/social/instagram/callback/route.ts (access_denied)",
    outcome: "“Instagram connection was cancelled. Nothing was connected.” — same copy as production.",
    setup: (T) => T.scene("newUser", "#/app/inbox"),
    steps: [
      S("Start connecting…", '[data-action="connect"]', async (T) => { await T.click('[data-action="connect"]'); await T.click(btn1); }, { cta: "Connect" }),
      S("…then press Cancel on Instagram.", '[data-consent="cancel"]', (T) => T.click('[data-consent="cancel"]'), { cta: "Cancel" }),
      S("Linkee says nothing was connected, and the empty state is unchanged.", ".lk-toasts .toast"),
    ],
  });
  A({
    id: "inbox-connect-personal", group: "inbox", scene: "Just signed up", title: "Connect a personal account",
    summary: "Personal Instagram accounts can't use the API; the error explains how to switch.",
    ui: "Toast (danger)", prod: "app/api/social/instagram/callback/route.ts",
    outcome: "The message tells the creator exactly what to change in the Instagram app.",
    setup: (T) => T.scene("newUser", "#/app/inbox"),
    steps: [
      S("Start connecting…", '[data-action="connect"]', async (T) => { await T.click('[data-action="connect"]'); await T.click(btn1); }, { cta: "Connect" }),
      S("“Not you?” switches to a personal account on Instagram's screen.", '[data-consent="switch"]', (T) => T.click('[data-consent="switch"]'), { cta: "Switch account" }),
      S("Allow with the personal account…", '[data-consent="allow"]', (T) => T.click('[data-consent="allow"]'), { cta: "Allow" }),
      S("…and Linkee explains: switch to a Professional account, then connect again.", ".lk-toasts .toast"),
    ],
  });
  A({
    id: "inbox-overview", group: "inbox", scene: "Pro creator", title: "Your posts and who commented",
    summary: "Posts on the left; the open post shows its comments under it, waiting first, each with its category.",
    what: ["Post-first: comments only make sense next to the post they're on, so the Inbox is organized by post, not by a pile of tabs.", "It reads like Instagram: each comment with small text actions under it (category · Reply · Skip), and one reply bar at the bottom.", "The header counts what's waiting across all posts, so nothing hides behind the one you're looking at."],
    states: ["Post list", "Comments, waiting first", "Category labels", "Reply bar"],
    ui: "Post list (rail), post header, comment list, text actions, reply bar", prod: "app/dashboard/inbox/page.tsx",
    outcome: "You've seen the moon jar post, its comments and who is waiting, without opening anything else.",
    setup: async (T) => { await T.scene("maya", "#/app/inbox"); await draftReady(T); },
    steps: [
      S("How many people are waiting, across all your posts.", "[data-total]"),
      S("Your posts. Each says how many people are waiting on it.", "[data-rail]"),
      S("The open post: the photo, the caption and where it's live.", ".lk-posthead"),
      S("Under it, everyone who commented. A dot marks who's waiting; each has a quiet category.", "[data-comments]"),
      S("You're already replying to the first person waiting…", activeRow("k1")),
      S("…in the one reply bar at the bottom, with a draft written.", "[data-dock] [data-composer]"),
    ],
  });
  A({
    id: "inbox-quick-reply", group: "inbox", scene: "Pro creator", title: "Reply to a question by hand",
    summary: "Pick the post, press Reply under a comment, type over the draft, Post. The next person is ready.",
    what: ["Like Instagram: “Reply” under a comment points the one reply bar at that person, and the bar says who you're replying to.", "Posting is what handles a comment, and the next person waiting on the post is ready."],
    states: ["Waiting", "Replying to…", "Posting…", "Reply posted → next person"],
    ui: "Post list, comment text actions, reply bar", prod: "components/comments/comment-card.tsx",
    outcome: "Lucia got a public answer, shown under her comment; the next person is active.",
    setup: async (T) => { await T.scene("maya", "#/app/inbox"); await draftReady(T); },
    steps: [
      S("The spring collection post has people waiting.", railPost("p2"), openPost("p2"), { cta: "Open the post", doing: "Drafting…" }),
      S("Lucia asks about shipping; her comment is marked Question. Press Reply under it.", replyTo("k5"), async (T) => { await T.click(replyTo("k5")); await draftReady(T); }, { cta: "Reply", doing: "Drafting…" }),
      S("The bar says “Replying to lucia.r”, with a draft. Write your own instead.", "#reply", (T) => T.type("#reply", "Yes! Canada shipping is at checkout, usually 5–8 business days 🇨🇦"), { cta: "Type a reply" }),
      S("Post (or ⌘↵).", sendBtn, (T) => T.click(sendBtn), { cta: "Post", doing: "Posting…" }),
      S("Posted under her comment. The next person waiting is already active.", `${row("k5")} .lk-c__sub--you`),
    ],
    try: { text: "Tap lucia.r's comment on the spring collection post, type an answer and press Send.", target: railPost("p2"), done: () => L.state.convos.find((c) => c.id === "k5")?.events.some((e) => e.type === "REPLY") },
  });
  A({
    id: "inbox-ai-reply", group: "inbox", scene: "Pro creator", title: "Reply with the AI draft",
    summary: "Land on a comment and the AI draft is already written; edit, ⌘↵, and the next person is ready.",
    what: ["The AI draft is ready when you land on a comment, so most replies are one look and one keystroke.", "It's written into the reply bar with a small “AI draft” chip, so the creator stays the author.", "Posting moves to the next person, who already has their own draft."],
    states: ["Writing a reply…", "“AI draft” chip", "Posting…", "Next person"],
    ui: "Reply bar with chip, icon Button (AI), text Button (Post)", prod: "lib/ai/replies.ts · components/comments/comment-card.tsx",
    outcome: "Reply posted, labeled AI-assisted, and Marco is active with his draft.",
    setup: (T) => T.scene("maya", "#/app/inbox"),
    steps: [
      S("Hannah is the first person waiting. Linkee writes a reply from the post and her comment.", row("k1"), (T) => draftReady(T), { doing: "Writing a reply…" }),
      S("The draft carries an “AI draft” chip. Add a line.", "#reply", (T) => T.type("#reply", " See you Friday!", { clear: false }), { cta: "Add a line" }),
      S("Post, or ⌘↵ from the bar.", sendBtn, (T) => T.key("Enter", { meta: true, target: "#reply" }), { cta: "Press ⌘↵" }),
      S("Posted, labeled AI-assisted. Marco is next, and his draft is being written.", activeRow("k4"), (T) => draftReady(T), { doing: "Writing a reply…" }),
    ],
    try: { text: "Read the draft in the reply bar, adjust it, then press Post.", target: "#reply", done: () => L.state.convos.some((c) => c.events.some((e) => e.ai && e.age === "now")) },
  });
  A({
    id: "inbox-ai-replace", group: "inbox", scene: "Pro creator", title: "Your words are never overwritten",
    summary: "Once you've typed, Write with AI asks before replacing your words; an untouched draft offers “Try another”.",
    what: ["Never overwrite what a person wrote without asking. The question sits inline in the reply box, not in a dialog.", "The automatic draft only fills an empty box; an untouched AI draft can be swapped freely with “Try another”."],
    states: ["Your draft", "“Replace your draft with a suggestion?”", "Keep mine", "Replace → new AI draft"],
    ui: "Inline confirm row, Button ghost/tertiary sm", prod: "components/comments/comment-card.tsx",
    outcome: "The draft was kept once, then replaced on request and sent.",
    setup: async (T) => { await T.scene("maya", "#/app/inbox"); await draftReady(T); },
    steps: [
      S("Type your own answer to Hannah over the draft.", "#reply", (T) => T.type("#reply", "Yes, it's still here!"), { cta: "Type a draft" }),
      S("Now press Write with AI…", '[data-action="suggest"]', (T) => T.click('[data-action="suggest"]'), { cta: "Write with AI" }),
      S("…and Linkee asks first. Keep mine leaves your words untouched.", ".lk-composer__confirm", (T) => T.click('[data-action="keep"]'), { cta: "Keep mine" }),
      S("Still your words. Ask again and choose Replace this time.", "#reply", async (T) => { await T.click('[data-action="suggest"]'); await T.click('[data-action="replace"]'); await draftReady(T); }, { cta: "Write with AI → Replace", doing: "Writing a reply…" }),
      S("An untouched AI draft offers “Try another” instead of asking.", '[data-action="suggest"]'),
      S("Send.", sendBtn, (T) => T.click(sendBtn), { cta: "Send", doing: "Sending…" }),
    ],
    try: { text: "Type something in the reply box, then press Write with AI.", target: "#reply", done: () => !!document.querySelector(".lk-composer__confirm") },
  });
  A({
    id: "inbox-ai-fail", group: "inbox", scene: "Pro creator · AI down", title: "AI draft fails",
    summary: "An inline alert in the reply box; you can still write your own.",
    ui: "Alert (danger)", prod: "lib/ai/openrouter.ts error mapping",
    outcome: "The failure never blocks replying by hand.",
    setup: (T) => T.scene("maya", "#/app/inbox", (s) => { s.sim.aiFails = true; }),
    steps: [
      S("Linkee tries to draft a reply as soon as you land. The AI service is down in this scenario.", row("k1"), (T) => T.$("[data-ai-error] .alert", 5000), { doing: "Writing a reply…" }),
      S("The alert says what happened and suggests writing your own.", "[data-ai-error]"),
      S("The reply box is right there.", "#reply", (T) => T.type("#reply", "Yes! It's still available 🤍"), { cta: "Type a reply" }),
    ],
  });
  A({
    id: "inbox-free-locked", group: "inbox", scene: "Free creator", title: "AI replies on the Free plan",
    summary: "No automatic draft; Write with AI and Reply to all carry a lock and open one honest upgrade dialog.",
    ui: "Button with lock icon, Modal", prod: "lib/plans.ts UPGRADE_MESSAGE",
    outcome: "The dialog lists what Pro adds and how to get it — no fake checkout.",
    setup: (T) => T.scene("free", "#/app/inbox"),
    steps: [
      S("Free creators reply by hand: the box starts empty. Reply to all carries a lock…", '[data-bar] [data-action="upgrade"]'),
      S("…and so does the AI button in the reply bar.", '[data-composer] [data-action="upgrade"]', (T) => T.click('[data-composer] [data-action="upgrade"]'), { cta: "Click it" }),
      S("One upgrade dialog everywhere: what Pro adds, and that upgrading is by contacting Linkee.", ".modal__dialog"),
    ],
  });
  A({
    id: "inbox-private", group: "inbox", scene: "Pro creator", title: "Answer privately instead",
    summary: "“Message privately” sits in the reply bar's “Replying to…” line; it gets its own draft, and your public draft is kept.",
    what: ["Context stays put: the private message is written for the comment that prompted it, not in a separate DM tool.", "The bar always says where it goes: “Replying to mo.bakes” or “Messaging mo.bakes privately”, with one link to switch.", "Switching to private writes a private draft once; whatever you typed for the public reply is kept."],
    states: ["Replying to…", "Messaging privately", "Draft kept", "Message sent"],
    ui: "Reply bar context line with text link, Button (Send)", prod: "Instagram private replies API",
    outcome: "Mo got a private message; the public draft was never lost.",
    setup: async (T) => { await T.scene("maya", "#/app/inbox"); await draftReady(T); },
    steps: [
      S("Mo asks about a birthday class on the mugs post.", railPost("p3"), openPost("p3"), { cta: "Open the post", doing: "Drafting…" }),
      S("Start a public reply of your own…", "#reply", (T) => T.type("#reply", "Saturday classes still have spots!"), { cta: "Type" }),
      S("…then decide it's better said privately. “Message privately” is right in the bar.", '[data-replyas="private"]', async (T) => { await T.click('[data-replyas="private"]'); await draftReady(T); }, { cta: "Message privately", doing: "Writing a message…" }),
      S("“Messaging mo.bakes privately”, with a draft of its own. Switch back: your public words are still there.", '[data-replyas="public"]', (T) => T.click('[data-replyas="public"]'), { cta: "Reply publicly instead" }),
      S("Go private again and send.", '[data-replyas="private"]', async (T) => { await T.click('[data-replyas="private"]'); await T.click(sendBtn); }, { cta: "Send", doing: "Sending…" }),
      S("“Message sent”, shown under Mo's comment as sent privately.", `${row("k7")} .lk-c__sub--private`),
    ],
    try: { text: "Press “Message privately” in the reply bar and send.", target: '[data-replyas="private"]', done: () => L.state.convos.some((c) => c.events.some((e) => e.type === "DM_OUT")) },
  });
  A({
    id: "inbox-categories", group: "inbox", scene: "Pro creator", title: "Filter by intent, fix a category",
    summary: "Each comment is sorted into Interested, Question, Feedback or Other; tabs filter, the label under a comment corrects it.",
    what: ["Categories are quiet but visible: a small label among each comment's text actions, and text tabs with counts above. No folders to manage.", "Tapping the label shows all four categories in place, so fixing a wrong one is one more tap; Undo covers a slip."],
    states: ["All", "Interested", "Moved to Questions + Undo"],
    ui: "Text tabs (filter, with counts), inline category picker, Toast with action", prod: "New in prototype",
    outcome: "Marco's comment is back under Interested after Undo, and the filter is cleared.",
    setup: async (T) => { await T.scene("maya", "#/app/inbox"); await draftReady(T); },
    steps: [
      S("Text tabs above the comments count each category on this post.", "[data-cats]"),
      S("Interested: people ready to buy.", '[data-cats] [data-filter="INTERESTED"]', (T) => T.click('[data-cats] [data-filter="INTERESTED"]'), { cta: "Interested" }),
      S("Marco asked the price, but also about a bigger size. Reply to him.", replyTo("k4"), async (T) => { await T.click(replyTo("k4")); await draftReady(T); }, { cta: "Reply", doing: "Drafting…" }),
      S("His category is a text action under the comment. Call it a Question.", `[data-catedit="k4"]`, async (T) => { await T.click(`[data-catedit="k4"]`); await T.click(`[data-setcat="QUESTION"][data-for="k4"]`); }, { cta: "Question" }),
      S("It left this filter, so a toast says where it went. Undo puts it back.", ".lk-toasts .toast", (T) => T.click(toastBtn("Undo")), { cta: "Undo" }),
      S("Back under Interested. “All” clears the filter.", '[data-cats] [data-filter="ALL"]', (T) => T.click('[data-cats] [data-filter="ALL"]'), { cta: "All" }),
    ],
    try: { text: "Press the category under any comment and pick another.", target: ".lk-c__cat", done: () => L.state.convos.some((c) => c.catBy === "YOU") },
  });
  A({
    id: "inbox-mark-done", group: "inbox", scene: "Pro creator", title: "Skip, then undo",
    summary: "“Skip” under any waiting comment clears it without answering; Undo brings it back.",
    what: ["Not every comment needs an answer. Skip is a text action under every waiting comment, so clearing one doesn't mean opening it first.", "Undo in the toast replaces a confirmation dialog."],
    ui: "Text actions, Toast with action", prod: "lib/instagram-comments.ts (status)",
    outcome: "Daniel's comment is waiting again.",
    setup: async (T) => { await T.scene("maya", "#/app/inbox"); await draftReady(T); },
    steps: [
      S("On the spring collection post, Daniel just loves a glaze.", railPost("p2"), openPost("p2"), { cta: "Open the post", doing: "Drafting…" }),
      S("Nothing to add? Skip, right under his comment.", skipBtn("k8"), (T) => T.click(skipBtn("k8")), { cta: "Skip" }),
      S("It says “Skipped”, and Undo is in the toast.", ".lk-toasts .toast", (T) => T.click(toastBtn("Undo")), { cta: "Undo" }),
      S("Waiting again.", `${row("k8")}[data-todo="true"]`),
    ],
  });
  A({
    id: "inbox-done", group: "inbox", scene: "Pro creator", title: "See what was already handled",
    summary: "Handled comments stay under the post, after the waiting ones, with what happened written under each.",
    what: ["Nothing moves to another tab: handled comments stay with their post, so the whole conversation on a post is in one place.", "Everything sent is shown in full under the comment, including AI auto-replies."],
    ui: "Comment cards, nested replies, inline status", prod: "app/dashboard/inbox/page.tsx",
    outcome: "You've seen a reply, an auto-reply and a skipped spam comment, and opened a follow-up.",
    setup: async (T) => { await T.scene("maya", "#/app/inbox"); await draftReady(T); },
    steps: [
      S("Jen asked about shipping; your reply sits right under her comment.", `${row("k2")} .lk-c__sub--you`),
      S("Over on the mugs post…", railPost("p3"), openPost("p3"), { cta: "Open the post", doing: "Drafting…" }),
      S("…an AI auto-reply is labeled, with a sparkle.", `${row("k10")} .lk-c__sub--you`),
      S("Spam you skipped says “Skipped”. Reply still works on it.", replyTo("k12"), (T) => T.click(replyTo("k12")), { cta: "Reply" }),
      S("Any comment can get a follow-up: the reply bar now says “Replying to growth.boost.official”.", "[data-dock] .lk-ig__to"),
    ],
  });
  A({
    id: "inbox-reopen", group: "inbox", scene: "Pro creator", title: "Someone comments again",
    summary: "When a person you've handled comments again, their comment is waiting again, with the new words under the old.",
    what: ["Handled means “nothing waiting”, not “closed forever”. A new comment always needs a look.", "Same person, same post, one card: the history stays together."],
    states: ["Skipped", "New comment", "Waiting + unread"],
    ui: "Comment card (unread dot), Toast with action", prod: "Instagram comments webhook",
    outcome: "Daniel's comment is active again with both his comments.",
    setup: async (T) => { await T.scene("maya", "#/app/inbox"); await draftReady(T); },
    steps: [
      S("Daniel just loves a glaze. Skip it.", railPost("p2"), async (T) => { await openPost("p2")(T); await T.click(skipBtn("k8")); }, { cta: "Open + Skip", doing: "Drafting…" }),
      S("Later he comments again. (The Prototype panel stands in for Instagram.)", '[data-r="toggle"]', simulate("danielkim", "p2", "Is this glaze in Friday's drop?"), { cta: "Simulate a comment" }),
      S("He's waiting again, unread, with both comments in one card.", `${row("k8")}[data-todo="true"]`),
      S("The toast's Open makes his comment active.", ".lk-toasts .toast", async (T) => { await T.click(toastBtn("Open")); await closeReview(T); }, { cta: "Open" }),
      S("Ready to answer, right where his first comment was.", activeRow("k8")),
    ],
    try: { text: "Skip a comment, then use Prototype → Simulate a comment from that person.", target: '[data-action="done"][data-id]', done: () => L.state.convos.some((c) => c.events.filter((e) => e.type === "COMMENT").length > 1 && c.status === "TODO") },
  });
  A({
    id: "inbox-batch", group: "inbox", scene: "Pro creator", title: "Reply to all",
    summary: "One button writes a personal draft for everyone waiting on the post; edit any, leave some out, send them together.",
    what: ["Busy posts get the same questions many times. Reply to all drafts each reply from that person's own comment, so they still read as personal.", "Nothing goes out unseen: every draft is editable in place, and “Leave out” keeps someone for later.", "Drafts you already have are kept, and one Send posts the rest."],
    states: ["Writing N replies…", "N ready · M left out", "Sending…", "N replies posted"],
    ui: "Button tertiary, inline TextArea per comment, toggle Button, sticky action bar", prod: "lib/ai/replies.ts (batch)",
    outcome: "Three people got their replies at once; the one left out is next, waiting.",
    setup: async (T) => { await T.scene("maya", "#/app/inbox"); await draftReady(T); },
    steps: [
      S("Four people are waiting on the moon jar post. “Reply to all” sits in the Comments bar.", '[data-action="batch"]', (T) => T.click('[data-action="batch"]'), { cta: "Reply to all" }),
      S("Each draft appears as your reply under that comment, written one by one. Hannah's draft is kept.", "[data-batchbar]", (T) => T.until(() => !L.$("[data-batch-slot] .lk-ig__writing") && /ready/.test(L.$("[data-batchbar]")?.textContent || ""), 9000), { doing: "Writing replies…" }),
      S("Every draft is editable in place. Add a line to Marco's.", '[data-batch="k4"]', (T) => T.type('[data-batch="k4"]', " Happy to tell you when a big one is ready!", { clear: false }), { cta: "Edit Marco's" }),
      S("Not sure about Priya's? Leave her out for now.", '[data-skip="k9"]', (T) => T.click('[data-skip="k9"]'), { cta: "Leave out" }),
      S("The bar at the bottom counts what will go out.", '[data-action="batch-send"]', (T) => T.click('[data-action="batch-send"]'), { cta: "Post 3 replies", doing: "Posting…" }),
      S("Posted under each comment. The one you left out is next, with the reply box open.", activeRow("k9")),
    ],
    try: { text: "Press “Reply to all”, look over the drafts and send them.", target: '[data-action="batch"]', done: () => L.state.convos.filter((c) => c.events.some((e) => e.type === "REPLY" && e.age === "now")).length >= 2 },
  });
  A({
    id: "inbox-batch-cancel", group: "inbox", scene: "Pro creator", title: "Reply to all, then change your mind",
    summary: "Cancel leaves Reply to all without sending anything; the drafts are kept for one-by-one replies.",
    what: ["Batch is never a commitment: nothing is posted until Send, and Cancel puts you back on the first person waiting."],
    ui: "Sticky action bar, Button ghost", prod: "lib/ai/replies.ts (batch)",
    outcome: "Nothing was posted; Hannah is active again.",
    setup: async (T) => { await T.scene("maya", "#/app/inbox"); await draftReady(T); },
    steps: [
      S("Start Reply to all.", '[data-action="batch"]', async (T) => { await T.click('[data-action="batch"]'); await T.until(() => /ready/.test(L.$("[data-batchbar]")?.textContent || ""), 9000); }, { cta: "Reply to all", doing: "Writing replies…" }),
      S("Cancel sends nothing.", '[data-action="batch-cancel"]', (T) => T.click('[data-action="batch-cancel"]'), { cta: "Cancel" }),
      S("Back to one at a time, starting with the first person waiting.", activeRow("k1")),
    ],
  });
  A({
    id: "inbox-private-unavailable", group: "inbox", scene: "Pro creator", title: "Private not allowed for someone",
    summary: "When Instagram won't let you message a person, the reply bar simply doesn't offer “Message privately”.",
    what: ["No option that can only fail: if Instagram doesn't allow messaging someone, the bar just says “Replying to …” and posts publicly."],
    states: ["Reply only", "Reply posted"],
    ui: "Reply bar context line", prod: "Instagram private replies API (eligibility)",
    outcome: "Bea got her answer as a reply.",
    setup: async (T) => { await T.scene("maya", "#/app/inbox"); await draftReady(T); },
    steps: [
      S("Bea asks how to order. Reply to her.", replyTo("k6"), async (T) => { await T.click(replyTo("k6")); await draftReady(T); }, { cta: "Reply", doing: "Drafting…" }),
      S("“Replying to bea.studio”, with no “Message privately”: Instagram doesn't allow messaging her.", "[data-dock] .lk-ig__to"),
      S("Post publicly; the draft already has the price.", sendBtn, (T) => T.click(sendBtn), { cta: "Post", doing: "Posting…" }),
      S("Answered under her comment.", `${row("k6")} .lk-c__sub--you`),
    ],
  });
  A({
    id: "inbox-next-post", group: "inbox", scene: "Pro creator", title: "Finish a post, move to the next",
    summary: "When nobody is waiting on this post, one button takes you to the next post that needs you.",
    what: ["Send moves to the next person; when the post is done, the next post is one click away, right where the comments were.", "No list to scan for what's left: the button says how many are waiting there."],
    ui: "Inline status with Button", prod: "New in prototype",
    outcome: "The mugs post is caught up and the moon jar post is open with its first person active.",
    setup: async (T) => { await T.scene("maya", "#/app/inbox"); await draftReady(T); },
    steps: [
      S("On the mugs post only Mo is waiting, with his draft ready.", railPost("p3"), openPost("p3"), { cta: "Open the post", doing: "Drafting…" }),
      S("Send.", sendBtn, (T) => T.click(sendBtn), { cta: "Send", doing: "Sending…" }),
      S("All caught up on this post. The next post with people waiting is one click away.", ".lk-hub__next", (T) => T.click(".lk-hub__nextbtn"), { cta: "Next post" }),
      S("The next post opens on its first person waiting.", '[data-comments] [data-active="true"]'),
    ],
  });
  A({
    id: "inbox-refresh", group: "inbox", scene: "Pro creator", title: "Refresh for new comments",
    summary: "The icon button next to the title pulls new comments; says so when there's nothing new.",
    what: ["The header is status, not controls: “@handle · N waiting · Auto-reply on” in one quiet line, and Refresh is a single icon."],
    ui: "Button icon-only (pending), Toast with action", prod: "lib/social/instagram.ts sync",
    outcome: "A new comment arrived on another post and opened from the toast; refreshing again says you're up to date.",
    setup: async (T) => { await T.scene("maya", "#/app/inbox"); await draftReady(T); },
    steps: [
      S("The header says which account this is, how many are waiting and whether auto-reply is on.", "[data-total]"),
      S("The circular-arrow icon checks Instagram now.", '[data-action="refresh"]', (T) => T.click('[data-action="refresh"]'), { cta: "Refresh", doing: "Refreshing…" }),
      S("A new comment on the spring collection post. Open goes straight to it.", ".lk-toasts .toast", (T) => T.click(toastBtn("Open")), { cta: "Open" }),
      S("Rosa's comment is on top, active.", '[data-comments] [data-active="true"]', (T) => T.click('[data-action="refresh"]'), { cta: "Refresh again" }),
      S("Nothing new — and the toast says so instead of doing nothing visibly.", ".lk-toasts"),
    ],
  });
  A({
    id: "inbox-keyboard", group: "inbox", scene: "Pro creator", title: "Keyboard: J / K",
    summary: "J and K move between the comments on a post without the mouse; the Send tooltip mentions them.",
    what: ["The shortcuts still work, but the row of key hints is gone. Power users find them in the Send tooltip; everyone else sees less."],
    ui: "Tooltip on Send", prod: "New in prototype",
    outcome: "Two comments down, one up.",
    setup: async (T) => { await T.scene("maya", "#/app/inbox"); await draftReady(T); },
    steps: [
      S("J moves to the next comment.", "[data-comments]", async (T) => { document.activeElement?.blur(); await T.key("j", { target: null }); await T.key("j"); }, { cta: "Press J twice" }),
      S("K moves back up.", "[data-comments]", (T) => T.key("k"), { cta: "Press K" }),
    ],
  });
  A({
    id: "inbox-open-ig", group: "inbox", scene: "Pro creator", title: "See the post on Instagram",
    summary: "The post's photo opens it as it appears on Instagram, with its comments.",
    what: ["The post is context first: its photo, caption and status sit above the comments. Instagram is one click away when you need it."],
    ui: "Image button, viewer", prod: "Link to the Instagram permalink",
    outcome: "The post as it appears on Instagram, with its comments.",
    setup: async (T) => { await T.scene("maya", "#/app/inbox"); await draftReady(T); },
    steps: [
      S("The photo at the top is the post these comments are on. It opens on Instagram.", '.lk-posthead [data-action="pub-view"]', (T) => T.click('.lk-posthead [data-action="pub-view"]'), { cta: "Open" }),
      S("Instagram's post view (simulated), with its comments.", ".lk-igpost"),
    ],
  });
  A({
    id: "inbox-reconnect", group: "inbox", scene: "Connection expired", title: "Reconnect an expired account",
    summary: "A banner explains it, replying is paused, Reconnect fixes it in two clicks.",
    what: ["Tokens expire when passwords change; the banner says that in plain words and promises nothing is lost."],
    states: ["Banner", "Reply disabled", "Reconnected"],
    ui: "Alert (warning) with action, Modal", prod: "lib/social/tokens.ts (NEEDS_RECONNECT)",
    outcome: "Connected again and the reply box works.",
    setup: (T) => T.scene("reconnect", "#/app/inbox"),
    steps: [
      S("Instagram stopped accepting the connection. Replying is paused.", ".alert--warning"),
      S("Reconnect → primer → Allow.", '.alert--warning [data-action="reconnect"]', async (T) => { await T.click('.alert--warning [data-action="reconnect"]'); await T.click(btn1); await T.click('[data-consent="allow"]'); await T.until(() => !L.$(".alert--warning")); }, { cta: "Reconnect", doing: "Reconnecting…" }),
      S("The banner is gone and the reply bar works again.", "[data-composer]"),
    ],
  });

  // ── Posts (written in the Inbox: New post opens where the post is, and each post carries its own status) ──
  const NEW_POST = "#/app/inbox?new=1";
  const POST = (id) => `#/app/inbox?post=${id}`;
  /** New post. No AI draft runs behind it, so typing starts right away. */
  const sceneNew = (T, mutate) => T.scene("maya", NEW_POST, mutate);
  /** A post deep link; waits for the first waiting comment's draft when there is one. */
  const scenePost = async (T, id) => { await T.scene("maya", POST(id)); if (L.$("[data-composer]")) await draftReady(T); };
  const latest = () => L.state.history[0];
  const settled = (h) => h && h.targets.every((t) => ["PUBLISHED", "FAILED", "UNCONFIRMED"].includes(t.status));
  const addFiles = (...ids) => async (T) => {
    await T.click('[data-action="add-photo"]');
    for (const id of ids) await T.click(`[data-file="${id}"]`);
    await T.click("[data-picker-add]");
    await T.until(() => !L.$(".lk-pved__slide[data-uploading]"), 9000);
  };
  A({
    id: "post-destinations", group: "publish", scene: "Pro creator", title: "Start a post and choose where it goes",
    summary: "“New post” in the Inbox header opens the editor in place of the post you're on; every account starts selected.",
    what: ["Posts are written where their comments will arrive: New post opens in the Inbox, and closing it puts you back on your post.", "Sensible default: every connected account starts selected, so most posts need no choice at all.", "The button names the outcome: “Publish to Instagram” vs “Publish to 2 places”."],
    ui: "Button primary, Toggle buttons", prod: "components/publishing/destination-picker.tsx",
    outcome: "“Publish to Instagram” vs “Publish to 2 places” — no guessing.",
    setup: async (T) => { await T.scene("maya", "#/app/inbox"); await draftReady(T); },
    steps: [
      S("New post sits next to Refresh at the top of the Inbox.", '[data-action="new-post"]', (T) => T.click('[data-action="new-post"]'), { cta: "New post" }),
      S("It opens where the post was. Every connected account starts selected.", '[data-pub="new"] .lk-dest'),
      S("Turn the Facebook Page off…", '[data-dest="fb1"]', (T) => T.click('[data-dest="fb1"]'), { cta: "Turn off Facebook" }),
      S("…and the button now says “Publish to Instagram”.", '[data-action="publish"]', (T) => T.click('[data-dest="fb1"]'), { cta: "Turn it back on" }),
    ],
  });
  A({
    id: "post-upload", group: "publish", scene: "Pro creator", title: "Add photos (with rejected files)",
    summary: "Click the photo area of the post; valid files upload with progress, invalid ones are listed with the reason.",
    what: ["Photos go straight into the post as it will look, so there's no separate tray and preview to compare.", "Rules match the upload endpoint: JPG/PNG/WEBP up to 8 MB, MP4/MOV up to 100 MB.", "Rejections are listed together so one bad file doesn't hide the others."],
    states: ["File picker", "Uploading %", "Rejected files"],
    ui: "Drop zone in the post card, ProgressBar, Alert (danger)", prod: "components/publishing/media-tray.tsx · lib/publishing-rules.ts UPLOAD_RULES",
    outcome: "Two photos uploaded; the PDF and the 9.6 MB panorama were rejected with reasons.",
    setup: (T) => sceneNew(T),
    steps: [
      S("The empty photo area of the post is the drop zone. Click it (or drag files onto it).", '[data-action="add-photo"]', (T) => T.click('[data-action="add-photo"]'), { cta: "Open picker" }),
      S("Your device's file picker (simulated). Pick two photos, a PDF and a huge panorama.", ".lk-picker", async (T) => { for (const id of ["f1", "f3", "f9", "f10"]) await T.click(`[data-file="${id}"]`); }, { cta: "Select 4 files" }),
      S("Add.", "[data-picker-add]", (T) => T.click("[data-picker-add]"), { cta: "Add 4 files" }),
      S("Valid photos upload right in the post, with progress; Publish waits for them.", "[data-media-host]", (T) => T.until(() => !L.$(".lk-pved__slide[data-uploading]"), 9000), { doing: "Uploading…" }),
      S("Rejected files are listed with the exact reason.", "[data-upload-errors]"),
    ],
    try: { text: "Click the photo area of the new post, pick some files (try the PDF too) and add them.", target: '[data-action="add-photo"]', done: () => L.state.draft.media.length > 0 },
  });
  A({
    id: "post-ig-rules", group: "publish", scene: "Pro creator", title: "Instagram photo rules",
    summary: "Too-tall photos are blocked before publishing; mixed shapes get a crop warning.",
    states: ["Error: too tall", "Warning: carousel crop", "Ready"],
    ui: "Inline checks list", prod: "lib/publishing-rules.ts validateInstagram",
    outcome: "Removing the 9:16 screenshot made the post ready.",
    setup: (T) => sceneNew(T),
    steps: [
      S("Add a square photo, a 4:5 photo and a 9:16 screenshot.", '[data-action="add-photo"]', addFiles("f1", "f2", "f7"), { cta: "Add 3 files", doing: "Uploading…" }),
      S("The screenshot is too tall for the feed (allowed 4:5 to 1.91:1), and mixed shapes will be cropped.", "[data-checks]"),
      S("Remove the screenshot (third photo) with its ×.", '.lk-pved__slide:nth-child(3) [data-action="media-remove"]', (T) => T.click('.lk-pved__slide:nth-child(3) [data-action="media-remove"]'), { cta: "Remove it" }),
      S("Only the crop warning remains — Publish is enabled.", "[data-checks]"),
    ],
  });
  A({
    id: "post-fb-mix", group: "publish", scene: "Pro creator", title: "Photos + video on Facebook",
    summary: "Facebook can't mix them; a single video becomes an Instagram Reel.",
    ui: "Inline checks list", prod: "lib/publishing-rules.ts validateFacebook",
    outcome: "With just the video, Facebook is fine and Instagram notes it'll be a Reel.",
    setup: (T) => sceneNew(T),
    steps: [
      S("Add a photo and a video.", '[data-action="add-photo"]', addFiles("f1", "f6"), { cta: "Add photo + video", doing: "Uploading…" }),
      S("Facebook can't mix photos and video in one post.", "[data-checks]"),
      S("Remove the photo.", '.lk-pved__slide:nth-child(1) [data-action="media-remove"]', (T) => T.click('.lk-pved__slide:nth-child(1) [data-action="media-remove"]'), { cta: "Remove photo" }),
      S("One video: Facebook is happy and Instagram will publish it as a Reel.", "[data-checks]"),
    ],
  });
  A({
    id: "post-media-order", group: "publish", scene: "Pro creator", title: "Reorder and remove media",
    summary: "Each photo in the post has its own tools: move earlier, remove with Undo.",
    what: ["Order is changed on the post itself, so the first photo you see is the cover people will see."],
    ui: "Icon buttons on carousel slides, Toast with action", prod: "components/publishing/media-tray.tsx",
    outcome: "The cover photo changed and a removed photo came back.",
    setup: async (T) => { await sceneNew(T); await addFiles("f1", "f3", "f5")(T); },
    steps: [
      S("The first photo is the cover. Move the third one earlier…", '.lk-pved__slide:nth-child(3) [data-action="media-left"]', async (T) => { await T.click('.lk-pved__slide:nth-child(3) [data-action="media-left"]'); await T.click('.lk-pved__slide:nth-child(2) [data-action="media-left"]'); }, { cta: "Move to front" }),
      S("…it's now the cover of the post.", ".lk-pved__slide:nth-child(1)"),
      S("Remove one — Undo is in the toast.", '.lk-pved__slide:nth-child(2) [data-action="media-remove"]', async (T) => { await T.click('.lk-pved__slide:nth-child(2) [data-action="media-remove"]'); await T.click(toastBtn("Undo")); }, { cta: "Remove + Undo" }),
    ],
  });
  A({
    id: "post-preview", group: "publish", scene: "Pro creator", title: "Write on the post itself",
    summary: "The preview is the editor: type the caption inside the post card; switch between the Instagram and Facebook look.",
    what: ["No form next to a preview. You write on the post as it will appear, so there's nothing to compare and nothing to keep in sync.", "With both networks selected, one switch shows the same post in each network's layout. The caption counter follows the strictest network."],
    ui: "Post card with inline TextArea + counter, Tabs (segmented)", prod: "components/publishing/post-preview.tsx",
    outcome: "The same caption, shown in Facebook's layout.",
    setup: async (T) => { await sceneNew(T); await addFiles("f2")(T); },
    steps: [
      S("Type right under the photo, where the caption will be. The counter shows Instagram's 2,200 limit.", "#caption", (T) => T.type("#caption", "Spring drop is live 🌱 Six new glazes, speckled stoneware and the moon jar you've all been asking about. Shop link in bio. #ceramics #handmade @portlandmakers", { delay: 10 }), { cta: "Type caption" }),
      S("Show the Facebook look.", '[data-seg="pv"][data-value="FACEBOOK"]', (T) => T.click('[data-seg="pv"][data-value="FACEBOOK"]'), { cta: "Show Facebook" }),
      S("Same post, Facebook's layout: text above the photo, still editable.", "[data-editor-host] .lk-pved"),
    ],
  });
  A({
    id: "post-publish", group: "publish", scene: "Pro creator", title: "Publish to Instagram + Facebook",
    summary: "Publish shows the new post right away, selected in your post list; each network reports its status in its header.",
    what: ["No results screen: the new post opens on the same screen as every other post, where its status and future comments live.", "Each network reports separately, so one problem never hides the other result."],
    states: ["Waiting", "Publishing…", "Published"],
    ui: "Post header, status per network, Spinner", prod: "lib/publishing.ts handlePublishTarget",
    outcome: "Live on both, at the top of your posts, viewed on Instagram.",
    setup: async (T) => { await sceneNew(T); await addFiles("f2")(T); await T.type("#caption", "Spring drop is live 🌱 #ceramics", { delay: 8 }); },
    steps: [
      S("No problems are listed, so the button just says where it goes.", '[data-action="publish"]'),
      S("Publish to 2 places.", '[data-action="publish"]', async (T) => { await T.click('[data-action="publish"]'); await T.$(".lk-posthead", 3000); }, { cta: "Publish" }),
      S("The post opens at once, first in your list. Each network goes waiting → publishing… → ✓.", ".lk-posthead", (T) => T.until(() => settled(latest()), 9000), { doing: "Publishing…" }),
      S("Live on both. The photo opens it on Instagram.", '.lk-posthead [data-action="pub-view"]', (T) => T.click('.lk-posthead [data-action="pub-view"]'), { cta: "View on Instagram" }),
      S("The live Instagram post (simulated).", ".lk-igpost"),
    ],
  });
  A({
    id: "post-retry", group: "publish", scene: "Pro creator · Facebook limited", title: "One destination fails → retry",
    summary: "Instagram succeeds, Facebook is rate-limited; retry just Facebook, right in the post's header.",
    what: ["Retrying only the failed destination avoids posting twice on the one that worked.", "The Retry button sits in the post's header, next to the problem."],
    states: ["Failed (rate limited)", "Retry", "Published"],
    ui: "Chip (danger), Button ghost", prod: "lib/publishing.ts (MetaApiError.isRateLimited)",
    outcome: "Both destinations show Published.",
    setup: async (T) => { await sceneNew(T, (s) => { s.sim.publishFails = true; }); await addFiles("f1")(T); await T.type("#caption", "Kiln opening Sunday!", { delay: 8 }); },
    steps: [
      S("Facebook is rate-limiting this Page right now.", '[data-action="publish"]', async (T) => { await T.click('[data-action="publish"]'); await T.until(() => settled(latest()), 9000); }, { cta: "Publish", doing: "Publishing…" }),
      S("Facebook failed (the reason is on hover); Instagram is unaffected.", '.lk-posthead [data-action="retry-hist"]', async (T) => { L.state.sim.publishFails = false; await T.click('.lk-posthead [data-action="retry-hist"]'); await T.until(() => latest().targets.every((t) => t.status === "PUBLISHED"), 6000); }, { cta: "Retry Facebook", doing: "Retrying…" }),
      S("Both destinations are published.", ".lk-posthead"),
    ],
  });
  A({
    id: "post-history-retry", group: "publish", scene: "Pro creator", title: "Find a post that needs a look",
    summary: "Your post list says “Facebook needs a look” on a post with a problem; Retry is in its header.",
    what: ["Each post in the list has one line of status, so problems stand out without opening anything.", "The fix is on the post itself, on the same screen as its comments."],
    ui: "Post list, chip, Button ghost", prod: "components/publishing/history-actions.tsx",
    outcome: "The kiln-opening post is now on Facebook too.",
    setup: async (T) => { await T.scene("maya", "#/app/inbox"); await draftReady(T); },
    steps: [
      S("Last week's kiln post says “Facebook needs a look”.", railPost("h2"), (T) => T.click(railPost("h2")), { cta: "Open it" }),
      S("The problem is in the header, with Retry.", '.lk-posthead [data-action="retry-hist"]', async (T) => { await T.click('.lk-posthead [data-action="retry-hist"]'); await T.until(() => L.state.history.find((h) => h.id === "h2").targets.every((t) => t.status === "PUBLISHED"), 6000); }, { cta: "Retry", doing: "Retrying…" }),
      S("Published on both.", ".lk-posthead"),
    ],
  });
  A({
    id: "post-unconfirmed", group: "publish", scene: "Pro creator", title: "Unconfirmed post: check before retrying",
    summary: "When Instagram doesn't confirm, Linkee asks you to check instead of risking a duplicate.",
    what: ["A blind retry could post twice. Check profile, “It's there” and “Publish again” are three visible buttons in the post's header, so the safe order is obvious without opening a menu."],
    states: ["Check first", "Profile view", "Marked as published"],
    ui: "Chip (warning), Button ghost ×3, Modal", prod: "lib/publishing.ts (unconfirmed result)",
    outcome: "The post was there, so it's marked published — no duplicate.",
    setup: (T) => scenePost(T, "h3"),
    steps: [
      S("“Instagram: check first” — Instagram didn't confirm. Every option is a button.", ".lk-posthead .lk-target-issue"),
      S("Check profile opens Instagram to look.", '[data-action="unc-check"]', (T) => T.click('[data-action="unc-check"]'), { cta: "Check profile" }),
      S("It's there (highlighted). Mark it as published from here.", ".lk-iggrid", (T) => T.click(btn1), { cta: "Mark as published" }),
      S("Resolved with no duplicate post.", ".lk-posthead"),
    ],
  });
  A({
    id: "post-publish-again", group: "publish", scene: "Pro creator", title: "Unconfirmed post: publish again",
    summary: "If it really isn't there, publish again — after a warning.",
    ui: "Modal (warning)", prod: "lib/publishing.ts",
    outcome: "Published once more, with an explicit confirmation.",
    setup: (T) => scenePost(T, "h3"),
    steps: [
      S("“Publish again” sits next to “It's there”.", '[data-action="unc-again"]', (T) => T.click('[data-action="unc-again"]'), { cta: "Publish again" }),
      S("The warning explains the risk of a duplicate.", ".modal__dialog", async (T) => { await T.click(btn1); await T.wait(1400); }, { cta: "Confirm", doing: "Publishing…" }),
      S("Published.", ".lk-posthead"),
    ],
  });
  A({
    id: "post-draft", group: "publish", scene: "Pro creator", title: "Drafts save themselves",
    summary: "Stop typing and “Draft saved” appears; there's no Save draft button.",
    what: ["Autosave removes a decision: nothing to remember, nothing lost when you close New post to answer a comment and come back.", "The status is a quiet line next to Publish, so the one button stays the main action."],
    states: ["Typing", "Draft saved"],
    ui: "Status text (aria-live)", prod: "components/publishing/composer.tsx",
    outcome: "“Draft saved” next to Publish, without pressing anything.",
    setup: (T) => sceneNew(T),
    steps: [
      S("Start a caption…", "#caption", (T) => T.type("#caption", "Glaze test results coming soon…"), { cta: "Type" }),
      S("…pause, and the draft saves itself.", "[data-saved]", (T) => T.until(() => /Draft saved/.test(L.$("[data-saved]")?.textContent || ""), 3000), { cta: "Wait a moment" }),
      S("“Draft saved”. Adding or removing photos saves it too.", "[data-saved]"),
    ],
  });
  A({
    id: "post-free", group: "publish", scene: "Free creator", title: "New post on the Free plan",
    summary: "New post shows a lock and opens the same upgrade dialog as everywhere else.",
    what: ["The button stays in the same place on every plan, so it's findable; on Free it explains Pro instead of hiding."],
    ui: "Button with lock icon, Modal", prod: "lib/plans.ts UPGRADE_MESSAGE",
    outcome: "The upgrade dialog opened.",
    setup: (T) => T.scene("free", "#/app/inbox"),
    steps: [
      S("Free plans see New post with a lock.", '[data-action="upgrade-post"]', (T) => T.click('[data-action="upgrade-post"]'), { cta: "New post" }),
      S("Same dialog as everywhere else: what Pro adds, and how to get it.", ".modal__dialog"),
    ],
  });

  // ── Settings ─────────────────────────────────────────────────────────────
  A({
    id: "settings-address", group: "settings", scene: "Pro creator", title: "Change the page address",
    summary: "Save address appears once you change it; a warning says the old link stops working.",
    what: ["Settings is one short column: Account, Connections, AI replies, Plan. The Save button only appears when there's something to save."],
    ui: "InputGroup, Modal (warning)", prod: "components/bio/editor/settings-section.tsx (username)",
    outcome: "The page moved to linkee.bio/maya.studio — My Page shows the new address.",
    setup: (T) => T.scene("maya", "#/app/settings"),
    steps: [
      S("Type a new address; availability is checked as you type, and Save address appears.", "#acc-slug", (T) => T.type("#acc-slug", "maya.studio"), { cta: "Type new address" }),
      S("Save address…", "[data-acc-actions] button[type=submit]", (T) => T.click("[data-acc-actions] button[type=submit]"), { cta: "Save" }),
      S("…asks first: the old link stops working right away.", ".modal__dialog", async (T) => { await T.click(btn1); await T.wait(800); }, { cta: "Change address", doing: "Saving…" }),
      S("Done. My Page shows the new address, ready to copy.", ".lk-toasts .toast", async (T) => { await T.click('.lk-nav a[href="#/app/page"]'); await T.$("[data-canvas]", 3000); }, { cta: "Go to My Page" }),
      S("linkee.bio/maya.studio, with Copy right next to it.", ".lk-address"),
    ],
  });
  A({
    id: "settings-hide", group: "settings", scene: "Pro creator", title: "Hide the page",
    summary: "One switch takes the page offline without deleting anything.",
    ui: "Switch", prod: "components/bio/editor/settings-section.tsx (Published)",
    outcome: "My Page shows a “Hidden” chip; visitors see “not available”.",
    setup: (T) => T.scene("maya", "#/app/settings"),
    steps: [
      S("Page is public.", '[data-action="published"]', (T) => T.click('[data-action="published"]'), { cta: "Hide it" }),
      S("Now hidden — links and stats are kept.", "#account .lk-card--flush"),
      S("My Page reminds you with a chip.", null, async (T) => { await T.click('.lk-nav a[href="#/app/page"]'); await T.$("[data-canvas]", 3000); }, { cta: "Go to My Page" }),
      S("“Hidden” sits next to the address and links back to this setting.", ".lk-address__chip"),
    ],
  });
  A({
    id: "settings-fb-pages", group: "settings", scene: "Pro creator", title: "Connect more Facebook Pages",
    summary: "“Facebook Page” sits next to “Instagram” in the section header; pick Pages on Facebook's screen; each becomes its own destination.",
    what: ["Both networks are visible buttons in the Connections header instead of a Connect menu, so the choice is made before anything opens."],
    ui: "Button ×2, Modal, toggle list", prod: "app/api/social/facebook/callback/route.ts",
    outcome: "“Studio Classes PDX” is a new connection and a new destination for New post.",
    setup: (T) => T.scene("maya", "#/app/settings?section=connections"),
    steps: [
      S("Connect buttons for Instagram and a Facebook Page sit in the section header.", '#connections [data-action="connect-fb"]', async (T) => { await T.click('#connections [data-action="connect-fb"]'); await T.click(btn1); }, { cta: "Facebook Page" }),
      S("Facebook's screen (simulated): choose which Pages Linkee may post to.", '[data-page="p2"]', (T) => T.click('[data-page="p2"]'), { cta: "Select a 2nd Page" }),
      S("Continue.", '[data-consent="allow"]', async (T) => { await T.click('[data-consent="allow"]'); await T.until(() => L.state.accounts.length > 2, 4000); }, { cta: "Continue", doing: "Connecting…" }),
      S("Each Page is its own connection.", "#connections"),
    ],
  });
  A({
    id: "settings-disconnect", group: "settings", scene: "Pro creator", title: "Disconnect an account",
    summary: "A dialog spells out what stops working and what's kept.",
    ui: "Button ghost, AlertDialog (danger)", prod: "components/social/connected-accounts.tsx",
    outcome: "The Facebook Page is gone from Connections and from New post destinations.",
    setup: (T) => T.scene("maya", "#/app/settings?section=connections"),
    steps: [
      S("Each account has its own Disconnect button — no row menu to open.", '[data-acct="fb1"] [data-action="disconnect"]', (T) => T.click('[data-acct="fb1"] [data-action="disconnect"]'), { cta: "Disconnect" }),
      S("The dialog says exactly what changes.", ".modal__dialog", async (T) => { await T.click(btn1); await T.wait(900); }, { cta: "Confirm", doing: "Disconnecting…" }),
      S("Removed.", "#connections"),
    ],
  });
  A({
    id: "settings-limit", group: "settings", scene: "Free creator, 3 accounts", title: "Account limit reached",
    summary: "Free allows 3 connections; at the limit, Connect explains why before you leave for Instagram.",
    what: ["The connect buttons stay in the same place at every count, so they're always findable; at the limit they explain the limit instead of quietly disappearing."],
    ui: "Button, Modal (warning)", prod: "lib/plans.ts maxSocialAccounts",
    outcome: "The limit and the two ways out (disconnect one, or upgrade) are explained before leaving Linkee.",
    setup: (T) => T.scene("free", "#/app/settings?section=connections", (s) => { s.accounts.push({ id: "fb2", provider: "FACEBOOK", name: "Studio Classes PDX", handle: "Facebook Page", status: "CONNECTED", connectedAt: "Connected Oct 9" }); }),
    steps: [
      S("3 of 3 accounts on Free.", "#connections > p"),
      S("Try to add another.", '#connections [data-action="connect-fb"]', async (T) => { await T.click('#connections [data-action="connect-fb"]'); await T.$(".modal__dialog", 3000); }, { cta: "Facebook Page" }),
      S("The dialog explains the limit: disconnect one, or upgrade for more.", ".modal__dialog", (T) => T.click('.modal__footer [data-modal-btn="0"]'), { cta: "OK" }),
      S("Nothing changed; you're back on Connections.", "#connections"),
    ],
  });
  A({
    id: "settings-ai", group: "settings", scene: "Pro creator", title: "Tune AI replies",
    summary: "Tone, language, facts about you and words to skip.",
    what: ["“About you” is where facts live, so suggestions can answer “when's the next drop?” correctly.", "Tone is a compact segmented control with one line describing the selected tone, instead of four description cards."],
    ui: "Tabs (segmented), Select, TextArea, tag input, Button", prod: "app/dashboard/settings/ai-preferences-form.tsx",
    outcome: "Saved — the next suggestion uses the new settings.",
    setup: (T) => T.scene("maya", "#/app/settings?section=ai"),
    steps: [
      S("Pick a tone. The line below describes it.", '[data-seg="tone"][data-value="PLAYFUL"]', (T) => T.click('[data-seg="tone"][data-value="PLAYFUL"]'), { cta: "Playful" }),
      S("Reply language (default: match the commenter).", "#ai-lang", (T) => T.set("#ai-lang", "vi"), { cta: "Vietnamese" }),
      S("Words to skip: auto-reply leaves comments containing them for you.", "#ai-skip", async (T) => { await T.type("#ai-skip", "wholesale"); await T.key("Enter", { target: "#ai-skip" }); }, { cta: "Add “wholesale”" }),
      S("Save turns on only when something changed.", "[data-ai-save]", (T) => T.click("[data-ai-save]"), { cta: "Save" }),
    ],
  });
  A({
    id: "settings-auto-on", group: "settings", scene: "Pro creator, auto-reply off", title: "Turn on auto-reply",
    summary: "Off by default. Turning it on shows exactly what it never answers.",
    what: ["Auto-reply speaks for the creator in public, so opting in is deliberate and fully informed."],
    states: ["Off", "Confirm dialog", "On"],
    ui: "Switch, Modal", prod: "lib/ai/auto-reply.ts (guards)",
    outcome: "Auto-reply is on; the Inbox header shows it.",
    setup: (T) => T.scene("maya", "#/app/settings?section=ai", (s) => { s.ai.autoReply = false; }),
    steps: [
      S("Auto-reply is off: nothing posts unless you press Send.", '[data-action="auto"]', (T) => T.click('[data-action="auto"]'), { cta: "Turn on" }),
      S("The dialog lists what it always leaves for you (from the production guards).", ".modal__dialog", (T) => T.click(btn1), { cta: "Turn on" }),
      S("On — with daily usage right below.", "#ai .lk-card--flush"),
    ],
  });
  A({
    id: "settings-auto-off", group: "settings", scene: "Pro creator", title: "Turn off auto-reply",
    summary: "One click, no dialog — stopping is always easy.",
    ui: "Switch, Toast", prod: "lib/ai/auto-reply.ts",
    outcome: "Off immediately.",
    setup: (T) => T.scene("maya", "#/app/settings?section=ai"),
    steps: [S("Turning it off needs no confirmation.", '[data-action="auto"]', (T) => T.click('[data-action="auto"]'), { cta: "Turn off" }), S("Off.", ".lk-toasts")],
  });
  A({
    id: "settings-plan", group: "settings", scene: "Free creator", title: "See the plan and upgrade",
    summary: "One row: your plan, what Pro adds, and one upgrade path.",
    what: ["A single row replaces the Free-vs-Pro table; the landing page already compares plans."],
    ui: "Settings row, Button primary", prod: "lib/plans.ts",
    outcome: "The upgrade dialog copies the contact address.",
    setup: (T) => T.scene("free", "#/app/settings?section=plan"),
    steps: [
      S("Linkee Free, and in one line what Pro adds. (Pro creators see Contact support here.)", "#plan .lk-setrow"),
      S("Upgrade to Pro.", '#plan [data-action="upgrade"]', (T) => T.click('#plan [data-action="upgrade"]'), { cta: "Upgrade" }),
      S("“Contact us to upgrade” copies the address — no fake checkout.", btn1, (T) => T.click(btn1), { cta: "Contact us" }),
    ],
  });

  // ── Navigation & account ─────────────────────────────────────────────────
  A({
    id: "nav-tabs", group: "global", scene: "Pro creator", title: "Move between the three areas",
    summary: "My Page, Inbox (with badge, and your posts), Settings — nothing deeper.",
    what: ["Publishing moved into the Inbox, next to the conversations it creates, so there's one fewer place to check."],
    ui: "Navbar / bottom tab bar", prod: "components/layout/app-shell.tsx",
    outcome: "Every area is one click from every other.",
    setup: (T) => T.scene("maya", "#/app/page"),
    steps: [
      S("Three destinations. On phones they move to a bottom tab bar.", ".lk-nav"),
      S("Inbox — the badge counts conversations waiting. Posts and New post live here too.", '.lk-nav a[href="#/app/inbox"]', (T) => T.click('.lk-nav a[href="#/app/inbox"]'), { cta: "Inbox" }),
      S("Settings.", '.lk-nav a[href="#/app/settings"]', (T) => T.click('.lk-nav a[href="#/app/settings"]'), { cta: "Settings" }),
    ],
  });
  A({
    id: "nav-menu", group: "global", scene: "Pro creator", title: "Account menu and log out",
    summary: "The avatar shows who's signed in and offers Log out — nothing else.",
    what: ["The menu used to repeat View page, Copy link and Settings, which already have one home each. Now it does one job."],
    ui: "Dropdown (Avatar trigger), Menu", prod: "components/layout/app-shell.tsx UserMenu",
    outcome: "Logged out, back on the landing page.",
    setup: (T) => T.scene("maya", "#/app/page"),
    steps: [
      S("The avatar opens your name, email and plan, with Log out.", "[data-shell=menu]", (T) => T.click("[data-shell=menu]"), { cta: "Open menu" }),
      S("Log out.", T0Text("Log out"), (T) => T.click(T0Text("Log out")), { cta: "Log out" }),
      S("Back on the landing page; the top bar offers Log in again.", ".lk-mkt-nav"),
    ],
  });

  // Menu item by label (targets resolve lazily, once a menu is open).
  function T0Text(label) { return () => L.T.byText(".lk-pop .menu-item", label)(); }
})();
