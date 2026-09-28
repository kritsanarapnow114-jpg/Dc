import type { ReactNode } from "react";

// Modern line icons (Lucide/Feather style) — stroke uses currentColor so they
// inherit the nav item's text color (light on the sidebar, purple when active).
const PATHS: Record<string, ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
    </>
  ),
  products: (
    <>
      <path d="M12 2.5 3.5 7v10L12 21.5 20.5 17V7z" />
      <path d="M3.5 7 12 11.5 20.5 7" />
      <path d="M12 11.5V21.5" />
    </>
  ),
  aging: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  locations: (
    <>
      <path d="M20 10c0 5.5-8 11.5-8 11.5S4 15.5 4 10a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="2.8" />
    </>
  ),
  map: (
    <>
      <path d="M9 4 3.5 6.2v13.6L9 17.6l6 2.2 5.5-2.2V4L15 6.2z" />
      <path d="M9 4v13.6" />
      <path d="M15 6.2v13.6" />
    </>
  ),
  abc: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 12V3" />
      <path d="m12 12 7.8 4.5" />
    </>
  ),
  receive: (
    <>
      <path d="M12 3v10.5" />
      <path d="M7.5 9 12 13.5 16.5 9" />
      <path d="M4 16v2.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V16" />
    </>
  ),
  po: (
    <>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2 3h3l2.3 12.1a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.2L22 7H6" />
    </>
  ),
  issue: (
    <>
      <path d="M12 13.5V3" />
      <path d="M7.5 7.5 12 3l4.5 4.5" />
      <path d="M4 16v2.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V16" />
    </>
  ),
  ship: (
    <>
      <path d="M2 5.5h11v9H2z" />
      <path d="M13 8.5h4l3 3v3h-7z" />
      <circle cx="6" cy="17.5" r="1.6" />
      <circle cx="16.5" cy="17.5" r="1.6" />
    </>
  ),
  adjust: (
    <>
      <path d="M4 6h9" />
      <path d="M19 6h1" />
      <circle cx="16" cy="6" r="2.2" />
      <path d="M4 12h4" />
      <path d="M14 12h6" />
      <circle cx="11" cy="12" r="2.2" />
      <path d="M4 18h9" />
      <path d="M19 18h1" />
      <circle cx="16" cy="18" r="2.2" />
    </>
  ),
  transfer: (
    <>
      <path d="M17 3.5 21 7.5l-4 4" />
      <path d="M21 7.5H7.5" />
      <path d="M7 20.5 3 16.5l4-4" />
      <path d="M3 16.5h13.5" />
    </>
  ),
  count: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2.2" />
      <path d="M9 4V3.2A1.2 1.2 0 0 1 10.2 2h3.6A1.2 1.2 0 0 1 15 3.2V4" />
      <path d="M8.8 13.2 11 15.4l4.4-4.4" />
    </>
  ),
  returns: (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </>
  ),
  reports: (
    <>
      <path d="M3.5 21h17" />
      <rect x="5" y="11" width="3.2" height="7" rx="1" />
      <rect x="10.4" y="6.5" width="3.2" height="11.5" rx="1" />
      <rect x="15.8" y="13.5" width="3.2" height="4.5" rx="1" />
    </>
  ),
  compare: (
    <>
      <path d="M4 8h13l-3-3M20 16H7l3 3" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
};

export function NavIcon({ name, size = 19 }: { name: string; size?: number }) {
  const inner = PATHS[name];
  if (!inner) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {inner}
    </svg>
  );
}
