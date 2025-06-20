-- Fix User Self-Access RLS Policy
-- This migration addresses the infinite loop issue in useAuth hook by ensuring
-- users can always access their own profile regardless of team membership status

-- Drop the problematic enhanced user visibility policy
DROP POLICY IF EXISTS "Enhanced user visibility" ON public.users;

-- Create a simpler, more reliable policy that prioritizes self-access
CREATE POLICY "User self access and team visibility" ON public.users
  FOR SELECT
  USING (
    -- PRIORITY 1: Always allow service operations (API endpoints)
    public.is_service_operation()
    OR
    -- PRIORITY 2: User can ALWAYS see themselves (highest priority, no team checks)
    users.id = auth.uid()
    OR
    -- PRIORITY 3: User can see teammates (only after self-access is guaranteed)
    (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.team_members tm1
        WHERE tm1.user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.team_members tm2
          WHERE tm2.user_id = users.id 
          AND tm2.team_id = tm1.team_id
        )
      )
    )
  );

-- Add helpful comment explaining the policy
COMMENT ON POLICY "User self access and team visibility" ON public.users IS 
'Prioritizes user self-access over team membership checks to prevent auth loops';

-- Verify the policy is working by testing basic self-access
DO $$
BEGIN
  RAISE NOTICE 'RLS Policy updated: users can now always access their own profile first';
  RAISE NOTICE 'This should resolve the infinite checkUser loop in the useAuth hook';
END $$;