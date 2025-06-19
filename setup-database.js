const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://otfdhhljpebixszvubac.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90ZmRoaGxqcGViaXhzenZ1YmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNDQ4ODksImV4cCI6MjA2NTkyMDg4OX0.Dq3qK51S12jOiMdKM8HDb8AYM_HILjgpnXW8xSVEA7A'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    console.log('Testing Supabase connection...')
    
    // Test basic connection
    const { data, error } = await supabase.from('users').select('count').limit(1)
    
    if (error) {
      console.log('❌ Database tables not yet created. You need to run the migration in Supabase.')
      console.log('📋 Please copy and run the SQL from: supabase/migrations/001_initial_schema.sql')
      console.log('🔗 Go to: https://otfdhhljpebixszvubac.supabase.co/project/default/sql')
    } else {
      console.log('✅ Successfully connected to Supabase!')
      console.log('✅ Database tables are ready!')
    }
    
  } catch (err) {
    console.error('❌ Connection failed:', err.message)
  }
}

testConnection()