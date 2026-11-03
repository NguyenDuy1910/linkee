import { describe, expect, it } from "vitest";
import { letterCount, matchedSkipKeyword, spamReason } from "@/lib/ai/auto-reply";
import { splitKeywords } from "@/lib/ai/preferences";
import { buildReplyMessages, cleanReply, MAX_REPLY_CHARS, settingsKey } from "@/lib/ai/replies";

const base = {
  tone: "FRIENDLY" as const,
  language: "auto",
  brandContext: "",
  caption: "New mug drop this Friday ☕️",
  authorUsername: "maya.makes",
  commentText: "Love it! When can I order?",
};

describe("buildReplyMessages", () => {
  it("returns a short system prompt and a user message with the comment", () => {
    const [system, user] = buildReplyMessages(base);
    expect(system.role).toBe("system");
    expect(user.role).toBe("user");
    expect(system.content).toContain("SKIP");
    expect(system.content).toContain("220 characters");
    expect(system.content).toContain("same language the commenter used");
    expect(user.content).toContain("@maya.makes");
    expect(user.content).toContain("Love it! When can I order?");
    expect(user.content).toContain("New mug drop this Friday");
  });

  it("uses the chosen language when not auto", () => {
    const [system] = buildReplyMessages({ ...base, language: "es" });
    expect(system.content).toContain("Spanish (es)");
    expect(system.content).not.toContain("same language the commenter used");
  });

  it("reflects the tone", () => {
    expect(buildReplyMessages({ ...base, tone: "PROFESSIONAL" })[0].content).toContain("professional");
    expect(buildReplyMessages({ ...base, tone: "PLAYFUL" })[0].content).toContain("playful");
  });

  it("truncates caption (300), comment (500) and brand context (500)", () => {
    const [system, user] = buildReplyMessages({
      ...base,
      caption: "c".repeat(1000),
      commentText: "m".repeat(2000),
      brandContext: "b".repeat(2000),
    });
    expect(user.content).toContain(`${"c".repeat(299)}…`);
    expect(user.content).not.toContain("c".repeat(300));
    expect(user.content).toContain(`${"m".repeat(499)}…`);
    expect(user.content).not.toContain("m".repeat(500));
    expect(system.content).toContain(`${"b".repeat(499)}…`);
    expect(system.content).not.toContain("b".repeat(500));
  });

  it("omits brand context when empty and handles a missing caption", () => {
    const [system, user] = buildReplyMessages({ ...base, caption: null });
    expect(system.content).not.toContain("About the account owner");
    expect(user.content).toContain("Post caption: (not available)");
  });
});

describe("cleanReply", () => {
  it("trims, collapses whitespace and strips wrapping quotes", () => {
    expect(cleanReply('  "Thank   you so\nmuch!"  ')).toEqual({ skip: false, text: "Thank you so much!" });
    expect(cleanReply("“Glad you like it!”")).toEqual({ skip: false, text: "Glad you like it!" });
    expect(cleanReply("'\"Nested quotes\"'")).toEqual({ skip: false, text: "Nested quotes" });
  });

  it("keeps inner quotes and strips a leading label", () => {
    expect(cleanReply('Reply: Thanks! The "Ocean" glaze is my favorite too')).toEqual({
      skip: false,
      text: 'Thanks! The "Ocean" glaze is my favorite too',
    });
  });

  it("detects SKIP in common variants", () => {
    expect(cleanReply("SKIP")).toEqual({ skip: true });
    expect(cleanReply(" skip. ")).toEqual({ skip: true });
    expect(cleanReply('"SKIP"')).toEqual({ skip: true });
    expect(cleanReply("Skip this one? No — thanks for watching!")).toEqual({
      skip: false,
      text: "Skip this one? No — thanks for watching!",
    });
  });

  it("returns null for empty output", () => {
    expect(cleanReply("")).toBeNull();
    expect(cleanReply('   ""  ')).toBeNull();
  });

  it("caps overlong replies at a sensible boundary", () => {
    const long = `${"Thank you so much for the kind words. ".repeat(12)}`;
    const cleaned = cleanReply(long);
    expect(cleaned && !cleaned.skip && cleaned.text.length).toBeLessThanOrEqual(MAX_REPLY_CHARS);
    expect(cleaned && !cleaned.skip && cleaned.text.endsWith(".")).toBe(true);
    const noSpaces = cleanReply("x".repeat(1000));
    expect(noSpaces && !noSpaces.skip && noSpaces.text.length).toBe(MAX_REPLY_CHARS);
  });
});

describe("settingsKey", () => {
  const s = { tone: "FRIENDLY" as const, language: "auto", brandContext: "" };
  it("is stable and changes with settings or model", () => {
    expect(settingsKey(s, "m1")).toBe(settingsKey({ ...s }, "m1"));
    expect(settingsKey(s, "m1")).not.toBe(settingsKey(s, "m2"));
    expect(settingsKey(s, "m1")).not.toBe(settingsKey({ ...s, tone: "PLAYFUL" }, "m1"));
    expect(settingsKey(s, "m1")).not.toBe(settingsKey({ ...s, brandContext: "x" }, "m1"));
  });
});

describe("auto-reply filters", () => {
  it("flags links, mass mentions and repeated characters", () => {
    expect(spamReason("Check https://cheap-followers.example now")).toBe("contains a link");
    expect(spamReason("DM promo at www.example.com")).toBe("contains a link");
    expect(spamReason("go to bestdeals.shop")).toBe("contains a link");
    expect(spamReason("@a @b @c look")).toBe("mentions 3 or more accounts");
    expect(spamReason("wowwwwwwwww")).toBe("repeats a character 8+ times");
    expect(spamReason("😍😍😍😍😍😍😍😍")).toBe("repeats a character 8+ times");
  });

  it("lets normal comments through", () => {
    expect(spamReason("Love this! Is it dishwasher safe?")).toBeNull();
    expect(spamReason("@friend @sis you need this")).toBeNull();
    expect(spamReason("soooo good")).toBeNull();
    expect(spamReason("Price is 12.99 right?")).toBeNull();
  });

  it("counts letters across scripts", () => {
    expect(letterCount("🔥🔥")).toBe(0);
    expect(letterCount("ok")).toBe(2);
    expect(letterCount("好看")).toBe(2);
    expect(letterCount("!!! 1")).toBe(0);
  });

  it("matches skip keywords case-insensitively", () => {
    expect(matchedSkipKeyword("I want a REFUND please", ["refund", "giveaway"])).toBe("refund");
    expect(matchedSkipKeyword("Nice work", ["refund"])).toBeNull();
    expect(matchedSkipKeyword("anything", ["  "])).toBeNull();
  });

  it("splits keyword input into a de-duplicated list", () => {
    expect(splitKeywords("refund, Giveaway,\n giveaway , ,collab")).toEqual(["refund", "Giveaway", "collab"]);
  });
});
