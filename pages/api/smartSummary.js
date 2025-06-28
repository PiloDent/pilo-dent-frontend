// pages/api/smartSummary.js
import { OpenAI } from "openai";
import { supabase } from "../../lib/supabaseClient.js";

// DEBUG: ensure the key is loaded
console.log("🔑 OPENAI_API_KEY loaded?", Boolean(process.env.OPENAI_API_KEY));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const { prompt, patientId } = req.body;
  if (!prompt || typeof prompt !== "string" || !patientId) {
    return res
      .status(400)
      .json({ error: "Missing or invalid `prompt` or `patientId`" });
  }

  // 1) Check cache
  const { data: cached, error: fetchErr } = await supabase
    .from("smart_summaries")
    .select("summary")
    .eq("patient_id", patientId)
    .single();

  if (fetchErr && fetchErr.code !== "PGRST116") {
    console.error("Cache lookup error:", fetchErr);
  }
  if (cached?.summary) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(cached.summary);
  }

  // 2) Stream from OpenAI
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-transform");

  let fullSummary = "";
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });

    for await (const part of completion) {
      const chunk = part.choices?.[0]?.delta?.content;
      if (chunk) {
        fullSummary += chunk;
        res.write(chunk);
      }
    }
    res.end();

    // 3) Cache it
    const { error: upsertErr } = await supabase
      .from("smart_summaries")
      .upsert({ patient_id: patientId, summary: fullSummary });
    if (upsertErr) console.error("Cache insert error:", upsertErr);
  } catch (err) {
    console.error("AI streaming error:", err);
    if (!res.headersSent) {
      res.setHeader("Content-Type", "application/json");
      res.status(500).json({ error: "AI generation failed" });
    } else {
      res.end();
    }
  }
}

