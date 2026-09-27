// The data scene: DatePicker and Calendar, Combobox in each list state and DataTable in each
// state of the contract, German and English side by side.
// Screenshot baselines are taken from this page (screenshots/kit.spec.ts). Every date is fixed
// (TODAY), so the baselines never depend on the day they are taken.
// Names are an invented estate: no real hostnames, IPs or people in a public repo.

import { EmptyIllustration } from "@hansenexus/illustrations/empty";
import { type ReactNode, useState } from "react";
import {
  Calendar,
  Combobox,
  type ComboboxOption,
  DataTable,
  type DataTableColumn,
  type DataTableSort,
  DatePicker,
  type DateRange,
  EmptyState,
  Field,
  Input,
  StatusBadge,
  type StatusBadgeProps,
} from "../src";

const TODAY = new Date(2026, 8, 14);
const day = (d: number) => new Date(2026, 8, d);

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
    <section
      className={
        wide ? "flex min-w-0 flex-col gap-3.5 lg:col-span-2" : "flex min-w-0 flex-col gap-3.5"
      }
    >
      <h2 className="m-0 font-hn-mono text-[13px] font-medium text-hn-ink-muted">{title}</h2>
      {children}
    </section>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-hn-lg border border-hn-line-subtle bg-hn-surface-card p-4">
      {children}
    </div>
  );
}

type Machine = {
  id: string;
  host: string;
  status: StatusBadgeProps["status"];
  quay: string;
  cpu: number | null;
  seen: Date;
};

const at = (d: number, h: number, m: number) => new Date(2026, 8, d, h, m);

const MACHINES: Machine[] = [
  { id: "m1", host: "kran-01", status: "ok", quay: "Nordkai", cpu: 21, seen: at(14, 15, 12) },
  { id: "m2", host: "kran-02", status: "warn", quay: "Nordkai", cpu: 88, seen: at(14, 15, 11) },
  { id: "m3", host: "kran-10", status: "ok", quay: "Südkai", cpu: 34, seen: at(14, 15, 9) },
  { id: "m4", host: "pegel", status: "crit", quay: "Südkai", cpu: null, seen: at(13, 22, 40) },
  {
    id: "m5",
    host: "speicher-web",
    status: "busy",
    quay: "Speicher",
    cpu: 57,
    seen: at(14, 15, 12),
  },
  { id: "m6", host: "lotsen-api", status: "off", quay: "Speicher", cpu: null, seen: at(12, 8, 3) },
];

const time = (d: Date) =>
  `${d.getDate() === TODAY.getDate() ? "" : `${d.getDate()}.09. `}${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

const COLUMNS: DataTableColumn<Machine>[] = [
  { id: "host", header: "Host", cell: (m) => m.host, sortValue: (m) => m.host, mono: true },
  {
    id: "status",
    header: "Status",
    cell: (m) => <StatusBadge status={m.status} />,
    sortValue: (m) => m.status,
  },
  { id: "quay", header: "Quay", cell: (m) => m.quay, filterValue: (m) => m.quay, muted: true },
  {
    id: "cpu",
    header: "CPU %",
    cell: (m) => m.cpu ?? "–",
    sortValue: (m) => m.cpu,
    align: "end",
    mono: true,
  },
  {
    id: "seen",
    header: "Last seen",
    cell: (m) => time(m.seen),
    sortValue: (m) => m.seen,
    mono: true,
    muted: true,
  },
];

/** A few columns for the small state tables. */
const SLIM = COLUMNS.filter((c) => c.id !== "status" && c.id !== "seen");

const FAILURE = Object.assign(new Error("upstream timeout fleet-api"), { digest: "3318004127" });

/** The live table: a filter input over a sorted, selectable table, all local state. */
function MachinesTable() {
  const [query, setQuery] = useState("kai");
  const [sort, setSort] = useState<DataTableSort | null>({ id: "cpu", direction: "desc" });
  const [selection, setSelection] = useState<Set<string>>(() => new Set(["m2", "m4"]));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          aria-label="Filter machines"
          placeholder="Filter machines"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-64"
        />
        <span className="font-hn-mono text-xs text-hn-ink-muted" data-selected-count="">
          {selection.size} selected
        </span>
      </div>
      <DataTable
        caption="Machines"
        columns={COLUMNS}
        rows={MACHINES}
        getRowId={(m) => m.id}
        getRowLabel={(m) => m.host}
        query={query}
        onClearFilters={() => setQuery("")}
        sort={sort}
        onSortChange={setSort}
        selectable
        selection={selection}
        onSelectionChange={setSelection}
      />
    </div>
  );
}

const HOSTS: ComboboxOption[] = MACHINES.map((m) => ({
  value: m.id,
  label: m.host,
  description: m.quay,
  disabled: m.status === "off",
}));

/** Room under an open Combobox, so its list never covers the next row. */
function ComboStage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex h-[360px] min-w-0 flex-col gap-2">
      <span className="font-hn-mono text-xs text-hn-ink-muted">{title}</span>
      {children}
    </div>
  );
}

/** Open comboboxes stay below their input in the full-page screenshots. */
const OPEN = { open: true, avoidCollisions: false } as const;

export function Data() {
  const [single, setSingle] = useState<Date | null>(day(18));
  const [range, setRange] = useState<DateRange | null>({ from: day(21), to: day(25) });
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-10 sm:px-10">
      <header className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-hn-ink-muted">@hansenexus/ui</span>
        <h1 className="m-0 font-hn-display text-[32px] leading-tight font-semibold tracking-[-0.02em] sm:text-[44px]">
          Dates and data
        </h1>
      </header>
      <div className="grid gap-x-8 gap-y-10 lg:grid-cols-2">
        <Spec title="Calendar: single (de), weekends and past days off">
          <Card>
            <Calendar
              locale="de"
              today={TODAY}
              selected={single}
              onSelect={setSingle}
              min={TODAY}
              isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
            />
          </Card>
        </Spec>
        <Spec title="Calendar: range (en)">
          <Card>
            <Calendar mode="range" today={TODAY} selected={range} onSelect={setRange} />
          </Card>
        </Spec>
        <Spec title="DatePicker: empty, day, range, invalid, pending, disabled" wide>
          <Card>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Wartungsfenster" help="Ein Werktag ab heute.">
                <DatePicker locale="de" today={TODAY} min={TODAY} />
              </Field>
              <Field label="Maintenance day">
                <DatePicker today={TODAY} defaultValue={day(18)} />
              </Field>
              <Field label="Zeitraum">
                <DatePicker
                  mode="range"
                  locale="de"
                  today={TODAY}
                  defaultValue={{ from: day(21), to: day(25) }}
                />
              </Field>
              <Field label="Drain on" error="Pick a day after the freeze ends." required>
                <DatePicker today={TODAY} defaultValue={day(9)} />
              </Field>
              <Field label="Liefertermin" help="Die freien Tage werden geladen.">
                <DatePicker locale="de" today={TODAY} pending />
              </Field>
              <Field label="Backup day (offline)" disabled>
                <DatePicker today={TODAY} defaultValue={day(30)} />
              </Field>
            </div>
          </Card>
        </Spec>
        <Spec title="Combobox: options, loading, no-results (de), error" wide>
          <div className="grid gap-x-5 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
            <ComboStage title="options, one disabled">
              <Combobox aria-label="Machine" options={HOSTS} defaultValue="m3" {...OPEN} />
            </ComboStage>
            <ComboStage title="loading">
              <Combobox aria-label="Machine" options={undefined} defaultQuery="kran" {...OPEN} />
            </ComboStage>
            <ComboStage title="no-results (de)">
              <Combobox
                aria-label="Maschine"
                locale="de"
                options={HOSTS}
                defaultQuery="hafen"
                {...OPEN}
              />
            </ComboStage>
            <ComboStage title="error">
              <Combobox
                aria-label="Machine"
                options={undefined}
                error={FAILURE}
                onRetry={() => {}}
                {...OPEN}
              />
            </ComboStage>
          </div>
        </Spec>
        <Spec title="DataTable: filtered, sorted by CPU, two selected" wide>
          <MachinesTable />
        </Spec>
        <Spec title="DataTable: loading">
          <DataTable columns={SLIM} rows={undefined} getRowId={(m) => m.id} loadingRows={3} />
        </Spec>
        <Spec title="DataTable: pending (a refetch on shown rows)">
          <DataTable columns={SLIM} rows={MACHINES.slice(0, 3)} getRowId={(m) => m.id} pending />
        </Spec>
        <Spec title="DataTable: empty (de)">
          <DataTable
            columns={SLIM}
            rows={[]}
            getRowId={(m) => m.id}
            locale="de"
            empty={
              <EmptyState
                locale="de"
                titleAs="p"
                illustration={<EmptyIllustration width={96} height={72} />}
              />
            }
          />
        </Spec>
        <Spec title="DataTable: no-results, error">
          <div className="flex flex-col gap-4">
            <DataTable
              columns={SLIM}
              rows={MACHINES}
              getRowId={(m) => m.id}
              query="leuchtturm"
              onClearFilters={() => {}}
            />
            <DataTable
              columns={SLIM}
              rows={MACHINES}
              getRowId={(m) => m.id}
              error={FAILURE}
              onRetry={() => {}}
            />
          </div>
        </Spec>
      </div>
    </main>
  );
}
