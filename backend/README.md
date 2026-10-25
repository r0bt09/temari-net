# Temari Net standalone local API

This is a supplemental Express/PostgreSQL companion that runs locally on port **5000**. It is separate from the managed app runtime and managed schema. The API is served under `/api` (for example, `http://localhost:5000/api/lessons`). It uses the PostgreSQL tables in `../database/init.sql`; do not run the companion against a managed/shared database.

## Local setup

1. Install PostgreSQL locally and create your own local database named `temari_net_db`.
2. **Destructive reset warning:** `../database/init.sql` drops and recreates `users`, `lessons`, `progress`, and `sponsorships`. Only apply it to your own local `temari_net_db`; never apply it to a managed, shared, or production database. From this directory, apply it with `psql -d temari_net_db -f ../database/init.sql` only after verifying the target database is your local one.
3. Copy `.env.example` to `.env`, set the local PostgreSQL connection settings, and set a long random `JWT_SECRET`. Keep secrets private.
4. Run `npm install` and then `npm start` (or `npm run dev`). The server listens on port 5000 by default.
5. The five seeded accounts use deliberately unusable `!` hashes; there are no default passwords. To enable any seed account for local testing, set the corresponding `SEED_ADMIN_PASSWORD`, `SEED_TEACHER_PASSWORD`, `SEED_ABEBE_PASSWORD`, `SEED_HANNA_PASSWORD`, or `SEED_DAWIT_PASSWORD` in `.env` to a unique, secure 10–128 character password containing a letter and a number. Then run `npm run seed:passwords`. The password utility hashes the configured passwords and never prints them. If no variables are configured it refuses to proceed.

When `CHAPA_SECRET_KEY` is unset, sponsorship initialization serves a branded local mock checkout; confirming it changes the local sponsorship to completed and awards 50 coins to its linked student, but collects no money. With a Chapa key configured, initialization and verification use Chapa. A valid `CHAPA_WEBHOOK_SECRET` (or the Chapa secret key) is required to accept signed webhooks. With `GEMINI_API_KEY` unset, child-safe AI responses use a deterministic local fallback.

## API surface

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/lessons?grade_level=Grade%201&subject=Amharic`; `POST /api/lessons/submit`
- `GET /api/leaderboard?role=student` or `teacher`
- `POST /api/ai/ask`
- `POST /api/chapa/initialize`, `GET /api/chapa/verify/:txRef`, signed `POST /api/chapa/webhook`
- Admin-only (Bearer token): `GET /api/admin/overview`, `GET /api/admin/lessons`, `GET /api/admin/sponsorships`, `POST /api/admin/lessons`, `DELETE /api/admin/lessons/:lessonId`, `DELETE /api/admin/users/:userId`

Registration accepts `full_name`, `email`, `password`, optional `grade_level`, and optional `registered_by_teacher_id`. A successful teacher referral awards that teacher 10 coins in the same transaction as registration. Lesson submission accepts `student_id`, `lesson_id`, and `selected_option`; the option must exactly equal the stored correct answer. A correct answer awards the lesson reward only on its first completion.

Sponsorship initialization accepts `sponsor_name`, `email`, `phone_number`, optional `student_id`, and an optional `amount_etb` between 1 and 1,000,000 ETB (default 50). The mobile student-sponsorship flow continues to send exactly 50 ETB; any completed sponsorship linked to a student awards 50 coins once, regardless of the ETB amount. The response includes a `checkoutUrl` and transaction reference. Successful provider verification, a valid webhook, or local mock checkout completion is idempotent; at most 50 coins are awarded once to the linked student.
