import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useTranslation } from "react-i18next";

export default function AssistantManager() {
  const { t } = useTranslation();
  const [assistants, setAssistants] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    fetchAssistants();
  }, []);

  const fetchAssistants = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email")
      .eq("role", "assistant");

    if (error) {
      alert(t("alert.failed_load_assistants"));
    } else {
      setAssistants(data);
    }
  };

  const handleCreate = async () => {
    const { error: signUpError, data: authData } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) return alert(signUpError.message);

    const userId = authData.user?.id;
    if (userId) {
      await supabase.from("profiles").upsert({
        id: userId,
        name,
        email,
        role: "assistant",
      });
      setName("");
      setEmail("");
      setPassword("");
      fetchAssistants();
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (!error) fetchAssistants();
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-white p-6 rounded shadow space-y-4">
      <h2 className="text-xl font-bold">{t("header.manage_assistants")}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          className="border p-2 rounded"
          placeholder={t("placeholder.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="border p-2 rounded"
          placeholder={t("placeholder.email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="border p-2 rounded"
          placeholder={t("placeholder.password")}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button
        onClick={handleCreate}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {t("button.create_assistant")}
      </button>

      <ul className="divide-y mt-4">
        {assistants.map((a) => (
          <li key={a.id} className="py-2 flex justify-between items-center">
            <span>
              {a.name} ({a.email})
            </span>
            <button
              onClick={() => handleDelete(a.id)}
              className="text-red-600 hover:underline"
            >
              {t("button.remove")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
