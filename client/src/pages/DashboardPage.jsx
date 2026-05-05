import { Plus, Sparkles } from 'lucide-react';
import { Link } from 'react-router';

const sampleGuides = [
  ['Transformer Architecture', 'AI / ML', 44, 'w-[44%]'],
  ['Water Cycle Basics', 'Science', 100, 'w-full'],
  ['Product Strategy Basics', 'Career', 13, 'w-[13%]']
];

export function DashboardPage() {
  return (
    <section className="rounded-lg border border-line bg-white p-6 shadow-soft sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-primary">Dashboard</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Your learning guides</h1>
          <p className="mt-3 text-slate-600">Continue where you left off or build something new.</p>
        </div>
        <Link to="/guides/new" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-black text-white shadow-soft">
          <Plus size={18} />
          New guide
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {sampleGuides.map(([title, chip, progress, progressClass]) => (
          <div key={title} className="rounded-lg border border-line bg-paper p-5">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-primary">{chip}</span>
              <Sparkles size={18} className="text-amber" />
            </div>
            <h2 className="mt-8 text-xl font-black">{title}</h2>
            <div className="mt-8 flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-slate-100">
                <div className={`h-2 rounded-full bg-progress ${progressClass}`} />
              </div>
              <span className="text-sm font-black">{progress}%</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
