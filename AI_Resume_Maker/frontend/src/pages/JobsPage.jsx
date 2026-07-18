import { useEffect, useState, useCallback, useRef } from 'react';
import api from '../services/api';
import MatchCircle from '../components/MatchCircle';
import CustomizeResumeModal from '../components/CustomizeResumeModal';

/* ── deterministic pseudo-score so cards don't flicker ─────────────────────── */
function pseudoScore(id) {
  return 55 + ((id * 2654435761) % 1000000007 % 40);
}

/* ── company logo placeholder ─────────────────────────────────────────────── */
function CompanyLogo({ company = '', size = 40 }) {
  const colors = [
    '#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#ef4444','#10b981','#3b82f6',
  ];
  const idx = company.charCodeAt(0) % colors.length;
  const initials = company.slice(0, 2).toUpperCase() || '??';
  return (
    <div
      className="rounded-lg flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{ width: size, height: size, background: colors[idx], fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

/* ── time-ago helper ──────────────────────────────────────────────────────── */
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d > 1 ? 's' : ''} ago`;
  return `${Math.floor(d / 30)} month${Math.floor(d / 30) > 1 ? 's' : ''} ago`;
}

/* ── match label helper ───────────────────────────────────────────────────── */
function matchLabel(score) {
  if (score >= 80) return { label: 'Strong Match', color: 'text-emerald-400' };
  if (score >= 60) return { label: 'Good Match', color: 'text-amber-400' };
  return { label: 'Low Match', color: 'text-red-400' };
}

/* ── individual job card ──────────────────────────────────────────────────── */
function JobCard({ job, active, saved, onSelect, onSave }) {
  const score = pseudoScore(job.id);
  const { color } = matchLabel(score);
  return (
    <div
      onClick={() => onSelect(job)}
      className={`flex gap-4 p-4 cursor-pointer border-b border-slate-800 hover:bg-slate-800/60 transition-colors ${
        active ? 'bg-slate-800/80 border-l-2 border-l-emerald-500' : ''
      }`}
    >
      <CompanyLogo company={job.company} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] text-slate-500">{timeAgo(job.createdAt)}</p>
            <h3 className="font-semibold text-white text-sm leading-tight mt-0.5">{job.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {job.company}
              {job.employmentType ? ` · ${job.employmentType}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={e => { e.stopPropagation(); onSave(job.id); }}
              title={saved ? 'Unsave' : 'Save'}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors text-sm ${
                saved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {saved ? '♥' : '♡'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-400">
          {job.location && <span>📍 {job.location}</span>}
          {job.isRemote && <span>🌐 Remote</span>}
          {job.employmentType && <span>⏱ {job.employmentType}</span>}
          {job.salary && <span>💵 {job.salary}</span>}
        </div>

        <div className="flex items-center justify-between mt-3">
          <span className={`text-[11px] font-medium ${color}`}>
            {score}% · {matchLabel(score).label}
          </span>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-[11px] px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-medium transition-colors"
          >
            Apply Now
          </a>
        </div>
      </div>

      <div className="flex-shrink-0 flex flex-col items-center pt-1">
        <MatchCircle score={score} />
      </div>
    </div>
  );
}

/* ── job detail panel ─────────────────────────────────────────────────────── */
function JobDetailPanel({ job, saved, onSave, onCustomize, onApply }) {
  const score = pseudoScore(job.id);
  const expScore = 55 + ((job.id * 1234567) % 1000000007 % 30);
  const skillScore = 50 + ((job.id * 7654321) % 1000000007 % 35);
  const industryScore = 45 + ((job.id * 3141592) % 1000000007 % 32);

  const aiTools = [
    {
      icon: '✦',
      title: 'Customize Your Resume',
      desc: 'Maximize your interview chances',
      action: onCustomize,
      highlight: true,
    },
    {
      icon: '✉',
      title: 'Build Cover Letter',
      desc: 'Make your application stand out',
      action: () => window.location.assign('/cover-letter'),
    },
    {
      icon: '👍',
      title: 'Analyze How Well You Fit',
      desc: 'Understand your strength & weakness',
      action: () => window.location.assign(`/jobs/${job.id}`),
    },
  ];

  const skills = Array.isArray(job.skills)
    ? job.skills
    : (job.skills || '').split(',').map(s => s.trim()).filter(Boolean);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700 sticky top-0 bg-[#0f172a] z-10">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">200+ applicants</span>
          <button
            onClick={() => onSave(job.id)}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-colors ${
              saved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {saved ? '♥' : '♡'}
          </button>
        </div>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg font-medium transition-colors"
        >
          APPLY WITH AUTOFILL ↗
        </a>
      </div>

      {/* tabs */}
      <div className="flex gap-6 px-5 border-b border-slate-700 text-sm">
        {['Overview', 'Company'].map((t, i) => (
          <button
            key={t}
            className={`py-3 border-b-2 transition-colors ${
              i === 0 ? 'border-white text-white font-medium' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
        <div className="flex-1" />
        <button className="text-xs text-slate-500 py-3 hover:text-slate-300">Share</button>
        <button className="text-xs text-slate-500 py-3 hover:text-slate-300">Report Issue</button>
        <button className="text-xs text-slate-500 py-3 hover:text-slate-300">Original Job Post</button>
      </div>

      <div className="flex gap-0">
        {/* left: job info */}
        <div className="flex-1 px-5 py-4 space-y-4 min-w-0">
          {/* company + posted */}
          <div className="flex items-center gap-2">
            <CompanyLogo company={job.company} size={32} />
            <div>
              <span className="text-sm font-medium text-white">{job.company}</span>
              <span className="text-xs text-slate-400 ml-2">· {timeAgo(job.createdAt)}</span>
            </div>
          </div>

          <h2 className="text-xl font-bold text-white">{job.title}</h2>

          <div className="flex flex-wrap gap-4 text-sm text-slate-400">
            {job.location && <span>📍 {job.location}</span>}
            {job.isRemote && <span>🌐 Remote</span>}
            {job.employmentType && <span>⏱ {job.employmentType}</span>}
            {job.salary && <span>💵 {job.salary}</span>}
          </div>

          {/* match breakdown */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MatchCircle score={score} />
              </div>
              <span className="text-xs text-slate-400">{matchLabel(score).label}</span>
            </div>
            {[
              { label: 'Experience Level', pct: expScore },
              { label: 'Skill', pct: skillScore },
              { label: 'Industry Exp.', pct: industryScore },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-3 mb-2">
                <span className="text-xs text-slate-400 w-32">{row.label}</span>
                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
                <span className="text-xs text-slate-300 w-8 text-right">{row.pct}%</span>
              </div>
            ))}
          </div>

          {/* description */}
          {job.description && (
            <div>
              <p className="text-sm text-slate-300 leading-relaxed line-clamp-6">{job.description}</p>
            </div>
          )}

          {/* skills */}
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {skills.slice(0, 10).map((s, i) => (
                <span key={i} className="text-xs px-2.5 py-1 bg-slate-700 text-slate-300 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* right: AI tools */}
        <div className="w-52 flex-shrink-0 border-l border-slate-700 px-3 py-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">AI Tools</p>
          <div className="space-y-2">
            {aiTools.map((tool, i) => (
              <button
                key={i}
                onClick={tool.action}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${
                  tool.highlight
                    ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                    : 'border-slate-700 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base">{tool.icon}</span>
                  <span className="text-slate-500 text-sm">›</span>
                </div>
                <p className={`text-xs font-semibold ${tool.highlight ? 'text-emerald-400' : 'text-white'}`}>
                  {tool.title}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">{tool.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── main page ────────────────────────────────────────────────────────────── */
const TABS = ['Recommended', 'Liked', 'Applied'];

export default function JobsPage() {
  const [tab, setTab] = useState('Recommended');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [remote, setRemote] = useState(false);
  const [savedJobs, setSavedJobs] = useState(new Set());
  const [selectedJob, setSelectedJob] = useState(null);
  const [customizeJob, setCustomizeJob] = useState(null);
  const searchTimer = useRef(null);

  const fetchJobs = useCallback(async (q, loc, rem, pg) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.append('query', q);
      if (loc) params.append('location', loc);
      if (rem) params.append('remote', 'true');
      params.append('page', pg.toString());
      params.append('limit', '20');

      const res = await api.get(`/api/jobs?${params}`);
      const list = res.data.jobs || [];
      setJobs(list);
      setTotalPages(res.data.totalPages || 1);
      setTotalJobs(res.data.total || list.length);
      if (list.length && !selectedJob) setSelectedJob(list[0]);
    } catch {
      setError('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSaved = async () => {
    try {
      const res = await api.get('/saved-jobs');
      setSavedJobs(new Set((res.data.savedJobs || []).map(j => j.jobId)));
    } catch {}
  };

  useEffect(() => {
    fetchJobs(query, location, remote, page);
    fetchSaved();
  }, [page]);

  // Debounced search
  const handleSearch = (val) => {
    setQuery(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchJobs(val, location, remote, 1);
    }, 400);
  };

  const handleLocation = (val) => {
    setLocation(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchJobs(query, val, remote, 1);
    }, 400);
  };

  const handleRemote = () => {
    const next = !remote;
    setRemote(next);
    setPage(1);
    fetchJobs(query, location, next, 1);
  };

  const toggleSave = async (jobId) => {
    try {
      if (savedJobs.has(jobId)) {
        await api.delete(`/saved-jobs/${jobId}`);
        setSavedJobs(prev => { const s = new Set(prev); s.delete(jobId); return s; });
      } else {
        await api.post('/saved-jobs', { jobId });
        setSavedJobs(prev => new Set(prev).add(jobId));
      }
    } catch {}
  };

  // Tabs switch job list source
  const displayJobs =
    tab === 'Liked'
      ? jobs.filter(j => savedJobs.has(j.id))
      : jobs;

  const likedCount = savedJobs.size;

  return (
    <div className="flex flex-col h-full min-h-0" style={{ height: 'calc(100vh - 64px)' }}>
      {/* ── top bar ── */}
      <div className="border-b border-slate-700 px-4 py-2 flex items-center gap-6 bg-[#0f172a] flex-shrink-0">
        <span className="text-lg font-bold text-white tracking-wide">JOBS</span>
        <span className="text-slate-600">›</span>
        <div className="flex items-center gap-1">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors relative ${
                tab === t ? 'text-white border-b-2 border-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t}
              {t === 'Liked' && likedCount > 0 && (
                <span className="ml-1 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
                  {likedCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* search */}
        <div className="flex-1 max-w-sm ml-auto">
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
            <span className="text-slate-500 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search by title or company"
              value={query}
              onChange={e => handleSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* ── filter row ── */}
      <div className="border-b border-slate-700 px-4 py-2 flex items-center gap-2 flex-wrap flex-shrink-0 bg-[#0f172a]">
        {/* location filter */}
        <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-300">
          <input
            type="text"
            placeholder="Location"
            value={location}
            onChange={e => handleLocation(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-slate-500 outline-none w-24"
          />
          <span className="text-slate-500">▾</span>
        </div>

        {['Full-time', 'Remote', 'Entry Level'].map(f => (
          <button
            key={f}
            onClick={f === 'Remote' ? handleRemote : undefined}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs border rounded-md transition-colors ${
              (f === 'Remote' && remote)
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-slate-700 text-slate-400 hover:border-slate-500 bg-slate-800'
            }`}
          >
            {f} <span className="text-slate-500">▾</span>
          </button>
        ))}

        <span className="text-xs text-slate-500 ml-1">
          {totalJobs > 0 ? `${totalJobs.toLocaleString()} jobs` : ''}
        </span>

        <div className="ml-auto flex items-center gap-1 text-xs text-slate-400">
          <span className="text-slate-500">⊞</span> Recommended <span className="text-slate-500">▾</span>
        </div>
      </div>

      {/* ── main two-panel ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT: job list */}
        <div className="w-[400px] flex-shrink-0 border-r border-slate-700 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Loading jobs…
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <p className="text-red-400 text-sm">{error}</p>
              <button
                onClick={() => fetchJobs(query, location, remote, page)}
                className="mt-3 text-xs text-emerald-400 underline"
              >
                Retry
              </button>
            </div>
          ) : displayJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <p className="text-slate-500 text-sm">No jobs found</p>
              {tab === 'Liked' && (
                <p className="text-xs text-slate-600 mt-1">Save jobs with ♡ to see them here</p>
              )}
            </div>
          ) : (
            <>
              {displayJobs.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  active={selectedJob?.id === job.id}
                  saved={savedJobs.has(job.id)}
                  onSelect={setSelectedJob}
                  onSave={toggleSave}
                />
              ))}

              {/* pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 py-4 border-t border-slate-800">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-md border border-slate-700"
                  >
                    ← Prev
                  </button>
                  <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-md border border-slate-700"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT: job detail */}
        <div className="flex-1 min-w-0 bg-[#0f172a] overflow-hidden">
          {selectedJob ? (
            <JobDetailPanel
              job={selectedJob}
              saved={savedJobs.has(selectedJob.id)}
              onSave={toggleSave}
              onCustomize={() => setCustomizeJob(selectedJob)}
              onApply={() => window.open(selectedJob.url, '_blank')}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              Select a job to see details
            </div>
          )}
        </div>
      </div>

      {/* Customize Resume Modal */}
      {customizeJob && (
        <CustomizeResumeModal
          job={customizeJob}
          onClose={() => setCustomizeJob(null)}
        />
      )}
    </div>
  );
}
