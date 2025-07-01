import { useState } from "react";
import { supabase } from "@/supabaseClient";

export default function EditTreatmentModal({ entry, onClose, onSaved }) {
  const [description, setDescription] = useState(entry.treatment_description);
  const [tooth, setTooth] = useState(entry.tooth || "");
  const [date, setDate] = useState(entry.treatment_date.slice(0, 10));

  const handleSave = async () => {
    const { error } = await supabase
      .from("treatment_history")
      .update({
        treatment_description: description,
        tooth,
        treatment_date: date,
      })
      .eq("id", entry.id);

    if (error) {
      alert("Update failed");
      console.error(error);
    } else {
      onSaved();
      onClose();
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm("Are you sure you want to delete this entry?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("treatment_history")
      .delete()
      .eq("id", entry.id);

    if (error) {
      alert("Delete failed");
      console.error(error);
    } else {
      onSaved();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md space-y-4">
        <h3 className="text-lg font-semibold">✏️ Edit Treatment</h3>
        <label className="block text-sm">Treatment Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <label className="block text-sm">Tooth (optional)</label>
        <input
          value={tooth}
          onChange={(e) => setTooth(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <label className="block text-sm">Treatment Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <div className="flex justify-between pt-4">
          <button
            onClick={handleSave}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            💾 Save
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            🗑️ Delete
          </button>
          <button
            onClick={onClose}
            className="bg-gray-400 text-white px-4 py-2 rounded"
          >
            ❌ Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
