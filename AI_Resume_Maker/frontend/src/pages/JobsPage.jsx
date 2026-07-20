import { useEffect, useState } from 'react';
import api from '../services/api';
import SectionTitle from '../components/SectionTitle';

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [extensionJobs, setExtensionJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchParams, setSearchParams] = useState({
    query: '',
    location: '',
    remote: false,
  });
  const [savedJobs, setSavedJobs] = useState(new Set());

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchParams.query) params.append('query', searchParams.query);
      if (searchParams.location) params.append('location', searchParams.location);
      if (searchParams.remote) params.append('remote', 'true');
      params.append('page', page.toString());

      const response = await api.get(`/api/jobs?${params.toString()}`);
      setJobs(response.data.jobs);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch jobs');
      setLoading(false);
    }
  };

  const fetchExtensionJobs = async () => {
    try {
      const response = await api.get('/api/jobs/saved');
      if (response.data.success) {
        setExtensionJobs(response.data.jobs || []);
        // Auto-mark extension jobs as saved
        const savedIds = new Set(response.data.jobs?.map((j) => j.id) || []);
        setSavedJobs((prev) => new Set([...prev, ...savedIds]));
      }
    } catch (err) {
      // Silently fail - extension jobs are optional
      console.log('No extension jobs found or not authenticated');
    }
  };

  const fetchSavedJobs = async () => {
    try {
      const response = await api.get('/saved-jobs');
      const savedIds = new Set(response.data.savedJobs?.map((j) => j.jobId) || []);
      setSavedJobs(savedIds);
    } catch (err) {
      console.error('Failed to fetch saved jobs:', err);
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchSavedJobs();
    fetchExtensionJobs();
  }, [searchParams, page]);

  const handleSearch = (e) => {
    setSearchParams({ ...searchParams, query: e.target.value });
    setPage(1);
  };

  const handleLocation = (e) => {
    setSearchParams({ ...searchParams, location: e.target.value });
    setPage(1);
  };

  const handleRemote = () => {
    setSearchParams({ ...searchParams, remote: !searchParams.remote });
    setPage(1);
  };

  const toggleSaveJob = async (jobId) => {
    try {
      if (savedJobs.has(jobId)) {
        await api.delete(`/saved-jobs/${jobId}`);
        setSavedJobs((prev) => {
          const newSet = new Set(prev);
          newSet.delete(jobId);
          return newSet;
        });
      } else {
        await api.post('/saved-jobs', { jobId });
        setSavedJobs((prev) => new Set(prev).add(jobId));
      }
    } catch (err) {
      console.error('Failed to save job:', err);
    }
  };

  const nextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  const prevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const applyToJob = async (jobId) => {
    try {
      await api.post('/applications', { jobId });
      fetchSavedJobs();
    } catch (err) {
      console.error('Failed to apply:', err);
    }
  };

if (loading) return <div className="text-center py-8">Loading jobs...</div>;

  // Merge jobs and extensionJobs - extensionJobs are already saved
  const allJobs = [...extensionJobs, ...jobs.filter(j => !extensionJobs.some(ej => ej.id === j.id))];
  const hasJobs = allJobs.length > 0;

  return (
    <div className="space-y-6">
      <SectionTitle>Job Search</SectionTitle>
      
      {/* Extension Jobs Section */}
      {extensionJobs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-cyan-400">Saved from Extension</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {extensionJobs.map((job) => (
              <div
                key={`ext-${job.id}`}
                className="bg-slate-800 rounded-lg p-4 border border-cyan-500 hover:border-cyan-400 transition-colors"
              >
                <div className="flex justify-between">
                  <h3 className="text-lg font-bold">{job.title}</h3>
                  <span className="bg-cyan-900 text-cyan-200 text-xs px-2 py-1 rounded">Saved</span>
                </div>
                <p className="text-cyan-400 font-medium">{job.company}</p>
                <p className="text-slate-400 text-sm">{job.location}</p>
                {job.salary && (
                  <p className="text-yellow-400 font-medium mt-1">Salary: {job.salary}</p>
                )}
                {job.atsScore !== null && job.atsScore !== undefined && (
                  <p className="text-green-400 text-sm mt-1">ATS Score: {job.atsScore}%</p>
                )}
                <div className="mt-3 flex gap-2">
                  <a
                    href={job.jobUrl || job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
                  >
                    Apply
                  </a>
                  <a
                    href={`/jobs/${job.id}`}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                  >
                    View Analysis
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-3">Search Jobs</h3>
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchParams.query}
            onChange={handleSearch}
            className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-300"
          />
          <input
            type="text"
            placeholder="Location"
            value={searchParams.location}
            onChange={handleLocation}
            className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-300"
          />
          <label className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={searchParams.remote}
              onChange={handleRemote}
              className="form-checkbox"
            />
            <span>Remote</span>
          </label>
        </div>

        {error ? (
          <div className="text-center py-8 text-red-400">{error}</div>
        ) : jobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-cyan-500 transition-colors"
              >
                <div className="flex justify-between">
                  <h3 className="text-lg font-bold">{job.title}</h3>
                  <div className="flex gap-1">
                    {job.isRemote && (
                      <span className="bg-green-900 text-green-200 text-xs px-2 py-1 rounded">
                        Remote
                      </span>
                    )}
                    <button
                      onClick={() => toggleSaveJob(job.id)}
                      className={`text-xs px-2 py-1 rounded ${
                        savedJobs.has(job.id) ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {savedJobs.has(job.id) ? 'Saved' : 'Save'}
                    </button>
                  </div>
                </div>
                <p className="text-cyan-400 font-medium">{job.company}</p>
                <p className="text-slate-400 text-sm">{job.location}</p>
                {job.salary && (
                  <p className="text-yellow-400 font-medium mt-1">Salary: {job.salary}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
                  >
                    Apply
                  </a>
                  <button
                    onClick={() => applyToJob(job.id)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                  >
                    Track Application
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">No jobs found matching your criteria</div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-4 mt-6">
            <button
              onClick={prevPage}
              disabled={page === 1}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded"
            >
              Previous
            </button>
            <span className="px-4 py-2 bg-slate-800 rounded">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={nextPage}
              disabled={page === totalPages}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
