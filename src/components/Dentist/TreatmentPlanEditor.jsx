import { useState } from "react";
import { supabase } from "@/supabaseClient";

export default function TreatmentPlanEditor({ patientId, onPlanCreated }) {
  const [items, setItems] = useState([]);
  const [code, setCode] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const addItem = () => {
    if (!code || !desc || !price) return;
    setItems([...items, { code, description: desc, price: parseFloat(price) }]);
    setCode(""); setDesc(""); setPrice("");
  };

  const total = items.reduce((sum, i) => sum + i.price, 0).toFixed(2);

  const createPlan = async () => {
    setLoading(true);
    const { error } = await supabase.from("treatment_plans").insert([{
      patient_id: patientId,
      dentist_id: supabase.auth.getUser().data.user.id,
      items,
      total_price: total,
    }]);
    setLoading(false);
    if (error) console.error(error);
    else onPlanCreated();
  };

  return (
    <div className="p-4 border rounded bg-white space-y-3">
      <h3 className="font-semibold">📝 New Treatment Plan</h3>
      <div className="flex gap-2">
        <input placeholder="Code" value={code} onChange={e=>setCode(e.target.value)} className="border p-1 rounded"/>
        <input placeholder="Description" value={desc} onChange={e=>setDesc(e.target.value)} className="border p-1 rounded flex-1"/>
        <input placeholder="Price" type="number" value={price} onChange={e=>setPrice(e.target.value)} className="border p-1 rounded w-24"/>
        <button onClick={addItem} className="bg-gray-200 p-1 rounded">Add</button>
      </div>
      {items.length>0 && (
        <table className="w-full text-sm">
          <thead><tr><th>Code</th><th>Description</th><th>Price</th></tr></thead>
          <tbody>
            {items.map((i,idx)=>(
              <tr key={idx}>
                <td>{i.code}</td><td>{i.description}</td><td>€{i.price.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p><strong>Total:</strong> €{total}</p>
      <button onClick={createPlan} disabled={loading} className="bg-blue-600 text-white px-4 py-1 rounded">
        {loading ? "Saving…" : "Save & Send"}
      </button>
    </div>
  );
}
