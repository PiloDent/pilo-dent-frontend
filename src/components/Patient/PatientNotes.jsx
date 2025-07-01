import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";

export default function PatientNotes({ patientId }) {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");

  useEffect(() => {
    if (patientId) fetchNotes();
  }, [patientId]);

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from("notes")
      .select("id, note_text, created_at, dentist_id, dentists(name)")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch notes:", error);
    } else {
      setNotes(data);
    }
  };

  const handleAddNote = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("notes").insert([
      {
        patient_id: patientId,
        dentist_id: user.id,
        note_text: newNote,
      },
    ]);

    if (error) {
      alert("Failed to add note.");
      console.error(error);
    } else {
      setNewNote("");
      fetchNotes();
    }
  };

  return (
    <div className="border p-4 rounded bg-white mt-6 space-y-4">
      <h3 className="text-lg font-semibold">💬 Patient Notes</h3>

      <textarea
        value={newNote}
        onChange={(e) => setNewNote(e.target.value)}
        className="w-full p-2 border rounded"
        rows={3}
        placeholder="Write a new note..."
      ></textarea>

      <button
        onClick={handleAddNote}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        ➕ Add Note
      </button>

      <div className="space-y-3 mt-4">
        {notes.map((note) => (
          <div key={note.id} className="border-t pt-2">
            <p className="text-sm text-gray-700">{note.note_text}</p>
            <p className="text-xs text-gray-500">
              {note.dentists?.name || note.dentist_id} —{" "}
              {new Date(note.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
