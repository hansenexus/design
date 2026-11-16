// hansenexus/design#167: the kit AlertDialog, the marked layout of the vote
// (decisions/alert-dialog.json). Rendered for real in happy-dom, since Radix portals the content.
import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import type { Root } from "react-dom/client";
import type { AlertDialogTone } from "../src";

// Radix picks its layout effect when its module loads, by whether a document exists; the DOM has
// to be in place before react-dom and the kit load, so they are imported after registering.
GlobalRegistrator.register();
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const {
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
  AlertDialogTrigger,
  Button,
} = await import("../src");
const { loadRegistry } = await import("../scripts/registry");
const { ITEM_SCENES } = await import("../gallery/levels");

function Ask({
  tone,
  open,
  onOpenChange,
  onAction,
}: {
  tone?: AlertDialogTone;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAction?: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        <Button>Open</Button>
      </AlertDialogTrigger>
      <AlertDialogContent tone={tone}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete kran-03?</AlertDialogTitle>
          <AlertDialogDescription>Its disks are wiped.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogConsequences label="What happens">
          <AlertDialogConsequence>2 volumes are erased</AlertDialogConsequence>
          <AlertDialogConsequence>3 pods move</AlertDialogConsequence>
        </AlertDialogConsequences>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onAction}>Delete kran-03</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

describe("AlertDialog", () => {
  let container: HTMLElement;
  let root: Root;

  afterAll(async () => {
    await GlobalRegistrator.unregister();
  });
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const dialog = () => document.querySelector('[role="alertdialog"]');
  const button = (name: string) =>
    [...document.querySelectorAll("button")].find((b) => b.textContent === name);

  test("is a named, described alertdialog with focus on Cancel", () => {
    act(() => root.render(<Ask open />));
    const el = dialog();
    expect(el).not.toBeNull();
    const title = el?.querySelector("h2");
    expect(title?.textContent).toBe("Delete kran-03?");
    expect(el?.getAttribute("aria-labelledby")).toBe(title?.id ?? "missing");
    const description = el?.querySelector("p");
    expect(el?.getAttribute("aria-describedby")).toBe(description?.id ?? "missing");
    expect(document.activeElement?.textContent).toBe("Cancel");
  });

  test("destructive is the default: crit rule, crit glyphs, danger action", () => {
    act(() => root.render(<Ask open />));
    const el = dialog();
    expect(el?.getAttribute("data-tone")).toBe("destructive");
    expect(el?.className).toContain("border-t-hn-status-crit");
    const mark = el?.querySelector("[data-mark]");
    expect(mark?.getAttribute("aria-hidden")).toBe("true");
    expect(mark?.className).toContain("bg-hn-status-crit/15");
    expect(el?.querySelectorAll("li svg.fill-hn-status-crit")).toHaveLength(2);
    expect(button("Delete kran-03")?.getAttribute("data-variant")).toBe("danger");
    expect(button("Cancel")?.getAttribute("data-variant")).toBe("secondary");
  });

  test("neutral: no rule, the info glyph on a raised tile, busy marks, primary action", () => {
    act(() => root.render(<Ask open tone="neutral" />));
    const el = dialog();
    expect(el?.getAttribute("data-tone")).toBe("neutral");
    expect(el?.className).not.toContain("border-t-hn-status-crit");
    expect(el?.querySelector("[data-mark]")?.className).toContain("bg-hn-surface-raised");
    expect(el?.querySelectorAll("li svg.stroke-hn-status-busy")).toHaveLength(2);
    expect(button("Delete kran-03")?.getAttribute("data-variant")).toBe("primary");
  });

  test("the consequences sit under their label, one item per fact", () => {
    act(() => root.render(<Ask open />));
    const items = [...(dialog()?.querySelectorAll("li") ?? [])].map((li) => li.textContent);
    expect(items).toEqual(["2 volumes are erased", "3 pods move"]);
    expect(dialog()?.textContent).toContain("What happens");
  });

  test("the trigger opens it, Cancel closes it without acting", () => {
    let acted = 0;
    act(() => root.render(<Ask onAction={() => acted++} />));
    expect(dialog()).toBeNull();
    act(() => button("Open")?.click());
    expect(dialog()).not.toBeNull();
    act(() => button("Cancel")?.click());
    expect(dialog()).toBeNull();
    expect(acted).toBe(0);
  });

  test("the action acts and closes", () => {
    let acted = 0;
    const changes: boolean[] = [];
    act(() =>
      root.render(<Ask open onOpenChange={(o) => changes.push(o)} onAction={() => acted++} />)
    );
    act(() => button("Delete kran-03")?.click());
    expect(acted).toBe(1);
    expect(changes).toEqual([false]);
  });

  test("Escape cancels", () => {
    const changes: boolean[] = [];
    act(() => root.render(<Ask open onOpenChange={(o) => changes.push(o)} />));
    act(() => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    });
    expect(changes).toEqual([false]);
  });

  test("a registry molecule with its own gallery scene", () => {
    const item = loadRegistry().items.find((i) => i.name === "alert-dialog");
    expect(item?.meta?.level).toBe("molecule");
    expect(item?.files?.map((f) => f.path)).toEqual(["src/alert-dialog.tsx"]);
    expect(ITEM_SCENES["alert-dialog"]).toBe("alert-dialog");
  });
});
