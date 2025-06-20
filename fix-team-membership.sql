-- Fix team membership for ow@demo.com
-- Add user to the team that contains the review data

-- First, let's see the current team memberships
SELECT 
  tm.user_id,
  u.email,
  tm.team_id,
  tm.role
FROM team_members tm
JOIN users u ON u.id = tm.user_id
WHERE u.email = 'ow@demo.com';

-- Add the user to the team with review data (f568ad74-cb94-4ebe-9fbd-171c77a5c9b9)
INSERT INTO team_members (user_id, team_id, role, joined_at)
SELECT 
  u.id,
  'f568ad74-cb94-4ebe-9fbd-171c77a5c9b9'::uuid,
  'admin',
  NOW()
FROM users u
WHERE u.email = 'ow@demo.com'
ON CONFLICT (user_id, team_id) DO NOTHING;

-- Verify the insertion
SELECT 
  tm.user_id,
  u.email,
  tm.team_id,
  tm.role,
  tm.joined_at
FROM team_members tm
JOIN users u ON u.id = tm.user_id
WHERE u.email = 'ow@demo.com';