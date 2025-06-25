// api/reminders.js

import { createClient } from '@supabase/supabase-js';
import Twilio from 'twilio';
import sgMail from '@sendgrid/mail';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET allowed' });
  }

  try {
    // Init clients
    createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    // Test a minimal schema read
    const { error } = await createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ).from('appointments').select('id').limit(1);
    if (error) throw error;

    return res.status(200).json({ message: 'Clients & schema OK' });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err.message, stack: err.stack.split('\n') });
  }
}
