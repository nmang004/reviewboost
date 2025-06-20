-- Complete Team Setup and Domain Mapping
-- This migration handles constraints, team creation, and domain mapping setup

-- ============================================================================
-- 1. ADD MISSING CONSTRAINTS
-- ============================================================================

-- Add unique constraint on team names if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_name_key') THEN
        ALTER TABLE public.teams ADD CONSTRAINT teams_name_key UNIQUE (name);
    END IF;
END $$;

-- Add unique constraint on domain_name if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_domain_mapping_domain_name_key') THEN
        ALTER TABLE public.team_domain_mapping ADD CONSTRAINT team_domain_mapping_domain_name_key UNIQUE (domain_name);
    END IF;
END $$;

-- ============================================================================
-- 2. FIX THE TRIGGER TO HANDLE NULL auth.uid()
-- ============================================================================

-- Drop and recreate the trigger function with better NULL handling
CREATE OR REPLACE FUNCTION public.handle_new_team()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add creator as admin if auth.uid() is not null
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.team_members (user_id, team_id, role)
    VALUES (auth.uid(), NEW.id, 'admin')
    ON CONFLICT (user_id, team_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. CREATE DEFAULT TEAMS (without relying on auth context)
-- ============================================================================

-- Create teams using a DO block to handle existing teams gracefully
DO $$
DECLARE
    demo_team_id UUID;
    owner_user_id UUID;
BEGIN
    -- First, create the Demo Company team
    INSERT INTO public.teams (id, name, description)
    VALUES (gen_random_uuid(), 'Demo Company', 'Demo and test accounts')
    ON CONFLICT (name) DO UPDATE
    SET description = EXCLUDED.description
    RETURNING id INTO demo_team_id;

    -- Get the business owner demo user
    SELECT id INTO owner_user_id 
    FROM public.users 
    WHERE email = 'owner@demo.com' 
    LIMIT 1;

    -- If we have both team and user, make the owner an admin
    IF demo_team_id IS NOT NULL AND owner_user_id IS NOT NULL THEN
        INSERT INTO public.team_members (user_id, team_id, role)
        VALUES (owner_user_id, demo_team_id, 'admin')
        ON CONFLICT (user_id, team_id) DO UPDATE
        SET role = 'admin';
    END IF;

    -- Add the employee demo user as a member
    INSERT INTO public.team_members (user_id, team_id, role)
    SELECT id, demo_team_id, 'member'
    FROM public.users
    WHERE email = 'employee@demo.com'
    ON CONFLICT (user_id, team_id) DO NOTHING;
END $$;

-- ============================================================================
-- 4. SET UP DOMAIN MAPPINGS
-- ============================================================================

-- Configure domain mapping for demo.com
INSERT INTO public.team_domain_mapping (domain_name, team_id)
SELECT '@demo.com', id
FROM public.teams
WHERE name = 'Demo Company'
ON CONFLICT (domain_name) DO UPDATE
SET team_id = EXCLUDED.team_id;

-- ============================================================================
-- 5. CREATE HELPER FUNCTION FOR MANUAL TEAM CREATION
-- ============================================================================

-- Function to create a team with domain mapping (for use from application)
CREATE OR REPLACE FUNCTION public.create_team_with_domain(
    team_name TEXT,
    team_description TEXT,
    domain_name TEXT DEFAULT NULL,
    creator_id UUID DEFAULT NULL
)
RETURNS TABLE (team_id UUID, success BOOLEAN, message TEXT) AS $$
DECLARE
    new_team_id UUID;
    admin_id UUID;
BEGIN
    -- Use creator_id if provided, otherwise use auth.uid()
    admin_id := COALESCE(creator_id, auth.uid());
    
    -- Create the team
    INSERT INTO public.teams (name, description)
    VALUES (team_name, team_description)
    RETURNING id INTO new_team_id;
    
    -- Add creator as admin if we have a user ID
    IF admin_id IS NOT NULL THEN
        INSERT INTO public.team_members (user_id, team_id, role)
        VALUES (admin_id, new_team_id, 'admin');
    END IF;
    
    -- Add domain mapping if provided
    IF domain_name IS NOT NULL THEN
        INSERT INTO public.team_domain_mapping (domain_name, team_id)
        VALUES (domain_name, new_team_id);
    END IF;
    
    RETURN QUERY SELECT new_team_id, true, 'Team created successfully'::TEXT;
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT NULL::UUID, false, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. VERIFY SETUP
-- ============================================================================

-- Show current teams and their domain mappings
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== TEAM SETUP COMPLETE ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Teams and Domain Mappings:';
    
    FOR r IN 
        SELECT 
            t.name as team_name,
            tdm.domain_name,
            COUNT(DISTINCT tm.user_id) as member_count
        FROM public.teams t
        LEFT JOIN public.team_domain_mapping tdm ON t.id = tdm.team_id
        LEFT JOIN public.team_members tm ON t.id = tm.team_id
        GROUP BY t.name, tdm.domain_name
        ORDER BY t.name
    LOOP
        RAISE NOTICE '  Team: %, Domain: %, Members: %', 
            r.team_name, 
            COALESCE(r.domain_name, 'No mapping'), 
            r.member_count;
    END LOOP;
END $$;