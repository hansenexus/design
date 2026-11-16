// The example app's one screen: the estate's machine list in the shell, the contract's reference
// (design#148). Pure UI: every value arrives as a prop, every action leaves as a callback.
// Names are an invented estate: no real hostnames, IPs or people in a public repo.
import { Shell, ShellCommandTrigger, ShellNav, type ShellNavItem } from "@hansenexus/shell";
import {
  Badge,
  Button,
  EmptyState,
  type Status,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hansenexus/ui";

export type Machine = {
  name: string;
  role: string;
  status: Status;
  /** CPU load, 0 to 100. */
  load: number;
  /** ISO time of the last heartbeat. */
  seenAt: string;
};

export type MachinesProps = {
  estate: string;
  machines: readonly Machine[];
  /** The time the page is drawn at, for "seen 3 min ago". */
  now: string;
  onPoll: () => void;
  onOpen: (name: string) => void;
  onAdd: () => void;
};

const NAV: ShellNavItem[] = [
  { id: "machines", label: "Machines", href: "#machines" },
  { id: "services", label: "Services", href: "#services" },
  { id: "alerts", label: "Alerts", href: "#alerts" },
  { id: "settings", label: "Settings", href: "#settings" },
];

/** "4 min", "2 h", "3 d": how long ago `then` was at `now`. */
export function ago(then: string, now: string): string {
  const min = Math.max(0, Math.round((Date.parse(now) - Date.parse(then)) / 60_000));
  if (min < 60) return `${min} min`;
  if (min < 60 * 24) return `${Math.round(min / 60)} h`;
  return `${Math.round(min / 60 / 24)} d`;
}

export function MachinesScreen({ estate, machines, now, onPoll, onOpen, onAdd }: MachinesProps) {
  const down = machines.filter((m) => m.status === "crit" || m.status === "warn").length;
  return (
    <Shell
      className="h-dvh"
      commandHotkey={false}
      nav={
        <ShellNav
          items={NAV.map((n) => (n.id === "machines" ? { ...n, trailing: machines.length } : n))}
          activeId="machines"
          brand={<span className="font-hn-display text-base font-semibold">{estate}</span>}
          onNavigate={(_, e) => e.preventDefault()}
        />
      }
      header={
        <>
          <span className="text-[13px] text-hn-ink-muted">{estate} / Machines</span>
          <span className="ml-auto flex items-center gap-2">
            {down ? <Badge tone="accent">{down} need a look</Badge> : null}
            <Button variant="ghost" onClick={onPoll}>
              Poll now
            </Button>
            <ShellCommandTrigger />
          </span>
        </>
      }
      main={
        machines.length === 0 ? (
          <EmptyState
            className="m-auto"
            title="No machines yet"
            description="Install the agent on a machine and it reports in here."
            action={<Button onClick={onAdd}>Add a machine</Button>}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Machine</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Load</TableHead>
                <TableHead className="text-right">Seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machines.map((m) => (
                <TableRow key={m.name} onClick={() => onOpen(m.name)} className="cursor-pointer">
                  <TableCell mono>{m.name}</TableCell>
                  <TableCell muted>{m.role}</TableCell>
                  <TableCell>
                    <StatusBadge status={m.status} />
                  </TableCell>
                  <TableCell mono className="text-right">
                    {m.load}%
                  </TableCell>
                  <TableCell muted className="text-right">
                    {ago(m.seenAt, now)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      }
    />
  );
}
