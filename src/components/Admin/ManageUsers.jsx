import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";

const ROLES = [
  { value: "dentist", label: "Dentist" },
  { value: "assistant", label: "Dental Assistant" },
  { value: "office_manager", label: "Office Manager" },
];

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("dentist");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCompanyUsers();
  }, []);

  const fetchCompanyUsers = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // Fetch current user's company_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      setError("Could not find your company info.");
      return;
    }

    const { data: companyUsers, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, users(email)")
      .eq("company_id", profile.company_id)
      .order("full_name");

    if (error) {
      setError("Error fetching users: " + error.message);
      return;
    }

    setUsers(companyUsers || []);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email.trim() || !fullName.trim()) {
      setError("Please provide full name and email.");
      setLoading(false);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in.");
        setLoading(false);
        return;
      }

      // Fetch current user's company_id to send along
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profile) {
        setError("Could not find your company info.");
        setLoading(false);
        return;
      }

      // Call your Edge Function endpoint to create the user securely
      const response = await fetch(
        "https://imnaccrdadrmrljsgcpl.functions.supabase.co/createUser",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            full_name: fullName.trim(),
            role,
            company_id: profile.company_id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to invite user.");
        setLoading(false);
        return;
      }

      // Success: refresh users list and clear form
      fetchCompanyUsers();
      setEmail("");
      setFullName("");
      setRole("dentist");
      setLoading(false);
    } catch (err) {
      setError("Unexpected error: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded shadow mt-10">
      <h1 className="text-2xl font-bold mb-6">Manage Practice Users</h1>

      <form onSubmit={handleAddUser} className="space-y-4 mb-6">
        <div>
          <label className="block font-semibold mb-1">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-red-600 font-semibold">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          {loading ? "Inviting..." : "Invite User"}
        </button>
      </form>

      <h2 className="text-xl font-semibold mb-4">Current Users</h2>
      {users.length === 0 ? (
        <p>No users yet.</p>
      ) : (
        <ul className="space-y-2">
          {users.map((u) => (
            <li
              key={u.id}
              className="border p-3 rounded flex justify-between items-center"
            >
              <span>
                {u.full_name || "(No Name)"} - <em>{u.role}</em>
              </span>
              <span className="text-gray-600 text-sm">
                {u.users?.email || "No email"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
