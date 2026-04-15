# Strata Signal

Encrypted campus messaging app built with Next.js + Supabase.

## Setup (5 minutes)

### 1. Run the database setup
- Go to your Supabase dashboard → **SQL Editor**
- Paste the entire contents of `SUPABASE_SETUP.sql`
- Click **Run**

### 2. Configure Supabase Auth
- Go to **Authentication → URL Configuration**
- Set **Site URL** to your Vercel URL (e.g. `https://your-app.vercel.app`)
- Add `https://your-app.vercel.app/**` to **Redirect URLs**
- Under **Authentication → Providers → Email**, turn OFF **"Confirm email"** for easier testing

### 3. Deploy to Vercel
- Push the project to GitHub
- Import in Vercel
- The Supabase credentials are already baked into `next.config.js`

### 4. Use it
- Go to `/auth` to sign up or log in
- After login you land on `/chat`
- All other signed-up users appear in the sidebar
- Messages are real-time via Supabase Realtime

## Stack
- Next.js 14 (App Router)
- Supabase (Auth + Postgres + Realtime)
- TypeScript
- Tailwind CSS
