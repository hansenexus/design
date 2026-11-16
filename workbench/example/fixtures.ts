// The example app's fixtures (design#148): a full estate of 36 machines and a new, empty one.
// Deterministic: every time derives from ctx.now, every value from the index, nothing random.
// Names are an invented estate: no real hostnames, IPs or people in a public repo.
import type { Status } from "@hansenexus/ui";
import type { FixtureContext } from "@hansenexus/ui/workbench";
import type { Machine, MachinesProps } from "./machines";

const SITES = ["kran", "lotsen", "elbe", "deich", "werft", "hafen"] as const;
const ROLES = ["api", "worker", "db", "cache", "edge", "build"] as const;
/** Mostly healthy, as an estate is; a few that need a look. */
const STATUS_AT: Partial<Record<number, Status>> = {
  3: "warn",
  8: "busy",
  14: "crit",
  21: "off",
  27: "warn",
  33: "unknown",
};

export function estate(count: number, ctx: FixtureContext): Machine[] {
  return Array.from({ length: count }, (_, i) => {
    const site = SITES[i % SITES.length] ?? "kran";
    const role = ROLES[Math.floor(i / SITES.length) % ROLES.length] ?? "api";
    const status = STATUS_AT[i] ?? "ok";
    const minutesAgo = status === "off" ? 60 * 26 : status === "unknown" ? 47 : (i * 7) % 5;
    return {
      name: `${site}-${role}-${String(Math.floor(i / 12) + 1).padStart(2, "0")}`,
      role,
      status,
      load: status === "off" ? 0 : (i * 37 + 11) % 97,
      seenAt: new Date(ctx.now.getTime() - minutesAgo * 60_000).toISOString(),
    };
  });
}

export function machinesFixture(count: number, ctx: FixtureContext): MachinesProps {
  return {
    estate: "Elbhafen",
    machines: estate(count, ctx),
    now: ctx.now.toISOString(),
    onPoll: ctx.action("poll"),
    onOpen: ctx.action("open"),
    onAdd: ctx.action("add"),
  };
}
