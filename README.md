# Hunt.QR — QR Code Scavenger Hunt

A QR-code scavenger hunt platform. Admins create events and clue chains; teams
scan codes, solve riddles, collect letters, and crack a final word. The admin
dashboard tracks team progress live.

Built with React + Vite, styled with Tailwind, and backed by
[Supabase](https://supabase.com) (Postgres + Auth + Realtime). Deploys to
[Vercel](https://vercel.com).

> This project was originally a Base44 app. Base44 has been removed — auth and
> data now run on Supabase. The data layer lives behind a small adapter in
> [`src/api/client.js`](src/api/client.js).

## Prerequisites

- Node.js 18+
- A free Supabase project
- (optional) A Vercel account for deployment

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the
   `events`, `teams`, `clues`, and `profiles` tables, security policies, the
   trigger that gives every new user a profile, and enables realtime on `teams`.
3. **Auth → Providers → Email**: keep "Confirm email" enabled. To make the
   in-app 6-digit verification screen work, edit **Auth → Email Templates →
   Confirm signup** so the email includes the code token, e.g. add
   `Your code is {{ .Token }}`. (Or disable email confirmation entirely for
   quick local testing — new users are then signed in immediately.)
4. (optional) **Auth → Providers → Google**: enable it and add your OAuth
   credentials to make the "Continue with Google" buttons work.
5. **Auth → URL Configuration**: set the Site URL to `http://localhost:5173`
   for local dev (and add your Vercel URL once deployed). Add
   `http://localhost:5173/reset-password` to the redirect allow-list.

## 2. Run locally

```bash
npm install
cp .env.example .env.local   # then fill in your values
npm run dev
```

Get the two values from **Supabase → Project Settings → API**:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Open http://localhost:5173.

## 3. Make yourself an admin

Sign up through the app, then in the Supabase SQL editor run:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Reload — you'll land on the admin dashboard, where you can create events,
add clues, and generate QR codes.

## 4. Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel (it auto-detects Vite).
2. In the Vercel project's **Environment Variables**, add `VITE_SUPABASE_URL`
   and `VITE_SUPABASE_ANON_KEY`.
3. Add your Vercel domain to Supabase **Auth → URL Configuration** (Site URL +
   redirect allow-list, including `https://your-app.vercel.app/reset-password`).

[`vercel.json`](vercel.json) rewrites all routes to `index.html` so client-side
routes like `/clue/:id` work on direct load.

## How it maps to Supabase

| App concept            | Supabase                                            |
| ---------------------- | --------------------------------------------------- |
| `Event` / `Team` / `Clue` entities | `events` / `teams` / `clues` tables     |
| Current user (`me()`)  | `auth.users` joined with the `profiles` row         |
| `role` / `team_id`     | columns on `profiles`                               |
| Live team panel        | Supabase Realtime on the `teams` table              |
| Email / OTP / Google / reset | Supabase Auth                                 |
```
