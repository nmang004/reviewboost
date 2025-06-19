-- Multi-Tenant Team System Migration
-- This migration transforms the single-tenant ReviewBoost into a multi-tenant team-based system

-- ============================================================================
-- 1. CREATE CORE TEAM TABLES
-- ============================================================================

-- Teams table: Stores team information
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Team members junction table: Manages user membership and roles within teams
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, team_id)
);

-- Team domain mapping: Enables automatic team assignment based on email domain
CREATE TABLE IF NOT EXISTS public.team_domain_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  domain_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(domain_name)
);

-- Dashboard widgets: Stores team-specific dashboard data
CREATE TABLE IF NOT EXISTS public.dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL CHECK (widget_type IN ('kpi', 'chart', 'table', 'metric')),
  title TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 2. ADD TEAM_ID TO EXISTING TABLES
-- ============================================================================

-- Add team_id to reviews table for team isolation
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;

-- Add team_id to points table for team-scoped leaderboards
ALTER TABLE public.points 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;

-- ============================================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Team members indexes
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON public.team_members(role);

-- Reviews team index
CREATE INDEX IF NOT EXISTS idx_reviews_team_id ON public.reviews(team_id);

-- Points team index
CREATE INDEX IF NOT EXISTS idx_points_team_id ON public.points(team_id);

-- Dashboard widgets indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_team_id ON public.dashboard_widgets(team_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_type ON public.dashboard_widgets(widget_type);

-- Domain mapping index
CREATE INDEX IF NOT EXISTS idx_team_domain_mapping_domain ON public.team_domain_mapping(domain_name);

-- ============================================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_domain_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is member of a team
CREATE OR REPLACE FUNCTION public.is_team_member(user_uuid UUID, team_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE user_id = user_uuid AND team_id = team_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin of a team
CREATE OR REPLACE FUNCTION public.is_team_admin(user_uuid UUID, team_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE user_id = user_uuid AND team_id = team_uuid AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's team memberships
CREATE OR REPLACE FUNCTION public.get_user_teams(user_uuid UUID)
RETURNS TABLE(team_id UUID, team_name TEXT, user_role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name, tm.role
  FROM public.teams t
  JOIN public.team_members tm ON t.id = tm.team_id
  WHERE tm.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add user to team (admin only)
CREATE OR REPLACE FUNCTION public.add_user_to_team(
  target_user_id UUID,
  target_team_id UUID,
  user_role TEXT DEFAULT 'member'
)
RETURNS BOOLEAN AS $$
DECLARE
  calling_user_id UUID;
BEGIN
  -- Get the calling user's ID
  calling_user_id := auth.uid();
  
  -- Check if calling user is admin of the target team
  IF NOT public.is_team_admin(calling_user_id, target_team_id) THEN
    RAISE EXCEPTION 'Only team admins can add users to teams';
  END IF;
  
  -- Validate role
  IF user_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'Invalid role. Must be admin or member';
  END IF;
  
  -- Insert the new team member
  INSERT INTO public.team_members (user_id, team_id, role)
  VALUES (target_user_id, target_team_id, user_role)
  ON CONFLICT (user_id, team_id) 
  DO UPDATE SET role = EXCLUDED.role, joined_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove user from team (admin only)
CREATE OR REPLACE FUNCTION public.remove_user_from_team(
  target_user_id UUID,
  target_team_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  calling_user_id UUID;
BEGIN
  -- Get the calling user's ID
  calling_user_id := auth.uid();
  
  -- Check if calling user is admin of the target team
  IF NOT public.is_team_admin(calling_user_id, target_team_id) THEN
    RAISE EXCEPTION 'Only team admins can remove users from teams';
  END IF;
  
  -- Don't allow removing the last admin
  IF public.is_team_admin(target_user_id, target_team_id) THEN
    IF (SELECT COUNT(*) FROM public.team_members WHERE team_id = target_team_id AND role = 'admin') <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last admin from a team';
    END IF;
  END IF;
  
  -- Remove the team member
  DELETE FROM public.team_members 
  WHERE user_id = target_user_id AND team_id = target_team_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update widget data
CREATE OR REPLACE FUNCTION public.update_widget_data(
  widget_id UUID,
  new_data JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  widget_team_id UUID;
  calling_user_id UUID;
BEGIN
  -- Get the calling user's ID
  calling_user_id := auth.uid();
  
  -- Get the widget's team ID
  SELECT team_id INTO widget_team_id 
  FROM public.dashboard_widgets 
  WHERE id = widget_id;
  
  -- Check if user is member of the widget's team
  IF NOT public.is_team_member(calling_user_id, widget_team_id) THEN
    RAISE EXCEPTION 'Access denied: user not member of widget team';
  END IF;
  
  -- Update the widget data
  UPDATE public.dashboard_widgets 
  SET data = new_data, last_updated = NOW()
  WHERE id = widget_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. CREATE DEFAULT TEAM FOR EXISTING DATA
-- ============================================================================

-- Create a default team for existing users and data
INSERT INTO public.teams (id, name, description)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Team',
  'Default team for existing ReviewBoost users'
) ON CONFLICT (id) DO NOTHING;

-- Add all existing users to the default team
INSERT INTO public.team_members (user_id, team_id, role)
SELECT 
  id,
  '00000000-0000-0000-0000-000000000001',
  CASE WHEN role = 'business_owner' THEN 'admin' ELSE 'member' END
FROM public.users
ON CONFLICT (user_id, team_id) DO NOTHING;

-- Assign all existing reviews to the default team
UPDATE public.reviews 
SET team_id = '00000000-0000-0000-0000-000000000001'
WHERE team_id IS NULL;

-- Assign all existing points to the default team
UPDATE public.points 
SET team_id = '00000000-0000-0000-0000-000000000001'
WHERE team_id IS NULL;

-- ============================================================================
-- 7. MAKE TEAM_ID REQUIRED (AFTER DATA MIGRATION)
-- ============================================================================

-- Make team_id NOT NULL after migration
ALTER TABLE public.reviews 
ALTER COLUMN team_id SET NOT NULL;

ALTER TABLE public.points 
ALTER COLUMN team_id SET NOT NULL;

-- ============================================================================
-- 8. UPDATE TRIGGERS
-- ============================================================================

-- Update the user creation trigger to handle team assignment
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  user_domain TEXT;
  target_team_id UUID;
BEGIN
  -- Extract domain from email
  user_domain := split_part(NEW.email, '@', 2);
  
  -- Insert user profile
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  );
  
  -- Check if there's a team mapping for this domain
  SELECT team_id INTO target_team_id
  FROM public.team_domain_mapping
  WHERE domain_name = user_domain;
  
  -- If team mapping exists, add user to that team
  IF target_team_id IS NOT NULL THEN
    INSERT INTO public.team_members (user_id, team_id, role)
    VALUES (NEW.id, target_team_id, 'member');
  ELSE
    -- Otherwise, add to default team
    INSERT INTO public.team_members (user_id, team_id, role)
    VALUES (
      NEW.id, 
      '00000000-0000-0000-0000-000000000001',
      CASE WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'employee') = 'business_owner' 
           THEN 'admin' 
           ELSE 'member' 
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. ADD UPDATED_AT TRIGGER FOR TEAMS
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to teams table
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger to dashboard_widgets table
CREATE TRIGGER update_dashboard_widgets_updated_at
  BEFORE UPDATE ON public.dashboard_widgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();