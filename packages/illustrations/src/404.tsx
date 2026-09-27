// 404: the page is not here. A sheet with a folded corner and a pin over an empty spot; lime.
import { Frame, type IllustrationProps } from "./frame";

export type { IllustrationProps };

export function NotFoundIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <path d="M38 22h56l20 20v52H38z" fill="currentColor" fillOpacity=".16" />
      <path d="M94 22v20h20z" fill="currentColor" fillOpacity=".4" />
      <rect x="46" y="30" width="14" height="6" rx="3" fill="currentColor" fillOpacity=".32" />
      <ellipse cx="80" cy="80" rx="16" ry="5" fill="currentColor" fillOpacity=".32" />
      <path
        d="M80 34a17 17 0 0 1 17 17c0 12-17 27-17 27S63 63 63 51a17 17 0 0 1 17-17zm0 10a7 7 0 1 0 0 14 7 7 0 0 0 0-14z"
        fillRule="evenodd"
        fill="var(--hn-action-primary)"
      />
    </Frame>
  );
}
