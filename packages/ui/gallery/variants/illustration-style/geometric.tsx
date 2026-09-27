// Geometric: flat, filled primitives in two tones of currentColor with one token accent.
// No outlines to speak of; the shapes carry it. Colour only via currentColor and --hn-* vars.
import { type IllustrationStyle, MOTIF_BOX } from "./category";

function Empty() {
  return (
    <svg {...MOTIF_BOX} fill="none" aria-hidden="true">
      <ellipse cx="80" cy="106" rx="50" ry="6" fill="currentColor" fillOpacity=".12" />
      <path d="M36 58 80 42l44 16-44 16z" fill="currentColor" fillOpacity=".16" />
      <path d="M36 58l44 16v26L36 84z" fill="currentColor" fillOpacity=".5" />
      <path d="M124 58 80 74v26l44-16z" fill="currentColor" fillOpacity=".32" />
      <circle cx="58" cy="26" r="7" fill="var(--hn-action-primary)" />
      <rect
        x="86"
        y="12"
        width="13"
        height="13"
        rx="2"
        transform="rotate(15 92.5 18.5)"
        fill="currentColor"
        fillOpacity=".5"
      />
      <path d="m110 38 7-12 7 12z" fill="currentColor" fillOpacity=".32" />
    </svg>
  );
}

function ErrorMotif() {
  return (
    <svg {...MOTIF_BOX} fill="none" aria-hidden="true">
      <ellipse cx="80" cy="106" rx="50" ry="6" fill="currentColor" fillOpacity=".12" />
      <rect x="30" y="18" width="100" height="76" rx="8" fill="currentColor" fillOpacity=".16" />
      <path d="M30 26a8 8 0 0 1 8-8h84a8 8 0 0 1 8 8v8H30z" fill="currentColor" fillOpacity=".4" />
      <path d="m80 42 20 20-20 20-20-20z" fill="var(--hn-status-crit)" />
      <rect x="78" y="51" width="4" height="13" rx="2" fill="var(--hn-surface-card)" />
      <circle cx="80" cy="70" r="2.4" fill="var(--hn-surface-card)" />
    </svg>
  );
}

export const variant: IllustrationStyle = {
  label: "Geometric",
  summary:
    "Flat filled shapes in tones of the ink colour, one accent (lime, or crit on error). Reads at a glance and small; less room for detail across eight motifs.",
  Empty,
  Error: ErrorMotif,
};
