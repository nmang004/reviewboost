-- Setup Database Webhook for Auto Team Assignment
-- This creates a webhook that triggers the Edge Function when new users are created

-- Note: This webhook needs to be created via Supabase Dashboard
-- Go to: Database > Webhooks > Create a new webhook

-- Webhook Configuration:
-- Name: auto-assign-team-webhook
-- Table: auth.users
-- Events: INSERT
-- Type: Supabase Edge Functions
-- Edge Function: auto-assign-team
-- HTTP Headers: Leave default
-- Payload: Default (entire record)

-- For now, let's create a helper function that can be called manually to test team assignment
CREATE OR REPLACE FUNCTION public.manually_assign_user_to_team(user_email TEXT)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    assigned_team_name TEXT
) AS $$
DECLARE
    user_rec RECORD;
    domain_name TEXT;
    team_rec RECORD;
BEGIN
    -- Find the user
    SELECT * INTO user_rec
    FROM public.users
    WHERE email = user_email
    LIMIT 1;
    
    IF user_rec IS NULL THEN
        RETURN QUERY SELECT FALSE, 'User not found'::TEXT, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Check if user is already in a team
    SELECT t.name INTO team_rec
    FROM public.team_members tm
    JOIN public.teams t ON tm.team_id = t.id
    WHERE tm.user_id = user_rec.id
    LIMIT 1;
    
    IF team_rec IS NOT NULL THEN
        RETURN QUERY SELECT TRUE, 'User already in team'::TEXT, team_rec.name;
        RETURN;
    END IF;
    
    -- Extract domain
    domain_name := '@' || split_part(user_email, '@', 2);
    
    -- Look for domain mapping
    SELECT t.* INTO team_rec
    FROM public.team_domain_mapping tdm
    JOIN public.teams t ON tdm.team_id = t.id
    WHERE tdm.domain_name = domain_name;
    
    IF team_rec IS NULL THEN
        -- No domain mapping, use default team
        SELECT * INTO team_rec
        FROM public.teams
        WHERE name = 'Default Team'
        LIMIT 1;
        
        IF team_rec IS NULL THEN
            -- Create default team
            INSERT INTO public.teams (name, description)
            VALUES ('Default Team', 'Default team for users without domain mapping')
            RETURNING * INTO team_rec;
        END IF;
    END IF;
    
    -- Assign user to team
    INSERT INTO public.team_members (user_id, team_id, role)
    VALUES (
        user_rec.id, 
        team_rec.id, 
        CASE WHEN user_rec.role = 'business_owner' THEN 'admin' ELSE 'member' END
    )
    ON CONFLICT (user_id, team_id) DO NOTHING;
    
    RETURN QUERY SELECT TRUE, 'User assigned to team'::TEXT, team_rec.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test function to verify team assignment is working
DO $$
DECLARE
    result RECORD;
BEGIN
    -- Test with existing demo users
    FOR result IN 
        SELECT * FROM public.manually_assign_user_to_team('employee@demo.com')
    LOOP
        RAISE NOTICE 'employee@demo.com: % - % (Team: %)', 
            CASE WHEN result.success THEN 'Success' ELSE 'Failed' END,
            result.message,
            COALESCE(result.assigned_team_name, 'None');
    END LOOP;
    
    FOR result IN 
        SELECT * FROM public.manually_assign_user_to_team('owner@demo.com')
    LOOP
        RAISE NOTICE 'owner@demo.com: % - % (Team: %)', 
            CASE WHEN result.success THEN 'Success' ELSE 'Failed' END,
            result.message,
            COALESCE(result.assigned_team_name, 'None');
    END LOOP;
END $$;

-- Instructions for setting up the webhook:
COMMENT ON FUNCTION public.manually_assign_user_to_team IS 
'Manual team assignment function for testing. 
To enable automatic assignment, create a Database Webhook in Supabase Dashboard:
1. Go to Database > Webhooks
2. Create new webhook on auth.users table for INSERT events
3. Set it to trigger the auto-assign-team Edge Function';