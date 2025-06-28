// pages/patient/[id].jsx
import { useRouter } from "next/router";
import SmartSummarySidebar from "@/components/SmartSummarySidebar";
import PatientDetails from "@/components/PatientDetails";

export default function PatientPage() {
  const { query } = useRouter();
  const patientId = query.id;

  if (!patientId) return null;

  return (
    <div className="flex space-x-6">
      {/* Main patient info on the left */}
      <div className="flex-1">
        <PatientDetails patientId={patientId} />
        {/* other sections... */}
      </div>

      {/* Smart Summary on the right */}
      <aside className="w-96">
        <SmartSummarySidebar patientId={patientId} />
      </aside>
    </div>
  );
}

