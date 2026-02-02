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

**Vercel:** For `NEXT_PUBLIC_*` variables to be in the browser bundle, they must be available at **build time**. When adding each variable, enable **Build** (or "All") as well as Production/Preview — otherwise the client will have no API key and Supabase will return "No API key found in request".

## 2. Deploy

- **Vercel:** Connect your GitHub repo; Vercel will use the env vars you added. Deploy.
- **Netlify:** Connect repo, add env vars under Site settings → Environment variables, then deploy.
- **Railway / other:** Same idea: add env vars in the project settings, then deploy from your repo.

## 3. After first deploy

1. Set **`NEXT_PUBLIC_SITE_URL`** to your real deployment URL (e.g. `https://cleaningservice-six.vercel.app`).
2. In Supabase Dashboard → **Authentication → URL configuration**, add your deployment URL to **Redirect URLs** and set **Site URL** to the same so login and magic links work.

### Magic link sends me to localhost

If the magic link opens `http://localhost:3000` instead of your Vercel URL:

1. **Vercel:** Project → Settings → Environment Variables. Add or edit **`NEXT_PUBLIC_SITE_URL`** = `https://cleaningservice-six.vercel.app` (or your actual Vercel URL). Enable **Production** (and **Preview** if you use preview deploys). Redeploy so the new value is used.
2. **Supabase:** Authentication → URL configuration. Set **Site URL** to `https://cleaningservice-six.vercel.app`. Under **Redirect URLs**, add `https://cleaningservice-six.vercel.app/auth/callback` (and your Vercel URL if different). Save.
3. Request a **new** magic link after saving; old links still point at the previous redirect URL.

### "No API key found in request" / "No 'apikey' request header"

Supabase returns this when the app’s client sends a request without the anon key. On Vercel that usually means:

1. **`NEXT_PUBLIC_SUPABASE_URL`** and **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** are missing, or were not available when the project was **built**.  
   In Next.js, `NEXT_PUBLIC_*` values are inlined at **build** time. If they aren’t set for the build, the browser bundle has no key and Supabase rejects the request.

2. **Fix:** In Vercel → Project → Settings → Environment Variables, add (or edit):
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL  
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key (Dashboard → Settings → API)

   For each variable, enable **Build** (or "All"), not only Production. Then trigger a **new deploy** (Redeploy) so a fresh build runs with these values. Old deployments keep the old (empty) bundle.

## Local development

Copy `.env.example` to `.env.local`, fill in your real values, and run `npm run dev`. `.env.local` is gitignored and never pushed.
