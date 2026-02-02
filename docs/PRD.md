# Cleaning Infrastructure MVP (generic)

Goal: Build a reusable backbone for cleaning companies.
No WhatsApp integration yet. Use webhooks as input.

Core entities:
company, user(role), customer, site, lead, inspection, checklist, quote, ticket, message_log

State machines:
lead: new -> qualifying -> qualified -> inspection_scheduled -> inspected -> quoted -> won/lost
inspection: open -> in_progress -> submitted -> reviewed
ticket: open -> assigned -> resolved -> closed

Tech:
- Supabase (Postgres, Auth, Storage)
- n8n (workflows)
- Next.js minimal app (lead intake + inspection checklist)
- Photos stored in Supabase Storage
- Multi-tenant: every table has company_id
- RLS enabled from day 1

Deliverables:
1) Supabase SQL migrations + RLS policies
2) Minimal Next.js app with:
   - /lead/new (create lead)
   - /inspection/[id] (fill checklist + upload photos)
   - Auth + role gates (admin/dispatcher/worker)
3) Webhook contracts for n8n
