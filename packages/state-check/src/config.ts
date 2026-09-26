// Which rule sets run for an app, and their options. Read from `state-check.config.json` in the
// app, or else the `"state-check"` key of its package.json. The route rule is on by default; the
// Convex query and pending action rules are opt-in:
//
//   { "rules": { "next-route": false, "convex-query": true, "pending-action": true },
//     "authHelpers": ["requireSession"], "queryWrappers": ["BauhausQuery"],
//     "mutationHooks": ["useSave"], "pendingComponents": ["SubmitButton"] }
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_RULES, RULES } from "./check";
import type { CheckOptions } from "./types";

export const CONFIG_FILE = "state-check.config.json";
export const PACKAGE_KEY = "state-check";

export type Config = {
  /** Enabled rule ids, in RULES order. */
  rules: string[];
  options: CheckOptions;
  /** Where it was read from, or undefined for the defaults. */
  source?: string;
};

const LISTS = ["authHelpers", "queryWrappers", "mutationHooks", "pendingComponents"] as const;

/** Validates a raw config object against the defaults. `where` names it in errors. */
export function parseConfig(raw: unknown, where: string): Omit<Config, "source"> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw))
    throw new Error(`${where}: the config must be an object`);
  const enabled = new Map(Object.keys(RULES).map((id) => [id, DEFAULT_RULES.includes(id)]));
  const options: CheckOptions = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key === "rules") {
      if (typeof value !== "object" || value === null || Array.isArray(value))
        throw new Error(`${where}: "rules" must map rule ids to true or false`);
      for (const [id, on] of Object.entries(value)) {
        if (!enabled.has(id))
          throw new Error(
            `${where}: unknown rule ${id} (known: ${[...enabled.keys()].join(", ")})`
          );
        if (typeof on !== "boolean") throw new Error(`${where}: rules.${id} must be true or false`);
        enabled.set(id, on);
      }
    } else if ((LISTS as readonly string[]).includes(key)) {
      if (!Array.isArray(value) || !value.every((v) => typeof v === "string"))
        throw new Error(`${where}: "${key}" must be a list of names`);
      options[key as (typeof LISTS)[number]] = value;
    } else throw new Error(`${where}: unknown key "${key}"`);
  }
  return { rules: [...enabled].filter(([, on]) => on).map(([id]) => id), options };
}

/** The app's config: `path` if given, else its config file, else its package.json key, else defaults. */
export function readConfig(appDir: string, path?: string): Config {
  const file = path ?? join(appDir, CONFIG_FILE);
  const pkgPath = join(appDir, "package.json");
  const pkg: unknown = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, "utf8")) : undefined;
  const inPackage =
    typeof pkg === "object" && pkg !== null && PACKAGE_KEY in pkg
      ? (pkg as Record<string, unknown>)[PACKAGE_KEY]
      : undefined;
  if (path !== undefined || existsSync(file)) {
    if (!existsSync(file)) throw new Error(`${file}: no such config file`);
    if (path === undefined && inPackage !== undefined)
      throw new Error(
        `${file} and the "${PACKAGE_KEY}" key in ${pkgPath} both configure the app; keep one`
      );
    return { ...parseConfig(JSON.parse(readFileSync(file, "utf8")), file), source: file };
  }
  if (inPackage !== undefined)
    return { ...parseConfig(inPackage, `${pkgPath} "${PACKAGE_KEY}"`), source: pkgPath };
  return { rules: [...DEFAULT_RULES], options: {} };
}
