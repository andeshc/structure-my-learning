import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';

const ADMIN_EMAIL = 'support@structuremylearning.com';

const levelLabels = {
  early_learner: 'Early Learner',
  young_child: 'Young Child',
  middle_schooler: 'Middle Schooler',
  high_schooler: 'High Schooler',
  adult_beginner: 'Adult Beginner',
  adult_intermediate: 'Adult Intermediate',
  adult_advanced: 'Adult Advanced',
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatCost(usd) {
  const n = Number(usd || 0);
  if (n === 0) return '—';
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

export default function AdminReportPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [expandedUser, setExpandedUser] = useState(null);

  if (user && user.email !== ADMIN_EMAIL) return <Navigate to="/dashboard" replace />;

  useEffect(() => {
    apiRequest('/api/admin/report')
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading…</p>;

  const { users, guides } = data;
  const guidesByUser = guides.reduce((acc, g) => {
    (acc[g.user_id] ??= []).push(g);
    return acc;
  }, {});

  const totalGuides = guides.length;
  const readyGuides = guides.filter((g) => g.status === 'ready').length;
  const totalCost = guides.reduce((sum, g) => sum + Number(g.cost_usd || 0), 0);

  return (
    <section className="max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Admin Report</h1>
      <p className="mt-1 text-sm text-slate-500">All registered users and their guides.</p>

      {/* Summary stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total users', value: users.length },
          { label: 'Total guides', value: totalGuides },
          { label: 'Ready guides', value: readyGuides },
          { label: 'Total cost', value: formatCost(totalCost) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 text-3xl font-bold text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Verified</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3 text-right">Guides</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => {
              const userGuides = guidesByUser[u.id] ?? [];
              const isExpanded = expandedUser === u.id;
              return (
                <>
                  <tr
                    key={u.id}
                    className={`cursor-pointer transition-colors hover:bg-slate-50 ${isExpanded ? 'bg-slate-50' : ''}`}
                    onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                    <td className="px-4 py-3 text-slate-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        u.email_verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {u.email_verified ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700">{u.guide_count}</td>
                  </tr>
                  {isExpanded && userGuides.length > 0 && (
                    <tr key={`${u.id}-guides`}>
                      <td colSpan={5} className="bg-slate-50 px-4 pb-3 pt-0">
                        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-slate-100 text-left font-semibold uppercase tracking-wide text-slate-400">
                                <th className="px-3 py-2">Guide</th>
                                <th className="px-3 py-2">Level</th>
                                <th className="px-3 py-2">Coverage</th>
                                <th className="px-3 py-2">Status</th>
                                <th className="px-3 py-2">Cost</th>
                                <th className="px-3 py-2">Created</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {userGuides.map((g) => (
                                <tr key={g.id}>
                                  <td className="px-3 py-2 font-medium text-slate-700">{g.title}</td>
                                  <td className="px-3 py-2 text-slate-500">{levelLabels[g.learning_level] ?? g.learning_level}</td>
                                  <td className="px-3 py-2 capitalize text-slate-500">{g.coverage}</td>
                                  <td className="px-3 py-2">
                                    <span className={`rounded px-1.5 py-0.5 font-semibold ${
                                      g.status === 'ready' ? 'bg-emerald-50 text-emerald-700'
                                      : g.status === 'failed' ? 'bg-red-50 text-red-700'
                                      : 'bg-amber-50 text-amber-700'
                                    }`}>
                                      {g.status}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-slate-500">{formatCost(g.cost_usd)}</td>
                                  <td className="px-3 py-2 text-slate-400">{formatDate(g.created_at)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                  {isExpanded && userGuides.length === 0 && (
                    <tr key={`${u.id}-empty`}>
                      <td colSpan={5} className="bg-slate-50 px-4 pb-3 pt-0 text-xs text-slate-400">No guides yet.</td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </section>
  );
}
