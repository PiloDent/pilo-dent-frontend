import { useState } from "react";
import AddPatientForm from "../components/Admin/AddPatientForm";
import PatientList from "../components/Admin/PatientList";
import CreateAppointmentForm from "../components/Admin/CreateAppointmentForm";
import Scheduler from "../components/Admin/Scheduler";

export default function AdminDashboard() {
  const [refresh, setRefresh] = useState(false);

  const handlePatientAdded = () => {
    setRefresh((prev) => !prev);
  };

  const handleAppointmentAdded = () => {
    // Simple full refresh to update calendar view
    setRefresh((prev) => !prev);
  };

  return (
    <div className="p-6 space-y-10">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      {/* Add New Patient */}
      <AddPatientForm onPatientAdded={handlePatientAdded} />

      {/* Patient List */}
      <PatientList key={refresh} />

      {/* Create Appointment */}
      <CreateAppointmentForm onAppointmentAdded={handleAppointmentAdded} />

      {/* Calendar View */}
      <Scheduler key={refresh} />
    </div>
  );
}
