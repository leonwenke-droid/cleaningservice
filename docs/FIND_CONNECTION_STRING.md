# How to Find Your Supabase Database Connection String

## Step-by-Step Instructions

1. **Go to your Supabase Dashboard:**
   - Open: https://supabase.com/dashboard/project/ioqbwswfmkusrtxwduov

2. **Navigate to Database Settings:**
   - In the left sidebar, click **"Settings"** (gear icon at the bottom)
   - Then click **"Database"** in the settings menu

3. **Find Connection String:**
   - Scroll down to the section titled **"Connection string"**
   - You'll see tabs: `URI`, `JDBC`, `Golang`, `Python`, `Node.js`, etc.
   - Click on the **"URI"** tab
   - You'll see a connection string that looks like:
     ```
     postgresql://postgres.ioqbwswfmkusrtxwduov:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
     ```
   - **Important:** The password is hidden. Click the **eye icon** or **"Show"** button to reveal it
   - Copy the entire string (including the password)

4. **Alternative - Direct Connection (port 5432):**
   - In the same "Connection string" section
   - Look for **"Session mode"** or **"Direct connection"**
   - Use that connection string instead (it uses port 5432 instead of 6543)

## If You Can't Find the Password

If the password is not visible:

1. Go to: **Settings** → **Database** → **Database password**
2. You can reset it or view it there
3. Then construct the connection string manually:
   ```
   postgresql://postgres.ioqbwswfmkusrtxwduov:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   ```

## Quick Test

Once you have the connection string, test it:

```bash
psql "[YOUR_CONNECTION_STRING]" -c "SELECT version();"
```

If it works, you'll see the PostgreSQL version.
