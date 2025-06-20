-- Test the Edge Function with existing users
-- This simulates what happens when the webhook fires

-- First, let's see which users need team assignment
SELECT 
    au.id,
    au.email,
    u.name,
    tm.team_id,
    t.name as team_name
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
LEFT JOIN public.team_members tm ON u.id = tm.user_id
LEFT JOIN public.teams t ON tm.team_id = t.id
WHERE tm.team_id IS NULL;  -- Users not in any team

-- Test the manual assignment function for existing users
DO $$
DECLARE
    result RECORD;
BEGIN
    -- Try to assign demo users if they're not already assigned
    FOR result IN 
        SELECT * FROM public.manually_assign_user_to_team('employee@demo.com')
    LOOP
        RAISE NOTICE 'employee@demo.com: % - %', result.success, result.message;
    END LOOP;
    
    FOR result IN 
        SELECT * FROM public.manually_assign_user_to_team('owner@demo.com')
    LOOP
        RAISE NOTICE 'owner@demo.com: % - %', result.success, result.message;
    END LOOP;
END $$;

-- Show final team assignments
SELECT 
    u.email,
    u.name,
    u.role as user_role,
    t.name as team_name,
    tm.role as team_role,
    tdm.domain_name as team_domain
FROM public.users u
LEFT JOIN public.team_members tm ON u.id = tm.user_id
LEFT JOIN public.teams t ON tm.team_id = t.id
LEFT JOIN public.team_domain_mapping tdm ON t.id = tdm.team_id
ORDER BY u.email;