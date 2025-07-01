import { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import bcrypt from "bcryptjs";

export default function TabletDashboard() {
  const [pin, setPin] = useState("");
  const [employee, setEmployee] = useState(null);
  const [log, setLog] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [clock, setClock] = useState("");
  const [location, setLocation] = useState({ lat: null, lon: null });

  const today = new Date().toISOString().split("T")[0];

  // Real-time clock
  useEffect(() => {
    const iv = setInterval(() => {
      const now = new Date();
      setClock(
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // GPS once
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) =>
          setLocation({ lat: coords.latitude, lon: coords.longitude }),
        () => {}
      );
    }
  }, []);

  const resetScreen = () =>
    setTimeout(() => {
      setPin("");
      setEmployee(null);
      setLog(null);
      setStatus("");
      setConfirmation(null);
    }, 4000);

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      const { data: emps } = await supabase
        .from("employees")
        .select("id, full_name, pin_hash");
      const match = emps.find((emp) => bcrypt.compareSync(pin, emp.pin_hash));
      if (!match) throw new Error("Invalid PIN");
      setEmployee(match);
      const { data: existing } = await supabase
        .from("work_logs")
        .select("*")
        .eq("employee_id", match.id)
        .eq("date", today)
        .single();
      if (existing) setLog(existing);
    } catch (err) {
      setStatus(
        err.message.includes("Invalid")
          ? "❌ Invalid PIN"
          : "Error checking PIN."
      );
    } finally {
      setLoading(false);
    }
  };

  const updateLog = async (fields) => {
    setLoading(true);
    try {
      const geo = { latitude: location.lat, longitude: location.lon };
      let res;
      if (log) {
        res = await supabase
          .from("work_logs")
          .update({ ...fields, ...geo })
          .eq("id", log.id)
          .select()
          .single();
      } else {
        res = await supabase
          .from("work_logs")
          .insert([
            { employee_id: employee.id, date: today, ...fields, ...geo },
          ])
          .select()
          .single();
      }
      if (res.error) throw res.error;
      const action = Object.keys(fields)[0].replace(/_/g, " ").toUpperCase();
      const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setConfirmation({ name: employee.full_name, action, time });
      setLog(res.data);
      resetScreen();
    } catch {
      setStatus("Error saving action.");
      setLoading(false);
    }
  };

  const handleClockIn = () => updateLog({ check_in: new Date().toISOString() });
  const handleStartBreak = () =>
    updateLog({ break_start: new Date().toISOString() });
  const handleEndBreak = () =>
    updateLog({ break_end: new Date().toISOString() });
  const handleClockOut = () =>
    updateLog({ check_out: new Date().toISOString() });

  const renderButtons = () => {
    if (!employee) return null;
    return (
      <div className="space-y-4 text-center">
        <h2 className="text-xl font-semibold">Hello, {employee.full_name}</h2>

        {!log?.check_in && (
          <button
            onClick={handleClockIn}
            className="w-full bg-green-600 text-white p-3 rounded text-lg"
            disabled={loading}
          >
            {loading ? "Processing..." : "Clock In"}
          </button>
        )}
        {log?.check_in && !log?.break_start && (
          <button
            onClick={handleStartBreak}
            className="w-full bg-yellow-500 text-white p-3 rounded text-lg"
            disabled={loading}
          >
            {loading ? "Processing..." : "Start Break"}
          </button>
        )}
        {log?.break_start && !log?.break_end && (
          <button
            onClick={handleEndBreak}
            className="w-full bg-yellow-700 text-white p-3 rounded text-lg"
            disabled={loading}
          >
            {loading ? "Processing..." : "End Break"}
          </button>
        )}
        {log?.check_in && !log?.check_out && (
          <button
            onClick={handleClockOut}
            className="w-full bg-red-600 text-white p-3 rounded text-lg"
            disabled={loading}
          >
            {loading ? "Processing..." : "Clock Out"}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 relative">
      {/* clock */}
      <div className="absolute top-4 right-4 text-xl text-gray-700 font-mono">
        {clock}
      </div>
      {/* confirmation overlay */}
      {confirmation && (
        <div className="fixed inset-0 bg-green-600 text-white flex flex-col items-center justify-center z-50">
          <h2 className="text-3xl font-bold mb-2">{confirmation.action} ✅</h2>
          <p className="text-xl">{confirmation.name}</p>
          <p className="text-lg mt-1">{confirmation.time}</p>
        </div>
      )}
      {/* main */}
      <div className="max-w-sm w-full bg-white shadow-md rounded-lg p-6">
        {!employee ? (
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <h2 className="text-xl font-bold text-center">Enter PIN</h2>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full p-3 border rounded text-center text-xl"
              placeholder="****"
              maxLength={6}
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-3 rounded text-lg"
              disabled={loading}
            >
              {loading ? "Checking..." : "Submit"}
            </button>
          </form>
        ) : (
          renderButtons()
        )}

        {status && (
          <p className="text-center mt-4 text-sm text-gray-700">{status}</p>
        )}
      </div>
    </div>
  );
}
