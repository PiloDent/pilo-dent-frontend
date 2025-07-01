import { useState } from "react";
import { supabase } from "@/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Signup() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    companyName: "",
    tradingName: "",
    addressStreet: "",
    addressCity: "",
    addressPostal: "",
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
    ownerPasswordConfirm: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    if (!form.companyName.trim()) return t("error.company_name_required");
    if (!form.addressStreet.trim()) return t("error.street_required");
    if (!form.addressCity.trim()) return t("error.city_required");
    if (!form.addressPostal.trim()) return t("error.postal_required");
    if (!form.ownerName.trim()) return t("error.owner_name_required");
    if (!form.ownerEmail.trim()) return t("error.owner_email_required");
    if (!form.ownerPassword) return t("error.password_required");
    if (form.ownerPassword.length < 8) return t("error.password_length");
    if (form.ownerPassword !== form.ownerPasswordConfirm)
      return t("error.passwords_must_match");
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    // 1. Create company row
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        name: form.companyName.trim(),
        trading_name: form.tradingName.trim() || null,
        address_street: form.addressStreet.trim(),
        address_city: form.addressCity.trim(),
        address_postal: form.addressPostal.trim(),
      })
      .select()
      .single();

    if (companyError) {
      setError(t("error.creating_company", { message: companyError.message }));
      setLoading(false);
      return;
    }

    // 2. Sign up owner user
    const { user, error: signupError } = await supabase.auth.signUp({
      email: form.ownerEmail.trim(),
      password: form.ownerPassword,
    });

    if (signupError) {
      setError(t("error.sign_up_owner", { message: signupError.message }));
      setLoading(false);
      return;
    }

    // 3. Insert profile row with owner info, link to company, role=admin
    const { error: profileError } = await supabase.from("profiles").insert({
      id: user.id,
      full_name: form.ownerName.trim(),
      company_id: company.id,
      role: "admin",
    });

    if (profileError) {
      setError(t("error.creating_owner_profile", { message: profileError.message }));
      setLoading(false);
      return;
    }

    setLoading(false);

    alert(t("alert.account_created"));

    // Redirect to login page
    navigate("/login");
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded shadow mt-10">
      <h1 className="text-2xl font-bold mb-6 text-center">
        {t("header.sign_up_practice")}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Company Info */}
        <div>
          <label className="block font-semibold mb-1">
            {t("label.company_name")} *
          </label>
          <input
            type="text"
            name="companyName"
            value={form.companyName}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">
            {t("label.trading_name")}
          </label>
          <input
            type="text"
            name="tradingName"
            value={form.tradingName}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">
            {t("label.street_address")} *
          </label>
          <input
            type="text"
            name="addressStreet"
            value={form.addressStreet}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">
            {t("label.city")} *
          </label>
          <input
            type="text"
            name="addressCity"
            value={form.addressCity}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">
            {t("label.postal_code")} *
          </label>
          <input
            type="text"
            name="addressPostal"
            value={form.addressPostal}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        {/* Owner Info */}
        <div>
          <label className="block font-semibold mb-1">
            {t("label.owner_full_name")} *
          </label>
          <input
            type="text"
            name="ownerName"
            value={form.ownerName}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">
            {t("label.owner_email")} *
          </label>
          <input
            type="email"
            name="ownerEmail"
            value={form.ownerEmail}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">
            {t("label.password")} *
          </label>
          <input
            type="password"
            name="ownerPassword"
            value={form.ownerPassword}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
            minLength={8}
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">
            {t("label.confirm_password")} *
          </label>
          <input
            type="password"
            name="ownerPasswordConfirm"
            value={form.ownerPasswordConfirm}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
            minLength={8}
          />
        </div>

        {error && <p className="text-red-600 font-semibold">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          {loading ? t("button.creating_account") : t("button.create_account")}
        </button>
      </form>
    </div>
  );
}