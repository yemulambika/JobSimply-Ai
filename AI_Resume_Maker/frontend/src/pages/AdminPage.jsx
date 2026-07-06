import { useState, useEffect } from 'react';
import api from '../services/api';
import SectionTitle from '../components/SectionTitle';

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, analyticsRes] = await Promise.all([
        api.get('/admin/stats').catch(() => ({ data: { stats: null } })),
        api.get('/admin/users').catch(() => ({ data: { users: [] } })),
        api.get('/admin/analytics').catch(() => ({ data: { analytics: null } })),
      ]);
      setStats(statsRes.data.stats);
      setUsers(usersRes.data.users || []);
      setAnalytics(analyticsRes.data.analytics);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <SectionTitle>Admin Dashboard</SectionTitle>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-800 rounded-lg text-center">
            <p className="text-3xl font-bold text-cyan-300">{stats.users}</p>
            <p className="text-sm text-slate-400">Users</p>
          </div>
          <div className="p-4 bg-slate-800 rounded-lg text-center">
            <p className="text-3xl font-bold text-cyan-300">{stats.jobs}</p>
            <p className="text-sm text-slate-400">Jobs</p>
          </div>
          <div className="p-4 bg-slate-800 rounded-lg text-center">
            <p className="text-3xl font-bold text-cyan-300">{stats.resumes}</p>
            <p className="text-sm text-slate-400">Resumes</p>
          </div>
          <div className="p-4 bg-slate-800 rounded-lg text-center">
            <p className="text-3xl font-bold text-cyan-300">{stats.applications}</p>
            <p className="text-sm text-slate-400">Applications</p>
          </div>
        </div>
      )}

      {analytics?.jobSources && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Jobs by Source</h3>
          <div className="space-y-2">
            {analytics.jobSources.map((source) => (
              <div key={source.source} className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                <span>{source.source}</span>
                <span className="font-medium">{source.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {analytics?.applicationStatuses && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Applications by Status</h3>
          <div className="space-y-2">
            {analytics.applicationStatuses.map((status) => (
              <div key={status.status} className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                <span className="capitalize">{status.status}</span>
                <span className="font-medium">{status.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-3">Recent Users</h3>
        <div className="space-y-2">
          {users.slice(0, 10).map((user) => (
            <div key={user.id} className="p-3 bg-slate-800 rounded-lg">
              <p className="font-medium">{user.email}</p>
              <p className="text-sm text-slate-400">{user.name} • {user.role}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}