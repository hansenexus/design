// no-permission: not allowed here. A padlock on a closed panel, a warn no-entry badge.
import { Frame, type IllustrationProps } from "./frame";

export type { IllustrationProps };

export function NoPermissionIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <rect x="34" y="16" width="92" height="80" rx="8" fill="currentColor" fillOpacity=".16" />
      <path
        d="M80 26a20 20 0 0 1 20 20v12h-9V46a11 11 0 0 0-22 0v12h-9V46a20 20 0 0 1 20-20z"
        fill="currentColor"
        fillOpacity=".32"
      />
      <path
        d="M58 56h44a4 4 0 0 1 4 4v28a4 4 0 0 1-4 4H58a4 4 0 0 1-4-4V60a4 4 0 0 1 4-4zm22 8a5 5 0 0 0-2.5 9.3V82h5v-8.7A5 5 0 0 0 80 64z"
        fillRule="evenodd"
        fill="currentColor"
        fillOpacity=".5"
      />
      <path
        d="M108 49a9 9 0 1 1 0 18 9 9 0 0 1 0-18zm-5 7.5h10v3h-10z"
        fillRule="evenodd"
        fill="var(--hn-status-warn)"
      />
    </Frame>
  );
}
