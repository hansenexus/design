// hansenexus/design#91: the toolbar's speed and reduced motion reach every motion consumer. TS
// timers read the motion tokens through motionMs/useMotionMs, which a MotionProvider scales; CSS
// reads the --hn-* variables, and motion-reduce: also matches a data-reduced-motion attribute.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, jest, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { ms } from "@hansenexus/tokens";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { motionVariables } from "../gallery/view";
import { MotionProvider, motionMs, Spinner, useDelayedVisibility } from "../src";

const ROOT = resolve(import.meta.dir, "..");

describe("motionMs", () => {
  test("scale 1 is the tokens as they are", () => {
    expect(motionMs()).toEqual(ms);
  });

  test("every token times the scale, 0 for reduced motion", () => {
    const slow = motionMs(4);
    const reduced = motionMs(0);
    for (const [group, values] of Object.entries(ms))
      for (const [key, value] of Object.entries(values)) {
        expect(slow[group as keyof typeof ms]).toHaveProperty(key, value * 4);
        expect(reduced[group as keyof typeof ms]).toHaveProperty(key, 0);
      }
    expect(slow.delay.pending).toBe(800);
    expect(slow["min-visible"].pending).toBe(1600);
  });

  test("the TS scale and the CSS variables agree at every gallery speed", () => {
    for (const [speed, scale] of [
      ["0.5", 2],
      ["0.25", 4],
    ] as const) {
      const vars = motionVariables({ speed, motion: "full" });
      expect(vars["--hn-delay-pending"]).toBe(`${motionMs(scale).delay.pending}ms`);
      expect(vars["--hn-spin-duration"]).toBe(`${motionMs(scale).spin.duration}ms`);
    }
  });
});

describe("timers under a MotionProvider", () => {
  let container: HTMLElement;
  let root: Root;

  beforeAll(() => {
    GlobalRegistrator.register();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  });
  afterAll(async () => {
    await GlobalRegistrator.unregister();
  });
  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.useRealTimers();
  });

  const render = (node: ReactNode) => act(() => root.render(node));
  const advance = (time: number) => act(() => jest.advanceTimersByTime(time));

  function Probe({ pending, delayMs }: { pending: boolean; delayMs?: number }) {
    const visible = useDelayedVisibility(pending, delayMs === undefined ? undefined : { delayMs });
    return <span>{visible ? "shown" : "hidden"}</span>;
  }

  test("without a provider the defaults are the tokens: 200 ms, then at least 400 ms", () => {
    render(<Probe pending />);
    advance(199);
    expect(container.textContent).toBe("hidden");
    advance(1);
    expect(container.textContent).toBe("shown");
    render(<Probe pending={false} />);
    advance(399);
    expect(container.textContent).toBe("shown");
    advance(1);
    expect(container.textContent).toBe("hidden");
  });

  test("at scale 4 (speed 0.25x) the delay is 800 ms and the minimum 1600 ms", () => {
    const at = (pending: boolean) => (
      <MotionProvider scale={4}>
        <Probe pending={pending} />
      </MotionProvider>
    );
    render(at(true));
    advance(799);
    expect(container.textContent).toBe("hidden");
    advance(1);
    expect(container.textContent).toBe("shown");
    render(at(false));
    advance(1599);
    expect(container.textContent).toBe("shown");
    advance(1);
    expect(container.textContent).toBe("hidden");
  });

  test("a Spinner without delayMs follows the provider", () => {
    render(
      <MotionProvider scale={4}>
        <Spinner label="Saving" />
      </MotionProvider>
    );
    advance(799);
    expect(container.querySelector("svg")).toBeNull();
    advance(1);
    expect(container.querySelector("svg")?.getAttribute("aria-label")).toBe("Saving");
  });

  test("at scale 0 (reduced motion) the indicator has no delay and no minimum", () => {
    const at = (pending: boolean) => (
      <MotionProvider scale={0}>
        <Probe pending={pending} />
      </MotionProvider>
    );
    render(at(true));
    advance(0);
    expect(container.textContent).toBe("shown");
    render(at(false));
    expect(container.textContent).toBe("hidden");
  });

  test("an explicit delayMs is the caller's own and is not scaled", () => {
    render(
      <MotionProvider scale={4}>
        <Probe pending delayMs={50} />
      </MotionProvider>
    );
    advance(50);
    expect(container.textContent).toBe("shown");
  });
});

/** Every .ts and .tsx file under `dir`, recursively. */
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe("the scaled source is the only way to the ms tokens", () => {
  // src/motion.tsx is the scaled source itself. Anything else that imports `ms` would run its
  // timers at speed 1 whatever the toolbar says: read motionMs() or useMotionMs() instead.
  const ALLOWED = new Set(["src/motion.tsx"]);
  const IMPORT = /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*"@hansenexus\/tokens"/g;

  test("no component, gallery or shell file imports ms from @hansenexus/tokens", () => {
    const files = [
      ...sources(join(ROOT, "src")),
      ...sources(join(ROOT, "gallery")),
      ...sources(join(ROOT, "../shell/src")),
    ];
    expect(files.length).toBeGreaterThan(50);
    const offenders = files
      .map((file) => relative(ROOT, file))
      .filter((file) => !ALLOWED.has(file))
      .filter((file) => {
        const text = readFileSync(join(ROOT, file), "utf8");
        const named = [...text.matchAll(IMPORT)].some((m) =>
          (m[1] ?? "").split(",").some((name) => /^ms\b/.test(name.trim()))
        );
        return named || /\bimport\s+\*\s+as\s+\w+\s+from\s+"@hansenexus\/tokens"/.test(text);
      });
    expect(offenders).toEqual([]);
  });

  test("the check catches a direct import", () => {
    const text = 'import { type Theme, ms } from "@hansenexus/tokens";';
    const names = [...text.matchAll(IMPORT)].flatMap((m) => (m[1] ?? "").split(","));
    expect(names.some((name) => /^ms\b/.test(name.trim()))).toBe(true);
  });
});

describe("motion-reduce: follows data-reduced-motion as well as the OS", () => {
  test("the built styles.css has both forms of every motion-reduce: rule", () => {
    const css = readFileSync(join(ROOT, "dist/styles.css"), "utf8");
    for (const name of ["transition-none", "animate-none"]) {
      const rule = `.motion-reduce\\:${name}`;
      expect(css).toContain(`@media (prefers-reduced-motion: reduce) {\n    ${rule} {`);
      expect(css).toContain(`${rule}:where([data-reduced-motion], [data-reduced-motion] *) {`);
    }
  });
});
