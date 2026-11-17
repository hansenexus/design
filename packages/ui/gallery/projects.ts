// The projects around the design system (design#222), from workbench/projects.json: who consumes
// it, who offers a theme pack, who offers screens. The manifest holds names and roles only (the
// repository is public); scripts/projects.ts adds each local checkout's @hansenexus/* ranges at
// gallery build, as `virtual:projects`. Pure, so tests/projects.test.ts covers the schema and the
// view param without a DOM or a build.

import { isSetId, SET_IDS } from "@hansenexus/illustrations/sets";
import { motionSetIds } from "@hansenexus/tokens";
import apps from "../../../workbench/apps.json" with { type: "json" };
import manifest from "../../../workbench/projects.json" with { type: "json" };
import { BUILD_THEMES, packOf } from "./themes";
import type { View } from "./view";

export const ROLES = ["consumer", "offers-pack", "offers-screens"] as const;
export type Role = (typeof ROLES)[number];

export type Project = {
  label: string;
  /** `owner/name` on GitHub. */
  repo: string;
  /** The project's folder inside `repo`, when it shares the repository (a monorepo app). */
  path?: string;
  roles: Role[];
  /** The data-theme it wears: its pack's direction or a core theme. Picking the project sets it. */
  theme?: string;
  /** Its illustration set of @hansenexus/illustrations/sets (design#220). Picking the project sets it. */
  illustrations?: string;
  /** Its motion set of @hansenexus/tokens (design#221). Picking the project sets it. */
  motion?: string;
  /** Its key in workbench/apps.json, when it offers screens. */
  app?: string;
};

export type ProjectsManifest = { projects: Record<string, Project> };

/** The committed manifest. */
export const PROJECTS_MANIFEST = manifest as ProjectsManifest;

/** Every project as [id, project], in manifest order. */
export const PROJECTS: readonly (Project & { id: string })[] = Object.entries(
  PROJECTS_MANIFEST.projects
).map(([id, p]) => ({ id, ...p }));

export const PROJECT_IDS: readonly string[] = PROJECTS.map((p) => p.id);

export function findProject(id: string | null | undefined) {
  return PROJECTS.find((p) => p.id === id);
}

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const KEYS = new Set(["label", "repo", "path", "roles", "theme", "illustrations", "motion", "app"]);

/**
 * Every broken rule of the manifest, as a sentence each; empty when it holds. `appIds` are the
 * keys of workbench/apps.json, `themes` the data-themes a project may wear.
 */
export function validateProjects(
  input: unknown,
  {
    appIds = Object.keys(apps.apps),
    themes = BUILD_THEMES,
  }: { appIds?: readonly string[]; themes?: readonly string[] } = {}
): string[] {
  const problems: string[] = [];
  const projects = (input as { projects?: unknown } | null)?.projects;
  if (!projects || typeof projects !== "object" || Array.isArray(projects))
    return ["projects.json: needs a `projects` object keyed by project id"];
  for (const [id, raw] of Object.entries(projects)) {
    const at = `projects.json: ${id}`;
    if (!ID.test(id)) problems.push(`${at}: the id is not kebab-case`);
    if (!raw || typeof raw !== "object") {
      problems.push(`${at}: is not an object`);
      continue;
    }
    const p = raw as Record<string, unknown>;
    for (const key of Object.keys(p))
      if (!KEYS.has(key)) problems.push(`${at}: unknown field ${key}`);
    if (typeof p.label !== "string" || !p.label.trim()) problems.push(`${at}: needs a label`);
    if (typeof p.repo !== "string" || !REPO.test(p.repo))
      problems.push(`${at}: repo must be owner/name`);
    if (p.path !== undefined && (typeof p.path !== "string" || /^\/|(^|\/)\.\.(\/|$)/.test(p.path)))
      problems.push(`${at}: path must be relative inside the repo`);
    const roles = Array.isArray(p.roles) ? p.roles : [];
    if (!roles.length) problems.push(`${at}: needs at least one role`);
    for (const r of roles)
      if (!ROLES.includes(r as Role))
        problems.push(`${at}: unknown role ${String(r)} (${ROLES.join(", ")})`);
    if (new Set(roles).size !== roles.length) problems.push(`${at}: a role is listed twice`);
    if (p.theme !== undefined && !themes.includes(p.theme as string))
      problems.push(`${at}: theme ${String(p.theme)} is no theme of this build`);
    if (
      roles.includes("offers-pack") &&
      (typeof p.theme !== "string" || packOf(p.theme) === "core")
    )
      problems.push(`${at}: offers-pack needs a theme from its pack under themes/`);
    if (roles.includes("offers-screens") !== (p.app !== undefined))
      problems.push(`${at}: offers-screens and app go together`);
    if (p.app !== undefined && !appIds.includes(p.app as string))
      problems.push(`${at}: app ${String(p.app)} is not in workbench/apps.json`);
    if (p.illustrations !== undefined && !isSetId(p.illustrations))
      problems.push(
        `${at}: illustrations ${String(p.illustrations)} is no set (${SET_IDS.join(", ")})`
      );
    if (p.motion !== undefined && !(motionSetIds as readonly unknown[]).includes(p.motion))
      problems.push(`${at}: motion ${String(p.motion)} is no set (${motionSetIds.join(", ")})`);
  }
  return problems;
}

/** The query value of a project: a known id, else "" (none picked). */
export function readProject(value: string | null): string {
  return value && PROJECT_IDS.includes(value) ? value : "";
}

/**
 * The view after picking `id`, in one step: the project, the theme it wears, its illustration set
 * and its motion set. A project without a set goes back to "auto", the pack default of the theme
 * it sets, so an override from the previous pick does not stick. "" clears the project and keeps
 * the rest.
 */
export function applyProject<
  V extends Pick<View, "theme" | "project" | "illustrations" | "motionSet">,
>(view: V, id: string): V {
  const project = findProject(id);
  if (!project) return { ...view, project: "" };
  return {
    ...view,
    project: project.id,
    theme: project.theme ?? view.theme,
    illustrations: project.illustrations ?? "auto",
    motionSet: project.motion ?? "auto",
  };
}

/** The screens app the picked project offers, or null: the screens scene shows only its screens. */
export function projectApp(view: Pick<View, "project">): string | null {
  return findProject(view.project)?.app ?? null;
}
