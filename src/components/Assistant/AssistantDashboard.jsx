import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import ShiftReminder from "../Shared/ShiftReminder";
import AssistantShiftCalendar from "./AssistantShiftCalendar";

export default function AssistantDashboard() {
  const [name, setName] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", user.id)
          .single();

        if (data?.name) setName(data.name);
      }
    };

    fetchProfile();
  }, []);

  return (
    <div className="max-w-6xl mx-auto mt-10 space-y-6">
      <h1 className="text-3xl font-bold">👩‍🔬 Welcome, {name}</h1>
      <ShiftReminder />
      <p className="text-gray-600">
        This is your assistant dashboard. You’ll see your upcoming shifts,
        tasks, and alerts here.
      </p>

      {/* Optional: inline calendar instead of separate page */}
      <AssistantShiftCalendar />
    </div>
  );
}
