// src/config.js
export const INFERENCE_URL = import.meta.env.VITE_INFERENCE_URL;
if (!INFERENCE_URL) {
  console.warn(
    "⚠️  No VITE_INFERENCE_URL defined — your X-ray analysis calls will fail."
  );
}
