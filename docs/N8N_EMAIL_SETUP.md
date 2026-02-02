# Using n8n for Email Sending

## Overview

You can use n8n to send emails instead of relying on Supabase's built-in email service. This gives you:
- **No rate limits** (use your own SMTP provider)
- **Full control** over email templates and logic
- **Better deliverability** with your own SMTP
- **Workflow automation** for complex email scenarios

---

## Approach 1: Database Webhooks (Recommended)

Use Supabase Database Webhooks to trigger n8n when users are created/invited, then n8n sends the email.

### Step 1: Set up Supabase Database Webhook

1. Go to Supabase Dashboard → **Database** → **Webhooks**
2. Create a new webhook:
   - **Name**: `user_invited`
   - **Table**: `auth.users`
   - **Events**: `INSERT`
   - **HTTP Request**:
     - **URL**: `https://your-n8n-instance.com/webhook/user-invited`
     - **HTTP Method**: `POST`
     - **HTTP Headers**: 
       ```
       Authorization: Bearer YOUR_N8N_WEBHOOK_SECRET
       ```

### Step 2: Create n8n Workflow

**Workflow**: "Send Invitation Email"

**Nodes**:
1. **Webhook** (Trigger)
   - Method: POST
   - Path: `/webhook/user-invited`
   - Authentication: Header Auth (optional)

2. **Function** (Extract data)
   ```javascript
   // Extract user data from Supabase webhook payload
   const payload = $input.item.json;
   const user = payload.record || payload.new;
   
   return {
     email: user.email,
     userId: user.id,
     metadata: user.user_metadata || {},
     companyId: user.user_metadata?.company_id,
     role: user.user_metadata?.role
   };
   ```

3. **Supabase** (Get company info - optional)
   - Operation: Get Row
   - Table: `companies`
   - Filter: `id = {{ $json.companyId }}`

4. **Function** (Generate magic link)
   ```javascript
   // Generate Supabase magic link
   const email = $json.email;
   const redirectUrl = 'https://yourdomain.com/auth/callback';
   const supabaseUrl = process.env.SUPABASE_URL;
   
   // You'll need to generate the magic link token
   // This requires calling Supabase Admin API or using a service account
   const magicLink = `${supabaseUrl}/auth/v1/verify?token=...&type=magiclink&redirect_to=${redirectUrl}`;
   
   return { email, magicLink };
   ```

5. **Email (SMTP)** (Send email)
   - **From**: `noreply@yourdomain.com`
   - **To**: `{{ $json.email }}`
   - **Subject**: `Welcome to {{ $json.companyName }}`
   - **HTML**:
     ```html
     <h1>You've been invited!</h1>
     <p>Click the link below to sign in:</p>
     <a href="{{ $json.magicLink }}">Sign In</a>
     ```

---

## Approach 2: Custom API Endpoints (More Control)

Instead of using Supabase's built-in invitation, create your own API endpoints that trigger n8n.

### Step 1: Create API Route

Create `/app/api/invite-via-n8n/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require";

export async function POST(request: Request) {
  try {
    const { profile } = await requireAdmin();
    const { email, role } = await request.json();

    // Call n8n webhook instead of Supabase invite
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    const response = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        role,
        companyId: profile.company_id,
        companyName: "Your Company", // Fetch from DB if needed
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to send invitation");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
```

### Step 2: n8n Workflow

**Workflow**: "Send Invitation Email via Webhook"

**Nodes**:
1. **Webhook** (Trigger)
   - Path: `/webhook/invite-user`

2. **Supabase** (Create user)
   - Operation: Create User (Admin API)
   - Email: `{{ $json.email }}`
   - User Metadata: 
     ```json
     {
       "company_id": "{{ $json.companyId }}",
       "role": "{{ $json.role }}"
     }
     ```

3. **Supabase** (Create profile)
   - Operation: Insert
   - Table: `app_users`
   - Data:
     ```json
     {
       "id": "{{ $json('Supabase').id }}",
       "company_id": "{{ $json.companyId }}",
       "role": "{{ $json.role }}",
       "email": "{{ $json.email }}"
     }
     ```

4. **Function** (Generate magic link)
   ```javascript
   // Use Supabase Admin API to generate magic link
   const { createClient } = require('@supabase/supabase-js');
   const supabase = createClient(
     process.env.SUPABASE_URL,
     process.env.SUPABASE_SERVICE_ROLE_KEY
   );
   
   const { data } = await supabase.auth.admin.generateLink({
     type: 'magiclink',
     email: $json.email,
     options: {
       redirectTo: 'https://yourdomain.com/auth/callback'
     }
   });
   
   return { magicLink: data.properties.action_link };
   ```

5. **Email (SMTP)** (Send email)
   - Configure your SMTP provider
   - Send invitation email with magic link

---

## Approach 3: Replace Magic Link Login

For login magic links, you can intercept the request and send via n8n.

### Step 1: Modify Auth Form

Instead of calling `supabase.auth.signInWithOtp()`, call your API:

```typescript
// In AuthForm.tsx
const response = await fetch('/api/send-magic-link', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: email.trim() }),
});
```

### Step 2: Create API Route

`/app/api/send-magic-link/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { email } = await request.json();
  
  // Generate magic link via Supabase Admin API
  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Send to n8n webhook
  await fetch(process.env.N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      magicLink: data.properties.action_link,
      type: 'login',
    }),
  });

  return NextResponse.json({ success: true });
}
```

### Step 3: n8n Workflow

**Workflow**: "Send Magic Link Email"

**Nodes**:
1. **Webhook** (Trigger)
2. **Email (SMTP)** (Send email with magic link)

---

## Recommended Setup: Hybrid Approach

**Best of both worlds**:

1. **Keep Supabase Auth** for user management and session handling
2. **Use n8n** for sending emails via your SMTP provider
3. **Use Database Webhooks** to trigger n8n when users are created

### Benefits:
- ✅ No Supabase email rate limits
- ✅ Full control over email templates
- ✅ Better deliverability
- ✅ Can add complex logic (retries, templates, etc.)
- ✅ Still uses Supabase for auth (secure, reliable)

---

## n8n SMTP Configuration

In your n8n workflow, configure the **Email (SMTP)** node:

### For Gmail:
```
Host: smtp.gmail.com
Port: 587
User: your-email@gmail.com
Password: [App Password]
Secure: STARTTLS
```

### For SendGrid:
```
Host: smtp.sendgrid.net
Port: 587
User: apikey
Password: [Your SendGrid API Key]
Secure: STARTTLS
```

### For Mailgun:
```
Host: smtp.mailgun.org
Port: 587
User: [Your Mailgun SMTP Username]
Password: [Your Mailgun SMTP Password]
Secure: STARTTLS
```

---

## Environment Variables

Add to `.env.local`:

```bash
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/invite-user
N8N_WEBHOOK_SECRET=your-secret-key
```

---

## Testing

1. **Test webhook**: Use n8n's webhook test feature
2. **Test email**: Send a test invitation
3. **Monitor logs**: Check n8n execution logs
4. **Verify delivery**: Check email inbox/spam

---

## Advantages of n8n Approach

- ✅ **No rate limits** (use your SMTP provider's limits)
- ✅ **Visual workflow** editor
- ✅ **Error handling** and retries
- ✅ **Email templates** with variables
- ✅ **Logging** and monitoring
- ✅ **Conditional logic** (different emails for different roles)
- ✅ **Integration** with other services (Slack, SMS, etc.)

---

## Example: Complete Invitation Workflow

```
Webhook (Trigger)
  ↓
Function (Extract & Validate)
  ↓
Supabase (Get Company Info)
  ↓
Function (Generate Magic Link)
  ↓
Email (SMTP) - Send Invitation
  ↓
Slack (Optional) - Notify Admin
  ↓
Set (Save to Database) - Log Sent
```

This gives you full control while keeping Supabase's robust auth system!
