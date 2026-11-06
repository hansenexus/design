// school/school: the school. A building with its windows cut out as holes, a roof and a door,
// the flag in the action accent.
import { Frame, type IllustrationProps } from "../frame";

export type { IllustrationProps };

export function SchoolIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <path
        d="M32 52h96v52H32zm10 10v12h12V62zm22 0v12h12V62zm22 0v12h12V62zm22 0v12h12V62zM42 82v12h12V82zm62 0v12h12V82z"
        fillRule="evenodd"
        fill="currentColor"
        fillOpacity=".32"
      />
      <path d="M28 52 80 26l52 26z" fill="currentColor" fillOpacity=".5" />
      <path d="M68 84h24v20H68z" fill="currentColor" fillOpacity=".16" />
      <path d="M72 88h16v16H72z" fill="currentColor" fillOpacity=".5" />
      <rect x="78" y="8" width="4" height="22" fill="currentColor" fillOpacity=".5" />
      <path d="M82 8h22l-6 6 6 6H82z" fill="var(--hn-action-primary)" />
    </Frame>
  );
}
