// src/components/shared/Spinner.jsx
import React from 'react';

export default function Spinner({ size = 6 }) {
  return (
    <div
      className={`border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin`}
      style={{ width: `${size}rem`, height: `${size}rem` }}
      aria-label="Loading"
    />
  );
}

