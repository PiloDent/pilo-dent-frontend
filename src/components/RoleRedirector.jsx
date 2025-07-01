import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";

export default function RoleRedirector() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        console.error("Error loading role", error);
        return;
      }

      // Redirect based on role
      if (data.role === "admin") {
        navigate("/admin");
      } else if (data.role === "dentist") {
        navigate("/dentist");
      }
    };

    checkRole();
  }, [navigate]);

  return null;
}
