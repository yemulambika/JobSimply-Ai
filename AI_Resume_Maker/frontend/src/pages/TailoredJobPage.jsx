import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import SectionTitle from '../components/SectionTitle';
import AnalysisStep from '../components/AnalysisStep';
import CustomizeStep from '../components/CustomizeStep';
import GeneratingStep from '../components/GeneratingStep';
import PreviewStep from '../components/PreviewStep';

const STEPS = ['analysis', 'customize', 'generating', 'preview'];

export default function TailoredJobPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState('analysis');
  const [job, setJob] = useState(null);
  const [resume, setResume] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [tailoredResumes, setTailoredResumes] = useState([]);
  const [selectedTailoredResume, setSelectedTailoredResume] = useState(null);
  const [generationConfig, setGenerationConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [jobId]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [jobRes, resumeRes, versionsRes] = await Promise.all([
        api.get(`/api/jobs/${jobId}`),
        api.get('/resumes/active').catch(() => ({ data: null })),
        api.get(`/api/jobs/tailored-resumes?jobId=${jobId}`).catch(() => ({ data: { tailoredResumes: [] } })),
      ]);

      setJob(jobRes.data);
      setResume(resumeRes.data);
      setTailoredResumes(versionsRes.data.tailoredResumes || []);

      const analysisData = jobRes.data.analysis
        ? typeof jobRes.data.analysis === 'string'
          ? JSON.parse(jobRes.data.analysis)
          : jobRes.data.analysis
        : buildFallbackAnalysis(jobRes.data);

      setAnalysis(analysisData);
    } catch (err) {
      setError('Failed to load job or resume');
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const buildFallbackAnalysis = (jobData) => ({
    resumeScore: jobData.resumeScore ?? 0,
    jobMatchScore: jobData.matchScore ?? 0,
    atsScore: jobData.atsScore ?? 0,
    experienceMatch: jobData.experienceMatch ?? 0,
    projectMatch: jobData.projectMatch ?? 0,
    educationMatch: jobData.educationMatch ?? 50,
    skillMatch: jobData.skillMatch ?? 0,
    keywordMatch: jobData.keywordMatch ?? 0,
    matchedSkills: Array.isArray(jobData.matchingSkills) ? jobData.matchingSkills : [],
    missingSkills: Array.isArray(jobData.missingSkills) ? jobData.missingSkills : [],
    recommendedSkills: Array.isArray(jobData.recommendedSkills) ? jobData.recommendedSkills : [],
    weakSections: Array.isArray(jobData.weakSections) ? jobData.weakSections : [],
    missingSections: Array.isArray(jobData.missingSections) ? jobData.missingSections : [],
    keywordCategories: Array.isArray(jobData.keywordCategories) ? jobData.keywordCategories : [],
    reasons: jobData.reasons || {},
    recommendations: jobData.recommendations || {},
  });

  const generateTailoredResume = useCallback(async (options = {}) => {
    if (!resume || !job) return;

    setGenerating(true);
    setError('');

    try {
      const payload = {
        resumeId: resume.id,
        jobId: job.id,
        selectedSections: Array.isArray(options.selectedSections) ? options.selectedSections : [],
        selectedKeywords: Array.isArray(options.selectedKeywords) ? options.selectedKeywords : [],
        tone: options.tone || 'professional',
        length: options.length || 'standard',
        optimizationLevel: options.optimizationLevel || 'balanced',
      };

      const response = await api.post('/api/jobs/tailor-custom', payload);

      setSelectedTailoredResume(response.data.tailoredResume);
      setStep('preview');
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to generate tailored resume';
      setError(message);
      setStep('customize');
    } finally {
      setGenerating(false);
    }
  }, [resume, job]);

  const downloadPDF = async (tailoredResumeId) => {
    try {
      const response = await api.get(`/resumes/tailored/${tailoredResumeId}/export/pdf`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `tailored-resume-${(job?.company || 'job').replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download PDF');
    }
  };

  const downloadDOCX = async (tailoredResumeId) => {
    try {
      const response = await api.get(`/resumes/tailored/${tailoredResumeId}/export/docx`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `tailored-resume-${(job?.company || 'job').replace(/\s+/g, '-')}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download DOCX');
    }
  };

  const saveTailoredResume = async () => {
    if (!selectedTailoredResume) return;
    setSaving(true);
    setError('');
    try {
      await api.post('/tailored-resumes/save', {
        tailoredResumeId: selectedTailoredResume.id,
      });
      setSelectedTailoredResume((prev) => ({ ...prev, saved: true }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save tailored resume');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateNext = (config) => {
    setGenerationConfig(config);
    setStep('generating');
  };

  const handleGeneratingComplete = () => {
    generateTailoredResume(generationConfig);
  };

  if (loading) return <div className="text-center py-8">Loading job analysis...</div>;

  const previousAts = analysis?.atsScore ?? 0;
  const newAts = selectedTailoredResume?.atsScore ?? null;
  const aiChanges = selectedTailoredResume?.aiChanges || selectedTailoredResume?.keyChanges || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>Tailored Resume</SectionTitle>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
        >
          Back
        </button>
      </div>

      {/* Step indicator */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center justify-between">
          {STEPS.map((s, idx) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step === s
                    ? 'bg-cyan-500 text-white'
                    : idx < STEPS.indexOf(step)
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-700 text-slate-400'
                }`}
              >
                {idx < STEPS.indexOf(step) ? '✓' : idx + 1}
              </div>
              <span className={`text-sm capitalize ${step === s ? 'text-white' : 'text-slate-400'}`}>
                {s === 'analysis' ? 'Analysis' : s === 'customize' ? 'Customize' : s === 'generating' ? 'Generating' : 'Preview'}
              </span>
              {idx < STEPS.length - 1 && <div className="w-8 h-px bg-slate-600 mx-2" />}
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-red-400">{error}</p>}

      {step === 'analysis' && (
        <AnalysisStep
          analysis={analysis}
          resume={resume}
          job={job}
          onNext={() => setStep('customize')}
        />
      )}

      {step === 'customize' && (
        <CustomizeStep
          analysis={analysis}
          resume={resume}
          job={job}
          onNext={handleGenerateNext}
          onBack={() => setStep('analysis')}
        />
      )}

      {step === 'generating' && (
        <GeneratingStep jobTitle={job?.title} onComplete={handleGeneratingComplete} />
      )}

      {step === 'preview' && selectedTailoredResume && (
        <PreviewStep
          tailoredResume={selectedTailoredResume}
          previousAts={previousAts}
          newAts={newAts}
          aiChanges={aiChanges}
          onSave={saveTailoredResume}
          onDownloadPdf={() => downloadPDF(selectedTailoredResume.id)}
          onDownloadDocx={() => downloadDOCX(selectedTailoredResume.id)}
          onRegenerate={() => setStep('customize')}
          onEdit={() => alert('Inline editor is not implemented yet.')}
          onCompareChanges={() => alert('Compare changes is not implemented yet.')}
          saving={saving}
        />
      )}

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-sm text-red-300">
          <div className="font-semibold mb-1">Generation failed</div>
          <div>{error}</div>
          <div className="mt-2 text-xs text-red-400">
            If this mentions database/connectivity issues, check your backend DATABASE_URL and network/DNS access.
          </div>
        </div>
      )}

      {/* History */}
      {tailoredResumes.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold mb-3">Tailored Versions</h3>
          <div className="space-y-2">
            {tailoredResumes.map((v) => (
              <div
                key={v.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedTailoredResume?.id === v.id ? 'border-cyan-500 bg-slate-700' : 'border-slate-700 hover:border-slate-600'
                }`}
                onClick={() => {
                  setSelectedTailoredResume(v);
                  setStep('preview');
                }}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{v.title || `Version`}</span>
                  <div className="flex gap-3 text-sm">
                    {v.matchScore !== null && <span>Match: {v.matchScore}%</span>}
                    {v.atsScore !== null && <span>ATS: {v.atsScore}%</span>}
                    <span className="text-slate-400">{new Date(v.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}