// The page patterns scene (design#240): TabbedPage, Wizard and Queue from @hansenexus/shell, each
// at desktop and phone size, skinned by the toolbar's pack (fachwerk, kommandant, …). `?pattern=`
// picks one: tabs (settings, plus the sections variant), wizard (four steps, one failed), create
// (a vocab queue) and review (grading submissions). The school content is invented: no real
// people, classes or schools.
import { type ReactNode, useState } from "react";
import {
  Queue,
  type QueueItem,
  type QueueStatus,
  TabbedPage,
  type TabbedPageTab,
  Wizard,
} from "../../shell/src";
import {
  Badge,
  Button,
  cx,
  Field,
  Input,
  RadioGroup,
  RadioGroupItem,
  Stepper,
  type StepperStep,
  Switch,
  Textarea,
} from "../src";
import { PreviewCard } from "./preview";
import { Frame, SHELL_STORIES } from "./shell";

export type PatternId = "tabs" | "wizard" | "create" | "review";

export const PATTERNS: readonly { id: PatternId; label: string; note: string }[] = [
  {
    id: "tabs",
    label: "Tabs",
    note: "A settings page in sections: the tab bar in the header, each tab a short form with its own save button. The active tab is in the URL, a switch with unsaved changes asks first; on a phone the bar scrolls or turns into a select. The sections variant puts the list in a left sub-column.",
  },
  {
    id: "wizard",
    label: "Wizard",
    note: "A dedicated create page: the stepper in the header (done steps are buttons back), one step in the slot, Abbrechen / Zurück / Weiter in the docked footer. Each step validates before Weiter. On a phone the stepper is `Schritt 3 von 4` over a bar.",
  },
  {
    id: "create",
    label: "Create queue",
    note: "Entering many items: one form, Enter saves and starts the next; the items so far in the list (a column from 1280 px, a bottom sheet on a phone), each editable and removable. ? shows the shortcuts.",
  },
  {
    id: "review",
    label: "Review queue",
    note: "Grading one submission after another: the decisions in the footer with their keys, j/k or ←/→ to move, `12/40` in the header, the list with each status. It resumes at the first open item and ends on Alles erledigt.",
  },
];

const noop = () => {};

// --- Tabs ---------------------------------------------------------------------------------

function SaveBar({ dirty, onSave }: { dirty: boolean; onSave: () => void }) {
  return (
    <>
      <span className="min-w-0 flex-1 truncate text-[13px] text-hn-ink-muted">
        {dirty ? "Ungespeicherte Änderungen" : "Alles gespeichert"}
      </span>
      <Button onClick={onSave} disabled={!dirty}>
        Speichern
      </Button>
    </>
  );
}

function SettingsPage({
  variant = "tabs",
  urlParam,
}: {
  variant?: "tabs" | "sections";
  urlParam?: string;
}) {
  const [name, setName] = useState("Fachschaft Deutsch");
  const [saved, setSaved] = useState("Fachschaft Deutsch");
  const [digest, setDigest] = useState(true);
  const dirty = name !== saved;
  const form = (children: ReactNode) => (
    <div className="flex max-w-[34rem] flex-col gap-4">{children}</div>
  );
  const base: TabbedPageTab[] = [
    {
      id: "profil",
      label: "Profil",
      dirty,
      content: form(
        <>
          <Field label="Name der Gruppe" help="Erscheint in Einladungen und auf dem Dashboard.">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Beschreibung">
            <Textarea rows={3} defaultValue="Material und Absprachen für die Jahrgänge 5 bis 10." />
          </Field>
        </>
      ),
      footer: <SaveBar dirty={dirty} onSave={() => setSaved(name)} />,
    },
    {
      id: "benachrichtigungen",
      label: "Benachrichtigungen",
      badge: <Badge>2</Badge>,
      content: form(
        <>
          <Field label="Tägliche Zusammenfassung" layout="inline">
            <Switch checked={digest} onCheckedChange={setDigest} />
          </Field>
          <p className="m-0 text-[13px] text-hn-ink-muted">Wird automatisch gespeichert.</p>
        </>
      ),
    },
    {
      id: "darstellung",
      label: "Darstellung",
      content: form(<p className="m-0 text-sm">Theme, Dichte und Schriftgröße.</p>),
    },
    {
      id: "mitglieder",
      label: "Mitglieder",
      content: form(<p className="m-0 text-sm">14 Lehrkräfte, 2 Einladungen offen.</p>),
    },
    {
      id: "sicherheit",
      label: "Sicherheit",
      content: form(<p className="m-0 text-sm">Anmeldung, Sitzungen, Zwei-Faktor.</p>),
    },
    {
      id: "integrationen",
      label: "Integrationen",
      content: form(<p className="m-0 text-sm">Kalender, Stundenplan, Dateiablage.</p>),
    },
  ];
  const tabs: TabbedPageTab[] =
    variant === "sections"
      ? [
          ...base,
          {
            id: "export",
            label: "Export",
            content: form(<p className="m-0 text-sm">Noten und Listen als CSV.</p>),
          },
          {
            id: "archiv",
            label: "Archiv",
            content: form(<p className="m-0 text-sm">Abgeschlossene Schuljahre.</p>),
          },
        ]
      : base;
  return (
    <TabbedPage
      locale="de"
      title="Einstellungen"
      tabs={tabs}
      variant={variant}
      url={urlParam ? { param: urlParam, history: "replace" } : false}
      onDiscard={() => setName(saved)}
      commandHotkey={false}
    />
  );
}

// --- Wizard -------------------------------------------------------------------------------

function ClassWizard() {
  const [name, setName] = useState("7b");
  const [finished, setFinished] = useState(false);
  if (finished)
    return (
      <div className="flex h-full items-center justify-center text-sm" data-wizard-finished="">
        Klasse 7b angelegt.
      </div>
    );
  return (
    <Wizard
      locale="de"
      layout="focus"
      title="Neue Klasse anlegen"
      commandHotkey={false}
      dirty
      draft={{ step: "faecher", done: ["grunddaten"] }}
      errors={{ schueler: "2 Schüler ohne E-Mail-Adresse." }}
      onCancel={noop}
      onFinish={() => setFinished(true)}
      steps={[
        {
          id: "grunddaten",
          label: "Grunddaten",
          validate: () => (name.trim() ? true : "Die Klasse braucht einen Namen."),
          content: (
            <>
              <Field label="Name der Klasse" required>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Schuljahr">
                <Input defaultValue="2026/27" />
              </Field>
            </>
          ),
        },
        {
          id: "schueler",
          label: "Schüler",
          description: "Liste einfügen oder einzeln anlegen.",
          content: (
            <Field label="Schülerliste" help="Ein Name pro Zeile, E-Mail nach einem Komma.">
              <Textarea
                rows={5}
                defaultValue={"Ada Beispiel, ada@example.org\nBo Muster\nCem Probe"}
              />
            </Field>
          ),
        },
        {
          id: "faecher",
          label: "Fächer",
          description: "Welche Fächer unterrichtest du in dieser Klasse?",
          content: (
            <Field label="Fach">
              <RadioGroup defaultValue="deutsch" aria-label="Fach">
                <RadioGroupItem value="deutsch" label="Deutsch" />
                <RadioGroupItem value="englisch" label="Englisch" />
                <RadioGroupItem value="geschichte" label="Geschichte" />
              </RadioGroup>
            </Field>
          ),
        },
        {
          id: "zusammenfassung",
          label: "Zusammenfassung",
          content: (
            <dl className="m-0 grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
              <dt className="text-hn-ink-muted">Klasse</dt>
              <dd className="m-0">{name}</dd>
              <dt className="text-hn-ink-muted">Schüler</dt>
              <dd className="m-0">3</dd>
              <dt className="text-hn-ink-muted">Fach</dt>
              <dd className="m-0">Deutsch</dd>
            </dl>
          ),
        },
      ]}
    />
  );
}

// --- Create queue -------------------------------------------------------------------------

type Vocab = { id: string; word: string; translation: string };

const VOCAB: Vocab[] = [
  { id: "v1", word: "the harbour", translation: "der Hafen" },
  { id: "v2", word: "to borrow", translation: "ausleihen" },
  { id: "v3", word: "the lighthouse", translation: "der Leuchtturm" },
  { id: "v4", word: "reliable", translation: "zuverlässig" },
];

function VocabQueue() {
  const [items, setItems] = useState<Vocab[]>(VOCAB);
  const [editing, setEditing] = useState<string | null>(null);
  const [word, setWord] = useState("");
  const [translation, setTranslation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const reset = () => {
    setEditing(null);
    setWord("");
    setTranslation("");
    setError(null);
  };
  const list: QueueItem[] = items.map((v) => ({
    id: v.id,
    label: v.word,
    meta: v.translation,
  }));
  return (
    <Queue
      mode="create"
      locale="de"
      title="Unit 4: At the coast"
      commandHotkey={false}
      items={list}
      editing={editing}
      onExit={noop}
      onFinish={noop}
      onEdit={(item) => {
        const v = items.find((i) => i.id === item.id);
        if (!v) return;
        setEditing(v.id);
        setWord(v.word);
        setTranslation(v.translation);
      }}
      onCancelEdit={reset}
      onRemove={(item) => setItems((all) => all.filter((v) => v.id !== item.id))}
      onSave={() => {
        if (!word.trim() || !translation.trim()) {
          setError("Wort und Übersetzung ausfüllen.");
          return false;
        }
        setItems((all) =>
          editing
            ? all.map((v) => (v.id === editing ? { ...v, word, translation } : v))
            : [...all, { id: `v${all.length + 1}-${word}`, word, translation }]
        );
        reset();
      }}
      form={
        <>
          <Field label="Wort" required error={error && !word.trim() ? error : undefined}>
            <Input value={word} onChange={(e) => setWord(e.target.value)} lang="en" />
          </Field>
          <Field
            label="Übersetzung"
            required
            error={error && word.trim() && !translation.trim() ? error : undefined}
          >
            <Input value={translation} onChange={(e) => setTranslation(e.target.value)} />
          </Field>
          <Field label="Beispielsatz" help="Optional.">
            <Input lang="en" />
          </Field>
        </>
      }
    />
  );
}

// --- Review queue -------------------------------------------------------------------------

type Submission = { id: string; who: string; answer: string; status: QueueStatus; points?: number };

const SUBMISSIONS: Submission[] = [
  {
    id: "s1",
    who: "Schüler A",
    answer: "Der Leuchtturm warnt Schiffe vor der Küste.",
    status: "done",
    points: 3,
  },
  { id: "s2", who: "Schüler B", answer: "Der Leuchtturm ist hoch.", status: "done", points: 1 },
  {
    id: "s3",
    who: "Schüler C",
    answer: "Er zeigt den Schiffen nachts den Weg in den Hafen.",
    status: "open",
  },
  { id: "s4", who: "Schüler D", answer: "Damit man ihn sieht.", status: "skipped" },
  {
    id: "s5",
    who: "Schüler E",
    answer: "Sein Licht dreht sich, damit Schiffe die Felsen erkennen.",
    status: "open",
  },
  { id: "s6", who: "Schüler F", answer: "—", status: "open" },
];

function GradingQueue() {
  const [subs, setSubs] = useState<Submission[]>(SUBMISSIONS);
  const [points, setPoints] = useState<Record<string, string>>({});
  const set = (id: string, patch: Partial<Submission>) =>
    setSubs((all) => all.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const items: QueueItem[] = subs.map((s) => ({
    id: s.id,
    label: s.who,
    status: s.status,
    meta: s.points !== undefined ? `${s.points}/3 Punkte` : undefined,
  }));
  return (
    <Queue
      mode="review"
      locale="de"
      title="Test 3: Leseverstehen"
      commandHotkey={false}
      items={items}
      onExit={noop}
      onFinish={noop}
      actions={[
        {
          id: "grade",
          label: "Bewerten",
          shortcut: "Enter",
          variant: "primary",
          run: (item) => set(item.id, { status: "done", points: Number(points[item.id] ?? "0") }),
        },
        {
          id: "flag",
          label: "Markieren",
          shortcut: "m",
          run: (item) => set(item.id, { status: "flagged" }),
        },
        {
          id: "skip",
          label: "Überspringen",
          shortcut: "s",
          variant: "ghost",
          run: (item) => set(item.id, { status: "skipped" }),
        },
      ]}
      renderItem={(item) => {
        const sub = subs.find((s) => s.id === item.id);
        return (
          <>
            <div className="flex items-center justify-between gap-3">
              <h2 className="m-0 text-[17px] font-semibold">{item.label}</h2>
              <Badge>Aufgabe 2</Badge>
            </div>
            <p className="m-0 text-[13px] text-hn-ink-muted">
              Wozu dient ein Leuchtturm? Antworte in einem Satz.
            </p>
            <blockquote className="m-0 rounded-hn-lg border border-hn-line-subtle bg-hn-surface-raised px-4 py-3 text-[15px]">
              {sub?.answer}
            </blockquote>
            <Field label="Punkte">
              <RadioGroup
                orientation="horizontal"
                value={points[item.id] ?? (sub?.points !== undefined ? String(sub.points) : "")}
                onValueChange={(v) => setPoints((p) => ({ ...p, [item.id]: v }))}
              >
                {["0", "1", "2", "3"].map((p) => (
                  <RadioGroupItem key={p} value={p} label={p} />
                ))}
              </RadioGroup>
            </Field>
          </>
        );
      }}
    />
  );
}

// --- Scene --------------------------------------------------------------------------------

const STEPPER_DEMO: StepperStep[] = [
  { id: "a", label: "Grunddaten", status: "done" },
  { id: "b", label: "Schüler", status: "error" },
  { id: "c", label: "Fächer", status: "current" },
  { id: "d", label: "Zusammenfassung", status: "open" },
];

function readPattern(): PatternId {
  if (typeof window === "undefined") return "tabs";
  const value = new URLSearchParams(window.location.search).get("pattern");
  return PATTERNS.find((p) => p.id === value)?.id ?? "tabs";
}

function Story({ id, phone, children }: { id: string; phone: boolean; children: ReactNode }) {
  const story = SHELL_STORIES.find((s) => s.id === (phone ? "phone" : "desktop"));
  if (!story) return null;
  return (
    <div data-story={id}>
      <Frame width={story.width} height={story.height} phone={phone}>
        {children}
      </Frame>
    </div>
  );
}

function demo(pattern: PatternId, phone: boolean): ReactNode {
  switch (pattern) {
    case "tabs":
      return <SettingsPage urlParam={phone ? undefined : "tab"} />;
    case "wizard":
      return <ClassWizard />;
    case "create":
      return <VocabQueue />;
    case "review":
      return <GradingQueue />;
  }
}

export function PatternsScene() {
  const [pattern, setPattern] = useState<PatternId>(readPattern);
  const pick = (next: PatternId) => {
    setPattern(next);
    const url = new URL(window.location.href);
    if (next === "tabs") url.searchParams.delete("pattern");
    else url.searchParams.set("pattern", next);
    url.searchParams.delete("tab");
    window.history.replaceState(null, "", url);
  };
  const current = PATTERNS.find((p) => p.id === pattern);
  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-10 px-4 py-10 sm:px-10">
      <header className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-hn-ink-muted">@hansenexus/shell 0.4</span>
        <h1 className="m-0 font-hn-display text-[32px] leading-tight font-semibold tracking-[-0.02em] sm:text-[44px]">
          Page patterns
        </h1>
        <p className="m-0 max-w-[68ch] text-sm text-hn-ink-body">
          Ready-made pages on top of the shell's layouts, so long forms and repeated work no longer
          sit on one endless page. The pack switcher skins every frame.
        </p>
        <fieldset className="relative m-0 mt-2 flex w-fit flex-wrap gap-1 rounded-hn-md border border-hn-line-subtle p-1">
          <legend className="sr-only">Pattern</legend>
          {PATTERNS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={p.id === pattern}
              data-pattern-pick={p.id}
              onClick={() => pick(p.id)}
              className={cx(
                "min-h-hn-target cursor-pointer rounded-hn-sm px-3 font-hn-mono text-[13px]",
                p.id === pattern
                  ? "bg-hn-nav-active text-hn-nav-active-ink"
                  : "text-hn-ink-muted hover:text-hn-ink-primary"
              )}
            >
              {p.label}
            </button>
          ))}
        </fieldset>
        <p className="m-0 max-w-[68ch] text-[13px] text-hn-ink-muted" data-pattern-note="">
          {current?.note}
        </p>
      </header>
      <div className="flex flex-col gap-10">
        {[false, true].map((phone) => (
          <PreviewCard
            key={`${pattern}-${phone ? "phone" : "desktop"}`}
            title={`${current?.label} · ${phone ? "Phone, 390 px" : "Desktop, 1280 px"}`}
            item="shell"
            wide
          >
            <Story id={`${pattern}-${phone ? "phone" : "desktop"}`} phone={phone}>
              {demo(pattern, phone)}
            </Story>
          </PreviewCard>
        ))}
        {pattern === "tabs" ? (
          <PreviewCard title="Tabs · sections variant · Desktop, 1280 px" item="shell" wide>
            <Story id="tabs-sections-desktop" phone={false}>
              <SettingsPage variant="sections" />
            </Story>
          </PreviewCard>
        ) : null}
        {pattern === "wizard" ? (
          <PreviewCard title="Stepper: full and compact" item="stepper">
            <div className="flex flex-col gap-6" data-story="stepper">
              <Stepper steps={STEPPER_DEMO} locale="de" onStepSelect={noop} />
              <Stepper steps={STEPPER_DEMO} locale="de" variant="compact" current={2} />
            </div>
          </PreviewCard>
        ) : null}
      </div>
    </main>
  );
}
