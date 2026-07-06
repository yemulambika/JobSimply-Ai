import { useState, useEffect } from 'react';
import api from '../services/api';
import SectionTitle from '../components/SectionTitle';

export default function AtsPage() {
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const response = await api.get('/resumes');
      setResumes(response.data.resumes || []);
    } catch (err) {
      console.error('Failed to fetch resumes:', err);
    }
  };

  const analyzeResume = async () => {
    if (!selectedResumeId) {
      setError('Please select a resume');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/ats/analyze', {
        resumeId: selectedResumeId,
        jobDescription,
      });
      setAnalysis(response.data.analysis);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to analyze resume');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle>ATS Analyzer</SectionTitle>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Select Resume</label>
          <select
            value={selectedResumeId}
            onChange={(e) => setSelectedResumeId(e.target.value)}
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-300"
          >
            <option value="">-- Select a resume --</option>
            {resumes.map((resume) => (
              <option key={resume.id} value={resume.id}>
                {resume.title} {resume.isActive ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Job Description (Optional)</label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste job description for targeted analysis..."
            className="w-full h-32 p-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-300 resize-none"
          />
        </div>

        <button
          onClick={analyzeResume}
          disabled={loading || !selectedResumeId}
          className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
        >
          {loading ? 'Analyzing...' : 'Analyze Resume'}
        </button>

        {error && <p className="text-red-400">{error}</p>}
      </div>

      {analysis && (
        <div className="space-y-6 mt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-800 rounded-lg">
              <h3 className="text-sm text-slate-400 mb-1">ATS Score</h3>
              <p className="text-3xl font-bold text-cyan-300">{analysis.score}/100</p>
            </div>
            <div className="p-4 bg-slate-800 rounded-lg">
              <h3 className="text-sm text-slate-400 mb-1">Readability</h3>
              <p className="text-3xl font-bold text-cyan-300">{analysis.readabilityScore}/100</p>
            </div>
            <div className="p-4 bg-slate-800 rounded-lg">
              <h3 className="text-sm text-slate-400 mb-1">Recruiter Readiness</h3>
              <p className="text-lg font-medium text-cyan-300">{analysis.recruiterReadiness}</p>
            </div>
          </div>

          {analysis.missingSkills?.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Missing Skills</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.missingSkills.map((skill, index) => (
                  <span key={index} className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {analysis.suggestions?.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Suggestions</h3>
              <ul className="space-y-2">
                {analysis.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-cyan-300 mt-1">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.formattingIssues?.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Formatting Issues</h3>
              <ul className="space-y-2">
                {analysis.formattingIssues.map((issue, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-yellow-300 mt-1">⚠</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}