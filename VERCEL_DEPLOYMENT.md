# 🚀 Vercel Deployment Instructions

## Quick Deploy to Vercel

### Step 1: Deploy to Vercel
Click this button to deploy directly:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/nmang004/reviewboost.git)

Or manually:
1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project" 
3. Import from Git: `https://github.com/nmang004/reviewboost.git`

### Step 2: Add Environment Variables
In your Vercel project settings, add:

```
NEXT_PUBLIC_SUPABASE_URL=https://otfdhhljpebixszvubac.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90ZmRoaGxqcGViaXhzenZ1YmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNDQ4ODksImV4cCI6MjA2NTkyMDg4OX0.Dq3qK51S12jOiMdKM8HDb8AYM_HILjgpnXW8xSVEA7A
```

### Step 3: Setup Database (CRITICAL)
🚨 **This step is required before the app will work!**

1. Go to Supabase SQL Editor: https://otfdhhljpebixszvubac.supabase.co/project/default/sql
2. Copy the entire contents of `supabase/migrations/001_initial_schema.sql` from your repo
3. Paste and run the SQL to create tables

### Step 4: Create Demo Users
1. Go to Supabase Auth: https://otfdhhljpebixszvubac.supabase.co/project/default/auth/users
2. Create users:
   - **Employee:** employee@demo.com (password: demo123)
   - **Business Owner:** owner@demo.com (password: demo123)

### Step 5: Test Your App
- Your app will be live at: `https://your-app-name.vercel.app`
- Login with demo credentials
- Submit a review as employee
- View dashboard as business owner

## 🎯 You're Done!
Your ReviewBoost app is now live and ready to motivate your team! 🎉