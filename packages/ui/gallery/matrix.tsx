// The compare matrix (design#149): the current page (a scene, an item with its blast radius, or an
// app screen with its fixture) once per compared theme, in light and dark, at 1280 and 390 px.
// Each cell is the page alone (?bare=1) in an iframe at the row's real width and height, scaled
// down to its column, so every breakpoint and container query applies as in the app. Replay all
// reloads every cell, which replays enter motion and delayed states.
import { useEffect, useRef, useState } from "react";
import { Button } from "../src";
import { Restart } from "./icons";
import { themeLabel } from "./preview";
import { comparedThemes, MATRIX_ROWS, matrixQuery, type View } from "./view";

/** One frame at its real size, scaled to the width its cell has. */
function Cell({
  src,
  width,
  height,
  title,
}: {
  src: string;
  width: number;
  height: number;
  title: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / width));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={box} className="w-full overflow-hidden" style={{ height: height * scale }}>
      <iframe
        title={title}
        src={src}
        width={width}
        height={height}
        loading="lazy"
        className="origin-top-left border-0 bg-hn-surface-page"
        style={{ transform: `scale(${scale})` }}
      />
    </div>
  );
}

export function Matrix({ view, liveSource }: { view: View; liveSource?: string }) {
  const [run, setRun] = useState(0);
  const themes = comparedThemes(view);
  const query = new URLSearchParams(location.search);
  return (
    <div
      className="flex flex-col gap-3 bg-hn-surface-band p-4 sm:p-6"
      data-matrix={themes.join(",")}
    >
      <div className="flex flex-wrap items-center gap-3 text-[13px] text-hn-ink-muted">
        <span>
          {themes.length} {themes.length === 1 ? "theme" : "themes"} × light/dark × 1280/390. Add
          themes under Compare.
        </span>
        <Button variant="ghost" className="ml-auto" onClick={() => setRun((n) => n + 1)}>
          <Restart />
          Replay all
        </Button>
      </div>
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${themes.length}, minmax(220px, 1fr))` }}
      >
        {themes.map((theme) => (
          <div key={theme} className="flex min-w-0 flex-col gap-3" data-matrix-column={theme}>
            <span className="font-hn-mono text-xs text-hn-ink-primary">
              {themeLabel(theme, liveSource)}
            </span>
            {MATRIX_ROWS.map((row) => (
              <figure key={`${row.mode}-${row.width}`} className="m-0 flex flex-col gap-1">
                <figcaption className="font-hn-mono text-[11px] text-hn-ink-muted">
                  {row.mode} · {row.width} px
                </figcaption>
                <Cell
                  key={run}
                  src={`?${matrixQuery(query, view, theme, row.mode)}`}
                  width={row.width}
                  height={row.height}
                  title={`${theme}, ${row.mode}, ${row.width} px`}
                />
              </figure>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
