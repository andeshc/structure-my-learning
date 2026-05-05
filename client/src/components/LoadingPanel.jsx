export function LoadingPanel({ title, detail }) {
  return (
    <div className="rounded-lg border border-amber/40 bg-amber/10 p-5">
      <div className="flex items-center gap-4">
        <div className="h-8 w-8 rounded-full border-4 border-amber/30 border-t-amber" />
        <div>
          <h2 className="font-black text-ink">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{detail}</p>
        </div>
      </div>
    </div>
  );
}
