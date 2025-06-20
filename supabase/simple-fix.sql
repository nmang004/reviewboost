-- SIMPLE IMMEDIATE FIX - Run this first to stop the 500 errors

-- Drop the restrictive policy and create a simpler one
DROP POLICY IF EXISTS "Users can view teammates" ON public.users;
DROP POLICY IF EXISTS "Users can view self and teammates" ON public.users;

-- Create a policy that allows authenticated users to see all users (like before)
-- This removes the team restriction temporarily
CREATE POLICY "Authenticated users can view profiles" ON public.users
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Keep the update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (auth.uid() = users.id);