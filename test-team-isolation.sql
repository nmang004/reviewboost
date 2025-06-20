-- Test Team Isolation for ReviewBoost RLS Policies
-- This script tests that the enhanced RLS policies properly isolate team data

-- ============================================================================
-- 1. SETUP TEST DATA
-- ============================================================================

-- Create test teams
INSERT INTO public.teams (id, name, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Team Alpha', 'First test team'),
  ('22222222-2222-2222-2222-222222222222', 'Team Beta', 'Second test team')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Create test users in auth.users first (bypassing foreign key constraint for testing)
-- Note: In production, users are created through Supabase Auth signup process
INSERT INTO auth.users (
  id, 
  instance_id, 
  email, 
  encrypted_password, 
  email_confirmed_at, 
  created_at, 
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'alice@alpha.com', 'test_password', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "Alice Alpha", "role": "employee"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'bob@beta.com', 'test_password', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "Bob Beta", "role": "employee"}', 'authenticated', 'authenticated'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000000', 'charlie@alpha.com', 'test_password', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "Charlie Alpha", "role": "business_owner"}', 'authenticated', 'authenticated'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000000', 'diana@beta.com', 'test_password', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{"name": "Diana Beta", "role": "business_owner"}', 'authenticated', 'authenticated')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data;

-- Create test users in public.users (this will work now that auth.users entries exist)
INSERT INTO public.users (id, email, name, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'alice@alpha.com', 'Alice Alpha', 'employee'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bob@beta.com', 'Bob Beta', 'employee'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'charlie@alpha.com', 'Charlie Alpha', 'business_owner'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'diana@beta.com', 'Diana Beta', 'business_owner')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role;

-- Assign users to teams
INSERT INTO public.team_members (user_id, team_id, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'member'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'member'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'admin')
ON CONFLICT (user_id, team_id) DO UPDATE SET
  role = EXCLUDED.role;

-- Create test reviews for each team (using correct schema)
INSERT INTO public.reviews (id, customer_name, job_type, has_photo, keywords, employee_id, team_id) VALUES
  ('rev11111-1111-1111-1111-111111111111', 'Customer A1', 'Consulting', true, 'excellent service professional', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'),
  ('rev22222-2222-2222-2222-222222222222', 'Customer B1', 'Support', false, 'helpful responsive quick', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO UPDATE SET
  customer_name = EXCLUDED.customer_name,
  job_type = EXCLUDED.job_type,
  keywords = EXCLUDED.keywords;

-- Create test points for each team (using correct schema)
INSERT INTO public.points (id, employee_id, points, team_id) VALUES
  ('pt111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 150, '11111111-1111-1111-1111-111111111111'),
  ('pt222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 120, '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO UPDATE SET
  points = EXCLUDED.points;

-- ============================================================================
-- 2. TEST FUNCTIONS
-- ============================================================================

-- Function to simulate authenticated context
CREATE OR REPLACE FUNCTION test_with_user(user_uuid UUID, test_name TEXT, query_text TEXT)
RETURNS TABLE(test_result TEXT, row_count BIGINT, error_message TEXT) AS $$
DECLARE
  result_count BIGINT := 0;
  error_msg TEXT := NULL;
BEGIN
  -- Set the authenticated user context
  PERFORM set_config('request.jwt.claims', json_build_object('sub', user_uuid)::text, true);
  PERFORM set_config('role', 'authenticated', true);
  
  BEGIN
    -- Execute the test query and count results
    EXECUTE 'SELECT COUNT(*) FROM (' || query_text || ') AS test_query' INTO result_count;
  EXCEPTION WHEN OTHERS THEN
    error_msg := SQLERRM;
    result_count := -1;
  END;
  
  RETURN QUERY SELECT test_name, result_count, error_msg;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. RUN ISOLATION TESTS
-- ============================================================================

DO $$
DECLARE
  test_result RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEAM ISOLATION TEST RESULTS ===';
  RAISE NOTICE '';
  
  -- Test 1: Alice (Team Alpha member) should see only Team Alpha data
  RAISE NOTICE '--- Test 1: Alice (Team Alpha) access ---';
  
  FOR test_result IN 
    SELECT * FROM test_with_user(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'Alice - Team Alpha users',
      'SELECT * FROM public.users WHERE id != ''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'''
    )
  LOOP
    RAISE NOTICE 'Test: % | Count: % | Error: %', test_result.test_result, test_result.row_count, COALESCE(test_result.error_message, 'None');
  END LOOP;
  
  FOR test_result IN 
    SELECT * FROM test_with_user(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'Alice - Reviews access',
      'SELECT * FROM public.reviews'
    )
  LOOP
    RAISE NOTICE 'Test: % | Count: % | Error: %', test_result.test_result, test_result.row_count, COALESCE(test_result.error_message, 'None');
  END LOOP;
  
  FOR test_result IN 
    SELECT * FROM test_with_user(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'Alice - Points access',
      'SELECT * FROM public.points'
    )
  LOOP
    RAISE NOTICE 'Test: % | Count: % | Error: %', test_result.test_result, test_result.row_count, COALESCE(test_result.error_message, 'None');
  END LOOP;
  
  -- Test 2: Bob (Team Beta member) should see only Team Beta data
  RAISE NOTICE '';
  RAISE NOTICE '--- Test 2: Bob (Team Beta) access ---';
  
  FOR test_result IN 
    SELECT * FROM test_with_user(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'Bob - Team Beta users',
      'SELECT * FROM public.users WHERE id != ''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'''
    )
  LOOP
    RAISE NOTICE 'Test: % | Count: % | Error: %', test_result.test_result, test_result.row_count, COALESCE(test_result.error_message, 'None');
  END LOOP;
  
  FOR test_result IN 
    SELECT * FROM test_with_user(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'Bob - Reviews access',
      'SELECT * FROM public.reviews'
    )
  LOOP
    RAISE NOTICE 'Test: % | Count: % | Error: %', test_result.test_result, test_result.row_count, COALESCE(test_result.error_message, 'None');
  END LOOP;
  
  FOR test_result IN 
    SELECT * FROM test_with_user(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'Bob - Points access',
      'SELECT * FROM public.points'
    )
  LOOP
    RAISE NOTICE 'Test: % | Count: % | Error: %', test_result.test_result, test_result.row_count, COALESCE(test_result.error_message, 'None');
  END LOOP;
  
  -- Test 3: Cross-team access should be blocked
  RAISE NOTICE '';
  RAISE NOTICE '--- Test 3: Cross-team isolation verification ---';
  
  -- Alice trying to see Bob's team data (should be 0)
  FOR test_result IN 
    SELECT * FROM test_with_user(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'Alice - Bob team data (should be 0)',
      'SELECT * FROM public.reviews WHERE team_id = ''22222222-2222-2222-2222-222222222222'''
    )
  LOOP
    RAISE NOTICE 'Test: % | Count: % | Error: %', test_result.test_result, test_result.row_count, COALESCE(test_result.error_message, 'None');
  END LOOP;
  
  -- Bob trying to see Alice's team data (should be 0)
  FOR test_result IN 
    SELECT * FROM test_with_user(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'Bob - Alice team data (should be 0)',
      'SELECT * FROM public.reviews WHERE team_id = ''11111111-1111-1111-1111-111111111111'''
    )
  LOOP
    RAISE NOTICE 'Test: % | Count: % | Error: %', test_result.test_result, test_result.row_count, COALESCE(test_result.error_message, 'None');
  END LOOP;
  
  -- Test 4: Admin access within teams
  RAISE NOTICE '';
  RAISE NOTICE '--- Test 4: Admin access verification ---';
  
  FOR test_result IN 
    SELECT * FROM test_with_user(
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'Charlie (Team Alpha Admin) - Reviews',
      'SELECT * FROM public.reviews'
    )
  LOOP
    RAISE NOTICE 'Test: % | Count: % | Error: %', test_result.test_result, test_result.row_count, COALESCE(test_result.error_message, 'None');
  END LOOP;
  
  -- Test 5: Helper functions
  RAISE NOTICE '';
  RAISE NOTICE '--- Test 5: Helper functions ---';
  
  -- Test team access function
  RAISE NOTICE 'Alice access to Team Alpha: %', public.user_has_team_access('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111');
  RAISE NOTICE 'Alice access to Team Beta: %', public.user_has_team_access('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222');
  RAISE NOTICE 'Alice admin access to Team Alpha: %', public.user_has_team_access('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin');
  RAISE NOTICE 'Charlie admin access to Team Alpha: %', public.user_has_team_access('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'admin');
  
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST SUMMARY ===';
  RAISE NOTICE 'Expected results:';
  RAISE NOTICE '- Alice should see 1 Team Alpha teammate (Charlie)';
  RAISE NOTICE '- Alice should see 1 review (from Team Alpha)';
  RAISE NOTICE '- Alice should see 1 points record (from Team Alpha)';
  RAISE NOTICE '- Bob should see 1 Team Beta teammate (Diana)';
  RAISE NOTICE '- Bob should see 1 review (from Team Beta)';
  RAISE NOTICE '- Cross-team access should return 0 records';
  RAISE NOTICE '- Helper functions should return appropriate boolean values';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- 4. CLEANUP
-- ============================================================================

-- Clean up test data (optional - comment out if you want to keep test data)
/*
-- Clean up in reverse order due to foreign key constraints
DELETE FROM public.points WHERE id IN ('pt111111-1111-1111-1111-111111111111', 'pt222222-2222-2222-2222-222222222222');
DELETE FROM public.reviews WHERE id IN ('rev11111-1111-1111-1111-111111111111', 'rev22222-2222-2222-2222-222222222222');
DELETE FROM public.team_members WHERE team_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
DELETE FROM public.users WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'dddddddd-dddd-dddd-dddd-dddddddddddd');
DELETE FROM public.teams WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
-- Clean up auth.users entries (if permissions allow)
DELETE FROM auth.users WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'dddddddd-dddd-dddd-dddd-dddddddddddd');
*/

-- Drop test function
DROP FUNCTION IF EXISTS test_with_user(UUID, TEXT, TEXT);