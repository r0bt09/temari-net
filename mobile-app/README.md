# TEMARI NET Mobile Source

The production mobile source in this WebDev project lives in the root `app/`, `components/`, `lib/`, `constants/`, and `assets/` folders. It uses the fixed managed Expo Router / React Native / TypeScript starter. This directory is a pointer for readers expecting the original standalone monorepo layout; it intentionally does not contain a second Expo app or overwrite the generated app identifiers.

The standalone Express/PostgreSQL companion lives in `../backend` and `../database/init.sql`. The managed app connects to the project's API at port 3000 and managed MySQL/Drizzle; the local standalone API uses port 5000 and PostgreSQL. See `../README.md` for both workflows.
