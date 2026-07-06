import { useState, useEffect } from 'react';
import api from '../services/api';
import SectionTitle from '../components/SectionTitle';

export default function TailorPage() {
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [tone, setTone] = useState('professional');
  const [tailoredResume, setTailoredResume] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resumeRes, jobRes] = await Promise.all([
        api.get('/resumes'),
        api.get('/api/jobs').catch(() => ({ data: { jobs: [] } })),
      ]);
      setResumes(resumeRes.data.resumes || []);
      setJobs(jobRes.data.jobs || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  const tailorResume = async () => {
    if (!selectedResumeId) {
      setError('Please select a resume');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/tailor', {
        resumeId: selectedResumeId,
        jobId: selectedJobId || undefined,
        jobDescription: selectedJobId ? undefined : jobDescription,
        tone,
      });
      setTailoredResume(response.data.tailored);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to tailor resume');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle>Resume Tailor</SectionTitle>
      
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
          <label className="block text-sm font-medium mb-2">Select Job (Optional)</label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-300"
          >
            <option value="">-- Select a saved job --</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} - {job.company}
              </option>
            ))}
          </select>
        </div>

        {!selectedJobId && (
          <div>
            <label className="block text-sm font-medium mb-2">Job Description</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste job description..."
              className="w-full h-32 p-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-300 resize-none"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">Tone</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-300"
          >
            <option value="professional">Professional</option>
            <option value="confident">Confident</option>
            <option value="creative">Creative</option>
            <option value="concise">Concise</option>
          </select>
        </div>

        <button
          onClick={tailorResume}
          disabled={loading || !selectedResumeId}
          className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
        >
          {loading ? 'Tailoring...' : 'Tailor Resume'}
        </button>

        {error && <p className="text-red-400">{error}</p>}
      </div>

      {tailoredResume && (
        <div className="space-y-6 mt-8">
          <div className="p-4 bg-slate-800 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Match Score: {tailoredResume.matchScore}/100</h3>
            <p className="text-slate-400">{tailoredResume.title}</p>
          </div>

          {tailoredResume.highlightedSkills?.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Highlighted Skills</h3>
              <div className="flex flex-wrap gap-2">
                {tailoredResume.highlightedSkills.map((skill, index) => (
                  <span key={index} className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {tailoredResume.keyChanges?.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Key Changes Made</h3>
              <ul className="space-y-2">
                {tailoredResume.keyChanges.map((change, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-300 mt-1">✓</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="p-4 bg-slate-800 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Tailored Resume</h3>
            <pre className="text-sm text-slate-300 whitespace-pre-wrap max-h-96 overflow-y-auto">
              {JSON.stringify(JSON.parse(tailoredResume.content), null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}