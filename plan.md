# TEMARI NET — Implementation Plan

## Approved scope and platform fit

Build TEMARI NET inside the initialized managed WebDev Mobile project, preserving its fixed Expo Router / React Native / TypeScript / NativeWind starter and generated application identifiers. Implement the complete child learning experience, REST API contract, live teacher/admin dashboard, and offline fallbacks within that architecture. The managed runtime uses the starter's MySQL-compatible database through Drizzle and fixed API/Metro listeners on ports 3000/8081. Do not replace these platform-owned choices or overwrite the generated Android package/scheme.

Retain the exact requested PostgreSQL schema and a standalone Express/PostgreSQL local-development implementation as supplemental repository artifacts under `database/` and `backend/`; local backend execution can use port 5000 and the Android Emulator's `10.0.2.2:5000` address. In the managed project, implement the same user-facing API behavior with additive Drizzle/MySQL tables (`temari_users`, lessons, progress, sponsorships), avoiding destructive alterations to the starter's OAuth `users` table. The README will distinguish the managed runtime from the standalone Windows/PostgreSQL workflow.

## Architecture and data flow

- `app/` remains the native/web application source. Expo Router tab routes provide Quests, Speak & Read, Temari AI, Leaderboard, and Rewards/Sponsor; a login/registration route handles student access. Shared React Native components cover the branded gamified header, subject cards, dialogs, server settings, loading/error states, and accessible touch targets.
- `server/temari/` contains the managed REST routers, validation, authentication/role middleware, and Drizzle persistence. Mount `/api/auth`, `/api/lessons`, `/api/leaderboard`, `/api/ai`, `/api/chapa`, and `/api/admin` beside the existing health and tRPC routes on the fixed port 3000. The managed app uses the generated `EXPO_PUBLIC_API_BASE_URL`; an editable server URL supports local devices/emulators.
- `drizzle/schema.ts` adds non-destructive TEMARI-specific MySQL tables without renaming/removing starter tables. Admin-created lessons and app-submitted progress/coin rewards share this store, so the leaderboard and dashboard read live values.
- `backend/` and `database/init.sql` supply a separately runnable Express + PostgreSQL version of the specified API/schema for Windows local development. This matches the requested port 5000 and provides deterministic fallbacks when Gemini/Chapa secrets are unset. No PostgreSQL DSN is assumed in the managed runtime.
- `admin-dashboard/index.html` is a responsive, single-file teacher/admin portal served by the API process. Its connection badge, forms, lists, KPI totals, Chapa mock/real verification, and live refresh use the REST contract; privileged actions require the relevant role.
- `README.md` documents both paths, the fixed managed IDs/ports/database, PowerShell setup for PostgreSQL, Expo launch, and the supported native build handoff. No generated EAS artifact or external payment is claimed unless actually produced.

## Implementation choices and material constraints

Use the project's installed Expo SDK 57, React Native 0.86, Expo Router, NativeWind, Express, Drizzle, and MySQL driver for managed runtime work. Add only the mobile/server packages needed for speech, secure token storage where appropriate, bcrypt-compatible password hashing, and the requested Gemini integration. Keep server-only credentials out of Expo bundles; declare optional Gemini and Chapa keys through protected secret input when real-provider testing is requested, and ensure deterministic child-safe/demo behavior when absent. Use the existing managed authentication/runtime infrastructure only where compatible; TEMARI's student/teacher/admin accounts remain a separate, explicit API user model because the brief specifies email/password/JWT.

Keep the standalone SQL's destructive `DROP TABLE ... CASCADE` behavior scoped to the explicitly documented local PostgreSQL database only. Managed migrations are additive and must not drop/reset shared project data. Seed data is available as explicit initialization/demo data, not an unconditional production-startup reset.

## Design direction

Three aesthetic directions considered (sampled low-probability tail values): Ethiopian folk-modern literacy trail (0.063), printmaker storybook classroom (0.041), and contemporary STEM learning lab (0.018). Choose **Ethiopian folk-modern literacy trail**.

- **Design Movement:** contemporary Ethiopian folk-modern, translating warm woven-pattern details and Fidel learning cards into a polished mobile learning product rather than a literal classroom or souvenir aesthetic.
- **Core Principles:** culturally rooted without clutter; joyful feedback with calm reading surfaces; one-handed, child-sized interactions; visible progress and clear recovery from errors.
- **Color Philosophy:** deep Aksum emerald signals growth and trust; warm parchment keeps long reading comfortable; saffron highlights rewards and discovery; restrained coral marks only supportive attention states. Maintain strong text contrast and do not encode correctness with color alone.
- **Layout Paradigm:** a vertical quest journey with large lesson cards and progress nodes, anchored by a fixed bottom tab dock; compact top status band keeps learner identity, streak, and coins in view. Dashboard uses a clean editorial sidebar/tab rhythm and data tables, not decorative cards for every item.
- **Signature Elements:** thin Ethiopian-inspired woven edge trims; oversized Fidel glyph tiles; earned-coin medallions with a small path/star motif.
- **Interaction Philosophy:** tap-first, forgiving, no speed pressure; spoken prompt plus visual choices; immediate answer feedback and live coin balance; confirm risky delete/payment transitions, keep settings reversible.
- **Animation:** short 140–220 ms fade/scale transitions for cards and tabs; a brief, non-blocking coin sparkle after rewards; subtle progress-node fill; reduced-motion preference disables decorative movement. Never make essential information animation-only.
- **Typography System:** rounded native system sans for Latin UI, with device Noto Sans Ethiopic coverage for Amharic/Fidel; clear semibold section headings, large question copy, generous line height, and minimum 16 px body text. Use glyph-first Fidel cards rather than dense paragraphs.
- **Brand Essence:** culturally grounded Ethiopian learning quests for young children, with live teacher/sponsor support; **joyful, encouraging, dependable**.
- **Brand Voice:** short, warm, confident and age-appropriate; praise effort rather than only correctness. Examples: “Selam, Abebe! Your next quest is ready.” “Gobez—you earned 15 coins. Keep exploring!”
- **Wordmark & Logo:** typeset TEMARI NET in the interface; a separate, simple book-and-guiding-star emblem with a restrained woven border becomes the launcher mark. Do not depend on generated lettering for exact typography.
- **Signature Brand Color:** Aksum emerald `#146B54`.

## Project structure

```text
app/                         Expo Router screens and navigation (managed app)
components/temari/            Reusable learning, status, form, and modal components
server/temari/                Managed REST routes, validation, auth, MySQL repositories
server/_core/index.ts         Existing Express/tRPC entry; mounts TEMARI REST + dashboard
drizzle/schema.ts             Additive managed MySQL schema
 database/init.sql            Requested standalone PostgreSQL schema and Ethiopian seed data
 backend/src/                 Standalone Express/PostgreSQL API for Windows/local port 5000
 admin-dashboard/index.html   Responsive single-page portal using live REST endpoints
 assets/images/               TEMARI launcher/splash/adaptive icon artwork
 README.md                    Managed-vs-local setup and Windows build instructions
 plan.md, TODO.md             Approved approach and detailed product outcomes
```
