# Team Domain Mapping Configuration Guide

## Overview
Team domain mapping allows users to be automatically assigned to teams based on their email domain when they sign up. For example, all users with `@acme.com` emails will automatically join the "ACME Corporation" team.

## How to Configure Domain Mappings

### 1. Using SQL (Recommended)

Run the following SQL in your Supabase SQL editor:

```sql
-- Create a team first (if it doesn't exist)
INSERT INTO public.teams (name, description)
VALUES ('Your Company Name', 'Description of your company')
ON CONFLICT (name) DO NOTHING;

-- Map email domain to team
INSERT INTO public.team_domain_mapping (email_domain, team_id)
SELECT '@yourcompany.com', id
FROM public.teams
WHERE name = 'Your Company Name'
ON CONFLICT (email_domain) DO UPDATE
SET team_id = EXCLUDED.team_id;
```

### 2. Using Supabase Dashboard

1. Navigate to your Supabase project
2. Go to **Table Editor** → `team_domain_mapping`
3. Click **Insert row**
4. Add:
   - `email_domain`: The domain (e.g., `@company.com`)
   - `team_id`: Select the team UUID from the dropdown
5. Click **Save**

### 3. Programmatically via API

Create a team admin interface to manage domain mappings:

```typescript
// Add domain mapping (requires team admin role)
const { error } = await supabase
  .from('team_domain_mapping')
  .insert({
    email_domain: '@newdomain.com',
    team_id: 'team-uuid-here'
  })
```

## Important Notes

### Email Domain Format
- Always include the `@` symbol: `@company.com` ✓
- Don't use just the domain: `company.com` ✗
- Subdomains are supported: `@sub.company.com` ✓

### Priority and Conflicts
- Each email domain can only map to ONE team
- If updating an existing mapping, it will overwrite the previous team assignment
- New users are assigned to teams during signup
- Existing users are NOT retroactively assigned

### Testing Domain Mappings

Test which team an email would be assigned to:

```sql
-- Replace with the email you want to test
WITH test_email AS (
    SELECT 'john@acme.com' as email
)
SELECT 
    te.email,
    tdm.email_domain,
    t.name as assigned_team
FROM test_email te
LEFT JOIN public.team_domain_mapping tdm 
    ON te.email LIKE '%' || tdm.email_domain
LEFT JOIN public.teams t ON tdm.team_id = t.id;
```

### View All Current Mappings

```sql
SELECT 
    tdm.email_domain,
    t.name as team_name,
    COUNT(tm.user_id) as current_members
FROM public.team_domain_mapping tdm
JOIN public.teams t ON tdm.team_id = t.id
LEFT JOIN public.team_members tm ON tm.team_id = t.id
GROUP BY tdm.email_domain, t.name
ORDER BY tdm.email_domain;
```

## Common Use Cases

### 1. Corporate Email Domains
Map all company emails to the company team:
- `@acme.com` → "ACME Corporation"
- `@techstart.io` → "TechStart Inc"

### 2. Partner/Contractor Domains
Map partner company emails to specific teams:
- `@partner.com` → "Partner Team"
- `@contractors.net` → "Contractor Access"

### 3. Department-Specific Mapping
Map subdomains to department teams:
- `@sales.company.com` → "Sales Team"
- `@engineering.company.com` → "Engineering Team"

### 4. Demo/Test Accounts
Map test domains for demo purposes:
- `@demo.com` → "Demo Team"
- `@test.local` → "Test Environment"

## Automation with Edge Function

The automatic team assignment happens via the Supabase Edge Function when users sign up. The function:

1. Extracts the domain from the user's email
2. Looks up the domain in `team_domain_mapping`
3. Automatically adds the user to the matched team
4. Falls back to manual team selection if no match

## Troubleshooting

### User Not Assigned to Team
1. Check if domain mapping exists
2. Verify email domain format includes `@`
3. Ensure the Edge Function is deployed and running
4. Check Edge Function logs for errors

### Wrong Team Assignment
1. Check for conflicting domain mappings
2. Verify the correct team_id is mapped
3. Test with the SQL query above

### Bulk User Migration
To assign existing users to teams based on their email domain:

```sql
-- Dry run first - see what would happen
SELECT 
    u.email,
    u.name,
    tdm.email_domain,
    t.name as would_join_team
FROM public.users u
JOIN public.team_domain_mapping tdm 
    ON u.email LIKE '%' || tdm.email_domain
JOIN public.teams t ON tdm.team_id = t.id
LEFT JOIN public.team_members tm 
    ON tm.user_id = u.id AND tm.team_id = t.id
WHERE tm.user_id IS NULL; -- Only show users not already in the team

-- Then run the actual assignment
INSERT INTO public.team_members (user_id, team_id, role)
SELECT 
    u.id,
    t.id,
    'member' as role
FROM public.users u
JOIN public.team_domain_mapping tdm 
    ON u.email LIKE '%' || tdm.email_domain
JOIN public.teams t ON tdm.team_id = t.id
LEFT JOIN public.team_members tm 
    ON tm.user_id = u.id AND tm.team_id = t.id
WHERE tm.user_id IS NULL -- Only add if not already a member
ON CONFLICT (user_id, team_id) DO NOTHING;
```