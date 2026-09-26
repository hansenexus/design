/** Joins class names, dropping falsy parts. Later classes do not override earlier ones by order. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** The one focus treatment: a 2 px focus.ring outline, 2 px off the control. */
export const focusRing =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hn-focus-ring";
