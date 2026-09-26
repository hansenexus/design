// The skeleton-style vote: how placeholders behave while content loads. Every variant draws the
// same six fixtures through its own Bone, so only the loading behaviour differs between columns.
import type { ReactNode } from "react";
import {
  Button,
  cx,
  SkeletonGroup,
  type SkeletonProps,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../src";
import type { CategorySpec, Variant } from "../types";

export type BoneProps = SkeletonProps & {
  /** Reading order within the fixture, top to bottom from 0. Only progressive reveal uses it. */
  step: number;
};

/** A skeleton-style variant: one placeholder component, drawn in every fixture. */
export type SkeletonStyle = Variant & { Bone: (props: BoneProps) => ReactNode };

const panel = "rounded-hn-lg border border-hn-line-subtle bg-hn-surface-card p-4";

function Page({ Bone }: SkeletonStyle) {
  return (
    <SkeletonGroup label="Loading the machine page" className={cx(panel, "flex flex-col gap-4")}>
      <div className="flex items-center gap-3">
        <Bone step={0} shape="circle" width={28} />
        <Bone step={0} shape="text" width="30%" className="text-sm" />
      </div>
      <Bone step={1} shape="text" width="55%" className="text-2xl" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Bone key={i} step={2} height={56} />
        ))}
      </div>
      <Bone step={3} shape="text" lines={3} className="text-sm" />
      <Bone step={4} height={96} />
    </SkeletonGroup>
  );
}

function Card({ Bone }: SkeletonStyle) {
  return (
    <SkeletonGroup label="Loading kran-01" className={cx(panel, "flex flex-col gap-3")}>
      <div className="flex items-center gap-3">
        <Bone step={0} shape="circle" width={32} />
        <Bone step={0} shape="text" width="45%" className="text-base" />
      </div>
      <Bone step={1} shape="text" lines={2} className="text-sm" />
      <Bone step={2} height={64} />
    </SkeletonGroup>
  );
}

function List({ Bone }: SkeletonStyle) {
  return (
    <SkeletonGroup label="Loading machines" className={cx(panel, "flex flex-col p-0")}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-hn-line-subtle border-b px-4 py-3 last:border-b-0"
        >
          <Bone step={i} shape="circle" width={24} />
          <div className="flex flex-1 flex-col gap-1.5">
            <Bone step={i} shape="text" width={`${60 - i * 6}%`} className="text-sm" />
            <Bone step={i} shape="text" width="35%" className="text-xs" />
          </div>
          <Bone step={i} width={48} height={20} className="rounded-full" />
        </div>
      ))}
    </SkeletonGroup>
  );
}

const COLUMNS = ["Time", "Action", "Actor", "Ticket"] as const;

function AuditTable({ Bone }: SkeletonStyle) {
  return (
    <SkeletonGroup label="Loading the audit log">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((c) => (
              <TableHead key={c}>{c}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {[0, 1, 2, 3].map((row) => (
            <TableRow key={row}>
              {COLUMNS.map((c, col) => (
                <TableCell key={c}>
                  <Bone
                    step={row}
                    shape="text"
                    width={col === 1 ? "90%" : "70%"}
                    className="text-sm"
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SkeletonGroup>
  );
}

function MetricTile({ Bone }: SkeletonStyle) {
  return (
    <SkeletonGroup label="Loading throughput" className={cx(panel, "flex flex-col gap-2")}>
      <span className="text-hn-ink-muted text-sm">Throughput</span>
      <Bone step={0} shape="text" width="40%" className="text-[32px]" />
      <Bone step={1} shape="text" width="25%" className="text-xs" />
      <Bone step={2} height={40} />
    </SkeletonGroup>
  );
}

function Form({ Bone }: SkeletonStyle) {
  return (
    <div className={cx(panel, "flex flex-col gap-4")}>
      <SkeletonGroup label="Loading the deployment form" className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Bone step={i} shape="text" width="30%" className="text-xs" />
            <Bone step={i} height={36} />
          </div>
        ))}
      </SkeletonGroup>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" disabled>
          Cancel
        </Button>
        <Button disabled>
          <Spinner label="Saving" />
          Saving
        </Button>
      </div>
    </div>
  );
}

export const category: CategorySpec<SkeletonStyle> = {
  title: "Skeleton style",
  question:
    "How do placeholders behave while content loads? The winner becomes the default of Skeleton.",
  fixtures: [
    { id: "page", label: "Page", render: (v) => <Page {...v} /> },
    { id: "card", label: "Card", render: (v) => <Card {...v} /> },
    { id: "list", label: "List", render: (v) => <List {...v} /> },
    { id: "table", label: "Table", render: (v) => <AuditTable {...v} /> },
    { id: "metric", label: "Chart / metric tile", render: (v) => <MetricTile {...v} /> },
    {
      id: "form",
      label: "Form and pending button",
      note: "The pending button is fixed by the 200/400 ms contract; only the fields differ.",
      render: (v) => <Form {...v} />,
    },
  ],
};
