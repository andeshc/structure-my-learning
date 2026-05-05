import { useAuth } from '../context/AuthContext';

export function AccountPage() {
  const { user } = useAuth();

  return (
    <section className="rounded-lg border border-line bg-white p-6 shadow-soft sm:p-8">
      <p className="text-sm font-black uppercase text-primary">Account</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight">{user?.name}</h1>
      <div className="mt-8 divide-y divide-line overflow-hidden rounded-lg border border-line">
        <div className="flex justify-between gap-4 p-4">
          <span className="font-bold text-slate-500">Email</span>
          <strong>{user?.email}</strong>
        </div>
        <div className="flex justify-between gap-4 p-4">
          <span className="font-bold text-slate-500">Member since</span>
          <strong>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Today'}</strong>
        </div>
      </div>
    </section>
  );
}
