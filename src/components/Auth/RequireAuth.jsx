import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuth } from "../../context/AuthContext"; // ✅ use your own context
import { useTranslation } from "react-i18next";

export default function RequireAuth({ children, allowedRoles = [] }) {
  const { t } = useTranslation();
  const { session } = useAuth(); // ✅ use session from AuthContext
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (session?.user?.id) {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (!error && data?.role) {
          setUserRole(data.role);
        }
      }
      setLoading(false);
    };

    fetchUserRole();
  }, [session]);

  if (loading) return <div className="p-4">🔄 {t("message.loading")}</div>;

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length && !allowedRoles.includes(userRole)) {
    return <div className="p-4 text-red-600">🚫 {t("message.access_denied")}</div>;
  }

  return children;
}
