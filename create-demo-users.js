const { createClient } = require('@supabase/supabase-js')

// You need to use the service role key for this, not the anon key
const supabaseUrl = 'https://otfdhhljpebixszvubac.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // You need to get this from Supabase dashboard

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required!')
  console.log('📋 Get your service role key from: https://otfdhhljpebixszvubac.supabase.co/project/default/settings/api')
  console.log('📋 Then run: SUPABASE_SERVICE_ROLE_KEY=your_key node create-demo-users.js')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createDemoUsers() {
  try {
    console.log('🔨 Creating demo users...')
    
    // Create demo users with authentication
    const demoUsers = [
      {
        email: 'owner@demo.com',
        password: 'demo123',
        user_metadata: {
          name: 'Demo Owner',
          role: 'business_owner'
        }
      },
      {
        email: 'employee@demo.com', 
        password: 'demo123',
        user_metadata: {
          name: 'John Employee',
          role: 'employee'
        }
      },
      {
        email: 'jane@demo.com',
        password: 'demo123', 
        user_metadata: {
          name: 'Jane Worker',
          role: 'employee'
        }
      }
    ]
    
    for (const userData of demoUsers) {
      console.log(`Creating user: ${userData.email}...`)
      
      const { data, error } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        user_metadata: userData.user_metadata,
        email_confirm: true // Skip email confirmation for demo
      })
      
      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`⚠️  User ${userData.email} already exists, skipping...`)
        } else {
          console.error(`❌ Error creating ${userData.email}:`, error.message)
        }
      } else {
        console.log(`✅ Successfully created user: ${userData.email}`)
      }
    }
    
    console.log('\n🎉 Demo user setup complete!')
    console.log('📋 You can now login with:')
    console.log('   - employee@demo.com / demo123 (Employee)')
    console.log('   - owner@demo.com / demo123 (Business Owner)')
    console.log('   - jane@demo.com / demo123 (Employee)')
    
  } catch (err) {
    console.error('❌ Setup failed:', err.message)
  }
}

createDemoUsers()