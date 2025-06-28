// src/hooks/usePatientHistory.js
import { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";

/**
 * Fetches a patient’s chronological history of events (visits, notes, etc.)
 * from Supabase and returns an array of “timestamp: event” strings.
 *
 * @param {string} patientId – The UUID (or whatever type) of the patient.
 * @returns {{
 *   history: string[] | null,
 *   isLoading: boolean,
 *   error: Error | null
 * }}
 */
export function usePatientHistory(patientId) {
  const [history, setHistory] = useState(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!patientId) {
      setHistory(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from("patient_history")               // ← your table name
      .select("event, timestamp")            // ← columns: adjust as needed
      .eq("patient_id", patientId)
      .order("timestamp", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("Error fetching patient history:", error);
          setError(error);
          setHistory([]);
        } else {
          // Map rows to "timestamp: event" strings
          const lines = data.map((row) => {
            const ts = new Date(row.timestamp).toLocaleString();
            return `${ts}: ${row.event}`;
          });
          setHistory(lines);
        }
      })
      .finally(() => setLoading(false));
  }, [patientId]);

  return { history, isLoading, error };
}

