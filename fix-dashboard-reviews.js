// Quick fix script for dashboard reviews not showing
// Run this in the browser console on the dashboard page

console.log('🔧 Dashboard Reviews Quick Fix');

async function diagnoseAndFix() {
  try {
    // Get auth token
    const authData = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
    if (!authData.access_token) {
      console.error('❌ No auth token found. Please log in first.');
      return;
    }

    const headers = {
      'Authorization': `Bearer ${authData.access_token}`,
      'Content-Type': 'application/json'
    };

    console.log('1. 🔍 Checking team membership...');
    
    // Check debug endpoint
    const debugResponse = await fetch('/api/debug/team-membership', { headers });
    const debugData = await debugResponse.json();
    
    console.log('Debug data:', debugData);
    
    if (debugData.userHasAccessToReviewTeam) {
      console.log('✅ User already has access to review team');
      console.log('2. 🔍 Testing dashboard API directly...');
      
      // Test dashboard API
      const dashboardResponse = await fetch(`/api/dashboard/stats?team_id=${debugData.reviewTeamId}`, { headers });
      const dashboardData = await dashboardResponse.json();
      
      console.log('Dashboard API response:', dashboardData);
      
      if (dashboardData.error) {
        console.error('❌ Dashboard API error:', dashboardData.error);
      } else {
        console.log('✅ Dashboard API working!');
        console.log('Total reviews:', dashboardData.total_reviews);
        if (dashboardData.total_reviews === 0) {
          console.log('⚠️ Dashboard API returns 0 reviews - check database functions');
        }
      }
    } else {
      console.log('❌ User does not have access to review team');
      console.log('2. 🔧 Adding user to review team...');
      
      // Add user to team
      const addResponse = await fetch('/api/debug/team-membership', {
        method: 'POST',
        headers
      });
      const addData = await addResponse.json();
      
      console.log('Add to team result:', addData);
      
      if (addData.success) {
        console.log('✅ Successfully added user to team!');
        console.log('3. 🔄 Refreshing page to update dashboard...');
        
        // Refresh the page to reload team data
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        console.error('❌ Failed to add user to team:', addData.error);
      }
    }
    
  } catch (error) {
    console.error('❌ Fix script error:', error);
  }
}

// Run the diagnosis and fix
diagnoseAndFix();

console.log(`
📋 Summary:
1. This script checks if you have access to the team with review data
2. If not, it adds you to that team automatically
3. If you already have access, it tests the dashboard API for other issues

Expected team ID with review: f568ad74-cb94-4ebe-9fbd-171c77a5c9b9
`);