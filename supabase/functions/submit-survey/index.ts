import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { token } = req.params; // if using path /functions/v1/submit-survey/:token
  const url = new URL(req.url);
  const rating = url.searchParams.get("rating");
  const comments = url.searchParams.get("comments") || null;

  // Update survey record
  const updates:any = { responded_at:new Date().toISOString() };
  if (rating) updates.rating = parseInt(rating);
  if (comments) updates.comments = comments;

  const { error } = await supabase
    .from("patient_surveys")
    .update(updates)
    .eq("response_token", token);

  const html = error
    ? "<p>Sorry, we couldn’t record your response.</p>"
    : "<p>Thank you for your feedback!</p>";

  return new Response(html, {
    headers:{ "Content-Type":"text/html" },
  });
});

