// The overlays scene: Sheet (side, bottom, pending), Popover and the command palette in each of
// its states, drawn open inside framed stages, plus live triggers the interaction spec drives.
// Names are an invented estate: no real hostnames, IPs or people in a public repo.

import { type ReactNode, useState } from "react";
import {
  Button,
  Command,
  CommandDialog,
  type CommandGroup,
  Field,
  Input,
  Kbd,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
  RadioGroup,
  RadioGroupItem,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Spinner,
  STATE_COPY,
  type StateLocale,
  StatusBadge,
  Textarea,
  useCommandShortcut,
} from "../src";
import { Bell, Key, Restart, Server } from "./icons";

function Section({
  title,
  wide,
  children,
}: {
  title: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={wide ? "flex flex-col gap-3.5 lg:col-span-2" : "flex flex-col gap-3.5"}>
      <h2 className="m-0 font-hn-mono text-[13px] font-medium text-hn-ink-muted">{title}</h2>
      {children}
    </section>
  );
}

/**
 * A stage that contains fixed-position overlays: the transform makes it their containing block,
 * so an open Sheet sits inside the frame instead of the viewport. The overlay is portalled into
 * it and rendered once the element exists.
 */
function Frame({
  height = 440,
  scrim = false,
  children,
}: {
  height?: number;
  scrim?: boolean;
  children: (container: HTMLElement) => ReactNode;
}) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  return (
    <div
      ref={setEl}
      data-frame=""
      className="relative overflow-hidden rounded-hn-lg border border-hn-line-subtle bg-hn-surface-page"
      style={{ height, transform: "translateZ(0)" }}
    >
      <div className="flex flex-col gap-2 p-4 text-sm text-hn-ink-muted">
        <span className="font-hn-mono text-hn-ink-body">harbour / speicher-web</span>
        <span>3 replicas, rollout 2 min ago.</span>
      </div>
      {/* A non-modal Sheet draws no overlay of its own; the frame shows the modal look. */}
      {scrim ? <div className="absolute inset-0 bg-hn-surface-page/70" /> : null}
      {el ? children(el) : null}
    </div>
  );
}

const noFocus = (e: Event) => e.preventDefault();

function MachineSheet({
  container,
  side,
  locale,
  pending = false,
}: {
  container: HTMLElement;
  side: "right" | "bottom";
  locale: StateLocale;
  pending?: boolean;
}) {
  const de = locale === "de";
  return (
    <Sheet open modal={false}>
      <SheetContent
        container={container}
        side={side}
        locale={locale}
        pending={pending}
        onOpenAutoFocus={noFocus}
      >
        <SheetHeader>
          <SheetTitle>kran-04</SheetTitle>
          <SheetDescription>
            {de
              ? "Staging, Kai 4. Letzter Bericht vor 12 s."
              : "Staging, quay 4. Last report 12 s ago."}
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <StatusBadge status="ok" className="self-start">
            Online
          </StatusBadge>
          <fieldset disabled={pending} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
            <Field label={de ? "Anzeigename" : "Display name"}>
              <Input mono defaultValue="kran-04" />
            </Field>
            <Field label={de ? "Notizen" : "Notes"}>
              <Textarea rows={2} defaultValue="Quay 4, crane controller." />
            </Field>
          </fieldset>
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" disabled={pending}>
            {de ? "Abbrechen" : "Cancel"}
          </Button>
          <Button disabled={pending}>
            {pending ? <Spinner label={STATE_COPY[locale].form.pending} /> : null}
            {pending ? STATE_COPY[locale].form.pending : de ? "Speichern" : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

const PALETTE: CommandGroup[] = [
  {
    id: "machines",
    heading: "Machines",
    items: [
      {
        id: "kran-01",
        label: "kran-01",
        hint: "production",
        icon: <Server />,
        keywords: ["crane"],
      },
      {
        id: "kran-02",
        label: "kran-02",
        hint: "production",
        icon: <Server />,
        keywords: ["crane"],
      },
      { id: "kran-04", label: "kran-04", hint: "staging", icon: <Server />, keywords: ["crane"] },
      { id: "pegel", label: "pegel", hint: "offline", icon: <Server />, disabled: true },
    ],
  },
  {
    id: "actions",
    heading: "Actions",
    items: [
      { id: "restart", label: "Restart deployment", icon: <Restart />, shortcut: "⌘R" },
      { id: "rotate", label: "Rotate agent key", icon: <Key />, keywords: ["secret"] },
      { id: "page", label: "Page on-call", icon: <Bell />, shortcut: "⌘P" },
    ],
  },
];

/** The palette opened for real (⌘K or the button), for the interaction spec. */
function LivePalette() {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState("nothing yet");
  useCommandShortcut(() => setOpen((o) => !o));
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="secondary" onClick={() => setOpen(true)} data-testid="open-palette">
        Open command palette <Kbd>⌘K</Kbd>
      </Button>
      <span className="text-sm text-hn-ink-muted">
        Picked:{" "}
        <span data-testid="picked" className="font-hn-mono text-hn-ink-primary">
          {picked}
        </span>
      </span>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        groups={PALETTE}
        onSelect={(item) => setPicked(item.id)}
      />
    </div>
  );
}

function LiveSheetAndPopover() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="secondary" data-testid="open-sheet">
            Open sheet
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>kran-01</SheetTitle>
            <SheetDescription>Production, quay 1.</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <Field label="Display name">
              <Input mono defaultValue="kran-01" />
            </Field>
          </SheetBody>
        </SheetContent>
      </Sheet>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="secondary" data-testid="open-popover">
            Snooze
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="flex w-72 max-w-[calc(100vw-32px)] flex-col gap-3 p-4 text-sm"
          aria-labelledby="live-snooze-title"
        >
          <PopoverTitle id="live-snooze-title">Snooze alerts</PopoverTitle>
          <PopoverClose asChild>
            <Button variant="ghost">Done</Button>
          </PopoverClose>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function Overlays() {
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-10 sm:px-10">
      <header className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-hn-ink-muted">@hansenexus/ui</span>
        <h1 className="m-0 font-hn-display text-[32px] leading-tight font-semibold tracking-[-0.02em] sm:text-[44px]">
          Overlays
        </h1>
      </header>
      <div className="grid gap-x-8 gap-y-10 lg:grid-cols-2">
        <Section title="Sheet: right, a bottom sheet below 640 px (en)">
          <Frame scrim>
            {(container) => <MachineSheet container={container} side="right" locale="en" />}
          </Frame>
        </Section>
        <Section title="Sheet: bottom, pending, cannot be dismissed (de)">
          <Frame scrim>
            {(container) => (
              <MachineSheet container={container} side="bottom" locale="de" pending />
            )}
          </Frame>
        </Section>
        <Section title="Popover" wide>
          <Frame height={340}>
            {(container) => (
              <div className="px-4">
                <Popover open modal={false}>
                  <PopoverTrigger asChild>
                    <Button variant="secondary">
                      <Bell />
                      Snooze alerts
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="flex w-72 max-w-[calc(100vw-32px)] flex-col gap-3 p-4 text-sm"
                    container={container}
                    aria-labelledby="snooze-title"
                    onOpenAutoFocus={noFocus}
                  >
                    <PopoverTitle id="snooze-title">Snooze alerts for kran-04</PopoverTitle>
                    <RadioGroup defaultValue="1h" aria-labelledby="snooze-title">
                      <RadioGroupItem value="1h" label="1 hour" />
                      <RadioGroupItem value="4h" label="4 hours" />
                      <RadioGroupItem value="deploy" label="Until the next deploy" />
                    </RadioGroup>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost">Cancel</Button>
                      <Button>Snooze</Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </Frame>
        </Section>
        <Section title="Command: results, one disabled (en)">
          <div data-command="results">
            <Command groups={PALETTE} />
          </div>
        </Section>
        <Section title="Command: filtered to “kran” (de)">
          <div data-command="filtered">
            <Command groups={PALETTE} locale="de" defaultQuery="kran" />
          </div>
        </Section>
        <Section title="Command: loading, nothing yet (de)">
          <div data-command="loading">
            <Command groups={[]} filter={false} locale="de" defaultQuery="speicher" loading />
          </div>
        </Section>
        <Section title="Command: no results (en)">
          <div data-command="no-results">
            <Command groups={PALETTE} defaultQuery="lotsen" />
          </div>
        </Section>
        <Section title="Command: error with retry (de)">
          <div data-command="error">
            <Command
              groups={[]}
              filter={false}
              locale="de"
              defaultQuery="speicher"
              error
              onRetry={() => {}}
            />
          </div>
        </Section>
        <Section title="Command: empty, nothing typed (en)">
          <div data-command="empty">
            <Command groups={[]} />
          </div>
        </Section>
        <Section title="Live: palette (⌘K), sheet, popover" wide>
          <LivePalette />
          <LiveSheetAndPopover />
        </Section>
      </div>
    </main>
  );
}
