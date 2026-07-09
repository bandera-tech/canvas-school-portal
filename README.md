# Canvas School Portal

A compact, Canvas-style school portal built for the Concentrate.ai full-stack assessment. Admins manage people and teacher groups, teachers run classes and grade work, and students read lessons, submit assignments, and review feedback.

## Architecture

- **Web:** Next.js 15, React 19, Tailwind CSS
- **API:** Fastify 5 with Zod request validation
- **Data:** PostgreSQL 17 through Kysely, with checked-in migrations and seeds
- **Cache:** Redis for versioned school-statistics caching and one-time OAuth state
- **Auth:** scrypt password hashes, eight-hour JWTs in HTTP-only cookies, and GitHub OAuth
- **Delivery:** one Node process, one root Dockerfile, GitHub Actions, and a Render blueprint

Fastify owns `/api/*` and hands every other request to Next.js. Keeping both sides on one origin makes cookie security and deployment simpler. Services contain authorization and business rules; routes only validate input and translate HTTP concerns.

## Run it

### Docker (recommended)

```bash
docker compose up --build
```

Open <http://localhost:3000>. The app runs migrations automatically. Seed the demo data once:

```bash
docker compose exec app node dist/server/database/cli.js seed
```

### Hosted services or local Node

Node 20+ and pnpm 10 are required. Copy `.env.example` to `.env`, point `DATABASE_URL` and `REDIS_URL` at Neon/Upstash or local services, then run:

```bash
corepack enable
pnpm install
pnpm build
pnpm db:seed
pnpm dev
```

`pnpm db:seed` requires the server TypeScript build (`pnpm build`) because the CLI runs compiled code.

## Demo accounts

| Role    | Email                 | Default password  |
| ------- | --------------------- | ----------------- |
| Admin   | `admin@canvas.test`   | `AdminDemo123!`   |
| Teacher | `teacher@canvas.test` | `TeacherDemo123!` |
| Student | `student@canvas.test` | `StudentDemo123!` |

Change all three passwords through environment variables outside demo environments.

## API

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/auth/github`, `GET /api/auth/github/callback`
- `/api/admin/users` and `/api/admin/teacher-groups`
- `/api/teacher/classes` and nested enrollment, lesson, and assignment routes
- `/api/teacher/submissions` and `/api/teacher/submissions/:id/grade`
- `/api/student/classes`, `/api/student/work`, and assignment submission routes
- Required school statistics under `/api/v0/stats/*`
- `GET /api/health` and `GET /api/ready`

Every route except login, OAuth start/callback, and health checks requires an active account. Admin and teacher endpoints use explicit role guards. Teacher operations additionally verify class ownership.

## Tests and quality checks

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm coverage
RUN_INTEGRATION=1 pnpm test:integration
pnpm test:e2e
```

Pure authentication, validation, and error modules enforce 100% line, branch, function, and statement coverage. Integration tests use real PostgreSQL and Redis. Playwright covers all three role entry points. GitHub Actions is the authoritative Docker-backed environment when Docker is unavailable locally.

## Deployment

`render.yaml` deploys the Docker image to Render. Create free Neon and Upstash databases, then set `DATABASE_URL`, `REDIS_URL`, `APP_URL`, GitHub OAuth values, and demo passwords in Render. The GitHub callback is:

```text
https://YOUR-RENDER-HOST/api/auth/github/callback
```

For a VM deployment, install Docker and Nginx, replace the host in `deploy/nginx.conf`, bring up the compose stack, and use Certbot:

```bash
sudo certbot --nginx -d school.example.com
```

CI builds the image on every pull request. Add `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` repository secrets to publish `canvas-school-portal:latest` from `main`.

## Tradeoffs

- Submissions accept text and an optional URL; object storage was intentionally excluded.
- OAuth self-registration creates Student accounts only. Staff accounts remain admin-controlled.
- Statistics are cached for 60 seconds using a version key, so writes invalidate all related shapes without Redis key scans.
- The project uses the starter dependency list. `@fastify/cookie` was corrected from the unpublished v12 range to the Fastify 5-compatible v11 release.
- Chatbot extra credit is intentionally out of scope.
