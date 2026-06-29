import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';

const ADMIN_EMAILS = new Set([
  'support@structuremylearning.com',
  'andeshc@gmail.com',
  'andeshc@outlook.com',
]);

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

function guidePct(g) {
  const total = Number(g.subtopic_count || 0);
  const done = Number(g.completed_subtopic_count || 0);
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

function DeleteUserModal({ user, onClose, onDeleted }) {
  const [text, setText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const confirmed = text.trim().toLowerCase() === user.email.toLowerCase();

  async function handleDelete() {
    if (!confirmed) return;
    setIsDeleting(true);
    setError('');
    try {
      await apiRequest(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      onDeleted(user.id);
    } catch (err) {
      setError(err.message || 'Failed to delete user.');
      setIsDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-100">
            <Trash2 size={16} className="text-red-600" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-950">Delete user</h2>
            <p className="mt-1 text-sm text-slate-500">
              This permanently deletes <span className="font-medium text-slate-700">{user.name}</span> and all of their
              guides, progress, and data. This cannot be undone.
            </p>
          </div>
        </div>

        <label className="mt-4 block text-xs font-semibold text-slate-600">
          Type <span className="font-mono text-slate-900">{user.email}</span> to confirm
        </label>
        <input
          autoFocus
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={user.email}
          className="mt-1.5 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-400"
        />
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:border-slate-300"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            onClick={handleDelete}
            disabled={!confirmed || isDeleting}
          >
            {isDeleting ? 'Deleting…' : 'Delete user'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminReportPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [expandedUser, setExpandedUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  if (user && !ADMIN_EMAILS.has(user.email)) return <Navigate to="/dashboard" replace />;

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

  function handleUserDeleted(userId) {
    setData((prev) => ({
      users: prev.users.filter((u) => u.id !== userId),
      guides: prev.guides.filter((g) => g.user_id !== userId),
    }));
    setDeleteTarget(null);
    if (expandedUser === userId) setExpandedUser(null);
  }

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
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => {
              const userGuides = guidesByUser[u.id] ?? [];
              const isExpanded = expandedUser === u.id;
              const isAdminUser = ADMIN_EMAILS.has(u.email);
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
                    <td className="px-4 py-3 text-right">
                      <button
                        aria-label={`Delete ${u.name}`}
                        title={isAdminUser ? 'Admin accounts cannot be deleted' : 'Delete user'}
                        disabled={isAdminUser}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition-colors enabled:hover:border-red-200 enabled:hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(u); }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                  {isExpanded && userGuides.length > 0 && (
                    <tr key={`${u.id}-guides`}>
                      <td colSpan={6} className="bg-slate-50 px-4 pb-3 pt-0">
                        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-slate-100 text-left font-semibold uppercase tracking-wide text-slate-400">
                                <th className="px-3 py-2">Guide</th>
                                <th className="px-3 py-2">Level</th>
                                <th className="px-3 py-2">Coverage</th>
                                <th className="px-3 py-2">Status</th>
                                <th className="px-3 py-2">Progress</th>
                                <th className="px-3 py-2">Cost</th>
                                <th className="px-3 py-2">Created</th>
                                <th className="px-3 py-2"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {userGuides.map((g) => {
                                const pct = guidePct(g);
                                return (
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
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-2">
                                        <progress className="h-1.5 w-16 overflow-hidden rounded-full" max="100" value={pct}>{pct}%</progress>
                                        <span className="tabular-nums text-slate-500">{pct}%</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-slate-500">{formatCost(g.cost_usd)}</td>
                                    <td className="px-3 py-2 text-slate-400">{formatDate(g.created_at)}</td>
                                    <td className="px-3 py-2 text-right">
                                      <Link
                                        to={`/guides/${g.id}`}
                                        className="rounded-md bg-blue-50 px-2 py-1 font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                                      >
                                        View →
                                      </Link>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                  {isExpanded && userGuides.length === 0 && (
                    <tr key={`${u.id}-empty`}>
                      <td colSpan={6} className="bg-slate-50 px-4 pb-3 pt-0 text-xs text-slate-400">No guides yet.</td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {deleteTarget && (
        <DeleteUserModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleUserDeleted}
        />
      )}
    </section>
  );
}
