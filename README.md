# Hunt.QR

Hunt.QR is a QR-code scavenger hunt app for running team-based events. Admins
create events, build ordered clue chains, generate QR codes, and monitor team
progress live. Players sign in, create or join a team, scan clue QR codes, solve
riddles, collect reward letters, and reveal the final word when the hunt is
complete.

The app is built with React, Vite, Tailwind CSS, shadcn/Radix UI components, and
Supabase for Postgres, Auth, and Realtime.

## What This Project Does

Hunt.QR turns a scavenger hunt into a managed web experience. Instead of handing
players a paper clue sheet or manually tracking progress, the app gives each
clue its own QR code and lets teams advance through the hunt one step at a time.
Players scan a QR code, read the riddle, submit an answer, and earn a reward
letter when they solve it. Those letters accumulate across the hunt and form the
final word at the end.

The project supports two main roles:

- Players sign up, join or create a team, scan clue QR codes, solve riddles,
  watch team progress update, and see which teammate solved each clue.
- Admins create events, add ordered clues, generate QR codes, monitor team
  progress, delete events, and grant additional attempts when a team runs out.

Each event has its own set of clues and teams. Teams can have multiple members,
share a join code, and progress together. A team cannot skip ahead by scanning a
later QR code early; the clue page checks the team's current level before showing
the riddle. Wrong answers count against the team's attempt limit for that clue,
and solved clues are recorded with the member who submitted the correct answer.

Supabase is the source of truth for the application. Auth handles accounts,
Postgres stores events, clues, teams, attempts, solves, and profiles, and
Realtime keeps team progress fresh across teammates and the admin dashboard. The
React frontend is the complete user interface for both hosts and players, so the
same deployment can run an entire hunt from setup through completion.

Players create accounts with a screen name and password. Behind the scenes, the
app converts each screen name into a synthetic Supabase Auth email such as
`teamcaptain@huntqr.local`. Players never enter or see an email address in the
normal flow.

## Features

- Screen-name/password auth backed by Supabase Auth synthetic emails
- Player lobby for creating teams, joining teams with invite codes, viewing team
  progress, scanning QR codes, and seeing a member leaderboard
- Admin dashboard for creating events, adding clues, generating QR codes, and
  tracking teams live
- Ordered clue progression so teams can only solve the clue they are currently on
- Per-clue attempt limits with admin-managed extra attempts
- Reward letters collected from each solved clue to form the final word
- Supabase Realtime updates for team progress

## Tech Stack

- React 18
- Vite 6
- Tailwind CSS
- Supabase JS v2
- React Router
- TanStack Query
- Radix UI / shadcn-style components
- `html5-qrcode` for in-browser QR scanning
- `jspdf` and `html2canvas` for QR/export workflows

## Prerequisites

- Node.js 18 or newer
- npm
- A Supabase project
- Optional: a Vercel account for deployment

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Fill in the values from Supabase Dashboard > Project Settings > API:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:5173`.

## Supabase Setup

1. Create a new project at `https://supabase.com`.
2. Open SQL Editor > New query.
3. Paste the contents of `supabase/schema.sql`.
4. Run the query.

The schema creates:

- `events`
- `teams`
- `clues`
- `clue_attempts`
- `clue_solves`
- `profiles`
- Row Level Security policies
- A trigger that creates a profile row for each new auth user
- A helper function for admin checks
- Realtime publication support for the `teams` table

### Auth Configuration

In Supabase Dashboard > Authentication:

1. Enable Email auth.
2. Disable email confirmation. Hunt.QR uses synthetic internal emails, so users
   cannot receive confirmation messages.
3. Leave password login enabled.

Password reset emails are not available in this flow because players do not
provide real email addresses. If a player forgets a password, the event host or
database admin needs to recover or replace that account manually.

## Make Yourself an Admin

Sign up through the app first. Then run this in the Supabase SQL editor:

```sql
update public.profiles
set role = 'admin'
where screen_name = 'your-screen-name';
```

Reload the app. Admin users are routed to `/admin`, where they can manage events,
clues, teams, QR codes, and attempt overrides.

## App Routes

- `/` - landing page
- `/login` - sign in
- `/register` - create account with screen name and password
- `/forgot-password` - password help message for screen-name accounts
- `/lobby` - player team lobby
- `/clue/:clueId` - clue page opened from a QR code
- `/admin` - admin dashboard

## Available Scripts

```bash
npm run dev        # Start Vite dev server
npm run build      # Build production assets
npm run preview    # Preview the production build
npm run lint       # Run ESLint
npm run lint:fix   # Run ESLint and apply fixes
npm run typecheck  # Run TypeScript checking against jsconfig.json
```

## Data Model

| App concept | Supabase table |
| --- | --- |
| Events | `events` |
| Teams and team progress | `teams` |
| Ordered riddles and answers | `clues` |
| Per-team clue attempt limits | `clue_attempts` |
| Per-member solved clue attribution | `clue_solves` |
| User profile, role, and team membership | `profiles` |
| Auth sessions and users | Supabase Auth |

The app talks to Supabase through `src/api/client.js`, which preserves the
entity-style interface from the original Base44 app while using Supabase tables
under the hood.

## Deployment

The project is ready for Vercel.

1. Push the repository to GitHub.
2. Import the project into Vercel.
3. Add these environment variables in Vercel:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

4. In Supabase Authentication > URL Configuration, add your deployed URL as the
   Site URL.

`vercel.json` rewrites all requests to `index.html` so React Router routes work
on direct page loads.

## Notes

This project was originally a Base44 app. Base44 has been removed; auth and data
now run on Supabase. The compatibility layer lives in `src/api/client.js`.
