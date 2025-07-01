// src/App.jsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useParams,
} from "react-router-dom";
import { useSessionContext } from "./context/SessionContext.jsx";
import { useTranslation } from "react-i18next";

import NavBar from "./components/NavBar.jsx";
import RequireAuth from "./components/Auth/RequireAuth.jsx";

// Admin
import AdminCalendar from "./components/Admin/AdminCalendar.jsx";
import AdminSettings from "./components/Admin/AdminSettings.jsx";
import AdminPatientList from "./components/Admin/AdminPatientList.jsx";
import PatientProfile from "./components/Admin/PatientProfile.jsx";
import AnalyticsDashboard from "./components/Admin/AnalyticsDashboard.jsx";
import ClaimsManager from "./components/Admin/ClaimsManager.jsx";
import NudgeDashboard from "./components/Admin/NudgeDashboard.jsx";
import BusinessInsights from "./components/Admin/BusinessInsights.jsx";

// Dentist
import DentistDashboard from "./components/Dentist/DentistDashboard.jsx";
import DentistCalendar from "./components/Dentist/DentistCalendar.jsx";
import XRayUploadPage from "./components/Dentist/XRayUploadPage.jsx";

// X-ray analysis
import XRayAnalysisView from "./components/Xray/XRayAnalysisView.jsx";

// Assistant
import AssistantDashboard from "./components/Assistant/AssistantDashboard.jsx";
import AssistantShiftCalendar from "./components/Assistant/AssistantShiftCalendar.jsx";

// Patient
import PatientDashboard from "./components/Patient/PatientDashboard.jsx";

// Auth
import Login from "./components/Auth/Login.jsx";
import Signup from "./components/Auth/Signup.jsx";
import ForgotPassword from "./components/Auth/ForgotPassword.jsx";

// Tablet
import TabletDashboard from "./components/Tablet/TabletDashboard.jsx";
import TabletCheckin from "./components/Tablet/TabletCheckin.jsx";
import TabletPatient from "./components/Tablet/TabletPatient.jsx";

// Chat
import StaffChat from "./components/Staff/StaffChat.jsx";

// Debug (Dev Mode Only)
import DebugUserPanel from "./components/DebugUserPanel.jsx";

function XRayPage() {
  const { fileName } = useParams();
  const imageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/xray-images/${fileName}`;
  return <XRayAnalysisView imageUrl={imageUrl} />;
}

// A bold Tailwind “fire-test”:
function SmokeTest() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500">
      <div className="bg-white p-8 rounded-2xl shadow-xl text-3xl font-bold text-purple-600">
        {t("smoke_test.message")}
      </div>
    </div>
  );
}

function Layout({ children }) {
  const { session } = useSessionContext();
  const { pathname } = useLocation();
  const hideNav = [
    "/login",
    "/signup",
    "/forgot-password",
    "/tablet-dashboard",
    "/tablet-checkin",
    "/tablet-patient",
  ];
  const showNav = Boolean(session) && !hideNav.includes(pathname);

  return (
    <div className="min-h-screen bg-gray-50">
      {showNav && <NavBar />}
      <main className="p-4">{children}</main>
      {import.meta.env.DEV && <DebugUserPanel />}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          {/* Fire-test at root */}
          <Route path="/" element={<SmokeTest />} />

          {/* temporary smoke-test route */}
          <Route path="/smoke-test" element={<SmokeTest />} />

          {/* 🔐 Admin */}
          <Route
            path="/admin/calendar"
            element={
              <RequireAuth allowedRoles={["admin"]}>
                <AdminCalendar />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <RequireAuth allowedRoles={["admin"]}>
                <AdminSettings />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/patients"
            element={
              <RequireAuth allowedRoles={["admin"]}>
                <AdminPatientList />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/patients/:id"
            element={
              <RequireAuth allowedRoles={["admin"]}>
                <PatientProfile />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <RequireAuth allowedRoles={["admin", "dentist"]}>
                <AnalyticsDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/claims"
            element={
              <RequireAuth allowedRoles={["admin"]}>
                <ClaimsManager />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/nudges"
            element={
              <RequireAuth allowedRoles={["admin"]}>
                <NudgeDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/business-insights"
            element={
              <RequireAuth allowedRoles={["admin"]}>
                <BusinessInsights />
              </RequireAuth>
            }
          />

          {/* 🔐 Dentist */}
          <Route
            path="/dentist/dashboard"
            element={
              <RequireAuth allowedRoles={["dentist"]}>
                <DentistDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/dentist/calendar"
            element={
              <RequireAuth allowedRoles={["dentist"]}>
                <DentistCalendar />
              </RequireAuth>
            }
          />
          <Route
            path="/dentist/xray"
            element={
              <RequireAuth allowedRoles={["dentist"]}>
                <XRayUploadPage />
              </RequireAuth>
            }
          />
          <Route
            path="/dentist/xray/:fileName"
            element={
              <RequireAuth allowedRoles={["dentist"]}>
                <XRayPage />
              </RequireAuth>
            }
          />

          {/* 🔐 Assistant */}
          <Route
            path="/assistant/dashboard"
            element={
              <RequireAuth allowedRoles={["assistant"]}>
                <AssistantDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/assistant/shifts"
            element={
              <RequireAuth allowedRoles={["assistant"]}>
                <AssistantShiftCalendar />
              </RequireAuth>
            }
          />

          {/* 🔐 Patient */}
          <Route
            path="/patient/dashboard"
            element={
              <RequireAuth allowedRoles={["patient"]}>
                <PatientDashboard />
              </RequireAuth>
            }
          />

          {/* 🔐 Staff Chat */}
          <Route
            path="/staff-chat"
            element={
              <RequireAuth allowedRoles={["admin", "dentist", "assistant"]}>
                <StaffChat />
              </RequireAuth>
            }
          />

          {/* Public Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Public Tablet */}
          <Route path="/tablet-dashboard" element={<TabletDashboard />} />
          <Route path="/tablet-checkin" element={<TabletCheckin />} />
          <Route path="/tablet-patient" element={<TabletPatient />} />
        </Routes>
      </Layout>
    </Router>
  );
}
