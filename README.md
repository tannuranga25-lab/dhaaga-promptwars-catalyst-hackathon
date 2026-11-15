🧵 Dhaaga: One thread, the whole family

Show Image Next.js Firestore Gemini Hackathon

Dhaaga is a shared Care Circle for an older adult, their family and their caretakers. It turns medicine reminders into a closed loop: every dose is tracked, reminder emails can be confirmed in one tap, unconfirmed doses reach the right people, and the elder decides who can change what.

🔗 Quick Links
🌐 Live Demo: https://dhaaga-promptwars-catalyst-hackathon.onrender.com/
🎬 Try it instantly: open the live site and press Try the demo (no passcode, fictional data only)
💻 Repository: https://github.com/tannuranga25-lab/dhaaga-promptwars-catalyst-hackathon
📊 Pitch Deck: [ADD_SLIDES_LINK]
📖 Demo guide: DEMO.md
🎯 The Problem

Managing medicines for an older adult is a team effort that usually runs on pill boxes, paper prescriptions and WhatsApp messages.

Doses go unconfirmed. The WHO's widely cited 2003 review found that only about half of patients with chronic diseases in developed countries take long-term treatment as prescribed. A plain reminder fixes forgetting, but not the other causes: complex schedules, poor eyesight, scattered information.
Families find out late. A relative in another city learns about a missed dose a day later, or receives so many alerts that they stop reading them.
The elder loses control. Tools built for caregivers often let others take over. The elder should stay at the centre of their own healthcare decisions.
The need is growing. UNFPA projects India's 60+ population to rise from 10.5% (2022) to 20.8% (2050).
💡 Our Solution

Dhaaga closes the loop between a scheduled dose and an acknowledged result. Reminders tell people when to act; a care circle should tell everyone what actually happened.

Closed-loop dose tracking: every scheduled dose becomes a tracked event (scheduled → due → taken / skipped / missed). Adherence comes from what happened, not what was planned.
One-tap email actions: reminder emails carry Taken, Skip and Remind me in 15 minutes links. Opening a link only shows a confirmation page, so an email scanner cannot record a dose by accident. Links expire after 24 hours.
Smart escalation: an unconfirmed dose emails the elder and opted-in caretakers. Critical medicines escalate sooner and can later reach family. Routine misses never flood family inboxes.
Elder in control: the elder creates the circle with a six-digit PIN, chooses trusted contacts, rotates passcodes, and can require approval before caretaker medicine changes take effect.
Snap-to-Schedule (Gemini): photograph a prescription and get an editable draft schedule. Nothing is saved until a person checks every field and presses Confirm.
Elder Mode: one dose at a time with very large buttons and bilingual labels (Taken / Le li, Not yet / Abhi nahi, I need help / Madad chahiye).
No member accounts: one circle code plus role passcodes.
Project description (120 words)

Dhaaga is a care-circle platform for older adults, family members, and caretakers. It brings medication schedules, dose confirmations, and doctor appointments into an accessible space without requiring member accounts. The elder creates the circle with a PIN and controls trusted contacts, passcode rotation, and whether caretaker medicine changes need approval. Caretakers can manage schedules and appointments, while family members have a read-only view. Dose reminders support one-tap taken, skipped, or snoozed actions, then escalate unconfirmed events according to the elder's circle settings and medicine criticality. Prescription photos can produce AI drafts, but a person must review it before saving. Dhaaga never provides medical advice or invents treatment instructions; it helps care teams stay coordinated while keeping decisions with the elder.

✨ Features by Role
Elder	Caretaker	Family
View and manage all circle data; record doses; choose approval mode; manage contacts and passcodes; review changes; use Elder Mode	View the circle; record doses; manage medicines and appointments; see activity; request elder approval when enabled	Read-only circle view, timeline, appointments and adherence

Every action is permission-checked on the server, not only hidden in the interface.

🔄 Closed-Loop Dose Flow
Taken / Skip via link or app
Remind me in 15 min
No update after graceperiod
Yes
No
Medicine schedule
Scheduler calls/api/cron/tick every minute
Dose events created, onefixed ID per dose
Email reminder about 15min before
Dose confirmed?
Recorded in adherence andactivity log
Email elder + opted-incaretakers
Critical medicine stillunconfirmed?
Email opted-in family
Anyone with access can stillmark it taken late

Escalation rules

Non-critical missed doses are never individually emailed to family.
Critical medicines use half the circle's grace period, with a 10-minute minimum.
Opted-in family is emailed only if a critical dose is still unconfirmed after twice that shorter grace period.
Appointment reminders go out 24 hours and 2 hours before.
I need help in Elder Mode emails the caretakers right away.
Every email action opens a confirmation page; a GET request from an email scanner does not update a dose.
A dose marked taken after it was missed is stored as taken_late and does not count as on time.
The interface says "Not confirmed yet", never an accusation.
🏗️ Architecture and Integrations

Next.js 15 (App Router) serves the mobile-first UI and API routes. Firestore stores a circle and its bounded subcollection records. Pure scheduling, dose transitions, permissions, token validation, notification policy and adherence calculations live under src/lib and are covered by Vitest.

HTTPS
POST /api/cron/tick +secret
prescription photo
reminder emails
Elder / Caretaker / Familybrowser
Next.js appCloud Run, Vercel orRender
Scheduler
Google Firestore
Gemini API
Gmail SMTP
Service	Use
Google Cloud Firestore	Circles, schedules, dose events, appointments, approvals, audit log, sign-in attempts, notification claims
Gemini API	Reads a prescription photo into a structured draft; a human reviews before saving
Gmail SMTP	Sends reminders when configured; without SMTP Dhaaga runs in DRY_RUN mode (nothing is sent)
Hosting	Any Node.js host. The multi-stage Dockerfile (standalone output, non-root user) also fits Google Cloud Run. vercel.json and render.yaml configure Vercel and Render, including the scheduled tick
🛠️ Tech Stack
Layer	Technologies Used
Frontend	Next.js 15 (App Router), TypeScript, Tailwind CSS
Backend	Next.js API routes, Node.js 22
Database	Google Cloud Firestore
AI	Gemini API with schema-validated structured output
Email	Gmail SMTP
Testing & Quality	Vitest, ESLint (jsx-a11y), strict TypeScript
DevOps & Hosting	Docker, Vercel / Render / Google Cloud Run
🔐 Security, Privacy & Medical Safety
Passcodes are scrypt-hashed. Sessions are signed and stored in Secure, HttpOnly, SameSite=Lax cookies. Changing passcodes invalidates older sessions.
State-changing browser requests require a same-origin Origin. The cron endpoint uses a timing-safe secret comparison.
Passcode guessing locks out after five failures for 15 minutes, per circle and IP.
API permissions are centralized. Firestore uses Application Default Credentials where supported. Vercel/Render can provide service-account JSON as an encrypted environment secret that is parsed in memory; no key file belongs in this repository.
Security headers: CSP, X-Content-Type-Options, Referrer-Policy and frame denial. Never put credentials in source control or logs.
Medical safety: Dhaaga is not a medical device and does not recommend doses, interactions, diagnoses or treatment. AI output is always an untrusted draft for human review.
♿ Accessibility
Semantic landmarks, a skip link, labelled controls and visible keyboard focus.
18px base text, 48px controls (64px in Elder Mode), reduced-motion preferences respected.
Status is shown with words, not colour alone.
📸 Screenshots & Demo
Care Circle Dashboard	Elder Mode
Dashboard	Elder Mode
Snap-to-Schedule Draft	Approval Requests
Snap-to-Schedule	Approvals

(Screenshots use only the fictional DEMO-0000 data.)

⚙️ Local Development
Use Node.js 22 or later and run npm ci.
Copy .env.example to .env.local. Set FIRESTORE_PROJECT_ID, and generate SESSION_SECRET, CRON_SECRET and EMAIL_ACTION_SECRET (at least 32 characters each, for example openssl rand -hex 32).
Configure Application Default Credentials with access to Firestore, or set FIRESTORE_SERVICE_ACCOUNT_JSON to a service-account JSON secret in your local environment.
Run npm run seed to reset and seed the non-production DEMO-0000 circle.
Run npm run dev. The landing page, setup, login and demo are at http://localhost:3000.

npm run seed and npm run reset-demo replace only the DEMO-0000 circle and its subcollections. Demo email delivery is disabled by the cron tick. See DEMO.md for the step-by-step demo setup.

Environment variables
Variable	Required value
FIRESTORE_PROJECT_ID	Google Cloud project ID containing the Firestore database
FIRESTORE_SERVICE_ACCOUNT_JSON	Optional service-account JSON for hosts without ADC; keep only in encrypted environment settings
SESSION_SECRET	Random secret, at least 32 characters
CRON_SECRET	Random secret, at least 32 characters
EMAIL_ACTION_SECRET	Random secret, at least 32 characters
GEMINI_API_KEY	Gemini API key (create it in Google AI Studio); photo reading is optional
GEMINI_MODEL	Model ID; default is gemini-2.5-flash
GMAIL_USER	Gmail address used as the SMTP sender
GMAIL_APP_PASSWORD	Gmail App Password (needs 2-Step Verification); leave unset for DRY_RUN
APP_BASE_URL	Public service URL, or http://localhost:3000 locally

Never commit real secrets.

✅ Tests and Checks
bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=high

The unit tests cover passcode hashing, session verification, permission rules, lockout, schedule generation, dose transitions, adherence calculations, notification windows and escalation, signed email actions, approval decision logic, and Gemini output validation with a mocked generator.

🚀 Deployment

Firestore needs a Google Cloud project and a service identity with access to it, whichever host you use. The scheduler must call /api/cron/tick once per minute.

Google Cloud Run
bash
gcloud run deploy dhaaga \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars "FIRESTORE_PROJECT_ID=<project-id>,GEMINI_MODEL=gemini-2.5-flash,GMAIL_USER=<gmail>,APP_BASE_URL=<service-url>" \
  --set-secrets "SESSION_SECRET=SESSION_SECRET:latest,CRON_SECRET=CRON_SECRET:latest,EMAIL_ACTION_SECRET=EMAIL_ACTION_SECRET:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,GMAIL_APP_PASSWORD=GMAIL_APP_PASSWORD:latest"

gcloud scheduler jobs create http dhaaga-tick \
  --schedule="* * * * *" \
  --uri="<service-url>/api/cron/tick" \
  --http-method=POST \
  --headers="x-cron-secret=<CRON_SECRET>" \
  --location=asia-south1

The Cloud Run service account needs Firestore access (roles/datastore.user) and Secret Manager access (roles/secretmanager.secretAccessor).

Vercel
Import the GitHub repository and select the Next.js preset.
Add the variables from .env.example in Project Settings. Generate the signing secrets locally and paste them into Vercel's encrypted form. Add Firestore credentials only if the runtime has no ADC.
Set APP_BASE_URL to the production URL, then deploy. vercel.json schedules /api/cron/tick every minute; the handler validates Vercel's Authorization: Bearer <CRON_SECRET> header. Cron frequency depends on the Vercel plan; if one-minute jobs are unavailable, use Render Cron or an external scheduler.
Verify /api/health.
Render
Create a Blueprint from this repository using render.yaml, or create a Node web service (npm ci && npm run build, npm start) plus a Cron Job (node scripts/cron-tick.mjs).
Add the .env.example values in Render's environment settings. Set the same CRON_SECRET and APP_BASE_URL on the web service and the cron job.
For Docker, build from the included multi-stage Dockerfile (standalone output, non-root runtime user).
Verify /api/health. An external scheduler can POST to /api/cron/tick with x-cron-secret set to the same secret.

A live deployment URL has not yet been provisioned from this development environment. Replace the Live Demo link above once the service is deployed and /api/health responds.

⚠️ Known Limitations
Hackathon MVP: not ready for real patient data.
The demo circle uses made-up data and never sends reminder emails.
A Firestore database and a service identity with access to it must exist in a Google Cloud project, even when the app is hosted elsewhere.
Reminder delivery depends on Gmail SMTP configuration; missing SMTP credentials intentionally keep the service in DRY_RUN mode. Messages may land in spam.
The scheduler runs at one-minute granularity, so a reminder can be up to about a minute late.
Photo reading depends on a valid Gemini API key and a clear image; the user must review every field.
📈 Impact & Future Roadmap
Current MVP: passcode-based care circles with three roles, medicines and dose tracking, Elder Mode, email reminders with one-tap actions and escalation, appointments, approval mode, activity log and Snap-to-Schedule.
Next: automated axe accessibility scans in CI, authenticated end-to-end flows against a disposable Firestore project, and end-to-end checks of production SMTP and scheduler behaviour.
Later: weekly family digest (numbers computed by code, summary written by AI), voice-first Elder Mode, refill reminders, visit briefs before doctor appointments, SMS / WhatsApp channels and a Hindi interface.

Built with ❤️ during the PromptWars × Catalyst hackathon (Google for Developers × Hack2skill).
