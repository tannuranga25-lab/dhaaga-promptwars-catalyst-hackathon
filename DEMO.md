# Dhaaga demo guide

The demo uses fictional data in the `DEMO-0000` Firestore circle. Visitors do not need a Google Cloud account, Firebase key, Gemini key, or Gmail credentials. Keep all service credentials in the app host's encrypted environment settings; never send them to demo visitors or commit them to GitHub.

## Set up the demo as the owner

1. Create a Firestore database in your Google Cloud project.
2. Set `FIRESTORE_PROJECT_ID` and `SESSION_SECRET` in `.env.local` for local work, or in your Vercel/Render environment settings for the deployed app. Configure Firestore Application Default Credentials locally, or set `FIRESTORE_SERVICE_ACCOUNT_JSON` as a private environment secret on the host.
3. Install dependencies with `npm ci`.
4. Seed the fake demo circle once with `npm run seed`. Run this only against the project intended for the demo: it resets the `DEMO-0000` circle and its subcollections before adding the sample data.
5. Start locally with `npm run dev`, then open `http://localhost:3000/demo`. On Vercel or Render, open your deployed app's `/demo` page.

Do not run the seed script automatically as part of a production build or deploy. To refresh the sample data later, run `npm run reset-demo` or `npm run seed` from a trusted environment connected to the demo Firestore project.

## How visitors use the demo

1. Open the app and choose **Try the demo**, or go directly to `/demo`.
2. Press **Try the demo** on that page. Dhaaga signs the visitor into the sample circle as a caretaker; no passcode or account is required.
3. Explore the fictional medicines, dose history, appointments, and elder-approval example in the app.

The demo must be seeded and the app must be connected to Firestore before visitors can enter it. If it is not seeded, the app displays that the demo is not ready. Demo data is fictional; do not enter real health information. Demo email delivery is disabled.

## Secret-file safety

Local `.env` files and common Firebase/Google service-account JSON key filenames are ignored by Git. Check `git status` before pushing. If a credential was ever committed, deleting the file is not enough: revoke or rotate that credential in Google Cloud.