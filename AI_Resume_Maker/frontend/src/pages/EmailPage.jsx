import { useState, useEffect } from 'react';
import api from '../services/api';
import SectionTitle from '../components/SectionTitle';

export default function EmailPage() {
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [savedEmails, setSavedEmails] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [emailType, setEmailType] = useState('follow-up');
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [generatedEmail, setGeneratedEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resumeRes, emailRes] = await Promise.all([
        api.get('/resumes'),
        api.get('/emails'),
      ]);
      setResumes(resumeRes.data.resumes || []);
      setSavedEmails(emailRes.data.emails || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  const generateEmail = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/emails', {
        resumeId: selectedResumeId || undefined,
        jobId: selectedJobId || undefined,
        emailType,
        recipient,
        subject,
      });
      setGeneratedEmail(response.data.email);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate email');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedEmail?.body) {
      navigator.clipboard.writeText(`Subject: ${generatedEmail.subject}\n\n${generatedEmail.body}`);
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle>Email Generator</SectionTitle>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Resume (Optional)</label>
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
          <label className="block text-sm font-medium mb-2">Email Type</label>
          <select
            value={emailType}
            onChange={(e) => setEmailType(e.target.value)}
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-300"
          >
            <option value="follow-up">Follow-up Email</option>
            <option value="thank-you">Thank You Email</option>
            <option value="introduction">Introduction Email</option>
            <option value="inquiry">Inquiry Email</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Recipient (Optional)</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Recipient name or email"
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Subject (Optional)</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-300"
          />
        </div>

        <button
          onClick={generateEmail}
          disabled={loading}
          className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
        >
          {loading ? 'Generating...' : 'Generate Email'}
        </button>

        {error && <p className="text-red-400">{error}</p>}
      </div>

      {generatedEmail && (
        <div className="space-y-4 mt-8">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Generated Email</h3>
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
            >
              Copy to Clipboard
            </button>
          </div>
          
          <div className="p-4 bg-slate-800 rounded-lg">
            <p className="text-sm text-slate-400 mb-2">Subject: {generatedEmail.subject}</p>
            <div className="whitespace-pre-wrap font-serif text-sm">
              {generatedEmail.body}
            </div>
          </div>
        </div>
      )}

      {savedEmails.length > 0 && (
        <div className="space-y-4 mt-8">
          <h3 className="text-lg font-semibold">Saved Emails</h3>
          {savedEmails.map((email) => (
            <div key={email.id} className="p-4 bg-slate-800 rounded-lg">
              <h4 className="font-medium">{email.name}</h4>
              <p className="text-sm text-slate-400">{email.subject}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}