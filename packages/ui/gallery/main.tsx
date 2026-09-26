// The kit gallery: every primitive in its board states, plus one scene per overlay.
// Screenshot baselines are taken from this page (screenshots/kit.spec.ts).
// Names are an invented estate: no real hostnames, IPs or people in a public repo.
import { type ReactNode, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Kbd,
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuShortcut,
  MenuTrigger,
  Meter,
  RailItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sparkline,
  STATUSES,
  StatusBadge,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Toast,
  ToastAction,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../src";
import { Bell, Check, Key, MapIcon, More, Restart, Server } from "./icons";

export const SCENES = ["kit", "dialog", "menu", "select", "tooltip", "toast"] as const;
type Scene = (typeof SCENES)[number];

function Spec({
  title,
  children,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <section className={wide ? "flex flex-col gap-3.5 lg:col-span-2" : "flex flex-col gap-3.5"}>
      <h2 className="m-0 font-hn-mono text-[13px] font-medium text-hn-ink-muted">{title}</h2>
      {children}
    </section>
  );
}

const AUDIT = [
  {
    time: "15:12:04",
    status: "ok",
    label: "Completed",
    act: "restart-deployment speicher-web",
    who: "ops",
    ticket: "tk_7f3a",
    note: "desktop, sudo",
  },
  {
    time: "13:51:40",
    status: "crit",
    label: "Refused",
    act: "scale-deployment lotsen-api",
    who: "agent",
    ticket: "tk_51c0",
    note: "deny layer: role",
  },
  {
    time: "11:20:13",
    status: "busy",
    label: "In flight",
    act: "queue-dispatch issue-1850",
    who: "ops",
    ticket: "tk_22ab",
    note: "board, fleet",
  },
  {
    time: "09:02:55",
    status: "off",
    label: "Skipped",
    act: "restart-deployment pegel",
    who: "ops",
    ticket: "tk_09f1",
    note: "host offline",
  },
] as const;

function Kit() {
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-10 sm:px-10">
      <header className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-hn-ink-muted">@hansenexus/ui</span>
        <h1 className="m-0 font-hn-display text-[32px] leading-tight font-semibold tracking-[-0.02em] sm:text-[44px]">
          Components built only from semantic tokens
        </h1>
      </header>
      <div className="grid grid-cols-1 gap-x-10 gap-y-11 lg:grid-cols-3">
        <Spec title="Button" wide>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button>
              <Check />
              Approve
            </Button>
            <Button variant="secondary">
              <Restart />
              Poll now
            </Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="danger">Scale to 2</Button>
            <Button size="lg">
              <Key />
              Approve
            </Button>
            <Button variant="secondary" disabled>
              Disabled
            </Button>
          </div>
        </Spec>
        <Spec title="Switch">
          <div className="flex flex-col items-start gap-1">
            <Switch label="Motion" defaultChecked />
            <Switch label="Motion off" />
          </div>
        </Spec>
        <Spec title="StatusBadge" wide>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
          </div>
        </Spec>
        <Spec title="Meter + Sparkline">
          <div className="flex flex-col gap-3">
            <Meter label="Memory" value={88} tone="warn" />
            <Meter label="CPU" value={21} />
            <Sparkline
              values={[30, 33, 41, 38, 35, 31, 36, 34, 37, 40]}
              width={300}
              height={40}
              label="Requests per minute, last 10 minutes, rising"
            />
          </div>
        </Spec>
        <Spec title="Badge, Kbd">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge>3 pods</Badge>
            <Badge tone="accent">new</Badge>
            <Kbd>⌘K</Kbd>
            <Kbd>esc</Kbd>
            <Kbd>Enter</Kbd>
          </div>
        </Spec>
        <Spec title="Input, Select">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5 text-[13px] text-hn-ink-muted">
              <label htmlFor="kit-confirm">
                Type <span className="font-hn-mono text-hn-ink-primary">speicher-web</span> to
                confirm
              </label>
              <Input id="kit-confirm" mono defaultValue="speicher-we" />
            </div>
            <Input placeholder="Search machines" aria-label="Search machines" />
            <Input aria-label="Replicas" aria-invalid defaultValue="-1" />
            <Select defaultValue="compact">
              <SelectTrigger aria-label="Density">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="touch">Touch</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Spec>
        <Spec title="RailItem">
          <nav aria-label="Rail states" className="flex w-full max-w-[240px] flex-col gap-2">
            <RailItem href="#machines" icon={<Server />} trailing="rest">
              Machines
            </RailItem>
            <RailItem href="#map" icon={<MapIcon />} active trailing="active">
              Map
            </RailItem>
            <RailItem href="#alerts" icon={<Bell />} trailing="2">
              Alerts
            </RailItem>
          </nav>
        </Spec>
        <Spec title="Tabs" wide>
          <Tabs defaultValue="grid">
            <TabsList aria-label="Estate view">
              <TabsTrigger value="map">Map</TabsTrigger>
              <TabsTrigger value="grid">Grid</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
            </TabsList>
            <TabsContent value="map">The harbour map.</TabsContent>
            <TabsContent value="grid" className="text-sm text-hn-ink-body">
              Machines as cards, grouped by quay.
            </TabsContent>
            <TabsContent value="list">Every machine in one table.</TabsContent>
          </Tabs>
        </Spec>
        <Spec title="Table" wide>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Act</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Ticket</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {AUDIT.map((r) => (
                <TableRow key={r.ticket}>
                  <TableCell mono muted>
                    {r.time}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status}>{r.label}</StatusBadge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{r.act}</TableCell>
                  <TableCell mono className="text-hn-ink-body">
                    {r.who}
                  </TableCell>
                  <TableCell mono muted>
                    {r.ticket}
                  </TableCell>
                  <TableCell muted className="text-[12.5px] whitespace-nowrap">
                    {r.note}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Spec>
      </div>
    </main>
  );
}

/** An overlay scene: the trigger sits top-left so the popup has room below it. */
function Stage({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-[520px] flex-col items-start gap-4 p-6 sm:p-10">{children}</main>
  );
}

function Scenes({ scene }: { scene: Scene }) {
  switch (scene) {
    case "kit":
      return <Kit />;
    case "dialog":
      return (
        <Stage>
          <Dialog open>
            <DialogContent
              aria-describedby="confirm-desc"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle>Scale speicher-web to 2 replicas</DialogTitle>
                <DialogDescription id="confirm-desc">
                  k8s, scale-deployment, namespace <span className="font-hn-mono">harbour</span>.
                  Ticket <span className="font-hn-mono">tk_51c1</span>, valid 60 s.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-1.5 text-[13px] text-hn-ink-muted">
                <label htmlFor="dialog-confirm">
                  Type <span className="font-hn-mono text-hn-ink-primary">speicher-web</span> to
                  confirm
                </label>
                <Input id="dialog-confirm" mono defaultValue="speicher-web" />
              </div>
              <DialogFooter>
                <Button variant="ghost">Cancel</Button>
                <Button variant="danger">Scale to 2</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Stage>
      );
    case "menu":
      return (
        <Stage>
          <Menu open modal={false}>
            <MenuTrigger asChild>
              <Button variant="secondary" aria-label="Machine actions">
                <More />
              </Button>
            </MenuTrigger>
            <MenuContent align="start">
              <MenuLabel>kran-01</MenuLabel>
              <MenuItem>
                Open terminal
                <MenuShortcut>⌘T</MenuShortcut>
              </MenuItem>
              <MenuItem>Poll now</MenuItem>
              <MenuItem disabled>Drain (offline)</MenuItem>
              <MenuSeparator />
              <MenuItem variant="danger">Restart machine</MenuItem>
            </MenuContent>
          </Menu>
        </Stage>
      );
    case "select":
      return (
        <Stage>
          <div className="w-60">
            <Select open defaultValue="comfortable">
              <SelectTrigger aria-label="Density">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="touch">Touch</SelectItem>
                <SelectItem value="custom" disabled>
                  Custom
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Stage>
      );
    case "tooltip":
      return (
        <Stage>
          <TooltipProvider>
            <Tooltip open>
              <TooltipTrigger asChild>
                <Button variant="secondary">
                  <Restart />
                  Poll now
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start">
                Ask every agent for a fresh report
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Stage>
      );
    case "toast":
      return (
        <ToastProvider>
          <Stage>
            <span className="text-sm text-hn-ink-muted">Toasts stack bottom right.</span>
          </Stage>
          <Toast open duration={Number.POSITIVE_INFINITY} status="ok">
            <ToastTitle>speicher-web restarted</ToastTitle>
            <ToastDescription>Rollout finished in 42 s. Ticket tk_7f3a.</ToastDescription>
          </Toast>
          <Toast open duration={Number.POSITIVE_INFINITY} status="crit">
            <ToastTitle>Scale refused</ToastTitle>
            <ToastDescription>deny layer: role. Nothing changed.</ToastDescription>
            <ToastAction altText="View the audit entry">View audit</ToastAction>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      );
  }
}

const param = new URLSearchParams(location.search).get("scene");
const scene: Scene = SCENES.includes(param as Scene) ? (param as Scene) : "kit";
const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Scenes scene={scene} />
    </StrictMode>
  );
}
