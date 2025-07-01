import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";

const roles = ["admin", "dentist", "assistant", "patient"];

export default function DebugUserPanel() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentRole, setCurrentRole] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
    });
  }, []);

  const handleChangeRole = async (role) => {
    if (!currentUser) return;
    setStatus("Updating…");

    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", currentUser.id);

    if (error) {
      console.error("Failed to update role", error.message);
      setStatus("❌ Failed");
    } else {
      setCurrentRole(role);
      setStatus(`✅ Role set to ${role}`);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border shadow-md p-3 rounded z-50">
      <p className="font-semibold mb-2">🛠 Debug Role Switcher</p>
      {roles.map((role) => (
        <button
          key={role}
          onClick={() => handleChangeRole(role)}
          className="text-sm mr-2 mb-1 px-2 py-1 border rounded hover:bg-gray-100"
        >
          {role}
        </button>
      ))}
      {status && <p className="text-xs text-gray-600 mt-2">{status}</p>}
    </div>
  );
}
