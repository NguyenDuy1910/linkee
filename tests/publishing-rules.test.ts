import { describe, expect, it } from "vitest";
import {
  CAPTION_LIMITS,
  countHashtags,
  countMentions,
  MAX_MEDIA,
  validateForProvider,
  type ComposerMedia,
} from "@/lib/publishing-rules";
import { buildFeedParams, parsePublishablePages } from "@/lib/social/facebook";
import { carouselChildParams, carouselParentParams, singleContainerParams } from "@/lib/social/instagram-publish";
import graph from "./fixtures/publish-graph-responses.json";

const image = (width: number, height: number, extra: Partial<ComposerMedia> = {}): ComposerMedia => ({
  kind: "IMAGE",
  width,
  height,
  sizeBytes: 500_000,
  mimeType: "image/jpeg",
  ...extra,
});
const video: ComposerMedia = { kind: "VIDEO", width: null, height: null, sizeBytes: 20_000_000, mimeType: "video/mp4" };

describe("hashtag and mention counting", () => {
  it("counts hashtags but not URL fragments or HTML entities", () => {
    expect(countHashtags("#one #two\n#ba_ba #日本 see example.com/#anchor &#39;")).toBe(4);
  });

  it("counts mentions but not email addresses", () => {
    expect(countMentions("hi @linkee.bio and @a_b, mail me at me@example.com")).toBe(2);
  });
});

describe("validateForProvider — Instagram", () => {
  it("rejects text-only posts", () => {
    const { errors } = validateForProvider("INSTAGRAM", { caption: "Hello", media: [] });
    expect(errors).toContain("Instagram needs at least one photo or video.");
  });

  it("accepts the 4:5 and 1.91:1 aspect ratio bounds", () => {
    expect(validateForProvider("INSTAGRAM", { caption: "", media: [image(1080, 1350)] }).errors).toEqual([]);
    expect(validateForProvider("INSTAGRAM", { caption: "", media: [image(1080, 566)] }).errors).toEqual([]);
    expect(validateForProvider("INSTAGRAM", { caption: "", media: [image(1080, 1080)] }).errors).toEqual([]);
  });

  it("rejects photos that are too tall or too wide", () => {
    const tall = validateForProvider("INSTAGRAM", { caption: "", media: [image(1080, 1920)] }).errors;
    expect(tall).toHaveLength(1);
    expect(tall[0]).toMatch(/Photo 1 is too tall/);
    const wide = validateForProvider("INSTAGRAM", { caption: "", media: [image(1080, 1080), image(2000, 1000)] }).errors;
    expect(wide).toHaveLength(1);
    expect(wide[0]).toMatch(/Photo 2 is too wide/);
  });

  it("enforces caption, hashtag and mention limits", () => {
    const media = [image(1080, 1080)];
    const longCaption = "a".repeat(CAPTION_LIMITS.INSTAGRAM + 1);
    expect(validateForProvider("INSTAGRAM", { caption: longCaption, media }).errors[0]).toMatch(/2,201 characters/);
    expect(validateForProvider("INSTAGRAM", { caption: "a".repeat(CAPTION_LIMITS.INSTAGRAM), media }).errors).toEqual([]);

    const tags = (n: number) => Array.from({ length: n }, (_, i) => `#tag${i}`).join(" ");
    expect(validateForProvider("INSTAGRAM", { caption: tags(30), media }).errors).toEqual([]);
    expect(validateForProvider("INSTAGRAM", { caption: tags(31), media }).errors[0]).toMatch(/30 hashtags/);

    const mentions = (n: number) => Array.from({ length: n }, (_, i) => `@user${i}`).join(" ");
    expect(validateForProvider("INSTAGRAM", { caption: mentions(20), media }).errors).toEqual([]);
    expect(validateForProvider("INSTAGRAM", { caption: mentions(21), media }).errors[0]).toMatch(/20 @mentions/);
  });

  it("allows mixed carousels up to the maximum", () => {
    const ten = [...Array.from({ length: MAX_MEDIA - 1 }, () => image(1080, 1080)), video];
    expect(validateForProvider("INSTAGRAM", { caption: "", media: ten }).errors).toEqual([]);
    const eleven = [...ten, image(1080, 1080)];
    expect(validateForProvider("INSTAGRAM", { caption: "", media: eleven }).errors).toContain(
      "Instagram carousels can include up to 10 photos or videos.",
    );
  });

  it("rejects non-JPEG photos and warns about Reels", () => {
    expect(
      validateForProvider("INSTAGRAM", { caption: "", media: [image(1080, 1080, { mimeType: "image/png" })] }).errors,
    ).toEqual(["Photo 1: Instagram only accepts JPEG photos."]);
    const reel = validateForProvider("INSTAGRAM", { caption: "", media: [video] });
    expect(reel.errors).toEqual([]);
    expect(reel.warnings).toEqual(["This video will be published as a Reel."]);
  });
});

describe("validateForProvider — Facebook", () => {
  it("accepts text-only posts and rejects empty ones", () => {
    expect(validateForProvider("FACEBOOK", { caption: "Hello Page", media: [] }).errors).toEqual([]);
    expect(validateForProvider("FACEBOOK", { caption: "   ", media: [] }).errors).toHaveLength(1);
  });

  it("rejects mixing photos and videos, and more than one video", () => {
    expect(validateForProvider("FACEBOOK", { caption: "", media: [image(100, 100), video] }).errors[0]).toMatch(
      /can't mix photos and videos/,
    );
    expect(validateForProvider("FACEBOOK", { caption: "", media: [video, video] }).errors[0]).toMatch(/one video/);
    expect(validateForProvider("FACEBOOK", { caption: "", media: [video] }).errors).toEqual([]);
  });

  it("allows tall photos and long captions Instagram would reject", () => {
    const caption = "a".repeat(5000);
    expect(validateForProvider("FACEBOOK", { caption, media: [image(1080, 1920)] }).errors).toEqual([]);
    expect(
      validateForProvider("FACEBOOK", { caption: "a".repeat(CAPTION_LIMITS.FACEBOOK + 1), media: [] }).errors[0],
    ).toMatch(/Facebook allows 63,206/);
  });
});

describe("Facebook Graph helpers", () => {
  it("keeps only Pages the user can create content on", () => {
    const pages = parsePublishablePages(graph.meAccounts.data);
    expect(pages.map((p) => p.id)).toEqual(["101234567890123", "101234567890789"]);
    expect(pages[0]).toMatchObject({
      name: "Bodang Diet Studio",
      accessToken: "EAAPageTokenA",
      pictureUrl: "https://scontent.xx.fbcdn.net/v/page-a.jpg",
    });
    expect(pages[1].pictureUrl).toBeNull();
  });

  it("builds indexed attached_media params from unpublished photo ids", () => {
    const ids = graph.unpublishedPhotos.map((p) => p.id);
    expect(buildFeedParams("New menu!", ids)).toEqual({
      message: "New menu!",
      "attached_media[0]": '{"media_fbid":"1200000000000001"}',
      "attached_media[1]": '{"media_fbid":"1200000000000002"}',
      "attached_media[2]": '{"media_fbid":"1200000000000003"}',
    });
    expect(buildFeedParams("", ids.slice(0, 1))).toEqual({ "attached_media[0]": '{"media_fbid":"1200000000000001"}' });
  });
});

describe("Instagram container params", () => {
  const img = { kind: "IMAGE" as const, url: "https://linkee.test/media/ab/1.jpg" };
  const vid = { kind: "VIDEO" as const, url: "https://linkee.test/media/cd/2.mp4" };

  it("builds a feed photo or a Reel for single items", () => {
    expect(singleContainerParams("Hi", img)).toEqual({ caption: "Hi", image_url: img.url });
    expect(singleContainerParams("", vid)).toEqual({ media_type: "REELS", video_url: vid.url, share_to_feed: "true" });
  });

  it("builds carousel children and the parent container", () => {
    expect(carouselChildParams(img)).toEqual({ image_url: img.url, is_carousel_item: "true" });
    expect(carouselChildParams(vid)).toEqual({ media_type: "VIDEO", video_url: vid.url, is_carousel_item: "true" });
    const childIds = graph.igCarouselChildren.map((c) => c.id);
    expect(carouselParentParams("Two things", childIds)).toEqual({
      media_type: "CAROUSEL",
      children: "17889455560051401,17889455560051402",
      caption: "Two things",
    });
  });
});
