// Line-art: one 2 px stroke in currentColor, round caps, no fills, one accent stroke.
// Colour only via currentColor and --hn-* vars.
import { type IllustrationStyle, MOTIF_BOX } from "./category";

const stroke = {
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function Empty() {
  return (
    <svg {...MOTIF_BOX} fill="none" aria-hidden="true">
      <g {...stroke}>
        <path d="M30 106h100" strokeDasharray="2 6" />
        <path d="M40 56 80 40l40 16-40 16z" />
        <path d="M40 56v28l40 16 40-16V56M80 72v28" />
        <path d="M40 56 26 46l40-16 14 10M120 56l14-10-40-16-14 10" />
      </g>
      <g {...stroke} stroke="var(--hn-action-text)">
        <path d="M58 12v10M53 17h10M104 8v6M101 11h6" />
      </g>
    </svg>
  );
}

function ErrorMotif() {
  return (
    <svg {...MOTIF_BOX} fill="none" aria-hidden="true">
      <g {...stroke}>
        <path d="M30 106h100" strokeDasharray="2 6" />
        <rect x="30" y="18" width="100" height="76" rx="8" />
        <path d="M30 34h100" />
        <path d="M40 26h.01M47 26h.01M54 26h.01" strokeWidth="3" />
      </g>
      <g {...stroke} stroke="var(--hn-status-crit)">
        <path d="m80 46 18 18-18 18-18-18z" />
        <path d="M80 56v9M80 71h.01" />
      </g>
    </svg>
  );
}

export const variant: IllustrationStyle = {
  label: "Line-art",
  summary:
    "A single 2 px ink line, no fills, one accent stroke. Light and calm next to text; thinner at small sizes and needs care to stay legible in eight motifs.",
  Empty,
  Error: ErrorMotif,
};
