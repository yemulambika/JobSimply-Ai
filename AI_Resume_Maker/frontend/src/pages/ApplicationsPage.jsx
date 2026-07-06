import { useState, useEffect } from 'react';
import api from '../services/api';
import SectionTitle from '../components/SectionTitle';

const STATUS_COLORS = {
  applied: 'bg-blue-500/20 text-blue-300',
  interviewing: 'bg-purple-500/20 text-purple-300',
  offered: 'bg-green-500/20 text-green-300',
  rejected: 'bg-red-500/20 text-red-300',
  saved: 'bg-yellow-500/20 text-yellow-300',
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    fetchApplications();
    fetchStats();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await api.get('/applications');
      setApplications(response.data.applications || []);
    } catch (err) {
      console.error('Failed to fetch applications:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/applications/stats');
      setStats(response.data.stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const updateStatus = async (appId, newStatus) => {
    try {
      await api.patch(`/applications/${appId}`, { status: newStatus });
      fetchApplications();
      fetchStats();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle>Application Tracker</SectionTitle>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(stats.byStatus).map(([status, count]) => (
            <div key={status} className="p-4 bg-slate-800 rounded-lg">
              <p className="text-sm text-slate-400 mb-1 capitalize">{status}</p>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {applications.length === 0 ? (
          <p className="text-slate-400">No applications tracked yet. Save jobs and apply to start tracking.</p>
        ) : (
          applications.map((app) => (
            <div key={app.id} className="p-4 bg-slate-800 rounded-lg space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{app.jobTitle}</h3>
                  <p className="text-slate-400">{app.jobCompany}</p>
                  <p className="text-sm text-slate-500">{app.jobLocation}</p>
                </div>
                <select
                  value={app.status}
                  onChange={(e) => updateStatus(app.id, e.target.value)}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[app.status] || STATUS_COLORS.applied}`}
                >
                  <option value="applied">Applied</option>
                  <option value="interviewing">Interviewing</option>
                  <option value="offered">Offered</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              {app.notes && <p className="text-sm text-slate-300">{app.notes}</p>}
              <p className="text-xs text-slate-500">
                Applied: {new Date(app.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}