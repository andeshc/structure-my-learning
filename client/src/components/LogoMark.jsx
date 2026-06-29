import { useId } from 'react';

// `fill` renders the mark in a single solid colour (e.g. "white" on a coloured
// surface); omit it for the default teal brand gradient.
export default function LogoMark({ className = '', fill }) {
  const id = useId().replace(/:/g, '');
  const pillFill = fill ?? `url(#lm-grad-${id})`;
  return (
    <svg
      viewBox="0 0 104 73"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      {!fill && (
        <defs>
          <linearGradient id={`lm-grad-${id}`} gradientUnits="userSpaceOnUse" x1="10" y1="70" x2="96" y2="4">
            <stop offset="0" stopColor="#0F766E" />
            <stop offset="0.55" stopColor="#0D9488" />
            <stop offset="1" stopColor="#2DD4BF" />
          </linearGradient>
        </defs>
      )}
      <rect x="54" y="0"  width="50" height="21" rx="10.5" fill={pillFill} />
      <rect x="27" y="26" width="50" height="21" rx="10.5" fill={pillFill} />
      <rect x="0"  y="52" width="50" height="21" rx="10.5" fill={pillFill} />
    </svg>
  );
}
