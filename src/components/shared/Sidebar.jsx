import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Sidebar() {
  const { t } = useTranslation();

  const navItems = [
    { to: "/dashboard", key: "nav.dashboard" },
    { to: "/patients", key: "nav.patients" },
    { to: "/appointments", key: "nav.appointments" },
    { to: "/analytics", key: "nav.analytics" },
    { to: "/settings", key: "nav.settings" },
  ];

  return (
    <aside className="w-64 bg-gray-100 h-full border-r">
      <div className="p-4 font-bold text-lg">{t("header.admin_dashboard")}</div>
      <nav className="flex flex-col space-y-2 px-2">
        {navItems.map(({ to, key }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `block p-2 rounded ${
                isActive ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-200"
              }`
            }
          >
            {t(key)}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
