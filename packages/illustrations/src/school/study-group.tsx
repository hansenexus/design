// school/study-group: learning together. Three figures around a table, a speech bubble in the
// action accent.
import { Frame, type IllustrationProps } from "../frame";

export type { IllustrationProps };

function Figure({ x, y, opacity }: { x: number; y: number; opacity: string }) {
  return (
    <g fill="currentColor" opacity={opacity}>
      <circle cx={x} cy={y} r="9" />
      <path d={`M${x - 15} ${y + 32}a15 15 0 0 1 30 0z`} />
    </g>
  );
}

export function StudyGroupIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <Figure x={46} y={46} opacity=".32" />
      <Figure x={114} y={46} opacity=".32" />
      <Figure x={80} y={38} opacity=".5" />
      <ellipse cx="80" cy="84" rx="44" ry="10" fill="currentColor" fillOpacity=".16" />
      <path
        d="M96 10h30a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4h-18l-8 6v-6h-4a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4z"
        fill="var(--hn-action-primary)"
      />
    </Frame>
  );
}
