```js
// api/reminders.js

import { createClient } from '@supabase/supabase-js';
import Twilio from 'twilio';
import sgMail from '@sendgrid/mail';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
// Initialize Twilio and SendGrid
const twilioClient = Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Reminder windows definition
const WINDOWS = [
  { type: '24h', start: 24, end: 25 },
  { type: '2h',  start: 2,  end: 3  },
  { type: 'follow', start: -25, end: -24 }
];

// Helper: calculate ISO timestamps offset by N hours
function isoOffset(hours) {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET allowed' });
  }

  let sent = 0;
  let errors = [];

  for (const w of WINDOWS) {
    const start = isoOffset(w.start);
    const end   = isoOffset(w.end);

    // Fetch appointments with joined patient via FK relationship
    const { data: appts, error: fetchErr } = await supabase
      .from('appointments')
      .select(`
        id,
        scheduled_time,
        patient:patient_id (
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .gte('scheduled_time', start)
      .lt('scheduled_time', end);

    if (fetchErr) {
      errors.push(`Fetch error (${w.type}): ${fetchErr.message}`);
      continue;
    }

    for (const a of appts || []) {
      // Skip if already sent
      const { data: logs } = await supabase
        .from('reminder_logs')
        .select('id')
        .eq('appointment_id', a.id)
        .eq('reminder_type', w.type)
        .limit(1);
      if (logs?.length) continue;

      // Format appointment datetime
      const when = new Date(a.scheduled_time).toLocaleString('en-GB', {
        timeZone: 'Europe/Berlin',
        dateStyle: 'long',
        timeStyle: 'short'
      });

      const isFollow = w.type === 'follow';
      const text = isFollow
        ? `We missed you at your appointment on ${when}. Please reschedule: https://your-crm.example.com/reschedule/${a.id}`
        : `Reminder: you have an appointment on ${when}.`;
      const subject = isFollow ? 'Missed Appointment' : 'Appointment Reminder';
      const html = `<p>${text}</p>`;

      // Send SMS
      try {
        await twilioClient.messages.create({
          from: process.env.TWILIO_FROM_NUMBER,
          to:   a.patient.phone,
          body: text
        });
        sent++;
        await supabase
          .from('reminder_logs')
          .insert({ appointment_id: a.id, reminder_type: w.type, channel: 'sms' });
      } catch (e) {
        errors.push(`SMS error for ${a.id}: ${e.message}`);
      }

      // Send Email
      try {
        await sgMail.send({
          to:      a.patient.email,
          from:    process.env.SENDGRID_FROM_EMAIL,
          subject,
          text,
          html
        });
        sent++;
        await supabase
          .from('reminder_logs')
          .insert({ appointment_id: a.id, reminder_type: w.type, channel: 'email' });
      } catch (e) {
        errors.push(`Email error for ${a.id}: ${e.message}`);
      }
    }
  }

  return res.status(200).json({ message: 'Done', sent, errors });
}
```

