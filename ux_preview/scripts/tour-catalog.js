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
    { id: "publish", label: "Publish", icon: "paper-plane" },
    { id: "settings", label: "Settings", icon: "gear" },
    { id: "global", label: "Navigation & account", icon: "bars" },
  ];
  const C = (L.CATALOG = []);
  const A = (a) => C.push(a);
  const S = (text, target, run, extra = {}) => ({ text, target, run, ...extra });
  const btn1 = '.modal__footer [data-modal-btn="1"]';
  const toastUndo = ".lk-toasts .toast__action";
  const menuItem = (label) => (T) => T.byText(".lk-pop .menu-item", label);

  // ── Landing ─────────────────────────────────────────────────────────────
  A({
    id: "claim-available", group: "landing", scene: "Visitor", title: "Claim an available username",
    summary: "The hero field checks availability as you type and carries the name into sign-up.",
    what: ["The first action on the site is also step one of sign-up — no separate “Get started” detour.", "Availability is checked live so people never fill a form for a name they can't have."],
    states: ["Empty hint", "Available", "Submitting → Sign up prefilled"],
    ui: "TextField (custom inline prefix), Button primary lg", prod: "app/page.tsx · app/signup/signup-form.tsx (slug field)",
    outcome: "Sign up opened with “alex.k” already filled in.",
    setup: (T) => T.scene("new", "#/"),
    steps: [
      S("Visitors land on one promise and one field: linkee.bio/yourname.", ".lk-hero [data-claim]"),
      S("Typing a username checks it instantly against the same rules as sign-up.", "#claim-hero", (T) => T.type("#claim-hero", "alex.k"), { cta: "Type “alex.k”" }),
      S("Green means free. “Claim your page” moves straight to sign-up.", "#claim-hero-hint", (T) => T.click(".lk-hero [data-claim] button[type=submit]"), { cta: "Claim it" }),
      S("Sign up opens with the username prefilled and confirmed available; focus jumps to Name.", '[data-field="slug"]'),
    ],
    try: { text: "Type any username in the hero field and press Claim.", target: "#claim-hero", done: () => location.hash.startsWith("#/signup") },
  });
  A({
    id: "claim-taken", group: "landing", scene: "Visitor", title: "Username taken → suggestion",
    summary: "A taken name explains itself and offers a one-click alternative.",
    what: ["Dead ends on the very first interaction kill conversion; a suggestion keeps momentum."],
    states: ["Taken", "Suggestion", "Available"],
    ui: "TextField error description, inline text button", prod: "lib/bio.ts (slug rules) · app/signup",
    outcome: "The suggestion replaced the taken name and is available.",
    setup: (T) => T.scene("new", "#/"),
    steps: [
      S("Someone types a name that's already in use…", "#claim-hero", (T) => T.type("#claim-hero", "maya"), { cta: "Type “maya”" }),
      S("…and sees why, plus a suggested alternative right in the hint.", "#claim-hero-hint", (T) => T.click("[data-suggest]"), { cta: "Use suggestion" }),
      S("One click later the field holds an available name.", "#claim-hero-hint"),
    ],
  });
  A({
    id: "claim-invalid", group: "landing", scene: "Visitor", title: "Reserved and invalid usernames",
    summary: "Reserved words, bad characters and empty submits each get a specific message.",
    states: ["Reserved", "Invalid characters", "Empty submit"],
    ui: "TextField validation", prod: "lib/bio.ts RESERVED_SLUGS + slug schema",
    outcome: "Every bad input explains exactly what to change.",
    setup: (T) => T.scene("new", "#/"),
    steps: [
      S("Product words like “settings” are reserved so they never collide with app routes.", "#claim-hero", (T) => T.type("#claim-hero", "settings"), { cta: "Type “settings”" }),
      S("Only letters, numbers, dots, dashes and underscores are allowed (3–30 characters).", "#claim-hero-hint", (T) => T.type("#claim-hero", "-maya-"), { cta: "Type “-maya-”" }),
      S("Submitting an empty field asks for a name instead of failing silently.", "#claim-hero-hint", async (T) => { await T.type("#claim-hero", ""); await T.click(".lk-hero [data-claim] button[type=submit]"); }, { cta: "Submit empty" }),
      S("The hint now prompts for a username and focus stays in the field.", "#claim-hero-hint"),
    ],
  });
  A({
    id: "landing-sections", group: "landing", scene: "Visitor", title: "Explore features and pricing",
    summary: "Three anchors in the top bar scroll to features, how it works and pricing.",
    ui: "Navbar links, Card", prod: "app/page.tsx",
    outcome: "Pricing shows Free and Pro side by side, each with one clear action.",
    setup: (T) => T.scene("new", "#/"),
    steps: [
      S("The landing nav stays minimal: three anchors, Log in and Get started.", ".lk-mkt-nav__links"),
      S("Pricing jumps to the plans. Pro shows its limits honestly.", '.lk-mkt-nav__links a[href="#pricing"]', (T) => T.click('.lk-mkt-nav__links a[href="#pricing"]'), { cta: "Open Pricing" }),
      S("Each plan has one action. Pro says “Start free, upgrade anytime” because there's no checkout yet.", "#pricing .lk-pricing"),
    ],
  });

  // ── Sign up & log in ─────────────────────────────────────────────────────
  A({
    id: "signup-errors", group: "auth", scene: "Visitor", title: "Sign up with missing fields",
    summary: "Inline errors under each field; focus jumps to the first problem.",
    what: ["Errors sit next to the field they belong to (HeroUI FieldError), never in a banner far away."],
    states: ["Field errors", "Availability kept", "Focus on first error"],
    ui: "TextField + FieldError, Button pending", prod: "app/signup/signup-form.tsx",
    outcome: "Name, email and password show what's missing; the username stays confirmed.",
    setup: (T) => T.scene("new", "#/signup?u=alex.k"),
    steps: [
      S("The username arrived from the landing page and is already confirmed available.", '[data-field="slug"]'),
      S("Submitting with empty fields…", ".lk-auth__card button[type=submit]", (T) => T.click(".lk-auth__card button[type=submit]"), { cta: "Submit" }),
      S("…shows a specific message under each field and moves focus to Name.", ".lk-auth__card .lk-stack"),
    ],
    try: { text: "The form opens with sample data. Clear the Email field and press “Create my page”.", target: '[data-field="email"]', done: () => !!document.querySelector(".lk-auth .field-error") },
  });
  A({
    id: "signup-strength", group: "auth", scene: "Visitor", title: "Password strength and show/hide",
    summary: "A four-segment meter fills as the password gets stronger; the eye toggles visibility.",
    ui: "Input, Button icon-only (ghost)", prod: "app/signup/signup-form.tsx",
    outcome: "The meter reached green and the password became visible.",
    setup: (T) => T.scene("new", "#/signup?u=alex.k"),
    steps: [
      S("A short password shows a red bar — under the 8-character minimum.", "#password", (T) => T.type("#password", "clay"), { cta: "Type a weak one" }),
      S("Length, numbers and symbols push it to green.", ".lk-strength", (T) => T.type("#password", "Clay-Studio-2026"), { cta: "Make it strong" }),
      S("The eye button reveals what you typed — handy on phones.", '[data-pw-toggle="password"]', (T) => T.click('[data-pw-toggle="password"]'), { cta: "Show password" }),
    ],
  });
  A({
    id: "signup-existing", group: "auth", scene: "Visitor", title: "Email already has an account",
    summary: "The email field explains it, and a toast offers Log in instead.",
    states: ["Pending", "Email error", "Toast with action"],
    ui: "FieldError, Toast with action", prod: "app/signup/signup-form.tsx",
    outcome: "Instead of a dead end, the person is one click from logging in.",
    setup: (T) => T.scene("new", "#/signup?u=alex.k"),
    steps: [
      S("Someone signs up with an email that already has a Linkee account.", ".lk-auth__card", async (T) => { await T.type("#name", "Maya Rivers"); await T.type("#email", "maya@mayarivers.studio"); await T.type("#password", "Ceramics2026"); }, { cta: "Fill the form" }),
      S("Create my page shows a pending state while it checks.", ".lk-auth__card button[type=submit]", (T) => T.click(".lk-auth__card button[type=submit]"), { cta: "Submit" }),
      S("The email field says what happened, and the toast offers Log in.", '[data-field="email"]', async (T) => { await T.$(".lk-toasts .toast__action", 3000); }),
      S("“Log in” in the toast is a direct way out.", ".lk-toasts .toast"),
    ],
  });
  A({
    id: "signup-success", group: "auth", scene: "Visitor", title: "Create an account",
    summary: "One short form, then straight into onboarding with the page already live.",
    ui: "Form, Button pending", prod: "app/signup/signup-form.tsx → /dashboard",
    outcome: "The account exists and onboarding opened at step 1.",
    setup: (T) => T.scene("new", "#/signup?u=alex.k"),
    steps: [
      S("Four fields: username (prefilled), name, email, password.", ".lk-auth__card", async (T) => { await T.type("#name", "Alex Kim"); await T.type("#email", "alex@example.com"); await T.type("#password", "Pottery-2026"); }, { cta: "Fill the form" }),
      S("Create my page.", ".lk-auth__card button[type=submit]", async (T) => { await T.click(".lk-auth__card button[type=submit]"); await T.$(".lk-onb", 4000); }, { cta: "Submit" }),
      S("Onboarding starts with the live preview on the right.", ".lk-onb__main"),
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
      S("Log in…", ".lk-auth__card button[type=submit]", (T) => T.click(".lk-auth__card button[type=submit]"), { cta: "Log in" }),
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
      S("Password in, Log in.", ".lk-auth__card", async (T) => { await T.type("#password", "ceramics"); await T.click(".lk-auth__card button[type=submit]"); await T.$("[data-editor]", 4000); }, { cta: "Log in" }),
      S("My Page is home. The toast says what's new since last time.", ".lk-toasts .toast"),
      S("The Inbox badge counts comments waiting for a reply.", ".lk-nav [data-inbox-badge]"),
    ],
  });

  // ── Onboarding ───────────────────────────────────────────────────────────
  A({
    id: "onb-profile", group: "onboarding", scene: "Just signed up", title: "Step 1 — photo, name and bio",
    summary: "Every keystroke shows up in the phone preview.",
    what: ["Seeing the page come alive is the moment people get Linkee; the preview delivers it in seconds.", "Each step can be skipped — nothing blocks reaching the workspace."],
    states: ["Live preview", "Character counters"],
    ui: "Avatar, Button, TextField, TextArea", prod: "New in prototype (production goes straight to the dashboard)",
    outcome: "Photo, name and bio are on the preview.",
    setup: (T) => T.scene("newUser", "#/welcome"),
    steps: [
      S("Add a photo (the picker is simulated).", '[data-action="photo"]', (T) => T.click('[data-action="photo"]'), { cta: "Add photo" }),
      S("Write a one-line bio. The counter shows the 160-character limit.", "#bio", (T) => T.type("#bio", "Plant-based recipes & weekly meal plans."), { cta: "Type a bio" }),
      S("The phone preview updates as you type.", ".lk-onb__aside .lk-phone"),
    ],
  });
  A({
    id: "onb-theme", group: "onboarding", scene: "Just signed up", title: "Step 2 — pick a look",
    summary: "Six themes and four fonts, previewed instantly.",
    ui: "Radio cards (theme), Tabs as segmented control", prod: "components/bio/editor/appearance-section.tsx",
    outcome: "The page switched to Midnight with a serif font.",
    setup: async (T) => { await T.scene("newUser", "#/welcome"); await T.click(".lk-onb__form button[type=submit]"); },
    steps: [
      S("Themes are full looks — background, text and button colors together.", '[data-theme="midnight"]', (T) => T.click('[data-theme="midnight"]'), { cta: "Pick Midnight" }),
      S("Fonts are a one-click switch.", '[data-seg="font"][data-value="serif"]', (T) => T.click('[data-seg="font"][data-value="serif"]'), { cta: "Pick Serif" }),
      S("The preview shows exactly what visitors will see.", ".lk-onb__aside .lk-phone"),
    ],
  });
  A({
    id: "onb-link", group: "onboarding", scene: "Just signed up", title: "Step 3 — first link, then “Your page is live”",
    summary: "Paste a URL, the title fills itself, Finish shows the shareable link.",
    states: ["Invalid URL", "Auto title", "Success screen"],
    ui: "InputGroup (https:// prefix), TextField, success screen with copy field", prod: "New in prototype",
    outcome: "The page is live and the link is one tap from being copied.",
    setup: async (T) => { await T.scene("newUser", "#/welcome"); await T.click(".lk-onb__form button[type=submit]"); await T.click(".lk-onb__form button[type=submit]"); },
    steps: [
      S("A typo is caught before the step can finish.", "#url", async (T) => { await T.type("#url", "my shop"); await T.click(".lk-onb__form button[type=submit]"); }, { cta: "Try a bad URL" }),
      S("Pasting a real address fills the title automatically (YouTube, Etsy, Substack… are recognized).", "#url", (T) => T.type("#url", "youtube.com/@alexcooks"), { cta: "Paste a URL" }),
      S("Finish.", ".lk-onb__form button[type=submit]", async (T) => { await T.click(".lk-onb__form button[type=submit]"); await T.$(".lk-success", 3000); }, { cta: "Finish" }),
      S("“Your page is live” — the primary action is copying the link for a bio.", ".lk-copyfield", (T) => T.click('[data-action="copy"]'), { cta: "Copy link" }),
      S("Go to My Page continues into the workspace.", '[data-action="finish"]'),
    ],
  });
  A({
    id: "onb-skip", group: "onboarding", scene: "Just signed up", title: "Skip setup",
    summary: "Skipping lands in My Page with a checklist instead of a blocked flow.",
    ui: "Button ghost, setup checklist", prod: "New in prototype",
    outcome: "My Page opened with the checklist at 0/4, so nothing is lost.",
    setup: (T) => T.scene("newUser", "#/welcome"),
    steps: [
      S("Skip setup is always available in the corner.", '[data-action="skipall"]', async (T) => { await T.click('[data-action="skipall"]'); await T.$("[data-setup]", 3000); }, { cta: "Skip setup" }),
      S("The checklist picks up where onboarding left off.", "[data-setup]"),
    ],
  });

  // ── My Page ──────────────────────────────────────────────────────────────
  A({
    id: "page-setup", group: "page", scene: "Just signed up", title: "Setup checklist",
    summary: "Four tasks that tick themselves off from real actions; each one is a shortcut.",
    what: ["A checklist the user can act on beats a product tour they have to sit through.", "It disappears when done or dismissed."],
    states: ["0/4 → 4/4", "Item shortcuts", "Hide / Done"],
    ui: "Card, progress ring, list buttons", prod: "app/dashboard/page.tsx (setup progress) — moved into My Page",
    outcome: "Two items ticked off by doing them, not by clicking checkboxes.",
    setup: (T) => T.scene("newUser", "#/app/page"),
    steps: [
      S("New creators see four steps. Progress is the ring on the left.", "[data-setup]"),
      S("Each item is a shortcut. “Add your first link” opens the add form.", '[data-setup-item="link"]', (T) => T.click('[data-setup-item="link"]'), { cta: "Open it" }),
      S("Adding a link ticks the item.", "[data-addform]", async (T) => { await T.type("#new-url", "alexcooks.substack.com"); await T.submit("[data-addform]"); }, { cta: "Add a link" }),
      S("“Share your link” copies the address and ticks itself.", '[data-setup-item="share"]', (T) => T.click('[data-setup-item="share"]'), { cta: "Share" }),
      S("Two of four done. Hide removes the card for good.", "[data-setup]"),
    ],
  });
  A({
    id: "page-add-link", group: "page", scene: "Pro creator", title: "Add a link",
    summary: "Paste a URL, the title fills in, Enter adds it to the top with a highlight.",
    what: ["Links come first on My Page because they're the most frequent edit.", "New links go on top: the newest thing is usually the most important."],
    states: ["Inline form", "Auto title", "Highlight", "Unsaved changes"],
    ui: "Button primary sm, TextField ×2, Toast", prod: "components/bio/editor/links-section.tsx",
    outcome: "The link is at the top of the list and in the preview. The save bar appeared because nothing is public until Save.",
    setup: (T) => T.scene("maya", "#/app/page"),
    steps: [
      S("Add link opens a two-field form inline — no dialog.", '[data-links] [data-action="add"]', (T) => T.click('[data-links] [data-action="add"]'), { cta: "Add link" }),
      S("Paste the URL first. The title suggests itself from the domain.", "#new-url", (T) => T.type("#new-url", "etsy.com/shop/mayarivers"), { cta: "Paste URL" }),
      S("Enter adds it. It lands on top with a brief highlight and appears in the preview.", "[data-addform]", (T) => T.submit("[data-addform]"), { cta: "Press Enter" }),
      S("Changes are drafts: the save bar shows that the public page hasn't changed yet.", "[data-savebar]"),
    ],
    try: { text: "Click “Add link”, paste any web address and press Enter.", target: '[data-links] [data-action="add"]', done: () => (L.state.page.links.length > 5) },
  });
  A({
    id: "page-add-invalid", group: "page", scene: "Pro creator", title: "Add a link with a bad URL",
    summary: "Empty and malformed URLs are caught inline; the error clears as you fix it.",
    ui: "TextField + FieldError", prod: "lib/bio.ts normalizeUrl",
    outcome: "The form explains each problem and never adds a broken link.",
    setup: async (T) => { await T.scene("maya", "#/app/page"); await T.click('[data-links] [data-action="add"]'); },
    steps: [
      S("Submitting empty asks for a URL.", "[data-addform]", (T) => T.submit("[data-addform]"), { cta: "Submit empty" }),
      S("Text that isn't an address asks for a full address.", '[data-field="new-url"]', async (T) => { await T.type("#new-url", "my shop"); await T.submit("[data-addform]"); }, { cta: "Type “my shop”" }),
      S("Fixing it clears the error immediately.", '[data-field="new-url"]', (T) => T.type("#new-url", "mayarivers.studio/gift-cards"), { cta: "Fix it" }),
    ],
  });
  A({
    id: "page-edit-link", group: "page", scene: "Pro creator", title: "Edit a link inline",
    summary: "Click a row to edit title and URL in place; Done validates.",
    ui: "TextField ×2, Button", prod: "components/bio/editor/links-section.tsx",
    outcome: "The new title is in the list and the preview.",
    setup: (T) => T.scene("maya", "#/app/page"),
    steps: [
      S("Clicking a link's text opens it for editing in place.", '[data-id="l2"] [data-action="edit"]', (T) => T.click('[data-id="l2"] [data-action="edit"]'), { cta: "Click the link" }),
      S("Title and URL are editable; the preview follows every keystroke.", "#e-title-l2", (T) => T.type("#e-title-l2", "Studio notes — read the latest issue"), { cta: "Rename it" }),
      S("Done checks the URL and closes the row.", '[data-id="l2"] [data-action="edit-done"]', (T) => T.click('[data-id="l2"] [data-action="edit-done"]'), { cta: "Done" }),
    ],
  });
  A({
    id: "page-hide-link", group: "page", scene: "Pro creator", title: "Hide or show a link",
    summary: "A switch per row. Hidden links keep their URL and clicks.",
    what: ["Seasonal links (a market, a sale) get turned on and off more often than they get deleted."],
    ui: "Switch (sm), Chip “Hidden”", prod: "components/bio/editor/links-section.tsx",
    outcome: "“Holiday market” is now visible on the preview.",
    setup: (T) => T.scene("maya", "#/app/page"),
    steps: [
      S("“Holiday market” is hidden — dimmed in the list, absent from the page.", '[data-id="l5"]'),
      S("Flip its switch…", '[data-id="l5"] [data-action="visible"]', (T) => T.click('[data-id="l5"] [data-action="visible"]'), { cta: "Show it" }),
      S("…and it appears in the preview immediately.", ".lk-editor__preview .lk-phone"),
    ],
  });
  A({
    id: "page-reorder", group: "page", scene: "Pro creator", title: "Reorder links",
    summary: "Drag the grip, use ↑/↓ on the focused grip, or Move up/down in the row menu.",
    what: ["Three ways to do the same thing: mouse, keyboard and touch-friendly menu. Moves are announced to screen readers."],
    ui: "Drag handle button, Dropdown menu", prod: "components/bio/editor/links-section.tsx",
    outcome: "“Book a wheel class” moved up two places; the preview order matches.",
    setup: (T) => T.scene("maya", "#/app/page"),
    steps: [
      S("Each row has a grip. Focus it and press ↑ to move the link up.", '[data-id="l4"] [data-grip]', async (T) => { const g = await T.$('[data-id="l4"] [data-grip]'); g.focus(); await T.key("ArrowUp", { target: '[data-id="l4"] [data-grip]' }); await T.key("ArrowUp", { target: '[data-id="l4"] [data-grip]' }); }, { cta: "Press ↑ twice" }),
      S("It moved two places. Screen readers hear “Moved to position 2 of 5.”", '[data-id="l4"]'),
      S("The row menu offers Move up / Move down too.", '[data-id="l4"] [data-action="row-menu"]', (T) => T.click('[data-id="l4"] [data-action="row-menu"]'), { cta: "Open menu" }),
      S("Move down puts it back.", menuItem("Move down")(T0()), (T) => T.click(T.byText(".lk-pop .menu-item", "Move down")), { cta: "Move down" }),
    ],
  });
  A({
    id: "page-delete-undo", group: "page", scene: "Pro creator", title: "Delete a link, then undo",
    summary: "Deleting is instant; the toast offers Undo instead of a confirm dialog.",
    what: ["Reversible actions shouldn't interrupt. Undo is faster and safer than “Are you sure?”"],
    ui: "Dropdown menu (danger item), Toast with action", prod: "components/bio/editor/links-section.tsx",
    outcome: "The link came back in its original position.",
    setup: (T) => T.scene("maya", "#/app/page"),
    steps: [
      S("Open the row menu…", '[data-id="l3"] [data-action="row-menu"]', (T) => T.click('[data-id="l3"] [data-action="row-menu"]'), { cta: "Open menu" }),
      S("…Delete is the last, red item.", () => T0().byText(".lk-pop .menu-item", "Delete")(), (T) => T.click(T.byText(".lk-pop .menu-item", "Delete")), { cta: "Delete" }),
      S("Gone — and the toast offers Undo.", toastUndo, (T) => T.click(toastUndo), { cta: "Undo" }),
      S("Back where it was.", '[data-id="l3"]'),
    ],
  });
  A({
    id: "page-profile", group: "page", scene: "Pro creator", title: "Change photo, name or bio",
    summary: "Profile edits flow into the preview; counters show the limits.",
    ui: "Avatar, Button, TextField, TextArea", prod: "components/bio/editor/profile-section.tsx",
    outcome: "The new photo and bio are in the preview, waiting for Save.",
    setup: (T) => T.scene("maya", "#/app/page"),
    steps: [
      S("Change photo swaps the avatar (the upload itself is simulated).", '[data-profile] [data-action="photo"]', (T) => T.click('[data-profile] [data-action="photo"]'), { cta: "Change photo" }),
      S("Edit the bio; the counter tracks the 160-character limit.", "#bio", (T) => T.type("#bio", "Ceramics & slow mornings. Spring drop is live — first Fridays, 10am PT."), { cta: "Edit bio" }),
      S("Both show in the preview immediately.", ".lk-editor__preview .lk-phone"),
    ],
  });
  A({
    id: "page-socials", group: "page", scene: "Pro creator", title: "Add a social icon",
    summary: "Pick a network from a menu, paste the profile address.",
    ui: "Dropdown menu, TextField", prod: "components/bio/editor/social-section.tsx",
    outcome: "An X icon now sits under the bio.",
    setup: (T) => T.scene("maya", "#/app/page"),
    steps: [
      S("Add icon lists only networks you haven't added yet.", '[data-action="social-add"]', (T) => T.click('[data-action="social-add"]'), { cta: "Add icon" }),
      S("Pick X.", () => T0().byText(".lk-pop .menu-item", "X")(), (T) => T.click(() => L.$$(".lk-pop .menu-item").find((b) => b.textContent.trim() === "X")), { cta: "Pick X" }),
      S("Paste the profile address. The icon appears under the bio in the preview.", "#soc-x", (T) => T.type("#soc-x", "x.com/mayamakes"), { cta: "Paste address" }),
    ],
  });
  A({
    id: "page-appearance", group: "page", scene: "Pro creator", title: "Change theme, font and buttons",
    summary: "Theme, font, button shape and button style are each one click.",
    ui: "Radio cards, Tabs (segmented) ×3", prod: "components/bio/editor/appearance-section.tsx",
    outcome: "A completely different look in four clicks.",
    setup: (T) => T.scene("maya", "#/app/page"),
    steps: [
      S("Pick Lavender.", '[data-theme="lavender"]', (T) => T.click('[data-theme="lavender"]'), { cta: "Lavender" }),
      S("Switch the font to Rounded.", '[data-seg="font"][data-value="rounded"]', (T) => T.click('[data-seg="font"][data-value="rounded"]'), { cta: "Rounded" }),
      S("Square buttons…", '[data-seg="buttonShape"][data-value="square"]', (T) => T.click('[data-seg="buttonShape"][data-value="square"]'), { cta: "Square" }),
      S("…with an outline style.", '[data-seg="buttonFill"][data-value="outline"]', (T) => T.click('[data-seg="buttonFill"][data-value="outline"]'), { cta: "Outline" }),
      S("The preview shows the new look.", ".lk-editor__preview .lk-phone"),
    ],
  });
  A({
    id: "page-colors", group: "page", scene: "Pro creator", title: "Custom colors",
    summary: "Hidden behind a disclosure; text stays readable automatically; reset returns to the theme.",
    what: ["Most people never need custom colors, so they don't cost screen space until asked for."],
    ui: "Button (disclosure), color inputs, Chip “Custom”", prod: "components/bio/editor/appearance-section.tsx",
    outcome: "Buttons turned terracotta, then went back to the theme colors.",
    setup: (T) => T.scene("maya", "#/app/page"),
    steps: [
      S("Custom colors opens three pickers: background, text, buttons.", '[data-action="colors"]', (T) => T.click('[data-action="colors"]'), { cta: "Open" }),
      S("Set the buttons to terracotta.", '[data-color="accent"]', (T) => T.set('[data-color="accent"]', "#b5522f"), { cta: "Pick a color" }),
      S("“Reset to theme colors” undoes all custom colors.", '[data-action="colors-reset"]', (T) => T.click('[data-action="colors-reset"]'), { cta: "Reset" }),
    ],
  });
  A({
    id: "page-save", group: "page", scene: "Pro creator", title: "Save changes (⌘S)",
    summary: "Edits are drafts until Save; the floating bar and ⌘S publish them.",
    what: ["A public page shouldn't change while you're halfway through an edit.", "The save bar only exists when there's something to save."],
    states: ["Unsaved", "Saving…", "Saved"],
    ui: "Floating action bar, Button pending, Toast", prod: "components/bio/editor/bio-editor.tsx",
    outcome: "linkee.bio/maya now shows the change; the bar disappeared.",
    setup: (T) => T.scene("maya", "#/app/page"),
    steps: [
      S("Any edit — here, the name — brings up the save bar.", "#displayName", (T) => T.type("#displayName", "Maya Rivers Studio"), { cta: "Edit name" }),
      S("“Unsaved changes · Discard · Save” floats at the bottom.", "[data-savebar]"),
      S("⌘S (or the Save button) publishes.", "[data-savebar]", (T) => T.key("s", { meta: true }), { cta: "Press ⌘S" }),
      S("Saved — the toast confirms the public page is up to date.", ".lk-toasts .toast"),
    ],
  });
  A({
    id: "page-discard", group: "page", scene: "Pro creator", title: "Discard changes, then undo",
    summary: "Discard throws drafts away — with Undo in case it was a slip.",
    ui: "Button ghost, Toast with action", prod: "components/bio/editor/bio-editor.tsx",
    outcome: "The edit came back after Undo.",
    setup: (T) => T.scene("maya", "#/app/page"),
    steps: [
      S("Make an edit.", "#bio", (T) => T.type("#bio", "Testing a new bio…"), { cta: "Edit bio" }),
      S("Discard reverts everything since the last save…", '[data-action="discard"]', (T) => T.click('[data-action="discard"]'), { cta: "Discard" }),
      S("…and Undo brings it back.", toastUndo, (T) => T.click(toastUndo), { cta: "Undo" }),
      S("The draft is restored and the save bar is back.", "[data-savebar]"),
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
      S("Only the owner sees Edit page in the corner.", '.lk-public a[href="#/app/page"]', async (T) => { await T.click('.lk-public a[href="#/app/page"]'); await T.$("[data-editor]", 3000); }, { cta: "Edit page" }),
      S("Back in My Page.", "[data-editor]"),
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
      S("Back in Linkee: a short “Finishing…” then a success toast.", ".lk-toasts", (T) => T.$("[data-inbox]", 4000)),
      S("Comments are already in the Inbox.", "[data-inbox]"),
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
    id: "inbox-ai-reply", group: "inbox", scene: "Pro creator", title: "Reply with an AI suggestion",
    summary: "Suggest → edit → ⌘↵. The next comment opens on its own.",
    what: ["The suggestion streams into the normal reply box, so the creator stays the author.", "After sending, the next comment opens with the cursor ready — inbox zero in one keystroke per comment."],
    states: ["Writing a suggestion…", "AI suggestion label", "Sending…", "Next comment"],
    ui: "Button secondary sm, TextArea, Chip “AI-assisted”, Kbd", prod: "lib/ai/replies.ts · components/comments/comment-card.tsx",
    outcome: "Reply sent, labeled AI-assisted in Done, and the next comment is open.",
    setup: (T) => T.scene("maya", "#/app/inbox"),
    steps: [
      S("The first comment is already open: the post it's on, then the comment.", "[data-detail]"),
      S("Suggest reply uses your tone and About you facts.", '[data-action="suggest"]', async (T) => { await T.click('[data-action="suggest"]'); await T.until(() => (L.$("#reply")?.value.length || 0) > 60); }, { cta: "Suggest reply", doing: "Writing a suggestion…" }),
      S("It's a draft in your reply box, labeled as AI. Edit it freely.", "#reply", (T) => T.type("#reply", " See you Friday!", { clear: false }), { cta: "Add a line" }),
      S("⌘↵ sends.", '[data-composer] [type="submit"]', (T) => T.key("Enter", { meta: true, target: "#reply" }), { cta: "Press ⌘↵" }),
      S("Sent. The next comment opened with the cursor in the reply box.", "[data-detail]"),
    ],
    try: { text: "Press “Suggest reply”, adjust the text, then Send.", target: '[data-action="suggest"]', done: () => L.state.comments.some((c) => c.reply && c.reply.when === "Just now") },
  });
  A({
    id: "inbox-ai-fail", group: "inbox", scene: "Pro creator · AI down", title: "AI suggestion fails",
    summary: "An inline alert; the reply box stays usable and no quota is spent.",
    ui: "Alert (danger)", prod: "lib/ai/openrouter.ts error mapping",
    outcome: "The failure never blocks replying by hand.",
    setup: (T) => T.scene("maya", "#/app/inbox", (s) => { s.sim.aiFails = true; }),
    steps: [
      S("The AI service is down in this scenario.", '[data-action="suggest"]', async (T) => { await T.click('[data-action="suggest"]'); await T.$("[data-ai-error] .alert", 4000); }, { cta: "Suggest reply" }),
      S("The alert says what happened and suggests writing your own.", "[data-ai-error]"),
    ],
  });
  A({
    id: "inbox-free-locked", group: "inbox", scene: "Free creator", title: "Suggest reply on the Free plan",
    summary: "The button shows a lock and opens one honest upgrade dialog.",
    ui: "Button with lock icon, Modal", prod: "lib/plans.ts UPGRADE_MESSAGE",
    outcome: "The dialog lists what Pro adds and how to get it — no fake checkout.",
    setup: (T) => T.scene("free", "#/app/inbox"),
    steps: [
      S("Free creators reply by hand. Suggest reply carries a lock.", '[data-action="upgrade"]', (T) => T.click('[data-action="upgrade"]'), { cta: "Click it" }),
      S("One upgrade dialog everywhere: what Pro adds, and that upgrading is by contacting Linkee.", ".modal__dialog"),
    ],
  });
  A({
    id: "inbox-skip", group: "inbox", scene: "Pro creator", title: "Skip a comment, then undo",
    summary: "Skip moves it to Done; Undo brings it back.",
    ui: "Button ghost, Toast with action", prod: "lib/instagram-comments.ts (status SKIPPED)",
    outcome: "The comment is back in To reply.",
    setup: (T) => T.scene("maya", "#/app/inbox"),
    steps: [
      S("Not every comment needs an answer.", '[data-action="skip"]', (T) => T.click('[data-action="skip"]'), { cta: "Skip" }),
      S("It moved to Done and the next one opened. Undo is in the toast.", toastUndo, (T) => T.click(toastUndo), { cta: "Undo" }),
      S("Back in To reply.", "[data-list]"),
    ],
  });
  A({
    id: "inbox-done", group: "inbox", scene: "Pro creator", title: "Review handled comments",
    summary: "Done shows who answered (you, AI-assisted, auto-reply) and lets you move skipped ones back.",
    ui: "Tabs (segmented), Chip, Alert", prod: "app/dashboard/inbox/page.tsx",
    outcome: "The spam comment is back in To reply.",
    setup: (T) => T.scene("maya", "#/app/inbox"),
    steps: [
      S("Switch to Done.", '[data-seg="tab"][data-value="done"]', (T) => T.click('[data-seg="tab"][data-value="done"]'), { cta: "Open Done" }),
      S("Auto-replied comments are labeled — you always know what was sent for you.", '[data-cmt="c7"]', (T) => T.click('[data-cmt="c7"]'), { cta: "Open it" }),
      S("Skipped comments can move back.", '[data-cmt="c9"]', async (T) => { await T.click('[data-cmt="c9"]'); await T.click('[data-action="unskip"]'); }, { cta: "Move back" }),
    ],
  });
  A({
    id: "inbox-refresh", group: "inbox", scene: "Pro creator", title: "Refresh for new comments",
    summary: "Pulls new comments on demand; says so when there's nothing new.",
    ui: "Button secondary sm (pending)", prod: "lib/social/instagram.ts sync",
    outcome: "A new comment arrived at the top; refreshing again says you're up to date.",
    setup: (T) => T.scene("maya", "#/app/inbox"),
    steps: [
      S("Refresh checks Instagram now.", '[data-action="refresh"]', (T) => T.click('[data-action="refresh"]'), { cta: "Refresh", doing: "Refreshing…" }),
      S("One new comment, unread dot and all.", "[data-list]", (T) => T.click('[data-action="refresh"]'), { cta: "Refresh again" }),
      S("Nothing new — and the toast says so instead of doing nothing visibly.", ".lk-toasts"),
    ],
  });
  A({
    id: "inbox-keyboard", group: "inbox", scene: "Pro creator", title: "Keyboard: J / K",
    summary: "Move through comments without the mouse.",
    ui: "Kbd hints", prod: "New in prototype",
    outcome: "Two comments down, one up.",
    setup: (T) => T.scene("maya", "#/app/inbox"),
    steps: [
      S("J moves to the next comment.", "[data-list]", async (T) => { document.activeElement?.blur(); await T.key("j", { target: null }); await T.key("j"); }, { cta: "Press J twice" }),
      S("K moves back up.", "[data-list]", (T) => T.key("k"), { cta: "Press K" }),
    ],
  });
  A({
    id: "inbox-open-ig", group: "inbox", scene: "Pro creator", title: "See the comment on Instagram",
    summary: "Opens the post with the comment highlighted and replies in place.",
    ui: "Button icon-only", prod: "Link to the Instagram permalink",
    outcome: "The full thread as it appears on Instagram.",
    setup: (T) => T.scene("maya", "#/app/inbox"),
    steps: [
      S("The arrow opens the comment where it lives.", '[data-action="open-ig"]', (T) => T.click('[data-action="open-ig"]'), { cta: "Open" }),
      S("Instagram's post view (simulated), with this comment highlighted.", ".lk-igpost"),
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
      S("The banner is gone and you can reply again.", "#reply"),
    ],
  });

  // ── Publish ──────────────────────────────────────────────────────────────
  const addFiles = (...ids) => async (T) => {
    await T.click('[data-action="add-photo"]');
    for (const id of ids) await T.click(`[data-file="${id}"]`);
    await T.click("[data-picker-add]");
    await T.until(() => !L.$(".lk-media__item[data-uploading]"), 9000);
  };
  A({
    id: "post-destinations", group: "publish", scene: "Pro creator", title: "Choose where to post",
    summary: "Toggle pills per account; the button names the outcome.",
    ui: "Toggle buttons, Button primary", prod: "components/publishing/destination-picker.tsx",
    outcome: "“Publish to Instagram” vs “Publish to 2 places” — no guessing.",
    setup: (T) => T.scene("maya", "#/app/post"),
    steps: [
      S("Every connected account starts selected.", ".lk-dest"),
      S("Turn the Facebook Page off…", '[data-dest="fb1"]', (T) => T.click('[data-dest="fb1"]'), { cta: "Turn off Facebook" }),
      S("…and the button now says “Publish to Instagram”.", '[data-action="publish"]', (T) => T.click('[data-dest="fb1"]'), { cta: "Turn it back on" }),
    ],
  });
  A({
    id: "post-upload", group: "publish", scene: "Pro creator", title: "Add photos (with rejected files)",
    summary: "Valid files upload with progress; invalid ones are listed with the reason.",
    what: ["Rules match the upload endpoint: JPG/PNG/WEBP up to 8 MB, MP4/MOV up to 100 MB.", "Rejections are listed together so one bad file doesn't hide the others."],
    states: ["File picker", "Uploading %", "Rejected files"],
    ui: "Drop zone, ProgressBar, Alert (danger)", prod: "components/publishing/media-tray.tsx · lib/publishing-rules.ts UPLOAD_RULES",
    outcome: "Two photos uploaded; the PDF and the 9.6 MB panorama were rejected with reasons.",
    setup: (T) => T.scene("maya", "#/app/post"),
    steps: [
      S("Click the drop zone (or drag files onto it).", '[data-action="add-photo"]', (T) => T.click('[data-action="add-photo"]'), { cta: "Open picker" }),
      S("Your device's file picker (simulated). Pick two photos, a PDF and a huge panorama.", ".lk-picker", async (T) => { for (const id of ["f1", "f3", "f9", "f10"]) await T.click(`[data-file="${id}"]`); }, { cta: "Select 4 files" }),
      S("Add.", "[data-picker-add]", (T) => T.click("[data-picker-add]"), { cta: "Add 4 files" }),
      S("Valid photos upload with progress; Publish waits for them.", "[data-media-host]", (T) => T.until(() => !L.$(".lk-media__item[data-uploading]"), 9000), { doing: "Uploading…" }),
      S("Rejected files are listed with the exact reason.", "[data-upload-errors]"),
    ],
    try: { text: "Click the drop zone, pick some files (try the PDF too) and add them.", target: '[data-action="add-photo"]', done: () => L.state.draft.media.length > 0 },
  });
  A({
    id: "post-ig-rules", group: "publish", scene: "Pro creator", title: "Instagram photo rules",
    summary: "Too-tall photos are blocked before publishing; mixed shapes get a crop warning.",
    states: ["Error: too tall", "Warning: carousel crop", "Ready"],
    ui: "Inline checks list", prod: "lib/publishing-rules.ts validateInstagram",
    outcome: "Removing the 9:16 screenshot made the post ready.",
    setup: (T) => T.scene("maya", "#/app/post"),
    steps: [
      S("Add a square photo, a 4:5 photo and a 9:16 screenshot.", '[data-action="add-photo"]', addFiles("f1", "f2", "f7"), { cta: "Add 3 files", doing: "Uploading…" }),
      S("The screenshot is too tall for the feed (allowed 4:5 to 1.91:1), and mixed shapes will be cropped.", "[data-checks]"),
      S("Remove the screenshot (third item).", '.lk-media__item:nth-child(3) [data-action="media-remove"]', (T) => T.click('.lk-media__item:nth-child(3) [data-action="media-remove"]'), { cta: "Remove it" }),
      S("Only the crop warning remains — Publish is enabled.", "[data-checks]"),
    ],
  });
  A({
    id: "post-fb-mix", group: "publish", scene: "Pro creator", title: "Photos + video on Facebook",
    summary: "Facebook can't mix them; a single video becomes an Instagram Reel.",
    ui: "Inline checks list", prod: "lib/publishing-rules.ts validateFacebook",
    outcome: "With just the video, Facebook is fine and Instagram notes it'll be a Reel.",
    setup: (T) => T.scene("maya", "#/app/post"),
    steps: [
      S("Add a photo and a video.", '[data-action="add-photo"]', addFiles("f1", "f6"), { cta: "Add photo + video", doing: "Uploading…" }),
      S("Facebook can't mix photos and video in one post.", "[data-checks]"),
      S("Remove the photo.", '.lk-media__item:nth-child(1) [data-action="media-remove"]', (T) => T.click('.lk-media__item:nth-child(1) [data-action="media-remove"]'), { cta: "Remove photo" }),
      S("One video: Facebook is happy and Instagram will publish it as a Reel.", "[data-checks]"),
    ],
  });
  A({
    id: "post-media-order", group: "publish", scene: "Pro creator", title: "Reorder and remove media",
    summary: "Move items earlier; remove with Undo.",
    ui: "Icon buttons on thumbnails, Toast with action", prod: "components/publishing/media-tray.tsx",
    outcome: "The cover photo changed and a removed photo came back.",
    setup: async (T) => { await T.scene("maya", "#/app/post"); await addFiles("f1", "f3", "f5")(T); },
    steps: [
      S("The first item is the cover. Move the third one earlier…", '.lk-media__item:nth-child(3) [data-action="media-left"]', async (T) => { await T.click('.lk-media__item:nth-child(3) [data-action="media-left"]'); await T.click('.lk-media__item:nth-child(2) [data-action="media-left"]'); }, { cta: "Move to front" }),
      S("…it's now the cover in the preview.", "[data-preview]"),
      S("Remove one — Undo is in the toast.", '.lk-media__item:nth-child(2) [data-action="media-remove"]', async (T) => { await T.click('.lk-media__item:nth-child(2) [data-action="media-remove"]'); await T.click(toastUndo); }, { cta: "Remove + Undo" }),
    ],
  });
  A({
    id: "post-preview", group: "publish", scene: "Pro creator", title: "Caption with live previews",
    summary: "Counter uses the strictest selected network; previews show hashtags, truncation and layout.",
    ui: "TextArea with counter, Tabs (segmented)", prod: "components/publishing/post-preview.tsx",
    outcome: "You can see the caption cut at “… more” on Instagram before posting.",
    setup: async (T) => { await T.scene("maya", "#/app/post"); await addFiles("f2")(T); },
    steps: [
      S("Type a caption. The counter shows Instagram's 2,200 limit.", "#caption", (T) => T.type("#caption", "Spring drop is live 🌱 Six new glazes, speckled stoneware and the moon jar you've all been asking about. Shop link in bio. #ceramics #handmade @portlandmakers", { delay: 10 }), { cta: "Type caption" }),
      S("Instagram's preview truncates at “… more” like the real feed.", "[data-preview]", (T) => T.click('[data-seg="pv"][data-value="FACEBOOK"]'), { cta: "Show Facebook" }),
      S("Facebook shows the full text above the photo.", "[data-preview]"),
    ],
  });
  A({
    id: "post-publish", group: "publish", scene: "Pro creator", title: "Publish to Instagram + Facebook",
    summary: "Each destination reports its own status; View post opens each result.",
    states: ["Waiting", "Publishing", "Published"],
    ui: "Chip statuses, Spinner, Button", prod: "lib/publishing.ts handlePublishTarget",
    outcome: "Live on both. The post is at the top of Recent posts.",
    setup: async (T) => { await T.scene("maya", "#/app/post"); await addFiles("f2")(T); await T.type("#caption", "Spring drop is live 🌱 #ceramics", { delay: 8 }); },
    steps: [
      S("Everything checks out.", "[data-checks]"),
      S("Publish to 2 places.", '[data-action="publish"]', async (T) => { await T.click('[data-action="publish"]'); await T.until(() => !L.$("[data-results] .spinner"), 9000); }, { cta: "Publish", doing: "Publishing…" }),
      S("Each destination shows its own result.", "[data-results]", (T) => T.click('[data-target="0"] [data-action="view-post"]'), { cta: "View on Instagram" }),
      S("The live Instagram post (simulated).", ".lk-igpost"),
    ],
  });
  A({
    id: "post-retry", group: "publish", scene: "Pro creator · Facebook limited", title: "One destination fails → retry",
    summary: "Instagram succeeds, Facebook is rate-limited; retry just Facebook.",
    what: ["Retrying only the failed destination avoids posting twice on the one that worked."],
    states: ["Failed (rate limited)", "Retry", "Published"],
    ui: "Chip (danger), Button Retry", prod: "lib/publishing.ts (MetaApiError.isRateLimited)",
    outcome: "Both destinations show Published.",
    setup: async (T) => { await T.scene("maya", "#/app/post", (s) => { s.sim.publishFails = true; }); await addFiles("f1")(T); await T.type("#caption", "Kiln opening Sunday!", { delay: 8 }); },
    steps: [
      S("Facebook is rate-limiting this Page right now.", '[data-action="publish"]', async (T) => { await T.click('[data-action="publish"]'); await T.$('[data-action="retry-run"]', 9000); }, { cta: "Publish", doing: "Publishing…" }),
      S("Facebook failed with Meta's reason; Instagram is unaffected.", "[data-results]", async (T) => { L.state.sim.publishFails = false; await T.until(() => !L.$("[data-results] .spinner"), 9000); await T.click('[data-action="retry-run"]'); await T.until(() => !L.$('[data-action="retry-run"]'), 6000); }, { cta: "Retry Facebook", doing: "Retrying…" }),
      S("Both destinations are published.", "[data-results]"),
    ],
  });
  A({
    id: "post-history-retry", group: "publish", scene: "Pro creator", title: "Retry from history",
    summary: "Failed destinations in Recent posts keep a Retry button.",
    ui: "List, Chip, Button ghost", prod: "components/publishing/history-actions.tsx",
    outcome: "The kiln-opening post is now on Facebook too.",
    setup: (T) => T.scene("maya", "#/app/post"),
    steps: [
      S("Last week's kiln post failed on Facebook. The reason is right under it.", '[data-hist="h2"]'),
      S("Retry.", '[data-hist="h2"] [data-action="retry-hist"]', (T) => T.click('[data-hist="h2"] [data-action="retry-hist"]'), { cta: "Retry" }),
      S("Published on both.", '[data-hist="h2"]', (T) => T.wait(1300)),
    ],
  });
  A({
    id: "post-unconfirmed", group: "publish", scene: "Pro creator", title: "Unconfirmed post: check before retrying",
    summary: "When Instagram doesn't confirm, Linkee asks you to check instead of risking a duplicate.",
    what: ["A blind retry could post twice. Checking the profile first, then marking or re-publishing, is safe."],
    states: ["Check first", "Profile view", "Marked as published"],
    ui: "Chip (warning), Dropdown menu, Modal", prod: "lib/publishing.ts (unconfirmed result)",
    outcome: "The post was there, so it's marked published — no duplicate.",
    setup: (T) => T.scene("maya", "#/app/post"),
    steps: [
      S("“Instagram: check first” — the post may or may not be live.", '[data-hist="h3"]'),
      S("Options…", '[data-hist="h3"] [data-action="unconfirmed"]', (T) => T.click('[data-hist="h3"] [data-action="unconfirmed"]'), { cta: "Open options" }),
      S("…Open Instagram profile to look.", () => T0().byText(".lk-pop .menu-item", "Open Instagram profile")(), (T) => T.click(T.byText(".lk-pop .menu-item", "Open Instagram profile")), { cta: "Open profile" }),
      S("It's there (highlighted). Mark it as published from here.", ".lk-iggrid", (T) => T.click(btn1), { cta: "Mark as published" }),
      S("Resolved with no duplicate post.", '[data-hist="h3"]'),
    ],
  });
  A({
    id: "post-publish-again", group: "publish", scene: "Pro creator", title: "Unconfirmed post: publish again",
    summary: "If it really isn't there, publish again — after a warning.",
    ui: "Modal (warning)", prod: "lib/publishing.ts",
    outcome: "Published once more, with an explicit confirmation.",
    setup: (T) => T.scene("maya", "#/app/post"),
    steps: [
      S("Options…", '[data-hist="h3"] [data-action="unconfirmed"]', (T) => T.click('[data-hist="h3"] [data-action="unconfirmed"]'), { cta: "Open options" }),
      S("“Not there — publish again”.", () => T0().byText(".lk-pop .menu-item", "Not there")(), (T) => T.click(T.byText(".lk-pop .menu-item", "Not there")), { cta: "Publish again" }),
      S("The warning explains the risk of a duplicate.", ".modal__dialog", async (T) => { await T.click(btn1); await T.wait(1400); }, { cta: "Confirm", doing: "Publishing…" }),
      S("Published.", '[data-hist="h3"]'),
    ],
  });
  A({
    id: "post-draft", group: "publish", scene: "Pro creator", title: "Save a draft",
    summary: "Keep a half-written post for later.",
    ui: "Button ghost (pending), status text", prod: "components/publishing/composer.tsx",
    outcome: "“Draft saved” next to the buttons.",
    setup: (T) => T.scene("maya", "#/app/post"),
    steps: [
      S("Start a caption…", "#caption", (T) => T.type("#caption", "Glaze test results coming soon…"), { cta: "Type" }),
      S("Save draft.", '[data-action="save-draft"]', (T) => T.click('[data-action="save-draft"]'), { cta: "Save draft" }),
      S("Saved — and the status stays visible until you change something.", "[data-saved]"),
    ],
  });
  A({
    id: "post-free", group: "publish", scene: "Free creator", title: "Publish on the Free plan",
    summary: "A clear Pro explanation instead of a disabled composer.",
    ui: "Card, Button primary", prod: "components/layout/upgrade-notice.tsx",
    outcome: "The upgrade dialog opened.",
    setup: (T) => T.scene("free", "#/app/post"),
    steps: [
      S("Free plans see what Post to All does and what it looks like.", ".lk-gate"),
      S("Upgrade to Pro.", '.lk-gate [data-action="upgrade"]', (T) => T.click('.lk-gate [data-action="upgrade"]'), { cta: "Upgrade" }),
      S("Same dialog as everywhere else.", ".modal__dialog"),
    ],
  });

  // ── Settings ─────────────────────────────────────────────────────────────
  A({
    id: "settings-address", group: "settings", scene: "Pro creator", title: "Change the page address",
    summary: "Live availability, then a warning that the old link stops working.",
    ui: "InputGroup, Modal (warning)", prod: "components/bio/editor/settings-section.tsx (username)",
    outcome: "The page moved to linkee.bio/maya.studio — the top bar shows the new link.",
    setup: (T) => T.scene("maya", "#/app/settings"),
    steps: [
      S("Type a new address; availability is checked as you type.", "#acc-slug", (T) => T.type("#acc-slug", "maya.studio"), { cta: "Type new address" }),
      S("Save address…", "[data-acc-save]", (T) => T.click("[data-acc-save]"), { cta: "Save" }),
      S("…asks first: the old link stops working right away.", ".modal__dialog", async (T) => { await T.click(btn1); await T.wait(800); }, { cta: "Change address", doing: "Saving…" }),
      S("Done. The URL pill in the top bar already shows it.", "[data-shell=copy]"),
    ],
  });
  A({
    id: "settings-hide", group: "settings", scene: "Pro creator", title: "Hide the page",
    summary: "One switch takes the page offline without deleting anything.",
    ui: "Switch", prod: "components/bio/editor/settings-section.tsx (Published)",
    outcome: "My Page shows a “Page hidden” chip; visitors see “not available”.",
    setup: (T) => T.scene("maya", "#/app/settings"),
    steps: [
      S("Page is public.", '[data-action="published"]', (T) => T.click('[data-action="published"]'), { cta: "Hide it" }),
      S("Now hidden — links and stats are kept.", "#account .lk-card--flush"),
      S("My Page reminds you with a chip.", null, async (T) => { await T.click('.lk-nav a[href="#/app/page"]'); await T.$("[data-editor]"); }, { cta: "Go to My Page" }),
      S("“Page hidden” links back to this setting.", ".lk-statline .chip"),
    ],
  });
  A({
    id: "settings-fb-pages", group: "settings", scene: "Pro creator", title: "Connect more Facebook Pages",
    summary: "Pick Pages on Facebook's screen; each becomes its own destination.",
    ui: "Modal, toggle list", prod: "app/api/social/facebook/callback/route.ts",
    outcome: "“Studio Classes PDX” is a new connection and a new destination in Publish.",
    setup: (T) => T.scene("maya", "#/app/settings?section=connections"),
    steps: [
      S("+ Facebook Page.", '[data-action="connect-fb"]', async (T) => { await T.click('[data-action="connect-fb"]'); await T.click(btn1); }, { cta: "Connect a Page" }),
      S("Facebook's screen (simulated): choose which Pages Linkee may post to.", '[data-page="p2"]', (T) => T.click('[data-page="p2"]'), { cta: "Select a 2nd Page" }),
      S("Continue.", '[data-consent="allow"]', async (T) => { await T.click('[data-consent="allow"]'); await T.until(() => L.state.accounts.length > 2, 4000); }, { cta: "Continue", doing: "Connecting…" }),
      S("Each Page is its own connection.", "#connections"),
    ],
  });
  A({
    id: "settings-disconnect", group: "settings", scene: "Pro creator", title: "Disconnect an account",
    summary: "A dialog spells out what stops working and what's kept.",
    ui: "Dropdown menu, AlertDialog (danger)", prod: "components/social/connected-accounts.tsx",
    outcome: "The Facebook Page is gone from Connections and from Publish destinations.",
    setup: (T) => T.scene("maya", "#/app/settings?section=connections"),
    steps: [
      S("Row options…", '[data-acct="fb1"] [data-action="acct-menu"]', (T) => T.click('[data-acct="fb1"] [data-action="acct-menu"]'), { cta: "Open options" }),
      S("Disconnect.", () => T0().byText(".lk-pop .menu-item", "Disconnect")(), (T) => T.click(T.byText(".lk-pop .menu-item", "Disconnect")), { cta: "Disconnect" }),
      S("The dialog says exactly what changes.", ".modal__dialog", async (T) => { await T.click(btn1); await T.wait(900); }, { cta: "Confirm", doing: "Disconnecting…" }),
      S("Removed.", "#connections"),
    ],
  });
  A({
    id: "settings-limit", group: "settings", scene: "Free creator, 3 accounts", title: "Account limit reached",
    summary: "Free allows 3 connections; the 4th explains the limit.",
    ui: "Modal (warning)", prod: "lib/plans.ts maxSocialAccounts",
    outcome: "The limit is explained before leaving for Instagram.",
    setup: (T) => T.scene("free", "#/app/settings?section=connections", (s) => { s.accounts.push({ id: "ig2", provider: "INSTAGRAM", name: "Maya Rivers", handle: "maya.classes", status: "CONNECTED", connectedAt: "Connected Oct 9" }); }),
    steps: [
      S("3 of 3 accounts on Free.", "#connections .lk-setrow:last-child"),
      S("Try to add another.", '[data-action="connect-ig"]', (T) => T.click('[data-action="connect-ig"]'), { cta: "+ Instagram" }),
      S("The dialog explains the limit.", ".modal__dialog"),
    ],
  });
  A({
    id: "settings-ai", group: "settings", scene: "Pro creator", title: "Tune AI replies",
    summary: "Tone, language, facts about you and words to skip.",
    what: ["“About you” is where facts live, so suggestions can answer “when's the next drop?” correctly."],
    ui: "Radio cards, Select, TextArea, tag input, Button", prod: "app/dashboard/settings/ai-preferences-form.tsx",
    outcome: "Saved — the next suggestion uses the new settings.",
    setup: (T) => T.scene("maya", "#/app/settings?section=ai"),
    steps: [
      S("Pick a tone.", '[data-tone="PLAYFUL"]', (T) => T.click('[data-tone="PLAYFUL"]'), { cta: "Playful" }),
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
    summary: "Free vs Pro side by side; one upgrade path.",
    ui: "Table, Button primary", prod: "lib/plans.ts",
    outcome: "The upgrade dialog copies the contact address.",
    setup: (T) => T.scene("free", "#/app/settings?section=plan"),
    steps: [
      S("What you have vs. what Pro adds.", "#plan .lk-compare"),
      S("Upgrade to Pro.", '#plan [data-action="upgrade"]', (T) => T.click('#plan [data-action="upgrade"]'), { cta: "Upgrade" }),
      S("“Contact us to upgrade” copies the address — no fake checkout.", btn1, (T) => T.click(btn1), { cta: "Contact us" }),
    ],
  });

  // ── Navigation & account ─────────────────────────────────────────────────
  A({
    id: "nav-copy", group: "global", scene: "Pro creator", title: "Copy your page link",
    summary: "The URL pill in the top bar copies linkee.bio/you from any screen.",
    ui: "Button (pill), Toast", prod: "components/bio/copy-link-button.tsx",
    outcome: "Copied, with the address in the toast.",
    setup: (T) => T.scene("maya", "#/app/inbox"),
    steps: [S("The most-shared thing is always one click away.", "[data-shell=copy]", (T) => T.click("[data-shell=copy]"), { cta: "Copy" }), S("Copied.", ".lk-toasts .toast")],
  });
  A({
    id: "nav-tabs", group: "global", scene: "Pro creator", title: "Move between the four areas",
    summary: "My Page, Inbox (with badge), Publish, Settings — nothing deeper.",
    ui: "Navbar / bottom tab bar", prod: "components/layout/app-shell.tsx",
    outcome: "Every area is one click from every other.",
    setup: (T) => T.scene("maya", "#/app/page"),
    steps: [
      S("Four destinations. On phones they move to a bottom tab bar.", ".lk-nav"),
      S("Inbox — the badge counts comments waiting.", '.lk-nav a[href="#/app/inbox"]', (T) => T.click('.lk-nav a[href="#/app/inbox"]'), { cta: "Inbox" }),
      S("Publish.", '.lk-nav a[href="#/app/post"]', (T) => T.click('.lk-nav a[href="#/app/post"]'), { cta: "Publish" }),
      S("Settings.", '.lk-nav a[href="#/app/settings"]', (T) => T.click('.lk-nav a[href="#/app/settings"]'), { cta: "Settings" }),
    ],
  });
  A({
    id: "nav-menu", group: "global", scene: "Pro creator", title: "Account menu and log out",
    summary: "Avatar menu: view page, copy link, settings, log out.",
    ui: "Dropdown (Avatar trigger), Menu", prod: "components/layout/app-shell.tsx UserMenu",
    outcome: "Logged out, back on the landing page.",
    setup: (T) => T.scene("maya", "#/app/page"),
    steps: [
      S("The avatar opens the account menu with name, email and plan.", "[data-shell=menu]", (T) => T.click("[data-shell=menu]"), { cta: "Open menu" }),
      S("Log out.", () => T0().byText(".lk-pop .menu-item", "Log out")(), (T) => T.click(T.byText(".lk-pop .menu-item", "Log out")), { cta: "Log out" }),
      S("Back on the landing page; the top bar offers Log in again.", ".lk-mkt-nav"),
    ],
  });

  // Targets that depend on T helpers before a player exists.
  function T0() { return L.T; }
})();
