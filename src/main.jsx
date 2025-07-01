import "./i18n";     // ← initialize i18n before React mounts
import "./index.css"; // ← must be after i18n

import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";
import { useTranslation } from "react-i18next";
import { SessionContextProvider } from "./context/SessionContext.jsx";
import App from "./App.jsx";

// 1️⃣ Initialize Sentry as early as possible
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [new BrowserTracing()],
  // Adjust in production to control volume
  tracesSampleRate: 0.25,
  environment: import.meta.env.MODE,
});

// Sanity-check your inference‐service URL
const INFERENCE_URL = import.meta.env.VITE_INFERENCE_URL;
if (!INFERENCE_URL) {
  console.warn(
    "🚨 VITE_INFERENCE_URL is not set! Please add it to your .env.local"
  );
} else {
  console.log("✅ Inference URL is", INFERENCE_URL);
}

// Sanity-check your Supabase URL & anon key
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn(
    "🚨 Supabase env vars missing! Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local"
  );
} else {
  console.log("✅ Supabase URL and ANON key found");
}

// 2️⃣ Wrap your app in a localized Sentry.ErrorBoundary
function SentryBoundary({ children }) {
  const { t } = useTranslation();
  return (
    <Sentry.ErrorBoundary fallback={<p>{t("fallback.unhandled_error")}</p>}>
      {children}
    </Sentry.ErrorBoundary>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SentryBoundary>
      <SessionContextProvider>
        <App />
      </SessionContextProvider>
    </SentryBoundary>
  </React.StrictMode>
);
