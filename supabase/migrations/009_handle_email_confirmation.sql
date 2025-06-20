-- Handle user profile creation after email confirmation
-- This trigger ensures user profiles are created when users confirm their email

-- Create or replace function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
    domain_text TEXT;
    target_team_id UUID;
    user_role_text TEXT := 'member';
BEGIN
    -- Only proceed if user is confirmed (has email_confirmed_at)
    IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
        -- Extract domain from email
        domain_text := '@' || split_part(NEW.email, '@', 2);
        
        -- Create user profile if it doesn't exist
        INSERT INTO public.users (id, email, name, role)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
            COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
        )
        ON CONFLICT (id) DO NOTHING;
        
        -- Find team based on domain mapping
        SELECT team_id INTO target_team_id
        FROM public.team_domain_mapping
        WHERE domain_name = domain_text;
        
        -- If no domain mapping found, use default team
        IF target_team_id IS NULL THEN
            SELECT id INTO target_team_id
            FROM public.teams
            WHERE name = 'Default Team'
            LIMIT 1;
            
            -- Create default team if it doesn't exist
            IF target_team_id IS NULL THEN
                INSERT INTO public.teams (name, description)
                VALUES ('Default Team', 'Default team for users without domain mapping')
                RETURNING id INTO target_team_id;
            END IF;
            
            -- If user is business owner, make them admin of default team
            IF NEW.raw_user_meta_data->>'role' = 'business_owner' THEN
                user_role_text := 'admin';
            END IF;
        END IF;
        
        -- Add user to team
        IF target_team_id IS NOT NULL THEN
            INSERT INTO public.team_members (user_id, team_id, role)
            VALUES (NEW.id, target_team_id, user_role_text)
            ON CONFLICT (user_id, team_id) DO NOTHING;
        END IF;
        
        RAISE LOG 'User profile created and assigned to team for %', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;

-- Create trigger for when users confirm their email
CREATE TRIGGER on_auth_user_confirmed
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_signup();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.teams TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.team_members TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.team_domain_mapping TO postgres, anon, authenticated, service_role;