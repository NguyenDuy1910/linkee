import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, signState, verifyState } from "@/lib/crypto";

describe("token encryption", () => {
  it("round-trips and never stores plaintext", () => {
    const enc = encryptSecret("IGQV-secret-token");
    expect(enc).not.toContain("IGQV");
    expect(decryptSecret(enc)).toBe("IGQV-secret-token");
  });

  it("rejects tampered ciphertext", () => {
    const parts = encryptSecret("abc").split(".");
    parts[3] = Buffer.from("zzz").toString("base64url");
    expect(() => decryptSecret(parts.join("."))).toThrow();
  });
});

describe("OAuth state", () => {
  it("binds to provider and user", () => {
    const state = signState({ userId: "u1", provider: "instagram" });
    expect(verifyState(state, "instagram")).toEqual({ userId: "u1" });
    expect(verifyState(state, "facebook")).toBeNull();
  });

  it("rejects forged signatures and expired state", () => {
    const state = signState({ userId: "u1", provider: "instagram" });
    const [body] = state.split(".");
    expect(verifyState(`${body}.forged`, "instagram")).toBeNull();
    expect(verifyState(signState({ userId: "u1", provider: "instagram" }, -1), "instagram")).toBeNull();
  });
});
