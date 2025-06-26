// src/components/Admin/AdminSettings.tsx
import { useEffect, useState } from 'react';
// @ts-ignore: no type declarations for supabaseClient
import { supabase } from '../../supabaseClient';

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Load settings
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('clinic_settings')
        .select('key, value')
        .order('key');
      if (error) {
        setError(error.message);
      } else {
        const obj: Record<string, any> = {};
        data?.forEach((row: { key: string; value: any }) => {
          const { key, value } = row;
          obj[key] = value;
        });
        setSettings(obj);
      }
      setLoading(false);
    })();
  }, []);

  const handleChange = (key: string, newVal: any) => {
    setEditing(prev => ({ ...prev, [key]: newVal }));
  };

  const saveSetting = async (key: string) => {
    const newValue = editing[key] ?? settings[key];
    setSaving(key);
    setError('');
    const { error } = await supabase
      .from('clinic_settings')
      .upsert({ key, value: newValue }, { returning: 'minimal' });
    setSaving(null);
    if (error) {
      setError(`Failed to save ${key}: ${error.message}`);
    } else {
      setSettings(prev => ({ ...prev, [key]: newValue }));
      setEditing(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  if (loading) return <p>Loading settings…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="p-6 bg-white rounded-2xl shadow space-y-6">
      <h2 className="text-2xl font-semibold">Admin Settings</h2>
      <div className="space-y-4">
        {Object.entries(settings).map(([key, value]) => (
          <div key={key} className="flex items-center space-x-4 border-b pb-2">
            <div className="w-1/4 text-gray-700 capitalize">
              {key.replace(/_/g, ' ')}
            </div>
            <input
              type="text"
              className="flex-1 border p-2 rounded"
              value={
                editing[key] !== undefined
                  ? editing[key]
                  : JSON.stringify(value)
              }
              onChange={e => {
                try {
                  handleChange(key, JSON.parse(e.target.value));
                } catch {
                  // ignore invalid JSON
                }
              }}
            />
            <button
              onClick={() => saveSetting(key)}
              disabled={saving === key}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {saving === key ? 'Saving...' : 'Save'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
