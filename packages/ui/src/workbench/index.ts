import type { ComponentType } from "react";

/**
 * The screen-fixture contract (design#148, ruling dec_2026-11-15_global-design-theme-packs-gallery-
 * workbench point 6): an app exports its pure-UI screens plus fixture data, and the gallery
 * workbench imports them and renders every screen under any theme pack, in light and dark, at 390
 * and 1280 px. Shipped as `@hansenexus/ui/workbench`; types and three small helpers, no runtime
 * weight in the app. It is not a registry item: nothing here is copied into an app.
 *
 * An app's screens entry default-exports `defineScreens({ app, screens })`. The gallery reaches
 * it at build time (workbench/apps.json in hansenexus/design), so nothing private is published.
 *
 * The rules a screen keeps (the gallery build enforces the imports, validateScreens the shape):
 * - Pure UI: props in, callbacks out. No Convex, no fetch, no router, no auth, no prod data.
 * - Imports only relative files, react, react-dom, @hansenexus/*, radix-ui and the aliases its
 *   apps.json entry declares.
 * - Never sets data-theme or data-mode and never mounts a ThemePack: the gallery does, so every
 *   pack renders the same screen.
 * - Every date derives from FixtureContext.now and nothing is random, so screenshots hold.
 * - Fixtures are realistic in volume and content (kommandant#783: a synthetic mockup could not
 *   be judged), with invented names.
 */

/** The widths the gallery renders a screen at, in CSS px. */
export const SCREEN_VIEWPORTS = [390, 1280] as const;
export type ScreenViewport = (typeof SCREEN_VIEWPORTS)[number];

export const SCREEN_MODES = ["light", "dark"] as const;
export type ScreenMode = (typeof SCREEN_MODES)[number];

/** What a fixture's load() gets: a frozen clock and locale, and a logger for callbacks. */
export interface FixtureContext {
  /** The frozen "now" every fixture date derives from: never Date.now(). */
  now: Date;
  locale: string;
  timeZone: string;
  /**
   * A callback for the screen's props that does nothing but report `name` and its arguments to
   * the gallery's action log, e.g. `onSubmit: ctx.action("submit")`.
   */
  action: (name: string) => (...args: unknown[]) => void;
}

/** One data set for a screen: the screen's whole props. */
export interface ScreenFixture<P> {
  /** Kebab-case, unique within the screen. Appears in the gallery URL (?fixture=). */
  id: string;
  label: string;
  description?: string;
  /** The screen's props. A dynamic import keeps a large fixture out of the first load. */
  load: (ctx: FixtureContext) => P | Promise<P>;
}

/** One screen: a page of the app at template level, with at least one fixture. */
export interface ScreenDefinition<P> {
  /** `<app>/<kebab-name>`, unique across the app. Appears in the gallery URL (?screen=). */
  id: string;
  title: string;
  description?: string;
  /** Screens sit at template level: they compose organisms into a page. */
  level: "template";
  /** A heading the gallery groups the app's screens under. */
  group?: string;
  /** The widths the screen is meant for. Default: both. */
  viewports?: readonly ScreenViewport[];
  /** The modes the screen is meant for. Default: both. */
  modes?: readonly ScreenMode[];
  /**
   * "viewport" (default): a full page, at least the frame's height, the shell included when the
   * app mounts one. "content": a part of a page at its natural height.
   */
  height?: "viewport" | "content";
  component: ComponentType<P>;
  /** The first is the default. */
  fixtures: readonly [ScreenFixture<P>, ...ScreenFixture<P>[]];
}

/**
 * A screen whose props type is erased, so screens with different props share one list.
 * defineScreen() checks the component against its fixtures before the erasure.
 */
// biome-ignore lint/suspicious/noExplicitAny: an existential props type, checked in defineScreen.
export type AnyScreen = ScreenDefinition<any>;

/** What an app's screens entry default-exports. */
export interface AppScreens {
  /** The app's name, as in its theme pack (`themes/<app>`) and workbench/apps.json. */
  app: string;
  screens: readonly AnyScreen[];
}

/** Types one screen: the fixtures must produce exactly the component's props. */
export function defineScreen<P>(screen: ScreenDefinition<P>): ScreenDefinition<P> {
  return screen;
}

/** Types an app's screens; the default export of its screens entry. */
export function defineScreens(screens: AppScreens): AppScreens {
  return screens;
}

/** The context the gallery and its screenshot baselines load fixtures with. */
export const WORKBENCH_NOW = new Date("2026-11-16T07:00:00Z");

export function fixtureContext(action: FixtureContext["action"] = () => () => {}): FixtureContext {
  return { now: new Date(WORKBENCH_NOW), locale: "de-DE", timeZone: "Europe/Berlin", action };
}

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Every way `app` breaks the contract's shape, as messages naming the screen; empty when it
 * holds. The gallery fails its build on any; an app can run it in its own tests.
 */
export function validateScreens(app: AppScreens): string[] {
  const errors: string[] = [];
  if (!KEBAB.test(app.app)) errors.push(`app "${app.app}" is not kebab-case`);
  if (app.screens.length === 0) errors.push(`${app.app}: no screens`);
  const ids = new Set<string>();
  for (const screen of app.screens) {
    const at = `${app.app}: screen "${screen.id}"`;
    const [owner, name, ...rest] = screen.id.split("/");
    if (owner !== app.app || !name || rest.length || !KEBAB.test(name))
      errors.push(`${at}: id must be "${app.app}/<kebab-name>"`);
    if (ids.has(screen.id)) errors.push(`${at}: duplicate id`);
    ids.add(screen.id);
    if (screen.level !== "template") errors.push(`${at}: level must be "template"`);
    if (!screen.title.trim()) errors.push(`${at}: empty title`);
    if (typeof screen.component !== "function" && typeof screen.component !== "object")
      errors.push(`${at}: component is not a React component`);
    for (const v of screen.viewports ?? [])
      if (!SCREEN_VIEWPORTS.includes(v)) errors.push(`${at}: unknown viewport ${v}`);
    if (screen.viewports?.length === 0) errors.push(`${at}: empty viewports`);
    for (const m of screen.modes ?? [])
      if (!SCREEN_MODES.includes(m)) errors.push(`${at}: unknown mode ${m}`);
    if (screen.modes?.length === 0) errors.push(`${at}: empty modes`);
    if (screen.fixtures.length === 0) errors.push(`${at}: no fixtures`);
    const fixtures = new Set<string>();
    for (const f of screen.fixtures) {
      if (!KEBAB.test(f.id)) errors.push(`${at}: fixture "${f.id}" is not kebab-case`);
      if (fixtures.has(f.id)) errors.push(`${at}: duplicate fixture "${f.id}"`);
      fixtures.add(f.id);
      if (typeof f.load !== "function") errors.push(`${at}: fixture "${f.id}" has no load()`);
    }
  }
  return errors;
}
