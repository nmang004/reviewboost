# Clean Migration Setup Guide

## Current State
- ✅ `001_initial_schema.sql` - Base tables (users, reviews, points)
- ✅ `002_add_points_to_reviews.sql` - Points column addition  
- ✅ `003_multi_tenant_schema.sql` - Multi-tenant tables and structure
- ✅ `004_team_rls_policies_fixed.sql` - Row-level security policies
- 🆕 `005_team_setup_and_domain_mapping.sql` - Constraints, teams, and domain mapping

## What the New Migration Does

### 1. Adds Missing Constraints
- Unique constraint on team names
- Unique constraint on domain names
- Only adds if they don't already exist (safe to re-run)

### 2. Fixes the Trigger
- Handles cases where `auth.uid()` is NULL
- Works both from SQL console and application

### 3. Creates Demo Team
- Creates "Demo Company" team
- Assigns owner@demo.com as admin
- Assigns employee@demo.com as member
- Safe to re-run (handles conflicts)

### 4. Sets Up Domain Mapping
- Maps @demo.com → Demo Company team
- New users with @demo.com emails will auto-join

### 5. Helper Function
- `create_team_with_domain()` for easy team creation
- Can be called from your application

## To Run This Migration

1. **In Supabase Dashboard:**
   - Go to SQL Editor
   - Paste and run `005_team_setup_and_domain_mapping.sql`
   - You should see success messages in the output

2. **Verify Success:**
   ```sql
   -- Check teams and mappings
   SELECT 
       t.name as team_name,
       tdm.domain_name,
       COUNT(tm.user_id) as members
   FROM public.teams t
   LEFT JOIN public.team_domain_mapping tdm ON t.id = tdm.team_id
   LEFT JOIN public.team_members tm ON t.id = tm.team_id
   GROUP BY t.name, tdm.domain_name;
   ```

## Adding Your Own Teams

After running the migration, add custom teams:

```sql
-- Option 1: Simple team creation
INSERT INTO public.teams (name, description)
VALUES ('ACME Corp', 'ACME Corporation team');

-- Option 2: With domain mapping
SELECT * FROM public.create_team_with_domain(
    'ACME Corp',
    'ACME Corporation team', 
    '@acme.com',
    NULL  -- Will use current user if in app context
);
```

## Files to Delete

Remove these files as they're no longer needed:
- All files in `/supabase/seed/` directory
- Migration files: 004_team_rls_policies_fixed.sql, all 005_fix_*.sql files

## Next Steps

1. Deploy the Edge Function for automatic team assignment
2. Test the system with new user signups
3. Verify team isolation is working correctly