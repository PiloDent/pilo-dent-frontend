import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSessionContext } from "../../context/SessionContext.jsx";
import { useTranslation } from "react-i18next";

export default function Login() {
  const { t } = useTranslation();
  const { signIn } = useSessionContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { data, error } = await signIn({ email, password });
    if (error) return setError(error.message);
    navigate("/"); // or your post-login redirect
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <h2 className="text-3xl font-extrabold text-gray-800 text-center mb-6">
          {t("header.sign_in_to_account")}
        </h2>

        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t("label.email_address")}
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("placeholder.email")}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t("label.password")}
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("placeholder.password")}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition"
          >
            {t("button.sign_in")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          {t("text.dont_have_account")} <Link to="/signup" className="text-blue-600 hover:underline">{t("link.sign_up")}</Link>
        </p>

        <p className="mt-2 text-center text-sm">
          <Link to="/forgot-password" className="text-blue-600 hover:underline">
            {t("link.forgot_password")}
          </Link>
        </p>
      </div>
    </div>
  );
}
