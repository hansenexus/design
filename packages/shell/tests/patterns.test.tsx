import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  firstOpen,
  matchesShortcut,
  nextOpen,
  PATTERN_COPY,
  Queue,
  type QueueItem,
  readTabParam,
  stepItem,
  TabbedPage,
  type TabbedPageTab,
  Wizard,
  type WizardStep,
  withTabParam,
  wizardStatuses,
} from "../src";
import { isTyping, ownsArrows } from "../src/patterns-shared";

const render = renderToStaticMarkup;
const noop = () => {};

const TABS: TabbedPageTab[] = [
  {
    id: "profil",
    label: "Profil",
    content: <p>Profil-Formular</p>,
    footer: <span>Gespeichert</span>,
  },
  { id: "mitglieder", label: "Mitglieder", content: <p>Liste</p>, badge: 2 },
  { id: "export", label: "Export", content: <p>Export</p>, dirty: true },
];

const STEPS: WizardStep[] = [
  { id: "grunddaten", label: "Grunddaten", content: <input name="name" /> },
  { id: "faecher", label: "Fächer", content: <input name="fach" /> },
  { id: "schueler", label: "Schüler", content: <input name="schueler" /> },
];

const ITEMS: QueueItem[] = [
  { id: "a", label: "Anna", status: "done" },
  { id: "b", label: "Ben" },
  { id: "c", label: "Cem", status: "skipped" },
  { id: "d", label: "Dana" },
];

describe("TabbedPage helpers", () => {
  test("readTabParam takes a known id and ignores the rest", () => {
    expect(readTabParam("?tab=export&x=1", "tab", ["profil", "export"])).toBe("export");
    expect(readTabParam("?tab=nope", "tab", ["profil"])).toBeUndefined();
    expect(readTabParam("", "tab", ["profil"])).toBeUndefined();
  });

  test("withTabParam sets the param and keeps the rest of the URL", () => {
    expect(withTabParam("https://x.test/s?a=1#h", "tab", "export")).toBe(
      "https://x.test/s?a=1&tab=export#h"
    );
    expect(withTabParam("https://x.test/s?tab=profil", "tab", "export")).toBe(
      "https://x.test/s?tab=export"
    );
  });
});

describe("TabbedPage", () => {
  test("tabs: a manual tablist in the header, the active tab's panel and footer", () => {
    const html = render(<TabbedPage title="Einstellungen" tabs={TABS} url={false} locale="de" />);
    expect(html).toContain('data-tabbed-page="tabs"');
    expect(html).toMatch(/role="tablist"[^>]*aria-orientation="horizontal"/);
    expect(html).toMatch(
      /data-tab-id="profil"[^>]*aria-selected="true"|aria-selected="true"[^>]*data-tab-id="profil"/
    );
    expect(html).toContain("Profil-Formular");
    expect(html).not.toContain(">Liste<");
    expect(html).toContain("Gespeichert");
  });

  test("value picks the tab; a dirty tab carries a marker, a badge its count", () => {
    const html = render(<TabbedPage title="E" tabs={TABS} value="export" url={false} />);
    expect(html).toContain(">Export</p>");
    expect(html).not.toContain("Profil-Formular");
    expect(html).toMatch(/data-tab-dirty=""/);
    expect(html).toMatch(/>2</);
  });

  test("sections: a vertical list beside the panel", () => {
    const html = render(<TabbedPage title="E" tabs={TABS} variant="sections" url={false} />);
    expect(html).toMatch(/role="tablist"[^>]*aria-orientation="vertical"/);
    expect(html).toContain('data-tabbed-page="sections"');
  });
});

describe("Wizard", () => {
  test("wizardStatuses: an error wins, then current, then done or open", () => {
    expect(wizardStatuses(["a", "b", "c", "d"], 2, new Set(["a", "b"]), { a: "x" })).toEqual([
      "error",
      "done",
      "current",
      "open",
    ]);
  });

  test("resumes at the draft's step, done steps before it are buttons back", () => {
    const html = render(
      <Wizard
        title="Neue Klasse"
        steps={STEPS}
        draft={{ step: "faecher", done: ["grunddaten"] }}
        onCancel={noop}
        onFinish={noop}
        locale="de"
      />
    );
    expect(html).toContain('data-layout="focus"');
    expect(html).toContain('data-wizard-step="faecher"');
    expect(html).toMatch(/data-step="faecher"[^>]*aria-current="step"/);
    expect(html).toMatch(/data-step="grunddaten"[^>]*>.*?data-step-select=""/);
    expect(html).toContain("Schritt 2 von 3");
    expect(html).toContain('data-wizard="back"');
    expect(html).toContain('data-wizard="next"');
    expect(html).not.toContain('data-wizard="finish"');
  });

  test("the footer's submit belongs to the step's form; the last step says Fertig", () => {
    const html = render(
      <Wizard
        title="T"
        steps={STEPS}
        draft={{ step: "schueler", done: ["grunddaten", "faecher"] }}
        onCancel={noop}
        onFinish={noop}
        locale="de"
      />
    );
    const form = html.match(/<form id="([^"]+)"/)?.[1];
    expect(form).toBeDefined();
    expect(html).toContain(`form="${form}" data-wizard="finish"`);
    expect(html).toContain(PATTERN_COPY.de.wizardFinish);
  });

  test("an app error marks the step and shows on it", () => {
    const html = render(
      <Wizard
        title="T"
        steps={STEPS}
        layout="session"
        errors={{ grunddaten: "Name schon vergeben" }}
        onCancel={noop}
        onFinish={noop}
      />
    );
    expect(html).toContain('data-layout="session"');
    expect(html).toMatch(/data-step="grunddaten"[^>]*data-status="error"/);
    expect(html).toContain("Name schon vergeben");
    expect(html).not.toContain('data-wizard="back"');
  });
});

describe("Queue helpers", () => {
  test("firstOpen and nextOpen skip handled items and wrap", () => {
    expect(firstOpen(ITEMS)).toBe("b");
    expect(nextOpen(ITEMS, "b")).toBe("d");
    expect(nextOpen(ITEMS, "d")).toBe("b");
    expect(nextOpen([{ id: "x", label: "X" }], "x")).toBeNull();
    expect(firstOpen([])).toBeNull();
  });

  test("stepItem clamps at the ends", () => {
    expect(stepItem(ITEMS, "a", -1)).toBe("a");
    expect(stepItem(ITEMS, "a", 1)).toBe("b");
    expect(stepItem(ITEMS, "d", 1)).toBe("d");
    expect(stepItem(ITEMS, null, -1)).toBe("d");
    expect(stepItem([], "a", 1)).toBeNull();
  });

  test("matchesShortcut: one key without case, named keys exact, no modifiers", () => {
    const key = (k: string, mod = false) => ({
      key: k,
      ctrlKey: mod,
      metaKey: false,
      altKey: false,
    });
    expect(matchesShortcut(key("M"), "m")).toBe(true);
    expect(matchesShortcut(key("Enter"), "Enter")).toBe(true);
    expect(matchesShortcut(key("m", true), "m")).toBe(false);
    expect(matchesShortcut(key("n"), "m")).toBe(false);
  });
});

describe("Queue", () => {
  test("review: resumes at the first open item, progress counts the handled ones", () => {
    const html = render(
      <Queue
        mode="review"
        title="Klausur 3"
        items={ITEMS}
        onExit={noop}
        actions={[
          { id: "ok", label: "Bewerten", shortcut: "Enter", run: noop },
          { id: "flag", label: "Markieren", shortcut: "m", run: noop },
        ]}
        renderItem={(item) => <p>Arbeit von {item.label}</p>}
        locale="de"
      />
    );
    expect(html).toContain('data-layout="session"');
    expect(html).toContain("Arbeit von Ben");
    expect(html).toContain('data-queue="help"');
    expect(html).toContain('data-queue="next"');
    expect(html).toMatch(
      /data-queue-action="flag" aria-keyshortcuts="m">Markieren<span aria-hidden="true" data-shortcut-hint=""/
    );
  });

  test("review: nothing open shows the done state", () => {
    const html = render(
      <Queue
        mode="review"
        title="T"
        items={[{ id: "a", label: "A", status: "done" }]}
        onExit={noop}
        actions={[]}
        renderItem={() => null}
        onFinish={noop}
        locale="de"
      />
    );
    expect(html).toContain('data-queue-done=""');
    expect(html).toContain(PATTERN_COPY.de.queueDoneTitle);
  });

  test("create: the form, the count and a save button for it", () => {
    const html = render(
      <Queue
        mode="create"
        title="Vokabeln"
        items={ITEMS}
        onExit={noop}
        form={<input name="wort" />}
        onSave={noop}
        locale="de"
      />
    );
    const form = html.match(/<form id="([^"]+)"[^>]*data-queue-form="new"/)?.[1];
    expect(form).toBeDefined();
    expect(html).toContain('data-queue-count=""');
    expect(html).toMatch(
      new RegExp(`form="${form}"[^>]*data-queue="save"|data-queue="save"[^>]*form="${form}"`)
    );
  });

  test("the list opens in the aside when asked to", () => {
    const html = render(
      <Queue
        mode="create"
        title="V"
        items={ITEMS}
        onExit={noop}
        form={null}
        onSave={noop}
        defaultListOpen
      />
    );
    expect(html).toMatch(/<aside[^>]*>[\s\S]*data-queue-row="a"/);
    expect(html.match(/data-queue-row="/g)?.length).toBe(4);
  });
});

describe("key routing", () => {
  const el = (tag: string, attrs: Record<string, unknown> = {}) =>
    ({
      tagName: tag,
      isContentEditable: false,
      closest: (sel: string) => (attrs.inside && sel.includes(String(attrs.inside)) ? {} : null),
      ...attrs,
    }) as unknown as EventTarget;

  test("isTyping: text fields yes, checkboxes and buttons no", () => {
    expect(isTyping(el("INPUT", { type: "text" }))).toBe(true);
    expect(isTyping(el("TEXTAREA"))).toBe(true);
    expect(isTyping(el("INPUT", { type: "radio" }))).toBe(false);
    expect(isTyping(el("BUTTON"))).toBe(false);
    expect(isTyping(null)).toBe(false);
  });

  test("ownsArrows: inside a radio group or tablist", () => {
    expect(ownsArrows(el("BUTTON", { inside: "radiogroup" }))).toBe(true);
    expect(ownsArrows(el("BUTTON"))).toBe(false);
  });
});
