import React from 'react';

export default function LoadingPanel({ title = 'Loading...', detail = 'This usually takes a few seconds.' }) {
  return (
    <div className="rounded-lg border border-charcoal/10 bg-white p-6">
      <div className="h-2 w-full overflow-hidden rounded-full bg-charcoal/10">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-teal-700" />
      </div>
      <p className="mt-4 font-medium">{title}</p>
      <p className="mt-1 text-sm text-charcoal-400">{detail}</p>
    </div>
  );
}
