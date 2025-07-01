// src/components/Dentist/XRayAnalysisView.jsx
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/supabaseClient";

export default function XRayAnalysisView({ imageUrl }) {
  const [analysis, setAnalysis] = useState(null);
  const imgRef = useRef();
  const canvasRef = useRef();

  // 1) Load analysis JSON from Supabase
  useEffect(() => {
    const fileName = imageUrl.split("/").pop();
    supabase
      .from("xray_analyses")
      .select("results, summary")
      .eq("image_url", fileName)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to fetch analysis:", error);
        } else {
          setAnalysis(data);
        }
      });
  }, [imageUrl]);

  // 2) Once analysis arrives and image loads, size the canvas and draw boxes
  const drawAnnotations = () => {
    if (!analysis || !canvasRef.current || !imgRef.current) return;

    const img = imgRef.current;
    const canvas = canvasRef.current;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw each box + label
    analysis.results.boxes.forEach(({ x, y, width, height, label }) => {
      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      ctx.fillStyle = "red";
      ctx.font = "16px sans-serif";
      ctx.fillText(label, x + 2, y - 4);
    });
  };

  // redraw when analysis data changes
  useEffect(drawAnnotations, [analysis]);

  if (!analysis) {
    return <p>Loading analysis…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="relative inline-block">
        <img
          ref={imgRef}
          src={imageUrl}
          alt="X-Ray"
          onLoad={drawAnnotations}
          className="block max-w-full"
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 pointer-events-none"
        />
      </div>
      {analysis.summary && (
        <div className="mt-2 p-4 bg-gray-100 rounded">
          <h3 className="text-lg font-semibold mb-1">AI Summary</h3>
          <p>{analysis.summary}</p>
        </div>
      )}
    </div>
  );
}
