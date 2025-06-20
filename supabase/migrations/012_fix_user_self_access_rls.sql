-- Fix RLS policy to prevent authentication infinite loops
-- This migration ensures users can ALWAYS access their own profile data
-- without depending on complex team membership queries that can create race conditions

-- Drop the current policy that may be causing authentication loops
DROP POLICY IF EXISTS "User self access and team visibility" ON public.users;

-- Create a simplified policy that prioritizes self-access
CREATE POLICY "User self access and team visibility" ON public.users
  FOR SELECT
  USING (
    -- PRIORITY 1: Always allow service operations (API endpoints)
    public.is_service_operation()
    OR
    -- PRIORITY 2: User can ALWAYS see themselves (highest priority, no team checks)
    -- This MUST work during authentication without any dependencies
    users.id = auth.uid()
    OR
    -- PRIORITY 3: User can see teammates (only after self-access is guaranteed)
    -- Simplified team check to reduce complexity and race conditions
    (
      auth.uid() IS NOT NULL
      AND users.id IN (
        SELECT tm2.user_id 
        FROM public.team_members tm1
        JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
        WHERE tm1.user_id = auth.uid()
      )
    )
  );

-- Ensure the policy is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Add a comment explaining the fix
COMMENT ON POLICY "User self access and team visibility" ON public.users IS 
'Fixed version that prioritizes user self-access to prevent authentication loops. 
Users can always see their own profile (users.id = auth.uid()) without any 
complex dependencies that could cause race conditions during login.';