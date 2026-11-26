// A small set of line icons, drawn inline so they need no request and follow
// the text colour. Always decorative: the words beside them carry the meaning.

const PATHS = {
  sunrise: "M12 3v3M5.6 8.6 4.2 7.2M18.4 8.6l1.4-1.4M3 16h18M7 16a5 5 0 0 1 10 0M8 20h8",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z",
  home: "M3 11 12 4l9 7M5 10v10h14V10M10 20v-6h4v6",
  swap: "M7 7h13l-3-3M17 17H4l3 3",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4-4",
  pin: "M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12ZM12 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z",
  wind: "M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h7",
  leaf: "M5 19c0-8 5-13 15-14-1 10-6 15-14 15M5 19l6-6",
} as const;

export type IconName = keyof typeof PATHS;

export interface IconProps {
  name: IconName;
}

export function Icon({ name }: IconProps) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
