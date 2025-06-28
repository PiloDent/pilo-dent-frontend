// create-user.js
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()  // loads SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY from .env

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  // expect: node create-user.js email password "Full Name" role companyId
  const [email, password, full_name, role, company_id] = process.argv.slice(2)
  if (!email || !password || !full_name || !role || !company_id) {
    console.error('Usage: node create-user.js email password "Full Name" role companyId')
    process.exit(1)
  }

  // 1) Create the auth user
  const { data: user, error: signUpErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (signUpErr) {
    console.error('Error creating auth user:', signUpErr.message)
    process.exit(1)
  }

  // 2) Insert into your profiles table
  const { error: profileErr } = await supabase
    .from('profiles')
    .insert([{ id: user.id, full_name, role, company_id }])
  if (profileErr) {
    console.error('Error inserting profile:', profileErr.message)
    process.exit(1)
  }

  console.log(`✅ User created: ${user.id}`)
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})

