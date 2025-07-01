// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseFunctionUrl =
  import.meta.env.VITE_SUPABASE_FUNCTION_URL ||
  "https://<your-project-ref>.functions.supabase.co";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[supabaseClient] Missing one or more environment variables:", {
    supabaseUrl,
    supabaseAnonKey,
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Base URL for your Supabase Edge Functions.
 * Usage: `${supabaseFunctionUrl}/treatment-coordinator`
 */
export const functionsUrl = supabaseFunctionUrl;

/**
 * Write a custom analytics event into the `analytics_events` table.
 * @param {string} event_name - A short, snake_case event identifier.
 * @param {object} payload - Arbitrary JSON payload with event details.
 */
export async function trackEvent(event_name, payload) {
  const { error } = await supabase
    .from("analytics_events")
    .insert([{ event_name, payload }]);
  if (error) {
    console.error("trackEvent error:", error);
  }
}
