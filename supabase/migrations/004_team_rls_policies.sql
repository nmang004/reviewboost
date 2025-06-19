-- Row-Level Security Policies for Multi-Tenant Team System
-- This migration implements strict data isolation between teams

-- ============================================================================
-- 1. DROP EXISTING PERMISSIVE POLICIES
-- ============================================================================

-- Drop existing policies that allow global access
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Everyone can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Everyone can view points" ON public.points;
DROP POLICY IF EXISTS "System can manage points" ON public.points;

-- ============================================================================
-- 2. TEAMS TABLE RLS POLICIES
-- ============================================================================

-- Users can only see teams they are members of
CREATE POLICY "Users can view their teams" ON public.teams
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
    )
  );

-- Only team admins can update team information
CREATE POLICY "Team admins can update team info" ON public.teams
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
    )
  );

-- Only authenticated users can create teams (they automatically become admin)
CREATE POLICY "Authenticated users can create teams" ON public.teams
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only team admins can delete teams
CREATE POLICY "Team admins can delete teams" ON public.teams
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
    )
  );

-- ============================================================================
-- 3. TEAM_MEMBERS TABLE RLS POLICIES
-- ============================================================================

-- Users can view team members of teams they belong to
CREATE POLICY "Team members can view team membership" ON public.team_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
    )
  );

-- Only team admins can add new members
CREATE POLICY "Team admins can add members" ON public.team_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_members.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
    )
  );

-- Only team admins can update member roles
CREATE POLICY "Team admins can update member roles" ON public.team_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'admin'
    )
  );

-- Team admins can remove members, users can remove themselves
CREATE POLICY "Team admins can remove members or users can leave" ON public.team_members
  FOR DELETE
  USING (
    -- User can remove themselves
    team_members.user_id = auth.uid()
    OR
    -- Team admin can remove others
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'admin'
    )
  );

-- ============================================================================
-- 4. TEAM_DOMAIN_MAPPING TABLE RLS POLICIES
-- ============================================================================

-- Only team admins can view domain mappings for their teams
CREATE POLICY "Team admins can view domain mappings" ON public.team_domain_mapping
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_domain_mapping.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
    )
  );

-- Only team admins can create domain mappings
CREATE POLICY "Team admins can create domain mappings" ON public.team_domain_mapping
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_domain_mapping.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
    )
  );

-- Only team admins can update domain mappings
CREATE POLICY "Team admins can update domain mappings" ON public.team_domain_mapping
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_domain_mapping.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
    )
  );

-- Only team admins can delete domain mappings
CREATE POLICY "Team admins can delete domain mappings" ON public.team_domain_mapping
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_domain_mapping.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
    )
  );

-- ============================================================================
-- 5. DASHBOARD_WIDGETS TABLE RLS POLICIES
-- ============================================================================

-- Team members can view team dashboard widgets
CREATE POLICY "Team members can view dashboard widgets" ON public.dashboard_widgets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = dashboard_widgets.team_id
      AND team_members.user_id = auth.uid()
    )
  );

-- Team admins can create dashboard widgets
CREATE POLICY "Team admins can create dashboard widgets" ON public.dashboard_widgets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = dashboard_widgets.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
    )
  );

-- Team admins can update dashboard widgets
CREATE POLICY "Team admins can update dashboard widgets" ON public.dashboard_widgets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = dashboard_widgets.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
    )
  );

-- Team admins can delete dashboard widgets
CREATE POLICY "Team admins can delete dashboard widgets" ON public.dashboard_widgets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = dashboard_widgets.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
    )
  );

-- ============================================================================
-- 6. UPDATED USERS TABLE RLS POLICIES
-- ============================================================================

-- Users can view other users only if they share at least one team
CREATE POLICY "Users can view teammates" ON public.users
  FOR SELECT
  USING (
    -- User can always see themselves
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

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- 7. UPDATED REVIEWS TABLE RLS POLICIES (TEAM-SCOPED)
-- ============================================================================

-- Team members can view reviews from their teams only
CREATE POLICY "Team members can view team reviews" ON public.reviews
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = reviews.team_id
      AND team_members.user_id = auth.uid()
    )
  );

-- Team members can create reviews for their own teams only
CREATE POLICY "Team members can create team reviews" ON public.reviews
  FOR INSERT
  WITH CHECK (
    -- User must be member of the team
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = reviews.team_id
      AND team_members.user_id = auth.uid()
    )
    AND
    -- Employee_id must belong to the same team
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = reviews.team_id
      AND team_members.user_id = reviews.employee_id
    )
  );

-- Team admins can update reviews in their teams
CREATE POLICY "Team admins can update team reviews" ON public.reviews
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = reviews.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
    )
  );

-- Team admins can delete reviews in their teams
CREATE POLICY "Team admins can delete team reviews" ON public.reviews
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = reviews.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
    )
  );

-- ============================================================================
-- 8. UPDATED POINTS TABLE RLS POLICIES (TEAM-SCOPED)
-- ============================================================================

-- Team members can view points from their teams only
CREATE POLICY "Team members can view team points" ON public.points
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = points.team_id
      AND team_members.user_id = auth.uid()
    )
  );

-- System can create points for team members (via API)
CREATE POLICY "System can create team member points" ON public.points
  FOR INSERT
  WITH CHECK (
    -- Employee must be member of the team
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = points.team_id
      AND team_members.user_id = points.employee_id
    )
  );

-- System can update points for team members (via API)
CREATE POLICY "System can update team member points" ON public.points
  FOR UPDATE
  USING (
    -- Employee must be member of the team
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = points.team_id
      AND team_members.user_id = points.employee_id
    )
  );

-- Team admins can delete points in their teams
CREATE POLICY "Team admins can delete team points" ON public.points
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = points.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
    )
  );

-- ============================================================================
-- 9. CREATE TRIGGER TO AUTO-ADD TEAM CREATOR AS ADMIN
-- ============================================================================

-- Function to automatically add team creator as admin
CREATE OR REPLACE FUNCTION public.handle_new_team()
RETURNS TRIGGER AS $$
BEGIN
  -- Add the team creator as an admin
  INSERT INTO public.team_members (user_id, team_id, role)
  VALUES (auth.uid(), NEW.id, 'admin');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add team creator as admin
CREATE TRIGGER on_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_team();

-- ============================================================================
-- 10. ADDITIONAL SECURITY FUNCTIONS
-- ============================================================================

-- Function to check if user can access team data
CREATE OR REPLACE FUNCTION public.can_access_team_data(user_uuid UUID, team_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = user_uuid AND team_id = team_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get team-scoped leaderboard
CREATE OR REPLACE FUNCTION public.get_team_leaderboard(team_uuid UUID, limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
  employee_id UUID,
  employee_name TEXT,
  employee_email TEXT,
  total_reviews BIGINT,
  total_points INTEGER,
  rank BIGINT
) AS $$
BEGIN
  -- Check if calling user can access this team's data
  IF NOT public.can_access_team_data(auth.uid(), team_uuid) THEN
    RAISE EXCEPTION 'Access denied: user not member of team';
  END IF;

  RETURN QUERY
  SELECT 
    u.id as employee_id,
    u.name as employee_name,
    u.email as employee_email,
    COUNT(r.id) as total_reviews,
    COALESCE(p.points, 0) as total_points,
    RANK() OVER (ORDER BY COALESCE(p.points, 0) DESC) as rank
  FROM public.users u
  JOIN public.team_members tm ON u.id = tm.user_id
  LEFT JOIN public.reviews r ON u.id = r.employee_id AND r.team_id = team_uuid
  LEFT JOIN public.points p ON u.id = p.employee_id AND p.team_id = team_uuid
  WHERE tm.team_id = team_uuid
  GROUP BY u.id, u.name, u.email, p.points
  ORDER BY COALESCE(p.points, 0) DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get team dashboard stats
CREATE OR REPLACE FUNCTION public.get_team_dashboard_stats(team_uuid UUID)
RETURNS TABLE(
  total_reviews BIGINT,
  total_points BIGINT,
  total_members BIGINT,
  top_employee_name TEXT,
  top_employee_points INTEGER,
  recent_reviews_count BIGINT
) AS $$
BEGIN
  -- Check if calling user can access this team's data
  IF NOT public.can_access_team_data(auth.uid(), team_uuid) THEN
    RAISE EXCEPTION 'Access denied: user not member of team';
  END IF;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.reviews WHERE team_id = team_uuid) as total_reviews,
    (SELECT COALESCE(SUM(points), 0) FROM public.points WHERE team_id = team_uuid) as total_points,
    (SELECT COUNT(*) FROM public.team_members WHERE team_id = team_uuid) as total_members,
    (
      SELECT u.name 
      FROM public.users u 
      JOIN public.points p ON u.id = p.employee_id 
      WHERE p.team_id = team_uuid 
      ORDER BY p.points DESC 
      LIMIT 1
    ) as top_employee_name,
    (
      SELECT p.points 
      FROM public.points p 
      WHERE p.team_id = team_uuid 
      ORDER BY p.points DESC 
      LIMIT 1
    ) as top_employee_points,
    (
      SELECT COUNT(*) 
      FROM public.reviews 
      WHERE team_id = team_uuid 
      AND created_at > NOW() - INTERVAL '7 days'
    ) as recent_reviews_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;