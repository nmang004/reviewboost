# Team Loading Issue - Troubleshooting Documentation

## Problem Summary

**Issue**: Teams do not load immediately after login. User sees "No Teams Found" screen and must refresh the page to see their teams.

**Affected Flow**: Login → Redirect to `/submit-review` or `/dashboard` → Teams not loaded until manual refresh

**Database Status**: ✅ Teams exist in database and are properly assigned to users (verified via screenshots)

## Current Behavior

### After Login (Broken)
```
🎯 TeamProvider mounted on path: /login
🎯 Mount details - authLoading: true user: undefined teams: 0
🔄 TeamContext useEffect triggered: Object
⏳ Auth still loading, waiting...
🔄 TeamContext useEffect triggered: Object
❌ No user found, clearing teams
Sign in successful, waiting for user state... nmang004@gmail.com
User state available, waiting before redirect... nmang004@gmail.com
Redirect delay complete, redirecting now... nmang004@gmail.com
```

**Result**: User redirected to `/submit-review` but NO new TeamProvider logs appear, teams not loaded.

### After Refresh (Working)
```
🎯 TeamProvider mounted on path: /submit-review
🎯 Mount details - authLoading: true user: undefined teams: 0
🔄 TeamContext useEffect triggered: {authLoading: true, user: undefined, userExists: false, currentPath: '/submit-review'}
⏳ Auth still loading, waiting...
🚀 Post-login redirect detection: User now available, triggering immediate team fetch
🚀 State check: {path: '/submit-review', authLoading: false, userEmail: 'nmang004@gmail.com', teamsCount: 0}
🔄 Team fetch attempt 1
✅ Teams loaded successfully: 1
✅ Team selected: Review Team
```

**Result**: Teams load successfully, UI updates correctly.

## Root Cause Analysis

### Key Discovery: User State Not Persisting After Redirect

1. **Login Page**: User state becomes available (`nmang004@gmail.com`)
2. **Redirect**: Navigation from `/login` to `/submit-review` 
3. **New Page**: User state is lost/undefined initially
4. **Header Issue**: Header still shows "Sign In" instead of logged-in state

### Technical Analysis

#### React State Management Issue
- **TeamProvider** is globally mounted in `layout.tsx`
- Each page navigation creates a **new instance** of TeamProvider
- User state from auth hook doesn't persist across page navigations
- Only manual refresh properly initializes auth state

#### Auth Hook Timing
- `useAuth` hook properly maintains user state on refresh
- But fails to maintain state consistency during programmatic navigation
- Possible session/JWT token propagation delay

## Solution Attempts Made

### 1. ✅ Service Role Key Approach (Abandoned)
- **Attempted**: Use `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS
- **Result**: Environment variable not available
- **Status**: Not pursued further

### 2. ✅ Authenticated Client with JWT
- **Implemented**: Modified `/api/teams` to use user's JWT token
- **Result**: API works correctly (verified in refresh scenario)
- **Status**: Working, not the issue

### 3. ✅ Enhanced Debug Logging
- **Added**: Comprehensive logging throughout TeamContext
- **Result**: Identified that post-login detection wasn't triggering
- **Status**: Helpful for diagnosis

### 4. ✅ Race Condition Fixes
- **Attempted**: Various delays and retry mechanisms
- **Result**: Didn't address core issue
- **Status**: Multiple iterations, not effective

### 5. ✅ Login Redirect Delay
- **Implemented**: 2-second delay before redirect from login page
- **Result**: Gives time for state propagation, but doesn't fix core issue
- **Status**: Partial mitigation

### 6. ✅ Post-Login Detection (Multiple Approaches)

#### A. Complex Polling Mechanism
- **Attempted**: Poll every 100ms for user state
- **Issue**: Stale closure problems - polling function trapped with initial state values
- **Result**: Always saw stale values, never detected user

#### B. Reactive useEffect Detection
- **Current**: Simple useEffect that reacts to auth state changes
- **Implementation**: Triggers when `mounted + post-login page + user available + no teams`
- **Result**: Works perfectly on refresh, but never triggers on initial redirect

## Current State

### What Works ✅
- Database queries and team assignment
- API endpoints with proper authentication
- Team loading logic and UI updates
- All functionality after manual refresh

### What Doesn't Work ❌
- User state persistence across programmatic navigation
- Initial team loading after login redirect
- Header state updates after login

### Evidence of Core Issue
- **Missing TeamProvider logs**: After redirect, no new TeamProvider mounting logs appear
- **Header state**: Still shows "Sign In" after login
- **Post-login detection**: Never triggers because user state undefined

## Potential Solutions to Investigate

### 1. Auth State Persistence
- Investigate why `useAuth` doesn't maintain state across navigation
- Check if JWT tokens are properly stored and retrieved
- Review Supabase session management

### 2. Force Auth Refresh After Redirect
- Add explicit auth state refresh when landing on post-login pages
- Use `supabase.auth.getUser()` to force session validation

### 3. Global State Management
- Consider using React Context or state management for user data
- Ensure user state persists across page boundaries

### 4. Layout-Level Auth Management
- Move auth logic higher up in component tree
- Ensure auth state is established before any page renders

### 5. Server-Side Session Validation
- Implement proper session handling in Next.js middleware
- Ensure user state is server-side rendered when possible

## Files Modified

### Core Files
- `src/contexts/TeamContext.tsx` - Main team management logic
- `src/app/api/teams/route.ts` - Team fetching API with authentication
- `src/app/login/page.tsx` - Login flow with redirect delays
- `src/hooks/useAuth.ts` - Authentication hook with caching

### Debug Files
- Multiple iterations of logging and debugging logic
- All changes committed to git with descriptive messages

## Next Steps

1. **Investigate Auth State**: Focus on why user state doesn't persist after programmatic navigation
2. **Session Management**: Review Supabase session handling in Next.js
3. **Force Refresh**: Try explicit auth refresh on post-login pages
4. **Alternative Architecture**: Consider different approaches to state management

## Test Scenarios

### To Reproduce Issue
1. Navigate to `/login`
2. Enter valid credentials (e@demo.com / demo123)
3. Click "Sign in as Employee" 
4. Wait for 2-second delay and redirect
5. Observe "No Teams Found" on `/submit-review`
6. Check header still shows "Sign In"

### To Verify Fix
1. Follow reproduction steps
2. Teams should load immediately after redirect
3. Header should show logged-in state with team selector
4. No manual refresh required

## Debugging Commands

```bash
# View recent commits related to this issue
git log --oneline -10

# Check current authentication implementation
cat src/hooks/useAuth.ts

# Review team loading logic
cat src/contexts/TeamContext.tsx

# Test team API endpoint manually
curl -H "Authorization: Bearer <jwt-token>" http://localhost:3000/api/teams
```

---

**Last Updated**: 2025-01-20  
**Status**: ❌ Issue not resolved - requires investigation of auth state persistence  
**Priority**: High - blocks core user workflow