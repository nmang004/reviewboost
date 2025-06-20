-- Team Isolation Test (No Custom Functions)
-- This test avoids function ownership issues by using direct SQL queries

-- ============================================================================
-- 1. SETUP TEST DATA
-- ============================================================================

-- Create test teams
INSERT INTO public.teams (id, name, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Test Team Alpha', 'First test team for isolation testing'),
  ('22222222-2222-2222-2222-222222222222', 'Test Team Beta', 'Second test team for isolation testing')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Use existing users if available, otherwise create test users
DO $$
DECLARE
  user_count INTEGER;
  alice_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  bob_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  charlie_id UUID := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  diana_id UUID := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
BEGIN
  -- Check if we have enough existing users
  SELECT COUNT(*) INTO user_count FROM public.users;
  
  RAISE NOTICE '=== SETUP PHASE ===';
  RAISE NOTICE 'Found % existing users in the system', user_count;
  
  -- If we have fewer than 4 users, try to create test users
  IF user_count < 4 THEN
    RAISE NOTICE 'Creating test users for isolation testing...';
    
    BEGIN
      -- Try to create auth.users entries first
      INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at, 
        created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
      ) VALUES
        (alice_id, '00000000-0000-0000-0000-000000000000', 'alice.test@alpha.com', 'test_password', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "Alice Test", "role": "employee"}', 'authenticated', 'authenticated'),
        (bob_id, '00000000-0000-0000-0000-000000000000', 'bob.test@beta.com', 'test_password', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "Bob Test", "role": "employee"}', 'authenticated', 'authenticated'),
        (charlie_id, '00000000-0000-0000-0000-000000000000', 'charlie.test@alpha.com', 'test_password', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "Charlie Test", "role": "business_owner"}', 'authenticated', 'authenticated'),
        (diana_id, '00000000-0000-0000-0000-000000000000', 'diana.test@beta.com', 'test_password', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "Diana Test", "role": "business_owner"}', 'authenticated', 'authenticated')
      ON CONFLICT (id) DO NOTHING;
      
      -- Create public.users entries
      INSERT INTO public.users (id, email, name, role) VALUES
        (alice_id, 'alice.test@alpha.com', 'Alice Test', 'employee'),
        (bob_id, 'bob.test@beta.com', 'Bob Test', 'employee'),
        (charlie_id, 'charlie.test@alpha.com', 'Charlie Test', 'business_owner'),
        (diana_id, 'diana.test@beta.com', 'Diana Test', 'business_owner')
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role;
      
      RAISE NOTICE 'Test users created successfully';
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not create test users (this is ok if you have existing users): %', SQLERRM;
    END;
  END IF;
  
  -- Assign users to teams (using first 4 users if test users weren't created)
  DECLARE
    user_records RECORD;
    user_ids UUID[] := ARRAY[]::UUID[];
    team_alpha UUID := '11111111-1111-1111-1111-111111111111';
    team_beta UUID := '22222222-2222-2222-2222-222222222222';
  BEGIN
    -- Get available user IDs
    FOR user_records IN 
      SELECT id FROM public.users ORDER BY created_at LIMIT 4
    LOOP
      user_ids := array_append(user_ids, user_records.id);
    END LOOP;
    
    IF array_length(user_ids, 1) >= 4 THEN
      -- Assign first two users to Team Alpha
      INSERT INTO public.team_members (user_id, team_id, role) VALUES
        (user_ids[1], team_alpha, 'member'),
        (user_ids[3], team_alpha, 'admin')
      ON CONFLICT (user_id, team_id) DO UPDATE SET role = EXCLUDED.role;
      
      -- Assign last two users to Team Beta
      INSERT INTO public.team_members (user_id, team_id, role) VALUES
        (user_ids[2], team_beta, 'member'),
        (user_ids[4], team_beta, 'admin')
      ON CONFLICT (user_id, team_id) DO UPDATE SET role = EXCLUDED.role;
      
      RAISE NOTICE 'Team assignments completed';
      
      -- Create some test data
      INSERT INTO public.reviews (id, customer_name, job_type, has_photo, keywords, employee_id, team_id) VALUES
        ('12345678-1111-1111-1111-111111111111', 'Customer A1', 'Consulting', true, 'excellent service professional', user_ids[1], team_alpha),
        ('12345678-2222-2222-2222-222222222222', 'Customer B1', 'Support', false, 'helpful responsive quick', user_ids[2], team_beta)
      ON CONFLICT (id) DO UPDATE SET
        customer_name = EXCLUDED.customer_name,
        job_type = EXCLUDED.job_type,
        keywords = EXCLUDED.keywords;
      
      INSERT INTO public.points (id, employee_id, points, team_id) VALUES
        ('87654321-1111-1111-1111-111111111111', user_ids[1], 150, team_alpha),
        ('87654321-2222-2222-2222-222222222222', user_ids[2], 120, team_beta)
      ON CONFLICT (id) DO UPDATE SET points = EXCLUDED.points;
      
      RAISE NOTICE 'Test data created';
    ELSE
      RAISE NOTICE 'Not enough users available for testing';
    END IF;
  END;
END $$;

-- ============================================================================
-- 2. BASIC RLS TESTING (WITHOUT CUSTOM FUNCTIONS)
-- ============================================================================

DO $$
DECLARE
  test_user_id UUID;
  user_record RECORD;
  team_record RECORD;
  review_count INTEGER;
  points_count INTEGER;
  users_count INTEGER;
  teams_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEAM ISOLATION TEST RESULTS ===';
  RAISE NOTICE '';
  
  -- Test with each user
  FOR user_record IN 
    SELECT u.id, u.email, u.name, tm.team_id, t.name as team_name, tm.role as team_role
    FROM public.users u
    LEFT JOIN public.team_members tm ON u.id = tm.user_id
    LEFT JOIN public.teams t ON tm.team_id = t.id
    ORDER BY u.created_at
    LIMIT 4
  LOOP
    RAISE NOTICE '--- Testing with user: % (Team: %) ---', user_record.email, COALESCE(user_record.team_name, 'No team');
    
    -- Simulate setting user context (this would normally be done by RLS)
    -- Note: This is a simplified test - real RLS testing requires auth context
    
    -- Count reviews this user should be able to see
    SELECT COUNT(*) INTO review_count 
    FROM public.reviews r 
    WHERE user_record.team_id IS NULL OR r.team_id = user_record.team_id;
    
    RAISE NOTICE 'Reviews visible: %', review_count;
    
    -- Count points this user should be able to see  
    SELECT COUNT(*) INTO points_count
    FROM public.points p
    WHERE user_record.team_id IS NULL OR p.team_id = user_record.team_id;
    
    RAISE NOTICE 'Points records visible: %', points_count;
    
    -- Count users this user should be able to see (teammates)
    SELECT COUNT(*) INTO users_count
    FROM public.users u
    JOIN public.team_members tm1 ON u.id = tm1.user_id
    WHERE user_record.team_id IS NULL OR tm1.team_id = user_record.team_id;
    
    RAISE NOTICE 'Teammate users visible: %', users_count;
    
    -- Count teams this user should be able to see
    SELECT COUNT(*) INTO teams_count
    FROM public.teams t
    JOIN public.team_members tm ON t.id = tm.team_id
    WHERE user_record.team_id IS NULL OR tm.user_id = user_record.id;
    
    RAISE NOTICE 'Teams visible: %', teams_count;
    RAISE NOTICE '';
  END LOOP;
  
  RAISE NOTICE '=== HELPER FUNCTION TESTS ===';
  RAISE NOTICE '';
  
  -- Test helper functions with first user
  SELECT id INTO test_user_id FROM public.users ORDER BY created_at LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Test team access functions
    FOR team_record IN SELECT id, name FROM public.teams WHERE name LIKE 'Test Team%'
    LOOP
      RAISE NOTICE 'User % access to team %: %', 
        test_user_id, 
        team_record.name,
        public.user_has_team_access(test_user_id, team_record.id);
      
      RAISE NOTICE 'User % admin access to team %: %', 
        test_user_id, 
        team_record.name,
        public.user_has_team_access(test_user_id, team_record.id, 'admin');
    END LOOP;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== CURRENT TEAM ASSIGNMENTS ===';
  RAISE NOTICE '';
  
  FOR user_record IN 
    SELECT 
      u.email,
      u.role as user_role,
      COALESCE(t.name, 'No team') as team_name,
      COALESCE(tm.role, 'N/A') as team_role
    FROM public.users u
    LEFT JOIN public.team_members tm ON u.id = tm.user_id
    LEFT JOIN public.teams t ON tm.team_id = t.id
    ORDER BY u.email
  LOOP
    RAISE NOTICE 'User: % (%) -> Team: % as %', 
      user_record.email, 
      user_record.user_role,
      user_record.team_name,
      user_record.team_role;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST SUMMARY ===';
  RAISE NOTICE 'This simplified test shows:';
  RAISE NOTICE '1. Data visibility based on team membership';
  RAISE NOTICE '2. Helper function results for team access';  
  RAISE NOTICE '3. Current team assignments';
  RAISE NOTICE '';
  RAISE NOTICE 'Note: Full RLS testing requires authenticated user context';
  RAISE NOTICE 'which can only be properly tested through the application.';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- 3. CLEANUP (OPTIONAL)
-- ============================================================================

-- Uncomment to clean up test data
/*
DELETE FROM public.points WHERE id IN ('87654321-1111-1111-1111-111111111111', '87654321-2222-2222-2222-222222222222');
DELETE FROM public.reviews WHERE id IN ('12345678-1111-1111-1111-111111111111', '12345678-2222-2222-2222-222222222222');
DELETE FROM public.team_members WHERE team_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
DELETE FROM public.teams WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
-- Only delete test users if they were created by this script
DELETE FROM public.users WHERE email LIKE '%.test@%';
DELETE FROM auth.users WHERE email LIKE '%.test@%';
*/