import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";

const toothNumbers = [
  "18",
  "17",
  "16",
  "15",
  "14",
  "13",
  "12",
  "11",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
  "48",
  "47",
  "46",
  "45",
  "44",
  "43",
  "42",
  "41",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "37",
  "38",
];

const statusColors = {
  filled: "bg-yellow-300",
  crowned: "bg-purple-300",
  missing: "bg-red-400",
  healthy: "bg-green-300",
};

export default function TeethChart({ patientId }) {
  const [teeth, setTeeth] = useState({});
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [status, setStatus] = useState("healthy");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const fetchTeethStatus = async () => {
      if (!patientId) return;
      const { data, error } = await supabase
        .from("teeth_status")
        .select("*")
        .eq("patient_id", patientId);

      if (!error) {
        const mapped = {};
        data.forEach((t) => {
          mapped[t.tooth_number] = t;
        });
        setTeeth(mapped);
      }
    };

    fetchTeethStatus();
  }, [patientId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTooth) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("teeth_status").upsert({
      patient_id: patientId,
      tooth_number: selectedTooth,
      status,
      notes,
      updated_at: new Date().toISOString(),
    });

    if (!error) {
      setTeeth((prev) => ({
        ...prev,
        [selectedTooth]: {
          tooth_number: selectedTooth,
          status,
          notes,
        },
      }));
      setSelectedTooth(null);
      setStatus("healthy");
      setNotes("");
    }
  };

  return (
    <div className="mt-10 space-y-6">
      <h3 className="text-xl font-bold">🦷 Interactive Teeth Chart</h3>

      <div className="grid grid-cols-8 gap-2 max-w-xl mx-auto">
        {toothNumbers.map((num) => {
          const t = teeth[num];
          const color = statusColors[t?.status] || "bg-gray-100";
          return (
            <button
              key={num}
              onClick={() => {
                setSelectedTooth(num);
                setStatus(t?.status || "healthy");
                setNotes(t?.notes || "");
              }}
              className={`p-4 rounded border text-center ${color}`}
            >
              {num}
            </button>
          );
        })}
      </div>

      {selectedTooth && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 border p-4 rounded shadow max-w-md mx-auto"
        >
          <h4 className="text-lg font-semibold">Tooth {selectedTooth}</h4>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border p-2"
          >
            <option value="healthy">Healthy</option>
            <option value="filled">Filled</option>
            <option value="crowned">Crowned</option>
            <option value="missing">Missing</option>
          </select>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border p-2"
            placeholder="Optional notes"
          />

          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded w-full"
          >
            Save Tooth Status
          </button>
        </form>
      )}
    </div>
  );
}
