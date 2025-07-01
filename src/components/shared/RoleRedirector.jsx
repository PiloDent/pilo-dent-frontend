// src/components/RoleRedirector.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionContext } from "@/context/SessionContext.jsx";

/**
 * When mounted, reads the current session’s role and redirects
 * to the appropriate dashboard. If no session, sends to /login.
 */
export default function RoleRedirector() {
  const { session } = useSessionContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session) {
      navigate("/login", { replace: true });
      return;
    }

    // Supabase user role may live in user_metadata
    const role =
      session.user.role ||
      session.user.user_metadata?.role ||
      session.user.user_metadata?.is_admin
        ? "admin"
        : null;

    switch (role) {
      case "admin":
        navigate("/admin/calendar", { replace: true });
        break;
      case "dentist":
        navigate("/dentist/dashboard", { replace: true });
        break;
      case "assistant":
        navigate("/assistant/dashboard", { replace: true });
        break;
      case "patient":
        navigate("/patient/dashboard", { replace: true });
        break;
      default:
        // fallback for unrecognized roles
        navigate("/login", { replace: true });
    }
  }, [session, navigate]);

  // Render nothing — immediate redirect
  return null;
}
