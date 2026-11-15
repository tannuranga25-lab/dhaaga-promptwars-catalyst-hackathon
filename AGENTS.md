PRODUCT: Dhaaga is an elderly care and medication management web app for a hackathon challenge (Elderly Care & Medication Management Platform). One elderly person has a shared Care Circle. The elder, caretakers and family access it with a circle code + passcode (no accounts). Authorized members manage medication schedules, track adherence and monitor doctor appointments. The system proactively emails reminders for upcoming doses, missed doses and appointments. It must go beyond a reminder app: closed-loop dose tracking with one-tap email actions and escalation, elder-controlled permissions and approvals, and AI-assisted setup (Snap-to-Schedule using Gemini). The elder always stays at the centre of decisions.

STACK (do not change): Next.js 15 App Router + TypeScript (strict), Tailwind CSS, Firestore via @google-cloud/firestore (Application Default Credentials, no key files), @google/genai for Gemini (model name from env GEMINI_MODEL; check the official Gemini API docs for the current recommended fast multimodal model and use it as the default), zod, jose, nodemailer, Vitest, ESLint with jsx-a11y. Deploy target: Google Cloud Run (Docker, Next.js standalone output). Scheduler: Google Cloud Scheduler calling a protected endpoint every minute.

RULES:
1. Security: validate every input with zod; scrypt for passcode hashing; httpOnly + Secure + SameSite=Lax signed session cookie; rate-limit and lock out passcode guessing; timing-safe secret comparisons; security headers (CSP, X-Content-Type-Options, Referrer-Policy, frame deny); no secrets in git, provide .env.example; never log health data or passcodes; every API route checks permission through one central function.
2. Medical safety: never generate or suggest doses, interactions or medical advice. AI output is a DRAFT that a human must review and confirm.
3. Accessibility (scored): semantic HTML, labelled inputs, visible focus, WCAG AA contrast, base font 18px or larger, touch targets 48px or larger (64px in Elder Mode), aria-live for status messages, skip link, respect prefers-reduced-motion, works at 200% zoom, mobile-first.
4. Testing (scored): pure logic lives in src/lib with Vitest unit tests; every milestone adds tests for what it builds.
5. Code quality: small modules, no dead code, no any, clear names, short comments only where logic is non-obvious. Layout: src/lib (db, auth, permissions, crypto, time, schedule, dose, mail, gemini, audit) and src/app (pages + api).
6. Efficiency: no N+1 Firestore reads, bounded queries, batched writes, idempotent cron work.
7. Time: store UTC instants; schedule times are local HH:mm in the circle's timezone (default Asia/Kolkata).
8. Workflow: Planning Mode, short plans. After each milestone run lint, typecheck, tests and build, fix failures, then git commit with a clear message. Do not add features outside the current milestone. End each reply with at most 8 lines: what is done, what I should check in the browser, what is next.
9. Product name is Dhaaga. Tone: warm and simple; Elder Mode uses English labels with short Hindi helper text.

MILESTONE 1: Foundation, passcode access, first Cloud Run deploy.

1. Scaffold the Next.js app per AGENTS.md with a Dockerfile (multi-stage, standalone output, non-root user), .dockerignore, .env.example (GCP_PROJECT, SESSION_SECRET, CRON_SECRET, GEMINI_API_KEY, GEMINI_MODEL, GMAIL_USER, GMAIL_APP_PASSWORD, APP_BASE_URL), a README stub, and GET /api/health.
2. Firestore data model as zod schemas in src/lib/schemas.ts:
   circles/{circleCode}: elderName, timezone, graceMinutes (default 30), autonomy ('direct' | 'approval', default 'direct'), passcodeHashes {elder, caretaker, family}, passcodeVersion, contacts [{name, email, role: 'elder'|'caretaker'|'family', notifyMissed}], createdAt.
   Subcollections: medications, doses, appointments, pendingChanges, audit, authAttempts.
3. Circle code: 8 characters from an unambiguous alphabet, shown as XXXX-XXXX. Elder PIN: 6 digits chosen during setup. Caretaker and family passcodes: auto-generated 8 characters, shown ONCE after setup, regenerable later by the elder.
4. Pages: / (landing with: Create a circle, Join with code + passcode, Try the demo), /setup (3-step wizard: elder details + PIN, contacts, show passcodes once with copy/print), /login, /app (role-aware home placeholder showing the role), logout.
5. Auth: login with circle code + passcode. The server matches the passcode against the three hashes and puts the role and passcodeVersion in a signed session cookie (jose). Lock out after 5 failures per circle+IP for 15 minutes (stored in authAttempts).
6. src/lib/permissions.ts: a central can(role, action). Actions: view, logDose, editMedications, editAppointments, manageCircle, approveChanges, viewAudit. Matrix: elder = all; caretaker = view, logDose, editMedications, editAppointments, viewAudit; family = view only.
7. Vitest tests: passcode hash/verify, permission matrix, session sign/verify, lockout logic.

Then deploy now, so the live URL exists from the start. Give me the exact gcloud commands (gcloud is logged in) to enable the needed APIs, create the Firestore database if missing, put SESSION_SECRET, CRON_SECRET, GEMINI_API_KEY and GMAIL_APP_PASSWORD in Secret Manager, and run: gcloud run deploy dhaaga --source . --region asia-south1 --allow-unauthenticated with the env vars and secrets. Run them if you can, otherwise print them for me. Confirm /api/health works on the live URL.
