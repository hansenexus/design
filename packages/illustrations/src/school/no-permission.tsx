// school/no-permission: not allowed here. A closed classroom door with a hanging sign, the warn
// no-entry badge on it.
import { Frame, type IllustrationProps } from "../frame";

export type { IllustrationProps };

export function SchoolNoPermissionIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <path
        d="M46 14h68a6 6 0 0 1 6 6v86H40V20a6 6 0 0 1 6-6zm2 8v76h64V22z"
        fillRule="evenodd"
        fill="currentColor"
        fillOpacity=".4"
      />
      <rect x="48" y="22" width="64" height="76" fill="currentColor" fillOpacity=".16" />
      <rect x="56" y="30" width="48" height="26" rx="2" fill="currentColor" fillOpacity=".16" />
      <circle cx="102" cy="72" r="4" fill="currentColor" fillOpacity=".5" />
      <rect x="78" y="56" width="4" height="10" fill="currentColor" fillOpacity=".5" />
      <rect x="62" y="64" width="36" height="24" rx="3" fill="currentColor" fillOpacity=".5" />
      <path
        d="M80 67a9 9 0 1 1 0 18 9 9 0 0 1 0-18zm-5 7.5h10v3H75z"
        fillRule="evenodd"
        fill="var(--hn-status-warn)"
      />
    </Frame>
  );
}
