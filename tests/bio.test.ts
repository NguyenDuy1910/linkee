import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME,
  bioPageInputSchema,
  contrastRatio,
  isSafeLinkUrl,
  normalizeUrl,
  parseStoredSocialLinks,
  parseStoredTheme,
  resolveTheme,
  slugSchema,
  socialLinksSchema,
  suggestSlug,
  themeSchema,
} from "@/lib/bio";
import { mapServerErrors, toPreview, type EditorState } from "@/components/bio/editor/editor-model";

describe("slugSchema", () => {
  it.each(["abc", "maya.rivers", "a_b-c", "x1y", "a".repeat(30), "123"])("accepts %s", (slug) => {
    expect(slugSchema.safeParse(slug).success).toBe(true);
  });

  it("lowercases and trims", () => {
    expect(slugSchema.parse("  MayaRivers ")).toBe("mayarivers");
  });

  it.each([
    ["ab", "too short"],
    ["a".repeat(31), "too long"],
    [".abc", "leading dot"],
    ["abc-", "trailing dash"],
    ["_abc", "leading underscore"],
    ["ab c", "space"],
    ["héllo", "non-ascii"],
    ["a/b/c", "slash"],
    ["dashboard", "reserved"],
    ["API", "reserved (case-insensitive)"],
    ["robots.txt", "reserved file"],
    ["favicon.ico", "reserved file"],
    ["_next", "reserved"],
  ])("rejects %s (%s)", (slug) => {
    expect(slugSchema.safeParse(slug).success).toBe(false);
  });

  it("reports a reserved-name message", () => {
    const result = slugSchema.safeParse("login");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("That username is reserved");
  });

  it("does not treat prototype keys as reserved", () => {
    expect(slugSchema.safeParse("constructor").success).toBe(true);
  });
});

describe("suggestSlug", () => {
  it("derives a slug from an email local-part", () => {
    expect(suggestSlug("Maya.Rivers+ig")).toBe("maya.rivers");
    expect(suggestSlug("__jo--")).toBe("");
    expect(suggestSlug("go")).toBe("");
    expect(suggestSlug("support")).toBe("");
  });
});

describe("normalizeUrl", () => {
  it.each([
    ["example.com", "https://example.com/"],
    ["  example.com/shop?x=1  ", "https://example.com/shop?x=1"],
    ["http://example.com", "http://example.com/"],
    ["HTTPS://Example.com/Path", "https://example.com/Path"],
    ["//cdn.example.com/a", "https://cdn.example.com/a"],
    ["example.com:8080/x", "https://example.com:8080/x"],
    ["mailto:hello@example.com", "mailto:hello@example.com"],
    ["MAILTO:hello@example.com?subject=Hi", "mailto:hello@example.com?subject=Hi"],
    ["tel:+1 (555) 010-9999".replace(/ /g, ""), "tel:+15550109999"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeUrl(input)).toBe(expected);
  });

  it.each([
    "",
    "   ",
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "java\tscript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox",
    "file:///etc/passwd",
    "ftp://example.com",
    "hello",
    "mailto:not-an-email",
    "tel:abc",
    "https://",
    "example .com",
    `https://example.com/${"a".repeat(2100)}`,
  ])("rejects %j", (input) => {
    expect(normalizeUrl(input)).toBeNull();
  });

  it("only produces safe link URLs", () => {
    for (const input of ["example.com", "mailto:a@b.co", "tel:5551234"]) {
      expect(isSafeLinkUrl(normalizeUrl(input) ?? "")).toBe(true);
    }
    expect(isSafeLinkUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("social links", () => {
  it("normalizes urls and emails", () => {
    expect(
      socialLinksSchema.parse([
        { platform: "instagram", url: "instagram.com/maya" },
        { platform: "email", url: "maya@example.com" },
      ]),
    ).toEqual([
      { platform: "instagram", url: "https://instagram.com/maya" },
      { platform: "email", url: "mailto:maya@example.com" },
    ]);
  });

  it("rejects duplicates, unknown platforms, unsafe urls and too many icons", () => {
    expect(socialLinksSchema.safeParse([{ platform: "x", url: "x.com/a" }, { platform: "x", url: "x.com/b" }]).success).toBe(false);
    expect(socialLinksSchema.safeParse([{ platform: "myspace", url: "myspace.com" }]).success).toBe(false);
    expect(socialLinksSchema.safeParse([{ platform: "website", url: "javascript:alert(1)" }]).success).toBe(false);
    const many = Array.from({ length: 13 }, () => ({ platform: "website", url: "example.com" }));
    expect(socialLinksSchema.safeParse(many).success).toBe(false);
  });

  it("drops invalid stored entries", () => {
    expect(parseStoredSocialLinks([{ platform: "github", url: "https://github.com/a" }, { platform: "x", url: "javascript:1" }, 5])).toEqual([
      { platform: "github", url: "https://github.com/a" },
    ]);
    expect(parseStoredSocialLinks(null)).toEqual([]);
  });
});

describe("themes", () => {
  it("fills defaults", () => {
    expect(themeSchema.parse({})).toEqual(DEFAULT_THEME);
    expect(parseStoredTheme(null)).toEqual(DEFAULT_THEME);
    expect(parseStoredTheme({ preset: "nope" })).toEqual(DEFAULT_THEME);
    expect(parseStoredTheme({ preset: "midnight", font: "mono" })).toEqual({ ...DEFAULT_THEME, preset: "midnight", font: "mono" });
  });

  it("validates and lowercases hex overrides", () => {
    expect(themeSchema.parse({ accent: "#FF00AA" }).accent).toBe("#ff00aa");
    expect(themeSchema.safeParse({ background: "red" }).success).toBe(false);
    expect(themeSchema.safeParse({ background: "#fff" }).success).toBe(false);
  });

  it("resolves presets to concrete CSS", () => {
    const resolved = resolveTheme({ ...DEFAULT_THEME, preset: "midnight", buttonShape: "pill", font: "serif" });
    expect(resolved.background).toContain("linear-gradient");
    expect(resolved.isDark).toBe(true);
    expect(resolved.button.radius).toBe("9999px");
    expect(resolved.fontFamily).toMatch(/^ui-serif/);
  });

  it("applies button fills", () => {
    const outline = resolveTheme({ ...DEFAULT_THEME, buttonFill: "outline" });
    expect(outline.button.background).toBe("transparent");
    const soft = resolveTheme({ ...DEFAULT_THEME, buttonFill: "soft" });
    expect(soft.button.background).toContain("color-mix");
  });

  it("keeps text readable on custom colors", () => {
    const dark = resolveTheme({ ...DEFAULT_THEME, background: "#101010" });
    expect(contrastRatio(dark.text, "#101010")).toBeGreaterThanOrEqual(4.5);
    const accent = resolveTheme({ ...DEFAULT_THEME, accent: "#ffe066" });
    expect(contrastRatio(accent.button.color, "#ffe066")).toBeGreaterThanOrEqual(4.5);
  });

  it("every preset has readable text and buttons", () => {
    for (const preset of ["minimal", "midnight", "sunset", "forest", "lavender", "sand"] as const) {
      const t = resolveTheme({ ...DEFAULT_THEME, preset });
      expect(contrastRatio(t.text, t.baseColor), preset).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.button.color, t.button.background), preset).toBeGreaterThanOrEqual(4.5);
    }
  });
});

const validPage = {
  slug: "maya",
  published: true,
  displayName: "Maya",
  bio: "",
  avatarMediaId: null,
  theme: DEFAULT_THEME,
  socialLinks: [],
  links: [{ title: "Shop", url: "example.com", isActive: true }],
};

describe("bioPageInputSchema", () => {
  it("accepts a valid payload and normalizes link urls", () => {
    const parsed = bioPageInputSchema.parse(validPage);
    expect(parsed.links[0].url).toBe("https://example.com/");
  });

  it("enforces limits", () => {
    const tooLong = (field: string, value: unknown) => bioPageInputSchema.safeParse({ ...validPage, [field]: value }).success;
    expect(tooLong("displayName", "a".repeat(61))).toBe(false);
    expect(tooLong("displayName", "a".repeat(60))).toBe(true);
    expect(tooLong("displayName", "   ")).toBe(false);
    expect(tooLong("bio", "a".repeat(161))).toBe(false);
    expect(tooLong("bio", "a".repeat(160))).toBe(true);
    expect(tooLong("links", Array.from({ length: 51 }, () => validPage.links[0]))).toBe(false);
    expect(tooLong("links", Array.from({ length: 50 }, () => validPage.links[0]))).toBe(true);
    expect(tooLong("links", [{ title: "a".repeat(81), url: "example.com", isActive: true }])).toBe(false);
    expect(tooLong("links", [{ title: "", url: "example.com", isActive: true }])).toBe(false);
    expect(tooLong("links", [{ title: "Bad", url: "javascript:alert(1)", isActive: true }])).toBe(false);
  });

  it("reports link errors by index", () => {
    const result = bioPageInputSchema.safeParse({
      ...validPage,
      links: [validPage.links[0], { title: "Bad", url: "javascript:alert(1)", isActive: true }],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path.join("."))).toContain("links.1.url");
  });
});

describe("editor model", () => {
  const state: EditorState = {
    slug: "maya",
    published: true,
    displayName: "Maya",
    bio: "",
    avatar: null,
    theme: DEFAULT_THEME,
    socialLinks: [{ key: "s1", platform: "website", url: "not a url" }],
    links: [
      { key: "a", id: "a", title: "Shop", url: "example.com", isActive: true, clicks: 3 },
      { key: "b", title: "Hidden", url: "example.com", isActive: false, clicks: 0 },
      { key: "c", title: "Draft", url: "", isActive: true, clicks: 0 },
    ],
  };

  it("previews only visible links and valid socials", () => {
    const preview = toPreview(state);
    expect(preview.links.map((l) => l.title)).toEqual(["Shop", "Draft"]);
    expect(preview.links[1].url).toBe("");
    expect(preview.socialLinks).toEqual([]);
  });

  it("maps indexed server errors to item keys", () => {
    expect(mapServerErrors({ "links.2.url": "Add a URL", "socialLinks.0.url": "Bad", slug: "Taken", "theme.accent": "Hex" }, state)).toEqual({
      "link:c:url": "Add a URL",
      "social:s1:url": "Bad",
      slug: "Taken",
      "theme.accent": "Hex",
    });
  });
});
