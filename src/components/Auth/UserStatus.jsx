import React from "react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";

const UserStatus = () => {
  const { t } = useTranslation();
  const { session, supabase } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!session) {
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-300 rounded">
        <p className="text-yellow-800">{t("message.not_logged_in")}</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-green-100 border border-green-300 rounded">
      <p className="text-green-800">
        {t("text.logged_in_as")} <strong>{session.user.email}</strong>
      </p>
      <button
        className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        onClick={handleLogout}
      >
        {t("button.logout")}
      </button>
    </div>
  );
};

export default UserStatus;