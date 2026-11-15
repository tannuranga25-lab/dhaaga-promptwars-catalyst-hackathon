# Dhaaga

Dhaaga is a shared care-circle app for medication schedules, dose tracking, and appointments. The elder remains at the centre of decisions.

## Local development

1. Install Node.js 22 or later.
2. Copy `.env.example` to `.env.local` and set `GCP_PROJECT` and a random `SESSION_SECRET` (at least 32 characters).
3. Configure Google Cloud Application Default Credentials for Firestore access.
4. Run `npm install`, `npm run dev`, and `npm test`.

The production image uses Next.js standalone output and runs as a non-root user.
