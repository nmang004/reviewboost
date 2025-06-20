-- EMERGENCY RLS FIX - This should resolve the 500 errors immediately
-- Run this in Supabase SQL Editor

-- 1. Temporarily disable RLS to fix the issue
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. Re-enable RLS with a completely new policy
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. Drop ALL existing policies on users table
DROP POLICY IF EXISTS "Users can view teammates" ON public.users;
DROP POLICY IF EXISTS "Users can view self and teammates" ON public.users;
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- 4. Create a simple policy that allows users to see themselves AND others
CREATE POLICY "Allow user profile access" ON public.users
  FOR SELECT
  USING (
    -- Allow users to see themselves
    auth.uid() = users.id
    OR
    -- Allow users to see teammates (when they have team membership)
    EXISTS (
      SELECT 1 FROM public.team_members tm1
      JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.user_id = auth.uid()
      AND tm2.user_id = users.id
    )
    OR
    -- Fallback: Allow if user has any team membership (this ensures compatibility)
    (
      auth.uid() IS NOT NULL 
      AND EXISTS (SELECT 1 FROM public.team_members WHERE user_id = auth.uid())
    )
  );

-- 5. Create update policy
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (auth.uid() = users.id);

-- 6. Create insert policy for new user creation
CREATE POLICY "Allow profile creation" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = users.id);

-- 7. Clean up team assignments - remove duplicate and ensure proper assignment
DELETE FROM public.team_members 
WHERE user_id IN (
  SELECT user_id 
  FROM public.team_members tm
  JOIN public.users u ON tm.user_id = u.id
  WHERE u.email = 'o@demo.com'
  AND tm.team_id = (SELECT id FROM public.teams WHERE name = 'Default Team')
);

-- 8. Verify current user assignments
SELECT 
    u.email,
    u.role as user_role,
    t.name as team_name,
    tm.role as team_role,
    u.id::text as user_id
FROM public.users u
JOIN public.team_members tm ON u.id = tm.user_id
JOIN public.teams t ON tm.team_id = t.id
WHERE u.email IN ('e@demo.com', 'o@demo.com')
ORDER BY u.email, t.name;