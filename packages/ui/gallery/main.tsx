// The kit gallery: every primitive in its board states, plus one scene per overlay, and the
// variant votes (vote.tsx).
// Screenshot baselines are taken from this page (screenshots/kit.spec.ts).
// Names are an invented estate: no real hostnames, IPs or people in a public repo.

import { NotFoundIllustration } from "@hansenexus/illustrations/404";
import { EmptyIllustration } from "@hansenexus/illustrations/empty";
import { ErrorIllustration } from "@hansenexus/illustrations/error";
import { MaintenanceIllustration } from "@hansenexus/illustrations/maintenance";
import { NoPermissionIllustration } from "@hansenexus/illustrations/no-permission";
import { NoResultsIllustration } from "@hansenexus/illustrations/no-results";
import { OfflineIllustration } from "@hansenexus/illustrations/offline";
import { SuccessIllustration } from "@hansenexus/illustrations/success";
import { type ComponentType, type ReactNode, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  Badge,
  BRAND_VARIANTS,
  type BrandVariant,
  Button,
  cx,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  ErrorState,
  HansenexusMark,
  HansenexusWordmark,
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
  Progress,
  QueryState,
  RailItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  SkeletonGroup,
  Sparkline,
  Spinner,
  SpinnerGlyph,
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
import { Vote } from "./vote";

export const SCENES = [
  "kit",
  "dialog",
  "menu",
  "select",
  "tooltip",
  "toast",
  "brand",
  "loading",
  "states",
  "illustrations",
  "vote",
] as const;
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

/** The ground each variant is made for; mono follows the page ink. */
const GROUND: Record<BrandVariant, string> = {
  lime: "bg-hn-brand-ink text-hn-brand-paper",
  "lime-deep": "bg-hn-brand-paper text-hn-brand-ink",
  ink: "bg-hn-brand-paper text-hn-brand-ink",
  paper: "bg-hn-brand-ink text-hn-brand-paper",
  mono: "bg-hn-surface-card text-hn-ink-primary",
};

/**
 * The brand scene: mark and wordmark in every variant, the two app icon candidates at 16, 32
 * and 1024 px (the generated PNGs from brand/assets), and the favicon and tray renders.
 */
function Brand() {
  const icon = (kind: string, size: number) => (
    <img
      key={`${kind}-${size}`}
      src={`./dist/brand/app-icon-${kind}-${size}.png`}
      width={size}
      height={size}
      alt={`${kind} ${size} px`}
      className={cx(
        "outline outline-1 outline-hn-line-strong",
        size === 1024 ? "h-auto w-full max-w-[512px]" : "[image-rendering:pixelated]"
      )}
    />
  );
  return (
    <main className="mx-auto flex max-w-[1180px] flex-col gap-8 p-6 sm:p-10">
      <header className="flex flex-col gap-2">
        <h1 className="m-0 font-hn-display text-[28px] font-semibold">Brand</h1>
        <p className="m-0 max-w-[60ch] text-hn-ink-body">
          The mark and the wordmark, flat, in five variants. Lime stands on ink; on light surfaces
          the mark is lime-deep.
        </p>
      </header>
      <Spec title="mark and wordmark, per variant">
        <div className="grid gap-3 sm:grid-cols-2">
          {BRAND_VARIANTS.map((v) => (
            <div
              key={v}
              className={`flex flex-col items-start gap-4 rounded-hn-md border border-hn-line-subtle p-5 ${GROUND[v]}`}
            >
              <span className="font-hn-mono text-[12px]">{v}</span>
              <div className="flex items-end gap-5">
                <HansenexusMark variant={v} size={48} />
                <HansenexusMark variant={v} size={24} />
                <HansenexusMark variant={v} size={12} />
              </div>
              <HansenexusWordmark variant={v} size={32} className="max-w-full" />
              <HansenexusWordmark variant={v} size={16} />
            </div>
          ))}
        </div>
      </Spec>
      <Spec title="app icon: lime on ink (chosen), ink on lime">
        <div className="flex flex-wrap items-end gap-6">
          {["lime-on-ink", "ink-on-lime"].map((kind) => (
            <div key={kind} className="flex flex-col gap-3">
              <span className="font-hn-mono text-[12px] text-hn-ink-muted">{kind}</span>
              <div className="flex items-end gap-4">{[16, 32].map((s) => icon(kind, s))}</div>
              {icon(kind, 1024)}
            </div>
          ))}
        </div>
      </Spec>
      <Spec title="favicon and menu bar template">
        <div className="flex flex-wrap items-center gap-6">
          <img src="./dist/brand/favicon.svg" width={32} height={32} alt="favicon.svg" />
          <img src="./dist/brand/favicon-32.png" width={32} height={32} alt="favicon 32 px" />
          <img
            src="./dist/brand/apple-touch-icon.png"
            width={90}
            height={90}
            alt="apple touch icon"
          />
          <span className="rounded-hn-sm bg-hn-brand-paper p-2">
            <img src="./dist/brand/trayTemplate@2x.png" width={16} height={16} alt="tray" />
          </span>
        </div>
      </Spec>
    </main>
  );
}

const SURFACES = [
  ["surface.page", "bg-hn-surface-page"],
  ["surface.band", "bg-hn-surface-band"],
  ["surface.card", "bg-hn-surface-card"],
  ["surface.raised", "bg-hn-surface-raised"],
] as const;

/** A machine card while its data loads: avatar, title, two lines of copy, a chart block. */
function CardSkeleton({ surface }: { surface: string }) {
  return (
    <SkeletonGroup
      label="Loading kran-01"
      className={cx("flex flex-col gap-3 rounded-hn-lg border border-hn-line-subtle p-4", surface)}
    >
      <div className="flex items-center gap-3">
        <Skeleton shape="circle" width={32} />
        <Skeleton shape="text" width="45%" className="text-base" />
      </div>
      <Skeleton shape="text" lines={2} className="text-sm" />
      <Skeleton height={64} />
    </SkeletonGroup>
  );
}

/**
 * The loading scene: Skeleton in every shape on every surface, and the Spinner. Screenshots
 * disable animation, so the skeleton shows its base colour and the ring its start angle.
 */
function Loading() {
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-10 sm:px-10">
      <header className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-hn-ink-muted">@hansenexus/ui</span>
        <h1 className="m-0 font-hn-display text-[32px] leading-tight font-semibold tracking-[-0.02em] sm:text-[44px]">
          Loading states
        </h1>
      </header>
      <div className="grid gap-x-8 gap-y-10 lg:grid-cols-2">
        <Spec title="Skeleton on each surface" wide>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SURFACES.map(([name, surface]) => (
              <div key={name} className="flex flex-col gap-2">
                <span className="font-hn-mono text-xs text-hn-ink-muted">{name}</span>
                <CardSkeleton surface={surface} />
              </div>
            ))}
          </div>
        </Spec>
        <Spec title="Skeleton shapes: block, text, circle">
          <div className="flex items-start gap-4 rounded-hn-lg bg-hn-surface-card p-4">
            <Skeleton width={96} height={72} />
            <Skeleton shape="text" lines={3} className="flex-1 text-sm" />
            <Skeleton shape="circle" width={40} />
          </div>
        </Spec>
        <Spec title="Spinner: after 200 ms, at least 400 ms">
          <div className="flex items-center gap-6 rounded-hn-lg bg-hn-surface-card p-4">
            <SpinnerGlyph size={16} />
            <SpinnerGlyph size={24} />
            <Button variant="secondary" disabled>
              <Spinner label="Saving" />
              Saving
            </Button>
          </div>
        </Spec>
      </div>
    </main>
  );
}

/** A fixed error, so the development view's stack is the same in every build. */
const FAILURE = Object.assign(new Error("connect ECONNREFUSED speicher-db:5432"), {
  digest: "2961537040",
  stack:
    "Error: connect ECONNREFUSED speicher-db:5432\n    at loadMachines (machines.ts:42:11)\n    at async MachinesPage (page.tsx:12:20)",
});

const QUAYS = ["kran-01", "kran-02", "pegel"];

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-hn-lg border border-hn-line-subtle bg-hn-surface-card p-4">
      {children}
    </div>
  );
}

/**
 * The states scene: EmptyState, ErrorState, Progress and QueryState in each of their states,
 * German and English copy side by side. Screenshots disable animation, so the indeterminate
 * Progress shows the skeleton base colour.
 */
function States() {
  const machines = (query: string[] | undefined, error?: Error) => (
    <QueryState query={query} error={error} onRetry={() => {}}>
      {(rows) => (
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
          {rows.map((r) => (
            <li key={r} className="font-hn-mono text-hn-ink-primary">
              {r}
            </li>
          ))}
        </ul>
      )}
    </QueryState>
  );
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-10 sm:px-10">
      <header className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-hn-ink-muted">@hansenexus/ui</span>
        <h1 className="m-0 font-hn-display text-[32px] leading-tight font-semibold tracking-[-0.02em] sm:text-[44px]">
          Empty, error and progress
        </h1>
      </header>
      <div className="grid gap-x-8 gap-y-10 lg:grid-cols-2">
        <Spec title="EmptyState: empty (en)">
          <Card>
            <EmptyState
              illustration={<EmptyIllustration />}
              titleAs="h3"
              action={<Button>Add a machine</Button>}
            />
          </Card>
        </Spec>
        <Spec title="EmptyState: no-results (de)">
          <Card>
            <EmptyState
              variant="no-results"
              locale="de"
              illustration={<NoResultsIllustration />}
              titleAs="h3"
              action={<Button variant="secondary">Filter zurücksetzen</Button>}
            />
          </Card>
        </Spec>
        <Spec title="ErrorState: production (en)">
          <Card>
            <ErrorState
              error={FAILURE}
              dev={false}
              onRetry={() => {}}
              illustration={<ErrorIllustration />}
              titleAs="h3"
            />
          </Card>
        </Spec>
        <Spec title="ErrorState: development (de)">
          <Card>
            <ErrorState error={FAILURE} dev locale="de" onRetry={() => {}} titleAs="h3" />
          </Card>
        </Spec>
        <Spec title="Progress: determinate, complete, indeterminate" wide>
          <Card>
            <div className="flex flex-col gap-5">
              <Progress value={40} label="Upload manifest.tar" showLabel />
              <Progress value={100} label="Backup speicher-db" showLabel />
              <Progress locale="de" showLabel valueText="unbekannte Dauer" />
            </div>
          </Card>
        </Spec>
        <Spec title="QueryState: loading, empty, data, error" wide>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>{machines(undefined)}</Card>
            <Card>{machines([])}</Card>
            <Card>{machines(QUAYS)}</Card>
            <Card>{machines(QUAYS, FAILURE)}</Card>
          </div>
        </Spec>
      </div>
    </main>
  );
}

/** The eight @hansenexus/illustrations motifs, by import path. */
const MOTIFS: [string, ComponentType<{ width?: number; height?: number }>][] = [
  ["empty", EmptyIllustration],
  ["no-results", NoResultsIllustration],
  ["error", ErrorIllustration],
  ["404", NotFoundIllustration],
  ["offline", OfflineIllustration],
  ["no-permission", NoPermissionIllustration],
  ["success", SuccessIllustration],
  ["maintenance", MaintenanceIllustration],
];

/**
 * The illustrations scene: every motif at its 160 px default and at 48 px, in ink.muted as the
 * EmptyState/ErrorState slot draws it. Colour comes only from currentColor and the tokens.
 */
function Illustrations() {
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-10 sm:px-10">
      <header className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-hn-ink-muted">@hansenexus/illustrations</span>
        <h1 className="m-0 font-hn-display text-[32px] leading-tight font-semibold tracking-[-0.02em] sm:text-[44px]">
          State illustrations
        </h1>
      </header>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {MOTIFS.map(([id, Motif]) => (
          <figure
            key={id}
            data-motif={id}
            className="m-0 flex flex-col items-center gap-3 rounded-hn-lg border border-hn-line-subtle bg-hn-surface-card p-4 text-hn-ink-muted"
          >
            <Motif width={128} height={96} />
            <Motif width={48} height={36} />
            <figcaption className="font-hn-mono text-[13px] text-hn-ink-body">{id}</figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}

function Scenes({ scene }: { scene: Scene }) {
  switch (scene) {
    case "vote":
      return <Vote />;
    case "states":
      return <States />;
    case "illustrations":
      return <Illustrations />;
    case "loading":
      return <Loading />;
    case "brand":
      return <Brand />;
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
