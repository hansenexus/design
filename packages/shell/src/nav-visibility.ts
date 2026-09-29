/**
 * Which nav rows the current context can reach. Promoted from kommandant's app shell
 * (apps/kommandant/src/app-shell/nav-visibility.ts), where the capabilities were fixed to infra,
 * gateway and desktop; here an app names its own.
 *
 * A row is hidden, not disabled, when a capability it needs is off: getting this wrong either
 * hides a working page or offers one that cannot work.
 */

/** What the current context can do, by name: `{ infra: true, gateway: false }`. */
export type Capabilities = Readonly<Record<string, boolean>>;

/** A row is visible when every capability it requires is on. No requirements: always visible. */
export function navVisible(requires: readonly string[] | undefined, capabilities: Capabilities) {
  return (requires ?? []).every((name) => capabilities[name] === true);
}
