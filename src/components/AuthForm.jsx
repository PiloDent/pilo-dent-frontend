import { useState } from "react";
import { supabase } from "@/supabaseClient";

export default function AuthForm({ type = "login" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("dentist");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (type === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else if (data.user) {
        const { error: insertError } = await supabase.from("profiles").insert([
          {
            id: data.user.id,
            role,
          },
        ]);

        if (insertError) {
          setMessage(
            "Signup succeeded, but profile insert failed: " +
              insertError.message
          );
        } else {
          setMessage("Signup successful! Check your email to confirm.");
        }
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Logged in successfully.");
      }
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto mt-10">
      <h2 className="text-2xl font-bold">
        {type === "signup" ? "Sign Up" : "Login"}
      </h2>

      <input
        className="w-full border p-2"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        className="w-full border p-2"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      {type === "signup" && (
        <select
          className="w-full border p-2"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="dentist">Dentist</option>
          <option value="admin">Admin</option>
        </select>
      )}

      <button
        className="w-full bg-blue-500 text-white py-2"
        type="submit"
        disabled={loading}
      >
        {loading ? "Please wait..." : type === "signup" ? "Sign Up" : "Login"}
      </button>

      {message && <p className="text-sm text-red-500">{message}</p>}
    </form>
  );
}
