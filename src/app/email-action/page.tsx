import { z } from "zod";
import { verifyEmailActionToken } from "@/lib/email-action-token";
import EmailActionForm from "./email-action-form";

const tokenSchema = z.string().min(1).max(2048);

export const metadata = { robots: { index: false, follow: false } };

export default async function EmailActionPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token: rawToken } = await searchParams;
  const parsedToken = tokenSchema.safeParse(rawToken);
  let action: ReturnType<typeof verifyEmailActionToken> | null = null;
  if (parsedToken.success) {
    try {
      action = verifyEmailActionToken(parsedToken.data);
    } catch {
      action = null;
    }
  }
  return (
    <main id="main-content" className="page-shell">
      <section className="card narrow">
        <h1>Confirm dose update</h1>
        {!action || !parsedToken.success ? (
          <p role="status">This email action link is invalid or expired. Please sign in to update the dose.</p>
        ) : (
          <>
            <p>Please confirm before we update this dose. No change has been made yet.</p>
            <EmailActionForm token={parsedToken.data} action={action.action} />
          </>
        )}
      </section>
    </main>
  );
}
