/* Linkee UX preview — product constants (mirroring lib/bio.ts, lib/plans.ts, lib/ai/preferences.ts,
   lib/publishing-rules.ts) and local mock data. Everything is simulated in memory. */
(function () {
  const L = (window.L = window.L || {});

  // ── Product constants (source: production code) ────────────────────────────
  L.THEMES = [
    { id: "minimal", label: "Minimal", background: "#fafafa", base: "#fafafa", text: "#18181b", muted: "#52525b", accent: "#18181b", accentText: "#ffffff" },
    { id: "midnight", label: "Midnight", background: "linear-gradient(180deg, #0b1020 0%, #151b33 100%)", base: "#10152a", text: "#f4f5fb", muted: "#a7adc6", accent: "#f4f5fb", accentText: "#10152a" },
    { id: "sunset", label: "Sunset", background: "linear-gradient(160deg, #ffb88c 0%, #ff8a7a 45%, #de6fa1 100%)", base: "#ff8a7a", text: "#2a0f1c", muted: "#5b2a3d", accent: "#2a0f1c", accentText: "#fff4ef" },
    { id: "forest", label: "Forest", background: "#16302b", base: "#16302b", text: "#eef5ef", muted: "#a9c2b4", accent: "#d9ead3", accentText: "#16302b" },
    { id: "lavender", label: "Lavender", background: "linear-gradient(180deg, #f3efff 0%, #e6defc 100%)", base: "#ece6fe", text: "#2b2045", muted: "#5f5480", accent: "#5b45c9", accentText: "#ffffff" },
    { id: "sand", label: "Sand", background: "#f3ece1", base: "#f3ece1", text: "#3b2f24", muted: "#6e5e4e", accent: "#3b2f24", accentText: "#f8f3ea" },
  ];
  L.FONTS = [
    { id: "sans", label: "Sans", stack: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
    { id: "serif", label: "Serif", stack: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' },
    { id: "mono", label: "Mono", stack: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' },
    { id: "rounded", label: "Rounded", stack: 'ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", system-ui, sans-serif' },
  ];
  L.SHAPES = [
    { id: "rounded", label: "Rounded", radius: "14px" },
    { id: "pill", label: "Pill", radius: "9999px" },
    { id: "square", label: "Square", radius: "4px" },
  ];
  L.FILLS = [
    { id: "solid", label: "Solid" },
    { id: "outline", label: "Outline" },
    { id: "soft", label: "Soft" },
  ];
  L.SOCIALS = [
    { id: "instagram", label: "Instagram", icon: "logo-instagram", placeholder: "instagram.com/yourname" },
    { id: "tiktok", label: "TikTok", icon: "logo-tiktok", placeholder: "tiktok.com/@yourname" },
    { id: "youtube", label: "YouTube", icon: "logo-youtube", placeholder: "youtube.com/@yourname" },
    { id: "x", label: "X", icon: "logo-x", placeholder: "x.com/yourname" },
    { id: "threads", label: "Threads", icon: "logo-threads", placeholder: "threads.net/@yourname" },
    { id: "facebook", label: "Facebook", icon: "logo-facebook", placeholder: "facebook.com/yourpage" },
    { id: "linkedin", label: "LinkedIn", icon: "logo-linkedin", placeholder: "linkedin.com/in/yourname" },
    { id: "github", label: "GitHub", icon: "logo-github", placeholder: "github.com/yourname" },
    { id: "telegram", label: "Telegram", icon: "logo-telegram", placeholder: "t.me/yourname" },
    { id: "email", label: "Email", icon: "envelope", placeholder: "you@example.com" },
    { id: "website", label: "Website", icon: "globe", placeholder: "yourwebsite.com" },
  ];
  L.TONES = [
    { id: "FRIENDLY", label: "Friendly", description: "Warm and approachable, like talking to a regular." },
    { id: "PROFESSIONAL", label: "Professional", description: "Polished and courteous. Good for brands and services." },
    { id: "PLAYFUL", label: "Playful", description: "Light and fun, with the occasional emoji." },
  ];
  L.LANGUAGES = [
    ["auto", "Match the commenter's language"], ["en", "English"], ["es", "Spanish"], ["pt-BR", "Portuguese (Brazil)"],
    ["fr", "French"], ["de", "German"], ["it", "Italian"], ["nl", "Dutch"], ["vi", "Vietnamese"], ["id", "Indonesian"],
    ["ja", "Japanese"], ["ko", "Korean"], ["zh-Hans", "Chinese (Simplified)"], ["hi", "Hindi"],
  ];
  L.PLANS = {
    FREE: { label: "Free", ai: false, publishing: false, suggestionsPerDay: 0, autoRepliesPerDay: 0, maxAccounts: 3 },
    PRO: { label: "Pro", ai: true, publishing: true, suggestionsPerDay: 200, autoRepliesPerDay: 100, maxAccounts: 10 },
  };
  L.LIMITS = { slugMax: 30, nameMax: 60, bioMax: 160, linkTitleMax: 80, maxLinks: 50, maxSocials: 12, brandMax: 500, captionIG: 2200, captionFB: 63206, maxMedia: 10 };
  L.RESERVED = ["admin", "api", "app", "dashboard", "login", "signup", "settings", "go", "media", "help", "about", "pricing", "linkee"];
  L.TAKEN = ["maya", "jordan", "alex", "studio", "shop", "sam"];

  // ── Generated artwork (offline, no stock photos) ──────────────────────────
  const svgUri = (svg) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  L.art = function (kind) {
    const A = {
      jar: ["#e9e1d4", "#d8cbb6", `<ellipse cx="200" cy="215" rx="112" ry="118" fill="#f6f1e8"/><ellipse cx="200" cy="112" rx="40" ry="10" fill="#e5dccd"/><path d="M168 330c20 8 44 8 64 0" stroke="#d8cbb6" stroke-width="6" fill="none"/><path d="M226 150l8 30-6 22" stroke="#b9a68b" stroke-width="2" fill="none"/>`],
      plates: ["#d9e3e1", "#b8cbc6", `<circle cx="160" cy="190" r="110" fill="#f3f1ea"/><circle cx="160" cy="190" r="80" fill="#e8e4d8"/><circle cx="270" cy="250" r="90" fill="#9fb8c4"/><circle cx="270" cy="250" r="62" fill="#b6cbd4"/>${[...Array(26)].map((_, i) => `<circle cx="${100 + ((i * 53) % 220)}" cy="${120 + ((i * 37) % 160)}" r="2.2" fill="#6b5f50" opacity=".55"/>`).join("")}`],
      mugs: ["#efe6dc", "#dccab6", `<rect x="90" y="150" width="110" height="130" rx="18" fill="#c57b57"/><path d="M200 180c40 0 40 70 0 70" stroke="#c57b57" stroke-width="16" fill="none"/><rect x="225" y="170" width="95" height="110" rx="16" fill="#f4efe6"/><path d="M320 195c32 0 32 58 0 58" stroke="#f4efe6" stroke-width="14" fill="none"/><rect x="90" y="150" width="110" height="26" rx="10" fill="#a9603f"/>`],
      kiln: ["#2a2622", "#3d342c", `<rect x="80" y="80" width="240" height="240" rx="24" fill="#4a3f35"/><rect x="104" y="104" width="192" height="192" rx="14" fill="#f2a65a" opacity=".85"/><circle cx="160" cy="230" r="34" fill="#e8d9c3"/><rect x="210" y="180" width="54" height="84" rx="14" fill="#8fa9a3"/>`],
      tiles: ["#f1ede6", "#e2dbcf", [..."012345678"].map((n, i) => `<rect x="${70 + (i % 3) * 90}" y="${70 + Math.floor(i / 3) * 90}" width="78" height="78" rx="10" fill="${["#8fa9a3", "#c57b57", "#e8dcc4", "#5b6f8c", "#d9b26f", "#a3b18a", "#b07d90", "#f4efe6", "#6d8a7e"][i]}"/>`).join("")],
      studio: ["#e8e3da", "#d5ccbf", `<rect x="0" y="250" width="400" height="150" fill="#cdbfa9"/><circle cx="200" cy="245" r="96" fill="#9c8f7d"/><ellipse cx="200" cy="200" rx="54" ry="40" fill="#bfa58a"/><rect x="176" y="150" width="48" height="56" rx="20" fill="#cdb497"/>`],
      vase: ["#dfe6ee", "#c6d2df", `<path d="M170 90h60c0 40 50 60 50 140s-50 100-80 100-80-20-80-100 50-100 50-140z" fill="#5b6f8c"/><path d="M170 90h60" stroke="#46566e" stroke-width="10"/>`],
      bowl: ["#f4ead9", "#e8d6b9", `<path d="M90 190h220c0 80-50 120-110 120S90 270 90 190z" fill="#a3b18a"/><ellipse cx="200" cy="190" rx="110" ry="22" fill="#c4cfae"/>`],
    };
    const [bg1, bg2, body] = A[kind] || A.jar;
    return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/>${body}</svg>`);
  };
  L.LIBRARY = ["jar", "plates", "mugs", "vase", "bowl", "studio", "kiln", "tiles"]; // "camera roll" for uploads
  L.AVATAR_MAYA = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#d9c7ae"/><circle cx="100" cy="82" r="38" fill="#7a5b44"/><circle cx="100" cy="88" r="30" fill="#e7c9a9"/><path d="M62 78c4-30 30-44 52-38 22 6 30 26 26 42-10-14-30-20-44-18-14 2-26 8-34 14z" fill="#5a3f2e"/><path d="M40 200c6-46 34-68 60-68s54 22 60 68z" fill="#8a9a7b"/></svg>`);

  // ── Persona fixtures ──────────────────────────────────────────────────────
  const mayaPage = () => ({
    displayName: "Maya Rivers",
    bio: "Ceramics, slow mornings & studio notes. New pieces every first Friday.",
    avatar: L.AVATAR_MAYA,
    theme: { preset: "sand", font: "serif", buttonShape: "pill", buttonFill: "solid", background: null, text: null, accent: null },
    socials: [
      { platform: "instagram", url: "instagram.com/maya.makes" },
      { platform: "tiktok", url: "tiktok.com/@mayamakes" },
      { platform: "youtube", url: "youtube.com/@mayarivers" },
      { platform: "email", url: "hello@mayarivers.studio" },
    ],
    links: [
      { id: "l1", title: "Shop the spring collection", url: "mayarivers.studio/shop", visible: true, clicks: 1284 },
      { id: "l2", title: "Studio notes — monthly newsletter", url: "mayarivers.substack.com", visible: true, clicks: 412 },
      { id: "l3", title: "Watch: throwing a moon jar (12 min)", url: "youtube.com/watch?v=moonjar7", visible: true, clicks: 236 },
      { id: "l4", title: "Book a wheel class in Portland", url: "mayarivers.studio/classes", visible: true, clicks: 97 },
      { id: "l5", title: "Holiday market — Dec 14", url: "mayarivers.studio/market", visible: false, clicks: 0 },
    ],
  });
  const emptyPage = (name) => ({
    displayName: name || "",
    bio: "",
    avatar: null,
    theme: { preset: "minimal", font: "sans", buttonShape: "rounded", buttonFill: "solid", background: null, text: null, accent: null },
    socials: [],
    links: [],
  });
  const mayaAccounts = (igStatus) => [
    { id: "ig1", provider: "INSTAGRAM", name: "Maya Rivers", handle: "maya.makes", status: igStatus, connectedAt: "Connected Oct 2" },
    { id: "fb1", provider: "FACEBOOK", name: "Maya Rivers Ceramics", handle: "Facebook Page", status: "CONNECTED", connectedAt: "Connected Oct 2" },
  ];
  L.IG_POSTS = {
    p1: { art: "jar", caption: "Moon jar no. 7 — fourteen hours on the wheel, three firings, one tiny crack I've decided to love." },
    p2: { art: "plates", caption: "Spring collection drops Friday at 10am PT. Speckled stoneware, six new glazes." },
    p3: { art: "mugs", caption: "Studio morning. Trimming feet on the new mugs." },
  };
  const mayaComments = () => [
    { id: "c1", user: "hannah.makes", text: "Is the moon jar still available?? I've been dreaming about it since last week", post: "p1", age: "4m", status: "NEW", unread: true },
    { id: "c2", user: "theo_clay", text: "What clay body do you use for these? The speckle is gorgeous", post: "p2", age: "18m", status: "NEW", unread: true },
    { id: "c3", user: "lucia.r", text: "Do you ship to Canada? 🇨🇦", post: "p2", age: "42m", status: "NEW", unread: true },
    { id: "c4", user: "mo.bakes", text: "When's the next wheel class? My sister wants to join for her birthday", post: "p3", age: "1h", status: "NEW" },
    { id: "c5", user: "danielkim", text: "this glaze 😍😍", post: "p2", age: "2h", status: "NEW" },
    { id: "c6", user: "priya.designs", text: "The crack makes it more beautiful honestly. Kintsugi next?", post: "p1", age: "3h", status: "NEW" },
    { id: "c7", user: "sam.ortiz", text: "Got my mug yesterday and it's perfect. Coffee tastes better already", post: "p3", age: "5h", status: "REPLIED", reply: { by: "AUTO", text: "So happy it found a good home, Sam! Enjoy every cup ☕️" } },
    { id: "c8", user: "ella.w", text: "Will there be more of the blue glaze?", post: "p2", age: "1d", status: "REPLIED", reply: { by: "YOU", text: "Yes! A small batch of the blue is in Friday's drop 💙" } },
    { id: "c9", user: "growth.boost.official", text: "Get 10K real followers fast 👉 boostgram.io 🚀🚀", post: "p3", age: "1d", status: "SKIPPED", skipReason: "You chose not to reply." },
  ];
  L.SUGGESTIONS = {
    c1: "It is! Moon jar no. 7 goes live in Friday's drop at 10am PT — set a reminder, it's a one-of-one 🤍",
    c2: "Thank you! It's a speckled buff stoneware fired to cone 6. The speckle comes from the iron in the clay.",
    c3: "We do! Canada shipping is available at checkout, usually 5–8 business days.",
    c4: "Love that! Next wheel classes are on the booking page — Saturday mornings still have a few spots.",
    c5: "Thank you! That one's called Oat Milk — it's in the spring collection 🤍",
    c6: "Funny you ask — kintsugi is on my list for winter. Stay tuned!",
  };
  const mayaHistory = () => [
    { id: "h1", art: "plates", caption: "Spring collection drops Friday at 10am PT. Speckled stoneware, six new glazes. #ceramics #stoneware", when: "Yesterday, 9:12 AM",
      targets: [{ account: "ig1", status: "PUBLISHED" }, { account: "fb1", status: "PUBLISHED" }] },
    { id: "h2", art: "kiln", caption: "Kiln opening this Sunday! Come say hi at the studio, 2–5pm.", when: "Oct 30, 6:40 PM",
      targets: [{ account: "ig1", status: "PUBLISHED" }, { account: "fb1", status: "FAILED", error: "Facebook is limiting how often this Page can post. Try again in a few minutes." }] },
    { id: "h3", art: "tiles", caption: "Glaze test tiles, round two. Which one should make the cut?", when: "Oct 24, 11:05 AM",
      targets: [{ account: "ig1", status: "UNCONFIRMED", error: "Instagram didn't confirm this post. Check your profile before retrying so it isn't posted twice." }, { account: "fb1", status: "PUBLISHED" }] },
  ];

  L.PERSONAS = {
    maya: { label: "Returning creator · Pro", hint: "Maya, busy page, Instagram + Facebook" },
    free: { label: "Returning creator · Free", hint: "Same page, AI and Post to All locked" },
    reconnect: { label: "Connection expired", hint: "Instagram needs reconnecting" },
    new: { label: "Brand-new visitor", hint: "Starts at the landing page" },
  };

  // ── Prefilled sample data ────────────────────────────────────────────────
  // Reviewers click instead of type: forms open with realistic values. Action Explorer demos turn
  // this off while they play (they show validation on empty forms) and back on afterwards.
  L.prefill = true;
  L.SAMPLES = {
    claim: "alex.k",
    signup: { slug: "alex.k", name: "Alex Kim", email: "alex@example.com", password: "Pottery-2026" },
    login: { email: "maya@mayarivers.studio", password: "ceramics-2026" },
    onboarding: { bio: "Plant-based recipes & weekly meal plans.", url: "youtube.com/@alexcooks", title: "YouTube" },
    links: [
      { url: "etsy.com/shop/mayarivers", title: "Etsy shop" },
      { url: "mayarivers.studio/gift-cards", title: "Gift cards for the holidays" },
      { url: "open.spotify.com/playlist/studio-mornings", title: "Studio mornings playlist" },
      { url: "patreon.com/mayarivers", title: "Support the studio on Patreon" },
    ],
    socials: { instagram: "instagram.com/maya.makes", tiktok: "tiktok.com/@mayamakes", youtube: "youtube.com/@mayarivers", x: "x.com/mayamakes", threads: "threads.net/@maya.makes", facebook: "facebook.com/mayariversceramics", linkedin: "linkedin.com/in/mayarivers", github: "github.com/mayarivers", telegram: "t.me/mayamakes", email: "hello@mayarivers.studio", website: "mayarivers.studio" },
    drafts: [
      { media: [["plates", "spring-plates.jpg"], ["jar", "moon-jar.jpg"]], caption: "Spring drop is live 🌱 Six new glazes, speckled stoneware and the moon jar you've all been asking about. Shop link in bio.\n\n#ceramics #handmade #portlandmakers" },
      { media: [["mugs", "mugs-morning.jpg"]], caption: "Studio mornings ☕️ Trimming feet on the new mugs before the kiln fills up again. Which glaze should go in first?\n\n#pottery #studiolife" },
      { media: [["bowl", "bowl-detail.webp"], ["vase", "blue-vase.png"], ["tiles", "glaze-tests.jpg"]], caption: "Glaze tests, round three. Swipe for the blue that finally worked 💙 #glazetest #ceramics" },
    ],
  };
  /** A ready-to-publish draft (uploads already finished) for the connected destinations. */
  L.sampleDraft = (s, n = 0) => {
    const d = L.SAMPLES.drafts[n % L.SAMPLES.drafts.length];
    return {
      destinations: s.accounts.filter((a) => a.status === "CONNECTED").map((a) => a.id),
      media: d.media.map(([art, name]) => ({ id: L.uid ? L.uid() : Math.random().toString(36).slice(2, 9), art, kind: "IMAGE", name, w: 1080, h: 1350, progress: 100 })),
      caption: d.caption,
      sample: n,
    };
  };

  L.makeState = function (persona) {
    const base = {
      persona,
      signedIn: persona !== "new",
      user: { name: "Maya Rivers", email: "maya@mayarivers.studio", slug: "maya", plan: "PRO" },
      page: mayaPage(),
      accounts: mayaAccounts("CONNECTED"),
      comments: mayaComments(),
      ai: { tone: "FRIENDLY", language: "auto", brandContext: "I'm Maya, a ceramicist in Portland. Shop drops are first Fridays at 10am PT. Classes book through the link in bio. Never promise custom orders.", skipWords: ["giveaway", "price?", "collab"], autoReply: true, usage: { suggestions: 34, autoReplies: 12 } },
      history: mayaHistory(),
      draft: { destinations: ["ig1", "fb1"], media: [], caption: "" },
      linkSample: 0,
      setup: { dismissed: true, copied: true },
      inbox: { tab: "todo", selected: "c1" },
      sim: { aiFails: false, publishFails: false },
    };
    if (persona === "free") {
      base.user.plan = "FREE";
      base.ai.autoReply = false;
      base.ai.usage = { suggestions: 0, autoReplies: 0 };
    }
    if (persona === "reconnect") base.accounts = mayaAccounts("NEEDS_RECONNECT");
    if (persona === "new") {
      base.user = { name: "", email: "", slug: "", plan: "FREE" };
      base.page = emptyPage("");
      base.accounts = [];
      base.comments = [];
      base.history = [];
      base.ai = { tone: "FRIENDLY", language: "auto", brandContext: "", skipWords: [], autoReply: false, usage: { suggestions: 0, autoReplies: 0 } };
      base.draft = { destinations: [], media: [], caption: "" };
      base.setup = { dismissed: false, copied: false, themed: false };
      base.inbox = { tab: "todo", selected: null };
    }
    if (L.prefill !== false && base.accounts.length) base.draft = L.sampleDraft(base, 0);
    base.saved = JSON.parse(JSON.stringify(base.page));
    return base;
  };
})();
