// The session layout's stories (design#239 addendum): learning, reading and play on a page of
// their own. Four pages, each at desktop and phone size, skinned by the toolbar's pack:
// a flashcard review (footer), a reading passage (reading tools in the footer), a timed test
// (a timer in the status slot) and a live quiz host (a wide board, no footer).
// The content is invented; no real people or places.
import { useState } from "react";
import { SessionFooter, SessionHeader, Shell } from "../../shell/src";
import { Badge, Button, cx } from "../src";

export type SessionKind = "flashcard" | "reading" | "test" | "quiz";

export const SESSION_KINDS: readonly { id: SessionKind; label: string }[] = [
  { id: "flashcard", label: "Flashcard review" },
  { id: "reading", label: "Reading passage" },
  { id: "test", label: "Timed test" },
  { id: "quiz", label: "Live quiz host" },
];

type PageProps = { onExit: () => void };

function Clock() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function Flashcard({ onExit }: PageProps) {
  const [shown, setShown] = useState(false);
  return (
    <Shell
      layout="session"
      header={
        <SessionHeader
          title="Deck 3: Strong verbs"
          onExit={onExit}
          confirmExit
          progress={{ value: 7, max: 20, label: "Cards reviewed" }}
          status={<Badge>Streak 5</Badge>}
        />
      }
      footer={
        <SessionFooter align={shown ? "between" : "center"}>
          {shown ? (
            <>
              <Button variant="secondary" onClick={() => setShown(false)}>
                Again
              </Button>
              <Button variant="secondary" onClick={() => setShown(false)}>
                Good
              </Button>
              <Button onClick={() => setShown(false)}>Easy</Button>
            </>
          ) : (
            <Button className="w-full @3xl:w-auto" onClick={() => setShown(true)}>
              Reveal
            </Button>
          )}
        </SessionFooter>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-6">
        <div
          data-flashcard=""
          className="flex w-full flex-col items-center gap-3 rounded-hn-lg border border-hn-line-subtle bg-hn-surface-raised px-6 py-12 text-center"
        >
          <span className="text-[13px] text-hn-ink-muted">Past tense</span>
          <span className="font-hn-display text-[32px] font-semibold">to swim</span>
          {shown ? (
            <span className="font-hn-display text-[24px] text-hn-ink-body">swam · swum</span>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}

function Reading({ onExit }: PageProps) {
  const [size, setSize] = useState(17);
  return (
    <Shell
      layout="session"
      header={
        <SessionHeader
          title="The lighthouse keeper"
          onExit={onExit}
          progress={{ value: 3, max: 12, label: "Pages read" }}
        />
      }
      footer={
        <SessionFooter align="between">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              aria-label="Smaller text"
              onClick={() => setSize((s) => Math.max(14, s - 1))}
            >
              A−
            </Button>
            <Button
              variant="ghost"
              aria-label="Larger text"
              onClick={() => setSize((s) => Math.min(24, s + 1))}
            >
              A+
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary">Previous</Button>
            <Button>Next page</Button>
          </div>
        </SessionFooter>
      }
    >
      <article
        className="flex flex-col gap-4 text-hn-ink-body"
        style={{ fontSize: size, lineHeight: 1.6 }}
      >
        <h2 className="m-0 font-hn-display text-[1.4em] font-semibold text-hn-ink-primary">
          Chapter one
        </h2>
        <p className="m-0">
          The lamp had burned every night for forty years, and every night someone had climbed the
          hundred and twelve steps to trim its wick. This winter the someone was Ada, who had come
          to the island to forget a city and found instead that she remembered it better here, where
          nothing else competed for the space.
        </p>
        <p className="m-0">
          She kept a logbook as the keepers before her had: wind, sea, ships seen, oil burned. The
          older entries were in a hand that leaned against the margin as if braced for weather. Hers
          stood upright, and she wondered how long that would last.
        </p>
        <p className="m-0">
          On the third night the fog came in so thick that the beam stopped a stone's throw from the
          glass and turned back on itself, and the tower stood inside a lit cloud of its own making.
        </p>
      </article>
    </Shell>
  );
}

const CHOICES = ["Oxygen", "Nitrogen", "Carbon dioxide", "Argon"];

function TimedTest({ onExit }: PageProps) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <Shell
      layout="session"
      header={
        <SessionHeader
          title="Chemistry, unit 4"
          onExit={onExit}
          confirmExit
          progress={{ value: 4, max: 15, label: "Questions answered" }}
          status={
            <span
              data-session-timer=""
              className="inline-flex items-center gap-1.5 font-hn-mono text-hn-ink-primary"
              role="timer"
              aria-label="Time left 12:40"
            >
              <Clock />
              12:40
            </span>
          }
        />
      }
      footer={
        <SessionFooter align="between">
          <Button variant="secondary">Back</Button>
          <Button disabled={picked === null}>Next</Button>
        </SessionFooter>
      }
    >
      <fieldset className="m-0 flex flex-col gap-4 border-0 p-0 py-2">
        <legend className="mb-4 p-0 text-[13px] text-hn-ink-muted">Question 5 of 15</legend>
        <p className="m-0 font-hn-display text-[22px] leading-snug font-semibold">
          Which gas makes up most of the air we breathe?
        </p>
        <div className="flex flex-col gap-2">
          {CHOICES.map((c) => (
            <label
              key={c}
              className={cx(
                "flex min-h-hn-target cursor-pointer items-center gap-3 rounded-hn-md border px-4 py-3",
                picked === c
                  ? "border-hn-nav-active bg-hn-surface-raised"
                  : "border-hn-line-subtle hover:bg-hn-surface-raised"
              )}
            >
              <input
                type="radio"
                name="q5"
                value={c}
                checked={picked === c}
                onChange={() => setPicked(c)}
              />
              {c}
            </label>
          ))}
        </div>
      </fieldset>
    </Shell>
  );
}

const TILES = [
  { key: "A", text: "Mercury" },
  { key: "B", text: "Venus" },
  { key: "C", text: "Mars" },
  { key: "D", text: "Jupiter" },
];

function QuizHost({ onExit }: PageProps) {
  return (
    <Shell
      layout="session"
      measure="board"
      header={
        <SessionHeader
          title="Friday quiz: the solar system"
          onExit={onExit}
          confirmExit
          progress={
            <span data-quiz-round="" className="font-hn-mono text-[13px] text-hn-ink-muted">
              Question 3 of 10
            </span>
          }
          status={
            <>
              <Badge>24 joined</Badge>
              <span className="font-hn-mono text-hn-ink-primary">0:18</span>
            </>
          }
        />
      }
    >
      <div className="flex flex-1 flex-col justify-center gap-6 py-4">
        <p className="m-0 text-center font-hn-display text-[28px] leading-tight font-semibold @3xl:text-[40px]">
          Which planet has the shortest day?
        </p>
        <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-2">
          {TILES.map((t) => (
            <div
              key={t.key}
              className="flex min-h-16 items-center gap-4 rounded-hn-lg border border-hn-line-subtle bg-hn-surface-raised px-5 py-4 @3xl:min-h-24"
            >
              <span className="font-hn-mono text-[13px] text-hn-ink-muted">{t.key}</span>
              <span className="text-[18px] font-semibold @3xl:text-[22px]">{t.text}</span>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

const PAGES = { flashcard: Flashcard, reading: Reading, test: TimedTest, quiz: QuizHost };

/**
 * One session page; the frame decides its breakpoint. A real page would navigate on exit; the
 * story counts exits on data-session-exits, so the interaction specs can see one.
 */
export function SessionDemo({ kind }: { kind: SessionKind }) {
  const [exits, setExits] = useState(0);
  const Page = PAGES[kind];
  return (
    <div className="contents" data-session-exits={exits}>
      <Page onExit={() => setExits((n) => n + 1)} />
    </div>
  );
}
