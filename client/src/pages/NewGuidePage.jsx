export function NewGuidePage() {
  return (
    <section className="rounded-lg border border-line bg-white p-6 shadow-soft sm:p-8">
      <p className="text-sm font-black uppercase text-primary">New guide</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight">What do you want to learn?</h1>
      <textarea
        className="mt-8 min-h-40 w-full rounded-lg border-2 border-primary bg-white p-5 text-xl outline-none"
        defaultValue="teach me SQL joins with examples"
      />
      <button className="mt-5 h-12 rounded-lg bg-primary px-6 font-black text-white shadow-soft">Generate outline</button>
    </section>
  );
}
