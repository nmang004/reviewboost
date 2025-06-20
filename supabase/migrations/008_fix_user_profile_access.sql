-- Fix User Profile Access for Login
-- This migration fixes the RLS policy that was preventing users from seeing their own profiles during login

-- ============================================================================
-- 1. UPDATE USERS TABLE RLS POLICY TO ALWAYS ALLOW SELF-ACCESS
-- ============================================================================

-- Drop the current restrictive policy
DROP POLICY IF EXISTS "Users can view teammates" ON public.users;

-- Create a new policy that always allows users to see themselves
-- and teammates when they exist
CREATE POLICY "Users can view self and teammates" ON public.users
  FOR SELECT
  USING (
    -- User can ALWAYS see themselves (this is critical for login)
    users.id = auth.uid()
    OR
    -- User can see others who share at least one team (if teams exist)
    EXISTS (
      SELECT 1 FROM public.team_members tm1
      JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.user_id = auth.uid()
      AND tm2.user_id = users.id
    )
  );

-- ============================================================================
-- 2. ENSURE DEMO USERS ARE PROPERLY ASSIGNED TO TEAMS
-- ============================================================================

-- This will run the manual assignment for existing demo users
-- to ensure they're in the Demo Company team
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
            
            RAISE NOTICE 'Assigned user % to Demo Company team as %', 
                user_rec.email, 
                CASE WHEN user_rec.role = 'business_owner' THEN 'admin' ELSE 'member' END;
        END LOOP;
    ELSE
        RAISE NOTICE 'Demo Company team not found - creating it';
        
        -- Create Demo Company team if it doesn't exist
        INSERT INTO public.teams (name, description)
        VALUES ('Demo Company', 'Demo and test accounts')
        RETURNING id INTO demo_team_id;
        
        -- Now assign users
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
            );
            
            RAISE NOTICE 'Assigned user % to new Demo Company team as %', 
                user_rec.email, 
                CASE WHEN user_rec.role = 'business_owner' THEN 'admin' ELSE 'member' END;
        END LOOP;
    END IF;
END $$;

-- ============================================================================
-- 3. CREATE FUNCTION TO HANDLE NEW USER PROFILE CREATION
-- ============================================================================

-- This function will be called during the sign-up process to ensure
-- users get proper profiles and team assignments
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
    user_email TEXT;
    user_name TEXT;
    user_role TEXT;
    domain_name TEXT;
    team_rec RECORD;
    user_team_role TEXT := 'member';
BEGIN
    -- Get user details from auth.users
    SELECT email, raw_user_meta_data->>'name', raw_user_meta_data->>'role'
    INTO user_email, user_name, user_role
    FROM auth.users 
    WHERE id = NEW.id;
    
    -- Create user profile in public.users if it doesn't exist
    INSERT INTO public.users (id, email, name, role)
    VALUES (
        NEW.id,
        user_email,
        COALESCE(user_name, split_part(user_email, '@', 1)),
        COALESCE(user_role, 'employee')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, users.name),
        role = COALESCE(EXCLUDED.role, users.role);
    
    -- Extract domain for team assignment
    domain_name := '@' || split_part(user_email, '@', 2);
    
    -- Find team by domain mapping
    SELECT t.* INTO team_rec
    FROM public.team_domain_mapping tdm
    JOIN public.teams t ON tdm.team_id = t.id
    WHERE tdm.domain_name = domain_name;
    
    -- If no domain mapping, use Demo Company team as default
    IF team_rec IS NULL THEN
        SELECT * INTO team_rec
        FROM public.teams
        WHERE name = 'Demo Company'
        LIMIT 1;
    END IF;
    
    -- If still no team, create Demo Company team
    IF team_rec IS NULL THEN
        INSERT INTO public.teams (name, description)
        VALUES ('Demo Company', 'Default team for new users')
        RETURNING * INTO team_rec;
    END IF;
    
    -- Determine user role in team
    IF user_role = 'business_owner' THEN
        user_team_role := 'admin';
    END IF;
    
    -- Assign user to team
    INSERT INTO public.team_members (user_id, team_id, role)
    VALUES (NEW.id, team_rec.id, user_team_role)
    ON CONFLICT (user_id, team_id) DO UPDATE SET
        role = EXCLUDED.role;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the auth process
    RAISE WARNING 'Error in handle_new_user_signup: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. CREATE TRIGGER FOR AUTOMATIC USER PROFILE CREATION
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to handle new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();

-- ============================================================================
-- 5. VERIFICATION
-- ============================================================================

-- Show current user-team assignments
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== USER-TEAM ASSIGNMENTS ===';
    RAISE NOTICE '';
    
    FOR r IN 
        SELECT 
            u.email,
            u.role as user_role,
            t.name as team_name,
            tm.role as team_role
        FROM public.users u
        LEFT JOIN public.team_members tm ON u.id = tm.user_id
        LEFT JOIN public.teams t ON tm.team_id = t.id
        ORDER BY u.email
    LOOP
        RAISE NOTICE 'User: % (%) -> Team: % as %', 
            r.email, 
            COALESCE(r.user_role, 'unknown'),
            COALESCE(r.team_name, 'No team'),
            COALESCE(r.team_role, 'N/A');
    END LOOP;
END $$;