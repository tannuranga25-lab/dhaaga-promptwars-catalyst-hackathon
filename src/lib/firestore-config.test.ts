import { describe, expect, it } from "vitest";
import { firestoreOptions } from "./firestore-config";

describe("Firestore environment configuration", () => {
  it("uses ADC by default or validates in-memory service account settings", () => {
    expect(firestoreOptions({ FIRESTORE_PROJECT_ID: "project-one" }))
      .toEqual({ projectId: "project-one" });
    expect(firestoreOptions({
      FIRESTORE_PROJECT_ID: "",
      FIRESTORE_SERVICE_ACCOUNT_JSON: JSON.stringify({
        project_id: "service-project",
        client_email: "service@example.iam.gserviceaccount.com",
        private_key: "test-private-key",
      }),
    })).toEqual({
      projectId: "service-project",
      credentials: {
        client_email: "service@example.iam.gserviceaccount.com",
        private_key: "test-private-key",
      },
    });
  });

  it("rejects malformed or incomplete service-account JSON without echoing its contents", () => {
    expect(() => firestoreOptions({ FIRESTORE_SERVICE_ACCOUNT_JSON: "not-json" }))
      .toThrow("FIRESTORE_SERVICE_ACCOUNT_JSON must contain valid JSON.");
    expect(() => firestoreOptions({ FIRESTORE_SERVICE_ACCOUNT_JSON: "{}" }))
      .toThrow("FIRESTORE_SERVICE_ACCOUNT_JSON is missing required service-account fields.");
  });
});
