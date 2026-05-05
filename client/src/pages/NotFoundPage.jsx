import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4">
      <div className="rounded-lg border border-line bg-white p-8 text-center shadow-soft">
        <p className="text-7xl font-black text-primary">404</p>
        <h1 className="mt-4 text-3xl font-black">Page not found</h1>
        <p className="mt-3 text-slate-600">This learning path is not available.</p>
        <Link className="mt-6 inline-flex h-11 items-center rounded-lg bg-primary px-5 font-black text-white" to="/dashboard">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
