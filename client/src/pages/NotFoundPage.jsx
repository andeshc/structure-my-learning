import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <section className="rounded-lg border border-charcoal/10 bg-white p-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-charcoal-400">The page you opened does not exist.</p>
      <Link className="mt-6 inline-flex rounded-md bg-charcoal px-4 py-2.5 text-sm font-medium text-white" to="/">
        Go to dashboard
      </Link>
    </section>
  );
}
