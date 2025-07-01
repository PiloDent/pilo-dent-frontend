// src/components/shared/ShiftReminder.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";

export default function ShiftReminder() {
  const [nextShift, setNextShift] = useState(null);

  useEffect(() => {
    async function fetchNextShift() {
      const user = supabase.auth.user();
      if (!user) return;

      const { data, error } = await supabase
        .from("shifts")
        .select("date, start_time, end_time, location")
        .eq("user_id", user.id)
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true })
        .limit(1);

      if (!error && data && data.length > 0) {
        setNextShift(data[0]);
      }
    }

    fetchNextShift();
  }, []);

  if (!nextShift) return null;

  const { date, start_time, end_time, location } = nextShift;
  const formattedDate = new Date(date).toLocaleDateString();

  return (
    <div className="p-3 bg-blue-100 rounded-md shadow-sm">
      <strong>Next shift:</strong>{" "}
      <span className="ml-1">
        {formattedDate} @ {start_time}
        {end_time ? `–${end_time}` : ""}
      </span>
      {location && (
        <div className="text-sm text-gray-600">Location: {location}</div>
      )}
    </div>
  );
}
