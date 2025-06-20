-- EMERGENCY FIX FOR LOGIN ISSUE
-- Run this SQL in your Supabase SQL Editor to fix the login problem

-- 1. Update the RLS policy to allow users to always see themselves
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

-- 2. Ensure Demo Company team exists
INSERT INTO public.teams (name, description)
VALUES ('Demo Company', 'Demo and test accounts')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- 3. Assign existing demo users to Demo Company team
DO $$
DECLARE
    demo_team_id UUID;
    user_rec RECORD;
BEGIN
    -- Get the Demo Company team ID
    SELECT id INTO demo_team_id
    FROM public.teams
    WHERE name = 'Demo Company'
    LIMIT 1;
    
    IF demo_team_id IS NOT NULL THEN
        -- Assign all demo users to the Demo Company team
        FOR user_rec IN 
            SELECT id, email, role
            FROM public.users
            WHERE email IN ('owner@demo.com', 'employee@demo.com')
        LOOP
            INSERT INTO public.team_members (user_id, team_id, role)
            VALUES (
                user_rec.id, 
                demo_team_id, 
                CASE 
                    WHEN user_rec.role = 'business_owner' THEN 'admin'
                    ELSE 'member'
                END
            )
            ON CONFLICT (user_id, team_id) DO UPDATE
            SET role = CASE 
                WHEN user_rec.role = 'business_owner' THEN 'admin'
                ELSE 'member'
            END;
        END LOOP;
    END IF;
END $$;

-- 4. Update domain mapping for demo.com
INSERT INTO public.team_domain_mapping (domain_name, team_id)
SELECT '@demo.com', id
FROM public.teams
WHERE name = 'Demo Company'
ON CONFLICT (domain_name) DO UPDATE
SET team_id = EXCLUDED.team_id;

-- 5. Show current status
SELECT 
    u.email,
    u.role as user_role,
    t.name as team_name,
    tm.role as team_role
FROM public.users u
LEFT JOIN public.team_members tm ON u.id = tm.user_id
LEFT JOIN public.teams t ON tm.team_id = t.id
WHERE u.email IN ('owner@demo.com', 'employee@demo.com')
ORDER BY u.email;