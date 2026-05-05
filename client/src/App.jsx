import { BookOpen, CheckCircle2, Plus, Sparkles } from 'lucide-react';

function App() {
  return (
    <main className="min-h-screen bg-paper px-6 py-8">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-lg border border-line bg-white p-6 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-lg font-black leading-5 text-ink">Structure</p>
              <p className="text-lg font-black leading-5 text-primary">MyLearning</p>
            </div>
          </div>
          <nav className="mt-10 grid gap-2 text-sm font-bold text-slate-600">
            <span className="rounded-lg bg-blue-50 px-4 py-3 text-primary">Dashboard</span>
            <span className="rounded-lg px-4 py-3">New Guide</span>
            <span className="rounded-lg px-4 py-3">Account</span>
          </nav>
          <div className="mt-24 rounded-lg border border-amber/40 bg-amber/10 p-4">
            <Sparkles className="mb-3 text-amber" size={22} />
            <p className="font-bold text-ink">Foundation ready</p>
            <p className="mt-1 text-sm text-slate-600">Client and server scaffolds are connected next.</p>
          </div>
        </aside>

        <section className="rounded-lg border border-line bg-white p-8 shadow-soft">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase text-primary">Phase 2</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight text-ink">Project scaffold</h1>
              <p className="mt-3 max-w-2xl text-slate-600">
                The learning workspace now has a Vite React client, Express server, SQLite schema,
                environment template, CORS setup, and health endpoint.
              </p>
            </div>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-bold text-white shadow-soft">
              <Plus size={18} />
              New guide
            </button>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ['Client', 'React + Vite + Tailwind'],
              ['Server', 'Express on 0.0.0.0'],
              ['Database', 'SQLite via better-sqlite3']
            ].map(([title, detail]) => (
              <div key={title} className="rounded-lg border border-line bg-paper p-5">
                <CheckCircle2 className="text-progress" size={24} />
                <h2 className="mt-4 text-xl font-black text-ink">{title}</h2>
                <p className="mt-2 text-sm text-slate-600">{detail}</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;
