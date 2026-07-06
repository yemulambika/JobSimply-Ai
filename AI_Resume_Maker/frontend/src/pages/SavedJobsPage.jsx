import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import SectionTitle from '../components/SectionTitle';

export default function SavedJobsPage() {
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedJobs();
  }, []);

  const fetchSavedJobs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/saved-jobs');
      setSavedJobs(response.data.savedJobs || []);
    } catch (err) {
      console.error('Failed to fetch saved jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const removeSavedJob = async (savedJobId) => {
    try {
      await api.delete(`/saved-jobs/${savedJobId}`);
      setSavedJobs(savedJobs.filter((job) => job.id !== savedJobId));
    } catch (err) {
      console.error('Failed to remove saved job:', err);
    }
  };

  const applyToJob = async (jobId) => {
    try {
      await api.post('/applications', { jobId });
    } catch (err) {
      console.error('Failed to apply:', err);
    }
  };

  if (loading) return <div className="text-center py-8">Loading saved jobs...</div>;

  return (
    <div className="space-y-6">
      <SectionTitle>Saved Jobs</SectionTitle>

      {savedJobs.length === 0 ? (
        <p className="text-slate-400">No saved jobs yet. Save jobs from job sites to see them here.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedJobs.map((savedJob) => (
            <div
              key={savedJob.id}
              className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-cyan-500 transition-colors"
            >
              <div className="flex justify-between">
                <h3 className="text-lg font-bold">{savedJob.title}</h3>
                {savedJob.isRemote && (
                  <span className="bg-green-900 text-green-200 text-xs px-2 py-1 rounded">
                    Remote
                  </span>
                )}
              </div>
              <p className="text-cyan-400 font-medium">{savedJob.company}</p>
              <p className="text-slate-400 text-sm">{savedJob.location}</p>
              {savedJob.salary && (
                <p className="text-yellow-400 font-medium mt-1">Salary: {savedJob.salary}</p>
              )}
              
              {/* Resume/Cover Letter Ready Status */}
              <div className="mt-3 pt-3 border-t border-slate-700">
                {savedJob.tailoredResumeId && (
                  <span className="text-green-400 text-sm mr-3">✓ Resume Ready</span>
                )}
                {savedJob.coverLetterId && (
                  <span className="text-green-400 text-sm">✓ Cover Letter Ready</span>
                )}
              </div>
              
              <div className="mt-3 flex gap-2 flex-wrap">
                <a
                  href={savedJob.url || savedJob.jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
                >
                  Apply
                </a>
                <Link
                  to={`/jobs/${savedJob.id || savedJob.jobId}`}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                >
                  Customize Resume
                </Link>
                <button
                  onClick={() => applyToJob(savedJob.jobId)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                >
                  Track
                </button>
                <button
                  onClick={() => removeSavedJob(savedJob.id)}
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}