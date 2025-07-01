import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981"]; // Blue = BEMA, Green = GOZ

export default function AdminBillingCharts() {
  const { t } = useTranslation();
  const [revenueByDentist, setRevenueByDentist] = useState([]);
  const [bemaVsGoz, setBemaVsGoz] = useState([]);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    const { data, error } = await supabase
      .from("treatment_history")
      .select("id, dentist_id, billing_codes(cost, type), dentists(name)");

    if (error) {
      console.error(t("error.failed_load_billing"), error);
      return;
    }

    const revenueMap = {};
    const typeMap = { BEMA: 0, GOZ: 0 };

    data.forEach((entry) => {
      const dentistName = entry.dentists?.name || t("text.unknown");
      const amount = parseFloat(entry.billing_codes?.cost || 0);
      const type = entry.billing_codes?.type;

      if (!revenueMap[dentistName]) revenueMap[dentistName] = 0;
      revenueMap[dentistName] += amount;

      if (type && typeMap[type] !== undefined) {
        typeMap[type] += amount;
      }
    });

    setRevenueByDentist(
      Object.entries(revenueMap).map(([name, total]) => ({
        name,
        revenue: Math.round(total * 100) / 100,
      }))
    );

    setBemaVsGoz(
      Object.entries(typeMap).map(([type, value]) => ({
        name: type,
        value: Math.round(value * 100) / 100,
      }))
    );
  };

  return (
    <div className="mt-10 space-y-8 max-w-4xl mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold">{t("header.revenue_by_dentist")}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={revenueByDentist}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="revenue" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>

      <h2 className="text-xl font-bold">{t("header.bema_vs_goz")}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={bemaVsGoz}
            dataKey="value"
            nameKey="name"
            outerRadius={100}
            label
          >
            {bemaVsGoz.map((entry, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => value} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}