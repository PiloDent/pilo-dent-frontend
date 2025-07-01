// src/components/Dentist/DentistDashboard.jsx
import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

import PatientNotes from "../Patient/PatientNotes";
import PatientHistory from "../Patient/PatientHistory";
import BillingAssistant from "./BillingAssistant";
import BillingVoiceRecorder from "./BillingVoiceRecorder";
import ToothChart from "../Patient/ToothChart";
import InsuranceSummary from "../Patient/InsuranceSummary";
import LiveDictation from "../Patient/LiveDictation.jsx";
import TreatmentCoordinator from "../Patient/TreatmentCoordinator.jsx";
import NextBestAction from "./NextBestAction.jsx";
import TreatmentPlanEditor from "./TreatmentPlanEditor.jsx";
import { ToothStatusProvider } from "../../context/ToothStatusContext";
import VisualAIProgressTracker from "../AI/VisualAIProgressTracker";

export default function DentistDashboard() {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [startDob, setStartDob] = useState(null);
  const [endDob, setEndDob] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  // Detailed data for selected patient
  const [treatmentHistory, setTreatmentHistory] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [selectedPatientChartUrl, setSelectedPatientChartUrl] = useState("");
  const [toothAISuggestions, setToothAISuggestions] = useState([]);
  const [voiceCodes, setVoiceCodes] = useState([]);

  // Full patient object for convenience
  const selectedPatient = patients.find(p => p.id === selectedPatientId) || null;

  useEffect(() => {
    let subscription;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await fetchPatients(user.id);
      subscription = supabase
        .channel("realtime-patients")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "patients",
            filter: `dentist_id=eq.${user.id}`,
          },
          () => fetchPatients(user.id)
        )
        .subscribe();
    })();
    return () => subscription && supabase.removeChannel(subscription);
  }, []);

  const fetchPatients = async (dentistId) => {
    const { data, error } = await supabase
      .from("patients")
      .select(
        "id, first_name, last_name, dob, updated_at, no_show_risk, perio_risk_score, compliance_score, language, age, insurance, anxiety_level"
      )
      .eq("dentist_id", dentistId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching patients:", error);
    } else {
      setPatients(data);
      setFilteredPatients(data);
    }
  };

  const filterList = (term, start, end) =>
    setFilteredPatients(
      patients.filter((p) => {
        const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
        if (!fullName.includes(term.toLowerCase())) return false;
        const dobDate = new Date(p.dob);
        if (start && dobDate < start) return false;
        if (end && dobDate > end) return false;
        return true;
      })
    );

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearch(term);
    filterList(term, startDob, endDob);
  };

  const handleDateChange = (which, date) => {
    const newStart = which === "start" ? date : startDob;
    const newEnd = which === "end" ? date : endDob;
    if (which === "start") setStartDob(date);
    else setEndDob(date);
    filterList(search, newStart, newEnd);
  };

  const handleSelectPatient = (id) => {
    setSelectedPatientId(id);
    // fetch related data
    fetchTreatmentHistory(id);
    fetchUpcoming(id);
    fetchChartUrl(id);
  };

  const fetchTreatmentHistory = async (patientId) => {
    const { data } = await supabase
      .from("treatment_history")
      .select("code, date, notes")
      .eq("patient_id", patientId)
      .order("date", { ascending: false })
      .limit(5);
    setTreatmentHistory(data || []);
  };

  const fetchUpcoming = async (patientId) => {
    const { data } = await supabase
      .from("appointments")
      .select("date, appointment_time as time, dentist(first_name, last_name)")
      .eq("patient_id", patientId)
      .order("date", { ascending: true })
      .limit(3);
    setUpcomingAppointments(data || []);
  };

  const fetchChartUrl = async (patientId) => {
    const { data } = await supabase
      .from("patients")
      .select("tooth_chart_url")
      .eq("id", patientId)
      .single();
    setSelectedPatientChartUrl(data?.tooth_chart_url || "");
    setToothAISuggestions([]);
  };

  const handleChartUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedPatientId) return;

    const ext = file.name.split(".").pop();
    const name = `chart_${selectedPatientId}.${ext}`;
    const path = `${selectedPatientId}/${name}`;

    const { error: upErr } = await supabase.storage
      .from("toothcharts")
      .upload(path, file, { upsert: true });
    if (upErr) return console.error("Upload error:", upErr);

    const {
      data: { publicUrl },
    } = supabase.storage.from("toothcharts").getPublicUrl(path);

    await supabase
      .from("patients")
      .update({ tooth_chart_url: publicUrl })
      .eq("id", selectedPatientId);
    setSelectedPatientChartUrl(publicUrl);

    try {
      const res = await fetch(`/functions/analyze-tooth-chart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatientId,
          chartUrl: publicUrl,
        }),
      });
      const { suggestions } = await res.json();
      setToothAISuggestions(suggestions || []);
    } catch (err) {
      console.error("Analysis error:", err);
    }
  };

  return (
    <ToothStatusProvider>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold mb-4">🦷 Dentist Dashboard</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Patient List & Filters */}
          <div className="border p-4 rounded bg-white shadow-sm">
            <div className="space-y-4 mb-4">
              <input
                type="text"
                value={search}
                onChange={handleSearch}
                placeholder="🔍 Suche nach Name"
                className="w-full p-2 border rounded"
              />
              <div className="flex gap-2">
                <DatePicker
                  selected={startDob}
                  onChange={(d) => handleDateChange("start", d)}
                  placeholderText="Geburtsdatum ab"
                  className="w-1/2 p-2 border rounded"
                />
                <DatePicker
                  selected={endDob}
                  onChange={(d) => handleDateChange("end", d)}
                  placeholderText="Geburtsdatum bis"
                  className="w-1/2 p-2 border rounded"
                />
              </div>
            </div>
            <ul className="space-y-2 max-h-72 overflow-y-auto">
              {filteredPatients.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => handleSelectPatient(p.id)}
                    className="text-blue-600 hover:underline"
                  >
                    {p.first_name} {p.last_name} (
                    {new Date(p.dob).toLocaleDateString()})
                  </button>
                </li>
              ))}
            </ul>
            <VisualAIProgressTracker />
          </div>

          {/* Selected Patient Details */}
          <div className="border p-4 rounded bg-white shadow-sm">
            {selectedPatientId ? (
              <>
                <h2 className="text-lg font-semibold mb-2">
                  👤 Patient: {selectedPatient?.first_name}{" "}
                  {selectedPatient?.last_name}
                </h2>

                {/* Risk Scores */}
                {selectedPatient && (
                  <div className="mb-4 p-4 bg-yellow-50 rounded">
                    <h4 className="font-semibold mb-1">Risk Scores</h4>
                    <p>
                      No-Show Risk:{" "}
                      {(selectedPatient.no_show_risk * 100).toFixed(1)}%
                    </p>
                    <p>
                      Perio Risk:{" "}
                      {(selectedPatient.perio_risk_score * 100).toFixed(1)}%
                    </p>
                    <p>
                      Compliance:{" "}
                      {(selectedPatient.compliance_score * 100).toFixed(1)}%
                    </p>
                  </div>
                )}

                {/* Treatment Plan Editor */}
                <div className="mb-6">
                  <TreatmentPlanEditor
                    patientId={selectedPatientId}
                    onPlanCreated={() => {
                      /* refetch or notify */
                    }}
                  />
                </div>

                {/* Tooth Chart Upload */}
                <div className="mb-4">
                  <label className="block mb-1 font-medium">Tooth Chart</label>
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={handleChartUpload}
                    className="mb-2"
                  />
                  {selectedPatientChartUrl && (
                    <p>
                      <a
                        href={selectedPatientChartUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        View current chart
                      </a>
                    </p>
                  )}
                </div>

                {/* AI Treatment Suggestions */}
                {toothAISuggestions.length > 0 && (
                  <div className="mb-4 p-4 bg-gray-50 rounded border">
                    <h3 className="font-semibold mb-2">
                      AI Treatment Suggestions
                    </h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {toothAISuggestions.map((s, i) => (
                        <li key={i}>
                          Tooth {s.tooth}: {s.issue} → {s.suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI Treatment Coordinator */}
                <div className="mb-6">
                  <TreatmentCoordinator
                    patient={selectedPatient}
                    treatmentCode={selectedPatient.treatment_code || ""}
                  />
                </div>

                {/* Next-Best-Action Engine */}
                <div className="mb-6">
                  <NextBestAction
                    patient={selectedPatient}
                    treatments={treatmentHistory}
                    appointments={upcomingAppointments}
                  />
                </div>

                {/* Live Dictation & Audit Logs */}
                <div className="mb-6">
                  <LiveDictation patientId={selectedPatientId} />
                </div>

                {/* Notes, History, Billing */}
                <PatientNotes patientId={selectedPatientId} />
                <PatientHistory
                  patientId={selectedPatientId}
                  patientName={`${selectedPatient?.first_name} ${selectedPatient?.last_name}`}
                />
                <div className="mt-6 space-y-4">
                  <BillingVoiceRecorder
                    patientId={selectedPatientId}
                    onCodesMatched={setVoiceCodes}
                  />
                  <BillingAssistant
                    patientId={selectedPatientId}
                    initialCodes={voiceCodes}
                  />
                </div>

                {/* Tooth Chart & Insurance */}
                <div className="mt-6">
                  <ToothChart patientId={selectedPatientId} />
                </div>
                <div className="mt-6">
                  <InsuranceSummary
                    patientId={selectedPatientId}
                    patientName={`${selectedPatient?.first_name} ${selectedPatient?.last_name}`}
                  />
                </div>
              </>
            ) : (
              <p>⬅️ Bitte wählen Sie einen Patienten aus.</p>
            )}
          </div>
        </div>
      </div>
    </ToothStatusProvider>
  );
}
