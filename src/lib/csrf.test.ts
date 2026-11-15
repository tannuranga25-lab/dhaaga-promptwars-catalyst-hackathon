import { describe, expect, it } from "vitest";
import { hasValidOrigin } from "./csrf";

describe("state-changing request origin validation", () => {
  it("accepts only same-origin requests with an Origin header", () => {
    const sameOrigin = new Request("https://dhaaga.example/api/medications", {
      headers: { origin: "https://dhaaga.example" },
    });
    const foreignOrigin = new Request("https://dhaaga.example/api/medications", {
      headers: { origin: "https://other.example" },
    });
    const noOrigin = new Request("https://dhaaga.example/api/medications");
    expect(hasValidOrigin(sameOrigin)).toBe(true);
    expect(hasValidOrigin(foreignOrigin)).toBe(false);
    expect(hasValidOrigin(noOrigin)).toBe(false);
  });

  it("uses the external origin when the app is behind a reverse proxy", () => {
    const proxiedRequest = new Request("http://internal/api/circles", {
      headers: {
        origin: "https://dhaaga.example",
        host: "internal",
        "x-forwarded-host": "dhaaga.example",
        "x-forwarded-proto": "https",
      },
    });

    expect(hasValidOrigin(proxiedRequest)).toBe(true);
  });

  it("rejects a foreign origin even when a proxy is present", () => {
    const foreignOrigin = new Request("http://internal/api/circles", {
      headers: {
        origin: "https://attacker.example",
        host: "internal",
        "x-forwarded-host": "dhaaga.example",
        "x-forwarded-proto": "https",
      },
    });

    expect(hasValidOrigin(foreignOrigin)).toBe(false);
  });
});
