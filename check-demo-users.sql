-- Check current state of demo users e@demo.com and o@demo.com

-- 1. Check if users exist in auth.users
SELECT 
    'auth.users' as source,
    email,
    id,
    created_at,
    email_confirmed_at IS NOT NULL as email_confirmed,
    raw_user_meta_data
FROM auth.users 
WHERE email IN ('e@demo.com', 'o@demo.com')
ORDER BY email;

-- 2. Check if users exist in public.users
SELECT 
    'public.users' as source,
    email,
    id,
    name,
    role,
    created_at
FROM public.users 
WHERE email IN ('e@demo.com', 'o@demo.com')
ORDER BY email;

-- 3. Check team memberships
SELECT 
    u.email,
    u.role as user_role,
    t.name as team_name,
    tm.role as team_role,
    tm.created_at as joined_team_at
FROM public.users u
LEFT JOIN public.team_members tm ON u.id = tm.user_id
LEFT JOIN public.teams t ON tm.team_id = t.id
WHERE u.email IN ('e@demo.com', 'o@demo.com')
ORDER BY u.email;

-- 4. Check current RLS policies on users table
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';