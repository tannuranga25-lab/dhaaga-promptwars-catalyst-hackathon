import { describe, expect, it } from "vitest";
import { createCircleSchema, loginSchema } from "./schemas";

describe("request schemas", () => {
  it("accepts a six-digit elder PIN and defaults timezone", () => {
    const circle = createCircleSchema.parse({
      elderName: "Asha",
      elderPin: "123456",
      contacts: [],
    });
    expect(circle.timezone).toBe("Asia/Kolkata");
  });

  it("rejects malformed PINs and circle codes", () => {
    expect(() => createCircleSchema.parse({
      elderName: "Asha",
      elderPin: "12345",
      contacts: [],
    })).toThrow();
    expect(() => loginSchema.parse({ circleCode: "ABCD-0000", passcode: "123456" })).toThrow();
    expect(loginSchema.parse({ circleCode: "DEMO-0000", passcode: "DEMOCARE" }).circleCode).toBe("DEMO-0000");
  });

  it("rejects invalid time zones", () => {
    expect(() => createCircleSchema.parse({
      elderName: "Asha",
      elderPin: "123456",
      timezone: "Not/A_Timezone",
      contacts: [],
    })).toThrow();
  });
});
