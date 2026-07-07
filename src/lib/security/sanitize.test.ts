import { describe, expect, it } from "vitest";
import { escapeHtml, sanitizeText, stripControlChars } from "@/lib/security/sanitize";

describe("sanitize", () => {
  it("escapes HTML characters", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
  });

  it("sanitizes and truncates text", () => {
    expect(sanitizeText("  hello world  ", 5)).toBe("hello");
  });

  it("removes control characters", () => {
    expect(stripControlChars("hello\u0000world")).toBe("helloworld");
  });
});
