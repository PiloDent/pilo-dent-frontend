// src/utils/openai.js

/**
 * Call your backend-proxy’s treatment-plan endpoint
 * to keep your OpenAI key server-side.
 */
export async function generateTreatmentPlan(notes) {
  if (!notes || notes.length === 0) {
    throw new Error("No patient notes provided.");
  }

  const res = await fetch("/functions/treatment-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Failed to generate treatment plan");
  }

  const { plan } = await res.json();
  return plan;
}
