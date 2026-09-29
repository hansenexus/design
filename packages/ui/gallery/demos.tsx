// One small demo per registry item, for the item pages and their "used by" list (#59). Each is
// the item's everyday use, so a card that replays it shows what a change to one of its
// dependencies does there. Overlays stay closed behind their trigger, so a page of cards never
// covers itself; the toast renders in a viewport inside its card.
// tests/graph.test.ts fails when a registry item has no demo here.
// Names are an invented estate: no real hostnames, IPs or people in a public repo.

import { EmptyIllustration } from "@hansenexus/illustrations/empty";
import { type ReactNode, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  Avatar,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Calendar,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Combobox,
  Command,
  cx,
  DataTable,
  type DataTableColumn,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EmptyState,
  ErrorState,
  Field,
  FormAlert,
  focusRing,
  HansenexusMark,
  HansenexusWordmark,
  Input,
  Kbd,
  LAYOUT_COPY,
  Label,
  MARK,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  Meter,
  Pagination,
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
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
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Skeleton,
  Sparkline,
  Spinner,
  STATE_COPY,
  StatusBadge,
  StatusGlyph,
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
import { Bell, More, Restart, Server } from "./icons";
import { useMotionTimings } from "./preview";
import { DemoShell } from "./shell";

const TODAY = new Date(2026, 8, 14);
const HOSTS = ["kran-01", "kran-02", "pegel"];

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-hn-lg border border-hn-line-subtle bg-hn-surface-card p-4">
      {children}
    </div>
  );
}

/** A pending indicator that shows after the delay token and holds for the minimum. */
function DelayedDot() {
  const visible = useDelayedVisibility(true, useMotionTimings());
  return (
    <span className="font-hn-mono text-[13px] text-hn-ink-body">
      {visible ? "pending: shown" : "pending: held back"}
    </span>
  );
}

/** A spinner that shows after its delay, the way a button's pending state renders it. */
function SavingButton() {
  const timings = useMotionTimings();
  return (
    <Button variant="secondary" disabled>
      <Spinner label="Saving" {...timings} />
      Saving
    </Button>
  );
}

type Row = { id: string; host: string; cpu: number };
const ROWS: Row[] = [
  { id: "m1", host: "kran-01", cpu: 21 },
  { id: "m2", host: "kran-02", cpu: 88 },
  { id: "m3", host: "pegel", cpu: 34 },
];
const COLUMNS: DataTableColumn<Row>[] = [
  { id: "host", header: "Host", cell: (r) => r.host, sortValue: (r) => r.host, mono: true },
  { id: "cpu", header: "CPU %", cell: (r) => r.cpu, sortValue: (r) => r.cpu, align: "end" },
];

function LivePager() {
  const [page, setPage] = useState(2);
  return <Pagination page={page} pageCount={8} onPageChange={setPage} />;
}

function hosts(rows: string[]) {
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0 font-hn-mono text-sm text-hn-ink-primary">
      {rows.map((r) => (
        <li key={r}>{r}</li>
      ))}
    </ul>
  );
}

/** The demo of each registry item, by name. */
export const DEMOS: Record<string, () => ReactNode> = {
  tokens: () => (
    <div className="flex flex-wrap gap-2">
      {["bg-hn-surface-page", "bg-hn-surface-card", "bg-hn-surface-raised", "bg-hn-accent"].map(
        (bg) => (
          <span
            key={bg}
            className={`h-10 w-16 rounded-hn-md border border-hn-line-subtle ${bg}`}
            title={bg}
          />
        )
      )}
    </div>
  ),
  cx: () => (
    <button
      type="button"
      className={cx(
        "rounded-hn-md border border-hn-line-strong px-3 py-1.5 text-sm text-hn-ink-primary",
        focusRing
      )}
    >
      Tab here: the shared focus ring
    </button>
  ),
  icons: () => (
    <div className="flex items-center gap-3 text-hn-ink-primary">
      <Server />
      <Bell />
      <Restart />
      <More />
    </div>
  ),
  "status-glyph": () => (
    <div className="flex items-center gap-3">
      {(["ok", "busy", "warn", "crit", "off", "unknown"] as const).map((s) => (
        <StatusGlyph key={s} status={s} />
      ))}
    </div>
  ),
  badge: () => (
    <div className="flex gap-2">
      <Badge>3 pods</Badge>
      <Badge tone="accent">new</Badge>
    </div>
  ),
  button: () => (
    <div className="flex flex-wrap gap-2">
      <Button>Approve</Button>
      <Button variant="secondary">Poll now</Button>
      <Button variant="ghost">Cancel</Button>
      <Button variant="danger">Scale to 2</Button>
    </div>
  ),
  dialog: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">Open dialog</Button>
      </DialogTrigger>
      <DialogContent aria-describedby="demo-dialog-desc">
        <DialogHeader>
          <DialogTitle>Scale speicher-web to 2 replicas</DialogTitle>
          <DialogDescription id="demo-dialog-desc">Ticket tk_51c1, valid 60 s.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="danger">Scale to 2</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  "brand-geometry": () => (
    <svg
      viewBox={`0 0 ${MARK.width} ${MARK.height}`}
      width={64}
      aria-label="MARK polygons"
      className="text-hn-ink-primary"
    >
      {MARK.polygons.map((points) => (
        <polygon key={points} points={points} fill="currentColor" />
      ))}
    </svg>
  ),
  "hansenexus-mark": () => <HansenexusMark size={40} />,
  "hansenexus-wordmark": () => <HansenexusWordmark size={24} className="max-w-full" />,
  input: () => <Input placeholder="Search machines" aria-label="Search machines" />,
  kbd: () => (
    <div className="flex gap-2">
      <Kbd>⌘K</Kbd>
      <Kbd>esc</Kbd>
    </div>
  ),
  menu: () => (
    <Menu modal={false}>
      <MenuTrigger asChild>
        <Button variant="secondary" aria-label="Machine actions">
          <More />
        </Button>
      </MenuTrigger>
      <MenuContent align="start">
        <MenuItem>Open terminal</MenuItem>
        <MenuItem variant="danger">Restart machine</MenuItem>
      </MenuContent>
    </Menu>
  ),
  meter: () => <Meter label="Memory" value={88} tone="warn" />,
  "rail-item": () => (
    <nav aria-label="Rail" className="flex max-w-[240px] flex-col gap-2">
      <RailItem href="#machines" icon={<Server />} active>
        Machines
      </RailItem>
      <RailItem href="#alerts" icon={<Bell />} trailing="2">
        Alerts
      </RailItem>
    </nav>
  ),
  select: () => (
    <Select defaultValue="compact">
      <SelectTrigger aria-label="Density" className="max-w-60">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="compact">Compact</SelectItem>
        <SelectItem value="comfortable">Comfortable</SelectItem>
      </SelectContent>
    </Select>
  ),
  sparkline: () => (
    <Sparkline
      values={[30, 33, 41, 38, 35, 31, 36, 34, 37, 40]}
      width={240}
      height={40}
      label="Requests per minute, rising"
    />
  ),
  "status-badge": () => (
    <div className="flex gap-2">
      <StatusBadge status="ok" />
      <StatusBadge status="crit">Refused</StatusBadge>
    </div>
  ),
  switch: () => <Switch label="Motion" defaultChecked />,
  table: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Host</TableHead>
          <TableHead>CPU %</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ROWS.map((r) => (
          <TableRow key={r.id}>
            <TableCell mono>{r.host}</TableCell>
            <TableCell mono muted>
              {r.cpu}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
  tabs: () => (
    <Tabs defaultValue="grid">
      <TabsList aria-label="Estate view">
        <TabsTrigger value="map">Map</TabsTrigger>
        <TabsTrigger value="grid">Grid</TabsTrigger>
      </TabsList>
      <TabsContent value="map">The harbour map.</TabsContent>
      <TabsContent value="grid" className="text-sm text-hn-ink-body">
        Machines as cards.
      </TabsContent>
    </Tabs>
  ),
  toast: () => (
    <ToastProvider>
      <div className="relative min-h-[96px]">
        <Toast open duration={Number.POSITIVE_INFINITY} status="ok">
          <ToastTitle>speicher-web restarted</ToastTitle>
          <ToastDescription>Rollout finished in 42 s.</ToastDescription>
        </Toast>
        <ToastViewport className="static w-full max-w-[392px] p-0" />
      </div>
    </ToastProvider>
  ),
  tooltip: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="secondary">Hover for the tooltip</Button>
        </TooltipTrigger>
        <TooltipContent>Ask every agent for a fresh report</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
  "delayed-visibility": () => <DelayedDot />,
  skeleton: () => (
    <div className="flex items-start gap-4">
      <Skeleton shape="circle" width={40} />
      <Skeleton shape="text" lines={2} className="flex-1 text-sm" />
    </div>
  ),
  spinner: () => <SavingButton />,
  "state-copy": () => (
    <dl className="m-0 grid grid-cols-[3rem_1fr] gap-1 text-[13px]">
      <dt className="font-hn-mono text-hn-ink-muted">en</dt>
      <dd className="m-0 text-hn-ink-body">{STATE_COPY.en.empty.title}</dd>
      <dt className="font-hn-mono text-hn-ink-muted">de</dt>
      <dd className="m-0 text-hn-ink-body">{STATE_COPY.de.empty.title}</dd>
    </dl>
  ),
  "empty-state": () => (
    <Frame>
      <EmptyState
        titleAs="h3"
        illustration={<EmptyIllustration width={96} height={72} />}
        action={<Button>Add a machine</Button>}
      />
    </Frame>
  ),
  "error-state": () => (
    <Frame>
      <ErrorState titleAs="h3" dev={false} digest="2961537040" onRetry={() => {}} />
    </Frame>
  ),
  progress: () => <Progress value={40} label="Upload manifest.tar" showLabel />,
  "query-state": () => (
    <Frame>
      <QueryState query={HOSTS} onRetry={() => {}}>
        {hosts}
      </QueryState>
    </Frame>
  ),
  label: () => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="demo-label" required>
        Machine name
      </Label>
      <Input id="demo-label" mono defaultValue="kran-04" />
    </div>
  ),
  field: () => (
    <Field label="Machine name" help="Lowercase letters, digits and dashes." required>
      <Input mono defaultValue="kran-04" />
    </Field>
  ),
  "form-alert": () => <FormAlert kind="invalid" />,
  textarea: () => <Textarea aria-label="Notes" rows={2} defaultValue="Quay 4, crane controller." />,
  checkbox: () => <Checkbox label="Drain first" defaultChecked />,
  "radio-group": () => (
    <RadioGroup defaultValue="compact" aria-label="Density">
      <RadioGroupItem value="compact" label="Compact" />
      <RadioGroupItem value="comfortable" label="Comfortable" />
    </RadioGroup>
  ),
  "layout-copy": () => (
    <div className="flex flex-wrap gap-2 text-[13px] text-hn-ink-body">
      {Object.values(LAYOUT_COPY.en.tone).map((t) => (
        <Badge key={t}>{t}</Badge>
      ))}
    </div>
  ),
  card: () => (
    <Card>
      <CardHeader>
        <CardTitle>kran-01</CardTitle>
        <CardDescription>Quay 3, crane controller</CardDescription>
      </CardHeader>
      <CardBody className="text-[13px]">2 replicas</CardBody>
    </Card>
  ),
  alert: () => (
    <Alert tone="warning" title="Disk at 88 %">
      pegel has room for about two days of logs.
    </Alert>
  ),
  avatar: () => (
    <div className="flex items-center gap-3">
      <Avatar name="Ada Lovelace" />
      <Avatar name="Grace Hopper" loading />
    </div>
  ),
  separator: () => (
    <div className="flex h-6 items-center gap-3 text-sm text-hn-ink-body">
      <span>12 up</span>
      <Separator orientation="vertical" />
      <span>1 down</span>
    </div>
  ),
  accordion: () => (
    <Accordion type="single" collapsible defaultValue="pods">
      <AccordionItem value="pods">
        <AccordionTrigger meta="3 pods">speicher-web</AccordionTrigger>
        <AccordionContent>speicher-web-7f3a, -51c0, -22ab</AccordionContent>
      </AccordionItem>
      <AccordionItem value="events">
        <AccordionTrigger>Events</AccordionTrigger>
        <AccordionContent>Scaled to 3, 15:12.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
  popover: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary">
          <Bell />
          Snooze
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-64 flex-col gap-2 p-4 text-sm">
        <PopoverTitle>Snooze alerts</PopoverTitle>
        <span className="text-hn-ink-body">For one hour.</span>
      </PopoverContent>
    </Popover>
  ),
  calendar: () => <Calendar today={TODAY} selected={new Date(2026, 8, 18)} onSelect={() => {}} />,
  "date-picker": () => (
    <Field label="Maintenance day">
      <DatePicker today={TODAY} defaultValue={new Date(2026, 8, 18)} />
    </Field>
  ),
  combobox: () => (
    <Combobox
      aria-label="Machine"
      options={HOSTS.map((h) => ({ value: h, label: h }))}
      defaultValue="kran-02"
    />
  ),
  "data-table": () => <DataTable columns={COLUMNS} rows={ROWS} getRowId={(r) => r.id} />,
  sheet: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary">Open sheet</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>kran-01</SheetTitle>
          <SheetDescription>Production, quay 1.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <StatusBadge status="ok" className="self-start" />
        </SheetBody>
      </SheetContent>
    </Sheet>
  ),
  breadcrumb: () => (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#estate" onClick={(e) => e.preventDefault()}>
            Estate
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>speicher-web</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
  pagination: () => <LivePager />,
  shell: () => (
    <div className="h-[560px] overflow-hidden rounded-hn-lg border border-hn-line-subtle">
      <DemoShell />
    </div>
  ),
  command: () => (
    <Command
      groups={[
        {
          id: "machines",
          heading: "Machines",
          items: HOSTS.map((h) => ({ id: h, label: h, icon: <Server /> })),
        },
      ]}
    />
  ),
};

/** An item's demo, or a note for an item without one (the test keeps that list empty). */
export function Demo({ item }: { item: string }) {
  const demo = DEMOS[item];
  return demo ? (
    <>{demo()}</>
  ) : (
    <span className="text-[13px] text-hn-ink-muted">No demo for {item} yet.</span>
  );
}
