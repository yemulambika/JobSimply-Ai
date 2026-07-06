import { useState, useEffect } from 'react';
import api from '../services/api';
import SectionTitle from '../components/SectionTitle';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    applications: 0,
    savedJobs: 0,
    resumes: 0,
    coverLetters: 0,
  });
  const [recentApplications, setRecentApplications] = useState([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [appRes, savedJobRes, resumeRes, coverLetterRes] = await Promise.all([
        api.get('/applications').catch(() => ({ data: { applications: [] } })),
        api.get('/saved-jobs').catch(() => ({ data: { savedJobs: [] } })),
        api.get('/resumes').catch(() => ({ data: { resumes: [] } })),
        api.get('/coverletters').catch(() => ({ data: { coverLetters: [] } })),
      ]);
      
      setStats({
        applications: appRes.data.applications?.length || 0,
        savedJobs: savedJobRes.data.savedJobs?.length || 0,
        resumes: resumeRes.data.resumes?.length || 0,
        coverLetters: coverLetterRes.data.coverLetters?.length || 0,
      });
      setRecentApplications(appRes.data.applications?.slice(0, 5) || []);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const quickLinks = [
    { name: 'Find Jobs', path: '/jobs', icon: '🔍' },
    { name: 'Upload Resume', path: '/resume', icon: '📄' },
    { name: 'ATS Check', path: '/ats', icon: '🎯' },
    { name: 'Tailor Resume', path: '/tailor', icon: '✂️' },
    { name: 'Cover Letter', path: '/cover-letter', icon: '✉️' },
    { name: 'Interview Prep', path: '/interview', icon: '🎤' },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle>Dashboard</SectionTitle>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-800 rounded-lg text-center">
          <p className="text-3xl font-bold text-cyan-300">{stats.applications}</p>
          <p className="text-sm text-slate-400">Applications</p>
        </div>
        <div className="p-4 bg-slate-800 rounded-lg text-center">
          <p className="text-3xl font-bold text-cyan-300">{stats.savedJobs}</p>
          <p className="text-sm text-slate-400">Saved Jobs</p>
        </div>
        <div className="p-4 bg-slate-800 rounded-lg text-center">
          <p className="text-3xl font-bold text-cyan-300">{stats.resumes}</p>
          <p className="text-sm text-slate-400">Resumes</p>
        </div>
        <div className="p-4 bg-slate-800 rounded-lg text-center">
          <p className="text-3xl font-bold text-cyan-300">{stats.coverLetters}</p>
          <p className="text-sm text-slate-400">Cover Letters</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="p-4 bg-slate-800 hover:bg-slate-700 rounded-lg text-center transition-colors"
            >
              <span className="text-2xl mb-2 block">{link.icon}</span>
              <span className="text-sm font-medium">{link.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {recentApplications.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Recent Applications</h3>
          <div className="space-y-3">
            {recentApplications.map((app) => (
              <div key={app.id} className="p-4 bg-slate-800 rounded-lg">
                <h4 className="font-medium">{app.jobTitle}</h4>
                <p className="text-sm text-slate-400">{app.jobCompany}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}