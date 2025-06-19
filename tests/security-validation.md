# Multi-Tenant Security Validation Tests

This document outlines the security tests that should be performed to validate complete data isolation between teams in the ReviewBoost multi-tenant system.

## Prerequisites

1. Run the database migrations:
   ```bash
   # Apply the multi-tenant schema
   supabase migration up
   ```

2. Deploy the Edge Function:
   ```bash
   # Deploy the auto-assign-team function
   supabase functions deploy auto-assign-team
   ```

3. Set up test data:
   - Create at least 2 teams with different domains
   - Create users in each team
   - Create reviews and points for each team

## Security Test Cases

### 1. Row-Level Security (RLS) Validation

#### Test 1.1: Team Data Isolation
**Purpose**: Verify users can only access data from their own teams

**Steps**:
1. Create two teams: "Team Alpha" and "Team Beta"
2. Add users to each team
3. Create reviews for both teams
4. Verify users from Team Alpha cannot see Team Beta's data

**Expected Result**: All queries should return only team-scoped data

#### Test 1.2: Cross-Team Data Access Prevention
**Purpose**: Ensure direct database queries respect team boundaries

**Steps**:
1. Connect to database as user from Team Alpha
2. Attempt to query reviews from Team Beta
3. Attempt to update points for Team Beta members

**Expected Result**: No data returned or access denied errors

### 2. API Endpoint Security

#### Test 2.1: Authentication Required
**Purpose**: Verify all API endpoints require authentication

**Test Commands**:
```bash
# Should return 401 Unauthorized
curl -X GET http://localhost:3000/api/leaderboard
curl -X GET http://localhost:3000/api/dashboard/stats
curl -X POST http://localhost:3000/api/reviews/submit
```

#### Test 2.2: Team Membership Validation
**Purpose**: Verify API endpoints validate team membership

**Test Commands**:
```bash
# Should return 403 Forbidden when accessing another team's data
curl -X GET "http://localhost:3000/api/leaderboard?team_id=wrong-team-id" \
  -H "Authorization: Bearer valid-token"
  
curl -X GET "http://localhost:3000/api/dashboard/stats?team_id=wrong-team-id" \
  -H "Authorization: Bearer valid-token"
```

### 3. Team Management Security

#### Test 3.1: Admin-Only Operations
**Purpose**: Verify only team admins can perform admin operations

**Test Cases**:
- Non-admin attempts to add user to team → Should fail
- Non-admin attempts to remove user from team → Should fail  
- Non-admin attempts to create dashboard widgets → Should fail
- Non-admin attempts to delete team → Should fail

#### Test 3.2: Self-Service Operations
**Purpose**: Verify users can perform allowed self-service operations

**Test Cases**:
- User removes themselves from team → Should succeed
- User updates widget data (non-structural) → Should succeed
- User views team members → Should succeed

### 4. Data Submission Security

#### Test 4.1: Review Submission Validation
**Purpose**: Verify review submissions are properly validated

**Test Cases**:
1. Submit review for employee in same team → Should succeed
2. Submit review for employee in different team → Should fail
3. Submit review without team_id → Should fail
4. Submit review with invalid team_id → Should fail

#### Test 4.2: Points System Integrity
**Purpose**: Verify points are correctly scoped to teams

**Test Cases**:
1. Points awarded only affect target team → Should succeed
2. Leaderboard shows only team members → Should succeed
3. Cross-team point manipulation prevented → Should fail

### 5. Edge Function Security

#### Test 5.1: Domain-Based Assignment
**Purpose**: Verify automatic team assignment works correctly

**Test Steps**:
1. Create team domain mapping for "company.com" → Team Alpha
2. Register new user with email "test@company.com"
3. Verify user automatically assigned to Team Alpha
4. Register user with unmatched domain
5. Verify user assigned to default team

#### Test 5.2: Edge Function Authorization
**Purpose**: Verify Edge Function has proper permissions

**Test Cases**:
- Edge Function can read team_domain_mapping → Should succeed
- Edge Function can write to team_members → Should succeed
- Edge Function cannot access unrelated tables → Should fail

## Manual Testing Checklist

### Database Level Testing
- [ ] Connect as Team Alpha user, verify cannot see Team Beta data
- [ ] Attempt direct SQL injection attacks on team_id parameters
- [ ] Verify RLS policies prevent data leakage in all scenarios
- [ ] Test edge cases with NULL or invalid team_id values

### API Level Testing  
- [ ] Test all endpoints without authentication (should fail)
- [ ] Test all endpoints with wrong team_id (should fail)
- [ ] Test admin endpoints as non-admin (should fail)
- [ ] Test CRUD operations across team boundaries (should fail)

### Business Logic Testing
- [ ] Create reviews, verify points awarded to correct team only
- [ ] Test leaderboard with multiple teams, verify isolation
- [ ] Test dashboard stats with multiple teams, verify isolation
- [ ] Verify user can only see teammates in member listings

### Edge Cases
- [ ] User belongs to multiple teams (should see appropriate data for each)
- [ ] User removed from team (should lose access immediately)
- [ ] Team deleted (should handle gracefully)
- [ ] Malformed team_id parameters (should handle gracefully)

## Automated Test Implementation

### Jest/Vitest Test Suite
Create automated tests for:

```typescript
describe('Multi-Tenant Security', () => {
  describe('API Endpoints', () => {
    test('requires authentication', async () => {
      // Test all endpoints return 401 without auth
    })
    
    test('validates team membership', async () => {
      // Test endpoints return 403 for wrong team
    })
    
    test('enforces admin permissions', async () => {
      // Test admin endpoints require admin role
    })
  })
  
  describe('Data Isolation', () => {
    test('reviews are team-scoped', async () => {
      // Test review queries only return team data
    })
    
    test('points are team-scoped', async () => {
      // Test points queries only return team data  
    })
    
    test('leaderboard is team-scoped', async () => {
      // Test leaderboard only shows team members
    })
  })
})
```

## Security Validation Checklist

### Critical Security Requirements
- [ ] **Complete data isolation**: No cross-team data access possible
- [ ] **Authentication required**: All API endpoints protected
- [ ] **Authorization enforced**: Role-based permissions working
- [ ] **Input validation**: All user inputs properly validated
- [ ] **SQL injection prevention**: Parameterized queries used
- [ ] **XSS prevention**: Output properly sanitized

### Performance & Reliability
- [ ] **RLS performance**: Database queries perform well with RLS
- [ ] **Index effectiveness**: Proper indexes on team_id columns
- [ ] **Error handling**: Graceful failure modes
- [ ] **Audit logging**: Security events properly logged

### Compliance & Privacy
- [ ] **GDPR compliance**: User data properly scoped and deletable
- [ ] **Data retention**: Old data properly managed
- [ ] **Audit trail**: Changes tracked appropriately
- [ ] **Privacy protection**: PII not exposed cross-team

## Test Results Documentation

Document test results in the following format:

```
Test: [Test Name]
Date: [Date]
Tester: [Name]
Status: PASS/FAIL
Details: [Detailed results]
Issues Found: [Any security issues]
Remediation: [Steps taken to fix issues]
```

## Security Incident Response

If security issues are found:

1. **Immediate**: Stop testing, document the issue
2. **Assess**: Determine impact and severity
3. **Fix**: Implement appropriate fixes
4. **Retest**: Verify fix resolves the issue  
5. **Document**: Update security documentation

## Conclusion

This comprehensive security validation ensures that the multi-tenant ReviewBoost system maintains strict data isolation between teams while providing appropriate access within teams. All tests should pass before deploying to production.