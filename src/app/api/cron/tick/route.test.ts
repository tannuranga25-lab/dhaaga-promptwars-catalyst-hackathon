import { afterEach, describe, expect, it } from "vitest";
import { GET, POST } from "./route";

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("cron tick authentication", () => {
  it("rejects missing and incorrect cron secrets before accessing Firestore", async () => {
    process.env.CRON_SECRET = "correct-secret";
    const missing = await POST(new Request("https://dhaaga.example/api/cron/tick", { method: "POST" }));
    const incorrect = await POST(new Request("https://dhaaga.example/api/cron/tick", {
      method: "POST",
      headers: { "x-cron-secret": "wrong-secret" },
    }));
    const unauthenticatedGet = await GET(new Request("https://dhaaga.example/api/cron/tick"));
    expect(missing.status).toBe(401);
    expect(incorrect.status).toBe(401);
    expect(unauthenticatedGet.status).toBe(401);
  });
});
