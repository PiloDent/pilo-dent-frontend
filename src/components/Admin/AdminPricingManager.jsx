import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useTranslation } from "react-i18next";

export default function AdminPricingManager() {
  const { t } = useTranslation();
  const [billingCodes, setBillingCodes] = useState([]);
  const [customPrices, setCustomPrices] = useState({});
  const [adminId, setAdminId] = useState(null);
  const [companyId, setCompanyId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setAdminId(user.id);

    const { data: companyData, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .eq("admin_id", user.id)
      .single();

    if (companyError) {
      console.error(t("error.company_not_found"), companyError);
      return;
    }

    setCompanyId(companyData.id);

    const { data: codes, error: codeError } = await supabase
      .from("billing_codes")
      .select("*");

    const { data: prices, error: priceError } = await supabase
      .from("custom_prices")
      .select("*")
      .eq("company_id", companyData.id);

    if (codeError || priceError) {
      console.error(t("error.loading_billing_data"), codeError || priceError);
      return;
    }

    const priceMap = {};
    prices.forEach((p) => {
      priceMap[p.billing_code_id] = p.custom_cost;
    });

    setBillingCodes(codes);
    setCustomPrices(priceMap);
  };

  const handleChange = (billingCodeId, value) => {
    setCustomPrices({ ...customPrices, [billingCodeId]: value });
  };

  const saveCustomPrices = async () => {
    for (const billingCode of billingCodes) {
      const customCost = customPrices[billingCode.id];
      if (!customCost) continue;

      await supabase.from("custom_prices").upsert({
        company_id: companyId,
        billing_code_id: billingCode.id,
        custom_cost: parseFloat(customCost),
      });
    }

    alert(t("alert.prices_saved"));
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow mt-10">
      <h2 className="text-xl font-bold mb-4">
        💰 {t("header.company_pricing")}
      </h2>
      <table className="w-full table-auto border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-3 py-2 text-left">{t("table_header.code")}</th>
            <th className="border px-3 py-2 text-left">{t("table_header.type")}</th>
            <th className="border px-3 py-2 text-left">{t("table_header.description")}</th>
            <th className="border px-3 py-2 text-left">{t("table_header.default_eur")}</th>
            <th className="border px-3 py-2 text-left">{t("table_header.custom_eur")}</th>
          </tr>
        </thead>
        <tbody>
          {billingCodes.map((code) => (
            <tr key={code.id}>
              <td className="border px-3 py-1">{code.code}</td>
              <td className="border px-3 py-1">{code.type}</td>
              <td className="border px-3 py-1">{code.description}</td>
              <td className="border px-3 py-1">
                {parseFloat(code.cost).toFixed(2)}
              </td>
              <td className="border px-3 py-1">
                <input
                  type="number"
                  step="0.01"
                  className="border p-1 w-24 rounded"
                  value={customPrices[code.id] || ""}
                  onChange={(e) => handleChange(code.id, e.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={saveCustomPrices}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        💾 {t("button.save_prices")}
      </button>
    </div>
  );
}
