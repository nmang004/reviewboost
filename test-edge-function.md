# Testing the Auto-Assign Team Edge Function

## Method 1: Test with Existing Users (Manual Assignment)

Run this in SQL Editor to manually assign existing users:

```sql
-- Check current team memberships
SELECT 
    u.email,
    u.name,
    t.name as team_name,
    tm.role as team_role
FROM public.users u
LEFT JOIN public.team_members tm ON u.id = tm.user_id
LEFT JOIN public.teams t ON tm.team_id = t.id
ORDER BY u.email;

-- Manually assign unassigned users
DO $$
DECLARE
    user_rec RECORD;
    result RECORD;
BEGIN
    -- Find users not in any team
    FOR user_rec IN 
        SELECT u.* 
        FROM public.users u
        LEFT JOIN public.team_members tm ON u.id = tm.user_id
        WHERE tm.user_id IS NULL
    LOOP
        -- Try to assign them
        SELECT * INTO result
        FROM public.manually_assign_user_to_team(user_rec.email);
        
        RAISE NOTICE 'Assigned %: %', user_rec.email, result.message;
    END LOOP;
END $$;
```

## Method 2: Test the Edge Function Directly

You can test the Edge Function directly using curl or the Supabase Dashboard:

### From Supabase Dashboard:
1. Go to Edge Functions → auto-assign-team
2. Click "Test" button
3. Use this payload:

```json
{
  "type": "INSERT",
  "table": "users",
  "schema": "auth",
  "record": {
    "id": "test-user-id-123",
    "email": "testuser@demo.com",
    "raw_user_meta_data": {
      "name": "Test User",
      "role": "employee"
    }
  },
  "old_record": null
}
```

### Using curl:
```bash
curl -X POST 'https://otfdhhljpebixszvubac.supabase.co/functions/v1/auto-assign-team' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "INSERT",
    "table": "users",
    "schema": "auth",
    "record": {
      "id": "test-user-id-123",
      "email": "testuser@demo.com",
      "raw_user_meta_data": {
        "name": "Test User",
        "role": "employee"
      }
    }
  }'
```

## Method 3: Create a New Test User

The most realistic test is to create a new user through your app's signup flow:

1. Start your local dev server: `npm run dev`
2. Go to http://localhost:3000/login
3. Sign up with a new email like `newuser@demo.com`
4. Check the Edge Function logs for activity

## Verify Results

After testing, check the results:

```sql
-- See all team assignments
SELECT 
    u.email,
    u.created_at as user_created,
    t.name as team_name,
    tm.role as team_role,
    tm.joined_at as joined_team_at
FROM public.users u
LEFT JOIN public.team_members tm ON u.id = tm.user_id
LEFT JOIN public.teams t ON tm.team_id = t.id
ORDER BY u.created_at DESC;

-- Check Edge Function execution logs
-- Go to: https://supabase.com/dashboard/project/otfdhhljpebixszvubac/functions/auto-assign-team/logs
```

## Troubleshooting

If the Edge Function isn't triggering:

1. **Check webhook is enabled**: Ensure the webhook shows as active (green icon)
2. **Check function deployment**: Make sure the function shows as deployed
3. **Check for errors**: Look in the Edge Function logs for any errors
4. **Verify domain format**: Ensure domain mappings include the @ symbol

## Expected Behavior

When a new user signs up:
- If email ends with `@demo.com` → assigned to "Demo Company" team
- If no domain match → assigned to "Default Team" 
- Business owners become team admins
- Employees become team members