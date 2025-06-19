const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://otfdhhljpebixszvubac.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required!')
  console.log('📋 Get your service role key from: https://otfdhhljpebixszvubac.supabase.co/project/default/settings/api')
  console.log('📋 Then run: SUPABASE_SERVICE_ROLE_KEY=your_service_key node delete-demo-users.js')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function deleteDemoUsers() {
  try {
    console.log('🗑️  Deleting existing demo users...')
    
    const demoEmails = ['owner@demo.com', 'employee@demo.com', 'jane@demo.com']
    
    for (const email of demoEmails) {
      console.log(`Deleting user: ${email}...`)
      
      // First, get the user ID
      const { data: users, error: listError } = await supabase.auth.admin.listUsers()
      
      if (listError) {
        console.error(`❌ Error listing users:`, listError.message)
        continue
      }
      
      const user = users.users.find(u => u.email === email)
      
      if (user) {
        // Delete the user
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
        
        if (deleteError) {
          console.error(`❌ Error deleting ${email}:`, deleteError.message)
        } else {
          console.log(`✅ Successfully deleted user: ${email}`)
        }
      } else {
        console.log(`⚠️  User ${email} not found, skipping...`)
      }
    }
    
    console.log('\n🎉 Demo user deletion complete!')
    console.log('📋 Now you can create new users with proper passwords in the Supabase dashboard')
    
  } catch (err) {
    console.error('❌ Deletion failed:', err.message)
  }
}

deleteDemoUsers()