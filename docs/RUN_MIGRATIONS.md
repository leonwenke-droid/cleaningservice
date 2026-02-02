# Running Migrations with psql

## Step 1: Get Database Connection String

1. Go to: https://supabase.com/dashboard/project/ioqbwswfmkusrtxwduov/settings/database
2. Scroll down to "Connection string" section
3. Click on "URI" tab
4. Copy the connection string (it will look like):
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
   OR use the "Session mode" connection string (port 5432)

## Step 2: Run the Migration

From your project directory, run:

```bash
cd /Users/londinium06/Desktop/GebäudereinigungBock

# Replace [CONNECTION_STRING] with your actual connection string
psql "[CONNECTION_STRING]" -f supabase/migrations/0006_checklist_system.sql
```

## Step 3: Run the Seed Data

```bash
psql "[CONNECTION_STRING]" -f supabase/seed_checklist_v1.sql
```

## Alternative: Using Environment Variable

You can also set the connection string as an environment variable:

```bash
export SUPABASE_DB_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"

psql "$SUPABASE_DB_URL" -f supabase/migrations/0006_checklist_system.sql
psql "$SUPABASE_DB_URL" -f supabase/seed_checklist_v1.sql
```

## Troubleshooting

- **Connection refused**: Make sure you're using the correct port (6543 for pooler, 5432 for direct)
- **Password prompt**: If it asks for a password, you can include it in the connection string or enter it when prompted
- **SSL required**: Supabase requires SSL. If you get SSL errors, add `?sslmode=require` to the connection string
