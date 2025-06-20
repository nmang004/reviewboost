// Debug script to check team membership and review data
// Run this in browser console on the dashboard page

console.log('🔍 Debug: Team and Review Data Check');

// 1. Check current auth state
console.log('1. Current auth state:');
console.log('User:', window.localStorage.getItem('supabase.auth.token'));
console.log('Current team ID:', window.localStorage.getItem('currentTeamId'));

// 2. Check what teams the user has access to
console.log('\n2. Fetching user teams...');
fetch('/api/teams', {
  headers: {
    'Authorization': `Bearer ${JSON.parse(window.localStorage.getItem('supabase.auth.token') || '{}').access_token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  console.log('User teams:', data);
  
  // Find if user has access to the team with the review
  const reviewTeamId = 'f568ad74-cb94-4ebe-9fbd-171c77a5c9b9';
  const hasAccessToReviewTeam = data.teams?.some(team => team.id === reviewTeamId);
  
  console.log(`\n3. Access to review team (${reviewTeamId}):`, hasAccessToReviewTeam);
  
  if (!hasAccessToReviewTeam) {
    console.error('❌ USER DOES NOT HAVE ACCESS TO THE TEAM WITH REVIEW DATA!');
    console.log('This is why the dashboard shows no reviews.');
    console.log('Available team IDs:', data.teams?.map(t => t.id));
  } else {
    console.log('✅ User has access to review team');
  }
})
.catch(error => {
  console.error('Error fetching teams:', error);
});

// 3. Check dashboard API call
console.log('\n4. Testing dashboard API call...');
setTimeout(() => {
  fetch('/api/dashboard/stats?team_id=' + (window.localStorage.getItem('currentTeamId') || 'unknown'), {
    headers: {
      'Authorization': `Bearer ${JSON.parse(window.localStorage.getItem('supabase.auth.token') || '{}').access_token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('Dashboard API response status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('Dashboard API response:', data);
    
    if (data.error) {
      console.error('❌ Dashboard API Error:', data.error);
    } else {
      console.log('✅ Dashboard API Success');
      console.log('Total reviews:', data.total_reviews);
      console.log('Recent reviews:', data.recent_reviews?.length || 0);
    }
  })
  .catch(error => {
    console.error('Dashboard API fetch error:', error);
  });
}, 1000);

console.log('\n5. Expected review team ID:', 'f568ad74-cb94-4ebe-9fbd-171c77a5c9b9');
console.log('Check the output above to see if user has access to this team.');