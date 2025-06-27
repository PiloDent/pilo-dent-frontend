import { supabase } from '../../../lib/supabaseClient';
import formidable from 'formidable';
import fs from 'fs';

// Disable Next.js body parsing—formidable needs raw request
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  // === CORS preflight support ===
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({ error: 'Invalid upload' });
    }

    try {
      // 1) Pull the file off the form and read buffer
      const xrayFile = files.xray;
      const buffer = fs.readFileSync(xrayFile.filepath);
      const filename = `${Date.now()}-${xrayFile.originalFilename}`;

      // 2) Upload into Supabase Storage
      const { error: uploadErr } = await supabase
        .storage
        .from('xray-images')
        .upload(filename, buffer, { contentType: xrayFile.mimetype });
      if (uploadErr) {
        return res.status(500).json({ error: uploadErr.message });
      }

      // 3) Call the inference service
      const inferenceRes = await fetch(
        `${process.env.VITE_INFERENCE_URL}/analyze`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bucket: 'xray-images', key: filename }),
        }
      );
      if (!inferenceRes.ok) {
        const text = await inferenceRes.text();
        return res.status(502).json({ error: \`Inference failed: \${text}\` });
      }
      const analysis = await inferenceRes.json();

      // 4) Persist the JSON in your xray_analyses table
      const { error: dbErr } = await supabase
        .from('xray_analyses')
        .insert([{
          image_url: filename,
          results: analysis,
          summary: analysis.summary
        }]);
      if (dbErr) {
        return res.status(500).json({ error: dbErr.message });
      }

      // 5) Return the stored filename
      res.status(200).json({ filename });
    } catch (e) {
      console.error('Unexpected error in xray/analyze:', e);
      res.status(500).json({ error: 'Server error' });
    }
  });
}
