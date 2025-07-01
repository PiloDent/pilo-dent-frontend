// src/components/Dentist/XRayUploadPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
// point this at your XRayUploadForm in src/components/Xray
import XRayUploadForm from "@/components/Xray/XRayUploadForm.jsx";

export default function XRayUploadPage() {
  const navigate = useNavigate();

  const handleUploaded = (filename) => {
    // once we get the filename back, navigate to the analysis page
    navigate(`/dentist/xray/${encodeURIComponent(filename)}`);
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-4 bg-white rounded shadow">
      <h2 className="text-2xl font-semibold mb-4">Upload X-Ray for Analysis</h2>
      <XRayUploadForm onUploaded={handleUploaded} />
    </div>
  );
}
