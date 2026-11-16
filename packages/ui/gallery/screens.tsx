// The screens scene (design#148): the apps' real screens with their fixture data, from
// workbench/apps.json via virtual:screens (scripts/workbench.ts), rendered under the current
// theme pack, mode and viewport like every other scene. ?scene=screens lists them;
// &screen=<app>/<name>&fixture=<id> shows one. With ?bare=1 only the screen renders, for the
// screenshot baselines. Actions a fixture wires through ctx.action() land in the action log.
import { APPS, SKIPPED } from "virtual:screens";
import { type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Badge, ErrorState } from "../src";
import {
  type AnyScreen,
  type AppScreens,
  type FixtureContext,
  fixtureContext,
  type ScreenFixture,
  validateScreens,
} from "../src/workbench";
import { BareContext, ViewContext } from "./preview";
import { type View, writeView } from "./view";

/** Every screen of every bundled app, with its app. */
export function allScreens(
  apps: readonly AppScreens[] = APPS
): { app: string; screen: AnyScreen }[] {
  return apps.flatMap((a) => a.screens.map((screen) => ({ app: a.app, screen })));
}

export function findScreen(id: string | null, apps: readonly AppScreens[] = APPS) {
  return allScreens(apps).find((s) => s.screen.id === id)?.screen;
}

/** A link to one screen and fixture that keeps the view. */
export function screenHref(view: View, screen: string, fixture?: string): string {
  const q = new URLSearchParams({ scene: "screens", screen });
  if (fixture) q.set("fixture", fixture);
  return `?${writeView(q, view).toString()}`;
}

type Loaded = { key: string; props: object } | { key: string; error: string };

/**
 * Loads `fixture` with the workbench's frozen context and renders the screen with it. The
 * wrapper carries data-screen and data-fixture, plus data-ready once the props are in, for the
 * screenshot specs to wait on.
 */
export function ScreenRender({
  screen,
  fixture,
  onAction,
}: {
  screen: AnyScreen;
  fixture: ScreenFixture<unknown>;
  onAction?: FixtureContext["action"];
}) {
  const key = `${screen.id}#${fixture.id}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const action = useRef(onAction);
  action.current = onAction;
  const log = useCallback<FixtureContext["action"]>(
    (name) =>
      (...args) =>
        action.current?.(name)(...args),
    []
  );
  useEffect(() => {
    let live = true;
    Promise.resolve()
      .then(() => fixture.load(fixtureContext(log)))
      .then(
        (props) => live && setLoaded({ key, props: props as object }),
        (e: unknown) =>
          live && setLoaded({ key, error: e instanceof Error ? e.message : String(e) })
      );
    return () => {
      live = false;
    };
  }, [fixture, key, log]);
  const Component = screen.component;
  const current = loaded?.key === key ? loaded : null;
  return (
    <div
      data-screen={screen.id}
      data-fixture={fixture.id}
      data-ready={current ? "" : undefined}
      className={screen.height === "content" ? "relative" : "relative min-h-dvh"}
    >
      {current && "error" in current ? (
        <ErrorState title={`Fixture ${fixture.id} failed to load`} description={current.error} />
      ) : current ? (
        <Component {...current.props} />
      ) : null}
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <span className="font-hn-mono text-xs text-hn-ink-muted">{children}</span>;
}

function Problems({ problems }: { problems: readonly string[] }) {
  if (!problems.length) return null;
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px] text-hn-status-crit">
      {problems.map((p) => (
        <li key={p}>{p}</li>
      ))}
    </ul>
  );
}

/** One screen with its fixture picker, its hints and the action log above it. */
function ScreenPage({ screen, fixtureId }: { screen: AnyScreen; fixtureId: string | null }) {
  const bare = useContext(BareContext);
  const view = useContext(ViewContext);
  const [actions, setActions] = useState<string[]>([]);
  const fixture = screen.fixtures.find((f) => f.id === fixtureId) ?? screen.fixtures[0];
  const onAction = useCallback<FixtureContext["action"]>(
    (name) =>
      (...args) => {
        const line = args.length
          ? `${name}(${args.map((a) => JSON.stringify(a)).join(", ")})`
          : name;
        console.info(`workbench action: ${line}`);
        setActions((list) => [line, ...list].slice(0, 5));
      },
    []
  );
  const render = (
    <ScreenRender key={fixture.id} screen={screen} fixture={fixture} onAction={onAction} />
  );
  if (bare) return render;
  const viewports = screen.viewports ?? [390, 1280];
  const modes = screen.modes ?? ["light", "dark"];
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-hn-line-subtle bg-hn-surface-band px-4 py-2.5 text-[13px] sm:px-10">
        <label className="flex items-center gap-2 text-hn-ink-muted">
          Screen
          <select
            value={screen.id}
            onChange={(e) => location.assign(screenHref(view, e.target.value))}
            className="h-8 rounded-hn-sm border border-hn-line-strong bg-hn-surface-card px-2 font-hn-mono text-hn-ink-primary"
          >
            {APPS.map((app) => (
              <optgroup key={app.app} label={app.app}>
                {app.screens.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <Badge>{screen.level}</Badge>
        <Hint>{screen.id}</Hint>
        <nav aria-label="Fixtures" className="flex flex-wrap gap-x-3">
          {screen.fixtures.map((f) => (
            <a
              key={f.id}
              href={screenHref(view, screen.id, f.id)}
              aria-current={f.id === fixture.id ? "page" : undefined}
              title={f.description}
              className="text-hn-ink-primary aria-[current=page]:font-semibold"
            >
              {f.label}
            </a>
          ))}
        </nav>
        <Hint>
          meant for {viewports.join(" / ")} px, {modes.join(" / ")}
          {view.viewport !== "auto" && !viewports.includes(Number(view.viewport) as 390)
            ? `; not ${view.viewport} px`
            : ""}
          {!modes.includes(view.mode) ? `; not ${view.mode}` : ""}
        </Hint>
        <output aria-label="Action log" className="ml-auto font-hn-mono text-xs text-hn-ink-muted">
          {actions.length ? actions.join(" · ") : "no actions yet"}
        </output>
      </div>
      {render}
    </>
  );
}

/** Every bundled app with its screens and fixtures, the skipped apps with the reason. */
function ScreenIndex() {
  const view = useContext(ViewContext);
  return (
    <main className="flex flex-col gap-8 px-4 py-8 sm:px-10">
      <h1 className="m-0 font-hn-display text-2xl text-hn-ink-primary">App screens</h1>
      {APPS.map((app) => {
        const groups = new Map<string, AnyScreen[]>();
        for (const s of app.screens)
          groups.set(s.group ?? "", [...(groups.get(s.group ?? "") ?? []), s]);
        return (
          <section key={app.app} data-app={app.app} className="flex flex-col gap-3">
            <h2 className="m-0 font-hn-mono text-sm text-hn-ink-muted">{app.app}</h2>
            <Problems problems={validateScreens(app)} />
            {[...groups].map(([group, screens]) => (
              <div key={group} className="flex flex-col gap-2">
                {group ? <h3 className="m-0 text-sm text-hn-ink-body">{group}</h3> : null}
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {screens.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-baseline gap-x-3">
                      <a href={screenHref(view, s.id)} className="text-hn-ink-primary">
                        {s.title}
                      </a>
                      {s.fixtures.map((f) => (
                        <a
                          key={f.id}
                          href={screenHref(view, s.id, f.id)}
                          className="text-xs text-hn-ink-muted"
                        >
                          {f.label}
                        </a>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        );
      })}
      {SKIPPED.map((s) => (
        <section key={s.app} data-skipped={s.app} className="flex flex-col gap-1">
          <h2 className="m-0 font-hn-mono text-sm text-hn-ink-muted">
            {s.app} (not in this build)
          </h2>
          <Hint>{s.reason}</Hint>
        </section>
      ))}
    </main>
  );
}

export function Screens({ query }: { query: URLSearchParams }) {
  const id = query.get("screen");
  const screen = findScreen(id);
  if (id && !screen)
    return (
      <ErrorState title={`No screen ${id}`} description="The screens scene lists every screen." />
    );
  return screen ? <ScreenPage screen={screen} fixtureId={query.get("fixture")} /> : <ScreenIndex />;
}
