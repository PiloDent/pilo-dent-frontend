import { useState } from "react";
import { supabase } from "@/supabaseClient";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setMessage("");
    setErrorMsg("");
    setLoading(true);

    // Trim email to avoid leading/trailing spaces
    const trimmedEmail = email.trim();

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${window.location.origin}/reset-password`, // Ensure you have this route/page
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setMessage(t("message.password_reset_sent"));
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-6">{t("header.forgot_password")}</h1>

      <form onSubmit={handlePasswordReset} className="space-y-4">
        <div>
          <label htmlFor="email" className="block mb-1 font-semibold">
            {t("label.enter_email")}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            placeholder={t("placeholder.email")}
          />
        </div>

        {errorMsg && (
          <p className="text-red-600 text-sm font-semibold">{errorMsg}</p>
        )}
        {message && (
          <p className="text-green-600 text-sm font-semibold">{message}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          {loading ? t("button.sending") : t("button.send_reset_link")}
        </button>
      </form>

      <div className="mt-4 text-center text-sm">
        <Link to="/login" className="text-blue-600 hover:underline">
          {t("link.back_to_login")}
        </Link>
      </div>
    </div>
  );
}
