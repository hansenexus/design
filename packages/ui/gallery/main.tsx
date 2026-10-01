// The kit gallery: every primitive in its board states, plus one scene per overlay, and the
// variant votes (vote.tsx).
// Screenshot baselines are taken from this page (screenshots/kit.spec.ts), with ?bare=1 so the
// scene nav stays out of the frame.
// Names are an invented estate: no real hostnames, IPs or people in a public repo.

import { CATEGORIES } from "virtual:variants";
import { NotFoundIllustration } from "@hansenexus/illustrations/404";
import { EmptyIllustration } from "@hansenexus/illustrations/empty";
import { ErrorIllustration } from "@hansenexus/illustrations/error";
import { MaintenanceIllustration } from "@hansenexus/illustrations/maintenance";
import { NoPermissionIllustration } from "@hansenexus/illustrations/no-permission";
import { NoResultsIllustration } from "@hansenexus/illustrations/no-results";
import { OfflineIllustration } from "@hansenexus/illustrations/offline";
import { SuccessIllustration } from "@hansenexus/illustrations/success";
import { type ComponentType, Fragment, type ReactNode, StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  Avatar,
  Badge,
  Banner,
  BRAND_VARIANTS,
  type BrandVariant,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardSkeleton,
  CardTitle,
  Checkbox,
  cx,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  ErrorState,
  Field,
  FormAlert,
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
  RadioGroup,
  RadioGroupItem,
  RailItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
  SkeletonGroup,
  Sparkline,
  Spinner,
  SpinnerGlyph,
  STATE_COPY,
  STATUSES,
  type StateLocale,
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
  Textarea,
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
  useDelayedVisibility,
} from "../src";
import { Data } from "./data";
import { Bell, Check, Key, MapIcon, More, Restart, Server } from "./icons";
import { ItemPage, isItem } from "./item";
import { itemsByLevel, type Level } from "./levels";
import { Motion } from "./motion-scene";
import { Navigation } from "./navigation";
import { Overlays } from "./overlays";
import { BareContext, PreviewCard, ViewProvider, ViewToolbar } from "./preview";
import { ShellScene } from "./shell";
import {
  frameQuery,
  itemHref,
  type LoopStatus,
  motionTokens,
  motionVariables,
  readView,
  SCENES,
  type Scene,
  sceneHref,
  type View,
  viewAttributes,
  writeView,
} from "./view";
import { Vote } from "./vote";

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
function MachineSkeleton({ surface }: { surface: string }) {
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
 * The loading scene: Skeleton in every shape on every surface, and the Spinner, as preview cards
 * (replay shows the Spinner's 200 ms delay again). Screenshots disable animation, so the skeleton
 * shows its base colour and the ring its start angle.
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
        <PreviewCard title="Skeleton on each surface" item="skeleton" wide>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SURFACES.map(([name, surface]) => (
              <div key={name} className="flex flex-col gap-2">
                <span className="font-hn-mono text-xs text-hn-ink-muted">{name}</span>
                <MachineSkeleton surface={surface} />
              </div>
            ))}
          </div>
        </PreviewCard>
        <PreviewCard title="Skeleton shapes: block, text, circle" item="skeleton">
          <div className="flex items-start gap-4 rounded-hn-lg bg-hn-surface-card p-4">
            <Skeleton width={96} height={72} />
            <Skeleton shape="text" lines={3} className="flex-1 text-sm" />
            <Skeleton shape="circle" width={40} />
          </div>
        </PreviewCard>
        <PreviewCard title="Spinner: after 200 ms, at least 400 ms" item="spinner">
          <div className="flex items-center gap-6 rounded-hn-lg bg-hn-surface-card p-4">
            <SpinnerGlyph size={16} />
            <SpinnerGlyph size={24} />
            <Button variant="secondary" disabled>
              <Spinner label="Saving" />
              Saving
            </Button>
          </div>
        </PreviewCard>
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

function Frame({ children }: { children: ReactNode }) {
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
/** The skeleton QueryState shows while loading, held back and held on by the motion timings. */
function DelayedSkeleton() {
  const visible = useDelayedVisibility(true);
  return visible ? <Skeleton shape="text" lines={3} className="text-sm" /> : null;
}

/** The auto-loop's input for each status: QueryState is driven only through its props. */
const LOOP_QUERY: Record<LoopStatus, { query: string[] | undefined; error?: Error }> = {
  loading: { query: undefined },
  empty: { query: [] },
  error: { query: QUAYS, error: FAILURE },
  data: { query: QUAYS },
};

function States() {
  const machines = (query: string[] | undefined, error?: Error, loading?: ReactNode) => (
    <QueryState query={query} error={error} loading={loading} onRetry={() => {}}>
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
          <Frame>
            <EmptyState
              illustration={<EmptyIllustration />}
              titleAs="h3"
              action={<Button>Add a machine</Button>}
            />
          </Frame>
        </Spec>
        <Spec title="EmptyState: no-results (de)">
          <Frame>
            <EmptyState
              variant="no-results"
              locale="de"
              illustration={<NoResultsIllustration />}
              titleAs="h3"
              action={<Button variant="secondary">Filter zurücksetzen</Button>}
            />
          </Frame>
        </Spec>
        <Spec title="ErrorState: production (en)">
          <Frame>
            <ErrorState
              error={FAILURE}
              dev={false}
              onRetry={() => {}}
              illustration={<ErrorIllustration />}
              titleAs="h3"
            />
          </Frame>
        </Spec>
        <Spec title="ErrorState: development (de)">
          <Frame>
            <ErrorState error={FAILURE} dev locale="de" onRetry={() => {}} titleAs="h3" />
          </Frame>
        </Spec>
        <Spec title="Progress: determinate, complete, indeterminate" wide>
          <Frame>
            <div className="flex flex-col gap-5">
              <Progress value={40} label="Upload manifest.tar" showLabel />
              <Progress value={100} label="Backup speicher-db" showLabel />
              <Progress locale="de" showLabel valueText="unbekannte Dauer" />
            </div>
          </Frame>
        </Spec>
        <PreviewCard
          title="QueryState: loading, empty, data, error"
          item="query-state"
          wide
          loop={(status) => (
            <div className="max-w-sm" data-loop={status}>
              <Frame>
                {machines(LOOP_QUERY[status].query, LOOP_QUERY[status].error, <DelayedSkeleton />)}
              </Frame>
            </div>
          )}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Frame>{machines(undefined)}</Frame>
            <Frame>{machines([])}</Frame>
            <Frame>{machines(QUAYS)}</Frame>
            <Frame>{machines(QUAYS, FAILURE)}</Frame>
          </div>
        </PreviewCard>
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

type FormPhase = "idle" | "invalid" | "pending" | "server-error";

/** The form scene's own copy; the state messages come from STATE_COPY.form. */
const MACHINE_FORM: Record<
  StateLocale,
  {
    name: string;
    nameHelp: string;
    nameTaken: string;
    env: string;
    envs: [string, string][];
    envMissing: string;
    notes: string;
    notesHelp: string;
    page: string;
    confirm: string;
    confirmMissing: string;
    save: string;
    cancel: string;
  }
> = {
  en: {
    name: "Machine name",
    nameHelp: "Lowercase letters, digits and dashes.",
    nameTaken: "kran-01 already exists. Pick another name.",
    env: "Environment",
    envs: [
      ["production", "Production"],
      ["staging", "Staging"],
      ["lab", "Lab"],
    ],
    envMissing: "Choose an environment.",
    notes: "Notes",
    notesHelp: "Shown on the machine card.",
    page: "Page on-call when it goes offline",
    confirm: "The agent may restart services on this machine",
    confirmMissing: "Needed before the agent can be enrolled.",
    save: "Add machine",
    cancel: "Cancel",
  },
  de: {
    name: "Maschinenname",
    nameHelp: "Kleinbuchstaben, Ziffern und Bindestriche.",
    nameTaken: "kran-01 gibt es schon. Bitte einen anderen Namen wählen.",
    env: "Umgebung",
    envs: [
      ["production", "Produktion"],
      ["staging", "Staging"],
      ["lab", "Labor"],
    ],
    envMissing: "Bitte eine Umgebung wählen.",
    notes: "Notizen",
    notesHelp: "Erscheint auf der Maschinenkarte.",
    page: "Bereitschaft alarmieren, wenn sie offline geht",
    confirm: "Der Agent darf Dienste auf dieser Maschine neu starten",
    confirmMissing: "Nötig, bevor der Agent eingebunden wird.",
    save: "Maschine anlegen",
    cancel: "Abbrechen",
  },
};

/**
 * One form in one phase. Pending disables the whole fieldset (every control, labels dimmed) and
 * marks the form aria-busy; the button keeps its width and shows the delayed Spinner. Errors
 * render only after a submit: field errors plus a summary, or the server's refusal with the
 * entered values kept.
 */
function MachineForm({ phase, locale }: { phase: FormPhase; locale: StateLocale }) {
  const t = MACHINE_FORM[locale];
  const invalid = phase === "invalid";
  const pending = phase === "pending";
  const filled = phase !== "idle";
  return (
    <form
      noValidate
      aria-busy={pending || undefined}
      aria-label={t.save}
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-col gap-5"
    >
      {invalid ? <FormAlert kind="invalid" locale={locale} /> : null}
      {phase === "server-error" ? <FormAlert kind="server-error" locale={locale} /> : null}
      <fieldset disabled={pending} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
        <Field label={t.name} help={t.nameHelp} error={invalid ? t.nameTaken : undefined} required>
          <Input mono defaultValue={filled ? (invalid ? "kran-01" : "kran-04") : ""} />
        </Field>
        <Field label={t.env} error={invalid ? t.envMissing : undefined} required>
          <RadioGroup
            orientation="horizontal"
            defaultValue={filled && !invalid ? "staging" : undefined}
          >
            {t.envs.map(([value, label]) => (
              <RadioGroupItem key={value} value={value} label={label} />
            ))}
          </RadioGroup>
        </Field>
        <Field label={t.notes} help={t.notesHelp}>
          <Textarea rows={3} defaultValue={filled ? "Quay 4, crane controller." : ""} />
        </Field>
        <div className="flex flex-col gap-1">
          <Field label={t.page} layout="inline">
            <Checkbox defaultChecked={filled} />
          </Field>
          <Field
            label={t.confirm}
            layout="inline"
            error={invalid ? t.confirmMissing : undefined}
            required
          >
            <Checkbox defaultChecked={filled && !invalid} />
          </Field>
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-2.5">
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner label={STATE_COPY[locale].form.pending} /> : null}
          {pending ? STATE_COPY[locale].form.pending : t.save}
        </Button>
        <Button variant="ghost" disabled={pending}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}

const FORM_PHASES: [FormPhase, StateLocale][] = [
  ["idle", "en"],
  ["invalid", "de"],
  ["pending", "en"],
  ["server-error", "de"],
];

/**
 * The forms scene: one form in idle, invalid, pending and server-error, German and English, and
 * the controls in each of their own states.
 */
function Forms() {
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-10 sm:px-10">
      <header className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-hn-ink-muted">@hansenexus/ui</span>
        <h1 className="m-0 font-hn-display text-[32px] leading-tight font-semibold tracking-[-0.02em] sm:text-[44px]">
          Forms
        </h1>
      </header>
      <div className="grid gap-x-8 gap-y-10 lg:grid-cols-2">
        {FORM_PHASES.map(([phase, locale]) => (
          <Spec key={phase} title={`${phase} (${locale})`}>
            <div data-phase={phase}>
              <Frame>
                <MachineForm phase={phase} locale={locale} />
              </Frame>
            </div>
          </Spec>
        ))}
        <Spec title="Checkbox: off, on, indeterminate, disabled, invalid">
          <Frame>
            <div className="flex flex-col">
              <Checkbox label="Drain first" />
              <Checkbox label="Drain first" defaultChecked />
              <Checkbox label="All quays" checked="indeterminate" />
              <Checkbox label="Drain first (offline)" disabled defaultChecked />
              <Checkbox label="Accept the maintenance window" aria-invalid />
            </div>
          </Frame>
        </Spec>
        <Spec title="RadioGroup, Textarea: disabled item, invalid, read-only">
          <Frame>
            <div className="flex flex-col gap-4">
              <RadioGroup defaultValue="compact" aria-label="Density">
                <RadioGroupItem value="compact" label="Compact" />
                <RadioGroupItem value="comfortable" label="Comfortable" />
                <RadioGroupItem value="touch" label="Touch (not on this device)" disabled />
              </RadioGroup>
              <RadioGroup orientation="horizontal" aria-label="Region" aria-invalid>
                <RadioGroupItem value="north" label="North quay" />
                <RadioGroupItem value="south" label="South quay" />
              </RadioGroup>
              <Textarea aria-label="Manifest" mono readOnly rows={2} defaultValue="replicas: 2" />
            </div>
          </Frame>
        </Spec>
      </div>
    </main>
  );
}

/**
 * The layout scene: Card (with CardSkeleton, disabled, pending, empty), Alert in every tone and
 * the Banner, Avatar (image, initials, loading), Separator and Accordion, German and English.
 */
function Layout() {
  return (
    <main className="flex flex-col">
      <Banner tone="warning" dismissible action={<Button variant="secondary">View window</Button>}>
        Maintenance on quay 3 tonight, 22:00 to 23:00. kran-01 and kran-02 pause.
      </Banner>
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-4 py-10 sm:px-10">
        <header className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-hn-ink-muted">@hansenexus/ui</span>
          <h1 className="m-0 font-hn-display text-[32px] leading-tight font-semibold tracking-[-0.02em] sm:text-[44px]">
            Layout
          </h1>
        </header>
        <div className="grid gap-x-8 gap-y-10 lg:grid-cols-2">
          <Spec title="Card: header, body, footer">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar name="kran 01" size="sm" />
                  <CardTitle>kran-01</CardTitle>
                  <StatusBadge status="ok" className="ml-auto" />
                </div>
                <CardDescription>Quay 3, crane controller, agent 2.14</CardDescription>
              </CardHeader>
              <CardBody>
                <Meter label="Memory" value={64} />
              </CardBody>
              <CardFooter>
                <Button variant="ghost">Logs</Button>
                <Button variant="secondary">Poll now</Button>
              </CardFooter>
            </Card>
          </Spec>
          <Spec title="CardSkeleton (de)">
            <CardSkeleton avatar media footer locale="de" />
          </Spec>
          <Spec title="Card: pending, disabled, raised">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card pending>
                <CardHeader>
                  <CardTitle>pegel</CardTitle>
                  <CardDescription>Restarting</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button variant="secondary" disabled>
                    <Spinner label="Restarting" />
                    Restart
                  </Button>
                </CardFooter>
              </Card>
              <Card disabled>
                <CardHeader>
                  <CardTitle>speicher-db</CardTitle>
                  <CardDescription>Offline</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button variant="secondary">Restart</Button>
                </CardFooter>
              </Card>
              <Card surface="raised">
                <CardHeader>
                  <CardTitle>lotsen-api</CardTitle>
                  <CardDescription>surface.raised</CardDescription>
                </CardHeader>
                <CardBody className="text-[13px]">2 replicas</CardBody>
              </Card>
            </div>
          </Spec>
          <Spec title="Card: empty, error">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <EmptyState titleAs="h3" className="py-6" action={<Button>Add a machine</Button>} />
              </Card>
              <Card>
                <ErrorState
                  titleAs="h3"
                  locale="de"
                  className="py-6"
                  onRetry={() => {}}
                  dev={false}
                  digest="2961537040"
                />
              </Card>
            </div>
          </Spec>
          <Spec title="Alert: info, success, warning, critical (en)" wide>
            <div className="grid gap-3 lg:grid-cols-2">
              <Alert tone="info" title="New agent version">
                2.15 rolls out to every quay over the next hour.
              </Alert>
              <Alert tone="success" title="Backup finished" dismissible>
                speicher-db, 4.2 GB, verified.
              </Alert>
              <Alert tone="warning" title="Disk at 88 %">
                pegel has room for about two days of logs.
              </Alert>
              <Alert
                tone="critical"
                title="Scale refused"
                dismissible
                action={<Button variant="secondary">View audit</Button>}
              >
                deny layer: role. Nothing changed.
              </Alert>
            </div>
          </Spec>
          <Spec title="Alert (de)" wide>
            <div className="grid gap-3 lg:grid-cols-2">
              <Alert tone="info" locale="de" dismissible>
                Neue Agent-Version wird ausgerollt.
              </Alert>
              <Alert tone="critical" locale="de" title="Verbindung verloren" dismissible>
                kran-02 meldet sich seit 5 Minuten nicht.
              </Alert>
            </div>
          </Spec>
          <Spec title="Avatar: sizes, image, initials, loading">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name="hansenexus" src="./dist/brand/apple-touch-icon.png" size="lg" />
              <Avatar name="Ada Lovelace" size="lg" />
              <Avatar name="Grace Hopper" />
              <Avatar name="ops" size="sm" />
              <Avatar name="Ada Lovelace" size="lg" loading />
              <Avatar name="Grace Hopper" loading locale="de" />
            </div>
          </Spec>
          <Spec title="Separator: subtle, strong, vertical">
            <div className="flex flex-col gap-3 text-sm text-hn-ink-body">
              <span>Machines</span>
              <Separator />
              <span>Map</span>
              <Separator tone="strong" decorative={false} />
              <div className="flex h-6 items-center gap-3">
                <span>12 up</span>
                <Separator orientation="vertical" />
                <span>1 down</span>
                <Separator orientation="vertical" />
                <span>2 off</span>
              </div>
            </div>
          </Spec>
          <Spec title="Accordion: open, closed, disabled, empty" wide>
            <Accordion type="multiple" defaultValue={["pods", "volumes"]}>
              <AccordionItem value="pods">
                <AccordionTrigger meta="3 pods">speicher-web</AccordionTrigger>
                <AccordionContent>
                  <ul className="m-0 flex list-none flex-col gap-1.5 p-0 font-hn-mono text-[13px]">
                    <li>speicher-web-7f3a</li>
                    <li>speicher-web-51c0</li>
                    <li>speicher-web-22ab</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="volumes">
                <AccordionTrigger meta="0">Volumes</AccordionTrigger>
                <AccordionContent locale="de" />
              </AccordionItem>
              <AccordionItem value="events">
                <AccordionTrigger>Events</AccordionTrigger>
                <AccordionContent>Scaled to 3, 15:12.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="secrets" disabled>
                <AccordionTrigger meta="no permission">Secrets</AccordionTrigger>
                <AccordionContent>hidden</AccordionContent>
              </AccordionItem>
            </Accordion>
          </Spec>
        </div>
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
    case "forms":
      return <Forms />;
    case "layout":
      return <Layout />;
    case "data":
      return <Data />;
    case "overlays":
      return <Overlays />;
    case "navigation":
      return <Navigation />;
    case "motion":
      return <Motion />;
    case "shell":
      return <ShellScene />;
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

/**
 * The top bar on every scene: one plain link per entry of SCENES, relative so the site works
 * behind any path (kit is ./, the rest ?scene=<name>), carrying the current view along. Wraps
 * onto more rows at phone width. It sits above the overlays' z-50 and takes pointer events back
 * from the body, so the modal dialog and select scenes can still be left by a click.
 */
function SceneNav({ current, view }: { current: Scene | null; view: View }) {
  return (
    <nav
      aria-label="Gallery scenes"
      className="pointer-events-auto relative z-[60] flex flex-wrap items-baseline gap-x-4 gap-y-1.5 border-b border-hn-line-subtle bg-hn-surface-band px-4 py-3 text-sm sm:px-10"
    >
      {SCENES.map((s) => (
        <a
          key={s}
          href={sceneHref(s, view)}
          aria-current={s === current ? "page" : undefined}
          className="text-hn-ink-primary aria-[current=page]:font-semibold"
        >
          {s}
        </a>
      ))}
    </nav>
  );
}

/** Open variant votes whose category sits at this level, e.g. the shell-layout templates (#63). */
const openVotes = (level: Level) => CATEGORIES.filter((c) => c.spec.level === level && !c.decision);

/**
 * The registry by atomic level (#58), lowest first: one row per level, each item linking to its
 * page with its blast radius (#59), plus the open votes at that level (#63). Collapsed by default
 * so the scene stays in view; the summary counts them.
 */
function LevelNav({ view }: { view: View }) {
  const groups = itemsByLevel();
  return (
    <nav
      aria-label="Items by level"
      className="pointer-events-auto relative z-[60] border-b border-hn-line-subtle bg-hn-surface-band px-4 py-2 text-[13px] sm:px-10"
    >
      <details>
        <summary className="cursor-pointer text-hn-ink-muted">
          Items by level:{" "}
          {groups
            .map(([level, items]) => {
              const votes = openVotes(level).length;
              return `${items.length} ${level}s${votes ? ` (${votes} open vote)` : ""}`;
            })
            .join(", ")}
        </summary>
        <dl className="m-0 mt-2 grid gap-y-2 sm:grid-cols-[8rem_1fr]">
          {groups.map(([level, items]) => (
            <Fragment key={level}>
              <dt className="font-hn-mono text-hn-ink-muted">{level}s</dt>
              <dd className="m-0 flex flex-wrap gap-x-3 gap-y-1">
                {openVotes(level).map((c) => (
                  <a
                    key={c.id}
                    href={`?${writeView(new URLSearchParams({ scene: "vote", category: c.id }), view)}`}
                    title={`${c.spec.title}: open vote`}
                    className="text-hn-ink-primary"
                  >
                    {c.spec.title} (vote)
                  </a>
                ))}
                {items.length ? (
                  items.map((item) => (
                    <a
                      key={item.name}
                      href={itemHref(item.name, view)}
                      aria-current={item.name === itemParam ? "page" : undefined}
                      title={`${item.name}: what it uses and what uses it`}
                      className="text-hn-ink-primary aria-[current=page]:font-semibold"
                    >
                      {item.title}
                    </a>
                  ))
                ) : openVotes(level).length ? null : (
                  <span className="text-hn-ink-muted">none yet</span>
                )}
              </dd>
            </Fragment>
          ))}
        </dl>
      </details>
    </nav>
  );
}

/**
 * Sets data-theme, data-mode, data-density and data-reduced-motion on <html>, where
 * @hansenexus/tokens reads them (the last one for motion-reduce:, #91), and
 * the motion variables scaled by speed and motion (#60) inline on it, where they win over the
 * theme's own values. CSS reads the variables; TS timers get the same scale from ViewProvider.
 */
function applyView(view: View) {
  const html = document.documentElement;
  for (const [key, value] of Object.entries(viewAttributes(view))) {
    if (value === null) delete html.dataset[key];
    else html.dataset[key] = value;
  }
  const motion = motionVariables(view);
  for (const [name] of motionTokens()) {
    const value = motion[name];
    if (value === undefined) html.style.removeProperty(name);
    else html.style.setProperty(name, value);
  }
}

const query = new URLSearchParams(location.search);
const param = query.get("scene");
const scene: Scene = SCENES.includes(param as Scene) ? (param as Scene) : "kit";
// ?item=<name> shows that registry item's page with its "used by" list (#59) instead of a scene.
const itemQuery = query.get("item");
const itemParam = isItem(itemQuery) ? itemQuery : null;
// ?bare=1 drops the nav, the toolbar and the card actions: the screenshot baselines
// (screenshots/kit.spec.ts) frame the scene alone. ?frame=1, the viewport iframe, drops only the
// nav and toolbar, since it renders inside the outer page's chrome.
const bare = query.get("bare") === "1";
const framed = bare || query.get("frame") === "1";
applyView(readView(query));

/**
 * The page: nav, view toolbar and the scene. A toolbar change updates <html> and the query in
 * place, so every card re-renders without a reload. A fixed viewport renders the scene in an
 * iframe of that width, where the scene's own breakpoints apply.
 */
/** The item page when ?item= names a registry item, the scene otherwise. */
function Page() {
  return itemParam ? <ItemPage name={itemParam} /> : <Scenes scene={scene} />;
}

function Gallery() {
  const [view, setView] = useState(() => readView(query));
  const change = (next: View) => {
    applyView(next);
    const q = writeView(new URLSearchParams(location.search), next).toString();
    history.replaceState(null, "", q ? `?${q}` : location.pathname);
    setView(next);
  };
  return (
    <ViewProvider view={view}>
      <SceneNav current={itemParam ? null : scene} view={view} />
      <LevelNav view={view} />
      <ViewToolbar view={view} onChange={change} />
      {view.viewport === "auto" ? (
        <Page />
      ) : (
        <div className="overflow-x-auto bg-hn-surface-band p-4 sm:p-6">
          <iframe
            title={`${itemParam ?? scene} at ${view.viewport} px`}
            src={`?${frameQuery(new URLSearchParams(location.search), view)}`}
            width={Number(view.viewport)}
            className="mx-auto block h-[calc(100vh-10rem)] min-h-[480px] border border-hn-line-strong bg-hn-surface-page"
          />
        </div>
      )}
    </ViewProvider>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <BareContext.Provider value={bare}>
        {framed ? (
          <ViewProvider view={readView(query)}>
            <Page />
          </ViewProvider>
        ) : (
          <Gallery />
        )}
      </BareContext.Provider>
    </StrictMode>
  );
}
