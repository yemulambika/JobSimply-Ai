import { useState, useEffect } from 'react';
import api from '../services/api';
import SectionTitle from '../components/SectionTitle';

export default function CoverLetterPage() {
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [hiringManager, setHiringManager] = useState('');
  const [tone, setTone] = useState('professional');
  const [coverLetter, setCoverLetter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [selectedJobId]);

  const fetchData = async () => {
    try {
      const [resumeRes, jobRes] = await Promise.all([
        api.get('/resumes'),
        api.get('/api/jobs').catch(() => ({ data: { jobs: [] } })),
      ]);
      setResumes(resumeRes.data.resumes || []);
      setJobs(jobRes.data.jobs || []);
      
      // Auto-fill company and position if job selected
      if (selectedJobId) {
        const job = jobRes.data.jobs?.find((j) => j.id === parseInt(selectedJobId));
        if (job) {
          setCompany(job.company || '');
          setPosition(job.title || '');
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  const generateCoverLetter = async () => {
    if (!selectedResumeId) {
      setError('Please select a resume');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/coverletters', {
        resumeId: selectedResumeId,
        jobId: selectedJobId || undefined,
        company,
        position,
        hiringManager,
        tone,
      });
      setCoverLetter(response.data.coverLetter);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate cover letter');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (coverLetter?.content) {
      navigator.clipboard.writeText(coverLetter.content);
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle>Cover Letter Generator</SectionTitle>
      
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
          <>
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
              <label className="block text-sm font-medium mb-2">Position</label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Job position"
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Hiring Manager (Optional)</label>
              <input
                type="text"
                value={hiringManager}
                onChange={(e) => setHiringManager(e.target.value)}
                placeholder="Hiring manager name"
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-300"
              />
            </div>
          </>
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
          onClick={generateCoverLetter}
          disabled={loading || !selectedResumeId}
          className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
        >
          {loading ? 'Generating...' : 'Generate Cover Letter'}
        </button>

        {error && <p className="text-red-400">{error}</p>}
      </div>

      {coverLetter && (
        <div className="space-y-4 mt-8">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Generated Cover Letter</h3>
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
            >
              Copy to Clipboard
            </button>
          </div>
          
          <div className="p-6 bg-slate-800 rounded-lg whitespace-pre-wrap font-serif">
            {coverLetter.content}
          </div>
        </div>
      )}
    </div>
  );
}