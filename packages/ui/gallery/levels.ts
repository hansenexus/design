// Atomic levels in the gallery (hansenexus/design#58). The level of an item lives once, as
// `meta.level` in registry.json; this file only says which scene shows each item, so the nav can
// list the registry by level and link each item to its scene. scripts/levels.ts fails CI when an
// item has no level, a preview card names an item the registry lacks, or an item has no scene.
import registry from "../registry.json";
import type { Scene } from "./view";

export const LEVELS = ["atom", "molecule", "organism", "template"] as const;
export type Level = (typeof LEVELS)[number];

/** The scene that shows each registry item. */
export const ITEM_SCENES: Record<string, Scene> = {
  tokens: "kit",
  cx: "kit",
  icons: "kit",
  "status-glyph": "kit",
  badge: "kit",
  button: "kit",
  dialog: "dialog",
  "brand-geometry": "brand",
  "hansenexus-mark": "brand",
  "hansenexus-wordmark": "brand",
  input: "kit",
  kbd: "kit",
  menu: "menu",
  meter: "kit",
  "rail-item": "kit",
  select: "select",
  sparkline: "kit",
  "status-badge": "kit",
  switch: "kit",
  table: "kit",
  tabs: "kit",
  toast: "toast",
  tooltip: "tooltip",
  "delayed-visibility": "loading",
  skeleton: "loading",
  spinner: "loading",
  "state-copy": "states",
  "empty-state": "states",
  "error-state": "states",
  progress: "states",
  "query-state": "states",
  label: "forms",
  field: "forms",
  "form-alert": "forms",
  textarea: "forms",
  checkbox: "forms",
  "radio-group": "forms",
  "layout-copy": "layout",
  card: "layout",
  alert: "layout",
  avatar: "layout",
  separator: "layout",
  accordion: "layout",
  popover: "overlays",
  calendar: "data",
  "date-picker": "data",
  combobox: "data",
  "data-table": "data",
  sheet: "overlays",
  breadcrumb: "navigation",
  pagination: "navigation",
  command: "overlays",
  shell: "shell",
};

export type LevelItem = { name: string; title: string; level: Level | undefined };

/** Every registry item with its title and `meta.level` (undefined when missing or unknown). */
export function registryLevels(
  items: { name: string; title?: string; meta?: Record<string, unknown> }[] = registry.items
): LevelItem[] {
  return items.map((item) => {
    const level = item.meta?.level;
    return {
      name: item.name,
      title: item.title ?? item.name,
      level: LEVELS.find((l) => l === level),
    };
  });
}

/** The level of one registry item, for a preview card's badge. */
export function levelOf(name: string): Level | undefined {
  return registryLevels().find((i) => i.name === name)?.level;
}

/** The registry grouped by level, lowest first, each group sorted by title. Empty levels stay. */
export function itemsByLevel(items: LevelItem[] = registryLevels()): [Level, LevelItem[]][] {
  return LEVELS.map((level) => [
    level,
    items.filter((i) => i.level === level).sort((a, b) => a.title.localeCompare(b.title)),
  ]);
}
