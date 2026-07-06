import { useState, useEffect } from 'react';
import api from '../services/api';
import SectionTitle from '../components/SectionTitle';

export default function InterviewPage() {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [interviewPreps, setInterviewPreps] = useState([]);
  const [currentPrep, setCurrentPrep] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInterviewPreps();
  }, []);

  const fetchInterviewPreps = async () => {
    try {
      const response = await api.get('/interviews');
      setInterviewPreps(response.data.interviewPreps || []);
    } catch (err) {
      console.error('Failed to fetch interview preps:', err);
    }
  };

  const generatePrep = async () => {
    if (!company || !role) {
      setError('Company and role are required');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/interviews', { company, role });
      setCurrentPrep(response.data.interviewPrep);
      fetchInterviewPreps();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate interview prep');
    } finally {
      setLoading(false);
    }
  };

  const deletePrep = async (id) => {
    try {
      await api.delete(`/interviews/${id}`);
      setInterviewPreps(interviewPreps.filter((p) => p.id !== id));
      if (currentPrep?.id === id) setCurrentPrep(null);
    } catch (err) {
      console.error('Failed to delete interview prep:', err);
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle>Interview Preparation</SectionTitle>

      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-2">Company</label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company name"
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Role</label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Job role/position"
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-300"
          />
        </div>

        <button
          onClick={generatePrep}
          disabled={loading || !company || !role}
          className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
        >
          {loading ? 'Generating...' : 'Generate Interview Prep'}
        </button>

        {error && <p className="text-red-400">{error}</p>}
      </div>

      {currentPrep && (
        <div className="space-y-6 mt-8">
          <div className="p-4 bg-slate-800 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">{currentPrep.company} - {currentPrep.role}</h3>
            {currentPrep.tips && <p className="text-slate-300 mb-4">{currentPrep.tips}</p>}
          </div>

          {currentPrep.questions && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Potential Questions</h3>
              <ul className="space-y-3">
                {currentPrep.questions.map((question, index) => (
                  <li key={index} className="p-3 bg-slate-800 rounded-lg">
                    {question}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {interviewPreps.length > 0 && (
        <div className="space-y-4 mt-8">
          <h3 className="text-lg font-semibold">Previous Interview Preps</h3>
          {interviewPreps.map((prep) => (
            <div key={prep.id} className="p-4 bg-slate-800 rounded-lg flex justify-between items-center">
              <div>
                <p className="font-medium">{prep.company} - {prep.role}</p>
                <p className="text-sm text-slate-400">{new Date(prep.createdAt).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => setCurrentPrep(prep)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
              >
                View
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}