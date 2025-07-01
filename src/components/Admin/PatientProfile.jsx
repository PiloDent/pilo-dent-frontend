import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import NextBestAction from "../Patient/NextBestAction";
import TreatmentCoordinator from "../Patient/TreatmentCoordinator";
import AppointmentsTable from "./AppointmentsTable";
import { useTranslation } from "react-i18next";

export default function PatientProfile() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [form, setForm] = useState({});
  const [status, setStatus] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id)
        .single();
      if (!patientError && patientData) {
        setPatient(patientData);
        setForm(patientData);
      }
      setLoading(false);

      const { data: storageData } = supabase.storage
        .from("intake_forms")
        .getPublicUrl(`patient_${id}.pdf`);
      setPdfUrl(storageData.publicUrl);

      const { data: historyData, error: historyError } = await supabase
        .from("treatment_history")
        .select("id, created_at, dentist_id, dentists(full_name), treatments")
        .eq("patient_id", id)
        .order("created_at", { ascending: false });
      if (!historyError && historyData) setHistory(historyData);
      setLoadingHistory(false);
    };

    fetchData();
  }, [id]);

  const handleSave = async () => {
    setStatus(t("status.saving"));
    const { error } = await supabase.from("patients").update({
      address: form.address,
      phone: form.phone,
      gender: form.gender,
      allergies: form.allergies,
      medications: form.medications,
      insurance_provider: form.insurance_provider,
      insurance_number: form.insurance_number,
    }).eq("id", id);

    setStatus(error ? t("status.save_failed") : t("status.saved"));
    if (!error) setPatient(prev => ({ ...prev, ...form }));
  };

  const handleUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const { error } = await supabase.storage.from("intake_forms").upload(
      `patient_${id}.pdf`, file, { upsert: true }
    );
    if (!error) {
      const { data } = supabase.storage.from("intake_forms").getPublicUrl(`patient_${id}.pdf`);
      setPdfUrl(data.publicUrl);
      setStatus(t("status.pdf_uploaded"));
    } else {
      setStatus(t("status.pdf_upload_failed"));
    }
  };

  if (loading) return <div className="p-4 text-gray-600">{t("message.loading_patient")}</div>;
  if (!patient) return <div className="p-4 text-red-600">{t("message.patient_not_found")}</div>;

  const tabs = ["overview", "appointments", "history", "documents", "settings"];

  return (
    <div className="p-4 flex space-x-6">
      <div className="flex-1">
        <h1 className="text-2xl font-bold mb-4">
          {t("header.patient_profile", { name: `${patient.first_name} ${patient.last_name}` })}
        </h1>

        <div className="flex space-x-4 border-b mb-4">
          {tabs.map(tKey => (
            <button
              key={tKey}
              className={`pb-2 ${tab===tKey?"border-b-2 border-blue-600 font-semibold":"text-gray-500"}`}
              onClick={()=>setTab(tKey)}
            >
              {t(`tab.${tKey}`)}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-4 max-w-lg">
            {[
              ["label.dob", "dob"],
              ["label.gender", "gender"],
              ["label.address", "address"],
              ["label.phone", "phone"],
              ["label.allergies", "allergies"],
              ["label.medications", "medications"],
              ["label.insurance_provider", "insurance_provider"],
              ["label.insurance_number", "insurance_number"],
              ["label.status", "status"],
            ].map(([lbl, key]) => (
              <div key={key}>
                <label className="block text-sm font-medium">{t(lbl)}</label>
                <input
                  className="w-full p-2 border rounded"
                  value={form[key]||""}
                  onChange={e=>setForm({...form,[key]:e.target.value})}
                />
              </div>
            ))}

            <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded">
              {t("button.save")}
            </button>

            <div className="mt-4">
              <label className="block mb-1 font-medium">{t("label.upload_intake_pdf")}</label>
              <input type="file" accept="application/pdf" onChange={handleUpload} />
              {pdfUrl && (
                <p className="mt-2 text-sm text-green-700">
                  <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="underline">
                    {t("link.view_current_file")}
                  </a>
                </p>
              )}
            </div>

            {status && <p className="text-sm mt-2">{status}</p>}
          </div>
        )}

        {tab === "appointments" && <AppointmentsTable patientId={id} />}

        {tab === "history" && (
          <div className="space-y-4">
            {loadingHistory ? (
              <p>{t("message.loading_history")}</p>
            ) : history.length === 0 ? (
              <p className="text-gray-500">{t("message.no_history")}</p>
            ) : (
              history.map(entry=> (
                <div key={entry.id} className="border p-4 rounded shadow">
                  <p className="text-sm text-gray-600">{new Date(entry.created_at).toLocaleString()}</p>
                  <p className="font-semibold">{t("text.dentist")} {entry.dentists?.full_name||"—"}</p>
                  <pre className="text-sm mt-2 bg-gray-50 p-2 rounded">{JSON.stringify(entry.treatments,null,2)}</pre>
                </div>
              ))
            )}
          </div>
        )}

        {(tab === "documents" || tab === "settings") && <div className="space-y-4 max-w-3xl">{t("message.tab_placeholder")}</div>}
      </div>

      <aside className="w-1/3 space-y-6">
        <NextBestAction patientId={id} />
        <TreatmentCoordinator patientId={id} />
      </aside>
    </div>
  );
}
