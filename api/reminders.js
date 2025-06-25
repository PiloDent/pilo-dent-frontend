// api/reminders.js

import { createClient } from '@supabase/supabase-js';
import Twilio from 'twilio';
import sgMail from '@sendgrid/mail';

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const twilioClient = Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Environment-variable sanity check
    const env = {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      TWILIO_SID: !!process.env.TWILIO_ACCOUNT_SID,
      TWILIO_TOKEN: !!process.env.TWILIO_AUTH_TOKEN,
      SENDGRID_KEY: !!process.env.SENDGRID_API_KEY,
      TWILIO_FROM: !!process.env.TWILIO_FROM_NUMBER,
      SENDGRID_FROM: !!process.env.SENDGRID_FROM_EMAIL
    };

    return res.status(200).json({
      message: 'Ping OK',
      env,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}

