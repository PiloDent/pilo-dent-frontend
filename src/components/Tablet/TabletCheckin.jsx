import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";

export default function TabletCheckin() {
  const [appointments, setAppointments] = useState([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState(""); // format: YYYY-MM-DD
  const [status, setStatus] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const fetchAppointments = async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          "id, patient_first_name, patient_last_name, patient_dob, checked_in, appointment_time"
        )
        .eq("date", today);

      if (error) {
        console.error("Error fetching appointments:", error.message);
      } else {
        setAppointments(data);
      }
    };

    fetchAppointments();
  }, []);

  const handleCheckin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    const match = appointments.find((appt) => {
      return (
        appt.patient_first_name?.toLowerCase() ===
          firstName.trim().toLowerCase() &&
        appt.patient_last_name?.toLowerCase() ===
          lastName.trim().toLowerCase() &&
        appt.patient_dob === dob &&
        !appt.checked_in
      );
    });

    if (!match) {
      setStatus("❌ Appointment not found or already checked in.");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("appointments")
      .update({ checked_in: true })
      .eq("id", match.id);

    if (error) {
      console.error(error);
      setStatus("❌ Error updating check-in status.");
    } else {
      setConfirmed(true);
    }

    setLoading(false);
  };

  if (confirmed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-green-100 p-4">
        <h2 className="text-3xl font-bold text-green-800 mb-2">
          You're checked in ✅
        </h2>
        <p className="text-lg text-green-700">
          Please take a seat. Your dentist will call you shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="max-w-sm w-full bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-bold text-center mb-4">
          Patient Check-In
        </h2>

        <form onSubmit={handleCheckin} className="space-y-4">
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full p-3 border rounded"
            required
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full p-3 border rounded"
            required
          />
          <input
            type="date"
            placeholder="Date of Birth"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full p-3 border rounded"
            required
          />

          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-3 rounded text-lg"
            disabled={loading}
          >
            {loading ? "Checking..." : "Check In"}
          </button>
        </form>

        {status && (
          <p className="mt-4 text-center text-sm text-red-600">{status}</p>
        )}
      </div>
    </div>
  );
}
