// src/context/ToothStatusContext.jsx
import React, { createContext, useContext, useState, useCallback } from "react";

const ToothStatusContext = createContext();

export function ToothStatusProvider({ children }) {
  const [toothStatusMap, setToothStatusMap] = useState({});

  // Set all statuses at once (initial load or refresh)
  const setAllStatuses = useCallback((newMap) => {
    setToothStatusMap(newMap);
  }, []);

  // Update one tooth status (e.g., from BillingAssistant or ToothChart)
  const updateToothStatus = useCallback((toothNumber, status) => {
    setToothStatusMap((prev) => ({
      ...prev,
      [toothNumber]: status,
    }));
  }, []);

  return (
    <ToothStatusContext.Provider
      value={{ toothStatusMap, setAllStatuses, updateToothStatus }}
    >
      {children}
    </ToothStatusContext.Provider>
  );
}

export function useToothStatus() {
  const context = useContext(ToothStatusContext);
  if (!context) {
    throw new Error("useToothStatus must be used within a ToothStatusProvider");
  }
  return context;
}
