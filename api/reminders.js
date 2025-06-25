// api/reminders.js

import { createClient } from '@supabase/supabase-js';
import Twilio from 'twilio';
import sgMail from '@sendgrid/mail';

// 1) Init Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 2) Init Twilio & SendGrid
const twilio = Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// 3) Reminder windows
const WINDOWS = [
  { type: '24h', start: 24, end: 25 },
  { type:  '2h', start:  2, end:  3 },
  { type: 'follow', start: -25, end: -24 }
];

function isoOffset(hours) {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).send('Only GET allowed');
  }

  let sent = 0, errs = [];

  for (const w of WINDOWS) {
    const start = isoOffset(w.start);
    const end   = isoOffset(w.end);

    // pull appointments + patient info
    const { data: appts, error: fetchErr } = await supabase
      .from('appointments')
      .select(`
        id,
        scheduled_time,
        patient:patient_id (first_name, last_name, email, phone)
      `)
      .gte('scheduled_time', start)
      .lt ('scheduled_time', end);

    if (fetchErr) { errs.push(fetchErr.message); continue; }

    for (const a of appts || []) {
      // dedupe
      const { data: logs } = await supabase
        .from('reminder_logs')
        .select('id')
        .eq('appointment_id', a.id)
        .eq('reminder_type', w.type)
        .limit(1);
      if (logs?.length) continue;

      const when = new Date(a.scheduled_time)
        .toLocaleString('en-GB', { timeZone: 'Europe/Berlin', dateStyle: 'long', timeStyle: 'short' });

      // build messages
      const isFollow = w.type === 'follow';
      const text     = isFollow
        ? `We missed you at your ${when} appointment—please reschedule: https://your-crm.example.com/reschedule/${a.id}`
        : `Reminder: you have an appointment on ${when}. See you soon!`;
      const subject  = isFollow ? 'Missed Appointment' : 'Appointment Reminder';
      const html     = `<p>${text}</p>`;

      // send SMS
      try {
        await twilio.messages.create({
          from: process.env.TWILIO_FROM_NUMBER,
          to:   a.patient.phone,
          body: text
        });
        sent++;
        await supabase.from('reminder_logs').insert({ appointment_id: a.id, reminder_type: w.type, channel: 'sms' });
      } catch (e) { errs.push(e.message); }

      // send Email
      try {
        await sgMail.send({ to: a.patient.email, from: process.env.SENDGRID_FROM_EMAIL, subject, text, html });
        sent++;
        await supabase.from('reminder_logs').insert({ appointment_id: a.id, reminder_type: w.type, channel: 'email' });
      } catch (e) { errs.push(e.message); }
    }
  }

  res.status(200).json({ sent, errors: errs });
}

