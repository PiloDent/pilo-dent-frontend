// src/components/Xray/XRayUploadForm.jsx
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Spinner from '../shared/Spinner.jsx';
import { useTranslation } from 'react-i18next';

export default function XRayUploadForm({ onUploaded }) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const onDrop = useCallback(
    async (files) => {
      if (!files.length) return;
      const file = files[0];
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('xray', file);

      try {
        const res = await fetch('/api/xray/analyze', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || t('xray.upload_failed'));
        }
        const { filename } = await res.json();
        onUploaded(filename);
      } catch (err) {
        setError(err.message);
      } finally {
        setUploading(false);
      }
    },
    [onUploaded, t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: 'image/*',
    multiple: false,
    disabled: uploading,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-6 text-center
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}
        ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <input {...getInputProps()} disabled={uploading} />
      {uploading ? (
        <div className="flex flex-col items-center space-y-2">
          <Spinner size={4} />
          <p className="text-gray-600">{t('xray.uploading')}</p>
        </div>
      ) : (
        <>
          <p className="text-gray-700 mb-2">{t('xray.upload_instructions')}</p>
          {error && (
            <p className="text-red-600 mt-2">
              ❗ {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
