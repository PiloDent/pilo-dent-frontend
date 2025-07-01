import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useTranslation } from "react-i18next";

export default function AdminSettings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState({});
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("clinic_settings")
        .select("key, value")
        .order("key");
      if (error) {
        setError(error.message);
      } else {
        const obj = {};
        data.forEach(({ key, value }) => {
          obj[key] = value;
        });
        setSettings(obj);
      }
      setLoading(false);
    })();
  }, []);

  const handleChange = (key, newVal) => {
    setEditing((prev) => ({ ...prev, [key]: newVal }));
  };

  const saveSetting = async (key) => {
    const newValue = editing[key] ?? settings[key];
    setSaving(key);
    setError("");
    const { error } = await supabase
      .from("clinic_settings")
      .upsert({ key, value: newValue }, { returning: "minimal" });
    setSaving(null);
    if (error) {
      setError(t("error.save_setting", { key, message: error.message }));
    } else {
      setSettings((prev) => ({ ...prev, [key]: newValue }));
      setEditing((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  if (loading) return <p>{t("message.loading_settings")}</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="p-6 bg-white rounded-2xl shadow space-y-6">
      <h2 className="text-2xl font-semibold">{t("header.admin_settings")}</h2>
      <div className="space-y-4">
        {Object.entries(settings).map(([key, value]) => (
          <div key={key} className="flex items-center space-x-4 border-b pb-2">
            <div className="w-1/4 text-gray-700 capitalize">
              {t(`settings.${key}`, { defaultValue: key.replace(/_/g, " ") })}
            </div>
            <input
              type="text"
              className="flex-1 border p-2 rounded"
              value={
                editing[key] !== undefined
                  ? editing[key]
                  : JSON.stringify(value)
              }
              onChange={(e) => handleChange(key, JSON.parse(e.target.value))}
            />
            <button
              onClick={() => saveSetting(key)}
              disabled={saving === key}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {saving === key ? t("button.saving") : t("button.save")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
