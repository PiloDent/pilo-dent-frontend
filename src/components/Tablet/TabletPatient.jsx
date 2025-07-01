// src/components/Tablet/TabletPatient.jsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/supabaseClient";
import jsPDF from "jspdf";
import NewPatientForm from "../Patient/NewPatientForm";
import LanguageSwitcher from "../LanguageSwitcher.jsx";

export default function TabletPatient() {
  const { t } = useTranslation();

  const [view, setView] = useState("menu");
  const [appointments, setAppointments] = useState([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [status, setStatus] = useState("");
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (view === "existing") {
      supabase
        .from("appointments")
        .select(
          "id, patient_first_name, patient_last_name, patient_dob, checked_in"
        )
        .eq("date", today)
        .then(({ data, error }) => {
          if (!error) setAppointments(data);
        });
    }
  }, [view, today]);

  const handleExisting = async (e) => {
    e.preventDefault();
    setStatus("");
    const appt = appointments.find(
      (a) =>
        a.patient_first_name.toLowerCase() === firstName.trim().toLowerCase() &&
        a.patient_last_name.toLowerCase() === lastName.trim().toLowerCase() &&
        a.patient_dob === dob &&
        !a.checked_in
    );
    if (!appt) {
      setStatus(t("tablet_patient.not_found"));
      return;
    }
    const { error } = await supabase
      .from("appointments")
      .update({ checked_in: true })
      .eq("id", appt.id);
    if (error) {
      setStatus(t("tablet_patient.checkin_error"));
    } else {
      setStatus(t("tablet_patient.checkin_success"));
      setView("confirmed");
      setTimeout(() => setView("menu"), 4000);
    }
  };

  const generatePDF = (formData) => {
    const doc = new jsPDF();
    doc.text(t("tablet_patient.new_patient_pdf_title"), 10, 10);
    Object.entries(formData).forEach(([key, value], i) =>
      doc.text(`${key}: ${value}`, 10, 20 + i * 10)
    );
    return doc.output("blob");
  };

  const handleNewPatientSuccess = async (formData) => {
    setStatus(t("tablet_patient.sending_data"));
    try {
      const { data: apptMatch, error: apptErr } = await supabase
        .from("appointments")
        .select("dentist_id")
        .eq("patient_first_name", formData.firstName)
        .eq("patient_last_name", formData.lastName)
        .eq("patient_dob", formData.dob)
        .eq("date", today)
        .maybeSingle();
      if (apptErr) throw apptErr;
      if (!apptMatch?.dentist_id) {
        setStatus(t("tablet_patient.no_dentist"));
        return;
      }
      const dentistId = apptMatch.dentist_id;

      const { data, error: insertErr } = await supabase
        .from("patients")
        .insert([
          {
            first_name: formData.firstName,
            last_name: formData.lastName,
            dob: formData.dob,
            gender: formData.gender,
            address: formData.address,
            phone: formData.phone,
            email: formData.email || null,
            insurer_type: formData.insurerType,
            insurance_provider: formData.insurer,
            insurance_number: formData.insuranceNumber,
            allergies: formData.allergies || null,
            medications: formData.medications || null,
            status: "intake_received",
            dentist_id: dentistId,
          },
        ])
        .select()
        .single();
      if (insertErr) throw insertErr;

      const blob = generatePDF(formData);
      const body = new FormData();
      body.append("file", blob, `intake_${data.id}.pdf`);
      body.append("patientId", data.id);
      body.append("firstName", formData.firstName);
      body.append("lastName", formData.lastName);

      await fetch("/functions/intake", { method: "POST", body });

      const emailResp = await fetch("/functions/email-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: data.id }),
      });
      if (!emailResp.ok) throw new Error("Email send failed");

      setStatus(t("tablet_patient.submit_success"));
      setView("confirmed");
      setTimeout(() => setView("menu"), 4000);
    } catch (err) {
      console.error(err);
      setStatus(t("tablet_patient.process_error"));
    }
  };

  if (view === "menu") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <LanguageSwitcher />
        <h2 className="text-2xl font-bold mb-6">
          {t("tablet_patient.menu_title")}
        </h2>
        <button
          onClick={() => {
            setView("existing");
            setStatus("");
          }}
          className="w-full max-w-xs bg-blue-600 text-white p-4 rounded mb-4"
        >
          {t("tablet_patient.existing_button")}
        </button>
        <button
          onClick={() => setView("new")}
          className="w-full max-w-xs bg-green-600 text-white p-4 rounded"
        >
          {t("tablet_patient.new_button")}
        </button>
      </div>
    );
  }
  if (view === "existing") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <LanguageSwitcher />
        <h2 className="text-xl font-semibold mb-4">
          {t("tablet_patient.existing_title")}
        </h2>
        <form onSubmit={handleExisting} className="space-y-4 w-full max-w-sm">
          <input
            type="text"
            placeholder={t("tablet_patient.first_name")}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="w-full p-3 border rounded"
          />
          <input
            type="text"
            placeholder={t("tablet_patient.last_name")}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="w-full p-3 border rounded"
          />
          <input
            type="date"
            placeholder={t("tablet_patient.dob")}
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            required
            className="w-full p-3 border rounded"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-3 rounded"
          >
            {t("tablet_patient.checkin_button")}
          </button>
        </form>
        {status && <p className="mt-4 text-red-600">{status}</p>}
      </div>
    );
  }
  if (view === "new") {
    return (
      <div className="min-h-screen overflow-auto p-4 bg-white">
        <LanguageSwitcher />
        <NewPatientForm onSuccess={handleNewPatientSuccess} />
        {status && <p className="mt-4 text-red-600">{status}</p>}
      </div>
    );
  }
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-100 p-4">
      <h2 className="text-3xl font-bold text-green-800">{status}</h2>
    </div>
  );
}
