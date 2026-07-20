import { useState, useEffect } from 'react';
import api from '../services/api';

/* ── helpers ──────────────────────────────────────────────────────────────── */
function ScoreGauge({ score, label }) {
  const r = 52;
  const sw = 9;
  const dim = (r + sw) * 2;
  const cx = dim / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(score, 0), 10) / 10;
  const fill = pct * circ;
  const color = score >= 7 ? '#10b981' : score >= 5 ? '#f59e0b' : '#ef4444';
  const quality = score >= 7 ? 'Good' : score >= 5 ? 'Fair' : 'Poor';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90" viewBox={`0 0 ${dim} ${dim}`}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="#1e293b" strokeWidth={sw} />
          <circle
            cx={cx} cy={cx} r={r}
            fill="none" stroke={color}
            strokeWidth={sw}
            strokeDasharray={`${fill} ${circ}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>{score.toFixed(1)}</span>
          <span className="text-xs" style={{ color }}>{quality}</span>
        </div>
      </div>
      {label && <p className="text-sm text-slate-400 text-center mt-1">{label}</p>}
    </div>
  );
}

const SECTIONS = [
  { id: 'skills', label: 'Skills', note: '' },
  { id: 'experience', label: 'Work Experience', note: 'Quick Edit (First 2 key experiences)' },
  { id: 'projects', label: 'Projects', note: '' },
];

/* ── main component ───────────────────────────────────────────────────────── */
export default function CustomizeResumeModal({ job, onClose }) {
  const [step, setStep] = useState(1);
  const [resumeScore, setResumeScore] = useState(5.0);
  const [newScore, setNewScore] = useState(null);
  const [selectedSections, setSelectedSections] = useState(['skills', 'experience', 'projects']);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [tailoredResume, setTailoredResume] = useState(null);
  const [error, setError] = useState('');

  // Parse keywords from job description / skills
  const jobKeywords = (() => {
    const raw = [
      ...(Array.isArray(job.skills) ? job.skills : (job.skills || '').split(',').map(s => s.trim()).filter(Boolean)),
      ...((job.description || '').match(/\b(React|Node|Python|SQL|TypeScript|JavaScript|AWS|Docker|Kubernetes|Java|Git|REST|API|Agile|Scrum)\b/gi) || [])
        .map(k => k.charAt(0).toUpperCase() + k.slice(1)),
    ];
    return [...new Set(raw)].slice(0, 15);
  })();

  const functional = jobKeywords.slice(0, 5);
  const tools = jobKeywords.slice(5, 10);
  const softSkills = jobKeywords.slice(10);

  useEffect(() => {
    api.get('/resumes').then(r => {
      const list = r.data.resumes || [];
      setResumes(list);
      const active = list.find(r => r.isActive) || list[0];
      if (active) setSelectedResumeId(active.id);
    }).catch(() => {});
  }, []);

  const toggleSection = (id) =>
    setSelectedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );

  const toggleKeyword = (kw) =>
    setSelectedKeywords(prev =>
      prev.includes(kw) ? prev.filter(k => k !== kw) : [...prev, kw]
    );

  const generate = async () => {
    if (!selectedResumeId) { setError('No resume found. Please upload one first.'); return; }
    setGenerating(true);
    setError('');
    try {
      const res = await api.post('/tailor', {
        resumeId: selectedResumeId,
        jobId: job.id,
        jobDescription: job.description || `${job.title} at ${job.company}`,
        tone: 'professional',
        sections: selectedSections,
        keywords: selectedKeywords,
      });
      setTailoredResume(res.data.tailored);
      const ms = res.data.tailored?.matchScore || 0;
      setNewScore(Math.min(10, +(ms / 10).toFixed(1)));
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate resume. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const downloadResume = () => {
    if (!tailoredResume?.content) return;
    let text = tailoredResume.content;
    try { text = JSON.stringify(JSON.parse(text), null, 2); } catch {}
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `resume-${job.company?.replace(/\s+/g, '-') || 'tailored'}.txt`;
    a.click();
  };

  /* ── step indicator ─────────────────────────────────────────────────────── */
  const steps = ['See Your Difference', 'Align Your Resume', 'Review Your New Resume'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-white">Generate Your Custom Resume</h2>
            {step < 3 && (
              <p className="text-xs text-emerald-400 mt-0.5">2 credits available today ⓘ</p>
            )}
            {step === 3 && tailoredResume && (
              <p className="text-xs text-slate-400 mt-0.5">1 credit consumed · <span className="text-emerald-400">1 credit available today ⓘ</span></p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        {/* step bar */}
        <div className="flex items-center justify-center gap-0 px-6 py-3 border-b border-slate-800">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center">
              <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                step === i + 1 ? 'text-emerald-400' : step > i + 1 ? 'text-emerald-600' : 'text-slate-500'
              }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${
                  step === i + 1 ? 'border-emerald-400 text-emerald-400' :
                  step > i + 1 ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-600 text-slate-600'
                }`}>
                  {step > i + 1 ? '✓' : i + 1}
                </span>
                {s}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-10 h-px mx-2 ${step > i + 1 ? 'bg-emerald-600' : 'bg-slate-700'}`} />
              )}
            </div>
          ))}
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-start gap-8">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">
                    Your Resume is a{' '}
                    <span className="text-red-400">{resumeScore < 6 ? 'Low' : resumeScore < 8 ? 'Moderate' : 'Strong'}</span>
                    {' '}Match for This Job
                  </h3>
                  {resumeScore < 6 && (
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <span className="text-blue-400">ⓘ</span>
                      Resumes under 6.0 are likely to be filtered out — we'll help you fix it fast.
                    </p>
                  )}

                  <div className="mt-4 border border-slate-700 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-3 bg-slate-800/60 text-xs text-slate-400 px-4 py-2 font-medium">
                      <span>Overview</span>
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-slate-700 rounded text-[10px] flex items-center justify-center">AH</span>
                        {job.company} · {job.title?.slice(0, 20)}
                      </span>
                      <span>Your resume · {resumes.find(r => r.id === selectedResumeId)?.title || 'No resume'}</span>
                    </div>

                    <div className="divide-y divide-slate-800">
                      {[
                        {
                          label: 'Job Title',
                          ok: false,
                          jobVal: job.title,
                          resumeVal: resumes.find(r => r.id === selectedResumeId)?.title || '—',
                        },
                        {
                          label: `Job Keywords (0/${Math.min(jobKeywords.length, 10)})`,
                          ok: false,
                          jobVal: jobKeywords.slice(0, 6).join(', ') || '—',
                          resumeVal: 'Not matched',
                        },
                      ].map((row, i) => (
                        <div key={i} className="grid grid-cols-3 px-4 py-3 text-sm items-center">
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                              row.ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {row.ok ? '✓' : '✕'}
                            </span>
                            <span className="text-slate-300 text-xs">{row.label}</span>
                          </div>
                          <span className="text-slate-400 text-xs truncate pr-2">{row.jobVal}</span>
                          <span className="text-slate-400 text-xs truncate">{row.resumeVal}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <ScoreGauge score={resumeScore} />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className="grid grid-cols-2 gap-6">
              {/* left: sections */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">1. Choose sections to enhance</h4>
                <div className="space-y-3">
                  {SECTIONS.map(sec => (
                    <div key={sec.id} className="flex items-start gap-3">
                      <button
                        onClick={() => toggleSection(sec.id)}
                        className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                          selectedSections.includes(sec.id)
                            ? 'bg-emerald-500 text-white'
                            : 'border border-slate-600 bg-transparent'
                        }`}
                      >
                        {selectedSections.includes(sec.id) && <span className="text-[10px]">✓</span>}
                      </button>
                      <div>
                        <p className="text-sm text-white">{sec.label}</p>
                        {sec.note && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            <span className="text-emerald-400">•</span> {sec.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* right: keywords */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-white">
                    2. Add missing skill keywords ({selectedKeywords.length}/{jobKeywords.length})
                  </h4>
                  <button
                    onClick={() => setSelectedKeywords(jobKeywords)}
                    className="text-xs text-emerald-400 hover:underline"
                  >
                    Select all
                  </button>
                </div>

                {[['Functional Skills', functional], ['Tools', tools], ['Soft Skills', softSkills]]
                  .filter(([, kws]) => kws.length > 0)
                  .map(([cat, kws]) => (
                    <div key={cat} className="mb-3">
                      <p className="text-xs text-slate-400 mb-1.5">{cat}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {kws.map(kw => (
                          <button
                            key={kw}
                            onClick={() => toggleKeyword(kw)}
                            className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                              selectedKeywords.includes(kw)
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                : 'border-slate-600 text-slate-400 hover:border-slate-500'
                            }`}
                          >
                            {kw}
                          </button>
                        ))}
                        <button className="text-xs px-2.5 py-1 rounded-md border border-dashed border-slate-600 text-slate-500">
                          Add Keywords ⓘ
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <div className="grid grid-cols-5 gap-5">
              {/* resume preview */}
              <div className="col-span-3 border border-slate-700 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
                  <div className="flex gap-2">
                    <button className="text-xs px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/40">
                      Fit to page
                    </button>
                    <button className="text-xs px-3 py-1 bg-slate-700 text-slate-300 rounded-md">✎ Edit</button>
                  </div>
                  <span className="text-xs text-slate-500">1 / 2</span>
                </div>
                <div className="bg-white text-black p-6 min-h-64 overflow-y-auto text-xs leading-relaxed">
                  {tailoredResume ? (
                    <pre className="whitespace-pre-wrap font-sans text-[11px]">
                      {(() => {
                        try { return JSON.stringify(JSON.parse(tailoredResume.content), null, 2); }
                        catch { return tailoredResume.content; }
                      })()}
                    </pre>
                  ) : (
                    <p className="text-gray-400">Generating your resume...</p>
                  )}
                </div>
              </div>

              {/* right panel */}
              <div className="col-span-2 space-y-4">
                {/* AI tabs */}
                <div className="flex gap-2 text-xs border-b border-slate-700 pb-2">
                  {['AI Rewrite', 'Editor', 'Style'].map(t => (
                    <button key={t} className={`px-3 py-1 rounded-md ${
                      t === 'AI Rewrite' ? 'bg-slate-700 text-white' : 'text-slate-500'
                    }`}>{t}</button>
                  ))}
                </div>

                {newScore !== null && (
                  <div className="bg-slate-800 rounded-xl p-4 flex items-center gap-4">
                    <ScoreGauge score={newScore} />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Great! Your score jumped<br />from {resumeScore.toFixed(1)} to {newScore.toFixed(1)}
                      </p>
                    </div>
                  </div>
                )}

                {tailoredResume?.keyChanges?.length > 0 && (
                  <div className="bg-slate-800/50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-slate-300 mb-2">See What's Changed</p>
                    <ul className="space-y-1.5">
                      {tailoredResume.keyChanges.slice(0, 4).map((c, i) => (
                        <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                          <span className="text-emerald-400 mt-0.5">•</span> {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-2 text-xs text-slate-400">
                  {[
                    'Use stronger action verbs for my latest experience',
                    'Shorten my summary to remove filler words',
                    'Remove skills not related to this job',
                  ].map((tip, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-800/40 rounded-lg px-3 py-2">
                      <span>{tip}</span>
                      <span className="text-slate-600">›</span>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-800 rounded-lg px-3 py-2">
                  <input
                    className="w-full bg-transparent text-xs text-slate-400 outline-none placeholder-slate-600"
                    placeholder="Tell me how you'd like to tweak your resume..."
                  />
                </div>
                <button className="w-full py-2 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors">
                  ✦ Edit With AI
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>

        {/* footer */}
        <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between">
          <div>
            {step === 3 && (
              <div className="flex gap-2">
                <button
                  onClick={downloadResume}
                  className="flex items-center gap-1.5 px-4 py-2 border border-slate-600 text-slate-300 hover:border-slate-400 rounded-lg text-sm transition-colors"
                >
                  ↓ Download Resume
                </button>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white border border-slate-600 rounded-lg text-sm hover:bg-slate-800 transition-colors font-medium"
                >
                  ⚡ APPLY NOW
                </a>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {step > 1 && step < 3 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white border border-slate-700 rounded-lg transition-colors"
              >
                ← Back
              </button>
            )}
            {step === 1 && (
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Improve My Resume for This Job
              </button>
            )}
            {step === 2 && (
              <button
                onClick={generate}
                disabled={generating || selectedSections.length === 0}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
              >
                {generating ? 'Generating...' : 'Generate My New Resume'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
