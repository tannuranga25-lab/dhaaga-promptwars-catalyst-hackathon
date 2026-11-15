# Dhaaga requirements

Source of truth supplied by the project owner on 2026-11-15.

## A. Challenge brief
- A1 (P0) Shared ecosystem: elder, caretakers and family access one elder's healthcare profile through secure passcode-based access (circle code + role passcodes, scrypt hashes, signed httpOnly session, lockout after 5 failures).
- A2 (P0) Authorized members can view, add, edit and manage medication schedules (name, strength, form, instructions, times, days of week, start/end date, critical flag, pause).
- A3 (P0) Track adherence from real dose events (taken / skipped / missed), shown as 7-day adherence and on-time percentage.
- A4 (P0) Monitor upcoming doctor appointments (add, edit, delete, upcoming list, next appointment).
- A5 (P0) Proactive email for upcoming doses (15 minutes before).
- A6 (P0) Proactive email for missed doses.
- A7 (P0) Proactive email for appointments (24 hours and 2 hours before).
- A8 (P0) Goes beyond a basic reminder app (sections B, C, D).
- A9 (P0) The elder stays at the centre of healthcare decisions (section C).

## B. Closed-loop reminders
- B1 (P0) Dose state machine: scheduled -> due -> taken | skipped | missed; a missed dose can later become taken_late; illegal transitions rejected; deterministic dose ids so generation is idempotent.
- B2 (P0) One-tap email links without login: signed token (HMAC-SHA256 over doseId + action + expiry, 24h); GET shows a confirm page, POST applies (so email scanners cannot log doses); tampered or expired tokens rejected.
- B3 (P0) Email actions: Taken, Skip, Remind me in 15 minutes (snoozeUntil, one extra reminder).
- B4 (P0) Escalation: missed dose emails elder + caretakers with notifyMissed after graceMinutes (critical medicines use half the grace, minimum 10 minutes); critical medicines still unconfirmed at 2x grace also email family. Non-critical misses never email family individually.
- B5 (P0) POST /api/cron/tick protected by x-cron-secret (timing-safe compare, 401 otherwise); bounded batches; each notification claimed in a Firestore transaction so overlapping ticks never double-send.
- B6 (P0) Failed sends are recorded and retried on later ticks, max 3 attempts. DRY_RUN mode when SMTP env is missing. No emails for the demo circle.
- B7 (P0) Vercel Cron or Render Cron calls the tick endpoint every minute, or the README documents the cron-job.org fallback.
- B8 (P0) UI and email copy for a missed dose says 'Not confirmed yet', never an accusation.
- B9 (P0) Emails are HTML + plain text, 18px+ text, high contrast, show medicine, strength, time, instructions.

## C. Elder in control
- C1 (P0) Elder PIN (6 digits) owns the circle; only the elder can regenerate passcodes, change autonomy, manage contacts.
- C2 (P0) Role matrix enforced by one central can(role, action): elder = all; caretaker = view, logDose, editMedications, editAppointments, viewAudit; family = view only. Every API route uses it.
- C3 (P0) Approval mode: when on, caretaker medicine add/edit/delete creates a pendingChange; elder approves or rejects in Elder Mode; approval applies atomically and audit-logs requester and approver. Appointments and dose logging are never blocked.
- C4 (P0) Regenerating caretaker/family passcodes invalidates old passcodes and old sessions immediately (passcodeVersion).
- C5 (P0) Audit log of every write (role, action, source: app / email link / photo) and an /app/activity page, newest first, paginated.
- C6 (P0) Elder Mode (/app/elder): one card at a time, very large type, three big buttons (Taken / Le li, Not yet / Abhi nahi, I need help / Madad chahiye), 64px+ targets, calm 'All done for now' screen, next appointment, pending-approvals card.
- C7 (P0) 'I need help' emails all caretakers immediately.
- C8 (P0) Caretaker/family dashboard: today's timeline by part of day, status chips that do not rely on colour alone, adherence card, medicines list, quick log. Family view is read-only.

## D. AI (Gemini)
- D1 (P0) Snap-to-Schedule: upload a prescription photo (JPEG/PNG/WebP, max 4MB, resized client-side to 1600px); Gemini returns structured JSON via a response schema (name, strength, form, frequencyText, times, instructions, durationDays, confidence, doctorName, warnings).
- D2 (P0) Output validated with zod, one retry on invalid output, friendly fallback to manual entry; image is never stored or logged; wrong mime type or oversize rejected.
- D3 (P0) Draft review screen: every field editable, low/medium confidence rows labelled in text, banner 'This is a draft read by AI. Please check each medicine against the prescription.' Nothing is saved before Confirm; Confirm uses the normal create path (approval mode + audit with source photo).
- D4 (P0) AI never suggests doses, interactions or medical advice.
- D5 (P1) Weekly family digest: code computes the numbers (src/lib/insights.ts), Gemini only writes the summary, output validated so every number appears in the input.

## E. Quality
- E1 (P0) Security: all inputs zod-validated; scrypt passcode hashing; httpOnly + Secure + SameSite=Lax cookie; CSRF Origin check on state-changing routes; CSP, X-Content-Type-Options, Referrer-Policy and frame-deny headers; no secrets in git or logs; no health data or passcodes in logs; .env.example present; npm audit has no high-severity issues.
- E2 (P0) Testing: Vitest unit tests for schedule generation, state machine, adherence math, permissions, tokens, notification windows, idempotent claim, escalation, approval flow, passcode regeneration, Gemini output validation (mocked client); API tests for 401/403/400 paths; coverage summary for src/lib printed.
- E3 (P0) Accessibility: semantic HTML, labelled inputs, visible focus, WCAG AA, 18px+ base font, 48px+ targets, aria-live status regions, skip link, reduced motion, 200% zoom, keyboard-only, mobile-first; eslint jsx-a11y clean; automated axe checks for landing, login, dashboard and Elder Mode.
- E4 (P0) Efficiency: no N+1 or unbounded Firestore reads, batched writes, composite indexes in firestore.indexes.json, small Docker image (multi-stage, standalone, non-root).
- E5 (P0) Code quality: TypeScript strict, no any, no dead code or TODOs, small modules, lint + typecheck + test + build all pass.
- E6 (P0) Integrations: Firestore and Gemini API; README says where used. Hosting is Vercel or Render; cron is Vercel Cron, Render Cron, or documented cron-job.org.

## F. Submission
- F1 (P0) Public GitHub repo with clean history.
- F2 (P0) Live Vercel or Render URL; GET /api/health returns status ok; landing, setup, login, app load.
- F3 (P0) README for judges: problem, who it helps, differentiator, live URL, role features, Mermaid closed-loop diagram and escalation rules, integrations table, architecture, security and accessibility, medical-safety stance, tests, local setup, env vars, deploy commands, limitations (1-minute scheduler), future work.
- F4 (P0) Try the demo signs into DEMO-0000 as caretaker with seeded data (4 medicines, a week of dose history, 2 appointments, 1 pending change); demo emails disabled; demo cannot change passcodes or contacts; reset script.
- F5 (P0) MIT LICENSE, .gitignore, scripts dev/build/test/lint/typecheck/seed.
- F6 (P0) A 120-word project description for submission.
