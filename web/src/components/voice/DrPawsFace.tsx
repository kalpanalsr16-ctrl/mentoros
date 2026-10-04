import { useId } from "react";

export function DrPawsFace({ size = 64, className }: { size?: number; className?: string }) {
  const gradientId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="9" fill="#312e81" />
      <circle cx="48" cy="16" r="9" fill="#312e81" />
      <circle cx="16" cy="16" r="4.5" fill="#f9a8d4" />
      <circle cx="48" cy="16" r="4.5" fill="#f9a8d4" />
      <circle cx="32" cy="35" r="24" fill={`url(#${gradientId})`} />
      <ellipse cx="23" cy="31" rx="4.2" ry="5" fill="#ffffff" />
      <ellipse cx="41" cy="31" rx="4.2" ry="5" fill="#ffffff" />
      <circle cx="24" cy="32" r="2.2" fill="#1e1b4b" />
      <circle cx="42" cy="32" r="2.2" fill="#1e1b4b" />
      <circle cx="24.8" cy="30.8" r="0.8" fill="#ffffff" />
      <circle cx="42.8" cy="30.8" r="0.8" fill="#ffffff" />
      <path d="M26 42 Q32 47 38 42" fill="none" stroke="#1e1b4b" strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx="32" cy="39" rx="2.6" ry="1.8" fill="#f472b6" />
      <g fill="#fde68a">
        <circle cx="46" cy="52" r="3.2" />
        <circle cx="41" cy="48.5" r="1.7" />
        <circle cx="51" cy="48.5" r="1.7" />
      </g>
    </svg>
  );
}
