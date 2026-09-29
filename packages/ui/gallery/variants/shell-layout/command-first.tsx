// Command-first, minimal chrome: no sidebar. One top bar with the mark, where you are, and a
// wide ⌘K field that opens the palette; everything else is content. At 390 px the command field
// moves to the bottom, within thumb reach.
import { useState } from "react";
import {
  Avatar,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../../src";
import { SearchIcon } from "../../../src/icons";
import {
  Brand,
  CommandKeys,
  MachinesPage,
  Palette,
  type ShellLayout,
  type ShellProps,
} from "./category";

function CommandField({ onOpen, className }: { onOpen: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      className={`flex h-10 min-h-hn-target items-center gap-2.5 rounded-hn-lg border border-hn-line-strong bg-hn-surface-card px-3 text-left text-sm text-hn-ink-muted hover:text-hn-ink-body ${className ?? ""}`}
    >
      <SearchIcon aria-hidden="true" className="size-4 shrink-0" />
      <span className="flex-1 truncate">Search or run a command</span>
      <CommandKeys />
    </button>
  );
}

function Where() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <Brand compact />
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Machines</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function Shell({ screen }: ShellProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  if (screen === "phone") {
    return (
      <div className="relative flex h-full w-full flex-col">
        <div className="flex h-12 shrink-0 items-center px-4">
          <Where />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <MachinesPage screen={screen} />
        </div>
        <div className="shrink-0 border-hn-line-subtle border-t bg-hn-surface-band p-3">
          <CommandField onOpen={() => setOpen(true)} className="w-full" />
        </div>
        {open ? <Palette onClose={close} className="absolute inset-x-3 bottom-3" /> : null}
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="grid h-14 shrink-0 grid-cols-[1fr_minmax(0,480px)_1fr] items-center gap-4 border-hn-line-subtle border-b px-6">
        <Where />
        <CommandField onOpen={() => setOpen(true)} />
        <span className="justify-self-end">
          <Avatar name="Ada Hafen" size="sm" />
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[880px] px-8 py-6">
          <MachinesPage screen={screen} />
        </div>
      </div>
      {open ? (
        <Palette onClose={close} className="absolute top-3 left-1/2 w-[560px] -translate-x-1/2" />
      ) : null}
    </div>
  );
}

export const variant: ShellLayout = {
  label: "Command-first, minimal chrome",
  summary:
    "No sidebar: a top bar with where you are and a wide ⌘K field; the palette is the nav. The most room for content; places you rarely visit are only a search away.",
  Shell,
};
