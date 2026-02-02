# Deploying the app (without committing credentials)

The app never reads secrets from the repo. You configure them **in the deployment environment** instead.

## 1. Set environment variables on your host

Wherever you deploy (Vercel, Netlify, Railway, etc.), open **Project → Settings → Environment variables** and add:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key (Dashboard → Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (for admin: invite users, init checklist) |
| `NEXT_PUBLIC_SITE_URL` | Yes in prod | Your deployed app URL (e.g. `https://your-app.vercel.app`) — needed for auth redirects and magic links |
| `N8N_WEBHOOK_URL` | No | n8n webhook URL if you use invite/magic-link emails |

Use the **same values** you have in `.env.local` locally; just type (or paste) them in the host’s UI. They are stored securely and never committed to Git.

## 2. Deploy

- **Vercel:** Connect your GitHub repo; Vercel will use the env vars you added. Deploy.
- **Netlify:** Connect repo, add env vars under Site settings → Environment variables, then deploy.
- **Railway / other:** Same idea: add env vars in the project settings, then deploy from your repo.

## 3. After first deploy

1. Set **`NEXT_PUBLIC_SITE_URL`** to your real deployment URL (e.g. `https://cleaningservice.vercel.app`).
2. In Supabase Dashboard → **Authentication → URL configuration**, add your deployment URL to **Redirect URLs** and **Site URL** so login and magic links work.

## Local development

Copy `.env.example` to `.env.local`, fill in your real values, and run `npm run dev`. `.env.local` is gitignored and never pushed.
