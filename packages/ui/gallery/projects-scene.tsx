// The Projects scene and the project picker (design#222): who consumes which @hansenexus package
// at which range, who offers a theme pack or screens, from workbench/projects.json and the scan
// of local checkouts at build (`virtual:projects`, scripts/projects.ts). Picking a project sets
// its theme and narrows the screens scene to its app, in one step, as ?project=<id>.
import { LATEST, SCAN } from "virtual:projects";
import { useContext } from "react";
import { Badge, cx, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../src";
import { ViewContext } from "./preview";
import { applyProject, PROJECTS } from "./projects";
import { sceneHref, type View, writeView } from "./view";

const ROLE_LABELS = {
  consumer: "consumes",
  "offers-pack": "offers a pack",
  "offers-screens": "offers screens",
} as const;

/** A link that picks `id` and keeps the rest of the view and the current page. */
function pickHref(view: View, id: string): string {
  return `?${writeView(new URLSearchParams(location.search), applyProject(view, id))}`;
}

/** The picker in the workbench chrome: one select, "none" first. */
export function ProjectPicker({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  return (
    <label className="flex min-h-9 items-center justify-between gap-3 px-2 text-[13px] text-hn-ink-muted">
      Project
      <select
        aria-label="Project"
        value={view.project}
        onChange={(e) => onChange(applyProject(view, e.target.value))}
        className="h-8 w-[9.5rem] min-w-0 rounded-hn-sm border border-hn-line-strong bg-hn-surface-card px-2 font-hn-mono text-[12.5px] text-hn-ink-primary"
      >
        <option value="">none</option>
        {PROJECTS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** The columns: the core packages first, then the rest by name (the theme packs last). */
const FIRST = ["@hansenexus/tokens", "@hansenexus/ui", "@hansenexus/shell"];
const weight = (pkg: string) => {
  const i = FIRST.indexOf(pkg);
  return i >= 0 ? i : pkg.includes("/theme-") ? FIRST.length + 1 : FIRST.length;
};
const byWeight = (a: string, b: string) => weight(a) - weight(b) || a.localeCompare(b);

export function Projects() {
  const view = useContext(ViewContext);
  const packages = Object.keys(LATEST).sort(byWeight);
  return (
    <main className="flex flex-col gap-6 px-4 py-8 sm:px-10">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 font-hn-display text-2xl text-hn-ink-primary">Projects</h1>
        <p className="m-0 max-w-[65ch] text-[14px] text-hn-ink-body">
          Who consumes the system at which range, and who offers a theme pack or screens. Ranges
          come from a scan of local checkouts at build; latest is this repository's version. Pick a
          project to wear its theme and see its screens.
        </p>
      </div>
      <div className="overflow-x-auto">
        <Table data-projects="">
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Theme</TableHead>
              {packages.map((pkg) => (
                <TableHead key={pkg} className="font-hn-mono">
                  {pkg.replace("@hansenexus/", "")}{" "}
                  <span className="text-hn-ink-muted">{LATEST[pkg]}</span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {PROJECTS.map((p) => {
              const scan = SCAN.find((s) => s.id === p.id);
              return (
                <TableRow
                  key={p.id}
                  data-project={p.id}
                  aria-current={view.project === p.id ? "true" : undefined}
                  className="aria-[current=true]:bg-hn-surface-tint"
                >
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <a href={pickHref(view, p.id)} className="font-medium text-hn-ink-primary">
                        {p.label}
                      </a>
                      <span className="font-hn-mono text-[11px] text-hn-ink-muted">
                        {p.repo}
                        {p.path ? `/${p.path}` : ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {p.roles.map((r) => (
                        <Badge key={r} tone={r === "consumer" ? "neutral" : "accent"}>
                          {ROLE_LABELS[r]}
                        </Badge>
                      ))}
                      {p.app ? (
                        <a
                          href={sceneHref("screens", applyProject(view, p.id))}
                          className="text-[12px] text-hn-ink-primary"
                        >
                          screens
                        </a>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell mono muted={!p.theme}>
                    {p.theme ?? "—"}
                  </TableCell>
                  {scan && !scan.scanned ? (
                    <TableCell
                      muted
                      colSpan={packages.length}
                      title={scan.reason}
                      className="whitespace-normal"
                    >
                      unscanned: {scan.reason}
                    </TableCell>
                  ) : (
                    packages.map((pkg) => {
                      const deps = scan?.scanned ? scan.deps.filter((d) => d.package === pkg) : [];
                      return (
                        <TableCell key={pkg} mono>
                          {deps.length ? (
                            <span className="flex flex-col">
                              {deps.map((d) => (
                                <span
                                  key={d.range}
                                  data-behind={d.behind ? "" : undefined}
                                  title={d.behind ? `behind ${d.latest}` : "admits the latest"}
                                  className={cx(
                                    d.behind ? "text-hn-status-warn" : "text-hn-ink-primary"
                                  )}
                                >
                                  {d.range}
                                  {d.behind ? " ↓" : ""}
                                </span>
                              ))}
                            </span>
                          ) : (
                            <span className="text-hn-ink-muted">—</span>
                          )}
                        </TableCell>
                      );
                    })
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="m-0 max-w-[65ch] text-[13px] text-hn-ink-muted">
        ↓ marks a range that does not admit the latest version. A project registers itself in
        workbench/projects.json (workbench/README.md, “Projects”).
      </p>
    </main>
  );
}
