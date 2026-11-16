// The alert-dialog vote (hansenexus/design#167): how the kit asks before a destructive or
// irreversible action. The component is built on Radix AlertDialog after the vote; the variants
// here differ in tone, icon, typed confirmation and phone layout.
//
// Every cell is a stage of fixed size (560 × 460 or 390 × 780), scaled down to fit. It shows the
// dialog frozen open over a faux app page, drawn through plain elements: Radix AlertDialog is
// always modal, and a dozen open at once would lock the gallery. "Open live" below each stage
// opens the same layout through the real Radix parts, portalled into the stage, so focus (it
// starts on Cancel), Escape and the focus trap can be tried. Names are an invented estate.
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { Button, type ButtonProps, cx } from "../../../src";
import type { CategorySpec, Fixture, Variant } from "../types";

export type Screen = "desktop" | "phone";

const STAGES: Record<Screen, { width: number; height: number }> = {
  desktop: { width: 560, height: 460 },
  phone: { width: 390, height: 780 },
};

/** One situation that asks for confirmation; every variant draws it. */
export type Scenario = {
  id: string;
  label: string;
  screen: Screen;
  locale: "en" | "de";
  /** destructive: data or access is lost. neutral: irreversible, but nothing is destroyed. */
  tone: "destructive" | "neutral";
  /** high: losing it would hurt; the typed variant asks for the name here. */
  risk: "high" | "normal";
  title: string;
  description: string;
  /** What exactly happens, one fact per line. */
  consequences: string[];
  /** Names the action; never "OK" or "Yes". */
  action: string;
  cancel: string;
  /** The name a typed confirmation asks for (risk: high). */
  confirm?: string;
  /** Label of the typed-confirmation field. */
  confirmLabel?: string;
  /** Heading over the consequences. */
  consequencesLabel: string;
  /** The page under the dialog. */
  page: { app: string; heading: string; rows: string[] };
};

type Slot = { className?: string; children?: ReactNode };

/**
 * The dialog's parts. Frozen previews get plain elements, the live dialog the Radix
 * AlertDialog parts; a variant lays them out once and both look the same.
 */
export type Parts = {
  live: boolean;
  Content: (props: Slot) => ReactNode;
  Title: (props: Slot) => ReactNode;
  Description: (props: Slot) => ReactNode;
  Cancel: (props: ButtonProps) => ReactNode;
  Action: (props: ButtonProps) => ReactNode;
};

export type DialogProps = { scenario: Scenario; parts: Parts };

/** An alert-dialog variant: one confirmation layout, drawn for every scenario and screen. */
export type AlertDialogStyle = Variant & { Dialog: (props: DialogProps) => ReactNode };

const FROZEN: Parts = {
  live: false,
  Content: ({ className, children }) => (
    <section aria-label="Dialog preview" className={className}>
      {children}
    </section>
  ),
  Title: ({ className, children }) => <h2 className={className}>{children}</h2>,
  Description: ({ className, children }) => <p className={className}>{children}</p>,
  Cancel: (props) => <Button {...props} />,
  Action: (props) => <Button {...props} />,
};

const LIVE: Parts = {
  live: true,
  Content: ({ className, children }) => (
    <AlertDialogPrimitive.Content className={className}>{children}</AlertDialogPrimitive.Content>
  ),
  Title: ({ className, children }) => (
    <AlertDialogPrimitive.Title className={className}>{children}</AlertDialogPrimitive.Title>
  ),
  Description: ({ className, children }) => (
    <AlertDialogPrimitive.Description className={className}>
      {children}
    </AlertDialogPrimitive.Description>
  ),
  Cancel: (props) => (
    <AlertDialogPrimitive.Cancel asChild>
      <Button {...props} />
    </AlertDialogPrimitive.Cancel>
  ),
  Action: (props) => (
    <AlertDialogPrimitive.Action asChild>
      <Button {...props} />
    </AlertDialogPrimitive.Action>
  ),
};

/** Shared type ramp, so the variants differ in layout and emphasis, not in text sizes. */
export const TEXT = {
  title: "m-0 text-lg font-semibold text-hn-ink-primary",
  description: "m-0 text-[13.5px] leading-normal text-hn-ink-body",
  fact: "text-[13px] leading-normal text-hn-ink-body",
} as const;

/** The dialog surface every variant starts from: the kit's Dialog sheet. */
export const SURFACE =
  "rounded-hn-xl border border-hn-line-strong bg-hn-surface-card font-hn-sans text-hn-ink-primary shadow-hn-overlay outline-none";

/** Centred in the stage, like DialogContent. */
export const CENTRED =
  "fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-32px)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 flex-col";

export const isPhone = (s: Scenario) => s.screen === "phone";

function Page({ page }: { page: Scenario["page"] }) {
  return (
    <div className="flex size-full flex-col">
      <div className="flex h-12 items-center border-hn-line-subtle border-b px-4 font-semibold text-sm">
        {page.app}
      </div>
      <div className="flex flex-col gap-3 p-4">
        <span className="font-semibold text-base">{page.heading}</span>
        {page.rows.map((row) => (
          <div
            key={row}
            className="flex h-11 items-center rounded-hn-md border border-hn-line-subtle bg-hn-surface-card px-3 font-hn-mono text-hn-ink-body text-sm"
          >
            {row}
          </div>
        ))}
      </div>
    </div>
  );
}

const scrim = "fixed inset-0 z-50 bg-hn-surface-page/70";

function Stage({ variant, scenario }: { variant: AlertDialogStyle; scenario: Scenario }) {
  const { width, height } = STAGES[scenario.screen];
  const outer = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<HTMLElement | null>(null);
  const [scale, setScale] = useState(0);
  const [live, setLive] = useState(false);
  useLayoutEffect(() => {
    const el = outer.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / width));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width]);
  const { Dialog } = variant;
  return (
    <AlertDialogPrimitive.Root open={live} onOpenChange={setLive}>
      <div className="flex flex-col items-start gap-2">
        <div
          ref={outer}
          className="relative w-full overflow-hidden rounded-hn-lg outline outline-1 outline-hn-line-strong"
          style={{ aspectRatio: `${width} / ${height}`, maxWidth: width }}
        >
          <div
            ref={setStage}
            lang={scenario.locale}
            data-screen={scenario.screen}
            className="absolute top-0 left-0 origin-top-left overflow-hidden bg-hn-surface-page font-hn-sans text-hn-ink-primary"
            style={{
              width,
              height,
              // The transform also makes the stage the containing block of the fixed dialog.
              transform: `scale(${scale || 1})`,
              visibility: scale ? undefined : "hidden",
            }}
          >
            <Page page={scenario.page} />
            {live ? null : (
              <>
                <div className={scrim} />
                <Dialog scenario={scenario} parts={FROZEN} />
              </>
            )}
            {stage ? (
              <AlertDialogPrimitive.Portal container={stage}>
                <AlertDialogPrimitive.Overlay className={scrim} />
                <Dialog scenario={scenario} parts={LIVE} />
              </AlertDialogPrimitive.Portal>
            ) : null}
          </div>
        </div>
        <AlertDialogPrimitive.Trigger asChild>
          <Button size="xs" variant="secondary">
            Open live
          </Button>
        </AlertDialogPrimitive.Trigger>
      </div>
    </AlertDialogPrimitive.Root>
  );
}

const MACHINES = {
  app: "kommandant",
  heading: "Machines",
  rows: ["kran-01  k3s server", "kran-02  k3s agent", "kran-03  k3s agent, off"],
};

export const SCENARIOS: Scenario[] = [
  {
    id: "delete-machine",
    label: "Delete a machine, high risk, desktop",
    screen: "desktop",
    locale: "en",
    tone: "destructive",
    risk: "high",
    title: "Delete kran-03?",
    description: "kran-03 leaves the cluster and its disks are wiped. This cannot be undone.",
    consequences: [
      "2 volumes, 48 GB, are erased",
      "3 pods are rescheduled on kran-01 and kran-02",
      "kran-03.ts.example stops resolving",
    ],
    consequencesLabel: "What happens",
    action: "Delete kran-03",
    cancel: "Cancel",
    confirm: "kran-03",
    confirmLabel: "Type kran-03 to confirm",
    page: MACHINES,
  },
  {
    id: "revoke-key",
    label: "Revoke a key, normal risk, desktop",
    screen: "desktop",
    locale: "en",
    tone: "destructive",
    risk: "normal",
    title: "Revoke the key ci-deploy?",
    description: "Pipelines that use it fail from their next run. Issue a new key to restore them.",
    consequences: ["4 pipelines use this key, the last one 6 min ago"],
    consequencesLabel: "What happens",
    action: "Revoke key",
    cancel: "Cancel",
    page: {
      app: "kommandant",
      heading: "Access keys",
      rows: ["ci-deploy  last used 6 min ago", "backup-push  last used 2 h ago"],
    },
  },
  {
    id: "send-invoice",
    label: "Send an invoice, irreversible but not destructive, desktop, German",
    screen: "desktop",
    locale: "de",
    tone: "neutral",
    risk: "normal",
    title: "Rechnung RE-2026-118 senden?",
    description:
      "Die Rechnung geht per E-Mail an Elbe Holzbau GmbH. Danach lässt sie sich nur noch stornieren, nicht mehr ändern.",
    consequences: ["Betrag 4.860,00 €, fällig am 30.11.2026"],
    consequencesLabel: "Was passiert",
    action: "Rechnung senden",
    cancel: "Abbrechen",
    page: {
      app: "fachwerk",
      heading: "Rechnungen",
      rows: ["RE-2026-118  Entwurf", "RE-2026-117  bezahlt"],
    },
  },
  {
    id: "delete-project-phone",
    label: "Delete a project, high risk, phone 390 px, German",
    screen: "phone",
    locale: "de",
    tone: "destructive",
    risk: "high",
    title: "Projekt Dachstuhl Nord löschen?",
    description: "Das Projekt wird mit allen Daten endgültig gelöscht.",
    consequences: [
      "14 Fotos und 3 Aufmaße werden gelöscht",
      "2 offene Rechnungen bleiben erhalten",
    ],
    consequencesLabel: "Was passiert",
    action: "Projekt löschen",
    cancel: "Abbrechen",
    confirm: "Dachstuhl Nord",
    confirmLabel: "Zum Bestätigen „Dachstuhl Nord“ eingeben",
    page: {
      app: "fachwerk",
      heading: "Projekte",
      rows: ["Dachstuhl Nord", "Carport Ost", "Gaube Süd"],
    },
  },
];

/** The action button's look: danger for destructive, primary for neutral. */
export const actionVariant = (s: Scenario): ButtonProps["variant"] =>
  s.tone === "destructive" ? "danger" : "primary";

/** Footer buttons: a row on desktop, full width and stacked on phones, Action on top. */
export function footer(s: Scenario, className?: string): string {
  return cx(
    isPhone(s)
      ? "flex flex-col-reverse gap-2 [&>*]:h-11 [&>*]:w-full"
      : "flex flex-wrap justify-end gap-2",
    className
  );
}

const fixtures: Fixture<AlertDialogStyle>[] = SCENARIOS.map((scenario) => ({
  id: scenario.id,
  label: scenario.label,
  render: (variant) => <Stage variant={variant} scenario={scenario} />,
}));

export const category: CategorySpec<AlertDialogStyle> = {
  title: "Alert dialog",
  question:
    "How does the kit confirm a destructive or irreversible action? Each draws the same four asks, two of them high risk, on desktop and phone. Focus starts on Cancel and the action button names the action in all of them; Open live tries the real Radix dialog.",
  level: "molecule",
  fixtures,
};
