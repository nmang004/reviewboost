-- Migration script to ensure review data is accessible
-- This migrates the existing review to the user's team

-- First, check what teams and users exist
SELECT 'Current users:' as info;
SELECT id, email, role FROM users;

SELECT 'Current teams:' as info;
SELECT id, name FROM teams;

SELECT 'Current team memberships:' as info;
SELECT tm.user_id, u.email, tm.team_id, t.name as team_name, tm.role 
FROM team_members tm
JOIN users u ON u.id = tm.user_id
JOIN teams t ON t.id = tm.team_id;

SELECT 'Current reviews:' as info;
SELECT id, customer_name, team_id, employee_id, created_at FROM reviews;

-- Update the existing review to belong to the user's team
-- This assumes the user ow@demo.com will have a team created by ProfileInitializer
UPDATE reviews 
SET team_id = (
  SELECT tm.team_id 
  FROM team_members tm 
  JOIN users u ON u.id = tm.user_id 
  WHERE u.email = 'ow@demo.com' 
  LIMIT 1
)
WHERE team_id = 'f568ad74-cb94-4ebe-9fbd-171c77a5c9b9';

-- Verify the update
SELECT 'Reviews after migration:' as info;
SELECT r.id, r.customer_name, r.team_id, t.name as team_name, u.email as user_email
FROM reviews r
JOIN teams t ON t.id = r.team_id
JOIN team_members tm ON tm.team_id = t.id
JOIN users u ON u.id = tm.user_id;