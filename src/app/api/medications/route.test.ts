import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/require-session", () => ({ getApiSession: vi.fn() }));
vi.mock("@/lib/db", () => ({ getFirestore: vi.fn() }));

import { getApiSession } from "@/lib/require-session";
import { GET, POST } from "./route";

const authorized = vi.mocked(getApiSession);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("medication API authorization and validation", () => {
  it("returns 401 for a missing session and 403 for a role without permission", async () => {
    authorized.mockResolvedValueOnce({ session: null, status: 401 });
    const unauthenticated = await GET();
    expect(unauthenticated.status).toBe(401);

    authorized.mockResolvedValueOnce({ session: null, status: 403 });
    const forbidden = await GET();
    expect(forbidden.status).toBe(403);
  });

  it("returns 400 for invalid medicine data after origin validation", async () => {
    const session: NonNullable<Awaited<ReturnType<typeof getApiSession>>["session"]> = {
      circleCode: "ABCD2345",
      role: "elder",
      passcodeVersion: 1,
      circle: {
        elderName: "Asha",
        timezone: "Asia/Kolkata",
        graceMinutes: 30,
        autonomy: "direct",
        passcodeHashes: { elder: "e", caretaker: "c", family: "f" },
        passcodeVersion: 1,
        contacts: [],
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    };
    authorized.mockResolvedValueOnce({
      session,
      status: 200,
    });
    const response = await POST(new Request("https://dhaaga.example/api/medications", {
      method: "POST",
      headers: { origin: "https://dhaaga.example", "content-type": "application/json" },
      body: JSON.stringify({ name: "" }),
    }));
    expect(response.status).toBe(400);
  });
});
