import { z } from "zod";

type FirestoreEnvironment = {
  FIRESTORE_PROJECT_ID?: string;
  FIRESTORE_SERVICE_ACCOUNT_JSON?: string;
};

const serviceAccountSchema = z.object({
  project_id: z.string().min(1),
  client_email: z.email(),
  private_key: z.string().min(1),
});

export function firestoreOptions(
  environment: FirestoreEnvironment = {
    FIRESTORE_PROJECT_ID: process.env.FIRESTORE_PROJECT_ID,
    FIRESTORE_SERVICE_ACCOUNT_JSON: process.env.FIRESTORE_SERVICE_ACCOUNT_JSON,
  },
) {
  const rawCredentials = environment.FIRESTORE_SERVICE_ACCOUNT_JSON;
  if (!rawCredentials) {
    return { projectId: environment.FIRESTORE_PROJECT_ID || undefined };
  }

  let input: unknown;
  try {
    input = JSON.parse(rawCredentials);
  } catch {
    throw new Error("FIRESTORE_SERVICE_ACCOUNT_JSON must contain valid JSON.");
  }
  const parsed = serviceAccountSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("FIRESTORE_SERVICE_ACCOUNT_JSON is missing required service-account fields.");
  }
  return {
    projectId: environment.FIRESTORE_PROJECT_ID || parsed.data.project_id,
    credentials: {
      client_email: parsed.data.client_email,
      private_key: parsed.data.private_key,
    },
  };
}
