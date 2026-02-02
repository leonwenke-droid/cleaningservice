# n8n Workflows for Email Sending

This directory contains ready-to-import n8n workflow JSON files for handling email sending via n8n instead of Supabase's built-in email service.

## Workflows Included

### 1. `send-invitation-email.json`
**Purpose**: Sends invitation emails when triggered by Supabase database webhook

**Use Case**: When a new user is created in `auth.users` table

**Setup**:
1. Import workflow into n8n
2. Configure SMTP credentials
3. Set up Supabase Database Webhook pointing to this workflow's webhook URL
4. Update the magic link generation logic (currently placeholder)

### 2. `send-magic-link-login.json`
**Purpose**: Sends magic link emails for login

**Use Case**: When user requests a magic link for sign-in

**Setup**:
1. Import workflow into n8n
2. Configure SMTP credentials
3. Update your Next.js API route to call this webhook instead of Supabase's `signInWithOtp()`

### 3. `invite-employee-complete.json`
**Purpose**: Complete flow - creates user, profile, generates magic link, and sends email

**Use Case**: When admin invites a new employee

**Setup**:
1. Import workflow into n8n
2. Configure Supabase Admin API credentials
3. Configure SMTP credentials
4. Update your `/api/invite-employee` route to call this webhook

## How to Import

1. Open your n8n instance
2. Click **"Workflows"** → **"Import from File"**
3. Select one of the JSON files from this directory
4. Configure the credentials:
   - **SMTP Account**: Your email provider (SendGrid, Mailgun, etc.)
   - **Supabase API** (if needed): Your Supabase Admin credentials

## Configuration Required

### SMTP Credentials

Create an SMTP credential in n8n with your provider:

**SendGrid**:
```
Host: smtp.sendgrid.net
Port: 587
User: apikey
Password: [Your SendGrid API Key]
```

**Mailgun**:
```
Host: smtp.mailgun.org
Port: 587
User: [Your Mailgun SMTP Username]
Password: [Your Mailgun SMTP Password]
```

**Gmail**:
```
Host: smtp.gmail.com
Port: 587
User: your-email@gmail.com
Password: [App Password]
```

### Supabase Credentials (for complete flow)

If using `invite-employee-complete.json`, configure:
- Supabase URL
- Supabase Service Role Key (for Admin API access)

## Environment Variables

Set these in n8n (Settings → Environment Variables):

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_REDIRECT_URL=https://yourdomain.com/auth/callback
```

## Customization

### Email Templates

Edit the HTML email templates in the "Send Email" nodes to match your branding.

### Magic Link Generation

The workflows include placeholder logic for generating magic links. You'll need to:

1. Either use Supabase Admin API (as shown in `invite-employee-complete.json`)
2. Or generate the link in your Next.js API route and pass it to n8n

### Error Handling

Add error handling nodes:
- **On Error** nodes to catch failures
- **Retry** logic for failed email sends
- **Logging** to track sent emails

## Testing

1. **Test Webhook**: Use n8n's webhook test feature
2. **Test Email**: Send a test invitation
3. **Monitor**: Check n8n execution logs
4. **Verify**: Check email inbox/spam folder

## Next Steps

1. Import the workflow you need
2. Configure credentials
3. Test with a sample request
4. Update your Next.js API routes to call n8n webhooks
5. Set up Supabase Database Webhooks (if using approach 1)

## Support

- n8n Documentation: https://docs.n8n.io
- Supabase Auth Docs: https://supabase.com/docs/guides/auth
