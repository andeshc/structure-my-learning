import { useAuth } from '../context/AuthContext';

export default function AccountPage() {
  const { user } = useAuth();

  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
      <div className="mt-6 rounded-lg border border-charcoal/10 bg-white p-5">
        <p className="font-medium">{user?.name}</p>
        <p className="mt-1 text-sm text-charcoal-400">{user?.email}</p>
      </div>
    </section>
  );
}
