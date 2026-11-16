// The alert-dialog scene (hansenexus/design#167): the kit AlertDialog, the marked layout of the
// vote (decisions/alert-dialog.json). Radix AlertDialog is always modal, so the scene holds one
// ask open, the destructive high-risk one, like the Dialog scene does; Cancel or Escape closes it,
// and the triggers below open the others live: a destructive ask with one fact and a neutral,
// German one. The 390 viewport shows the phone layout (centred mark, stacked buttons).
// Names are an invented estate: no real hostnames, IPs or people in a public repo.
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogConsequence,
  AlertDialogConsequences,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  type AlertDialogTone,
  AlertDialogTrigger,
  Button,
} from "../src";
import { PreviewCard } from "./preview";

type Ask = {
  id: string;
  lang: "en" | "de";
  tone: AlertDialogTone;
  trigger: string;
  title: string;
  description: string;
  consequencesLabel: string;
  consequences: string[];
  action: string;
  cancel: string;
};

const ASKS: Ask[] = [
  {
    id: "delete-machine",
    lang: "en",
    tone: "destructive",
    trigger: "Delete kran-03",
    title: "Delete kran-03?",
    description: "kran-03 leaves the cluster and its disks are wiped. This cannot be undone.",
    consequencesLabel: "What happens",
    consequences: [
      "2 volumes, 48 GB, are erased",
      "3 pods are rescheduled on kran-01 and kran-02",
      "kran-03.ts.example stops resolving",
    ],
    action: "Delete kran-03",
    cancel: "Cancel",
  },
  {
    id: "revoke-key",
    lang: "en",
    tone: "destructive",
    trigger: "Revoke ci-deploy",
    title: "Revoke the key ci-deploy?",
    description: "Pipelines that use it fail from their next run. Issue a new key to restore them.",
    consequencesLabel: "What happens",
    consequences: ["4 pipelines use this key, the last one 6 min ago"],
    action: "Revoke key",
    cancel: "Cancel",
  },
  {
    id: "send-invoice",
    lang: "de",
    tone: "neutral",
    trigger: "Rechnung senden",
    title: "Rechnung RE-2026-118 senden?",
    description:
      "Die Rechnung geht per E-Mail an Elbe Holzbau GmbH. Danach lässt sie sich nur noch stornieren, nicht mehr ändern.",
    consequencesLabel: "Was passiert",
    consequences: ["Betrag 4.860,00 €, fällig am 30.11.2026"],
    action: "Rechnung senden",
    cancel: "Abbrechen",
  },
];

function Ask({ ask, defaultOpen = false }: { ask: Ask; defaultOpen?: boolean }) {
  return (
    <AlertDialog defaultOpen={defaultOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={ask.tone === "destructive" ? "danger" : "secondary"} data-ask={ask.id}>
          {ask.trigger}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent tone={ask.tone} lang={ask.lang}>
        <AlertDialogHeader>
          <AlertDialogTitle>{ask.title}</AlertDialogTitle>
          <AlertDialogDescription>{ask.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogConsequences label={ask.consequencesLabel}>
          {ask.consequences.map((c) => (
            <AlertDialogConsequence key={c}>{c}</AlertDialogConsequence>
          ))}
        </AlertDialogConsequences>
        <AlertDialogFooter>
          <AlertDialogCancel>{ask.cancel}</AlertDialogCancel>
          <AlertDialogAction>{ask.action}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function AlertDialogScene() {
  const [held, ...rest] = ASKS;
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-10 sm:px-10">
      <header className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-hn-ink-muted">@hansenexus/ui</span>
        <h1 className="m-0 font-hn-display text-[32px] leading-tight font-semibold tracking-[-0.02em] sm:text-[44px]">
          Alert dialog
        </h1>
        <p className="m-0 max-w-[65ch] text-hn-ink-body">
          Asks before a destructive or irreversible action. Focus starts on Cancel, Escape cancels,
          and the action button names the action.
        </p>
      </header>
      <PreviewCard title="Delete (held open), revoke, send (neutral, de)" item="alert-dialog" wide>
        <div className="flex flex-wrap items-center gap-3">
          {held ? <Ask ask={held} defaultOpen /> : null}
          {rest.map((ask) => (
            <Ask key={ask.id} ask={ask} />
          ))}
        </div>
      </PreviewCard>
    </main>
  );
}
