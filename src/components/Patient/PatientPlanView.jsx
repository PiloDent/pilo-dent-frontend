import { useEffect, useState, useRef } from "react";
import { supabase } from "@/supabaseClient";
import SignaturePad from "signature_pad";

export default function PatientPlanView() {
  const [plans, setPlans] = useState([]);
  const padRef = useRef(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("treatment_plans")
        .select("id, items, total_price, signature_url, signed_at")
        .eq("patient_id", supabase.auth.getUser().data.user.id)
        .order("created_at", { ascending: false });
      setPlans(data || []);
    };
    fetch();
  }, []);

  const signPlan = async (planId) => {
    const canvas = padRef.current;
    const signaturePad = new SignaturePad(canvas);
    if (signaturePad.isEmpty()) return alert("Please sign first");
    const blob = await new Promise((res) => canvas.toBlob(res));
    const path = `signatures/${planId}.png`;
    const { error: upErr } = await supabase.storage.from("signatures").upload(path, blob, { upsert:true });
    if (upErr) return console.error(upErr);
    const publicUrl = supabase.storage.from("signatures").getPublicUrl(path).data.publicUrl;
    await supabase
      .from("treatment_plans")
      .update({ signature_url: publicUrl, signed_at: new Date().toISOString() })
      .eq("id", planId);
    setPlans((ps) =>
      ps.map((p) => p.id === planId ? { ...p, signature_url: publicUrl, signed_at: new Date().toISOString() } : p)
    );
  };

  return (
    <div className="p-4 bg-white rounded shadow space-y-6">
      <h2 className="text-xl font-bold">Your Treatment Plans</h2>
      {plans.map((p) => (
        <div key={p.id} className="border p-4 rounded">
          <ul className="list-disc pl-5 mb-2">
            {p.items.map((i,idx)=>(
              <li key={idx}>{i.code}: {i.description} — €{i.price.toFixed(2)}</li>
            ))}
          </ul>
          <p><strong>Total:</strong> €{p.total_price.toFixed(2)}</p>
          {p.signature_url ? (
            <>
              <p className="text-green-600">Signed on {new Date(p.signed_at).toLocaleString()}</p>
              <img src={p.signature_url} alt="Signature" className="border w-64 h-32"/>
            </>
          ) : (
            <>
              <canvas ref={padRef} className="border w-full h-32 mb-2"></canvas>
              <button onClick={()=>signPlan(p.id)} className="bg-green-600 text-white px-4 py-1 rounded">
                Sign & Confirm
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
