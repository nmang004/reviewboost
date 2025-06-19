// Test Supabase connection after migration
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://otfdhhljpebixszvubac.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90ZmRoaGxqcGViaXhzenZ1YmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNDQ4ODksImV4cCI6MjA2NTkyMDg4OX0.Dq3qK51S12jOiMdKM8HDb8AYM_HILjgpnXW8xSVEA7A'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabase() {
  console.log('🧪 Testing ReviewBoost database setup...\n')

  try {
    // Test users table
    console.log('1️⃣ Testing users table...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (usersError) {
      console.log('❌ Users table error:', usersError.message)
      return
    } else {
      console.log('✅ Users table exists!')
    }

    // Test reviews table
    console.log('2️⃣ Testing reviews table...')
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('count')
      .limit(1)
    
    if (reviewsError) {
      console.log('❌ Reviews table error:', reviewsError.message)
      return
    } else {
      console.log('✅ Reviews table exists!')
    }

    // Test points table
    console.log('3️⃣ Testing points table...')
    const { data: points, error: pointsError } = await supabase
      .from('points')
      .select('count')
      .limit(1)
    
    if (pointsError) {
      console.log('❌ Points table error:', pointsError.message)
      return
    } else {
      console.log('✅ Points table exists!')
    }

    console.log('\n🎉 Database setup successful!')
    console.log('📱 Your ReviewBoost app should now work!')
    console.log('🔗 Test it at your Vercel URL')

  } catch (err) {
    console.error('❌ Connection failed:', err.message)
  }
}

testDatabase()