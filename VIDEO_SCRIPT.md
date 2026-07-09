# 7-minute walkthrough

## 0:00–0:45 — Product and sign-in

Open the deployed login page. Explain that one app supports three focused roles and uses password login plus GitHub OAuth. Sign in as the seeded Admin.

## 0:45–2:00 — Admin workflow

Show user counts, create a disposable Student, suspend and restore that account, and show teacher groups. Mention that suspended accounts are rejected on every request, not only at login.

## 2:00–3:25 — Teacher workflow

Sign in as the Teacher. Create a class, enroll the seeded Student, publish a lesson and assignment, then show the grading queue. Explain that every class mutation checks teacher ownership.

## 3:25–4:30 — Student workflow

Sign in as the Student. Show enrolled classes and the published lesson, submit the assignment, and point out the grade/feedback state. Return briefly to the Teacher to grade it, then refresh the Student view.

## 4:30–5:35 — Architecture

Show `src/app`, `src/server`, and `src/shared`. Explain the single Fastify/Next process, Zod boundary validation, Kysely migrations, scrypt password hashes, HTTP-only JWT cookie, GitHub OAuth state in Redis, and versioned statistics cache.

## 5:35–6:30 — Testing and CI

Show the passing GitHub Actions run. Highlight unit coverage, real PostgreSQL/Redis integration tests, Playwright role flows, the production build, and Docker image build. Mention that Docker-backed CI is the authoritative environment because the development laptop does not have Docker.

## 6:30–7:00 — Deployment

Show the Render deployment and `/api/ready`. Explain that Render uses Neon and Upstash, while Docker Compose plus Nginx/Certbot documents the self-hosted path. Close with the deliberate exclusions: file storage and chatbot extra credit.

## Recording checklist

- Reset/seed demo data before recording.
- Keep passwords in a password manager or off-screen notes.
- Use a 1440p browser window at 110–125% zoom.
- Close personal tabs and hide notifications.
- Verify the live OAuth callback before recording.
- Upload to Google Drive, enable reviewer access, and share with the address in the current assessment instructions.
