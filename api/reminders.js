// api/reminders.js

import { createClient } from '@supabase/supabase-js'
import Twilio from 'twilio'
import sgMail from '@sendgrid/mail'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET allowed' })
  }

  try {
    // Initialize clients
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const twilioClient = Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

    // Attempt a minimal query to catch schema issues
    await supabase.from('appointments').select('id').limit(1)

    return res.status(200).json({ message: 'Clients OK, schema accessible' })
  } catch (err) {
    // Return the full error to the caller
    return res
      .status(500)
      .json({ error: err.message, stack: err.stack.split('\n') })
  }
}

```

