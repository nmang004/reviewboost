# Authentication Setup Guide

The login error occurs because the demo users in the database don't have authentication credentials. Here are three ways to fix this:

## Option 1: Create Users via Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://otfdhhljpebixszvubac.supabase.co
2. Navigate to **Authentication > Users**
3. Click **"Add User"** and create these users:

   **Employee User:**
   - Email: `employee@demo.com`
   - Password: `demo123`
   - Email Confirm: ✅ (enabled)
   - User Metadata: `{"name": "John Employee", "role": "employee"}`

   **Business Owner:**
   - Email: `owner@demo.com` 
   - Password: `demo123`
   - Email Confirm: ✅ (enabled)
   - User Metadata: `{"name": "Demo Owner", "role": "business_owner"}`

## Option 2: Use Service Role Key Script

1. Get your service role key from Supabase:
   - Go to: https://otfdhhljpebixszvubac.supabase.co/project/default/settings/api
   - Copy the "service_role" key (not the anon key)

2. Run the setup script:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key node create-demo-users.js
   ```

## Option 3: Manual SQL + Auth Creation

1. First, run the database migration in Supabase SQL Editor:
   - Go to: https://otfdhhljpebixszvubac.supabase.co/project/default/sql
   - Copy and run the SQL from: `supabase/migrations/001_initial_schema.sql`

2. Then create auth users manually via Supabase Dashboard (see Option 1)

## Verification

After creating the users, test the login:
- Employee: `employee@demo.com` / `demo123`
- Business Owner: `owner@demo.com` / `demo123`

## Important Notes

- The database schema creates user profiles automatically via trigger
- You need BOTH auth users (for login) AND database profiles (for app data)
- The current migration only creates database profiles, not auth credentials
- The app requires the auth users to exist for login to work

## Current Status

✅ Database schema is set up
✅ Environment variables are configured  
❌ Demo auth users need to be created