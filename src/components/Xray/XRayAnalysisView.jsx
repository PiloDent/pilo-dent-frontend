// src/components/Dentist/XRayAnalysisView.jsx
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from "@/supabaseClient";
import Spinner from "@/components/shared/Spinner.jsx";
import { useTranslation } from 'react-i18next';

export default function XRayAnalysisView({ imageUrl }) {
  const { t } = useTranslation();
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const imgRef = useRef();
  const canvasRef = useRef();

  // 1) fetch analysis
  useEffect(() => {
    const fileName = imageUrl.split('/').pop();
    setAnalysis(null);
    setError(null);
    supabase
      .from('xray_analyses')
      .select('results, summary')
      .eq('image_url', fileName)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else if (!data) setError(t('xray.no_analysis'));
        else setAnalysis(data);
      });
  }, [imageUrl, t]);

  // 2) draw boxes
  const draw = () => {
    if (!analysis || !canvasRef.current || !imgRef.current) return;
    const img = imgRef.current;
    const canvas = canvasRef.current;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    analysis.results.boxes.forEach(({ x, y, width, height, label }) => {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      ctx.fillStyle = 'red';
      ctx.font = '16px sans-serif';
      ctx.fillText(label, x + 2, y - 4);
    });
  };

  useEffect(draw, [analysis]);

  return (
    <div className="space-y-4">
      {!analysis && !error && (
        <div className="flex justify-center py-10">
          <Spinner size={5} />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded">
          <p>❗ {t('xray.error_prefix')} {error}</p>
        </div>
      )}

      {analysis && (
        <>
          <div className="relative inline-block border rounded overflow-hidden">
            <img
              ref={imgRef}
              src={imageUrl}
              alt={t('xray.alt')}
              onLoad={draw}
              className="block max-w-full"
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 pointer-events-none"
            />
          </div>
          {analysis.summary && (
            <div className="p-4 bg-gray-50 rounded">
              <h3 className="text-lg font-semibold mb-2">
                {t('xray.summary_title')}
              </h3>
              <p className="text-gray-700">{analysis.summary}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
