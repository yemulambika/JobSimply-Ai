import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import SectionTitle from '../components/SectionTitle';

export default function TailoredJobPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [resume, setResume] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [tailoredResumes, setTailoredResumes] = useState([]);
  const [selectedTailoredResume, setSelectedTailoredResume] = useState(null);
  const [coverLetter, setCoverLetter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingResume, setGeneratingResume] = useState(false);
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [jobId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch job details
      const jobResponse = await api.get(`/api/jobs/${jobId}`);
      setJob(jobResponse.data);
      
      // Fetch analysis from job data
      if (jobResponse.data.analysis) {
        setAnalysis(typeof jobResponse.data.analysis === 'string' ? JSON.parse(jobResponse.data.analysis) : jobResponse.data.analysis);
      } else {
        setAnalysis({
          matchScore: jobResponse.data.matchScore || 0,
          atsScore: jobResponse.data.atsScore || 0,
          missingSkills: typeof jobResponse.data.missingSkills === 'string' ? JSON.parse(jobResponse.data.missingSkills) : (jobResponse.data.missingSkills || []),
          matchingSkills: typeof jobResponse.data.matchingSkills === 'string' ? JSON.parse(jobResponse.data.matchingSkills) : (jobResponse.data.matchingSkills || []),
          experienceMatch: jobResponse.data.experienceMatch || 0,
          projectMatch: jobResponse.data.projectMatch || 0,
          educationMatch: jobResponse.data.educationMatch || 50,
          suggestions: []
        });
      }

      // Fetch user's master resume
      const resumeResponse = await api.get('/resumes/active');
      setResume(resumeResponse.data);

      // Fetch tailored resume versions for this job
      const versionsResponse = await api.get(`/api/jobs/tailored-resumes?jobId=${jobId}`);
      setTailoredResumes(versionsResponse.data.tailoredResumes || []);
    } catch (err) {
      setError('Failed to load job or resume');
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateTailoredResume = async () => {
    if (!resume || !job) return;
    
    setGeneratingResume(true);
    setError('');
    
    try {
      const response = await api.post('/jobs/tailor', {
        jobId: jobId,
        tone: 'professional'
      });
      
      // Refresh tailored resumes list
      const versionsResponse = await api.get(`/api/jobs/tailored-resumes?jobId=${jobId}`);
      setTailoredResumes(versionsResponse.data.tailoredResumes || []);
      
      // Select the newly created version
      const newVersions = versionsResponse.data.tailoredResumes || [];
      const latest = newVersions.find(v => v.id === response.data.tailoredResume?.id);
      if (latest) {
        setSelectedTailoredResume(latest);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate tailored resume');
    } finally {
      setGeneratingResume(false);
    }
  };

  const generateCoverLetter = async () => {
    if (!selectedTailoredResume || !job) return;
    
    setGeneratingCoverLetter(true);
    setError('');
    
    try {
      const response = await api.post('/jobs/cover-letter', {
        jobId: jobId,
        company: job.company,
        position: job.title,
        jobDescription: job.description
      });
      setCoverLetter(response.data.coverLetter);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate cover letter');
    } finally {
      setGeneratingCoverLetter(false);
    }
  };

  const downloadPDF = async (tailoredResumeId) => {
    try {
      const response = await api.get(`/resumes/tailored/${tailoredResumeId}/export/pdf`, { 
        responseType: 'blob' 
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `tailored-resume-${job?.company?.replace(/\s+/g, '-') || 'job'}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download PDF');
    }
  };

  const goBack = () => {
    window.location.href = '/saved-jobs';
  };

  if (loading) return <div className="text-center py-8">Loading job analysis...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionTitle>Resume Comparison</SectionTitle>
        <button
          onClick={goBack}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
        >
          Back to Saved Jobs
        </button>
      </div>

      {/* Two-column comparison layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Master Resume */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-cyan-400">Master Resume</h3>
          {resume ? (
            <div className="space-y-4 text-sm">
              {/* PERSONAL INFO - TRUTHFUL - NEVER MODIFIED */}
              {resume.parsedData?.name && (
                <div>
                  <strong>Name:</strong> {resume.parsedData.name}
                </div>
              )}
              {resume.parsedData?.email && (
                <div>
                  <strong>Email:</strong> {resume.parsedData.email}
                </div>
              )}
              {resume.parsedData?.phone && (
                <div>
                  <strong>Phone:</strong> {resume.parsedData.phone}
                </div>
              )}
              
              {/* EDUCATION - TRUTHFUL - NEVER MODIFIED */}
              {resume.education && resume.education.length > 0 && (
                <div className="pt-3 border-t border-slate-700">
                  <strong>Education:</strong>
                  <ul className="mt-1 ml-4">
                    {resume.education.map((edu, i) => (
                      <li key={i} className="text-xs">{edu.degree} - {edu.institution}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* SKILLS - Can be optimized */}
              {resume.skills && resume.skills.length > 0 && (
                <div className="pt-3 border-t border-slate-700">
                  <strong>Skills:</strong>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {resume.skills.map((skill, i) => (
                      <span key={i} className="px-2 py-1 bg-slate-700 rounded text-xs">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-yellow-400">No master resume found. Please upload a resume.</p>
          )}
        </div>

        {/* RIGHT: Job Description */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-cyan-400">Job Description</h3>
          <div className="space-y-3 text-sm">
            <div>
              <strong>Position:</strong> {job?.title}
            </div>
            <div>
              <strong>Company:</strong> {job?.company}
            </div>
            <div>
              <strong>Location:</strong> {job?.location || 'Not specified'}
            </div>
            <div className="pt-3 border-t border-slate-700">
              <strong>Description:</strong>
              <p className="mt-2 text-slate-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                {job?.description || 'No description available'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM: Comparison Results */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Comparison Results</h3>
        
        {/* Scores */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-cyan-400">{analysis?.atsScore ?? 0}%</div>
            <div className="text-sm text-slate-400">ATS Score</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-cyan-400">{analysis?.matchScore ?? 0}%</div>
            <div className="text-sm text-slate-400">Match Score</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400">{analysis?.matchingSkills?.length ?? 0}</div>
            <div className="text-sm text-slate-400">Matching Skills</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-400">{analysis?.missingSkills?.length ?? 0}</div>
            <div className="text-sm text-slate-400">Missing Skills</div>
          </div>
        </div>

        {/* Matching Skills */}
        {analysis?.matchingSkills?.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium mb-2 text-green-400">Matching Skills</h4>
            <div className="flex flex-wrap gap-2">
              {analysis.matchingSkills.map((skill, index) => (
                <span key={index} className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Missing Skills */}
        {analysis?.missingSkills?.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium mb-2 text-red-400">Missing Skills</h4>
            <div className="flex flex-wrap gap-2">
              {analysis.missingSkills.map((skill, index) => (
                <span key={index} className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Missing Keywords */}
        {analysis?.recommendedKeywords && analysis.recommendedKeywords.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium mb-2 text-yellow-400">Recommended Keywords</h4>
            <div className="flex flex-wrap gap-2">
              {analysis.recommendedKeywords.map((kw, index) => (
                <span key={index} className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-sm">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Gaps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <span className="text-slate-400">Experience Match:</span>
            <span className="ml-2 font-medium">{analysis?.experienceMatch ?? 0}%</span>
          </div>
          <div>
            <span className="text-slate-400">Projects Match:</span>
            <span className="ml-2 font-medium">{analysis?.projectMatch ?? 0}%</span>
          </div>
          <div>
            <span className="text-slate-400">Education Match:</span>
            <span className="ml-2 font-medium">{analysis?.educationMatch ?? 50}%</span>
          </div>
        </div>

        {/* Suggestions */}
        {analysis?.suggestions?.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Suggestions</h4>
            <ul className="space-y-2">
              {analysis.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Resume Version History */}
      {tailoredResumes.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Resume Version History</h3>
          <div className="space-y-2">
            {tailoredResumes.map((v, i) => (
              <div 
                key={v.id} 
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedTailoredResume?.id === v.id ? 'border-cyan-500 bg-slate-700' : 'border-slate-700 hover:border-slate-600'
                }`}
                onClick={() => setSelectedTailoredResume(v)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">Version {i + 1} - {v.company || job?.company}</span>
                  <div className="flex gap-2 text-sm">
                    <span>Match: {v.matchScore}%</span>
                    <span>ATS: {v.atsScore}%</span>
                    <span className="text-slate-400">{new Date(v.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 items-center flex-wrap">
        <button
          onClick={generateTailoredResume}
          disabled={generatingResume || !resume}
          className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
        >
          {generatingResume ? 'Generating...' : 'Generate Tailored Resume'}
        </button>

        {/* Generate Cover Letter - Only shown after tailored resume is created */}
        {selectedTailoredResume && (
          <button
            onClick={generateCoverLetter}
            disabled={generatingCoverLetter}
            className="px-6 py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            {generatingCoverLetter ? 'Generating...' : 'Generate Cover Letter'}
          </button>
        )}

        {selectedTailoredResume && (
          <button
            onClick={() => downloadPDF(selectedTailoredResume.id)}
            className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-medium transition-colors"
          >
            Download PDF
          </button>
        )}
      </div>

      {/* Cover Letter Display - Only shown after generation */}
      {coverLetter && (
        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Cover Letter</h3>
          <pre className="text-sm text-slate-300 whitespace-pre-wrap max-h-96 overflow-y-auto bg-slate-900 p-4 rounded">
            {coverLetter.content}
          </pre>
        </div>
      )}

      {error && <p className="text-red-400">{error}</p>}
    </div>
  );
}