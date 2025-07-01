import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useSessionContext } from "@/context/SessionContext.jsx";
import { useTranslation } from "react-i18next";

export default function NavBar() {
  const { t } = useTranslation();
  const { session, setSession } = useSessionContext();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    navigate("/login");
  };

  // derive role from session.user or custom claim
  const role = session?.user?.role || session?.user?.user_metadata?.role;

  const links = {
    admin: [
      { to: "/admin/calendar", key: "nav.calendar" },
      { to: "/admin/patients", key: "nav.patients" },
      { to: "/admin/analytics", key: "nav.analytics" },
      { to: "/admin/settings", key: "nav.settings" },
    ],
    dentist: [
      { to: "/dentist/dashboard", key: "nav.dashboard" },
      { to: "/dentist/calendar", key: "nav.calendar" },
      { to: "/dentist/xray", key: "nav.xray" },
    ],
    assistant: [
      { to: "/assistant/dashboard", key: "nav.dashboard" },
      { to: "/assistant/shifts", key: "nav.shifts" },
    ],
    patient: [{ to: "/patient/dashboard", key: "nav.my_appointments" }],
  };

  return (
    <nav className="bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/">
              <img
                src="/logo.svg"
                alt={t("nav.logo_alt")}
                className="h-8 w-auto"
              />
            </Link>
          </div>

          {/* Nav links */}
          <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
            {role &&
              links[role]?.map(({ to, key }) => (
                <Link
                  key={to}
                  to={to}
                  className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-700 hover:border-blue-500 hover:text-gray-900"
                  activeclassname="border-blue-500 text-gray-900"
                >
                  {t(key)}
                </Link>
              ))}
          </div>

          {/* Right side: user & sign out */}
          <div className="flex items-center space-x-4">
            <span className="text-gray-600 text-sm">
              {session?.user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              {t("button.sign_out")}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}