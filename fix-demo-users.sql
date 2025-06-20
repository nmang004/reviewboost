-- EMERGENCY FIX FOR DEMO USERS e@demo.com and o@demo.com
-- Run this SQL in your Supabase SQL Editor

-- 1. First, update the RLS policy to allow users to see themselves
DROP POLICY IF EXISTS "Users can view teammates" ON public.users;
DROP POLICY IF EXISTS "Users can view self and teammates" ON public.users;

CREATE POLICY "Users can view self and teammates" ON public.users
  FOR SELECT
  USING (
    -- User can ALWAYS see themselves (critical for login)
    users.id = auth.uid()
    OR
    -- User can see others who share at least one team
    EXISTS (
      SELECT 1 FROM public.team_members tm1
      JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.user_id = auth.uid()
      AND tm2.user_id = users.id
    )
  );

-- 2. Check if demo users exist in public.users table and their auth.users IDs
DO $$
DECLARE
    demo_team_id UUID;
    employee_auth_id UUID;
    owner_auth_id UUID;
BEGIN
    -- Get auth IDs for demo users
    SELECT id INTO employee_auth_id FROM auth.users WHERE email = 'e@demo.com';
    SELECT id INTO owner_auth_id FROM auth.users WHERE email = 'o@demo.com';
    
    RAISE NOTICE 'Employee auth ID: %', employee_auth_id;
    RAISE NOTICE 'Owner auth ID: %', owner_auth_id;
    
    -- Create/update profiles in public.users table
    IF employee_auth_id IS NOT NULL THEN
        INSERT INTO public.users (id, email, name, role)
        VALUES (employee_auth_id, 'e@demo.com', 'Demo Employee', 'employee')
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            role = EXCLUDED.role;
        RAISE NOTICE 'Created/updated employee profile';
    END IF;
    
    IF owner_auth_id IS NOT NULL THEN
        INSERT INTO public.users (id, email, name, role)
        VALUES (owner_auth_id, 'o@demo.com', 'Demo Owner', 'business_owner')
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            role = EXCLUDED.role;
        RAISE NOTICE 'Created/updated owner profile';
    END IF;
    
    -- Ensure Demo Company team exists
    INSERT INTO public.teams (name, description)
    VALUES ('Demo Company', 'Demo and test accounts')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO demo_team_id;
    
    IF demo_team_id IS NULL THEN
        SELECT id INTO demo_team_id FROM public.teams WHERE name = 'Demo Company';
    END IF;
    
    RAISE NOTICE 'Demo Company team ID: %', demo_team_id;
    
    -- Assign users to team
    IF employee_auth_id IS NOT NULL AND demo_team_id IS NOT NULL THEN
        INSERT INTO public.team_members (user_id, team_id, role)
        VALUES (employee_auth_id, demo_team_id, 'member')
        ON CONFLICT (user_id, team_id) DO UPDATE SET role = 'member';
        RAISE NOTICE 'Assigned employee to Demo Company as member';
    END IF;
    
    IF owner_auth_id IS NOT NULL AND demo_team_id IS NOT NULL THEN
        INSERT INTO public.team_members (user_id, team_id, role)
        VALUES (owner_auth_id, demo_team_id, 'admin')
        ON CONFLICT (user_id, team_id) DO UPDATE SET role = 'admin';
        RAISE NOTICE 'Assigned owner to Demo Company as admin';
    END IF;
    
    -- Set up domain mapping
    IF demo_team_id IS NOT NULL THEN
        INSERT INTO public.team_domain_mapping (domain_name, team_id)
        VALUES ('@demo.com', demo_team_id)
        ON CONFLICT (domain_name) DO UPDATE SET team_id = EXCLUDED.team_id;
        RAISE NOTICE 'Set up domain mapping for @demo.com';
    END IF;
END $$;

-- 3. Verify the setup
SELECT 
    'Auth Users' as table_name,
    email,
    id::text as user_id,
    confirmed_at IS NOT NULL as confirmed
FROM auth.users 
WHERE email IN ('e@demo.com', 'o@demo.com')

UNION ALL

SELECT 
    'Public Users' as table_name,
    email,
    id::text as user_id,
    true as confirmed
FROM public.users 
WHERE email IN ('e@demo.com', 'o@demo.com')

ORDER BY table_name, email;

-- 4. Show team assignments
SELECT 
    u.email,
    u.role as user_role,
    t.name as team_name,
    tm.role as team_role,
    u.id::text as user_id
FROM public.users u
LEFT JOIN public.team_members tm ON u.id = tm.user_id
LEFT JOIN public.teams t ON tm.team_id = t.id
WHERE u.email IN ('e@demo.com', 'o@demo.com')
ORDER BY u.email;