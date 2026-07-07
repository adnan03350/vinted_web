import { describe, expect, it } from "vitest";
import { assessChatContent } from "@/lib/ai/moderation";

describe("chat moderation", () => {
  it("blocks phone numbers", () => {
    const result = assessChatContent("Call me at +1 555 123 4567");
    expect(result.isBlocked).toBe(true);
    expect(result.reasons).toContain("phone number");
  });

  it("blocks external payment attempts", () => {
    const result = assessChatContent("Pay me directly on PayPal");
    expect(result.isBlocked).toBe(true);
    expect(result.reasons).toContain("external payment attempt");
  });

  it("allows safe marketplace messages", () => {
    const result = assessChatContent("Is this still available for pickup tomorrow?");
    expect(result.isBlocked).toBe(false);
  });
});
