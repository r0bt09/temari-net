# TEMARI NET — Ethiopian Learning App

TEMARI NET is a gamified learning companion for Ethiopian elementary learners: Amharic Fidel, maths, English, Ethiopian wildlife, and environmental learning, with speech playback, a child-safe AI tutor, live coins/leaderboards, and teacher/admin tools.

## Project layout and managed-runtime choices

The mobile product is the initialized WebDev **Expo Router / React Native / TypeScript** app in the root `app/`, `components/`, `lib/`, and `constants/` folders. The managed REST API runs beside the starter API on port **3000**; Expo web/Metro remains on **8081**. TEMARI data is stored in additive managed MySQL/Drizzle tables, kept separate from the starter's OAuth users table. The dashboard is served from `/admin-dashboard/` by the API server.

The managed app preserves the platform-generated native identifiers. In particular, the Android package is `space.manus.temarinet.t231880596358128`, not `com.temarinet.app`; this was necessary to retain the fixed managed starter. The repo includes `eas.json` with an internal Android APK preview profile, but no APK has been built in this workspace.

`database/init.sql` and `backend/` are the standalone PostgreSQL/local-development companion. It uses port **5000** and the requested PostgreSQL schema. Its destructive `DROP TABLE ... CASCADE` is strictly for a developer's local `temari_net_db`; never point that script at managed or production data.

## Managed WebDev preview

Open the project Preview from WebDev. It runs the app and API on their fixed ports. The first visit to the admin portal is `/admin-dashboard/`; on a fresh managed database, use **First administrator setup** once to create the initial admin. Student accounts are created from the mobile app's **Create account** flow; an existing admin can register teacher/admin accounts in the dashboard.

The additive TEMARI schema is applied with:

```sh
pnpm db:push
```

The initial six curriculum lessons have been inserted into the managed database. To add any missing lesson seed records again, use the idempotent command:

```sh
pnpm db:seed:temari
```

The seeder creates lesson content only; it does not create demo users or reset data. For a standalone local database, follow the next section instead.

## Copy the project to your own GitHub

The existing `origin` remote is the Manus project remote used for checkpoints. **Do not replace it.** The easiest Windows route is to publish the source archive attached in this task to your own new repository. On GitHub, create an empty **private** repository named `temari-net` (do not pre-add a README, license, or `.gitignore`). Download `temari-net-source.zip`, then extract it and initialize the GitHub copy in PowerShell:

```powershell
New-Item -ItemType Directory -Force C:\dev | Out-Null
Expand-Archive -Path "$HOME\Downloads\temari-net-source.zip" -DestinationPath C:\dev
Set-Location C:\dev\temari-net
git init -b main
git add .
git commit -m "Initial import: TEMARI NET"
git remote add origin https://github.com/<YOUR-USERNAME>/temari-net.git
git push -u origin main
```

Replace `<YOUR-USERNAME>` with your GitHub username. Git for Windows' Credential Manager will open a GitHub sign-in when needed; do not paste a token into source files or commands. This ZIP intentionally starts a new GitHub history at the delivered source snapshot; it does not alter or carry the Manus remote's commit history. `.env` files and `node_modules` are not included. For a WebDev-connected GitHub workflow instead, add GitHub through the authorized project integration and keep Manus `origin` as the checkpoint remote; do not force-push or replace `origin`.

Optional server-side environment values are `GEMINI_API_KEY`, `CHAPA_SECRET_KEY`, `CHAPA_WEBHOOK_SECRET`, and `TEMARI_JWT_SECRET` (the platform-managed JWT secret is also accepted). Keep these server-only; they are never bundled into the Expo app. Without Gemini, Temari AI returns a deterministic safe local answer. Without Chapa, sponsorship uses a clearly labelled mock checkout and never takes a real payment.

## Standalone local PostgreSQL API (Windows PowerShell)

Install Node.js 20 or newer and PostgreSQL first. Run PowerShell commands from the repository root. If the database already exists, skip `createdb` and inspect it before applying the local reset script.

```powershell
createdb -U postgres temari_net_db
psql -v ON_ERROR_STOP=1 -U postgres -d temari_net_db -f .\database\init.sql
Copy-Item .\backend\.env.example .\backend\.env
notepad .\backend\.env
```

In `backend\.env`, set a private `PGPASSWORD` if required and a long random `JWT_SECRET`. Set the five `SEED_*_PASSWORD` values to unique local-only passwords (10–128 characters with at least one letter and one number), then enable the seeded accounts:

```powershell
Set-Location .\backend
npm install
npm run seed:passwords
npm run dev
```

The standalone API listens on `http://localhost:5000`; its dashboard is at `http://localhost:5000/admin-dashboard/`. Leave it running. It uses `GEMINI_API_KEY` and Chapa secrets only if you add them to `backend\.env`; otherwise Gemini returns a deterministic child-safe response and Chapa uses the local mock checkout.

### Run the Expo client against the local backend

In a second PowerShell window at the repository root, install the app dependencies. For Expo Web in a Windows browser, use `localhost`; the local backend example already allows the Expo Web origin on port 8081:

```powershell
corepack enable
corepack prepare pnpm@9.12.0 --activate
pnpm install
$env:EXPO_PUBLIC_API_BASE_URL = "http://localhost:5000/api"
pnpm exec expo start --web --port 8081
```

Open `http://localhost:8081` in the browser. For an Android emulator, restart Expo with its host-mapped API address, then press `a` in the Expo terminal (the emulator must already be open):

```powershell
$env:EXPO_PUBLIC_API_BASE_URL = "http://10.0.2.2:5000/api"
pnpm exec expo start --port 8081
```

For a physical Android phone running Expo Go, use `http://<your-computer-LAN-IP>:5000/api` as `EXPO_PUBLIC_API_BASE_URL` before starting Expo, or enter it in the app's **Server IP** setting. The PC and phone must share a network; allow inbound port 5000 in Windows Firewall if needed.

The managed WebDev dev command (`pnpm dev`) also starts the starter API on port 3000 and the web/Metro preview on 8081. To test the standalone PostgreSQL backend, keep the app's saved API base set to port 5000; the starter API on 3000 is not the PostgreSQL companion.

## Build an Android APK

A user-owned EAS build can use the preview profile from the repository root. Install/configure EAS for your own Expo account, then run:

```powershell
npm install --global eas-cli
eas login
eas build --platform android --profile preview
```

This uses the preserved generated package identifier above. Native builds in the managed workflow should otherwise be initiated from the WebDev Dashboard; no EAS build was run for this delivery.

## Useful checks

```powershell
pnpm check
pnpm test
```

`pnpm db:seed:temari` only adds missing curriculum lessons; `database/init.sql` is a separate, intentionally destructive PostgreSQL reset for a local development database.
