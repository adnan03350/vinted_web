import { describe, expect, it } from "vitest";
import { validateImageFile } from "@/lib/security/upload";

describe("secure uploads", () => {
  it("rejects unsupported file types", () => {
    const file = new File(["test"], "bad.exe", { type: "application/octet-stream" });
    expect(validateImageFile(file).ok).toBe(false);
  });

  it("accepts supported image types", () => {
    const file = new File(["test"], "photo.jpg", { type: "image/jpeg" });
    expect(validateImageFile(file).ok).toBe(true);
  });
});
