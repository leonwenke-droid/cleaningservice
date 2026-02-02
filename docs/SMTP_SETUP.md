# SMTP Email Configuration Guide

## Problem
Supabase has default email rate limits (typically 2-3 emails per hour on free tier) which can cause "email rate limit exceeded" errors.

## Solution: Configure Custom SMTP

By configuring your own SMTP server, you bypass Supabase's email limits and use your provider's limits instead.

---

## Step 1: Choose an SMTP Provider

### Recommended Options:

1. **SendGrid** (Free tier: 100 emails/day)
   - Sign up: https://sendgrid.com
   - Get API key from Settings → API Keys

2. **Mailgun** (Free tier: 5,000 emails/month)
   - Sign up: https://www.mailgun.com
   - Get SMTP credentials from Sending → Domain Settings

3. **AWS SES** (Pay-as-you-go, very cheap)
   - Set up in AWS Console
   - Requires domain verification

4. **Resend** (Free tier: 3,000 emails/month)
   - Sign up: https://resend.com
   - Modern API-first service

---

## Step 2: Configure in Supabase Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to: **Settings** → **Auth** → **SMTP Settings**
4. Enable "Custom SMTP"
5. Fill in your SMTP credentials:

### For SendGrid:
```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587 (or 465 for SSL)
SMTP User: apikey
SMTP Password: [Your SendGrid API Key]
Sender Email: your-verified-email@yourdomain.com
Sender Name: Your App Name
```

### For Mailgun:
```
SMTP Host: smtp.mailgun.org
SMTP Port: 587
SMTP User: [Your Mailgun SMTP Username]
SMTP Password: [Your Mailgun SMTP Password]
Sender Email: noreply@yourdomain.com
Sender Name: Your App Name
```

### For Resend:
```
SMTP Host: smtp.resend.com
SMTP Port: 587
SMTP User: resend
SMTP Password: [Your Resend API Key]
Sender Email: onboarding@resend.dev (or your verified domain)
Sender Name: Your App Name
```

6. Click **Save**

---

## Step 3: Verify Configuration

1. Go to **Authentication** → **Users**
2. Click **Invite User**
3. Enter a test email address
4. Check if the email arrives

---

## Step 4: Update Rate Limits (Optional)

After configuring SMTP, you can increase rate limits:

1. Go to **Settings** → **Auth** → **Rate Limits**
2. Increase `email_sent` limit (e.g., 1000 per hour)
3. Click **Save**

---

## Troubleshooting

### Emails not sending:
- Verify SMTP credentials are correct
- Check sender email is verified with your provider
- Check spam folder
- Review Supabase logs: **Logs** → **Auth Logs**

### Still hitting rate limits:
- Ensure SMTP is properly enabled (green toggle)
- Wait a few minutes for changes to propagate
- Check your SMTP provider's own rate limits

---

## For Local Development

If using local Supabase (`supabase start`), configure SMTP in `supabase/config.toml`:

```toml
[auth.email.smtp]
enabled = true
host = "smtp.sendgrid.net"
port = 587
user = "apikey"
pass = "env(SENDGRID_API_KEY)"
admin_email = "your-email@example.com"
sender_name = "Your App"
```

Then add to `.env.local`:
```
SENDGRID_API_KEY=your_api_key_here
```

---

## Quick Start: SendGrid (Recommended)

1. **Sign up**: https://sendgrid.com/free/
2. **Verify sender**: Settings → Sender Authentication → Verify Single Sender
3. **Create API key**: Settings → API Keys → Create API Key
4. **Configure in Supabase**: Use the credentials above
5. **Test**: Send a test invitation

**Free tier**: 100 emails/day, perfect for development and small apps.

---

## Production Recommendations

- Use a verified domain (not just email)
- Set up SPF/DKIM records for better deliverability
- Monitor email delivery rates
- Consider upgrading SMTP provider plan for higher limits
- Set up email templates for better branding
