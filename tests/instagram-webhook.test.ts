import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseInstagramWebhook, verifyMetaSignature } from "@/lib/social/instagram-webhook";

const fixture = (name: string) => readFileSync(path.join(__dirname, "fixtures", name), "utf8");
const sign = (body: string, secret: string) => `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

describe("verifyMetaSignature", () => {
  const body = fixture("instagram-webhook-comments.json");
  const secrets = ["ig-test-secret", "fb-test-secret"];

  it("accepts a signature from the Instagram app secret", () => {
    expect(verifyMetaSignature(body, sign(body, "ig-test-secret"), secrets)).toBe(true);
  });

  it("accepts a signature from the second (Meta app) secret", () => {
    expect(verifyMetaSignature(body, sign(body, "fb-test-secret"), secrets)).toBe(true);
  });

  it("accepts uppercase hex", () => {
    expect(verifyMetaSignature(body, sign(body, "ig-test-secret").toUpperCase().replace("SHA256=", "sha256="), secrets)).toBe(true);
  });

  it("rejects a signature from an unknown secret", () => {
    expect(verifyMetaSignature(body, sign(body, "attacker"), secrets)).toBe(false);
  });

  it("rejects a tampered body", () => {
    expect(verifyMetaSignature(`${body} `, sign(body, "ig-test-secret"), secrets)).toBe(false);
  });

  it("rejects missing or malformed headers", () => {
    expect(verifyMetaSignature(body, null, secrets)).toBe(false);
    expect(verifyMetaSignature(body, "", secrets)).toBe(false);
    expect(verifyMetaSignature(body, "sha1=abc", secrets)).toBe(false);
    expect(verifyMetaSignature(body, "sha256=xyz", secrets)).toBe(false);
  });

  it("rejects everything when no secret is configured", () => {
    expect(verifyMetaSignature(body, sign(body, ""), [undefined, ""])).toBe(false);
  });
});

describe("parseInstagramWebhook", () => {
  it("normalizes standard comment changes, including thread replies", () => {
    const events = parseInstagramWebhook(JSON.parse(fixture("instagram-webhook-comments.json")));
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({
      igAccountId: "17841405822304914",
      field: "comments",
      commentId: "17865799348089039",
      text: "Love this glaze! Do you ship to Canada? 😍",
      fromId: "232323232",
      fromUsername: "maya.makes",
      mediaId: "18043912345678901",
      mediaProductType: "FEED",
      parentId: null,
      occurredAt: new Date(1762171200 * 1000),
    });
    expect(events[1].parentId).toBe("17865799348089039");
  });

  it("accepts live_comments", () => {
    const [event] = parseInstagramWebhook(JSON.parse(fixture("instagram-webhook-live-comments.json")));
    expect(event.field).toBe("live_comments");
    expect(event.mediaProductType).toBe("LIVE");
    expect(event.commentId).toBe("17999999999999123");
  });

  it("accepts the entry-level field/value shape and the comment_id alias", () => {
    const [event] = parseInstagramWebhook(JSON.parse(fixture("instagram-webhook-entry-level.json")));
    expect(event.commentId).toBe("17865799348089041");
    expect(event.mediaId).toBe("18043912345678902");
    expect(event.mediaProductType).toBeNull();
  });

  it("ignores non-comment fields, incomplete comments and entries without an account id", () => {
    const events = parseInstagramWebhook(JSON.parse(fixture("instagram-webhook-mixed.json")));
    expect(events.map((e) => e.commentId)).toEqual(["17865799348089052"]);
  });

  it("ignores other webhook objects and garbage", () => {
    expect(parseInstagramWebhook({ object: "page", entry: [{ id: "1", changes: [] }] })).toEqual([]);
    expect(parseInstagramWebhook(null)).toEqual([]);
    expect(parseInstagramWebhook("nope")).toEqual([]);
    expect(parseInstagramWebhook({ entry: "x" })).toEqual([]);
  });

  it("falls back to receipt time when entry.time is missing", () => {
    const now = new Date("2026-11-03T10:00:00Z");
    const payload = JSON.parse(fixture("instagram-webhook-entry-level.json"));
    delete payload.entry[0].time;
    expect(parseInstagramWebhook(payload, now)[0].occurredAt).toEqual(now);
  });
});
