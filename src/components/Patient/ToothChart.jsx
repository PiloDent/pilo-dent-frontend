import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import classNames from "classnames";
import { useToothStatus } from "../../context/ToothStatusContext";
import AdvancedToothTreatmentModal from "./AdvancedToothTreatmentModal"; // NEW import

const fdiTeeth = [
  18, 17, 16, 15, 14, 13, 12, 11, // Upper Right
  21, 22, 23, 24, 25, 26, 27, 28, // Upper Left
  48, 47, 46, 45, 44, 43, 42, 41, // Lower Right
  31, 32, 33, 34, 35, 36, 37, 38, // Lower Left
];

const statusOptions = [
  { value: "healthy", label: "Healthy", color: "bg-green-400" },
  { value: "caries", label: "Caries", color: "bg-yellow-400" },
  { value: "filled", label: "Filled", color: "bg-blue-400" },
  { value: "extracted", label: "Extracted", color: "bg-red-600" },
  { value: "crown", label: "Crown", color: "bg-purple-600" },
  { value: "implant", label: "Implant", color: "bg-pink-400" },
  { value: "missing", label: "Missing", color: "bg-gray-500" },
];

export default function ToothChart({ patientId }) {
  const { toothStatusMap, setAllStatuses, updateToothStatus } = useToothStatus();
  const [modalTooth, setModalTooth] = useState(null);

  useEffect(() => {
    if (!patientId) return;

    async function fetchToothStatus() {
      const { data, error } = await supabase
        .from("tooth_status")
        .select("tooth_number, status")
        .eq("patient_id", patientId);

      if (!error && data) {
        const mapped = {};
        data.forEach((t) => {
          mapped[t.tooth_number] = t.status;
        });
        setAllStatuses(mapped);
      }
    }

    fetchToothStatus();
  }, [patientId, setAllStatuses]);

  const openEditModal = (toothNumber) => {
    setModalTooth(toothNumber);
  };

  const closeModal = () => {
    setModalTooth(null);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">🦷 Tooth Chart</h2>

      <div className="grid grid-cols-8 gap-2 max-w-xl mx-auto">
        {fdiTeeth.map((toothNumber) => {
          const status = toothStatusMap[toothNumber] || "healthy";
          const statusInfo = statusOptions.find((s) => s.value === status) || statusOptions[0];

          return (
            <div
              key={toothNumber}
              title={`Tooth ${toothNumber} - ${statusInfo.label}`}
              className={classNames(
                "cursor-pointer rounded border flex flex-col items-center p-2 shadow text-white select-none",
                statusInfo.color
              )}
              onClick={() => openEditModal(toothNumber)}
              style={{ minWidth: 40 }}
            >
              <div className="text-sm font-semibold">{toothNumber}</div>
              <div style={{ fontSize: 18, marginTop: 4 }}>🦷</div>
            </div>
          );
        })}
      </div>

      {/* Advanced Treatment Modal */}
      {modalTooth && (
        <AdvancedToothTreatmentModal
          patientId={patientId}
          toothNumber={modalTooth}
          onClose={closeModal}
          onSaved={() => {
            // Refresh tooth statuses on save
            closeModal();
            if (patientId) {
              supabase
                .from("tooth_status")
                .select("tooth_number, status")
                .eq("patient_id", patientId)
                .then(({ data, error }) => {
                  if (!error && data) {
                    const mapped = {};
                    data.forEach((t) => {
                      mapped[t.tooth_number] = t.status;
                    });
                    setAllStatuses(mapped);
                  }
                });
            }
          }}
        />
      )}
    </div>
  );
}
