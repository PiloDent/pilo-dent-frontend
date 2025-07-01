import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";

export default function CancelledAlert() {
  const [cancelled, setCancelled] = useState([]);

  useEffect(() => {
    const fetchCancelled = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("appointments")
        .select("id, patient_id, status")
        .eq("dentist_id", user.id)
        .eq("status", "cancelled");

      if (!error && data.length > 0) {
        setCancelled(data);
      }
    };

    fetchCancelled();
  }, []);

  if (cancelled.length === 0) return null;

  return (
    <div className="bg-red-100 text-red-800 border border-red-400 p-4 rounded mb-4">
      ⚠️ You have {cancelled.length} cancelled appointment
      {cancelled.length > 1 ? "s" : ""}. Please review your schedule.
    </div>
  );
}
