import { useState, useEffect } from 'react';
import api from '../services/api';
import SectionTitle from '../components/SectionTitle';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    theme: 'dark',
    defaultTone: 'professional',
    emailSignature: '',
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      setSettings(response.data.settings || settings);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    setSaved(false);
    
    try {
      await api.patch('/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle>Settings</SectionTitle>

      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-2">Theme</label>
          <select
            value={settings.theme}
            onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-300"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Default Tone</label>
          <select
            value={settings.defaultTone}
            onChange={(e) => setSettings({ ...settings, defaultTone: e.target.value })}
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-300"
          >
            <option value="professional">Professional</option>
            <option value="confident">Confident</option>
            <option value="creative">Creative</option>
            <option value="concise">Concise</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email Signature</label>
          <textarea
            value={settings.emailSignature}
            onChange={(e) => setSettings({ ...settings, emailSignature: e.target.value })}
            placeholder="Your email signature..."
            className="w-full h-24 p-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-300 resize-none"
          />
        </div>

        <button
          onClick={saveSettings}
          disabled={loading}
          className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>

        {saved && <p className="text-green-400">Settings saved successfully!</p>}
      </div>
    </div>
  );
}